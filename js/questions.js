// ===================================================
//  الأسئلة التفاعلية
// ===================================================

// ===== توليد كل الأسئلة =====
function renderAllQuestions(questions, color) {
  console.log('🔍 renderAllQuestions called with:', { questions, color });

  if (!questions || !Array.isArray(questions)) {
    console.error('❌ Questions is not an array:', questions);
    return '<p style="color: red;">❌ خطأ: لا توجد أسئلة متاحة</p>';
  }

  try {
    const result = questions.map((q, idx) => {
      console.log(`  Question ${idx + 1}:`, q.type);
      return renderQuestion(q, idx, color);
    }).join('');
    console.log('✅ renderAllQuestions result HTML length:', result.length);
    return result;
  } catch (error) {
    console.error('❌ Error in renderAllQuestions:', error);
    return '<p style="color: red;">❌ خطأ في تحميل الأسئلة: ' + error.message + '</p>';
  }
}

function renderQuestion(q, idx, color) {
  const num = idx + 1;
  try {
    switch (q.type) {
      case 'mcq':
        console.log(`    ✓ Rendering MCQ: ${q.question}`);
        return renderMCQ(q, num, color);
      case 'tf':
        console.log(`    ✓ Rendering T/F: ${q.question}`);
        return renderTF(q, num, color);
      case 'match':
        console.log(`    ✓ Rendering Match: ${q.question}`);
        return renderMatch(q, num, color);
      default:
        console.warn(`    ⚠ Unknown question type: ${q.type}`);
        return '';
    }
  } catch (error) {
    console.error(`❌ Error rendering question ${num}:`, error, q);
    return `<div style="border: 2px solid red; padding: 10px; margin: 10px 0; background: #ffebee;">❌ خطأ في تحميل السؤال ${num}: ${error.message}</div>`;
  }
}

// ===== اختر من متعدد =====
function renderMCQ(q, num, color) {
  const opts = q.options.map((opt, i) => `
    <label class="mcq-option" data-index="${i}">
      <input type="radio" name="q${num}" value="${i}" onchange="selectOption(this, ${num})">
      <span class="opt-letter">${['أ','ب','ج','د'][i]}</span>
      <span class="opt-text">${opt}</span>
    </label>
  `).join('');
  return `
    <div class="question-card" id="qcard-${num}" data-type="mcq" data-answer="${q.answer}">
      <div class="q-header">
        <span class="q-num" style="background:${color}">${num}</span>
        <span class="q-type-badge">🎯 اختر الإجابة الصحيحة</span>
      </div>
      <p class="q-text">${q.question}</p>
      <div class="mcq-options">${opts}</div>
      <div class="q-feedback hidden"></div>
    </div>
  `;
}

function selectOption(input, num) {
  const card = document.getElementById(`qcard-${num}`);
  card.querySelectorAll('.mcq-option').forEach(opt => opt.classList.remove('selected'));
  input.closest('.mcq-option').classList.add('selected');
}

// ===== صح وخطأ =====
function renderTF(q, num, color) {
  return `
    <div class="question-card" id="qcard-${num}" data-type="tf" data-answer="${q.answer}">
      <div class="q-header">
        <span class="q-num" style="background:${color}">${num}</span>
        <span class="q-type-badge">✅ هل هذه العبارة صحيحة أم خاطئة؟</span>
      </div>
      <p class="q-text tf-statement">❓ ${q.question}</p>
      <div class="tf-buttons">
        <button class="tf-btn tf-true" onclick="selectTF(this, ${num}, true)">
          <span class="tf-icon">✅</span>
          <span>صح</span>
        </button>
        <button class="tf-btn tf-false" onclick="selectTF(this, ${num}, false)">
          <span class="tf-icon">❌</span>
          <span>خطأ</span>
        </button>
      </div>
      <div class="q-feedback hidden"></div>
    </div>
  `;
}

function selectTF(btn, num, val) {
  const card = document.getElementById(`qcard-${num}`);
  card.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  card.dataset.userAnswer = val;
}

// ===== وصّل (Match) =====
function renderMatch(q, num, color) {
  const pairs = q.pairs;
  const rights = [...pairs.map(p => p[1])].sort(() => Math.random() - 0.5);

  const leftItems = pairs.map((p, i) => `
    <div class="match-left-item" data-idx="${i}" onclick="selectMatchItem(this, 'left', ${num})">
      <span class="match-item-text">${p[0]}</span>
    </div>
  `).join('');

  const rightItems = rights.map((r, i) => `
    <div class="match-right-item" data-val="${r}" data-idx="${i}"
         draggable="true" ondragstart="dragStartMatch(event, ${num})"
         onclick="selectMatchItem(this, 'right', ${num})">
      <span class="match-item-text">${r}</span>
    </div>
  `).join('');

  const correctMap = JSON.stringify(pairs.map(p => p[1])).replace(/"/g, '&quot;');

  return `
    <div class="question-card" id="qcard-${num}" data-type="match" data-correct="${correctMap}">
      <div class="q-header">
        <span class="q-num" style="background:${color}">${num}</span>
        <span class="q-type-badge">🔗 اسحب وأفلت للتوصيل</span>
      </div>
      <p class="q-text">${q.question}</p>

      <div class="match-wrapper">
        <!-- العمود الأيسر -->
        <div class="match-column match-left-col">
          <div class="match-col-title">العمود الأول</div>
          <div class="match-items-left" id="left-${num}">
            ${leftItems}
          </div>
        </div>

        <!-- منطقة التوصيل -->
        <div class="match-connections">
          <svg id="svg-${num}" class="match-svg" style="width:100%; height:100%; position:absolute;"></svg>
        </div>

        <!-- العمود الأيمن -->
        <div class="match-column match-right-col">
          <div class="match-col-title">العمود الثاني</div>
          <div class="match-items-right" id="right-${num}" ondrop="dropMatch(event, ${num})" ondragover="allowDrop(event)">
            ${rightItems}
          </div>
        </div>
      </div>

      <div class="q-feedback hidden"></div>
    </div>
  `;
}

// ===== منطق السحب والإفلات للتوصيل =====
let selectedLeft = null;
let selectedRight = null;
let matchConnections = {}; // تخزين التوصيلات {leftIdx: rightVal}

function dragStartMatch(event, num) {
  event.dataTransfer.effectAllowed = 'move';
  const item = event.target.closest('.match-right-item');
  event.dataTransfer.setData('text/plain', item.dataset.val);
  event.dataTransfer.setData('qnum', num);
  item.classList.add('dragging');
}

function allowDrop(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function dropMatch(event, num) {
  event.preventDefault();
  const rightItem = event.target.closest('.match-right-item');
  if (rightItem && selectedLeft) {
    connectItems(selectedLeft, rightItem, num);
    selectedLeft.classList.remove('selected');
    selectedLeft = null;
  }
}

function selectMatchItem(el, side, num) {
  const card = document.getElementById(`qcard-${num}`);
  if (!card) return;

  if (side === 'left') {
    // إلغاء التوصيل السابق إذا كان موجوداً
    const idx = el.dataset.idx;
    if (matchConnections[idx]) {
      delete matchConnections[idx];
    }

    if (selectedLeft === el) {
      selectedLeft = null;
      el.classList.remove('selected');
    } else {
      if (selectedLeft) selectedLeft.classList.remove('selected');
      selectedLeft = el;
      el.classList.add('selected');
    }
  }
}

function connectItems(leftEl, rightEl, num) {
  const leftIdx = leftEl.dataset.idx;
  const rightVal = rightEl.dataset.val;

  // تحديث التوصيلات
  matchConnections[leftIdx] = rightVal;

  // إضافة الفئة المتصلة
  leftEl.classList.add('connected');
  rightEl.classList.add('connected');

  // رسم الخطوط
  setTimeout(() => drawMatchLines(num), 50);
}

function drawMatchLines(num) {
  const card = document.getElementById(`qcard-${num}`);
  if (!card) return;

  const svg = card.querySelector('.match-svg');
  if (!svg) return;

  // حذف الخطوط القديمة
  svg.innerHTML = '';

  const wrapper = card.querySelector('.match-wrapper');
  if (!wrapper) return;

  const leftItems = card.querySelectorAll('.match-left-item');
  const rightItems = card.querySelectorAll('.match-right-item');
  const wrapperRect = wrapper.getBoundingClientRect();

  leftItems.forEach((leftItem, idx) => {
    if (matchConnections[idx]) {
      // البحث عن العنصر الأيمن المطابق
      let rightItem = null;
      rightItems.forEach(item => {
        if (item.dataset.val === matchConnections[idx]) {
          rightItem = item;
        }
      });

      if (rightItem) {
        // حساب المواضع بالنسبة للـ wrapper
        const leftRect = leftItem.getBoundingClientRect();
        const rightRect = rightItem.getBoundingClientRect();

        const x1 = leftRect.right - wrapperRect.left - 15;
        const y1 = leftRect.top - wrapperRect.top + leftRect.height / 2;
        const x2 = rightRect.left - wrapperRect.left + 15;
        const y2 = rightRect.top - wrapperRect.top + rightRect.height / 2;

        // رسم خط منحني
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2} ${x2} ${y2}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#10B981');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);

        // رسم نقاط في النهايات
        const startDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startDot.setAttribute('cx', x1);
        startDot.setAttribute('cy', y1);
        startDot.setAttribute('r', '3');
        startDot.setAttribute('fill', '#10B981');
        svg.appendChild(startDot);

        const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endDot.setAttribute('cx', x2);
        endDot.setAttribute('cy', y2);
        endDot.setAttribute('r', '3');
        endDot.setAttribute('fill', '#10B981');
        svg.appendChild(endDot);
      }
    }
  });
}

function initDragDrop() {
  document.querySelectorAll('.match-right-item').forEach(el => {
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  });
}

// ===== التحقق من الإجابات =====
function checkAllAnswers(questions) {
  let correct = 0;
  let total = questions.length;

  questions.forEach((q, idx) => {
    const num = idx + 1;
    const card = document.getElementById(`qcard-${num}`);
    const feedback = card.querySelector('.q-feedback');
    feedback.classList.remove('hidden', 'correct', 'wrong');

    let isCorrect = false;

    if (q.type === 'mcq') {
      const selected = card.querySelector('input[type="radio"]:checked');
      if (selected) {
        const userAns = parseInt(selected.value);
        isCorrect = userAns === q.answer;
        // تلوين الخيارات
        card.querySelectorAll('.mcq-option').forEach((opt, i) => {
          opt.classList.remove('correct', 'wrong');
          if (i === q.answer) opt.classList.add('correct');
          else if (i === userAns && !isCorrect) opt.classList.add('wrong');
        });
        feedback.textContent = isCorrect ? '✅ إجابة صحيحة! أحسنت' : `❌ الإجابة الصحيحة: ${q.options[q.answer]}`;
        if (isCorrect) { celebrateCorrectAnswer(); }
      } else {
        feedback.textContent = '⚠️ لم تختر إجابة';
      }

    } else if (q.type === 'tf') {
      const userAns = card.dataset.userAnswer;
      if (userAns !== undefined) {
        const userBool = userAns === 'true';
        isCorrect = userBool === q.answer;
        card.querySelectorAll('.tf-btn').forEach(btn => {
          btn.classList.remove('correct', 'wrong');
          const btnVal = btn.classList.contains('tf-true');
          if (btnVal === q.answer) btn.classList.add('correct');
          else if (btnVal === userBool && !isCorrect) btn.classList.add('wrong');
        });
        feedback.textContent = isCorrect ? '✅ إجابة صحيحة! أحسنت' : `❌ الإجابة الصحيحة: ${q.answer ? 'صح ✅' : 'خطأ ❌'}`;
        if (isCorrect) { celebrateCorrectAnswer(); }
      } else {
        feedback.textContent = '⚠️ لم تختر إجابة';
      }

    } else if (q.type === 'match') {
      const correct_arr = JSON.parse(card.dataset.correct);
      const leftItems = card.querySelectorAll('.match-left-item');
      let allRight = true;

      leftItems.forEach((leftItem, i) => {
        const userVal = matchConnections[i];
        const isItemCorrect = userVal === correct_arr[i];
        if (!isItemCorrect) allRight = false;

        leftItem.classList.remove('correct', 'wrong');
        leftItem.classList.add(isItemCorrect ? 'correct' : 'wrong');

        // تلوين العنصر الأيمن أيضاً
        const rightItems = card.querySelectorAll('.match-right-item');
        rightItems.forEach(rightItem => {
          if (rightItem.dataset.val === userVal) {
            rightItem.classList.remove('correct', 'wrong');
            rightItem.classList.add(isItemCorrect ? 'correct' : 'wrong');
          }
        });
      });

      isCorrect = allRight;
      feedback.textContent = isCorrect ? '✅ ممتاز! جميع التوصيلات صحيحة' : '❌ بعض التوصيلات خاطئة، راجع من جديد';
    }

    if (isCorrect) correct++;
    feedback.classList.add(isCorrect ? 'correct' : 'wrong');
    card.classList.add(isCorrect ? 'card-correct' : 'card-wrong');
  });

  // عرض النتيجة
  setTimeout(() => showResult(correct, total), 500);
}

function showResult(correct, total) {
  const pct = Math.round((correct / total) * 100);
  let emoji, msg, cls;
  if (pct === 100) { 
    emoji = '🏆'; 
    msg = 'ممتاز! أحسنت! حصلت على العلامة الكاملة'; 
    cls = 'result-perfect';
    celebrateCorrectAnswer(); // احتفالات عند النجاح الكامل
  }
  else if (pct >= 80) { emoji = '⭐'; msg = 'جيد جداً! أداء رائع'; cls = 'result-great'; }
  else if (pct >= 60) { emoji = '👍'; msg = 'جيد! يمكنك المراجعة وإعادة المحاولة'; cls = 'result-good'; }
  else { emoji = '💪'; msg = 'راجع الدرس مرة أخرى وحاول مجدداً'; cls = 'result-try'; }

  const modal = document.getElementById('result-modal');
  document.getElementById('result-content').innerHTML = `
    <div class="result-inner ${cls}">
      <div class="result-emoji">${emoji}</div>
      <h2 class="result-score">${correct} / ${total}</h2>
      <div class="result-pct">${pct}%</div>
      <p class="result-msg">${msg}</p>
      <div class="result-bar-wrap">
        <div class="result-bar" style="width:${pct}%"></div>
      </div>
      <div class="result-actions">
        <button class="res-btn res-retry" onclick="retryQuestions()">🔄 أعد المحاولة</button>
        <button class="res-btn res-close" onclick="closeResult()">✕ إغلاق</button>
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
  matchConnections = {}; // إعادة تعيين التوصيلات
  selectedLeft = null;
  selectedRight = null;

  // إعادة تهيئة الأسئلة
  document.querySelectorAll('.question-card').forEach(card => {
    card.classList.remove('card-correct', 'card-wrong');
    card.querySelectorAll('.q-feedback').forEach(f => {
      f.classList.add('hidden');
      f.classList.remove('correct', 'wrong');
      f.textContent = '';
    });

    // MCQ
    card.querySelectorAll('.mcq-option').forEach(opt => {
      opt.classList.remove('correct', 'wrong', 'selected');
      const inp = opt.querySelector('input');
      if (inp) inp.checked = false;
    });

    // TF
    card.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected', 'correct', 'wrong'));
    delete card.dataset.userAnswer;

    // Match
    card.querySelectorAll('.match-left-item, .match-right-item').forEach(item => {
      item.classList.remove('correct', 'wrong', 'connected', 'selected');
    });

    // مسح الخطوط
    const svg = card.querySelector('.match-svg');
    if (svg) svg.innerHTML = '';
  });

  setTimeout(() => initDragDrop(), 100);
}
