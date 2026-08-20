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

function buildVersionTag(text) {
  const tag = document.createElement('div');
  tag.className = 'version-tag';
  tag.textContent = text;
  return tag;
}

export function renderSplash(root, { onContinue } = {}) {
  root.innerHTML = '';
  root.classList.add('screen--splash');
  root.classList.remove('screen--menu', 'screen--blank');

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
  root.classList.add('screen--menu');
  root.classList.remove('screen--splash', 'screen--blank');

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

// หน้าว่างชั่วคราว — ใช้แทนหน้า Play/Settings/Intel/Quit จนกว่าจะสั่งให้ทำจริง
export function renderBlank(root, { label = '', onBack } = {}) {
  root.innerHTML = '';
  root.classList.add('screen--blank');
  root.classList.remove('screen--splash', 'screen--menu');

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

// เชื่อม flow: splash → menu → (blank ตามปุ่มที่กด) → กลับ menu ได้
export function initScreens(root) {
  const showMenu = () => renderMenu(root, { onNavigate: showBlank });
  const showBlank = (id) => renderBlank(root, { label: id, onBack: showMenu });
  renderSplash(root, { onContinue: showMenu });
}
