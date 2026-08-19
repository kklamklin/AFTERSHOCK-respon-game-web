// จนท. 4 ตัว + สกิล — อ้างอิงจาก docs/gamesystemfinal.md §16.2
//
// หมายเหตุชื่อไฟล์ asset (ปรับตามที่เจ้าของโปรเจกต์กำหนด):
//   ภาพตัวละคร   {status}-op-{codename}.png       เช่น normal-op-robertson.png, injured-op-robertson.png
//     - ภาคสนาม (field): status = normal / injured / lost  (ตรงกับ units[x].status ใน state.js)
//     - ภาคฐาน (support/base): status = normal (ปากปิด) / talk (ปากเปิด) สลับกันทำแอนิเมชันพูด
//   ไอคอนสกิล    icon-skill-{codename}-{skillId}.png   เช่น icon-skill-robertson-sar.png
//   ไอคอนสถานะ   icon-status-{context}.png             ใช้ร่วมกันได้ทุกตัว เช่น icon-status-injured.png, icon-status-cooldown.png
//
// key ของ object นี้ (human/cat/elf/spirit) คือ "สายพันธุ์" ใช้อ้างอิงใน logic ทั้งหมด
// (state.units, CONFIG ฯลฯ) ส่วน `name`/`codename` คือชื่อตัวละครที่โชว์ผู้เล่นและใช้ตั้งชื่อไฟล์ asset
export const OPERATORS = {
  human: {
    codename: 'robertson', name: 'Robertson', side: 'field', base: 75,
    portrait: (status = 'normal') => `${status}-op-robertson.png`,
    hasSpecialSkill: false, // TODO: บางตัวมีสกิลพิเศษเพิ่ม — รอ asset/สเปกเพิ่มเติม ยังไม่ต้องทำ
    skills: {
      sar: {
        name: 'Search & Rescue', icon: 'icon-skill-robertson-sar.png', type: 'field',
        zones: {
          gray:   { ap: 8,  cd: 1 },
          yellow: { ap: 16, cd: 2 },
          // แดง: เข้าไม่ได้
        },
      },
      crowd: {
        name: 'Crowd Control', icon: 'icon-skill-robertson-crowd.png', type: 'buff',
        buff: 25, scope: 'zone', durationHours: 3, ap: 14, cd: 3, risky: true,
      },
    },
  },

  cat: {
    codename: 'lyla', name: 'Lyla', side: 'field', base: 90,
    portrait: (status = 'normal') => `${status}-op-lyla.png`,
    hasSpecialSkill: false, // TODO: เช่นเดียวกับด้านบน
    skills: {
      hsar: {
        name: 'Hardly Search & Rescue', icon: 'icon-skill-lyla-hsar.png', type: 'field',
        zones: {
          gray:   { ap: 10, cd: 1 },
          yellow: { ap: 18, cd: 1 },
          red:    { ap: 30, cd: 2 },
        },
      },
    },
  },

  elf: {
    codename: 'ria', name: 'Ria', side: 'support',
    portrait: (talking = false) => `${talking ? 'talk' : 'normal'}-op-ria.png`,
    skills: {
      scan: {
        name: 'Scan Area', icon: 'icon-skill-ria-scan.png', type: 'buff',
        buff: 15, scope: 'multi', durationHours: 3, ap: 10, cd: 0,
      },
      alert: {
        name: 'Alert', icon: 'icon-skill-ria-alert.png', type: 'shield',
        buff: 0, immune: true, scope: 'zone', durationHours: 3, ap: 35, cd: 4,
      },
    },
  },

  spirit: {
    codename: 'mudongzock', name: 'Mudongzock', side: 'support',
    portrait: (talking = false) => `${talking ? 'talk' : 'normal'}-op-mudongzock.png`,
    skills: {
      air: {
        name: 'Air Deploy', icon: 'icon-skill-mudongzock-air.png', type: 'buff',
        buff: 15, scope: 'global', durationHours: 1, ap: 24, cd: 3,
      },
    },
  },
};

// ไอคอนสถานะที่ใช้ร่วมกันได้ทุกตัว (ไม่ผูกกับ operator คนใดคนหนึ่ง)
export const STATUS_ICONS = {
  injured: 'icon-status-injured.png',
  lost: 'icon-status-lost.png',
  cooldown: 'icon-status-cooldown.png',
};
