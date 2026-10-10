// เทสรอบ 10.29 — เพิ่ม จนท. ใหม่ผ่านทะเบียนอย่างเดียว แล้วหน้าจอ/กฎใช้ได้จริง
// ใช้กับ "สำเนา" ของเกมที่เพิ่ม Rex (ภาคสนาม · สกิล dsar) กับ Hoot (ภาคฐาน · บัฟ heal มีช่อง) ไว้แล้ว
// รัน: URL=http://localhost:8124/index.html node tests/newop.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL ?? 'http://localhost:8124/index.html';
let pass = 0, fail = 0;
const ok = (c, n, e = '') => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, e); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1320, height: 600 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && m.text().includes('[operators]')) errs.push(m.text()); });
await p.addInitScript(() => localStorage.setItem('aftershocks:gameOpts', JSON.stringify({ skipStory: true, hints: true })));
await p.goto(URL);
await p.click('.screen--splash'); await p.waitForSelector('.menu-btn'); await sleep(1500);

// Intel → รายชื่อภาคสนามมี Rex · การ์ด Rex เปิดได้แม้ไม่มีข้อมูล Intel
await p.click('.menu-btn:has-text("Intel")'); await sleep(500);
await p.click('.intel-btn:text-is("Operator")'); await sleep(500);
await p.click('.intel-btn:has-text("Field")'); await sleep(500);
const roster = await p.$$eval('.roster-name', (n) => n.map((x) => x.textContent));
ok(roster.includes('Rex'), 'หน้า Intel ภาคสนามมี Rex', roster);
await p.click('.roster-row:has-text("Rex")'); await sleep(500);
ok((await p.textContent('body')).includes('Sniff & Dig'), 'การ์ด Rex เปิดได้ (ใช้ข้อมูลสำรอง) โชว์ชื่อสกิล');

// เข้าเกม
await p.goto(URL);
await p.click('.screen--splash'); await p.waitForSelector('.menu-btn'); await sleep(1500);
await p.click('.menu-btn:has-text("Play")'); await p.waitForSelector('.mode-play'); await p.click('.mode-play');
await p.waitForSelector('.hint-next', { timeout: 15000 });
const left = await p.$$eval('.game-side--left .op-name', (n) => n.map((x) => x.textContent));
const right = await p.$$eval('.game-side--right .op-name', (n) => n.map((x) => x.textContent));
ok(left.join() === 'Robertson,Lyla,Rex', 'แถบซ้ายมี 3 คน (Rex ต่อท้าย)', left);
ok(right.join() === 'Lia,Mudongzock,Hoot', 'แถบขวามี 3 คน (Hoot ต่อท้าย)', right);
ok(!!(await p.$('.skill-row[data-op="dog"][data-skill="dsar"]')) && !!(await p.$('.skill-row[data-op="owl"][data-skill="heal"]')), 'ไอคอนสกิลใหม่ขึ้นบนการ์ด');
const dogCost = await p.textContent('.skill-row[data-skill="dsar"] .skill-costs');
ok(dogCost.includes('−7') && dogCost.includes('−14') && !dogCost.includes('−0'), 'ราคา Rex ตาม config (แดงเข้าไม่ได้ ไม่มีป้าย)', dogCost);
ok((await p.$$('.skill-row[data-skill="heal"] .stack-dot')).length === 2, 'Hoot มีจุดบอกช่อง 2 ช่อง (maxStacks)');
// ข้ามคำใบ้ไปขั้น "ไอคอนสกิล" แล้วดูว่าชี้ได้
await p.click('.hint-next'); await sleep(250); await p.click('.hint-next'); await sleep(250);
ok((await p.textContent('.hint-box, .hint-bubble').catch(() => '')).includes('ไอคอนสกิล'), 'คำใบ้ขั้นไอคอนสกิลยังหาเป้าเจอ');
await p.click('.hint-skip');
await p.waitForFunction(() => AFTERSHOCK.state.running);

// คีย์ลัด: ลำดับ sar crowd hsar dsar | scan alert air heal → Rex = 4 · Hoot = 8
const zone = await p.$('[id^="zone-gray"]'); const bb = await zone.boundingBox();
await p.keyboard.press('4');
await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(400);
const dogMission = await p.evaluate(() => AFTERSHOCK.state.units.dog.mission);
ok(!!dogMission, 'กด 4 แล้วคลิกโซน → Rex ลงพื้นที่จริง', JSON.stringify(dogMission));
await p.keyboard.press('8');
await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(400);
const st = await p.evaluate(() => ({ stacks: AFTERSHOCK.state.units.owl.skillStacks.heal, buffs: Object.values(AFTERSHOCK.state.zones).flatMap((z) => z.buffs.map((b) => b.type + ':' + b.owner)) }));
ok(st.stacks === 1 && st.buffs.includes('heal:owl'), 'กด 8 แล้วคลิกโซน → บัฟของ Hoot ลงจริง ช่องเหลือ 1', JSON.stringify(st));
// Lyla ไม่ได้ลงพื้นที่ → หมุดที่ใช้รูปนี้มีได้แค่ของ Rex (mapIcon ของ Rex ยืมรูป Lyla มา)
await p.screenshot({ path: process.env.SHOT ?? '/dev/null' }).catch(() => {});
ok(await p.evaluate(() => [...document.querySelectorAll('.map-viewport [href]')].some((n) => n.getAttribute('href') === 'assets/skills/Field-op-Lyla-icon.png')), 'หมุด Rex ขึ้นบนแผนที่ (อ่าน mapIcon จากทะเบียน)');

// Dev Panel / Custom Game มีช่องของ Rex กับ Hoot เอง
await p.evaluate(() => localStorage.setItem('aftershocks:dlcUnlocked', '1'));
await p.goto(URL);
await p.click('.screen--splash'); await p.waitForSelector('.menu-dev-chip'); await sleep(1500);
await p.click('.menu-dev-chip'); await p.waitForSelector('.dev-start');
ok(!!(await p.$('[data-path="fieldSkills.dog.base"]')) && !!(await p.$('[data-path="buffs.heal.ap"]')), 'Custom Game มีช่องปรับของ Rex กับ Hoot เอง');

ok(errs.length === 0, 'ไม่มี error / ทะเบียนไม่เตือนอะไร', errs.join(' | '));
await b.close();
console.log(`\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
