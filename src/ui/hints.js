// ระบบคำใบ้ในหน้าเกม — สอนคนที่ไม่เคยเล่นมาก่อนเลย ทีละขั้น
//
// เปิด/ปิดจากติ๊ก "คำใบ้ในเกม" ในหน้าเลือกโหมด (ค่าเริ่มต้น = เปิด)
// ไฟล์นี้อยู่ใน ui/ และ **ไม่รู้กฎเกมเลย** — รับแค่ "ชี้ไปที่ element ไหน พูดว่าอะไร"
// เรื่องหยุด/เดินเวลาเป็นหน้าที่ของ gameScreen.js ที่ส่ง onPause/onResume เข้ามา
//
// ── ทำไมม่านมืดเป็น 4 ชิ้น ไม่ใช่ชิ้นเดียวเจาะรู ────────────────
// วิธียอดนิยมคือใช้ box-shadow วงใหญ่คลุมจอ แต่โหมดกราฟิกต่ำตัด box-shadow ทิ้งหมด
// ม่านจะหายไปทั้งอัน เลยใช้สี่เหลี่ยมทึบ 4 ชิ้นล้อมรอบเป้าหมายแทน — ทำงานได้ทุกโหมด
//
// ── ม่านไม่กันการกดโดยตั้งใจ ──────────────────────────────────
// ทุกชิ้นตั้ง pointer-events: none ผู้เล่นจึงลองลากไอคอนตามคำใบ้ได้ทันที
// ไม่ต้องกดปิดก่อน (ขั้นที่ให้ลองลากจริงจึงเป็นไปได้)

import { getGameOptions } from '../data/prefs.js';

// ── บทคำใบ้ ─────────────────────────────────────────────────────
// target = ตัวที่จะไฮไลต์ (null = กล่องลอยกลางจอ ไม่ชี้อะไร)
// waitDrop = true → ขั้นนี้ข้ามเองเมื่อผู้เล่นลากลงโซนสำเร็จ (ยังกด "ถัดไป" ได้)
const STEPS = [
  {
    target: null,
    title: 'ยินดีต้อนรับ ผู้บัญชาการ',
    body: 'มีผู้รอดชีวิต 1,200 คนติดอยู่ใน 47 โซนทั่วเมือง คุณมีเวลา 72 ชั่วโมง '
        + 'หน้าที่คือสั่งเจ้าหน้าที่เข้าไปช่วยให้ได้มากที่สุด\n'
        + 'เวลาหยุดไว้ให้แล้วระหว่างอ่านคำใบ้ ไม่ต้องรีบ',
  },
  {
    target: '.game-side--left',
    title: 'ทีมภาคสนาม — คนที่ลงไปช่วยจริง',
    body: 'สองคนนี้คือคนที่ "ลงพื้นที่" ไปช่วยผู้รอดชีวิตด้วยตัวเอง\n'
        + 'คนที่ช่วยคนได้จริง ๆ มีแค่สองคนนี้เท่านั้น',
  },
  {
    target: '.skill-row[data-op="cat"][data-skill="hsar"] .skill-icon',
    title: 'ไอคอนสกิล = คำสั่ง',
    body: 'ไอคอนที่มีป้าย 📥 มุมบน คือ "สกิลลงพื้นที่"\n'
        + 'เลขข้าง ๆ (−10 / −18 / −30) คือราคาที่ต้องจ่าย แยกตามระดับโซนที่จะส่งไป',
  },
  {
    target: '.game-map',
    title: 'ลากไอคอนมาวางบนโซน',
    body: 'ลากไอคอนสกิลจากแถบข้าง มาปล่อยบนโซนในแผนที่ได้เลย\n'
        + '⚠️ ปล่อยนิ้วคือยืนยันทันที ไม่มีหน้าถามซ้ำ · ระหว่างลากเวลาจะหยุดให้เอง\n'
        + 'โซนที่ส่งไปไม่ได้จะขึ้นกากบาท ✕ · ลองลากดูได้เลยตอนนี้',
    waitDrop: true,
  },
  {
    target: '.game-side--right',
    title: 'ทีมภาคฐาน — ตัวช่วย ไม่ได้ลงไปเอง',
    body: 'ไอคอนที่มีป้าย ✨ คือ "บัฟ" — ไม่ได้ลงไปช่วยคนเอง แต่ไปเพิ่มโอกาสสำเร็จให้คนที่ลงไป\n'
        + 'ใช้บัฟใส่โซนก่อน แล้วค่อยส่งภาคสนามลงไป จะช่วยคนได้เยอะขึ้นมาก',
  },
  {
    target: '.game-ap',
    title: 'AP คือแต้มสั่งการ',
    body: 'ทุกสกิลใช้ AP · เริ่มเกมมี 80 แต้ม และได้เพิ่มเองทุกชั่วโมงที่ผ่านไป\n'
        + 'แต้มไม่พอจะสั่งไม่ได้ ต้องรอสะสม',
  },
  {
    target: '.game-speed',
    title: 'ปุ่มควบคุมเวลา',
    body: 'ปุ่มซ้าย = หยุด/เดินเวลาต่อ · ปุ่มขวา = เร่งความเร็ว 2 เท่า\n'
        + 'หยุดเวลาแล้วคิดนานแค่ไหนก็ได้ ไม่เสียอะไรเลย',
  },
  {
    target: '.game-time',
    title: 'ปุ่ม Time กับเมนู ☰',
    body: 'กด Time เพื่อดูว่าเหลือเวลาอีกเท่าไหร่ · ปุ่ม ☰ มุมซ้ายบนคือเมนูในเกม',
  },
  {
    target: '.game-bottom',
    title: 'สรุปสถานการณ์ 3 ระดับโซน',
    body: 'Ⓐ เทา = ปลอดภัย คนน้อย · Ⓑ เหลือง = ปานกลาง · Ⓒ แดง = คนเยอะแต่อันตรายและหมดเวลาเร็วที่สุด\n'
        + 'โซนแดงคุ้มที่สุดถ้าใส่บัฟก่อน แต่ส่งไปเปล่า ๆ มักไม่สำเร็จ',
  },
  {
    target: '.map-zoom',
    title: 'ซูมแผนที่ได้',
    body: 'โซนเล็ก ๆ ลากลงยาก ให้กด + ซูมเข้าไปก่อน แล้วปัดแผนที่หาโซนที่ต้องการ',
  },
  {
    target: null,
    title: 'พร้อมแล้ว เริ่มได้เลย',
    body: 'สรุปสั้น ๆ: ใส่บัฟก่อน → ส่งภาคสนามลงโซน → รอจนครบเวลาแล้วดูผล\n'
        + 'ไม่อยากเห็นคำใบ้นี้อีก เอาติ๊ก "คำใบ้ในเกม" ออกในหน้าเลือกโหมดก่อนกด PLAY',
  },
];

/** เปิดคำใบ้ไหม — อ่านจากติ๊กในหน้าเลือกโหมด */
export function hintsEnabled() {
  return !!getGameOptions().hints;
}

/**
 * เริ่มสอนทีละขั้น
 * @param root      element ของหน้าเกม (เวทีที่ถูก scale อยู่)
 * @param onPause   สั่งหยุดเวลา (เรียกตอนเริ่ม)
 * @param onResume  สั่งเดินเวลาต่อ (เรียกตอนจบ/ข้าม)
 * @returns handle — .notifyDeployed() บอกว่าผู้เล่นลากลงโซนสำเร็จแล้ว · .stop() ปิดทิ้ง
 */
export function runHints(root, { onPause, onResume } = {}) {
  let step = 0;
  let closed = false;

  onPause?.();

  const wrap = document.createElement('div');
  wrap.className = 'hint-wrap';

  // ม่านมืด 4 ชิ้นล้อมรอบเป้าหมาย (ดูหมายเหตุหัวไฟล์ว่าทำไมไม่ใช้ชิ้นเดียว)
  const shades = ['top', 'right', 'bottom', 'left'].map((side) => {
    const d = document.createElement('div');
    d.className = `hint-shade hint-shade--${side}`;
    wrap.appendChild(d);
    return d;
  });

  const ring = document.createElement('div');
  ring.className = 'hint-ring';
  wrap.appendChild(ring);

  const bubble = document.createElement('div');
  bubble.className = 'hint-bubble';

  const num = document.createElement('div');
  num.className = 'hint-num';
  const title = document.createElement('div');
  title.className = 'hint-title';
  const body = document.createElement('div');
  body.className = 'hint-body';

  const row = document.createElement('div');
  row.className = 'hint-row';
  const skip = document.createElement('button');
  skip.className = 'hint-skip';
  skip.textContent = 'ข้ามคำใบ้';
  const next = document.createElement('button');
  next.className = 'hint-next';
  row.append(skip, next);

  bubble.append(num, title, body, row);
  wrap.appendChild(bubble);
  root.appendChild(wrap);

  skip.addEventListener('click', () => stop());
  next.addEventListener('click', () => {
    if (step >= STEPS.length - 1) stop();
    else { step += 1; paint(); }
  });

  // อัตราส่วนของเวที — เวทีถูกย่อด้วย transform: scale() ตัวเลขจาก
  // getBoundingClientRect จึงเป็น "พิกเซลบนจอจริง" ต้องหารกลับเป็นพิกัดในเวทีก่อนใช้
  function stageScale() {
    const r = root.getBoundingClientRect();
    return r.width && root.offsetWidth ? r.width / root.offsetWidth : 1;
  }

  function paint() {
    const s = STEPS[step];
    num.textContent = `คำใบ้ ${step + 1} / ${STEPS.length}`;
    title.textContent = s.title;
    body.textContent = s.body;
    next.textContent = step >= STEPS.length - 1 ? 'เริ่มเล่น ▸' : 'ถัดไป ▸';

    const target = s.target ? root.querySelector(s.target) : null;
    const rootRect = root.getBoundingClientRect();
    const k = stageScale();
    const W = root.offsetWidth;
    const H = root.offsetHeight;

    if (!target) {
      // ไม่ชี้อะไร — มืดทั้งจอ กล่องลอยกลาง
      ring.hidden = true;
      for (const d of shades) d.hidden = true;
      shades[0].hidden = false;
      Object.assign(shades[0].style, { left: '0px', top: '0px', width: `${W}px`, height: `${H}px` });
      bubble.classList.add('is-center');
      bubble.style.left = ''; bubble.style.top = '';
      return;
    }

    bubble.classList.remove('is-center');
    const r = target.getBoundingClientRect();
    const pad = 6;
    const x = (r.left - rootRect.left) / k - pad;
    const y = (r.top - rootRect.top) / k - pad;
    const w = r.width / k + pad * 2;
    const h = r.height / k + pad * 2;

    ring.hidden = false;
    Object.assign(ring.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });

    // ม่าน 4 ชิ้น: บน / ล่าง / ซ้าย / ขวา ของกรอบไฮไลต์
    for (const d of shades) d.hidden = false;
    Object.assign(shades[0].style, { left: '0px', top: '0px', width: `${W}px`, height: `${Math.max(0, y)}px` });
    Object.assign(shades[2].style, { left: '0px', top: `${y + h}px`, width: `${W}px`, height: `${Math.max(0, H - y - h)}px` });
    Object.assign(shades[3].style, { left: '0px', top: `${y}px`, width: `${Math.max(0, x)}px`, height: `${h}px` });
    Object.assign(shades[1].style, { left: `${x + w}px`, top: `${y}px`, width: `${Math.max(0, W - x - w)}px`, height: `${h}px` });

    // ── วางกล่องข้อความ ────────────────────────────────────────
    // ไล่ลอง 4 ทิศรอบเป้าหมาย เอาอันแรกที่ "อยู่ในเวทีครบ" และ "ไม่ทับเป้าหมาย"
    // ต้องมีทิศซ้าย/ขวาด้วย เพราะบางเป้าหมายสูงเกือบเต็มจอ (แถบ จนท. · แผนที่)
    // วางบน/ล่างยังไงก็ทับ
    const bw = bubble.offsetWidth || 380;
    const bh = bubble.offsetHeight || 150;
    const gap = 12;
    const fit = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const cands = [
      { x: x + w / 2 - bw / 2, y: y + h + gap },   // ใต้เป้าหมาย
      { x: x + w / 2 - bw / 2, y: y - bh - gap },  // เหนือเป้าหมาย
      { x: x + w + gap, y: y + h / 2 - bh / 2 },   // ขวาเป้าหมาย
      { x: x - bw - gap, y: y + h / 2 - bh / 2 },  // ซ้ายเป้าหมาย
    ];
    const hits = (a) => !(a.x + bw < x || a.x > x + w || a.y + bh < y || a.y > y + h);
    let put = null;
    for (const c of cands) {
      const a = { x: fit(c.x, 4, W - bw - 4), y: fit(c.y, 4, H - bh - 4) };
      // ต้องไม่ถูกดันจนหลุดจากทิศที่ตั้งใจ และต้องไม่ทับกรอบไฮไลต์
      const moved = Math.abs(a.x - c.x) > 1 && Math.abs(a.y - c.y) > 1;
      if (!moved && !hits(a)) { put = a; break; }
    }
    // ไม่มีทิศไหนลงตัวเลย (เป้าหมายใหญ่เกือบเต็มจอ) — วางมุมที่เหลือที่ว่างที่สุด
    if (!put) {
      const right = W - (x + w), left = x, below = H - (y + h), above = y;
      const best = Math.max(right, left, below, above);
      if (best === right) put = { x: W - bw - 4, y: fit(y, 4, H - bh - 4) };
      else if (best === left) put = { x: 4, y: fit(y, 4, H - bh - 4) };
      else if (best === below) put = { x: fit(x + w / 2 - bw / 2, 4, W - bw - 4), y: H - bh - 4 };
      else put = { x: fit(x + w / 2 - bw / 2, 4, W - bw - 4), y: 4 };
    }
    bubble.style.left = `${fit(put.x, 4, W - bw - 4)}px`;
    bubble.style.top = `${fit(put.y, 4, H - bh - 4)}px`;
  }

  function stop() {
    if (closed) return;
    closed = true;
    wrap.remove();
    window.removeEventListener('resize', paint);
    onResume?.();
  }

  window.addEventListener('resize', paint);
  paint();
  // วัดกล่องอีกรอบหลังเบราว์เซอร์จัดผังจริงแล้ว (รอบแรก offsetWidth ยังเป็น 0)
  requestAnimationFrame(paint);

  return {
    stop,
    isOpen: () => !closed,
    /** ผู้เล่นลากลงโซนสำเร็จ — ถ้ากำลังอยู่ขั้น "ลองลากดู" ให้ไปขั้นถัดไปเอง */
    notifyDeployed() {
      if (closed || !STEPS[step]?.waitDrop) return;
      if (step >= STEPS.length - 1) stop();
      else { step += 1; paint(); }
    },
  };
}
