// ===================================================
//  منشئ الاختبار - المنطق الكامل
// ===================================================

// الحالة العامة
const EB = {
  grade: null,
  semester: null,
  selectedUnits: new Set(),
  selectedLessons: new Set(),
  selectedQuestions: [],   // [{...question, lessonId, lessonName, unitName, gradeId, origIdx}]
  currentTab: 'questions',
  filterType: 'all',
  searchQuery: '',
  dragSrcIdx: null,
  showAnswerKey: false,

  settings: {
    schoolName: 'مدرسة ابن المشرف الابتدائية',
    teacherName: '',
    subject: 'المهارات الرقمية',
    grade: '',
    semester: '',
    period: 'الفترة الأولى',
    date: '',
    totalMarks: '20',
    duration: '45 دقيقة',
    instructions: 'أجب عن جميع الأسئلة الآتية:\nاقرأ السؤال جيداً قبل الإجابة.\nالعلامة الكاملة للاختبار (${totalMarks}) درجة.',
  }
};

// ===== التهيئة =====
document.addEventListener('DOMContentLoaded', () => {
  loadCurriculum();
  initSettings();
  updateStatusBar();
  renderExamPaper(false);
});

function loadCurriculum() {
  // تحميل البيانات من الـ CURRICULUM العالمية
  if (typeof CURRICULUM === 'undefined') {
    document.getElementById('sidebar-content').innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>تعذر تحميل البيانات</h3><p>تأكد من تحميل ملف data.js</p></div>';
    return;
  }
  renderGradeStep();
}

// ===== الخطوة 1: اختيار الصف =====
function renderGradeStep() {
  const container = document.getElementById('step1-content');
  const grades = Object.values(CURRICULUM);

  container.innerHTML = `
    <div class="step-section">
      <div class="step-section-title">اختر الصف الدراسي</div>
      <div class="grade-cards">
        ${grades.map(g => `
          <div class="grade-card ${EB.grade === g.id ? 'selected' : ''}"
               onclick="selectGrade('${g.id}')">
            <span class="grade-card-icon">${g.icon || '📚'}</span>
            <div class="grade-card-info">
              <strong>${g.name}</strong>
              <small>${g.semesters.length} فصول دراسية</small>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    ${EB.grade ? `
    <div class="step-section">
      <div class="step-section-title">اختر الفصل الدراسي</div>
      <div class="semester-btns">
        ${CURRICULUM[EB.grade].semesters.map(s => `
          <button class="semester-btn ${EB.semester === s.id ? 'selected' : ''}"
                  onclick="selectSemester('${s.id}')">
            ${s.name}
          </button>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;
}

function selectGrade(gradeId) {
  EB.grade = gradeId;
  EB.semester = null;
  EB.selectedUnits.clear();
  EB.selectedLessons.clear();
  EB.selectedQuestions = [];
  renderGradeStep();
  updateSettingsFromSelection();
  syncQuestionsTab();
  updateStatusBar();
}

function selectSemester(semId) {
  EB.semester = semId;
  EB.selectedUnits.clear();
  EB.selectedLessons.clear();
  EB.selectedQuestions = [];
  renderGradeStep();
  renderUnitsStep();
  goStep(2);
  updateSettingsFromSelection();
  syncQuestionsTab();
  updateStatusBar();
}

// ===== الخطوة 2: الوحدات والدروس =====
function renderUnitsStep() {
  if (!EB.grade || !EB.semester) return;
  const container = document.getElementById('step2-content');
  const sem = CURRICULUM[EB.grade].semesters.find(s => s.id === EB.semester);
  if (!sem) return;

  container.innerHTML = sem.units.map(unit => {
    const isUnitSelected = EB.selectedUnits.has(unit.id);
    const allLessonsSelected = unit.lessons.every(l => EB.selectedLessons.has(l.id));
    const someLessonsSelected = unit.lessons.some(l => EB.selectedLessons.has(l.id));

    return `
      <div class="unit-item ${isUnitSelected || someLessonsSelected ? 'selected' : ''}" id="unit-${unit.id}">
        <div class="unit-header" onclick="toggleUnit('${unit.id}')">
          <input type="checkbox" class="unit-checkbox"
            ${allLessonsSelected ? 'checked' : ''}
            ${someLessonsSelected && !allLessonsSelected ? 'indeterminate' : ''}
            onclick="event.stopPropagation(); toggleUnitLessons('${unit.id}', this.checked)"
            id="uchk-${unit.id}">
          <span class="unit-icon">${unit.icon || '📖'}</span>
          <span class="unit-name">${unit.name}</span>
          <button class="unit-toggle" id="utoggle-${unit.id}">▼</button>
        </div>
        <div class="lessons-list" id="lessons-${unit.id}" style="display:block">
          ${unit.lessons.map(lesson => `
            <label class="lesson-item ${EB.selectedLessons.has(lesson.id) ? 'selected' : ''}"
                   id="lesson-item-${lesson.id}">
              <input type="checkbox" class="lesson-checkbox"
                     ${EB.selectedLessons.has(lesson.id) ? 'checked' : ''}
                     onchange="toggleLesson('${lesson.id}', '${unit.id}', this.checked)">
              <span class="lesson-name">${lesson.name}</span>
              <span class="lesson-q-count">${lesson.questions ? lesson.questions.length : 0} سؤال</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // إصلاح indeterminate
  sem.units.forEach(unit => {
    const chk = document.getElementById(`uchk-${unit.id}`);
    if (chk) {
      const all = unit.lessons.every(l => EB.selectedLessons.has(l.id));
      const some = unit.lessons.some(l => EB.selectedLessons.has(l.id));
      chk.indeterminate = some && !all;
    }
  });
}

function toggleUnit(unitId) {
  const list = document.getElementById(`lessons-${unitId}`);
  const btn = document.getElementById(`utoggle-${unitId}`);
  if (!list) return;
  const isHidden = list.style.display === 'none';
  list.style.display = isHidden ? 'block' : 'none';
  if (btn) btn.textContent = isHidden ? '▲' : '▼';
}

function toggleUnitLessons(unitId, checked) {
  if (!EB.grade || !EB.semester) return;
  const sem = CURRICULUM[EB.grade].semesters.find(s => s.id === EB.semester);
  const unit = sem.units.find(u => u.id === unitId);
  if (!unit) return;

  unit.lessons.forEach(lesson => {
    if (checked) {
      EB.selectedLessons.add(lesson.id);
      EB.selectedUnits.add(unitId);
    } else {
      EB.selectedLessons.delete(lesson.id);
    }
  });
  if (!checked) EB.selectedUnits.delete(unitId);

  renderUnitsStep();
  syncQuestionsTab();
  updateStatusBar();
}

function toggleLesson(lessonId, unitId, checked) {
  if (checked) {
    EB.selectedLessons.add(lessonId);
    EB.selectedUnits.add(unitId);
  } else {
    EB.selectedLessons.delete(lessonId);
    // إزالة الوحدة إن لم يبق منها شيء
    const sem = CURRICULUM[EB.grade].semesters.find(s => s.id === EB.semester);
    const unit = sem.units.find(u => u.id === unitId);
    const anySelected = unit.lessons.some(l => EB.selectedLessons.has(l.id));
    if (!anySelected) EB.selectedUnits.delete(unitId);
  }

  const item = document.getElementById(`lesson-item-${lessonId}`);
  if (item) item.classList.toggle('selected', checked);
  const unitEl = document.getElementById(`unit-${unitId}`);
  if (unitEl) unitEl.classList.toggle('selected', EB.selectedUnits.has(unitId));

  // تحديث checkbox الوحدة
  const sem = CURRICULUM[EB.grade].semesters.find(s => s.id === EB.semester);
  const unit = sem.units.find(u => u.id === unitId);
  const chk = document.getElementById(`uchk-${unitId}`);
  if (chk && unit) {
    const all = unit.lessons.every(l => EB.selectedLessons.has(l.id));
    const some = unit.lessons.some(l => EB.selectedLessons.has(l.id));
    chk.checked = all;
    chk.indeterminate = some && !all;
  }

  syncQuestionsTab();
  updateStatusBar();
}

// ===== التنقل بين الخطوات =====
function goStep(n) {
  document.querySelectorAll('.eb-step').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 < n) el.classList.add('done');
    if (i + 1 === n) el.classList.add('active');
  });
  document.querySelectorAll('.eb-step-content').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === n);
  });
}

// ===== مزامنة تبويب الأسئلة =====
function syncQuestionsTab() {
  const questions = getQuestionsFromSelectedLessons();
  renderQuestionBrowser(questions);
  updateSelectionSummary();
  updateSelectedTab();
}

function getQuestionsFromSelectedLessons() {
  if (!EB.grade || !EB.semester) return [];
  const grade = CURRICULUM[EB.grade];
  const sem = grade.semesters.find(s => s.id === EB.semester);
  if (!sem) return [];

  const result = [];
  sem.units.forEach(unit => {
    unit.lessons.forEach(lesson => {
      if (!EB.selectedLessons.has(lesson.id)) return;
      if (!lesson.questions) return;
      lesson.questions.forEach((q, idx) => {
        result.push({
          ...q,
          lessonId: lesson.id,
          lessonName: lesson.name,
          unitName: unit.name,
          unitId: unit.id,
          gradeId: EB.grade,
          origIdx: idx,
          uid: `${lesson.id}_${idx}`
        });
      });
    });
  });
  return result;
}

function renderQuestionBrowser(questions) {
  const container = document.getElementById('questions-browser');
  const countBadge = document.getElementById('questions-tab-badge');

  if (!questions || questions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>لم يتم تحديد دروس بعد</h3>
        <p>اختر الصف والفصل والدروس من الشريط الجانبي<br>ثم ستظهر الأسئلة هنا للاختيار منها</p>
      </div>`;
    if (countBadge) countBadge.textContent = '0';
    return;
  }

  // تصفية حسب النوع والبحث
  let filtered = questions.filter(q => {
    if (EB.filterType !== 'all' && q.type !== EB.filterType) return false;
    if (EB.searchQuery) {
      const text = q.question.toLowerCase();
      const search = EB.searchQuery.toLowerCase();
      if (!text.includes(search)) return false;
    }
    return true;
  });

  if (countBadge) countBadge.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>لا توجد أسئلة تطابق البحث</h3>
        <p>جرب تغيير الفلتر أو كلمة البحث</p>
      </div>`;
    return;
  }

  const typeLabels = { mcq: 'اختيار متعدد', tf: 'صح وخطأ', match: 'توصيل', fill: 'أكمل الفراغات' };
  const typeClasses = { mcq: 'q-tag-mcq', tf: 'q-tag-tf', match: 'q-tag-match', fill: 'q-tag-fill' };

  container.innerHTML = filtered.map(q => {
    const isSelected = EB.selectedQuestions.some(sq => sq.uid === q.uid);
    return `
      <div class="q-browser-card ${isSelected ? 'selected' : ''}" id="qbc-${q.uid}">
        <div class="q-browser-header">
          <input type="checkbox" class="q-browser-checkbox" ${isSelected ? 'checked' : ''}
                 onchange="toggleQuestion('${q.uid}', this.checked)">
          <div class="q-browser-meta">
            <div class="q-browser-text">${q.question}</div>
            <div class="q-browser-tags">
              <span class="q-tag ${typeClasses[q.type] || ''}">${typeLabels[q.type] || q.type}</span>
              <span class="q-tag" style="background:#f0f0f0;color:#555">${q.lessonName}</span>
            </div>
          </div>
        </div>
        <div class="q-browser-from">📍 ${q.unitName} › ${q.lessonName}</div>
      </div>
    `;
  }).join('');
}

function toggleQuestion(uid, checked) {
  if (checked) {
    const allQ = getQuestionsFromSelectedLessons();
    const q = allQ.find(q => q.uid === uid);
    if (q && !EB.selectedQuestions.some(sq => sq.uid === uid)) {
      EB.selectedQuestions.push({ ...q });
    }
  } else {
    EB.selectedQuestions = EB.selectedQuestions.filter(q => q.uid !== uid);
  }

  const card = document.getElementById(`qbc-${uid}`);
  if (card) card.classList.toggle('selected', checked);

  updateSelectedTab();
  updateStatusBar();

  if (EB.currentTab === 'preview') renderExamPaper(EB.showAnswerKey);
}

// تحديد الكل أو إلغاء الكل
function selectAllVisible() {
  const allQ = getQuestionsFromSelectedLessons();
  let filtered = allQ.filter(q => {
    if (EB.filterType !== 'all' && q.type !== EB.filterType) return false;
    if (EB.searchQuery) {
      const text = q.question.toLowerCase();
      if (!text.includes(EB.searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  filtered.forEach(q => {
    if (!EB.selectedQuestions.some(sq => sq.uid === q.uid)) {
      EB.selectedQuestions.push({ ...q });
    }
  });

  syncQuestionsTab();
  updateStatusBar();
}

function clearAllSelected() {
  if (!confirm('هل تريد إزالة جميع الأسئلة المحددة؟')) return;
  EB.selectedQuestions = [];
  syncQuestionsTab();
  updateStatusBar();
  if (EB.currentTab === 'preview') renderExamPaper(EB.showAnswerKey);
}

// ===== تصفية الأسئلة =====
function setFilter(type) {
  EB.filterType = type;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`filter-${type}`);
  if (btn) btn.classList.add('active');
  const allQ = getQuestionsFromSelectedLessons();
  renderQuestionBrowser(allQ);
}

function searchQuestions(val) {
  EB.searchQuery = val;
  const allQ = getQuestionsFromSelectedLessons();
  renderQuestionBrowser(allQ);
}

// ===== تبويب الأسئلة المختارة =====
function updateSelectedTab() {
  const badge = document.getElementById('selected-tab-badge');
  if (badge) badge.textContent = EB.selectedQuestions.length;

  if (EB.currentTab === 'selected') renderSelectedList();
}

function renderSelectedList() {
  const container = document.getElementById('selected-questions-list');
  const countEl = document.getElementById('selected-count');
  if (!container) return;

  if (countEl) countEl.textContent = EB.selectedQuestions.length;

  if (EB.selectedQuestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">☑️</div>
        <h3>لا توجد أسئلة محددة</h3>
        <p>اختر أسئلة من تبويب "تصفح الأسئلة"</p>
      </div>`;
    return;
  }

  const typeLabels = { mcq: 'اختيار متعدد', tf: 'صح وخطأ', match: 'توصيل', fill: 'أكمل الفراغات' };
  const typeColors = {
    mcq: 'background:#E3F2FD;color:#1565C0',
    tf: 'background:#E8F5E9;color:#2E7D32',
    match: 'background:#F3E5F5;color:#6A1B9A',
    fill: 'background:#FFF3E0;color:#E65100'
  };

  container.innerHTML = EB.selectedQuestions.map((q, idx) => `
    <div class="selected-q-card" draggable="true"
         ondragstart="dragStart(event,${idx})"
         ondragover="dragOver(event,${idx})"
         ondrop="dragDrop(event,${idx})"
         ondragend="dragEnd(event)"
         id="sqcard-${idx}">
      <span class="drag-handle" title="اسحب لإعادة الترتيب">⠿</span>
      <div class="selected-q-num">${idx + 1}</div>
      <div class="selected-q-body">
        <div class="selected-q-text">${q.question}</div>
        <div class="selected-q-meta">
          <span class="q-tag ${['q-tag-mcq','q-tag-tf','q-tag-match','q-tag-fill'][['mcq','tf','match','fill'].indexOf(q.type)]}">${typeLabels[q.type] || q.type}</span>
          <span>📍 ${q.unitName} › ${q.lessonName}</span>
        </div>
      </div>
      <div class="selected-q-actions">
        <button class="icon-btn icon-btn-edit" onclick="openEditModal(${idx})" title="تعديل">✏️</button>
        <button class="icon-btn icon-btn-delete" onclick="removeSelected(${idx})" title="حذف">🗑️</button>
      </div>
    </div>
  `).join('');
}

function removeSelected(idx) {
  const q = EB.selectedQuestions[idx];
  EB.selectedQuestions.splice(idx, 1);
  // إلغاء تحديد في المتصفح
  const card = document.getElementById(`qbc-${q.uid}`);
  if (card) {
    card.classList.remove('selected');
    const chk = card.querySelector('.q-browser-checkbox');
    if (chk) chk.checked = false;
  }
  renderSelectedList();
  updateStatusBar();
  if (EB.currentTab === 'preview') renderExamPaper(EB.showAnswerKey);
}

// ===== السحب والإفلات =====
function dragStart(e, idx) {
  EB.dragSrcIdx = idx;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function dragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.selected-q-card').forEach(c => c.classList.remove('drag-over'));
  const card = document.getElementById(`sqcard-${idx}`);
  if (card) card.classList.add('drag-over');
}

function dragDrop(e, idx) {
  e.preventDefault();
  if (EB.dragSrcIdx === null || EB.dragSrcIdx === idx) return;
  const moved = EB.selectedQuestions.splice(EB.dragSrcIdx, 1)[0];
  EB.selectedQuestions.splice(idx, 0, moved);
  renderSelectedList();
  if (EB.currentTab === 'preview') renderExamPaper(EB.showAnswerKey);
}

function dragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.selected-q-card').forEach(c => c.classList.remove('drag-over'));
  EB.dragSrcIdx = null;
}

// ===== نافذة تعديل السؤال =====
function openEditModal(idx) {
  const q = EB.selectedQuestions[idx];
  const modal = document.getElementById('edit-modal');
  const overlay = document.getElementById('modal-overlay');
  modal.innerHTML = buildEditModalContent(q, idx);
  overlay.classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function buildEditModalContent(q, idx) {
  const typeLabels = { mcq: 'اختيار متعدد', tf: 'صح وخطأ', match: 'توصيل', fill: 'أكمل الفراغات' };
  let body = '';

  if (q.type === 'mcq') {
    const letters = ['أ', 'ب', 'ج', 'د'];
    const letterBg = ['#FFE0B2', '#BBDEFB', '#E1BEE7', '#C8E6C9'];
    const letterColor = ['#E65100', '#1565C0', '#6A1B9A', '#2E7D32'];
    body = `
      <div class="form-group">
        <label class="form-label">نص الإجابة الصحيحة (اختر رقمها أدناه)</label>
        <div class="edit-options-list">
          ${q.options.map((opt, i) => `
            <div class="edit-option-row">
              <input type="radio" name="answer-${idx}" value="${i}" class="edit-answer-radio"
                     ${q.answer === i ? 'checked' : ''}
                     onchange="updateAnswer(${idx}, ${i})">
              <div class="edit-option-letter" style="background:${letterBg[i]};color:${letterColor[i]}">${letters[i]}</div>
              <input type="text" class="form-input" style="flex:1" value="${escHtml(opt)}"
                     onchange="updateOption(${idx}, ${i}, this.value)">
            </div>
          `).join('')}
        </div>
        <div class="answer-hint">✅ حدد الإجابة الصحيحة بالنقر على الزر الدائري</div>
      </div>
    `;
  } else if (q.type === 'tf') {
    body = `
      <div class="form-group">
        <label class="form-label">الإجابة الصحيحة</label>
        <div style="display:flex;gap:12px;margin-top:6px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.9rem;font-weight:600">
            <input type="radio" name="tfans-${idx}" value="true" class="edit-answer-radio"
                   ${q.answer === true ? 'checked' : ''}
                   onchange="updateTFAnswer(${idx}, true)">
            ✅ صح
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.9rem;font-weight:600">
            <input type="radio" name="tfans-${idx}" value="false" class="edit-answer-radio"
                   ${q.answer === false ? 'checked' : ''}
                   onchange="updateTFAnswer(${idx}, false)">
            ❌ خطأ
          </label>
        </div>
      </div>
    `;
  } else if (q.type === 'match') {
    body = `
      <div class="form-group">
        <label class="form-label">أزواج التوصيل (العمود الأيسر → العمود الأيمن)</label>
        <div class="edit-options-list" id="match-pairs-${idx}">
          ${q.pairs.map((pair, pi) => `
            <div class="edit-option-row">
              <span style="min-width:20px;text-align:center;font-weight:700;color:#6A1B9A">${pi + 1}</span>
              <input type="text" class="form-input" style="flex:1" value="${escHtml(pair[0])}"
                     onchange="updatePair(${idx}, ${pi}, 0, this.value)" placeholder="العمود الأيسر">
              <span style="color:#999">←</span>
              <input type="text" class="form-input" style="flex:1" value="${escHtml(pair[1])}"
                     onchange="updatePair(${idx}, ${pi}, 1, this.value)" placeholder="العمود الأيمن">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (q.type === 'fill') {
    body = `
      <div class="alert alert-info">يمكن تعديل نص السؤال فقط. لتعديل الجمل والكلمات الناقصة، يرجى تعديل البيانات من لوحة التحكم.</div>
    `;
  }

  return `
    <div class="edit-modal-header">
      <div class="edit-modal-title">✏️ تعديل السؤال - ${typeLabels[q.type]}</div>
      <button class="modal-close" onclick="closeEditModal()">✕</button>
    </div>
    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label">نص السؤال</label>
      <textarea class="form-textarea" rows="3"
                onchange="updateQuestionText(${idx}, this.value)">${escHtml(q.question)}</textarea>
    </div>
    ${body}
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
      <button class="eb-btn eb-btn-outline" onclick="closeEditModal()">إغلاق</button>
      <button class="eb-btn eb-btn-success" onclick="saveEditAndClose(${idx})">💾 حفظ وإغلاق</button>
    </div>
  `;
}

function updateQuestionText(idx, val) {
  EB.selectedQuestions[idx].question = val;
}

function updateOption(idx, optIdx, val) {
  EB.selectedQuestions[idx].options[optIdx] = val;
}

function updateAnswer(idx, answerIdx) {
  EB.selectedQuestions[idx].answer = answerIdx;
}

function updateTFAnswer(idx, val) {
  EB.selectedQuestions[idx].answer = val;
}

function updatePair(idx, pairIdx, col, val) {
  EB.selectedQuestions[idx].pairs[pairIdx][col] = val;
}

function saveEditAndClose(idx) {
  closeEditModal();
  renderSelectedList();
  if (EB.currentTab === 'preview') renderExamPaper(EB.showAnswerKey);
  showToast('تم حفظ التعديلات', 'success');
}

// ===== إعدادات الاختبار =====
function initSettings() {
  const today = new Date();
  EB.settings.date = today.toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const fields = ['schoolName', 'teacherName', 'subject', 'grade', 'semester',
                  'period', 'date', 'totalMarks', 'duration', 'instructions'];
  fields.forEach(f => {
    const el = document.getElementById(`s-${f}`);
    if (el) el.value = EB.settings[f] || '';
  });
}

function updateSettingsFromSelection() {
  if (EB.grade) {
    const g = CURRICULUM[EB.grade];
    const gradeEl = document.getElementById('s-grade');
    if (gradeEl) gradeEl.value = g.name;
    EB.settings.grade = g.name;
  }
  if (EB.semester) {
    const sem = CURRICULUM[EB.grade].semesters.find(s => s.id === EB.semester);
    if (sem) {
      const semEl = document.getElementById('s-semester');
      if (semEl) semEl.value = sem.name;
      EB.settings.semester = sem.name;
    }
  }
}

function onSettingChange(key, val) {
  EB.settings[key] = val;
  if (EB.currentTab === 'preview') renderExamPaper(EB.showAnswerKey);
}

// ===== التبويبات =====
function switchTab(tabName) {
  EB.currentTab = tabName;

  document.querySelectorAll('.eb-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.eb-tab-content').forEach(t => t.classList.remove('active'));

  const tabBtn = document.getElementById(`tab-${tabName}`);
  const tabContent = document.getElementById(`tc-${tabName}`);
  if (tabBtn) tabBtn.classList.add('active');
  if (tabContent) tabContent.classList.add('active');

  if (tabName === 'selected') renderSelectedList();
  if (tabName === 'preview') renderExamPaper(EB.showAnswerKey);
}

// ===== ملخص التحديد =====
function updateSelectionSummary() {
  const summary = document.getElementById('selection-summary');
  if (!summary) return;
  if (EB.selectedLessons.size === 0) {
    summary.innerHTML = '<small style="color:#999">لم يتم تحديد دروس بعد</small>';
    return;
  }
  summary.innerHTML = `
    <div class="selection-chips">
      <span class="selection-chip">${EB.selectedLessons.size} درس</span>
      <span class="selection-chip">${getQuestionsFromSelectedLessons().length} سؤال متاح</span>
    </div>
    <small style="color:#1565C0;font-size:0.75rem">انتقل لتبويب "تصفح الأسئلة" للاختيار</small>
  `;
}

// ===== شريط الحالة =====
function updateStatusBar() {
  const el = document.getElementById('status-info');
  if (!el) return;
  const grade = EB.grade ? CURRICULUM[EB.grade].name : '—';
  el.innerHTML = `
    <div class="status-item"><span class="status-dot"></span> ${grade}</div>
    <div class="status-item">📋 ${EB.selectedLessons.size} درس محدد</div>
    <div class="status-item">✅ ${EB.selectedQuestions.length} سؤال في الاختبار</div>
  `;
}

// ===== بناء ورقة الاختبار =====
function renderExamPaper(showKey = false) {
  EB.showAnswerKey = showKey;
  const area = document.getElementById('exam-paper-area');
  if (!area) return;

  const s = EB.settings;
  const instructions = s.instructions.replace('${totalMarks}', s.totalMarks);

  // تجميع الأسئلة حسب النوع
  const mcqs = EB.selectedQuestions.filter(q => q.type === 'mcq');
  const tfs = EB.selectedQuestions.filter(q => q.type === 'tf');
  const matches = EB.selectedQuestions.filter(q => q.type === 'match');
  const fills = EB.selectedQuestions.filter(q => q.type === 'fill');

  let globalNum = 1;

  area.innerHTML = `
    <div class="exam-paper" id="exam-paper">
      ${buildExamHeader(s, showKey)}
      <div class="exam-body">
        <div class="exam-instructions">
          <strong>تعليمات:</strong>
          ${instructions.split('\n').join('<br>')}
        </div>
        ${mcqs.length ? buildSection('أولاً: اختر الإجابة الصحيحة', mcqs, globalNum, showKey) : ''}
        ${(globalNum = globalNum + mcqs.length) && tfs.length ? buildSection('ثانياً: ضع (✓) أمام العبارة الصحيحة و(✗) أمام الخاطئة', tfs, globalNum, showKey) : ''}
        ${(globalNum = globalNum + tfs.length) && matches.length ? buildSection('ثالثاً: صل كل عبارة بما يناسبها', matches, globalNum, showKey) : ''}
        ${(globalNum = globalNum + matches.length) && fills.length ? buildSection('رابعاً: أكمل الفراغات بالكلمة المناسبة', fills, globalNum, showKey) : ''}
        ${EB.selectedQuestions.length === 0 ? '<div class="empty-state" style="padding:40px"><div class="empty-state-icon">📄</div><h3>لم يتم اختيار أسئلة بعد</h3><p>اختر الأسئلة من الخطوات السابقة</p></div>' : ''}
      </div>
      ${buildExamFooter(s, showKey)}
    </div>
  `;
}

function buildExamHeader(s, showKey) {
  return `
    <table class="exam-header-table">
      <tr>
        <td colspan="3" class="exam-header-ministry">المملكة العربية السعودية - وزارة التعليم</td>
      </tr>
      <tr>
        <td class="exam-logo-cell">
          <div class="exam-logo-placeholder">🏫</div>
        </td>
        <td style="text-align:center">
          <div style="font-weight:700;font-size:1rem;margin-bottom:4px">${escHtml(s.schoolName)}</div>
          <div class="exam-title-cell" style="padding:8px;border-radius:6px;margin:4px 0;font-size:1rem">
            اختبار مادة ${escHtml(s.subject)}
            ${showKey ? '<span class="answer-key-badge">نموذج الإجابة</span>' : ''}
          </div>
          <div style="font-size:0.82rem;color:#666">${escHtml(s.grade)} | ${escHtml(s.semester)}</div>
        </td>
        <td style="text-align:center;min-width:110px">
          <div style="font-size:0.75rem;color:#666;margin-bottom:2px">الدرجة الكاملة</div>
          <div style="font-size:1.4rem;font-weight:900;color:#1565C0">${escHtml(s.totalMarks)}</div>
          <div style="font-size:0.75rem;color:#666;margin-top:2px">${escHtml(s.period)}</div>
        </td>
      </tr>
      <tr>
        <td colspan="3" style="padding:0">
          <div class="exam-student-row">
            <div class="exam-student-field">
              <span>اسم الطالب:</span>
              <span class="exam-student-line">${showKey ? '' : ''}</span>
            </div>
            <div class="exam-student-field">
              <span>الصف:</span>
              <span class="exam-student-line" style="min-width:60px">${showKey ? escHtml(s.grade) : ''}</span>
            </div>
            <div class="exam-student-field">
              <span>التاريخ:</span>
              <span class="exam-student-line" style="min-width:80px">${escHtml(s.date)}</span>
            </div>
            <div class="exam-student-field">
              <span>الدرجة:</span>
              <span class="exam-student-line" style="min-width:50px"></span>
            </div>
          </div>
        </td>
      </tr>
    </table>
  `;
}

function buildSection(title, questions, startNum, showKey) {
  const marks = (parseInt(EB.settings.totalMarks) / EB.selectedQuestions.length * questions.length).toFixed(1);
  return `
    <div class="exam-section">
      <div class="exam-section-header">
        <span>${title}</span>
        <span class="exam-section-marks">${questions.length} سؤال</span>
      </div>
      <div class="exam-section-body">
        ${questions.map((q, i) => buildExamQuestion(q, startNum + i, showKey)).join('')}
      </div>
    </div>
  `;
}

function buildExamQuestion(q, num, showKey) {
  let body = '';

  if (q.type === 'mcq') {
    const letters = ['أ', 'ب', 'ج', 'د'];
    const classes = ['exam-option-letter-أ', 'exam-option-letter-ب', 'exam-option-letter-ج', 'exam-option-letter-د'];
    body = `
      <div class="exam-mcq-options">
        ${q.options.map((opt, i) => `
          <div class="exam-mcq-option ${showKey && i === q.answer ? 'correct-answer' : ''}">
            <span class="exam-option-letter ${classes[i]}">${letters[i]}</span>
            ${escHtml(opt)}
            ${showKey && i === q.answer ? ' ✓' : ''}
          </div>
        `).join('')}
      </div>
    `;
  } else if (q.type === 'tf') {
    body = `
      <div class="exam-tf-options">
        <div class="exam-tf-option ${showKey && q.answer === true ? 'correct-answer' : ''}">
          <div class="exam-tf-circle" style="color:${showKey && q.answer === true ? '#2E7D32' : '#333'}"></div>
          صح ✓
        </div>
        <div class="exam-tf-option ${showKey && q.answer === false ? 'correct-answer' : ''}">
          <div class="exam-tf-circle" style="color:${showKey && q.answer === false ? '#2E7D32' : '#333'}"></div>
          خطأ ✗
        </div>
      </div>
    `;
  } else if (q.type === 'match') {
    // خلط العمود الأيمن للاختبار
    const rightCol = showKey
      ? q.pairs.map(p => p[1])
      : shuffleArray([...q.pairs.map(p => p[1])]);

    body = `
      <table class="exam-match-table" style="margin-right:32px">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>العمود الأيسر</th>
            <th>الإجابة</th>
            <th>العمود الأيمن</th>
          </tr>
        </thead>
        <tbody>
          ${q.pairs.map((pair, i) => `
            <tr>
              <td>${i + 1}</td>
              <td style="text-align:right;padding-right:8px">${escHtml(pair[0])}</td>
              <td>${showKey ? `<strong style="color:#2E7D32">${escHtml(pair[1])}</strong>` : '<span class="match-answer-line"></span>'}</td>
              <td style="text-align:right;padding-right:8px">${i < rightCol.length ? escHtml(rightCol[i]) : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (q.type === 'fill') {
    body = `
      <div class="exam-fill-sentences">
        ${q.sentences.map((parts, si) => {
          if (Array.isArray(parts)) {
            const [before, answer, after] = parts;
            return `<div class="exam-fill-sentence">
              ${si + 1}. ${escHtml(before || '')}
              <span class="exam-fill-blank ${showKey ? 'answer-shown' : ''}">${showKey ? escHtml(answer || '') : ''}</span>
              ${escHtml(after || '')}
            </div>`;
          }
          return `<div class="exam-fill-sentence">${si + 1}. ${escHtml(String(parts))}</div>`;
        }).join('')}
      </div>
    `;
  }

  return `
    <div class="exam-question">
      <div class="exam-q-text">
        <span class="exam-q-number">${num}</span>
        ${escHtml(q.question)}
      </div>
      ${body}
    </div>
  `;
}

function buildExamFooter(s, showKey) {
  return `
    <div class="exam-footer">
      <span>المعلم: ${escHtml(s.teacherName || '________________')}</span>
      <span>${showKey ? '🔑 نموذج الإجابة' : '🍀 بالتوفيق'}</span>
      <span>${escHtml(s.date)}</span>
    </div>
  `;
}

// ===== التصدير =====

// PDF
function exportPDF(showKey = false) {
  if (EB.selectedQuestions.length === 0) {
    showToast('أضف أسئلة للاختبار أولاً', 'error');
    return;
  }

  renderExamPaper(showKey);
  EB.showAnswerKey = showKey;

  // نسخ المعاينة إلى منطقة الطباعة
  const paper = document.getElementById('exam-paper');
  const printArea = document.getElementById('print-area');
  if (paper && printArea) {
    printArea.innerHTML = paper.outerHTML;
  }

  setTimeout(() => {
    window.print();
    showToast(`تم فتح نافذة الطباعة ${showKey ? '(نموذج الإجابة)' : '(اختبار)'}`, 'success');
  }, 100);
}

// Word
function exportWord(showKey = false) {
  if (EB.selectedQuestions.length === 0) {
    showToast('أضف أسئلة للاختبار أولاً', 'error');
    return;
  }

  renderExamPaper(showKey);

  const paper = document.getElementById('exam-paper');
  if (!paper) return;

  const wordHTML = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <meta name='ProgId' content='Word.Document'>
      <meta name='Generator' content='Microsoft Word 15'>
      <title>اختبار ${EB.settings.subject}</title>
      <style>
        body { font-family: 'Traditional Arabic', Arial, sans-serif; direction: rtl; margin: 20mm; font-size: 12pt; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #999; padding: 6pt; }
        .exam-section-header { background: #1565C0; color: white; padding: 6pt; font-weight: bold; }
        .exam-q-number { background: #1565C0; color: white; border-radius: 50%; padding: 2pt 6pt; }
        .exam-mcq-options { display: grid; grid-template-columns: 1fr 1fr; }
        .correct-answer { background: #E8F5E9; border: 1pt solid #2E7D32; font-weight: bold; }
        .exam-fill-blank { border-bottom: 1pt solid #000; display: inline-block; min-width: 60pt; }
      </style>
    </head>
    <body>${paper.outerHTML}</body>
    </html>
  `;

  const blob = new Blob(['﻿' + wordHTML], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `اختبار_${EB.settings.subject}_${EB.settings.grade}${showKey ? '_نموذج_الإجابة' : ''}.doc`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`تم تنزيل ملف Word ${showKey ? '(نموذج الإجابة)' : ''}`, 'success');
}

// ===== أدوات مساعدة =====
function escHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// نافذة الطباعة المخصصة
window.addEventListener('afterprint', () => {
  const printArea = document.getElementById('print-area');
  if (printArea) printArea.innerHTML = '';
});
