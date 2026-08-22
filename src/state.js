// สถานะเกมทั้งหมด — อ้างอิง AFTERSHOCKMASTER §21.4
// เก็บเป็น object เดียวที่ import ใช้ร่วมกันทุกที่ · systems/ เป็นคนแก้ค่า · ui/ อ่านอย่างเดียว

import { generateZones } from './systems/zones.js';

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
      elf:    createUnit(),
      spirit: createUnit(),
    },

    globalBuffs: [],              // [{ type:'air', rate:15, remainHours }]
    criticalCountdownHours: null, // ตั้งค่าเมื่อ Field ล้มทั้งคู่ (§13)
    lastStandUsed: false,         // Last Stand ใช้ได้ครั้งเดียวต่อเกม (§5)

    totalRescued: 0,
    totalCasualty: 0,

    feed: [],   // [{ hour, zoneId, success, rescued, injuredUnit }]
    ended: false,
  };
}

function createUnit() {
  return {
    status: 'normal',       // normal | injured | lost | laststand
    zoneId: null,           // โซนที่กำลังปฏิบัติการอยู่
    cdRemainHours: 0,       // เวลาทำงานที่เหลือในโซน
    recoverRemainHours: 0,  // เวลาฟื้นจาก injured / lost
    skillCooldowns: {},     // { [skillId]: ชั่วโมงที่เหลือ }
    scanStacks: null,       // ใช้เฉพาะ Lia — จำนวนช่อง Scan Area ที่เหลือ (§3.4)
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
