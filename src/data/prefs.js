// ค่าตั้งค่าของผู้เล่น (เสียง / ความสว่าง) — เก็บที่นี่ที่เดียว
//
// จำค่าไว้ในเครื่องผู้เล่นด้วย localStorage เปิดเกมใหม่แล้วยังได้ค่าเดิม
// ถ้าเบราว์เซอร์ปิด localStorage ไว้ (โหมดส่วนตัวบางตัว) ก็ใช้ค่าเริ่มต้นไป เกมไม่พัง
//
// ไฟล์นี้เก็บแค่ "ค่า" กับ "การแจ้งเตือนเมื่อค่าเปลี่ยน" — ไม่แตะ DOM และไม่แตะ <audio>
// คนที่เอาค่าไปใช้จริงคือ ui/audio.js (เสียง) และ ui/screens.js (ความสว่าง)

const KEY = 'aftershocks:prefs';

// ทั้งคู่เก็บเป็น 0..100 ให้ตรงกับแถบเลื่อนในหน้า Settings
const DEFAULTS = { volume: 80, brightness: 50 };

const prefs = { ...DEFAULTS };
const listeners = new Set();

function clamp(n) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}

export function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    for (const k of Object.keys(DEFAULTS)) {
      if (saved[k] != null) prefs[k] = clamp(saved[k]);
    }
  } catch {
    // อ่านไม่ได้ก็ใช้ค่าเริ่มต้น ไม่ต้องทำอะไรต่อ
  }
  return { ...prefs };
}

export function getPrefs() {
  return { ...prefs };
}

/** ตั้งค่าใหม่ 1 ตัว แล้วบอกทุกคนที่รออยู่ (audio / ความสว่าง) */
export function setPref(key, value) {
  if (!(key in DEFAULTS)) return;
  prefs[key] = clamp(value);
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // เซฟไม่ได้ก็ยังใช้ได้ในรอบนี้ แค่ไม่ถูกจำข้ามครั้ง
  }
  for (const fn of listeners) fn({ ...prefs });
}

/** รับแจ้งเมื่อค่าเปลี่ยน — เรียก fn ทันที 1 ครั้งด้วยค่าปัจจุบัน จะได้ไม่ต้องซิงก์เองตอนเริ่ม */
export function onPrefsChange(fn) {
  listeners.add(fn);
  fn({ ...prefs });
  return () => listeners.delete(fn);
}

// ── แปลงค่า 0..100 เป็นค่าที่เอาไปใช้จริง ────────────────────────
/** ระดับเสียงรวม 0..1 — ยกกำลัง 2 เพราะหูคนไม่ได้ยินเป็นเส้นตรง เลื่อนครึ่งแถบต้องรู้สึกว่าครึ่งเสียง */
export function volumeGain(v = prefs.volume) {
  return (clamp(v) / 100) ** 2;
}

/** ความสว่างหน้าจอ — 0 = มืดลง 40% · 50 = ปกติเป๊ะ (1.00) · 100 = สว่างขึ้น 40%
 *
 * ⚠️ ค่ากลางต้องเป็น 1.00 พอดี ไม่ใช่ 0.95 (สูตรเดิมให้ 0.95)
 * เพราะถ้าไม่ใช่ 1 เป๊ะ เกมจะต้องเปิด `filter: brightness()` ทิ้งไว้ตลอดเวลา
 * ซึ่งบังคับให้เบราว์เซอร์วาดทั้งเวทีใหม่ทุกเฟรม — บน iOS ทำให้เกมหนืดมาก */
export function brightnessFactor(v = prefs.brightness) {
  return 0.6 + (clamp(v) / 100) * 0.8;
}

// ── ตัวเลือกย่อยในหน้าเลือกโหมด ──────────────────────────────────
// เก็บแยกจาก prefs ด้านบนเพราะเป็น true/false ไม่ใช่ค่า 0..100 ที่ปัดผ่าน clamp()
//
//   skipStory — ข้ามฉากสอนเล่น (VN) ไปหน้าเกมเลย
//   hints     — คำใบ้ในหน้าเกมหลัก (บอกว่าสกิลใช้ยังไง ต้องกด/ลากตรงไหน)
//               ⚠️ ตัวนี้ยังไม่มีใครอ่านไปใช้ — เก็บค่าไว้ก่อน รอสร้างระบบคำใบ้ในหน้าเกม
//
// ทั้งคู่ค่าเริ่มต้นเป็น true ตามที่เจ้าของสั่ง
const OPTS_KEY = 'aftershocks:gameOpts';
const OPT_DEFAULTS = { skipStory: true, hints: true };

const gameOpts = { ...OPT_DEFAULTS };

/** อ่านค่าที่จำไว้ในเครื่อง — เรียกครั้งเดียวตอนเปิดเกม (main.js) */
export function loadGameOptions() {
  try {
    const saved = JSON.parse(localStorage.getItem(OPTS_KEY) ?? '{}');
    for (const k of Object.keys(OPT_DEFAULTS)) {
      if (typeof saved[k] === 'boolean') gameOpts[k] = saved[k];
    }
  } catch {
    // อ่านไม่ได้ก็ใช้ค่าเริ่มต้น ไม่ต้องทำอะไรต่อ
  }
  return { ...gameOpts };
}

export function getGameOptions() {
  return { ...gameOpts };
}

/** เปิด/ปิดตัวเลือก 1 ตัว แล้วจำไว้ในเครื่อง */
export function setGameOption(key, on) {
  if (!(key in OPT_DEFAULTS)) return;
  gameOpts[key] = !!on;
  try {
    localStorage.setItem(OPTS_KEY, JSON.stringify(gameOpts));
  } catch {
    // เซฟไม่ได้ก็ยังใช้ได้ในรอบนี้ แค่ไม่ถูกจำข้ามครั้ง
  }
}

// ── ปลดล็อกโหมด Building 21 (DLC) ────────────────────────────────
// เก็บแยกจาก prefs ด้านบนเพราะเป็น true/false ไม่ใช่ค่า 0..100 ที่ปัดตาม DEFAULTS
const DLC_KEY = 'aftershocks:dlcUnlocked';

/** เครื่องนี้เคยใส่รหัส Building 21 ถูกมาก่อนหรือยัง */
export function isDlcUnlocked() {
  try {
    return localStorage.getItem(DLC_KEY) === '1';
  } catch {
    return false; // localStorage ใช้ไม่ได้ (โหมดส่วนตัว) — ถือว่ายังไม่ปลดล็อก ต้องใส่รหัสใหม่ทุกครั้ง
  }
}

/** จำไว้ในเครื่องว่าปลดล็อกแล้ว จะได้ไม่ต้องพิมพ์รหัสซ้ำ */
export function setDlcUnlocked() {
  try {
    localStorage.setItem(DLC_KEY, '1');
  } catch {
    // เซฟไม่ได้ก็ยังผ่านเข้าไปได้ในรอบนี้ แค่ไม่ถูกจำข้ามครั้ง
  }
}
