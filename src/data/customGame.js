// Custom Game — เกมที่ปรับค่าเองได้ แยกขาดจากเกมหลัก (รอบ 10.27)
//
// ── หลักการ ──────────────────────────────────────────────────────
// ทั้งเกมอ่านตัวเลขจาก CONFIG ตัวเดียว (import ใช้ร่วมกันทุกไฟล์) ไฟล์นี้จึงทำงานแบบ
// "ถ่ายรูปค่าเดิมไว้ตอนเปิดเกม" (BASE) แล้วเขียนค่าที่ผู้เล่นปรับทับลง CONFIG ตอนเริ่ม Custom Game
// ออกจาก Custom Game เมื่อไหร่ → คืนค่าเดิมจาก BASE ทั้งก้อน เกมหลักจึงไม่เคยโดนค่าที่ปรับไว้
//
// ⚠️ ต้องเขียนทับ "ในที่เดิม" (แก้ค่าใน object เดิม) ห้ามสร้าง CONFIG ใหม่
// เพราะทุกไฟล์ถือ reference ตัวเดิมไว้ตั้งแต่ import
//
// ค่าที่ปรับไว้ถูกจำในเครื่อง (localStorage) เปิดแผงครั้งหน้ายังเหมือนเดิม
// ไฟล์นี้ไม่แตะ DOM — หน้าจอปรับค่าอยู่ที่ ui/devPanel.js

import { CONFIG } from '../config.js';

// ค่าเกมหลักของจริง — ถ่ายไว้ครั้งเดียวตอนโหลดไฟล์ (ก่อนมีใครแก้อะไร)
const BASE = structuredClone(CONFIG);
const STORAGE_KEY = 'aftershocks:customGame';

let active = false;

// ── ทางลัดสำเร็จรูป (ติ๊กแล้วเขียนทับหลายค่าพร้อมกัน) ───────────────
// ข้อความที่ผู้เล่นเห็นอยู่ที่ ui/devPanel.js · ที่นี่เก็บแค่ว่า "ติ๊กแล้วเปลี่ยนอะไร"
export const CUSTOM_FLAGS = {
  // แต้มไม่มีวันหมด
  infiniteAp: (c) => {
    c.apStart = 9999;
    for (const step of c.apCurve) step.ap = 999;
  },
  // สกิลบัฟไม่มีคูลดาวน์ · Scan ใช้ได้ไม่จำกัดช่อง
  noCooldown: (c) => {
    for (const b of Object.values(c.buffs)) b.cooldownHours = 0;
    c.buffs.scan.maxStacks = 99;
  },
  // ลงพื้นที่แล้วไม่มีวันบาดเจ็บ (ตัดโอกาสอันตรายเป็น 0)
  noInjury: (c) => { c.dangerCap = 0; },
  // ทอยชั้น 1 สำเร็จทุกครั้ง (ชั้น 2 %ช่วยชีวิต ยังสุ่มตามปกติ)
  alwaysSucceed: (c) => {
    c.maxSuccessRate = 100;
    for (const f of Object.values(c.fieldSkills)) f.base = 300;
  },
  // ผู้รอดไม่ตายเอง — โซนอยู่ได้จนจบเกม ไว้ฝึกเล่นแบบไม่กดดัน
  noDeath: (c) => {
    for (const tier of Object.keys(c.zoneLifespanLoops)) c.zoneLifespanLoops[tier] = 1e9;
  },
};

// ── อ่าน/เขียนตาม path เช่น "buffs.scan.ap" หรือ "apCurve[1].ap" ─────
const splitPath = (path) => path.replace(/\[(\d+)\]/g, '.$1').split('.');

export function getByPath(root, path) {
  let cur = root;
  for (const p of splitPath(path)) cur = cur?.[p];
  return cur;
}

export function setByPath(root, path, value) {
  const parts = splitPath(path);
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) cur = cur?.[parts[i]];
  if (cur && parts.at(-1) in cur) cur[parts.at(-1)] = value;
}

/** ค่าในเกมหลัก (ก่อนถูกปรับ) — หน้าจอใช้โชว์ "ปกติ = ..." ข้างช่องกรอก */
export function baseValue(path) {
  return getByPath(BASE, path);
}

/** ตัวเลขทุกใบในทุกกิ่งของ CONFIG (ค่าเกมหลัก) พร้อม path เต็ม — ใช้ทำรายการ "ค่าขั้นสูง" */
export function numericLeaves(obj = BASE, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out.push({ path, value: v });
    else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'number') out.push({ path: `${path}[${i}]`, value: item });
        else if (item && typeof item === 'object') numericLeaves(item, `${path}[${i}]`, out);
      });
    } else if (v && typeof v === 'object') numericLeaves(v, path, out);
  }
  return out;
}

// ── ร่างค่าที่ผู้เล่นปรับไว้ (จำในเครื่อง) ───────────────────────────
// รูปแบบ: { values: { [path]: ตัวเลข }, flags: { [ชื่อทางลัด]: true } }
// เก็บเฉพาะค่าที่ "ต่างจากเกมหลัก" — ค่าที่ไม่อยู่ในนี้คือใช้ค่าเดิม
export function emptyDraft() {
  return { values: {}, flags: {} };
}

export function loadCustomDraft() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return emptyDraft();
    const values = {};
    for (const [path, v] of Object.entries(raw.values ?? {})) {
      // ทิ้งค่าที่ path ไม่มีอยู่แล้ว (เช่น config ถูกรื้อ) หรือไม่ใช่ตัวเลข
      if (typeof v === 'number' && Number.isFinite(v) && typeof baseValue(path) === 'number') values[path] = v;
    }
    const flags = {};
    for (const k of Object.keys(CUSTOM_FLAGS)) if (raw.flags?.[k]) flags[k] = true;
    return { values, flags };
  } catch {
    return emptyDraft();
  }
}

export function saveCustomDraft(draft) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* โหมดส่วนตัว — ไม่จำก็ไม่เป็นไร */ }
}

/** นับว่าร่างนี้ปรับไปกี่อย่าง (ค่า + ทางลัด) */
export function draftChangeCount(draft) {
  return Object.keys(draft.values).length + Object.keys(draft.flags).length;
}

// ── เขียนทับ / คืนค่า ──────────────────────────────────────────────

// คัดลอก src ลง dst "ในที่เดิม" ทุกชั้น — object ที่ไฟล์อื่นถือ reference ไว้ยังเป็นตัวเดิม
function copyInto(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object' && dst[k] && typeof dst[k] === 'object') copyInto(dst[k], v);
    else dst[k] = structuredClone(v);
  }
}

/** คืน CONFIG เป็นค่าเกมหลักทั้งหมด — เรียกทุกครั้งที่กลับหน้าเมนู / เริ่มเกมหลัก */
export function restoreBaseConfig() {
  copyInto(CONFIG, BASE);
  active = false;
}

/** เขียนค่าของ Custom Game ทับ CONFIG — เรียกตอนกด "เริ่ม Custom Game" */
export function applyCustomGame(draft) {
  restoreBaseConfig();
  const v = draft.values ?? {};

  for (const [path, value] of Object.entries(v)) setByPath(CONFIG, path, value);

  // ความยาวเกมเปลี่ยน → ยืดช่วงจ่าย AP ตามสัดส่วน (เว้นแต่ผู้เล่นตั้งช่วงเองแล้ว)
  // ไม่งั้นเกม 24 ชม. จะได้ AP แค่ช่วงแรก ส่วนเกม 144 ชม. จะติดค่าช่วงท้ายยาวเหยียด
  if ('totalLoops' in v) {
    const ratio = CONFIG.totalLoops / BASE.totalLoops;
    CONFIG.apCurve.forEach((step, i) => {
      if (!(`apCurve[${i}].untilHour` in v)) step.untilHour = Math.round(BASE.apCurve[i].untilHour * ratio);
    });
  }

  // จำนวนผู้รอดเปลี่ยน → ขยายช่วงคนต่อโซนตามสัดส่วน (โซนมี 47 โซนตายตัวตามแผนที่)
  // ไม่งั้นตัวเกลี่ยใน systems/zones.js จะยัดคนไม่ลงช่วง min-max แล้วยอดรวมไม่ตรง
  if ('totalSurvivors' in v && !Object.keys(v).some((p) => p.startsWith('survivorsPerZone'))) {
    const ratio = CONFIG.totalSurvivors / BASE.totalSurvivors;
    for (const [tier, r] of Object.entries(BASE.survivorsPerZone)) {
      const min = Math.max(1, Math.round(r.min * ratio));
      CONFIG.survivorsPerZone[tier].min = min;
      CONFIG.survivorsPerZone[tier].max = Math.max(min, Math.round(r.max * ratio));
    }
  }

  for (const [name, on] of Object.entries(draft.flags ?? {})) if (on) CUSTOM_FLAGS[name]?.(CONFIG);

  active = true;
}

/** ตอนนี้ CONFIG เป็นค่าของ Custom Game อยู่ไหม */
export function isCustomGameActive() {
  return active;
}
