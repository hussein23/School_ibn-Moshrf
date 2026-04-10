// ===================================================
//  الأسئلة التفاعلية - تصميم جديد محفّز
// ===================================================

// ألوان التوصيل للـ Match
const MATCH_COLORS = ['#FF6B35','#2196F3','#7C3AED','#10B981','#F59E0B','#EC4899'];

// ===== توليد كل الأسئلة =====
function renderAllQuestions(questions, color) {
  if (!questions || !Array.isArray(questions)) return '';
  window.fillState = window.fillState || {};
  return questions.map((q, idx) => renderQuestion(q, idx, color)).join('');
}

function renderQuestion(q, idx, color) {
  const num = idx + 1;
  switch (q.type) {
    case 'mcq':   return renderMCQ(q, num, color);
    case 'tf':    return renderTF(q, num, color);
    case 'match': return renderMatch(q, num, color);
    case 'fill':  return renderFill(q, num, color);
    default:      return '';
  }
}

// ===================================================
//  اختر من متعدد - بطاقات كبيرة
// ===================================================
function renderMCQ(q, num, color) {
  const letters = ['أ', 'ب', 'ج', 'د'];
  const letterColors = ['#FF6B35', '#2196F3', '#7C3AED', '#10B981'];

  const opts = q.options.map((opt, i) => `
    <button class="mcq-card" id="mcq-${num}-${i}"
            onclick="selectMCQ(${num}, ${i}, ${q.answer})"
            style="--opt-color:${letterColors[i % 4]}">
      <span class="mcq-letter">${letters[i]}</span>
      <span class="mcq-card-text">${opt}</span>
      <span class="mcq-check hidden">✓</span>
    </button>
  `).join('');

  return `
    <div class="q-wrap" id="qcard-${num}" data-type="mcq" data-answer="${q.answer}" data-num="${num}">
      <div class="q-head">
        <div class="q-num-badge" style="background:${color}">
          <span class="q-num-icon">🎯</span>
          <span>${num}</span>
        </div>
        <span class="q-type-label">اختر الإجابة الصحيحة</span>
      </div>
      <p class="q-main-text">${q.question}</p>
      <div class="mcq-grid">${opts}</div>
      <div class="q-result hidden" id="qres-${num}"></div>
    </div>
  `;
}

function selectMCQ(num, idx, correct) {
  const card = document.getElementById(`qcard-${num}`);
  if (card.classList.contains('answered')) return;

  // إزالة التحديد السابق
  card.querySelectorAll('.mcq-card').forEach(c => {
    c.classList.remove('mcq-selected');
    c.querySelector('.mcq-check').classList.add('hidden');
  });

  // تحديد الجديد
  const selected = document.getElementById(`mcq-${num}-${idx}`);
  selected.classList.add('mcq-selected');
  selected.querySelector('.mcq-check').classList.remove('hidden');
  card.dataset.userAnswer = idx;
}

// ===================================================
//  صح أو خطأ - بطاقتان كبيرتان
// ===================================================
function renderTF(q, num, color) {
  return `
    <div class="q-wrap" id="qcard-${num}" data-type="tf" data-answer="${q.answer}" data-num="${num}">
      <div class="q-head">
        <div class="q-num-badge" style="background:${color}">
          <span class="q-num-icon">⚡</span>
          <span>${num}</span>
        </div>
        <span class="q-type-label">صح أم خطأ؟</span>
      </div>
      <p class="q-main-text tf-statement">${q.question}</p>
      <div class="tf-big-row">
        <button class="tf-big-card tf-big-true" id="tf-${num}-true"
                onclick="selectTF(${num}, true)">
          <span class="tf-big-icon">✅</span>
          <span class="tf-big-label">صح</span>
        </button>
        <button class="tf-big-card tf-big-false" id="tf-${num}-false"
                onclick="selectTF(${num}, false)">
          <span class="tf-big-icon">❌</span>
          <span class="tf-big-label">خطأ</span>
        </button>
      </div>
      <div class="q-result hidden" id="qres-${num}"></div>
    </div>
  `;
}

function selectTF(num, val) {
  const card = document.getElementById(`qcard-${num}`);
  if (card.classList.contains('answered')) return;

  card.querySelectorAll('.tf-big-card').forEach(b => b.classList.remove('tf-active-true','tf-active-false'));
  const trueBtn  = document.getElementById(`tf-${num}-true`);
  const falseBtn = document.getElementById(`tf-${num}-false`);

  if (val) trueBtn.classList.add('tf-active-true');
  else      falseBtn.classList.add('tf-active-false');

  card.dataset.userAnswer = val;
}

// ===================================================
//  وصّل - عمودان مع ترقيم ملوّن
// ===================================================
// كل سؤال match له حالته الخاصة
window.matchState = {};

function renderMatch(q, num, color) {
  // تخليط العمود الأيمن
  const rights = [...q.pairs.map(p => p[1])].sort(() => Math.random() - 0.5);
  window.matchState[num] = { selected: null, connections: {} };

  const leftItems = q.pairs.map((p, i) => `
    <div class="match-chip match-left" id="ml-${num}-${i}"
         data-idx="${i}" data-num="${num}"
         onclick="clickMatchLeft(${num}, ${i})">
      <span class="match-chip-text">${p[0]}</span>
      <span class="match-badge hidden" id="mlb-${num}-${i}"></span>
    </div>
  `).join('');

  const rightItems = rights.map((r, i) => `
    <div class="match-chip match-right" id="mr-${num}-${i}"
         data-val="${r}" data-idx="${i}" data-num="${num}"
         onclick="clickMatchRight(${num}, ${i}, '${r.replace(/'/g,"\\'")}')">
      <span class="match-chip-text">${r}</span>
      <span class="match-badge hidden" id="mrb-${num}-${i}"></span>
    </div>
  `).join('');

  const correctMap = JSON.stringify(q.pairs.map(p => p[1])).replace(/"/g, '&quot;');

  return `
    <div class="q-wrap" id="qcard-${num}" data-type="match" data-correct="${correctMap}" data-num="${num}">
      <div class="q-head">
        <div class="q-num-badge" style="background:${color}">
          <span class="q-num-icon">🔗</span>
          <span>${num}</span>
        </div>
        <span class="q-type-label">صل العمود الأول بالعمود الثاني</span>
      </div>
      <p class="q-main-text">${q.question}</p>
      <p class="match-hint">انقر على عنصر في العمود الأول ثم انقر على مقابله في الثاني</p>
      <div class="match-two-col">
        <div class="match-col">
          <div class="match-col-header">العمود الأول</div>
          <div class="match-col-items" id="mlcol-${num}">${leftItems}</div>
        </div>
        <div class="match-arrow-col">
          ${q.pairs.map((_, i) => `<div class="match-arrow-line" id="marrow-${num}-${i}">→</div>`).join('')}
        </div>
        <div class="match-col">
          <div class="match-col-header">العمود الثاني</div>
          <div class="match-col-items" id="mrcol-${num}">${rightItems}</div>
        </div>
      </div>
      <div class="q-result hidden" id="qres-${num}"></div>
    </div>
  `;
}

function clickMatchLeft(num, idx) {
  const state = window.matchState[num];
  const card  = document.getElementById(`qcard-${num}`);
  if (card.classList.contains('answered')) return;

  // إلغاء توصيل سابق لهذا العنصر
  if (state.connections[idx] !== undefined) {
    disconnectLeft(num, idx);
  }

  // إلغاء تحديد سابق
  card.querySelectorAll('.match-left').forEach(c => c.classList.remove('match-selecting'));

  if (state.selected === idx) {
    state.selected = null;
    return;
  }
  state.selected = idx;
  document.getElementById(`ml-${num}-${idx}`).classList.add('match-selecting');
}

function clickMatchRight(num, rightIdx, val) {
  const state = window.matchState[num];
  const card  = document.getElementById(`qcard-${num}`);
  if (card.classList.contains('answered')) return;
  if (state.selected === null) return;

  const leftIdx = state.selected;

  // إذا كان هذا العنصر الأيمن موصولاً بعنصر آخر، افصله
  for (const [li, rv] of Object.entries(state.connections)) {
    if (rv === val) {
      disconnectLeft(num, parseInt(li));
      break;
    }
  }

  // ربط
  const colorIdx = Object.keys(state.connections).length % MATCH_COLORS.length;
  const color    = MATCH_COLORS[colorIdx];
  const label    = Object.keys(state.connections).length + 1;

  state.connections[leftIdx] = val;

  // تحديث مظهر العنصر الأيسر
  const leftEl = document.getElementById(`ml-${num}-${leftIdx}`);
  leftEl.classList.remove('match-selecting');
  leftEl.classList.add('match-connected');
  leftEl.style.borderColor = color;
  const lb = document.getElementById(`mlb-${num}-${leftIdx}`);
  lb.textContent = label;
  lb.style.background = color;
  lb.classList.remove('hidden');

  // تحديث مظهر العنصر الأيمن
  const rightEl = document.getElementById(`mr-${num}-${rightIdx}`);
  rightEl.classList.add('match-connected');
  rightEl.style.borderColor = color;
  const rb = document.getElementById(`mrb-${num}-${rightIdx}`);
  rb.textContent = label;
  rb.style.background = color;
  rb.classList.remove('hidden');

  // تحديث السهم
  const arrow = document.getElementById(`marrow-${num}-${leftIdx}`);
  if (arrow) { arrow.style.color = color; arrow.style.fontWeight = '900'; }

  state.selected = null;
}

function disconnectLeft(num, leftIdx) {
  const state = window.matchState[num];
  const val   = state.connections[leftIdx];
  if (val === undefined) return;

  delete state.connections[leftIdx];

  const leftEl = document.getElementById(`ml-${num}-${leftIdx}`);
  leftEl.classList.remove('match-connected', 'match-selecting');
  leftEl.style.borderColor = '';
  const lb = document.getElementById(`mlb-${num}-${leftIdx}`);
  if (lb) { lb.textContent = ''; lb.classList.add('hidden'); lb.style.background = ''; }

  // البحث عن العنصر الأيمن المرتبط
  const card = document.getElementById(`qcard-${num}`);
  card.querySelectorAll('.match-right').forEach(el => {
    if (el.dataset.val === val) {
      el.classList.remove('match-connected');
      el.style.borderColor = '';
      const ri = el.dataset.idx;
      const rb = document.getElementById(`mrb-${num}-${ri}`);
      if (rb) { rb.textContent = ''; rb.classList.add('hidden'); rb.style.background = ''; }
    }
  });

  // إعادة ترقيم الاتصالات المتبقية
  reNumberConnections(num);
}

function reNumberConnections(num) {
  const state = window.matchState[num];
  let counter = 1;
  Object.entries(state.connections).forEach(([li, val], idx) => {
    const color = MATCH_COLORS[idx % MATCH_COLORS.length];
    const leftEl = document.getElementById(`ml-${num}-${li}`);
    if (leftEl) { leftEl.style.borderColor = color; }
    const lb = document.getElementById(`mlb-${num}-${li}`);
    if (lb) { lb.textContent = counter; lb.style.background = color; }

    const card = document.getElementById(`qcard-${num}`);
    card.querySelectorAll('.match-right').forEach(el => {
      if (el.dataset.val === val) {
        el.style.borderColor = color;
        const rb = document.getElementById(`mrb-${num}-${el.dataset.idx}`);
        if (rb) { rb.textContent = counter; rb.style.background = color; }
      }
    });
    counter++;
  });
}

// ===================================================
//  أملأ الفراغ
// ===================================================
window.fillState = {};

function renderFill(q, num, color) {
  // استخراج الكلمات من الإجابات مع تكرار الكلمة بعدد استخداماتها
  const answers = q.sentences.map(s => s[1]);
  // نجمع جميع الكلمات (مع التكرار) ثم نخلطها
  const words = [...answers].sort(() => Math.random() - 0.5);
  window.fillState[num] = { selectedWord: null, selectedChipIdx: null, zones: {} };

  // بناء شرائح بنك الكلمات (كل كلمة تظهر بعدد استخداماتها)
  const wordChips = words.map((w, i) => `
    <span class="fill-word-chip" id="fwc-${num}-${i}"
          data-word="${w.replace(/"/g,'&quot;')}" data-num="${num}"
          onclick="selectFillWord(${num}, ${i}, '${w.replace(/'/g,"\\'")}')">
      ${w}
    </span>
  `).join('');

  const sentences = q.sentences.map((s, i) => `
    <div class="fill-sentence" id="fsentence-${num}-${i}">
      ${s[0] ? `<span class="fill-text-part">${s[0]}</span>` : ''}
      <span class="fill-drop-zone" id="fdz-${num}-${i}"
            data-answer="${s[1].replace(/"/g,'&quot;')}" data-num="${num}" data-idx="${i}"
            onclick="placeFillWord(${num}, ${i})">اضغط هنا</span>
      ${s[2] ? `<span class="fill-text-part">${s[2]}</span>` : ''}
    </div>
  `).join('');

  return `
    <div class="q-wrap" id="qcard-${num}" data-type="fill" data-num="${num}">
      <div class="q-head">
        <div class="q-num-badge" style="background:${color}">
          <span class="q-num-icon">✏️</span>
          <span>${num}</span>
        </div>
        <span class="q-type-label">أملأ الفراغات</span>
      </div>
      <p class="q-main-text">${q.question}</p>
      <div class="fill-word-bank" id="fwb-${num}">
        <div class="fill-bank-label">🗃️ بنك الكلمات — اضغط على كلمة ثم اضغط على الفراغ</div>
        <div class="fill-bank-words">${wordChips}</div>
      </div>
      <div class="fill-sentences">${sentences}</div>
      <div class="q-result hidden" id="qres-${num}"></div>
    </div>
  `;
}

function selectFillWord(num, chipIdx, word) {
  const state = window.fillState[num];
  const card = document.getElementById(`qcard-${num}`);
  if (card.classList.contains('answered')) return;

  // إلغاء التحديد السابق
  card.querySelectorAll('.fill-word-chip').forEach(c => c.classList.remove('fill-chip-selected'));

  if (state.selectedChipIdx === chipIdx) {
    // نقر ثانٍ على نفس الشريحة = إلغاء التحديد
    state.selectedWord = null;
    state.selectedChipIdx = null;
  } else {
    state.selectedWord = word;
    state.selectedChipIdx = chipIdx;
    document.getElementById(`fwc-${num}-${chipIdx}`).classList.add('fill-chip-selected');
  }
}

function placeFillWord(num, zoneIdx) {
  const state = window.fillState[num];
  const card  = document.getElementById(`qcard-${num}`);
  if (card.classList.contains('answered')) return;

  const zone = document.getElementById(`fdz-${num}-${zoneIdx}`);

  // إذا كانت الخانة ممتلئة، أزل الكلمة أولاً
  if (state.zones[zoneIdx] !== undefined) {
    const oldWord     = state.zones[zoneIdx];
    const oldChipIdx  = state.zones[`${zoneIdx}_chip`];
    delete state.zones[zoneIdx];
    delete state.zones[`${zoneIdx}_chip`];
    zone.textContent = 'اضغط هنا';
    zone.classList.remove('fill-zone-filled');
    // إعادة الشريحة المناسبة
    if (oldChipIdx !== undefined) {
      const oldChip = document.getElementById(`fwc-${num}-${oldChipIdx}`);
      if (oldChip) oldChip.classList.remove('fill-chip-used');
    }
    if (!state.selectedWord) return; // فقط إذا لم يكن هناك كلمة محددة نعيد ونمضي
  }

  if (!state.selectedWord) return;

  // وضع الكلمة في الخانة
  state.zones[zoneIdx] = state.selectedWord;
  state.zones[`${zoneIdx}_chip`] = state.selectedChipIdx;
  zone.textContent = state.selectedWord;
  zone.classList.add('fill-zone-filled');

  // تعليم الشريحة كمستخدمة
  const chip = document.getElementById(`fwc-${num}-${state.selectedChipIdx}`);
  if (chip) { chip.classList.add('fill-chip-used'); chip.classList.remove('fill-chip-selected'); }

  state.selectedWord    = null;
  state.selectedChipIdx = null;
}

// ===================================================
//  التحقق من الإجابات
// ===================================================
function checkAllAnswers(questions) {
  let correct = 0;

  questions.forEach((q, idx) => {
    const num  = idx + 1;
    const card = document.getElementById(`qcard-${num}`);
    const res  = document.getElementById(`qres-${num}`);
    let isCorrect = false;

    card.classList.add('answered');

    if (q.type === 'mcq') {
      const userAns = card.dataset.userAnswer;
      if (userAns === undefined) {
        showResult(res, false, '⚠️ لم تختر إجابة');
        return;
      }
      const uIdx = parseInt(userAns);
      isCorrect  = uIdx === q.answer;

      card.querySelectorAll('.mcq-card').forEach((c, i) => {
        c.classList.remove('mcq-selected');
        if (i === q.answer) c.classList.add('mcq-correct');
        else if (i === uIdx && !isCorrect) c.classList.add('mcq-wrong');
      });
      showResult(res, isCorrect,
        isCorrect ? '🌟 إجابة صحيحة! أحسنت' : `❌ الإجابة الصحيحة: ${q.options[q.answer]}`);

    } else if (q.type === 'tf') {
      const userAns = card.dataset.userAnswer;
      if (userAns === undefined) {
        showResult(res, false, '⚠️ لم تختر إجابة');
        return;
      }
      const uBool = userAns === 'true';
      isCorrect   = uBool === q.answer;

      const trueBtn  = document.getElementById(`tf-${num}-true`);
      const falseBtn = document.getElementById(`tf-${num}-false`);
      trueBtn.classList.remove('tf-active-true', 'tf-active-false');
      falseBtn.classList.remove('tf-active-true', 'tf-active-false');

      if (q.answer) trueBtn.classList.add(isCorrect ? 'tf-result-correct' : 'tf-result-correct');
      else          falseBtn.classList.add('tf-result-correct');

      if (!isCorrect) {
        if (uBool) trueBtn.classList.add('tf-result-wrong');
        else        falseBtn.classList.add('tf-result-wrong');
      }
      showResult(res, isCorrect,
        isCorrect ? '🌟 إجابة صحيحة! أحسنت' : `❌ الإجابة الصحيحة: ${q.answer ? 'صح ✅' : 'خطأ ❌'}`);

    } else if (q.type === 'match') {
      const correctArr = JSON.parse(card.dataset.correct);
      const state      = window.matchState[num];
      let allRight     = true;

      correctArr.forEach((correctVal, i) => {
        const userVal = state.connections[i];
        const ok      = userVal === correctVal;
        if (!ok) allRight = false;

        const leftEl = document.getElementById(`ml-${num}-${i}`);
        if (leftEl) {
          leftEl.classList.add(ok ? 'match-result-correct' : 'match-result-wrong');
        }
        // تلوين العنصر الأيمن
        card.querySelectorAll('.match-right').forEach(el => {
          if (el.dataset.val === userVal && userVal !== undefined) {
            el.classList.add(ok ? 'match-result-correct' : 'match-result-wrong');
          }
          if (el.dataset.val === correctVal && !ok) {
            el.classList.add('match-show-correct');
          }
        });
      });

      isCorrect = allRight;
      showResult(res, isCorrect,
        isCorrect ? '🌟 ممتاز! جميع التوصيلات صحيحة' : '❌ بعض التوصيلات خاطئة');

    } else if (q.type === 'fill') {
      const state = window.fillState[num];
      let allRight = true;

      q.sentences.forEach((s, i) => {
        const zone     = document.getElementById(`fdz-${num}-${i}`);
        const sentence = document.getElementById(`fsentence-${num}-${i}`);
        const userVal  = state ? state.zones[i] : undefined;
        const ok       = userVal === s[1];
        if (!ok) allRight = false;
        if (zone) zone.classList.add(ok ? 'fill-zone-correct' : 'fill-zone-wrong');
        if (sentence) sentence.classList.add(ok ? 'fill-sentence-correct' : 'fill-sentence-wrong');
      });

      isCorrect = allRight;
      showResult(res, isCorrect,
        isCorrect ? '🌟 ممتاز! جميع الفراغات صحيحة' : '❌ بعض الفراغات خاطئة — راجع الإجابات');
    }

    if (isCorrect) { correct++; celebrateCorrectAnswer(); }
    card.classList.add(isCorrect ? 'q-answered-correct' : 'q-answered-wrong');
  });

  setTimeout(() => showFinalResult(correct, questions.length), 800);
}

function showResult(el, isCorrect, msg) {
  el.className = `q-result ${isCorrect ? 'q-result-ok' : 'q-result-err'}`;
  el.textContent = msg;
}

function showFinalResult(correct, total) {
  const pct  = Math.round((correct / total) * 100);
  const data = pct === 100 ? { emoji:'🏆', msg:'ممتاز! العلامة الكاملة!', cls:'res-perfect' }
    : pct >= 80  ? { emoji:'⭐', msg:'جيد جداً! أداء رائع',               cls:'res-great'  }
    : pct >= 60  ? { emoji:'👍', msg:'جيد! راجع وأعد المحاولة',            cls:'res-good'   }
    :              { emoji:'💪', msg:'راجع الدرس وحاول مجدداً',             cls:'res-try'    };

  if (pct === 100) celebrateCorrectAnswer();

  const modal = document.getElementById('result-modal');
  document.getElementById('result-content').innerHTML = `
    <div class="res-box ${data.cls}">
      <div class="res-emoji">${data.emoji}</div>
      <div class="res-fraction">${correct} / ${total}</div>
      <div class="res-pct-wrap">
        <div class="res-pct-bar" style="width:${pct}%"></div>
      </div>
      <div class="res-pct-label">${pct}%</div>
      <p class="res-msg">${data.msg}</p>
      <div class="res-btns">
        <button class="res-btn-retry" onclick="retryQuestions()">🔄 أعد المحاولة</button>
        <button class="res-btn-close" onclick="closeResult()">✕ إغلاق</button>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
}

function closeResult() {
  document.getElementById('result-modal').classList.add('hidden');
}

function retryQuestions() {
  closeResult();
  window.matchState = {};
  document.querySelectorAll('.q-wrap').forEach(card => {
    card.classList.remove('answered','q-answered-correct','q-answered-wrong');
    delete card.dataset.userAnswer;
    card.querySelectorAll('.q-result').forEach(r => { r.className = 'q-result hidden'; r.textContent = ''; });
    // MCQ
    card.querySelectorAll('.mcq-card').forEach(c => {
      c.classList.remove('mcq-selected','mcq-correct','mcq-wrong');
      c.querySelector('.mcq-check')?.classList.add('hidden');
    });
    // TF
    card.querySelectorAll('.tf-big-card').forEach(b =>
      b.classList.remove('tf-active-true','tf-active-false','tf-result-correct','tf-result-wrong'));
    // Match
    const num = parseInt(card.dataset.num);
    if (num) {
      window.matchState[num] = { selected: null, connections: {} };
      card.querySelectorAll('.match-chip').forEach(c => {
        c.classList.remove('match-selecting','match-connected','match-result-correct','match-result-wrong','match-show-correct');
        c.style.borderColor = '';
      });
      card.querySelectorAll('.match-badge').forEach(b => {
        b.classList.add('hidden'); b.textContent = ''; b.style.background = '';
      });
      card.querySelectorAll('.match-arrow-line').forEach(a => {
        a.style.color = ''; a.style.fontWeight = '';
      });
    }
    // Fill
    if (card.dataset.type === 'fill' && num) {
      window.fillState[num] = { selectedWord: null, selectedChipIdx: null, zones: {} };
      card.querySelectorAll('.fill-drop-zone').forEach(z => {
        z.textContent = 'اضغط هنا';
        z.classList.remove('fill-zone-filled','fill-zone-correct','fill-zone-wrong');
      });
      card.querySelectorAll('.fill-word-chip').forEach(c => {
        c.classList.remove('fill-chip-used','fill-chip-selected');
      });
      card.querySelectorAll('.fill-sentence').forEach(s => {
        s.classList.remove('fill-sentence-correct','fill-sentence-wrong');
      });
    }
  });
  setTimeout(() => initDragDrop(), 100);
}

function initDragDrop() { /* لا يلزم مع النظام الجديد */ }

// احتفالات
function celebrateCorrectAnswer() {
  if (typeof launchConfetti === 'function') launchConfetti();
}
