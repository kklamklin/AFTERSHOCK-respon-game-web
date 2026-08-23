import { CONFIG } from '../config.js';
import { randInt } from '../utils/rng.js';

// สร้างโซนทั้งหมดตามจำนวนใน CONFIG.zoneCounts ตาม §3.1/§4 ของ docs/gamesystemfinal.md
// หมายเหตุ: id ที่นี่เป็นชุดชั่วคราว (placeholder grid) — ตอนได้ map.svg จริง
// ให้เปลี่ยนแค่ src/ui/map.js (การ render) โดยไม่ต้องแตะระบบคำนวณในไฟล์นี้
export function generateZones() {
  const zones = {};
  const levels = [
    ...Array(CONFIG.zoneCounts.gray).fill('gray'),
    ...Array(CONFIG.zoneCounts.yellow).fill('yellow'),
    ...Array(CONFIG.zoneCounts.red).fill('red'),
  ];

  const counters = { gray: 0, yellow: 0, red: 0 };
  let total = 0;
  const initialCounts = [];

  for (const level of levels) {
    counters[level] += 1;
    const { min, max } = CONFIG.survivorsPerZone[level];
    const count = randInt(min, max);
    initialCounts.push(count);
    total += count;
  }

  // ปรับตัวสุดท้ายให้รวมได้ 1,200 พอดี (§4.3) — เกลี่ยส่วนต่างทีละ 1 คนวนทั่วทุกโซน
  // เกลี่ยแบบวนรอบ (ไม่ใช่สุ่มซ้ำโซนเดิม) และห้ามหลุดช่วง min-max ของระดับนั้น
  // ไม่งั้นโซนใดโซนหนึ่งอาจโดนลบซ้ำจนต่ำกว่าช่วงที่สเปกกำหนด
  let diff = CONFIG.totalSurvivors - total;
  const step = diff > 0 ? 1 : -1;
  let slack = 0; // ถ้าเกลี่ยในช่วงปกติไม่พอ ค่อยผ่อนขอบทีละ 1
  while (diff !== 0 && slack < 50) {
    let moved = false;
    for (let i = 0; i < initialCounts.length && diff !== 0; i += 1) {
      const { min, max } = CONFIG.survivorsPerZone[levels[i]];
      const next = initialCounts[i] + step;
      if (next < Math.max(1, min - slack) || next > max + slack) continue;
      initialCounts[i] = next;
      diff -= step;
      moved = true;
    }
    if (!moved) slack += 1;
  }

  counters.gray = 0; counters.yellow = 0; counters.red = 0;
  levels.forEach((level, i) => {
    counters[level] += 1;
    const id = `zone-${level}-${String(counters[level]).padStart(2, '0')}`;
    const initial = initialCounts[i];
    zones[id] = {
      id,
      level,
      initial,
      trapped: initial,
      rescued: 0,
      casualty: 0,
      cleared: false,
      buffs: [], // [{ type, buff, remainLoops, scope }]
      unit: null, // 'human' | 'cat' | null — จนท.ที่กำลังทำงานอยู่ในโซนนี้
    };
  });

  return zones;
}

// อัตราตายต่อลูป — เชิงเส้น: ถ้าไม่มีใครไปช่วย คนจะตายหมดพอดีเมื่อครบอายุโซน (§4.4)
// Scan Area ที่ลงในโซนนั้นชะลอการตายลงครึ่งหนึ่งตลอดอายุบัฟ (GAMESCREEN_SPEC §3.2)
export function deathPerLoop(zone) {
  const lifespan = CONFIG.zoneLifespanLoops[zone.level];
  const base = zone.initial / lifespan;
  const slowed = zone.buffs?.some((b) => b.type === 'scan');
  return slowed ? base * CONFIG.buffs.scan.deathSlowFactor : base;
}

export function deathPerHour(zone) {
  return deathPerLoop(zone) * CONFIG.loopsPerHour;
}

// การลบทศนิยม 144 ครั้งทำให้ trapped ลงเอยที่ ~1e-14 แทนที่จะเป็น 0 พอดี
// ถ้าไม่ปัดทิ้ง โซนจะ "ยังมีคนอยู่" ทั้งที่แสดงผลเป็น 0 และไม่มีวันปิดเป็นเขียว
const EPSILON = 1e-6;

export function isZoneEmpty(zone) {
  return zone.trapped < EPSILON;
}

// เรียกทุก 1 ลูป — ลด trapped ตามอัตราตายเชิงเส้น (§5) · คืนจำนวนคนที่ตายรอบนี้
export function tickZoneDeath(zone) {
  if (zone.cleared || isZoneEmpty(zone)) return 0;
  const dead = Math.min(zone.trapped, deathPerLoop(zone));
  zone.trapped -= dead;
  zone.casualty += dead;
  if (isZoneEmpty(zone)) zone.trapped = 0;
  return dead;
}

// ตัวเลขสำหรับ "แสดงผล" (§7.5) — เก็บเป็นทศนิยม แต่โชว์เป็นจำนวนเต็ม
// ปัด trapped ลง แล้วให้ casualty รับเศษที่เหลือ เพื่อให้ trapped + rescued + casualty = initial เป๊ะเสมอ
export function displayCounts(zone) {
  const trapped = Math.floor(zone.trapped);
  const rescued = Math.round(zone.rescued);
  return { trapped, rescued, casualty: zone.initial - trapped - rescued };
}

// สรุปรายระดับสำหรับกล่องล่างสุด Ⓐ/Ⓑ/Ⓒ (GAMESCREEN_SPEC §9.1)
//   casualty%   = คนตายในระดับนั้น ÷ คนเริ่มต้นของระดับนั้น
//   clear%      = จำนวนโซนที่เคลียร์ ÷ จำนวนโซนในระดับนั้น   ← นับโซน ไม่ใช่นับคน
//   population% = คนที่ยังติดอยู่ ÷ คนเริ่มต้นของระดับนั้น
export function summarizeByTier(zones) {
  const acc = {};
  for (const level of ['gray', 'yellow', 'red']) {
    acc[level] = { initial: 0, trapped: 0, casualty: 0, zones: 0, clearedZones: 0 };
  }

  for (const zone of Object.values(zones)) {
    const t = acc[zone.level];
    const d = displayCounts(zone);
    t.initial += zone.initial;
    t.trapped += d.trapped;
    t.casualty += d.casualty;
    t.zones += 1;
    if (zone.cleared) t.clearedZones += 1;
  }

  const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
  const out = {};
  for (const [level, t] of Object.entries(acc)) {
    out[level] = {
      casualty: pct(t.casualty, t.initial),
      clear: pct(t.clearedZones, t.zones),
      population: pct(t.trapped, t.initial),
    };
  }
  return out;
}

// ชื่อโซนที่โชว์ผู้เล่น — zone-gray-12 → GRAY-12
export function zoneLabel(zoneId) {
  return zoneId.replace('zone-', '').toUpperCase();
}
