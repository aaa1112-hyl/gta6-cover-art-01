/* Drive Sunset Cover Studio in headless Chromium and take its screenshots.
   Serves app/ locally, loads both sample photos, exports covers at two sizes
   and screenshots the editor twice. Writes screenshots/1-cover.jpg,
   2-editor.jpg, 3-cover-portrait.jpg, 4-editor-neon.jpg (each <= 1280px on
   the long side, JPEG q88). Also logs any console error or non-local request.
   Run: node tools/shots.mjs */
import { chromium } from '/home/hatch/workspace/makefun/gta6-01/tools/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const repo = dirname(dir);
const appDir = join(repo, 'app');
const shotsDir = join(repo, 'screenshots');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.ttf': 'font/ttf', '.txt': 'text/plain', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(appDir, path === '/' ? 'index.html' : path);
  if (!file.startsWith(appDir) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = 'http://127.0.0.1:' + port + '/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
page.on('request', (req) => {
  if (!req.url().startsWith(base) && !req.url().startsWith('data:') && !req.url().startsWith('blob:')) {
    problems.push('external request: ' + req.url());
  }
});

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.fonts && document.fonts.check('100px Anton'), null, { timeout: 10000 }).catch(() => {});

// Load both sample photos.
await page.locator('#photoInput').setInputFiles([
  join(dir, 'sample-boulevard.png'),
  join(dir, 'sample-pier.png')
]);
await page.waitForFunction(() => document.querySelectorAll('#photoList img').length === 2, null, { timeout: 10000 });
await page.waitForTimeout(800);

// 2 — editor with a photo loaded (sunset grade, hero2 layout).
await page.screenshot({ path: join(shotsDir, '2-editor.jpg'), type: 'jpeg', quality: 88 });
console.log('wrote 2-editor.jpg');

// 1 — exported 1920x1080 cover, scaled to 1280x720.
await page.locator('[data-size="1920x1080"]').click();
await page.waitForTimeout(400);
const dl1 = page.waitForEvent('download', { timeout: 10000 });
await page.locator('#exportBtn').click();
const download1 = await dl1;
await download1.saveAs(join(dir, 'export-1920.png'));
await scaleShot('export-1920.png', 1280, 720, '1-cover.jpg');
console.log('wrote 1-cover.jpg');

// 3 — exported 1080x1350 portrait cover, scaled to 1024x1280.
await page.locator('[data-size="1080x1350"]').click();
await page.waitForTimeout(400);
const dl2 = page.waitForEvent('download', { timeout: 10000 });
await page.locator('#exportBtn').click();
const download2 = await dl2;
await download2.saveAs(join(dir, 'export-1080x1350.png'));
await scaleShot('export-1080x1350.png', 1024, 1280, '3-cover-portrait.jpg');
console.log('wrote 3-cover-portrait.jpg');

// 4 — editor, neon grade, hero3 layout, second photo in a panel.
await page.locator('[data-grade="neon"]').click();
await page.locator('[data-layout="hero3"]').click();
await page.waitForTimeout(400);
await page.locator('#photoList img').nth(1).click();
await page.waitForTimeout(400);
await page.screenshot({ path: join(shotsDir, '4-editor-neon.jpg'), type: 'jpeg', quality: 88 });
console.log('wrote 4-editor-neon.jpg');

async function scaleShot(file, w, h, out) {
  const p2 = await browser.newPage({ viewport: { width: w, height: h } });
  const data = readFileSync(join(dir, file)).toString('base64');
  await p2.setContent('<body style="margin:0"><img src="data:image/png;base64,' + data + '" style="width:' + w + 'px;height:' + h + 'px;display:block"></body>');
  await p2.screenshot({ path: join(shotsDir, out), type: 'jpeg', quality: 88 });
  await p2.close();
}

console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no console errors, no external requests');
await browser.close();
server.close();
