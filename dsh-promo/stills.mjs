// stills.mjs — render chosen timestamps to PNG for review.
// usage: node stills.mjs 0.5 4.2 7.6 ...  (writes qa/stills/t_XXX.png)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE || 'http://127.0.0.1:3599';
const times = process.argv.slice(2).map(Number).filter(Number.isFinite);
mkdirSync('qa/stills', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`${base}/index.html?w=1920&h=1080`, { waitUntil: 'load' });
await page.waitForFunction('window.READY === true', null, { timeout: 30000 });
for (const t of times) {
  await page.evaluate(tt => window.render(tt), t);
  await page.waitForTimeout(60);
  const name = `t_${t.toFixed(2).padStart(6, '0')}.png`;
  await page.screenshot({ path: `qa/stills/${name}` });
  console.log('wrote', name);
}
await browser.close();
