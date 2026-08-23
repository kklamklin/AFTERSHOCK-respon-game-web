// Detail Feed มุมขวาบนของแผนที่ — อ้างอิง docs/GAMESCREEN_SPEC.md §8
//
// ขึ้นตอน จนท. ทำงานเสร็จเท่านั้น (ไม่ใช่ตอนสั่งลงพื้นที่) ซ้อนได้สูงสุด 3 ใบ แล้วจางหายเอง
// ไฟล์นี้อยู่ใน ui/ — รับ object ผลลัพธ์จาก systems/outcomes.js มาแสดงอย่างเดียว

import { OPERATORS } from '../data/operators.js';
import { zoneLabel } from '../systems/zones.js';

// ผลของการทอยอันตรายหลังภารกิจล้มเหลว (§4.3 · §5)
const DANGER_TEXT = {
  injured: (n) => `🩹 ${n} บาดเจ็บ`,
  lost: (n) => `💀 ${n} หมดสติ`,
  laststand: (n) => `⚡ ${n} ลุกขึ้นสู้ครั้งสุดท้าย!`,
};

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
      body = DANGER_TEXT[outcome.danger?.to]?.(name) ?? `${name} กลับฐาน ปลอดภัย`;
      if (outcome.danger?.to) cls = 'hurt';
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

  // ข้อความสั้น ๆ ที่ไม่ผูกกับโซน เช่น ฟื้นตัว / เข้า-ออก CRITICAL
  function pushNote(text, cls = 'ok') {
    const card = el('div', `feed-card feed-card--${cls}`);
    card.appendChild(el('div', 'feed-head', text));
    box.prepend(card);
    while (box.childElementCount > MAX_CARDS) box.lastElementChild.remove();
    const t = setTimeout(() => {
      card.classList.add('is-out');
      const t2 = setTimeout(() => { card.remove(); timers.delete(t2); }, 400);
      timers.add(t2); timers.delete(t);
    }, LIFETIME_MS);
    timers.add(t);
  }

  function clear() {
    for (const t of timers) clearTimeout(t);
    timers.clear();
    box.innerHTML = '';
  }

  return { box, push, pushNote, clear };
}
