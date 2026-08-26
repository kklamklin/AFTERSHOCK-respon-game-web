// เมนู ☰ ในเกม · หน้าเวลาที่เหลือ · ป๊อปอัพหยุดเวลาอัตโนมัติ
// อ้างอิง docs/GAMESCREEN_SPEC.md §6 เมนูในเกม · §7 หน้าเวลาที่เหลือ · §2.1 หยุดเวลาอัตโนมัติ
//
// ทุกอย่างในไฟล์นี้เป็น "ชั้นทับ" บนหน้าเกม ไม่ได้ล้างหน้าเกมทิ้ง
// เพราะถ้าล้างทิ้งแล้ววาดใหม่ แผนที่ต้อง fetch ใหม่ · ซูมที่ปัดไว้หาย · นาฬิกาเริ่มใหม่หมด
// เข้าหน้า Setting / How to play / Operator จึงวาดลงกล่องของตัวเอง (host) ที่ลอยอยู่เหนือเกม
//
// ไฟล์นี้อยู่ใน ui/ จึงไม่คำนวณกฎเกมเอง — ตัวเลขทั้งหมดมาจาก systems/ กับ config.js

import { CONFIG } from '../config.js';
import { summarizeByTier } from '../systems/zones.js';
// วนกันเองกับ screens.js (screens → gameScreen → gameMenu → screens)
// ใช้ได้เพราะทุกตัวที่ดึงมาเป็น function declaration และเรียกตอนผู้เล่นกดเท่านั้น ไม่ได้เรียกตอนโหลด
import {
  renderSettingsMenu, renderHowToPlay, renderOperatorMenu,
  renderOperatorRoster, renderOperatorCard,
} from './screens.js';

const TOTAL_HOURS = CONFIG.totalLoops / CONFIG.loopsPerHour;
const TIER_ORDER = ['gray', 'yellow', 'red'];
const TIER_LETTER = { gray: 'A', yellow: 'B', red: 'C' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const tierHours = (tier) => CONFIG.zoneLifespanLoops[tier] / CONFIG.loopsPerHour;

// ป๊อปอัพหยุดเวลาอัตโนมัติ (แจ้ง 24 ชม.สุดท้าย · 12 ชม. · โซนแดง) ถูกเอาออกทั้งหมดแล้ว
// (เจ้าของสั่ง) — หน้าเวลาที่เหลือยังเปิดดูเองได้จากเมนู ☰ หรือปุ่ม Time เหมือนเดิม

/**
 * สร้างชั้นเมนู/หน้าเวลา/ป๊อปอัพ ทับบนหน้าเกม
 * @param {HTMLElement} root  กล่องหน้าเกม (.screen--game)
 * @param {object} hooks
 *   pause()        หยุดเวลา
 *   resume()       เดินเวลาต่อ
 *   isRunning()    ตอนนี้เวลาเดินอยู่ไหม
 *   quitToMenu()   ออกไปเมนูหลัก (ผู้เรียกเป็นคนหยุดนาฬิกา/รีเซ็ตเอง)
 */
export function createGameMenu(root, { pause, resume, isRunning, quitToMenu } = {}) {
  let wasRunning = false;       // ก่อนเปิดชั้นนี้ เวลาเดินอยู่ไหม — ปิดแล้วค่อยคืนสถานะเดิม
  let openCount = 0;            // ชั้นที่ซ้อนกันอยู่ (เมนู → Setting ฯลฯ)

  // กล่องหลักที่ทุกอย่างวาดลงไป
  const host = el('div', 'gm-host');
  host.hidden = true;
  root.appendChild(host);

  function holdTime() {
    if (openCount === 0) {
      wasRunning = !!isRunning?.();
      pause?.();
    }
    openCount += 1;
  }

  function releaseTime() {
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0 && wasRunning) resume?.();
  }

  function close() {
    if (host.hidden) return;
    host.hidden = true;
    host.className = 'gm-host';
    host.innerHTML = '';
    while (openCount > 0) releaseTime();
  }

  // เปิดกล่องด้วยเนื้อหาชุดใหม่ — mode เปลี่ยนหน้าตาของ host
  //   'panel'  แผงเลื่อนจากซ้าย + ฉากหลังมืด
  //   'card'   การ์ดกลางจอ + ฉากหลังมืด
  //   'screen' เต็มจอสีขาว (หน้า Setting / How to play / Operator เดิม)
  function show(mode, build) {
    if (host.hidden) { holdTime(); host.hidden = false; }
    // โหมด screen ยืมสไตล์หน้าจอเต็มของ screens.js มาใช้ (พื้นขาว flex column)
    host.className = mode === 'screen'
      ? 'gm-host gm-host--screen screen-overlay'
      : `gm-host gm-host--${mode}`;
    host.innerHTML = '';
    build(host);
  }

  // ── §6 เมนูในเกม ────────────────────────────────────────────────
  function openMenu() {
    show('panel', (box) => {
      const backdrop = el('div', 'gm-backdrop');
      backdrop.addEventListener('click', close);
      box.appendChild(backdrop);

      const panel = el('nav', 'gm-panel');
      panel.appendChild(el('div', 'gm-panel-title', 'PAUSED'));

      const items = [
        ['Continue', close],
        ['Setting', () => openScreen(renderSettingsMenu)],
        ['How to play', () => openScreen(renderHowToPlay)],
        ['Operator', openOperator],
        ['Return to menu', confirmQuit],
      ];
      for (const [label, action] of items) {
        const btn = el('button', 'gm-item', label);
        if (label === 'Return to menu') btn.classList.add('gm-item--danger');
        btn.addEventListener('click', action);
        panel.appendChild(btn);
      }
      box.appendChild(panel);
    });
  }

  // หน้าเดิมจาก screens.js — ปุ่มย้อนกลับพากลับมาที่แผงเมนู ไม่ใช่กลับเมนูหลัก (§6)
  function openScreen(render, opts = {}) {
    show('screen', (box) => render(box, { ...opts, onBack: openMenu }));
  }

  // Operator มี 3 ชั้น: เมนู → รายชื่อฝั่ง → การ์ดรายตัว
  function openOperator() {
    show('screen', (box) => renderOperatorMenu(box, {
      onBack: openMenu,
      onNavigate: (side) => openRoster(side),
    }));
  }
  function openRoster(side) {
    show('screen', (box) => renderOperatorRoster(box, {
      side, onBack: openOperator, onSelect: (key) => openCard(key, side),
    }));
  }
  function openCard(speciesKey, side) {
    show('screen', (box) => renderOperatorCard(box, {
      speciesKey, onBack: () => openRoster(side),
    }));
  }

  // Return to menu — ต้องยืนยันก่อน เพราะเกมจะถูกรีเซ็ตทั้งหมด (§6)
  function confirmQuit() {
    show('card', (box) => {
      const backdrop = el('div', 'gm-backdrop');
      backdrop.addEventListener('click', openMenu);
      box.appendChild(backdrop);

      const card = el('div', 'gm-card');
      card.append(
        el('div', 'gm-card-title', 'กลับเมนูหลัก?'),
        el('div', 'gm-card-text', 'ความคืบหน้าทั้งหมดจะหายไป และเริ่มภารกิจใหม่ตั้งแต่ต้น'),
      );
      const actions = el('div', 'gm-card-actions');
      const yes = el('button', 'gm-btn gm-btn--danger', 'กลับเมนูหลัก');
      yes.addEventListener('click', () => {
        close();
        quitToMenu?.();
      });
      const no = el('button', 'gm-btn', 'เล่นต่อ');
      no.addEventListener('click', openMenu);
      actions.append(yes, no);
      card.appendChild(actions);
      box.appendChild(card);
    });
  }

  // ── §7 หน้าเวลาที่เหลือ ──────────────────────────────────────────
  function openTime(state) {
    show('card', (box) => {
      const backdrop = el('div', 'gm-backdrop');
      backdrop.addEventListener('click', close);
      box.appendChild(backdrop);

      const card = el('div', 'gm-card gm-card--time');

      const head = el('div', 'gm-time-head');
      head.appendChild(el('div', 'gm-time-now', `Time : ${state.hour} Hr`));
      const bar = el('div', 'gm-time-bar');
      const fill = el('div', 'gm-time-fill');
      fill.style.width = `${Math.min(100, (state.hour / TOTAL_HOURS) * 100)}%`;
      bar.appendChild(fill);
      head.appendChild(bar);
      card.appendChild(head);

      card.appendChild(el('div', 'gm-time-label', 'Time left before all population gone'));

      // นับรวมทั้งระดับ ไม่ใช่รายโซน (§7)
      const summary = summarizeByTier(state.zones);
      const row = el('div', 'gm-time-row');
      for (const tier of TIER_ORDER) {
        const left = Math.max(0, tierHours(tier) - state.hour);
        const col = el('div', `gm-time-col gm-time-col--${tier}`);
        col.append(
          el('div', 'gm-time-left', `${left} Hr`),
          el('div', `gm-tier-dot gm-tier-dot--${tier}`, TIER_LETTER[tier]),
          el('div', 'gm-time-pop', `${summary[tier].population}%`),
        );
        if (left === 0) col.classList.add('is-gone');
        row.appendChild(col);
      }
      card.appendChild(row);

      const done = el('button', 'gm-btn', 'เดินเวลาต่อ');
      done.addEventListener('click', close);
      card.appendChild(done);

      box.appendChild(card);
    });
  }

  return {
    openMenu,
    openTime,
    close,
    isOpen: () => !host.hidden,
    destroy: () => { close(); host.remove(); },
  };
}
