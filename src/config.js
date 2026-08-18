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
    red:    { min: 60, max: 80 },
  },

  // จำนวนโซนต่อระดับ (จาก map.svg §3.1)
  zoneCounts: { gray: 27, yellow: 13, red: 8 },

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

  // %ช่วยชีวิตตอนสำเร็จ — เลือกทางเลือก ง. (สุ่มระหว่างอัตราสำเร็จ ถึง 100%)
  // ดู docs/gameflowspec.md §14 Q1b
  rescueRateMode: 'rollBetweenSuccessAnd100',

  // คะแนน
  scoreRescue: 1,
  scoreCasualty: -1,

  // ความเร็วเกม (มิลลิวินาทีจริงต่อ 1 ลูป)
  loopDurationMsBySpeed: { 1: 4200 / 2, 2: 1000 / 2 }, // ปกติ ~10 นาทีทั้งเกม / เร็ว ~2.5 นาที (144 ลูป)

  // จุดหยุดเวลาอัตโนมัติของเกม (Q3)
  autoPauseAtHour: [24, 48], // โซนแดง/เหลืองหมดอายุ
  autoPauseHoursLeft: 12,     // เตือนตอนเหลือ 12 ชม.สุดท้าย
};
