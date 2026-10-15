import {createWorld,planScripted,commitTurn,replayAudit} from '../src/index.mjs';
import {villagers,behaviors} from './village.mjs';
const initial=createWorld(villagers);let world=initial;
for(let index=0;index<3;index++){const id=villagers[index%villagers.length].id;world=commitTurn(world,planScripted(world,id,behaviors[id])).world;}
const edited=structuredClone(world.history);edited[1].event.after='tampered';
for(const lang of ['fr','en','es']){const audit=replayAudit(initial,edited,{lang});console.log(JSON.stringify({lang,valid:audit.valid,verifiedTurns:audit.verifiedTurns,failedAt:audit.failedAt,reason:audit.reason}));}
