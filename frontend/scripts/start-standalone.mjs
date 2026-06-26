import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const standaloneAppDir = join(root, '.next', 'standalone', 'frontend');
const serverFile = join(standaloneAppDir, 'server.js');

if (!existsSync(serverFile)) {
  console.error(`Standalone server not found at ${serverFile}. Run npm run build first.`);
  process.exit(1);
}

const standaloneStaticDir = join(standaloneAppDir, '.next', 'static');
const buildStaticDir = join(root, '.next', 'static');
const standalonePublicDir = join(standaloneAppDir, 'public');
const publicDir = join(root, 'public');

mkdirSync(join(standaloneAppDir, '.next'), { recursive: true });
if (existsSync(buildStaticDir)) {
  cpSync(buildStaticDir, standaloneStaticDir, { recursive: true, force: true });
}
if (existsSync(publicDir)) {
  cpSync(publicDir, standalonePublicDir, { recursive: true, force: true });
}

const child = spawn(process.execPath, ['server.js'], {
  cwd: standaloneAppDir,
  env: {
    ...process.env,
    PORT: process.env.PORT || '3000',
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
