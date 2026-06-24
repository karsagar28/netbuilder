import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  createWorld,
  edgeId,
  Node,
  nodeId,
  Replay,
  routeFlows,
  runReplay,
  snapshot,
  Tenant,
  tenantId,
  tick,
  WorldSeed
} from './index.js';

const border = nodeId('border');
const sw = nodeId('sw-1');
const s1 = nodeId('server-a');
const s2 = nodeId('server-b');
const s3 = nodeId('server-c');
const lb = nodeId('load_balancer-1');
const acme = tenantId('acme');

function node(id: ReturnType<typeof nodeId>, kind: Node['kind'], x: number): Node {
  return {
    id,
    kind,
    pos: { x, y: 0 },
    throughput: 100,
    health: 1,
    status: 'ok',
    buildTicksLeft: 0,
    opexPerTick: kind === 'server' || kind === 'border' ? 0 : 1
  };
}

function tenant(baseGbps = 90): Tenant {
  return {
    id: acme,
    name: 'Acme',
    source: border,
    servers: [s1, s2, s3],
    primaryServer: s1,
    demand: { baseGbps },
    sla: { maxLatencyMs: 20, minServedRatio: 0.95 },
    ratePerGbps: 0,
    status: 'active',
    breachStreak: 0
  };
}

function seed(baseGbps = 90): WorldSeed {
  return {
    balance: 1_000,
    nodes: [node(border, 'border', 0), node(sw, 'switch', 1), node(s1, 'server', 2), node(s2, 'server', 3), node(s3, 'server', 4)],
    edges: [
      { id: edgeId('e-border-sw'), a: border, b: sw, capacityGbps: 120, baseLatencyMs: 2, status: 'ok', buildTicksLeft: 0, opexPerTick: 1 },
      { id: edgeId('e-sw-s1'), a: sw, b: s1, capacityGbps: 40, baseLatencyMs: 2, status: 'ok', buildTicksLeft: 0, opexPerTick: 1 }
    ],
    tenants: [tenant(baseGbps)]
  };
}

describe('@netbuilder/sim phase 0 core', () => {
  it('routes clustered tenant traffic to only the primary server without LB', () => {
    const world = createWorld(123, seed());
    const derived = routeFlows(world);

    expect(derived.flowAllocations).toHaveLength(1);
    expect(derived.flowAllocations[0]?.to).toBe(s1);
    expect(derived.flowAllocations[0]?.viaLoadBalancer).toBeUndefined();
    expect(derived.tenantService.get(acme)?.worstPressure).toBe('saturated');
  });

  it('opens a single-server-pressure incident when primary-only cluster traffic breaches', () => {
    const world = tick(createWorld(123, seed()));
    const shot = snapshot(world);

    expect(shot.derived.tenantService[0]?.compliant).toBe(false);
    expect(shot.incidents).toHaveLength(1);
    expect(shot.incidents[0]?.trigger).toBe('single_server_pressure');
  });

  it('rejects invalid topology commands in the sim layer', () => {
    const world = createWorld(123, seed(10));

    expect(applyCommand(world, { type: 'BuildLink', a: border, b: border, tier: 'standard' })).toMatchObject({ ok: false });
    expect(applyCommand(world, { type: 'BuildLink', a: border, b: sw, tier: 'standard' })).toMatchObject({ ok: false });
    expect(applyCommand(world, { type: 'PlaceNode', kind: 'load_balancer', pos: { x: 5, y: 5 } })).toMatchObject({ ok: false });
  });

  it('requires LB research before placement and then fanouts round-robin across healthy servers', () => {
    let world = createWorld(123, seed());

    world = tick(world, [{ type: 'ResearchTech', tech: 'load_balancer' }]);
    world = tick(world, [{ type: 'PlaceNode', kind: 'load_balancer', pos: { x: 1, y: 1 } }]);
    world = tick(world, [
      { type: 'BuildLink', a: sw, b: lb, tier: 'fast' },
      { type: 'BuildLink', a: lb, b: s1, tier: 'standard' },
      { type: 'BuildLink', a: lb, b: s2, tier: 'standard' },
      { type: 'BuildLink', a: lb, b: s3, tier: 'standard' },
      { type: 'AssignLoadBalancer', tenantId: acme, nodeId: lb }
    ]);
    world = tick(world);

    const shot = snapshot(world);
    const sourceToLb = shot.derived.flowAllocations.find((flow) => flow.to === lb);
    const flowsToServers = shot.derived.flowAllocations.filter((flow) => [s1, s2, s3].includes(flow.to));

    expect(sourceToLb?.path).toEqual([border, sw, lb]);
    expect(flowsToServers).toHaveLength(3);
    expect(flowsToServers.map((flow) => flow.servedGbps)).toEqual([30, 30, 30]);
    expect(shot.derived.tenantService[0]?.compliant).toBe(true);
  });

  it('excludes failed servers from LB fanout', () => {
    let world = createWorld(123, seed(60));
    world.nodes.set(lb, node(lb, 'load_balancer', 1));
    world.nodes.set(s3, { ...world.nodes.get(s3)!, status: 'failed' });
    world.edges.set(edgeId('e-border-lb'), { id: edgeId('e-border-lb'), a: border, b: lb, capacityGbps: 120, baseLatencyMs: 1, status: 'ok', buildTicksLeft: 0, opexPerTick: 1 });
    world.edges.set(edgeId('e-lb-s1'), { id: edgeId('e-lb-s1'), a: lb, b: s1, capacityGbps: 40, baseLatencyMs: 1, status: 'ok', buildTicksLeft: 0, opexPerTick: 1 });
    world.edges.set(edgeId('e-lb-s2'), { id: edgeId('e-lb-s2'), a: lb, b: s2, capacityGbps: 40, baseLatencyMs: 1, status: 'ok', buildTicksLeft: 0, opexPerTick: 1 });
    world.tech.loadBalancerUnlocked = true;
    world.tenants.set(acme, { ...world.tenants.get(acme)!, assignedLoadBalancer: lb });

    const derived = routeFlows(world);
    const flowsToServers = derived.flowAllocations.filter((flow) => [s1, s2, s3].includes(flow.to));

    expect(flowsToServers).toHaveLength(2);
    expect(flowsToServers.map((flow) => flow.servedGbps)).toEqual([30, 30]);
  });

  it('replays deterministically from seed plus timed commands', () => {
    const replay: Replay = {
      seed: 999,
      initialWorld: seed(10),
      commands: [
        { tick: 1, command: { type: 'ResearchTech', tech: 'load_balancer' } },
        { tick: 2, command: { type: 'PlaceNode', kind: 'load_balancer', pos: { x: 1, y: 1 } } },
        { tick: 3, command: { type: 'BuildLink', a: sw, b: lb, tier: 'fast' } },
        { tick: 3, command: { type: 'BuildLink', a: lb, b: s1, tier: 'standard' } },
        { tick: 3, command: { type: 'AssignLoadBalancer', tenantId: acme, nodeId: lb } }
      ]
    };

    expect(runReplay(replay)).toEqual(runReplay(replay));
  });
});
