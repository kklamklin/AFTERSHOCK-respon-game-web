// ตารางจับคู่ "ไอคอนในเกม" กับ "ชื่อไฟล์จริงใน assets/icons/"
//
// เจ้าของโปรเจกต์อัปไฟล์มาทั้งโฟลเดอร์โดยไม่เปลี่ยนชื่อ — การจับคู่จึงมาอยู่ที่นี่ที่เดียว
// ห้ามพิมพ์ชื่อไฟล์ไอคอนซ้ำที่อื่น ให้ import จากไฟล์นี้เสมอ
//
// ทุกอันมี emoji สำรองไว้ ถ้ายังไม่มีไฟล์ (หรือไฟล์เสีย) เกมจะใช้ emoji เดิมต่อไปได้
// ไม่พังทั้งจอ — probeIcons() เป็นคนตรวจว่าไฟล์ไหนโหลดได้จริงตอนเปิดเกม

const DIR = 'assets/icons/';

export const ICONS = {
  // ── ปุ่มควบคุมเวลา (§2) — หน้าตาเหมือนเดิม แค่เป็น vector ──────
  pause:  { file: 'pause-solid.svg',          emoji: '⏸' },
  play:   { file: 'play-solid.svg',           emoji: '▶' },
  speed1: { file: 'number1-square-solid.svg', emoji: '1️⃣' },
  speed2: { file: 'number2-square-solid.svg', emoji: '2️⃣' },

  // ── ไอคอนบัฟ (บนโซน + แผงข้อมูลตอนลาก) ────────────────────────
  crowd: { file: 'crowd-control.svg', emoji: '👥' },
  scan:  { file: 'eye-solid.svg',     emoji: '👁' },
  alert: { file: 'alliedalert.svg',   emoji: '⚠' },
  air:   { file: 'airdeploy.svg',     emoji: '🚁' },

  // ── ป้ายบอกประเภทสกิล (§3.1) ──────────────────────────────────
  skillField: { file: 'field-deploy.svg', emoji: '📥' },
  skillBuff:  { file: 'sparks-solid.svg', emoji: '✨' },

  // ── การ์ด Feed + สถานะ จนท. (§8 · §12) ────────────────────────
  success:   { file: 'check-circle-solid.svg', emoji: '🟢' },
  fail:      { file: null,                     emoji: '🔴' }, // ยังไม่มีไฟล์
  toolate:   { file: null,                     emoji: '⚫' }, // ยังไม่มีไฟล์
  injured:   { file: null,                     emoji: '🩹' }, // ยังไม่มีไฟล์
  lost:      { file: 'unconscious.svg',        emoji: '💀' },
  laststand: { file: 'finalstand.svg',         emoji: '⚡' },
  recovered: { file: 'heart-solid.svg',        emoji: '💚' },

  // ── ปุ่มหน้า Result ───────────────────────────────────────────
  home:   { file: 'home.svg', emoji: '🏠' },
  replay: { file: null,       emoji: '🔄' }, // ยังไม่มีไฟล์

  // ── รูปแทนตัวละครบนหน้าปก/tutorial ────────────────────────────
  opHuman:  { file: 'human.png',     emoji: '🥽' },
  opCat:    { file: 'beastfolk.png', emoji: '🐱' },
  opElf:    { file: 'elf.png',       emoji: '🧝' },
  opSpirit: { file: 'mytics.png',    emoji: '👻' },
};

// ไฟล์ที่ "โหลดได้จริง" — เติมโดย probeIcons() ตอนเปิดเกม
const available = new Set();

export function iconPath(key) {
  const spec = ICONS[key];
  return spec?.file && available.has(key) ? DIR + spec.file : null;
}

export function iconEmoji(key) {
  return ICONS[key]?.emoji ?? '';
}

/**
 * ลองโหลดไฟล์ไอคอนทุกอันครั้งเดียวตอนเปิดเกม
 * อันไหนโหลดไม่ได้ (ยังไม่ได้อัป / ชื่อไม่ตรง) ก็ปล่อยให้ใช้ emoji ต่อไป
 * เรียกก่อนวาดหน้าจอแรก เพื่อให้ทุกหน้ารู้ผลตรงกันตั้งแต่ต้น
 */
export function probeIcons() {
  const jobs = Object.entries(ICONS)
    .filter(([, spec]) => spec.file)
    .map(([key, spec]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { available.add(key); resolve(); };
      img.onerror = () => resolve();
      img.src = DIR + spec.file;
    }));
  return Promise.all(jobs);
}

/**
 * สร้าง element ของไอคอน 1 อัน — ได้ <img> ถ้ามีไฟล์ ไม่งั้นได้ <span> emoji
 * @param {string} key   คีย์ใน ICONS
 * @param {string} cls   class ที่จะติดให้
 * @param {string} label ข้อความบอกความหมาย (alt / title)
 */
export function iconNode(key, cls = '', label = '') {
  const path = iconPath(key);
  if (path) {
    const img = document.createElement('img');
    img.className = `game-icon ${cls}`.trim();
    img.src = path;
    img.alt = label;
    if (label) img.title = label;
    img.draggable = false;
    return img;
  }
  const span = document.createElement('span');
  span.className = `game-icon game-icon--emoji ${cls}`.trim();
  span.textContent = iconEmoji(key);
  if (label) span.title = label;
  return span;
}

// เปลี่ยนไอคอนของ element เดิมโดยไม่สร้างใหม่ (ใช้กับปุ่มที่สลับไปมาทุกลูป)
export function setIcon(node, key, label = '') {
  const path = iconPath(key);
  const isImg = node.tagName === 'IMG';
  if (path && isImg) {
    if (node.getAttribute('src') !== path) node.src = path;
    node.alt = label;
  }
  if (label) node.title = label;
  return path && isImg;
}
