// แผงข้อมูลโซนที่โผล่ในกล่องล่างระหว่างลากไอคอน — อ้างอิง GAMESCREEN_SPEC.md §9.2
//
// วางเป็น 4 คอลัมน์เพื่อให้สูงเท่ากล่องสรุป Ⓐ/Ⓑ/Ⓒ เดิมพอดี
// ถ้าปล่อยให้กล่องสูงขึ้นตอนลาก แผนที่จะหดและโซนใต้ปลายนิ้วจะเลื่อนหนี — ห้ามเด็ดขาด
//
// ไฟล์นี้อยู่ใน ui/ จึงไม่คำนวณกฎเกมเอง — เรียก systems/ มาคำนวณแล้วเอาผลมาแสดง

import { CONFIG } from '../config.js';
import { OPERATORS } from '../data/operators.js';
import { displayCounts, deathPerHour } from '../systems/zones.js';
import { successBreakdown, buffsOn, BUFF_NAME } from '../systems/successRate.js';
import { dangerChance, injuryChance } from '../systems/danger.js';
import { dropCheck, apCost, workLoops } from '../systems/skills.js';

const TIER_LETTER = { gray: 'A', yellow: 'B', red: 'C' };
const TIER_NAME = { gray: 'ปกติ', yellow: 'อันตราย', red: 'วิกฤต' };
const BUFF_GLYPH = { crowd: '👥', scan: '👁', alert: '⚠', air: '🚁' };

// ข้อความบอกเหตุผลที่ลงโซนนี้ไม่ได้ (§10.1)
const REJECT_TEXT = {
  cleared: 'โซนนี้เคลียร์แล้ว',
  occupied: 'มีเจ้าหน้าที่ปฏิบัติการอยู่แล้ว',
  'zone-blocked': 'เจ้าหน้าที่คนนี้เข้าโซนนี้ไม่ได้',
  'buff-exists': 'โซนนี้มีบัฟชนิดนี้อยู่แล้ว',
  'no-ap': 'AP ไม่พอสำหรับโซนนี้',
  lost: 'เจ้าหน้าที่หมดสติ',
  working: 'เจ้าหน้าที่ไม่ว่าง',
  cooldown: 'สกิลติดคูลดาวน์',
  'no-stack': 'ช่อง Scan Area หมด',
  'laststand-blocked': 'ใช้สกิลนี้ระหว่าง Last Stand ไม่ได้',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function row(label, value, valueClass) {
  const r = el('div', 'zd-row');
  r.append(el('span', 'zd-label', label), el('span', `zd-value ${valueClass ?? ''}`.trim(), value));
  return r;
}

export function buildZoneDetail() {
  const box = el('div', 'zone-detail');
  box.hidden = true;

  return {
    box,

    /** แสดงข้อมูลโซนที่กำลังลากไอคอนอยู่เหนือ · zoneId = null คือซ่อนแผง */
    show(state, zoneId, opKey, skillId) {
      if (!zoneId) { box.hidden = true; return; }
      const zone = state.zones[zoneId];
      if (!zone) { box.hidden = true; return; }

      box.hidden = false;
      box.innerHTML = '';

      const skill = OPERATORS[opKey].skills[skillId];
      const check = dropCheck(state, opKey, skillId, zone);
      box.classList.toggle('is-reject', !check.ok);

      // ── คอลัมน์ 1: โซนไหน ใครจะลง ──────────────────────────
      const head = el('div', 'zd-col zd-col--head');
      const tag = el('div', `zd-zone zd-zone--${zone.level}`);
      tag.append(el('span', 'zd-zone-letter', TIER_LETTER[zone.level]), el('span', null, zoneId.replace('zone-', '')));
      head.append(tag, el('div', 'zd-op', `${OPERATORS[opKey].name} · ${skill.name}`));
      box.appendChild(head);

      // ── คอลัมน์ 2: สภาพโซน ─────────────────────────────────
      const d = displayCounts(zone);
      const buffs = buffsOn(state, zone);
      const info = el('div', 'zd-col');
      info.append(
        row('คนติดอยู่', `${d.trapped} คน`),
        row('อัตราตาย', `−${deathPerHour(zone, state.globalBuffs).toFixed(1)} คน/ชม.`, 'is-bad'),
        row('บัฟที่มี', buffs.length
          ? buffs.map((b) => `${BUFF_GLYPH[b.type] ?? ''}${BUFF_NAME[b.type] ?? b.type}`).join(' ')
          : '—'),
      );
      box.appendChild(info);

      // ── คอลัมน์ 3-4: ต่างกันระหว่างสกิลลงพื้นที่กับสกิลบัฟ ──
      if (skill.type === 'field') {
        const br = successBreakdown(state, opKey, zone);
        const chips = el('div', 'zd-col zd-chips');
        for (const p of br.parts) {
          const chip = el('span', `zd-chip ${p.value >= 0 ? 'is-plus' : 'is-minus'}`);
          chip.append(el('b', null, `${p.value > 0 ? '+' : ''}${p.value}`), el('small', null, p.label));
          chips.appendChild(chip);
        }
        box.appendChild(chips);

        const danger = dangerChance(state, zone);
        const injury = injuryChance(br.total, danger);
        const cost = apCost(state, opKey, skillId, zone.level);
        const loops = workLoops(state, opKey, skillId, zone.level);

        const out = el('div', 'zd-col zd-col--out');
        out.append(
          row('อัตราสำเร็จ', `${br.total}%`, 'is-big is-good'),
          row('เสี่ยงบาดเจ็บ', `${injury.toFixed(1)}%`, injury >= 15 ? 'is-bad' : ''),
          row('ค่าใช้จ่าย', cost == null ? '—' : `${cost} AP · ${(loops / CONFIG.loopsPerHour)} ชม.`),
        );
        box.appendChild(out);
      } else {
        const cfg = CONFIG.buffs[skillId];
        // รวมผลพิเศษไว้บรรทัดเดียวกัน ให้จำนวนบรรทัดเท่าโหมดลงพื้นที่พอดี (แผงสูงคงที่)
        let effect;
        if (skillId === 'alert') effect = 'ปลอดภัย 100%';
        else if (skillId === 'scan') effect = `+${cfg.rate} · ชะลอการตาย ${cfg.deathSlowFactor * 100}%`;
        else effect = `อัตราสำเร็จ +${cfg.rate}`;

        const out = el('div', 'zd-col zd-col--out zd-col--wide');
        out.append(
          row('ผลของบัฟ', effect, 'is-good'),
          row('อยู่ได้', `${cfg.durationHours} ชม.`),
          row('ค่าใช้จ่าย', `${cfg.ap} AP`),
        );
        box.appendChild(out);
      }

      // แถบเหตุผลตอนลงไม่ได้ — ทับด้านล่างของแผง
      if (!check.ok) {
        box.appendChild(el('div', 'zd-reject', `✕ ${REJECT_TEXT[check.reason] ?? 'ลงโซนนี้ไม่ได้'}`));
      }
    },

    hide() { box.hidden = true; },
  };
}
