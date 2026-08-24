// ระบบเสียงทั้งเกม — ไฟล์เดียวที่แตะ <audio>
//
// ไฟล์นี้อยู่ใน ui/ เพราะเสียงคือ "ผลลัพธ์ที่ผู้เล่นรับรู้" เหมือนภาพ — ไม่รู้กฎเกมเลย
// ที่อื่นเรียกแค่ playSfx('click') / startLoop('result') / stopLoop('result')
//
// ⚠️ เบราว์เซอร์บล็อกเสียงจนกว่าผู้เล่นจะแตะจอครั้งแรก (autoplay policy)
//    unlockAudio() จึงต้องถูกเรียกจากในเหตุการณ์ที่ผู้ใช้กดจริง ๆ
//    หน้าปกของเกมมี "แตะที่ไหนก็ได้เพื่อเริ่ม" อยู่แล้ว จังหวะนั้นคือจุดปลดล็อก

import { SOUNDS, soundPath } from '../data/sounds.js';

// เสียงสั้น: เตรียมหลายก๊อปปี้ต่อ 1 เสียง แล้วหมุนใช้
// ถ้าใช้ element เดียวแล้วกดรัว ๆ เสียงจะตัดตัวเองทิ้งทุกครั้ง ฟังเหมือนเสียงหาย
const pools = new Map();   // key → { nodes: [], next: 0 }
const loops = new Map();   // key → HTMLAudioElement

let unlocked = false;
let muted = false;

function makeNode(key) {
  const spec = SOUNDS[key];
  const el = new Audio(soundPath(key));
  el.preload = 'auto';
  el.volume = spec.volume ?? 1;
  if (spec.loop) el.loop = true;
  return el;
}

/** โหลดไฟล์เสียงทุกอันไว้ล่วงหน้า — เรียกตอนเปิดเกม เสียงจะได้ไม่มาช้าตอนกดครั้งแรก */
export function preloadSounds() {
  for (const [key, spec] of Object.entries(SOUNDS)) {
    if (spec.kind === 'sfx') {
      const nodes = Array.from({ length: spec.pool ?? 2 }, () => makeNode(key));
      pools.set(key, { nodes, next: 0 });
    } else {
      loops.set(key, makeNode(key));
    }
  }
}

/**
 * ปลดล็อกเสียง — ต้องเรียกจากในเหตุการณ์ที่ผู้ใช้กด/แตะจริงเท่านั้น
 * วิธีปลดคือลองเล่นแบบเงียบ ๆ 1 ครั้ง เบราว์เซอร์จะจำว่า "ผู้ใช้อนุญาตแล้ว"
 */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  for (const { nodes } of pools.values()) {
    const el = nodes[0];
    const vol = el.volume;
    el.volume = 0;
    el.play().then(() => {
      el.pause();
      el.currentTime = 0;
      el.volume = vol;
    }).catch(() => { el.volume = vol; }); // ปลดไม่สำเร็จก็ปล่อยไป เกมยังเล่นได้ปกติ
  }
}

/** เสียงสั้น — เล่นซ้อนกันได้ ไม่ตัดตัวเอง */
export function playSfx(key) {
  if (muted) return;
  const pool = pools.get(key);
  if (!pool) return;
  const el = pool.nodes[pool.next];
  pool.next = (pool.next + 1) % pool.nodes.length;
  el.currentTime = 0;
  // เบราว์เซอร์ปฏิเสธได้ถ้ายังไม่ปลดล็อก — กลืน error ไว้ ห้ามให้เกมพัง
  el.play().catch(() => {});
}

/** เริ่มเสียงยาวจากต้นไฟล์ (ถ้ากำลังเล่นอยู่จะเริ่มใหม่) */
export function startLoop(key) {
  if (muted) return;
  const el = loops.get(key);
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

/** หยุดเสียงยาวและกรอกลับต้นไฟล์ — ใช้ตอนออกจากหน้า/จบเหตุการณ์ */
export function stopLoop(key) {
  const el = loops.get(key);
  if (!el) return;
  el.pause();
  el.currentTime = 0;
}

/** พักไว้ตรงที่ค้าง (ไม่กรอกลับ) — ใช้ตอนกดหยุดเวลา */
export function pauseLoop(key) {
  loops.get(key)?.pause();
}

/**
 * เล่นต่อจากที่ค้างไว้ (ไม่กรอกลับ) — ใช้ตอนกดเดินเวลาต่อ
 * ไฟล์ที่เล่นจนจบแล้วจะไม่เล่นซ้ำ และไฟล์ที่ยังไม่เคยเริ่มก็ไม่เริ่มให้เอง
 * ผู้เรียกเป็นคนรู้เองว่าเคยสั่ง startLoop ไปแล้วหรือยัง
 */
export function resumeLoop(key) {
  if (muted) return;
  const el = loops.get(key);
  if (!el || el.ended) return;
  el.play().catch(() => {});
}

/** เสียงยาวอันนี้กำลังเล่นหรือค้างอยู่กลางคันไหม (ยังไม่ถูก stopLoop) */
export function loopActive(key) {
  const el = loops.get(key);
  return !!el && el.currentTime > 0 && !el.ended;
}

/** หยุดเสียงยาวทุกอัน — ใช้ตอนเปลี่ยนหน้าใหญ่ ๆ กันเสียงค้างข้ามหน้า */
export function stopAllLoops() {
  for (const key of loops.keys()) stopLoop(key);
}

export function setMuted(next) {
  muted = !!next;
  if (muted) stopAllLoops();
}

/**
 * ต่อเสียงคลิกเข้ากับ "ทุกปุ่มในเกม" ครั้งเดียว โดยดักที่ document
 * ใช้การดักแบบรวมศูนย์เพราะหน้าจอถูกวาดใหม่ทั้งหมดทุกครั้งที่เปลี่ยนหน้า
 * ถ้าไปผูก listener ทีละปุ่ม จะต้องไล่ผูกใหม่ทุกหน้าและมีวันลืม
 *
 * ใช้ pointerdown ไม่ใช่ click เพราะการลากไอคอนสกิลไม่เกิด click event
 * (dragdrop.js กิน pointerdown ไปทำการลาก) — เสียงจึงต้องดังตอน "กดลง"
 */
const CLICKABLE = [
  'button',           // ปุ่มเกือบทั้งหมดในเกมเป็น <button> อยู่แล้ว
  '.skill-icon',      // ไอคอนสกิล — จุดเริ่มลาก
  '.vn-box',          // กล่องบทพูดใน tutorial (กดเพื่อไปต่อ)
  '.screen--splash',  // หน้าปก "แตะที่ไหนก็ได้เพื่อเริ่ม"
  '.roster-row',      // แถวรายชื่อ จนท. ในหน้า Intel
].join(',');

export function attachClickSound() {
  document.addEventListener('pointerdown', (e) => {
    unlockAudio(); // การกดครั้งแรกของผู้เล่นคือจังหวะปลดล็อกเสียงพอดี
    if (e.target?.closest?.(CLICKABLE)) playSfx('click');
  }, true); // capture — ให้ได้ยินเสียงแม้ handler ข้างในจะ stopPropagation
}
