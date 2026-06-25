# NetBuilder Architecture Source of Truth

_Last updated: 2026-06-25_

NetBuilder is a cozy, educational network-building game about designing a cheap-but-resilient data-center network, then watching it survive live customer demand. The player is a **Network Architect**: they place servers, switches, cables, and flow-modifier devices, but they never edit configs, ACLs, routes, packet headers, or protocol details.

The core fantasy is:

> Design the network during planning time, then open the doors and see whether customers stay happy when real demand hits.

The closest gameplay reference is **PlateUp** for the phase loop — plan/build first, then run a service round — combined with **Mini Motorways** pressure escalation and clear, readable traffic flow.

---

## 1. Product Pillars

### 1.1 Fun first, networking second

The game teaches networking by making the consequences visible and tactile. It should not become a packet simulator or certification quiz. The player learns because congestion, bottlenecks, redundancy, and failure are represented as game pressure.

### 1.2 Graph shaping, not config editing

The player changes the **shape of the network graph**:

- place servers,
- place switches,
- draw cables,
- add load balancers,
- later add firewalls and specialized devices.

The simulation auto-routes. There are no routing tables, YAML files, subnet masks, BGP policies, or per-device config screens in the main game loop.

### 1.3 Design/Run tension

NetBuilder uses a two-phase loop:

1. **Design phase** — no customers are being served. The player spends money to arrange servers/network gear and prepare capacity.
2. **Run phase** — customers are live. Demand flows through the network, SLA pressure appears, tickets/failures can occur, and the player sees whether the design holds.

The important choice is made before the pressure starts: how much capacity and redundancy is worth paying for?

### 1.4 Readable before realistic

Simulation fidelity is “middle” fidelity: graph-flow modeling with truthful intuition, not ns-3-level protocol detail. Every mechanic should be inspectable and explainable in one or two UI sentences.

---

## 2. Player Experience

### 2.1 Session structure

A normal game loop should feel like this:

1. A customer/job appears with requirements: demand, service quality, payout, and maybe special constraints.
2. The player enters **Design phase**.
3. The player places customer servers and network devices.
4. The player starts **Run phase**.
5. Traffic flows. Customers gain or lose hearts based on service quality.
6. At the end of a run/day, the player receives money, warnings, postmortems, and the next design opportunity.
7. The network grows more complex over time.

### 2.2 What the player sees

The map is the main communication tool. It should show:

- devices as chunky, readable icons,
- cables as thick, animated paths,
- active traffic as moving packet dots/couriers,
- congestion as color pressure,
- customer health as hearts,
- current phase as a prominent HUD state.

### 2.3 What the player does not see

The player should not see or manage:

- packet headers,
- VLAN IDs,
- IP addresses,
- routing configs,
- load-balancer algorithms,
- CLI terminals,
- per-device configuration forms.

Those concepts can be hinted at through diegetic reports, but they should not be the interaction surface.

---

## 3. Game Mechanics

### 3.1 Core resources

#### Money / Credits

Money is the primary resource. It gates capex and punishes overbuilding.

Money changes through:

- buying devices,
- drawing cables,
- researching technologies,
- maintenance/opex drain,
- customer revenue during Run phase.

#### Customer Hearts

Hearts represent customer satisfaction/error budget. They are the friendly UI version of SLA compliance. When latency/availability is bad, hearts degrade.

#### Reputation

Reputation is a later/meta resource. It should influence project quality and customer difficulty: good service attracts better, larger, more demanding customers.

### 3.2 Customer demand

Customers generate demand in Gbps. Demand should have:

- a baseline,
- growth over time,
- fluctuation/bursts during Run phase,
- correlated spikes in later content.

Demand is the force that reveals whether the design is good.

### 3.3 SLA axes

NetBuilder’s teaching surface is intentionally small:

1. **Latency** — caused mostly by congestion.
2. **Availability** — caused mostly by failures and lack of redundancy.

These are surfaced as customer health/hearts and postmortem explanations.

### 3.4 Congestion and pressure

Each cable has capacity. As load approaches capacity, pressure rises:

- calm,
- busy,
- strained,
- critical,
- saturated.

The pressure curve should feel like a networking “knee”: utilization is safe until a threshold, then latency rises sharply. This makes oversubscription a bet instead of a binary failure.

### 3.5 Load balancer rule

Load balancers are not decorative. They are flow-control objects with a clear rule:

> Once a load balancer is placed and assigned for a customer/service, **all traffic for that service must flow through the load balancer**.

That means the active topology should not leave a direct primary-server shortcut that bypasses the balancer. The player should visually understand:

```text
source/border → switching fabric → load balancer → server pool
```

The load balancer then fans traffic out across healthy servers in the customer’s server pool. This teaches redundancy and horizontal scaling without config screens.

### 3.6 Servers

Servers are customer-serving endpoints. Architecture decision as of now:

- players should place/design servers during Design phase,
- customer jobs determine how many servers are needed and what demand they must serve,
- server icons should imply meaning visually rather than via node labels.

Current prototype still uses a fixture with pre-existing starter servers; the intended game architecture is player-placed servers during Design phase.

### 3.7 Tickets and failures

Tickets represent maintenance issues. They should be readable, targeted, and fair:

- a cable degrades,
- a switch fails,
- a server becomes unhealthy,
- later, a security incident appears.

Failures should reveal whether the player built redundancy. They should not feel like random unavoidable punishment.

### 3.8 Postmortems / RCA

When a customer breaches, the game should generate a deterministic postmortem explaining why:

- oversubscribed cable,
- no redundant path,
- missing load balancer,
- failure caused single point of failure,
- later: firewall/security problem.

Postmortems are the main teaching layer. They should be authored from simulation state, not hallucinated text.

---

## 4. Phase Model

### 4.1 Design phase

Design phase is planning/building time.

Rules:

- no customer packets move,
- no SLA evaluation should punish the player,
- the player can research/build/place devices,
- the player can arrange servers and network topology,
- time/ticks should not advance live service unless explicitly intended.

In code, Design phase commands should use a design-time command application helper rather than the live `tick` pipeline.

### 4.2 Run phase

Run phase is service time.

Rules:

- demand flows,
- routing/flow allocation is visible,
- cable pressure and latency are evaluated,
- revenue and opex settle,
- customer health can change,
- tickets/failures can matter.

The player can eventually perform limited emergency actions during Run phase, but the heart of the game is that good planning makes the run smooth.

### 4.3 Transition

Starting Run phase performs the first live tick and begins customer service. UI should clearly shift from **PLAN** to **LIVE**.

---

## 5. UI and Visual Direction

### 5.1 Aesthetic

The UI aesthetic is cozy, toy-like, readable, and portfolio-grade:

- cream/paper stage,
- chunky dark outlines,
- rounded cards,
- soft shadows,
- candy colors,
- friendly icons,
- Fredoka/Nunito-style chunky typography.

The reference mood is a cozy cartoon management game, not a serious enterprise NOC dashboard.

### 5.2 HUD layout

Current/proposed layout:

- top-left: NetBuilder brand and region chip,
- top-center: phase/tick and PLAN/LIVE status,
- top-right: credits and customer hearts,
- right: build/tool dock,
- bottom-left: customer cards,
- bottom-right: current job card,
- bottom center: flow route and postmortem panels.

### 5.3 Icon pack rules

Node identity should be implicit from iconography, not text labels.

Current icon pack lives at:

```text
packages/app/src/IconPack.tsx
```

Icons should remain:

- custom SVG or authored assets,
- thick outlined,
- consistent with UI palette,
- visually distinct at small size,
- free of boring text labels like “border” or “agg-1”.

Current icons:

- border/source: cloud gate,
- switch: traffic garden,
- load balancer: smoothie cup,
- server: server pod,
- research: book,
- run/step: play/tick button,
- reset: swirl.

### 5.4 Map readability

The map should prioritize immediate legibility:

- no individual node names on the map,
- thick cable strokes,
- animated packets only during Run phase,
- congestion labels only during Run phase,
- color pressure legend available but unobtrusive.

---

## 6. Technical Architecture

### 6.1 Repository layout

The repo uses an npm TypeScript workspace:

```text
/packages
  /sim   pure deterministic simulation package
  /app   Vite/React browser prototype and visual debugger
/docs
  ARCHITECTURE.md source-of-truth design document
```

Earlier architecture allowed for `/render` and `/ui` packages later. The current prototype keeps rendering/UI together in `/packages/app` until the boundary becomes worth splitting.

### 6.2 Simulation package

`packages/sim` is the core artifact. It should remain:

- pure TypeScript,
- deterministic,
- framework-agnostic,
- DOM-free,
- renderer-free,
- unit tested.

The sim owns authoritative world state and derived flow results.

Important exported concepts:

- `World`
- `Node`
- `Edge`
- `Tenant`
- `Command`
- `tick`
- `tickWithCommandResults`
- `applyCommandsForDesign`
- `snapshot`

### 6.3 App package

`packages/app` is the browser-facing visual prototype.

Current responsibilities:

- hold UI phase state (`design` / `run`),
- dispatch commands,
- render cozy HUD/cards/dock,
- render network map,
- display flow routes and postmortem feed,
- provide a visual debugger for the central mechanic.

The app should not become the source of simulation truth. It may hold UI-local state like phase, selected customer, open panels, and logs.

### 6.4 Data flow

Target data flow:

```text
player input
  → command(s)
  → sim command application / tick pipeline
  → World
  → snapshot
  → React/UI render
```

Design phase uses command application without advancing live service. Run phase uses ticks.

### 6.5 Determinism

All randomness should flow through the seeded RNG in the sim. This supports:

- reproducible tests,
- replay/debugging,
- save/load,
- deterministic postmortems.

Do not use `Math.random()` for simulation decisions.

### 6.6 Command model

Player actions become typed commands. Current command examples:

- `ResearchTech`
- `PlaceNode`
- `BuildLink`
- `RemoveEdge`
- `AssignLoadBalancer`

Commands return success/failure results so the UI can show friendly messages.

### 6.7 Snapshots and derived state

Derived fields like edge load, utilization, pressure, flow paths, and customer service state should be recomputed by the sim and published through snapshots.

The UI should read snapshots. It should not independently calculate gameplay outcomes.

---

## 7. Flow Solver Design

### 7.1 Static-cost routing

Routing should choose paths based on static graph cost such as base latency/hop cost, not live queue depth. Congestion is then a consequence of the selected paths.

This is deliberately simpler than an equilibrium solver and closer to the intuition that networks can become congested because routing does not magically dodge every temporary hot spot.

### 7.2 Load allocation

For a tenant/service:

- without a load balancer, traffic targets the primary server,
- with an assigned load balancer, all service traffic goes to the load balancer first,
- the load balancer fans out traffic across the server pool,
- unhealthy/unreachable servers should receive no traffic.

### 7.3 Pressure bands

Pressure bands translate utilization into UI language:

```text
calm → busy → strained → critical → saturated
```

These bands are both gameplay feedback and teaching surface.

---

## 8. Current Prototype State

As of this document:

- The project has a deterministic sim package and React/Vite app.
- The browser prototype has a cozy cartoon UI.
- The app has a Design/Run phase split.
- The current customer is NebulaMart Arcade.
- Researching Smoothie Tech unlocks the balancer.
- Placing the balancer removes the old direct primary-server cable and routes service through the balancer.
- Node labels have been removed from the map.
- Custom cozy SVG icons are used for node/tool identity.

Known prototype limitations:

- Server placement is not yet fully player-driven in the UI; current servers are fixture-backed.
- Only one scripted customer/scenario is present.
- Tickets/failures/security are not fully implemented in the browser loop.
- The app package currently combines UI and map rendering; this is acceptable for the prototype.

---

## 9. Design Choices to Preserve

These decisions are intentional and should not be casually changed:

1. The sim is the single source of truth.
2. UI and rendering subscribe to snapshots; they do not own game state.
3. Design phase must not accidentally advance live customer service.
4. Load-balanced service traffic must all pass through the load balancer.
5. Nodes should be icon-first, not name-label-first.
6. UI should be cozy/playful, not enterprise/dashboard sterile.
7. RCA/postmortems should be deterministic and grounded in sim state.
8. Complexity should appear as new mechanics/content, not config screens.

---

## 10. Near-Term Roadmap

### 10.1 Make Design phase real

- Add direct player placement for servers.
- Add direct player placement for switches/cables.
- Add drag/drop or click-to-place interactions.
- Add affordability and placement validation UX.

### 10.2 Make Run phase round-based

- Add a timed service round/day.
- End a run with results and postmortem summary.
- Return to Design phase for upgrades.

### 10.3 Expand customer/content loop

- Multiple customers.
- Job offers.
- Demand growth and bursts.
- Customer-specific requirements.

### 10.4 Add failure pressure

- Tickets targeting devices/cables.
- Device degradation.
- Availability breaches.
- Redundancy rewards.

### 10.5 Add firewall/security mechanic

Firewall should be another placed object with a simple rule:

> Attack flows must pass through a firewall before they can safely reach servers.

No firewall config screen for MVP.

---

## 11. Verification Commands

Use these commands from repo root:

```bash
npm run typecheck
npm run test
npm run build
npm run check
```

For browser verification:

```bash
npm run dev
# then open http://127.0.0.1:5173
```

Manual browser smoke path:

1. Confirm the app opens in Design phase.
2. Confirm no packet flow is visible during Design phase.
3. Click Smoothie Tech.
4. Click Balancer.
5. Confirm direct primary cable is gone and the balancer is present.
6. Click Start Run.
7. Confirm flow routes go through the load balancer.
8. Confirm Step Beat works only during Run phase.

---

## 12. Glossary

- **Design phase** — planning/building time before customers are served.
- **Run phase** — live service time where traffic flows and SLAs matter.
- **Tenant/customer** — a paying service/customer with demand and SLA needs.
- **SLA** — service quality requirement, currently latency/availability flavored.
- **Pressure** — player-facing congestion state derived from utilization.
- **Load balancer** — device that forces service traffic through itself and fans out to servers.
- **Snapshot** — immutable/read-only view of current world plus derived data for UI rendering.
