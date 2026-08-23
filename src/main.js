// จุดเริ่มต้นของเกม — ผูกทุกหน้าจอเข้ากับ #screen-root
//
// flow: ปก → เมนูหลัก → (Settings / Intel / Quit) → Play → Tutorial → หน้าเกมหลัก
// ดู src/ui/screens.js สำหรับการเชื่อมหน้าจอทั้งหมด
//
// นาฬิกา แผนที่ และแถบ จนท. ต่อกับ state จริงหมดแล้ว — ดู src/ui/gameScreen.js

import { initScreens } from './ui/screens.js';
import { state } from './state.js';
import { CONFIG } from './config.js';
import * as rng from './utils/rng.js';

initScreens(document.getElementById('screen-root'));

// ── ช่องทาง debug ตอน dev ───────────────────────────────────────
// เปิด Console ในเบราว์เซอร์แล้วพิมพ์ AFTERSHOCK.state เพื่อดู/แก้สถานะเกมสด ๆ ได้
// ใช้ทดสอบสถานะที่ยังไม่มีทางเกิดเองในเกม (บาดเจ็บ / หมดสติ / Last Stand)
// build รวมไฟล์เดียว (รอบที่ 10) จะตัดบรรทัดนี้ทิ้ง
// rng.setSeed(n) ทำให้การทอยออกผลเหมือนเดิมทุกครั้ง — ใช้ตอนไล่บั๊ก
globalThis.AFTERSHOCK = { state, CONFIG, rng };
