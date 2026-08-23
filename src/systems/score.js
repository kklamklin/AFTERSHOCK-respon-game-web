// คะแนนและสรุปผลปฏิบัติการ — อ้างอิง docs/AFTERSHOCKMASTER.md §15.3 · GAMESCREEN_SPEC §13
//
//   คะแนน = ช่วยได้ × scoreRescue + เสียชีวิต × scoreCasualty   (ตอนนี้คือ +1 กับ −1)
//   ไม่ช่วยใครเลย → −1,200 · ช่วยได้ครบ → +1,200 · จุดคุ้มทุนอยู่ที่ 600 คน
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

/**
 * สรุปผลทั้งเกมสำหรับหน้า Result
 * ตัวเลขที่นี่ต้องบวกกันลงตัวเสมอ: ช่วยได้ + เสียชีวิต = ผู้รอดชีวิตทั้งหมด
 * (systems/time.js นับคนที่ยังติดอยู่ตอนจบเป็นเสียชีวิตให้แล้ว)
 */
export function scoreBreakdown(state) {
  const rescued = Math.round(state.totalRescued);
  const casualty = CONFIG.totalSurvivors - rescued; // ยึดให้รวมได้ 1,200 เป๊ะ ไม่ให้เศษทศนิยมทำเพี้ยน

  const zones = Object.values(state.zones);
  // "โซนที่ช่วยได้" นับเฉพาะโซนที่มีคนถูกช่วยออกมาจริง
  // ไม่ใช่ zone.cleared เพราะโซนที่คนตายหมดเองก็ถูกมาร์คว่า cleared เหมือนกัน
  const zonesSaved = zones.filter((z) => Math.round(z.rescued) >= 1).length;

  return {
    total: CONFIG.totalSurvivors,
    rescued,
    casualty,
    rescuePoints: rescued * CONFIG.scoreRescue,
    casualtyPoints: casualty * CONFIG.scoreCasualty,
    score: rescued * CONFIG.scoreRescue + casualty * CONFIG.scoreCasualty,
    rescueRate: (rescued / CONFIG.totalSurvivors) * 100,
    zonesSaved,
    zonesTotal: zones.length,
    reason: state.endReason,
    reasonText: endReasonText(state.endReason),
  };
}
