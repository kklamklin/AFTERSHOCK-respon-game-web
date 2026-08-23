// หน้าจอเกมหลัก
// อ้างอิง docs/GAMESCREEN_SPEC.md §1 ผังหน้าจอ · §2 ปุ่มเวลา · §3 สกิล · §9 กล่องล่าง · §12 สถานะ
//
// ต่อกับ state จริงแล้ว: เวลา · AP · เลขคนบนโซน · กล่องสรุป Ⓐ/Ⓑ/Ⓒ
// ยังเป็นค่าหลอก: สถานะบาดเจ็บของ จนท. (รอรอบที่ 8)
// ไฟล์นี้อยู่ใน ui/ จึงห้ามคำนวณกฎเกม — เรียก systems/ มาคำนวณแล้วเอาผลมาแสดงเท่านั้น

import { OPERATORS } from '../data/operators.js';
import { state, resetState } from '../state.js';
import { CONFIG } from '../config.js';
import { createClock, tickLoop } from '../systems/time.js';
import { summarizeByTier } from '../systems/zones.js';
import { skillStatus, unitStatusLabel, useGlobalSkill } from '../systems/skills.js';
import { resolveMission } from '../systems/outcomes.js';
import { OPERATORS as OPS_FOR_STATUS } from '../data/operators.js';
import { createFeed } from './feed.js';
import { attachDrag, cancelDrag } from './dragdrop.js';
import { buildZoneDetail } from './panels.js';
import { renderMap, applyZoneColors, updateAllZones, updateZone, updateZoneMarkers, floatText } from './map.js';
import { createGameMenu } from './gameMenu.js';

const PORTRAIT_DIR = 'assets/characters/';
const SKILL_DIR = 'assets/skills/';

const TIER_LETTER = { gray: 'A', yellow: 'B', red: 'C' };

const PLACEHOLDER = {
  airDeployOn: false, // 🚁 บนแถบบนอ่านจาก state.globalBuffs จริงแล้ว ค่านี้เป็นตัวบังคับเปิดตอน dev
};

// สไปรต์ที่ใช้ตามสถานะ (§12) — ชื่อไฟล์ทั้งหมดมาจาก operators.js ที่เดียว
function portraitFor(op, statusKind) {
  return op.portraits[statusKind ?? 'normal'] ?? op.portraits.normal;
}

// ลูปที่เหลือ → ชั่วโมงทศนิยม 2 ตำแหน่ง (§12) · frac = ความคืบหน้าภายในลูปปัจจุบัน 0..1
function loopsToHours(loops, frac = 0) {
  return Math.max(0, (loops - frac) / CONFIG.loopsPerHour).toFixed(2);
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
  const cd = el('span', 'skill-cd');          // ตัวเลขคูลดาวน์ที่เหลือ
  const block = el('span', 'skill-block', '✕'); // กากบาทตอนใช้ไม่ได้
  icon.append(img, el('span', 'skill-using', 'USING'), cd, block);
  iconWrap.appendChild(icon);

  // Air Deploy บัฟทั้งแมพ → กดใช้เลย ไม่ต้องลาก (§3.1) · ที่เหลือลากไปวางบนโซน (§10)
  if (CONFIG.buffs[skillId]?.scope === 'global') {
    icon.classList.add('is-clickable');
    icon.addEventListener('click', () => {
      const done = useGlobalSkill(state, speciesKey, skillId);
      if (done) dragCtx.onChange?.(done, null);
    });
  } else {
    attachDrag(icon, speciesKey, skillId, dragCtx);
  }

  // แถวจุดบอกช่อง Scan Area ที่เหลือ (เฉพาะ Lia — §3.4)
  const dots = el('div', 'skill-stacks');
  iconWrap.appendChild(dots);

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

  // ทาสีใหม่ตามสถานะปัจจุบัน — เรียกทุกลูป
  function paint() {
    const st = skillStatus(state, speciesKey, skillId);
    row.classList.toggle('is-using', st.using);
    // ติดคูลดาวน์ให้โชว์ "ตัวเลขที่เหลือ" แทนกากบาท เพราะตัวเลขบอกเหตุผลได้ในตัวอยู่แล้ว
    row.classList.toggle('is-cooldown', st.reason === 'cooldown');
    row.classList.toggle('is-blocked', !st.usable && !st.using && st.reason !== 'cooldown');
    row.classList.toggle('is-noap', st.reason === 'no-ap');
    // คูลดาวน์นับเป็นครึ่งชั่วโมง ทศนิยมตำแหน่งเดียวจึงพอดีและไม่ล้นวงกลม
    cd.textContent = st.cooldownLoops > 0
      ? (st.cooldownLoops / CONFIG.loopsPerHour).toFixed(1)
      : '';

    if (st.maxStacks != null) {
      if (dots.childElementCount !== st.maxStacks) {
        dots.innerHTML = '';
        for (let i = 0; i < st.maxStacks; i += 1) dots.appendChild(el('i', 'stack-dot'));
      }
      [...dots.children].forEach((d, i) => d.classList.toggle('is-on', i < st.stacks));
      dots.title = `เหลือ ${st.stacks}/${st.maxStacks} ช่อง`;
    }
  }

  return { row, paint };
}

function buildOperator(speciesKey) {
  const op = OPERATORS[speciesKey];
  const block = el('div', 'op-block');
  block.dataset.op = speciesKey;

  const head = el('div', 'op-head');

  const card = el('div', 'op-card');
  const frame = el('div', 'op-portrait');
  const img = el('img');
  img.alt = op.name;
  frame.appendChild(img);
  card.append(frame, el('div', 'op-name', op.name));

  // ป้ายสถานะข้างรูป (§12)
  const statusEl = el('div', 'op-status');
  const statusLabel = el('div', 'op-status-label');
  const statusTime = el('div', 'op-status-time');
  statusEl.append(statusLabel, statusTime);

  head.append(card, statusEl);
  block.appendChild(head);

  const skills = el('div', 'op-skills');
  const skillRows = [];
  for (const [skillId, skill] of Object.entries(op.skills)) {
    const built = buildSkillRow(speciesKey, skillId, skill);
    skillRows.push(built);
    skills.appendChild(built.row);
  }
  block.appendChild(skills);

  let shownSprite = null;
  let shownKind = null;

  function paint(frac) {
    const st = unitStatusLabel(state, speciesKey);

    // สไปรต์เปลี่ยนตามสถานะ — ตั้ง src ใหม่เฉพาะตอนเปลี่ยนจริง ไม่งั้นรูปจะกะพริบทุกลูป
    const sprite = portraitFor(op, st?.kind);
    if (sprite !== shownSprite) {
      img.src = PORTRAIT_DIR + sprite;
      shownSprite = sprite;
    }

    statusEl.hidden = !st;
    if (st) {
      if (st.kind !== shownKind) {
        statusEl.className = `op-status op-status--${st.kind}`;
        statusLabel.textContent = st.label;
        shownKind = st.kind;
      }
      statusTime.textContent = loopsToHours(st.loops, frac);
    } else {
      shownKind = null;
    }

    for (const r of skillRows) r.paint();
  }

  return { block, paint };
}

function buildSide(side, title, keys) {
  const aside = el('aside', `game-side game-side--${side}`);
  aside.appendChild(el('h2', 'side-title', title));
  const ops = keys.map((key) => {
    const built = buildOperator(key);
    aside.appendChild(built.block);
    return built;
  });
  return { aside, paint: (frac) => ops.forEach((o) => o.paint(frac)) };
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
  const detail = buildZoneDetail();
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
  box.append(summary, detail.box);

  return {
    box,
    // สลับระหว่าง "สรุป Ⓐ/Ⓑ/Ⓒ" กับ "รายละเอียดโซนที่กำลังลากอยู่เหนือ" (§9)
    showZone(zoneId, opKey, skillId) {
      // ไม่ซ่อนกล่องสรุป — ปล่อยให้อยู่ในผังเหมือนเดิม แล้วให้แผงลอยมาทับ
      // ความสูงกล่องล่างจะได้คงที่ แผนที่ไม่ขยับระหว่างลาก
      if (zoneId && opKey) detail.show(state, zoneId, opKey, skillId);
      else detail.hide();
    },
    paint() {
      const tiers = summarizeByTier(state.zones); // คำนวณใน systems/ ที่นี่แค่เอามาแสดง
      for (const tier of TIER_ORDER) {
        for (const { key } of STAT_ROWS) valueEls[tier][key].textContent = `${tiers[tier][key]}%`;
      }
    },
  };
}

// สะพานระหว่างไอคอนสกิลกับหน้าเกม — renderGameScreen เติมค่าจริงให้ตอนสร้างหน้า
// ประกาศไว้ตรงนี้เพราะ buildSkillRow ถูกเรียกก่อนที่นาฬิกาจะถูกสร้าง
const dragCtx = {
  state,
  getMapHandle: () => null,
  pause: () => {},
  resume: () => {},
  onChange: () => {},
  onHoverZone: () => {},
};

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
let cancelSmooth = null;
let activeMenu = null;

export function stopGameClock() {
  cancelDrag();
  activeClock?.stop();
  activeClock = null;
  cancelSmooth?.();
  cancelSmooth = null;
  activeMenu?.destroy();
  activeMenu = null;
}

export function renderGameScreen(root, { onExit, onFinish } = {}) {
  stopGameClock();
  resetState(); // เริ่มเกมใหม่ทุกครั้งที่เข้าหน้านี้ (สุ่มผู้รอด 1,200 คนใหม่)

  const data = structuredClone(PLACEHOLDER);

  root.innerHTML = '';
  root.className = 'screen-overlay screen--game';

  // ประกาศไว้ก่อน เพราะปุ่มบนแถบบนอ้างถึงมัน แต่ตัวมันต้องสร้างหลังนาฬิกา
  let menu = null;

  const top = buildTopBar(data, {
    // ☰ และ Time หยุดเวลาอัตโนมัติ แล้วปิดค่อยเดินต่อ (§2.1) — จัดการอยู่ใน gameMenu.js
    onMenu: () => menu.openMenu(),
    onTime: () => menu.openTime(state),
    // วาดซ้ำ 1 ครั้งตอนกด เพราะลูปวาดสด ๆ ทำงานเฉพาะตอนเวลาเดิน
    // ถ้าไม่วาด เลขนับถอยหลังจะค้างที่เฟรมก่อนกดหยุด
    onRunToggle: () => { clock.setRunning(!state.running); top.paintSpeed(); paintLive(); },
    onRateToggle: () => { clock.setRate(state.speed === 2 ? 1 : 2); top.paintSpeed(); paintLive(); },
  });
  root.appendChild(top.bar);

  const body = el('div', 'game-body');
  const leftSide = buildSide('left', 'Field Operator', ['human', 'cat']);
  body.appendChild(leftSide.aside);

  const mapWrap = el('div', 'game-map-wrap');
  const mapBox = el('div', 'game-map');
  const mapViewport = el('div', 'map-viewport');
  mapViewport.appendChild(el('div', 'game-map-note', 'กำลังโหลดแผนที่…'));
  mapBox.appendChild(mapViewport);
  mapBox.appendChild(buildZoomButtons());
  // Feed ลอยอยู่มุมขวาบนของแผนที่ (§8) — วางไว้ในกรอบแผนที่เพื่อไม่ให้บังแถบ จนท. ฝั่งขวา
  const feed = createFeed();
  mapBox.appendChild(feed.box);
  mapWrap.appendChild(mapBox);
  body.appendChild(mapWrap);

  const rightSide = buildSide('right', 'Baseplace', ['elf', 'spirit']);
  body.appendChild(rightSide.aside);
  root.appendChild(body);

  const bottom = buildBottom();
  root.appendChild(bottom.box);

  // แถบเตือน CRITICAL — Field ล้มทั้งคู่ นับถอยหลัง 3 ชม. (§13)
  const critical = el('div', 'game-critical');
  critical.hidden = true;
  critical.append(el('div', 'crit-title', '⚠ CRITICAL'),
                  el('div', 'crit-sub', 'เจ้าหน้าที่ภาคสนามหมดสติทั้งคู่'),
                  el('div', 'crit-time'));
  root.appendChild(critical);

  function paintCritical() {
    const loops = state.criticalCountdownLoops;
    critical.hidden = loops == null;
    if (loops != null) critical.querySelector('.crit-time').textContent = `${loopsToHours(loops, loopFraction())} ชม.`;
  }

  // ── เดินเวลา (§2 · AFTERSHOCKMASTER §17) ────────────────────────
  let mapHandle = null;

  // "เศษของลูป" ให้ตัวเลขนับถอยหลังไหลลื่น (§12 แสดงทศนิยม 2 ตำแหน่ง)
  // เจ้าของค่านี้คือนาฬิกาใน systems/time.js — ตอนหยุดเวลามันจะแช่ค่าไว้ที่เดิม
  // ไม่ให้เลขเด้งขึ้นตอนหยุดหรือกระโดดลงตอนกดเดินต่อ
  function loopFraction() {
    return activeClock?.fraction() ?? 0;
  }

  // ส่วนที่วาดใหม่ได้ถี่ ๆ ระหว่างลูป — แถบ จนท. กับ AP
  // (AP ต้องอยู่ในนี้ด้วย ไม่งั้นตอนหักแต้มจากการใช้สกิลในรอบที่ 5 เลขจะค้างจนกว่าจะถึงลูปถัดไป)
  function paintLive() {
    const frac = loopFraction();
    top.paintHud();
    leftSide.paint(frac);
    rightSide.paint(frac);
    if (state.criticalCountdownLoops != null) paintCritical();
  }

  function paintAll() {
    bottom.paint();
    paintLive();
    paintCritical();
    if (mapHandle) {
      updateAllZones(mapHandle, state.zones);
      updateZoneMarkers(mapHandle, state);
    }
  }

  function tick() {
    tickLoop(state, {
      // ครบชั่วโมงสำคัญ → เด้งป๊อปอัพและหยุดเวลาให้ผู้เล่นทบทวนแผน (§2.1)
      onHourTick: (hour) => menu?.checkHour(hour, state),
      onZoneCleared: (zone) => { if (mapHandle) updateZone(mapHandle, zone); },
      onMissionComplete: (opKey) => {
        // §4.2 ทอย 2 ชั้น → อัปเดตโซน/คะแนน → โชว์ผลบนแมพและใน Feed
        const outcome = resolveMission(state, opKey);
        if (!outcome) return;
        feed.push(outcome);
        if (mapHandle) {
          const zone = state.zones[outcome.zoneId];
          if (zone) updateZone(mapHandle, zone);
          if (outcome.kind === 'success') floatText(mapHandle, outcome.zoneId, `+${outcome.saved}`, 'ok');
          else if (outcome.kind === 'fail') floatText(mapHandle, outcome.zoneId, '✕', 'fail');
          else floatText(mapHandle, outcome.zoneId, '—', 'late');
        }
      },
      // ฟื้นตัว / หมดเวลา Last Stand — แจ้งใน Feed ให้ผู้เล่นรู้
      onStatusChange: ({ opKey, from, to }) => {
        const name = OPS_FOR_STATUS[opKey].name;
        if (from === 'laststand') feed.pushNote(`⚡ ${name} หมดแรง — หมดสติ`, 'hurt');
        else if (to === 'normal') feed.pushNote(`💚 ${name} กลับมาพร้อมปฏิบัติงาน`, 'ok');
      },
      onCritical: (kind) => {
        paintCritical();
        if (kind === 'start') feed.pushNote('⚠ CRITICAL — ภาคสนามหมดสติทั้งคู่', 'hurt');
        if (kind === 'cancel') feed.pushNote('💚 พ้นภาวะ CRITICAL แล้ว', 'ok');
      },
      // จบเกมทุกทาง (หมดเวลา · ช่วยครบ · CRITICAL) ไปหน้า Result เหมือนกัน (§13)
      // state.endReason ถูกตั้งไว้แล้วใน systems/time.js หน้า Result อ่านเอาเอง
      onGameEnd: () => {
        stopGameClock();
        top.paintSpeed();
        paintCritical();
        onFinish?.();
      },
    });
    paintAll();
  }

  // ตัวเลขนับถอยหลังข้างรูป จนท. เดินระหว่างลูปด้วย ไม่กระตุกทีละครึ่งชั่วโมง
  let rafId = null;
  function smoothLoop() {
    rafId = requestAnimationFrame(smoothLoop);
    if (state.running && !state.ended) paintLive();
  }
  smoothLoop();
  cancelSmooth = () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; };

  const clock = createClock(state, tick);
  activeClock = clock;

  // เมนู ☰ · หน้าเวลา · ป๊อปอัพหยุดเวลาอัตโนมัติ (§6 · §7 · §2.1)
  // มันเป็นคนคุมการหยุด/เดินเวลาของตัวเอง จำได้ว่าก่อนเปิดเวลาเดินอยู่ไหม
  menu = createGameMenu(root, {
    pause: () => { clock.setRunning(false); top.paintSpeed(); paintLive(); },
    resume: () => { clock.setRunning(true); top.paintSpeed(); },
    isRunning: () => state.running,
    quitToMenu: () => { stopGameClock(); onExit?.(); },
  });
  activeMenu = menu;

  // ต่อสายให้ตัวลากวาง: หยุด/เดินเวลา · หาแผนที่ · วาดใหม่หลังวางเสร็จ
  dragCtx.getMapHandle = () => mapHandle;
  dragCtx.pause = () => clock.setRunning(false);
  dragCtx.resume = () => clock.setRunning(true);
  dragCtx.onChange = () => { bottom.showZone(null); paintAll(); top.paintSpeed(); };
  dragCtx.onHoverZone = (zoneId, opKey, skillId) => bottom.showZone(zoneId, opKey, skillId);

  // แผนที่จริงโหลดแบบ async (fetch map.svg) — เวลาเริ่มเดินหลังแผนที่พร้อม
  applyZoneColors(document.head);
  renderMap(mapViewport, state.zones)
    .then((handle) => {
      mapHandle = handle;
      zoomHandle = handle.panzoom;
      paintAll();
      if (activeClock === clock) { clock.setRate(CONFIG.startSpeed); clock.setRunning(true); top.paintSpeed(); }
    })
    .catch((err) => {
      mapViewport.innerHTML = '';
      mapViewport.appendChild(el('div', 'game-map-note', `โหลดแผนที่ไม่สำเร็จ: ${err.message}`));
    });

  paintAll();
  top.paintSpeed();
}
