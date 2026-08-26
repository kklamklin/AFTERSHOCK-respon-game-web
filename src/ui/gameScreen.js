// หน้าจอเกมหลัก
// อ้างอิง docs/GAMESCREEN_SPEC.md §1 ผังหน้าจอ · §2 ปุ่มเวลา · §3 สกิล · §9 กล่องล่าง · §12 สถานะ
//
// ต่อกับ state จริงแล้ว: เวลา · AP · เลขคนบนโซน · กล่องสรุป Ⓐ/Ⓑ/Ⓒ
// ยังเป็นค่าหลอก: สถานะบาดเจ็บของ จนท. (รอรอบที่ 8)
// ไฟล์นี้อยู่ใน ui/ จึงห้ามคำนวณกฎเกม — เรียก systems/ มาคำนวณแล้วเอาผลมาแสดงเท่านั้น

import { OPERATORS } from '../data/operators.js';
import { state, resetState } from '../state.js';
import { CONFIG } from '../config.js';
import { createClock, tickLoop, loopDurationMs } from '../systems/time.js';
import { summarizeByTier } from '../systems/zones.js';
import { skillStatus, unitStatusLabel, useGlobalSkill, unitReadiness, isLastStand } from '../systems/skills.js';
import { resolveMission } from '../systems/outcomes.js';
import { resolveLastStandQte } from '../systems/status.js';
import { runLastStandQte } from './qte.js';
import { OPERATORS as OPS_FOR_STATUS } from '../data/operators.js';
import { createFeed } from './feed.js';
import { attachDrag, cancelDrag, selectSkillByKey, activeSelection } from './dragdrop.js';
import { buildZoneDetail } from './panels.js';
import { renderMap, applyZoneColors, updateAllZones, updateZone, updateZoneMarkers, floatText } from './map.js';
import { createGameMenu } from './gameMenu.js';
import { iconNode, iconPath, iconEmoji } from '../data/icons.js';
import { setAlertFrame, clearFx, fireSkillIcon, showLastStand } from './fx.js';
import { setBgm, setBgmPaused, seekBgm, bgmPosition } from './audio.js';

// เล่นอนิเมชั่นสั้น ๆ ซ้ำได้ — ถอดคลาสแล้ว reflow ก่อนใส่ใหม่ ไม่งั้นครั้งที่ 2 จะไม่เริ่ม
function pulse(node, cls, ms) {
  if (!node) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  setTimeout(() => node.classList.remove(cls), ms);
}

const PORTRAIT_DIR = 'assets/characters/';
const SKILL_DIR = 'assets/skills/';

const TIER_LETTER = { gray: 'A', yellow: 'B', red: 'C' };

// ป้ายบนแถบ % ของการ์ด จนท. — ค่าตัวเลขมาจาก systems/skills.js unitReadiness()
const READY_TEXT = {
  ready:     'พร้อมปฏิบัติงาน',
  working:   'กำลังปฏิบัติงาน',
  injured:   'กำลังรักษาตัว',
  lost:      'หมดสติ — รอฟื้น',
  laststand: 'ยืนหยัดครั้งสุดท้าย',
};

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
  const heli = el('div', 'game-air');
  heli.appendChild(iconNode('air', 'air-glyph', 'Air Deploy กำลังมีผลทั้งแมพ'));
  heli.hidden = !data.airDeployOn;

  // ปุ่มเวลา 2 ปุ่ม (§2) — หน้าตาเหมือนเดิม แต่เป็นไฟล์ vector ถ้ามี ไม่งั้นใช้ emoji
  const speedBox = el('div', 'game-speed');
  const runBtn = el('button', 'spd-btn spd-run');
  const rateBtn = el('button', 'spd-btn spd-rate');
  const setBtnIcon = (btn, key, label) => {
    btn.innerHTML = '';
    btn.appendChild(iconNode(key, 'spd-glyph', label));
    btn.title = label;
  };
  speedBox.append(runBtn, rateBtn);
  right.append(heli, speedBox);

  bar.append(left, center, right);

  let shownRun = null, shownRate = null;
  function paintSpeed() {
    const runKey = state.running ? 'pause' : 'play';
    if (runKey !== shownRun) {
      setBtnIcon(runBtn, runKey, state.running ? 'หยุดเวลา' : 'เดินเวลาต่อ');
      shownRun = runKey;
    }
    // ปุ่มความเร็วค้างเลขเดิมไว้เสมอ แม้ตอนหยุด (§2)
    const rateKey = state.speed === 2 ? 'speed2' : 'speed1';
    if (rateKey !== shownRate) {
      setBtnIcon(rateBtn, rateKey, state.speed === 2 ? 'ความเร็ว 2 เท่า' : 'ความเร็วปกติ');
      shownRate = rateKey;
    }
    bar.classList.toggle('is-paused', !state.running);
  }
  runBtn.addEventListener('click', () => handlers.onRunToggle?.());
  rateBtn.addEventListener('click', () => handlers.onRateToggle?.());

  const apValue = ap.querySelector('.game-ap-value');
  let shownAp = null;
  let shownHour = null;
  return {
    bar,
    paintSpeed,
    paintHud() {
      // เด้งตัวเลขเฉพาะตอนค่าเปลี่ยนจริง — paintHud ถูกเรียกทุกเฟรมจาก rAF
      const apNow = Math.floor(state.ap);
      if (apNow !== shownAp) {
        apValue.textContent = String(apNow);
        if (shownAp != null) pulse(apValue, 'is-bump', 340);
        shownAp = apNow;
      }
      if (state.hour !== shownHour) {
        timeBtn.textContent = `Time : ${state.hour} Hr`;
        if (shownHour != null) pulse(timeBtn, 'is-bump', 500);
        shownHour = state.hour;
      }
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
  // ป้ายบอกประเภท: ลงพื้นที่ (จนท. ติดคูลดาวน์) หรือ บัฟ (§3.1)
  const badge = el('div', 'skill-badge');
  badge.appendChild(iconNode(skill.type === 'field' ? 'skillField' : 'skillBuff', 'badge-glyph',
    skill.type === 'field' ? 'สกิลลงพื้นที่' : 'สกิลบัฟ'));
  iconWrap.appendChild(badge);

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
      if (done) { fireSkillIcon(icon); dragCtx.onChange?.(done, null); }
    });
  } else {
    attachDrag(icon, speciesKey, skillId, dragCtx);
  }

  // แถวจุดบอกช่อง Scan Area ที่เหลือ (เฉพาะ Lia — §3.4)
  const dots = el('div', 'skill-stacks');
  iconWrap.appendChild(dots);

  row.appendChild(iconWrap);

  const costs = el('div', 'skill-costs');
  const costChips = [];
  if (skill.type === 'field') {
    for (const tier of TIER_ORDER) {
      const z = skill.zones[tier];
      if (z) costChips.push(buildCost(`−${z.ap}`, tier));
    }
  } else {
    costChips.push(buildCost(`−${skill.ap}`, null));
  }
  costs.append(...costChips);
  row.appendChild(costs);

  // ตอน Last Stand สกิลลงพื้นที่ฟรีทุกโซน — ป้ายราคาต้องบอกว่า FREE ไม่ใช่โชว์เลขเดิม
  // (เกมหักแต้ม 0 อยู่แล้วตั้งแต่แรก ที่ผิดคือหน้าจอโชว์ราคาเก่าค้างไว้)
  const freeTag = el('span', 'skill-cost skill-cost--free');
  freeTag.appendChild(el('b', null, 'FREE'));
  freeTag.appendChild(el('small', null, 'all'));

  // ทาสีใหม่ตามสถานะปัจจุบัน — เรียกทุกลูป
  let shownCd = null;
  let shownFree = null;
  function paint() {
    const st = skillStatus(state, speciesKey, skillId);

    if (skill.type === 'field') {
      const free = isLastStand(state, speciesKey);
      if (free !== shownFree) {
        costs.replaceChildren(...(free ? [freeTag] : costChips));
        shownFree = free;
      }
    }
    row.classList.toggle('is-using', st.using);
    // ติดคูลดาวน์ให้โชว์ "ตัวเลขที่เหลือ" แทนกากบาท เพราะตัวเลขบอกเหตุผลได้ในตัวอยู่แล้ว
    row.classList.toggle('is-cooldown', st.reason === 'cooldown');
    row.classList.toggle('is-blocked', !st.usable && !st.using && st.reason !== 'cooldown');
    row.classList.toggle('is-noap', st.reason === 'no-ap');
    // คูลดาวน์นับเป็นครึ่งชั่วโมง ทศนิยมตำแหน่งเดียวจึงพอดีและไม่ล้นวงกลม
    // เขียนเฉพาะตอนเลขเปลี่ยนจริง (เหตุผลเดียวกับแถบ% ด้านล่าง — เรียกถี่มาก)
    const cdText = st.cooldownLoops > 0
      ? (st.cooldownLoops / CONFIG.loopsPerHour).toFixed(1)
      : '';
    if (cdText !== shownCd) { cd.textContent = cdText; shownCd = cdText; }

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

  // การ์ดวางเป็นแนวนอน: [รูป+ชื่อ] | [แถบ% + สกิล]
  // จงใจไม่วางซ้อนกันเป็นแนวตั้ง เพราะการ์ดจะสูงจนคอลัมน์ล้นบนมือถือจอยาว
  // (ดูหมายเหตุ "ขนาดนิ้วกด" ที่ .screen--game ใน styles.css)
  const card = el('div', 'op-card');
  const frame = el('div', 'op-portrait');
  const img = el('img');
  img.alt = op.name;
  frame.appendChild(img);

  // ป้ายสถานะ — วางทับบนรูป ไม่ให้กินความสูงเพิ่มตอนโผล่ (§12)
  const statusEl = el('div', 'op-status');
  const statusLabel = el('div', 'op-status-label');
  const statusTime = el('div', 'op-status-time');
  statusEl.append(statusLabel, statusTime);
  frame.appendChild(statusEl);

  card.append(frame, el('div', 'op-name', op.name));
  block.appendChild(card);

  const main = el('div', 'op-main');
  block.appendChild(main);

  // แถบความพร้อม — หัวใจของลุค "หน้าจอสั่งการ" (§12)
  // ตัวเลขคิดที่ systems/skills.js ที่นี่แค่วาด
  const gauge = el('div', 'op-gauge');
  const gaugeHead = el('div', 'op-gauge-head');
  const gaugeLabel = el('span', 'op-gauge-label');
  const gaugePct = el('span', 'op-gauge-pct');
  gaugeHead.append(gaugeLabel, gaugePct);
  const gaugeTrack = el('div', 'op-gauge-track');
  const gaugeFill = el('i', 'op-gauge-fill');
  gaugeTrack.appendChild(gaugeFill);
  gauge.append(gaugeHead, gaugeTrack);
  main.appendChild(gauge);

  const skills = el('div', 'op-skills');
  const skillRows = [];
  for (const [skillId, skill] of Object.entries(op.skills)) {
    const built = buildSkillRow(speciesKey, skillId, skill);
    skillRows.push(built);
    skills.appendChild(built.row);
  }
  main.appendChild(skills);

  let shownSprite = null;
  let shownKind = null;
  let shownReady = null;
  let shownPct = null;
  let shownTime = null;

  function paint(frac) {
    const st = unitStatusLabel(state, speciesKey);

    // แถบความพร้อม — เปลี่ยน class เฉพาะตอนสถานะเปลี่ยนจริง ไม่งั้นสีจะกะพริบทุกเฟรม
    const rd = unitReadiness(state, speciesKey, frac);
    if (rd.kind !== shownReady) {
      gauge.className = `op-gauge op-gauge--${rd.kind}`;
      gaugeLabel.textContent = READY_TEXT[rd.kind] ?? '';
      shownReady = rd.kind;
    }
    // ⚠️ เขียนลงหน้าเว็บเฉพาะตอนเลข "เปลี่ยนจริง" เท่านั้น
    // ฟังก์ชันนี้ถูกเรียกถี่มาก การสั่งเขียนค่าเดิมซ้ำก็ยังทำให้เบราว์เซอร์
    // ต้องคำนวณผังหน้าใหม่ทั้งหน้า — เดิมจึงคำนวณผังใหม่ทุกเฟรมโดยไม่จำเป็น
    // (%ปัดเป็นจำนวนเต็มอยู่แล้ว ปัดความกว้างแถบตามให้ตรงกัน ตาเปล่าไม่เห็นต่าง)
    const pct = Math.round(rd.pct);
    if (pct !== shownPct) {
      gaugePct.textContent = `${pct}%`;
      gaugeFill.style.width = `${pct}%`;
      shownPct = pct;
    }

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
      const t = loopsToHours(st.loops, frac);
      if (t !== shownTime) { statusTime.textContent = t; shownTime = t; }
    } else {
      shownKind = null;
      shownTime = null;
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
      const row = el('div', `stat-row stat-row--${key}`);
      const value = el('span', 'stat-value', '0%');
      // แถบเล็ก ๆ ให้เห็นค่าคร่าว ๆ โดยไม่ต้องอ่านเลข (§9.1)
      const meter = el('div', 'stat-meter');
      const meterFill = el('i');
      meter.appendChild(meterFill);
      row.append(el('span', 'stat-label', label), meter, value);
      valueEls[tier][key] = { value, meterFill };
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
        for (const { key } of STAT_ROWS) {
          const pct = tiers[tier][key];
          valueEls[tier][key].value.textContent = `${pct}%`;
          valueEls[tier][key].meterFill.style.width = `${pct}%`;
        }
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
let activeQte = null;   // มินิเกมต่อเวลา Last Stand ที่เปิดค้างอยู่ (ถ้ามี)
let detachKeys = null;  // ถอดคีย์ลัดตอนออกจากหน้าเกม

export function stopGameClock() {
  cancelDrag();
  activeQte?.destroy();   // ออกจากหน้าเกมกลางคัน มินิเกมต้องไม่ค้างอยู่
  activeQte = null;
  detachKeys?.();
  detachKeys = null;
  activeClock?.stop();
  activeClock = null;
  cancelSmooth?.();
  cancelSmooth = null;
  activeMenu?.destroy();
  activeMenu = null;
  clearFx();    // กรอบเตือนไม่ควรค้างตามไปโผล่ที่หน้าเมนู/หน้า Result
  setBgm(null); // ออกจากหน้าเกมเมื่อไหร่ เพลงต้องเงียบทันที ไม่ตามไปหน้าอื่น
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
    onRunToggle: () => { clock.setRunning(!state.running); top.paintSpeed(); paintLive(); syncGameBgm(); },
    onRateToggle: () => { clock.setRate(state.speed === 2 ? 1 : 2); top.paintSpeed(); paintLive(); syncGameBgm(); },
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
  // กรอบกะพริบรอบจอตามสถานะแย่ที่สุดของ จนท. ตอนนี้ (§12 · §13)
  // เหลือง = มีคนบาดเจ็บ · แดง = มีคนหมดสติ/Last Stand หรืออยู่ในภาวะ CRITICAL
  function paintAlertFrame() {
    let level = null;
    for (const opKey of Object.keys(state.units)) {
      const st = unitStatusLabel(state, opKey);
      if (!st) continue;
      if (st.kind === 'injured') level ??= 'warn';
      else level = 'danger'; // lost / laststand ทับ warn เสมอ
    }
    if (state.criticalCountdownLoops != null) level = 'danger';
    setAlertFrame(level);
  }

  // ── เพลงประจำหน้าเกม ─────────────────────────────────────────
  // ช่วงปกติเล่น London Bridge · เหลือ 12 ชั่วโมงสุดท้ายสลับเป็นเพลงเร่ง
  // ทั้งคู่วนซ้ำเองจนกว่าจะหมดช่วงของตัวเอง (ตั้ง loop ไว้ที่ data/sounds.js)
  //
  // setBgm() ไม่เริ่มเพลงใหม่ถ้าเป็นเพลงเดิม เรียกทุกลูปได้ไม่มีปัญหา
  // และเพลงต้อง "หยุดตามเวลา" ด้วย — จุดนี้เคยพลาดมาแล้ว เพลงเล่นต่อทั้งที่กดหยุดเกม
  // ตอนนี้จึงเรียกจากที่เดียวกับที่เดินเวลา และเจ้าของสถานะเพลงมีคนเดียวคือ ui/audio.js
  // ตอนลากไอคอน เวลาหยุดก็จริง แต่ "เพลงต้องเล่นต่อ" (เจ้าของสั่ง)
  // เพราะการลากคือช่วงที่ผู้เล่นกำลังคิดอยู่ในเกม ไม่ใช่ช่วงที่พักจากเกม
  // ต่างจากการกดปุ่มหยุด/เปิดเมนู ☰/เข้า Settings ซึ่งต้องหยุดเพลงด้วย
  let bgmKeepPlaying = false;

  function syncGameBgm() {
    if (state.ended) return; // stopGameClock() สั่ง setBgm(null) ให้แล้ว
    const hoursLeft = CONFIG.totalLoops / CONFIG.loopsPerHour - state.hour;
    // ระหว่าง Last Stand ยึดเพลงหลัก (London Bridge) ไว้เสมอ ไม่สลับเป็นเพลงเร่ง
    // เพราะจังหวะของ QTE ถูกวางให้ตรงกับท่อนหนึ่งของเพลงนี้ (ดู cueBgmForQte)
    const inLastStand = Object.keys(state.units).some((k) => state.units[k].status === 'laststand');
    setBgm(!inLastStand && hoursLeft <= CONFIG.bgmFinalHours ? 'gameFinal' : 'gameMain');
    setBgmPaused(!state.running && !bgmKeepPlaying);
  }

  // ── เพลงตอน Last Stand: กะให้ถึงท่อนที่ต้องการพอดีตอน QTE เปิด (§5) ──
  //
  // QTE เปิดตอนเวลา Last Stand หมด = อีก durationHours ชั่วโมงในเกมข้างหน้า
  // แปลงเป็นเวลาจริงด้วยความเร็วนาฬิกาปัจจุบัน แล้ว "กรอเพลงถอยหลัง" ไปตั้งต้น
  // เพลงจึงไหลไปถึงวินาที CONFIG.qte.bgmCueSec เองพอดีโดยไม่ต้องตัดกลางเพลง
  //
  // ถ้าผู้เล่นเปลี่ยนความเร็วหรือหยุดเวลาระหว่างนั้นจะคลาดไปบ้าง — ตอน QTE เปิดจริง
  // จึงเช็คอีกครั้ง แล้วค่อยกรอแก้เฉพาะตอนคลาดเกิน 2 วินาที (คลาดนิดหน่อยไม่ต้องแตะ)
  function cueBgmForQte() {
    const realMs = CONFIG.lastStand.durationHours * CONFIG.loopsPerHour * loopDurationMs(state);
    seekBgm('gameMain', CONFIG.qte.bgmCueSec - realMs / 1000);
  }

  function alignBgmToCue() {
    if (Math.abs(bgmPosition() - CONFIG.qte.bgmCueSec) > 2) seekBgm('gameMain', CONFIG.qte.bgmCueSec);
  }

  // ── มินิเกมต่อเวลา Last Stand ────────────────────────────────
  // เวลาในเกมหยุด แต่เพลงเล่นต่อ (เหมือนตอนลากไอคอน) เพราะจังหวะของมินิเกมอิงเพลง
  function openQte(opKey, roundIndex) {
    if (activeQte) return;
    const wasRunning = state.running;
    bgmKeepPlaying = true;
    clock.setRunning(false);
    top.paintSpeed();
    syncGameBgm();
    // จับเพลงให้ตรงท่อนเฉพาะรอบแรก — รอบ 2/3 มาทีหลังอีกหลายชั่วโมงในเกม
    // ถ้าไปกรอทุกรอบเพลงจะกระโดดถอยหลังกลับมาที่เดิมทุกครั้ง
    if (roundIndex === 0) alignBgmToCue();

    // ต่อเวลาสะสมจากรอบก่อน ๆ (เอาไว้โชว์ยอดรวมบนจอมินิเกม)
    const soFar = CONFIG.qte.rounds.slice(0, roundIndex).reduce((s, r) => s + r.hours, 0);

    activeQte = runLastStandQte(root, roundIndex, soFar, (hoursGained) => {
      activeQte = null;
      const ev = resolveLastStandQte(state, opKey, hoursGained);
      const name = OPS_FOR_STATUS[opKey].name;
      if (hoursGained > 0) feed.pushNote(`${name} ยืนหยัดต่อได้อีก ${hoursGained} ชม.`, 'ok', 'recovered');
      else if (ev) feed.pushNote(`${name} หมดแรง — หมดสติ`, 'hurt', 'laststand');
      bgmKeepPlaying = false;
      paintAll();
      if (wasRunning) clock.setRunning(true);
      top.paintSpeed();
      syncGameBgm();
    });
  }

  function paintLive() {
    const frac = loopFraction();
    top.paintHud();
    leftSide.paint(frac);
    rightSide.paint(frac);
    paintAlertFrame();
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
        // Robertson ลุกขึ้นสู้ครั้งสุดท้าย — ประกาศกลางจอ + สลับเป็นเพลงประจำสถานะทันที
        // ไม่รอลูปถัดไป เพราะช่วงเวลานี้สั้นและเป็นจุดพีคของเกม (§5)
        if (outcome.danger?.to === 'laststand') {
          showLastStand({
            title: 'LAST STAND',
            sub: `${OPS_FOR_STATUS[opKey].name.toUpperCase()} · ${CONFIG.lastStand.durationHours} HOURS`,
            note: 'ทุกสกิลไม่คิด AP · ลงพื้นที่ได้ทุกโซน · เร็วขึ้นเท่าตัว',
          });
          syncGameBgm();
          cueBgmForQte();
        }
      },
      // ฟื้นตัว / หมดเวลา Last Stand — แจ้งใน Feed ให้ผู้เล่นรู้
      onStatusChange: ({ opKey, from, to, round }) => {
        const name = OPS_FOR_STATUS[opKey].name;
        // เวลา Last Stand หมด → ยังไม่ล้ม เปิดมินิเกมต่อเวลาก่อน (systems/status.js เป็นคนบอก)
        // เปิดทีละรอบ ทุกครั้งที่เวลาที่ต่อมารอบก่อนหมดลง
        if (to === 'qte') { openQte(opKey, round ?? 0); return; }
        if (from === 'laststand') feed.pushNote(`${name} หมดแรง — หมดสติ`, 'hurt', 'laststand');
        else if (to === 'normal') feed.pushNote(`${name} กลับมาพร้อมปฏิบัติงาน`, 'ok', 'recovered');
      },
      onCritical: (kind) => {
        paintCritical();
        if (kind === 'start') feed.pushNote('CRITICAL — ภาคสนามหมดสติทั้งคู่', 'hurt', 'lost');
        if (kind === 'cancel') feed.pushNote('พ้นภาวะ CRITICAL แล้ว', 'ok', 'recovered');
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
    syncGameBgm(); // เช็คทุกลูปว่าถึงเวลาสลับเพลงหรือยัง
    paintAll();
  }

  // ตัวเลขนับถอยหลังข้างรูป จนท. เดินระหว่างลูปด้วย ไม่กระตุกทีละครึ่งชั่วโมง
  //
  // ⚠️ วาดสูงสุด 30 ครั้ง/วินาที พอ — ไม่ต้อง 60
  // ตัวเลขที่ไหลจริง ๆ มีแค่ทศนิยม 2 ตำแหน่งของชั่วโมง ซึ่งเปลี่ยนราว 20 ครั้ง/วินาที
  // วาดถี่กว่านั้นคือทำงานทิ้งเปล่า ๆ และบนมือถือคือส่วนที่ทำให้เกมหนืดที่สุด
  const LIVE_MS = 33;
  let rafId = null;
  let lastLive = 0;
  function smoothLoop(now = 0) {
    rafId = requestAnimationFrame(smoothLoop);
    if (!state.running || state.ended) return;
    if (now && now - lastLive < LIVE_MS) return; // รอบแรก now = 0 → วาดเลย
    lastLive = now;
    paintLive();
  }
  smoothLoop();
  cancelSmooth = () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; };

  const clock = createClock(state, tick);
  activeClock = clock;

  // เมนู ☰ · หน้าเวลา · ป๊อปอัพหยุดเวลาอัตโนมัติ (§6 · §7 · §2.1)
  // มันเป็นคนคุมการหยุด/เดินเวลาของตัวเอง จำได้ว่าก่อนเปิดเวลาเดินอยู่ไหม
  menu = createGameMenu(root, {
    pause: () => { clock.setRunning(false); top.paintSpeed(); paintLive(); syncGameBgm(); },
    resume: () => { clock.setRunning(true); top.paintSpeed(); syncGameBgm(); },
    isRunning: () => state.running,
    quitToMenu: () => { stopGameClock(); onExit?.(); },
  });
  activeMenu = menu;

  // ต่อสายให้ตัวลากวาง: หยุด/เดินเวลา · หาแผนที่ · วาดใหม่หลังวางเสร็จ
  dragCtx.getMapHandle = () => mapHandle;
  // ⚠️ ให้เพลงเล่นต่อเฉพาะกรณีที่ "ก่อนลาก เวลาเดินอยู่" เท่านั้น
  // ถ้าผู้เล่นกดหยุดเกมไว้ก่อนแล้วค่อยลาก เพลงต้องเงียบอยู่เหมือนเดิม
  // (ตอนนั้น dragdrop.js จะไม่เรียก resume ตอนปล่อยด้วย ธงจึงต้องไม่ถูกยกขึ้นตั้งแต่แรก)
  dragCtx.pause = () => {
    bgmKeepPlaying = state.running;
    clock.setRunning(false);
    syncGameBgm();
  };
  dragCtx.resume = () => {
    bgmKeepPlaying = false;
    clock.setRunning(true);
    syncGameBgm();
  };
  dragCtx.onChange = () => { bottom.showZone(null); paintAll(); top.paintSpeed(); };
  dragCtx.onHoverZone = (zoneId, opKey, skillId) => bottom.showZone(zoneId, opKey, skillId);

  // ── คีย์ลัดสำหรับเล่นบนคอม (§10.14) ──────────────────────────
  //
  // การลากไอคอนแบบเดิมยังใช้ได้ทุกอย่าง อันนี้เป็น "ทางที่สอง" ไม่ได้มาแทน
  //   Esc = เมนู ☰ (หรือปิดสิ่งที่เปิดอยู่) · P = หยุด/เดินเวลา · T = หน้าเวลาที่เหลือ
  //   1-6 = เลือกสกิล แล้วเอาเมาส์ไปคลิกโซนที่จะลง
  //         กดเลขอื่น = เปลี่ยนสกิล · กดเลขเดิมซ้ำ = ยกเลิก
  //
  // ลำดับเลขไล่จากซ้ายไปขวาตามที่การ์ดเรียงบนจอ (Robertson 2 สกิล → Lyla → Lia 2 สกิล → Mudongzock)
  const KEY_SKILLS = [];
  for (const opKey of ['human', 'cat', 'elf', 'spirit']) {
    for (const skillId of Object.keys(OPERATORS[opKey].skills)) KEY_SKILLS.push({ opKey, skillId });
  }

  const iconOf = (opKey, skillId) =>
    root.querySelector(`.skill-row[data-op="${opKey}"][data-skill="${skillId}"] .skill-icon`);

  function useSkillByKey(index) {
    const item = KEY_SKILLS[index];
    if (!item) return;
    const sel = activeSelection();
    const same = sel && sel.opKey === item.opKey && sel.skillId === item.skillId;
    if (sel) cancelDrag();          // กดเลขเดิมซ้ำ = ยกเลิก · กดเลขอื่น = เปลี่ยนสกิล
    if (same) return;

    const icon = iconOf(item.opKey, item.skillId);
    if (!icon) return;
    // Air Deploy บัฟทั้งแมพ ไม่มีโซนให้เลือก — กดเลขแล้วใช้เลยเหมือนกดที่ไอคอน (§3.1)
    if (CONFIG.buffs[item.skillId]?.scope === 'global') {
      const done = useGlobalSkill(state, item.opKey, item.skillId);
      if (done) { fireSkillIcon(icon); dragCtx.onChange?.(done, null); }
      return;
    }
    selectSkillByKey(icon, item.opKey, item.skillId, dragCtx);
  }

  function onGameKey(e) {
    if (state.ended || activeQte) return;         // มินิเกมจังหวะกินคีย์ของตัวเอง
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target?.closest?.('input, textarea')) return;  // แถบเลื่อนในหน้า Settings

    if (e.key === 'Escape') {
      e.preventDefault();
      if (activeSelection()) cancelDrag();        // ยกเลิกสกิลที่เลือกไว้ก่อน
      else if (menu?.isOpen()) menu.close();
      else menu?.openMenu();
      return;
    }
    if (menu?.isOpen()) return;                   // เมนูเปิดอยู่ คีย์อื่นไม่ต้องทำงาน

    const k = e.key.toLowerCase();
    if (k === 'p') {
      e.preventDefault();
      clock.setRunning(!state.running); top.paintSpeed(); paintLive(); syncGameBgm();
    } else if (k === 't') {
      e.preventDefault();
      menu?.openTime(state);
    } else if (k >= '1' && k <= String(KEY_SKILLS.length)) {
      e.preventDefault();
      useSkillByKey(Number(k) - 1);
    }
  }
  window.addEventListener('keydown', onGameKey);
  detachKeys = () => window.removeEventListener('keydown', onGameKey);

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
