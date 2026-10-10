// สถานะเกมทั้งหมด — อ้างอิง AFTERSHOCKMASTER §21.4
// เก็บเป็น object เดียวที่ import ใช้ร่วมกันทุกที่ · systems/ เป็นคนแก้ค่า · ui/ อ่านอย่างเดียว

import { generateZones } from './systems/zones.js';
import { CONFIG } from './config.js';
import { OPERATORS, OP_KEYS, stackLimit } from './data/operators.js';

export function createInitialState() {
  return {
    loop: 0,
    hour: 0,
    speed: 1,        // 1 = ปกติ · 2 = เร็ว (ความเร็วที่ "เลือกไว้" ไม่ใช่สถานะเดิน/หยุด)
    running: false,  // true = เวลากำลังเดิน
    ap: CONFIG.apStart, // กำลังเสริมชุดแรกมาถึงพร้อมกับผู้เล่น (ดู systems/actionPoints.js)

    zones: generateZones(),

    // จนท. ทุกตัวในทะเบียน data/operators.js — เพิ่มตัวใหม่ที่นั่น ตรงนี้ได้ช่องของตัวเองเอง
    units: Object.fromEntries(OP_KEYS.map((key) => [key, createUnit(key)])),

    globalBuffs: [],              // [{ type:idสกิล, rate, remainLoops, owner }]
    criticalCountdownLoops: null, // ตั้งค่าเมื่อ Field ล้มทั้งคู่ (§13)
    lastStandUsed: false,         // Last Stand ใช้ได้ครั้งเดียวต่อเกม (§5)
    // มินิเกมต่อเวลา Last Stand — null = ยังไม่ถึงคิว · 'pending' = ถึงเวลาแล้ว รอผู้เล่นเล่น
    // · 'done' = เล่นจบแล้ว (ครั้งเดียวต่อเกมเหมือนตัว Last Stand เอง)
    lastStandQte: null,
    lastStandQteDone: 0,          // เล่นมินิเกมไปแล้วกี่รอบ (สูงสุดเท่ากับ CONFIG.qte.rounds)
    lastStandQtePendingLoops: 0,  // กันสถานะค้างถ้าไม่มีใครเปิดมินิเกมให้ (ดู systems/status.js)

    totalRescued: 0,
    totalCasualty: 0,

    // ตัวนับสำหรับคิดคะแนนตอนจบ (systems/score.js) — systems/ เป็นคนบวก ui/ อ่านอย่างเดียว
    stats: {
      missions: 0,           // ส่ง จนท. ลงพื้นที่ไปกี่ครั้ง (นับตอนงานจบ ไม่ใช่ตอนสั่ง)
      missionsSucceeded: 0,  // ในนั้นสำเร็จกี่ครั้ง
      injuries: 0,           // โดนบาดเจ็บกี่ครั้ง (รวม Last Stand)
      blackouts: 0,          // หมดสติกี่ครั้ง
    },

    feed: [],   // [{ hour, zoneId, success, rescued, injuredUnit }]
    ended: false,
    endReason: null, // 'timeup' | 'empty' | 'critical' — ตั้งค่าตอนปิดเกมใน systems/time.js
  };
}

// ตัวนับเวลาทุกตัวเก็บเป็น "ลูป" (1 ลูป = 30 นาทีในเกม) ไม่ใช่ชั่วโมง
// เพราะเกมเดินทีละลูป — เก็บละเอียดกว่าแล้วค่อยหารสองตอนแสดงผลเป็นชั่วโมง
function createUnit(opKey) {
  return {
    status: 'normal',        // normal | injured | lost | laststand
    busyRemainLoops: 0,      // ตัวนี้ใช้งานไม่ได้อีกกี่ลูป (ลงพื้นที่อยู่ หรือกำลังทำ Crowd Control)
    recoverRemainLoops: 0,   // เวลาฟื้นจาก injured / lost / เวลาที่เหลือของ Last Stand
    skillCooldowns: {},      // { [skillId]: ลูปที่เหลือ }
    // ช่องที่เหลือของสกิลที่มีระบบช่อง (CONFIG.buffs[id].maxStacks เช่น Scan Area §3.4) — { [skillId]: n }
    skillStacks: initialStacks(opKey),

    // ภารกิจลงพื้นที่ที่ทำอยู่ — null ถ้าไม่ได้อยู่ในโซนไหน
    // บันทึกเงื่อนไขตอน "ปล่อยไอคอน" ไว้เลย เพราะ Last Stand ต้องคิดด้วยเงื่อนไขตอนออกเดินทาง
    // แม้บัฟจะหมดอายุระหว่างทาง (GAMESCREEN_SPEC §5.3)
    mission: null,           // { zoneId, skillId, tier, lastStand, totalLoops }
  };
}

// สกิลไหนของ จนท. คนนี้มีระบบช่อง → เริ่มเกมด้วยช่องเต็ม
function initialStacks(opKey) {
  const out = {};
  for (const skillId of Object.keys(OPERATORS[opKey].skills)) {
    const max = stackLimit(skillId);
    if (max != null) out[skillId] = max;
  }
  return out;
}

export const state = createInitialState();

// เริ่มเกมใหม่ — เขียนทับค่าใน object เดิม เพื่อให้ทุกไฟล์ที่ import state ไว้ยังชี้ตัวเดียวกัน
export function resetState() {
  const fresh = createInitialState();
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, fresh);
  return state;
}
