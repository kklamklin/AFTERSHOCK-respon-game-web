// §I เริ่มและจบเกม (gameflowspec.md) — หน้าปก, เมนูหลัก, และหน้าปลายทางชั่วคราว
// ตอนนี้ทำแค่หน้าปก + เมนูหลัก ตามที่สั่ง — ปุ่มเมนู (Play/Settings/Intel/Quit)
// ยังไม่เชื่อมไปหน้าจริง กดแล้วไปหน้าว่างชั่วคราวก่อน (renderBlank)

// ลำดับต้องตรงกับหน้าตาดราฟ: มนุษย์(หน้ากาก) → แมว → เอลฟ์(Lia) → ภูต(Mudongzock)
// ยังไม่มี asset ไอคอนจิบิจริง ใช้ emoji วางตำแหน่งจองไว้ก่อน สลับเป็นรูปจริงทีหลังได้โดยไม่ต้องแก้โครงสร้าง
const OPERATOR_CHIBI_PLACEHOLDERS = [
  { emoji: '🥽', ring: '#e8703a' }, // Robertson
  { emoji: '🐱', ring: '#2b2b2b' }, // Lyla
  { emoji: '🧝', ring: '#e0b23c' }, // Lia
  { emoji: '👻', ring: '#5b8fd6' }, // Mudongzock
];

function buildLogo({ size = 'lg', subtitle = 'Response' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = `logo-block logo-block--${size}`;

  const title = document.createElement('div');
  title.className = 'logo-title';
  title.textContent = 'AFTERSHOCKS';

  const sub = document.createElement('div');
  sub.className = 'logo-subtitle';
  sub.textContent = subtitle;

  const icons = document.createElement('div');
  icons.className = 'logo-icons';
  for (const { emoji, ring } of OPERATOR_CHIBI_PLACEHOLDERS) {
    const icon = document.createElement('div');
    icon.className = 'chibi-slot';
    icon.style.setProperty('--ring', ring);
    icon.textContent = emoji;
    icons.appendChild(icon);
  }

  wrap.append(title, sub, icons);
  return wrap;
}

const SCREEN_CLASSES = [
  'screen--splash', 'screen--menu', 'screen--blank', 'screen--settings',
  'screen--quit', 'screen--intel', 'screen--howto',
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

  const top = document.createElement('div');
  top.className = 'menu-top';
  top.appendChild(buildLogo({ size: 'sm' }));
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
function buildSlider(label, value) {
  const row = document.createElement('div');
  row.className = 'settings-row';

  const name = document.createElement('span');
  name.className = 'settings-label';
  name.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.value = String(value);
  input.className = 'settings-slider';

  row.append(name, input);
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
  body.append(buildSlider('Volume', 90), buildSlider('Brightness', 40));
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
    body: 'คุณเป็นผู้บัญชาการศูนย์กู้ภัย ส่งเจ้าหน้าที่ 4 คนเข้าไปช่วยผู้รอดชีวิต 1,200 คน ที่ติดอยู่ใน 48 โซนทั่วเมืองที่เกิดแผ่นดินไหว ภายในเวลา 72 ชั่วโมงในเกม (เล่นจริงประมาณ 10 นาที)',
  },
  {
    heading: 'การควบคุมเวลา',
    body: 'เกมเดินเวลาอัตโนมัติตั้งแต่กดเริ่ม ใช้ปุ่ม ⏸ หยุด / ▶ เดินปกติ / ⏩ เร่งความเร็ว ปรับได้ตลอดเวลา เวลาจะหยุดอัตโนมัติเมื่อลากไอคอนสั่งงาน หรือมีเจ้าหน้าที่บาดเจ็บ',
  },
  {
    heading: 'โซนและผู้รอดชีวิต',
    body: 'เมืองแบ่งเป็น 48 โซน 3 ระดับ: เทา (เสี่ยงต่ำ) เหลือง (เสี่ยงปานกลาง) แดง (เสี่ยงสูง) แต่ละโซนมีคนติดอยู่ไม่เท่ากัน และจะค่อย ๆ เสียชีวิตไปเรื่อย ๆ ถ้าไม่ได้รับความช่วยเหลือ — โซนยิ่งอันตราย คนยิ่งตายเร็ว ต้องรีบตัดสินใจว่าจะช่วยที่ไหนก่อน',
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
    heading: 'คะแนน',
    body: 'ช่วยคนได้ +1 คะแนนต่อคน เสียคนไป −1 คะแนนต่อคน เกมจบเมื่อครบ 72 ชั่วโมง หรือไม่มีใครเหลือให้ช่วยแล้ว',
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

// เชื่อม flow: splash → menu → (settings/intel/quit จริง / blank สำหรับที่เหลือ) → กลับ menu ได้
export function initScreens(root) {
  const showMenu = () => renderMenu(root, { onNavigate: onMenuNavigate });
  const showBlank = (id, backTo = showMenu) => renderBlank(root, { label: id, onBack: backTo });
  const showSettings = () => renderSettingsMenu(root, { onBack: showMenu });
  const showQuit = () => renderQuit(root);
  const showIntel = () => renderIntelMenu(root, { onBack: showMenu, onNavigate: onIntelNavigate });
  const showHowTo = () => renderHowToPlay(root, { onBack: showIntel });

  function onMenuNavigate(id) {
    if (id === 'settings') showSettings();
    else if (id === 'quit') showQuit();
    else if (id === 'intel') showIntel();
    else showBlank(id);
  }

  function onIntelNavigate(id) {
    if (id === 'howto') showHowTo();
    else showBlank(id, showIntel); // 'operator' — ยังไม่ทำ กลับไปเมนู intel ไม่ใช่เมนูหลัก
  }

  renderSplash(root, { onContinue: showMenu });
}
