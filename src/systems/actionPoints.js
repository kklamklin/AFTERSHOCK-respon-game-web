// ระบบ Action Point — อ้างอิง docs/GAMESCREEN_SPEC.md §1.1 · AFTERSHOCKMASTER §8
//
// AP = กำลังเสริมที่ทยอยมาถึง จ่ายทุก 1 ชั่วโมง (= ทุก 2 ลูป)
//   เริ่มเกมด้วย CONFIG.apStart แล้วรับต่อชั่วโมงตาม CONFIG.apCurve ซึ่งเป็นเส้น "หน้าหนัก"
//   คือให้เยอะช่วงแรกแล้วค่อยลด — ตรงกับเรื่องในเกม (กำลังเสริมพุ่งเข้ามาแล้วทยอยหมด)
//   และตรงกับความกดดันจริง เพราะโซนแดงตายหมดตั้งแต่ ชม.32
//
// เดิมเป็น "5/ชม. + โบนัสตามสัดส่วนผู้รอดที่หายไปแล้ว" ซึ่งกลับหัว —
// โบนัสผูกกับจำนวนคนตาย แต้มก้อนใหญ่จึงมาถึงตอนไม่เหลือใครให้ช่วยแล้ว เลิกใช้แล้ว
//
// สะสมได้ไม่มีเพดาน · ไฟล์นี้อยู่ใน systems/ จึงห้ามแตะ DOM

import { CONFIG } from '../config.js';

// สัดส่วนผู้รอดที่หายไปแล้ว 0..1 (ตาย + ช่วยออกมาได้)
// ไม่เกี่ยวกับ AP แล้ว แต่เก็บไว้ให้หน้า Result (รอบที่ 10) เรียกใช้
export function resolvedRatio(state) {
  return (state.totalRescued + state.totalCasualty) / CONFIG.totalSurvivors;
}

// AP ที่จะได้รับในชั่วโมงถัดไป (ใช้โชว์ให้ผู้เล่นดูได้ด้วย)
export function apPerHour(state) {
  const step = CONFIG.apCurve.find((c) => state.hour < c.untilHour);
  return (step ?? CONFIG.apCurve[CONFIG.apCurve.length - 1]).ap;
}

// เรียกทุกครั้งที่ครบ 1 ชั่วโมง
export function payHourlyAP(state) {
  const gained = apPerHour(state);
  state.ap += gained;
  return gained;
}

// หัก AP ตอนใช้สกิล (รอบที่ 5 จะเรียกใช้) — คืน false ถ้าแต้มไม่พอ
export function spendAP(state, cost) {
  if (state.ap < cost) return false;
  state.ap -= cost;
  return true;
}
