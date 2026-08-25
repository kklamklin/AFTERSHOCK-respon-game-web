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

function startDrag(e, iconEl, opKey, skillId, ctx) {
  const handle = ctx.getMapHandle();
  if (!handle) return;

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

  active = { iconEl, ghost, opKey, skillId, ctx, handle, invalidIds, wasRunning, hoverId: null, pointerId: e.pointerId };

  iconEl.setPointerCapture(e.pointerId);
  iconEl.addEventListener('pointermove', onMove);
  iconEl.addEventListener('pointerup', onUp);
  iconEl.addEventListener('pointercancel', onCancel);
  window.addEventListener('keydown', onKey);

  moveGhost(e.clientX, e.clientY);
  updateHover(e.clientX, e.clientY);
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

function onUp(e) {
  if (!active || e.pointerId !== active.pointerId) return;
  const { ctx, opKey, skillId, invalidIds, iconEl } = active;
  const zoneId = zoneIdAt(e.clientX, e.clientY);
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
  window.removeEventListener('keydown', onKey);
  if (iconEl.hasPointerCapture?.(pointerId)) iconEl.releasePointerCapture(pointerId);

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
