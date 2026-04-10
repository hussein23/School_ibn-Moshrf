// ===================================================
//  لوحة التحكم - Dashboard Logic
//  المرحلة الأولى: localStorage + تصدير/استيراد
// ===================================================

const STORAGE_KEY = 'ibn_moshrf_curriculum';
let curriculum = {};         // البيانات الحالية (معدّلة أو أصلية)
let activeLesson = null;     // { gradeId, semId, unitId, lessonId }
let qbState = {};            // حالة منشئ الأسئلة

// ===================================================
//  تهيئة
// ===================================================
function init() {
  loadCurriculum();
  renderSidebar();
  renderStats();
}

function loadCurriculum() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      curriculum = JSON.parse(saved);
      setSaveStatus('✅ بيانات معدّلة محلياً');
    } catch {
      curriculum = deepClone(CURRICULUM);
    }
  } else {
    curriculum = deepClone(CURRICULUM);
    setSaveStatus('✅ البيانات الأصلية');
  }
}

function saveCurriculum() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(curriculum));
  setSaveStatus('✅ تم الحفظ');
  showToast('✅ تم الحفظ بنجاح');
}

function resetToDefault() {
  showConfirm('سيتم مسح جميع التعديلات والعودة للبيانات الأصلية. هل أنت متأكد؟', () => {
    localStorage.removeItem(STORAGE_KEY);
    curriculum = deepClone(CURRICULUM);
    saveCurriculum();
    activeLesson = null;
    renderSidebar();
    renderStats();
    showOverview();
    showToast('↺ تمت الاستعادة للبيانات الأصلية');
  });
}

function setSaveStatus(msg) {
  document.getElementById('save-status').textContent = msg;
}

// ===================================================
//  الشريط الجانبي
// ===================================================
function renderSidebar() {
  const tree = document.getElementById('sidebar-tree');
  tree.innerHTML = Object.values(curriculum).map(grade => renderGradeNode(grade)).join('');
}

function renderGradeNode(grade) {
  const gradeNum = grade.id.replace('grade', '');
  const colorVar = `var(--grade${gradeNum})`;
  return `
    <div class="tree-grade" id="tree-${grade.id}">
      <div class="tree-grade-label" onclick="toggleNode('tree-${grade.id}')">
        <span class="grade-dot" style="background:${grade.color}"></span>
        <span>${grade.icon} ${grade.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-grade-children">
        ${grade.semesters.map(sem => renderSemNode(grade, sem)).join('')}
      </div>
    </div>`;
}

function renderSemNode(grade, sem) {
  // نضيف grade.id كبادئة لأن sem.id (s1, s2) مكرر في كل الصفوف
  const nodeId = `tree-${grade.id}-${sem.id}`;
  return `
    <div class="tree-sem" id="${nodeId}">
      <div class="tree-sem-label" onclick="toggleNode('${nodeId}')">
        <span>📅</span>
        <span>${sem.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-sem-children">
        ${sem.units.map(unit => renderUnitNode(grade, sem, unit)).join('')}
      </div>
    </div>`;
}

function renderUnitNode(grade, sem, unit) {
  // unit.id فريد بالفعل (g4s1u1 إلخ) لكن نوحّد النمط للأمان
  const nodeId = `tree-${unit.id}`;
  return `
    <div class="tree-unit" id="${nodeId}">
      <div class="tree-unit-label" onclick="toggleNode('${nodeId}')">
        <span>${unit.icon}</span>
        <span>${unit.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-unit-children">
        ${unit.lessons.map(lesson => renderLessonNode(grade, sem, unit, lesson)).join('')}
      </div>
    </div>`;
}

function renderLessonNode(grade, sem, unit, lesson) {
  const isActive = activeLesson && activeLesson.lessonId === lesson.id;
  return `
    <div class="tree-lesson-item ${isActive ? 'active' : ''}"
         id="tree-lesson-${lesson.id}"
         onclick="selectLesson('${grade.id}','${sem.id}','${unit.id}','${lesson.id}')">
      📄 ${lesson.name}
    </div>`;
}

function toggleNode(nodeId) {
  const node = document.getElementById(nodeId);
  if (node) node.classList.toggle('open');
}

function filterSidebar(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('.tree-lesson-item').forEach(item => {
    const visible = !q || item.textContent.toLowerCase().includes(q);
    item.style.display = visible ? '' : 'none';
  });
  if (q) {
    document.querySelectorAll('.tree-grade, .tree-sem, .tree-unit').forEach(n => n.classList.add('open'));
  }
}

// ===================================================
//  الإحصائيات
// ===================================================
function renderStats() {
  const grid = document.getElementById('stats-grid');
  let totalLessons = 0, totalQuestions = 0;
  const gradeColors = ['var(--grade4)', 'var(--grade5)', 'var(--grade6)'];

  const cards = Object.values(curriculum).map((grade, i) => {
    const lessons = grade.semesters.reduce((a, s) =>
      a + s.units.reduce((b, u) => b + u.lessons.length, 0), 0);
    const questions = grade.semesters.reduce((a, s) =>
      a + s.units.reduce((b, u) =>
        b + u.lessons.reduce((c, l) => c + l.questions.length, 0), 0), 0);
    totalLessons += lessons;
    totalQuestions += questions;
    return `
      <div class="stat-card" style="border-color:${grade.color}">
        <div class="stat-card-num" style="color:${grade.color}">${lessons}</div>
        <div class="stat-card-label">${grade.icon} ${grade.name} — ${questions} سؤال</div>
      </div>`;
  });

  cards.unshift(`
    <div class="stat-card" style="border-color:#22C55E">
      <div class="stat-card-num" style="color:#22C55E">${totalLessons}</div>
      <div class="stat-card-label">📚 إجمالي الدروس</div>
    </div>
    <div class="stat-card" style="border-color:#3B82F6">
      <div class="stat-card-num" style="color:#3B82F6">${totalQuestions}</div>
      <div class="stat-card-label">❓ إجمالي الأسئلة</div>
    </div>`);

  grid.innerHTML = cards.join('');
}

function showOverview() {
  document.getElementById('overview-panel').classList.remove('hidden');
  document.getElementById('lesson-editor').classList.add('hidden');
}

// ===================================================
//  محرر النصوص الغني (Rich Text Editor)
// ===================================================
let _reActive = null; // العنصر contenteditable النشط حالياً

function setActiveRE(el) { _reActive = el; }

function execRich(cmd, val) {
  if (_reActive) _reActive.focus();
  document.execCommand(cmd, false, val || null);
  if (_reActive) _reActive.focus();
}

function execRichColor(inputEl, cmd) {
  // حفظ التحديد قبل فتح color picker
  if (_reActive) _reActive.focus();
  inputEl.addEventListener('change', function onchange() {
    if (_reActive) _reActive.focus();
    document.execCommand(cmd, false, this.value);
    inputEl.removeEventListener('change', onchange);
  }, { once: true });
}

/* الشريط المشترك — يُعرض داخل كل بطاقة */
function richToolbar(scope) {
  return `
  <div class="re-toolbar" onmousedown="event.preventDefault()">
    <div class="rtb-group">
      <button class="rtb-btn" title="عريض (Ctrl+B)"
              onclick="execRich('bold')"><b>B</b></button>
      <button class="rtb-btn" title="مائل (Ctrl+I)"
              onclick="execRich('italic')"><i>I</i></button>
      <button class="rtb-btn" title="خط تحتي (Ctrl+U)"
              onclick="execRich('underline')"><u>U</u></button>
      <button class="rtb-btn" title="يتوسطه خط"
              onclick="execRich('strikeThrough')"><s>S</s></button>
    </div>
    <div class="rtb-group">
      <label class="rtb-color-btn" title="لون النص" onmousedown="event.stopPropagation()">
        <span class="rtb-color-label rtb-text-color">A</span>
        <input type="color" value="#e53935"
               onchange="if(_reActive)_reActive.focus();document.execCommand('foreColor',false,this.value)">
      </label>
      <label class="rtb-color-btn" title="تظليل" onmousedown="event.stopPropagation()">
        <span class="rtb-color-label rtb-hl-color">🖍</span>
        <input type="color" value="#fff176"
               onchange="if(_reActive)_reActive.focus();document.execCommand('hiliteColor',false,this.value)">
      </label>
    </div>
    <div class="rtb-group">
      <select class="rtb-select" title="حجم الخط"
              onmousedown="event.stopPropagation()"
              onchange="if(_reActive)_reActive.focus();document.execCommand('fontSize',false,this.value)">
        <option value="1">XS</option>
        <option value="2">S</option>
        <option value="3" selected>M</option>
        <option value="4">L</option>
        <option value="5">XL</option>
        <option value="6">XXL</option>
      </select>
    </div>
    <div class="rtb-group">
      <button class="rtb-btn" title="محاذاة يمين"
              onclick="execRich('justifyRight')">⇤</button>
      <button class="rtb-btn" title="توسيط"
              onclick="execRich('justifyCenter')">≡</button>
      <button class="rtb-btn" title="محاذاة يسار"
              onclick="execRich('justifyLeft')">⇥</button>
    </div>
    <div class="rtb-group">
      <button class="rtb-btn" title="قائمة نقطية"
              onclick="execRich('insertUnorderedList')">• ≡</button>
      <button class="rtb-btn" title="قائمة مرقمة"
              onclick="execRich('insertOrderedList')">1 ≡</button>
    </div>
    <div class="rtb-group">
      <button class="rtb-btn rtb-btn-danger" title="مسح التنسيق"
              onclick="execRich('removeFormat')">✕</button>
    </div>
  </div>`;
}

function renderRichEditor(html, id, minHeight, placeholder) {
  return `
    <div class="re-wrap">
      ${richToolbar(id)}
      <div class="re-content" id="${id}" contenteditable="true"
           style="min-height:${minHeight || 80}px"
           placeholder="${placeholder || 'اكتب هنا...'}"
           onfocus="setActiveRE(this)"
           onmousedown="setActiveRE(this)">${html || ''}</div>
    </div>`;
}

// ===================================================
//  محرر الدرس
// ===================================================
function selectLesson(gradeId, semId, unitId, lessonId) {
  activeLesson = { gradeId, semId, unitId, lessonId };

  // تحديث active في الشريط الجانبي
  document.querySelectorAll('.tree-lesson-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`tree-lesson-${lessonId}`);
  if (el) {
    el.classList.add('active');
    // تأكد أن الوالدين مفتوحون
    let parent = el.parentElement;
    while (parent) {
      if (parent.classList.contains('tree-unit') ||
          parent.classList.contains('tree-sem') ||
          parent.classList.contains('tree-grade')) {
        parent.classList.add('open');
      }
      parent = parent.parentElement;
    }
  }

  renderLessonEditor();
}

function getLesson(al) {
  const grade = curriculum[al.gradeId];
  const sem   = grade.semesters.find(s => s.id === al.semId);
  const unit  = sem.units.find(u => u.id === al.unitId);
  const lesson = unit.lessons.find(l => l.id === al.lessonId);
  return { grade, sem, unit, lesson };
}

function renderLessonEditor() {
  const { grade, sem, unit, lesson } = getLesson(activeLesson);
  const editor = document.getElementById('lesson-editor');

  document.getElementById('overview-panel').classList.add('hidden');
  editor.classList.remove('hidden');

  editor.innerHTML = `
    <!-- شريط المسار -->
    <div class="editor-breadcrumb">
      <span onclick="showOverview()">🏠 الرئيسية</span>
      <span class="sep">›</span>
      <span>${grade.icon} ${grade.name}</span>
      <span class="sep">›</span>
      <span>${sem.name}</span>
      <span class="sep">›</span>
      <span style="color:${unit.color}">${unit.icon} ${unit.name}</span>
      <span class="sep">›</span>
      <span style="font-weight:700">${lesson.name}</span>
    </div>

    <!-- اسم الدرس -->
    <div class="editor-card">
      <div class="editor-card-title">✏️ معلومات الدرس</div>
      <div class="field-group">
        <label class="field-label">اسم الدرس</label>
        <input class="field-input" id="f-name" value="${escHtml(lesson.name)}">
      </div>
      <div class="field-group">
        <label class="field-label">ملخص الدرس</label>
        ${renderRichEditor(lesson.summary, 'f-summary', 120, 'اكتب ملخص الدرس هنا — يمكنك التنسيق بالخطوط والألوان...')}
      </div>
    </div>

    <!-- الأهداف -->
    <div class="editor-card">
      <div class="editor-card-title">🎯 أهداف الدرس</div>
      <div class="list-editor" id="objectives-list">
        ${lesson.objectives.map((obj, i) => `
          <div class="list-item-row">
            <textarea oninput="updateObjective(${i}, this.value)">${escHtml(obj)}</textarea>
            <button class="list-item-del" onclick="deleteObjective(${i})">✕</button>
          </div>`).join('')}
      </div>
      <button class="add-item-btn" onclick="addObjective()" style="margin-top:8px">+ إضافة هدف</button>
    </div>

    <!-- النقاط الرئيسية -->
    <div class="editor-card">
      <div class="editor-card-title">
        ⚡ النقاط الرئيسية
        <div class="kp-layout-toggle">
          <button class="kp-lt-btn ${(!lesson.kpLayout || lesson.kpLayout==='list') ? 'kp-lt-active':''}"
                  title="قائمة عمودية" onclick="setKpLayout('list')">☰ قائمة</button>
          <button class="kp-lt-btn ${lesson.kpLayout==='grid' ? 'kp-lt-active':''}"
                  title="شبكة تلقائية — قصير جنباً طويل بعرض كامل" onclick="setKpLayout('grid')">⊞ شبكة</button>
          <button class="kp-lt-btn ${lesson.kpLayout==='cards' ? 'kp-lt-active':''}"
                  title="بطاقات ملونة" onclick="setKpLayout('cards')">🃏 بطاقات</button>
        </div>
      </div>
      <div class="kp-list" id="keypoints-list">
        ${lesson.keyPoints.map((kp, i) => renderKPItem(kp, i, lesson.keyPoints.length)).join('')}
      </div>
      <button class="add-item-btn" onclick="addKeyPoint()" style="margin-top:12px">+ إضافة نقطة</button>
    </div>

    <!-- الأسئلة -->
    <div class="editor-card">
      <div class="questions-header">
        <span class="questions-title">🎮 الأسئلة (${lesson.questions.length})</span>
        <button class="add-question-btn" onclick="openQuestionBuilder()">➕ إضافة سؤال</button>
      </div>
      <div class="questions-list" id="questions-list">
        ${renderQuestionsList(lesson.questions)}
      </div>
    </div>

    <!-- شريط الحفظ -->
    <div class="editor-save-bar">
      <button class="delete-lesson-btn" onclick="deleteLesson()">🗑 حذف الدرس</button>
      <button class="save-lesson-btn" onclick="saveLessonChanges()">💾 حفظ التعديلات</button>
    </div>
  `;
}

function renderQuestionsList(questions) {
  if (!questions.length) return `<div class="empty-questions">لا توجد أسئلة بعد — أضف سؤالاً الآن</div>`;
  const typeLabel = { mcq: 'MCQ', tf: 'صح/خطأ', match: 'وصل', fill: 'أملأ الفراغ' };
  const typeBadge = { mcq: 'badge-mcq', tf: 'badge-tf', match: 'badge-match', fill: 'badge-fill' };
  return questions.map((q, i) => `
    <div class="q-item">
      <span class="q-type-badge ${typeBadge[q.type] || ''}">${typeLabel[q.type] || q.type}</span>
      <span class="q-text">${escHtml(q.question)}</span>
      <div class="q-actions">
        <button class="q-btn q-btn-edit" onclick="editQuestion(${i})" title="تعديل">✏️</button>
        <button class="q-btn q-btn-del" onclick="deleteQuestion(${i})" title="حذف">🗑</button>
      </div>
    </div>`).join('');
}

// ===== بطاقة نقطة رئيسية (مع محرر غني) =====
function renderKPItem(html, i, total) {
  return `
    <div class="kp-item-card" id="kp-card-${i}">
      <div class="kp-item-header">
        <span class="kp-num">نقطة ${i + 1}</span>
        <div class="kp-item-actions">
          <button class="kp-move-btn" title="تحريك لأعلى"
                  onclick="moveKeyPoint(${i}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="kp-move-btn" title="تحريك لأسفل"
                  onclick="moveKeyPoint(${i}, 1)" ${i === total - 1 ? 'disabled' : ''}>↓</button>
          <button class="kp-del-btn" title="حذف" onclick="deleteKeyPoint(${i})">✕</button>
        </div>
      </div>
      ${renderRichEditor(html, 'kp-re-' + i, 60, 'اكتب النقطة هنا...')}
    </div>`;
}

// ===== تعديل حقول الدرس =====
function updateObjective(i, val) {
  const { lesson } = getLesson(activeLesson);
  lesson.objectives[i] = val;
}
function deleteObjective(i) {
  const { lesson } = getLesson(activeLesson);
  lesson.objectives.splice(i, 1);
  renderLessonEditor();
}
function addObjective() {
  const { lesson } = getLesson(activeLesson);
  lesson.objectives.push('');
  renderLessonEditor();
  const inputs = document.querySelectorAll('#objectives-list textarea');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function deleteKeyPoint(i) {
  // حفظ HTML الحالي لكل النقاط قبل الحذف
  _syncKPFromDOM();
  const { lesson } = getLesson(activeLesson);
  lesson.keyPoints.splice(i, 1);
  renderLessonEditor();
}

function addKeyPoint() {
  // حفظ HTML الحالي أولاً
  _syncKPFromDOM();
  const { lesson } = getLesson(activeLesson);
  lesson.keyPoints.push('');
  renderLessonEditor();
  // تركيز على آخر محرر
  const editors = document.querySelectorAll('#keypoints-list .re-content');
  if (editors.length) {
    const last = editors[editors.length - 1];
    last.focus();
    setActiveRE(last);
  }
}

function moveKeyPoint(i, dir) {
  _syncKPFromDOM();
  const { lesson } = getLesson(activeLesson);
  const j = i + dir;
  if (j < 0 || j >= lesson.keyPoints.length) return;
  [lesson.keyPoints[i], lesson.keyPoints[j]] = [lesson.keyPoints[j], lesson.keyPoints[i]];
  renderLessonEditor();
  // إعادة التركيز على النقطة المنقولة
  const targetEditor = document.getElementById(`kp-re-${j}`);
  if (targetEditor) { targetEditor.focus(); setActiveRE(targetEditor); }
}

function setKpLayout(layout) {
  // مزامنة المحتوى الحالي أولاً حتى لا يضيع
  _syncKPFromDOM();
  const { lesson } = getLesson(activeLesson);
  lesson.kpLayout = layout;
  renderLessonEditor();
}

/* مزامنة محتوى النقاط من DOM إلى lesson object */
function _syncKPFromDOM() {
  if (!activeLesson) return;
  const { lesson } = getLesson(activeLesson);
  const editors = document.querySelectorAll('#keypoints-list .re-content');
  if (editors.length) {
    lesson.keyPoints = [...editors].map(e => e.innerHTML.trim()).filter(v => v && v !== '<br>');
  }
}

function saveLessonChanges() {
  const { lesson } = getLesson(activeLesson);

  // اسم الدرس
  lesson.name = document.getElementById('f-name').value.trim();

  // الملخص من المحرر الغني
  const summaryEl = document.getElementById('f-summary');
  if (summaryEl) lesson.summary = summaryEl.innerHTML.trim();

  // قراءة الأهداف من DOM مباشرة
  const objTextareas = document.querySelectorAll('#objectives-list textarea');
  lesson.objectives = [...objTextareas].map(t => t.value.trim()).filter(v => v);

  // قراءة النقاط الرئيسية من المحررات الغنية
  const kpEditors = document.querySelectorAll('#keypoints-list .re-content');
  lesson.keyPoints = [...kpEditors].map(e => e.innerHTML.trim()).filter(v => v && v !== '<br>');

  saveCurriculum();
  renderSidebar();
  renderStats();
  showToast('✅ تم حفظ التعديلات');
}

function deleteLesson() {
  const { lesson, unit } = getLesson(activeLesson);
  showConfirm(`هل تريد حذف درس "${lesson.name}" نهائياً؟`, () => {
    const idx = unit.lessons.findIndex(l => l.id === activeLesson.lessonId);
    unit.lessons.splice(idx, 1);
    saveCurriculum();
    activeLesson = null;
    renderSidebar();
    renderStats();
    showOverview();
  });
}

// ===================================================
//  إضافة درس جديد
// ===================================================
function openAddLesson() {
  // نختار أول وحدة كافتراضي
  const grade = Object.values(curriculum)[0];
  const sem   = grade.semesters[0];
  const unit  = sem.units[0];
  addLessonToUnit(grade.id, sem.id, unit.id);
}

function addLessonToUnit(gradeId, semId, unitId) {
  const grade = curriculum[gradeId];
  const sem   = grade.semesters.find(s => s.id === semId);
  const unit  = sem.units.find(u => u.id === unitId);
  const newId = `${unitId}l${unit.lessons.length + 1}_${Date.now()}`;
  const newLesson = {
    id: newId,
    name: 'درس جديد',
    objectives: [''],
    summary: '',
    keyPoints: [''],
    questions: []
  };
  unit.lessons.push(newLesson);
  saveCurriculum();
  renderSidebar();
  renderStats();
  selectLesson(gradeId, semId, unitId, newId);
}

// ===================================================
//  منشئ الأسئلة
// ===================================================
function openQuestionBuilder(editIdx = null) {
  qbState = { editIdx };
  document.getElementById('qb-overlay').classList.remove('hidden');
  document.getElementById('question-builder').classList.remove('hidden');
  document.getElementById('qb-title').textContent = editIdx !== null ? '✏️ تعديل سؤال' : '➕ إضافة سؤال';

  if (editIdx !== null) {
    const { lesson } = getLesson(activeLesson);
    const q = lesson.questions[editIdx];
    document.getElementById('qb-type-select').classList.add('hidden');
    document.getElementById('qb-form').classList.remove('hidden');
    renderQuestionForm(q.type, q);
  } else {
    document.getElementById('qb-type-select').classList.remove('hidden');
    document.getElementById('qb-form').classList.add('hidden');
  }
}

function closeQuestionBuilder() {
  document.getElementById('qb-overlay').classList.add('hidden');
  document.getElementById('question-builder').classList.add('hidden');
  qbState = {};
}

function backToTypes() {
  document.getElementById('qb-type-select').classList.remove('hidden');
  document.getElementById('qb-form').classList.add('hidden');
}

function selectQuestionType(type) {
  qbState.type = type;
  document.getElementById('qb-type-select').classList.add('hidden');
  document.getElementById('qb-form').classList.remove('hidden');
  renderQuestionForm(type);
}

function renderQuestionForm(type, existing = null) {
  const content = document.getElementById('qb-form-content');
  qbState.type = type;

  if (type === 'mcq') {
    const opts = existing ? existing.options : ['', '', '', ''];
    const ans  = existing ? existing.answer : 0;
    content.innerHTML = `
      <div class="qb-field">
        <label class="qb-label">نص السؤال</label>
        <textarea class="qb-textarea" id="q-question" oninput="updatePreview()">${escHtml(existing?.question || '')}</textarea>
      </div>
      <div class="qb-field">
        <label class="qb-label">الخيارات (اختر الإجابة الصحيحة بالنقر على الدائرة)</label>
        <div class="options-list" id="options-list">
          ${opts.map((opt, i) => `
            <div class="option-row ${i === ans ? 'selected' : ''}" id="opt-row-${i}">
              <input type="radio" class="option-radio" name="correct-opt" value="${i}"
                     ${i === ans ? 'checked' : ''}
                     onchange="selectOption(${i})">
              <input class="option-input" placeholder="الخيار ${i+1}" value="${escHtml(opt)}"
                     oninput="updatePreview()">
            </div>`).join('')}
        </div>
      </div>`;

  } else if (type === 'tf') {
    const ans = existing ? existing.answer : null;
    content.innerHTML = `
      <div class="qb-field">
        <label class="qb-label">نص الجملة</label>
        <textarea class="qb-textarea" id="q-question" oninput="updatePreview()">${escHtml(existing?.question || '')}</textarea>
      </div>
      <div class="qb-field">
        <label class="qb-label">الإجابة الصحيحة</label>
        <div class="tf-options">
          <button class="tf-opt ${ans === true ? 'active-true' : ''}" id="tf-true"
                  onclick="selectTF(true)">✅ صح</button>
          <button class="tf-opt ${ans === false ? 'active-false' : ''}" id="tf-false"
                  onclick="selectTF(false)">❌ خطأ</button>
        </div>
      </div>`;
    qbState.tfAnswer = ans;

  } else if (type === 'match') {
    const pairs = existing ? existing.pairs : [['', ''], ['', ''], ['', '']];
    content.innerHTML = `
      <div class="qb-field">
        <label class="qb-label">عنوان سؤال الوصل</label>
        <input class="qb-input" id="q-question" placeholder="مثال: صل كل مصطلح بتعريفه"
               value="${escHtml(existing?.question || '')}" oninput="updatePreview()">
      </div>
      <div class="qb-field">
        <label class="qb-label">الأزواج</label>
        <div class="match-grid">
          <div>
            <div class="match-col-label">العمود الأول</div>
            <div class="match-pairs" id="match-col-a">
              ${pairs.map((p, i) => `
                <div class="match-pair-row">
                  <input class="match-input" id="ma-${i}" value="${escHtml(p[0])}" placeholder="العنصر ${i+1}" oninput="updatePreview()">
                  <button class="match-del" onclick="deleteMatchPair(${i})">✕</button>
                </div>`).join('')}
            </div>
          </div>
          <div>
            <div class="match-col-label">العمود الثاني</div>
            <div class="match-pairs" id="match-col-b">
              ${pairs.map((p, i) => `
                <div class="match-pair-row">
                  <input class="match-input" id="mb-${i}" value="${escHtml(p[1])}" placeholder="المقابل ${i+1}" oninput="updatePreview()">
                </div>`).join('')}
            </div>
          </div>
        </div>
        <button class="add-match-btn" onclick="addMatchPair()" style="margin-top:10px">+ إضافة زوج</button>
      </div>`;
    qbState.pairCount = pairs.length;

  } else if (type === 'fill') {
    const sentences = existing ? existing.sentences : [['', '', ''], ['', '', ''], ['', '', '']];
    qbState.fillCount = sentences.length;
    const rows = sentences.map((s, i) => `
      <div class="match-pair-row fill-sentence-row" id="fillrow-${i}">
        <span class="pair-num">${i+1}</span>
        <input class="match-input" id="fs-before-${i}" placeholder="النص قبل الفراغ" value="${escHtml(s[0] || '')}" oninput="updatePreview()">
        <input class="match-input fill-ans-input" id="fs-answer-${i}" placeholder="الإجابة ★" value="${escHtml(s[1] || '')}" oninput="updatePreview()" title="الإجابة الصحيحة">
        <input class="match-input" id="fs-after-${i}" placeholder="النص بعد الفراغ (اختياري)" value="${escHtml(s[2] || '')}" oninput="updatePreview()">
        <button class="match-del" onclick="deleteFillSentence(${i})">✕</button>
      </div>`).join('');
    content.innerHTML = `
      <div class="qb-field">
        <label class="qb-label">تعليمات السؤال</label>
        <input class="qb-input" id="q-question" placeholder="مثال: أملأ الفراغات بالكلمة المناسبة:"
               value="${escHtml(existing?.question || 'أملأ الفراغات بالكلمة المناسبة:')}" oninput="updatePreview()">
      </div>
      <div class="qb-field">
        <label class="qb-label">الجمل — (نص قبل | الإجابة ★ | نص بعد)</label>
        <div id="fill-sentences-list">${rows}</div>
        <button class="add-match-btn" onclick="addFillSentence()" style="margin-top:10px">+ إضافة جملة</button>
      </div>`;
  }

  updatePreview();
}

function selectOption(idx) {
  document.querySelectorAll('.option-row').forEach((row, i) => {
    row.classList.toggle('selected', i === idx);
  });
  updatePreview();
}

function selectTF(val) {
  qbState.tfAnswer = val;
  document.getElementById('tf-true').className  = `tf-opt ${val === true  ? 'active-true'  : ''}`;
  document.getElementById('tf-false').className = `tf-opt ${val === false ? 'active-false' : ''}`;
  updatePreview();
}

function addMatchPair() {
  qbState.pairCount = (qbState.pairCount || 0) + 1;
  const i = qbState.pairCount - 1;
  document.getElementById('match-col-a').insertAdjacentHTML('beforeend', `
    <div class="match-pair-row">
      <input class="match-input" id="ma-${i}" placeholder="العنصر ${i+1}" oninput="updatePreview()">
      <button class="match-del" onclick="deleteMatchPair(${i})">✕</button>
    </div>`);
  document.getElementById('match-col-b').insertAdjacentHTML('beforeend', `
    <div class="match-pair-row">
      <input class="match-input" id="mb-${i}" placeholder="المقابل ${i+1}" oninput="updatePreview()">
    </div>`);
  updatePreview();
}

function deleteMatchPair(i) {
  const rowA = document.querySelector(`#ma-${i}`)?.closest('.match-pair-row');
  const rowB = document.querySelector(`#mb-${i}`)?.closest('.match-pair-row');
  if (rowA) rowA.remove();
  if (rowB) rowB.remove();
  updatePreview();
}

function addFillSentence() {
  qbState.fillCount = (qbState.fillCount || 0) + 1;
  const i = qbState.fillCount - 1;
  document.getElementById('fill-sentences-list').insertAdjacentHTML('beforeend', `
    <div class="match-pair-row fill-sentence-row" id="fillrow-${i}">
      <span class="pair-num">${i+1}</span>
      <input class="match-input" id="fs-before-${i}" placeholder="النص قبل الفراغ" oninput="updatePreview()">
      <input class="match-input fill-ans-input" id="fs-answer-${i}" placeholder="الإجابة ★" oninput="updatePreview()" title="الإجابة الصحيحة">
      <input class="match-input" id="fs-after-${i}" placeholder="النص بعد الفراغ (اختياري)" oninput="updatePreview()">
      <button class="match-del" onclick="deleteFillSentence(${i})">✕</button>
    </div>`);
  updatePreview();
}

function deleteFillSentence(i) {
  const row = document.getElementById(`fillrow-${i}`);
  if (row) row.remove();
  updatePreview();
}

function updatePreview() {
  const preview = document.getElementById('qb-preview');
  const type = qbState.type;
  const questionEl = document.getElementById('q-question');
  const question = questionEl ? questionEl.value : '';
  let html = `<div class="preview-label">معاينة</div>`;

  if (type === 'mcq') {
    const opts = document.querySelectorAll('.option-row input[type=text], .option-input');
    const checkedRadio = document.querySelector('input[name=correct-opt]:checked');
    const correctIdx = checkedRadio ? parseInt(checkedRadio.value) : 0;
    html += `<div class="preview-question">${escHtml(question) || 'نص السؤال...'}</div>`;
    html += `<div class="preview-options">`;
    opts.forEach((opt, i) => {
      html += `<div class="preview-opt ${i === correctIdx ? 'correct' : ''}">${escHtml(opt.value) || `الخيار ${i+1}`}</div>`;
    });
    html += `</div>`;

  } else if (type === 'tf') {
    const ans = qbState.tfAnswer;
    html += `<div class="preview-question">${escHtml(question) || 'نص الجملة...'}</div>`;
    html += `<div style="font-size:14px;margin-top:8px">الإجابة: <strong style="color:${ans === true ? 'var(--success)' : ans === false ? 'var(--danger)' : 'var(--text-light)'}">
      ${ans === true ? '✅ صح' : ans === false ? '❌ خطأ' : 'لم تُحدَّد بعد'}</strong></div>`;

  } else if (type === 'match') {
    html += `<div class="preview-question">${escHtml(question) || 'عنوان الوصل...'}</div>`;
    const count = qbState.pairCount || 0;
    html += `<div style="font-size:13px;color:var(--text-mid);margin-top:6px">`;
    for (let i = 0; i < count; i++) {
      const a = document.getElementById(`ma-${i}`)?.value || '';
      const b = document.getElementById(`mb-${i}`)?.value || '';
      if (a || b) html += `<div style="padding:4px 0">${escHtml(a)} ←→ ${escHtml(b)}</div>`;
    }
    html += `</div>`;

  } else if (type === 'fill') {
    html += `<div class="preview-question">${escHtml(question) || 'أملأ الفراغات...'}</div>`;
    const count = qbState.fillCount || 0;
    html += `<div style="font-size:13px;color:var(--text-mid);margin-top:6px;line-height:2">`;
    for (let i = 0; i < count; i++) {
      const before = document.getElementById(`fs-before-${i}`)?.value || '';
      const answer = document.getElementById(`fs-answer-${i}`)?.value || '';
      const after  = document.getElementById(`fs-after-${i}`)?.value  || '';
      if (before || answer) {
        html += `<div style="padding:4px 0">${escHtml(before)} <span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:6px;font-weight:700">${escHtml(answer) || '___'}</span> ${escHtml(after)}</div>`;
      }
    }
    html += `</div>`;
  }

  preview.innerHTML = html;
}

function saveQuestion() {
  const type = qbState.type;
  const questionEl = document.getElementById('q-question');
  const question = questionEl?.value?.trim();
  if (!question) { showToast('⚠️ أدخل نص السؤال'); return; }

  let q = { type, question };

  if (type === 'mcq') {
    const opts = [...document.querySelectorAll('.option-input')].map(el => el.value.trim());
    const checkedRadio = document.querySelector('input[name=correct-opt]:checked');
    const answer = checkedRadio ? parseInt(checkedRadio.value) : 0;
    if (opts.some(o => !o)) { showToast('⚠️ أكمل جميع الخيارات'); return; }
    q = { ...q, options: opts, answer };

  } else if (type === 'tf') {
    if (qbState.tfAnswer === null || qbState.tfAnswer === undefined) {
      showToast('⚠️ اختر صح أو خطأ'); return;
    }
    q = { ...q, answer: qbState.tfAnswer };

  } else if (type === 'match') {
    const pairs = [];
    const count = qbState.pairCount || 0;
    for (let i = 0; i < count; i++) {
      const a = document.getElementById(`ma-${i}`)?.value?.trim();
      const b = document.getElementById(`mb-${i}`)?.value?.trim();
      if (a && b) pairs.push([a, b]);
    }
    if (pairs.length < 2) { showToast('⚠️ أضف زوجين على الأقل'); return; }
    q = { ...q, pairs };

  } else if (type === 'fill') {
    const sentences = [];
    const count = qbState.fillCount || 0;
    for (let i = 0; i < count; i++) {
      const before = document.getElementById(`fs-before-${i}`)?.value?.trim() || '';
      const answer = document.getElementById(`fs-answer-${i}`)?.value?.trim() || '';
      const after  = document.getElementById(`fs-after-${i}`)?.value?.trim()  || '';
      if (answer) sentences.push([before, answer, after]);
    }
    if (!sentences.length) { showToast('⚠️ أضف جملة واحدة على الأقل مع إجابة'); return; }
    q = { ...q, sentences };
  }

  const { lesson } = getLesson(activeLesson);
  if (qbState.editIdx !== null && qbState.editIdx !== undefined) {
    lesson.questions[qbState.editIdx] = q;
    showToast('✅ تم تعديل السؤال');
  } else {
    lesson.questions.push(q);
    showToast('✅ تم إضافة السؤال');
  }

  closeQuestionBuilder();
  saveCurriculum();
  refreshQuestionsList();
}

function editQuestion(idx) {
  openQuestionBuilder(idx);
}

function deleteQuestion(idx) {
  showConfirm('هل تريد حذف هذا السؤال؟', () => {
    const { lesson } = getLesson(activeLesson);
    lesson.questions.splice(idx, 1);
    saveCurriculum();
    refreshQuestionsList();
    showToast('🗑 تم حذف السؤال');
  });
}

function refreshQuestionsList() {
  const { lesson } = getLesson(activeLesson);
  const container = document.getElementById('questions-list');
  if (container) {
    container.innerHTML = renderQuestionsList(lesson.questions);
    document.querySelector('.questions-title').textContent = `🎮 الأسئلة (${lesson.questions.length})`;
  }
}

// ===================================================
//  تصدير / استيراد
// ===================================================
function exportJSON() {
  const content = `// ===================================================\n//  بيانات المناهج الدراسية - تم التصدير من لوحة التحكم\n// ===================================================\n\nconst CURRICULUM = ${JSON.stringify(curriculum, null, 2)};\n`;
  const blob = new Blob([content], { type: 'application/javascript' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'data.js';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 تم تصدير data.js');
}

function importJSON() {
  document.getElementById('import-input').click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let text = e.target.result.trim();
      // دعم ملفات JS وJSON
      if (text.startsWith('{')) {
        curriculum = JSON.parse(text);
      } else {
        // استخراج الكائن من ملف JS
        const match = text.match(/const CURRICULUM\s*=\s*(\{[\s\S]*\});?\s*$/);
        if (!match) throw new Error('تنسيق غير صالح');
        curriculum = JSON.parse(match[1]);
      }
      saveCurriculum();
      renderSidebar();
      renderStats();
      showToast('📥 تم الاستيراد بنجاح');
    } catch (err) {
      showToast('❌ خطأ في الملف: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ===================================================
//  المساعدات
// ===================================================
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// تأكيد الحذف
let confirmCallback = null;
function showConfirm(msg, cb) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-overlay').classList.remove('hidden');
  confirmCallback = cb;
  document.getElementById('confirm-ok').onclick = () => {
    closeConfirm();
    cb();
  };
}
function closeConfirm() {
  document.getElementById('confirm-overlay').classList.add('hidden');
  confirmCallback = null;
}

// Toast
let toastTimer;
function showToast(msg) {
  let toast = document.getElementById('dash-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'dash-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===================================================
//  تشغيل
// ===================================================
document.addEventListener('DOMContentLoaded', init);
