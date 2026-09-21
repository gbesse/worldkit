#!/usr/bin/env node
// Purpose: Play the village in a terminal or run bounded scripted/Jev simulations from JSON.
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { createWorld, availableActions, planScripted, commitTurn, worldFingerprint, replay } from '../src/index.mjs';
import { villagers, behaviors as demoBehaviors } from '../examples/village.mjs';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help') { console.log('worldkit play\nworldkit simulate WORLD.json BEHAVIORS.json TURNS OUTPUT.json [--jev]\nworldkit replay INITIAL_WORLD.json RUN.json\nSimulation is scripted unless --jev is supplied. No graphics/game-engine integration is included.'); return; }
  if (command === 'play') {
    if (args.length) throw new Error('play takes no arguments');
    let world = createWorld(villagers); const terminal = createInterface({ input: process.stdin, output: process.stdout });
    console.log('Commands: state | actions ACTOR | do ACTOR ACTION_ID | npc ACTOR | quit');
    try {
      while (true) {
        let line;
        try { line = await terminal.question('village> '); } catch (error) { if (error.code === 'ERR_USE_AFTER_CLOSE' || error.code === 'ABORT_ERR') break; throw error; }
        const [verb, id, actionId, ...extra] = line.trim().split(/\s+/);
        if (verb === 'quit') break;
        // Command validation failures are shown to the player and do not mutate the world.
        try {
          if (extra.length) throw new Error('Too many command arguments');
          if (verb === 'state') console.log(JSON.stringify(world.actors, null, 2));
          else if (verb === 'actions') console.log(availableActions(world, id));
          else if (verb === 'npc' || verb === 'do') {
            const plan = verb === 'npc' ? planScripted(world, id, demoBehaviors[id]) : { actorId: id, actionId, expectedFingerprint: worldFingerprint(world), allowedActionIds: availableActions(world, id).map(a => a.id), source: 'player' };
            const result = commitTurn(world, plan); world = result.world; console.log(result.event.description);
          } else throw new Error('Unknown command');
        } catch (error) { console.error(`Command rejected: ${error.message}`); }
      }
    } finally { terminal.close(); }
    return;
  }
  if (command === 'simulate') {
    if (args.length < 4 || args.length > 5 || (args[4] && args[4] !== '--jev')) throw new Error('Invalid simulation arguments');
    const initial = await read(args[0]), behaviors = await read(args[1]), turns = Number(args[2]);
    if (!Number.isSafeInteger(turns) || turns < 1 || turns > 1000) throw new Error('TURNS must be 1–1000');
    let world = initial;
    const decide = args[4] ? (await import('../src/jev.mjs')).planWithJev : planScripted;
    for (let i = 0; i < turns; i++) {
      const actorId = world.actors[i % world.actors.length].id;
      world = commitTurn(world, await decide(world, actorId, behaviors[actorId])).world;
    }
    await writeFile(args[3], JSON.stringify({ description: 'WorldKit run with original state and replayable bounded decisions.', initial, world }, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return;
  }
  if (command === 'replay' && args.length === 2) { const initial = await read(args[0]), run = await read(args[1]); console.log(JSON.stringify(replay(initial, run.world.history.slice(initial.history.length)), null, 2)); return; }
  throw new Error('Invalid arguments; use --help');
}
main().catch(error => { console.error(`worldkit: ${error.message}`); process.exitCode = 1; });
