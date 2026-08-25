// ล็อกอัตราส่วนหน้าจอ — เล่นที่ไหนก็เห็นเหมือนกันเป๊ะ
//
// ── ปัญหาเดิม ──────────────────────────────────────────────────
// ทุกขนาดในเกมผูกกับ vh (ความสูงหน้าต่างจริง) ซึ่งบนมือถือ:
//   1. แถบ URL ของเบราว์เซอร์กินความสูงไปเรื่อย ๆ และยืด/หดตอนเลื่อน
//   2. ขอบบาก (notch) กินพื้นที่ด้านข้างตอนถือแนวนอน
//   3. มือถือจอยาว (20:9) เตี้ยมากจนเลย์เอาต์ใส่ไม่ลง แล้วโดน overflow:hidden ตัดทิ้ง
// ผลคือปุ่มหลุดขอบ ภาพหาย สัดส่วนเพี้ยนคนละแบบในทุกเครื่อง
//
// ── วิธีแก้ ─────────────────────────────────────────────────────
// วาดเกมลง "เวที" ขนาดคงที่ 1320×600 เสมอ แล้วย่อ/ขยายทั้งเวทีด้วย transform
// ให้พอดีพื้นที่ที่ใช้ได้จริง ส่วนที่เหลือเป็นแถบดำ (letterbox) เหมือนดูหนัง
//
//   สัดส่วนภายในเวทีจึงคงที่ 100% ไม่ว่าจอไหน — CSS ข้างในไม่ต้องรู้เรื่องขนาดจอเลย
//
// ⚠️ ห้ามใช้หน่วย vh/vw ใน CSS ที่อยู่ "ข้างในเวที" อีก
//    เพราะ vh/vw อ้างอิงหน้าต่างจริง ไม่ใช่เวที — ใส่แล้วสัดส่วนจะหลุดกลับไปเพี้ยนเหมือนเดิม
//    ใช้ px ตรง ๆ ได้เลย เพราะเวทีสูง 600 คงที่เสมอ

export const STAGE = { w: 1320, h: 600 };

// อ่านระยะขอบบาก (notch / ปุ่มโฮมแบบขีด) จากเบราว์เซอร์
// ต้องวัดผ่าน element จริง เพราะ env() อ่านตรง ๆ จาก JS ไม่ได้
let probe = null;

function safeInsets() {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
      'env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

/**
 * คำนวณและใส่ค่าย่อ/ขยายให้เวที — เรียกซ้ำได้ตลอด
 * ใช้ visualViewport ถ้ามี เพราะมันคือ "พื้นที่ที่เห็นจริง" หลังหักแถบ URL แล้ว
 * (innerHeight บนมือถือรวมพื้นที่ใต้แถบ URL ด้วย ใช้แล้วเนื้อหาจะล้นออกนอกจอ)
 */
export function fitStage() {
  const vv = window.visualViewport;
  const inset = safeInsets();

  const availW = Math.max(1, (vv?.width ?? window.innerWidth) - inset.left - inset.right);
  const availH = Math.max(1, (vv?.height ?? window.innerHeight) - inset.top - inset.bottom);

  const scale = Math.min(availW / STAGE.w, availH / STAGE.h);
  const root = document.documentElement;
  root.style.setProperty('--stage-scale', scale);
  // เลื่อนจุดกึ่งกลางให้ชดเชยขอบบาก ไม่งั้นเวทีจะเยื้องไปทับบากข้างเดียว
  root.style.setProperty('--stage-shift-x', `${(inset.left - inset.right) / 2}px`);
  root.style.setProperty('--stage-shift-y', `${(inset.top - inset.bottom) / 2}px`);
  return scale;
}

export function initStage() {
  fitStage();
  // มือถือยืด/หดแถบ URL ระหว่างเล่น และหมุนจอได้ — ต้องคำนวณใหม่ทุกครั้ง
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', () => setTimeout(fitStage, 120));
  window.visualViewport?.addEventListener('resize', fitStage);
  window.visualViewport?.addEventListener('scroll', fitStage);
  // บางเครื่องรายงานขนาดผิดในเฟรมแรกหลังโหลด — วัดซ้ำอีกทีตอนทุกอย่างพร้อม
  window.addEventListener('load', () => setTimeout(fitStage, 60));
}
