// บทสอนเล่น (Tutorial) แบบ visual novel — เขียนใหม่ทั้งฉาก (รอบ 10.16) ให้ครอบคลุมระบบปัจจุบัน
// โทน: Lia สายเข้ม เจ้าระเบียบ พูดเป๊ะ ปะทะ Lyla สายฮา กวน ชอบแทรก · Robertson พูดคำเดียวเป็นมุกคั่น
//
// แต่ละ step = 1 บทพูด = 1 จังหวะ "Click to next"
// field ที่ใช้:
//   speaker    'ria' | 'lyla' | 'robertson'   (ria = Lia — ชื่อ key เดิม ห้ามเปลี่ยน)
//   sprite     ไฟล์ภาพใน assets/characters/ (จาก OPERATORS[x].portraits)
//   text       บทพูด
//   interrupt  true = พูดแทรก ตัดเข้าทันทีไม่มีอนิเมชันสั่นตัวละคร
//   insert     ของแทรกฉาก (แผนที่/สถิติ/ทีม/แถบสกิล/บาดเจ็บ/จบเกม) หรือ null = ห้องบัญชาการปกติ
//   final      true = จบบท เฟดดำ จบ tutorial
//   narration  true = ข้อความบรรยายฉากเปิดเรื่อง ไม่มีตัวละคร/ป้ายชื่อ ตัวเอียง แค่พื้นหลัง
//
// ── คีย์สไปรต์ (เจ้าของกำหนดความหมายแต่ละไฟล์) ─────────────────────
//   Base-op-Lia.png            Lia หน้านิ่ง
//   Base-op-Lia-talking1.png   Lia ตอนพูด
//   Base-op-Lia-talking2.png   Lia ยิ้มนิดๆ (แซว/อบอุ่น)
//   Field-op-Lyla.png          Lyla ปกติ
//   Field-op-Lyla-talking1.png Lyla หลับตา (กวน/ถอนใจ)
//   Field-op-Lyla-talking2.png Lyla พูด (ออกแรง/แทรก)
//   Field-op-robertson.png     Robertson หน้าปกติ
//   ฉากมืดดึงสไปรต์พิเศษที่มีไฟล์อยู่แล้ว: Lyla-injured / Lyla-unconscious / robertson-finalstand

const LIA_IDLE = 'Base-op-Lia.png';
const LIA_TALK = 'Base-op-Lia-talking1.png';
const LIA_SMILE = 'Base-op-Lia-talking2.png';
const LYLA_IDLE = 'Field-op-Lyla.png';
const LYLA_SHUT = 'Field-op-Lyla-talking1.png';
const LYLA_TALK = 'Field-op-Lyla-talking2.png';
const LYLA_HURT = 'Field-op-Lyla-injured.png';
const LYLA_DOWN = 'Field-op-Lyla-unconscious.png';
const ROB_IDLE = 'Field-op-robertson.png';
const ROB_STAND = 'Field-op-robertson-finalstand.png';

export const TUTORIAL_SCRIPT = [
  { narration: true, text: '72 ชั่วโมงหลังแผ่นดินไหวถล่มเมือง มีคน 1,200 ชีวิตติดอยู่ใต้ซาก และคุณคือคนที่ตัดสินใจทุกอย่างจากห้องนี้' },

  // — แนะนำตัว / เมือง —
  { speaker: 'ria', sprite: LIA_TALK, text: 'ผู้บัญชาการ มาถึงพอดี ฉัน Lia ฝ่ายวิเคราะห์ข้อมูล เดี๋ยวปูพื้นให้ก่อน' },
  { speaker: 'lyla', sprite: LYLA_TALK, text: 'โห เริ่มด้วยคำว่า "ปูพื้น" เลยเหรอ เข้มตั้งแต่ประโยคแรก' },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'มันเรียกแบบนี้จริงๆ' },
  { speaker: 'ria', sprite: LIA_TALK, text: 'เมืองถูกแบ่งเป็น 47 โซน', insert: { type: 'map', mode: 'full' } },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'เทา — ยังพอมีเวลา · เหลือง — เริ่มอันตราย · แดง —', insert: { type: 'map', mode: 'full', level: 'cycle' } },
  { speaker: 'lyla', sprite: LYLA_TALK, text: '—แดงคือใกล้หมดเวลาแล้ว! ยิ่งทิ้งไว้ คนยิ่งหาย', interrupt: true, insert: { type: 'map', mode: 'full', level: 'red' } },
  { speaker: 'ria', sprite: LIA_IDLE, text: '...ฉันกำลังจะพูดพอดี', insert: { type: 'map', mode: 'full', level: 'red' } },
  { speaker: 'lyla', sprite: LYLA_SHUT, text: 'เห็นมั้ย ฉันช่วยย่อให้สั้นลง' },
  { speaker: 'ria', sprite: LIA_SMILE, text: 'เธอช่วยแย่งพูดมากกว่า' },

  // — เวลาเดินตลอด —
  { speaker: 'lyla', sprite: LYLA_TALK, text: 'เอาจริงนะผู้บัญชาการ เรื่องสำคัญสุดคือ — เวลาไม่เคยหยุด', insert: { type: 'stat', kind: 'survivors' } },
  { speaker: 'lyla', sprite: LYLA_IDLE, text: 'ตอนเรายืนคุยกันเนี่ย ข้างนอกก็มีคนหมดเวลาไปเรื่อยๆ', insert: { type: 'stat', kind: 'survivors' } },
  { speaker: 'ria', sprite: LIA_TALK, text: 'โซนแดงหายไวที่สุด อย่าให้มันค้างนาน', insert: { type: 'stat', kind: 'redzone' } },
  { speaker: 'lyla', sprite: LYLA_SHUT, text: 'เออ อันนี้เธอพูดสั้นได้นี่หว่า' },
  { speaker: 'ria', sprite: LIA_SMILE, text: '...ฉันพูดสั้นเป็น เธอต่างหากที่ฟังไม่จบ' },

  // — ทีมสองฝ่าย —
  { speaker: 'ria', sprite: LIA_TALK, text: 'ทีมมีสี่คน แบ่งเป็นสองฝ่าย', insert: { type: 'team' } },
  { speaker: 'lyla', sprite: LYLA_TALK, text: 'ฉันกับ Robertson เป็น "ภาคสนาม" — พวกที่ลงไปลุยของจริง', insert: { type: 'team', highlight: 'field' } },
  { speaker: 'lyla', sprite: LYLA_IDLE, text: 'และฉันเข้าได้ทุกโซน แม้แต่แดงที่คนอื่นไม่กล้าแตะ', insert: { type: 'team', highlight: 'field' } },
  { speaker: 'robertson', sprite: ROB_IDLE, text: 'ผมก็เข้าแดงได้' },
  { speaker: 'lyla', sprite: LYLA_SHUT, text: '...เข้าได้ แต่รอดยากกว่าเยอะนะพี่' },
  { speaker: 'robertson', sprite: ROB_IDLE, text: 'รับทราบ' },
  { speaker: 'ria', sprite: LIA_TALK, text: 'ส่วนฉันกับ Mudongzock เป็น "ภาคฐาน" — ไม่ลงพื้นที่ แต่คอยหนุนอยู่หลังจอ', insert: { type: 'team', highlight: 'support' } },
  { speaker: 'lyla', sprite: LYLA_SHUT, text: 'แปลว่านั่งเชียร์อยู่บ้านน่ะ', insert: { type: 'team', highlight: 'support' } },
  { speaker: 'ria', sprite: LIA_SMILE, text: 'แปลว่าเป็นคนทำให้เธอไม่ตายในโซนแดง', insert: { type: 'team', highlight: 'support' } },

  // — สกิลคือหัวใจ —
  { speaker: 'ria', sprite: LIA_TALK, text: 'ทุกอย่างที่คุณสั่ง ทำผ่าน "ไอคอนสกิล" ที่แถบสองข้างจอ', insert: { type: 'skills' } },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'สกิลของภาคสนามคือตัวหลัก — ราว 70% ของเกมคือการใช้พวกนี้ส่งคนลงไปช่วย', insert: { type: 'skills', highlight: 'field' } },
  { speaker: 'lyla', sprite: LYLA_TALK, text: 'วิธีใช้ไม่มีอะไรเลย — ลากไอคอนไปวางบนโซนที่อยากส่ง', insert: { type: 'map', mode: 'side', team: true } },
  { speaker: 'ria', sprite: LIA_TALK, text: 'ก่อนปล่อยมือ ระบบจะกางตัวเลขให้ดูก่อน — โอกาสสำเร็จ ความเสี่ยงบาดเจ็บ ราคาที่ต้องจ่าย', insert: { type: 'map', mode: 'side', team: true, percent: 72 } },
  { speaker: 'lyla', sprite: LYLA_TALK, text: 'แล้วปล่อยมือปุ๊บ = ส่งจริงทันที ยกเลิกไม่ได้นะ', insert: { type: 'map', mode: 'side', team: true, percent: 72 } },
  { speaker: 'lyla', sprite: LYLA_IDLE, text: 'เพราะงั้นเล็งดีๆ ก่อนปล่อย อย่าลากมั่วแล้วมือลั่น', insert: { type: 'map', mode: 'side', team: true, percent: 72 } },
  { speaker: 'robertson', sprite: ROB_IDLE, text: 'เคยลั่นมั้ย' },
  { speaker: 'lyla', sprite: LYLA_TALK, text: '...ไม่เคย! คนละเรื่อง' },
  { speaker: 'ria', sprite: LIA_SMILE, text: 'เคยสามรอบ ฉันมีบันทึก' },
  { speaker: 'lyla', sprite: LYLA_SHUT, text: 'เธอนี่มันจริงๆ เลยนะ' },

  // — AP —
  { speaker: 'ria', sprite: LIA_TALK, text: 'ทุกครั้งที่ส่งทีมหรือใช้สกิล ต้องจ่าย AP', insert: { type: 'stat', kind: 'ap' } },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'AP เพิ่มขึ้นเรื่อยๆ ตามเวลา แต่บอกตรงๆ — ไม่มีวันพอทุกอย่าง', insert: { type: 'stat', kind: 'ap' } },
  { speaker: 'lyla', sprite: LYLA_TALK, text: 'เพราะงั้นอย่าทุ่มหมดหน้าตักตั้งแต่ต้น เลือกโซนที่คุ้มสุด', insert: { type: 'stat', kind: 'ap' } },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'หรือจะเก็บไว้ทุ่มทีเดียวตอนจำเป็นก็ได้ — เราคิดไม่เหมือนกันเรื่องนี้' },
  { speaker: 'lyla', sprite: LYLA_SHUT, text: 'เห็นมั้ย เรื่องนี้เถียงกันมาสามวันแล้ว ลองเล่นเองแล้วตัดสินเอาละกัน' },

  // — สกิลหนุน (บัฟ) —
  { speaker: 'ria', sprite: LIA_TALK, text: 'ฝ่ายฐานมีสกิล "บัฟ" — ไม่ได้ช่วยคนเอง แต่ดันโอกาสสำเร็จให้ทีมสนาม', insert: { type: 'skills', highlight: 'buff' } },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'ฉันมี Scan เพิ่ม % ให้ และ Alert การันตีว่าเที่ยวนั้นทีมจะไม่บาดเจ็บเลย', insert: { type: 'skills', highlight: 'buff' } },
  { speaker: 'ria', sprite: LIA_TALK, text: 'Mudongzock มี Air Deploy ชะลอการตายทั้งเมืองพร้อมกัน ไว้ตอนหลายโซนใกล้หมดเวลา', insert: { type: 'skills', highlight: 'buff' } },
  { speaker: 'lyla', sprite: LYLA_TALK, text: 'เคล็ดลับเด็ด — ตอนฉันบุกโซนแดง เอาบัฟมาซ้อนบนหัวฉันด้วย % จะพุ่งเลย' },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'ลงบัฟทับโซนที่มีคนกำลังทำงานอยู่ได้ นั่นแหละคอมโบหลักของเกมนี้' },
  { speaker: 'lyla', sprite: LYLA_SHUT, text: 'พูดง่ายๆ คือเธอทำให้ฉันดูเก่งขึ้นน่ะ' },
  { speaker: 'ria', sprite: LIA_SMILE, text: 'พูดง่ายๆ คือฉันทำให้เธอกลับมาทั้งตัว' },

  // — ผลลัพธ์ทอยสองชั้น —
  { speaker: 'ria', sprite: LIA_TALK, text: 'ตอนทีมทำงานเสร็จ เกมจะทอยสองชั้น — ชั้นแรก "สำเร็จมั้ย" ชั้นสอง "ช่วยได้กี่คน"' },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'บัฟทุกตัวไปบวกที่ชั้นแรก ยิ่ง % สูง ยิ่งพลาดยาก' },
  { speaker: 'lyla', sprite: LYLA_IDLE, text: 'สำเร็จเมื่อไหร่ โซนเปลี่ยนเป็นเขียว จบ ไม่ต้องกลับไปห่วงอีก' },

  // — ด้านมืด: บาดเจ็บ —
  { speaker: 'ria', sprite: LIA_TALK, text: 'แต่ถ้าล้มเหลว... เจ้าหน้าที่มีโอกาสบาดเจ็บ', insert: { type: 'tone-dark' } },
  { speaker: 'lyla', sprite: LYLA_HURT, text: 'เจ็บแล้วเจ็บซ้ำอีกที — หมดสติเลย หายไปพักใหญ่', insert: { type: 'injury' } },
  { speaker: 'lyla', sprite: LYLA_DOWN, text: 'แล้วถ้าฉันกับ Robertson หมดสติพร้อมกันทั้งคู่...', insert: { type: 'injury' } },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'เกมจบทันที', insert: { type: 'gameover' } },
  { speaker: 'lyla', sprite: LYLA_HURT, text: '...อันนี้ไม่ตลกแล้วนะ' },
  { speaker: 'ria', sprite: LIA_TALK, text: 'ใช่ เพราะงั้น — พวกเราไม่ใช่แค่ตัวเลขบนจอ' },

  // — ยืนหยัดครั้งสุดท้าย —
  { speaker: 'robertson', sprite: ROB_STAND, text: '...ถ้าถึงตรงนั้นจริง ผมยังไม่ล้มง่ายๆ' },
  { speaker: 'lyla', sprite: LYLA_IDLE, text: 'ถ้าเลวร้ายสุดๆ Robertson จะฝืนสู้ต่ออีกเฮือก — แต่ขออย่าให้ต้องถึงตรงนั้นเลยนะ' },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'อย่าไปพึ่งมัน มันคือทางเลือกสุดท้าย ไม่ใช่แผน' },

  // — เป้าหมาย / แรงก์ —
  { speaker: 'ria', sprite: LIA_TALK, text: 'สรุป — 1,200 ชีวิต 47 โซน 72 ชั่วโมง', insert: { type: 'map', mode: 'full' } },
  { speaker: 'ria', sprite: LIA_IDLE, text: 'จบเกมจะวัดผลเป็นแรงก์ ตั้งแต่ E จนถึง S ยิ่งช่วยได้มาก ยิ่งสูง', insert: { type: 'map', mode: 'full' } },
  { speaker: 'lyla', sprite: LYLA_SHUT, text: '...ฟังดูโหดชิบเป๋งเลยนะเนี่ย' },
  { speaker: 'ria', sprite: LIA_SMILE, text: 'ภาษาราชการเรียกว่า "ท้าทาย"' },
  { speaker: 'lyla', sprite: LYLA_TALK, text: 'เห็นมั้ย เข้มจนได้' },
  { speaker: 'robertson', sprite: ROB_IDLE, text: 'พร้อมเสมอ' },
  { speaker: 'lyla', sprite: LYLA_IDLE, text: 'เอาล่ะ พาพวกเรารอดกลับมาให้ครบด้วยล่ะ ผู้บัญชาการ', final: true },
];

// ป้ายชื่อ/สีของแต่ละตัว — ใช้ตอนแสดงกล่องข้อความ
export const SPEAKER_META = {
  robertson: { name: 'Robertson', role: 'UK-ISAK', roleColor: '#b8590a', tagColor: '#e8703a' },
  lyla: { name: 'Lyla', role: 'Beast warden', roleColor: '#2f9e44', tagColor: '#1b1f24' },
  ria: { name: 'Lia', role: 'Data analysis', roleColor: '#2b6cb0', tagColor: '#e0b23c' },
};

// สรุปเนื้อเรื่องแบบย่อ — โชว์ตอนกด Skip all แล้วยืนยัน
export const TUTORIAL_SYNOPSIS =
  'Lia (สายวิเคราะห์) กับ Lyla (สายลุย) บรีฟผู้บัญชาการหลังแผ่นดินไหว: เมืองมี 47 โซน แบ่งเป็นเทา/เหลือง/แดงตามความอันตราย โซนแดงตายไวสุด · ' +
  'เวลาเดินตลอด คนในโซนทยอยตายระหว่างรอผล · ทีมมี 4 คนสองฝ่าย: Robertson กับ Lyla ลงพื้นที่ (Lyla เข้าได้ทุกโซนรวมแดง) ส่วน Lia กับ Mudongzock เป็นภาคฐานคอยบัฟ · ' +
  'สั่งงานผ่านไอคอนสกิลสองข้างจอ — สกิลภาคสนามคือตัวหลัก ลากไอคอนไปวางบนโซน ระบบโชว์ %สำเร็จ/ความเสี่ยง/ราคาก่อนปล่อยมือ ปล่อยแล้วคือยืนยัน ยกเลิกไม่ได้ · ' +
  'ทุกอย่างจ่ายด้วย AP ซึ่งได้เพิ่มตามเวลาแต่ไม่เคยพอ · บัฟ (Scan/Alert/Air Deploy) ดัน %สำเร็จให้ทีมสนาม ลงซ้อนโซนที่มีคนทำงานอยู่ได้ = คอมโบหลัก · ' +
  'เกมทอยสองชั้น (สำเร็จมั้ย → ช่วยกี่คน) บัฟบวกที่ชั้นแรก · ภารกิจล้มเหลวทำให้บาดเจ็บ บาดเจ็บซ้ำ=หมดสติ ถ้าภาคสนามหมดสติพร้อมกันทั้งคู่ เกมจบ · ' +
  'จบเกมวัดผลเป็นแรงก์ E ถึง S ยิ่งช่วยได้มากยิ่งสูง';
