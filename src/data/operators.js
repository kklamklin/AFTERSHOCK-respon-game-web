// จนท. ทั้งหมด + สกิล — "ทะเบียนกลาง" ที่ทั้งเกมอ่าน (รอบ 10.29)
// อ้างอิงจาก docs/gamesystemfinal.md §16.2
//
// ── ทำไมต้องเป็นทะเบียนกลาง ────────────────────────────────────────
// เดิมชื่อ จนท. ('human' 'cat' 'elf' 'spirit') กับชื่อสกิล ('scan' 'crowd' ...) ถูกพิมพ์ฝังไว้
// ราว 10 ไฟล์ (state · กฎสถานะ · หน้าเกม · แผนที่ · Intel ฯลฯ) เพิ่มตัวใหม่ต้องไล่แก้ทุกที่
// ตอนนี้ทุกไฟล์วนอ่านจาก OPERATORS ด้านล่างแทน — **เพิ่ม จนท. = เพิ่ม object 1 ก้อนในนี้**
// (+ ตัวเลขใน config.js + ข้อมูลหน้า Intel ใน operatorIntel.js — ดูหัวข้อ "วิธีเพิ่ม จนท." ด้านล่าง)
//
// ── กติกาที่ต้องรู้ ──────────────────────────────────────────────────
// • key ของ OPERATORS (human/cat/...) ใช้อ้างอิงใน logic ทั้งหมด (state.units ฯลฯ) — `name` คือชื่อที่ผู้เล่นเห็น
// • ลำดับใน object = ลำดับบนจอ และลำดับคีย์ลัดตัวเลข (ภาคสนามอยู่แถบซ้าย · ภาคฐานอยู่แถบขวา)
// • **id สกิลห้ามซ้ำกันข้าม จนท.** เพราะบัฟบนโซน/ตัวเลขใน CONFIG.buffs อ้างด้วย id สกิลตรง ๆ
// • ไฟล์นี้เก็บแค่ "ชื่อ/รูป/ชนิดสกิล/พฤติกรรม" — ตัวเลขบาลานซ์ทั้งหมดอยู่ config.js
//   (ราคา/เวลา/บัฟ ในนี้เป็น getter อ่าน CONFIG สด ๆ เพื่อให้ Custom Game ปรับได้)
// • ชื่อไฟล์รูปเป็น literal string ห้ามเขียนสูตรสร้างชื่อเอง — ไฟล์จริงตัวพิมพ์เล็ก/ใหญ่ไม่ตรงกัน
//   และ GitHub Pages แยกตัวพิมพ์เล็ก/ใหญ่ ชื่อไม่ตรงเป๊ะ = รูปหาย
//
// ── ฟิลด์ของ จนท. 1 ตัว ──────────────────────────────────────────────
//   name        ชื่อที่ผู้เล่นเห็น
//   side        'field' = ภาคสนาม (ลงพื้นที่เอง · แถบซ้าย) · 'support' = ภาคฐาน (บัฟ · แถบขวา)
//   portraits   รูปใน assets/characters/ — ภาคสนาม: normal/injured/lost(/laststand) · ภาคฐาน: normal/talk[2 เฟรม]
//   mapIcon     (ภาคสนาม) หมุดบนแผนที่ตอนลงโซน — path เต็ม
//   lastStand   true = มีความสามารถ Last Stand (ตอนนี้มีแค่ Robertson · กฎอยู่ systems/status.js)
//   skills      { [idสกิล]: สร้างด้วย fieldSkill() หรือ buffSkill() }
//
// ── ชนิดสกิล ───────────────────────────────────────────────────────
//   fieldSkill(configKey, {...})  ลงพื้นที่ช่วยคน · ตัวเลขอยู่ CONFIG.fieldSkills[configKey]
//                                 และตาราง %ช่วยชีวิตอยู่ CONFIG.rescueTierChance[configKey]
//   buffSkill(id, {...})          บัฟ · ตัวเลขอยู่ CONFIG.buffs[id] (id = id สกิล)
//     พฤติกรรมที่เปิดได้ด้วยธง (ไม่ต้องเขียนโค้ดเพิ่ม):
//       immune: true        โซนที่มีบัฟนี้ = จนท. ไม่บาดเจ็บ (Alert Allied)
//       locksUnit: true     ใช้แล้วตัว จนท. ไม่ว่างตามคูลดาวน์ (Crowd Control)
//     และจาก CONFIG.buffs[id]:
//       scope: 'global'     กดใช้ทันทีไม่ต้องลาก บัฟทั้งแมพ (Air Deploy)
//       needsUnit: true     ลงได้เฉพาะโซนที่มี จนท. ภาคสนามทำงานอยู่
//       maxStacks: n        ใช้ได้พร้อมกันสูงสุด n ช่อง คืนช่องตอนบัฟหมดอายุ (Scan Area)
//       deathSlowFactor     ชะลอการตายในโซน · rate = บวกอัตราสำเร็จ
//   ไอคอนบัฟบนแผนที่/แผงข้อมูลอยู่ที่ data/icons.js (key = id สกิล) — ไม่มีก็ไม่พัง ขึ้นว่างไว้
//
// ── วิธีเพิ่ม จนท. ใหม่ ────────────────────────────────────────────
//   1. เพิ่ม object ใน OPERATORS (คัดลอกตัวที่ชนิดเดียวกันมาแก้)
//   2. ภาคสนาม → เพิ่ม CONFIG.fieldSkills[key] + CONFIG.rescueTierChance[key]
//      บัฟ     → เพิ่ม CONFIG.buffs[idสกิล]
//   3. เพิ่มข้อมูลหน้า Intel ใน data/operatorIntel.js (ไม่มีก็ไม่พัง ขึ้นข้อมูลว่าง)
//   4. วางรูปลง assets/ ตามชื่อที่ใส่ไว้
//   ⚠️ แถบซ้าย/ขวาบนจอออกแบบไว้ฝั่งละ 2 ใบ ใส่เกินจะเบียด — ต้องจัดหน้าจอเพิ่มแยกต่างหาก

import { CONFIG } from '../config.js';

const TIERS = ['gray', 'yellow', 'red'];

// แปลงตาราง CONFIG.fieldSkills เป็นรูป zones ที่ระบบสกิลใช้ — ระดับที่ ap เป็น null คือเข้าไม่ได้
// เรียกผ่าน getter `zones` = คำนวณใหม่ทุกครั้งที่ถูกอ่าน แก้ CONFIG แล้วมีผลทันที
function fieldZones(configKey) {
  const { ap, workHours } = CONFIG.fieldSkills[configKey];
  const zones = {};
  for (const tier of TIERS) {
    if (ap[tier] == null) continue;
    zones[tier] = { ap: ap[tier], cd: workHours[tier] };
  }
  return zones;
}

/** สกิลลงพื้นที่ — ตัวเลขอยู่ที่ CONFIG.fieldSkills[configKey] */
function fieldSkill(configKey, fields) {
  return {
    ...fields,
    type: 'field',
    configKey,
    get zones() { return fieldZones(configKey); },
  };
}

// สกิลบัฟ — ฟิลด์ตัวเลขเป็น "getter" อ่าน CONFIG.buffs สด ๆ ทุกครั้งที่ถูกถาม
// ⚠️ เดิมคัดลอกค่าไว้ตอนโหลดไฟล์ ผลคือแก้ CONFIG ระหว่างรัน (Custom Game / Dev Panel) แล้วราคาไม่เปลี่ยน
// ฟิลด์ที่ใส่มาใน fields เองจะทับของจาก CONFIG
function buffSkill(id, fields) {
  const out = { type: 'buff', ...fields };
  const live = {
    buff: (b) => b.rate, scope: (b) => b.scope, durationHours: (b) => b.durationHours,
    ap: (b) => b.ap, cd: (b) => b.cooldownHours,
  };
  for (const [key, read] of Object.entries(live)) {
    if (key in fields) continue;
    Object.defineProperty(out, key, { get: () => read(CONFIG.buffs[id]), enumerable: true });
  }
  return out;
}

export const OPERATORS = {
  human: {
    name: 'Robertson', side: 'field',
    lastStand: true,
    mapIcon: 'assets/skills/Field-op-robertson-icon.png',
    portraits: {
      normal: 'Field-op-robertson.png',
      injured: 'Field-op-robertson-injured.png',
      // Robertson ใช้ภาพ injured ทั้งตอนบาดเจ็บและหมดสติ (GAMESCREEN_SPEC §12)
      lost: 'Field-op-robertson-injured.png',
      laststand: 'Field-op-robertson-finalstand.png',
    },
    hasSpecialSkill: false, // TODO: บางตัวมีสกิลพิเศษเพิ่ม — รอ asset/สเปกเพิ่มเติม ยังไม่ต้องทำ
    skills: {
      // เข้าโซนแดงได้แล้ว แต่ช้าและฐานสำเร็จต่ำ (75−40 = 35%) ไม่บัฟคือส่งไปตาย
      sar: fieldSkill('human', {
        name: 'Search & Rescue', icon: 'Icon-skills-robertson-search&rescue.PNG',
      }),
      // ไม่จองโซน · ไม่มีความเสี่ยงบาดเจ็บ (GAMESCREEN_SPEC §3.3) — ต้นทุนจริงคือ Robertson ไม่ว่างตามคูลดาวน์
      crowd: buffSkill('crowd', {
        name: 'Crowd Control', shortName: 'Crowd', icon: 'Icon-skills-robertson-crowd_control.PNG',
        risky: false, locksUnit: true,
      }),
    },
  },

  cat: {
    name: 'Lyla', side: 'field',
    mapIcon: 'assets/skills/Field-op-Lyla-icon.png',
    portraits: {
      normal: 'Field-op-Lyla.png',
      injured: 'Field-op-Lyla-injured.png',
      lost: 'Field-op-Lyla-unconscious.png', // ✅ มีไฟล์จริงแล้ว · Lyla ไม่มี Last Stand
    },
    hasSpecialSkill: false, // TODO: เช่นเดียวกับด้านบน
    skills: {
      hsar: fieldSkill('cat', {
        name: 'Hardsearch & Extract', icon: 'Icon-skills-Lyla-hardsearch&extract.png',
      }),
    },
  },

  // ⚠️ ชื่อในเกมคือ "Lia" แต่ไฟล์ไอคอนสกิลสะกดว่า "Ria" — เจ้าของสั่งให้ค้างไว้แบบนี้
  // ห้ามเปลี่ยนชื่อไฟล์ ห้ามแก้ path ด้านล่าง เปลี่ยนแล้วไอคอนหายทันที (ไฟล์จริงยังชื่อ Ria)
  elf: {
    name: 'Lia', side: 'support',
    portraits: {
      normal: 'Base-op-Lia.png', // ✅ มีไฟล์จริงแล้ว
      talk: ['Base-op-Lia-talking1.png', 'Base-op-Lia-talking2.png'], // ✅ มีไฟล์จริงแล้ว สลับ 2 เฟรมทำแอนิเมชันพูด
    },
    skills: {
      // ใช้ได้พร้อมกันหลายโซนตามจำนวนช่อง (CONFIG.buffs.scan.maxStacks)
      scan: buffSkill('scan', {
        name: 'Scan Area', shortName: 'Scan', icon: 'Icon-skills-Ria-scan_area.PNG', // ชื่อไฟล์สะกด Ria โดยตั้งใจ (ดูหมายเหตุด้านบน) ห้ามแก้
        scope: 'multi',
      }),
      alert: buffSkill('alert', {
        name: 'Alert Allied', shortName: 'Alert', icon: 'Icon-skills-Ria-alert_allied.PNG', // ชื่อไฟล์สะกด Ria โดยตั้งใจ (ดูหมายเหตุด้านบน) ห้ามแก้
        type: 'shield', immune: true,
      }),
    },
  },

  spirit: {
    name: 'Mudongzock', side: 'support',
    portraits: {
      normal: 'Base-op-mudongzock.png', // ✅ มีไฟล์จริงแล้ว
      talk: ['Base-op-mudongzock-talking1.PNG', 'Base-op-mudongzock-talking2.PNG'], // TODO: ยังไม่เห็นไฟล์นี้ ตรวจสอบตอนอัปจริง
    },
    skills: {
      // ⚠️ ในเกมชื่อ "Mudongzock" แต่ไฟล์จริงสะกด "mudongzong" (ไม่มี c) — เจ้าของสั่งให้ค้างไว้แบบนี้
      air: buffSkill('air', {
        name: 'Air Deploy', shortName: 'Air', icon: 'Icon-skills-mudongzong-air_deploy.PNG', // ชื่อไฟล์สะกด mudongzong โดยตั้งใจ ห้ามแก้ (ในเกมชื่อ Mudongzock)
      }),
    },
  },
};

// ── ตัวช่วยอ่านทะเบียน — ไฟล์อื่นใช้พวกนี้แทนการพิมพ์ชื่อ จนท./สกิลเอง ──────

/** key ของ จนท. ทุกตัว ตามลำดับในทะเบียน */
export const OP_KEYS = Object.keys(OPERATORS);

/** จนท. ฝั่งเดียวกัน — 'field' (ภาคสนาม) หรือ 'support' (ภาคฐาน) */
export function opsOnSide(side) {
  return OP_KEYS.filter((k) => OPERATORS[k].side === side);
}

export const FIELD_OPS = opsOnSide('field');
export const SUPPORT_OPS = opsOnSide('support');

/** สกิลทั้งเกมเรียงตามลำดับบนจอ (ภาคสนามก่อน แล้วภาคฐาน) — ใช้กับคีย์ลัดตัวเลข */
export function allSkills() {
  return [...FIELD_OPS, ...SUPPORT_OPS].flatMap((opKey) =>
    Object.entries(OPERATORS[opKey].skills).map(([skillId, skill]) => ({ opKey, skillId, skill })));
}

/** หาสกิลจาก id (id ไม่ซ้ำกันทั้งเกม) — คืน { opKey, skillId, skill } หรือ null */
export function findSkill(skillId) {
  return allSkills().find((s) => s.skillId === skillId) ?? null;
}

/** ชื่อสกิลที่ผู้เล่นเห็น — ใช้กับป้ายบัฟบนโซน/แผงข้อมูล */
export function skillName(skillId) {
  return findSkill(skillId)?.skill.name ?? skillId;
}

/** บัฟทั้งแมพ (กดใช้ทันที ไม่ต้องลาก) ไหม */
export function isGlobalSkill(skillId) {
  return CONFIG.buffs[skillId]?.scope === 'global';
}

/** จำนวนช่องสูงสุดของสกิลที่มีช่อง (เช่น Scan Area) — null = ไม่มีระบบช่อง */
export function stackLimit(skillId) {
  return CONFIG.buffs[skillId]?.maxStacks ?? null;
}

/**
 * ตัวเลขของสกิลลงพื้นที่ (base/ap/workHours) จาก CONFIG.fieldSkills
 * ไม่ระบุ skillId = ใช้สกิลลงพื้นที่ตัวแรกของ จนท. คนนั้น
 */
export function fieldConfigKey(opKey, skillId = null) {
  const skills = OPERATORS[opKey].skills;
  const skill = skillId ? skills[skillId] : Object.values(skills).find((s) => s.type === 'field');
  return skill?.configKey ?? opKey;
}

export function fieldConfig(opKey, skillId = null) {
  return CONFIG.fieldSkills[fieldConfigKey(opKey, skillId)];
}

// ตรวจทะเบียนตอนโหลด — เตือนใน Console ถ้าตั้งผิด (ไม่โยน error เพื่อไม่ให้เกมดับทั้งเกม)
(() => {
  const seen = new Map();
  for (const { opKey, skillId, skill } of allSkills()) {
    if (seen.has(skillId)) console.error(`[operators] id สกิลซ้ำ: "${skillId}" (${seen.get(skillId)} กับ ${opKey})`);
    seen.set(skillId, opKey);
    if (skill.type === 'field' && !CONFIG.fieldSkills[skill.configKey]) {
      console.error(`[operators] ไม่มี CONFIG.fieldSkills.${skill.configKey} ของสกิล ${skillId}`);
    }
    if (skill.type === 'field' && !CONFIG.rescueTierChance[skill.configKey]) {
      console.error(`[operators] ไม่มี CONFIG.rescueTierChance.${skill.configKey} ของสกิล ${skillId}`);
    }
    if (skill.type !== 'field' && !CONFIG.buffs[skillId]) {
      console.error(`[operators] ไม่มี CONFIG.buffs.${skillId} ของสกิล ${skillId}`);
    }
  }
})();


// ไอคอนสถานะที่ใช้ร่วมกันได้ทุกตัว (ไม่ผูกกับ operator คนใดคนหนึ่ง) — ยังไม่มีไฟล์จริง ใช้ placeholder ไปก่อน
export const STATUS_ICONS = {
  injured: 'icon-status-injured.png',
  lost: 'icon-status-lost.png',
  cooldown: 'icon-status-cooldown.png',
};
