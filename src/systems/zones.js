import { CONFIG } from '../config.js';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// สร้าง 48 โซนตาม §3.1/§4 ของ docs/gamesystemfinal.md
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

  // ปรับตัวสุดท้ายให้รวมได้ 1,200 พอดี (§4.3) — เกลี่ยส่วนต่างเข้าโซนสุ่ม
  let diff = CONFIG.totalSurvivors - total;
  const step = diff > 0 ? 1 : -1;
  let guard = 0;
  while (diff !== 0 && guard < 100000) {
    const i = randInt(0, initialCounts.length - 1);
    if (initialCounts[i] + step >= 1) {
      initialCounts[i] += step;
      diff -= step;
    }
    guard += 1;
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

export function deathPerLoop(zone) {
  const lifespan = CONFIG.zoneLifespanLoops[zone.level];
  return zone.initial / lifespan;
}

export function deathPerHour(zone) {
  return deathPerLoop(zone) * CONFIG.loopsPerHour;
}

// เรียกทุก 1 ลูป — ลด trapped ตามอัตราตายเชิงเส้น (§5)
export function tickZoneDeath(zone) {
  if (zone.cleared || zone.trapped <= 0) return;
  const dead = Math.min(zone.trapped, deathPerLoop(zone));
  zone.trapped -= dead;
  zone.casualty += dead;
}
