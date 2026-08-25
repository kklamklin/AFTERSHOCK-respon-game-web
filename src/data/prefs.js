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
