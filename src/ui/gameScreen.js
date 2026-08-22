// หน้าจอเกมหลัก — โครง Layout (รอบที่ 1)
// อ้างอิง docs/GAMESCREEN_SPEC.md §1 ผังหน้าจอ · §2 ปุ่มเวลา · §3 สกิล · §9 กล่องล่าง · §12 สถานะ
//
// รอบนี้ทำ "โครงที่มองเห็น" อย่างเดียว — ตัวเลขทั้งหมดเป็นค่าหลอกจาก PLACEHOLDER ด้านล่าง
// ยังไม่ผูกกับ state.js / ยังไม่มีแผนที่จริง / ยังลากไม่ได้ (รอบ 2-5 ค่อยต่อ)
// ไฟล์นี้อยู่ใน ui/ จึงห้ามคำนวณกฎเกม — รับค่ามาแสดงอย่างเดียว

import { OPERATORS } from '../data/operators.js';

const PORTRAIT_DIR = 'assets/characters/';
const SKILL_DIR = 'assets/skills/';

// ค่าหลอกสำหรับรอบนี้ — ตรงกับตัวเลขในดราฟลายมือ เพื่อให้เทียบรูปกันได้ตรง ๆ
// รอบที่ 3 จะเปลี่ยนไปอ่านจาก state.js แทนทั้งก้อน
const PLACEHOLDER = {
  ap: 45,
  hour: 23,
  speed: 1,        // 1 = ปกติ · 2 = เร็ว
  running: true,   // true = เวลาเดินอยู่
  airDeployOn: true,
  tiers: {
    gray:   { letter: 'A', casualty: 33, clear: 67, population: 45 },
    yellow: { letter: 'B', casualty: 45, clear: 23, population: 66 },
    red:    { letter: 'C', casualty: 83, clear: 45, population: 7 },
  },
  feed: [
    { ok: true,  zone: 'GRAY-12', text: 'ช่วยได้ 8 คน (91%)' },
    { ok: false, zone: 'RED-03',  text: '🩹 Lyla บาดเจ็บ' },
  ],
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
  ap.append(el('span', 'game-ap-label', 'AP :'), el('span', 'game-ap-value', String(data.ap)));
  left.append(menuBtn, ap);

  const center = el('div', 'game-top-center');
  const timeBtn = el('button', 'game-time', `Time : ${data.hour} Hr`);
  timeBtn.addEventListener('click', () => handlers.onTime?.());
  center.appendChild(timeBtn);

  const right = el('div', 'game-top-right');
  const heli = el('div', 'game-air', '🚁');
  heli.title = 'Air Deploy กำลังมีผลทั้งแมพ';
  heli.hidden = !data.airDeployOn;

  // ปุ่มเวลา 2 ปุ่ม (§2) — รอบนี้สลับหน้าตาอย่างเดียว ยังไม่ได้ผูกกับนาฬิกาจริง
  const speedBox = el('div', 'game-speed');
  const runBtn = el('button', 'spd-btn spd-run');
  const rateBtn = el('button', 'spd-btn spd-rate');
  speedBox.append(runBtn, rateBtn);
  right.append(heli, speedBox);

  bar.append(left, center, right);

  function paintSpeed() {
    runBtn.textContent = data.running ? '⏸' : '▶';
    runBtn.title = data.running ? 'หยุดเวลา' : 'เดินเวลาต่อ';
    // ปุ่มความเร็วค้างเลขเดิมไว้เสมอ แม้ตอนหยุด (§2)
    rateBtn.textContent = data.speed === 2 ? '2️⃣' : '1️⃣';
    rateBtn.title = data.speed === 2 ? 'ความเร็ว 2 เท่า' : 'ความเร็วปกติ';
    bar.classList.toggle('is-paused', !data.running);
  }
  runBtn.addEventListener('click', () => {
    data.running = !data.running;
    paintSpeed();
    handlers.onSpeedChange?.(data.running ? data.speed : 0);
  });
  rateBtn.addEventListener('click', () => {
    data.speed = data.speed === 2 ? 1 : 2;
    paintSpeed();
    if (data.running) handlers.onSpeedChange?.(data.speed);
  });
  paintSpeed();

  return { bar, apValue: ap.querySelector('.game-ap-value'), timeBtn, heli };
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

function buildBottom(tiers) {
  const box = el('div', 'game-bottom');
  const summary = el('div', 'stat-summary');
  for (const tier of TIER_ORDER) {
    const t = tiers[tier];
    const col = el('div', 'stat-col');
    col.appendChild(el('div', `stat-badge stat-badge--${tier}`, t.letter));
    const rows = el('div', 'stat-rows');
    for (const { key, label } of STAT_ROWS) {
      const row = el('div', 'stat-row');
      row.append(el('span', 'stat-label', label), el('span', 'stat-value', `${t[key]}%`));
      rows.appendChild(row);
    }
    col.appendChild(rows);
    summary.appendChild(col);
  }
  box.appendChild(summary);
  return box;
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

// ── ประกอบทั้งหน้า ──────────────────────────────────────────────
export function renderGameScreen(root, { onExit } = {}) {
  const data = structuredClone(PLACEHOLDER);

  root.innerHTML = '';
  root.className = 'screen-overlay screen--game';

  const { bar } = buildTopBar(data, {
    // ชั่วคราวสำหรับรอบนี้: ☰ พากลับเมนูหลักไปก่อน เพื่อให้ทดสอบ flow ได้ไม่ตัน
    // รอบที่ 9 จะเปลี่ยนเป็นแผงเมนูในเกมจริง (Continue / Setting / How to play / Operator / Return to menu)
    onMenu: () => onExit?.(),
    onTime: () => {},          // รอบที่ 9 — หน้าเวลาที่เหลือ
    onSpeedChange: () => {},   // รอบที่ 3 — ต่อกับนาฬิกาจริง
  });
  root.appendChild(bar);

  const body = el('div', 'game-body');
  body.appendChild(buildSide('left', 'Field Operator', ['human', 'cat'], data.status));

  const mapWrap = el('div', 'game-map-wrap');
  const mapBox = el('div', 'game-map');
  mapBox.appendChild(el('div', 'game-map-note', 'แผนที่ 48 โซน — รอบที่ 2'));
  // Feed ลอยอยู่มุมขวาบนของแผนที่ (§8) — วางไว้ในกรอบแผนที่เพื่อไม่ให้บังแถบ จนท. ฝั่งขวา
  mapBox.appendChild(buildFeed(data.feed));
  mapWrap.appendChild(mapBox);
  body.appendChild(mapWrap);

  body.appendChild(buildSide('right', 'Baseplace', ['elf', 'spirit'], data.status));
  root.appendChild(body);

  root.appendChild(buildBottom(data.tiers));
}
