// เอฟเฟกต์ภาพรวมทั้งเกม — ม่านดำตอนเปลี่ยนหน้า · จอกระพริบสี · กรอบเตือนสถานะ จนท.
//
// ไฟล์นี้อยู่ใน ui/ จึงทำหน้าที่ "แสดงผล" อย่างเดียว ไม่รู้กฎเกมเลย
// ทุกเอฟเฟกต์อยู่บนชั้นเดียวที่ลอยทับทุกหน้าจอ (สร้างครั้งเดียวตอนถูกเรียกครั้งแรก)
// ต่างจาก .screen-overlay ตรงที่มันไม่ถูกล้างทิ้งตอนเปลี่ยนหน้า ม่านดำจึงค้างคาไว้ข้ามหน้าได้

// ผู้เล่นที่ตั้งเครื่องให้ "ลดการเคลื่อนไหว" ไม่ควรโดนจอกระพริบ — ข้ามเอฟเฟกต์ให้เขา
function reduceMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

let layer = null;
let fadeEl = null;
let flashEl = null;
let frameEl = null;

function ensureLayer() {
  if (layer && layer.isConnected) return;
  layer = document.createElement('div');
  layer.className = 'fx-layer';

  frameEl = document.createElement('div');  // กรอบเตือนขอบจอ (บาดเจ็บ/หมดสติ)
  frameEl.className = 'fx-frame';

  flashEl = document.createElement('div');  // แฟลชสีตอน Detail Feed เด้ง
  flashEl.className = 'fx-flash';

  fadeEl = document.createElement('div');   // ม่านดำตอนเปลี่ยนหน้า — อยู่บนสุด ทับทุกอย่าง
  fadeEl.className = 'fx-fade';

  layer.append(frameEl, flashEl, fadeEl);
  document.body.appendChild(layer);
}

/**
 * เปลี่ยนหน้าโดยเฟดผ่านสีดำ — ดำสนิทก่อน แล้วค่อยสลับเนื้อหา แล้วค่อยจางออก
 * ระหว่างม่านทึบจะกินคลิกไว้ กันผู้เล่นกดปุ่มซ้ำตอนหน้ากำลังสลับ
 *
 * @param swap  ฟังก์ชันวาดหน้าใหม่ — ถูกเรียกตอนจอดำสนิท
 * @param inMs  เวลาเฟดเข้าดำ (มิลลิวินาที)
 * @param outMs เวลาเฟดออกจากดำ
 * @param hold  เวลาค้างจอดำหลังวาดหน้าใหม่เสร็จ
 */
export function fadeSwap(swap, { inMs = 260, outMs = 320, hold = 80 } = {}) {
  if (reduceMotion()) { swap(); return; }
  ensureLayer();

  fadeEl.style.setProperty('--fx-fade-ms', `${inMs}ms`);
  fadeEl.classList.add('is-blocking');
  // บังคับให้เบราว์เซอร์อ่านค่า opacity เดิมก่อน ไม่งั้นการเพิ่มคลาสในเฟรมเดียวกันจะไม่เกิด transition
  void fadeEl.offsetWidth;
  fadeEl.classList.add('is-on');

  setTimeout(() => {
    swap();
    setTimeout(() => {
      fadeEl.style.setProperty('--fx-fade-ms', `${outMs}ms`);
      fadeEl.classList.remove('is-on');
      setTimeout(() => fadeEl.classList.remove('is-blocking'), outMs);
    }, hold);
  }, inMs);
}

// แฟลชสีทั้งจอตอนมีการ์ด Detail Feed เด้ง (§8) — เขียว=สำเร็จ แดง=ไม่สำเร็จ เทา=ไปไม่ทัน
const FLASH_KINDS = new Set(['ok', 'fail', 'hurt', 'late']);

export function screenFlash(kind = 'ok') {
  if (reduceMotion() || !FLASH_KINDS.has(kind)) return;
  ensureLayer();
  // ถอดคลาสเดิมออกก่อนแล้ว reflow เพื่อให้ animation เริ่มใหม่ได้ แม้แฟลชรัว ๆ ติดกัน
  flashEl.className = 'fx-flash';
  void flashEl.offsetWidth;
  flashEl.className = `fx-flash fx-flash--${kind} is-on`;
}

/**
 * กรอบกะพริบรอบจอตามสถานะแย่ที่สุดของ จนท. ตอนนี้ (§12 · §13)
 * @param level null = ไม่มีอะไร · 'warn' = เหลือง (บาดเจ็บ) · 'danger' = แดง (หมดสติ/CRITICAL)
 */
let shownFrame = null;

export function setAlertFrame(level) {
  if (level === shownFrame) return;   // เรียกทุกเฟรมจาก paintLive จึงต้องกันการวาดซ้ำ
  ensureLayer();
  shownFrame = level;
  frameEl.className = level ? `fx-frame fx-frame--${level} is-on` : 'fx-frame';
}

/**
 * ไอคอนสกิลวูบสว่าง + วงแหวนกระเพื่อม ตอนสั่งงานสำเร็จ
 * วงแหวนไปเกาะที่กรอบนอก (.skill-icon-wrap) เพราะตัว .skill-icon มี overflow:hidden
 */
export function fireSkillIcon(iconEl) {
  if (!iconEl || reduceMotion()) return;
  const wrap = iconEl.closest('.skill-icon-wrap');
  for (const [node, cls] of [[iconEl, 'is-fired'], [wrap, 'is-fired']]) {
    if (!node) continue;
    node.classList.remove(cls);
    void node.offsetWidth; // reflow เพื่อให้กดรัว ๆ แล้วอนิเมชั่นเริ่มใหม่ได้ทุกครั้ง
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), 620);
  }
}

// ล้างเอฟเฟกต์ค้างตอนออกจากหน้าเกม (กรอบเตือนไม่ควรตามไปโผล่ที่หน้าเมนู)
export function clearFx() {
  if (!layer) return;
  shownFrame = null;
  frameEl.className = 'fx-frame';
  flashEl.className = 'fx-flash';
}
