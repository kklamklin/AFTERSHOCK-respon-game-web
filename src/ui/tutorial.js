// §12.1 Tutorial (visual novel) — docs/AFTERSHOCK_Tutorial_Script_UI.md
// เอนจิน VN เบา ๆ: sprite + กล่องข้อความพิมพ์ทีละตัวอักษร + ของแทรกฉาก (แผนที่/สถิติ/ทีม/บาดเจ็บ/จบเกม)
// ไม่แตะ logic เกมจริงเลย — เป็นแค่การเล่าเรื่องก่อนเข้าเกม

import { TUTORIAL_SCRIPT, SPEAKER_META, TUTORIAL_SYNOPSIS } from '../data/tutorialScript.js';
import { iconNode } from '../data/icons.js';

const TYPE_SPEED_MS = 22; // ต่อ 1 ตัวอักษร

function portraitSrc(filename) {
  return `assets/characters/${filename}`;
}

export function renderTutorial(root, { onFinish } = {}) {
  root.innerHTML = '';
  root.className = 'screen-overlay screen--vn';

  const bg = document.createElement('div');
  bg.className = 'vn-bg';
  root.appendChild(bg);

  const stage = document.createElement('div');
  stage.className = 'vn-stage';
  root.appendChild(stage);

  const portrait = document.createElement('img');
  portrait.className = 'vn-portrait vn-portrait--center';
  portrait.alt = '';
  stage.appendChild(portrait);

  const insertPanel = document.createElement('div');
  insertPanel.className = 'vn-insert';
  stage.appendChild(insertPanel);

  const skipBtn = document.createElement('button');
  skipBtn.className = 'vn-skip';
  skipBtn.textContent = 'Skip all ⟫⟫⟫';
  root.appendChild(skipBtn);

  const box = document.createElement('div');
  box.className = 'vn-box';
  const tagRow = document.createElement('div');
  tagRow.className = 'vn-tag-row';
  const nameTag = document.createElement('span');
  nameTag.className = 'vn-nametag';
  const roleTag = document.createElement('span');
  roleTag.className = 'vn-role';
  tagRow.append(nameTag, roleTag);
  const textEl = document.createElement('div');
  textEl.className = 'vn-text';
  const nextHint = document.createElement('div');
  nextHint.className = 'vn-next';
  nextHint.textContent = 'Click to next ⟫⟫⟫';
  box.append(tagRow, textEl, nextHint);
  root.appendChild(box);

  const confirmOverlay = document.createElement('div');
  confirmOverlay.className = 'vn-confirm-overlay';
  confirmOverlay.innerHTML = `
    <div class="vn-confirm-box">
      <div class="vn-confirm-text">ต้องการข้ามทั้งหมดใช่ไหม?</div>
      <div class="vn-confirm-actions">
        <button class="vn-confirm-yes">ข้ามเลย</button>
        <button class="vn-confirm-no">เล่นต่อ</button>
      </div>
    </div>`;
  root.appendChild(confirmOverlay);

  // --- สถานะภายใน ---
  let index = 0;
  let typeTimer = null;
  let isTyping = false;
  let lastInsertKey = null;
  let ended = false;

  function insertKeyOf(step) {
    if (!step?.insert) return null;
    return `${step.insert.type}:${step.insert.mode ?? ''}`;
  }

  function typeOut(text) {
    clearInterval(typeTimer);
    textEl.textContent = '';
    isTyping = true;
    let i = 0;
    typeTimer = setInterval(() => {
      i += 1;
      textEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(typeTimer);
        isTyping = false;
      }
    }, TYPE_SPEED_MS);
  }

  function completeTypingNow(text) {
    clearInterval(typeTimer);
    textEl.textContent = text;
    isTyping = false;
  }

  function buildInsert(step) {
    insertPanel.innerHTML = '';
    const ins = step.insert;
    if (!ins) return;

    if (ins.type === 'map') {
      const wrap = document.createElement('div');
      wrap.className = `vn-map vn-map--${ins.mode}`;
      const img = document.createElement('img');
      img.src = 'map.svg';
      img.className = 'vn-map-img';
      wrap.appendChild(img);
      if (ins.level) {
        const chip = document.createElement('div');
        chip.className = `vn-map-legend vn-map-legend--${ins.level === 'cycle' ? 'cycle' : ins.level}`;
        chip.textContent = ins.level === 'cycle' ? '🔘 เทา → 🟡 เหลือง → 🔴 แดง' : ins.level === 'red' ? '🔴 แดง — วิกฤต' : '';
        wrap.appendChild(chip);
      }
      if (ins.team) {
        const team = document.createElement('div');
        team.className = 'vn-map-team';
        team.innerHTML = '';
    team.append(iconNode('opHuman', 'vn-glyph'), iconNode('opCat', 'vn-glyph'));
        wrap.appendChild(team);
      }
      if (ins.percent != null) {
        const pct = document.createElement('div');
        pct.className = 'vn-map-percent';
        pct.textContent = `${ins.percent}%`;
        wrap.appendChild(pct);
      }
      insertPanel.appendChild(wrap);
      return;
    }

    if (ins.type === 'stat') {
      // โผล่มาทันที ไม่มีอนิเมชันนับเลข/สไลด์ — เลขนิ่งกันบัค (ตามที่แจ้ง)
      const wrap = document.createElement('div');
      wrap.className = 'vn-stat';
      const label = document.createElement('div');
      label.className = 'vn-stat-label';
      const num = document.createElement('div');
      num.className = 'vn-stat-num';
      let value;
      if (ins.kind === 'survivors') { label.textContent = 'ผู้รอดในโซน'; value = 30; }
      else if (ins.kind === 'redzone') { label.textContent = 'โซนแดง — ผู้รอด'; value = 40; wrap.classList.add('vn-stat--danger'); }
      else { label.textContent = 'AP สะสม'; value = 24; }
      num.textContent = value;
      wrap.append(label, num);
      insertPanel.appendChild(wrap);
      return;
    }

    if (ins.type === 'team') {
      const wrap = document.createElement('div');
      wrap.className = 'vn-team';
      const field = document.createElement('div');
      field.className = `vn-team-group ${ins.highlight === 'field' ? 'vn-team-group--on' : ins.highlight ? 'vn-team-group--dim' : ''}`;
      field.innerHTML = '';
    field.append(iconNode('opHuman', 'vn-glyph'), iconNode('opCat', 'vn-glyph'));
      const support = document.createElement('div');
      support.className = `vn-team-group ${ins.highlight === 'support' ? 'vn-team-group--on' : ins.highlight ? 'vn-team-group--dim' : ''}`;
      support.innerHTML = '';
    support.append(iconNode('opElf', 'vn-glyph'), iconNode('opSpirit', 'vn-glyph'));
      wrap.append(field, support);
      insertPanel.appendChild(wrap);
      return;
    }
  }

  function renderStep(i) {
    const step = TUTORIAL_SCRIPT[i];

    // ฉากบรรยายเปิดเรื่อง — ไม่มีตัวละคร/ป้ายชื่อ แค่พื้นหลัง + ข้อความเอียง
    if (step.narration) {
      portrait.style.display = 'none';
      insertPanel.innerHTML = '';
      bg.className = 'vn-bg';
      tagRow.style.display = 'none';
      textEl.classList.add('vn-text--narration');
      typeOut(step.text);
      nextHint.style.visibility = 'hidden';
      setTimeout(() => { nextHint.style.visibility = 'visible'; }, step.text.length * TYPE_SPEED_MS + 50);
      return;
    }
    portrait.style.display = '';
    tagRow.style.display = '';
    textEl.classList.remove('vn-text--narration');

    const meta = SPEAKER_META[step.speaker];
    nameTag.textContent = meta.name;
    nameTag.style.background = meta.tagColor;
    nameTag.style.color = meta.tagColor === '#1b1f24' ? '#fff' : '#1b1f24';
    roleTag.textContent = meta.role;
    roleTag.style.color = meta.roleColor;

    // ทุกตัวรวมถึง Robertson แสดงเหมือนกันหมด (ห้องบัญชาการปกติ ไม่มีจอมืดพิเศษ)
    portrait.src = portraitSrc(step.sprite);

    const key = insertKeyOf(step);
    const hasInsert = !!step.insert;
    portrait.classList.toggle('vn-portrait--side', hasInsert);

    bg.className = 'vn-bg';
    if (step.insert?.type === 'tone-dark' || step.insert?.type === 'injury' || step.insert?.type === 'gameover') {
      bg.classList.add('vn-bg--dark');
    }

    insertPanel.classList.toggle('vn-insert--instant', step.insert?.type === 'stat');

    if (key !== lastInsertKey) {
      buildInsert(step);
      insertPanel.classList.remove('vn-insert--in');
      void insertPanel.offsetWidth;
      if (hasInsert) insertPanel.classList.add('vn-insert--in');
    } else if (hasInsert) {
      buildInsert(step); // อัปเดตเนื้อหา (เช่น % หรือ highlight เปลี่ยน) แต่ไม่ทำอนิเมชันสไลด์ซ้ำ
    }
    lastInsertKey = key;

    if (step.insert?.type === 'gameover') {
      const flash = document.createElement('div');
      flash.className = 'vn-gameover-flash';
      root.appendChild(flash);
      setTimeout(() => flash.remove(), 900);
    }

    if (!step.interrupt) {
      portrait.classList.remove('vn-shake');
      void portrait.offsetWidth;
      portrait.classList.add('vn-shake');
    }

    typeOut(step.text);
    nextHint.style.visibility = 'hidden';
    const revealHint = () => { nextHint.style.visibility = 'visible'; };
    // แสดง "Click to next" เมื่อพิมพ์จบ (เช็คด้วย timer เดียวกับ typeOut คร่าว ๆ)
    const total = step.text.length * TYPE_SPEED_MS + 50;
    setTimeout(revealHint, total);
  }

  function advance() {
    if (ended) return;
    if (isTyping) {
      completeTypingNow(TUTORIAL_SCRIPT[index].text);
      nextHint.style.visibility = 'visible';
      return;
    }
    if (TUTORIAL_SCRIPT[index].final) {
      finishTutorial();
      return;
    }
    index += 1;
    if (index >= TUTORIAL_SCRIPT.length) {
      finishTutorial();
      return;
    }
    renderStep(index);
  }

  function finishTutorial() {
    ended = true;
    window.removeEventListener('keydown', onSpace);
    root.classList.add('vn-fadeout');
    setTimeout(() => onFinish?.(), 500);
  }

  box.addEventListener('click', (e) => {
    if (confirmOverlay.classList.contains('vn-confirm-overlay--on')) return;
    advance();
  });

  // เว้นวรรค = กดข้ามบทพูด (เล่นบนคอม) — ยิงคลิกที่กล่องบทพูดแทน
  // ยิงคลิกแทนที่จะเรียก advance() ตรง ๆ เพราะตอนกด "ข้ามทั้งหมด" กล่องนี้ถูกเปลี่ยน
  // ให้ทำงานอย่างอื่นแทน (box.onclick) เว้นวรรคจึงต้องทำตามตัวที่ผูกอยู่ล่าสุดเสมอ
  // ถอด listener ทิ้งตอนจบหน้าสอนเล่น — หลังจากนั้นปุ่มนี้ไม่ต้องทำอะไรอีก
  function onSpace(e) {
    if (e.code !== 'Space' && e.key !== ' ') return;
    if (ended || e.repeat) return;
    if (e.target?.closest?.('button')) return;   // กันเว้นวรรคซ้ำกับปุ่มที่โฟกัสอยู่
    e.preventDefault();
    if (confirmOverlay.classList.contains('vn-confirm-overlay--on')) return;
    box.click();
  }
  window.addEventListener('keydown', onSpace);

  skipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmOverlay.classList.add('vn-confirm-overlay--on');
  });

  confirmOverlay.querySelector('.vn-confirm-no').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmOverlay.classList.remove('vn-confirm-overlay--on');
  });

  confirmOverlay.querySelector('.vn-confirm-yes').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmOverlay.classList.remove('vn-confirm-overlay--on');
    clearInterval(typeTimer);
    insertPanel.innerHTML = '';
    portrait.style.display = 'none';
    bg.classList.add('vn-bg--dark');
    nameTag.textContent = 'สรุป';
    nameTag.style.background = '#555';
    nameTag.style.color = '#fff';
    roleTag.textContent = '';
    skipBtn.style.display = 'none';
    completeTypingNow(TUTORIAL_SYNOPSIS);
    nextHint.style.visibility = 'visible';
    box.onclick = () => finishTutorial();
  });

  renderStep(0);
}
