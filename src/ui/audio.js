// ระบบเสียงทั้งเกม — ไฟล์เดียวที่แตะ <audio>
//
// ไฟล์นี้อยู่ใน ui/ เพราะเสียงคือ "ผลลัพธ์ที่ผู้เล่นรับรู้" เหมือนภาพ — ไม่รู้กฎเกมเลย
// ที่อื่นเรียกแค่ playSfx('click') / setBgm('gameMain') / setBgmPaused(true)
//
// ── ทำไมต้องใช้ Web Audio ไม่ใช่ el.volume เฉย ๆ ────────────────
// `el.volume` ตั้งได้แค่ 0..1 คือ "ลดเสียงอย่างเดียว" แต่ไฟล์ click.mp3 เบากว่า
// เพลงถึง 24 dB (วัดจริง ดู data/sounds.js) ลดคนอื่นลงมาเท่ามันก็จะเบาหมดทั้งเกม
// จึงต้องเดินเสียงผ่าน Web Audio ที่ตั้ง gain เกิน 1 ได้ แล้วมี limiter กันเสียงแตก
//
//   <audio> → MediaElementSource → gain ประจำเสียง → gain รวม → limiter → ลำโพง
//
// ⚠️ เบราว์เซอร์บล็อกเสียงจนกว่าผู้เล่นจะแตะจอครั้งแรก (autoplay policy)
//    unlockAudio() จึงต้องถูกเรียกจากในเหตุการณ์ที่ผู้ใช้กดจริง ๆ
//    หน้าปกของเกมมี "แตะที่ไหนก็ได้เพื่อเริ่ม" อยู่แล้ว จังหวะนั้นคือจุดปลดล็อก

import { SOUNDS, soundPath } from '../data/sounds.js';
import { onPrefsChange, volumeGain } from '../data/prefs.js';

const pools = new Map();   // key เสียงสั้น → { nodes: [], next }
const singles = new Map(); // key เพลง/เสียงยาว → HTMLAudioElement

let ctx = null;        // AudioContext (null = เบราว์เซอร์ไม่รองรับ ใช้ el.volume แทน)
let masterGain = null;
let master = 1;        // ระดับเสียงรวมจากหน้า Settings (0..1)
let unlocked = false;

// เพลงประจำฉากที่กำลังเล่นอยู่ — มีเจ้าของเดียวคือที่นี่
// เดิมให้แต่ละหน้าสั่ง start/stop/pause กันเอง แล้วมีจุดที่ลืมสั่ง เพลงเลยค้างเล่นต่อ
let bgmKey = null;
let bgmPaused = false;

function makeNode(key) {
  const spec = SOUNDS[key];
  const el = new Audio(soundPath(key));
  // ไฟล์ที่ตั้ง lazy ไว้ (เพลงในเกม 11 MB + 1.6 MB) ยังไม่ต้องโหลดตอนเปิดเกม
  // ไม่งั้นเน็ตมือถือจะถูกดูดไปกับเพลงจนหน้าแรกกับรูปตัวละครมาช้า = "แล็ค" ตั้งแต่เริ่ม
  el.preload = spec.lazy ? 'none' : 'auto';
  el.crossOrigin = 'anonymous';
  el.dataset.sound = key;
  el._gain = spec.gain ?? 1;
  if (spec.kind === 'bgm') el.loop = true; // เพลงประจำฉากวนซ้ำเสมอ จนกว่าจะถูกสั่งเปลี่ยน
  // ยังไม่ต่อเข้า Web Audio ตอนนี้ — ต่อตอนผู้เล่นแตะจอครั้งแรก (ดู unlockAudio)
  el.volume = Math.min(1, el._gain) * master;
  // ใส่ลง DOM จริง (ไม่มี controls จึงมองไม่เห็น) เพื่อให้ตรวจสถานะเสียงได้จากภายนอก
  // new Audio() เฉย ๆ จะลอยอยู่นอกหน้า ทั้งเทสและ DevTools มองไม่เห็นว่าอะไรกำลังเล่นอยู่
  document.body.appendChild(el);
  return el;
}

/** ทุก <audio> ที่สร้างไว้ — ใช้ตอนต่อสายเสียงและตอนปลุกเครื่องเสียงบนมือถือ */
function allElements() {
  return [...singles.values(), ...[...pools.values()].flatMap((x) => x.nodes)];
}

// ต่อ element เข้ากับสายเสียง — ถ้าต่อไม่ได้ ถอยไปใช้ el.volume (ดังสุดได้แค่ 1)
function connect(el) {
  if (!ctx) {
    el.volume = Math.min(1, el._gain) * master;
    return;
  }
  try {
    const src = ctx.createMediaElementSource(el);
    const g = ctx.createGain();
    g.gain.value = el._gain;
    src.connect(g).connect(masterGain);
    el._node = g;
    el.volume = 1; // เสียงถูกคุมด้วย gain node แล้ว (บน iOS ตั้ง volume ไม่ได้อยู่ดี)
  } catch {
    el.volume = Math.min(1, el._gain) * master;
  }
}

function makeContext() {
  if (ctx) return;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = master;
    // limiter กันเสียงแตกตอนดัน gain เกิน 1 หรือหลายเสียงดังพร้อมกัน
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    masterGain.connect(limiter).connect(ctx.destination);
  } catch {
    ctx = null; // ไม่มี Web Audio ก็ยังเล่นได้ผ่าน el.volume
  }
}

/** โหลดไฟล์เสียงทุกอันไว้ล่วงหน้า — เรียกตอนเปิดเกม */
export function preloadSounds() {
  // ⚠️ ห้ามสร้าง AudioContext ตรงนี้ — ดูเหตุผลใน unlockAudio()
  for (const [key, spec] of Object.entries(SOUNDS)) {
    if (spec.kind === 'sfx') {
      pools.set(key, { nodes: Array.from({ length: spec.pool ?? 2 }, () => makeNode(key)), next: 0 });
    } else {
      singles.set(key, makeNode(key));
    }
  }
  // ผูกกับหน้า Settings — เลื่อนแถบเสียงแล้วดังขึ้น/ลงทันที
  onPrefsChange((p) => applyMaster(volumeGain(p.volume)));
}

function applyMaster(v) {
  master = v;
  if (masterGain) {
    masterGain.gain.value = v;
    return;
  }
  // โหมดสำรอง (ยังไม่ได้ต่อ Web Audio) — คูณเข้าไปที่ el.volume ของทุกตัว
  for (const el of allElements()) el.volume = Math.min(1, (el._gain ?? 1) * v);
}

/**
 * ปลดล็อกเสียง — ต้องเรียกจากในเหตุการณ์ที่ผู้ใช้กด/แตะจริงเท่านั้น
 *
 * ⚠️ เรียกได้ทุกครั้งที่ผู้เล่นแตะจอ ไม่ใช่แค่ครั้งแรก — จงใจ
 * บนมือถือ AudioContext ถูก "พัก" ได้เรื่อย ๆ หลังปลดล็อกไปแล้ว
 * (สลับแอป · ล็อกจอ · มีสายเข้า · หมุนจอ — iOS จะเปลี่ยนสถานะเป็น 'interrupted')
 * ถ้าปลุกแค่ครั้งเดียวแล้วจำว่า "ปลดล็อกแล้ว" พอโดนพักอีกรอบจะเงียบไปตลอดทั้งเกม
 * เพราะเสียงทุกเส้นเดินผ่าน AudioContext ตัวนี้ ไม่มีทางออกอื่น
 */
export function unlockAudio() {
  // ครั้งแรกเท่านั้น: สร้าง AudioContext + ต่อสายเสียง + ปลุกทุกไฟล์
  //
  // ⚠️ ต้องสร้าง AudioContext "ในจังหวะที่ผู้ใช้แตะจอ" ห้ามสร้างตอนเปิดหน้า
  // Safari บน iOS ถือว่า context ที่เกิดก่อนผู้ใช้แตะจอเป็นของที่ปลุกไม่ขึ้น
  // ผลคือทุกเสียงถูกดูดเข้า context ที่ไม่ทำงาน = เงียบสนิททั้งเกม
  if (!unlocked) {
    unlocked = true;
    makeContext();
    for (const el of allElements()) connect(el);
    primeAll();
  }
  // ทุกครั้ง: ถ้า context ไม่ได้ทำงานอยู่ ให้ปลุกใหม่ (มือถือพักมันได้ตลอดเวลา)
  if (ctx && ctx.state !== 'running') ctx.resume?.().catch(() => {});
  playBgmEl();
}

/** สั่งเล่นเพลงประจำฉากที่ค้างไว้ (จองสิทธิ์ก่อนเสมอ กันการปลุกไปหยุดทับ) */
function playBgmEl() {
  const el = bgmKey && !bgmPaused ? singles.get(bgmKey) : null;
  if (!el) return;
  wantPlay(el);
  el.play().catch(() => {});
}

/**
 * "ปลุก" ทุก <audio> ในจังหวะที่ผู้ใช้แตะจอ — เล่นแวบเดียวแล้วหยุดทันที
 *
 * ⚠️ จำเป็นเฉพาะมือถือ (โดยเฉพาะ iOS): แต่ละ <audio> ต้องเคยถูกสั่ง play()
 * ตอนที่ผู้ใช้กดจริงอย่างน้อยหนึ่งครั้ง ไม่งั้นเรียก play() ทีหลังจะถูกปฏิเสธถาวร
 * ของเดิมปลุกแค่เสียงคลิกกับเพลงเมนู เสียงที่เหลือ (ผลภารกิจ · เพลงในเกม · เสียงนับคะแนน)
 * จึงไม่เคยถูกปลุกเลย = ในเกมเงียบสนิททั้งที่หน้าเมนูมีเพลง
 *
 * ปิด gain ไว้ระหว่างปลุกเพื่อไม่ให้ได้ยินเสียง "แปะ" ตอนแตะจอครั้งแรก
 */
function primeAll() {
  // เพลงที่กำลังจะเล่นอยู่แล้วไม่ต้องปลุก เดี๋ยวไปสั่งหยุดทับกันเอง
  const skip = bgmKey && !bgmPaused ? singles.get(bgmKey) : null;
  for (const [key, spec] of Object.entries(SOUNDS)) {
    const els = pools.get(key)?.nodes ?? [singles.get(key)];
    for (const el of els) {
      if (!el || el === skip || !el.paused) continue;
      // ไฟล์ก้อนใหญ่: เริ่มโหลดตรงนี้เลย — ต้องอยู่ใน gesture เดียวกัน
      //
      // ⚠️ ของเดิมสั่ง load() ทีหลัง 2 วินาทีผ่าน setTimeout ซึ่งอยู่นอก gesture แล้ว
      // iOS ถือว่า load() นอก gesture = ยกเลิกสิทธิ์เล่นของ element นั้นทิ้ง
      // เพลงในเกมกับเสียงนับคะแนน (ทั้งคู่เป็น lazy) จึงเล่นไม่ออกบน iPhone
      if (spec.lazy && el.preload !== 'auto') { el.preload = 'auto'; el.load(); }
      primeOne(el);
    }
  }
}

function primeOne(el) {
  const g = el._node;
  const keep = g ? g.gain.value : null;
  if (g) g.gain.value = 0;
  const restore = () => { if (g) g.gain.value = keep; };
  // จดไว้ว่าตอนเริ่มปลุก element นี้ถูกสั่งเล่นไปแล้วกี่ครั้ง
  // ถ้าระหว่างรอ promise มีคนสั่งเล่น "ของจริง" มาแทรก ต้องไม่ไปสั่งหยุดทับเขา
  // (เกิดจริงตอนแตะหน้าปก: เสียงคลิกถูกสั่งเล่นในจังหวะเดียวกับที่กำลังปลุกอยู่พอดี)
  const token = wantPlay(el);
  const stop = () => {
    if (el._want !== token) { restore(); return; } // มีคนสั่งเล่นจริงมาแทรก ปล่อยให้เขาเล่นไป
    el.pause();
    try { el.currentTime = 0; } catch { /* ยังไม่มีข้อมูลไฟล์ ตั้งเวลาไม่ได้ ไม่เป็นไร */ }
    restore();
  };
  try {
    const r = el.play();
    if (r && r.then) r.then(stop, restore);
    else stop();
  } catch {
    restore();
  }
}

/** จองสิทธิ์เล่น element นี้ — ทุกที่ที่สั่ง play() จริงต้องเรียกก่อน (ดู primeOne) */
function wantPlay(el) {
  el._want = (el._want ?? 0) + 1;
  return el._want;
}

// มือถือพัก AudioContext ตอนสลับแอป/ล็อกจอ — กลับมาแล้วต้องปลุกเอง ไม่งั้นเงียบต่อ
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (ctx && ctx.state !== 'running') ctx.resume?.().catch(() => {});
});

/** เสียงสั้น — เล่นซ้อนกันได้ ไม่ตัดตัวเอง */
export function playSfx(key) {
  const pool = pools.get(key);
  if (!pool) return;
  const el = pool.nodes[pool.next];
  pool.next = (pool.next + 1) % pool.nodes.length;
  // ⚠️ ตั้ง currentTime ตอนไฟล์ยังโหลดไม่ถึงไหน บางเบราว์เซอร์โยน error ทันที
  // (ไม่ใช่ promise — .catch() ข้างล่างรับไม่ได้) ถ้าไม่กันไว้จะทำให้โค้ดที่เรียกพังตาม
  try { el.currentTime = 0; } catch { /* ยังกรอไม่ได้ ปล่อยให้เล่นจากตรงที่อยู่ */ }
  wantPlay(el);
  el.play().catch(() => {}); // เบราว์เซอร์ปฏิเสธได้ถ้ายังไม่ปลดล็อก — ห้ามให้เกมพัง
}

// ── เพลงประจำฉาก ────────────────────────────────────────────────
/**
 * เปลี่ยนเพลงประจำฉาก — ส่ง null เพื่อหยุดเงียบ
 * ถ้าเป็นเพลงเดิมที่เล่นอยู่แล้วจะไม่เริ่มใหม่ (เดินจากเมนูไป Settings เพลงจึงต่อเนื่อง)
 */
export function setBgm(key) {
  const next = key && SOUNDS[key]?.kind === 'bgm' ? key : null;
  if (next === bgmKey) {
    playBgmEl();
    return;
  }
  if (bgmKey) {
    const old = singles.get(bgmKey);
    if (old) { old.pause(); old.currentTime = 0; }
  }
  bgmKey = next;
  bgmPaused = false;
  if (!bgmKey) return;
  const el = singles.get(bgmKey);
  if (!el) return;
  try { el.currentTime = 0; } catch { /* ไฟล์ยังไม่พร้อม กรอไม่ได้ ไม่เป็นไร */ }
  wantPlay(el);
  el.play().catch(() => {});
}

/**
 * หยุด/เล่นเพลงประจำฉากต่อ โดยไม่เปลี่ยนเพลงและไม่กรอกลับ
 * ใช้ตอนกดหยุดเวลาในเกม — เพลงต้องหยุดตามด้วย
 */
export function setBgmPaused(paused) {
  bgmPaused = !!paused;
  const el = bgmKey && singles.get(bgmKey);
  if (!el) return;
  if (bgmPaused) el.pause();
  else playBgmEl();
}

export function currentBgm() {
  return bgmKey;
}

/**
 * กรอเพลงประจำฉากที่กำลังเล่นอยู่ไปที่วินาทีที่กำหนด
 * ใช้ตอน Last Stand — ต้องคำนวณให้เพลงมาถึงท่อนที่ต้องการพอดีตอน QTE เปิด (§5)
 * ไฟล์นี้เป็นที่เดียวที่แตะ <audio> ได้ ที่อื่นจึงต้องเรียกผ่านตัวนี้เสมอ
 */
export function seekBgm(key, seconds) {
  const el = singles.get(key);
  if (!el || bgmKey !== key) return false;
  // ⚠️ กรอได้ก็ต่อเมื่อ "ที่ฝากไฟล์รองรับ Range request" (GitHub Pages รองรับ)
  // ถ้าไม่รองรับ เบราว์เซอร์จะถือว่าไฟล์กรอไม่ได้แล้วดีดกลับไปวินาที 0 เอง
  // กรณีนั้นปล่อยให้เพลงเล่นไปตามปกติ ดีกว่าไปตัดเพลงกลับไปเริ่มใหม่
  if (!el.seekable || el.seekable.length === 0) return false;
  const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null;
  el.currentTime = Math.max(0, dur ? seconds % dur : seconds);
  return true;
}

/** ตอนนี้เพลงประจำฉากเล่นถึงวินาทีที่เท่าไหร่ (ใช้เช็คว่าต้องกรอแก้หรือยัง) */
export function bgmPosition() {
  const el = bgmKey && singles.get(bgmKey);
  return el ? el.currentTime : 0;
}

// ── เสียงยาวเฉพาะกิจ (เล่นทับเพลงได้) ──────────────────────────
export function startCue(key) {
  const el = singles.get(key);
  if (!el || SOUNDS[key]?.kind !== 'cue') return;
  el.loop = true; // เผื่ออนิเมชั่นยาวกว่าไฟล์ — ผู้เรียกเป็นคนสั่งหยุดเอง
  try { el.currentTime = 0; } catch { /* ไฟล์ยังไม่พร้อม กรอไม่ได้ ไม่เป็นไร */ }
  wantPlay(el);
  el.play().catch(() => {});
}

export function stopCue(key) {
  const el = singles.get(key);
  if (!el) return;
  el.pause();
  el.currentTime = 0;
}

/** หยุดทุกอย่างที่เล่นค้างอยู่ — ใช้ตอนเปลี่ยนหน้าใหญ่ ๆ กันเสียงข้ามหน้า */
export function stopAllAudio() {
  setBgm(null);
  for (const [key, el] of singles) {
    if (SOUNDS[key]?.kind === 'cue') { el.pause(); el.currentTime = 0; }
  }
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
    // แถบเลื่อนในหน้า Settings ลากแล้วจะยิงรัว ๆ — ไม่ต้องมีเสียงคลิก
    if (e.target?.closest?.('input')) return;
    // ปุ่มของมินิเกมจังหวะมีเสียงของตัวเอง (ตรง/พลาด) เสียงคลิกจะซ้อนจนฟังไม่ออก
    if (e.target?.closest?.('.qte-key')) return;
    if (e.target?.closest?.(CLICKABLE)) playSfx('click');
  }, true); // capture — ให้ได้ยินเสียงแม้ handler ข้างในจะ stopPropagation
}
