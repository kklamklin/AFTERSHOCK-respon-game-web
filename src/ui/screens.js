// §I เริ่มและจบเกม (gameflowspec.md) — หน้าปก, เมนูหลัก, และหน้าปลายทางชั่วคราว
// ตอนนี้ทำแค่หน้าปก + เมนูหลัก ตามที่สั่ง — ปุ่มเมนู (Play/Settings/Intel/Quit)
// ยังไม่เชื่อมไปหน้าจริง กดแล้วไปหน้าว่างชั่วคราวก่อน (renderBlank)

import { OPERATORS } from '../data/operators.js';
import { OPERATOR_INTEL } from '../data/operatorIntel.js';
import { renderTutorial } from './tutorial.js';
import { renderGameScreen } from './gameScreen.js';
import { renderResult } from './result.js';
import { state } from '../state.js';
import { iconNode } from '../data/icons.js';
import { fadeSwap, clearFx } from './fx.js';
import { buildSkyline } from './skyline.js';
import { setBgm } from './audio.js';
import { getPrefs, setPref, onPrefsChange, brightnessFactor } from '../data/prefs.js';

// ความสว่างหน้าจอ — ผูกครั้งเดียวตอนโหลด แล้วอัปเดตเองทุกครั้งที่ค่าเปลี่ยน
// ใส่ที่ <html> เพื่อให้ครอบทั้งหน้าจอเกมและชั้นเอฟเฟกต์ (ui/fx.js) ที่อยู่นอก #screen-root
onPrefsChange((prefs) => {
  document.documentElement.style.setProperty('--ui-brightness', brightnessFactor(prefs.brightness));
});

// ลำดับต้องตรงกับหน้าตาดราฟ: มนุษย์(หน้ากาก) → แมว → เอลฟ์(Lia) → ภูต(Mudongzock)
// รูปจริงอยู่ใน assets/icons/ (จับคู่ชื่อไฟล์ที่ data/icons.js) — ยังไม่มีไฟล์ก็ใช้ emoji ไปก่อน
const OPERATOR_CHIBI_PLACEHOLDERS = [
  { key: 'opHuman',  ring: '#e8703a' }, // Robertson
  { key: 'opCat',    ring: '#2b2b2b' }, // Lyla
  { key: 'opElf',    ring: '#e0b23c' }, // Lia
  { key: 'opSpirit', ring: '#5b8fd6' }, // Mudongzock
];

/**
 * โลโก้ AFTERSHOCKS + แถวรูปตัวละคร 4 ตัว
 * @param size        'lg' หน้าปก · 'sm' เล็ก
 * @param iconsBeside true = วางรูปตัวละครไว้ "ข้าง ๆ" ชื่อเกม (หน้าเมนู)
 *                    false = วางไว้ "ใต้" ชื่อเกม (หน้าปก)
 */
function buildLogo({ size = 'lg', subtitle = 'Response', iconsBeside = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = `logo-block logo-block--${size}${iconsBeside ? ' logo-block--row' : ''}`;

  const title = document.createElement('div');
  title.className = 'logo-title';
  title.textContent = 'AFTERSHOCKS';

  const sub = document.createElement('div');
  sub.className = 'logo-subtitle';
  sub.textContent = subtitle;

  const icons = document.createElement('div');
  icons.className = 'logo-icons';
  for (const { key, ring } of OPERATOR_CHIBI_PLACEHOLDERS) {
    const glyph = iconNode(key, 'chibi-glyph');
    const icon = document.createElement('div');
    // รูปจริงมีขอบวงกลมมาในตัวแล้ว ถ้าใส่วงแหวนสีทับอีกชั้นจะกลายเป็นวงซ้อนวง
    // วงแหวนจึงเหลือไว้ใช้เฉพาะตอนที่ยังไม่มีไฟล์ (แสดง emoji)
    icon.className = glyph.tagName === 'IMG' ? 'chibi-slot chibi-slot--img' : 'chibi-slot';
    icon.style.setProperty('--ring', ring);
    icon.appendChild(glyph);
    icons.appendChild(icon);
  }

  if (iconsBeside) {
    // ชื่อเกมกับคำโปรยกองกันเป็นคอลัมน์ แล้วเอาแถวรูปไปต่อข้างขวา
    const text = document.createElement('div');
    text.className = 'logo-text';
    text.append(title, sub);
    wrap.append(text, icons);
  } else {
    wrap.append(title, sub, icons);
  }
  return wrap;
}

const SCREEN_CLASSES = [
  'screen--splash', 'screen--menu', 'screen--blank', 'screen--settings',
  'screen--quit', 'screen--intel', 'screen--howto', 'screen--roster', 'screen--card', 'screen--vn',
  'screen--game', 'screen--result',
];

function setScreenClass(root, cls) {
  root.classList.remove(...SCREEN_CLASSES);
  root.classList.add(cls);
}

function buildVersionTag(text) {
  const tag = document.createElement('div');
  tag.className = 'version-tag';
  tag.textContent = text;
  return tag;
}

export function renderSplash(root, { onContinue } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--splash');

  const center = document.createElement('div');
  center.className = 'splash-center';
  center.appendChild(buildLogo({ size: 'lg' }));
  root.appendChild(center);
  root.appendChild(buildVersionTag('V.1 alpha test'));

  const hint = document.createElement('div');
  hint.className = 'splash-hint';
  hint.textContent = 'แตะที่ไหนก็ได้เพื่อเริ่ม';
  root.appendChild(hint);

  root.addEventListener('click', () => onContinue?.(), { once: true });
}

export function renderMenu(root, { onNavigate } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--menu');

  // ฉากเมืองเวกเตอร์อยู่ข้างขวา สั่นเป็นระยะ (ดู ui/skyline.js)
  root.appendChild(buildSkyline());

  const top = document.createElement('div');
  top.className = 'menu-top';
  top.appendChild(buildLogo({ size: 'lg', iconsBeside: true }));
  root.appendChild(top);

  const nav = document.createElement('nav');
  nav.className = 'menu-nav';
  const items = [
    { id: 'play', label: 'Play' },
    { id: 'settings', label: 'Settings' },
    { id: 'intel', label: 'Intel' },
    { id: 'quit', label: 'Quit' },
  ];
  for (const { id, label } of items) {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => onNavigate?.(id));
    nav.appendChild(btn);
  }
  root.appendChild(nav);
  root.appendChild(buildVersionTag('V.1 alpha'));
}

// หน้า Settings — เวอร์ชันเข้าจากเมนูหลัก (§ setting draft รูป "ขวาสุด")
// ไม่มี popup ยืนยัน เพราะไม่มีเกมที่กำลังเล่นอยู่ให้เสีย — ต่างจากเวอร์ชันในเกม (ยังไม่ทำ รอหน้าเกมก่อน)
// แถบเลื่อน 1 แถว — ผูกกับค่าจริงใน data/prefs.js เลื่อนแล้วมีผลทันทีและถูกจำไว้
function buildSlider(label, prefKey) {
  const row = document.createElement('div');
  row.className = 'settings-row';

  const name = document.createElement('span');
  name.className = 'settings-label';
  name.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.value = String(getPrefs()[prefKey]);
  input.className = 'settings-slider';

  const out = document.createElement('span');
  out.className = 'settings-value';
  out.textContent = `${input.value}%`;

  // input = ระหว่างลาก (ได้ยิน/เห็นผลทันที) · change = ปล่อยนิ้ว
  input.addEventListener('input', () => {
    setPref(prefKey, input.value);
    out.textContent = `${input.value}%`;
  });

  row.append(name, input, out);
  return row;
}

export function renderSettingsMenu(root, { onBack } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--settings');

  const header = document.createElement('div');
  header.className = 'settings-header';
  const back = document.createElement('button');
  back.className = 'settings-back';
  back.textContent = '‹';
  back.addEventListener('click', () => onBack?.());
  const title = document.createElement('span');
  title.className = 'settings-title';
  title.textContent = 'SETTINGS';
  header.append(back, title);
  root.appendChild(header);

  const body = document.createElement('div');
  body.className = 'settings-body';
  body.append(buildSlider('Volume', 'volume'), buildSlider('Brightness', 'brightness'));
  root.appendChild(body);

  const backToMenu = document.createElement('button');
  backToMenu.className = 'settings-back-to-menu';
  backToMenu.textContent = 'BACK TO MENU';
  backToMenu.addEventListener('click', () => onBack?.());
  root.appendChild(backToMenu);
}

// หน้าว่างชั่วคราว — ใช้แทนหน้า Play/Intel/Quit จนกว่าจะสั่งให้ทำจริง
export function renderBlank(root, { label = '', onBack } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--blank');

  const back = document.createElement('button');
  back.className = 'blank-back';
  back.textContent = '← กลับเมนู';
  back.addEventListener('click', () => onBack?.());
  root.appendChild(back);

  const note = document.createElement('div');
  note.className = 'blank-note';
  note.textContent = label ? `${label} — ยังไม่ได้ทำ` : 'ยังไม่ได้ทำ';
  root.appendChild(note);
}

// หน้า Quit — พยายามปิดแท็บให้เลย ถ้าเบราว์เซอร์ไม่ยอม (ปกติบล็อกการปิดแท็บที่ผู้ใช้เปิดเอง)
// ให้ข้อความบอกให้ปิดแท็บ/ออกจากเว็บเอง
export function renderQuit(root) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--quit');

  const note = document.createElement('div');
  note.className = 'quit-note';
  note.textContent = 'ปิดแท็บนี้ได้เลย — ขอบคุณที่เล่น AFTERSHOCKS';
  root.appendChild(note);

  // เบราว์เซอร์ส่วนใหญ่บล็อก window.close() บนแท็บที่ผู้ใช้เปิดเอง (ไม่ใช่แท็บที่สคริปต์เปิด)
  // ลองปิดให้ก่อน ถ้าไม่สำเร็จ (ปกติจะไม่สำเร็จ) ผู้เล่นเห็นข้อความด้านบนแทน
  window.close();
}

// หน้า Intel — เมนูย่อย (How to play / Operator)
function buildSubHeader(titleText, onBack) {
  const header = document.createElement('div');
  header.className = 'sub-header';
  const back = document.createElement('button');
  back.className = 'sub-back';
  back.textContent = '‹';
  back.addEventListener('click', () => onBack?.());
  const title = document.createElement('span');
  title.className = 'sub-title';
  title.textContent = titleText;
  header.append(back, title);
  return header;
}

function buildBackToMenu(onBack) {
  const btn = document.createElement('button');
  btn.className = 'sub-back-to-menu';
  btn.textContent = 'BACK TO MENU';
  btn.addEventListener('click', () => onBack?.());
  return btn;
}

export function renderIntelMenu(root, { onBack, onNavigate } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--intel');

  root.appendChild(buildSubHeader('INTELS', onBack));

  const nav = document.createElement('nav');
  nav.className = 'intel-nav';
  const items = [
    { id: 'howto', label: 'How to play' },
    { id: 'operator', label: 'Operator' },
  ];
  for (const { id, label } of items) {
    const btn = document.createElement('button');
    btn.className = 'intel-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => onNavigate?.(id));
    nav.appendChild(btn);
  }
  root.appendChild(nav);
  root.appendChild(buildBackToMenu(onBack));
}

// เนื้อหาคู่มือละเอียด (มากกว่าที่ Lia พูดสรุปใน tutorial) — สรุปจาก docs/gameflowspec.md + docs/gamesystemfinal.md
const HOW_TO_PLAY_SECTIONS = [
  {
    heading: 'เป้าหมาย',
    body: 'คุณเป็นผู้บัญชาการศูนย์กู้ภัย ส่งเจ้าหน้าที่ 4 คนเข้าไปช่วยผู้รอดชีวิต 1,200 คน ที่ติดอยู่ใน 47 โซนทั่วเมืองที่เกิดแผ่นดินไหว ภายในเวลา 72 ชั่วโมงในเกม (เล่นจริงประมาณ 10 นาที)',
  },
  {
    heading: 'การควบคุมเวลา',
    body: 'เกมเดินเวลาอัตโนมัติตั้งแต่กดเริ่ม ใช้ปุ่ม ⏸ หยุด / ▶ เดินปกติ / ⏩ เร่งความเร็ว ปรับได้ตลอดเวลา เวลาจะหยุดอัตโนมัติเมื่อลากไอคอนสั่งงาน หรือมีเจ้าหน้าที่บาดเจ็บ',
  },
  {
    heading: 'โซนและผู้รอดชีวิต',
    body: 'เมืองแบ่งเป็น 47 โซน 3 ระดับ: เทา (เสี่ยงต่ำ) เหลือง (เสี่ยงปานกลาง) แดง (เสี่ยงสูง) แต่ละโซนมีคนติดอยู่ไม่เท่ากัน และจะค่อย ๆ เสียชีวิตไปเรื่อย ๆ ถ้าไม่ได้รับความช่วยเหลือ — โซนยิ่งอันตราย คนยิ่งตายเร็ว ต้องรีบตัดสินใจว่าจะช่วยที่ไหนก่อน',
  },
  {
    heading: 'Action Point (AP)',
    body: 'การส่งเจ้าหน้าที่หรือใช้สกิลทุกครั้งต้องใช้ AP โดย AP จะได้รับเพิ่มขึ้นทุกชั่วโมง และยิ่งเวลาผ่านไปนาน (คนหายไปจากระบบมากขึ้น ไม่ว่าจะช่วยได้หรือเสียชีวิต) จะยิ่งได้ AP ต่อชั่วโมงมากขึ้น',
  },
  {
    heading: 'เจ้าหน้าที่ 4 คน',
    body: 'Robertson (มนุษย์ ภาคสนาม) เข้าโซนเทา/เหลืองได้ มีสกิลบัฟ Crowd Control · Lyla (สาวแมว ภาคสนาม) เข้าได้ทุกโซนรวมโซนแดง อัตราสำเร็จฐานสูงกว่า · Lia (เอลฟ์ ภาคฐาน) ไม่ลงพื้นที่เอง ใช้สกิล Scan Area เพิ่มอัตราสำเร็จได้หลายโซน และ Alert การันตีความปลอดภัย · Mudongzock (ภูต ภาคฐาน) ใช้สกิล Air Deploy บัฟทั้งแผนที่พร้อมกัน',
  },
  {
    heading: 'วิธีส่งเจ้าหน้าที่/สกิล',
    body: 'ลากไอคอนเจ้าหน้าที่หรือสกิลไปวางบนโซนที่ต้องการ ปล่อยแล้วยืนยันทันที ไม่มีขั้นตอนยืนยันซ้ำ ระหว่างลาก เกมจะหยุดเวลาให้อัตโนมัติ และโซนที่ลงไม่ได้จะขึ้นกากบาทให้เห็นชัดเจน',
  },
  {
    heading: 'จุดสำคัญ: คำนวณผลตอนไหน',
    body: 'ผลจะถูกคำนวณ "หลัง" เจ้าหน้าที่ทำงานเสร็จ ไม่ใช่ตอนส่งไป ระหว่างรอผล คนในโซนนั้นยังตายต่อไปเรื่อย ๆ และคุณยังลงบัฟเพิ่มได้ระหว่างที่เขากำลังทำงานอยู่ — บัฟที่ลงทีหลังมีผลจริงเพราะยังไม่ได้คำนวณ',
  },
  {
    heading: 'ผลลัพธ์',
    body: 'มี 2 แบบเท่านั้น: สำเร็จ (โซนกลายเป็นสีเขียว ช่วยคนได้ตามเปอร์เซ็นต์ที่สุ่มขึ้นกับอัตราสำเร็จ ปลอดภัย 100%) หรือ ไม่สำเร็จ (ไม่ได้ช่วยใครเลย และมีโอกาสที่เจ้าหน้าที่จะบาดเจ็บ) ยิ่งอัตราสำเร็จสูง โอกาสได้ผลดีก็ยิ่งสูงตาม',
  },
  {
    heading: 'ความเสี่ยงและสถานะเจ้าหน้าที่',
    body: 'ถ้าไม่สำเร็จ มีโอกาสที่เจ้าหน้าที่จะ "บาดเจ็บ" (อัตราสำเร็จลดลงชั่วคราวจนกว่าจะฟื้น) หรือแย่กว่านั้นคือ "หมดสติ" (ใช้งานไม่ได้ชั่วคราว) ถ้าเจ้าหน้าที่ภาคสนามทั้งสองคนหมดสติพร้อมกัน จะเข้าสู่ภาวะวิกฤต นับถอยหลัง 3 ชั่วโมง ถ้าไม่มีใครฟื้นทัน เกมจะจบทันที',
  },
  {
    heading: 'คะแนนและแรงก์',
    body: 'จบเกมแล้วจะได้คะแนน 0–1,200 พร้อมแรงก์ S ถึง E คะแนนมาจาก 3 ส่วน: จำนวนคนที่ช่วยได้ (เต็ม 780) · กระจายไปได้กี่โซน (เต็ม 240) · รักษาทีมไว้ได้แค่ไหน ยิ่งบาดเจ็บ/หมดสติบ่อยยิ่งหักเยอะ (เต็ม 180) ถ้าจบเพราะภาคสนามหมดสติทั้งคู่ คะแนนที่ได้จะถูกคูณ 0.6 · เกมจบเมื่อครบ 72 ชั่วโมง หรือไม่มีใครเหลือให้ช่วยแล้ว',
  },
];

export function renderHowToPlay(root, { onBack } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--howto');

  root.appendChild(buildSubHeader('HOW TO PLAY', onBack));

  const article = document.createElement('div');
  article.className = 'howto-body';
  for (const { heading, body } of HOW_TO_PLAY_SECTIONS) {
    const h = document.createElement('div');
    h.className = 'howto-heading';
    h.textContent = heading;
    const p = document.createElement('div');
    p.className = 'howto-text';
    p.textContent = body;
    article.append(h, p);
  }
  root.appendChild(article);
  root.appendChild(buildBackToMenu(onBack));
}

// หน้า Operator — เมนูย่อยของ Intel (Field operator / Baseplate)
const OPERATOR_SIDES = {
  field: { title: 'FIELD OPERATOR', keys: ['human', 'cat'] },
  baseplate: { title: 'BASEPLATE', keys: ['elf', 'spirit'] },
};

function portraitSrc(speciesKey) {
  return `assets/characters/${OPERATORS[speciesKey].portraits.normal}`;
}

export function renderOperatorMenu(root, { onBack, onNavigate } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--intel');

  root.appendChild(buildSubHeader('OPERATORS', onBack));

  const nav = document.createElement('nav');
  nav.className = 'intel-nav';
  const items = [
    { id: 'field', label: 'Field operator' },
    { id: 'baseplate', label: 'Baseplate' },
  ];
  for (const { id, label } of items) {
    const btn = document.createElement('button');
    btn.className = 'intel-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => onNavigate?.(id));
    nav.appendChild(btn);
  }
  root.appendChild(nav);
  root.appendChild(buildBackToMenu(onBack));
}

// รายชื่อ จนท. ในฝ่ายที่เลือก (Field operator / Baseplate) — แต่ละแถวมีรูปย่อ + ชื่อ + codename
export function renderOperatorRoster(root, { side, onBack, onSelect } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--roster');

  const { title, keys } = OPERATOR_SIDES[side];
  root.appendChild(buildSubHeader(title, onBack));

  const list = document.createElement('div');
  list.className = 'roster-list';
  for (const key of keys) {
    const op = OPERATORS[key];
    const intel = OPERATOR_INTEL[key];

    const row = document.createElement('button');
    row.className = 'roster-row';
    row.addEventListener('click', () => onSelect?.(key));

    const thumb = document.createElement('img');
    thumb.className = 'roster-thumb';
    thumb.src = portraitSrc(key);
    thumb.alt = op.name;

    const text = document.createElement('div');
    text.className = 'roster-text';
    const name = document.createElement('div');
    name.className = 'roster-name';
    name.textContent = op.name;
    const sub = document.createElement('div');
    sub.className = 'roster-sub';
    sub.textContent = intel.codename;
    text.append(name, sub);

    row.append(thumb, text);
    list.appendChild(row);
  }
  root.appendChild(list);
  root.appendChild(buildBackToMenu(onBack));
}

// การ์ดข้อมูล จนท. รายตัว — รูป + Name/Codename/Age/Unit + bio/สกิลเลื่อนดูได้
export function renderOperatorCard(root, { speciesKey, onBack } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--card');

  const op = OPERATORS[speciesKey];
  const intel = OPERATOR_INTEL[speciesKey];

  root.appendChild(buildSubHeader(op.name, onBack));

  const top = document.createElement('div');
  top.className = 'card-top';

  const portrait = document.createElement('img');
  portrait.className = 'card-portrait';
  portrait.src = portraitSrc(speciesKey);
  portrait.alt = op.name;

  const facts = document.createElement('div');
  facts.className = 'card-facts';
  const rows = [
    ['Name', intel.fullName],
    ['Codename', intel.codename],
    ['Age', intel.age],
    ['Unit', intel.unit],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = `${label}: `;
    row.append(b, document.createTextNode(value));
    facts.appendChild(row);
  }

  top.append(portrait, facts);
  root.appendChild(top);

  const body = document.createElement('div');
  body.className = 'card-body';
  for (const p of intel.bio) {
    const para = document.createElement('div');
    para.className = 'card-text';
    para.textContent = p;
    body.appendChild(para);
  }

  const skillsHeading = document.createElement('div');
  skillsHeading.className = 'card-heading';
  skillsHeading.textContent = 'สกิล';
  body.appendChild(skillsHeading);

  for (const skill of intel.skills) {
    const name = document.createElement('div');
    name.className = 'card-skill-name';
    name.textContent = skill.name;
    const desc = document.createElement('div');
    desc.className = 'card-text';
    desc.textContent = skill.desc;
    body.append(name, desc);
  }

  root.appendChild(body);
}

// เชื่อม flow: splash → menu → (settings/intel/quit จริง / blank สำหรับที่เหลือ) → กลับ menu ได้
export function initScreens(root) {
  // ทุกการเปลี่ยนหน้าเฟดผ่านสีดำ (ui/fx.js) — หน้าเมนูย่อยเฟดเร็ว
  // ส่วนเมนู → บรีฟ → เกม เฟดช้ากว่า ให้รู้สึกว่าเป็นการ "เข้าฉาก" จริง ๆ
  const quick = (fn) => fadeSwap(fn, { inMs: 170, outMs: 200, hold: 40 });
  const scene = (fn) => fadeSwap(fn, { inMs: 520, outMs: 620, hold: 220 });

  // เพลงหน้าเมนู — เล่นวนซ้ำ และ "ไม่เริ่มใหม่" เมื่อเดินไป Settings/Intel แล้วกลับมา
  // (setBgm ข้ามการเริ่มใหม่ให้เองถ้าเป็นเพลงเดิม — ดู ui/audio.js)
  const menuBgm = () => setBgm('menu');

  const showMenu = () => quick(() => { clearFx(); menuBgm(); renderMenu(root, { onNavigate: onMenuNavigate }); });
  const showBlank = (id, backTo = showMenu) => quick(() => { menuBgm(); renderBlank(root, { label: id, onBack: backTo }); });
  const showSettings = () => quick(() => { menuBgm(); renderSettingsMenu(root, { onBack: showMenu }); });
  const showQuit = () => renderQuit(root);
  const showIntel = () => quick(() => { menuBgm(); renderIntelMenu(root, { onBack: showMenu, onNavigate: onIntelNavigate }); });
  const showHowTo = () => quick(() => { menuBgm(); renderHowToPlay(root, { onBack: showIntel }); });
  const showOperatorMenu = () => quick(() => { menuBgm(); renderOperatorMenu(root, { onBack: showIntel, onNavigate: onOperatorNavigate }); });
  const showRoster = (side) => quick(() => { menuBgm(); renderOperatorRoster(root, { side, onBack: showOperatorMenu, onSelect: (key) => showCard(key, side) }); });
  const showCard = (speciesKey, side) => quick(() => { menuBgm(); renderOperatorCard(root, { speciesKey, onBack: () => showRoster(side) }); });
  // Play -> Tutorial (visual novel) -> หน้าเกมหลัก -> หน้า Result
  // เล่นใหม่จากหน้า Result ข้าม tutorial ไปเลย (renderGameScreen รีเซ็ต state ให้เองอยู่แล้ว)
  const showGame = () => scene(() => { clearFx(); renderGameScreen(root, { onExit: showMenu, onFinish: showResult }); });
  const showResult = () => quick(() => { clearFx(); renderResult(root, { state, onHome: showMenu, onReplay: showGame }); });
  // กด Play = เพลงเมนูหยุดทันที (เจ้าของสั่งไว้) หน้าบรีฟจึงเงียบ
  const showTutorial = () => { setBgm(null); scene(() => renderTutorial(root, { onFinish: showGame })); };

  function onMenuNavigate(id) {
    if (id === 'settings') showSettings();
    else if (id === 'quit') showQuit();
    else if (id === 'intel') showIntel();
    else if (id === 'play') showTutorial();
    else showBlank(id);
  }

  function onIntelNavigate(id) {
    if (id === 'howto') showHowTo();
    else if (id === 'operator') showOperatorMenu();
    else showBlank(id, showIntel);
  }

  function onOperatorNavigate(id) {
    showRoster(id); // 'field' หรือ 'baseplate'
  }

  // หน้าปกเป็นหน้าแรกสุด ไม่ต้องเฟด (ยังไม่มีหน้าก่อนหน้าให้เฟดออกจาก)
  renderSplash(root, { onContinue: showMenu });
}
