import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('generated');
const target = resolve('dist/generated');

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}

if (existsSync(source)) {
  cpSync(source, target, { recursive: true });
}

