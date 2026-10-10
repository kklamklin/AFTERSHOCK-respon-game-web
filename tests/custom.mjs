// เทสรอบ 10.27 — Dev Panel + Custom Game + หน้ารหัส Building 21 ที่คืนกลับมา
// รัน: (ที่รากโปรเจกต์) python3 -m http.server 8123  แล้ว  node tests/custom.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const URL = process.env.URL ?? 'http://localhost:8123/index.html';
const CODE = '519850361295661';
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function freshPage(viewport = { width: 1320, height: 600 }, opts = { skipStory: true, hints: true }) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1000 });
  await ctx.addInitScript((o) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('aftershocks:gameOpts', JSON.stringify(o));
      sessionStorage.setItem('seeded', '1');
    }
  }, opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.click('.screen--splash');
  await page.waitForSelector('.screen--menu .menu-dev-chip');
  await sleep(1500); // รออนิเมชั่นเมนูขึ้นครบ
  return { ctx, page, errors };
}
const G = (page, fn) => page.evaluate(fn);

// ── 1. ปุ่ม DEV บนเมนู → รหัส → หน้า Custom Game ──────────────────
console.log('เมนู → Dev Panel');
{
  const { ctx, page, errors } = await freshPage();
  const chip = await page.$('.menu-dev-chip');
  const box = await chip.boundingBox();
  ok(box.x + box.width > 1320 * 0.85 && box.y + box.height > 600 * 0.85, 'ปุ่ม DEV PANEL อยู่มุมขวาล่าง', JSON.stringify(box));

  await chip.click();
  await page.waitForSelector('.dev-gate');
  ok(true, 'กดแล้วขึ้นหน้าใส่รหัส');
  await page.fill('.dev-gate-input', '123456789012345');
  await page.click('.dev-gate .dev-btn--go');
  ok((await page.textContent('.dev-gate-err')).includes('ไม่ถูกต้อง'), 'รหัสผิด → ขึ้นข้อความเตือน');
  ok(await G(page, () => localStorage.getItem('aftershocks:dlcUnlocked')) == null, 'รหัสผิด → ยังไม่ปลดล็อก Building 21');
  await page.fill('.dev-gate-input', CODE);
  await page.press('.dev-gate-input', 'Enter');
  await page.waitForSelector('[data-path="apStart"]');
  ok(true, 'รหัสถูก → เข้าหน้า Custom Game');
  ok(await G(page, () => !!localStorage.getItem('aftershocks:dlcUnlocked')), 'รหัสถูก → ปลดล็อก Building 21 ไปด้วย');

  // ปรับค่า
  await page.fill('[data-path="apStart"]', '500');
  await page.fill('[data-path="totalLoops"]', '24');           // โชว์เป็นชั่วโมง
  await page.fill('[data-path="totalSurvivors"]', '600');
  await page.fill('[data-path="fieldSkills.human.ap.gray"]', '3');
  await page.check('[data-flag="noInjury"]');
  const count = await page.textContent('.dev-count');
  ok(count.includes('5'), 'นับค่าที่ปรับได้ 5 อย่าง', count);
  ok(await page.$eval('[data-path="apStart"]', (n) => n.closest('.dev-field').classList.contains('is-changed')), 'ช่องที่ปรับมีกรอบเด่น');
  ok(await G(page, () => AFTERSHOCK.CONFIG.apStart) === 80, 'ยังไม่กดเริ่ม → CONFIG ยังเป็นค่าเกมหลัก');

  // ขั้นสูง
  await page.click('.dev-adv > summary');
  await page.fill('.dev-adv .dev-search', 'qte.rounds');
  ok((await page.$$('.dev-adv [data-path^="qte.rounds"]')).length > 0, 'ค่าขั้นสูงค้นหาได้');
  ok(!(await page.$('.dev-adv [data-path="loopsPerHour"]')), 'ค่าอันตราย (loopsPerHour) ถูกซ่อนจากรายการ');

  // เริ่ม Custom Game
  await page.click('.dev-start');
  await page.waitForSelector('.screen--game.is-custom .game-dev-btn');
  await page.waitForFunction(() => AFTERSHOCK.state.running === true, null, { timeout: 15000 });
  ok(!(await page.$('.dev-root')), 'เริ่มเกมแล้วแผงปิด');
  const st = await G(page, () => ({
    ap: AFTERSHOCK.state.ap, loops: AFTERSHOCK.CONFIG.totalLoops, cap: AFTERSHOCK.CONFIG.dangerCap,
    surv: Object.values(AFTERSHOCK.state.zones).reduce((s, z) => s + z.initial, 0),
    zones: Object.keys(AFTERSHOCK.state.zones).length,
  }));
  ok(st.ap === 500, 'AP เริ่มเกม = 500', st.ap);
  ok(st.loops === 48, 'ความยาวเกม 24 ชม. (48 ลูป)', st.loops);
  ok(st.cap === 0, 'ทางลัด "ไม่บาดเจ็บ" มีผล (dangerCap 0)');
  ok(st.surv === 600 && st.zones === 47, 'ผู้รอดรวม 600 คน · ยัง 47 โซน', JSON.stringify(st));
  ok(!(await page.$('.hint-box, .hint-bubble, .hint-shade')), 'Custom Game ไม่มีคำใบ้ (ทั้งที่ติ๊กคำใบ้ไว้)');
  const cost = await page.textContent('.skill-row[data-op="human"][data-skill="sar"]');
  ok(cost.includes('−3'), 'ราคาบนการ์ด Robertson เปลี่ยนตามค่าที่ปรับ (−3)', cost);

  // ── แผง DEV ในเกม ──
  await page.click('.game-dev-btn');
  await page.waitForSelector('.dev-root .dev-pre');
  ok(await G(page, () => AFTERSHOCK.state.running) === false, 'เปิดแผง DEV → เวลาหยุด');
  const pre = await page.textContent('.dev-pre');
  ok(pre.includes('AP') && pre.includes('500') && pre.includes('Robertson') && pre.includes('เทา'), 'แท็บตัวแปรโชว์ค่าจริง');
  ok(!pre.includes('undefined') && !pre.includes('NaN'), 'แท็บตัวแปรไม่มี undefined/NaN');
  await page.keyboard.press('p');
  ok(await G(page, () => AFTERSHOCK.state.running) === false, 'กด P ตอนแผงเปิด → ไม่ไปเดินเวลาในเกม');

  await page.click('.dev-tab[data-tab="tune"]');
  await page.click('[data-act="ap100"]');
  ok(await G(page, () => AFTERSHOCK.state.ap) === 600, 'ปุ่ม AP +100 ใช้ได้จริง');
  const h0 = await G(page, () => AFTERSHOCK.state.hour);
  await page.click('[data-act="skip1"]');
  ok(await G(page, () => AFTERSHOCK.state.hour) === h0 + 1, 'ปุ่มเดินเวลา +1 ชม. ใช้ได้จริง');
  await page.fill('.dev-body .dev-search', 'buffs.air.ap');
  await page.fill('.dev-body [data-path="buffs.air.ap"]', '1');
  await page.press('.dev-body [data-path="buffs.air.ap"]', 'Enter');
  await page.$eval('.dev-body [data-path="buffs.air.ap"]', (n) => n.dispatchEvent(new Event('change')));
  ok(await G(page, () => AFTERSHOCK.CONFIG.buffs.air.ap) === 1, 'แก้ CONFIG สดระหว่างเล่นได้');
  const airCost = await G(page, async () => (await import('/src/data/operators.js')).OPERATORS.spirit.skills.air.ap);
  ok(airCost === 1, 'ระบบสกิลเห็นราคาใหม่ทันที (ไม่ค้างค่าตอนโหลด)', airCost);

  await page.click('.dev-close');
  await page.waitForFunction(() => AFTERSHOCK.state.running === true);
  ok(true, 'ปิดแผง → เวลาเดินต่อเอง');

  // ข้ามไปจบเกม
  await page.click('.game-dev-btn');
  await page.click('.dev-tab[data-tab="tune"]');
  await page.click('[data-act="end"]');
  await page.waitForSelector('.screen--result', { timeout: 15000 });
  ok(!(await page.$('.dev-root')), 'จบเกมแล้วแผงปิดเอง');
  ok((await page.textContent('.res-title')).includes('CUSTOM'), 'หน้า Result บอกว่าเป็น Custom Game');
  ok((await page.textContent('.res-reason')).includes('24'), 'เหตุผลจบเกมใช้ความยาวเกมจริง (24 ชม.)', await page.textContent('.res-reason'));
  { const t = await G(page, () => AFTERSHOCK.state.totalRescued + AFTERSHOCK.state.totalCasualty); ok(Math.abs(t - 600) < 1e-6, 'ช่วยได้ + เสียชีวิต = 600 พอดี', t); }

  // กลับเมนู → ค่าเกมหลักกลับมา
  await page.click('.res-btn--home, .res-home, [data-res="home"]').catch(() => {});
  await page.waitForSelector('.screen--menu', { timeout: 8000 }).catch(() => {});
  if (!(await page.$('.screen--menu'))) {
    const btns = await page.$$('.screen--result button');
    await btns[0].click();
    await page.waitForSelector('.screen--menu');
  }
  const base = await G(page, () => ({ ap: AFTERSHOCK.CONFIG.apStart, loops: AFTERSHOCK.CONFIG.totalLoops, cap: AFTERSHOCK.CONFIG.dangerCap, air: AFTERSHOCK.CONFIG.buffs.air.ap, surv: AFTERSHOCK.CONFIG.totalSurvivors }));
  ok(base.ap === 80 && base.loops === 144 && base.cap === 0.72 && base.air === 20 && base.surv === 1200, 'กลับเมนู → CONFIG คืนเป็นค่าเกมหลักทั้งหมด', JSON.stringify(base));

  // เกมหลักต้องไม่โดนค่า custom และไม่มีปุ่ม DEV
  await page.click('.menu-btn:has-text("Play")');
  await page.waitForSelector('.mode-play');
  const b21 = await page.textContent('.mode-row:nth-child(2)');
  ok(!b21.includes('PASSCODE'), 'การ์ด Building 21 ไม่มีป้าย PASSCODE แล้ว (ปลดจาก Dev Panel)', b21);
  await page.click('.mode-play');
  await page.waitForSelector('.screen--game');
  await page.waitForFunction(() => AFTERSHOCK.state.running === true || document.querySelector('.hint-next'), null, { timeout: 15000 });
  ok(!(await page.$('.game-dev-btn')), 'เกมหลักไม่มีปุ่ม DEV');
  ok(!(await page.$('.screen--game.is-custom')), 'เกมหลักไม่ติดป้าย custom');
  ok(await G(page, () => AFTERSHOCK.state.ap) === 80, 'เกมหลัก AP เริ่ม 80 ตามปกติ');
  ok(await G(page, () => Object.values(AFTERSHOCK.state.zones).reduce((s, z) => s + z.initial, 0)) === 1200, 'เกมหลักผู้รอด 1,200');
  const mainCost = await page.textContent('.skill-row[data-op="human"][data-skill="sar"]');
  ok(mainCost.includes('−6'), 'เกมหลักราคา Robertson กลับเป็น −6', mainCost);
  await page.keyboard.down('Control'); await page.keyboard.down('Shift'); await page.keyboard.press('D');
  await page.keyboard.up('Shift'); await page.keyboard.up('Control');
  ok(!(await page.$('.dev-root')), 'Ctrl+Shift+D เปิดแผงในเกมหลักไม่ได้แล้ว');

  ok(errors.length === 0, 'ไม่มี error ใน console', errors.join(' | '));
  await ctx.close();
}

// ── 2. Building 21 ใส่รหัสในหน้าของตัวเองได้เหมือนเดิม ───────────────
console.log('Building 21 หน้ารหัสของตัวเอง');
{
  const { ctx, page, errors } = await freshPage();
  await page.click('.menu-btn:has-text("Play")');
  await page.waitForSelector('.mode-play');
  ok((await page.textContent('.mode-row:nth-child(2)')).includes('PASSCODE'), 'ยังไม่ปลดล็อก → ป้าย PASSCODE');
  await page.click('.mode-row:nth-child(2)');
  await page.click('.mode-play');
  await page.waitForSelector('.screen--dlccode .dlccode-input');
  ok(!(await page.$('.dev-root')), 'เข้าหน้ารหัสของ Building 21 (ไม่ใช่ Dev Panel)');
  await page.fill('.dlccode-input', '000');
  await page.click('.dlccode-submit');
  ok((await page.textContent('.dlccode-error')).includes('ไม่ถูกต้อง'), 'รหัสผิด → เตือน');
  await page.fill('.dlccode-input', CODE);
  await page.click('.dlccode-submit');
  await page.waitForSelector('.screen--blank');
  ok(true, 'รหัสถูก → เข้า Building 21 (หน้าว่าง)');
  // ปลดจาก B21 แล้ว Dev Panel ก็ไม่ถามรหัสซ้ำ
  await page.click('.screen--blank button');
  await page.waitForSelector('.mode-play');
  const back = await page.$('.screen--mode button');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.screen--menu .menu-dev-chip');
  await sleep(1500);
  await page.click('.menu-dev-chip');
  await page.waitForSelector('.dev-root');
  ok(!(await page.$('.dev-gate')) && !!(await page.$('[data-path="apStart"]')), 'ปลดที่ B21 แล้ว → Dev Panel ไม่ถามรหัสซ้ำ');
  // ค่าที่ปรับไว้ถูกจำ + ปุ่มคืนค่า
  await page.fill('[data-path="apStart"]', '123');
  await page.click('.dev-close');
  await page.click('.menu-dev-chip');
  await page.waitForSelector('[data-path="apStart"]');
  ok(await page.inputValue('[data-path="apStart"]') === '123', 'ปิดแล้วเปิดใหม่ ค่าที่ปรับยังอยู่');
  await page.click('.dev-foot .dev-btn:not(.dev-btn--go)');
  ok(await page.inputValue('[data-path="apStart"]') === '80' && (await page.textContent('.dev-count')).includes('ค่าเกมหลัก'), 'ปุ่มคืนค่าเกมหลักใช้ได้');
  await page.keyboard.press('Escape');
  ok(!(await page.$('.dev-root')), 'Esc ปิดแผง');
  ok(errors.length === 0, 'ไม่มี error ใน console', errors.join(' | '));
  await ctx.close();
}

// ── 3. มือถือ: ปุ่มกดโดน ────────────────────────────────────────────
console.log('มือถือ');
for (const vp of [{ width: 667, height: 375 }, { width: 844, height: 390 }, { width: 740, height: 360 }]) {
  const { ctx, page } = await freshPage(vp);
  const b = await (await page.$('.menu-dev-chip')).boundingBox();
  ok(b.height >= 24 && b.x + b.width <= vp.width && b.y + b.height <= vp.height, `${vp.width}×${vp.height} ปุ่ม DEV สูง ${b.height.toFixed(0)}px อยู่ในจอ`);
  await page.tap('.menu-dev-chip');
  await page.waitForSelector('.dev-gate-input');
  await page.fill('.dev-gate-input', CODE);
  await page.tap('.dev-gate .dev-btn--go');
  await page.waitForSelector('.dev-start');
  const s = await (await page.$('.dev-start')).boundingBox();
  ok(s.y + s.height <= vp.height && s.height >= 30, `${vp.width}×${vp.height} ปุ่มเริ่ม Custom Game เห็นโดยไม่ต้องเลื่อน`, JSON.stringify(s));
  await page.tap('.dev-start');
  await page.waitForSelector('.game-dev-btn');
  const d = await (await page.$('.game-dev-btn')).boundingBox();
  ok(d.height >= 20 && d.x + d.width <= vp.width, `${vp.width}×${vp.height} ปุ่ม DEV ในเกมสูง ${d.height.toFixed(0)}px`);
  await ctx.close();
}

await browser.close();
console.log(`\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
