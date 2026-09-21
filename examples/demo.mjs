// Purpose: Run and replay a deterministic fictional village with no model calls.
import { createWorld, planScripted, commitTurn, replay, worldFingerprint } from '../src/index.mjs';
import { villagers, behaviors } from './village.mjs';
const initial = createWorld(villagers); let world = initial;
console.log('WorldKit village — scripted demo; no Jev call');
for (let i = 0; i < 9; i++) {
  const id = villagers[i % villagers.length].id;
  const result = commitTurn(world, planScripted(world, id, behaviors[id])); world = result.world;
  console.log(`${world.tick}. ${result.event.description}`);
}
console.log(JSON.stringify({ actors: world.actors, replayMatches: worldFingerprint(replay(initial, world.history)) === worldFingerprint(world) }, null, 2));
