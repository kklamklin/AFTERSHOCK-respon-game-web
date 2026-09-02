// แผงเครื่องมือนักพัฒนา (Dev Panel) — ดูค่าตัวแปร · ปรับค่าสด ๆ · เปิดดูซอร์สโค้ด
//
// ⚠️ ต้องใส่รหัสผ่านก่อนถึงจะเข้าได้ — รหัสเดียวกับที่ใช้ปลดล็อก Building 21
// ใส่ถูกที่นี่ครั้งเดียว = ปลดล็อก Building 21 ให้ด้วยเลย (เจ้าของสั่งให้ย้ายมารวมที่นี่ที่เดียว)
//
// ── ทำไมแผงนี้อยู่ "นอกเวที" ──────────────────────────────────
// เกมวาดลงเวทีขนาดคงที่ 1320×600 แล้วย่อด้วย transform (ดู ui/stage.js)
// ถ้าเอาแผงไปไว้ในเวที ตัวหนังสือจะถูกย่อตามจนอ่านไม่ออกบนมือถือ
// แผงนี้จึงต่อกับ <body> ตรง ๆ ใช้พิกเซลจริง และไม่ถูกบังคับแนวนอน — เหมือนหน้าตรวจเสียง
//
// ── วิธีเปิด ──────────────────────────────────────────────────
//   • แตะเลขเวอร์ชันมุมจอ 5 ครั้งติดกัน (ใช้ได้ทั้งมือถือและคอม)
//   • หรือกด Ctrl + Shift + D บนคอม
//   • หรือกด PLAY ที่โหมด Building 21 ตอนยังไม่ปลดล็อก — เด้งมาที่นี่ให้เอง

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { isDlcUnlocked, setDlcUnlocked } from '../data/prefs.js';
import { OPERATORS } from '../data/operators.js';

// ไฟล์ที่เปิดดูได้ในแท็บ "โค้ด" — เรียงตามโฟลเดอร์เหมือนแผนผังใน CLAUDE.md
const SOURCE_FILES = [
  'src/config.js', 'src/state.js', 'src/main.js', 'src/styles.css',
  'src/data/operators.js', 'src/data/operatorIntel.js', 'src/data/icons.js',
  'src/data/sounds.js', 'src/data/prefs.js', 'src/data/tutorialScript.js',
  'src/systems/zones.js', 'src/systems/time.js', 'src/systems/actionPoints.js',
  'src/systems/survivors.js', 'src/systems/death.js', 'src/systems/skills.js',
  'src/systems/status.js', 'src/systems/successRate.js', 'src/systems/danger.js',
  'src/systems/outcomes.js', 'src/systems/score.js',
  'src/ui/gameScreen.js', 'src/ui/map.js', 'src/ui/dragdrop.js', 'src/ui/panels.js',
  'src/ui/feed.js', 'src/ui/qte.js', 'src/ui/gameMenu.js', 'src/ui/hints.js',
  'src/ui/screens.js', 'src/ui/result.js', 'src/ui/tutorial.js', 'src/ui/fx.js',
  'src/ui/skyline.js', 'src/ui/audio.js', 'src/ui/stage.js', 'src/ui/devPanel.js',
  'src/utils/rng.js', 'index.html', 'CLAUDE.md',
];

let panel = null;   // แผงที่เปิดอยู่ (เปิดได้ทีละอัน)

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/** เดินทุกกิ่งของ CONFIG แล้วคืนเฉพาะใบที่เป็นตัวเลข พร้อม path เต็ม */
function numericLeaves(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out.push({ path, value: v });
    else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'number') out.push({ path: `${path}[${i}]`, value: item });
        else if (item && typeof item === 'object') numericLeaves(item, `${path}[${i}]`, out);
      });
    } else if (v && typeof v === 'object') numericLeaves(v, path, out);
  }
  return out;
}

/** เขียนค่ากลับเข้า CONFIG ตาม path เช่น "buffs.scan.ap" หรือ "ranks[2].min" */
function setByPath(root, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) cur = cur?.[parts[i]];
  if (cur) cur[parts[parts.length - 1]] = value;
}

export function isDevPanelOpen() {
  return !!panel;
}

export function closeDevPanel() {
  if (!panel) return;
  panel.cleanup();
  panel.root.remove();
  panel = null;
}

/** เปิดแผง — ถ้ายังไม่เคยใส่รหัสจะขึ้นหน้ารหัสผ่านก่อน */
export function openDevPanel({ onUnlock } = {}) {
  if (panel) return panel;

  const root = el('div', 'dev-root');
  document.body.appendChild(root);
  let timer = null;
  panel = { root, cleanup: () => { if (timer) clearInterval(timer); timer = null; } };

  if (!isDlcUnlocked()) showGate();
  else showPanel();

  // ── หน้ารหัสผ่าน ───────────────────────────────────────────
  function showGate() {
    root.innerHTML = '';
    const box = el('div', 'dev-gate');
    box.append(
      el('div', 'dev-gate-title', 'DEV PANEL'),
      el('div', 'dev-gate-note', 'ใส่รหัสผ่าน 15 หลักเพื่อเข้าใช้งาน\nรหัสเดียวกับที่ใช้ปลดล็อกโหมด Building 21'),
    );
    const input = el('input', 'dev-gate-input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.maxLength = 15;
    input.placeholder = '••••••••••••••';
    const err = el('div', 'dev-gate-err');
    const row = el('div', 'dev-row');
    const okBtn = el('button', 'dev-btn dev-btn--go', 'เข้าใช้งาน');
    const cancel = el('button', 'dev-btn', 'ปิด');
    row.append(cancel, okBtn);
    box.append(input, err, row);
    root.appendChild(box);

    // รับเฉพาะตัวเลข พิมพ์อย่างอื่นถูกตัดทิ้งทันที
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 15);
      err.textContent = '';
    });
    const submit = () => {
      if (input.value === CONFIG.dlcAccessCode) {
        setDlcUnlocked();          // ปลดล็อก Building 21 ไปพร้อมกัน
        onUnlock?.();
        showPanel();
        return;
      }
      err.textContent = 'รหัสไม่ถูกต้อง';
      box.classList.remove('is-shake');
      void box.offsetWidth;         // รีทริกเกอร์แอนิเมชันสั่นให้เล่นซ้ำได้
      box.classList.add('is-shake');
    };
    okBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    cancel.addEventListener('click', closeDevPanel);
    input.focus();
  }

  // ── แผงจริง ────────────────────────────────────────────────
  function showPanel() {
    root.innerHTML = '';
    const head = el('div', 'dev-head');
    head.append(el('span', 'dev-title', 'DEV PANEL'));
    const tabs = el('div', 'dev-tabs');
    const closeBtn = el('button', 'dev-close', '✕');
    closeBtn.addEventListener('click', closeDevPanel);
    head.append(tabs, closeBtn);

    const bodyEl = el('div', 'dev-body');
    root.append(head, bodyEl);

    const TABS = [
      { id: 'state', label: 'ตัวแปร', build: buildState },
      { id: 'tune', label: 'ปรับค่า', build: buildTune },
      { id: 'code', label: 'โค้ด', build: buildCode },
    ];
    let current = 'state';
    const btns = TABS.map((t) => {
      const b = el('button', 'dev-tab', t.label);
      b.dataset.tab = t.id;
      b.addEventListener('click', () => { current = t.id; render(); });
      tabs.appendChild(b);
      return b;
    });

    function render() {
      if (timer) { clearInterval(timer); timer = null; }
      btns.forEach((b) => b.classList.toggle('is-on', b.dataset.tab === current));
      bodyEl.innerHTML = '';
      TABS.find((t) => t.id === current).build(bodyEl);
    }
    render();

    // ── แท็บ 1: ค่าตัวแปรสด ๆ ────────────────────────────────
    function buildState(host) {
      const pre = el('pre', 'dev-pre');
      host.append(el('div', 'dev-note', 'อัปเดตเองทุกครึ่งวินาที · ค่าจาก state.js ของจริง'), pre);
      const paint = () => {
        const u = Object.entries(state.units ?? {}).map(([k, v]) =>
          `  ${(OPERATORS[k]?.name ?? k).padEnd(11)} ${String(v.status ?? '-').padEnd(10)}`
          + ` เหลือ ${String(v.busyRemainLoops ?? 0).padStart(3)} ลูป`
          + ` · โซน ${v.zoneId ?? '-'}`
          + (v.recoverLoops ? ` · ฟื้นอีก ${v.recoverLoops} ลูป` : ''));
        const zones = Object.values(state.zones ?? {});
        const byTier = (t) => zones.filter((z) => z.tier === t);
        const sum = (a, f) => a.reduce((s, z) => s + (f(z) || 0), 0);
        const tierLine = (t, name) => {
          const g = byTier(t);
          return `  ${name.padEnd(8)} ${String(g.length).padStart(2)} โซน`
            + ` · ติดอยู่ ${Math.floor(sum(g, (z) => z.trapped)).toString().padStart(4)}`
            + ` · ช่วยแล้ว ${String(sum(g, (z) => z.rescued)).padStart(4)}`
            + ` · เสียชีวิต ${Math.floor(sum(g, (z) => z.casualties)).toString().padStart(4)}`;
        };
        pre.textContent = [
          '── เวลา / แต้ม ─────────────────────────',
          `  ชั่วโมงในเกม   ${state.hour ?? 0} / ${CONFIG.totalLoops / CONFIG.loopsPerHour}`,
          `  ลูปที่          ${state.loop ?? 0} / ${CONFIG.totalLoops}`,
          `  AP             ${state.ap ?? 0}`,
          `  เวลาเดินอยู่    ${state.running ? 'ใช่' : 'ไม่ (หยุดอยู่)'}   ความเร็ว ${state.speed ?? 1}x`,
          `  จบเกมแล้ว      ${state.ended ? `ใช่ (${state.endReason ?? '-'})` : 'ยัง'}`,
          '',
          '── ผลรวมทั้งเมือง ──────────────────────',
          `  ช่วยได้        ${sum(zones, (z) => z.rescued)}`,
          `  เสียชีวิต      ${Math.floor(sum(zones, (z) => z.casualties))}`,
          `  ยังติดอยู่     ${Math.floor(sum(zones, (z) => z.trapped))}`,
          `  ส่งภารกิจไป    ${state.stats?.missions ?? 0} ครั้ง`,
          '',
          '── แยกตามระดับโซน ─────────────────────',
          tierLine('gray', 'เทา'),
          tierLine('yellow', 'เหลือง'),
          tierLine('red', 'แดง'),
          '',
          '── เจ้าหน้าที่ ─────────────────────────',
          ...u,
          '',
          '── Last Stand / CRITICAL ───────────────',
          `  lastStandQte        ${JSON.stringify(state.lastStandQte ?? null)}`,
          `  lastStandQteDone    ${state.lastStandQteDone ?? 0}`,
          `  criticalCountdown   ${state.criticalCountdownLoops ?? '-'}`,
        ].join('\n');
      };
      paint();
      timer = setInterval(paint, 500);
    }

    // ── แท็บ 2: ปรับค่า ──────────────────────────────────────
    function buildTune(host) {
      host.appendChild(el('div', 'dev-note',
        'ปุ่มลัดมีผลกับเกมที่กำลังเล่นอยู่ทันที · ค่าใน CONFIG มีผลกับสิ่งที่อ่านตอนรันไทม์\n'
        + '(ราคาบนการ์ด จนท. ถูกคำนวณตอนโหลดเกม จะเปลี่ยนก็ต่อเมื่อรีเฟรชหน้า)'));

      // ปุ่มลัดที่ใช้บ่อยตอนเทส
      const quick = el('div', 'dev-quick');
      const act = (label, fn) => {
        const b = el('button', 'dev-btn', label);
        b.addEventListener('click', () => { fn(); flash(b); });
        quick.appendChild(b);
      };
      act('เติม AP 999', () => { state.ap = 999; });
      act('AP = 0', () => { state.ap = 0; });
      act('เคลียร์คูลดาวน์ทุกคน', () => {
        for (const u of Object.values(state.units ?? {})) {
          u.busyRemainLoops = 0; u.zoneId = null;
          if (u.cooldowns) for (const k of Object.keys(u.cooldowns)) u.cooldowns[k] = 0;
        }
      });
      act('รักษาทุกคนให้หาย', () => {
        for (const u of Object.values(state.units ?? {})) {
          u.status = 'ready'; u.recoverLoops = 0; u.busyRemainLoops = 0;
        }
        state.criticalCountdownLoops = null;
      });
      act('หยุด/เดินเวลา', () => { state.running = !state.running; });
      host.appendChild(quick);

      // ช่องแก้ค่าใน state โดยตรง
      const grid = el('div', 'dev-grid');
      const field = (label, get, set, step = 1) => {
        const row = el('label', 'dev-field');
        row.appendChild(el('span', 'dev-field-label', label));
        const inp = el('input', 'dev-input');
        inp.type = 'number'; inp.step = String(step);
        inp.value = String(get());
        inp.addEventListener('change', () => {
          const v = Number(inp.value);
          if (Number.isFinite(v)) { set(v); flash(inp); }
        });
        row.appendChild(inp);
        grid.appendChild(row);
      };
      field('AP ปัจจุบัน', () => state.ap ?? 0, (v) => { state.ap = v; });
      field('ชั่วโมงในเกม', () => state.hour ?? 0, (v) => { state.hour = v; });
      field('ความเร็ว (1 หรือ 2)', () => state.speed ?? 1, (v) => { state.speed = v; });
      host.append(el('div', 'dev-sub', 'ค่าใน state (แก้แล้วมีผลทันที)'), grid);

      // ตัวเลขทุกตัวใน CONFIG — ค้นหาได้
      host.appendChild(el('div', 'dev-sub', 'ตัวเลขทั้งหมดใน config.js'));
      const search = el('input', 'dev-search');
      search.type = 'search';
      search.placeholder = 'ค้นหา เช่น ap, cooldown, danger';
      host.appendChild(search);
      const list = el('div', 'dev-grid dev-grid--tall');
      host.appendChild(list);

      const leaves = numericLeaves(CONFIG);
      const paintList = () => {
        const q = search.value.trim().toLowerCase();
        list.innerHTML = '';
        const rows = leaves.filter((l) => !q || l.path.toLowerCase().includes(q)).slice(0, 260);
        for (const leaf of rows) {
          const row = el('label', 'dev-field');
          row.appendChild(el('span', 'dev-field-label', leaf.path));
          const inp = el('input', 'dev-input');
          inp.type = 'number'; inp.step = 'any';
          inp.value = String(leaf.value);
          inp.dataset.path = leaf.path;
          inp.addEventListener('change', () => {
            const v = Number(inp.value);
            if (!Number.isFinite(v)) return;
            setByPath(CONFIG, leaf.path, v);
            leaf.value = v;
            flash(inp);
          });
          row.appendChild(inp);
          list.appendChild(row);
        }
        if (!rows.length) list.appendChild(el('div', 'dev-note', 'ไม่เจอค่าที่ตรงกับคำค้น'));
      };
      search.addEventListener('input', paintList);
      paintList();
    }

    // ── แท็บ 3: ดูซอร์สโค้ด ──────────────────────────────────
    function buildCode(host) {
      const bar = el('div', 'dev-row');
      const pick = el('select', 'dev-select');
      for (const f of SOURCE_FILES) {
        const o = document.createElement('option');
        o.value = f; o.textContent = f;
        pick.appendChild(o);
      }
      const info = el('span', 'dev-note dev-note--inline', '');
      bar.append(pick, info);
      const pre = el('pre', 'dev-pre dev-pre--code');
      host.append(bar, pre);

      async function load(file) {
        pre.textContent = 'กำลังโหลด...';
        try {
          const res = await fetch(file, { cache: 'no-store' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const text = await res.text();
          pre.textContent = text;
          const lines = text.split('\n').length;
          info.textContent = `${lines} บรรทัด · ${(text.length / 1024).toFixed(1)} KB`;
        } catch (e) {
          pre.textContent = `เปิดไฟล์ไม่ได้: ${e.message}\n\n`
            + '(ถ้าเปิดเกมจากไฟล์ในเครื่องแบบ file:// เบราว์เซอร์จะบล็อกการอ่านไฟล์\n'
            + ' ต้องเปิดผ่านเว็บ เช่น GitHub Pages ถึงจะดูโค้ดได้)';
          info.textContent = '';
        }
      }
      pick.addEventListener('change', () => load(pick.value));
      load(pick.value);
    }
  }

  function flash(node) {
    node.classList.remove('is-flash');
    void node.offsetWidth;
    node.classList.add('is-flash');
  }

  return panel;
}

/**
 * ผูกทางเข้าแผง — เรียกครั้งเดียวตอนเปิดเกม (main.js)
 *   • Ctrl + Shift + D
 *   • แตะเลขเวอร์ชัน 5 ครั้งติดกันภายใน 2 วินาที (ทางเดียวที่ใช้ได้บนมือถือ)
 */
export function attachDevPanelEntry() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      if (panel) closeDevPanel(); else openDevPanel();
    }
    if (e.key === 'Escape' && panel) closeDevPanel();
  });

  let taps = 0;
  let last = 0;
  document.addEventListener('pointerdown', (e) => {
    if (!e.target?.closest?.('.version-tag')) return;
    const now = Date.now();
    taps = now - last < 2000 ? taps + 1 : 1;
    last = now;
    if (taps >= 5) { taps = 0; openDevPanel(); }
  }, true);
}
