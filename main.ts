/* Sunset Cover Studio — entry program (Node 22, standard library only).
   Copies app/ and screenshots/ into the output directory and writes
   dossier.json with buildDossier from vendor/makefun-app.ts, exactly as the
   scorer rebuilds it. Outside the grader, MAKEFUN_OUTPUT_DIR stands in
   for /output. Runs twice with the same bytes. */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(appDir)) throw new Error('missing app/ in ' + repoRoot);
if (!existsSync(shotsDir)) throw new Error('missing screenshots/ in ' + repoRoot);

if (existsSync(outputDir)) for (const entry of readdirSync(outputDir)) rmSync(join(outputDir, entry), { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log('wrote ' + outputDir + '/dossier.json (' + dossier.length + ' bytes)');
console.log('app files: ' + readdirSync(join(outputDir, 'app')).length + ' top-level entries; screenshots: ' + readdirSync(join(outputDir, 'screenshots')).join(', '));
