# WorldKit

A small NPC decision runtime where the game engine owns the rules and Jev can choose among valid actions.

**Public alpha · Node.js 22+ · MIT · JavaScript SDK + playable terminal village.** Actors have food, coins, stamina and trust. Behavior packs select among bounded actions. Plans are tied to a world fingerprint, and recorded decisions replay without model calls.

## Play now

```sh
git clone https://github.com/gbesse/worldkit.git
cd worldkit
npm ci --ignore-scripts
npm run demo
node bin/worldkit.mjs play
```

Try `state`, `actions mira`, `do mira share:tess`, `npc oren`, and `quit`. `npc` uses the scripted behavior priorities in this interactive demo. This is a terminal game; no graphical interface or game-engine plugin is bundled.

## Simulate and replay

```sh
node examples/write-fixtures.mjs
node bin/worldkit.mjs simulate local-data/world.json local-data/behaviors.json 9 local-data/run.json
node bin/worldkit.mjs replay local-data/world.json local-data/run.json
```

To use Jev instead of scripted decisions, set `TYPESAFE_API_KEY` and add `--jev` to `simulate`, with a new output filename. Runs accept 1–1,000 turns and execute model decisions sequentially. Each request is bounded by DecisionPacks' provider deadline; total duration still grows with turn count. Replay consumes stored plans, not fresh model predictions.

## Embed it

```sh
npm install github:gbesse/worldkit#v0.1.1
```

```js
import { createWorld, planScripted, commitTurn, replay } from '@gbesse/worldkit';
const initial = createWorld([
  { id: 'mira', name: 'Mira', role: 'gardener', stamina: 6, food: 2, coins: 1, trust: {} },
]);
const behavior = {
  schemaVersion: 1, id: 'resting-gardener', description: 'Recover stamina.',
  instructions: 'Rest when tired.', priorities: ['rest', 'wait'],
};
const plan = planScripted(initial, 'mira', behavior);
const { world, event } = commitTurn(initial, plan);
const reconstructed = replay(initial, world.history);
```

Replace `planScripted` with `await planWithJev(world, actorId, behavior, options)` from `@gbesse/worldkit/jev` for optional model decisions. The model receives actors' names, roles, resources and trust, the current tick and available action descriptions. Keep secrets out of world state. [Public types](src/index.d.mts) describe the data model.

## Decisions and invariants

The six implemented action kinds are `wait`, `rest`, `eat`, `greet`, `share` and `trade`. Actors number 1–20. Food and coins are bounded integers, stamina is 0–10, trust is -100–100. Trades require sufficient stock, money, stamina and nonnegative buyer trust. Transfers conserve the transferred resource; eating consumes food.

Behavior packs include explicit `wait`, instructions and a priority list. The scripted planner uses priorities. Jev receives only currently valid actions allowed by the pack. A selected probability below the configurable threshold (default 0.8) produces an explicit uncertain wait. When wait is the only possible action, no API request occurs. API failures propagate rather than masquerading as choices.

`commitTurn` rechecks resource preconditions and the world fingerprint. A changed world requires a fresh plan. Plans and behavior allowlists are trusted engine data, not signed security boundaries. If replay starts from a world with existing history, pass only the appended history entries; the CLI handles this slice automatically.

## Boundaries and adoption thesis

There is no dialogue generator, long-term NPC memory, Unity/Godot plugin, sandbox for arbitrary plugin code, multiplayer server or live performance benchmark. Rules and action kinds are deliberately finite; adding a new action requires extending the engine and its tests. History lives in memory and snapshots, without compaction.

The potential advantage is reusable behavior packs, engine adapters and replay fixtures adopted across games. This alpha supplies the pack/runtime contract and a working game loop. It has not yet acquired an ecosystem or demonstrated player preference for Jev decisions.

## Shareable demo report

Run `npm run demo:report` to capture this repository’s bundled example as one JSON object with the project purpose, version and complete demo output. The command fails if the demo fails, so the report is useful when sharing a reproducible first look or reporting unexpected behavior. The bundled demo’s data and safety boundaries still apply.

## Validation and Jev integration

```sh
npm run typecheck
npm run check
npm test
npm run demo
```

CI runs these checks on Node.js 22 and 24 without a build step. Tests use fictional fixtures and injected model responses. **No live Jev call or model-quality benchmark was performed for this release.** The default adapter targets `jev-1.13.0` through the pinned [DecisionPacks](https://github.com/gbesse/decisionpacks) dependency, with response validation and explicit timeouts. Live requests require your TypeSafe account and may incur charges. See [TypeSafe's API documentation](https://docs.typesafe.ai/api) and [model documentation](https://docs.typesafe.ai/models).

Library errors propagate; CLI failures print to stderr and exit nonzero. Embedding applications own error reporting and administrator alerts. There is no telemetry or configured email service. See [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Related projects

[DecisionPacks](https://github.com/gbesse/decisionpacks) · [Autonomy Meter](https://github.com/gbesse/autonomy-meter) · [IntentBus](https://github.com/gbesse/intentbus) · [ExceptionOS](https://github.com/gbesse/exceptionos) · [Agent Mandates](https://github.com/gbesse/agent-mandates) · [MatchGraph](https://github.com/gbesse/matchgraph) · [WorldKit](https://github.com/gbesse/worldkit)

Independent projects; no affiliation with TypeSafe. MIT licensed.
