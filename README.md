# NetBuilder

Implementation start for `Downloads/netbuilder-architecture-plan-v2.md`.

Current focus: a headless deterministic TypeScript simulation (`packages/sim`) plus a first browser visual debugger (`packages/app`) that renders a fixture topology, pressure-tinted links, flow allocations, and the simplified load-balancer mechanic.

## Commands

```bash
npm install
npm run check
npm run dev
```

Then open http://127.0.0.1:5173.

## Current browser slice

The app is a Phase 1 visual debugger, not the full playable MVP. You can:

- see Acme overload a single primary-server path,
- step the sim by ticks,
- research load balancer tech,
- install and assign a load balancer,
- watch traffic fan out across healthy servers,
- inspect pressure, flows, and incidents.
