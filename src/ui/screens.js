// §I เริ่มและจบเกม (gameflowspec.md) — หน้าปก, เมนูหลัก, และหน้าปลายทางชั่วคราว
// ตอนนี้ทำแค่หน้าปก + เมนูหลัก ตามที่สั่ง — ปุ่มเมนู (Play/Settings/Intel/Quit)
// ยังไม่เชื่อมไปหน้าจริง กดแล้วไปหน้าว่างชั่วคราวก่อน (renderBlank)

import { OPERATORS } from '../data/operators.js';
import { OPERATOR_INTEL } from '../data/operatorIntel.js';
import { renderTutorial } from './tutorial.js';
import { renderGameScreen } from './gameScreen.js';
import { renderResult } from './result.js';
import { runQtePractice } from './qte.js';
import { state } from '../state.js';
import { iconNode } from '../data/icons.js';
import { fadeSwap, clearFx } from './fx.js';
import { buildSkyline } from './skyline.js';
import { setBgm } from './audio.js';
import {
  getPrefs, setPref, onPrefsChange, brightnessFactor,
  isDlcUnlocked, setDlcUnlocked, getGameOptions, setGameOption,
  isLowGraphics, setLowGraphics, onLowGraphicsChange,
} from '../data/prefs.js';
import { CONFIG } from '../config.js';

// ความสว่างหน้าจอ — ผูกครั้งเดียวตอนโหลด แล้วอัปเดตเองทุกครั้งที่ค่าเปลี่ยน
// ใส่ที่ <html> เพื่อให้ครอบทั้งหน้าจอเกมและชั้นเอฟเฟกต์ (ui/fx.js) ที่อยู่นอก #screen-root
// ⚠️ ติด class `is-dimmed` เฉพาะตอนความสว่างไม่ใช่ค่าปกติ — filter ที่เปิดค้างไว้
// (แม้จะเป็น brightness(1) ที่ไม่เปลี่ยนอะไรเลย) บังคับให้เบราว์เซอร์วาดทั้งเวทีใหม่ทุกเฟรม
// บน iOS อาการคือเกมหนืดตลอดเวลา ทั้งที่ภาพเหมือนเดิมเป๊ะ
onPrefsChange((prefs) => {
  const f = brightnessFactor(prefs.brightness);
  document.documentElement.style.setProperty('--ui-brightness', f);
  document.documentElement.classList.toggle('is-dimmed', Math.abs(f - 1) > 0.001);
});

// โหมดกราฟิกต่ำ — ติดคลาสที่ <html> แล้วให้ CSS ตัดเอฟเฟกต์เอง (ดูท้าย styles.css)
// ทำที่นี่ที่เดียว หน้าจออื่นไม่ต้องรู้เรื่องเลย เปลี่ยนค่าปุ๊บมีผลทุกหน้าทันที
onLowGraphicsChange((on) => {
  document.documentElement.classList.toggle('is-low-gfx', on);
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
  'screen--game', 'screen--result', 'screen--mode', 'screen--dlccode',
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

// ปุ่มติ๊ก 1 แถวในหน้า Settings — อ่าน/เขียนค่าเองผ่านฟังก์ชันที่ส่งเข้ามา
function buildToggle(label, note, read, write) {
  const row = document.createElement('button');
  row.className = 'settings-toggle';
  row.setAttribute('role', 'switch');

  const box = document.createElement('span');
  box.className = 'settings-toggle-box';
  box.textContent = '✓'; // ซ่อน/โชว์ด้วย CSS ตามสถานะ ไม่ต้องเขียน DOM ซ้ำตอนสลับ

  const text = document.createElement('span');
  text.className = 'settings-toggle-label';
  text.textContent = label;

  const hint = document.createElement('span');
  hint.className = 'settings-toggle-note';
  hint.textContent = note;

  row.append(box, text, hint);
  const paint = () => {
    const on = read();
    row.classList.toggle('is-on', on);
    row.setAttribute('aria-checked', String(on));
  };
  row.addEventListener('click', () => { write(!read()); paint(); });
  paint();
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
  body.append(
    buildSlider('Volume', 'volume'),
    buildSlider('Brightness', 'brightness'),
    buildToggle('Low graphics', 'สำหรับมือถือรุ่นเล็ก — ลดแสง การสั่น และเอฟเฟกต์ ให้เกมลื่นขึ้น',
                isLowGraphics, setLowGraphics),
  );
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

// ── หน้าเลือกโหมด (กด Play แล้วมาที่นี่ก่อน) ─────────────────────
// เพิ่มโหมดใหม่ = เพิ่มบรรทัดในตารางนี้ที่เดียว ไม่ต้องแตะโค้ดข้างล่าง
//   locked: true  = ยังเล่นไม่ได้ ขึ้นป้าย SOON กดไม่ติด
//   id ที่ส่งออกไปทาง onPlay จะถูกเอาไปเลือกว่าจะเริ่มเกมแบบไหน
export const GAME_MODES = [
  {
    id: 'main',
    label: 'Main',
    desc: 'ภารกิจหลัก · ผู้รอดชีวิต 1,200 คน 47 โซน ใน 72 ชั่วโมง',
    locked: false,
  },
  {
    id: 'building21',
    label: 'Building 21',
    desc: 'ต้องใส่รหัสผ่านก่อนเข้า',
    locked: false,
    gated: true, // ยังกดเข้าได้ปกติ แต่ระหว่างทางต้องผ่านหน้ารหัสผ่านก่อน (ดู renderAccessCode ด้านล่าง)
  },
];

// ตัวเลือกย่อยใต้รายการโหมด — ค่าจริงกับค่าเริ่มต้นอยู่ที่ data/prefs.js (OPT_DEFAULTS)
// ที่นี่เก็บแค่ "ข้อความที่ผู้เล่นเห็น" เพิ่มตัวเลือกใหม่ = เพิ่มบรรทัดที่นี่ + ที่ OPT_DEFAULTS
const MODE_OPTIONS = [
  { key: 'skipStory', label: 'ข้ามเนื้อเรื่อง', note: 'ไม่ต้องดูฉากสอนเล่น เข้าเกมเลย' },
  { key: 'hints', label: 'คำใบ้ในเกม', note: 'บอกว่าสกิลใช้ยังไง ต้องกด/ลากตรงไหน' },
];

export function renderModeSelect(root, { onBack, onPlay, onGated } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--mode');

  root.appendChild(buildSubHeader('SELECT OPERATION', onBack));

  // โหมดที่เลือกอยู่ตอนนี้ — เริ่มที่ตัวแรกที่ยังไม่ล็อก (ปกติคือ Main)
  let picked = GAME_MODES.findIndex((m) => !m.locked);
  if (picked < 0) picked = 0;

  const list = document.createElement('div');
  list.className = 'mode-list';

  const rows = GAME_MODES.map((mode, i) => {
    const row = document.createElement('button');
    row.className = 'mode-row';
    row.disabled = !!mode.locked;
    if (mode.locked) row.classList.add('is-locked');

    const main = document.createElement('div');
    main.className = 'mode-row-main';

    const label = document.createElement('span');
    label.className = 'mode-label';
    label.textContent = mode.label;
    main.appendChild(label);

    if (mode.locked) {
      const tag = document.createElement('span');
      tag.className = 'mode-tag';
      tag.textContent = 'SOON';
      main.appendChild(tag);
    } else if (mode.gated && !isDlcUnlocked()) {
      const tag = document.createElement('span');
      tag.className = 'mode-tag mode-tag--gated';
      tag.textContent = 'PASSCODE';
      main.appendChild(tag);
    }

    const desc = document.createElement('span');
    desc.className = 'mode-desc';
    // ปลดล็อกแล้ว (เครื่องนี้เคยใส่รหัสถูก) — โชว์คำอธิบายจริงแทนคำเชิญใส่รหัส
    desc.textContent = mode.gated && isDlcUnlocked() ? 'ปลดล็อกแล้ว — กด PLAY เข้าเลย' : mode.desc;

    row.append(main, desc);
    // โหมดที่ล็อกอยู่กดไม่ติด (ปุ่ม disabled ไม่ยิง click อยู่แล้ว)
    row.addEventListener('click', () => { picked = i; paint(); });
    list.appendChild(row);
    return row;
  });

  root.appendChild(list);

  // ── ตัวเลือกย่อย — เปิด/ปิดได้ ค่าถูกจำไว้ในเครื่อง (data/prefs.js) ──
  // ทั้งสองตัวเริ่มต้นเป็นเปิดตามที่เจ้าของสั่ง
  const opts = document.createElement('div');
  opts.className = 'mode-opts';
  for (const { key, label, note } of MODE_OPTIONS) {
    const t = document.createElement('button');
    t.className = 'mode-opt';
    t.dataset.opt = key;
    t.setAttribute('role', 'switch');

    const box = document.createElement('span');
    box.className = 'mode-opt-box';
    box.textContent = '✓'; // ซ่อน/โชว์ด้วย CSS ตามสถานะ จะได้ไม่ต้องเขียน DOM ซ้ำตอนสลับ

    const text = document.createElement('span');
    text.className = 'mode-opt-label';
    text.textContent = label;

    const hint = document.createElement('span');
    hint.className = 'mode-opt-note';
    hint.textContent = note;

    t.append(box, text, hint);
    const paintOpt = () => {
      const on = getGameOptions()[key];
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-checked', String(on));
    };
    t.addEventListener('click', () => { setGameOption(key, !getGameOptions()[key]); paintOpt(); });
    paintOpt();
    opts.appendChild(t);
  }
  root.appendChild(opts);

  // ปุ่ม PLAY มุมขวาล่าง — ยืนยันโหมดที่เลือก
  const play = document.createElement('button');
  play.className = 'mode-play';
  play.innerHTML = '<span>PLAY</span><span class="mode-play-arrow">▸</span>';
  play.addEventListener('click', () => {
    const mode = GAME_MODES[picked];
    if (!mode || mode.locked) return;
    detachKeys();
    // โหมดที่ต้องมีรหัสผ่านและเครื่องนี้ยังไม่เคยปลดล็อก — แวะหน้าใส่รหัสก่อน ยังไม่เข้าเกม
    if (mode.gated && !isDlcUnlocked()) onGated?.(mode.id);
    else onPlay?.(mode.id);
  });
  root.appendChild(play);

  function paint() {
    rows.forEach((row, i) => row.classList.toggle('is-picked', i === picked));
  }
  paint();

  // คีย์ลัดสำหรับเล่นบนคอม — ขึ้น/ลง เลือกโหมด · Enter เริ่ม · Esc ย้อนกลับ
  // (ข้ามโหมดที่ล็อกไปเลย จะได้ไม่ค้างอยู่บนตัวที่กดไม่ได้)
  function onKey(e) {
    if (e.key === 'Escape') { detachKeys(); onBack?.(); return; }
    // ถ้ากำลังโฟกัสอยู่ที่ปุ่มตัวเลือกย่อย (เดินมาด้วย Tab) ปล่อยให้ Enter/เว้นวรรค
    // ไปสลับตัวเลือกนั้นตามปกติของปุ่ม ไม่ใช่เริ่มเกม
    if (document.activeElement?.closest('.mode-opts')) return;
    if (e.key === 'Enter') { play.click(); return; }
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    for (let n = 1; n <= GAME_MODES.length; n++) {
      const i = (picked + step * n + GAME_MODES.length * n) % GAME_MODES.length;
      if (!GAME_MODES[i].locked) { picked = i; paint(); break; }
    }
  }
  function detachKeys() { document.removeEventListener('keydown', onKey); }
  document.addEventListener('keydown', onKey);

  root.appendChild(buildBackToMenu(() => { detachKeys(); onBack?.(); }));
}

// ── หน้าใส่รหัสผ่าน Building 21 ───────────────────────────────────
// รหัสถูกครั้งเดียว → จำไว้ในเครื่อง (localStorage) ไม่ต้องพิมพ์ซ้ำอีก — ดู data/prefs.js
// รหัสจริงอยู่ที่ CONFIG.dlcAccessCode ที่เดียว (config.js) เจ้าของเป็นคนแจกให้ผู้เล่นเอง
export function renderAccessCode(root, { onBack, onSuccess } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--dlccode');

  root.appendChild(buildSubHeader('BUILDING 21 — ACCESS CODE', onBack));

  const wrap = document.createElement('div');
  wrap.className = 'dlccode-wrap';

  const hint = document.createElement('p');
  hint.className = 'dlccode-hint';
  hint.textContent = 'กรอกรหัสผ่าน 15 หลักที่ได้รับ';
  wrap.appendChild(hint);

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.maxLength = 15;
  input.className = 'dlccode-input';
  input.placeholder = '••••••••••••••';
  // รับเฉพาะตัวเลข — พิมพ์อย่างอื่นแล้วถูกตัดทิ้งทันที ไม่ต้องรอกด submit ถึงจะรู้ว่าผิด
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 15);
    error.textContent = '';
  });
  wrap.appendChild(input);

  const error = document.createElement('p');
  error.className = 'dlccode-error';
  wrap.appendChild(error);

  const submit = document.createElement('button');
  submit.className = 'dlccode-submit';
  submit.textContent = 'ยืนยัน';
  wrap.appendChild(submit);

  function trySubmit() {
    if (input.value === CONFIG.dlcAccessCode) {
      setDlcUnlocked();
      onSuccess?.();
      return;
    }
    error.textContent = 'รหัสไม่ถูกต้อง';
    wrap.classList.remove('is-shake'); // รีทริกเกอร์แอนิเมชันสั่นได้ต่อเนื่องแม้พิมพ์ผิดซ้ำ ๆ
    void wrap.offsetWidth;
    wrap.classList.add('is-shake');
  }
  submit.addEventListener('click', trySubmit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') trySubmit(); });

  root.appendChild(wrap);
  root.appendChild(buildBackToMenu(() => onBack?.()));
  input.focus();
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

// เนื้อหาคู่มือละเอียด — ตัวเลขทุกตัวตรงกับ src/config.js ของจริง
// ⚠️ แก้บาลานซ์ใน config เมื่อไหร่ ต้องกลับมาไล่แก้ตัวเลขในนี้ด้วย ไม่งั้นคู่มือจะโกหกผู้เล่น
// รูปแบบของแต่ละหัวข้อ: heading + (body ย่อหน้า / bullets รายการ / rows ตาราง) เลือกใส่ได้อิสระ
const HOW_TO_PLAY_SECTIONS = [
  {
    heading: '1 · เป้าหมายของเกม',
    body: 'คุณคือผู้บัญชาการศูนย์กู้ภัย มีเจ้าหน้าที่ 4 คน ผู้รอดชีวิต 1,200 คนติดอยู่ใน 47 โซนทั่วเมือง และเวลา 72 ชั่วโมงในเกม (เล่นจริงราว 10 นาทีที่ความเร็วปกติ) เป้าหมายคือช่วยคนให้ได้มากที่สุดโดยไม่ทำให้ทีมล้มก่อน เกมจบเมื่อครบ 72 ชั่วโมง · ไม่มีใครเหลือให้ช่วย · หรือแพ้เพราะภาคสนามหมดสติทั้งคู่',
  },
  {
    heading: '2 · หน้าจอเกม',
    bullets: [
      'แถบบน — ซ้ายมีปุ่ม ☰ เมนู และแต้ม AP · กลางคือปุ่มเวลาบอกชั่วโมงปัจจุบัน (กดเพื่อดูหน้าเวลาที่เหลือ) · ขวาคือปุ่มหยุด/เดินเวลา กับปุ่มความเร็ว 1x/2x',
      'สองข้างจอ — การ์ดเจ้าหน้าที่ 4 คน ซ้ายเป็นภาคสนาม (Robertson, Lyla) ขวาเป็นภาคฐาน (Lia, Mudongzock) แต่ละการ์ดมีรูป แถบเปอร์เซ็นต์ความพร้อม และไอคอนสกิลพร้อมราคา AP',
      'กลางจอ — แผนที่ 47 โซน ซูมและปัดได้ด้วยปุ่ม + − ⌖ มุมล่างซ้าย',
      'มุมขวาบนของแผนที่ — Detail Feed การ์ดสรุปผลภารกิจที่เพิ่งจบ',
      'แถบล่าง — สรุปสถานการณ์แยกตามระดับโซน Ⓐ เทา Ⓑ เหลือง Ⓒ แดง บอก %เสียชีวิต %เคลียร์ และ %ประชากรที่เหลือ · ตอนลากไอคอนอยู่ แถบนี้จะสลับเป็นแผงข้อมูลของโซนใต้ปลายนิ้ว',
    ],
  },
  {
    heading: '3 · เวลาและความเร็ว',
    bullets: [
      'เวลาเดินเองตั้งแต่เข้าเกม 1 ชั่วโมงในเกมแบ่งเป็น 2 ลูป (ลูปละ 30 นาที) รวมทั้งเกม 144 ลูป',
      'ปุ่มหยุด/เดินต่อ และปุ่ม 1x/2x แยกกันคนละปุ่ม กดหยุดแล้วความเร็วที่เลือกไว้ยังอยู่เหมือนเดิม',
      'ที่ 1x ทั้งเกมยาวราว 10 นาทีจริง · ที่ 2x ราว 5.8 นาที',
      'เวลาจะหยุดให้อัตโนมัติเฉพาะตอนลากไอคอนสกิล เลือกสกิลด้วยคีย์ลัด เปิดเมนู ☰ หรือเล่นมินิเกม QTE — ปล่อยแล้วเดินต่อเอง (เกมไม่มีป๊อปอัพหยุดเวลาแล้ว)',
      'ตอนลากไอคอนหรือเล่น QTE เวลาหยุดแต่เพลงยังเล่นต่อ ส่วนการกดหยุดเองหรือเปิดเมนูจะหยุดเพลงด้วย',
    ],
  },
  {
    heading: '4 · โซนและการตายของผู้รอดชีวิต',
    body: 'เมืองมี 47 โซน แบ่งเป็น 3 ระดับตามความอันตราย ยิ่งอันตรายยิ่งมีคนเยอะและตายเร็ว โซนที่คนตายหมดจะกลายเป็นสีเขียวเหมือนกัน แต่คุณไม่ได้คะแนนจากมัน',
    rows: [
      ['โซนเทา Ⓐ', '26 โซน · โซนละ 14–18 คน · อยู่ได้ 80 ชั่วโมง'],
      ['โซนเหลือง Ⓑ', '13 โซน · โซนละ 24–32 คน · อยู่ได้ 66 ชั่วโมง'],
      ['โซนแดง Ⓒ', '8 โซน · โซนละ 46–58 คน · อยู่ได้ 54 ชั่วโมง'],
    ],
  },
  {
    heading: '5 · Action Point (AP)',
    bullets: [
      'เริ่มเกมด้วย 80 AP และได้เพิ่มทุกต้นชั่วโมง',
      'ชั่วโมง 0–23 ได้ 25/ชม. · ชั่วโมง 24–47 ได้ 15/ชม. · ชั่วโมง 48 เป็นต้นไปได้ 8/ชม.',
      'สังเกตว่า AP หนักที่ช่วงต้นเกมโดยตั้งใจ — ช่วงแรกคือช่วงที่คุ้มที่สุดในการลงทุน เพราะโซนยังมีคนเต็ม',
      'ทั้งเกมได้ AP รวมราว 1,215 แต้ม ใช้ไม่มีทางพอทุกอย่าง ต้องเลือกว่าจะทุ่มตรงไหน',
    ],
  },
  {
    heading: '6 · วิธีสั่งงาน (ลากวาง)',
    bullets: [
      'ลากไอคอนสกิลจากการ์ดเจ้าหน้าที่ไปวางบนโซนที่ต้องการ ปล่อยมือ = ยืนยันทันที ไม่มีหน้ายืนยันซ้ำ ยกเลิกไม่ได้',
      'ระหว่างลาก เวลาหยุดให้เอง โซนที่ลงไม่ได้จะขึ้นกากบาท และแถบล่างจะกางข้อมูลของโซนใต้ปลายนิ้วให้ดูก่อนตัดสินใจ',
      'ปล่อยนอกโซนที่ลงได้ = ยกเลิกเงียบ ๆ ไม่เสีย AP',
      'Air Deploy ของ Mudongzock กดที่ไอคอนได้เลย ไม่ต้องลาก เพราะมันบัฟทั้งแผนที่ ไม่มีโซนให้เลือก',
    ],
  },
  {
    heading: '7 · แผงข้อมูลตอนลาก อ่านยังไง',
    bullets: [
      'คนติดอยู่ — จำนวนคนที่ยังรอดในโซนนั้นตอนนี้',
      'อัตราตาย — คนหายไปกี่คนต่อชั่วโมงถ้าไม่มีใครช่วย',
      'บัฟที่มี — บัฟที่ลงไว้บนโซนนั้นและยังไม่หมดอายุ',
      'อัตราสำเร็จ — ตัวเลขสำคัญที่สุด คิดจาก ฐานของเจ้าหน้าที่ + บัฟรวม − ความเสี่ยงพื้นที่ − 20 ถ้ากำลังบาดเจ็บ (เพดาน 99%)',
      'เสี่ยงบาดเจ็บ — โอกาสที่เจ้าหน้าที่จะเจ็บ ถ้าภารกิจนี้ล้มเหลว',
      'ค่าใช้จ่าย — AP ที่จะถูกหักทันที และเวลาที่เจ้าหน้าที่จะไม่ว่างไปกี่ชั่วโมง',
    ],
  },
  {
    heading: '8 · เจ้าหน้าที่ภาคสนาม',
    body: 'สองคนนี้คือคนที่ลงไปช่วยจริง ราคาและเวลาต่างกันตามระดับโซน ตัวเลขในวงเล็บคืออัตราสำเร็จเมื่อยังไม่มีบัฟใด ๆ',
    rows: [
      ['Robertson (AF-01) ฐาน 75', 'เทา 6 AP · 1 ชม. (65%) — เหลือง 12 AP · 2 ชม. (50%) — แดง 20 AP · 3 ชม. (35%)'],
      ['Lyla (AF-02) ฐาน 90', 'เทา 10 AP · 1 ชม. (80%) — เหลือง 18 AP · 1 ชม. (65%) — แดง 30 AP · 2 ชม. (50%)'],
    ],
  },
  {
    heading: '9 · สกิลบัฟ (ภาคฐาน + Robertson)',
    body: 'บัฟไม่ได้ช่วยคนเอง แต่ไปบวกอัตราสำเร็จให้ภารกิจในโซนนั้น ลงทับโซนที่มีเจ้าหน้าที่กำลังทำงานอยู่ได้ — นี่คือคอมโบหลักของเกม',
    rows: [
      ['Crowd Control (Robertson)', '+25 · 10 AP · อยู่ 3 ชม. · คูลดาวน์ 3 ชม. · ลงได้เฉพาะโซนที่มีเจ้าหน้าที่อยู่ · ล็อกตัว Robertson 3 ชม.'],
      ['Scan Area (Lia)', '+15 · 10 AP · อยู่ 3 ชม. · ไม่มีคูลดาวน์ แต่มีโควตา 5 ช่อง (คืนช่องเมื่อบัฟหมดอายุ) · ชะลอการตายในโซนนั้น 50%'],
      ['Alert Allied (Lia)', '+0 · 15 AP · อยู่ 3 ชม. · คูลดาวน์ 3 ชม. · ไม่เพิ่มโอกาสสำเร็จ แต่การันตีว่าเจ้าหน้าที่ในโซนนั้นจะไม่บาดเจ็บเลย'],
      ['Air Deploy (Mudongzock)', '+15 ทุกโซนทั้งแผนที่ · 20 AP · อยู่ 3 ชม. · คูลดาวน์ 4 ชม. · ชะลอการตายทั้งเมือง 40%'],
    ],
  },
  {
    heading: '10 · ผลภารกิจคำนวณตอนไหน',
    bullets: [
      'ผลคำนวณ "ตอนเจ้าหน้าที่ทำงานเสร็จ" ไม่ใช่ตอนกดส่ง — ระหว่างรอ คนในโซนยังตายต่อไปเรื่อย ๆ',
      'เพราะคำนวณตอนจบ บัฟที่ลงทีหลังจึงมีผลจริง ส่งเจ้าหน้าที่ไปก่อนแล้วค่อยตามบัฟทีหลังก็ทัน',
      'เวลาที่เจ้าหน้าที่ไม่ว่าง = เวลาที่เขากำลังทำงานอยู่ในโซน ไม่ใช่เวลาพักหลังงาน',
    ],
  },
  {
    heading: '11 · การทอย 2 ชั้น',
    bullets: [
      'ชั้นที่ 1 — ทอย 1-100 เทียบอัตราสำเร็จ ผ่านคือสำเร็จ ไม่ผ่านคือล้มเหลว บัฟทุกตัวช่วยที่ชั้นนี้',
      'สำเร็จ → ไปชั้นที่ 2 และปลอดภัย 100% ไม่ต้องทอยอันตรายเลย',
      'ชั้นที่ 2 — สุ่มว่าช่วยได้กี่เปอร์เซ็นต์ของคนในโซน: ระดับสูงสุด 99% · สูง 90-98% · กลาง 70-89% · ต่ำ 50-69% บัฟไม่มีผลกับชั้นนี้',
      'Lyla ทอยชั้น 2 ได้ดีกว่า (โอกาสได้ระดับสูงสุด 35% เทียบกับ Robertson 20%)',
      'สำเร็จแล้วโซนกลายเป็นเขียวทันที คนที่เหลือในโซนนับเป็นเสียชีวิต',
      'ล้มเหลว → ไม่ได้ช่วยใครเลย โซนคงเดิม แล้วทอยอันตรายต่อ',
    ],
  },
  {
    heading: '12 · อันตรายและสถานะเจ้าหน้าที่',
    bullets: [
      'ทอยอันตรายเฉพาะตอนภารกิจล้มเหลว โอกาสฐาน เทา 12% · เหลือง 30% · แดง 48% (เพดาน 72%) และยิ่งอยู่ในโซนนานยิ่งเสี่ยงมาก',
      'บาดเจ็บ — อัตราสำเร็จ −20 ทุกภารกิจ ฟื้นเองใน 6 ชั่วโมง',
      'บาดเจ็บซ้ำ → หมดสติ — ใช้งานไม่ได้เลย 9 ชั่วโมง',
      'Alert Allied กันอันตรายได้ 100% ในโซนที่ลงไว้ ใช้กับคนที่บาดเจ็บอยู่แล้วเพื่อกันไม่ให้ทรุดเป็นหมดสติได้ด้วย',
      'CRITICAL — ถ้าภาคสนามหมดสติพร้อมกันทั้งคู่ จะนับถอยหลัง 3 ชั่วโมง ถ้าไม่มีใครฟื้นทัน เกมจบทันทีและคะแนนถูกคูณ 0.6',
    ],
  },
  {
    heading: '13 · Last Stand ของ Robertson',
    bullets: [
      'เกิดเองไม่ได้สั่ง และเกิดได้ครั้งเดียวต่อเกม เงื่อนไขคือ Lyla หมดสติอยู่ + Robertson บาดเจ็บอยู่ + ทอยติดอันตรายซ้ำ',
      'อยู่ในสถานะนี้ 6 ชั่วโมง: ทุกสกิลฟรีไม่คิด AP · เวลาทำงานเหลือครึ่งเดียว (0.5/1/1.5 ชม.) · โอกาสสำเร็จ +10 · %ช่วยชีวิต +10 · ไม่ติดโทษบาดเจ็บ · แต่ใช้ Crowd Control ไม่ได้',
      'ครบ 6 ชั่วโมงแล้วยังไม่ล้ม — เกมเปิดมินิเกมจังหวะ (QTE) ให้ต่อเวลาได้อีกสูงสุด 6 ชั่วโมง',
      'ดูรายละเอียดทั้งหมดและลองฝึกเล่นได้ที่ Intel → Operator → Field operator → Robertson',
    ],
  },
  {
    heading: '14 · มินิเกม QTE ต่อเวลา',
    bullets: [
      'เสี้ยวหัวใจวิ่งจากซ้ายและขวาเข้าหาหัวใจกลางจอ กดปุ่มฝั่งเดียวกับเสี้ยวตอนมันวิ่งมาทับพอดี',
      'กรอบไฮไลต์เขียว-เหลืองบนจอกว้างเท่ากับช่วงที่กดทันจริง ๆ (±0.26 วินาที) ไม่ได้วาดเอาสวย',
      'มี 3 รอบ โผล่ทีละรอบทุกครั้งที่เวลาที่ต่อมาหมด: รอบ 1 = 20 จังหวะ · รอบ 2 = 30 · รอบ 3 = 40 ผ่านรอบละ +2 ชั่วโมง',
      'พลาดได้ 3 ครั้งต่อรอบ รีเซ็ตใหม่ทุกรอบ · พลาดครบเมื่อไหร่จบทันที ไม่ได้เวลาของรอบนั้นและไม่มีรอบต่อไป แต่เวลาที่ได้จากรอบก่อนยังอยู่',
      'นับว่าพลาดเมื่อ กดตอนไม่มีเสี้ยวในกรอบ · กดผิดฝั่ง · หรือปล่อยให้เสี้ยววิ่งผ่านไป',
    ],
  },
  {
    heading: '15 · คีย์ลัดสำหรับเล่นบนคอม',
    body: 'การลากไอคอนแบบเดิมยังใช้ได้ทุกอย่าง คีย์ลัดเป็นทางเลือกที่สอง',
    rows: [
      ['Esc', 'เปิดเมนู ☰ · ถ้ามีอะไรเปิดอยู่คือปิด · ถ้ากำลังเลือกสกิลอยู่คือยกเลิก'],
      ['P / T', 'หยุด-เดินเวลา / เปิดหน้าเวลาที่เหลือ'],
      ['เว้นวรรค', 'ข้ามบทพูดในหน้าสอนเล่น'],
      ['1 – 6', 'เลือกสกิล: Robertson 1/2 · Lyla · Lia 1/2 · Mudongzock — แล้วเอาเมาส์คลิกโซนที่จะลง กดเลขเดิมซ้ำ = ยกเลิก'],
      ['Q / E ในมินิเกม', 'รับเสี้ยวหัวใจฝั่งซ้าย / ฝั่งขวา'],
    ],
  },
  {
    heading: '16 · คะแนนและแรงก์',
    body: 'จบเกมได้คะแนน 10–1,200 พร้อมแรงก์ E ถึง S มาจาก 3 ส่วนบวกกัน แล้วคูณตัวคูณตอนจบ',
    rows: [
      ['จำนวนคนที่ช่วยได้', 'เต็ม 900 — ได้เต็มเมื่อช่วยได้ 60% ของเมือง (720 คน)'],
      ['ความครอบคลุมพื้นที่', 'เต็ม 150 — ได้เต็มเมื่อช่วยคนได้อย่างน้อย 1 คนใน 40 จาก 47 โซน'],
      ['ความปลอดภัยของทีม', 'เต็ม 150 — เริ่มเต็มแล้วหักบาดเจ็บครั้งละ 7% หมดสติครั้งละ 15% · ต้องส่งภารกิจครบ 8 ครั้งถึงปลดล็อกส่วนนี้เต็ม'],
      ['จบเพราะ CRITICAL', 'คะแนนรวมถูกคูณ 0.6'],
      ['เกณฑ์แรงก์', 'S 1090 · A 950 · B 780 · C 600 · D 380 · ต่ำกว่านั้น E'],
    ],
  },
  {
    heading: '17 · เคล็ดลับ',
    bullets: [
      'ช่วงต้นเกม AP มาไวที่สุดและโซนยังมีคนเต็ม — อย่าปล่อยให้เจ้าหน้าที่ว่าง',
      'อย่าส่งใครเข้าโซนแดงเปล่า ๆ Lyla เดี่ยวได้แค่ 50% แต่ถ้าซ้อน Scan + Crowd Control จะพุ่งไปเกิน 90%',
      'Robertson ราคาถูกและจบงานเร็วในโซนเทา/เหลือง เหมาะกวาดโซนง่ายให้ได้ปริมาณและได้แต้มความครอบคลุม',
      'Crowd Control ต้องมีคนอยู่ในโซนก่อน และมันล็อกตัว Robertson เอง จึงเหมาะใช้หนุน Lyla มากกว่า',
      'Alert Allied ไม่ได้เพิ่มโอกาสสำเร็จ แต่ซื้อความแน่นอน — คุ้มที่สุดตอนเหลือคนไหวคนเดียว',
      'Air Deploy ชะลอการตายทั้งเมือง ใช้ตอนหลายโซนใกล้หมดอายุพร้อมกันจะคุ้มที่สุด',
      'โซนเทาอยู่ได้ 80 ชั่วโมงซึ่งนานกว่าเกม จึงไม่มีวันตายเกลี้ยง — เก็บไว้ทำท้ายเกมได้',
    ],
  },
];

export function renderHowToPlay(root, { onBack } = {}) {
  root.innerHTML = '';
  setScreenClass(root, 'screen--howto');

  root.appendChild(buildSubHeader('HOW TO PLAY', onBack));

  const article = document.createElement('div');
  article.className = 'howto-body';
  for (const sec of HOW_TO_PLAY_SECTIONS) {
    const h = document.createElement('div');
    h.className = 'howto-heading';
    h.textContent = sec.heading;
    article.appendChild(h);

    if (sec.body) {
      const p = document.createElement('div');
      p.className = 'howto-text';
      p.textContent = sec.body;
      article.appendChild(p);
    }

    // รายการหัวข้อย่อย — ใช้กับกฎที่เป็นข้อ ๆ อ่านง่ายกว่าย่อหน้ายาว
    if (sec.bullets) {
      const ul = document.createElement('ul');
      ul.className = 'howto-list';
      for (const item of sec.bullets) {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      }
      article.appendChild(ul);
    }

    // ตารางตัวเลข — คอลัมน์ซ้ายคือชื่อ ขวาคือค่า (ราคา AP · เวลา · เกณฑ์แรงก์ ฯลฯ)
    if (sec.rows) {
      const table = document.createElement('div');
      table.className = 'howto-table';
      for (const [key, value] of sec.rows) {
        const k = document.createElement('div');
        k.className = 'howto-cell-key';
        k.textContent = key;
        const v = document.createElement('div');
        v.className = 'howto-cell-val';
        v.textContent = value;
        table.append(k, v);
      }
      article.appendChild(table);
    }
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

  // หัวข้อพิเศษ (ตอนนี้มีเฉพาะ Last Stand ของ Robertson) + ปุ่มเข้าหน้าฝึก QTE
  if (intel.special) {
    const h = document.createElement('div');
    h.className = 'card-heading';
    h.textContent = intel.special.heading;
    body.appendChild(h);
    for (const p of intel.special.body) {
      const para = document.createElement('div');
      para.className = 'card-text';
      para.textContent = p;
      body.appendChild(para);
    }
    if (intel.special.practice) {
      const btn = document.createElement('button');
      btn.className = 'card-practice-btn';
      btn.type = 'button';
      btn.textContent = '▶ ฝึกซ้อม QTE (ไม่จำกัดจำนวนครั้ง)';
      // เปิดทับหน้าการ์ดเลย ไม่ได้เปลี่ยนหน้า — ปิดแล้วการ์ดยังอยู่ที่เดิม เลื่อนค้างไว้ตรงไหนก็ยังตรงนั้น
      btn.addEventListener('click', () => runQtePractice(root, () => {}));
      body.appendChild(btn);
    }
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
  // Play -> เลือกโหมด -> Tutorial (visual novel) -> หน้าเกมหลัก -> หน้า Result
  // เล่นใหม่จากหน้า Result ข้าม tutorial ไปเลย (renderGameScreen รีเซ็ต state ให้เองอยู่แล้ว)
  const showGame = () => scene(() => { clearFx(); renderGameScreen(root, { onExit: showMenu, onFinish: showResult }); });
  const showResult = () => quick(() => { clearFx(); renderResult(root, { state, onHome: showMenu, onReplay: showGame }); });
  // กด Play = เพลงเมนูหยุดทันที (เจ้าของสั่งไว้) หน้าบรีฟจึงเงียบ
  const showTutorial = () => { setBgm(null); scene(() => renderTutorial(root, { onFinish: showGame })); };
  // หน้าเลือกโหมด — ยังอยู่ในโซนเมนู เพลงเมนูจึงเล่นต่อ (เพลงหยุดตอนกด PLAY เข้าฉากบรีฟ)
  const showModeSelect = () => quick(() => {
    menuBgm();
    renderModeSelect(root, { onBack: showMenu, onPlay: onModeStart, onGated: showAccessCode });
  });
  // โหมดที่ล็อกด้วยรหัสผ่าน (ตอนนี้มีแค่ Building 21) — เครื่องยังไม่เคยปลดล็อกแวะมาที่นี่ก่อน
  const showAccessCode = (modeId) => quick(() => {
    menuBgm();
    renderAccessCode(root, { onBack: showModeSelect, onSuccess: () => onModeStart(modeId) });
  });

  // เลือกโหมดแล้วจะเริ่มยังไง — Building 21 ยังไม่มีเนื้อหาจริง เข้าไปแล้วเจอหน้าว่างไปก่อน
  // (เจ้าของสั่งไว้ว่ายังไม่ต้องทำอะไร) โหมดใหม่ในอนาคตมาต่อ else if ตรงนี้
  //
  // ติ๊ก "ข้ามเนื้อเรื่อง" ไว้ = ข้ามฉากสอนเล่น เข้าหน้าเกมเลย (ค่าเริ่มต้นคือติ๊กไว้)
  function onModeStart(modeId) {
    if (modeId === 'main') {
      if (getGameOptions().skipStory) showGame();
      else showTutorial();
    } else {
      showBlank(GAME_MODES.find((m) => m.id === modeId)?.label ?? modeId, showModeSelect);
    }
  }

  function onMenuNavigate(id) {
    if (id === 'settings') showSettings();
    else if (id === 'quit') showQuit();
    else if (id === 'intel') showIntel();
    else if (id === 'play') showModeSelect();
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
