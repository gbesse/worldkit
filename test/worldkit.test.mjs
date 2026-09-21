// Purpose: Test bounded behavior, inventory conservation, stale decisions and replay with scripted/Jev choices.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, availableActions, planScripted, commitTurn, replay, worldFingerprint, validateBehavior } from '../src/index.mjs';
import { planWithJev } from '../src/jev.mjs';
import { villagers, behaviors } from '../examples/village.mjs';
const initial = () => createWorld(villagers);
function explicit(world, actorId, actionId) { return { actorId, actionId, expectedFingerprint: worldFingerprint(world), allowedActionIds: availableActions(world, actorId).map(a => a.id), source: 'test' }; }
const total = (world, field) => world.actors.reduce((n, actor) => n + actor[field], 0);
test('available actions obey stamina, resources and target trust', () => {
  const world = initial();
  assert.ok(!availableActions(world, 'tess').some(a => a.kind === 'share' || a.kind === 'trade'));
  assert.ok(!availableActions(world, 'tess').some(a => a.id === 'trade:oren'));
  world.actors[0].stamina = 0;
  assert.ok(!availableActions(world, 'mira').some(a => ['share', 'greet', 'trade'].includes(a.kind)));
});
test('sharing transfers food and raises the recipients trust', () => {
  const world = initial(), next = commitTurn(world, explicit(world, 'mira', 'share:tess')).world;
  assert.equal(total(next, 'food'), total(world, 'food')); assert.equal(next.actors[2].trust.mira, 25); assert.equal(world.tick, 0);
});
test('trading preserves total food and coins and debits stamina', () => {
  const world = initial(), next = commitTurn(world, explicit(world, 'oren', 'trade:mira')).world;
  assert.equal(total(next, 'food'), total(world, 'food')); assert.equal(total(next, 'coins'), total(world, 'coins')); assert.equal(next.actors[1].stamina, 6);
});
test('behavior whitelist excludes actions and unknown actions cannot execute', () => {
  const world = initial(), pack = { ...behaviors.mira, priorities: ['wait'] };
  const plan = planScripted(world, 'mira', pack); assert.equal(plan.actionId, 'wait');
  assert.throws(() => commitTurn(world, { ...plan, actionId: 'share:tess' }), /not allowed/);
  assert.throws(() => commitTurn(world, explicit(world, 'mira', 'teleport')), /unknown/);
});
test('delayed decisions cannot mutate a newer world', () => {
  const world = initial(), oldPlan = planScripted(world, 'mira', behaviors.mira);
  const next = commitTurn(world, explicit(world, 'tess', 'rest')).world;
  assert.throws(() => commitTurn(next, oldPlan), /changed/);
});
test('a scripted run replays exactly and tampered events are rejected', () => {
  let world = initial();
  for (let i = 0; i < 12; i++) { const id = villagers[i % 3].id; world = commitTurn(world, planScripted(world, id, behaviors[id])).world; }
  assert.equal(worldFingerprint(replay(initial(), world.history)), worldFingerprint(world));
  const history = structuredClone(world.history); history[0].event.after = 'changed';
  assert.throws(() => replay(initial(), history), /diverged/);
});
test('longer scripted simulation keeps all numeric invariants', () => {
  let world = initial();
  for (let i = 0; i < 150; i++) { const id = villagers[i % 3].id; world = commitTurn(world, planScripted(world, id, behaviors[id])).world; }
  for (const a of world.actors) { assert.ok(a.stamina >= 0 && a.stamina <= 10); assert.ok(a.food >= 0 && a.coins >= 0); }
});
test('invalid worlds and behavior code-like commands are rejected', () => {
  assert.throws(() => createWorld([{ ...villagers[0], food: -1 }]), /resources/);
  assert.throws(() => validateBehavior({ ...behaviors.mira, priorities: ['eval', 'wait'] }), /Invalid/);
});
test('Jev selects only a supplied action and uncertainty produces an explicit wait', async () => {
  const world = initial();
  const provider = async ({ model, state, questions }) => {
    assert.equal(state.behaviorId, 'gardener_v2');
    const keys = Object.keys(questions.action.criteria), best = keys[1];
    return { model, answers: { action: { type: 'choice', choice: best, confidence: 0.1, probabilities: Object.fromEntries(keys.map(k => [k, k === best ? 0.6 : 0.4 / (keys.length - 1)])) } } };
  };
  const plan = await planWithJev(world, 'mira', { ...behaviors.mira, id: 'gardener_v2' }, { provider });
  assert.equal(plan.actionId, 'wait'); assert.equal(plan.source, 'jev-uncertain-wait');
});
test('sole valid wait skips inference; provider errors never become silent game actions', async () => {
  const pack = { ...behaviors.mira, priorities: ['wait'] };
  assert.equal((await planWithJev(initial(), 'mira', pack)).source, 'only-valid-action');
  await assert.rejects(planWithJev(initial(), 'mira', behaviors.mira, { provider: async () => { throw new Error('offline'); } }), /offline/);
});
