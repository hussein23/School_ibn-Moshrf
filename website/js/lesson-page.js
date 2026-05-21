// الترتيب الافتراضي لأقسام الدرس (يُستخدم عند غياب lesson.sectionOrder)
const DEFAULT_SECTION_ORDER=['objectives','summary','keyPoints','images','questions'];

document.addEventListener('DOMContentLoaded',()=>{
  const p=new URLSearchParams(location.search);
  const gradeId=p.get('g'),semId=p.get('s'),unitId=p.get('u'),lessonId=p.get('l');

  // تطبيق أي تعديلات محفوظة من لوحة التحكم
  if(window.FirebaseDB&&window.FirebaseDB.dbLoadCurriculum){
    const fc=window.FirebaseDB.dbLoadCurriculum();
    if(fc&&Object.keys(fc).length)Object.keys(fc).forEach(k=>CURRICULUM[k]=fc[k]);
  }
  const saved=localStorage.getItem('ibn_moshrf_curriculum');
  if(saved){try{const parsed=JSON.parse(saved);Object.keys(parsed).forEach(k=>CURRICULUM[k]=parsed[k]);}catch(e){}}

  const grade=CURRICULUM[gradeId];
  const sem=grade.semesters.find(s=>s.id===semId);
  const unit=sem.units.find(u=>u.id===unitId);
  const lesson=unit.lessons.find(l=>l.id===lessonId);

  document.title=`${lesson.name} - المهارات الرقمية`;
  window._currentLessonId=lessonId;
  window._currentLessonGrade=gradeId;

  document.getElementById('breadcrumb').innerHTML=`
    <span class="bc-item" onclick="history.go(-2)" style="cursor:pointer">${sem.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item" onclick="history.back()" style="cursor:pointer">${unit.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item bc-current">${lesson.name}</span>`;

  const color=unit.color;
  const qJSON=JSON.stringify(lesson.questions).replace(/"/g,'&quot;');

  // تحديد ترتيب الأقسام
  const order=_getSectionOrder(lesson);

  document.getElementById('main-content').innerHTML=`
    <button class="back-btn" onclick="history.back()" style="margin-bottom:20px">← رجوع</button>

    <!-- Hero -->
    <div class="lp-hero" style="background:linear-gradient(135deg,${color}dd 0%,${color} 100%)">
      <div class="lp-hero-bg">${unit.icon}</div>
      <div class="lp-hero-content">
        <div class="lp-hero-meta">
          <span class="lp-meta-chip">${grade.icon} ${grade.name}</span>
          <span class="lp-meta-chip">${sem.name}</span>
          <span class="lp-meta-chip">${unit.icon} ${unit.name}</span>
        </div>
        <h1 class="lp-hero-title">${lesson.name}</h1>
        <div class="lp-hero-stats">
          ${lesson.objectives&&lesson.objectives.length?`<div class="lp-stat"><span class="lp-stat-icon">🎯</span><span>${lesson.objectives.length} أهداف</span></div>`:''}
          ${lesson.keyPoints&&lesson.keyPoints.length?`<div class="lp-stat"><span class="lp-stat-icon">⚡</span><span>${lesson.keyPoints.length} نقطة</span></div>`:''}
          <div class="lp-stat"><span class="lp-stat-icon">🎮</span><span>${lesson.questions.length} سؤال</span></div>
        </div>
      </div>
    </div>

    <!-- الأقسام بالترتيب المحدد -->
    ${order.map(key=>_renderSection(key,lesson,unit,grade,color,qJSON)).join('')}
  `;

  setTimeout(()=>initDragDrop(),100);
});

// ترتيب الأقسام الفعلي للدرس
function _getSectionOrder(lesson){
  if(lesson.sectionOrder&&lesson.sectionOrder.length>0){
    // أضف الأقسام المخصصة التي لم تُضَف للترتيب بعد (للتوافق)
    const order=[...lesson.sectionOrder];
    (lesson.customSections||[]).forEach(cs=>{if(!order.includes(cs.id))order.splice(order.indexOf('questions')>=0?order.indexOf('questions'):order.length,0,cs.id);});
    return order;
  }
  // الترتيب الافتراضي + الأقسام المخصصة قبل الأسئلة
  const order=[...DEFAULT_SECTION_ORDER];
  (lesson.customSections||[]).forEach(cs=>{const qi=order.indexOf('questions');order.splice(qi>=0?qi:order.length,0,cs.id);});
  return order;
}

// عرض قسم واحد حسب مفتاحه
function _renderSection(key,lesson,unit,grade,color,qJSON){
  switch(key){
    case 'objectives':
      if(!lesson.objectives||!lesson.objectives.length)return'';
      return`<div class="lp-section">
        <div class="lp-section-header" style="--sec-color:${color}">
          <div class="lp-section-icon">🎯</div><h2>أهداف الدرس</h2>
        </div>
        <div class="lp-objectives">
          ${lesson.objectives.map((obj,i)=>`<div class="lp-obj-item" style="animation-delay:${i*0.08}s">
            <div class="lp-obj-num" style="background:${color}20;color:${color}">${i+1}</div>
            <span>${obj}</span></div>`).join('')}
        </div></div>`;

    case 'summary':
      if(!lesson.summary)return'';
      return`<div class="lp-section">
        <div class="lp-section-header" style="--sec-color:${color}">
          <div class="lp-section-icon">📋</div><h2>ملخص الدرس</h2>
        </div>
        <div class="lp-summary" style="border-right-color:${color}">${lesson.summary}</div>
      </div>`;

    case 'keyPoints':
      if(!lesson.keyPoints||!lesson.keyPoints.length)return'';
      return`<div class="lp-section">
        <div class="lp-section-header" style="--sec-color:${color}">
          <div class="lp-section-icon">⚡</div><h2>النقاط الرئيسية</h2>
        </div>
        ${renderKeyPoints(lesson,color)}
      </div>`;

    case 'images':
      return renderLessonImages(lesson,color);

    case 'questions':
      if(!lesson.questions||!lesson.questions.length)return'';
      return`<div class="lp-section lp-quiz-section">
        <div class="lp-section-header" style="--sec-color:${color}">
          <div class="lp-section-icon">🎮</div>
          <h2>اختبر نفسك</h2>
          <span class="lp-quiz-count">${lesson.questions.length} أسئلة</span>
        </div>
        <p class="lp-quiz-intro">أجب على جميع الأسئلة ثم اضغط "تحقق من إجاباتي"</p>
        <div id="questions-container" class="questions-container">
          ${renderAllQuestions(lesson.questions,color)}
        </div>
        <button class="lp-check-btn" style="background:${color}"
                onclick="checkAllAnswers(${qJSON})">
          ✅ تحقق من إجاباتي
        </button>
      </div>`;

    default:
      // قسم مخصص
      const cs=(lesson.customSections||[]).find(s=>s.id===key);
      if(!cs||!cs.content)return'';
      return`<div class="lp-section">
        <div class="lp-section-header" style="--sec-color:${color}">
          <div class="lp-section-icon">${cs.icon||'📌'}</div>
          <h2>${cs.title||'قسم'}</h2>
        </div>
        <div class="lp-summary" style="border-right-color:${color}">${cs.content}</div>
      </div>`;
  }
}

function renderKeyPoints(lesson,color){
  const layout=lesson.kpLayout||'list';
  const kps=lesson.keyPoints||[];
  if(!kps.length)return'<p style="color:var(--text-light);text-align:center;padding:20px">لا توجد نقاط رئيسية</p>';
  function textLen(html){return html.replace(/<[^>]*>/g,'').trim().length;}
  if(layout==='list'){return`<div class="lp-keypoints lp-kp-list">
    ${kps.map((kp,i)=>`<div class="lp-kp-card" style="animation-delay:${i*0.06}s;--kp-color:${color}">
      <div class="lp-kp-dot" style="background:${color}"></div><span>${kp}</span></div>`).join('')}
    </div>`;}
  if(layout==='grid'){return`<div class="lp-keypoints lp-kp-grid">
    ${kps.map((kp,i)=>{const wide=textLen(kp)>90;
      return`<div class="lp-kp-card${wide?' kp-full':''}" style="animation-delay:${i*0.06}s;--kp-color:${color}">
        <div class="lp-kp-num" style="background:${color};color:#fff">${i+1}</div><span>${kp}</span></div>`;
    }).join('')}</div>`;}
  if(layout==='cards'){const cardColors=[color,'#2196F3','#10B981','#F59E0B','#EC4899','#7C3AED'];
    return`<div class="lp-keypoints lp-kp-cards">
    ${kps.map((kp,i)=>{const c=cardColors[i%cardColors.length];
      return`<div class="lp-kp-ccard" style="--card-color:${c};animation-delay:${i*0.07}s">
        <div class="lp-kp-ccard-num">${i+1}</div>
        <div class="lp-kp-ccard-body">${kp}</div></div>`;
    }).join('')}</div>`;}
  return'';
}

function renderLessonImages(lesson,color){
  const imgs=(lesson.images||[]).filter(img=>img.src);
  if(!imgs.length)return'';
  return`<div class="lp-section">
    <div class="lp-section-header" style="--sec-color:${color}">
      <div class="lp-section-icon">🖼️</div><h2>صور الدرس</h2>
    </div>
    <div class="lp-img-gallery">
      ${imgs.map(img=>`<div class="lp-img-item">
        <img src="${img.src}" alt="${img.caption||''}" loading="lazy">
        ${img.caption?`<div class="lp-img-caption">${img.caption}</div>`:''}
      </div>`).join('')}
    </div>
  </div>`;
}
