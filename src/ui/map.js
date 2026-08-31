// แผนที่เมือง 47 โซน — ฝัง map.svg จริง (รอบที่ 2)
// อ้างอิง docs/GAMESCREEN_SPEC.md §11 การแสดงผลบนแผนที่
//
// ไฟล์นี้อยู่ใน ui/ จึงห้ามคำนวณกฎเกม — รับ object โซนจาก systems/ มาวาดอย่างเดียว
// id ของ path ใน map.svg (zone-gray-01 … zone-red-08) ตรงกับ id ที่ systems/zones.js สร้าง 1:1

import { CONFIG } from '../config.js';
import { iconPath, iconEmoji } from '../data/icons.js';

const VIEWBOX = { w: 1600, h: 1000 }; // ขนาดจริงของ map.svg

// โหลดตัว SVG — ตอน dev อ่านจากไฟล์, ตอน build รวมไฟล์เดียวจะฝังไว้ใน __MAP_SVG__ ให้แล้ว
export async function loadMapSvg() {
  if (globalThis.__MAP_SVG__) return globalThis.__MAP_SVG__;
  const res = await fetch('map.svg');
  if (!res.ok) throw new Error(`โหลด map.svg ไม่ได้ (${res.status})`);
  return res.text();
}

// หด viewBox ให้พอดีกับขอบเขตของเมืองจริง + เว้นขอบเล็กน้อย
function cropViewBox(svg) {
  const content = svg.querySelector('#map') ?? svg;
  const box = content.getBBox();
  if (!box.width || !box.height) return;
  const pad = Math.max(box.width, box.height) * 0.02;
  svg.setAttribute('viewBox',
    `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`);
}

// จุดกลางที่ "อยู่ในรูปทรงจริง"
// โซนรูปตัว L / เว้าแหว่ง จุดกึ่งกลางกรอบสี่เหลี่ยมอาจตกนอกตัวโซน ทำให้เลขไปโผล่ข้างนอก
// จึงหว่านจุดทดสอบเป็นตาราง เลือกจุดที่อยู่ในเนื้อโซนและห่างจากขอบมากที่สุด
const GRID = 13;

function visualCenter(path, box) {
  const svg = path.ownerSVGElement;
  const inside = [];
  const outside = [];

  for (let i = 0; i < GRID; i += 1) {
    for (let j = 0; j < GRID; j += 1) {
      const pt = svg.createSVGPoint();
      pt.x = box.x + (box.width * (i + 0.5)) / GRID;
      pt.y = box.y + (box.height * (j + 0.5)) / GRID;
      (path.isPointInFill?.(pt) ? inside : outside).push(pt);
    }
  }

  if (!inside.length) return { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  // เรียงจุดที่อยู่ในเนื้อโซนตาม "ความห่างจากขอบ" มากไปน้อย
  const ranked = inside
    .map((c) => ({
      pt: c,
      clear: Math.min(...outside.map((o) => (c.x - o.x) ** 2 + (c.y - o.y) ** 2), Infinity),
    }))
    .sort((a, b) => b.clear - a.clear);

  // บางโซนใน map.svg วางทับกัน จุดที่อยู่ในเนื้อโซนนี้อาจถูกโซนอื่นบังอยู่ข้างบน
  // เลือกจุดที่ "จิ้มแล้วโดนโซนนี้จริง" เป็นอันดับแรก เพื่อให้เลขกับจุดที่วางไอคอนตรงกับที่ผู้เล่นกดได้
  const ctm = svg.getScreenCTM();
  if (ctm) {
    for (const cand of ranked.slice(0, 24)) {
      const s = cand.pt.matrixTransform(ctm);
      if (document.elementFromPoint(s.x, s.y)?.closest?.('.map-zone') === path) {
        return { x: cand.pt.x, y: cand.pt.y };
      }
    }
  }
  return { x: ranked[0].pt.x, y: ranked[0].pt.y };
}

// หมายเหตุ: เคยมีตัวเลข "คนติดอยู่" พิมพ์ไว้กลางโซนทุกโซน
// เจ้าของสั่งเอาออก — ตัวเลขไปโผล่ในแผงล่างตอนลากไอคอนผ่านโซนแทน (ดู ui/panels.js §9.2)

/**
 * วาดแผนที่ลงใน container
 * @returns handle สำหรับอัปเดตทีหลัง — { svg, zoneEls, panzoom }
 */
export async function renderMap(container, zones) {
  container.innerHTML = await loadMapSvg();

  const svg = container.querySelector('svg');
  svg.classList.add('map-svg');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // map.svg มีพื้นขาวเต็มกรอบ 1600×1000 แต่ตัวเมืองจริงกินพื้นที่แค่บางส่วน
  // ถอดพื้นขาวออกแล้วหด viewBox ให้พอดีตัวเมือง เพื่อให้แผนที่ใช้พื้นที่จอได้เต็มที่
  svg.querySelector(':scope > g > rect, :scope > rect')?.remove();
  cropViewBox(svg);

  const zoneEls = new Map();
  const boxes = new Map();
  const centers = new Map();

  for (const zone of Object.values(zones)) {
    const path = svg.querySelector(`#${CSS.escape(zone.id)}`);
    if (!path) {
      console.warn(`map.svg ไม่มีโซน ${zone.id}`);
      continue;
    }
    path.classList.add('map-zone');
    path.dataset.zoneId = zone.id;
    path.dataset.level = zone.level;
    zoneEls.set(zone.id, path);
    const box = path.getBBox();
    boxes.set(zone.id, box);
    centers.set(zone.id, visualCenter(path, box));
  }

  warnHiddenZones(svg, zoneEls);

  const handle = { svg, zoneEls, boxes, centers, container };
  buildOverlay(handle, zones);
  handle.panzoom = createPanZoom(container, svg);
  return handle;
}

// เตือนถ้ามีโซนที่ถูกโซนอื่นทับจนกดไม่ได้เลย — ถ้าเกิดขึ้นแปลว่า map.svg วาดซ้อนกัน
// โซนแบบนั้นผู้เล่นจะมองไม่เห็นและช่วยคนในนั้นไม่ได้ตลอดเกม
function warnHiddenZones(svg, zoneEls) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const hidden = [];

  for (const [zoneId, path] of zoneEls) {
    const box = path.getBBox();
    let reachable = false;
    for (let i = 0; i < 5 && !reachable; i += 1) {
      for (let j = 0; j < 5 && !reachable; j += 1) {
        const pt = svg.createSVGPoint();
        pt.x = box.x + (box.width * (i + 0.5)) / 5;
        pt.y = box.y + (box.height * (j + 0.5)) / 5;
        if (!path.isPointInFill?.(pt)) continue;
        const sp = pt.matrixTransform(ctm);
        if (document.elementFromPoint(sp.x, sp.y)?.closest?.('.map-zone') === path) reachable = true;
      }
    }
    if (!reachable) hidden.push(zoneId);
  }

  if (hidden.length) {
    console.warn(`⚠ map.svg: โซนเหล่านี้ถูกโซนอื่นวาดทับจนกดไม่ได้ — ${hidden.join(', ')}`);
  }
}

// ── เลเยอร์ทับบนโซน: ไอคอน จนท. · ไอคอนบัฟ · กากบาทตอนลาก (§11) ──
const SVG_NS = 'http://www.w3.org/2000/svg';
const OP_ICON = { human: 'assets/skills/Field-op-robertson-icon.png', cat: 'assets/skills/Field-op-Lyla-icon.png' };
// ไอคอนบัฟบนโซน — ไฟล์จริงจาก data/icons.js ถ้ามี ไม่งั้นใช้ emoji เดิม

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// ขนาดไอคอนบนโซน คิดเป็น "พิกเซลที่เห็นบนจอจริง" ไม่ใช่หน่วยใน SVG
// เพราะบนมือถือแผนที่ถูกย่อลงเหลือไม่ถึงครึ่ง ถ้าตั้งเป็นหน่วย SVG ตายตัว
// เครื่องจอเล็กจะได้ไอคอนจิ๋วจนมองไม่เห็น (เจ้าของเจอปัญหานี้)
const MARK_WANT_PX = 30; // ขนาดที่อยากได้
const MARK_MIN_PX = 19;  // เล็กกว่านี้มองไม่เห็น — ยอมให้ล้นขอบโซนแทน

function buildOverlay(handle, zones) {
  const layer = svgEl('g', { class: 'map-overlay' });
  handle.marks = new Map();

  // กี่พิกเซลบนจอ ต่อ 1 หน่วยใน viewBox (วัดตอนแผนที่วางเสร็จแล้ว)
  const scale = handle.svg.getScreenCTM()?.a;
  const unitsFor = (px) => (scale > 0 ? px / scale : px);

  for (const zone of Object.values(zones)) {
    const box = handle.boxes.get(zone.id);
    const center = handle.centers.get(zone.id);
    if (!box || !center) continue;
    const { x: cx, y: cy } = center;
    // พอดีโซนไว้ก่อน แต่ห้ามเล็กกว่าขั้นต่ำ ต่อให้ต้องล้นออกนอกโซน
    const fit = Math.min(box.width * 0.72, box.height * 0.8);
    const size = Math.max(unitsFor(MARK_MIN_PX), Math.min(unitsFor(MARK_WANT_PX), fit));

    // ⚡ เก็บแค่ "ตำแหน่งกับขนาด" ไว้ก่อน ยังไม่สร้างหมุดจริง
    //
    // เดิมสร้างหมุดครบทั้ง 47 โซนตั้งแต่เปิดแผนที่ = 282 โหนดใน SVG ที่มองไม่เห็น
    // ทั้งที่เกมมี จนท. ภาคสนามแค่ 2 คน จึงมีหมุดโผล่จริงพร้อมกันอย่างมาก 2-3 อัน
    // โหนดที่มองไม่เห็นก็ยังกินเวลาคำนวณสไตล์ทุกครั้งที่จอเปลี่ยน — บนมือถือรุ่นเล็กคือของแพง
    // ตอนนี้สร้างตอนโซนนั้น "ต้องใช้จริง" เท่านั้น (ดู ensureMarkNodes) และคืนทิ้งเมื่อไม่ใช้แล้ว
    handle.marks.set(zone.id, { nodes: null, layer, cx, cy, size });
  }

  handle.svg.appendChild(layer);
}

/** สร้างหมุดของโซนนี้ขึ้นมาจริง ๆ (เรียกตอนจะใช้เท่านั้น) */
function ensureMarkNodes(m) {
  if (m.nodes) return m.nodes;
  const { cx, cy, size } = m;

  // ไอคอน จนท. อยู่ "กลางโซน" พอดี · ไอคอนบัฟอยู่ใต้ไอคอน จนท.
  const g = svgEl('g', { class: 'zone-mark' });
  const halo = svgEl('circle', { class: 'zone-op-halo', cx, cy, r: size * 0.62 });
  const icon = svgEl('image', {
    class: 'zone-op', x: cx - size / 2, y: cy - size / 2, width: size, height: size,
    preserveAspectRatio: 'xMidYMid meet',
  });
  // เลขนับถอยหลังเกาะขอบขวาของไอคอน
  const timer = svgEl('text', {
    class: 'zone-timer', x: cx + size * 0.62, y: cy,
    'font-size': (size * 0.58).toFixed(1),
  });
  // ไอคอนบัฟเรียงกันใต้ไอคอน จนท. — เป็นกลุ่มเพราะแต่ละอันอาจเป็นรูปหรือ emoji
  const buffs = svgEl('g', { class: 'zone-buffs' });
  const cross = svgEl('text', { class: 'zone-cross', x: cx, y: cy, 'font-size': (size * 1.1).toFixed(1) });
  cross.textContent = '✕';

  g.append(halo, icon, timer, buffs, cross);
  m.layer.appendChild(g);
  m.nodes = { g, halo, icon, timer, buffs, cross };
  return m.nodes;
}

/** เอาหมุดออกจากจอเมื่อโซนนี้ไม่มีอะไรให้แสดงแล้ว — คืนโหนดให้เบราว์เซอร์ */
function releaseMarkNodes(m) {
  if (!m.nodes) return;
  m.nodes.g.remove();
  m.nodes = null;
}

// วาดไอคอน จนท. / บัฟ ใหม่ทั้งแมพ — เรียกทุกลูป
export function updateZoneMarkers(handle, state) {
  for (const zone of Object.values(state.zones)) {
    const m = handle.marks?.get(zone.id);
    if (!m) continue;

    const unit = zone.unit;
    const types = zone.buffs.map((b) => b.type);

    // โซนที่ไม่มีทั้ง จนท. และบัฟ ไม่มีอะไรให้วาด — ข้ามไปเลย ไม่ต้องสร้างโหนด
    // (กากบาทตอนลากมีทางของตัวเองใน setDragMarks)
    if (!unit && types.length === 0) {
      if (m.nodes && !m.nodes.cross.classList.contains('is-on')) releaseMarkNodes(m);
      else if (m.nodes) { m.nodes.icon.classList.remove('is-on'); m.nodes.halo.classList.remove('is-on'); }
      continue;
    }

    const n = ensureMarkNodes(m);
    n.icon.classList.toggle('is-on', !!unit);
    n.halo.classList.toggle('is-on', !!unit);
    if (unit) {
      const src = OP_ICON[unit];
      if (n.icon.dataset.src !== src) {
        n.icon.setAttribute('href', src);
        n.icon.dataset.src = src;
      }
      const loops = state.units[unit]?.busyRemainLoops ?? 0;
      // ⚠️ เขียนเฉพาะตอนค่าเปลี่ยนจริง (กฎรอบ 10.11) เขียนค่าเดิมทับก็ยังทำให้คำนวณผังใหม่
      const txt = (loops / 2).toFixed(1);
      if (n.timer.textContent !== txt) n.timer.textContent = txt;
    } else if (n.timer.textContent !== '') {
      n.timer.textContent = '';
    }

    const key = types.join(',');
    if (n.buffs.dataset.shown !== key) {
      n.buffs.dataset.shown = key;
      paintBuffIcons(m, n, types);
    }
  }
}

// วาดไอคอนบัฟใหม่ทั้งชุด — เรียกเฉพาะตอนชุดบัฟเปลี่ยน ไม่ได้เรียกทุกลูป
// m = ข้อมูลโซน (cx/cy/size) · n = โหนดจริงที่สร้างไว้แล้ว
function paintBuffIcons(m, n, types) {
  n.buffs.innerHTML = '';
  if (!types.length) return;

  const s = m.size * 0.8;                  // ขนาดไอคอนบัฟ 1 อัน
  const gap = s * 0.14;
  const total = types.length * s + (types.length - 1) * gap;
  let x = m.cx - total / 2;                // เรียงจากซ้าย ให้ทั้งแถวอยู่กลางโซน
  const y = m.cy + m.size * 0.86;

  for (const type of types) {
    const path = iconPath(type);
    if (path) {
      const img = svgEl('image', {
        class: 'zone-buff-img', href: path,
        x: x.toFixed(1), y: (y - s / 2).toFixed(1), width: s.toFixed(1), height: s.toFixed(1),
        preserveAspectRatio: 'xMidYMid meet',
      });
      n.buffs.appendChild(img);
    } else {
      const t = svgEl('text', {
        class: 'zone-buff-glyph', x: (x + s / 2).toFixed(1), y: y.toFixed(1),
        'font-size': s.toFixed(1),
      });
      t.textContent = iconEmoji(type);
      n.buffs.appendChild(t);
    }
    x += s + gap;
  }
}

// ข้อความลอยขึ้นเหนือโซนตอนรู้ผล (§11) — โผล่แล้วลอยขึ้นจางหายเอง
export function floatText(handle, zoneId, text, kind = 'ok') {
  const center = handle.centers?.get(zoneId);
  const box = handle.boxes?.get(zoneId);
  if (!center || !box) return;

  const size = Math.max(16, Math.min(34, box.width * 0.5, box.height * 0.6));
  const node = svgEl('text', {
    class: `zone-float zone-float--${kind}`,
    x: center.x, y: center.y, 'font-size': size.toFixed(1),
  });
  node.textContent = text;
  handle.svg.appendChild(node);
  setTimeout(() => node.remove(), 1400);
}

// ระบายสถานะตอนลากไอคอน (§10) — valid = โซนที่ลงได้, invalid = ขึ้นกากบาท
export function setDragMarks(handle, { active, invalidIds = null, hoverId = null } = {}) {
  handle.container.classList.toggle('is-dragging', !!active);
  for (const [zoneId, m] of handle.marks ?? []) {
    const bad = active && invalidIds?.has(zoneId);
    // สร้างกากบาทเฉพาะโซนที่ต้องขึ้นจริง — ไม่ต้องมีรออยู่ครบทั้ง 47 โซน
    if (bad) ensureMarkNodes(m).cross.classList.add('is-on');
    else if (m.nodes) m.nodes.cross.classList.remove('is-on');
    handle.zoneEls.get(zoneId)?.classList.toggle('is-invalid', !!bad);
    handle.zoneEls.get(zoneId)?.classList.toggle('is-target', active && zoneId === hoverId && !bad);
  }
}

// อัปเดตโซนเดียว — เรียกทุกลูปจากรอบที่ 3 เป็นต้นไป
export function updateZone(handle, zone) {
  const path = handle.zoneEls.get(zone.id);
  if (!path) return;
  path.dataset.level = zone.cleared ? 'green' : zone.level;
}

export function updateAllZones(handle, zones) {
  for (const zone of Object.values(zones)) updateZone(handle, zone);
}

// สีโซนตาม CONFIG (§5.2) — ฉีดเป็น CSS ครั้งเดียว เพื่อไม่ต้องเขียนสีซ้ำใน styles.css
const ZONE_COLOR_STYLE_ID = 'zone-colors';

export function applyZoneColors(root) {
  if (document.getElementById(ZONE_COLOR_STYLE_ID)) return; // ฉีดครั้งเดียวพอ
  const style = document.createElement('style');
  style.id = ZONE_COLOR_STYLE_ID;
  style.textContent = Object.entries(CONFIG.zoneColors)
    .map(([level, c]) => `.map-zone[data-level="${level}"] { fill: ${c.fill}; stroke: ${c.stroke}; }`)
    .join('\n');
  root.appendChild(style);
}

// ── ซูม/ปัด — มีผลเฉพาะแผนที่ ไม่กระทบ UI รอบนอก (§11) ─────────
const MIN_SCALE = 1;
const MAX_SCALE = 5;

// เผื่อ "ขอบ" ให้ปัดเลยขอบแผนที่ออกไปได้ — คิดเป็นสัดส่วนของช่องมองแผนที่
//
// เดิมล็อกไว้ไม่ให้เลยขอบเลย ผลคือโซนที่อยู่ริม ๆ ถูกดันไปติดขอบจอ
// จะดูให้ชัดหรือลากไอคอนลงต้องเล็งเอาแบบอึดอัด
// ตอนนี้ปัดเลยออกไปได้อีก 18% ของช่องมอง โซนริมจึงลากมาไว้กลางจอได้สบาย
// พื้นที่ที่โผล่มาคือแถบขอบสีอ่อน (ดู .map-viewport ใน styles.css)
const PAN_MARGIN = 0.18;

function createPanZoom(viewport, target) {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  const pointers = new Map();
  let pinchStart = null;

  function apply() {
    // จำกัดระยะปัด — บวกขอบเผื่อไว้ให้เลยขอบแผนที่ออกไปได้หน่อย
    // ⚠️ เผื่อเฉพาะตอนซูมเข้าเท่านั้น ตอนไม่ซูมต้องล็อกนิ่งสนิทเหมือนเดิม
    // ไม่งั้นแผนที่จะเลื่อนไปมาได้ทั้งที่ผู้เล่นไม่ได้ซูม ซึ่งกวนมากตอนลากไอคอน
    const rect = viewport.getBoundingClientRect();
    const edge = scale > MIN_SCALE ? PAN_MARGIN : 0;
    const maxX = (rect.width * (scale - 1)) / 2 + rect.width * edge;
    const maxY = (rect.height * (scale - 1)) / 2 + rect.height * edge;
    tx = Math.max(-maxX, Math.min(maxX, tx));
    ty = Math.max(-maxY, Math.min(maxY, ty));
    target.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    viewport.classList.toggle('is-zoomed', scale > 1);
  }

  // ซูมโดยตรึงจุด (cx, cy) ที่อยู่ในพิกัดจอให้อยู่กับที่
  function zoomAt(nextScale, cx, cy) {
    const rect = viewport.getBoundingClientRect();
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    const ox = cx - rect.left - rect.width / 2;
    const oy = cy - rect.top - rect.height / 2;
    const ratio = clamped / scale;
    tx = ox - (ox - tx) * ratio;
    ty = oy - (oy - ty) * ratio;
    scale = clamped;
    if (scale === MIN_SCALE) { tx = 0; ty = 0; }
    apply();
  }

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
  }, { passive: false });

  viewport.addEventListener('pointerdown', (e) => {
    viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinchStart = null;
  });

  viewport.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };

    if (pointers.size === 1) {
      if (scale > 1) { tx += now.x - prev.x; ty += now.y - prev.y; apply(); }
      pointers.set(e.pointerId, now);
      return;
    }

    // สองนิ้ว = หนีบซูม
    pointers.set(e.pointerId, now);
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (!pinchStart) {
      pinchStart = { dist, scale };
    } else if (pinchStart.dist > 0) {
      zoomAt(pinchStart.scale * (dist / pinchStart.dist), mid.x, mid.y);
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
  }
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  viewport.addEventListener('dblclick', () => { scale = 1; tx = 0; ty = 0; apply(); });

  apply();

  return {
    reset() { scale = 1; tx = 0; ty = 0; apply(); },
    zoomIn() { const r = viewport.getBoundingClientRect(); zoomAt(scale * 1.4, r.left + r.width / 2, r.top + r.height / 2); },
    zoomOut() { const r = viewport.getBoundingClientRect(); zoomAt(scale / 1.4, r.left + r.width / 2, r.top + r.height / 2); },
    get scale() { return scale; },
  };
}

export { VIEWBOX };
