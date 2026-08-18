import { generateZones } from './systems/zones.js';

export function createInitialState() {
  return {
    loop: 0,
    hour: 0,
    speed: 1, // 0=หยุด 1=ปกติ 2=เร็ว
    ap: 0,

    zones: generateZones(),

    units: {
      human:  { status: 'normal', cdRemainLoops: 0, recoverRemainLoops: 0, zoneId: null, skillCooldowns: {} },
      cat:    { status: 'normal', cdRemainLoops: 0, recoverRemainLoops: 0, zoneId: null, skillCooldowns: {} },
      elf:    { status: 'normal', cdRemainLoops: 0, recoverRemainLoops: 0, zoneId: null, skillCooldowns: {} },
      spirit: { status: 'normal', cdRemainLoops: 0, recoverRemainLoops: 0, zoneId: null, skillCooldowns: {} },
    },

    globalBuffs: [], // [{ type:'air', buff:15, remainLoops }]
    criticalCountdownLoops: null,

    totalRescued: 0,
    totalCasualty: 0,

    feed: [], // [{ time, zoneId, success, rescued, injuredUnit }]

    running: false, // true เมื่อเกมเดินเวลาอยู่ (false = pause)
    ended: false,
  };
}

export const state = createInitialState();
