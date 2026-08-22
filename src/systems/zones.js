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
