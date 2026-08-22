// หน้าจอเกมหลัก
// อ้างอิง docs/GAMESCREEN_SPEC.md §1 ผังหน้าจอ · §2 ปุ่มเวลา · §3 สกิล · §9 กล่องล่าง · §12 สถานะ
//
// ต่อกับ state จริงแล้ว: เวลา · AP · เลขคนบนโซน · กล่องสรุป Ⓐ/Ⓑ/Ⓒ
// ยังเป็นค่าหลอก: Detail Feed · สถานะบาดเจ็บ · ไอคอน Air Deploy (รอรอบ 5-8)
// ไฟล์นี้อยู่ใน ui/ จึงห้ามคำนวณกฎเกม — เรียก systems/ มาคำนวณแล้วเอาผลมาแสดงเท่านั้น

import { OPERATORS } from '../data/operators.js';
import { state, resetState } from '../state.js';
import { CONFIG } from '../config.js';
import { createClock, tickLoop } from '../systems/time.js';
import { summarizeByTier } from '../systems/zones.js';
import { renderMap, applyZoneColors, updateAllZones, updateZone } from './map.js';

const PORTRAIT_DIR = 'assets/characters/';
const SKILL_DIR = 'assets/skills/';

const TIER_LETTER = { gray: 'A', yellow: 'B', red: 'C' };

const PLACEHOLDER = {
  // ยังเป็นค่าหลอกจนกว่าจะถึงรอบที่ 5-8 (บัฟ / ผลลัพธ์ / สถานะบาดเจ็บ)
  airDeployOn: false,
  feed: [],
  // สถานะ จนท. — null = ปกติ (§12)
  // รอบนี้ใส่ Robertson บาดเจ็บไว้ 1 ตัว เพื่อให้เห็นหน้าตาป้ายสถานะ + สไปรต์ที่สลับไป
  // ตอนเล่นจริงเกมเริ่มด้วยทุกคนปกติ (รอบที่ 8 จะต่อกับ state จริง)
  status: {
    human: { kind: 'injured', label: 'Warning\nINJURED :', hours: 0.57 },
    cat:   null,
    elf:   null,
    spirit: null,
  },
};

// สไปรต์ที่ใช้ตามสถานะ (§12) — ชื่อไฟล์ทั้งหมดมาจาก operators.js ที่เดียว
function portraitFor(op, status) {
  return op.portraits[status?.kind ?? 'normal'] ?? op.portraits.normal;
}

// ค่า AP ที่โชว์ข้างไอคอนสกิล (§3.1) — ดึงจาก operators.js ที่เดียว ห้ามพิมพ์เลขซ้ำที่นี่
const TIER_ORDER = ['gray', 'yellow', 'red'];
const TIER_LABEL = { gray: 'เทา', yellow: 'เหลือง', red: 'แดง' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// ── แถบบน (§1.1) ────────────────────────────────────────────────
function buildTopBar(data, handlers) {
  const bar = el('div', 'game-top');

  const left = el('div', 'game-top-left');
  const menuBtn = el('button', 'game-menu-btn');
  menuBtn.setAttribute('aria-label', 'เมนู');
  for (let i = 0; i < 3; i += 1) menuBtn.appendChild(el('span', 'game-menu-bar'));
  menuBtn.addEventListener('click', () => handlers.onMenu?.());
  const ap = el('div', 'game-ap');
  ap.append(el('span', 'game-ap-label', 'AP :'), el('span', 'game-ap-value', '0'));
  left.append(menuBtn, ap);

  const center = el('div', 'game-top-center');
  const timeBtn = el('button', 'game-time', 'Time : 0 Hr');
  timeBtn.addEventListener('click', () => handlers.onTime?.());
  center.appendChild(timeBtn);

  const right = el('div', 'game-top-right');
  const heli = el('div', 'game-air', '🚁');
  heli.title = 'Air Deploy กำลังมีผลทั้งแมพ';
  heli.hidden = !data.airDeployOn;

  // ปุ่มเวลา 2 ปุ่ม (§2)
  const speedBox = el('div', 'game-speed');
  const runBtn = el('button', 'spd-btn spd-run');
  const rateBtn = el('button', 'spd-btn spd-rate');
  speedBox.append(runBtn, rateBtn);
  right.append(heli, speedBox);

  bar.append(left, center, right);

  function paintSpeed() {
    runBtn.textContent = state.running ? '⏸' : '▶';
    runBtn.title = state.running ? 'หยุดเวลา' : 'เดินเวลาต่อ';
    // ปุ่มความเร็วค้างเลขเดิมไว้เสมอ แม้ตอนหยุด (§2)
    rateBtn.textContent = state.speed === 2 ? '2️⃣' : '1️⃣';
    rateBtn.title = state.speed === 2 ? 'ความเร็ว 2 เท่า' : 'ความเร็วปกติ';
    bar.classList.toggle('is-paused', !state.running);
  }
  runBtn.addEventListener('click', () => handlers.onRunToggle?.());
  rateBtn.addEventListener('click', () => handlers.onRateToggle?.());

  const apValue = ap.querySelector('.game-ap-value');
  return {
    bar,
    paintSpeed,
    paintHud() {
      apValue.textContent = String(Math.floor(state.ap));
      timeBtn.textContent = `Time : ${state.hour} Hr`;
      heli.hidden = !(data.airDeployOn || state.globalBuffs.some((b) => b.type === 'air'));
    },
  };
}

// ── แถบ จนท. ซ้าย/ขวา (§1.2, §3, §12) ───────────────────────────
function buildCost(text, tier) {
  const cost = el('span', 'skill-cost');
  cost.appendChild(el('b', null, text));
  if (tier) {
    const ring = el('i', `cost-ring cost-ring--${tier}`);
    ring.title = `โซน${TIER_LABEL[tier]}`;
    cost.appendChild(ring);
  } else {
    cost.appendChild(el('small', null, 'all'));
  }
  return cost;
}

function buildSkillRow(speciesKey, skillId, skill) {
  const row = el('div', 'skill-row');
  row.dataset.op = speciesKey;
  row.dataset.skill = skillId;

  row.appendChild(el('div', 'skill-label', skill.name));

  const iconWrap = el('div', 'skill-icon-wrap');
  // 📥 = ลงพื้นที่ (จนท. ติดคูลดาวน์) · ✨ = บัฟ (§3.1)
  iconWrap.appendChild(el('div', 'skill-badge', skill.type === 'field' ? '📥' : '✨'));
  const icon = el('div', 'skill-icon');
  const img = el('img');
  img.src = SKILL_DIR + skill.icon;
  img.alt = skill.name;
  icon.append(img, el('span', 'skill-using', 'USING'));
  iconWrap.appendChild(icon);
  row.appendChild(iconWrap);

  const costs = el('div', 'skill-costs');
  if (skill.type === 'field') {
    for (const tier of TIER_ORDER) {
      const z = skill.zones[tier];
      if (z) costs.appendChild(buildCost(`−${z.ap}`, tier));
    }
  } else {
    costs.appendChild(buildCost(`−${skill.ap}`, null));
  }
  row.appendChild(costs);

  return row;
}

function buildOperator(speciesKey, status) {
  const op = OPERATORS[speciesKey];
  const block = el('div', 'op-block');
  block.dataset.op = speciesKey;

  const head = el('div', 'op-head');

  const card = el('div', 'op-card');
  const frame = el('div', 'op-portrait');
  const img = el('img');
  img.src = PORTRAIT_DIR + portraitFor(op, status);
  img.alt = op.name;
  frame.appendChild(img);
  card.append(frame, el('div', 'op-name', op.name));

  // ป้ายสถานะข้างรูป (§12) — รอบนี้ยังเป็นค่าหลอก
  const statusEl = el('div', 'op-status');
  statusEl.hidden = !status;
  if (status) {
    statusEl.classList.add(`op-status--${status.kind}`);
    statusEl.append(el('div', 'op-status-label', status.label)); // ขึ้นบรรทัดใหม่ด้วย \n (CSS pre-line)
    statusEl.append(el('div', 'op-status-time', status.hours.toFixed(2)));
  }

  head.append(card, statusEl);
  block.appendChild(head);

  const skills = el('div', 'op-skills');
  for (const [skillId, skill] of Object.entries(op.skills)) {
    skills.appendChild(buildSkillRow(speciesKey, skillId, skill));
  }
  block.appendChild(skills);

  return block;
}

function buildSide(side, title, keys, status) {
  const aside = el('aside', `game-side game-side--${side}`);
  aside.appendChild(el('h2', 'side-title', title));
  for (const key of keys) aside.appendChild(buildOperator(key, status[key]));
  return aside;
}

// ── กล่องสรุปล่างสุด (§9.1) ──────────────────────────────────────
const STAT_ROWS = [
  { key: 'casualty', label: 'Casualty' },
  { key: 'clear', label: 'Clear' },
  { key: 'population', label: 'Zone Population' },
];

function buildBottom() {
  const box = el('div', 'game-bottom');
  const summary = el('div', 'stat-summary');
  const valueEls = {};

  for (const tier of TIER_ORDER) {
    const col = el('div', 'stat-col');
    col.appendChild(el('div', `stat-badge stat-badge--${tier}`, TIER_LETTER[tier]));
    const rows = el('div', 'stat-rows');
    valueEls[tier] = {};
    for (const { key, label } of STAT_ROWS) {
      const row = el('div', 'stat-row');
      const value = el('span', 'stat-value', '0%');
      row.append(el('span', 'stat-label', label), value);
      valueEls[tier][key] = value;
      rows.appendChild(row);
    }
    col.appendChild(rows);
    summary.appendChild(col);
  }
  box.appendChild(summary);

  return {
    box,
    paint() {
      const tiers = summarizeByTier(state.zones); // คำนวณใน systems/ ที่นี่แค่เอามาแสดง
      for (const tier of TIER_ORDER) {
        for (const { key } of STAT_ROWS) valueEls[tier][key].textContent = `${tiers[tier][key]}%`;
      }
    },
  };
}

// ── Detail Feed มุมขวาบน (§8) ───────────────────────────────────
function buildFeed(entries) {
  const feed = el('div', 'game-feed');
  for (const e of entries) {
    const card = el('div', `feed-card feed-card--${e.ok ? 'ok' : 'fail'}`);
    card.append(
      el('div', 'feed-head', `${e.ok ? '🟢' : '🔴'} ${e.zone} ${e.ok ? 'สำเร็จ' : 'ไม่สำเร็จ'}`),
      el('div', 'feed-body', e.text),
    );
    feed.appendChild(card);
  }
  return feed;
}

// ── ปุ่มซูมแผนที่ (§11 ซูมเฉพาะแผนที่ UI รอบนอกไม่ขยับ) ─────────
let zoomHandle = null;

function buildZoomButtons() {
  const box = el('div', 'map-zoom');
  const mk = (label, title, fn) => {
    const b = el('button', 'map-zoom-btn', label);
    b.title = title;
    b.addEventListener('click', () => zoomHandle?.[fn]());
    return b;
  };
  box.append(
    mk('+', 'ซูมเข้า', 'zoomIn'),
    mk('−', 'ซูมออก', 'zoomOut'),
    mk('⌖', 'กลับมุมมองเต็มแผนที่', 'reset'),
  );
  return box;
}

// ── ประกอบทั้งหน้า ──────────────────────────────────────────────
// นาฬิกาของหน้าจอที่กำลังเปิดอยู่ — เก็บไว้ระดับโมดูลเพื่อให้หยุดได้ตอนออกจากหน้าเกม
// ไม่งั้น interval จะค้างเดินอยู่เบื้องหลังแม้ผู้เล่นกลับไปหน้าเมนูแล้ว
let activeClock = null;

export function stopGameClock() {
  activeClock?.stop();
  activeClock = null;
}

export function renderGameScreen(root, { onExit } = {}) {
  stopGameClock();
  resetState(); // เริ่มเกมใหม่ทุกครั้งที่เข้าหน้านี้ (สุ่มผู้รอด 1,200 คนใหม่)

  const data = structuredClone(PLACEHOLDER);

  root.innerHTML = '';
  root.className = 'screen-overlay screen--game';

  const top = buildTopBar(data, {
    // ชั่วคราว: ☰ พากลับเมนูหลักไปก่อน เพื่อให้ทดสอบ flow ได้ไม่ตัน
    // รอบที่ 9 จะเปลี่ยนเป็นแผงเมนูในเกมจริง (Continue / Setting / How to play / Operator / Return to menu)
    onMenu: () => { stopGameClock(); onExit?.(); },
    onTime: () => {}, // รอบที่ 9 — หน้าเวลาที่เหลือ
    onRunToggle: () => { clock.setSpeed(state.running ? 0 : state.speed); top.paintSpeed(); },
    onRateToggle: () => {
      const next = state.speed === 2 ? 1 : 2;
      if (state.running) clock.setSpeed(next); else state.speed = next;
      top.paintSpeed();
    },
  });
  root.appendChild(top.bar);

  const body = el('div', 'game-body');
  body.appendChild(buildSide('left', 'Field Operator', ['human', 'cat'], data.status));

  const mapWrap = el('div', 'game-map-wrap');
  const mapBox = el('div', 'game-map');
  const mapViewport = el('div', 'map-viewport');
  mapViewport.appendChild(el('div', 'game-map-note', 'กำลังโหลดแผนที่…'));
  mapBox.appendChild(mapViewport);
  mapBox.appendChild(buildZoomButtons());
  // Feed ลอยอยู่มุมขวาบนของแผนที่ (§8) — วางไว้ในกรอบแผนที่เพื่อไม่ให้บังแถบ จนท. ฝั่งขวา
  mapBox.appendChild(buildFeed(data.feed));
  mapWrap.appendChild(mapBox);
  body.appendChild(mapWrap);

  body.appendChild(buildSide('right', 'Baseplace', ['elf', 'spirit'], data.status));
  root.appendChild(body);

  const bottom = buildBottom();
  root.appendChild(bottom.box);

  // ── เดินเวลา (§2 · AFTERSHOCKMASTER §17) ────────────────────────
  let mapHandle = null;

  function paintAll() {
    top.paintHud();
    bottom.paint();
    if (mapHandle) updateAllZones(mapHandle, state.zones);
  }

  function tick() {
    tickLoop(state, {
      onZoneCleared: (zone) => { if (mapHandle) updateZone(mapHandle, zone); },
      onGameEnd: () => {
        stopGameClock();
        top.paintSpeed();
        // รอบที่ 10 จะเปลี่ยนตรงนี้เป็นการไปหน้า Result
      },
    });
    paintAll();
  }

  const clock = createClock(state, tick);
  activeClock = clock;

  // แผนที่จริงโหลดแบบ async (fetch map.svg) — เวลาเริ่มเดินหลังแผนที่พร้อม
  applyZoneColors(document.head);
  renderMap(mapViewport, state.zones)
    .then((handle) => {
      mapHandle = handle;
      zoomHandle = handle.panzoom;
      paintAll();
      if (activeClock === clock) { clock.setSpeed(CONFIG.startSpeed); top.paintSpeed(); }
    })
    .catch((err) => {
      mapViewport.innerHTML = '';
      mapViewport.appendChild(el('div', 'game-map-note', `โหลดแผนที่ไม่สำเร็จ: ${err.message}`));
    });

  paintAll();
  top.paintSpeed();
}
