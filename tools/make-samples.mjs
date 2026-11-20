/* Render the two sample photos (drawn sunset scenes) to PNG files.
   Run: node tools/make-samples.mjs — writes tools/sample-boulevard.png and
   tools/sample-pier.png. Uses the Playwright install under gta6-01/tools. */
import { chromium } from '/home/hatch/workspace/makefun/gta6-01/tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const page = join(dir, 'sample-scene.html');

const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1200, height: 800 } });
for (const [scene, out] of [['boulevard', 'sample-boulevard.png'], ['pier', 'sample-pier.png']]) {
  await pg.goto('file://' + page + '?scene=' + scene);
  await pg.waitForFunction(() => document.title === 'ready');
  await pg.locator('#c').screenshot({ path: join(dir, out) });
  console.log('wrote', out);
}
await browser.close();
