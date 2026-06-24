import type { Edge, Node, Tenant, WorldSeed } from '@netbuilder/sim';
import { edgeId, nodeId, tenantId } from '@netbuilder/sim';

export const ids = {
  border: nodeId('border'),
  agg: nodeId('agg-1'),
  primary: nodeId('server-a'),
  serverB: nodeId('server-b'),
  serverC: nodeId('server-c'),
  lb: nodeId('load_balancer-1'),
  acme: tenantId('acme')
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
  id: ids.acme,
  name: 'Acme Cluster',
  source: ids.border,
  servers: [ids.primary, ids.serverB, ids.serverC],
  primaryServer: ids.primary,
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
      makeNode(ids.border, 'border', 70, 230),
      makeNode(ids.agg, 'switch', 270, 230),
      makeNode(ids.primary, 'server', 520, 130),
      makeNode(ids.serverB, 'server', 520, 230),
      makeNode(ids.serverC, 'server', 520, 330)
    ],
    edges: [
      makeEdge(edgeId('e-border-agg'), ids.border, ids.agg, 40),
      makeEdge(edgeId('e-agg-primary'), ids.agg, ids.primary, 40)
    ],
    tenants: [tenant]
  };
}
