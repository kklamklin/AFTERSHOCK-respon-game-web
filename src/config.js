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

  // อายุโซน (ลูปที่คนตายหมดถ้าไม่มีใครช่วย) — เทา 72 ชม. · เหลือง 48 ชม. · แดง 32 ชม.
  // แดงเคยเป็น 24 ชม. แต่ตายเร็วเกินกว่าจะบุกทันรอบสอง จึงยืดเป็น 32 ชม.
  zoneLifespanLoops: { gray: 144, yellow: 96, red: 64 },

  // ความเสี่ยงพื้นที่ (ตัวลบอัตราสำเร็จ)
  // เดิม เหลือง −30 / แดง −55 ทำให้โซนแดงเป็นดีลที่ขาดทุนเสมอ (Lyla สำเร็จแค่ 35%)
  // ไม่มีใครมีเหตุผลจะเข้าโซนแดงเลย ทั้งที่ในนั้นมีคน 45% ของเมือง
  zonePenalty: { gray: -10, yellow: -25, red: -40 },

  // โอกาสอันตรายพื้นฐาน (ก่อนคูณเวลา)
  // ทอยเฉพาะตอนภารกิจล้มเหลว บัฟจึงช่วย 2 ต่อ (สำเร็จมากขึ้น = โดนทอยอันตรายน้อยลง)
  // เลขฐานเลยต้องสูงกว่าที่รู้สึก ไม่งั้นบาดเจ็บแทบไม่เกิดเลยทั้งเกม
  dangerBase: { gray: 0.12, yellow: 0.30, red: 0.48 },
  dangerCap: 0.72,

  // สีโซนตาม §3.2
  zoneColors: {
    gray:   { fill: '#D9D9D9', stroke: '#000000' },
    yellow: { fill: '#FDF3D0', stroke: '#E8C13F' },
    red:    { fill: '#FBE4E4', stroke: '#E5484D' },
    green:  { fill: '#D4F4DD', stroke: '#3DD68C' },
  },

  // ── AP ────────────────────────────────────────────────────────
  // เดิม: เริ่ม 0 · 5/ชม. + โบนัสตามสัดส่วน "ผู้รอดที่หายไปแล้ว"
  // โบนัสนั้นผูกกับจำนวนคนตาย แต้มก้อนใหญ่จึงมาถึงตอนไม่มีใครให้ช่วยแล้ว
  // วัดจริงได้ว่าแต้มสูงสุดที่สะสมได้ทั้งเกมคือ 25 ทั้งที่โซนแดงราคา 30
  // → ทั้งเกมไม่มีวินาทีไหนที่ลงโซนแดงได้เลย จึงเปลี่ยนเป็นเส้นโค้ง "หน้าหนัก"
  apStart: 80,
  // จ่ายทุกต้นชั่วโมง — ใช้ค่าของช่วงแรกที่ยังไม่ถึง untilHour
  apCurve: [
    { untilHour: 24, ap: 25 }, // ช่วงที่โซนแดงยังมีชีวิต ต้องบุกให้ทัน
    { untilHour: 48, ap: 15 },
    { untilHour: 72, ap: 8 },
  ],

  // สถานะ จนท.
  injuredPenalty: -20,
  injuredRecoverHours: 6,
  lostConsciousHours: 9,
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
    // Alert เดิม 35 AP แพงเกินกว่าจะคุ้ม เพราะบาดเจ็บแทบไม่เกิด — ตอนนี้อันตรายแรงขึ้นแล้ว
    // การเสีย จนท. ไป 6-9 ชม. กลางเกมคือหายนะ ประกันราคา 15 จึงคุ้มขึ้นมาจริง ๆ
    alert: { rate: 0,  durationHours: 3, ap: 15, cooldownHours: 3, scope: 'zone', safe: true },
    // Air Deploy เดิมอยู่แค่ 1 ชม. ราคา 24 → ไม่มีใครกดเลยสักครั้งใน 150 เกมที่จำลอง
    // ตอนนี้เป็น "ปุ่มฉุกเฉิน" — ชะลอการตายทั้งแมพ 40% ใช้ตอนหลายโซนใกล้หมดอายุพร้อมกัน
    air:   { rate: 15, durationHours: 3, ap: 20, cooldownHours: 4, scope: 'global',
             deathSlowFactor: 0.6 },
  },

  // สกิลลงพื้นที่ — AP และเวลาทำงานแยกตามระดับโซน (null = ลงโซนนั้นไม่ได้)
  // ตารางนี้คือ "แหล่งจริง" ของราคา/เวลา — data/operators.js อ่านค่าจากตรงนี้ ห้ามพิมพ์เลขซ้ำที่นั่น
  // Robertson เข้าโซนแดงได้แล้ว แต่ช้ากว่า Lyla และฐานสำเร็จต่ำกว่ามาก (75−40 = 35%)
  // ไม่บัฟคือส่งไปตาย — เป็นทางเลือกเสี่ยง ไม่ใช่ของแถม
  fieldSkills: {
    human: { base: 75, ap: { gray: 6,  yellow: 12, red: 20 }, workHours: { gray: 1, yellow: 2, red: 3 } },
    cat:   { base: 90, ap: { gray: 10, yellow: 18, red: 30 }, workHours: { gray: 1, yellow: 1, red: 2 } },
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
  autoPauseAtHour: [32, 48], // โซนแดง/เหลืองหมดอายุ (ตรงกับ zoneLifespanLoops)
  autoPauseHoursLeft: 12,     // เตือนตอนเหลือ 12 ชม.สุดท้าย
};
