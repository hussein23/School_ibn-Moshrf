// ===================================================
//  صفحة الوحدة - يقرأ معاملات URL ويعرض دروس الوحدة
// ===================================================

document.addEventListener('DOMContentLoaded', () => {
  const p = new URLSearchParams(location.search);
  const gradeId = p.get('g');
  const semId   = p.get('s');
  const unitId  = p.get('u');

  const grade = CURRICULUM[gradeId];
  const sem   = grade.semesters.find(s => s.id === semId);
  const unit  = sem.units.find(u => u.id === unitId);

  document.title = `${unit.name} - المهارات الرقمية`;

  // شريط التنقل
  const gradeUrl = `${gradeId}.html`;
  document.getElementById('breadcrumb').innerHTML = `
    <span class="bc-item" onclick="history.go(-2)" style="cursor:pointer">${grade.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item" onclick="history.back()" style="cursor:pointer">${sem.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item bc-current">${unit.name}</span>
  `;

  const gradeNum = gradeId.replace('grade', '');

  document.getElementById('main-content').innerHTML = `
    <div class="page-header" style="--hdr-color:${unit.color}">
      <button class="back-btn" onclick="history.back()">← رجوع</button>
      <div>
        <p style="font-size:13px; color:var(--text-mid); margin-bottom:4px">${grade.icon} ${grade.name} · ${sem.name}</p>
        <h1 style="font-size:22px; font-weight:900">${unit.icon} ${unit.name}</h1>
      </div>
    </div>
    <div class="grades-grid">
      ${unit.lessons.map((lesson, idx) => `
        <a class="grade-card" data-grade="${gradeNum}"
           href="lesson.html?g=${gradeId}&s=${semId}&u=${unitId}&l=${lesson.id}"
           style="text-decoration:none; display:block; cursor:pointer;">
          <div class="grade-icon-wrap"
               style="background:${unit.color}20; font-size:32px; color:${unit.color}; font-weight:900">
            ${idx + 1}
          </div>
          <h2 style="color:${unit.color}">${lesson.name}</h2>
          <div class="grade-meta">
            <span class="badge" style="background:${unit.color}15; color:${unit.color}">🎯 ${lesson.objectives.length} أهداف</span>
            <span class="badge" style="background:${unit.color}15; color:${unit.color}">❓ ${lesson.questions.length} أسئلة</span>
          </div>
          <button class="grade-btn" style="background:${unit.color}">افتح الدرس ←</button>
        </a>
      `).join('')}
    </div>
  `;

  if (typeof addPageEnterAnimation === 'function') addPageEnterAnimation();
});
