// ===================================================
//  صفحة الدرس - يقرأ معاملات URL ويعرض محتوى الدرس
// ===================================================

document.addEventListener('DOMContentLoaded', () => {
  const p = new URLSearchParams(location.search);
  const gradeId  = p.get('g');
  const semId    = p.get('s');
  const unitId   = p.get('u');
  const lessonId = p.get('l');

  const grade  = CURRICULUM[gradeId];
  const sem    = grade.semesters.find(s => s.id === semId);
  const unit   = sem.units.find(u => u.id === unitId);
  const lesson = unit.lessons.find(l => l.id === lessonId);

  document.title = `${lesson.name} - المهارات الرقمية`;

  // شريط التنقل
  const unitUrl = `unit.html?g=${gradeId}&s=${semId}&u=${unitId}`;
  document.getElementById('breadcrumb').innerHTML = `
    <span class="bc-item" onclick="history.go(-2)" style="cursor:pointer">${sem.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item" onclick="history.back()" style="cursor:pointer">${unit.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item bc-current">${lesson.name}</span>
  `;

  // محتوى الدرس
  document.getElementById('main-content').innerHTML = `
    <div class="page-header" style="--hdr-color:${unit.color}">
      <button class="back-btn" onclick="history.back()">← رجوع</button>
      <div>
        <p style="font-size:13px; color:var(--text-mid); margin-bottom:4px">${unit.icon} ${unit.name}</p>
        <h1 style="font-size:20px; font-weight:900">${lesson.name}</h1>
      </div>
    </div>

    <!-- بطاقة عنوان الدرس -->
    <div class="lesson-hero" style="background:${unit.color}" data-icon="${unit.icon}">
      <h1>${lesson.name}</h1>
      <p>${unit.name} · ${sem.name} · ${grade.name}</p>
      <div class="lesson-meta">
        <span class="badge">🎯 ${lesson.objectives.length} أهداف</span>
        <span class="badge">❓ ${lesson.questions.length} أسئلة</span>
      </div>
    </div>

    <!-- أهداف الدرس -->
    <div class="lesson-section">
      <h2 class="section-title">🎯 أهداف الدرس</h2>
      <ul class="objectives-list">
        ${lesson.objectives.map(obj => `<li>${obj}</li>`).join('')}
      </ul>
    </div>

    <!-- ملخص الدرس -->
    <div class="lesson-section">
      <h2 class="section-title">📋 ملخص الدرس</h2>
      <div class="summary-box">${lesson.summary}</div>
    </div>

    <!-- النقاط الرئيسية -->
    <div class="lesson-section">
      <h2 class="section-title">⚡ النقاط الرئيسية</h2>
      <div class="key-points">
        ${lesson.keyPoints.map(kp => `
          <div class="key-point">
            <span class="kp-dot" style="color:${unit.color}">●</span>
            ${kp}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- الأسئلة التفاعلية -->
    <div class="lesson-section">
      <h2 class="section-title">🎮 أسئلة تفاعلية</h2>
      <p class="q-intro">أجب على الأسئلة التالية لاختبار فهمك للدرس</p>
      <div id="questions-container">
        ${renderAllQuestions(lesson.questions, unit.color)}
      </div>
      <button class="check-btn" style="background:${unit.color}"
              onclick="checkAllAnswers(${JSON.stringify(lesson.questions).replace(/"/g, '&quot;')})">
        ✅ تحقق من إجاباتي
      </button>
    </div>
  `;

  setTimeout(() => initDragDrop(), 100);
});
