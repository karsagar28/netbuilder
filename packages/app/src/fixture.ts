import type { Edge, Node, Tenant, WorldSeed } from '@netbuilder/sim';
import { edgeId, nodeId, tenantId } from '@netbuilder/sim';

export const ids = {
  cloudGate: nodeId('cloud-gate'),
  trafficGarden: nodeId('traffic-garden'),
  rocketA: nodeId('rocket-a'),
  rocketB: nodeId('rocket-b'),
  rocketC: nodeId('rocket-c'),
  smoothieBalancer: nodeId('load_balancer-1'),
  nebulaMart: tenantId('nebulamart')
};

export const edgeIds = {
  cloudGateToGarden: edgeId('e-cloud-gate-garden'),
  gardenToRocketA: edgeId('e-garden-rocket-a')
};

function makeNode(id: Node['id'], kind: Node['kind'], x: number, y: number): Node {
  return {
    id,
    kind,
    pos: { x, y },
    throughput: 100,
    health: 1,
    status: 'ok',
    buildTicksLeft: 0,
    opexPerTick: kind === 'switch' ? 1 : 0
  };
}

function makeEdge(id: Edge['id'], a: Node['id'], b: Node['id'], capacityGbps: number, baseLatencyMs = 2): Edge {
  return {
    id,
    a,
    b,
    capacityGbps,
    baseLatencyMs,
    status: 'ok',
    buildTicksLeft: 0,
    opexPerTick: 1
  };
}

const tenant: Tenant = {
  id: ids.nebulaMart,
  name: 'NebulaMart Arcade',
  source: ids.cloudGate,
  servers: [ids.rocketA, ids.rocketB, ids.rocketC],
  primaryServer: ids.rocketA,
  demand: { baseGbps: 90, growthPerTick: 0.4 },
  sla: { maxLatencyMs: 18, minServedRatio: 0.95 },
  ratePerGbps: 0.2,
  status: 'active',
  breachStreak: 0
};

export function createFixture(): WorldSeed {
  return {
    balance: 1_000,
    nodes: [
      makeNode(ids.cloudGate, 'border', 70, 230),
      makeNode(ids.trafficGarden, 'switch', 270, 230),
      makeNode(ids.rocketA, 'server', 520, 130),
      makeNode(ids.rocketB, 'server', 520, 230),
      makeNode(ids.rocketC, 'server', 520, 330)
    ],
    edges: [
      makeEdge(edgeIds.cloudGateToGarden, ids.cloudGate, ids.trafficGarden, 120),
      makeEdge(edgeIds.gardenToRocketA, ids.trafficGarden, ids.rocketA, 40)
    ],
    tenants: [tenant]
  };
}
