import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const frontendBuildDir = new URL('../frontend/.next', import.meta.url);
const checkUrl = process.env.CHECK_URL;

rmSync(frontendBuildDir, { recursive: true, force: true });

const build = spawnSync('npm', ['run', 'build', '--workspace', 'frontend'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (build.status !== 0) process.exit(build.status ?? 1);

if (checkUrl) {
  const html = await fetch(checkUrl).then((response) => {
    if (!response.ok) throw new Error(`${checkUrl} returned ${response.status}`);
    return response.text();
  });
  const origin = new URL(checkUrl).origin;
  const assets = [...html.matchAll(/\/_next\/static\/chunks\/[^"']+/g)].map((match) => match[0]);
  const failed = [];
  for (const asset of assets.slice(0, 40)) {
    const response = await fetch(`${origin}${asset}`);
    if (!response.ok) failed.push(`${asset} -> ${response.status}`);
  }
  if (failed.length > 0) {
    throw new Error(`Next assets failed:\n${failed.join('\n')}`);
  }
  console.log(`Validated ${Math.min(assets.length, 40)} Next assets from ${checkUrl}`);
}
