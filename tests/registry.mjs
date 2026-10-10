// เทสรอบ 10.29 — กฎเกมอ่านจากทะเบียน จนท. (data/operators.js) ไม่ได้ฝังชื่อไว้ในโค้ด
// รันด้วย node ตรง ๆ ได้เลย (systems/ ไม่แตะ DOM): node tests/registry.mjs
// ตั้ง SRC=โฟลเดอร์อื่น เพื่อเทสกับสำเนาที่เพิ่ม จนท. ปลอมเข้าไป (ดู tests/newop.mjs)
const SRC = process.env.SRC ?? new URL('../src/', import.meta.url).href;
const { CONFIG } = await import(SRC + 'config.js');
const ops = await import(SRC + 'data/operators.js');
const { state, resetState } = await import(SRC + 'state.js');
const skills = await import(SRC + 'systems/skills.js');
const status = await import(SRC + 'systems/status.js');
const { tickLoop } = await import(SRC + 'systems/time.js');
const { dangerChance } = await import(SRC + 'systems/danger.js');
const { successBreakdown } = await import(SRC + 'systems/successRate.js');
const { resolveMission } = await import(SRC + 'systems/outcomes.js');
const rng = await import(SRC + 'utils/rng.js');

let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { if (c) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra); } };
const zonesOf = (lvl) => Object.values(state.zones).filter((z) => z.level === lvl && !z.cleared);

rng.setSeed(7);
resetState();
state.ap = 9999;

// ── ทะเบียน ──
ok(JSON.stringify(Object.keys(state.units)) === JSON.stringify(ops.OP_KEYS), 'state.units มีครบทุกตัวในทะเบียน', Object.keys(state.units));
ok(ops.FIELD_OPS.every((k) => ops.OPERATORS[k].side === 'field'), 'FIELD_OPS ตรงกับ side');
const ids = ops.allSkills().map((s) => s.skillId);
ok(new Set(ids).size === ids.length, 'id สกิลไม่ซ้ำกัน');

// ── ทุกสกิลใช้ได้จริงตามชนิด ──
for (const { opKey, skillId, skill } of ops.allSkills()) {
  resetState(); state.ap = 9999;
  const z = zonesOf('gray')[0];
  if (skill.type === 'field') {
    const r = skills.applyDrop(state, opKey, skillId, z);
    ok(r?.kind === 'deploy' && z.unit === opKey, `${ops.OPERATORS[opKey].name}/${skillId} ลงพื้นที่ได้`);
    const br = successBreakdown(state, opKey, z, { skillId });
    ok(br.parts[0].value === ops.fieldConfig(opKey, skillId).base, `${skillId} ฐานสำเร็จอ่านจาก CONFIG.fieldSkills`);
    // เดินจนงานจบ → คิดผลได้
    let out = null;
    for (let i = 0; i < 20 && !out; i++) tickLoop(state, { onMissionComplete: (k) => { if (k === opKey) out = resolveMission(state, k); } });
    ok(out && ['success', 'fail', 'toolate'].includes(out.kind), `${skillId} จบภารกิจแล้วคิดผลได้`, out?.kind);
  } else if (ops.isGlobalSkill(skillId)) {
    const r = skills.useGlobalSkill(state, opKey, skillId);
    ok(r?.kind === 'global' && skills.skillStatus(state, opKey, skillId).using, `${skillId} บัฟทั้งแมพใช้ได้ + ขึ้น USING`);
  } else {
    // บัฟที่ต้องมีคนอยู่ในโซน → ส่งภาคสนามที่ "ไม่ใช่เจ้าของสกิล" ลงก่อน
    if (CONFIG.buffs[skillId].needsUnit) {
      const helper = ops.FIELD_OPS.find((k) => k !== opKey);
      const fs = Object.entries(ops.OPERATORS[helper].skills).find(([, s]) => s.type === 'field')[0];
      skills.applyDrop(state, helper, fs, z);
      ok(skills.dropCheck(state, opKey, skillId, zonesOf('gray')[1]).reason === 'no-unit', `${skillId} ลงโซนว่างไม่ได้ (needsUnit)`);
    }
    const before = state.units[opKey].skillStacks[skillId];
    const r = skills.applyDrop(state, opKey, skillId, z);
    ok(r?.kind === 'buff' && z.buffs.some((b) => b.type === skillId && b.owner === opKey), `${skillId} ลงบัฟได้ + จำเจ้าของ`);
    if (skill.immune) ok(dangerChance(state, z) === 0, `${skillId} (immune) ทำให้อันตราย = 0`);
    if (skill.locksUnit) ok(state.units[opKey].busyRemainLoops > 0 && skills.skillStatus(state, opKey, skillId).using, `${skillId} (locksUnit) ล็อกตัว + USING`);
    const max = ops.stackLimit(skillId);
    if (max != null) {
      ok(before === max && state.units[opKey].skillStacks[skillId] === max - 1, `${skillId} ใช้ช่องไป 1 (${max}→${max - 1})`);
      const loops = CONFIG.buffs[skillId].durationHours * CONFIG.loopsPerHour;
      for (let i = 0; i < loops; i++) tickLoop(state, {});
      ok(state.units[opKey].skillStacks[skillId] === max, `${skillId} บัฟหมดอายุแล้วคืนช่องให้เจ้าของ`);
    }
  }
}

// ── Last Stand อ่านจากธง lastStand ──
for (const k of ops.FIELD_OPS) {
  resetState();
  for (const o of ops.FIELD_OPS) state.units[o].status = o === k ? 'injured' : 'lost';
  const expect = !!ops.OPERATORS[k].lastStand && ops.FIELD_OPS.length > 1;
  ok(status.canEnterLastStand(state, k) === expect, `${ops.OPERATORS[k].name} เข้า Last Stand ได้ = ${expect}`);
}
resetState();
for (const o of ops.FIELD_OPS) state.units[o].status = 'lost';
ok(status.bothFieldDown(state), 'ภาคสนามล้มหมดทุกคน = CRITICAL');
state.units[ops.FIELD_OPS[0]].status = 'normal';
ok(!status.bothFieldDown(state), 'ยังมีภาคสนามยืนอยู่ 1 คน = ไม่ CRITICAL');

console.log(`\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
