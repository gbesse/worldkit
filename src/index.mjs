// Purpose: Run bounded NPC actions with deterministic preconditions, effects and replayable state.
import { fingerprint } from '@gbesse/decisionpacks';
const ensure = (ok, message) => { if (!ok) throw new Error(message); };
const idValid = value => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(value) && !['constructor', 'prototype', '__proto__'].includes(value);
const ACTIONS = ['wait', 'rest', 'eat', 'greet', 'share', 'trade'];
const boundedInt = (n, low, high) => Number.isSafeInteger(n) && n >= low && n <= high;
export function validateWorld(world) {
  ensure(world?.schemaVersion === 1 && boundedInt(world.tick, 0, Number.MAX_SAFE_INTEGER - 1) && Array.isArray(world.actors) && Array.isArray(world.history), 'Invalid world');
  ensure(world.actors.length >= 1 && world.actors.length <= 20, 'World requires 1–20 actors');
  const ids = world.actors.map(a => a.id); ensure(new Set(ids).size === ids.length, 'Duplicate actor ids');
  for (const a of world.actors) {
    ensure(idValid(a.id) && typeof a.name === 'string' && a.name.length > 0 && typeof a.role === 'string', 'Invalid actor identity');
    ensure(boundedInt(a.stamina, 0, 10) && boundedInt(a.food, 0, 1_000_000) && boundedInt(a.coins, 0, 1_000_000), 'Invalid actor resources');
    ensure(a.trust && typeof a.trust === 'object' && !Array.isArray(a.trust), 'Actor trust map required');
    for (const [id, trust] of Object.entries(a.trust)) ensure(ids.includes(id) && id !== a.id && boundedInt(trust, -100, 100), 'Invalid trust relation');
  }
  return world;
}
export function validateBehavior(pack) {
  ensure(pack?.schemaVersion === 1 && idValid(pack.id) && typeof pack.description === 'string' && pack.description.length > 0, 'Invalid behavior pack');
  ensure(typeof pack.instructions === 'string' && pack.instructions.length > 0, 'Behavior instructions required');
  ensure(Array.isArray(pack.priorities) && pack.priorities.length > 0 && pack.priorities.every(a => ACTIONS.includes(a)) && new Set(pack.priorities).size === pack.priorities.length, 'Invalid or duplicate behavior actions');
  ensure(pack.priorities.includes('wait'), 'Behavior must include wait as an explicit no-action option');
  return pack;
}
export function createWorld(actors) { return validateWorld({ schemaVersion: 1, tick: 0, actors: structuredClone(actors), history: [] }); }
function actor(world, id) { const a = world.actors.find(a => a.id === id); ensure(a, 'Unknown actor'); return a; }
export function worldFingerprint(world) { validateWorld(world); return fingerprint({ tick: world.tick, actors: world.actors }); }
export function availableActions(world, actorId, behavior) {
  validateWorld(world); if (behavior) validateBehavior(behavior);
  const a = actor(world, actorId), result = [{ id: 'wait', kind: 'wait', targetId: null, description: 'Wait without changing resources.' }];
  if (a.stamina < 10) result.push({ id: 'rest', kind: 'rest', targetId: null, description: 'Rest to regain 2 stamina, capped at 10.' });
  if (a.food > 0 && a.stamina <= 7) result.push({ id: 'eat', kind: 'eat', targetId: null, description: 'Consume one food to regain 3 stamina.' });
  for (const b of [...world.actors].sort((a, b) => a.id.localeCompare(b.id))) {
    if (b.id === actorId) continue;
    if (a.stamina >= 1) result.push({ id: `greet:${b.id}`, kind: 'greet', targetId: b.id, description: `Greet ${b.name}; spend 1 stamina and increase their trust by 5.` });
    if (a.stamina >= 1 && a.food > 0 && b.food < 1_000_000) result.push({ id: `share:${b.id}`, kind: 'share', targetId: b.id, description: `Give ${b.name} one food; spend 1 stamina and increase their trust by 15.` });
    if (a.stamina >= 2 && a.food > 0 && b.food < 1_000_000 && a.coins <= 999_998 && b.coins >= 2 && (b.trust[a.id] ?? 0) >= 0) result.push({ id: `trade:${b.id}`, kind: 'trade', targetId: b.id, description: `Sell ${b.name} one food for 2 coins; spend 2 stamina. Their trust permits trade.` });
  }
  return behavior ? result.filter(action => behavior.priorities.includes(action.kind)) : result;
}
export function planScripted(world, actorId, behavior) {
  validateBehavior(behavior);
  const actions = availableActions(world, actorId, behavior);
  const selected = [...actions].sort((a, b) => behavior.priorities.indexOf(a.kind) - behavior.priorities.indexOf(b.kind) || a.id.localeCompare(b.id))[0];
  return { actorId, actionId: selected.id, expectedFingerprint: worldFingerprint(world), source: 'scripted', behaviorId: behavior.id, allowedActionIds: actions.map(a => a.id) };
}
export function commitTurn(world, plan) {
  validateWorld(world);
  ensure(plan?.expectedFingerprint === worldFingerprint(world), 'World changed since planning; request a fresh decision');
  const selected = availableActions(world, plan.actorId).find(a => a.id === plan.actionId);
  ensure(selected, 'Action is unknown or its preconditions no longer hold');
  ensure(Array.isArray(plan.allowedActionIds) && plan.allowedActionIds.includes(selected.id), 'Action was not allowed by the planned behavior');
  const next = structuredClone(world), a = actor(next, plan.actorId), b = selected.targetId ? actor(next, selected.targetId) : null;
  const trust = delta => { b.trust[a.id] = Math.min(100, (b.trust[a.id] ?? 0) + delta); };
  switch (selected.kind) {
    case 'wait': break;
    case 'rest': a.stamina = Math.min(10, a.stamina + 2); break;
    case 'eat': a.food--; a.stamina += 3; break;
    case 'greet': a.stamina--; trust(5); break;
    case 'share': a.stamina--; a.food--; b.food++; trust(15); break;
    case 'trade': a.stamina -= 2; a.food--; b.food++; a.coins += 2; b.coins -= 2; break;
    default: throw new Error('Unsupported action');
  }
  next.tick++;
  const event = { tick: next.tick, actorId: a.id, actionId: selected.id, source: plan.source, before: plan.expectedFingerprint, after: worldFingerprint(next), description: `${a.name}: ${selected.description}` };
  next.history.push({ plan: structuredClone(plan), event });
  validateWorld(next);
  return { world: next, event };
}
export function replay(initial, history) {
  validateWorld(initial); ensure(Array.isArray(history), 'History must be an array');
  let world = structuredClone(initial);
  for (const entry of history) {
    const result = commitTurn(world, entry.plan);
    ensure(fingerprint(result.event) === fingerprint(entry.event), 'Replay diverged from recorded event'); world = result.world;
  }
  return world;
}
