// Purpose: Write fictional CLI input documents without overwriting any existing file.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { villagers, behaviors } from './village.mjs';
import { createWorld } from '../src/index.mjs';
const destination = resolve(process.argv[2] ?? 'local-data');
await mkdir(destination, { recursive: true });
const fixtures = { 'world.json': createWorld(villagers), 'behaviors.json': behaviors };
for (const [name, value] of Object.entries(fixtures)) await writeFile(resolve(destination, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(`Fictional fixtures written to ${destination}`);
