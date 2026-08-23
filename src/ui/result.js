// หน้า Result — อ้างอิง docs/AFTERSHOCKMASTER.md §15.3 · gameflowspec I3/I4/I5
//
//   ผลปฏิบัติการ
//   ผู้รอดชีวิตทั้งหมด   1,200 คน
//   ├─ ช่วยเหลือสำเร็จ     712 คน   +712
//   └─ เสียชีวิต          488 คน   −488
//   ─────────────────────────────────
//   คะแนนรวม                        224
//   อัตราการช่วยเหลือ 59.3% · โซนที่ช่วยได้ 31/47
//   [ 🏠 Home ] [ 🔄 เล่นใหม่ ] [ 📤 แชร์ ]
//
// ไฟล์นี้อยู่ใน ui/ จึงไม่คำนวณคะแนนเอง — เรียก systems/score.js มาแล้วแสดงผลอย่างเดียว

import { scoreBreakdown } from '../systems/score.js';

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
  const home = el('button', 'res-btn', '🏠 Home');
  home.addEventListener('click', () => onHome?.());
  const replay = el('button', 'res-btn res-btn--main', '🔄 เล่นใหม่');
  replay.addEventListener('click', () => onReplay?.());
  const share = el('button', 'res-btn', '📤 แชร์');
  share.addEventListener('click', () => shareResult(r, share));
  actions.append(home, replay, share);
  card.appendChild(actions);

  root.appendChild(card);
}

function statBox(label, value) {
  const box = el('div', 'res-stat');
  box.append(el('div', 'res-stat-value', value), el('div', 'res-stat-label', label));
  return box;
}

// ── ปุ่มแชร์ (I5) — แชร์หน้า Result เป็นภาพ ──────────────────────
// วาดการ์ดลง <canvas> เองเพราะห้ามใช้ไลบรารีภายนอก
// เครื่องที่แชร์ไฟล์ได้ (มือถือส่วนใหญ่) จะเปิดแผงแชร์ · ที่เหลือดาวน์โหลดเป็นรูปแทน
function drawShareCard(r) {
  const W = 1000, H = 620;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  const font = (size, weight = '400') => `${weight} ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;

  c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#1b1f24'; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);

  c.fillStyle = '#e8484a'; c.font = font(40, '900'); c.textAlign = 'left';
  c.fillText('AFTERSHOCKS RESPONSE', 60, 84);
  c.fillStyle = '#1b1f24'; c.font = font(30, '700');
  c.fillText('ผลปฏิบัติการ', 60, 132);
  c.fillStyle = '#7c848e'; c.font = font(22);
  c.fillText(r.reasonText, 60, 170);

  const line = (y, label, value, points, opts = {}) => {
    c.fillStyle = opts.color ?? '#1b1f24';
    c.font = font(opts.size ?? 26, opts.weight ?? '400');
    c.textAlign = 'left'; c.fillText(label, 60, y);
    c.textAlign = 'right'; c.fillText(value, 660, y);
    if (points != null) c.fillText(points, W - 60, y);
  };

  line(240, 'ผู้รอดชีวิตทั้งหมด', `${num(r.total)} คน`, null, { weight: '700' });
  line(290, '├─ ช่วยเหลือสำเร็จ', `${num(r.rescued)} คน`, signed(r.rescuePoints), { color: '#1f9d55' });
  line(338, '└─ เสียชีวิต', `${num(r.casualty)} คน`, signed(r.casualtyPoints), { color: '#e8484a' });

  c.strokeStyle = '#1b1f24'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(60, 372); c.lineTo(W - 60, 372); c.stroke();

  line(424, 'คะแนนรวม', '', signed(r.score), { size: 38, weight: '900' });

  c.fillStyle = '#7c848e'; c.font = font(24); c.textAlign = 'left';
  c.fillText(`อัตราการช่วยเหลือ ${r.rescueRate.toFixed(1)}%`, 60, 512);
  c.fillText(`โซนที่ช่วยได้ ${r.zonesSaved} / ${r.zonesTotal}`, 60, 552);

  return canvas;
}

async function shareResult(r, btn) {
  const label = btn.textContent;
  const done = (msg) => {
    btn.textContent = msg;
    setTimeout(() => { btn.textContent = label; }, 1800);
  };

  try {
    const canvas = drawShareCard(r);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('สร้างรูปไม่สำเร็จ');

    const file = new File([blob], 'aftershock-result.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'AFTERSHOCKS RESPONSE' });
      return;
    }

    // เครื่องที่แชร์ไฟล์ไม่ได้ (คอมส่วนใหญ่) → บันทึกเป็นรูปแทน
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aftershock-result.png';
    a.click();
    URL.revokeObjectURL(url);
    done('✅ บันทึกรูปแล้ว');
  } catch (err) {
    if (err?.name === 'AbortError') return; // ผู้เล่นกดยกเลิกแผงแชร์เอง
    done('❌ แชร์ไม่ได้');
  }
}
