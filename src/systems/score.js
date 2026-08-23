// คะแนนและแรงก์ตอนจบเกม — อ้างอิง docs/AFTERSHOCKMASTER.md §15.3 · GAMESCREEN_SPEC §13
//
// ระบบเก่า (ช่วยได้ − เสียชีวิต) ทำให้เล่นเก่งแค่ไหนก็ติดลบ เพราะเพดานการช่วยจริงอยู่ราว 37%
// ระบบใหม่วัด "ทำได้ดีแค่ไหนเทียบกับที่ทำได้จริง" แล้วให้คะแนน 0–1,200 พร้อมแรงก์ S–E
//
//   คะแนน = (ส่วนคน 780 + ส่วนโซน 240 + ส่วนความปลอดภัย 180) × ตัวคูณตอนจบ
//   แล้วบีบให้อยู่ในช่วง [10, 1200] — เล่นแย่แค่ไหนก็ไม่ต่ำกว่า 10 เก่งแค่ไหนก็ไม่เกิน 1,200
//
// ไฟล์นี้อยู่ใน systems/ จึงไม่แตะ DOM — คืนตัวเลขให้ ui/result.js เอาไปแสดง

import { CONFIG } from '../config.js';

// เหตุผลที่เกมจบ (state.endReason ตั้งค่าโดย systems/time.js)
const END_TEXT = {
  timeup: 'หมดเวลา 72 ชั่วโมง',
  empty: 'ไม่มีผู้รอดชีวิตเหลือให้ช่วยแล้ว',
  critical: 'ภารกิจล้มเหลว — เจ้าหน้าที่ภาคสนามหมดสติทั้งคู่',
};

export function endReasonText(reason) {
  return END_TEXT[reason] ?? 'จบภารกิจ';
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/** หาแรงก์จากคะแนน — CONFIG.ranks เรียงจากสูงไปต่ำ ตัวแรกที่ถึงเกณฑ์คือคำตอบ */
export function rankFor(score) {
  return CONFIG.ranks.find((r) => score >= r.min) ?? CONFIG.ranks[CONFIG.ranks.length - 1];
}

/**
 * สรุปผลทั้งเกมสำหรับหน้า Result
 * ตัวเลขคนต้องบวกกันลงตัวเสมอ: ช่วยได้ + เสียชีวิต = ผู้รอดชีวิตทั้งหมด
 * (systems/time.js นับคนที่ยังติดอยู่ตอนจบเป็นเสียชีวิตให้แล้ว)
 */
export function scoreBreakdown(state) {
  const S = CONFIG.score;

  const rescued = Math.round(state.totalRescued);
  const casualty = CONFIG.totalSurvivors - rescued; // ยึดให้รวมได้ 1,200 เป๊ะ ไม่ให้เศษทศนิยมทำเพี้ยน
  const rescueRate = rescued / CONFIG.totalSurvivors;

  const zones = Object.values(state.zones);
  // "โซนที่ช่วยได้" นับเฉพาะโซนที่มีคนถูกช่วยออกมาจริง
  // ไม่ใช่ zone.cleared เพราะโซนที่คนตายหมดเองก็ถูกมาร์คว่า cleared เหมือนกัน
  const zonesSaved = zones.filter((z) => Math.round(z.rescued) >= 1).length;
  const zonesTotal = zones.length;

  const stats = state.stats ?? { missions: 0, missionsSucceeded: 0, injuries: 0, blackouts: 0 };

  // ── สามส่วนของคะแนน ──────────────────────────────────────────
  // แต่ละส่วนคิดเป็นสัดส่วน 0..1 ก่อน แล้วค่อยคูณน้ำหนัก จะได้อ่านง่ายและปรับทีละส่วนได้
  const rescueFrac = clamp01(rescueRate / S.rescueTarget);
  const zoneFrac = clamp01(zonesSaved / (zonesTotal * S.zoneTarget));
  // ส่วนความปลอดภัยต้อง "ลงสนามจริง" ถึงจะได้ ไม่งั้นนั่งเฉย ๆ ก็ได้เต็มเพราะไม่มีใครเจ็บ
  const engagement = clamp01(stats.missions / S.safetyMinMissions);
  const safetyFrac = clamp01(1 - (stats.injuries * S.injuryPenalty + stats.blackouts * S.blackoutPenalty)) * engagement;

  // ปัดรายส่วนก่อน แล้วค่อยบวก — ไม่ใช่บวกก่อนแล้วปัด
  // ไม่งั้นเลขที่โชว์บนหน้าจอจะบวกกันไม่ลงตัว (79 + 38 + 0 แต่รวมเป็น 118)
  const rescuePoints = Math.round(rescueFrac * S.rescueWeight);
  const zonePoints = Math.round(zoneFrac * S.zoneWeight);
  const safetyPoints = Math.round(safetyFrac * S.safetyWeight);

  const multiplier = state.endReason === 'critical' ? S.criticalMultiplier : 1;
  const raw = (rescuePoints + zonePoints + safetyPoints) * multiplier;

  // บีบให้อยู่ในช่วงที่สัญญาไว้ — เล่นแย่แค่ไหนก็ไม่ต่ำกว่า min เก่งแค่ไหนก็ไม่เกิน max
  const score = Math.max(S.min, Math.min(S.max, Math.round(raw)));
  const rank = rankFor(score);

  return {
    total: CONFIG.totalSurvivors,
    rescued,
    casualty,
    rescueRate: rescueRate * 100,
    zonesSaved,
    zonesTotal,

    // รายส่วน — หน้า Result เอาไปแสดงเป็นแถบให้เห็นว่าคะแนนมาจากไหน
    parts: [
      { key: 'rescue', label: 'ผู้รอดชีวิตที่ช่วยได้', points: rescuePoints, max: S.rescueWeight, frac: rescueFrac },
      { key: 'zone',   label: 'ความครอบคลุมพื้นที่',   points: zonePoints,   max: S.zoneWeight,   frac: zoneFrac },
      { key: 'safety', label: 'ความปลอดภัยของทีม',    points: safetyPoints, max: S.safetyWeight, frac: safetyFrac },
    ],

    multiplier,
    score,
    scoreMax: S.max,
    rank: rank.key,
    rankTitle: rank.title,
    rankNote: rank.note,

    missions: stats.missions,
    missionsSucceeded: stats.missionsSucceeded,
    injuries: stats.injuries,
    blackouts: stats.blackouts,

    reason: state.endReason,
    reasonText: endReasonText(state.endReason),
  };
}
