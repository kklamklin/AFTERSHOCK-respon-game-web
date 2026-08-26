// มินิเกมจังหวะต่อเวลา Last Stand (GAMESCREEN_SPEC §5 · ตัวเลขทั้งหมดอยู่ที่ CONFIG.qte)
//
// เสี้ยวหัวใจวิ่งจากซ้ายและขวาเข้าหาหัวใจกลางจอ ผู้เล่นกดปุ่ม "ฝั่งเดียวกับเสี้ยว"
// ตอนมันวิ่งมาทับหัวใจกลางพอดี ทับพอดี = ตรงจังหวะ · กดตอนไม่มีอะไรมาทับ = พลาด
//
// ไฟล์นี้อยู่ใน ui/ จึงไม่รู้กฎเกมเลย — รู้แค่ "เล่นจบแล้วได้กี่ชั่วโมง" แล้วส่งกลับไป
// คนตัดสินว่าชั่วโมงนั้นแปลว่าอะไรคือ systems/status.js (resolveLastStandQte)
//
// ⚠️ ตัวจับเวลาของมินิเกมนี้เดินด้วยเวลาจริง (performance.now) ไม่ใช่นาฬิกาเกม
//    เพราะตอนเล่นเวลาในเกมถูกหยุดไว้ แต่เพลงยังเล่นอยู่ — จังหวะจึงต้องอิงเวลาจริง

import { CONFIG } from '../config.js';
import { playSfx } from './audio.js';
import { random } from '../utils/rng.js';

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// หัวใจดวงเดียวใช้ทั้งเป้ากลางจอและเสี้ยวที่วิ่งเข้ามา — เสี้ยวคือหัวใจดวงเดียวกันที่ถูกตัดครึ่ง
// (ตัดด้วย clip-path ใน styles.css) รูปทรงจึงตรงกันเป๊ะตอนมันวิ่งมาทับ
const HEART_PATH = 'M50 86 L16 52 C1 37 8 12 28 12 C40 12 47 19 50 25 C53 19 60 12 72 12 C92 12 99 37 84 52 Z';

function heartSvg(cls) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 98');
  svg.setAttribute('class', cls);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', HEART_PATH);
  svg.appendChild(path);
  return svg;
}

/**
 * เปิดมินิเกม "หนึ่งรอบ" — คืน { destroy } ไว้ปิดทิ้งกลางคันตอนออกจากหน้าเกม
 *
 * ⚠️ หนึ่งครั้งที่เปิด = หนึ่งรอบเท่านั้น ไม่ได้เล่นรวด 3 รอบ
 * ผ่านแล้วปิดจอ กลับไปเล่นเกมต่อ พอเวลาที่ต่อมาหมดอีก เกมถึงเปิดรอบถัดไปให้
 *
 * @param root       element ของหน้าเกม (อยู่ในเวที จึงถูกย่อ/ขยายไปด้วยกัน)
 * @param roundIndex รอบที่เท่าไหร่ (0-based) — ตัดสินจำนวนจังหวะและความถี่
 * @param hoursSoFar ต่อเวลาสะสมมาแล้วกี่ชั่วโมง (เอาไว้โชว์ยอดรวมบนจอ)
 * @param onFinish   (hoursGained, stat) — ถูกเรียกครั้งเดียวเสมอ แม้จะแพ้
 */
// ต้องยาวเท่ากับอนิเมชั่นปิดจอใน styles.css (.qte-wrap.is-out) ไม่งั้นจอจะหายก่อนอนิเมชั่นจบ
const CLOSE_MS = 620;

export function runLastStandQte(root, roundIndex, hoursSoFar, onFinish) {
  const cfg = CONFIG.qte;
  const round = cfg.rounds[Math.min(roundIndex, cfg.rounds.length - 1)];
  const wrap = el('div', 'qte-wrap');
  const panel = el('div', 'qte-panel');
  wrap.appendChild(panel);

  const head = el('div', 'qte-head');
  const title = el('div', 'qte-title', 'CLICK A CORRECT RHYTHM');
  const sub = el('div', 'qte-sub', '');
  head.append(title, sub);

  const stage = el('div', 'qte-stage');
  const hitL = el('div', 'qte-hit qte-hit--left');
  const hitR = el('div', 'qte-hit qte-hit--right');
  const target = el('div', 'qte-target');
  target.appendChild(heartSvg('qte-heart'));
  const lane = el('div', 'qte-lane');          // เสี้ยวหัวใจทุกตัวอยู่ในนี้
  const callout = el('div', 'qte-callout');    // ป้าย PERFECT / MISS เด้งกลางจอ
  stage.append(hitL, hitR, target, lane, callout);

  const keys = el('div', 'qte-keys');
  const keyL = el('button', 'qte-key qte-key--left');
  const keyR = el('button', 'qte-key qte-key--right');
  keyL.type = 'button'; keyR.type = 'button';
  keyL.appendChild(heartSvg('qte-key-icon qte-key-icon--left'));
  keyR.appendChild(heartSvg('qte-key-icon qte-key-icon--right'));
  keys.append(keyL, keyR);

  const foot = el('div', 'qte-foot');
  const lives = el('div', 'qte-lives');
  const livesIcons = [];
  for (let i = 0; i < cfg.lives; i += 1) {
    const h = heartSvg('qte-life');
    livesIcons.push(h);
    lives.appendChild(h);
  }
  const bonus = el('div', 'qte-bonus', '+0 ชม.');
  const progress = el('div', 'qte-progress');
  const progFill = el('i', 'qte-progress-fill');
  progress.appendChild(progFill);
  foot.append(lives, progress, bonus);

  panel.append(head, stage, keys, foot);
  // ความกว้างของแถบไฮไลต์ = หน้าต่างที่กดทันจริง ๆ แปลงเป็นพิกเซล
  // ผูกกับ config ตัวเดียวกับที่ใช้ตัดสิน ผู้เล่นจึงเห็น "กรอบที่กดได้" ตรงกับกฎเป๊ะ
  wrap.style.setProperty('--qte-lane', `${cfg.laneWidth}px`);
  wrap.style.setProperty('--qte-band', `${(cfg.laneWidth * cfg.hitWindowMs) / cfg.travelMs}px`);
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('is-in')); // ให้ transition ทำงานรอบแรก

  // ── สถานะของมินิเกม ────────────────────────────────────────────
  let livesLeft = cfg.lives;   // พลาดได้ 3 ครั้งต่อรอบ — รอบใหม่ได้ครบใหม่เสมอ
  let hoursGained = 0;
  let notes = [];          // เสี้ยวที่ยังไม่ถูกตัดสิน
  let queue = [];          // จังหวะที่ยังไม่ถึงเวลาโผล่
  let hitCount = 0;
  const totalNotes = round.notes;
  let roundEndAt = 0;
  let running = false;
  let raf = 0;
  let timers = [];
  let finished = false;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function setSub(text) { sub.textContent = text; }

  // บอกกติกาของรอบนี้ตั้งแต่แผงโผล่ ไม่ต้องรอจังหวะแรก ผู้เล่นจะได้อ่านทัน
  setSub(`QTE ${roundIndex + 1} / ${cfg.rounds.length} · ${totalNotes} จังหวะ`
       + ` · พลาดได้ ${cfg.lives} ครั้ง · ผ่านแล้ว +${round.hours} ชม.`);

  function paintLives() {
    livesIcons.forEach((h, i) => h.classList.toggle('is-gone', i >= livesLeft));
  }

  function paintProgress() {
    const pct = totalNotes ? Math.round((hitCount / totalNotes) * 100) : 0;
    progFill.style.transform = `scaleX(${pct / 100})`;
  }

  function flash(text, kind) {
    callout.textContent = text;
    callout.className = `qte-callout qte-callout--${kind}`;
    void callout.offsetWidth;                       // reflow ให้อนิเมชั่นเริ่มใหม่ได้ทุกครั้ง
    callout.classList.add('is-on');
  }

  // ── รอบเดียวจบ ─────────────────────────────────────────────────
  function startRound() {
    paintProgress();
    // ตั้งเวลาที่ต้องกดของทุกจังหวะไว้ล่วงหน้า — เวลาเป็นตัวจริง ตำแหน่งเป็นแค่ภาพ
    const lead = 1500;                              // เวลาให้ผู้เล่นตั้งตัวก่อนจังหวะแรก
    const t0 = performance.now() + lead;
    let side = random() < 0.5 ? 'left' : 'right';
    for (let i = 0; i < totalNotes; i += 1) {
      // สลับฝั่งแบบสุ่ม แต่ห้ามซ้ำฝั่งเดิมเกิน 2 ครั้งติด จะได้ไม่กลายเป็นรัวข้างเดียว
      if (i > 0) side = random() < 0.62 ? (side === 'left' ? 'right' : 'left') : side;
      queue.push({ side, hitTime: t0 + i * round.beatMs, el: null, done: false });
    }
    roundEndAt = t0 + (totalNotes - 1) * round.beatMs + cfg.hitWindowMs + 400;

    flash(`QTE ${roundIndex + 1}`, 'go');
    running = true;
  }

  function roundCleared() {
    running = false;
    hoursGained = round.hours;
    bonus.textContent = `+${hoursSoFar + hoursGained} ชม.`;
    bonus.classList.remove('is-bump');
    void bonus.offsetWidth;
    bonus.classList.add('is-bump');
    flash(`+${round.hours} HOURS`, 'clear');
    later(finish, 1200);
  }

  // ── ตัวจับเวลาแสดงผล ───────────────────────────────────────────
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running) return;

    // ถึงเวลาโผล่ (นับถอยหลังจากจุดที่ต้องกด travelMs)
    while (queue.length && queue[0].hitTime - now <= cfg.travelMs) {
      const n = queue.shift();
      const node = el('div', `qte-note qte-note--${n.side}`);
      node.appendChild(heartSvg('qte-note-heart'));
      lane.appendChild(node);
      n.el = node;
      notes.push(n);
    }

    for (const n of notes) {
      if (n.done) continue;
      // ตำแหน่ง: ก่อนถึงเวลาอยู่ที่ขอบ · ถึงเวลาพอดีอยู่กลางจอ (offset 0)
      const dt = n.hitTime - now;
      const dir = n.side === 'left' ? -1 : 1;
      const x = dir * (dt / cfg.travelMs) * cfg.laneWidth;
      n.el.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(1)}px)`;
      // เลยหน้าต่างไปแล้วยังไม่ได้กด = พลาด
      if (dt < -cfg.hitWindowMs) missNote(n);
    }

    notes = notes.filter((n) => !n.done);

    if (!queue.length && !notes.length && now > roundEndAt) roundCleared();
  }

  function removeNote(n, cls) {
    n.done = true;
    if (!n.el) return;
    n.el.classList.add(cls);
    const node = n.el;
    later(() => node.remove(), 360);
  }

  function missNote(n) {
    removeNote(n, 'is-missed');
    loseLife('MISS');
  }

  function loseLife(text) {
    livesLeft -= 1;
    paintLives();
    playSfx('opDown');
    flash(text, 'miss');
    wrap.classList.remove('is-shake');
    void wrap.offsetWidth;
    wrap.classList.add('is-shake');
    if (livesLeft <= 0) fail();
  }

  // ── ผู้เล่นกดปุ่ม ──────────────────────────────────────────────
  function press(side) {
    if (!running || finished) return;
    const now = performance.now();
    let best = null;
    for (const n of notes) {
      if (n.done || n.side !== side) continue;
      const d = Math.abs(n.hitTime - now);
      if (d <= cfg.hitWindowMs && (!best || d < Math.abs(best.hitTime - now))) best = n;
    }

    const key = side === 'left' ? keyL : keyR;
    key.classList.remove('is-press');
    void key.offsetWidth;
    key.classList.add('is-press');

    if (!best) { loseLife('MISS'); return; }        // กดตอนไม่มีอะไรอยู่ในกรอบ = พลาด

    removeNote(best, 'is-hit');
    hitCount += 1;
    paintProgress();
    playSfx('success');
    const zone = side === 'left' ? hitL : hitR;
    zone.classList.remove('is-hit');
    void zone.offsetWidth;
    zone.classList.add('is-hit');
    target.classList.remove('is-beat');
    void target.offsetWidth;
    target.classList.add('is-beat');
    flash('PERFECT', 'hit');
  }

  const onKeyL = (e) => { e.preventDefault(); press('left'); };
  const onKeyR = (e) => { e.preventDefault(); press('right'); };
  keyL.addEventListener('pointerdown', onKeyL);
  keyR.addEventListener('pointerdown', onKeyR);

  // คีย์บอร์ดสำหรับเล่นบนคอม — มือถือใช้ปุ่มบนจอ
  function onKey(e) {
    if (e.repeat) return;
    if (['ArrowLeft', 'a', 'A', 'z', 'Z'].includes(e.key)) { e.preventDefault(); press('left'); }
    else if (['ArrowRight', 'd', 'D', 'm', 'M'].includes(e.key)) { e.preventDefault(); press('right'); }
  }
  window.addEventListener('keydown', onKey);

  // ── จบ ─────────────────────────────────────────────────────────
  function fail() {
    running = false;
    setSub(`พลาดครบ ${cfg.lives} ครั้ง — หมดสิทธิ์ต่อเวลา`);
    flash('FAILED', 'fail');
    later(finish, 1400);
  }

  function finish() {
    if (finished) return;
    finished = true;
    running = false;
    const ok = hoursGained > 0;
    const last = roundIndex >= cfg.rounds.length - 1;
    title.textContent = ok ? `LAST STAND +${hoursGained} HOURS` : 'LAST STAND OVER';
    title.classList.add(ok ? 'is-win' : 'is-lose');
    // บอกด้วยว่ายังมีรอบต่อไปรออยู่ไหม ผู้เล่นจะได้รู้ว่าต้องเก็บแรงไว้อีก
    setSub(ok
      ? (last ? 'ยืดได้ครบทุกรอบแล้ว — ไม่มีต่อเวลาอีก' : 'กลับไปสั่งงานต่อ · หมดเวลาแล้วเจอกันรอบหน้า')
      : 'โรเบิร์ตสันหมดแรงแล้ว');
    later(() => {
      // อนิเมชั่นปิดจอ — ผ่านแล้วแผงจะวูบสว่างแล้วขยายจางหายไป · แพ้จะทรุดลงแล้วจาง
      wrap.classList.remove('is-in');
      wrap.classList.add('is-out', ok ? 'is-win' : 'is-lose');
      later(() => {
        destroy();
        onFinish?.(hoursGained, { hits: hitCount, livesLeft });
      }, CLOSE_MS);
    }, 1200);
  }

  function destroy() {
    cancelAnimationFrame(raf);
    for (const t of timers) clearTimeout(t);
    timers = [];
    window.removeEventListener('keydown', onKey);
    wrap.remove();
  }

  paintLives();
  raf = requestAnimationFrame(frame);
  later(startRound, 700);   // รอให้แผงโผล่มาสุดก่อนค่อยเริ่มนับจังหวะ

  return { destroy };
}
