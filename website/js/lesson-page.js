document.addEventListener('DOMContentLoaded',()=>{const p=new URLSearchParams(location.search);const gradeId=p.get('g');const semId=p.get('s');const unitId=p.get('u');const lessonId=p.get('l');const saved=localStorage.getItem('ibn_moshrf_curriculum');if(saved){try{const parsed=JSON.parse(saved);Object.keys(parsed).forEach(k=>CURRICULUM[k]=parsed[k]);}catch(e){}}
const grade=CURRICULUM[gradeId];const sem=grade.semesters.find(s=>s.id===semId);const unit=sem.units.find(u=>u.id===unitId);const lesson=unit.lessons.find(l=>l.id===lessonId);document.title=`${lesson.name} - المهارات الرقمية`;window._currentLessonId=lessonId;window._currentLessonGrade=gradeId;document.getElementById('breadcrumb').innerHTML=`
    <span class="bc-item" onclick="history.go(-2)" style="cursor:pointer">${sem.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item" onclick="history.back()" style="cursor:pointer">${unit.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item bc-current">${lesson.name}</span>
  `;const qJSON=JSON.stringify(lesson.questions).replace(/"/g,'&quot;');document.getElementById('main-content').innerHTML=`

    <!-- زر رجوع -->
    <button class="back-btn" onclick="history.back()" style="margin-bottom:20px">← رجوع</button>

    <!-- ===== Hero ===== -->
    <div class="lp-hero" style="background: linear-gradient(135deg, ${unit.color}dd 0%, ${unit.color} 100%)">
      <div class="lp-hero-bg">${unit.icon}</div>
      <div class="lp-hero-content">
        <div class="lp-hero-meta">
          <span class="lp-meta-chip">${grade.icon} ${grade.name}</span>
          <span class="lp-meta-chip">${sem.name}</span>
          <span class="lp-meta-chip">${unit.icon} ${unit.name}</span>
        </div>
        <h1 class="lp-hero-title">${lesson.name}</h1>
        <div class="lp-hero-stats">
          <div class="lp-stat">
            <span class="lp-stat-icon">🎯</span>
            <span>${lesson.objectives.length} أهداف</span>
          </div>
          <div class="lp-stat">
            <span class="lp-stat-icon">⚡</span>
            <span>${lesson.keyPoints.length} نقطة</span>
          </div>
          <div class="lp-stat">
            <span class="lp-stat-icon">🎮</span>
            <span>${lesson.questions.length} سؤال</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== أهداف الدرس ===== -->
    <div class="lp-section">
      <div class="lp-section-header" style="--sec-color:${unit.color}">
        <div class="lp-section-icon">🎯</div>
        <h2>أهداف الدرس</h2>
      </div>
      <div class="lp-objectives">
        ${lesson.objectives.map((obj, i) => `<div class="lp-obj-item"style="animation-delay:${i * 0.08}s"><div class="lp-obj-num"style="background:${unit.color}20; color:${unit.color}">${i+1}</div><span>${obj}</span></div>`).join('')}
      </div>
    </div>

    <!-- ===== ملخص الدرس ===== -->
    <div class="lp-section">
      <div class="lp-section-header" style="--sec-color:${unit.color}">
        <div class="lp-section-icon">📋</div>
        <h2>ملخص الدرس</h2>
      </div>
      <div class="lp-summary" style="border-right-color:${unit.color}">
        ${lesson.summary}
      </div>
    </div>

    <!-- ===== النقاط الرئيسية ===== -->
    <div class="lp-section">
      <div class="lp-section-header" style="--sec-color:${unit.color}">
        <div class="lp-section-icon">⚡</div>
        <h2>النقاط الرئيسية</h2>
      </div>
      ${renderKeyPoints(lesson, unit.color)}
    </div>

    <!-- ===== صور الدرس ===== -->
    ${renderLessonImages(lesson, unit.color)}

    <!-- ===== الأقسام المخصصة ===== -->
    ${(lesson.customSections || []).map(cs => `<div class="lp-section"><div class="lp-section-header"style="--sec-color:${unit.color}"><div class="lp-section-icon">${cs.icon||'📌'}</div><h2>${cs.title||'قسم'}</h2></div><div class="lp-summary"style="border-right-color:${unit.color}">${cs.content}</div></div>`).join('')}

    <!-- ===== الأسئلة التفاعلية ===== -->
    <div class="lp-section lp-quiz-section">
      <div class="lp-section-header" style="--sec-color:${unit.color}">
        <div class="lp-section-icon">🎮</div>
        <h2>اختبر نفسك</h2>
        <span class="lp-quiz-count">${lesson.questions.length} أسئلة</span>
      </div>
      <p class="lp-quiz-intro">أجب على جميع الأسئلة ثم اضغط "تحقق من إجاباتي"</p>
      <div id="questions-container" class="questions-container">
        ${renderAllQuestions(lesson.questions, unit.color)}
      </div>
      <button class="lp-check-btn" style="background:${unit.color}"
              onclick="checkAllAnswers(${qJSON})">
        ✅ تحقق من إجاباتي
      </button>
    </div>

  `;setTimeout(()=>initDragDrop(),100);});function renderKeyPoints(lesson,color){const layout=lesson.kpLayout||'list';const kps=lesson.keyPoints||[];if(!kps.length)return'<p style="color:var(--text-light);text-align:center;padding:20px">لا توجد نقاط رئيسية</p>';function textLen(html){return html.replace(/<[^>]*>/g,'').trim().length;}
if(layout==='list'){return`
      <div class="lp-keypoints lp-kp-list">
        ${kps.map((kp, i) => `<div class="lp-kp-card"style="animation-delay:${i*0.06}s; --kp-color:${color}"><div class="lp-kp-dot"style="background:${color}"></div><span>${kp}</span></div>`).join('')}
      </div>`;}else if(layout==='grid'){return`
      <div class="lp-keypoints lp-kp-grid">
        ${kps.map((kp, i) => {
          const len  = textLen(kp);
          const wide = len > 90;   // نص طويل ← عرض كامل
          return `<div class="lp-kp-card ${wide ? 'kp-full' : ''}"
style="animation-delay:${i*0.06}s; --kp-color:${color}"><div class="lp-kp-num"style="background:${color};color:#fff">${i+1}</div><span>${kp}</span></div>`;
        }).join('')}
      </div>`;}else if(layout==='cards'){const cardColors=[color,'#2196F3','#10B981','#F59E0B','#EC4899','#7C3AED'];return`
      <div class="lp-keypoints lp-kp-cards">
        ${kps.map((kp, i) => {
          const c = cardColors[i % cardColors.length];
          return `<div class="lp-kp-ccard"style="--card-color:${c}; animation-delay:${i*0.07}s"><div class="lp-kp-ccard-num">${i+1}</div><div class="lp-kp-ccard-body">${kp}</div></div>`;
        }).join('')}
      </div>`;}
return'';}
function renderLessonImages(lesson,color){const imgs=(lesson.images||[]).filter(img=>img.src);if(!imgs.length)return'';return`
    <div class="lp-section">
      <div class="lp-section-header" style="--sec-color:${color}">
        <div class="lp-section-icon">🖼️</div>
        <h2>صور الدرس</h2>
      </div>
      <div class="lp-img-gallery">
        ${imgs.map(img => `<div class="lp-img-item"><img src="${img.src}"alt="${img.caption || ''}"loading="lazy">${img.caption?`<div class="lp-img-caption">${img.caption}</div>`:''}</div>`).join('')}
      </div>
    </div>`;}