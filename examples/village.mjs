// Purpose: Define fictional village actors and declarative behavior packs for the playable demo.
export const villagers = [
  { id: 'mira', name: 'Mira', role: 'generous gardener', stamina: 8, food: 5, coins: 2, trust: { oren: 20, tess: 20 } },
  { id: 'oren', name: 'Oren', role: 'careful merchant', stamina: 8, food: 3, coins: 8, trust: { mira: 20, tess: -10 } },
  { id: 'tess', name: 'Tess', role: 'tired traveler', stamina: 3, food: 0, coins: 5, trust: { mira: 10, oren: 0 } },
];
export const behaviors = {
  mira: { schemaVersion: 1, id: 'generous-gardener', description: 'Shares food and rests when tired.', instructions: 'Be a generous gardener. Favor giving food to a villager who has little. Rest when tired.', priorities: ['share', 'rest', 'greet', 'wait'] },
  oren: { schemaVersion: 1, id: 'careful-merchant', description: 'Trades with willing customers and regains stamina.', instructions: 'Be a careful merchant. Trade where allowed, conserve resources and rest when tired.', priorities: ['trade', 'rest', 'greet', 'wait'] },
  tess: { schemaVersion: 1, id: 'tired-traveler', description: 'Recovers energy before greeting the village.', instructions: 'Be a tired traveler. Recover energy and build trust with the villagers.', priorities: ['eat', 'rest', 'greet', 'wait'] },
};
