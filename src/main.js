// จุดเริ่มต้นของเกม — ผูกทุกหน้าจอเข้ากับ #screen-root
//
// flow: ปก → เมนูหลัก → (Settings / Intel / Quit) → Play → Tutorial → หน้าเกมหลัก
// ดู src/ui/screens.js สำหรับการเชื่อมหน้าจอทั้งหมด
//
// หมายเหตุ: นาฬิกาเกมจริง (systems/time.js) กับแผนที่ (ui/map.js) ยังไม่ได้ต่อเข้าหน้าเกมหลัก
// จะต่อในรอบที่ 2 (แผนที่จริง) และรอบที่ 3 (เดินเวลา) ตาม docs/GAMESCREEN_SPEC.md §14

import { initScreens } from './ui/screens.js';

initScreens(document.getElementById('screen-root'));
