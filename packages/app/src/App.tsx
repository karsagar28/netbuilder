import { useMemo, useState } from 'react';
import {
  createWorld,
  snapshot,
  tick,
  tickWithCommandResults,
  type Command,
  type EdgeId,
  type FlowAllocation,
  type Node,
  type NodeId,
  type PressureBand,
  type World,
  type WorldSnapshot
} from '@netbuilder/sim';
import { createFixture, ids } from './fixture.js';

type LogEntry = { kind: 'ok' | 'error' | 'info'; message: string };

const pressureColors: Record<PressureBand, string> = {
  calm: '#35d07f',
  busy: '#91d94f',
  strained: '#ffd166',
  critical: '#ff8a3d',
  saturated: '#ff4d6d'
};

const nodeColors: Record<Node['kind'], string> = {
  border: '#7dd3fc',
  switch: '#c4b5fd',
  load_balancer: '#f0abfc',
  server: '#86efac'
};

function runCommands(world: World, commands: Command[], log: LogEntry[]): World {
  const result = tickWithCommandResults(world, commands);
  result.results.forEach((commandResult, index) => {
    const command = commands[index];
    if (!command) return;
    if (commandResult.ok) {
      log.push({ kind: 'ok', message: command.type });
    } else {
      log.push({ kind: 'error', message: `${command.type}: ${commandResult.error ?? 'failed'}` });
    }
  });
  return result.world;
}

function edgeKey(a: NodeId, b: NodeId): string {
  return [a, b].sort().join('::');
}

export function App() {
  const [world, setWorld] = useState(() => tick(createWorld(42, createFixture())));
  const [selectedTenantId] = useState(ids.nebulaMart);
  const [log, setLog] = useState<LogEntry[]>([
    { kind: 'info', message: 'NebulaMart is overloading one rocket pod. Research a Smoothie Balancer to split traffic.' }
  ]);

  const shot = useMemo(() => snapshot(world), [world]);
  const tenant = shot.tenants.find((entry) => entry.id === selectedTenantId);
  const service = shot.derived.tenantService.find((entry) => entry.tenantId === selectedTenantId);
  const tenantFlows = shot.derived.flowAllocations.filter((flow) => flow.tenantId === selectedTenantId);
  const highlightedEdges = new Set<EdgeId>(tenantFlows.flatMap((flow) => flow.edgeIds));

  function update(mutator: (current: World, nextLog: LogEntry[]) => World) {
    setWorld((current) => {
      const nextLog = [...log];
      const nextWorld = mutator(current, nextLog);
      setLog(nextLog.slice(-8));
      return nextWorld;
    });
  }

  function step() {
    update((current, nextLog) => {
      nextLog.push({ kind: 'info', message: 'Advanced one tick' });
      return tick(current);
    });
  }

  function researchLb() {
    update((current, nextLog) => runCommands(current, [{ type: 'ResearchTech', tech: 'load_balancer' }], nextLog));
  }

  function installLb() {
    update((current, nextLog) =>
      runCommands(
        current,
        [
          { type: 'PlaceNode', kind: 'load_balancer', pos: { x: 270, y: 95 } },
          { type: 'BuildLink', a: ids.trafficGarden, b: ids.smoothieBalancer, tier: 'fast' },
          { type: 'BuildLink', a: ids.smoothieBalancer, b: ids.rocketA, tier: 'standard' },
          { type: 'BuildLink', a: ids.smoothieBalancer, b: ids.rocketB, tier: 'standard' },
          { type: 'BuildLink', a: ids.smoothieBalancer, b: ids.rocketC, tier: 'standard' },
          { type: 'AssignLoadBalancer', tenantId: ids.nebulaMart, nodeId: ids.smoothieBalancer }
        ],
        nextLog
      )
    );
  }

  function reset() {
    setWorld(tick(createWorld(42, createFixture())));
    setLog([{ kind: 'info', message: 'Reset NebulaMart.' }]);
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">NetBuilder Phase 1 Visual Debugger</p>
          <h1>Keep NebulaMart's rocket pods from melting down.</h1>
          <p>
            This is not the full MVP yet. It is the first browser-visible slice: a deterministic sim fixture,
            pressure-tinted links, flow inspection, and the load balancer mechanic.
          </p>
        </div>
        <div className="scoreCard">
          <span>Tick {shot.tick}</span>
          <strong>${shot.balance.toFixed(0)}</strong>
          <small>{shot.financialState} · rep {shot.reputation}</small>
        </div>
      </header>

      <section className="layout">
        <section className="mapPanel">
          <NetworkMap shot={shot} flows={tenantFlows} highlightedEdges={highlightedEdges} />
          <div className="legend">
            {Object.entries(pressureColors).map(([band, color]) => (
              <span key={band}><i style={{ background: color }} />{band}</span>
            ))}
          </div>
        </section>

        <aside className="sidePanel">
          <section className="panel">
            <h2>Controls</h2>
            <div className="buttons">
              <button onClick={step}>Step tick</button>
              <button onClick={researchLb} disabled={shot.tech.loadBalancerUnlocked}>Research Smoothie Tech</button>
              <button onClick={installLb} disabled={!shot.tech.loadBalancerUnlocked || Boolean(tenant?.assignedLoadBalancer)}>
                Install Smoothie Balancer
              </button>
              <button className="secondary" onClick={reset}>Reset</button>
            </div>
          </section>

          <section className="panel">
            <h2>{tenant?.name ?? 'Tenant'}</h2>
            <StatusBadge compliant={Boolean(service?.compliant)} />
            <dl className="metrics">
              <div><dt>Demand</dt><dd>{service?.demandedGbps.toFixed(1) ?? '—'} Gbps</dd></div>
              <div><dt>Served</dt><dd>{service?.servedGbps.toFixed(1) ?? '—'} Gbps</dd></div>
              <div><dt>Pressure</dt><dd>{service?.worstPressure ?? '—'}</dd></div>
              <div><dt>Latency</dt><dd>{service?.latencyMs.toFixed(1) ?? '—'} ms</dd></div>
              <div><dt>Balancer</dt><dd>{tenant?.assignedLoadBalancer ? 'assigned' : shot.tech.loadBalancerUnlocked ? 'researched' : 'locked'}</dd></div>
            </dl>
          </section>

          <section className="panel">
            <h2>Flow allocations</h2>
            <ul className="flowList">
              {tenantFlows.map((flow, index) => (
                <li key={`${flow.from}-${flow.to}-${index}`}>
                  <strong>{pathLabel(flow, shot)}</strong>
                  <span>{flow.servedGbps.toFixed(1)} Gbps · {flow.pressure}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Incident log</h2>
            <ul className="incidentList">
              {shot.incidents.slice(-4).map((incident, index) => (
                <li key={`${incident.tick}-${index}`}>
                  <strong>Tick {incident.tick}</strong> {incident.trigger.replaceAll('_', ' ')}
                </li>
              ))}
              {shot.incidents.length === 0 && <li>No incidents yet.</li>}
            </ul>
          </section>

          <section className="panel">
            <h2>Action log</h2>
            <ul className="logList">
              {log.map((entry, index) => <li className={entry.kind} key={index}>{entry.message}</li>)}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}

function NetworkMap({ shot, flows, highlightedEdges }: { shot: WorldSnapshot; flows: FlowAllocation[]; highlightedEdges: Set<EdgeId> }) {
  const nodesById = new Map(shot.nodes.map((node) => [node.id, node]));
  const metricsByEdge = new Map(shot.derived.edgeMetrics.map((metric) => [metric.edgeId, metric]));
  const activeSegments = new Set(flows.flatMap((flow) => flow.edgeIds));

  return (
    <svg className="networkMap" viewBox="0 0 640 430" role="img" aria-label="Network topology map">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {shot.edges.map((edge) => {
        const a = nodesById.get(edge.a);
        const b = nodesById.get(edge.b);
        if (!a || !b) return null;
        const metric = metricsByEdge.get(edge.id);
        const color = pressureColors[metric?.pressure ?? 'calm'];
        const highlighted = highlightedEdges.has(edge.id);
        return (
          <g key={edge.id}>
            <line x1={a.pos.x} y1={a.pos.y} x2={b.pos.x} y2={b.pos.y} className="linkUnderlay" />
            <line
              x1={a.pos.x}
              y1={a.pos.y}
              x2={b.pos.x}
              y2={b.pos.y}
              stroke={color}
              className={highlighted ? 'link highlighted' : 'link'}
            />
            {activeSegments.has(edge.id) && <FlowDots a={a} b={b} color={color} />}
            <text x={(a.pos.x + b.pos.x) / 2} y={(a.pos.y + b.pos.y) / 2 - 8} className="edgeLabel">
              {metric?.pressure ?? 'calm'} · {metric?.loadGbps.toFixed(0) ?? 0}/{edge.capacityGbps}
            </text>
          </g>
        );
      })}
      {shot.nodes.map((node) => (
        <g key={node.id} filter={node.kind === 'load_balancer' ? 'url(#glow)' : undefined}>
          <circle cx={node.pos.x} cy={node.pos.y} r={node.kind === 'server' ? 24 : 28} fill={nodeColors[node.kind]} className="node" />
          <text x={node.pos.x} y={node.pos.y + 8} textAnchor="middle" className="nodeIcon">{icon(node)}</text>
          <text x={node.pos.x} y={node.pos.y + 45} textAnchor="middle" className="nodeLabel">{shortLabel(node.id)}</text>
        </g>
      ))}
    </svg>
  );
}

function FlowDots({ a, b, color }: { a: Node; b: Node; color: string }) {
  const key = edgeKey(a.id, b.id).length;
  return (
    <>
      {[0, 1, 2].map((index) => (
        <circle key={index} r="4" fill={color} className="flowDot" style={{ animationDelay: `${-(index * 0.55 + key * 0.01)}s` }}>
          <animateMotion dur="1.8s" repeatCount="indefinite" path={`M ${a.pos.x} ${a.pos.y} L ${b.pos.x} ${b.pos.y}`} />
        </circle>
      ))}
    </>
  );
}

function StatusBadge({ compliant }: { compliant: boolean }) {
  return <span className={compliant ? 'status ok' : 'status bad'}>{compliant ? 'Customer healthy' : 'SLA breach'}</span>;
}

function icon(node: Node): string {
  if (node.kind === 'border') return '☁️';
  if (node.kind === 'switch') return '🌿';
  if (node.kind === 'load_balancer') return '🥤';
  if (node.id === ids.rocketA) return '🚀';
  if (node.id === ids.rocketB) return '🛸';
  return '🛰️';
}

const friendlyNames = new Map<NodeId, string>([
  [ids.cloudGate, 'Cloud Gate'],
  [ids.trafficGarden, 'Traffic Garden'],
  [ids.rocketA, 'Rocket Pod A'],
  [ids.rocketB, 'UFO Pod B'],
  [ids.rocketC, 'Satellite Pod C'],
  [ids.smoothieBalancer, 'Smoothie Balancer']
]);

function shortLabel(id: NodeId): string {
  return friendlyNames.get(id) ?? id;
}

function pathLabel(flow: FlowAllocation, shot: WorldSnapshot): string {
  const path = flow.path.length > 0 ? flow.path : [flow.from, flow.to];
  return path.map((id) => label(id, shot)).join(' → ');
}

function label(id: NodeId, shot: WorldSnapshot): string {
  const node = shot.nodes.find((entry) => entry.id === id);
  return node ? shortLabel(node.id) : id;
}
