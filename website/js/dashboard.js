// ===================================================
//  لوحة التحكم - Dashboard Logic
//  المرحلة الأولى: localStorage + تصدير/استيراد
// ===================================================

const STORAGE_KEY    = 'ibn_moshrf_curriculum';
const TEACHER_PIN_KEY = 'ibn_moshrf_teacher_pin';
const TEACHER_SESSION = 'ibn_moshrf_teacher_auth';
const PIN_SALT        = 'ibn_teacher_2025';

let curriculum = {};
let activeLesson = null;
let qbState = {};

// ===================================================
//  حماية لوحة التحكم — رمز PIN للمعلم
// ===================================================
async function _hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function _isTeacherAuthed() {
  return sessionStorage.getItem(TEACHER_SESSION) === '1';
}

function showPinModal() {
  const overlay = document.getElementById('pin-overlay');
  if (!overlay) return;
  const stored  = localStorage.getItem(TEACHER_PIN_KEY);
  const title   = document.getElementById('pin-modal-title');
  const hint    = document.getElementById('pin-modal-hint');
  if (!stored) {
    if (title) title.textContent = 'إنشاء رمز الدخول للمعلم';
    if (hint)  hint.textContent  = 'أنشئ رمزاً سرياً (4 أحرف على الأقل) لحماية لوحة التحكم';
  } else {
    if (title) title.textContent = 'لوحة تحكم المعلم 🔒';
    if (hint)  hint.textContent  = 'أدخل رمز الدخول للمتابعة';
  }
  overlay.classList.remove('hidden');
  setTimeout(() => document.getElementById('pin-input')?.focus(), 100);
}

async function submitPin() {
  const pinEl  = document.getElementById('pin-input');
  const errEl  = document.getElementById('pin-error');
  const btn    = document.getElementById('pin-submit-btn');
  const pin    = (pinEl?.value || '').trim();

  if (pin.length < 4) {
    if (errEl) { errEl.textContent = 'الرمز يجب أن يكون 4 أحرف على الأقل'; errEl.classList.remove('hidden'); }
    return;
  }

  if (btn) btn.disabled = true;
  const hashed = await _hashPin(pin);
  if (btn) btn.disabled = false;

  const stored = localStorage.getItem(TEACHER_PIN_KEY);

  if (!stored) {
    // أول مرة: حفظ الرمز الجديد
    localStorage.setItem(TEACHER_PIN_KEY, hashed);
    document.getElementById('pin-overlay').classList.add('hidden');
    sessionStorage.setItem(TEACHER_SESSION, '1');
    _initDashboard();
    return;
  }

  if (hashed !== stored) {
    if (errEl) { errEl.textContent = 'رمز الدخول غير صحيح'; errEl.classList.remove('hidden'); }
    if (pinEl) { pinEl.value = ''; pinEl.focus(); }
    return;
  }

  document.getElementById('pin-overlay').classList.add('hidden');
  sessionStorage.setItem(TEACHER_SESSION, '1');
  _initDashboard();
}

function resetTeacherPin() {
  const conf = confirm('هل تريد إعادة تعيين رمز الدخول؟ ستحتاج لإنشاء رمز جديد في المرة القادمة.');
  if (!conf) return;
  localStorage.removeItem(TEACHER_PIN_KEY);
  sessionStorage.removeItem(TEACHER_SESSION);
  location.reload();
}

// ===================================================
//  تهيئة
// ===================================================
function init() {
  if (!_isTeacherAuthed()) {
    showPinModal();
    return;
  }
  _initDashboard();
}

function _initDashboard() {
  loadCurriculum();
  renderSidebar();
  renderStats();

  // استمع لتحديثات Firebase (من أجهزة/متصفحات أخرى)
  const _prevHandler = window._onCurriculumUpdate;
  window._onCurriculumUpdate = function(data) {
    if (_prevHandler) _prevHandler(data);
    // تحديث نسخة الداشبورد من Firebase
    curriculum = deepClone(data);
    renderSidebar();
    renderStats();
    // إذا لم يكن المعلم يعدّل درساً الآن، اعرض الصفحة الرئيسية
    if (!activeLesson) showOverview();
    setSaveStatus('☁️ تم التزامن مع Firebase');
  };
}

function loadCurriculum() {
  // 1. حاول قراءة آخر نسخة من Firebase (وصلت قبل دخول المعلم)
  const firebaseData = window.FirebaseDB && window.FirebaseDB.dbLoadCurriculum
    ? window.FirebaseDB.dbLoadCurriculum()
    : null;

  if (firebaseData) {
    curriculum = deepClone(firebaseData);
    // حدّث localStorage بأحدث نسخة
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(curriculum)); } catch(e) {}
    setSaveStatus('☁️ تم التزامن مع Firebase');
    return;
  }

  // 2. احتياط: اقرأ من localStorage
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

  if (window.FirebaseDB && window.FirebaseDB.dbSaveCurriculum) {
    const isActive = window.FirebaseDB.isFirebaseActive && window.FirebaseDB.isFirebaseActive();
    if (isActive) {
      setSaveStatus('☁️ يتم الرفع…');
      window.FirebaseDB.dbSaveCurriculum(curriculum,
        function() {
          setSaveStatus('✅ محفوظ للجميع ☁️');
          showToast('✅ تم الحفظ — سيظهر لجميع الأجهزة');
        },
        function(err) {
          setSaveStatus('⚠️ فشل الرفع');
          showToast('⚠️ لم يُرفع إلى Firebase: ' + (err && err.message || err));
          console.error('curriculum save error:', err);
        }
      );
    } else {
      window.FirebaseDB.dbSaveCurriculum(curriculum);
      setSaveStatus('⚠️ محفوظ محلياً فقط (Firebase غير متصل)');
      showToast('⚠️ Firebase غير متصل — الحفظ محلي فقط');
    }
  } else {
    setSaveStatus('✅ تم الحفظ');
    showToast('✅ تم الحفظ بنجاح');
  }
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
  document.getElementById('student-panel').classList.add('hidden');
}

// ===================================================
//  إدارة الطلاب - Student Management
// ===================================================
function showStudentPanel() {
  document.getElementById('overview-panel').classList.add('hidden');
  document.getElementById('lesson-editor').classList.add('hidden');
  document.getElementById('student-panel').classList.remove('hidden');
  renderStudentPanel();
}

function renderStudentPanel() {
  const panel    = document.getElementById('student-panel');
  const students = window.StudentAuth ? StudentAuth.getAllStudents() : [];
  const gradeNames  = { grade4: 'الصف الرابع', grade5: 'الصف الخامس', grade6: 'الصف السادس' };
  const gradeColors = { grade4: '#FF6B35', grade5: '#2196F3', grade6: '#7C3AED' };
  const gradeIcons  = { grade4: '🟠', grade5: '🔵', grade6: '🟣' };

  const totalPts = students.reduce((s, st) => s + (st.points || 0), 0);

  panel.innerHTML = `
    <div class="sp-dash-header">
      <div>
        <h2 class="sp-dash-title">👥 إدارة الطلاب</h2>
        <p class="sp-dash-sub">${students.length} طالب مسجّل · إجمالي النقاط: ${totalPts}</p>
      </div>
      <button class="back-overview-btn" onclick="showOverview()">← رجوع</button>
    </div>

    <!-- إضافة طالب جديد -->
    <div class="editor-card">
      <div class="editor-card-title">➕ إضافة طالب جديد</div>
      <div class="sp-add-form">
        <div class="field-group" style="flex:2">
          <label class="field-label">اسم الطالب</label>
          <input class="field-input" id="sp-new-name" placeholder="الاسم الكامل للطالب">
        </div>
        <div class="field-group" style="flex:1">
          <label class="field-label">الصف</label>
          <select class="field-input" id="sp-new-grade">
            <option value="">— اختر —</option>
            <option value="grade4">🟠 الصف الرابع</option>
            <option value="grade5">🔵 الصف الخامس</option>
            <option value="grade6">🟣 الصف السادس</option>
          </select>
        </div>
        <div class="field-group" style="flex:1">
          <label class="field-label">كلمة المرور</label>
          <input class="field-input" id="sp-new-pass" placeholder="مثال: 1234">
        </div>
        <div class="field-group" style="flex:0;padding-top:24px">
          <button class="sp-add-btn" onclick="addStudentFromDash()">+ إضافة</button>
        </div>
      </div>
      <div class="sm-error hidden" id="sp-add-error" style="margin-top:8px"></div>
    </div>

    <!-- رفع قائمة Excel -->
    <div class="editor-card">
      <div class="editor-card-title">📊 رفع قائمة طلاب من Excel / CSV</div>
      <div class="sp-excel-info">
        <p>ارفع ملف Excel أو CSV يحتوي على أعمدة: <strong>الاسم</strong> — <strong>الصف</strong> — <strong>كلمة المرور</strong></p>
        <p style="margin-top:6px;color:#64748b;font-size:13px">الصف يُكتب: 4 أو 5 أو 6 (أو grade4 / grade5 / grade6)</p>
      </div>
      <div class="sp-excel-actions">
        <button class="sp-excel-template-btn" onclick="downloadExcelTemplate()">⬇ تحميل نموذج Excel</button>
        <label class="sp-excel-upload-btn">
          📂 اختر ملف Excel / CSV
          <input type="file" id="sp-excel-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleExcelUpload(event)">
        </label>
      </div>
      <div id="sp-excel-preview" class="sp-excel-preview hidden"></div>
      <div id="sp-excel-error" class="sm-error hidden" style="margin-top:8px"></div>
    </div>

    <!-- قائمة الطلاب -->
    <div class="editor-card">
      <div class="editor-card-title">🏆 لوحة الشرف — قائمة الطلاب</div>
      ${students.length === 0
        ? `<div class="sp-empty">لا يوجد طلاب مسجّلون بعد — أضف طالباً الآن</div>`
        : `<div class="sp-table-wrap">
            <table class="sp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم</th>
                  <th>الصف</th>
                  <th>كلمة المرور</th>
                  <th>النقاط ⭐</th>
                  <th>دروس محلولة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                ${students.map((st, i) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
                  const gc    = gradeColors[st.grade] || '#64748B';
                  const gi    = gradeIcons[st.grade]  || '📚';
                  const gn    = gradeNames[st.grade]  || st.grade;
                  const lc    = Object.keys(st.lessons || {}).length;
                  return `
                    <tr>
                      <td class="sp-rank">${medal}</td>
                      <td class="sp-student-name">${escHtml(st.username)}</td>
                      <td><span class="sp-grade-badge" style="background:${gc}20;color:${gc}">${gi} ${gn}</span></td>
                      <td class="sp-pass-cell">
                        <span class="sp-pass-dots" id="pd-${st.id}">••••</span>
                        <button class="sp-show-pass" onclick="togglePass('${escHtml(st.id)}')" title="كلمة المرور مشفرة">🔒</button>
                      </td>
                      <td class="sp-pts-cell">${st.points || 0}</td>
                      <td class="sp-lc-cell">${lc}</td>
                      <td class="sp-actions-cell">
                        <button class="sp-reset-btn" onclick="resetStudentFromDash('${st.id}')" title="صفر النقاط">🔄 صفر</button>
                        <button class="sp-del-btn"   onclick="deleteStudentFromDash('${st.id}')" title="حذف الطالب">🗑</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>
  `;
}

async function addStudentFromDash() {
  const name  = document.getElementById('sp-new-name').value;
  const grade = document.getElementById('sp-new-grade').value;
  const pass  = document.getElementById('sp-new-pass').value;
  const err   = document.getElementById('sp-add-error');
  const btn   = document.querySelector('.sp-add-btn');

  if (!window.StudentAuth) return;
  if (btn) btn.disabled = true;
  const result = await StudentAuth.addStudent(name, grade, pass);
  if (btn) btn.disabled = false;

  if (!result.ok) {
    err.textContent = result.msg;
    err.classList.remove('hidden');
    return;
  }
  err.classList.add('hidden');
  document.getElementById('sp-new-name').value = '';
  document.getElementById('sp-new-grade').value = '';
  document.getElementById('sp-new-pass').value = '';
  showToast(`✅ تم إضافة الطالب: ${result.student.username}`);
  renderStudentPanel();
}

function deleteStudentFromDash(id) {
  showConfirm('سيتم حذف الطالب ونقاطه نهائياً. هل أنت متأكد؟', () => {
    StudentAuth.deleteStudent(id);
    showToast('🗑 تم حذف الطالب');
    renderStudentPanel();
  });
}

function resetStudentFromDash(id) {
  showConfirm('سيتم تصفير نقاط الطالب وسجل الدروس. هل أنت متأكد؟', () => {
    StudentAuth.resetPoints(id);
    showToast('🔄 تم تصفير النقاط');
    renderStudentPanel();
  });
}

function togglePass(id) {
  const el = document.getElementById('pd-' + id);
  if (!el) return;
  // كلمات المرور مشفرة — لا يمكن عرضها
  if (el.textContent === '••••') {
    el.textContent = '🔒 مشفرة';
    setTimeout(() => { el.textContent = '••••'; }, 2000);
  }
}

// ===================================================
//  محرر النصوص الغني (Rich Text Editor)
// ===================================================
//  TinyMCE 6 — إعداد وتهيئة المحرر
// ===================================================

const _TMC_CFG = {
  language: 'ar',
  directionality: 'rtl',
  plugins: 'lists link autolink image media table code emoticons fullscreen searchreplace',
  toolbar:
    'undo redo | blocks | bold italic underline strikethrough | ' +
    'forecolor backcolor | alignright aligncenter alignleft | ' +
    'bullist numlist | link tmc_imgurl tmc_imgupload tmc_video | ' +
    'emoticons table searchreplace | code fullscreen',
  menubar: false,
  branding: false,
  promotion: false,
  statusbar: false,
  resize: 'vertical',
  content_style:
    'body { font-family: Tajawal, Arial, sans-serif; font-size: 15px; ' +
    'direction: rtl; text-align: right; line-height: 1.8; }',
  setup: function(editor) {

    /* ── زر: إدراج صورة برابط URL ── */
    editor.ui.registry.addButton('tmc_imgurl', {
      icon: 'image',
      tooltip: 'إدراج صورة برابط URL',
      onAction: function() {
        const url = prompt('أدخل رابط الصورة (URL):');
        if (url && url.trim()) {
          editor.insertContent(
            `<img src="${url.trim()}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`
          );
        }
      }
    });

    /* ── زر: رفع صورة من الجهاز ── */
    editor.ui.registry.addButton('tmc_imgupload', {
      icon: 'upload',
      tooltip: 'رفع صورة من الجهاز',
      onAction: function() {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.onchange = function() {
          const file = inp.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function(e) {
            editor.insertContent(
              `<img src="${e.target.result}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`
            );
          };
          reader.readAsDataURL(file);
        };
        inp.click();
      }
    });

    /* ── زر: إدراج فيديو (YouTube / Google Drive / mp4) ── */
    editor.ui.registry.addButton('tmc_video', {
      icon: 'embed',
      tooltip: 'إدراج فيديو (YouTube / Google Drive / mp4)',
      onAction: function() {
        const url = prompt('أدخل رابط الفيديو (YouTube أو Google Drive أو رابط mp4):');
        if (!url || !url.trim()) return;
        const u = url.trim();
        let html = '';
        const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
        const gd = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
        if (yt) {
          html = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:12px 0">` +
            `<iframe src="https://www.youtube.com/embed/${yt[1]}" ` +
            `style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe></div>`;
        } else if (gd) {
          html = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:12px 0">` +
            `<iframe src="https://drive.google.com/file/d/${gd[1]}/preview" ` +
            `style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`;
        } else if (/\.mp4/i.test(u)) {
          html = `<video controls style="max-width:100%;border-radius:12px;margin:12px 0">` +
            `<source src="${u}" type="video/mp4"></video>`;
        } else {
          html = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:12px 0">` +
            `<iframe src="${u}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`;
        }
        editor.insertContent(html);
      }
    });
  }
};

/* قراءة محتوى محرر بـ ID */
function getCKData(id) {
  if (typeof tinymce === 'undefined') return '';
  const ed = tinymce.get(id);
  if (ed) return ed.getContent();
  // fallback: قيمة الـ textarea مباشرة
  return (document.getElementById(id) || {}).value || '';
}

/* تدمير نسخ TinyMCE التي تبدأ بـ prefix */
function _destroyTMC(prefix) {
  if (typeof tinymce === 'undefined') return;
  tinymce.editors
    .filter(e => prefix ? e.id.startsWith(prefix) : true)
    .forEach(e => { try { e.remove(); } catch(_) {} });
}

/* تدمير كل محررات الدرس */
function _destroyAllEditorTMC() {
  _destroyTMC('f-summary');
  _destroyTMC('kp-re-');
  _destroyTMC('cs-re-');
}

/* تهيئة TinyMCE على كل .tmc-target داخل container */
async function initTinyMCE(container) {
  if (typeof tinymce === 'undefined') {
    console.warn('[TMC] TinyMCE غير محمّل');
    return;
  }
  const root = container || document;
  const targets = root.querySelectorAll('.tmc-target');
  if (!targets.length) return;

  for (const ta of targets) {
    const id = ta.id;
    if (!id) continue;
    if (tinymce.get(id)) { try { tinymce.get(id).remove(); } catch(_) {} }
    const minH = parseInt(ta.dataset.minHeight) || 80;
    await tinymce.init({
      ..._TMC_CFG,
      selector: '#' + id,
      min_height: minH + 80,
      base_url: 'https://cdn.jsdelivr.net/npm/tinymce@6.8.4',
      suffix: '.min'
    });
  }
}

/* بناء HTML حاوية المحرر */
function renderRichEditor(html, id, minHeight, placeholder) {
  // نُخزّن HTML في value حتى يلتقطه TinyMCE عند التهيئة
  const safe = (html || '').replace(/</g, '\x3C'); // لا نعقّده — TinyMCE يقرأه كـ HTML
  return `<div class="tmc-wrap">
    <textarea class="tmc-target" id="${id}"
              data-min-height="${minHeight || 80}">${html || ''}</textarea>
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

  document.getElementById('student-panel').classList.add('hidden');
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

  // تدمير نسخ TinyMCE القديمة أولاً
  _destroyAllEditorTMC();

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

    <!-- الصور -->
    <div class="editor-card">
      <div class="editor-card-title">🖼️ صور الدرس</div>
      <div class="img-editor-grid" id="images-list">
        ${(lesson.images || []).map((img, i) => renderImageItem(img, i)).join('')}
      </div>
      <div class="img-add-row">
        <label class="img-upload-btn" title="رفع صورة من الجهاز">
          📁 رفع صورة
          <input type="file" accept="image/*" style="display:none" onchange="handleImageFile(this, -1)">
        </label>
        <input class="field-input img-url-input" id="img-url-input" placeholder="أو أدخل رابط الصورة (URL)">
        <button class="img-url-btn" onclick="addImageFromURL()">+ إضافة</button>
      </div>
    </div>

    <!-- الأقسام المخصصة -->
    <div class="editor-card">
      <div class="editor-card-title">📌 أقسام مخصصة</div>
      <div class="cs-list" id="custom-sections-list">
        ${(lesson.customSections || []).map((cs, i) => renderCSItem(cs, i, (lesson.customSections || []).length)).join('')}
      </div>
      <button class="add-item-btn" onclick="addCustomSection()" style="margin-top:12px">+ إضافة قسم جديد</button>
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

  // تهيئة TinyMCE بعد رسم الـ DOM
  setTimeout(() => initTinyMCE(editor), 50);
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
  _syncKPFromDOM();
  const { lesson } = getLesson(activeLesson);
  lesson.keyPoints.push('');
  renderLessonEditor();
  // التركيز على آخر محرر بعد تهيئة TinyMCE
  setTimeout(() => {
    const lastIdx = lesson.keyPoints.length - 1;
    const ed = typeof tinymce !== 'undefined' ? tinymce.get('kp-re-' + lastIdx) : null;
    if (ed) ed.focus();
  }, 400);
}

function moveKeyPoint(i, dir) {
  _syncKPFromDOM();
  const { lesson } = getLesson(activeLesson);
  const j = i + dir;
  if (j < 0 || j >= lesson.keyPoints.length) return;
  [lesson.keyPoints[i], lesson.keyPoints[j]] = [lesson.keyPoints[j], lesson.keyPoints[i]];
  renderLessonEditor();
  setTimeout(() => {
    const ed = typeof tinymce !== 'undefined' ? tinymce.get('kp-re-' + j) : null;
    if (ed) ed.focus();
  }, 400);
}

function setKpLayout(layout) {
  // مزامنة المحتوى الحالي أولاً حتى لا يضيع
  _syncKPFromDOM();
  const { lesson } = getLesson(activeLesson);
  lesson.kpLayout = layout;
  renderLessonEditor();
}

/* مزامنة محتوى النقاط من TinyMCE إلى lesson object */
function _syncKPFromDOM() {
  if (!activeLesson) return;
  const { lesson } = getLesson(activeLesson);
  const kps = [];
  let i = 0;
  while (typeof tinymce !== 'undefined' && tinymce.get('kp-re-' + i)) {
    const data = getCKData('kp-re-' + i).trim();
    if (data) kps.push(data);
    i++;
  }
  if (i > 0) lesson.keyPoints = kps;
}

function saveLessonChanges() {
  const { lesson } = getLesson(activeLesson);

  // اسم الدرس
  lesson.name = document.getElementById('f-name').value.trim();

  // الملخص من TinyMCE
  lesson.summary = getCKData('f-summary');

  // قراءة الأهداف من DOM
  const objTextareas = document.querySelectorAll('#objectives-list textarea');
  lesson.objectives = [...objTextareas].map(t => t.value.trim()).filter(v => v);

  // قراءة النقاط الرئيسية من TinyMCE
  const kps = [];
  let _kpi = 0;
  while (typeof tinymce !== 'undefined' && tinymce.get('kp-re-' + _kpi)) {
    const d = getCKData('kp-re-' + _kpi).trim();
    if (d) kps.push(d);
    _kpi++;
  }
  lesson.keyPoints = kps;

  // قراءة الأقسام المخصصة
  _syncCSFromDOM();

  saveCurriculum();
  renderSidebar();
  renderStats();
  showToast('✅ تم حفظ التعديلات');
}

// ===================================================
//  إدارة الصور
// ===================================================
function renderImageItem(img, i) {
  return `
    <div class="img-item-card" id="img-card-${i}">
      <div class="img-item-preview">
        <img src="${escHtml(img.src)}" alt="${escHtml(img.caption || '')}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23eee%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2212%22>خطأ</text></svg>'">
      </div>
      <input class="field-input img-caption-input" placeholder="تعليق على الصورة (اختياري)"
             value="${escHtml(img.caption || '')}" onchange="_updateImgCaption(${i}, this.value)">
      <button class="img-del-btn" onclick="deleteImage(${i})">🗑</button>
    </div>`;
}

function handleImageFile(input, _unused) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    _addImageToLesson(e.target.result, file.name.replace(/\.[^.]+$/, ''));
  };
  reader.readAsDataURL(file);
}

function addImageFromURL() {
  const input = document.getElementById('img-url-input');
  const url = input.value.trim();
  if (!url) return;
  _addImageToLesson(url, '');
  input.value = '';
}

function _addImageToLesson(src, caption) {
  const { lesson } = getLesson(activeLesson);
  if (!lesson.images) lesson.images = [];
  lesson.images.push({ src, caption });
  // إعادة رسم قائمة الصور فقط
  const list = document.getElementById('images-list');
  if (list) {
    list.innerHTML = lesson.images.map((img, i) => renderImageItem(img, i)).join('');
  }
}

function deleteImage(i) {
  const { lesson } = getLesson(activeLesson);
  if (!lesson.images) return;
  lesson.images.splice(i, 1);
  const list = document.getElementById('images-list');
  if (list) list.innerHTML = lesson.images.map((img, j) => renderImageItem(img, j)).join('');
}

function _updateImgCaption(i, val) {
  const { lesson } = getLesson(activeLesson);
  if (lesson.images && lesson.images[i]) lesson.images[i].caption = val;
}

// ===================================================
//  إدارة الأقسام المخصصة
// ===================================================
function renderCSItem(cs, i, total) {
  return `
    <div class="cs-item-card" id="cs-card-${i}">
      <div class="cs-item-header">
        <div class="cs-item-meta">
          <input class="cs-icon-input" id="cs-icon-${i}" value="${escHtml(cs.icon || '📌')}" placeholder="أيقونة" maxlength="4">
          <input class="cs-title-input" id="cs-title-${i}" value="${escHtml(cs.title || '')}" placeholder="عنوان القسم">
        </div>
        <div class="cs-item-actions">
          <button class="kp-move-btn" onclick="moveCustomSection(${i}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="kp-move-btn" onclick="moveCustomSection(${i}, 1)" ${i === total - 1 ? 'disabled' : ''}>↓</button>
          <button class="kp-del-btn" onclick="deleteCustomSection(${i})">✕</button>
        </div>
      </div>
      ${renderRichEditor(cs.content || '', 'cs-re-' + i, 80, 'اكتب محتوى القسم هنا...')}
    </div>`;
}

function addCustomSection() {
  _syncCSFromDOM();
  const { lesson } = getLesson(activeLesson);
  if (!lesson.customSections) lesson.customSections = [];
  lesson.customSections.push({ id: 'cs_' + Date.now(), title: '', icon: '📌', content: '' });
  _reRenderCSList();
}

function deleteCustomSection(i) {
  _syncCSFromDOM();
  const { lesson } = getLesson(activeLesson);
  if (lesson.customSections) lesson.customSections.splice(i, 1);
  _reRenderCSList();
}

function moveCustomSection(i, dir) {
  _syncCSFromDOM();
  const { lesson } = getLesson(activeLesson);
  const j = i + dir;
  if (!lesson.customSections || j < 0 || j >= lesson.customSections.length) return;
  [lesson.customSections[i], lesson.customSections[j]] = [lesson.customSections[j], lesson.customSections[i]];
  _reRenderCSList();
}

function _reRenderCSList() {
  const { lesson } = getLesson(activeLesson);
  const list = document.getElementById('custom-sections-list');
  if (!list) return;
  // تدمير محررات الأقسام القديمة
  _destroyTMC('cs-re-');
  const cs = lesson.customSections || [];
  list.innerHTML = cs.map((s, i) => renderCSItem(s, i, cs.length)).join('');
  // تهيئة TinyMCE على الأقسام الجديدة فقط
  setTimeout(() => initTinyMCE(list), 50);
}

function _syncCSFromDOM() {
  if (!activeLesson) return;
  const { lesson } = getLesson(activeLesson);
  const cards = document.querySelectorAll('#custom-sections-list .cs-item-card');
  if (!cards.length) return;
  lesson.customSections = [...cards].map((card, i) => {
    const icon    = card.querySelector(`#cs-icon-${i}`)?.value || '📌';
    const title   = card.querySelector(`#cs-title-${i}`)?.value || '';
    const content = getCKData('cs-re-' + i); // قراءة من TinyMCE
    const prev    = (lesson.customSections || [])[i] || {};
    return { id: prev.id || 'cs_' + Date.now(), icon, title, content };
  });
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
    questions: [],
    images: [],
    customSections: []
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
//  رفع الطلاب من Excel / CSV
// ===================================================

// تحويل رقم/نص الصف إلى المفتاح الصحيح
function _parseGrade(raw) {
  const v = String(raw || '').trim().toLowerCase()
    .replace('الرابع','4').replace('الخامس','5').replace('السادس','6')
    .replace('fourth','4').replace('fifth','5').replace('sixth','6');
  if (v === '4' || v === 'grade4') return 'grade4';
  if (v === '5' || v === 'grade5') return 'grade5';
  if (v === '6' || v === 'grade6') return 'grade6';
  return null;
}

// تحميل نموذج Excel
function downloadExcelTemplate() {
  if (!window.XLSX) { showToast('⚠ مكتبة Excel غير محملة'); return; }

  const data = [
    ['الاسم', 'الصف', 'كلمة المرور'],
    ['أحمد محمد العلي', '4', '1234'],
    ['فاطمة علي الزهراني', '5', '5678'],
    ['خالد سعد المطيري', '6', 'abcd'],
    ['نورة عبدالله القحطاني', '4', 'pass1'],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // عرض الأعمدة
  ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 16 }];

  XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
  XLSX.writeFile(wb, 'نموذج_قائمة_الطلاب.xlsx');
  showToast('✅ تم تحميل النموذج');
}

// معالجة ملف Excel المرفوع
function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const errEl     = document.getElementById('sp-excel-error');
  const previewEl = document.getElementById('sp-excel-preview');

  errEl.classList.add('hidden');
  previewEl.classList.add('hidden');
  previewEl.innerHTML = '';

  if (!window.XLSX) {
    errEl.textContent = '⚠ مكتبة Excel غير محملة، أعد تحميل الصفحة.';
    errEl.classList.remove('hidden');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const wb    = XLSX.read(e.target.result, { type: 'binary' });
      const ws    = wb.Sheets[wb.SheetNames[0]];
      const rows  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // تجاهل الصف الأول (العناوين) إذا كان نصياً
      let dataRows = rows.filter(r => r.some(c => c !== ''));
      if (dataRows.length && isNaN(Number(dataRows[0][1])) &&
          String(dataRows[0][1]).toLowerCase().includes('صف') === false &&
          !_parseGrade(dataRows[0][1])) {
        dataRows = dataRows.slice(1); // تجاهل الهيدر
      }

      const parsed  = [];
      const errors  = [];
      const gradeNames = { grade4: 'الرابع', grade5: 'الخامس', grade6: 'السادس' };

      dataRows.forEach((row, i) => {
        const name  = String(row[0] || '').trim();
        const grade = _parseGrade(row[1]);
        const pass  = String(row[2] || '').trim();

        if (!name && !grade && !pass) return; // صف فارغ

        if (!name)  { errors.push(`السطر ${i+2}: اسم الطالب مفقود`); return; }
        if (!grade) { errors.push(`السطر ${i+2}: الصف غير صحيح (${row[1]})`); return; }
        if (!pass)  { errors.push(`السطر ${i+2}: كلمة المرور مفقودة`); return; }

        parsed.push({ name, grade, pass });
      });

      if (parsed.length === 0 && errors.length === 0) {
        errEl.textContent = '⚠ الملف فارغ أو لا يحتوي بيانات.';
        errEl.classList.remove('hidden');
        return;
      }

      // بناء معاينة
      let html = `
        <div class="sp-excel-summary">
          <span class="sp-excel-count">✅ ${parsed.length} طالب جاهز للإضافة</span>
          ${errors.length ? `<span class="sp-excel-err-count">⚠ ${errors.length} سطر به مشكلة</span>` : ''}
        </div>`;

      if (errors.length) {
        html += `<ul class="sp-excel-errlist">${errors.map(e => `<li>${e}</li>`).join('')}</ul>`;
      }

      if (parsed.length) {
        html += `
          <div class="sp-excel-table-wrap">
            <table class="sp-table" style="margin-top:10px">
              <thead><tr><th>#</th><th>الاسم</th><th>الصف</th><th>كلمة المرور</th></tr></thead>
              <tbody>
                ${parsed.slice(0, 8).map((s, i) => `
                  <tr>
                    <td>${i+1}</td>
                    <td>${escHtml(s.name)}</td>
                    <td>${gradeNames[s.grade]}</td>
                    <td>${escHtml(s.pass)}</td>
                  </tr>`).join('')}
                ${parsed.length > 8 ? `<tr><td colspan="4" style="text-align:center;color:#64748b">... و${parsed.length - 8} طالب آخر</td></tr>` : ''}
              </tbody>
            </table>
          </div>
          <button class="sp-excel-confirm-btn" onclick="importStudentsFromExcel()">
            ✅ إضافة ${parsed.length} طالب الآن
          </button>`;

        // حفظ البيانات مؤقتاً للاستخدام عند الضغط
        window._pendingExcelStudents = parsed;
      }

      previewEl.innerHTML = html;
      previewEl.classList.remove('hidden');

    } catch (err) {
      errEl.textContent = '⚠ تعذّر قراءة الملف: ' + err.message;
      errEl.classList.remove('hidden');
    }
  };
  reader.readAsBinaryString(file);

  // إعادة تعيين الـ input لقبول نفس الملف مرة أخرى
  event.target.value = '';
}

// إضافة الطلاب بالجملة
async function importStudentsFromExcel() {
  const students = window._pendingExcelStudents;
  if (!students || !students.length) return;

  const btn = document.querySelector('.sp-excel-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جارٍ الإضافة...'; }

  let added = 0, skipped = 0;
  const skippedNames = [];

  for (const s of students) {
    if (!window.StudentAuth) break;
    const res = await StudentAuth.addStudent(s.name, s.grade, s.pass);
    if (res.ok) {
      added++;
    } else {
      skipped++;
      skippedNames.push(s.name);
    }
  }

  window._pendingExcelStudents = null;

  let msg = `✅ تمت إضافة ${added} طالب بنجاح`;
  if (skipped) msg += ` · تم تخطي ${skipped} (مكرر أو خطأ)`;
  showToast(msg);

  if (skipped && skippedNames.length) {
    const previewEl = document.getElementById('sp-excel-preview');
    if (previewEl) {
      previewEl.innerHTML = `<div class="sp-excel-summary">
        <span class="sp-excel-count">✅ تمت إضافة ${added} طالب</span>
        ${skipped ? `<span class="sp-excel-err-count">⚠ تم تخطي ${skipped}: ${skippedNames.join('، ')}</span>` : ''}
      </div>`;
    }
  } else {
    document.getElementById('sp-excel-preview').classList.add('hidden');
  }

  renderStudentPanel();
}

// ===================================================
//  تشغيل
// ===================================================
document.addEventListener('DOMContentLoaded', init);
