// แผงนักพัฒนา (Dev Panel) + Custom Game — รอบ 10.27
//
// ── สองโหมด ──────────────────────────────────────────────────────
//   1. เปิดจากปุ่ม DEV มุมขวาล่างของหน้าเมนู → ใส่รหัส → หน้าตั้งค่า "Custom Game"
//      ปรับตัวเลขได้อิสระ แล้วกด "เริ่ม Custom Game" = เกมแยกที่ใช้ค่าพวกนั้น
//      (ค่าถูกเขียนทับ CONFIG เฉพาะตอนเล่น Custom Game · กลับเมนูเมื่อไหร่คืนค่าเดิมทันที
//       เกมหลักจึงไม่เคยโดนค่าที่ปรับไว้ — ดู data/customGame.js)
//   2. เปิดจากปุ่ม DEV บนแถบบนของหน้าเกม (มีเฉพาะใน Custom Game) → เครื่องมือสด
//      ดูตัวแปร · เติม AP · รีเซ็ตคูลดาวน์ · รักษา · เดินเวลาข้าม · แก้ CONFIG ระหว่างเล่น
//
// ⚠️ รหัสผ่านชุดเดียวกับ Building 21 (CONFIG.dlcAccessCode) — ใส่ถูกที่นี่ = ปลดล็อก Building 21 ด้วย
//    (Building 21 ยังมีหน้าใส่รหัสของตัวเองเหมือนเดิม ใส่ที่ไหนก่อนก็ได้ ผลเหมือนกัน)
//
// ── ทำไมแผงนี้อยู่ "นอกเวที" ──────────────────────────────────
// เกมวาดลงเวทีขนาดคงที่ 1320×600 แล้วย่อด้วย transform (ดู ui/stage.js)
// ถ้าเอาแผงไปไว้ในเวที ตัวหนังสือจะถูกย่อตามจนอ่านไม่ออกบนมือถือ
// แผงนี้จึงต่อกับ <body> ตรง ๆ ใช้พิกเซลจริง (ใช้ vh/vw ได้) — เหมือนหน้าตรวจเสียง

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { isDlcUnlocked, setDlcUnlocked } from '../data/prefs.js';
import { OPERATORS, FIELD_OPS, allSkills, stackLimit } from '../data/operators.js';
import {
  CUSTOM_FLAGS, baseValue, numericLeaves, setByPath, getByPath,
  loadCustomDraft, saveCustomDraft, emptyDraft, draftChangeCount,
} from '../data/customGame.js';

// ไฟล์ที่เปิดดูได้ในแท็บ "โค้ด" — เรียงตามโฟลเดอร์เหมือนแผนผังใน CLAUDE.md
const SOURCE_FILES = [
  'src/config.js', 'src/state.js', 'src/main.js', 'src/styles.css',
  'src/data/operators.js', 'src/data/operatorIntel.js', 'src/data/icons.js',
  'src/data/sounds.js', 'src/data/prefs.js', 'src/data/tutorialScript.js', 'src/data/customGame.js',
  'src/systems/zones.js', 'src/systems/time.js', 'src/systems/actionPoints.js',
  'src/systems/survivors.js', 'src/systems/death.js', 'src/systems/skills.js',
  'src/systems/status.js', 'src/systems/successRate.js', 'src/systems/danger.js',
  'src/systems/outcomes.js', 'src/systems/score.js',
  'src/ui/gameScreen.js', 'src/ui/map.js', 'src/ui/dragdrop.js', 'src/ui/panels.js',
  'src/ui/feed.js', 'src/ui/qte.js', 'src/ui/gameMenu.js', 'src/ui/hints.js',
  'src/ui/screens.js', 'src/ui/result.js', 'src/ui/tutorial.js', 'src/ui/fx.js',
  'src/ui/skyline.js', 'src/ui/audio.js', 'src/ui/stage.js', 'src/ui/devPanel.js',
  'src/utils/rng.js', 'index.html', 'CLAUDE.md',
];

// ── ช่องปรับค่าที่คัดมาให้ (มีชื่อไทย) ──────────────────────────────
// scale: ค่าที่โชว์ = ค่าใน CONFIG ÷ scale  (เช่นเก็บเป็นลูป แต่โชว์เป็นชั่วโมง → scale 2)
// int: ปัดเป็นจำนวนเต็มก่อนเก็บ · min: ค่าต่ำสุดที่รับ
const LOOP = CONFIG.loopsPerHour;
const TIER_TH = { gray: 'เทา', yellow: 'เหลือง', red: 'แดง' };
const tiers = (label, pathOf, extra = {}) =>
  ['gray', 'yellow', 'red'].map((t) => ({ label: `${label} ${TIER_TH[t]}`, path: pathOf(t), ...extra }));

// ช่องของสกิลบัฟ/ภาคสนาม สร้างจากทะเบียน data/operators.js — เพิ่ม จนท. ใหม่ก็มีช่องให้ปรับเอง
const BUFF_SKILLS = allSkills().filter((s) => s.skill.type !== 'field');
const buffFields = () => BUFF_SKILLS.flatMap(({ skillId: id, skill }) => [
  ['ap', 'AP', { int: true, min: 0 }],
  ['cooldownHours', 'คูลดาวน์ (ชม.)', { min: 0 }],
  ['rate', 'บวกอัตราสำเร็จ (%)', {}],
  ['durationHours', 'อยู่ได้ (ชม.)', { min: 0 }],
].filter(([k]) => typeof baseValue(`buffs.${id}.${k}`) === 'number')
  .map(([k, label, extra]) => ({ label: `${skill.name} · ${label}`, path: `buffs.${id}.${k}`, ...extra })));

// สกิลลงพื้นที่ทุกตัว: ฐานสำเร็จ + AP + เวลาทำงาน ต่อระดับโซน (ตัวเลขอยู่ CONFIG.fieldSkills[configKey])
const FIELD_SKILLS = allSkills().filter((s) => s.skill.type === 'field');
const fieldFields = () => FIELD_SKILLS.flatMap(({ opKey, skill }) => {
  const who = OPERATORS[opKey].name;
  const key = skill.configKey;
  return [
    { label: `${who} · ฐานสำเร็จ (%)`, path: `fieldSkills.${key}.base` },
    ...tiers(`${who} · AP`, (t) => `fieldSkills.${key}.ap.${t}`, { int: true, min: 0 }),
    ...tiers(`${who} · เวลาทำงาน (ชม.)`, (t) => `fieldSkills.${key}.workHours.${t}`, { min: 0.5 }),
  ].filter((f) => typeof baseValue(f.path) === 'number');
});
const namesOf = (list) => [...new Set(list.map((s) => OPERATORS[s.opKey].name))].join(' · ');

const FIELD_GROUPS = [
  {
    title: 'เวลาและแต้ม AP',
    fields: [
      { label: 'ความยาวเกม (ชม.)', path: 'totalLoops', scale: LOOP, int: true, min: LOOP },
      { label: 'ความเร็ว 1x (วินาทีจริง/ชม.)', path: 'loopDurationMsBySpeed.1', scale: 1000 / LOOP, int: true, min: 50 },
      { label: 'ความเร็ว 2x (วินาทีจริง/ชม.)', path: 'loopDurationMsBySpeed.2', scale: 1000 / LOOP, int: true, min: 50 },
      { label: 'AP ตอนเริ่มเกม', path: 'apStart', int: true, min: 0 },
      { label: 'AP ต่อชม. ช่วงแรก', path: 'apCurve[0].ap', int: true, min: 0 },
      { label: 'AP ต่อชม. ช่วงกลาง', path: 'apCurve[1].ap', int: true, min: 0 },
      { label: 'AP ต่อชม. ช่วงท้าย', path: 'apCurve[2].ap', int: true, min: 0 },
    ],
  },
  {
    title: 'ผู้รอดและโซน',
    fields: [
      { label: 'ผู้รอดทั้งเมือง (คน)', path: 'totalSurvivors', int: true, min: 47 },
      ...tiers('อายุโซน (ชม.)', (t) => `zoneLifespanLoops.${t}`, { scale: LOOP, min: 1 }),
      ...tiers('โทษพื้นที่ (%)', (t) => `zonePenalty.${t}`),
      { label: 'เพดานอัตราสำเร็จ (%)', path: 'maxSuccessRate', min: 0 },
    ],
  },
  {
    title: `ทีมภาคสนาม (${namesOf(FIELD_SKILLS)})`,
    fields: fieldFields(),
  },
  { title: `สกิลบัฟ (${namesOf(BUFF_SKILLS)})`, fields: buffFields() },
  {
    title: 'อันตรายและการบาดเจ็บ',
    fields: [
      ...tiers('โอกาสอันตราย (%)', (t) => `dangerBase.${t}`, { scale: 0.01, min: 0 }),
      { label: 'เพดานโอกาสอันตราย (%)', path: 'dangerCap', scale: 0.01, min: 0 },
      { label: 'บาดเจ็บ · หักอัตราสำเร็จ (%)', path: 'injuredPenalty' },
      { label: 'บาดเจ็บ · ฟื้นใน (ชม.)', path: 'injuredRecoverHours', min: 0.5 },
      { label: 'หมดสติ · ฟื้นใน (ชม.)', path: 'lostConsciousHours', min: 0.5 },
      { label: 'CRITICAL · นับถอยหลัง (ชม.)', path: 'criticalCountdownHours', min: 0.5 },
      { label: 'Last Stand · ระยะเวลา (ชม.)', path: 'lastStand.durationHours', min: 0.5 },
    ],
  },
];

const FLAG_LABELS = {
  infiniteAp: 'AP ไม่จำกัด',
  noCooldown: 'สกิลบัฟไม่มีคูลดาวน์',
  noInjury: 'จนท. ไม่บาดเจ็บ',
  alwaysSucceed: 'ภารกิจสำเร็จทุกครั้ง',
  noDeath: 'ผู้รอดไม่ตายเอง',
};

// ค่าที่ไม่ให้แก้ในรายการ "ขั้นสูง" — แก้แล้วเกมพังแน่ ๆ
//   loopsPerHour: ทั้งเกมคิดเวลาเป็นครึ่งชั่วโมง · zoneCounts: แผนที่มี 47 โซนตายตัว
const LOCKED_PATHS = /^(loopsPerHour|zoneCounts\.)/;

let panel = null;   // แผงที่เปิดอยู่ (เปิดได้ทีละอัน)

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const fmt = (n) => String(Math.round(n * 1000) / 1000);

export function isDevPanelOpen() {
  return !!panel;
}

export function closeDevPanel() {
  if (!panel) return;
  const { onClose } = panel;
  panel.cleanup();
  panel.root.remove();
  panel = null;
  onClose?.();
}

// โครงแผง + คีย์บอร์ด — ใช้ร่วมกันทั้งสองโหมด
function mountShell({ onClose } = {}) {
  const root = el('div', 'dev-root');
  document.body.appendChild(root);
  let timer = null;

  // ⚠️ คีย์ทุกตัวตอนแผงเปิดต้องไม่ไหลไปถึงคีย์ลัดของหน้าเกม (ฟังอยู่ที่ window)
  // ไม่งั้นพิมพ์เลข 1-6 ในช่องกรอก = เลือกสกิลในเกม · กด P = เดินเวลา
  //   • คีย์ที่เกิดในแผง → ปล่อยให้ถึงช่องกรอกก่อน แล้วตัดทิ้งตอนไหลขึ้นมาถึงกรอบแผง
  //   • คีย์ที่เกิดนอกแผง (โฟกัสอยู่ที่ body) → ตัดทิ้งตั้งแต่ window ช่วง capture
  //     (ห้ามตัดคีย์ในแผงตรงนี้ ไม่งั้นช่องกรอกไม่ได้รับ Enter เลย)
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDevPanel(); return; }
    if (!root.contains(e.target)) e.stopPropagation();
  };
  window.addEventListener('keydown', onKey, true);
  root.addEventListener('keydown', (e) => e.stopPropagation());

  panel = {
    root,
    onClose,
    setTimer(t) { if (timer) clearInterval(timer); timer = t; },
    cleanup() {
      if (timer) clearInterval(timer);
      timer = null;
      window.removeEventListener('keydown', onKey, true);
    },
  };
  return panel;
}

// หัวแผง + แท็บ · คืนกล่องเนื้อหา
function buildTabs(p, title, tabs, first) {
  const { root } = p;
  root.innerHTML = '';
  const head = el('div', 'dev-head');
  head.append(el('span', 'dev-title', title));
  const tabBar = el('div', 'dev-tabs');
  const closeBtn = el('button', 'dev-close', '✕');
  closeBtn.setAttribute('aria-label', 'ปิด');
  closeBtn.addEventListener('click', closeDevPanel);
  head.append(tabBar, closeBtn);
  const bodyEl = el('div', 'dev-body');
  root.append(head, bodyEl);

  let current = first;
  const btns = tabs.map((t) => {
    const b = el('button', 'dev-tab', t.label);
    b.dataset.tab = t.id;
    b.addEventListener('click', () => { current = t.id; render(); });
    tabBar.appendChild(b);
    return b;
  });
  function render() {
    p.setTimer(null);
    btns.forEach((b) => b.classList.toggle('is-on', b.dataset.tab === current));
    bodyEl.innerHTML = '';
    tabs.find((t) => t.id === current).build(bodyEl);
  }
  render();
}

function flash(node) {
  node.classList.remove('is-flash');
  void node.offsetWidth;
  node.classList.add('is-flash');
}

// ════════════════════════════════════════════════════════════════
// โหมด 1 — เปิดจากเมนู: รหัสผ่าน → ตั้งค่า Custom Game
// ════════════════════════════════════════════════════════════════

/**
 * @param {object} o
 *   onStartCustom(draft)  กด "เริ่ม Custom Game" — screens.js เป็นคนพาไปหน้าเกม
 *   onUnlock()            ใส่รหัสถูกครั้งแรก (Building 21 ถูกปลดล็อกไปด้วย)
 */
export function openDevPanel({ onStartCustom, onUnlock } = {}) {
  if (panel) return panel;
  const p = mountShell();

  if (!isDlcUnlocked()) showGate(p, () => { onUnlock?.(); showSetup(); });
  else showSetup();

  function showSetup() {
    buildTabs(p, 'DEV PANEL', [
      { id: 'custom', label: 'Custom Game', build: (host) => buildCustomSetup(host, onStartCustom) },
      { id: 'code', label: 'โค้ด', build: buildCode },
    ], 'custom');
  }
  return p;
}

function showGate(p, onPass) {
  const { root } = p;
  root.innerHTML = '';
  const box = el('div', 'dev-gate');
  box.append(
    el('div', 'dev-gate-title', 'DEV PANEL'),
    el('div', 'dev-gate-note', 'ใส่รหัสผ่าน 15 หลักเพื่อเข้าใช้งาน\nรหัสเดียวกับโหมด Building 21 — ใส่ถูกแล้วปลดล็อก Building 21 ให้ด้วย'),
  );
  const input = el('input', 'dev-gate-input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.maxLength = 15;
  input.placeholder = '••••••••••••••';
  const err = el('div', 'dev-gate-err');
  const row = el('div', 'dev-row');
  const okBtn = el('button', 'dev-btn dev-btn--go', 'เข้าใช้งาน');
  const cancel = el('button', 'dev-btn', 'ปิด');
  row.append(cancel, okBtn);
  box.append(input, err, row);
  root.appendChild(box);

  // รับเฉพาะตัวเลข พิมพ์อย่างอื่นถูกตัดทิ้งทันที
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 15);
    err.textContent = '';
  });
  const submit = () => {
    if (input.value === CONFIG.dlcAccessCode) {
      setDlcUnlocked();          // ปลดล็อก Building 21 ไปพร้อมกัน
      onPass();
      return;
    }
    err.textContent = 'รหัสไม่ถูกต้อง';
    box.classList.remove('is-shake');
    void box.offsetWidth;         // รีทริกเกอร์แอนิเมชันสั่นให้เล่นซ้ำได้
    box.classList.add('is-shake');
  };
  okBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  cancel.addEventListener('click', closeDevPanel);
  input.focus();
}

// ── หน้าตั้งค่า Custom Game ────────────────────────────────────────
function buildCustomSetup(host, onStartCustom) {
  const draft = loadCustomDraft();
  const inputs = [];   // ไว้รีเฟรชทุกช่องตอนกดรีเซ็ต

  host.appendChild(el('div', 'dev-note',
    'Custom Game คือเกมแยกจากเกมหลัก — ค่าที่ปรับตรงนี้มีผลเฉพาะ Custom Game\n'
    + 'กลับหน้าเมนูเมื่อไหร่ เกมหลักใช้ค่าเดิมเสมอ · ค่าที่ปรับไว้ถูกจำในเครื่องนี้'));

  // ทางลัดสำเร็จรูป
  host.appendChild(el('div', 'dev-sub', 'ทางลัด'));
  const flagBox = el('div', 'dev-flags');
  const flagInputs = [];
  for (const name of Object.keys(CUSTOM_FLAGS)) {
    const lab = el('label', 'dev-flag');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.dataset.flag = name;
    cb.checked = !!draft.flags[name];
    cb.addEventListener('change', () => {
      if (cb.checked) draft.flags[name] = true; else delete draft.flags[name];
      lab.classList.toggle('is-on', cb.checked);
      commit();
    });
    lab.classList.toggle('is-on', cb.checked);
    lab.append(cb, el('span', null, FLAG_LABELS[name] ?? name));
    flagBox.appendChild(lab);
    flagInputs.push({ cb, lab });
  }
  host.appendChild(flagBox);

  // ช่องกรอกตัวเลข 1 ช่อง — ผูกกับ path ใน CONFIG
  function numberField(grid, f) {
    const scale = f.scale ?? 1;
    const base = baseValue(f.path);
    const row = el('label', 'dev-field');
    const lab = el('span', 'dev-field-label');
    lab.append(el('span', null, f.label), el('span', 'dev-field-base', `ปกติ ${fmt(base / scale)}`));
    const inp = el('input', 'dev-input');
    inp.type = 'number';
    inp.step = 'any';
    inp.dataset.path = f.path;
    const paint = () => {
      const v = draft.values[f.path] ?? base;
      inp.value = fmt(v / scale);
      row.classList.toggle('is-changed', f.path in draft.values);
    };
    inp.addEventListener('input', () => {
      let shown = Number(inp.value);
      if (inp.value.trim() === '' || !Number.isFinite(shown)) return;
      let v = shown * scale;
      if (f.int) v = Math.round(v);
      if (f.min != null) v = Math.max(f.min, v);
      if (Math.abs(v - base) < 1e-9) delete draft.values[f.path];
      else draft.values[f.path] = v;
      row.classList.toggle('is-changed', f.path in draft.values);
      commit();
    });
    // ออกจากช่องแล้วจัดค่าให้เรียบร้อย (เช่นพิมพ์ต่ำกว่าค่าต่ำสุด → เด้งกลับเป็นค่าต่ำสุด)
    inp.addEventListener('change', paint);
    paint();
    row.append(lab, inp);
    grid.appendChild(row);
    inputs.push(paint);
  }

  for (const g of FIELD_GROUPS) {
    host.appendChild(el('div', 'dev-sub', g.title));
    const grid = el('div', 'dev-grid');
    for (const f of g.fields) numberField(grid, f);
    host.appendChild(grid);
  }

  // ค่าขั้นสูง — ตัวเลขทุกตัวใน config.js
  const adv = el('details', 'dev-adv');
  adv.appendChild(el('summary', 'dev-sub', 'ขั้นสูง — ตัวเลขทุกตัวใน config.js'));
  const search = el('input', 'dev-search');
  search.type = 'search';
  search.placeholder = 'ค้นหา เช่น qte, score, ranks';
  const list = el('div', 'dev-grid dev-grid--tall');
  adv.append(search, list);
  host.appendChild(adv);
  const leaves = numericLeaves().filter((l) => !LOCKED_PATHS.test(l.path));
  const paintList = () => {
    const q = search.value.trim().toLowerCase();
    list.innerHTML = '';
    const rows = leaves.filter((l) => !q || l.path.toLowerCase().includes(q)).slice(0, 300);
    for (const leaf of rows) numberField(list, { label: leaf.path, path: leaf.path });
    if (!rows.length) list.appendChild(el('div', 'dev-note', 'ไม่เจอค่าที่ตรงกับคำค้น'));
  };
  search.addEventListener('input', paintList);
  adv.addEventListener('toggle', () => { if (adv.open && !list.childElementCount) paintList(); });

  // แถบล่าง: นับค่าที่ปรับ · รีเซ็ต · เริ่มเกม
  const foot = el('div', 'dev-foot');
  const count = el('span', 'dev-count');
  const resetBtn = el('button', 'dev-btn', 'คืนค่าเกมหลักทั้งหมด');
  const startBtn = el('button', 'dev-btn dev-btn--go dev-start', '▶ เริ่ม Custom Game');
  foot.append(count, resetBtn, startBtn);
  host.appendChild(foot);

  resetBtn.addEventListener('click', () => {
    const fresh = emptyDraft();
    draft.values = fresh.values;
    draft.flags = fresh.flags;
    for (const { cb, lab } of flagInputs) { cb.checked = false; lab.classList.remove('is-on'); }
    for (const paint of inputs) paint();
    commit();
    flash(resetBtn);
  });
  startBtn.addEventListener('click', () => {
    saveCustomDraft(draft);
    const snapshot = structuredClone(draft);
    closeDevPanel();
    onStartCustom?.(snapshot);
  });

  function commit() {
    saveCustomDraft(draft);
    const n = draftChangeCount(draft);
    count.textContent = n ? `ปรับไว้ ${n} อย่าง` : 'ยังเป็นค่าเกมหลักทั้งหมด';
  }
  commit();
}

// ════════════════════════════════════════════════════════════════
// โหมด 2 — เปิดจากหน้าเกม (เฉพาะ Custom Game): เครื่องมือสด
// ════════════════════════════════════════════════════════════════

/**
 * @param {object} hooks  จาก ui/gameScreen.js
 *   advance(loops)  เดินเกมไปข้างหน้า n ลูปทันที (คิดผลครบทุกอย่างเหมือนเวลาเดินจริง)
 *   repaint()       วาดหน้าเกมใหม่หลังแก้ค่า
 *   onClose()       ปิดแผงแล้ว — หน้าเกมเดินเวลาต่อถ้าก่อนเปิดเดินอยู่
 */
export function openIngameDevPanel(hooks = {}) {
  if (panel) return panel;
  const p = mountShell({ onClose: hooks.onClose });
  buildTabs(p, 'DEV · CUSTOM GAME', [
    { id: 'state', label: 'ตัวแปร', build: (host) => buildState(p, host) },
    { id: 'tune', label: 'ปรับสด', build: (host) => buildLiveTune(host, hooks) },
    { id: 'code', label: 'โค้ด', build: buildCode },
  ], 'state');
  return p;
}

// ── แท็บ: ค่าตัวแปรสด ๆ ──────────────────────────────────────────
function buildState(p, host) {
  const pre = el('pre', 'dev-pre');
  host.append(el('div', 'dev-note', 'อัปเดตเองทุกครึ่งวินาที · ค่าจาก state.js ของจริง'), pre);
  const STATUS_TH = { normal: 'ปกติ', injured: 'บาดเจ็บ', lost: 'หมดสติ', laststand: 'Last Stand' };
  const h = (loops) => `${fmt(loops / CONFIG.loopsPerHour)} ชม.`;
  const paint = () => {
    const zones = Object.values(state.zones ?? {});
    const sum = (a, f) => a.reduce((s, z) => s + (f(z) || 0), 0);
    const tierLine = (t) => {
      const g = zones.filter((z) => z.level === t);
      return `  ${TIER_TH[t].padEnd(7)} ${String(g.length).padStart(2)} โซน`
        + ` · ติดอยู่ ${String(Math.floor(sum(g, (z) => z.trapped))).padStart(4)}`
        + ` · ช่วยแล้ว ${String(Math.floor(sum(g, (z) => z.rescued))).padStart(4)}`
        + ` · เสียชีวิต ${String(Math.floor(sum(g, (z) => z.casualty))).padStart(4)}`
        + ` · เคลียร์ ${g.filter((z) => z.cleared).length}`;
    };
    const units = Object.entries(state.units ?? {}).map(([k, u]) => {
      const bits = [`${(OPERATORS[k]?.name ?? k).padEnd(11)} ${(STATUS_TH[u.status] ?? u.status).padEnd(10)}`];
      if (u.mission) bits.push(`ลงโซน ${u.mission.zoneId} เหลือ ${h(u.busyRemainLoops)}`);
      else if (u.busyRemainLoops > 0) bits.push(`ไม่ว่าง ${h(u.busyRemainLoops)}`);
      if (u.recoverRemainLoops > 0) bits.push(`ฟื้นใน ${h(u.recoverRemainLoops)}`);
      const cds = Object.entries(u.skillCooldowns ?? {}).filter(([, v]) => v > 0);
      if (cds.length) bits.push('คูลดาวน์ ' + cds.map(([s, v]) => `${s} ${h(v)}`).join(', '));
      for (const [sk, n] of Object.entries(u.skillStacks ?? {})) bits.push(`ช่อง ${sk} ${n}`);
      return '  ' + bits.join(' · ');
    });
    pre.textContent = [
      '── เวลา / แต้ม ─────────────────────────',
      `  ชั่วโมงในเกม   ${state.hour ?? 0} / ${CONFIG.totalLoops / CONFIG.loopsPerHour}`,
      `  ลูปที่          ${state.loop ?? 0} / ${CONFIG.totalLoops}`,
      `  AP             ${Math.floor(state.ap ?? 0)}`,
      `  ความเร็ว       ${state.speed ?? 1}x · ${state.running ? 'เวลาเดินอยู่' : 'หยุดอยู่'}`,
      `  จบเกมแล้ว      ${state.ended ? `ใช่ (${state.endReason ?? '-'})` : 'ยัง'}`,
      '',
      '── ผลรวมทั้งเมือง ──────────────────────',
      `  ผู้รอดตั้งต้น   ${CONFIG.totalSurvivors}`,
      `  ช่วยได้        ${Math.floor(state.totalRescued ?? 0)}`,
      `  เสียชีวิต      ${Math.floor(state.totalCasualty ?? 0)}`,
      `  ยังติดอยู่     ${Math.floor(sum(zones, (z) => z.trapped))}`,
      `  ภารกิจจบแล้ว   ${state.stats?.missions ?? 0} ครั้ง (สำเร็จ ${state.stats?.missionsSucceeded ?? 0})`,
      `  บาดเจ็บ/หมดสติ ${state.stats?.injuries ?? 0} / ${state.stats?.blackouts ?? 0} ครั้ง`,
      '',
      '── แยกตามระดับโซน ─────────────────────',
      tierLine('gray'), tierLine('yellow'), tierLine('red'),
      '',
      '── เจ้าหน้าที่ ─────────────────────────',
      ...units,
      '',
      '── บัฟทั้งแมพ / Last Stand / CRITICAL ──',
      `  บัฟทั้งแมพ          ${state.globalBuffs?.map((b) => `${b.type} ${h(b.remainLoops)}`).join(', ') || '-'}`,
      `  ใช้ Last Stand แล้ว  ${state.lastStandUsed ? 'ใช่' : 'ยัง'}`,
      `  QTE                 ${state.lastStandQte ?? '-'} (เล่นไป ${state.lastStandQteDone ?? 0} รอบ)`,
      `  CRITICAL            ${state.criticalCountdownLoops == null ? '-' : 'เหลือ ' + h(state.criticalCountdownLoops)}`,
    ].join('\n');
  };
  paint();
  p.setTimer(setInterval(paint, 500));
}

// ── แท็บ: ปรับสดระหว่างเล่น ───────────────────────────────────────
function buildLiveTune(host, hooks) {
  host.appendChild(el('div', 'dev-note',
    'ทุกปุ่มมีผลกับเกมนี้ทันที · เวลาหยุดอยู่ระหว่างเปิดแผง ปิดแล้วเดินต่อเอง'));

  const quick = el('div', 'dev-quick');
  const act = (label, fn, id) => {
    const b = el('button', 'dev-btn', label);
    if (id) b.dataset.act = id;
    b.addEventListener('click', () => {
      if (state.ended) return;
      fn();
      hooks.repaint?.();
      apInput.value = String(Math.floor(state.ap));
      flash(b);
    });
    quick.appendChild(b);
  };
  act('AP +100', () => { state.ap += 100; }, 'ap100');
  act('AP = 999', () => { state.ap = 999; }, 'ap999');
  act('รีเซ็ตคูลดาวน์สกิล', () => {
    for (const u of Object.values(state.units)) {
      for (const k of Object.keys(u.skillCooldowns)) u.skillCooldowns[k] = 0;
      if (!u.mission) u.busyRemainLoops = 0;      // Crowd Control จองตัวไว้โดยไม่มีภารกิจ
      for (const sk of Object.keys(u.skillStacks ?? {})) u.skillStacks[sk] = stackLimit(sk) ?? u.skillStacks[sk];
    }
  }, 'cooldown');
  act('รักษาทุกคนให้หาย', () => {
    for (const u of Object.values(state.units)) {
      if (u.status !== 'injured' && u.status !== 'lost') continue;
      u.status = 'normal';
      u.recoverRemainLoops = 0;
      u.recoverTotalLoops = 0;
    }
    state.criticalCountdownLoops = null;
  }, 'heal');
  // ภารกิจที่ค้างอยู่จบในลูปถัดไป แล้วเดินให้ 1 ลูปเลย → ผลออกทันที (คิดผลตามกฎจริง)
  act('ภารกิจที่ค้างอยู่ให้จบเดี๋ยวนี้', () => {
    for (const u of Object.values(state.units)) if (u.mission && u.busyRemainLoops > 1) u.busyRemainLoops = 1;
    hooks.advance?.(1);
  }, 'finish');
  act('เดินเวลา +1 ชม.', () => hooks.advance?.(CONFIG.loopsPerHour), 'skip1');
  act('เดินเวลา +6 ชม.', () => hooks.advance?.(6 * CONFIG.loopsPerHour), 'skip6');
  act('ข้ามไปจบเกม', () => hooks.advance?.(CONFIG.totalLoops), 'end');
  host.appendChild(quick);

  const grid = el('div', 'dev-grid');
  const row = el('label', 'dev-field');
  row.appendChild(el('span', 'dev-field-label', 'AP ตอนนี้'));
  const apInput = el('input', 'dev-input');
  apInput.type = 'number';
  apInput.dataset.state = 'ap';
  apInput.value = String(Math.floor(state.ap));
  apInput.addEventListener('change', () => {
    const v = Number(apInput.value);
    if (!Number.isFinite(v)) return;
    state.ap = Math.max(0, v);
    hooks.repaint?.();
    flash(apInput);
  });
  row.appendChild(apInput);
  grid.appendChild(row);
  host.append(el('div', 'dev-sub', 'ค่าในเกมตอนนี้'), grid);

  // CONFIG ของเกมนี้ — แก้แล้วมีผลทันที (กลับเมนูแล้วคืนค่าเกมหลักเอง)
  host.appendChild(el('div', 'dev-sub', 'ตัวเลขใน config.js ของเกมนี้ (มีผลทันที)'));
  const search = el('input', 'dev-search');
  search.type = 'search';
  search.placeholder = 'ค้นหา เช่น ap, cooldown, danger';
  const list = el('div', 'dev-grid dev-grid--tall');
  host.append(search, list);
  const leaves = numericLeaves().filter((l) => !LOCKED_PATHS.test(l.path));
  const paintList = () => {
    const q = search.value.trim().toLowerCase();
    list.innerHTML = '';
    const rows = leaves.filter((l) => !q || l.path.toLowerCase().includes(q)).slice(0, 300);
    for (const leaf of rows) {
      const r = el('label', 'dev-field');
      const lab = el('span', 'dev-field-label');
      lab.append(el('span', null, leaf.path), el('span', 'dev-field-base', `ปกติ ${fmt(leaf.value)}`));
      const inp = el('input', 'dev-input');
      inp.type = 'number'; inp.step = 'any';
      inp.dataset.path = leaf.path;
      inp.value = fmt(getByPath(CONFIG, leaf.path));
      r.classList.toggle('is-changed', getByPath(CONFIG, leaf.path) !== leaf.value);
      inp.addEventListener('change', () => {
        const v = Number(inp.value);
        if (inp.value.trim() === '' || !Number.isFinite(v)) return;
        setByPath(CONFIG, leaf.path, v);
        r.classList.toggle('is-changed', v !== leaf.value);
        hooks.repaint?.();
        flash(inp);
      });
      r.append(lab, inp);
      list.appendChild(r);
    }
    if (!rows.length) list.appendChild(el('div', 'dev-note', 'ไม่เจอค่าที่ตรงกับคำค้น'));
  };
  search.addEventListener('input', paintList);
  paintList();
}

// ── แท็บ: ดูซอร์สโค้ด ──────────────────────────────────────────────
function buildCode(host) {
  const bar = el('div', 'dev-row');
  const pick = el('select', 'dev-select');
  for (const f of SOURCE_FILES) {
    const o = document.createElement('option');
    o.value = f; o.textContent = f;
    pick.appendChild(o);
  }
  const info = el('span', 'dev-note dev-note--inline', '');
  bar.append(pick, info);
  const pre = el('pre', 'dev-pre dev-pre--code');
  host.append(bar, pre);

  async function load(file) {
    pre.textContent = 'กำลังโหลด...';
    try {
      const res = await fetch(file, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      pre.textContent = text;
      info.textContent = `${text.split('\n').length} บรรทัด · ${(text.length / 1024).toFixed(1)} KB`;
    } catch (e) {
      pre.textContent = `เปิดไฟล์ไม่ได้: ${e.message}\n\n`
        + '(ถ้าเปิดเกมจากไฟล์ในเครื่องแบบ file:// เบราว์เซอร์จะบล็อกการอ่านไฟล์\n'
        + ' ต้องเปิดผ่านเว็บ เช่น GitHub Pages ถึงจะดูโค้ดได้)';
      info.textContent = '';
    }
  }
  pick.addEventListener('change', () => load(pick.value));
  load(pick.value);
}
