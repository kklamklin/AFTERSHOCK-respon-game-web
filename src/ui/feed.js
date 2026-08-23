// Detail Feed มุมขวาบนของแผนที่ — อ้างอิง docs/GAMESCREEN_SPEC.md §8
//
// ขึ้นตอน จนท. ทำงานเสร็จเท่านั้น (ไม่ใช่ตอนสั่งลงพื้นที่) ซ้อนได้สูงสุด 3 ใบ แล้วจางหายเอง
// ไฟล์นี้อยู่ใน ui/ — รับ object ผลลัพธ์จาก systems/outcomes.js มาแสดงอย่างเดียว

import { OPERATORS } from '../data/operators.js';
import { zoneLabel } from '../systems/zones.js';
import { iconNode } from '../data/icons.js';
import { screenFlash } from './fx.js';

// ผลของการทอยอันตรายหลังภารกิจล้มเหลว (§4.3 · §5)
// คู่กับคีย์ไอคอนใน data/icons.js — ไม่มีไฟล์ก็ใช้ emoji เดิม
const DANGER_TEXT = {
  injured: (n) => `${n} บาดเจ็บ`,
  lost: (n) => `${n} หมดสติ`,
  laststand: (n) => `${n} ลุกขึ้นสู้ครั้งสุดท้าย!`,
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

    let headIcon;
    let bodyIcon = null;

    if (outcome.kind === 'success') {
      cls = 'ok';
      headIcon = 'success';
      head = `${zoneLabel(outcome.zoneId)} สำเร็จ`;
      body = `ช่วยได้ ${outcome.saved} คน (${outcome.pct}%)`;
    } else if (outcome.kind === 'toolate') {
      cls = 'late';
      headIcon = 'toolate';
      head = `${zoneLabel(outcome.zoneId)} ไปไม่ทัน`;
      body = `${name} กลับมามือเปล่า`;
    } else {
      cls = 'fail';
      headIcon = 'fail';
      head = `${zoneLabel(outcome.zoneId)} ไม่สำเร็จ`;
      body = DANGER_TEXT[outcome.danger?.to]?.(name) ?? `${name} กลับฐาน ปลอดภัย`;
      if (outcome.danger?.to) { cls = 'hurt'; bodyIcon = outcome.danger.to; }
    }

    const card = el('div', `feed-card feed-card--${cls}`);
    const headLine = el('div', 'feed-head');
    headLine.append(iconNode(headIcon, 'feed-glyph'), el('span', null, head));
    const bodyLine = el('div', 'feed-body');
    if (bodyIcon) bodyLine.appendChild(iconNode(bodyIcon, 'feed-glyph'));
    bodyLine.appendChild(el('span', null, body));
    card.append(headLine, bodyLine);
    box.prepend(card);
    screenFlash(cls); // จอกระพริบสีเดียวกับขอบการ์ด — เขียวสำเร็จ / แดงไม่สำเร็จ / เทาไปไม่ทัน

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
  function pushNote(text, cls = 'ok', iconKey = null) {
    const card = el('div', `feed-card feed-card--${cls}`);
    const line = el('div', 'feed-head');
    if (iconKey) line.appendChild(iconNode(iconKey, 'feed-glyph'));
    line.appendChild(el('span', null, text));
    card.appendChild(line);
    box.prepend(card);
    screenFlash(cls);
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
