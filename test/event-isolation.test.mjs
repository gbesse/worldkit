import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,planScripted,commitTurn,replay} from '../src/index.mjs';import {villagers,behaviors} from '../examples/village.mjs';
test('returned event, plan source and recorded history have independent ownership',()=>{
 const initial=createWorld(villagers),id=villagers[0].id,plan=planScripted(initial,id,behaviors[id]);plan.source={kind:'fixture',meta:{revision:1}};
 const result=commitTurn(initial,plan),recorded=structuredClone(result.world.history);
 result.event.description='caller annotation';result.event.source.meta.revision=99;plan.source.meta.revision=88;plan.allowedActionIds.length=0;
 assert.deepEqual(result.world.history,recorded);assert.deepEqual(initial.history,[]);
 assert.equal(replay(initial,result.world.history).tick,1);
 result.world.history[0].event.source.meta.revision=77;assert.equal(result.event.source.meta.revision,99);
});
