// หน้า Result — อ้างอิง docs/AFTERSHOCKMASTER.md §15.3 · gameflowspec I3/I4/I5
//
//   ผลปฏิบัติการ
//   ผู้รอดชีวิตทั้งหมด   1,200 คน
//   ├─ ช่วยเหลือสำเร็จ     712 คน   +712
//   └─ เสียชีวิต          488 คน   −488
//   ─────────────────────────────────
//   คะแนนรวม                        224
//   อัตราการช่วยเหลือ 59.3% · โซนที่ช่วยได้ 31/47
//   [ 🏠 Home ] [ 🔄 เล่นใหม่ ]
//
// ไฟล์นี้อยู่ใน ui/ จึงไม่คำนวณคะแนนเอง — เรียก systems/score.js มาแล้วแสดงผลอย่างเดียว

import { scoreBreakdown } from '../systems/score.js';
import { iconNode } from '../data/icons.js';

const num = (n) => n.toLocaleString('en-US');
const signed = (n) => (n >= 0 ? `+${num(n)}` : `−${num(Math.abs(n))}`);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// แถวตัวเลข: ป้ายซ้าย · จำนวนกลาง · แต้มขวา
function row(className, label, value, points) {
  const line = el('div', `res-row ${className}`);
  line.append(el('span', 'res-label', label), el('span', 'res-value', value));
  line.appendChild(points == null ? el('span', 'res-points') : el('span', 'res-points', points));
  return line;
}

export function renderResult(root, { state, onHome, onReplay } = {}) {
  const r = scoreBreakdown(state);

  root.innerHTML = '';
  root.className = 'screen-overlay screen--result';

  const card = el('div', 'res-card');

  card.append(
    el('div', 'res-title', 'ผลปฏิบัติการ'),
    el('div', `res-reason res-reason--${r.reason ?? 'timeup'}`, r.reasonText),
  );

  const table = el('div', 'res-table');
  table.append(
    row('res-row--total', 'ผู้รอดชีวิตทั้งหมด', `${num(r.total)} คน`, null),
    row('res-row--saved', '├─ ช่วยเหลือสำเร็จ', `${num(r.rescued)} คน`, signed(r.rescuePoints)),
    row('res-row--lost', '└─ เสียชีวิต', `${num(r.casualty)} คน`, signed(r.casualtyPoints)),
  );
  table.appendChild(el('div', 'res-rule'));
  table.appendChild(row('res-row--score', 'คะแนนรวม', '', signed(r.score)));
  card.appendChild(table);

  const stats = el('div', 'res-stats');
  stats.append(
    statBox('อัตราการช่วยเหลือ', `${r.rescueRate.toFixed(1)}%`),
    statBox('โซนที่ช่วยได้', `${r.zonesSaved} / ${r.zonesTotal}`),
  );
  card.appendChild(stats);

  const actions = el('div', 'res-actions');
  const home = el('button', 'res-btn');
  home.append(iconNode('home', 'res-glyph'), el('span', null, 'Home'));
  home.addEventListener('click', () => onHome?.());
  const replay = el('button', 'res-btn res-btn--main');
  replay.append(iconNode('replay', 'res-glyph'), el('span', null, 'เล่นใหม่'));
  replay.addEventListener('click', () => onReplay?.());
  actions.append(home, replay);
  card.appendChild(actions);

  root.appendChild(card);
}

function statBox(label, value) {
  const box = el('div', 'res-stat');
  box.append(el('div', 'res-stat-value', value), el('div', 'res-stat-label', label));
  return box;
}
