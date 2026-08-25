// จุดเริ่มต้นของเกม — ผูกทุกหน้าจอเข้ากับ #screen-root
//
// flow: ปก → เมนูหลัก → (Settings / Intel / Quit) → Play → Tutorial → หน้าเกมหลัก
// ดู src/ui/screens.js สำหรับการเชื่อมหน้าจอทั้งหมด
//
// นาฬิกา แผนที่ และแถบ จนท. ต่อกับ state จริงหมดแล้ว — ดู src/ui/gameScreen.js

import { initScreens } from './ui/screens.js';
import { probeIcons } from './data/icons.js';
import { preloadSounds, attachClickSound } from './ui/audio.js';
import { loadPrefs } from './data/prefs.js';
import { state } from './state.js';
import { CONFIG } from './config.js';
import * as rng from './utils/rng.js';

// ตรวจก่อนว่าไฟล์ไอคอนใน assets/icons/ อันไหนมีจริง แล้วค่อยวาดหน้าแรก
// อันที่ยังไม่มีไฟล์จะใช้ emoji เดิมไปก่อน — วางไฟล์ทับเมื่อไหร่ก็ขึ้นเอง ไม่ต้องแก้โค้ด
await probeIcons();

// อ่านค่าเสียง/ความสว่างที่ผู้เล่นตั้งไว้ครั้งก่อนก่อนทุกอย่าง
// ต้องมาก่อน preloadSounds() เพราะระบบเสียงอ่านค่าระดับเสียงตอนถูกสร้าง
loadPrefs();

// โหลดไฟล์เสียงไว้ล่วงหน้า + ต่อเสียงคลิกเข้ากับทุกปุ่มครั้งเดียว (ดู ui/audio.js)
// เสียงจริงจะดังได้หลังผู้เล่นแตะจอครั้งแรกเท่านั้น (autoplay policy ของเบราว์เซอร์)
preloadSounds();
attachClickSound();

initScreens(document.getElementById('screen-root'));

// ── ช่องทาง debug ตอน dev ───────────────────────────────────────
// เปิด Console ในเบราว์เซอร์แล้วพิมพ์ AFTERSHOCK.state เพื่อดู/แก้สถานะเกมสด ๆ ได้
// ใช้ทดสอบสถานะที่ยังไม่มีทางเกิดเองในเกม (บาดเจ็บ / หมดสติ / Last Stand)
// build รวมไฟล์เดียว (รอบที่ 10) จะตัดบรรทัดนี้ทิ้ง
// rng.setSeed(n) ทำให้การทอยออกผลเหมือนเดิมทุกครั้ง — ใช้ตอนไล่บั๊ก
globalThis.AFTERSHOCK = { state, CONFIG, rng };
