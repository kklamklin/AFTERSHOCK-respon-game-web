// บทสอนเล่น (Tutorial) แบบ visual novel — คัดลอกจาก docs/AFTERSHOCK_Tutorial_Script_UI.md
// แต่ละ step = 1 บทพูด = 1 จังหวะ "Click to next"
//
// field ที่ใช้:
//   speaker    'ria' | 'lyla' | 'robertson'
//   sprite     ไฟล์ภาพใน assets/characters/ (จาก OPERATORS[x].portraits)
//   text       บทพูด
//   interrupt  true = พูดแทรก ตัดไปทันทีไม่มีอนิเมชันเข้าฉาก
//   robertsonOverlay  true = โหมด portrait นิ่งซ้อนทับจอมืด (ไม่มีห้องบัญชาการ)
//   insert     ของแทรกฉาก (แผนที่ / สถิติ / ทีม / บาดเจ็บ / จบเกม) หรือ null = ห้องบัญชาการปกติ
//   final      true = จบบท เฟดดำ จบ tutorial

export const TUTORIAL_SCRIPT = [
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'ผู้บัญชาการ... เมืองเจอแผ่นดินไหวเมื่อ 6 ชั่วโมงก่อน' },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'ก่อนเริ่ม ขอพาดูระบบก่อนนิดนึง' },

  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'เมืองแบ่งเป็น 48 โซน', insert: { type: 'map', mode: 'full' } },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'เทา — ปกติ เหลือง — อันตราย แดง —', insert: { type: 'map', mode: 'full', level: 'cycle' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking2.png', text: '—วิกฤต เดี๋ยวก็รู้เองว่าทำไมสีมันน่ากลัว', interrupt: true, insert: { type: 'map', mode: 'full', level: 'red' } },
  { speaker: 'ria', sprite: 'Base-op-Lia-talking1.png', text: '...แย่งพูดอีกแล้ว', insert: { type: 'map', mode: 'full', level: 'red' } },

  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'เธออธิบายเป็นวิชาการไปหน่อยนะ ขอบ้าง' },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: '...เอาสิ ลองดู' },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking2.png', text: 'ผู้บัญชาการ ฟังทางนี้' },

  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'ลากตัวเรา ไปวางบนโซนที่จะส่งไป', insert: { type: 'map', mode: 'side', team: true } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'ง่ายๆ แค่นั้น', insert: { type: 'map', mode: 'side', team: true } },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: '—ก่อนปล่อยมือ มันจะโชว์ % ให้ดูก่อน', interrupt: true, insert: { type: 'map', mode: 'side', team: true, percent: 72 } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking2.png', text: 'อ๋อใช่ ปล่อยมือปุ๊บคือส่งจริง', insert: { type: 'map', mode: 'side', team: true, percent: 72 } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'ยกเลิกไม่ได้แล้วนะ', insert: { type: 'map', mode: 'side', team: true, percent: 72 } },

  { speaker: 'robertson', sprite: 'Field-op-robertson.png', text: 'รับทราบ', robertsonOverlay: true },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking1.png', text: '...พูดคำเดียวตลอดเลยเนี่ย' },
  { speaker: 'ria', sprite: 'Base-op-Lia-talking2.png', text: 'แต่เชื่อถือได้' },

  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'อ้อ เดี๋ยวก่อน' },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking2.png', text: 'เวลาไม่รอนะ ตอนทีมกำลังเดินไป คนก็ตายไปเรื่อยๆ', insert: { type: 'stat', kind: 'survivors' } },
  { speaker: 'ria', sprite: 'Base-op-Lia-talking1.png', text: '...พูดง่ายไปป่ะ', insert: { type: 'stat', kind: 'survivors' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'ก็มันจริง', insert: { type: 'stat', kind: 'survivors' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'โซนแดงยิ่งตายไว', insert: { type: 'stat', kind: 'redzone' } },

  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'ทุกครั้งที่ส่งทีม ใช้ AP', insert: { type: 'stat', kind: 'ap' } },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'ได้มาเรื่อยๆ ตามเวลา แต่ไม่พอหรอก', insert: { type: 'stat', kind: 'ap' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking1.png', text: 'เพราะงั้น—', insert: { type: 'stat', kind: 'ap' } },
  { speaker: 'ria', sprite: 'Base-op-Lia-talking1.png', text: '—อย่าทุ่มมั่ว', interrupt: true, insert: { type: 'stat', kind: 'ap' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'ฉันจะบอกว่ากั๊กไว้บ้างก็ดีนะ' },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'หรือทุ่มตอนจำเป็นก็ได้' },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking2.png', text: 'เห็นไหม เราคิดไม่ตรงกันเรื่องนี้เลย' },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'ลองเล่นดูเองละกัน' },

  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'ทีมมีสี่คน', insert: { type: 'team' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking2.png', text: 'ฉันกับ Robertson ลงพื้นที่', insert: { type: 'team', highlight: 'field' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'ฉันเข้าได้ทุกที่ ที่คนอื่นเข้าไม่ได้', insert: { type: 'team', highlight: 'field' } },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'ที่เหลือคือฉันกับอีกคน — ไม่ลงพื้นที่ แต่ช่วยเพิ่มโอกาสสำเร็จ', insert: { type: 'team', highlight: 'support' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking1.png', text: '...เวลาฉันบุกโซนแดง ช่วยเสริมด้วยล่ะ', insert: { type: 'team', highlight: 'support' } },

  { speaker: 'ria', sprite: 'Base-op-Lia-talking1.png', text: 'ภารกิจล้มเหลว... เจ้าหน้าที่มีโอกาสบาดเจ็บ', insert: { type: 'tone-dark' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking1.png', text: 'บาดเจ็บซ้ำ — หมดสติ ใช้งานไม่ได้ชั่วคราว', insert: { type: 'injury' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: 'ถ้าฉันกับ Robertson หมดสติพร้อมกัน...', insert: { type: 'injury' } },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'เกมจบ', insert: { type: 'gameover' } },
  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'เพราะงั้น... ไม่ใช่แค่ตัวเลขบนหน้าจอนะ' },

  { speaker: 'ria', sprite: 'Base-op-Lia.png', text: 'ระบบมีเท่านี้', insert: { type: 'map', mode: 'full' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking1.png', text: '1,200 คน 48 โซน 72 ชั่วโมง', insert: { type: 'map', mode: 'full' } },
  { speaker: 'lyla', sprite: 'Field-op-Lyla.png', text: '...โหดอยู่นะเนี่ย', insert: { type: 'map', mode: 'full' } },
  { speaker: 'robertson', sprite: 'Field-op-robertson.png', text: 'พร้อมเสมอ', robertsonOverlay: true },
  { speaker: 'lyla', sprite: 'Field-op-Lyla-talking2.png', text: 'พาพวกเรารอดด้วยล่ะ ผู้บัญชาการ', final: true },
];

// ป้ายชื่อ/สีของแต่ละตัว — ใช้ตอนแสดงกล่องข้อความ
export const SPEAKER_META = {
  robertson: { name: 'Robertson', role: 'UK-ISAK', roleColor: '#b8590a', tagColor: '#e8703a' },
  lyla: { name: 'Lyla', role: 'Field operator', roleColor: '#2f9e44', tagColor: '#1b1f24' },
  ria: { name: 'Lia', role: 'Baseplate', roleColor: '#2b6cb0', tagColor: '#e0b23c' },
};

// สรุปเนื้อเรื่องแบบย่อ — โชว์ตอนกด Skip all แล้วยืนยัน
export const TUTORIAL_SYNOPSIS =
  'Lia บรีฟผู้บัญชาการหลังแผ่นดินไหว 6 ชม.: เมืองมี 48 โซน แบ่งเป็นเทา/เหลือง/แดงตามความอันตราย ' +
  'Lyla สอนวิธีส่งทีม — ลากไอคอนไปวางบนโซน ระบบจะโชว์ % สำเร็จก่อนปล่อยมือ ปล่อยแล้วคือยืนยันทันที ยกเลิกไม่ได้ ' +
  'Robertson รับทราบสั้นๆ ตามสไตล์ · เวลาเดินตลอด คนในโซน (โดยเฉพาะโซนแดง) ตายไปเรื่อยๆ ระหว่างรอผล ' +
  'ทุกการส่งทีม/ใช้สกิลต้องใช้ AP ซึ่งได้เพิ่มตามเวลาแต่ไม่พอเสมอไป ต้องบริหารให้ดี ' +
  'ทีมมี 4 คน: Robertson กับ Lyla ลงพื้นที่ ส่วน Lia กับภูตอีกตนช่วยเพิ่มโอกาสสำเร็จจากฐาน ' +
  'ถ้าภารกิจไม่สำเร็จ เจ้าหน้าที่อาจบาดเจ็บ บาดเจ็บซ้ำจะหมดสติ และถ้าเจ้าหน้าที่ภาคสนามหมดสติพร้อมกันทั้งคู่ เกมจบทันที';
