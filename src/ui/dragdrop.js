// ลากไอคอนสกิลไปวางบนโซน — อ้างอิง docs/GAMESCREEN_SPEC.md §10
//
// ลำดับ: แตะค้าง → หยุดเวลา → โซนที่ลงไม่ได้ขึ้นกากบาท → ลากผ่านโซนดูข้อมูล
//        → ปล่อยบนโซนที่ลงได้ = ใช้สกิลทันที (ไม่มีหน้ายืนยัน) · ปล่อยที่อื่น = ยกเลิก
//
// ไฟล์นี้อยู่ใน ui/ จึงไม่ตัดสินกฎเกมเอง — ถาม systems/skills.js ทุกครั้ง
// ใช้ Pointer Events ตัวเดียวคุมทั้งเมาส์และนิ้ว และ setPointerCapture กันไม่ให้
// เหตุการณ์หลุดไปโดนตัวปัดแผนที่ระหว่างลาก

import { dropCheck, applyDrop, skillStatus } from '../systems/skills.js';
import { setDragMarks } from './map.js';
import { fireSkillIcon } from './fx.js';

let active = null; // ลากได้ทีละอันเท่านั้น

export function isDragging() {
  return active !== null;
}

/**
 * ผูกความสามารถลากให้ไอคอนสกิล 1 อัน
 * @param ctx  { state, getMapHandle, pause, resume, onChange, onHoverZone }
 */
export function attachDrag(iconEl, opKey, skillId, ctx) {
  iconEl.addEventListener('pointerdown', (e) => {
    if (active || ctx.state.ended) return;
    if (!skillStatus(ctx.state, opKey, skillId).usable) return; // ใช้ไม่ได้ = ลากไม่ขึ้นตั้งแต่แรก
    e.preventDefault();
    startDrag(e, iconEl, opKey, skillId, ctx);
  });
}

/** สกิลที่ "เลือกค้างไว้" อยู่ตอนนี้ — null ถ้าไม่ได้เลือกอะไร (ใช้ตอนกดเลขซ้ำเพื่อยกเลิก) */
export function activeSelection() {
  return active ? { opKey: active.opKey, skillId: active.skillId, mode: active.mode } : null;
}

/**
 * เลือกสกิลด้วยคีย์บอร์ด (เล่นบนคอม) — เลือกแล้วเอาเมาส์ไปคลิกโซนที่จะลง
 * ต่างจากการลากตรงที่ "ปล่อยมือได้" ระหว่างเลือก ที่เหลือใช้กลไกเดียวกันทั้งหมด
 * คืน true ถ้าเลือกติด (สกิลใช้ได้จริงและแผนที่พร้อม)
 */
export function selectSkillByKey(iconEl, opKey, skillId, ctx) {
  if (active || ctx.state.ended) return false;
  if (!skillStatus(ctx.state, opKey, skillId).usable) return false;
  const r = iconEl.getBoundingClientRect();
  return startDrag(null, iconEl, opKey, skillId, ctx, r.left + r.width / 2, r.top + r.height / 2);
}

// e = pointerdown ตอนลาก · null ตอนเลือกด้วยคีย์บอร์ด (แล้วส่ง x/y ของไอคอนมาแทน)
function startDrag(e, iconEl, opKey, skillId, ctx, keyX = 0, keyY = 0) {
  const handle = ctx.getMapHandle();
  if (!handle) return false;
  const mode = e ? 'drag' : 'key';

  // จำไว้ว่าก่อนลากเวลาเดินอยู่ไหม — ถ้าผู้เล่นหยุดเองไว้ก่อน ปล่อยแล้วต้องไม่เดินต่อเอง
  const wasRunning = ctx.state.running;
  ctx.pause();

  // โซนที่ลงไม่ได้ คิดครั้งเดียวตอนเริ่มลาก (เวลาหยุดแล้ว สถานะจึงไม่เปลี่ยนระหว่างลาก)
  const invalidIds = new Set();
  for (const zone of Object.values(ctx.state.zones)) {
    if (!dropCheck(ctx.state, opKey, skillId, zone).ok) invalidIds.add(zone.id);
  }

  const ghost = iconEl.cloneNode(true);
  ghost.className = 'drag-ghost';
  ghost.style.width = `${iconEl.offsetWidth}px`;
  ghost.style.height = `${iconEl.offsetHeight}px`;
  document.body.appendChild(ghost);

  iconEl.classList.add('is-source');
  setDragMarks(handle, { active: true, invalidIds });

  active = {
    iconEl, ghost, opKey, skillId, ctx, handle, invalidIds, wasRunning, mode,
    hoverId: null, pointerId: e ? e.pointerId : null,
  };

  if (mode === 'drag') {
    iconEl.setPointerCapture(e.pointerId);
    iconEl.addEventListener('pointermove', onMove);
    iconEl.addEventListener('pointerup', onUp);
    iconEl.addEventListener('pointercancel', onCancel);
  } else {
    // โหมดคีย์บอร์ด: ไอคอนผีตามเมาส์ไปเรื่อย ๆ แล้ว "คลิก" คือการยืนยันลง
    // ดักที่ document เพราะเมาส์ไปได้ทั้งจอ ไม่ได้ถูกจับไว้กับไอคอนเหมือนตอนลาก
    document.addEventListener('pointermove', onDocMove);
    document.addEventListener('click', onDocClick, true);
  }
  window.addEventListener('keydown', onKey);

  const x = e ? e.clientX : keyX;
  const y = e ? e.clientY : keyY;
  moveGhost(x, y);
  updateHover(x, y);
  return true;
}

function moveGhost(x, y) {
  // ขยับด้วย transform (ผ่านตัวแปร --gx/--gy ที่ styles.css เอาไปใช้)
  // ไม่ใช้ left/top เพราะสองอันนั้นทำให้เบราว์เซอร์ต้องคำนวณผังหน้าใหม่ทุกครั้ง
  active.ghost.style.setProperty('--gx', `${x}px`);
  active.ghost.style.setProperty('--gy', `${y}px`);
}

// หาโซนที่อยู่ใต้ปลายนิ้ว — ghost กับเลเยอร์ทับต่าง ๆ ตั้ง pointer-events:none ไว้แล้ว
// elementFromPoint จึงทะลุลงไปโดน <path> ของโซนโดยตรง
function zoneIdAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.('.map-zone')?.dataset.zoneId ?? null;
}

function updateHover(x, y) {
  const id = zoneIdAt(x, y);
  if (id === active.hoverId) return;
  active.hoverId = id;
  setDragMarks(active.handle, { active: true, invalidIds: active.invalidIds, hoverId: id });
  // รอบที่ 6 จะเอา id นี้ไปแสดงรายละเอียดโซนในกล่องล่าง
  active.ctx.onHoverZone?.(id, active.opKey, active.skillId);
}

// นิ้วขยับยิงเหตุการณ์ถี่กว่าจอวาดจริง (มือถือบางรุ่น 120 ครั้ง/วินาที)
// จึงเก็บตำแหน่งล่าสุดไว้แล้วทำงานจริงแค่รอบละ 1 ครั้งต่อการวาดจอ 1 เฟรม
// สำคัญเพราะ updateHover() ต้องถาม "ใต้นิ้วคือโซนไหน" ซึ่งบังคับให้เบราว์เซอร์
// คำนวณผังหน้าใหม่ทันที — ทำถี่เกินจำเป็นคือสาเหตุที่ลากแล้วรู้สึกหนืด
let pending = null;
let pendingRaf = 0;

function flushMove() {
  pendingRaf = 0;
  if (!active || !pending) return;
  moveGhost(pending.x, pending.y);
  updateHover(pending.x, pending.y);
  pending = null;
}

function onMove(e) {
  if (!active || e.pointerId !== active.pointerId) return;
  pending = { x: e.clientX, y: e.clientY };
  if (!pendingRaf) pendingRaf = requestAnimationFrame(flushMove);
}

// โหมดคีย์บอร์ด — เมาส์ขยับเฉย ๆ ก็ให้ไอคอนผีตามและอัปเดตโซนใต้เคอร์เซอร์
function onDocMove(e) {
  if (!active || active.mode !== 'key') return;
  pending = { x: e.clientX, y: e.clientY };
  if (!pendingRaf) pendingRaf = requestAnimationFrame(flushMove);
}

// โหมดคีย์บอร์ด — คลิกคือการยืนยันลงโซน · คลิกที่อื่นคือยกเลิก (กติกาเดียวกับปล่อยนอกโซนตอนลาก)
function onDocClick(e) {
  if (!active || active.mode !== 'key') return;
  e.preventDefault();
  e.stopPropagation();   // กันคลิกนี้ไปโดนปุ่มอื่นที่อยู่ใต้เคอร์เซอร์
  drop(e.clientX, e.clientY);
}

function onUp(e) {
  if (!active || e.pointerId !== active.pointerId) return;
  drop(e.clientX, e.clientY);
}

// ลงจริงที่จุดนี้ — ใช้ร่วมกันทั้งการปล่อยนิ้วตอนลากและการคลิกตอนเลือกด้วยคีย์บอร์ด
function drop(x, y) {
  const { ctx, opKey, skillId, invalidIds, iconEl } = active;
  const zoneId = zoneIdAt(x, y);
  // ปล่อยนอกโซนที่ลงได้ = ยกเลิกเงียบ ๆ ไม่มีปุ่มยกเลิก (§10 ข้อ 4)
  const dropped = zoneId && !invalidIds.has(zoneId)
    ? applyDrop(ctx.state, opKey, skillId, ctx.state.zones[zoneId])
    : null;

  endDrag();
  if (dropped) fireSkillIcon(iconEl); // สั่งงานติดแล้ว — ไอคอนวูบสว่างให้รู้ว่ากดติด
  ctx.onChange?.(dropped, zoneId);
}

function onCancel() { endDrag(); }

function onKey(e) {
  if (e.key === 'Escape') endDrag();
}

function endDrag() {
  if (!active) return;
  // ทิ้งตำแหน่งที่ยังค้างอยู่ ไม่ให้ไปขยับไอคอนผีของการลากครั้งถัดไป
  if (pendingRaf) cancelAnimationFrame(pendingRaf);
  pendingRaf = 0;
  pending = null;
  const { iconEl, ghost, handle, ctx, wasRunning, pointerId } = active;
  active = null; // เคลียร์ก่อน เผื่อ handler ด้านล่างวนกลับเข้ามา

  iconEl.removeEventListener('pointermove', onMove);
  iconEl.removeEventListener('pointerup', onUp);
  iconEl.removeEventListener('pointercancel', onCancel);
  document.removeEventListener('pointermove', onDocMove);
  document.removeEventListener('click', onDocClick, true);
  window.removeEventListener('keydown', onKey);
  if (pointerId != null && iconEl.hasPointerCapture?.(pointerId)) iconEl.releasePointerCapture(pointerId);

  iconEl.classList.remove('is-source');
  ghost.remove();
  setDragMarks(handle, { active: false });
  ctx.onHoverZone?.(null);

  if (wasRunning) ctx.resume(); // เดินเวลาต่อเฉพาะกรณีที่ก่อนลากมันเดินอยู่
}

// เรียกตอนออกจากหน้าเกม กันไอคอนผีค้างบนจอ
export function cancelDrag() {
  endDrag();
}
