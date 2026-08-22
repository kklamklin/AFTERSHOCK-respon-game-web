// แผนที่เมือง 48 โซน — ฝัง map.svg จริง (รอบที่ 2)
// อ้างอิง docs/GAMESCREEN_SPEC.md §11 การแสดงผลบนแผนที่
//
// ไฟล์นี้อยู่ใน ui/ จึงห้ามคำนวณกฎเกม — รับ object โซนจาก systems/ มาวาดอย่างเดียว
// id ของ path ใน map.svg (zone-gray-01 … zone-red-08) ตรงกับ id ที่ systems/zones.js สร้าง 1:1

import { CONFIG } from '../config.js';

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

// ใส่ตัวเลขคนติดอยู่ไว้กลางโซน — ขนาดตัวอักษรย่อตามขนาดโซน โซนเล็กจะได้ไม่ล้น
function placeLabel(svg, path, zone) {
  const box = path.getBBox();
  const size = Math.max(11, Math.min(26, box.width / 2.4, box.height / 1.5));

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('class', 'map-count');
  text.setAttribute('x', box.x + box.width / 2);
  text.setAttribute('y', box.y + box.height / 2);
  text.setAttribute('font-size', size.toFixed(1));
  text.dataset.zoneId = zone.id;
  text.textContent = String(Math.floor(zone.trapped));
  svg.appendChild(text);
  return text;
}

/**
 * วาดแผนที่ลงใน container
 * @returns handle สำหรับอัปเดตทีหลัง — { svg, zoneEls, countEls, panzoom }
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
  const countEls = new Map();
  const boxes = new Map();

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
    boxes.set(zone.id, path.getBBox());
    countEls.set(zone.id, placeLabel(svg, path, zone));
  }

  const handle = { svg, zoneEls, countEls, boxes, container };
  buildOverlay(handle, zones);
  handle.panzoom = createPanZoom(container, svg);
  return handle;
}

// ── เลเยอร์ทับบนโซน: ไอคอน จนท. · ไอคอนบัฟ · กากบาทตอนลาก (§11) ──
const SVG_NS = 'http://www.w3.org/2000/svg';
const OP_ICON = { human: 'assets/skills/Field-op-robertson-icon.png', cat: 'assets/skills/Field-op-Lyla-icon.png' };
const BUFF_GLYPH = { crowd: '👥', scan: '👁', alert: '⚠' };

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function buildOverlay(handle, zones) {
  const layer = svgEl('g', { class: 'map-overlay' });
  handle.marks = new Map();

  for (const zone of Object.values(zones)) {
    const box = handle.boxes.get(zone.id);
    if (!box) continue;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // ขนาดไอคอนย่อตามขนาดโซน โซนเล็กจะได้ไม่ล้นออกนอกกรอบมากนัก
    const size = Math.max(13, Math.min(28, box.width * 0.42, box.height * 0.5));
    const pad = 2;

    // แยกตำแหน่งกันคนละมุม ไม่งั้นในโซนเล็กจะทับกันจนอ่านไม่ออก:
    //   เลขคนติดอยู่ = กลางโซน (วาดไว้แล้วใน placeLabel)
    //   ไอคอน จนท. + เวลาที่เหลือ = มุมบนซ้าย
    //   ไอคอนบัฟ = มุมบนขวา
    const g = svgEl('g', { class: 'zone-mark' });
    const halo = svgEl('circle', {
      class: 'zone-op-halo', cx: box.x + pad + size / 2, cy: box.y + pad + size / 2, r: size * 0.56,
    });
    const icon = svgEl('image', {
      class: 'zone-op', x: box.x + pad, y: box.y + pad, width: size, height: size,
      preserveAspectRatio: 'xMidYMid meet',
    });
    const timer = svgEl('text', {
      class: 'zone-timer', x: box.x + pad + size + 2, y: box.y + pad + size * 0.6,
      'font-size': (size * 0.55).toFixed(1),
    });
    const buffs = svgEl('text', {
      class: 'zone-buffs', x: box.x + box.width - pad, y: box.y + pad + size * 0.42,
      'font-size': (size * 0.6).toFixed(1),
    });
    const cross = svgEl('text', { class: 'zone-cross', x: cx, y: cy, 'font-size': (size * 1.1).toFixed(1) });
    cross.textContent = '✕';

    g.append(halo, icon, timer, buffs, cross);
    layer.appendChild(g);
    handle.marks.set(zone.id, { g, halo, icon, timer, buffs, cross });
  }

  handle.svg.appendChild(layer);
}

// วาดไอคอน จนท. / บัฟ ใหม่ทั้งแมพ — เรียกทุกลูป
export function updateZoneMarkers(handle, state) {
  for (const zone of Object.values(state.zones)) {
    const m = handle.marks?.get(zone.id);
    if (!m) continue;

    const unit = zone.unit;
    m.icon.classList.toggle('is-on', !!unit);
    m.halo.classList.toggle('is-on', !!unit);
    if (unit) {
      const src = OP_ICON[unit];
      if (m.icon.dataset.src !== src) {
        m.icon.setAttribute('href', src);
        m.icon.dataset.src = src;
      }
      const loops = state.units[unit]?.busyRemainLoops ?? 0;
      m.timer.textContent = (loops / 2).toFixed(1);
    } else {
      m.timer.textContent = '';
    }

    const glyphs = zone.buffs.map((b) => BUFF_GLYPH[b.type] ?? '').join('');
    if (m.buffs.textContent !== glyphs) m.buffs.textContent = glyphs;
  }
}

// ระบายสถานะตอนลากไอคอน (§10) — valid = โซนที่ลงได้, invalid = ขึ้นกากบาท
export function setDragMarks(handle, { active, invalidIds = null, hoverId = null } = {}) {
  handle.container.classList.toggle('is-dragging', !!active);
  for (const [zoneId, m] of handle.marks ?? []) {
    const bad = active && invalidIds?.has(zoneId);
    m.cross.classList.toggle('is-on', !!bad);
    handle.zoneEls.get(zoneId)?.classList.toggle('is-invalid', !!bad);
    handle.zoneEls.get(zoneId)?.classList.toggle('is-target', active && zoneId === hoverId && !bad);
  }
}

// อัปเดตโซนเดียว — เรียกทุกลูปจากรอบที่ 3 เป็นต้นไป
export function updateZone(handle, zone) {
  const path = handle.zoneEls.get(zone.id);
  const count = handle.countEls.get(zone.id);
  if (!path || !count) return;
  path.dataset.level = zone.cleared ? 'green' : zone.level;
  count.textContent = zone.cleared ? '' : String(Math.floor(zone.trapped));
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

function createPanZoom(viewport, target) {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  const pointers = new Map();
  let pinchStart = null;

  function apply() {
    // จำกัดไม่ให้ลากจนเห็นพื้นที่ว่างนอกแผนที่
    const rect = viewport.getBoundingClientRect();
    const maxX = (rect.width * (scale - 1)) / 2;
    const maxY = (rect.height * (scale - 1)) / 2;
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
