// ตัวเลขทั้งหมดของเกม — อ้างอิงจาก docs/gamesystemfinal.md §16.1
export const CONFIG = {
  totalLoops: 144,
  loopsPerHour: 2,
  totalSurvivors: 1200,
  maxSuccessRate: 99,

  // การกระจายคนต่อโซน (สุ่มในช่วงนี้ ปรับให้รวม 1200 พอดี)
  survivorsPerZone: {
    gray:   { min: 8,  max: 11 },
    yellow: { min: 26, max: 36 },
    red:    { min: 60, max: 76 },
  },

  // จำนวนโซนต่อระดับ (จาก map.svg §3.1)
  // โซนเทา 26 (เดิมนับ 27 แต่ map.svg เขียน zone-gray-03 ซ้ำกับ zone-gray-12 — ลบตัวซ้ำแล้ว)
  zoneCounts: { gray: 26, yellow: 13, red: 8 },

  // อายุโซน (ลูปที่คนตายหมดถ้าไม่มีใครช่วย)
  zoneLifespanLoops: { gray: 144, yellow: 96, red: 48 },

  // ความเสี่ยงพื้นที่ (ตัวลบอัตราสำเร็จ)
  zonePenalty: { gray: -10, yellow: -30, red: -55 },

  // โอกาสอันตรายพื้นฐาน (ก่อนคูณเวลา)
  dangerBase: { gray: 0.05, yellow: 0.15, red: 0.30 },
  dangerCap: 0.50,

  // สีโซนตาม §3.2
  zoneColors: {
    gray:   { fill: '#D9D9D9', stroke: '#000000' },
    yellow: { fill: '#FDF3D0', stroke: '#E8C13F' },
    red:    { fill: '#FBE4E4', stroke: '#E5484D' },
    green:  { fill: '#D4F4DD', stroke: '#3DD68C' },
  },

  // AP
  apBase: 5,
  apBonusThresholds: [0.2, 0.4, 0.6, 0.8], // ช่วง % ผู้รอดที่หายไปแล้ว
  apBonusValues: [0, 1, 2, 3, 4],

  // สถานะ จนท.
  injuredPenalty: -20,
  injuredRecoverHours: 3,
  lostConsciousHours: 4,
  criticalCountdownHours: 3,

  // %ช่วยชีวิตตอนสำเร็จ — ทอย 2 ชั้น (GAMESCREEN_SPEC §4.2)
  // ชั้น 2 สุ่มระดับจากตารางประจำตัว OP แล้วสุ่ม % ในช่วงของระดับนั้น — บัฟไม่มีผลกับชั้นนี้
  rescueTierChance: {
    human: { best: 20, high: 25, mid: 35, low: 20 }, // Robertson
    cat:   { best: 35, high: 30, mid: 25, low: 10 }, // Lyla
  },
  rescuePctRange: {
    best: [99, 99],
    high: [90, 98],
    mid:  [70, 89],
    low:  [50, 69],
  },

  // ค่าบัฟ (GAMESCREEN_SPEC §3.2)
  buffs: {
    crowd: { rate: 25, durationHours: 3, ap: 14, cooldownHours: 3, scope: 'zone' },
    scan:  { rate: 15, durationHours: 3, ap: 10, cooldownHours: 0, scope: 'zone',
             deathSlowFactor: 0.5, maxStacks: 5 },
    alert: { rate: 0,  durationHours: 3, ap: 35, cooldownHours: 4, scope: 'zone', safe: true },
    air:   { rate: 15, durationHours: 1, ap: 24, cooldownHours: 3, scope: 'global' },
  },

  // สกิลลงพื้นที่ — AP และเวลาทำงานแยกตามระดับโซน (null = ลงโซนนั้นไม่ได้)
  fieldSkills: {
    human: { base: 75, ap: { gray: 6,  yellow: 12, red: null }, workHours: { gray: 1, yellow: 2, red: null } },
    cat:   { base: 90, ap: { gray: 10, yellow: 18, red: 30   }, workHours: { gray: 1, yellow: 1, red: 2 } },
  },

  // Last Stand ของ Robertson (GAMESCREEN_SPEC §5)
  lastStand: {
    durationHours: 10,
    apCost: 0,                                        // ฟรีทุกสกิล
    workHours: { gray: 1, yellow: 2, red: 3 },        // เข้าโซนแดงได้ด้วย
    blockedSkills: ['crowd'],                         // Crowd Control ใช้ไม่ได้
    oncePerGame: true,
  },

  // คะแนน
  scoreRescue: 1,
  scoreCasualty: -1,

  // เกมเริ่มด้วยสถานะเดินเวลา ไม่ได้เริ่มด้วยหยุด (GAMESCREEN_SPEC §2)
  startSpeed: 1,

  // ความเร็วเกม (มิลลิวินาทีจริงต่อ 1 ลูป)
  loopDurationMsBySpeed: { 1: 4200, 2: 2400 }, // ปกติ ~10 นาทีทั้งเกม / เร็ว ~5.8 นาที (144 ลูป)

  // จุดหยุดเวลาอัตโนมัติของเกม (Q3)
  autoPauseAtHour: [24, 48], // โซนแดง/เหลืองหมดอายุ
  autoPauseHoursLeft: 12,     // เตือนตอนเหลือ 12 ชม.สุดท้าย
};
