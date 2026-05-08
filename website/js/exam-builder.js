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
    region: 'الأحساء',
    period: 'الفترة الأولى',
    date: '',
    totalMarks: '20',
    duration: '45 دقيقة',
    instructions: 'أجب عن جميع الأسئلة الآتية:\nاقرأ السؤال جيداً قبل الإجابة.\nالعلامة الكاملة للاختبار (${totalMarks}) درجة.',
    logoBase64: '',
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
                  'region', 'period', 'date', 'totalMarks', 'duration', 'instructions'];
  fields.forEach(f => {
    const el = document.getElementById(`s-${f}`);
    if (el) el.value = EB.settings[f] || '';
  });

  const logoPreview = document.getElementById('logo-preview');
  if (logoPreview && EB.settings.logoBase64) {
    logoPreview.src = EB.settings.logoBase64;
    logoPreview.style.display = 'block';
  }
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    EB.settings.logoBase64 = e.target.result;
    const preview = document.getElementById('logo-preview');
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    showToast('تم رفع الشعار بنجاح ✓', 'success');
    if (EB.currentTab === 'preview') renderExamPaper(EB.showAnswerKey);
  };
  reader.readAsDataURL(file);
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
  const mcqs = EB.selectedQuestions.filter(q => q.type === 'mcq');
  const tfs  = EB.selectedQuestions.filter(q => q.type === 'tf');
  const matches = EB.selectedQuestions.filter(q => q.type === 'match');
  const fills = EB.selectedQuestions.filter(q => q.type === 'fill');

  area.innerHTML = `
    <div class="exam-paper" id="exam-paper">
      ${buildExamHeader(s, showKey)}
      <div class="exam-body" style="margin-top:10px">
        ${mcqs.length    ? buildSection('السؤال الأول: اختر الإجابة الصحيحة:', mcqs, showKey, 'mcq')    : ''}
        ${tfs.length     ? buildSection('السؤال الثاني: ضع علامة (صح) أو (خطأ) أمام كل عبارة:', tfs, showKey, 'tf') : ''}
        ${matches.length ? buildSection('السؤال الثالث: صل بين العمود (أ) والعمود (ب):', matches, showKey, 'match') : ''}
        ${fills.length   ? buildSection('السؤال الرابع: أكمل الفراغات من بنك الكلمات:', fills, showKey, 'fill') : ''}
        ${EB.selectedQuestions.length === 0 ? '<div class="empty-state" style="padding:40px"><div class="empty-state-icon">📄</div><h3>لم يتم اختيار أسئلة بعد</h3><p>اختر الأسئلة من الخطوات السابقة</p></div>' : ''}
      </div>
      ${buildExamFooter(s, showKey)}
    </div>
  `;
}

function buildExamHeader(s, showKey) {
  const logoCell = s.logoBase64
    ? `<img src="${s.logoBase64}" class="ministry-logo-img" alt="شعار الوزارة">`
    : `<div class="ministry-logo-placeholder">وزارة التعليم<br><span style="font-size:0.75em">Ministry of Education</span></div>`;

  return `
    <table class="exam-header-table" border="1">
      <tr>
        <td class="header-school-cell" rowspan="5">
          <div>المملكة العربية السعودية</div>
          <div>وزارة التعليم</div>
          <div>${escHtml(s.region || 'الأحساء')}</div>
          <div>مدرسة: ${escHtml(s.schoolName)}</div>
        </td>
        <td class="header-logo-cell" rowspan="5">
          <div style="font-weight:700;margin-bottom:6px">بسم الله الرحمن الرحيم</div>
          ${logoCell}
        </td>
        <td class="header-info-cell">المادة: <strong>${escHtml(s.subject)}</strong></td>
      </tr>
      <tr><td class="header-info-cell">الاختبار: <strong>${escHtml(s.period)}</strong></td></tr>
      <tr><td class="header-info-cell">الصف: <strong>${escHtml(s.grade)}</strong> &nbsp;( &nbsp;&nbsp;&nbsp;)</td></tr>
      <tr><td class="header-info-cell">الزمن: <strong>${escHtml(s.duration)}</strong></td></tr>
      <tr><td class="header-info-cell">الفترة: <strong>${escHtml(s.date)}</strong></td></tr>
    </table>
    <table class="exam-student-row-table" border="1">
      <tr>
        <td class="student-label">اسم الطالب</td>
        <td class="student-value"></td>
        <td class="student-label" style="text-align:center">درجة الطالب</td>
        <td class="student-score">${escHtml(String(s.totalMarks))}</td>
      </tr>
    </table>
    ${showKey ? '<div class="answer-key-banner">🔑 نموذج الإجابة</div>' : ''}
  `;
}

function buildSection(title, questions, showKey, type) {
  const total = parseInt(EB.settings.totalMarks) || 20;
  const totalQ = EB.selectedQuestions.length || 1;
  const marks = Math.round(total / totalQ * questions.length);

  let content = '';
  if (type === 'mcq') {
    content = questions.map((q, i) => buildMCQQuestion(q, i + 1, showKey)).join('');
  } else if (type === 'tf') {
    content = buildTFTable(questions, showKey);
  } else if (type === 'match') {
    content = questions.map((q, i) => buildMatchTable(q, showKey)).join('');
  } else if (type === 'fill') {
    content = questions.map((q, i) => buildFillBlock(q, showKey)).join('');
  }

  return `
    <div class="exam-section">
      <div class="exam-section-header-row">
        <div class="exam-section-title">${title}</div>
        <div class="exam-section-marks-badge">${marks} درجات</div>
      </div>
      <div class="exam-section-body">${content}</div>
    </div>
  `;
}

function buildMCQQuestion(q, num, showKey) {
  const letters = ['أ', 'ب', 'ج', 'د'];
  return `
    <div class="mcq-question-block">
      <div class="mcq-q-text">
        <span class="mcq-num">${num}-</span> ${escHtml(q.question)}
      </div>
      <div class="mcq-options-grid">
        ${(q.options || []).map((opt, i) => `
          <div class="mcq-opt-cell ${showKey && i === q.answer ? 'correct-opt' : ''}">
            <span class="opt-letter">(${letters[i]})</span> ${escHtml(opt)}${showKey && i === q.answer ? ' ✓' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildTFTable(questions, showKey) {
  return `
    <table class="tf-exam-table" border="1">
      <thead>
        <tr>
          <th class="tf-answer-col">الإجابة</th>
          <th class="tf-statement-col">العبارة</th>
          <th class="tf-num-col">#</th>
        </tr>
      </thead>
      <tbody>
        ${questions.map((q, i) => `
          <tr>
            <td class="tf-answer-cell">${showKey ? (q.answer === true ? '( صح )' : '( خطأ )') : '(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)'}</td>
            <td class="tf-statement-cell">${escHtml(q.question)}</td>
            <td class="tf-num-cell">${i + 1}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildMatchTable(q, showKey) {
  const rightCol = showKey
    ? q.pairs.map(p => p[1])
    : shuffleArray([...q.pairs.map(p => p[1])]);

  return `
    <table class="match-exam-table" border="1">
      <thead>
        <tr>
          <th class="match-col-header">( ب )</th>
          <th class="match-answer-col-header">الإجابة</th>
          <th class="match-col-header">( أ )</th>
        </tr>
      </thead>
      <tbody>
        ${q.pairs.map((pair, i) => `
          <tr>
            <td class="match-cell">${i < rightCol.length ? escHtml(rightCol[i]) : ''}</td>
            <td class="match-answer-td">${showKey ? `<strong style="color:#2E7D32">${escHtml(pair[1])}</strong>` : '...........'}</td>
            <td class="match-cell">${escHtml(pair[0])}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildFillBlock(q, showKey) {
  const answers = (q.sentences || [])
    .filter(p => Array.isArray(p) && p[1])
    .map(p => escHtml(p[1]));

  const wordBank = (!showKey && answers.length) ? `
    <div class="fill-word-bank">
      <strong>بنك الكلمات: </strong> ${answers.join('&nbsp;&nbsp;/&nbsp;&nbsp;')}
    </div>` : '';

  return `
    <div class="fill-block">
      ${wordBank}
      <div class="fill-sentences">
        ${(q.sentences || []).map((parts, si) => {
          if (Array.isArray(parts)) {
            const [before, answer, after] = parts;
            return `<div class="fill-sent">
              ${si + 1}. ${escHtml(before || '')}
              <span class="fill-blank${showKey ? ' fill-answer-shown' : ''}">${showKey ? escHtml(answer || '') : ''}</span>
              ${escHtml(after || '')}
            </div>`;
          }
          return `<div class="fill-sent">${si + 1}. ${escHtml(String(parts))}</div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function buildExamFooter(s, showKey) {
  return `
    <div class="exam-footer-row">
      <span>${showKey ? '🔑 نموذج الإجابة' : 'المعلم: ' + escHtml(s.teacherName || '________________')}</span>
      <strong class="exam-end-label">١ من ١ - انتهت الأسئلة</strong>
      <span>${escHtml(s.date)}</span>
    </div>
  `;
}

// ===== التصدير =====

function getExamPrintCSS() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Traditional Arabic', 'Arial', sans-serif; direction: rtl; font-size: 11pt; color: #000; background: #fff; }
    @page { size: A4; margin: 12mm 15mm 12mm 15mm; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1pt solid #444; padding: 4pt 6pt; vertical-align: middle; }
    /* Header */
    .exam-header-table td { font-size: 9pt; }
    .header-school-cell { text-align: center; width: 28%; line-height: 2; font-size: 9pt; font-weight: 600; }
    .header-logo-cell { text-align: center; width: 30%; font-size: 9pt; font-weight: 700; }
    .header-info-cell { text-align: right; width: 42%; font-size: 9pt; padding: 3pt 8pt; }
    .ministry-logo-img { max-height: 55pt; max-width: 90pt; object-fit: contain; }
    .ministry-logo-placeholder { font-size: 8pt; color: #1565C0; border: 1pt dashed #1565C0; padding: 4pt; margin: 2pt auto; width: 80%; line-height: 1.6; text-align: center; }
    .exam-student-row-table td { padding: 7pt 10pt; font-size: 10pt; }
    .student-label { width: 18%; font-weight: 700; }
    .student-value { width: 42%; }
    .student-score { width: 10%; text-align: center; font-weight: 900; font-size: 14pt; color: #1565C0; }
    .answer-key-banner { background: #E8F5E9; border: 1pt solid #2E7D32; color: #2E7D32; font-weight: 700; font-size: 11pt; text-align: center; padding: 4pt; margin-top: 6pt; }
    /* Sections */
    .exam-section { margin-top: 12pt; }
    .exam-section-header-row { display: flex; justify-content: space-between; align-items: stretch; border: 1pt solid #333; }
    .exam-section-title { flex: 1; font-weight: 700; font-size: 10pt; padding: 5pt 8pt; border-left: 1pt solid #333; }
    .exam-section-marks-badge { background: #F5F5F5; font-weight: 700; font-size: 9pt; padding: 5pt 10pt; text-align: center; white-space: nowrap; }
    .exam-section-body { border: 1pt solid #333; border-top: none; padding: 6pt; }
    /* MCQ */
    .mcq-question-block { margin-bottom: 7pt; border: 1pt solid #ccc; }
    .mcq-q-text { padding: 5pt 8pt; font-size: 10pt; font-weight: 600; border-bottom: 1pt solid #ccc; }
    .mcq-num { font-weight: 900; }
    .mcq-options-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; }
    .mcq-opt-cell { padding: 4pt 8pt; font-size: 10pt; text-align: right; border-right: 1pt solid #ccc; }
    .mcq-opt-cell:first-child { border-right: none; }
    .correct-opt { background: #E8F5E9; font-weight: 700; }
    .opt-letter { font-weight: 700; color: #1565C0; }
    /* TF */
    .tf-exam-table th { background: #F5F5F5; font-weight: 700; font-size: 10pt; padding: 5pt 8pt; }
    .tf-exam-table td { font-size: 10pt; padding: 6pt 8pt; }
    .tf-answer-col { width: 20%; text-align: center; }
    .tf-num-col { width: 8%; text-align: center; }
    .tf-answer-cell { text-align: center; font-size: 11pt; }
    .tf-num-cell { text-align: center; font-weight: 700; }
    /* Match */
    .match-exam-table th { background: #F3E5F5; font-weight: 700; font-size: 10pt; padding: 5pt 8pt; }
    .match-exam-table td { font-size: 10pt; padding: 5pt 8pt; }
    .match-col-header, .match-answer-col-header { width: 35%; text-align: center; }
    .match-answer-td { text-align: center; color: #666; }
    /* Fill */
    .fill-block { padding: 4pt 6pt; }
    .fill-word-bank { background: #FFFDE7; border: 1pt solid #F9A825; padding: 5pt 8pt; margin-bottom: 6pt; font-size: 10pt; }
    .fill-sent { font-size: 10pt; padding: 3pt 0; line-height: 2; }
    .fill-blank { display: inline-block; min-width: 55pt; border-bottom: 1.5pt solid #000; margin: 0 3pt; vertical-align: bottom; }
    .fill-answer-shown { background: #E8F5E9; padding: 0 4pt; }
    /* Footer */
    .exam-footer-row { margin-top: 18pt; padding-top: 8pt; border-top: 2pt solid #333; display: flex; justify-content: space-between; font-size: 10pt; }
    .exam-end-label { font-weight: 700; font-size: 11pt; }
  `;
}

// PDF - فتح نافذة طباعة جديدة (أكثر موثوقية)
function exportPDF(showKey = false) {
  if (EB.selectedQuestions.length === 0) {
    showToast('أضف أسئلة للاختبار أولاً', 'error');
    return;
  }

  renderExamPaper(showKey);
  const paper = document.getElementById('exam-paper');
  if (!paper) { showToast('خطأ في توليد الاختبار', 'error'); return; }

  const win = window.open('', '_blank');
  if (!win) {
    showToast('يرجى السماح بالنوافذ المنبثقة ثم أعد المحاولة', 'error');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>اختبار ${escHtml(EB.settings.subject)}</title>
<style>${getExamPrintCSS()}</style>
</head>
<body>${paper.outerHTML}</body>
</html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); win.close(); }, 600);
  showToast(`تم فتح نافذة الطباعة ${showKey ? '(نموذج الإجابة)' : ''}`, 'success');
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

  const wordHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><meta name='ProgId' content='Word.Document'><title>اختبار ${EB.settings.subject}</title>
<style>${getExamPrintCSS().replace(/@page[^}]+}/g, '')}
body { margin: 20mm; }
</style></head>
<body>${paper.outerHTML}</body></html>`;

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
