// สถานะเกมทั้งหมด — อ้างอิง AFTERSHOCKMASTER §21.4
// เก็บเป็น object เดียวที่ import ใช้ร่วมกันทุกที่ · systems/ เป็นคนแก้ค่า · ui/ อ่านอย่างเดียว

import { generateZones } from './systems/zones.js';
import { CONFIG } from './config.js';

export function createInitialState() {
  return {
    loop: 0,
    hour: 0,
    speed: 1,        // 1 = ปกติ · 2 = เร็ว (ความเร็วที่ "เลือกไว้" ไม่ใช่สถานะเดิน/หยุด)
    running: false,  // true = เวลากำลังเดิน
    ap: 0,

    zones: generateZones(),

    units: {
      human:  createUnit(),
      cat:    createUnit(),
      elf:    { ...createUnit(), scanStacks: CONFIG.buffs.scan.maxStacks },
      spirit: createUnit(),
    },

    globalBuffs: [],              // [{ type:'air', rate:15, remainLoops }]
    criticalCountdownLoops: null, // ตั้งค่าเมื่อ Field ล้มทั้งคู่ (§13)
    lastStandUsed: false,         // Last Stand ใช้ได้ครั้งเดียวต่อเกม (§5)

    totalRescued: 0,
    totalCasualty: 0,

    feed: [],   // [{ hour, zoneId, success, rescued, injuredUnit }]
    ended: false,
  };
}

// ตัวนับเวลาทุกตัวเก็บเป็น "ลูป" (1 ลูป = 30 นาทีในเกม) ไม่ใช่ชั่วโมง
// เพราะเกมเดินทีละลูป — เก็บละเอียดกว่าแล้วค่อยหารสองตอนแสดงผลเป็นชั่วโมง
function createUnit() {
  return {
    status: 'normal',        // normal | injured | lost | laststand
    zoneId: null,            // โซนที่กำลังปฏิบัติการอยู่ (null = ว่าง)
    workRemainLoops: 0,      // เวลาทำงานที่เหลือในโซน
    recoverRemainLoops: 0,   // เวลาฟื้นจาก injured / lost / เวลาที่เหลือของ Last Stand
    skillCooldowns: {},      // { [skillId]: ลูปที่เหลือ }
    scanStacks: null,        // เฉพาะ Lia — ช่อง Scan Area ที่เหลือ (§3.4)
  };
}

export const state = createInitialState();

// เริ่มเกมใหม่ — เขียนทับค่าใน object เดิม เพื่อให้ทุกไฟล์ที่ import state ไว้ยังชี้ตัวเดียวกัน
export function resetState() {
  const fresh = createInitialState();
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, fresh);
  return state;
}
