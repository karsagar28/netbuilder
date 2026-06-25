export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type NodeId = Brand<string, 'NodeId'>;
export type EdgeId = Brand<string, 'EdgeId'>;
export type TenantId = Brand<string, 'TenantId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type TicketId = Brand<string, 'TicketId'>;

export const nodeId = (value: string): NodeId => value as NodeId;
export const edgeId = (value: string): EdgeId => value as EdgeId;
export const tenantId = (value: string): TenantId => value as TenantId;

export type NodeKind = 'border' | 'switch' | 'load_balancer' | 'server';
export type Status = 'building' | 'ok' | 'degraded' | 'failed';
export type PressureBand = 'calm' | 'busy' | 'strained' | 'critical' | 'saturated';
export type FinancialState = 'solvent' | 'strained' | 'insolvent' | 'bankrupt';
export type LinkTier = 'standard' | 'fast';

export interface SeededRng {
  seed: number;
  next(): number;
}

export interface Node {
  id: NodeId;
  kind: NodeKind;
  pos: { x: number; y: number };
  throughput: number;
  health: number;
  status: Status;
  buildTicksLeft: number;
  opexPerTick: number;
}

export interface Edge {
  id: EdgeId;
  a: NodeId;
  b: NodeId;
  capacityGbps: number;
  baseLatencyMs: number;
  status: Status;
  buildTicksLeft: number;
  opexPerTick: number;
}

export interface DemandProfile {
  baseGbps: number;
  growthPerTick?: number;
}

export interface TenantSla {
  maxLatencyMs: number;
  minServedRatio: number;
}

export interface Tenant {
  id: TenantId;
  name: string;
  source: NodeId;
  servers: NodeId[];
  primaryServer: NodeId;
  assignedLoadBalancer?: NodeId;
  demand: DemandProfile;
  sla: TenantSla;
  ratePerGbps: number;
  status: 'active' | 'churning';
  breachStreak: number;
}

export interface TechState {
  loadBalancerUnlocked: boolean;
}

export interface Incident {
  tick: number;
  tenant: TenantId;
  axis: 'latency' | 'availability';
  trigger: 'single_server_pressure' | 'oversubscription' | 'spof_failure' | 'cascading_reroute' | 'insolvency';
  bottleneck?: { edge?: EdgeId; node?: NodeId; pressure?: PressureBand; utilization?: number } | undefined;
  hadLoadBalancer: boolean;
  hadRedundancy: boolean;
}

export interface Project {
  id: ProjectId;
  name: string;
}

export interface Ticket {
  id: TicketId;
  createdTick: number;
  startsAtTick: number;
  target: { node?: NodeId; edge?: EdgeId };
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'active' | 'resolved';
}

export interface World {
  tick: number;
  balance: number;
  financialState: FinancialState;
  insolvencyTicks: number;
  reputation: number;
  tech: TechState;
  nodes: Map<NodeId, Node>;
  edges: Map<EdgeId, Edge>;
  tenants: Map<TenantId, Tenant>;
  projects: Project[];
  tickets: Ticket[];
  incidents: Incident[];
  rng: SeededRng;
  topologyVersion: number;
  nextId: number;
  lastDerived?: TickDerived | undefined;
}

export interface EdgeMetrics {
  edgeId: EdgeId;
  loadGbps: number;
  utilization: number;
  effectiveLatencyMs: number;
  pressure: PressureBand;
}

export interface FlowAllocation {
  tenantId: TenantId;
  from: NodeId;
  to: NodeId;
  viaLoadBalancer?: NodeId;
  path: NodeId[];
  edgeIds: EdgeId[];
  demandGbps: number;
  servedGbps: number;
  pressure: PressureBand;
}

export interface TenantService {
  tenantId: TenantId;
  demandedGbps: number;
  servedGbps: number;
  servedRatio: number;
  latencyMs: number;
  worstPressure: PressureBand;
  latencyCompliant: boolean;
  availabilityCompliant: boolean;
  compliant: boolean;
}

export interface TickDerived {
  edgeMetrics: Map<EdgeId, EdgeMetrics>;
  flowAllocations: FlowAllocation[];
  tenantService: Map<TenantId, TenantService>;
}

export type Command =
  | { type: 'PlaceNode'; kind: 'switch' | 'load_balancer'; pos: { x: number; y: number } }
  | { type: 'BuildLink'; a: NodeId; b: NodeId; tier: LinkTier }
  | { type: 'RemoveEdge'; edgeId: EdgeId }
  | { type: 'ResearchTech'; tech: 'load_balancer' }
  | { type: 'AssignLoadBalancer'; tenantId: TenantId; nodeId: NodeId };

export interface TimedCommand {
  tick: number;
  command: Command;
}

export interface Replay {
  seed: number;
  initialWorld: WorldSeed;
  commands: TimedCommand[];
}

export interface WorldSeed {
  balance?: number;
  nodes: Node[];
  edges: Edge[];
  tenants: Tenant[];
  tech?: TechState;
}

export interface CommandResult {
  ok: boolean;
  error?: string;
}

export interface WorldSnapshot {
  tick: number;
  balance: number;
  financialState: FinancialState;
  reputation: number;
  tech: TechState;
  nodes: Node[];
  edges: Edge[];
  tenants: Tenant[];
  incidents: Incident[];
  derived: {
    edgeMetrics: EdgeMetrics[];
    flowAllocations: FlowAllocation[];
    tenantService: TenantService[];
  };
}

const PRESSURE_RANK: Record<PressureBand, number> = {
  calm: 0,
  busy: 1,
  strained: 2,
  critical: 3,
  saturated: 4
};

export function createRng(seed: number): SeededRng {
  let state = seed >>> 0;
  return {
    seed,
    next() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };
}

export function createWorld(seed: number, initial: WorldSeed): World {
  return {
    tick: 0,
    balance: initial.balance ?? 1_000,
    financialState: 'solvent',
    insolvencyTicks: 0,
    reputation: 50,
    tech: initial.tech ?? { loadBalancerUnlocked: false },
    nodes: new Map(initial.nodes.map((node) => [node.id, { ...node, pos: { ...node.pos } }])),
    edges: new Map(initial.edges.map((edge) => [edge.id, { ...edge }])),
    tenants: new Map(initial.tenants.map((tenant) => [tenant.id, cloneTenant(tenant)])),
    projects: [],
    tickets: [],
    incidents: [],
    rng: createRng(seed),
    topologyVersion: 0,
    nextId: 1
  };
}

export function pressureBand(utilization: number): PressureBand {
  if (utilization < 0.5) return 'calm';
  if (utilization < 0.7) return 'busy';
  if (utilization < 0.85) return 'strained';
  if (utilization < 1.0) return 'critical';
  return 'saturated';
}

export function tick(world: World, commands: Command[] = []): World {
  return tickWithCommandResults(world, commands).world;
}

export function tickWithCommandResults(world: World, commands: Command[] = []): { world: World; results: CommandResult[] } {
  const next = cloneWorld(world);
  next.tick += 1;

  const results = commands.map((command) => applyCommand(next, command));

  advanceConstruction(next);
  const derived = routeFlows(next);
  evaluateSlaAndIncidents(next, derived);
  settleEconomy(next, derived);
  updateFinancialState(next);
  next.lastDerived = derived;
  return { world: next, results };
}

export function applyCommandsForDesign(world: World, commands: Command[]): { world: World; results: CommandResult[] } {
  const next = cloneWorld(world);
  const results = commands.map((command) => applyCommand(next, command));
  return { world: next, results };
}

export function applyCommand(world: World, command: Command): CommandResult {
  switch (command.type) {
    case 'ResearchTech': {
      if (command.tech !== 'load_balancer') return { ok: false, error: 'Unknown tech' };
      const cost = 100;
      if (world.balance < cost) return { ok: false, error: 'Not enough balance to research load balancer' };
      world.balance -= cost;
      world.tech.loadBalancerUnlocked = true;
      return { ok: true };
    }
    case 'PlaceNode': {
      if (!isInBounds(command.pos)) return { ok: false, error: 'Node position outside map bounds' };
      if (command.kind === 'load_balancer' && !world.tech.loadBalancerUnlocked) {
        return { ok: false, error: 'Load balancer tech is not unlocked' };
      }
      const cost = command.kind === 'load_balancer' ? 150 : 60;
      if (world.balance < cost) return { ok: false, error: 'Not enough balance to place node' };
      const id = nodeId(`${command.kind}-${world.nextId++}`);
      world.nodes.set(id, {
        id,
        kind: command.kind,
        pos: { ...command.pos },
        throughput: command.kind === 'load_balancer' ? 100 : 80,
        health: 1,
        status: 'ok',
        buildTicksLeft: 0,
        opexPerTick: command.kind === 'load_balancer' ? 3 : 1
      });
      world.balance -= cost;
      world.topologyVersion += 1;
      return { ok: true };
    }
    case 'BuildLink': {
      const validation = validateLinkBuild(world, command.a, command.b);
      if (!validation.ok) return validation;
      const tier = linkTier(command.tier);
      if (world.balance < tier.cost) return { ok: false, error: 'Not enough balance to build link' };
      const id = edgeId(`edge-${world.nextId++}`);
      world.edges.set(id, {
        id,
        a: command.a,
        b: command.b,
        capacityGbps: tier.capacityGbps,
        baseLatencyMs: tier.baseLatencyMs,
        status: 'ok',
        buildTicksLeft: 0,
        opexPerTick: tier.opexPerTick
      });
      world.balance -= tier.cost;
      world.topologyVersion += 1;
      return { ok: true };
    }
    case 'RemoveEdge': {
      if (!world.edges.has(command.edgeId)) return { ok: false, error: 'Edge does not exist' };
      world.edges.delete(command.edgeId);
      world.topologyVersion += 1;
      return { ok: true };
    }
    case 'AssignLoadBalancer': {
      if (!world.tech.loadBalancerUnlocked) return { ok: false, error: 'Load balancer tech is not unlocked' };
      const tenant = world.tenants.get(command.tenantId);
      if (!tenant) return { ok: false, error: 'Tenant does not exist' };
      const node = world.nodes.get(command.nodeId);
      if (!node || node.kind !== 'load_balancer') return { ok: false, error: 'Assigned node is not a load balancer' };
      if (node.status !== 'ok') return { ok: false, error: 'Assigned load balancer is not active' };
      world.tenants.set(command.tenantId, { ...tenant, assignedLoadBalancer: command.nodeId });
      return { ok: true };
    }
  }
}

export function runReplay(replay: Replay): WorldSnapshot {
  let world = createWorld(replay.seed, replay.initialWorld);
  const sorted = [...replay.commands].sort((a, b) => a.tick - b.tick);
  const finalTick = sorted.at(-1)?.tick ?? 0;
  for (let currentTick = 1; currentTick <= finalTick; currentTick += 1) {
    const commands = sorted.filter((entry) => entry.tick === currentTick).map((entry) => entry.command);
    world = tick(world, commands);
  }
  return snapshot(world);
}

export function snapshot(world: World): WorldSnapshot {
  const derived = world.lastDerived ?? routeFlows(world);
  return {
    tick: world.tick,
    balance: world.balance,
    financialState: world.financialState,
    reputation: world.reputation,
    tech: { ...world.tech },
    nodes: [...world.nodes.values()].map(cloneNode),
    edges: [...world.edges.values()].map((edge) => ({ ...edge })),
    tenants: [...world.tenants.values()].map(cloneTenant),
    incidents: world.incidents.map((incident) => ({ ...incident, bottleneck: incident.bottleneck ? { ...incident.bottleneck } : undefined })),
    derived: {
      edgeMetrics: [...derived.edgeMetrics.values()].map((metric) => ({ ...metric })),
      flowAllocations: derived.flowAllocations.map((flow) => ({ ...flow, path: [...flow.path], edgeIds: [...flow.edgeIds] })),
      tenantService: [...derived.tenantService.values()].map((service) => ({ ...service }))
    }
  };
}

export function routeFlows(world: World): TickDerived {
  const rawLoads = new Map<EdgeId, number>();
  const flowAllocations: FlowAllocation[] = [];
  const pendingFlows: Array<Omit<FlowAllocation, 'pressure'>> = [];
  const demandedByTenant = new Map<TenantId, number>();

  for (const tenant of world.tenants.values()) {
    if (tenant.status !== 'active') continue;
    const demand = demandAtTick(tenant.demand, world.tick);
    demandedByTenant.set(tenant.id, demand);
    const lb = validAssignedLoadBalancer(world, tenant);

    if (!lb) {
      addPendingFlow(world, pendingFlows, rawLoads, {
        tenantId: tenant.id,
        from: tenant.source,
        to: tenant.primaryServer,
        demandGbps: demand,
        servedGbps: demand
      });
      continue;
    }

    const healthyServers = tenant.servers.filter((serverId) => world.nodes.get(serverId)?.status === 'ok');
    if (healthyServers.length === 0) {
      pendingFlows.push({
        tenantId: tenant.id,
        from: tenant.source,
        to: lb.id,
        viaLoadBalancer: lb.id,
        path: [],
        edgeIds: [],
        demandGbps: demand,
        servedGbps: 0
      });
      continue;
    }

    addPendingFlow(world, pendingFlows, rawLoads, {
      tenantId: tenant.id,
      from: tenant.source,
      to: lb.id,
      viaLoadBalancer: lb.id,
      demandGbps: demand,
      servedGbps: demand
    });

    const share = demand / healthyServers.length;
    for (const serverId of healthyServers) {
      addPendingFlow(world, pendingFlows, rawLoads, {
        tenantId: tenant.id,
        from: lb.id,
        to: serverId,
        viaLoadBalancer: lb.id,
        demandGbps: share,
        servedGbps: share
      });
    }
  }

  const edgeMetrics = new Map<EdgeId, EdgeMetrics>();
  for (const edge of world.edges.values()) {
    const loadGbps = rawLoads.get(edge.id) ?? 0;
    const utilization = loadGbps / edge.capacityGbps;
    const pressure = pressureBand(utilization);
    const effectiveLatencyMs = edge.baseLatencyMs * latencyMultiplier(utilization);
    edgeMetrics.set(edge.id, { edgeId: edge.id, loadGbps, utilization, effectiveLatencyMs, pressure });
  }

  for (const flow of pendingFlows) {
    const pressure = worstPressure(flow.edgeIds.map((edge) => edgeMetrics.get(edge)?.pressure ?? 'calm'));
    flowAllocations.push({ ...flow, pressure });
  }

  const tenantService = new Map<TenantId, TenantService>();
  for (const tenant of world.tenants.values()) {
    const demandedGbps = demandedByTenant.get(tenant.id) ?? 0;
    const flows = flowAllocations.filter((flow) => flow.tenantId === tenant.id);
    const terminalFlows = flows.filter((flow) => flow.to === tenant.primaryServer || tenant.servers.includes(flow.to));
    const servedGbps = terminalFlows.reduce((sum, flow) => sum + flow.servedGbps, 0);
    const servedRatio = demandedGbps === 0 ? 1 : Math.min(1, servedGbps / demandedGbps);
    const latencyMs = tenantLatency(flows, edgeMetrics);
    const worst = worstPressure(flows.map((flow) => flow.pressure));
    const latencyCompliant = latencyMs <= tenant.sla.maxLatencyMs && worst !== 'saturated';
    const availabilityCompliant = servedRatio >= tenant.sla.minServedRatio;
    tenantService.set(tenant.id, {
      tenantId: tenant.id,
      demandedGbps,
      servedGbps,
      servedRatio,
      latencyMs,
      worstPressure: worst,
      latencyCompliant,
      availabilityCompliant,
      compliant: latencyCompliant && availabilityCompliant
    });
  }

  return { edgeMetrics, flowAllocations, tenantService };
}

function addPendingFlow(
  world: World,
  pendingFlows: Array<Omit<FlowAllocation, 'pressure'>>,
  rawLoads: Map<EdgeId, number>,
  input: {
    tenantId: TenantId;
    from: NodeId;
    to: NodeId;
    viaLoadBalancer?: NodeId;
    demandGbps: number;
    servedGbps: number;
  }
): void {
  const pathResult = shortestPath(world, input.from, input.to);
  if (!pathResult) {
    pendingFlows.push({
      ...input,
      path: [],
      edgeIds: [],
      servedGbps: 0
    });
    return;
  }
  for (const edge of pathResult.edgeIds) {
    rawLoads.set(edge, (rawLoads.get(edge) ?? 0) + input.servedGbps);
  }
  pendingFlows.push({ ...input, path: pathResult.path, edgeIds: pathResult.edgeIds });
}

function shortestPath(world: World, start: NodeId, goal: NodeId): { path: NodeId[]; edgeIds: EdgeId[]; cost: number } | undefined {
  const startNode = world.nodes.get(start);
  const goalNode = world.nodes.get(goal);
  if (!startNode || !goalNode || startNode.status !== 'ok' || goalNode.status !== 'ok') return undefined;

  const distances = new Map<NodeId, number>([[start, 0]]);
  const previous = new Map<NodeId, { node: NodeId; edge: EdgeId }>();
  const open = new Set<NodeId>([start]);

  while (open.size > 0) {
    let current: NodeId | undefined;
    let best = Infinity;
    for (const candidate of open) {
      const distance = distances.get(candidate) ?? Infinity;
      if (distance < best) {
        best = distance;
        current = candidate;
      }
    }
    if (!current) break;
    open.delete(current);
    if (current === goal) break;

    for (const edge of world.edges.values()) {
      if (edge.status !== 'ok') continue;
      const neighbor = edge.a === current ? edge.b : edge.b === current ? edge.a : undefined;
      if (!neighbor) continue;
      const neighborNode = world.nodes.get(neighbor);
      if (!neighborNode || neighborNode.status !== 'ok') continue;
      const nextDistance = best + edge.baseLatencyMs;
      if (nextDistance < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, nextDistance);
        previous.set(neighbor, { node: current, edge: edge.id });
        open.add(neighbor);
      }
    }
  }

  if (!distances.has(goal)) return undefined;
  const path: NodeId[] = [goal];
  const edgeIds: EdgeId[] = [];
  let cursor = goal;
  while (cursor !== start) {
    const step = previous.get(cursor);
    if (!step) return undefined;
    path.unshift(step.node);
    edgeIds.unshift(step.edge);
    cursor = step.node;
  }
  return { path, edgeIds, cost: distances.get(goal) ?? 0 };
}

function evaluateSlaAndIncidents(world: World, derived: TickDerived): void {
  for (const tenant of world.tenants.values()) {
    const service = derived.tenantService.get(tenant.id);
    if (!service) continue;
    if (service.compliant) {
      tenant.breachStreak = 0;
      continue;
    }

    const wasNewBreach = tenant.breachStreak === 0;
    tenant.breachStreak += 1;
    if (!wasNewBreach) continue;

    const tenantFlows = derived.flowAllocations.filter((flow) => flow.tenantId === tenant.id);
    const bottleneckFlow = [...tenantFlows].sort((a, b) => PRESSURE_RANK[b.pressure] - PRESSURE_RANK[a.pressure])[0];
    const bottleneckEdge = bottleneckFlow?.edgeIds
      .map((id) => derived.edgeMetrics.get(id))
      .sort((a, b) => (b?.utilization ?? 0) - (a?.utilization ?? 0))[0];
    world.incidents.push({
      tick: world.tick,
      tenant: tenant.id,
      axis: service.availabilityCompliant ? 'latency' : 'availability',
      trigger: triggerFor(tenant, service),
      bottleneck: bottleneckEdge
        ? { edge: bottleneckEdge.edgeId, pressure: bottleneckEdge.pressure, utilization: bottleneckEdge.utilization }
        : undefined,
      hadLoadBalancer: Boolean(validAssignedLoadBalancer(world, tenant)),
      hadRedundancy: tenant.servers.length > 1
    });
  }
}

function triggerFor(tenant: Tenant, service: TenantService): Incident['trigger'] {
  if (!tenant.assignedLoadBalancer && tenant.servers.length > 1) return 'single_server_pressure';
  if (!service.availabilityCompliant) return 'spof_failure';
  return 'oversubscription';
}

function settleEconomy(world: World, derived: TickDerived): void {
  const revenue = [...derived.tenantService.values()].reduce((sum, service) => {
    const tenant = world.tenants.get(service.tenantId);
    if (!tenant) return sum;
    return sum + service.servedGbps * tenant.ratePerGbps * (service.compliant ? 1 : 0.5);
  }, 0);
  const opex = [...world.nodes.values()].reduce((sum, node) => sum + (node.status === 'ok' ? node.opexPerTick : 0), 0)
    + [...world.edges.values()].reduce((sum, edge) => sum + (edge.status === 'ok' ? edge.opexPerTick : 0), 0);
  world.balance += revenue - opex;
}

function updateFinancialState(world: World): void {
  if (world.balance >= 0) {
    world.insolvencyTicks = 0;
    world.financialState = world.balance < 100 ? 'strained' : 'solvent';
    return;
  }
  world.insolvencyTicks += 1;
  world.financialState = world.insolvencyTicks >= 10 ? 'bankrupt' : 'insolvent';
}

function advanceConstruction(world: World): void {
  for (const node of world.nodes.values()) {
    if (node.status === 'building') {
      node.buildTicksLeft -= 1;
      if (node.buildTicksLeft <= 0) node.status = 'ok';
    }
  }
  for (const edge of world.edges.values()) {
    if (edge.status === 'building') {
      edge.buildTicksLeft -= 1;
      if (edge.buildTicksLeft <= 0) edge.status = 'ok';
    }
  }
}

function demandAtTick(profile: DemandProfile, tickValue: number): number {
  return profile.baseGbps + (profile.growthPerTick ?? 0) * tickValue;
}

function validAssignedLoadBalancer(world: World, tenant: Tenant): Node | undefined {
  if (!world.tech.loadBalancerUnlocked || !tenant.assignedLoadBalancer) return undefined;
  const lb = world.nodes.get(tenant.assignedLoadBalancer);
  if (!lb || lb.kind !== 'load_balancer' || lb.status !== 'ok') return undefined;
  return lb;
}

function validateLinkBuild(world: World, a: NodeId, b: NodeId): CommandResult {
  if (a === b) return { ok: false, error: 'Cannot link a node to itself' };
  const aNode = world.nodes.get(a);
  const bNode = world.nodes.get(b);
  if (!aNode || !bNode) return { ok: false, error: 'Cannot link missing nodes' };
  if (aNode.status !== 'ok' || bNode.status !== 'ok') return { ok: false, error: 'Cannot link nodes that are not active' };
  for (const edge of world.edges.values()) {
    if ((edge.a === a && edge.b === b) || (edge.a === b && edge.b === a)) {
      return { ok: false, error: 'Duplicate links are not enabled yet' };
    }
  }
  return { ok: true };
}

function isInBounds(pos: { x: number; y: number }): boolean {
  return pos.x >= 0 && pos.y >= 0 && pos.x <= 10_000 && pos.y <= 10_000;
}

function linkTier(tier: LinkTier): { capacityGbps: number; baseLatencyMs: number; cost: number; opexPerTick: number } {
  return tier === 'fast'
    ? { capacityGbps: 120, baseLatencyMs: 1, cost: 120, opexPerTick: 2 }
    : { capacityGbps: 40, baseLatencyMs: 2, cost: 40, opexPerTick: 1 };
}

function latencyMultiplier(utilization: number): number {
  if (utilization <= 0.7) return 1;
  if (utilization >= 1) return 10;
  return 1 + ((utilization - 0.7) / 0.3) * 4;
}

function tenantLatency(flows: FlowAllocation[], edgeMetrics: Map<EdgeId, EdgeMetrics>): number {
  if (flows.length === 0) return Infinity;
  let weightedLatency = 0;
  let totalDemand = 0;
  for (const flow of flows) {
    const flowLatency = flow.edgeIds.reduce((sum, edgeIdValue) => sum + (edgeMetrics.get(edgeIdValue)?.effectiveLatencyMs ?? 0), 0);
    weightedLatency += flowLatency * flow.demandGbps;
    totalDemand += flow.demandGbps;
  }
  return totalDemand === 0 ? 0 : weightedLatency / totalDemand;
}

function worstPressure(bands: PressureBand[]): PressureBand {
  return bands.reduce<PressureBand>((worst, band) => (PRESSURE_RANK[band] > PRESSURE_RANK[worst] ? band : worst), 'calm');
}

function cloneWorld(world: World): World {
  return {
    ...world,
    tech: { ...world.tech },
    nodes: new Map([...world.nodes].map(([id, node]) => [id, cloneNode(node)])),
    edges: new Map([...world.edges].map(([id, edge]) => [id, { ...edge }])),
    tenants: new Map([...world.tenants].map(([id, tenant]) => [id, cloneTenant(tenant)])),
    projects: world.projects.map((project) => ({ ...project })),
    tickets: world.tickets.map((ticket) => ({ ...ticket, target: { ...ticket.target } })),
    incidents: world.incidents.map((incident) => ({ ...incident, bottleneck: incident.bottleneck ? { ...incident.bottleneck } : undefined })),
    rng: world.rng,
    lastDerived: undefined
  };
}

function cloneNode(node: Node): Node {
  return { ...node, pos: { ...node.pos } };
}

function cloneTenant(tenant: Tenant): Tenant {
  return { ...tenant, servers: [...tenant.servers], demand: { ...tenant.demand }, sla: { ...tenant.sla } };
}
