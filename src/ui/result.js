// หน้า Result — อ้างอิง docs/AFTERSHOCKMASTER.md §15.3 · gameflowspec I3/I4/I5
//
//   ผลปฏิบัติการ · หมดเวลา 72 ชั่วโมง
//              ┌───┐
//              │ A │  ผู้บัญชาการชั้นเยี่ยม
//              └───┘  ตัดสินใจแม่นแทบทุกครั้ง
//        คะแนน   965 / 1200   ▓▓▓▓▓▓▓▓░░
//   ผู้รอดชีวิตที่ช่วยได้  588/780  ▓▓▓▓▓▓▓░░░
//   ความครอบคลุมพื้นที่   237/240  ▓▓▓▓▓▓▓▓▓░
//   ความปลอดภัยของทีม    140/180  ▓▓▓▓▓▓▓░░░
//   ช่วยได้ 407 คน · เสียชีวิต 793 คน · 37/47 โซน
//   [ 🏠 Home ] [ 🔄 เล่นใหม่ ]
//
// ตัวเลขทุกตัววิ่งขึ้นจาก 0 และแถบค่อย ๆ เติม ไล่ทีละบรรทัด (§อนิเมชั่น)
// ไฟล์นี้อยู่ใน ui/ จึงไม่คำนวณคะแนนเอง — เรียก systems/score.js มาแล้วแสดงผลอย่างเดียว

import { scoreBreakdown } from '../systems/score.js';
import { iconNode } from '../data/icons.js';
import { startLoop, stopLoop } from './audio.js';

const num = (n) => Math.round(n).toLocaleString('en-US');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// ── ตัวคุมอนิเมชั่นของหน้านี้ ────────────────────────────────────
// เก็บไว้ระดับโมดูลเพื่อยกเลิกได้ตอนออกจากหน้า ไม่งั้นตัวเลขจะวิ่งต่อบน element ที่ถูกลบไปแล้ว
let running = null;

function stopAnim() {
  // หยุดเสียงก่อนเสมอ แม้ไม่มีอนิเมชั่นค้างอยู่ — ผู้เล่นอาจกดออกตอนเพลงยังเล่นแต่เลขวิ่งจบแล้ว
  stopLoop('result');
  stopLoop('pointCounter');
  if (!running) return;
  for (const t of running.timers) clearTimeout(t);
  for (const id of running.rafs) cancelAnimationFrame(id);
  running = null;
}

function reduceMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function later(fn, ms) {
  if (!running) return;
  running.timers.add(setTimeout(fn, ms));
}

// นับเลขวิ่งขึ้นจาก 0 — ช้าลงตอนใกล้ถึง (easeOutCubic) ให้ความรู้สึกว่า "หยุดที่เลขนี้"
function countUp(node, target, ms, format = num) {
  if (!running || target <= 0) { node.textContent = format(target); return; }
  const start = performance.now();
  const step = (now) => {
    if (!running || !node.isConnected) return;
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - (1 - t) ** 3;
    node.textContent = format(target * eased);
    if (t < 1) running.rafs.add(requestAnimationFrame(step));
  };
  running.rafs.add(requestAnimationFrame(step));
}

// แถบเติม — ตั้ง width ทีเดียว แล้วให้ CSS transition ทำงาน
function fillBar(bar, frac) {
  bar.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
}

// ── ชิ้นส่วนหน้าจอ ──────────────────────────────────────────────
function partRow({ label, points, max, frac }) {
  const row = el('div', 'res-part');
  const value = el('span', 'res-part-value', '0');
  const head = el('div', 'res-part-head');
  head.append(el('span', 'res-part-label', label), value);

  const track = el('div', 'res-bar');
  const fill = el('i', 'res-bar-fill');
  track.appendChild(fill);

  row.append(head, track);
  return { row, fill, value, points, max, frac };
}

function statBox(label, value) {
  const box = el('div', 'res-stat');
  const v = el('div', 'res-stat-value', value);
  box.append(v, el('div', 'res-stat-label', label));
  return { box, valueEl: v };
}

export function renderResult(root, { state, onHome, onReplay } = {}) {
  stopAnim();
  const r = scoreBreakdown(state);

  root.innerHTML = '';
  root.className = 'screen-overlay screen--result';

  const card = el('div', 'res-card');
  card.append(
    el('div', 'res-title', 'ผลปฏิบัติการ'),
    el('div', `res-reason res-reason--${r.reason ?? 'timeup'}`, r.reasonText),
  );

  // ── แรงก์ ────────────────────────────────────────────────────
  const rankBox = el('div', `res-rank res-rank--${r.rank}`);
  const badge = el('div', 'res-rank-badge', r.rank);
  const rankText = el('div', 'res-rank-text');
  rankText.append(el('div', 'res-rank-title', r.rankTitle), el('div', 'res-rank-note', r.rankNote));
  rankBox.append(badge, rankText);
  card.appendChild(rankBox);

  // ── คะแนนรวม ─────────────────────────────────────────────────
  const scoreBox = el('div', 'res-score');
  const scoreValue = el('span', 'res-score-value', '0');
  const scoreHead = el('div', 'res-score-head');
  scoreHead.append(
    el('span', 'res-score-label', 'คะแนน'),
    scoreValue,
    el('span', 'res-score-max', `/ ${num(r.scoreMax)}`),
  );
  const scoreTrack = el('div', 'res-bar res-bar--score');
  const scoreFill = el('i', 'res-bar-fill');
  scoreTrack.appendChild(scoreFill);
  scoreBox.append(scoreHead, scoreTrack);

  // จบเพราะ CRITICAL — บอกตรง ๆ ว่าคะแนนโดนหักเพราะอะไร
  if (r.multiplier !== 1) {
    scoreBox.appendChild(el('div', 'res-penalty', `ภารกิจล่มกลางคัน — คะแนน × ${r.multiplier}`));
  }
  card.appendChild(scoreBox);

  // ── คะแนนแยกส่วน ─────────────────────────────────────────────
  const parts = r.parts.map(partRow);
  const partsBox = el('div', 'res-parts');
  for (const p of parts) partsBox.appendChild(p.row);
  card.appendChild(partsBox);

  // ── ตัวเลขคน ─────────────────────────────────────────────────
  const stats = el('div', 'res-stats');
  const saved = statBox('ช่วยเหลือสำเร็จ', '0');
  const lost = statBox('เสียชีวิต', '0');
  const zonesStat = statBox('โซนที่ช่วยได้', `0 / ${r.zonesTotal}`);
  stats.append(saved.box, lost.box, zonesStat.box);
  card.appendChild(stats);

  // ── ปุ่ม ──────────────────────────────────────────────────────
  const actions = el('div', 'res-actions');
  const home = el('button', 'res-btn');
  home.append(iconNode('home', 'res-glyph'), el('span', null, 'Home'));
  home.addEventListener('click', () => { stopAnim(); onHome?.(); });
  const replay = el('button', 'res-btn res-btn--main');
  replay.append(iconNode('replay', 'res-glyph'), el('span', null, 'เล่นใหม่'));
  replay.addEventListener('click', () => { stopAnim(); onReplay?.(); });
  actions.append(home, replay);
  card.appendChild(actions);

  root.appendChild(card);

  // ── ไทม์ไลน์อนิเมชั่น ────────────────────────────────────────
  // ลำดับ: แรงก์กระแทกลงมา → คะแนนรวมวิ่ง → แถบรายส่วนไล่ทีละอัน → ตัวเลขคน → ปุ่ม
  running = { timers: new Set(), rafs: new Set() };
  startLoop('result'); // เพลงหน้าสรุปผล — stopAnim() เป็นคนหยุดตอนออกจากหน้า

  if (reduceMotion()) {
    // ข้ามอนิเมชั่นทั้งหมด แต่ต้องเติมค่าให้ครบ ไม่งั้นหน้าจะค้างที่ 0
    badge.classList.add('is-in');
    scoreValue.textContent = num(r.score);
    fillBar(scoreFill, r.score / r.scoreMax);
    for (const p of parts) {
      p.row.classList.add('is-in');
      p.value.textContent = `${num(p.points)} / ${num(p.max)}`;
      fillBar(p.fill, p.frac);
    }
    saved.valueEl.textContent = num(r.rescued);
    lost.valueEl.textContent = num(r.casualty);
    zonesStat.valueEl.textContent = `${r.zonesSaved} / ${r.zonesTotal}`;
    stats.classList.add('is-in');
    actions.classList.add('is-in'); // ต้องติดด้วย ไม่งั้นปุ่มจะจางและกดไม่ได้ตลอดกาล
    card.classList.add('is-done');
    return;
  }

  later(() => badge.classList.add('is-in'), 260);

  later(() => {
    countUp(scoreValue, r.score, 1100);
    fillBar(scoreFill, r.score / r.scoreMax);
    startLoop('pointCounter'); // ไฟล์ยาว 10 วิ ยาวกว่าอนิเมชั่น จึงถูกสั่งหยุดก่อนจบเสมอ
  }, 700);

  parts.forEach((p, i) => {
    later(() => {
      p.row.classList.add('is-in');
      fillBar(p.fill, p.frac);
      // ตัวเศษวิ่ง ส่วนตัวส่วนคงที่ — เขียนรวมกันในช่องเดียวจึงต้อง format เอง
      countUp(p.value, p.points, 700, (n) => `${num(n)} / ${num(p.max)}`);
    }, 1500 + i * 260);
  });

  later(() => {
    stats.classList.add('is-in');
    countUp(saved.valueEl, r.rescued, 800);
    countUp(lost.valueEl, r.casualty, 800);
    countUp(zonesStat.valueEl, r.zonesSaved, 800, (n) => `${num(n)} / ${r.zonesTotal}`);
  }, 2400);

  // ปุ่มโผล่ท้ายสุด หลังเลขทุกตัววิ่งจบแล้ว (กล่องตัวเลขคนเริ่ม 2400 วิ่ง 800 → จบ 3200)
  // ถ้าโผล่ก่อน ผู้เล่นจะกดเล่นใหม่ทั้งที่เลขยังวิ่งค้างอยู่
  later(() => {
    stopLoop('pointCounter'); // สรุปคะแนนเสร็จแล้ว — หยุดเสียงนับ (เพลง result ยังเล่นต่อ)
    actions.classList.add('is-in');
    card.classList.add('is-done');
  }, 3300);
}
