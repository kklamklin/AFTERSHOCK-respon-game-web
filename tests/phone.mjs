// เทสรอบ 10.28 — บล็อกมือถือ แต่ iPad/แท็บเล็ต/คอมเล่นได้
// รัน: python3 -m http.server 8123 ที่รากโปรเจกต์ แล้ว node tests/phone.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://localhost:8123/index.html';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const CASES = [
  ['iPhone 13 แนวนอน', devices['iPhone 13 landscape'], true],
  ['iPhone SE', devices['iPhone SE'], true],
  ['Pixel 7 แนวนอน', devices['Pixel 7 landscape'], true],
  ['Galaxy S9+', devices['Galaxy S9+'], true],
  ['iPad Mini แนวนอน', devices['iPad Mini landscape'], false],
  ['iPad Pro 11 แนวนอน', devices['iPad Pro 11 landscape'], false],
  ['iPad (iPadOS ปลอมเป็น Mac)', { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' }, false],
  ['Galaxy Tab S4 แนวนอน', devices['Galaxy Tab S4 landscape'], false],
  ['คอม 1366×768', { viewport: { width: 1366, height: 768 } }, false],
];
for (const [name, dev, blocked] of CASES) {
  const ctx = await b.newContext(dev);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL);
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({
    phone: document.documentElement.classList.contains('is-phone'),
    gate: getComputedStyle(document.querySelector('.phone-gate')).display !== 'none',
    game: !!document.querySelector('#screen-root').children.length,
    api: !!globalThis.AFTERSHOCK,
  }));
  const good = blocked ? (r.phone && r.gate && !r.game) : (!r.phone && !r.gate && r.game);
  if (good && !errs.length) { pass++; console.log('  ✓', name, blocked ? 'ถูกบล็อก' : 'เล่นได้'); }
  else { fail++; console.log('  ✗', name, JSON.stringify(r), errs); }
  await ctx.close();
}
await b.close();
console.log(`\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
