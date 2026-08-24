// ฉากเมืองหลังแผ่นดินไหวบนหน้าเมนู — วาดด้วยเวกเตอร์ (SVG) ทั้งหมด ไม่ใช้ไฟล์รูป
//
// ไฟล์นี้อยู่ใน ui/ และไม่รู้จักกฎเกมเลย เป็นฉากหลังล้วน ๆ
// วาดด้วยโค้ดแทนไฟล์ภาพเพราะ (1) ไม่เพิ่มขนาดไฟล์ตอน build รวมไฟล์เดียว
// (2) ปรับสี/จำนวนตึกได้จากตัวเลขไม่กี่ตัว (3) คมทุกความละเอียดจอ
//
// ตึกถูกสุ่มรูปทรงแบบ "สุ่มคงที่" — เปิดหน้าเมนูกี่ครั้งก็ได้เมืองหน้าตาเดิม
// (ถ้าสุ่มใหม่ทุกครั้ง เมืองจะกระโดดเปลี่ยนรูปตอนกดกลับเมนู ดูเหมือนบั๊ก)

const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

// ตัวสุ่มแบบมีซีด (mulberry32 ตัวเดียวกับ utils/rng.js แต่แยกสายกัน
// เพราะฉากหลังต้องไม่ไปกินลำดับสุ่มของเกม — ไม่งั้นตั้งซีดเทสแล้วผลเกมเพี้ยน)
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 420;   // พิกัดภายใน viewBox — ไม่เกี่ยวกับพิกเซลจริงบนจอ
const H = 300;

/**
 * สร้างตึก 1 หลัง พร้อมหน้าต่างที่ติดไฟบางบาน
 * @param lit สัดส่วนหน้าต่างที่ติดไฟ (ตึกชั้นหลังติดน้อยกว่า ให้ดูไกล)
 */
function building(rnd, x, w, h, { lit = 0.45, cls = '' } = {}) {
  const g = svg('g', { class: `sky-bld ${cls}`.trim() });
  const y = H - h;

  g.appendChild(svg('rect', { x, y, width: w, height: h, class: 'sky-body' }));

  // ยอดตึกบางหลังมีเสาอากาศ — ทำให้เส้นขอบฟ้าไม่เรียบเป็นแถวเดียวกัน
  if (rnd() < 0.35) {
    const mx = x + w / 2;
    g.appendChild(svg('line', { x1: mx, y1: y, x2: mx, y2: y - 8 - rnd() * 14, class: 'sky-mast' }));
  }

  // หน้าต่างเป็นตาราง — เว้นขอบตึกไว้ ไม่ให้ชนขอบ
  const cols = Math.max(1, Math.floor((w - 6) / 7));
  const rows = Math.max(1, Math.floor((h - 8) / 9));
  const gapX = (w - cols * 4) / (cols + 1);
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      if (rnd() > lit) continue;
      const win = svg('rect', {
        x: (x + gapX + c * (4 + gapX)).toFixed(1),
        y: (y + 6 + r * 9).toFixed(1),
        width: 4, height: 5, class: 'sky-win',
      });
      // หน้าต่างบางบานกะพริบ — ไฟสำรองที่กำลังจะดับ
      if (rnd() < 0.12) {
        win.classList.add('sky-win--flicker');
        win.style.animationDelay = `${(rnd() * 6).toFixed(2)}s`;
      }
      g.appendChild(win);
    }
  }
  return g;
}

// เรียงตึกต่อกันไปเรื่อย ๆ จนเต็มความกว้าง
function row(rnd, { yScale, lit, cls, minW, maxW, minH, maxH }) {
  const g = svg('g', { class: cls });
  let x = -10;
  while (x < W + 10) {
    const w = minW + rnd() * (maxW - minW);
    const h = (minH + rnd() * (maxH - minH)) * yScale;
    g.appendChild(building(rnd, x, w, h, { lit }));
    x += w + 3 + rnd() * 7;
  }
  return g;
}

/**
 * สร้างฉากเมือง — คืน element เอาไปวางในหน้าเมนูได้เลย
 * @param seed เปลี่ยนเลขนี้ = ได้เมืองหน้าตาใหม่ (ค่าเดิม = เมืองเดิมเสมอ)
 */
export function buildSkyline(seed = 20260824) {
  const rnd = seeded(seed);

  const wrap = document.createElement('div');
  wrap.className = 'skyline';
  wrap.setAttribute('aria-hidden', 'true'); // เป็นฉากหลังล้วน ไม่ต้องให้โปรแกรมอ่านหน้าจออ่าน

  const root = svg('svg', {
    class: 'skyline-svg', viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: 'xMidYMax slice',
  });

  // 3 ชั้นความลึก — ชั้นไกลเตี้ยและจางกว่า ชั้นใกล้สูงและเข้มกว่า
  // ชั้นไกลสั่นน้อยกว่าชั้นใกล้ (parallax) ทำให้รู้สึกมีระยะจริง
  root.appendChild(row(rnd, { yScale: 1, lit: 0.16, cls: 'sky-layer sky-layer--far',
    minW: 26, maxW: 46, minH: 70, maxH: 120 }));
  root.appendChild(row(rnd, { yScale: 1, lit: 0.32, cls: 'sky-layer sky-layer--mid',
    minW: 30, maxW: 56, minH: 100, maxH: 175 }));
  root.appendChild(row(rnd, { yScale: 1, lit: 0.5, cls: 'sky-layer sky-layer--near',
    minW: 38, maxW: 70, minH: 140, maxH: 235 }));

  wrap.appendChild(root);
  return wrap;
}
