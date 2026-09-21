// Purpose: Compile public imports and reject representative invalid calls without executing them.
import { createWorld, planScripted, commitTurn, replay, type Behavior } from '@gbesse/worldkit';
import { planWithJev } from '@gbesse/worldkit/jev';
const world = createWorld([{ id: 'a', name: 'Ada', role: 'traveler', stamina: 5, coins: 1, food: 1, trust: {} }]);
const behavior: Behavior = { schemaVersion: 1, id: 'resting', description: 'Rest', instructions: 'Rest when tired', priorities: ['rest', 'wait'] };
const next = commitTurn(world, planScripted(world, 'a', behavior)).world;
replay(world, next.history); void planWithJev;
// @ts-expect-error Unsupported action kinds cannot appear in behavior packs.
const invalid: Behavior = { ...behavior, priorities: ['teleport'] };
void invalid;
