let currentState={grade:null,semester:null,unit:null,lesson:null};function navigate(view,params,renderFn){history.pushState({view,...params},'');renderFn();}
window.addEventListener('popstate',(e)=>{const s=e.state;if(!s){const initGrade=document.body.dataset.initGrade;if(initGrade)_renderGrade(initGrade);else _renderHome();return;}
if(s.view==='home')_renderHome();if(s.view==='grade')_renderGrade(s.gradeId);if(s.view==='semester')_renderSemester(s.gradeId,s.semId);if(s.view==='unit')_renderUnit(s.gradeId,s.semId,s.unitId);});function showHome(){if(document.body.dataset.initGrade){window.location.href='index.html';return;}
navigate('home',{},_renderHome);}
function _renderHome(){currentState={grade:null,semester:null,unit:null,lesson:null};updateBreadcrumb([]);pageTransition();const main=document.getElementById('main-content');main.innerHTML=`

    <!-- ===== بطاقة المدرسة والمعلم ===== -->
    <div class="school-banner">
      <div class="school-banner-bg">🏫</div>
      <div class="school-banner-inner">
        <div class="school-info-block">
          <div class="school-info-icon">🏫</div>
          <div class="school-info-text">
            <span class="school-info-label">المدرسة</span>
            <span class="school-info-value">ابن المشرف</span>
          </div>
        </div>
        <div class="school-banner-divider"></div>
        <div class="school-info-block">
          <div class="school-info-icon">👨‍🏫</div>
          <div class="school-info-text">
            <span class="school-info-label">معلم المادة</span>
            <span class="school-info-value">حسين اللغبي</span>
          </div>
        </div>
        <div class="school-banner-divider"></div>
        <div class="school-info-block">
          <div class="school-info-icon">💻</div>
          <div class="school-info-text">
            <span class="school-info-label">المادة</span>
            <span class="school-info-value">المهارات الرقمية</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Hero ===== -->
    <div class="home-hero">
      <div class="hero-stars">⭐ ⭐ ⭐</div>
      <h1 class="hero-title">مرحباً بك في رحلة التعلم!</h1>
      <p class="hero-sub">اختر صفك الدراسي لتبدأ رحلتك مع المهارات الرقمية</p>
    </div>
    <div class="grades-grid">
      ${Object.values(CURRICULUM).map(g => gradeCard(g)).join('')}
    </div>

  `;if(window.StudentAuth)window.StudentAuth.updateStudentBar();addPageEnterAnimation();}
function gradeCard(grade){const totalLessons=grade.semesters.reduce((s,sem)=>s+sem.units.reduce((u,unit)=>u+unit.lessons.length,0),0);const gradeNum=grade.id.replace('grade','');return`
    <a class="grade-card" data-grade="${gradeNum}" href="${grade.id}.html" style="text-decoration:none; display:block;">
      <div class="grade-icon-wrap">${grade.icon}</div>
      <h2>${grade.name}</h2>
      <div class="grade-meta">
        <span class="badge">📚 ${grade.semesters.length} فصول</span>
        <span class="badge">📖 ${totalLessons} درس</span>
      </div>
      <button class="grade-btn">ابدأ الآن ←</button>
    </a>
  `;}
function showGrade(gradeId){navigate('grade',{gradeId},()=>_renderGrade(gradeId));}
function _renderGrade(gradeId){const grade=CURRICULUM[gradeId];currentState.grade=grade;updateBreadcrumb([{label:grade.name,action:`showGrade('${gradeId}')`}]);const main=document.getElementById('main-content');main.innerHTML=`
    <div class="page-header" style="--hdr-color:${grade.color}">
      <button class="back-btn" onclick="history.back()">← رجوع</button>
      <h1>${grade.icon} ${grade.name}</h1>
      <p>اختر الفصل الدراسي</p>
    </div>
    <div class="grades-grid">
      ${grade.semesters.map((sem, i) => semesterCard(grade, sem, i)).join('')}
    </div>
  `;addPageEnterAnimation();}
function semesterCard(grade,sem,idx){const totalLessons=sem.units.reduce((u,unit)=>u+unit.lessons.length,0);const icons=['🍂','🌸'];const gradeNum=grade.id.replace('grade','');return`
    <div class="grade-card" data-grade="${gradeNum}" onclick="showSemester('${grade.id}','${sem.id}')" style="cursor:pointer;">
      <div class="grade-icon-wrap">${icons[idx] || '📚'}</div>
      <h2>${sem.name}</h2>
      <div class="grade-meta">
        <span class="badge">🗂 ${sem.units.length} وحدات</span>
        <span class="badge">📖 ${totalLessons} درس</span>
      </div>
      <button class="grade-btn">ابدأ الآن ←</button>
    </div>
  `;}
function showSemester(gradeId,semId){navigate('semester',{gradeId,semId},()=>_renderSemester(gradeId,semId));}
function _renderSemester(gradeId,semId){const grade=CURRICULUM[gradeId];const sem=grade.semesters.find(s=>s.id===semId);currentState.grade=grade;currentState.semester=sem;updateBreadcrumb([{label:grade.name,action:`showGrade('${gradeId}')`},{label:sem.name,action:`showSemester('${gradeId}','${semId}')`}]);const main=document.getElementById('main-content');main.innerHTML=`
    <div class="page-header" style="--hdr-color:${grade.color}">
      <button class="back-btn" onclick="history.back()">← رجوع</button>
      <h1>${grade.icon} ${sem.name}</h1>
      <p>${grade.name}</p>
    </div>
    <div class="grades-grid">
      ${sem.units.map(unit => unitCard(grade, sem, unit)).join('')}
    </div>
  `;addPageEnterAnimation();}
function unitCard(grade,sem,unit){const gradeNum=grade.id.replace('grade','');const url=`unit.html?g=${grade.id}&s=${sem.id}&u=${unit.id}`;return`
    <a class="grade-card" data-grade="${gradeNum}" href="${url}"
       style="text-decoration:none; display:block; cursor:pointer;">
      <div class="grade-icon-wrap" style="background:${unit.color}20">${unit.icon}</div>
      <h2 style="color:${unit.color}">${unit.name}</h2>
      <div class="grade-meta">
        <span class="badge" style="background:${unit.color}15; color:${unit.color}">📖 ${unit.lessons.length} دروس</span>
      </div>
      <button class="grade-btn" style="background:${unit.color}">ابدأ الآن ←</button>
    </a>
  `;}
function openLesson(gradeId,semId,unitId,lessonId){const grade=CURRICULUM[gradeId];const sem=grade.semesters.find(s=>s.id===semId);const unit=sem.units.find(u=>u.id===unitId);const lesson=unit.lessons.find(l=>l.id===lessonId);currentState={grade,semester:sem,unit,lesson};window._currentLessonId=lessonId;window._currentLessonGrade=gradeId;const modal=document.getElementById('lesson-modal');const content=document.getElementById('lesson-content');content.innerHTML=`
    <div class="lesson-header" style="--lh-color:${unit.color}">
      <div class="lh-badge">${unit.icon} ${unit.name}</div>
      <h1 class="lh-title">${lesson.name}</h1>
    </div>

    <!-- الأهداف -->
    <div class="lesson-section">
      <h2 class="section-title">🎯 أهداف الدرس</h2>
      <ul class="objectives-list">
        ${lesson.objectives.map(obj => `<li>${obj}</li>`).join('')}
      </ul>
    </div>

    <!-- الملخص -->
    <div class="lesson-section">
      <h2 class="section-title">📋 ملخص الدرس</h2>
      <div class="summary-box">${lesson.summary}</div>
    </div>

    <!-- النقاط الرئيسية -->
    <div class="lesson-section">
      <h2 class="section-title">⚡ النقاط الرئيسية</h2>
      <div class="key-points">
        ${lesson.keyPoints.map(p => `<div class="key-point"><span class="kp-dot">●</span>${p}</div>`).join('')}
      </div>
    </div>

    <!-- الأسئلة التفاعلية -->
    <div class="lesson-section">
      <h2 class="section-title">🎮 أسئلة تفاعلية</h2>
      <p class="q-intro">أجب على الأسئلة التالية لاختبار فهمك للدرس</p>
      <div id="questions-container">
        ${renderAllQuestions(lesson.questions, unit.color)}
      </div>
      <button class="check-btn" style="background:${unit.color}" onclick="checkAllAnswers(${JSON.stringify(lesson.questions).replace(/"/g, '&quot;')})">
        ✅ تحقق من إجاباتي
      </button>
    </div>
  `;modal.classList.remove('hidden');document.body.style.overflow='hidden';setTimeout(()=>initDragDrop(),100);}
function closeLesson(){document.getElementById('lesson-modal').classList.add('hidden');document.body.style.overflow='';}
function updateBreadcrumb(items){const nav=document.getElementById('breadcrumb');if(items.length===0){nav.innerHTML='';return;}
nav.innerHTML=items.map((item,i)=>`<span class="bc-item ${i === items.length - 1 ? 'bc-current' : ''}"
       ${i < items.length - 1 ? `onclick="${item.action}"` : ''}>${item.label}</span>`).join('<span class="bc-sep">›</span>');}
window._rerenderCurrentView=function(){const modal=document.getElementById('lesson-modal');if(modal&&!modal.classList.contains('hidden'))return;const s=currentState;if(s.unit){return;}else if(s.semester){_renderSemester(s.grade.id,s.semester.id);}else if(s.grade){_renderGrade(s.grade.id);}else{_renderHome();}};document.addEventListener('DOMContentLoaded',()=>{const initGrade=document.body.dataset.initGrade;if(initGrade){history.replaceState({view:'grade',gradeId:initGrade},'');_renderGrade(initGrade);}else{history.replaceState({view:'home'},'');_renderHome();}});