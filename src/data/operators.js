// จนท. 4 ตัว + สกิล — อ้างอิงจาก docs/gamesystemfinal.md §16.2
export const OPERATORS = {
  human: {
    name: 'มนุษย์', side: 'field', base: 75, icon: 'op-human.png',
    skills: {
      sar: {
        name: 'Search & Rescue', icon: 'skill-sar.png', type: 'field',
        zones: {
          gray:   { ap: 8,  cd: 1 },
          yellow: { ap: 16, cd: 2 },
          // แดง: เข้าไม่ได้
        },
      },
      crowd: {
        name: 'Crowd Control', icon: 'skill-crowd.png', type: 'buff',
        buff: 25, scope: 'zone', durationHours: 3, ap: 14, cd: 3, risky: true,
      },
    },
  },

  cat: {
    name: 'สาวแมว', side: 'field', base: 90, icon: 'op-cat.png',
    skills: {
      hsar: {
        name: 'Hardly Search & Rescue', icon: 'skill-hsar.png', type: 'field',
        zones: {
          gray:   { ap: 10, cd: 1 },
          yellow: { ap: 18, cd: 1 },
          red:    { ap: 30, cd: 2 },
        },
      },
    },
  },

  elf: {
    name: 'เอลฟ์', side: 'support', icon: 'op-elf.png',
    skills: {
      scan: {
        name: 'Scan Area', icon: 'skill-scan.png', type: 'buff',
        buff: 15, scope: 'multi', durationHours: 3, ap: 10, cd: 0,
      },
      alert: {
        name: 'Alert', icon: 'skill-alert.png', type: 'shield',
        buff: 0, immune: true, scope: 'zone', durationHours: 3, ap: 35, cd: 4,
      },
    },
  },

  spirit: {
    name: 'ภูต', side: 'support', icon: 'op-spirit.png',
    skills: {
      air: {
        name: 'Air Deploy', icon: 'skill-air.png', type: 'buff',
        buff: 15, scope: 'global', durationHours: 1, ap: 24, cd: 3,
      },
    },
  },
};
