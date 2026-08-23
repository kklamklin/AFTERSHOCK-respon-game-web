// ตัวสุ่มกลางของเกม — ทุกที่ที่ต้องสุ่มต้องเรียกผ่านไฟล์นี้
//
// ปกติใช้ Math.random ตามเดิม แต่ตั้ง "ซีด" ได้ด้วย setSeed()
// เพื่อให้ตอนทดสอบสั่งให้ผลออกมาเหมือนเดิมทุกครั้ง และตรวจการกระจายตัวได้จริง

let impl = Math.random;

// mulberry32 — ตัวสุ่มเล็ก ๆ ที่ให้ลำดับเดิมเสมอเมื่อซีดเท่ากัน
export function setSeed(seed) {
  let a = seed >>> 0;
  impl = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clearSeed() {
  impl = Math.random;
}

export function random() {
  return impl();
}

// สุ่มจำนวนเต็ม min..max (รวมปลายทั้งสองข้าง)
export function randInt(min, max) {
  return Math.floor(impl() * (max - min + 1)) + min;
}

// ทอยลูกเต๋า 1-100 — ใช้กับการทอยสำเร็จและทอยอันตราย
export function roll100() {
  return randInt(1, 100);
}

/**
 * สุ่มเลือก key จากตารางน้ำหนัก เช่น { best: 20, high: 25, mid: 35, low: 20 }
 * น้ำหนักรวมกันได้เท่าไหร่ก็ได้ ไม่จำเป็นต้องเป็น 100
 */
export function pickWeighted(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = impl() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r < 0) return key;
  }
  return entries[entries.length - 1][0];
}
