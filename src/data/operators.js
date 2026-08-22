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
        zones: {
          gray:   { ap: 6,  cd: 1 },
          yellow: { ap: 12, cd: 2 },
          // แดง: เข้าไม่ได้ (ยกเว้นตอน Last Stand — GAMESCREEN_SPEC §5.2)
        },
      },
      crowd: {
        name: 'Crowd Control', icon: 'Icon-skills-robertson-crowd_control.PNG', type: 'buff',
        // ไม่จองโซน · ไม่มีความเสี่ยงบาดเจ็บ (GAMESCREEN_SPEC §3.3) — ต้นทุนจริงคือคูลดาวน์ 3 ชม.
        buff: 25, scope: 'zone', durationHours: 3, ap: 14, cd: 3, risky: false,
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
        zones: {
          gray:   { ap: 10, cd: 1 },
          yellow: { ap: 18, cd: 1 },
          red:    { ap: 30, cd: 2 },
        },
      },
    },
  },

  // หมายเหตุ: โฟลเดอร์ Operators สะกดว่า "Lia" ส่วนโฟลเดอร์ Icon สะกดว่า "Ria" —
  // เจ้าของโปรเจกต์ยืนยันแล้วว่าชื่อจริงคือ "Lia" ไฟล์ไอคอนสกิลด้านล่างจึงยังใช้ชื่อเดิม (Ria) ตามไฟล์จริง
  // ต้องเปลี่ยนตอนอัปไฟล์จริงให้ตรงเป็น Lia ไม่งั้น path จะพัง
  elf: {
    name: 'Lia', side: 'support',
    portraits: {
      normal: 'Base-op-Lia.png', // ✅ มีไฟล์จริงแล้ว
      talk: ['Base-op-Lia-talking1.png', 'Base-op-Lia-talking2.png'], // ✅ มีไฟล์จริงแล้ว สลับ 2 เฟรมทำแอนิเมชันพูด
    },
    skills: {
      scan: {
        name: 'Scan Area', icon: 'Icon-skills-Ria-scan_area.PNG', type: 'buff', // TODO: เปลี่ยนเป็น Lia เมื่อเจ้าของแก้ชื่อไฟล์จริง
        buff: 15, scope: 'multi', durationHours: 3, ap: 10, cd: 0,
      },
      alert: {
        name: 'Alert Allied', icon: 'Icon-skills-Ria-alert_allied.PNG', type: 'shield', // TODO: เปลี่ยนเป็น Lia เมื่อเจ้าของแก้ชื่อไฟล์จริง
        buff: 0, immune: true, scope: 'zone', durationHours: 3, ap: 35, cd: 4,
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
        // หมายเหตุ: ไฟล์จริงสะกด "mudongzong" (ไม่มี c) — เจ้าของยืนยันชื่อจริงคือ mudongzock
        // ต้องเปลี่ยนไฟล์นี้ให้ตรงตอนอัปจริง ตอนนี้ path อ้างตามไฟล์ที่มีอยู่ (มี ✅ ไฟล์แล้ว)
        name: 'Air Deploy', icon: 'Icon-skills-mudongzong-air_deploy.PNG', type: 'buff', // TODO: แก้เป็น Icon-skills-mudongzock-air_deploy.PNG
        buff: 15, scope: 'global', durationHours: 1, ap: 24, cd: 3,
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
