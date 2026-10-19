// dist/ のページを手元の Chrome で開き、ストアに上げる PNG を out/ に書き出す
// 使い方：pnpm export（astro build のあとに実行される）
// 一部だけ：pnpm export -- --only=appstore/ja
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { CANVAS, FEATURE, LANGS, SLIDES, STORES } from '../src/data/slides.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'out');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript' };

// dist/ をそのまま配る小さなサーバー（画像を / からの絶対パスで読むため file:// では開かない）
const server = createServer((req, res) => {
  let path = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!path.startsWith(dist) || !existsSync(path)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const jobs = [];
for (const store of STORES) {
  for (const lang of LANGS) {
    SLIDES.forEach((_, i) => {
      const n = String(i + 1).padStart(2, '0');
      jobs.push({ key: `${store}/${lang}`, url: `/${store}/${lang}/${i + 1}/`, size: CANVAS[store], file: join(out, store, lang, `${n}.png`) });
    });
  }
}
for (const lang of LANGS) {
  jobs.push({ key: `googleplay/${lang}`, url: `/feature/${lang}/`, size: FEATURE, file: join(out, 'googleplay', lang, 'feature-graphic.png') });
}

const browser = await chromium.launch({ executablePath: CHROME });
try {
  for (const job of jobs.filter((j) => !only || j.key === only)) {
    const page = await browser.newPage({ viewport: { width: job.size.w, height: job.size.h }, deviceScaleFactor: 1 });
    await page.goto(base + job.url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    mkdirSync(dirname(job.file), { recursive: true });
    await page.screenshot({ path: job.file, clip: { x: 0, y: 0, width: job.size.w, height: job.size.h } });
    await page.close();
    console.log('wrote', job.file.replace(root + '/', ''));
  }
} finally {
  await browser.close();
  server.close();
}
