// จนท. 4 ตัว + สกิล — อ้างอิงจาก docs/gamesystemfinal.md §16.2
//
// ชื่อไฟล์ asset อ้างอิงจากไฟล์จริงที่อัปโหลดไว้ใน Google Drive (ไม่ได้ตั้งเป็นสูตรเดียวกันทุกไฟล์
// เพราะไฟล์จริงตัวพิมพ์เล็ก/ใหญ่และเว้นวรรค/ underscore ไม่ตรงกันเป๊ะ — เก็บเป็น literal string
// ในนี้ที่เดียว ห้ามเขียนสูตรสร้างชื่อไฟล์เองที่อื่น ให้ import ใช้จากที่นี่เสมอ)
//
// **สำคัญ: ชื่อไฟล์ตัวพิมพ์เล็ก/ใหญ่มีผล** เพราะ GitHub Pages เป็น case-sensitive filesystem
// ถ้าอัปโหลดไฟล์มาแล้วชื่อไม่ตรงกับที่ระบุในนี้เป๊ะ ต้องมาแก้ path ในไฟล์นี้ให้ตรง
//
// key ของ OPERATORS (human/cat/elf/spirit) คือ "สายพันธุ์" ใช้อ้างอิงใน logic ทั้งหมด
// (state.units, CONFIG ฯลฯ) — `name` คือชื่อตัวละครที่โชว์ผู้เล่น
//
// ⚠ ไฟล์นี้เก็บได้แต่ "ชื่อ/รูป/ชนิดสกิล" เท่านั้น — ตัวเลขบาลานซ์ทั้งหมดอ่านจาก config.js
// เคยพิมพ์ราคา AP ซ้ำไว้ที่นี่ด้วย ผลคือแก้เลขใน config.js แล้วเกมไม่เปลี่ยนเลย เพราะโค้ดจริงอ่านจากที่นี่

import { CONFIG } from '../config.js';

// แปลงตาราง CONFIG.fieldSkills เป็นรูป zones ที่ระบบสกิลใช้ — ระดับที่ ap เป็น null คือเข้าไม่ได้
function fieldZones(opKey) {
  const { ap, workHours } = CONFIG.fieldSkills[opKey];
  const zones = {};
  for (const tier of ['gray', 'yellow', 'red']) {
    if (ap[tier] == null) continue;
    zones[tier] = { ap: ap[tier], cd: workHours[tier] };
  }
  return zones;
}

// แปลง CONFIG.buffs เป็นฟิลด์ที่การ์ดสกิลใช้แสดงผล
function buffSpec(id) {
  const b = CONFIG.buffs[id];
  return { buff: b.rate, scope: b.scope, durationHours: b.durationHours, ap: b.ap, cd: b.cooldownHours };
}

export const OPERATORS = {
  human: {
    name: 'Robertson', side: 'field',
    portraits: {
      normal: 'Field-op-robertson.png',
      injured: 'Field-op-robertson-injured.png',
      // Robertson ใช้ภาพ injured ทั้งตอนบาดเจ็บและหมดสติ (GAMESCREEN_SPEC §12)
      lost: 'Field-op-robertson-injured.png',
      laststand: 'Field-op-robertson-finalstand.png',
    },
    hasSpecialSkill: false, // TODO: บางตัวมีสกิลพิเศษเพิ่ม — รอ asset/สเปกเพิ่มเติม ยังไม่ต้องทำ
    skills: {
      sar: {
        name: 'Search & Rescue', icon: 'Icon-skills-robertson-search&rescue.PNG', type: 'field',
        // เข้าโซนแดงได้แล้ว แต่ช้าและฐานสำเร็จต่ำ (75−40 = 35%) ไม่บัฟคือส่งไปตาย
        zones: fieldZones('human'),
      },
      crowd: {
        name: 'Crowd Control', icon: 'Icon-skills-robertson-crowd_control.PNG', type: 'buff',
        // ไม่จองโซน · ไม่มีความเสี่ยงบาดเจ็บ (GAMESCREEN_SPEC §3.3) — ต้นทุนจริงคือคูลดาวน์
        ...buffSpec('crowd'), risky: false,
      },
    },
  },

  cat: {
    name: 'Lyla', side: 'field',
    portraits: {
      normal: 'Field-op-Lyla.png',
      injured: 'Field-op-Lyla-injured.png',
      lost: 'Field-op-Lyla-unconscious.png', // ✅ มีไฟล์จริงแล้ว · Lyla ไม่มี Last Stand
    },
    hasSpecialSkill: false, // TODO: เช่นเดียวกับด้านบน
    skills: {
      hsar: {
        name: 'Hardsearch & Extract', icon: 'Icon-skills-Lyla-hardsearch&extract.png', type: 'field',
        zones: fieldZones('cat'),
      },
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
      scan: {
        name: 'Scan Area', icon: 'Icon-skills-Ria-scan_area.PNG', type: 'buff', // ชื่อไฟล์สะกด Ria โดยตั้งใจ (ดูหมายเหตุด้านบน) ห้ามแก้
        ...buffSpec('scan'), scope: 'multi',
      },
      alert: {
        name: 'Alert Allied', icon: 'Icon-skills-Ria-alert_allied.PNG', type: 'shield', // ชื่อไฟล์สะกด Ria โดยตั้งใจ (ดูหมายเหตุด้านบน) ห้ามแก้
        ...buffSpec('alert'), immune: true,
      },
    },
  },

  spirit: {
    name: 'Mudongzock', side: 'support',
    portraits: {
      normal: 'Base-op-mudongzock.png', // ✅ มีไฟล์จริงแล้ว
      talk: ['Base-op-mudongzock-talking1.PNG', 'Base-op-mudongzock-talking2.PNG'], // TODO: ยังไม่เห็นไฟล์นี้ ตรวจสอบตอนอัปจริง
    },
    skills: {
      air: {
        // ⚠️ ในเกมชื่อ "Mudongzock" แต่ไฟล์จริงสะกด "mudongzong" (ไม่มี c) — เจ้าของสั่งให้ค้างไว้แบบนี้
        name: 'Air Deploy', icon: 'Icon-skills-mudongzong-air_deploy.PNG', type: 'buff', // ชื่อไฟล์สะกด mudongzong โดยตั้งใจ ห้ามแก้ (ในเกมชื่อ Mudongzock)
        ...buffSpec('air'),
      },
    },
  },
};

// ไอคอนสถานะที่ใช้ร่วมกันได้ทุกตัว (ไม่ผูกกับ operator คนใดคนหนึ่ง) — ยังไม่มีไฟล์จริง ใช้ placeholder ไปก่อน
export const STATUS_ICONS = {
  injured: 'icon-status-injured.png',
  lost: 'icon-status-lost.png',
  cooldown: 'icon-status-cooldown.png',
};
