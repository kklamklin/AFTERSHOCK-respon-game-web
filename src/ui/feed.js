// Detail Feed มุมขวาบนของแผนที่ — อ้างอิง docs/GAMESCREEN_SPEC.md §8
//
// ขึ้นตอน จนท. ทำงานเสร็จเท่านั้น (ไม่ใช่ตอนสั่งลงพื้นที่) ซ้อนได้สูงสุด 3 ใบ แล้วจางหายเอง
// ไฟล์นี้อยู่ใน ui/ — รับ object ผลลัพธ์จาก systems/outcomes.js มาแสดงอย่างเดียว

import { OPERATORS } from '../data/operators.js';
import { zoneLabel } from '../systems/zones.js';

const MAX_CARDS = 3;
const LIFETIME_MS = 6000;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function createFeed() {
  const box = el('div', 'game-feed');
  const timers = new Set();

  function push(outcome) {
    const name = OPERATORS[outcome.opKey].name;
    let cls;
    let head;
    let body;

    if (outcome.kind === 'success') {
      cls = 'ok';
      head = `🟢 ${zoneLabel(outcome.zoneId)} สำเร็จ`;
      body = `ช่วยได้ ${outcome.saved} คน (${outcome.pct}%)`;
    } else if (outcome.kind === 'toolate') {
      cls = 'late';
      head = `⚫ ${zoneLabel(outcome.zoneId)} ไปไม่ทัน`;
      body = `${name} กลับมามือเปล่า`;
    } else {
      cls = 'fail';
      head = `🔴 ${zoneLabel(outcome.zoneId)} ไม่สำเร็จ`;
      // รอบที่ 8 จะเติมสถานะบาดเจ็บต่อท้ายตรงนี้
      body = outcome.note ?? `${name} กลับฐาน`;
    }

    const card = el('div', `feed-card feed-card--${cls}`);
    card.append(el('div', 'feed-head', head), el('div', 'feed-body', body));
    box.prepend(card);

    while (box.childElementCount > MAX_CARDS) box.lastElementChild.remove();

    const t = setTimeout(() => {
      card.classList.add('is-out');
      const t2 = setTimeout(() => { card.remove(); timers.delete(t2); }, 400);
      timers.add(t2);
      timers.delete(t);
    }, LIFETIME_MS);
    timers.add(t);
  }

  function clear() {
    for (const t of timers) clearTimeout(t);
    timers.clear();
    box.innerHTML = '';
  }

  return { box, push, clear };
}
