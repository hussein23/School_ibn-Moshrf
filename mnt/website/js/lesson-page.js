let DEFAULT_SECTION_ORDER=["objectives","summary","keyPoints","images","questions"],SECTION_LABELS={objectives:"🎯 أهداف الدرس",summary:"📋 ملخص الدرس",keyPoints:"⚡ النقاط الرئيسية",images:"🖼️ صور الدرس",questions:"🎮 اختبر نفسك"};function _getSectionOrder(s){if(s.sectionOrder&&0<s.sectionOrder.length){let i=[...s.sectionOrder];return(s.customSections||[]).forEach(s=>{var e;i.includes(s.id)||(e=i.indexOf("questions"),i.splice(0<=e?e:i.length,0,s.id))}),i}let i=[...DEFAULT_SECTION_ORDER];return(s.customSections||[]).forEach(s=>{var e=i.indexOf("questions");i.splice(0<=e?e:i.length,0,s.id)}),i}function _renderSection(e,s,i,t,n,c){switch(e){case"objectives":return s.objectives&&s.objectives.length?`<div class="lp-section">
        <div class="lp-section-header" style="--sec-color:${n}">
          <div class="lp-section-icon">🎯</div><h2>أهداف الدرس</h2>
        </div>
        <div class="lp-objectives">
          ${s.objectives.map((s,e)=>`
            <div class="lp-obj-item" style="animation-delay:${.08*e}s">
              <div class="lp-obj-num" style="background:${n}20;color:${n}">${e+1}</div>
              <span>${s}</span>
            </div>`).join("")}
        </div>
      </div>`:"";case"summary":return s.summary?`<div class="lp-section">
        <div class="lp-section-header" style="--sec-color:${n}">
          <div class="lp-section-icon">📋</div><h2>ملخص الدرس</h2>
        </div>
        <div class="lp-summary" style="border-right-color:${n}">${s.summary}</div>
      </div>`:"";case"keyPoints":return s.keyPoints&&s.keyPoints.length?`<div class="lp-section">
        <div class="lp-section-header" style="--sec-color:${n}">
          <div class="lp-section-icon">⚡</div><h2>النقاط الرئيسية</h2>
        </div>
        ${renderKeyPoints(s,n)}
      </div>`:"";case"images":return renderLessonImages(s,n);case"questions":return s.questions&&s.questions.length?`<div class="lp-section lp-quiz-section">
        <div class="lp-section-header" style="--sec-color:${n}">
          <div class="lp-section-icon">🎮</div>
          <h2>اختبر نفسك</h2>
          <span class="lp-quiz-count">${s.questions.length} أسئلة</span>
        </div>
        <p class="lp-quiz-intro">أجب على جميع الأسئلة ثم اضغط "تحقق من إجاباتي"</p>
        <div id="questions-container" class="questions-container">
          ${renderAllQuestions(s.questions,n)}
        </div>
        <button class="lp-check-btn" style="background:${n}"
                onclick="checkAllAnswers(${c})">
          ✅ تحقق من إجاباتي
        </button>
      </div>`:"";default:var l=(s.customSections||[]).find(s=>s.id===e);return l&&l.content?`<div class="lp-section">
        <div class="lp-section-header" style="--sec-color:${n}">
          <div class="lp-section-icon">${l.icon||"📌"}</div>
          <h2>${l.title||"قسم"}</h2>
        </div>
        <div class="lp-summary" style="border-right-color:${n}">${l.content}</div>
      </div>`:""}}function renderKeyPoints(s,t){var e=s.kpLayout||"list",s=s.keyPoints||[];if(!s.length)return'<p style="color:var(--text-light);text-align:center;padding:20px">لا توجد نقاط رئيسية</p>';if("list"===e)return`<div class="lp-keypoints lp-kp-list">
      ${s.map((s,e)=>`
        <div class="lp-kp-card" style="animation-delay:${.06*e}s;--kp-color:${t}">
          <div class="lp-kp-dot" style="background:${t}"></div>
          <span>${s}</span>
        </div>`).join("")}
    </div>`;if("grid"===e)return`<div class="lp-keypoints lp-kp-grid">
      ${s.map((s,e)=>`<div class="lp-kp-card${90<s.replace(/<[^>]*>/g,"").trim().length?" kp-full":""}" style="animation-delay:${.06*e}s;--kp-color:${t}">
          <div class="lp-kp-num" style="background:${t};color:#fff">${e+1}</div>
          <span>${s}</span>
        </div>`).join("")}
    </div>`;if("cards"!==e)return"";{let i=[t,"#2196F3","#10B981","#F59E0B","#EC4899","#7C3AED"];return`<div class="lp-keypoints lp-kp-cards">
      ${s.map((s,e)=>`<div class="lp-kp-ccard" style="--card-color:${i[e%i.length]};animation-delay:${.07*e}s">
          <div class="lp-kp-ccard-num">${e+1}</div>
          <div class="lp-kp-ccard-body">${s}</div>
        </div>`).join("")}
    </div>`}}function renderLessonImages(s,e){s=(s.images||[]).filter(s=>s.src);return s.length?`<div class="lp-section">
    <div class="lp-section-header" style="--sec-color:${e}">
      <div class="lp-section-icon">🖼️</div><h2>صور الدرس</h2>
    </div>
    <div class="lp-img-gallery">
      ${s.map(s=>`
        <div class="lp-img-item">
          <img src="${s.src}" alt="${s.caption||""}" loading="lazy">
          ${s.caption?`<div class="lp-img-caption">${s.caption}</div>`:""}
        </div>`).join("")}
    </div>
  </div>`:""}function _initLessonFocus(s){let t=[...document.querySelectorAll(".lp-focus-card")];if(t.length){var e=document.getElementById("lp-prog-dots");let i=document.getElementById("lp-prog-label");if(e&&(e.innerHTML=t.map((s,e)=>`<span class="lp-dot" id="lp-dot-${e}"></span>`).join("")),t.forEach(s=>s.classList.add("lp-sec-dimmed")),t[0]&&(t[0].classList.remove("lp-sec-dimmed"),t[0].classList.add("lp-sec-active"),_updateProgBar(t[0],0,i)),"IntersectionObserver"in window){window._lessonSecObs&&window._lessonSecObs.disconnect();let e=new IntersectionObserver(s=>{s.forEach(s=>{s.isIntersecting&&.2<=s.intersectionRatio&&(t.forEach(s=>{s.classList.add("lp-sec-dimmed"),s.classList.remove("lp-sec-active")}),s.target.classList.remove("lp-sec-dimmed"),s.target.classList.add("lp-sec-active"),_updateProgBar(s.target,+s.target.dataset.secIndex,i))})},{threshold:.2,rootMargin:"-8% 0px -42% 0px"});t.forEach(s=>e.observe(s)),window._lessonSecObs=e}}}function _updateProgBar(s,i,e){e&&(e.textContent=s.dataset.secLabel||""),document.querySelectorAll(".lp-dot").forEach((s,e)=>{s.classList.toggle("lp-dot-active",e===i)})}document.addEventListener("DOMContentLoaded",()=>{var s=new URLSearchParams(location.search),e=s.get("g");let i=s.get("s"),t=s.get("u"),n=s.get("l");if(window.FirebaseDB&&window.FirebaseDB.dbLoadCurriculum){let e=window.FirebaseDB.dbLoadCurriculum();e&&Object.keys(e).length&&Object.keys(e).forEach(s=>CURRICULUM[s]=e[s])}s=localStorage.getItem("ibn_moshrf_curriculum");if(s)try{let e=JSON.parse(s);Object.keys(e).forEach(s=>CURRICULUM[s]=e[s])}catch(s){}let c=CURRICULUM[e];s=c.semesters.find(s=>s.id===i);let l=s.units.find(s=>s.id===t),a=l.lessons.find(s=>s.id===n),o=(document.title=a.name+" - المهارات الرقمية",window._currentLessonId=n,window._currentLessonGrade=e,document.getElementById("breadcrumb").innerHTML=`
    <span class="bc-item" onclick="history.go(-2)" style="cursor:pointer">${s.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item" onclick="history.back()" style="cursor:pointer">${l.name}</span>
    <span class="bc-sep">›</span>
    <span class="bc-item bc-current">${a.name}</span>`,l.color),d=JSON.stringify(a.questions).replace(/"/g,"&quot;");e=_getSectionOrder(a).map((e,s)=>{var i,t=_renderSection(e,a,l,c,o,d);return t?(i=(a.customSections||[]).find(s=>s.id===e),i=SECTION_LABELS[e]||(i?`${i.icon||"📌"} `+(i.title||"قسم"):""),t.replace(/^<div class="(lp-section[^"]*)"/,`<div class="$1 lp-focus-card" data-sec-label="${i}" data-sec-index="${s}"`)):""}).join("");document.getElementById("main-content").innerHTML=`
    <button class="back-btn" onclick="history.back()" style="margin-bottom:20px">← رجوع</button>

    <!-- Hero -->
    <div class="lp-hero" style="background:linear-gradient(135deg,${o}dd 0%,${o} 100%)">
      <div class="lp-hero-bg">${l.icon}</div>
      <div class="lp-hero-content">
        <div class="lp-hero-meta">
          <span class="lp-meta-chip">${c.icon} ${c.name}</span>
          <span class="lp-meta-chip">${s.name}</span>
          <span class="lp-meta-chip">${l.icon} ${l.name}</span>
        </div>
        <h1 class="lp-hero-title">${a.name}</h1>
        <div class="lp-hero-stats">
          ${a.objectives&&a.objectives.length?`<div class="lp-stat"><span class="lp-stat-icon">🎯</span><span>${a.objectives.length} أهداف</span></div>`:""}
          ${a.keyPoints&&a.keyPoints.length?`<div class="lp-stat"><span class="lp-stat-icon">⚡</span><span>${a.keyPoints.length} نقطة</span></div>`:""}
          <div class="lp-stat"><span class="lp-stat-icon">🎮</span><span>${a.questions.length} سؤال</span></div>
        </div>
      </div>
    </div>

    <!-- شريط التقدم العائم -->
    <div id="lp-progress-bar" class="lp-progress-bar" style="--prog-color:${o}">
      <div class="lp-prog-inner">
        <div class="lp-prog-dots" id="lp-prog-dots"></div>
        <div class="lp-prog-label" id="lp-prog-label"></div>
      </div>
    </div>

    <!-- الأقسام بالترتيب المحدد -->
    ${e}
  `,setTimeout(()=>{initDragDrop(),_initLessonFocus(o)},120)});