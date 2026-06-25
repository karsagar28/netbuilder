import { useMemo, useState, type ReactNode } from 'react';
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
  calm: '#46d079',
  busy: '#b6e35a',
  strained: '#ffc83d',
  critical: '#ff913d',
  saturated: '#ff5b6e'
};

const nodeColors: Record<Node['kind'], string> = {
  border: '#4d97e8',
  switch: '#1fc3ac',
  load_balancer: '#9a78f0',
  server: '#46d079'
};

function runCommands(world: World, commands: Command[], log: LogEntry[]): World {
  const result = tickWithCommandResults(world, commands);
  result.results.forEach((commandResult, index) => {
    const command = commands[index];
    if (!command) return;
    if (commandResult.ok) {
      log.push({ kind: 'ok', message: friendlyCommand(command.type) });
    } else {
      log.push({ kind: 'error', message: `${friendlyCommand(command.type)}: ${commandResult.error ?? 'failed'}` });
    }
  });
  return result.world;
}

function friendlyCommand(type: Command['type']): string {
  if (type === 'ResearchTech') return 'Smoothie tech researched';
  if (type === 'PlaceNode') return 'Smoothie Balancer placed';
  if (type === 'BuildLink') return 'Cable snapped in';
  if (type === 'AssignLoadBalancer') return 'Traffic rerouted through balancer';
  return type;
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
  const health = service?.compliant ? 3 : shot.tech.loadBalancerUnlocked ? 2 : 1;
  const balancerLabel = tenant?.assignedLoadBalancer ? 'BALANCED' : shot.tech.loadBalancerUnlocked ? 'READY' : 'LOCKED';

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
      nextLog.push({ kind: 'info', message: 'The live round advanced one beat' });
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
    <main className="stage" aria-label="NetBuilder cozy browser prototype">
      <section className="hud brand">
        <div className="logo" aria-hidden="true">⌁</div>
        <div>
          <div className="title chunk out">NETBUILDER</div>
          <span className="chip"><span className="dot" />US-EAST · VISUAL DEBUGGER</span>
        </div>
      </section>

      <section className="hud centerHud">
        <div className="row">
          <span className="pill">TICK {shot.tick}</span>
          <span className="live"><span className="beat" />LIVE!</span>
        </div>
        <div className="timer"><i style={{ width: `${Math.min(92, 22 + shot.tick * 8)}%` }} /></div>
      </section>

      <section className="hud topRight">
        <div className="cred"><span className="coin chunk">$</span><span className="n">{shot.balance.toFixed(0)}</span></div>
        <div className="budget">
          <div className="lab">CUSTOMER HEARTS</div>
          <Hearts count={health} total={3} />
        </div>
      </section>

      <section className="sceneCard">
        <NetworkMap shot={shot} flows={tenantFlows} highlightedEdges={highlightedEdges} />
        <div className="legend">
          {Object.entries(pressureColors).map(([band, color]) => (
            <span key={band}><i style={{ background: color }} />{band}</span>
          ))}
        </div>
      </section>

      <aside className="hud dock">
        <div className="dockHead chunk">BUILD<small>cozy tools</small></div>
        <button className="tool" onClick={step}>
          <span className="ic blue">⏭️</span>
          <span><span className="tn">Step Beat</span><span className="tc">advance tick</span></span>
        </button>
        <button className="tool" onClick={researchLb} disabled={shot.tech.loadBalancerUnlocked}>
          <span className="ic purple">📚</span>
          <span><span className="tn">Smoothie Tech</span><span className="tc"><span className="miniCoin">$</span>90 research</span></span>
        </button>
        <button className="tool" onClick={installLb} disabled={!shot.tech.loadBalancerUnlocked || Boolean(tenant?.assignedLoadBalancer)}>
          <span className="ic purple">🥤</span>
          <span><span className="tn">Balancer</span><span className="tc"><span className="miniCoin">$</span>540 install</span></span>
        </button>
        <button className="tool" onClick={reset}>
          <span className="ic orange">🔄</span>
          <span><span className="tn">Reset</span><span className="tc">fresh round</span></span>
        </button>
      </aside>

      <section className="hud players">
        <TenantCard name="NEBULA" sub={balancerLabel} hearts={health} color="pink" />
        <TenantCard name="GLOBEX" sub="NEXT" hearts={2} color="yellow" muted />
        <TenantCard name="INITECH" sub="LATER" hearts={1} color="red" muted />
      </section>

      <section className="job hud">
        <span className="ribbon">CURRENT JOB!</span>
        <div className="jt chunk">{tenant?.name ?? 'NebulaMart'} <span className="tag">CLUSTER</span></div>
        <StatusBadge compliant={Boolean(service?.compliant)} />
        <div className="jd">
          Demand {service?.demandedGbps.toFixed(1) ?? '—'} Gbps · Pressure {service?.worstPressure ?? '—'} · {service?.latencyMs.toFixed(1) ?? '—'} ms
        </div>
        <div className="jf"><span className="reward"><span className="coin chunk">$</span>{service?.servedGbps.toFixed(0) ?? 0}/tick</span></div>
      </section>

      <section className="hud inspector">
        <Panel title="Flow Routes">
          <ul className="flowList">
            {tenantFlows.map((flow, index) => (
              <li key={`${flow.from}-${flow.to}-${index}`}>
                <strong>{pathLabel(flow, shot)}</strong>
                <span>{flow.servedGbps.toFixed(1)} Gbps · {flow.pressure}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Postmortem Feed">
          <ul className="logList">
            {shot.incidents.slice(-2).map((incident, index) => (
              <li className="error" key={`${incident.tick}-${index}`}>Tick {incident.tick}: {incident.trigger.replaceAll('_', ' ')}</li>
            ))}
            {log.slice(-4).map((entry, index) => <li className={entry.kind} key={`log-${index}`}>{entry.message}</li>)}
          </ul>
        </Panel>
      </section>
    </main>
  );
}

function NetworkMap({ shot, flows, highlightedEdges }: { shot: WorldSnapshot; flows: FlowAllocation[]; highlightedEdges: Set<EdgeId> }) {
  const nodesById = new Map(shot.nodes.map((node) => [node.id, node]));
  const metricsByEdge = new Map(shot.derived.edgeMetrics.map((metric) => [metric.edgeId, metric]));
  const activeSegments = new Set(flows.flatMap((flow) => flow.edgeIds));

  return (
    <svg className="networkMap" viewBox="0 0 640 430" role="img" aria-label="Cozy network topology map">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <pattern id="tile" width="48" height="24" patternUnits="userSpaceOnUse" patternTransform="skewY(-18)">
          <rect width="48" height="24" fill="#f4d4a3" />
          <path d="M0 0H48M0 24H48M0 0V24M48 0V24" stroke="#d09a5f" strokeWidth="1" opacity=".45" />
        </pattern>
      </defs>
      <rect x="14" y="18" width="612" height="390" rx="28" fill="url(#tile)" stroke="#2c2335" strokeWidth="4" />
      <path d="M64 350 C150 296 258 326 348 278 S510 238 594 176" fill="none" stroke="#e9bd7d" strokeWidth="34" strokeLinecap="round" opacity=".45" />
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
            <text x={(a.pos.x + b.pos.x) / 2} y={(a.pos.y + b.pos.y) / 2 - 12} className="edgeLabel">
              {metric?.pressure ?? 'calm'} · {metric?.loadGbps.toFixed(0) ?? 0}/{edge.capacityGbps}
            </text>
          </g>
        );
      })}
      {shot.nodes.map((node) => (
        <g key={node.id} filter={node.kind === 'load_balancer' ? 'url(#glow)' : undefined}>
          <ellipse cx={node.pos.x} cy={node.pos.y + 19} rx="31" ry="13" fill="#000" opacity=".14" />
          <circle cx={node.pos.x} cy={node.pos.y} r={node.kind === 'server' ? 25 : 29} fill={nodeColors[node.kind]} className="node" />
          <circle cx={node.pos.x - 9} cy={node.pos.y - 10} r="7" fill="#fff" opacity=".32" />
          <text x={node.pos.x} y={node.pos.y + 8} textAnchor="middle" className="nodeIcon">{icon(node)}</text>
          <text x={node.pos.x} y={node.pos.y + 49} textAnchor="middle" className="nodeLabel">{shortLabel(node.id)}</text>
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
        <circle key={index} r="5" fill={color} stroke="#2c2335" strokeWidth="2" className="flowDot" style={{ animationDelay: `${-(index * 0.55 + key * 0.01)}s` }}>
          <animateMotion dur="1.8s" repeatCount="indefinite" path={`M ${a.pos.x} ${a.pos.y} L ${b.pos.x} ${b.pos.y}`} />
        </circle>
      ))}
    </>
  );
}

function StatusBadge({ compliant }: { compliant: boolean }) {
  return <span className={compliant ? 'status ok' : 'status bad'}>{compliant ? 'Customer healthy' : 'SLA breach'}</span>;
}

function Hearts({ count, total }: { count: number; total: number }) {
  return <div className="hearts">{Array.from({ length: total }, (_, index) => <span className={index >= count ? 'gone' : undefined} key={index}>♥</span>)}</div>;
}

function TenantCard({ name, sub, hearts, color, muted = false }: { name: string; sub: string; hearts: number; color: 'pink' | 'yellow' | 'red'; muted?: boolean }) {
  return (
    <div className={muted ? 'pcard muted' : 'pcard'}>
      <div className={`band ${color}`}><div className="face" /></div>
      <div className="pbody"><div className="pname">{name}</div><div className="psub">{sub}</div><Hearts count={hearts} total={3} /></div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>;
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
