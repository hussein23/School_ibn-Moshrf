let STORAGE_KEY="ibn_moshrf_curriculum",TEACHER_PIN_KEY="ibn_moshrf_teacher_pin",TEACHER_SESSION="ibn_moshrf_teacher_auth",PIN_SALT="ibn_teacher_2025",curriculum={},activeLesson=null,DEFAULT_SECTION_ORDER=["objectives","summary","keyPoints","images","questions"],BUILTIN_SECTIONS={objectives:{icon:"🎯",title:"الأهداف التعليمية"},summary:{icon:"📝",title:"ملخص الدرس"},keyPoints:{icon:"⚡",title:"النقاط الرئيسية"},images:{icon:"🖼️",title:"صور الدرس"},questions:{icon:"🎮",title:"الأسئلة التفاعلية"}};function _getLessonSectionOrder(e){if(e.sectionOrder&&0<e.sectionOrder.length){let s=[...e.sectionOrder];return(e.customSections||[]).forEach(e=>{var t;s.includes(e.id)||(t=s.indexOf("questions"),s.splice(0<=t?t:s.length,0,e.id))}),s}let s=[...DEFAULT_SECTION_ORDER];return(e.customSections||[]).forEach(e=>{var t=s.indexOf("questions");s.splice(0<=t?t:s.length,0,e.id)}),s}function renderSectionsOrderPanel(a){let o=_getLessonSectionOrder(a);return o.map((t,e)=>{var s=BUILTIN_SECTIONS[t],n=(a.customSections||[]).find(e=>e.id===t),i=s?s.icon:n?n.icon:"📌",n=s?s.title:n?n.title||"قسم بدون عنوان":t;return`
      <div class="so-item" id="so-${escHtml(t)}">
        <span class="so-drag">☰</span>
        <span class="so-icon">${i}</span>
        <span class="so-title">${escHtml(n)}</span>
        <div class="so-actions">
          <button class="kp-move-btn" title="تحريك لأعلى"
                  onclick="moveSectionOrder('${escHtml(t)}',-1)"
                  ${0===e?"disabled":""}>↑</button>
          <button class="kp-move-btn" title="تحريك لأسفل"
                  onclick="moveSectionOrder('${escHtml(t)}',1)"
                  ${e===o.length-1?"disabled":""}>↓</button>
          ${s?"":`<button class="kp-del-btn" title="حذف" onclick="removeSectionFromOrder('${escHtml(t)}')">✕</button>`}
        </div>
      </div>`}).join("")}function moveSectionOrder(e,t){var s=getLesson(activeLesson).lesson,n=_getLessonSectionOrder(s),e=n.indexOf(e),t=e+t;t<0||t>=n.length||([n[e],n[t]]=[n[t],n[e]],s.sectionOrder=n,_reRenderSectionsOrder())}function removeSectionFromOrder(t){var e=getLesson(activeLesson).lesson,s=_getLessonSectionOrder(e);e.sectionOrder=s.filter(e=>e!==t),e.customSections&&(e.customSections=e.customSections.filter(e=>e.id!==t)),renderLessonEditor()}function addSectionFromOrder(){var e=getLesson(activeLesson).lesson,t="cs_"+Date.now(),s=_getLessonSectionOrder(e),n=(e.customSections||(e.customSections=[]),e.customSections.push({id:t,title:"",icon:"📌",content:""}),s.indexOf("questions"));s.splice(0<=n?n:s.length,0,t),e.sectionOrder=s,renderLessonEditor(),setTimeout(()=>{var e=document.querySelectorAll("#custom-sections-list .cs-item-card"),e=e[e.length-1];e&&e.scrollIntoView({behavior:"smooth",block:"center"})},350)}function _reRenderSectionsOrder(){var e,t=document.getElementById("sections-order-list");t&&(e=getLesson(activeLesson).lesson,t.innerHTML=renderSectionsOrderPanel(e))}let qbState={};async function _hashPin(e){e=(new TextEncoder).encode(e+PIN_SALT),e=await crypto.subtle.digest("SHA-256",e);return Array.from(new Uint8Array(e)).map(e=>e.toString(16).padStart(2,"0")).join("")}function _isTeacherAuthed(){return"1"===sessionStorage.getItem(TEACHER_SESSION)}function showPinModal(){var e,t,s,n=document.getElementById("pin-overlay");n&&(e=localStorage.getItem(TEACHER_PIN_KEY),t=document.getElementById("pin-modal-title"),s=document.getElementById("pin-modal-hint"),e?(t&&(t.textContent="لوحة تحكم المعلم 🔒"),s&&(s.textContent="أدخل رمز الدخول للمتابعة")):(t&&(t.textContent="إنشاء رمز الدخول للمعلم"),s&&(s.textContent="أنشئ رمزاً سرياً (4 أحرف على الأقل) لحماية لوحة التحكم")),n.classList.remove("hidden"),setTimeout(()=>document.getElementById("pin-input")?.focus(),100))}let PIN_LOCK_KEY="ibn_pin_lockout",PIN_MAX_ATTEMPTS=5,PIN_LOCKOUT_MS=6e5;function _getPinLock(){try{return JSON.parse(sessionStorage.getItem(PIN_LOCK_KEY))||{attempts:0}}catch{return{attempts:0}}}function _savePinLock(e){sessionStorage.setItem(PIN_LOCK_KEY,JSON.stringify(e))}function _checkPinLock(){var e=_getPinLock();return e.until&&Date.now()<e.until?{locked:!0,msg:`تم تجميد الوصول لمدة ${Math.ceil((e.until-Date.now())/6e4)} دقيقة بعد محاولات خاطئة متكررة`}:{locked:!1,remaining:PIN_MAX_ATTEMPTS-(e.attempts||0)}}function _recordPinFail(){var e=_getPinLock();e.until&&Date.now()>=e.until&&(e.attempts=0,e.until=null),e.attempts=(e.attempts||0)+1,e.attempts>=PIN_MAX_ATTEMPTS&&(e.until=Date.now()+PIN_LOCKOUT_MS,e.attempts=0),_savePinLock(e)}function _clearPinLock(){sessionStorage.removeItem(PIN_LOCK_KEY)}async function submitPin(){var e=document.getElementById("pin-input"),t=document.getElementById("pin-error"),s=document.getElementById("pin-submit-btn"),n=(e?.value||"").trim(),i=_checkPinLock();i.locked?(t&&(t.textContent=i.msg,t.classList.remove("hidden")),e&&(e.disabled=!0),s&&(s.disabled=!0)):n.length<4?t&&(t.textContent="الرمز يجب أن يكون 4 أحرف على الأقل",t.classList.remove("hidden")):(s&&(s.disabled=!0),await new Promise(e=>setTimeout(e,600)),i=await _hashPin(n),s&&(s.disabled=!1),(n=localStorage.getItem(TEACHER_PIN_KEY))?i!==n?(_recordPinFail(),n=(s=_checkPinLock()).locked?s.msg:`رمز الدخول غير صحيح — ${s.remaining} محاولة متبقية`,t&&(t.textContent=n,t.classList.remove("hidden")),e&&(e.value="",e.focus())):(_clearPinLock(),document.getElementById("pin-overlay").classList.add("hidden"),sessionStorage.setItem(TEACHER_SESSION,"1"),_initDashboard()):(localStorage.setItem(TEACHER_PIN_KEY,i),document.getElementById("pin-overlay").classList.add("hidden"),sessionStorage.setItem(TEACHER_SESSION,"1"),_clearPinLock(),_initDashboard()))}function resetTeacherPin(){confirm("هل تريد إعادة تعيين رمز الدخول؟ ستحتاج لإنشاء رمز جديد في المرة القادمة.")&&(localStorage.removeItem(TEACHER_PIN_KEY),sessionStorage.removeItem(TEACHER_SESSION),location.reload())}function init(){if(_isTeacherAuthed())_initDashboard();else{try{var e=JSON.parse(localStorage.getItem("ibn_moshrf_teacher_quick")||"null");if(e&&e.ts&&Date.now()-e.ts<6e4)return localStorage.removeItem("ibn_moshrf_teacher_quick"),sessionStorage.setItem(TEACHER_SESSION,"1"),void _initDashboard()}catch(e){}showPinModal()}}function _initDashboard(){loadCurriculum(),renderSidebar(),renderStats();let t=window._onCurriculumUpdate;window._onCurriculumUpdate=function(e){t&&t(e),curriculum=deepClone(e),renderSidebar(),renderStats(),activeLesson||showOverview(),setSaveStatus("☁️ تم التزامن مع Firebase")}}function loadCurriculum(){var e=window.FirebaseDB&&window.FirebaseDB.dbLoadCurriculum?window.FirebaseDB.dbLoadCurriculum():null;if(e){curriculum=deepClone(e);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(curriculum))}catch(e){}setSaveStatus("☁️ تم التزامن مع Firebase")}else{e=localStorage.getItem(STORAGE_KEY);if(e)try{curriculum=JSON.parse(e),setSaveStatus("✅ بيانات معدّلة محلياً")}catch{curriculum=deepClone(CURRICULUM)}else curriculum=deepClone(CURRICULUM),setSaveStatus("✅ البيانات الأصلية")}}function saveCurriculum(){localStorage.setItem(STORAGE_KEY,JSON.stringify(curriculum)),window.FirebaseDB&&window.FirebaseDB.dbSaveCurriculum?window.FirebaseDB.isFirebaseActive&&window.FirebaseDB.isFirebaseActive()?(setSaveStatus("☁️ يتم الرفع…"),window.FirebaseDB.dbSaveCurriculum(curriculum,function(){setSaveStatus("✅ محفوظ للجميع ☁️"),showToast("✅ تم الحفظ — سيظهر لجميع الأجهزة")},function(e){setSaveStatus("⚠️ فشل الرفع"),showToast("⚠️ لم يُرفع إلى Firebase: "+(e&&e.message||e)),console.error("curriculum save error:",e)})):(window.FirebaseDB.dbSaveCurriculum(curriculum),setSaveStatus("⚠️ محفوظ محلياً فقط (Firebase غير متصل)"),showToast("⚠️ Firebase غير متصل — الحفظ محلي فقط")):(setSaveStatus("✅ تم الحفظ"),showToast("✅ تم الحفظ بنجاح"))}function resetToDefault(){showConfirm("سيتم مسح جميع التعديلات والعودة للبيانات الأصلية. هل أنت متأكد؟",()=>{localStorage.removeItem(STORAGE_KEY),curriculum=deepClone(CURRICULUM),saveCurriculum(),activeLesson=null,renderSidebar(),renderStats(),showOverview(),showToast("↺ تمت الاستعادة للبيانات الأصلية")})}function setSaveStatus(e){document.getElementById("save-status").textContent=e}function renderSidebar(){document.getElementById("sidebar-tree").innerHTML=Object.values(curriculum).map(e=>renderGradeNode(e)).join("")}function renderGradeNode(t){t.id.replace("grade","");return`
    <div class="tree-grade" id="tree-${t.id}">
      <div class="tree-grade-label" onclick="toggleNode('tree-${t.id}')">
        <span class="grade-dot" style="background:${t.color}"></span>
        <span>${t.icon} ${t.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-grade-children">
        ${t.semesters.map(e=>renderSemNode(t,e)).join("")}
      </div>
    </div>`}function renderSemNode(t,s){var e=`tree-${t.id}-`+s.id;return`
    <div class="tree-sem" id="${e}">
      <div class="tree-sem-label" onclick="toggleNode('${e}')">
        <span>📅</span>
        <span>${s.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-sem-children">
        ${s.units.map(e=>renderUnitNode(t,s,e)).join("")}
      </div>
    </div>`}function renderUnitNode(t,s,n){var e="tree-"+n.id;return`
    <div class="tree-unit" id="${e}">
      <div class="tree-unit-label" onclick="toggleNode('${e}')">
        <span>${n.icon}</span>
        <span>${n.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-unit-children">
        ${n.lessons.map(e=>renderLessonNode(t,s,n,e)).join("")}
      </div>
    </div>`}function renderLessonNode(e,t,s,n){return`
    <div class="tree-lesson-item ${activeLesson&&activeLesson.lessonId===n.id?"active":""}"
         id="tree-lesson-${n.id}"
         onclick="selectLesson('${e.id}','${t.id}','${s.id}','${n.id}')">
      📄 ${n.name}
    </div>`}function toggleNode(e){e=document.getElementById(e);e&&e.classList.toggle("open")}function filterSidebar(e){let s=e.trim().toLowerCase();document.querySelectorAll(".tree-lesson-item").forEach(e=>{var t=!s||e.textContent.toLowerCase().includes(s);e.style.display=t?"":"none"}),s&&document.querySelectorAll(".tree-grade, .tree-sem, .tree-unit").forEach(e=>e.classList.add("open"))}function renderStats(){var e=document.getElementById("stats-grid");let i=0,a=0;var t=Object.values(curriculum).map((e,t)=>{var s=e.semesters.reduce((e,t)=>e+t.units.reduce((e,t)=>e+t.lessons.length,0),0),n=e.semesters.reduce((e,t)=>e+t.units.reduce((e,t)=>e+t.lessons.reduce((e,t)=>e+t.questions.length,0),0),0);return i+=s,a+=n,`
      <div class="stat-card" style="border-color:${e.color}">
        <div class="stat-card-num" style="color:${e.color}">${s}</div>
        <div class="stat-card-label">${e.icon} ${e.name} — ${n} سؤال</div>
      </div>`});t.unshift(`
    <div class="stat-card" style="border-color:#22C55E">
      <div class="stat-card-num" style="color:#22C55E">${i}</div>
      <div class="stat-card-label">📚 إجمالي الدروس</div>
    </div>
    <div class="stat-card" style="border-color:#3B82F6">
      <div class="stat-card-num" style="color:#3B82F6">${a}</div>
      <div class="stat-card-label">❓ إجمالي الأسئلة</div>
    </div>`),e.innerHTML=t.join("")}function showOverview(){document.getElementById("overview-panel").classList.remove("hidden"),document.getElementById("lesson-editor").classList.add("hidden"),document.getElementById("student-panel").classList.add("hidden"),document.getElementById("teacher-account-panel").classList.add("hidden")}function showStudentPanel(){document.getElementById("overview-panel").classList.add("hidden"),document.getElementById("lesson-editor").classList.add("hidden"),document.getElementById("student-panel").classList.remove("hidden"),document.getElementById("teacher-account-panel").classList.add("hidden"),renderStudentPanel()}function showTeacherAccountPanel(){document.getElementById("overview-panel").classList.add("hidden"),document.getElementById("lesson-editor").classList.add("hidden"),document.getElementById("student-panel").classList.add("hidden"),document.getElementById("teacher-account-panel").classList.remove("hidden"),renderTeacherAccountPanel()}function renderTeacherAccountPanel(){var e,t=document.getElementById("teacher-account-panel");t&&(e=window.StudentAuth&&window.StudentAuth.getTeacherAccount?window.StudentAuth.getTeacherAccount():null,t.innerHTML=`
    <div class="sp-header">
      <h2 class="sp-title">👨‍🏫 حساب المعلم على الموقع</h2>
      <p class="sp-subtitle">أنشئ حساباً خاصاً للمعلم على الموقع الرئيسي — عند تسجيل الدخول بهذا الحساب ستظهر زر الانتقال المباشر للوحة التحكم</p>
    </div>
    <div class="sp-content">
      <div class="field-group" style="max-width:420px;margin:0 auto">
        ${e?`<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 16px;margin-bottom:18px;font-size:14px;color:#166534">
          ✅ يوجد حساب معلم حالياً — الاسم: <strong>${e.username}</strong><br>
          <small style="opacity:.8">يمكنك تحديثه بإدخال بيانات جديدة أدناه</small>
        </div>`:`<div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:14px 16px;margin-bottom:18px;font-size:14px;color:#713f12">
          ⚠️ لا يوجد حساب معلم بعد — أنشئه الآن
        </div>`}
        <div class="field-row" style="margin-bottom:14px">
          <label class="field-label">اسم المستخدم (للمعلم)</label>
          <input class="field-input" id="ta-username" type="text" placeholder="مثال: teacher2025" value="${e?e.username:""}">
        </div>
        <div class="field-row" style="margin-bottom:14px">
          <label class="field-label">كلمة المرور الجديدة</label>
          <input class="field-input" id="ta-password" type="password" placeholder="أدخل كلمة مرور قوية">
        </div>
        <div class="field-row" style="margin-bottom:20px">
          <label class="field-label">تأكيد كلمة المرور</label>
          <input class="field-input" id="ta-password2" type="password" placeholder="أعد إدخال كلمة المرور">
        </div>
        <div id="ta-msg" style="display:none;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:14px"></div>
        <button class="btn btn-primary" onclick="saveTeacherAccount()" style="width:100%">💾 حفظ حساب المعلم</button>
      </div>
    </div>`)}async function saveTeacherAccount(){var e=(document.getElementById("ta-username").value||"").trim(),t=(document.getElementById("ta-password").value||"").trim(),s=(document.getElementById("ta-password2").value||"").trim();let n=document.getElementById("ta-msg");function i(e,t){n.textContent=e,n.style.display="block",n.style.background=t?"#f0fdf4":"#fef2f2",n.style.color=t?"#166534":"#991b1b",n.style.border="1px solid "+(t?"#86efac":"#fca5a5")}return e?t?t!==s?i("⚠️ كلمتا المرور غير متطابقتين",!1):t.length<4?i("⚠️ كلمة المرور يجب أن تكون 4 أحرف على الأقل",!1):void(window.StudentAuth&&window.StudentAuth.setTeacherAccount&&(await window.StudentAuth.setTeacherAccount(e,t),i("✅ تم حفظ حساب المعلم بنجاح! يمكنك الآن تسجيل الدخول من الموقع الرئيسي",!0),document.getElementById("ta-password").value="",document.getElementById("ta-password2").value="",setTimeout(renderTeacherAccountPanel,1500))):i("⚠️ يرجى إدخال كلمة المرور",!1):i("⚠️ يرجى إدخال اسم المستخدم",!1)}let _spFilter={grade:"all",category:"all",sort:"points"};function renderStudentPanel(){var e=document.getElementById("student-panel");if(window.StudentAuth){let d={grade4:"الصف الرابع",grade5:"الصف الخامس",grade6:"الصف السادس"},r={grade4:"#FF6B35",grade5:"#2196F3",grade6:"#7C3AED"},c={grade4:"🟠",grade5:"🔵",grade6:"🟣"},u={excellent:"🌟 متفوق",good:"👍 جيد",normal:"📘 عادي",needs_help:"⚠️ يحتاج دعم"},m={excellent:"#16a34a",good:"#2196F3",normal:"#64748b",needs_help:"#ef4444"};var s=StudentAuth.getAllStudents(),n=(s.forEach(e=>{var t=e.points||0,s=Object.keys(e.lessons||{}).length;e.category&&"normal"!==e.category||(e.category=200<=t||10<=s?"excellent":100<=t||5<=s?"good":0===t&&0===s?"needs_help":"normal")}),s.filter(e=>!("all"!==_spFilter.grade&&e.grade!==_spFilter.grade||"all"!==_spFilter.category&&(e.category||"normal")!==_spFilter.category))),i=("points"===_spFilter.sort&&n.sort((e,t)=>(t.points||0)-(e.points||0)),"visits"===_spFilter.sort&&n.sort((e,t)=>(t.visitCount||0)-(e.visitCount||0)),"attempts"===_spFilter.sort&&n.sort((e,t)=>(t.attemptCount||0)-(e.attemptCount||0)),"lessons"===_spFilter.sort&&n.sort((e,t)=>Object.keys(t.lessons||{}).length-Object.keys(e.lessons||{}).length),"name"===_spFilter.sort&&n.sort((e,t)=>e.username.localeCompare(t.username,"ar")),s.reduce((e,t)=>e+(t.points||0),0)),a=s.filter(e=>"excellent"===e.category).length,o=s.filter(e=>"needs_help"===e.category).length;let t={grade4:0,grade5:0,grade6:0};s.forEach(e=>{void 0!==t[e.grade]&&t[e.grade]++}),e.innerHTML=`
    <div class="sp-dash-header">
      <div>
        <h2 class="sp-dash-title">👥 إدارة الطلاب</h2>
        <p class="sp-dash-sub">${s.length} طالب مسجّل · إجمالي النقاط: ${i}</p>
      </div>
      <button class="back-overview-btn" onclick="showOverview()">← رجوع</button>
    </div>

    <!-- إحصائيات سريعة -->
    <div class="sp-stats-row">
      <div class="sp-stat-chip" style="background:#FFF7ED;color:#C2410C">
        🟠 ${t.grade4} رابع &nbsp;|&nbsp; 🔵 ${t.grade5} خامس &nbsp;|&nbsp; 🟣 ${t.grade6} سادس
      </div>
      <div class="sp-stat-chip" style="background:#F0FDF4;color:#15803D">
        🌟 ${a} متفوق
      </div>
      <div class="sp-stat-chip" style="background:#FFF1F2;color:#B91C1C">
        ⚠️ ${o} يحتاج دعم
      </div>
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

    <!-- فلاتر وترتيب -->
    <div class="editor-card">
      <div class="editor-card-title">🏆 لوحة الشرف — قائمة الطلاب</div>
      <div class="sp-filters-row">
        <div class="field-group" style="flex:1;min-width:140px">
          <label class="field-label">الصف</label>
          <select class="field-input sp-filter-sel" onchange="_spFilter.grade=this.value;renderStudentPanel()">
            <option value="all"    ${"all"===_spFilter.grade?"selected":""}>كل الصفوف</option>
            <option value="grade4" ${"grade4"===_spFilter.grade?"selected":""}>🟠 الصف الرابع</option>
            <option value="grade5" ${"grade5"===_spFilter.grade?"selected":""}>🔵 الصف الخامس</option>
            <option value="grade6" ${"grade6"===_spFilter.grade?"selected":""}>🟣 الصف السادس</option>
          </select>
        </div>
        <div class="field-group" style="flex:1;min-width:160px">
          <label class="field-label">التصنيف</label>
          <select class="field-input sp-filter-sel" onchange="_spFilter.category=this.value;renderStudentPanel()">
            <option value="all"       ${"all"===_spFilter.category?"selected":""}>كل التصنيفات</option>
            <option value="excellent" ${"excellent"===_spFilter.category?"selected":""}>🌟 متفوق</option>
            <option value="good"      ${"good"===_spFilter.category?"selected":""}>👍 جيد</option>
            <option value="normal"    ${"normal"===_spFilter.category?"selected":""}>📘 عادي</option>
            <option value="needs_help"${"needs_help"===_spFilter.category?"selected":""}>⚠️ يحتاج دعم</option>
          </select>
        </div>
        <div class="field-group" style="flex:1;min-width:160px">
          <label class="field-label">الترتيب حسب</label>
          <select class="field-input sp-filter-sel" onchange="_spFilter.sort=this.value;renderStudentPanel()">
            <option value="points"   ${"points"===_spFilter.sort?"selected":""}>⭐ النقاط</option>
            <option value="lessons"  ${"lessons"===_spFilter.sort?"selected":""}>📚 الدروس</option>
            <option value="visits"   ${"visits"===_spFilter.sort?"selected":""}>👁 الزيارات</option>
            <option value="attempts" ${"attempts"===_spFilter.sort?"selected":""}>🎯 المحاولات</option>
            <option value="name"     ${"name"===_spFilter.sort?"selected":""}>🔤 الاسم</option>
          </select>
        </div>
        <div class="field-group" style="flex:0;padding-top:24px">
          <button class="sp-reset-filter-btn" onclick="_spFilter={grade:'all',category:'all',sort:'points'};renderStudentPanel()">↺ إعادة تعيين</button>
        </div>
      </div>

      ${0===n.length?'<div class="sp-empty">لا يوجد طلاب بهذه الفلترة</div>':`<div class="sp-table-wrap">
            <table class="sp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم</th>
                  <th>الصف</th>
                  <th>التصنيف</th>
                  <th>كلمة المرور</th>
                  <th>النقاط ⭐</th>
                  <th>دروس 📚</th>
                  <th>زيارات 👁</th>
                  <th>محاولات 🎯</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                ${n.map((e,t)=>{var t=0===t?"🥇":1===t?"🥈":2===t?"🥉":""+(t+1),s=r[e.grade]||"#64748B",n=c[e.grade]||"📚",i=d[e.grade]||e.grade,a=Object.keys(e.lessons||{}).length,o=e.category||"normal",l=(u,m[o]||"#64748b");return`
                    <tr>
                      <td class="sp-rank">${t}</td>
                      <td class="sp-student-name">${escHtml(e.username)}</td>
                      <td><span class="sp-grade-badge" style="background:${s}20;color:${s}">${n} ${i}</span></td>
                      <td>
                        <select class="sp-cat-sel" style="color:${l}"
                                onchange="setStudentCategory('${escHtml(e.id)}', this.value)">
                          <option value="excellent" ${"excellent"===o?"selected":""}>🌟 متفوق</option>
                          <option value="good"      ${"good"===o?"selected":""}>👍 جيد</option>
                          <option value="normal"    ${"normal"===o?"selected":""}>📘 عادي</option>
                          <option value="needs_help"${"needs_help"===o?"selected":""}>⚠️ يحتاج دعم</option>
                        </select>
                      </td>
                      <td class="sp-pass-cell">
                        <span class="sp-pass-dots" id="pd-${escHtml(e.id)}">••••</span>
                        <button class="sp-show-pass" onclick="togglePass('${escHtml(e.id)}')" title="كلمة المرور مشفرة">🔒</button>
                      </td>
                      <td class="sp-pts-cell">${e.points||0}</td>
                      <td class="sp-lc-cell">${a}</td>
                      <td class="sp-lc-cell">${e.visitCount||0}</td>
                      <td class="sp-lc-cell">${e.attemptCount||0}</td>
                      <td class="sp-actions-cell">
                        <button class="sp-reset-btn" onclick="resetStudentFromDash('${escHtml(e.id)}')" title="صفر النقاط">🔄 صفر</button>
                        <button class="sp-del-btn"   onclick="deleteStudentFromDash('${escHtml(e.id)}')" title="حذف الطالب">🗑</button>
                      </td>
                    </tr>`}).join("")}
              </tbody>
            </table>
          </div>`}
    </div>
  `}}function setStudentCategory(e,t){window.StudentAuth&&(StudentAuth.updateStudent(e,{category:t}),showToast("✅ تم تحديث تصنيف الطالب"))}async function addStudentFromDash(){var e=document.getElementById("sp-new-name").value,t=document.getElementById("sp-new-grade").value,s=document.getElementById("sp-new-pass").value,n=document.getElementById("sp-add-error"),i=document.querySelector(".sp-add-btn");window.StudentAuth&&(i&&(i.disabled=!0),e=await StudentAuth.addStudent(e,t,s),i&&(i.disabled=!1),e.ok?(n.classList.add("hidden"),document.getElementById("sp-new-name").value="",document.getElementById("sp-new-grade").value="",document.getElementById("sp-new-pass").value="",showToast("✅ تم إضافة الطالب: "+e.student.username),renderStudentPanel()):(n.textContent=e.msg,n.classList.remove("hidden")))}function deleteStudentFromDash(e){showConfirm("سيتم حذف الطالب ونقاطه نهائياً. هل أنت متأكد؟",()=>{StudentAuth.deleteStudent(e),showToast("🗑 تم حذف الطالب"),renderStudentPanel()})}function resetStudentFromDash(e){showConfirm("سيتم تصفير نقاط الطالب وسجل الدروس. هل أنت متأكد؟",()=>{StudentAuth.resetPoints(e),showToast("🔄 تم تصفير النقاط"),renderStudentPanel()})}function togglePass(e){let t=document.getElementById("pd-"+e);t&&"••••"===t.textContent&&(t.textContent="🔒 مشفرة",setTimeout(()=>{t.textContent="••••"},2e3))}let _TMC_CONFIG={directionality:"rtl",menubar:"edit insert format tools table",plugins:"advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount emoticons codesample quickbars",toolbar1:"undo redo | styles | bold italic underline strikethrough | forecolor backcolor",toolbar2:"alignright aligncenter alignleft alignjustify | bullist numlist outdent indent | blockquote | link image media table charmap emoticons codesample | searchreplace fullscreen code | removeformat | tmc_video",toolbar_mode:"wrap",quickbars_selection_toolbar:"bold italic underline | forecolor backcolor | quicklink blockquote",quickbars_insert_toolbar:!1,image_advtab:!0,automatic_uploads:!1,file_picker_types:"image",file_picker_callback:function(s,e,t){var n=document.createElement("input");n.setAttribute("type","file"),n.setAttribute("accept","image/*"),n.onchange=function(){let e=this.files[0],t=new FileReader;t.onload=function(){s(t.result,{title:e.name})},t.readAsDataURL(e)},n.click()},images_upload_handler:function(e){return Promise.resolve("data:"+e.blob().type+";base64,"+e.base64())},media_live_embeds:!0,media_alt_source:!1,table_default_styles:{"border-collapse":"collapse",width:"100%"},codesample_languages:[{text:"HTML/XML",value:"markup"},{text:"JavaScript",value:"javascript"},{text:"Python",value:"python"},{text:"CSS",value:"css"}],skin:"oxide",content_css:"default",content_style:['@font-face{font-family:ThmanyahSans;src:url("/fonts/thmanyahsans-Light.woff2") format("woff2");font-weight:300;font-display:swap}','@font-face{font-family:ThmanyahSans;src:url("/fonts/thmanyahsans-Regular.woff2") format("woff2");font-weight:400;font-display:swap}','@font-face{font-family:ThmanyahSans;src:url("/fonts/thmanyahsans-Medium.woff2") format("woff2");font-weight:500;font-display:swap}','@font-face{font-family:ThmanyahSans;src:url("/fonts/thmanyahsans-Bold.woff2") format("woff2");font-weight:700;font-display:swap}','@font-face{font-family:ThmanyahSans;src:url("/fonts/thmanyahsans-Black.woff2") format("woff2");font-weight:900;font-display:swap}',"body{font-family:ThmanyahSans,sans-serif;font-size:14px;","direction:rtl;text-align:right;color:#1e293b;line-height:1.8;padding:8px 12px}","img{max-width:100%;height:auto;border-radius:6px}","table{border-collapse:collapse;width:100%}","td,th{border:1px solid #cbd5e1;padding:8px 12px}","th{background:#f1f5f9;font-weight:700}","pre{background:#1e293b;color:#e2e8f0;padding:12px;border-radius:6px;font-size:13px;overflow-x:auto}","blockquote{border-right:4px solid #6366f1;margin:0;padding:8px 16px;background:#f8fafc;color:#475569}"].join(""),branding:!1,promotion:!1,resize:!0,statusbar:!0,setup:function(n){n.ui.registry.addButton("tmc_video",{icon:"embed",tooltip:"إدراج فيديو (YouTube / Google Drive / MP4)",onAction:function(){var t=prompt("أدخل رابط الفيديو (YouTube أو Google Drive أو .mp4):","");if(t){let e="";var s=t.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);s?e='<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;margin:12px 0"><iframe src="https://www.youtube.com/embed/'+s[1]+'" style="position:absolute;top:0;right:0;width:100%;height:100%;border:0" allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe></div>':t.includes("drive.google.com")?(s=(t.match(/\/d\/([\w-]+)/)||t.match(/id=([\w-]+)/)||[])[1])&&(e='<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;margin:12px 0"><iframe src="https://drive.google.com/file/d/'+s+'/preview" style="position:absolute;top:0;right:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>'):/\.(mp4|webm|ogg)(\?|$)/i.test(t)&&(e='<video controls style="width:100%;border-radius:10px;margin:12px 0"><source src="'+t+'"></video>'),e?n.insertContent(e):alert("رابط غير مدعوم. استخدم YouTube أو Google Drive أو رابط .mp4 مباشر")}}})}};function initTinyMCE(t){"undefined"==typeof tinymce?console.warn("[TinyMCE] المكتبة لم تُحمَّل بعد"):document.querySelectorAll(".tmc-target:not([data-tmc-init])").forEach(function(e){e.setAttribute("data-tmc-init","1"),tinymce.init(Object.assign({},_TMC_CONFIG,{target:e,min_height:t||160}))})}function destroyTMC(e){var t;"undefined"!=typeof tinymce&&((t=tinymce.get(e))&&t.remove(),t=document.getElementById(e))&&t.removeAttribute("data-tmc-init")}function destroyAllTMC(e){"undefined"!=typeof tinymce&&(e="string"==typeof e?document.querySelector(e):e)&&e.querySelectorAll(".tmc-target[data-tmc-init]").forEach(function(e){var t=tinymce.get(e.id);t&&t.remove(),e.removeAttribute("data-tmc-init")})}function getCKData(e){var t;return"undefined"==typeof tinymce?"":(t=tinymce.get(e))?t.getContent():document.getElementById(e)?.value||""}function renderRichEditor(e,t,s,n){return`<textarea class="tmc-target" id="${t}"
    style="min-height:${s||80}px"
    placeholder="${n||"اكتب هنا..."}">${e||""}</textarea>`}function selectLesson(t,e,s,n){activeLesson={gradeId:t,semId:e,unitId:s,lessonId:n},document.querySelectorAll(".tree-lesson-item").forEach(e=>e.classList.remove("active"));t=document.getElementById("tree-lesson-"+n);if(t){t.classList.add("active");let e=t.parentElement;for(;e;)(e.classList.contains("tree-unit")||e.classList.contains("tree-sem")||e.classList.contains("tree-grade"))&&e.classList.add("open"),e=e.parentElement}document.getElementById("student-panel").classList.add("hidden"),renderLessonEditor()}function getLesson(t){var e=curriculum[t.gradeId],s=e.semesters.find(e=>e.id===t.semId),n=s.units.find(e=>e.id===t.unitId),i=n.lessons.find(e=>e.id===t.lessonId);return{grade:e,sem:s,unit:n,lesson:i}}function renderLessonEditor(){let{grade:e,sem:t,unit:s,lesson:n}=getLesson(activeLesson);var i=document.getElementById("lesson-editor");destroyAllTMC(i),document.getElementById("overview-panel").classList.add("hidden"),i.classList.remove("hidden"),i.innerHTML=`
    <!-- شريط المسار -->
    <div class="editor-breadcrumb">
      <span onclick="showOverview()">🏠 الرئيسية</span>
      <span class="sep">›</span>
      <span>${e.icon} ${e.name}</span>
      <span class="sep">›</span>
      <span>${t.name}</span>
      <span class="sep">›</span>
      <span style="color:${s.color}">${s.icon} ${s.name}</span>
      <span class="sep">›</span>
      <span style="font-weight:700">${n.name}</span>
    </div>

    <!-- ترتيب الأقسام -->
    <div class="editor-card so-card">
      <div class="editor-card-title">📋 ترتيب أقسام الدرس
        <span class="so-hint">اضغط ↑↓ لتغيير الترتيب — سيظهر هكذا في صفحة الدرس</span>
      </div>
      <div class="so-list" id="sections-order-list">
        ${renderSectionsOrderPanel(n)}
      </div>
      <button class="add-item-btn" onclick="addSectionFromOrder()" style="margin-top:10px">+ إضافة قسم مخصص</button>
    </div>

    <!-- اسم الدرس -->
    <div class="editor-card">
      <div class="editor-card-title">✏️ معلومات الدرس</div>
      <div class="field-group">
        <label class="field-label">اسم الدرس</label>
        <input class="field-input" id="f-name" value="${escHtml(n.name)}">
      </div>
      <div class="field-group">
        <label class="field-label">ملخص الدرس</label>
        ${renderRichEditor(n.summary,"f-summary",120,"اكتب ملخص الدرس هنا — يمكنك التنسيق بالخطوط والألوان...")}
      </div>
    </div>

    <!-- الأهداف -->
    <div class="editor-card">
      <div class="editor-card-title">🎯 أهداف الدرس</div>
      <div class="list-editor" id="objectives-list">
        ${n.objectives.map((e,t)=>`
          <div class="list-item-row">
            <textarea oninput="updateObjective(${t}, this.value)">${escHtml(e)}</textarea>
            <button class="list-item-del" onclick="deleteObjective(${t})">✕</button>
          </div>`).join("")}
      </div>
      <button class="add-item-btn" onclick="addObjective()" style="margin-top:8px">+ إضافة هدف</button>
    </div>

    <!-- النقاط الرئيسية -->
    <div class="editor-card">
      <div class="editor-card-title">
        ⚡ النقاط الرئيسية
        <div class="kp-layout-toggle">
          <button class="kp-lt-btn ${n.kpLayout&&"list"!==n.kpLayout?"":"kp-lt-active"}"
                  title="قائمة عمودية" onclick="setKpLayout('list')">☰ قائمة</button>
          <button class="kp-lt-btn ${"grid"===n.kpLayout?"kp-lt-active":""}"
                  title="شبكة تلقائية — قصير جنباً طويل بعرض كامل" onclick="setKpLayout('grid')">⊞ شبكة</button>
          <button class="kp-lt-btn ${"cards"===n.kpLayout?"kp-lt-active":""}"
                  title="بطاقات ملونة" onclick="setKpLayout('cards')">🃏 بطاقات</button>
        </div>
      </div>
      <div class="kp-list" id="keypoints-list">
        ${n.keyPoints.map((e,t)=>renderKPItem(e,t,n.keyPoints.length)).join("")}
      </div>
      <button class="add-item-btn" onclick="addKeyPoint()" style="margin-top:12px">+ إضافة نقطة</button>
    </div>

    <!-- الصور -->
    <div class="editor-card">
      <div class="editor-card-title">🖼️ صور الدرس</div>
      <div class="img-editor-grid" id="images-list">
        ${(n.images||[]).map((e,t)=>renderImageItem(e,t)).join("")}
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
        ${(n.customSections||[]).map((e,t)=>renderCSItem(e,t,(n.customSections||[]).length)).join("")}
      </div>
      <button class="add-item-btn" onclick="addCustomSection()" style="margin-top:12px">+ إضافة قسم جديد</button>
    </div>

    <!-- الأسئلة -->
    <div class="editor-card">
      <div class="questions-header">
        <span class="questions-title">🎮 الأسئلة (${n.questions.length})</span>
        <button class="add-question-btn" onclick="openQuestionBuilder()">➕ إضافة سؤال</button>
      </div>
      <div class="questions-list" id="questions-list">
        ${renderQuestionsList(n.questions)}
      </div>
    </div>

    <!-- شريط الحفظ -->
    <div class="editor-save-bar">
      <button class="delete-lesson-btn" onclick="deleteLesson()">🗑 حذف الدرس</button>
      <button class="save-lesson-btn" onclick="saveLessonChanges()">💾 حفظ التعديلات</button>
    </div>
  `,setTimeout(()=>initTinyMCE(160),100),setTimeout(()=>_initCardFocus(),200)}function _initCardFocus(){let s=document.querySelectorAll("#lesson-editor .editor-card");if(s.length&&"IntersectionObserver"in window){window._cardFocusObserver&&(window._cardFocusObserver.disconnect(),window._cardFocusObserver=null),s.forEach(e=>e.classList.add("card-dimmed")),s[0]&&s[0].classList.remove("card-dimmed");let t=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&.25<=e.intersectionRatio&&(s.forEach(e=>e.classList.add("card-dimmed")),e.target.classList.remove("card-dimmed"))})},{threshold:.25,rootMargin:"-5% 0px -45% 0px"});s.forEach(e=>t.observe(e)),window._cardFocusObserver=t}}function renderQuestionsList(e){if(!e.length)return'<div class="empty-questions">لا توجد أسئلة بعد — أضف سؤالاً الآن</div>';let s={mcq:"MCQ",tf:"صح/خطأ",match:"وصل",fill:"أملأ الفراغ"},n={mcq:"badge-mcq",tf:"badge-tf",match:"badge-match",fill:"badge-fill"};return e.map((e,t)=>`
    <div class="q-item">
      <span class="q-type-badge ${n[e.type]||""}">${s[e.type]||e.type}</span>
      <span class="q-text">${escHtml(e.question)}</span>
      <div class="q-actions">
        <button class="q-btn q-btn-edit" onclick="editQuestion(${t})" title="تعديل">✏️</button>
        <button class="q-btn q-btn-del" onclick="deleteQuestion(${t})" title="حذف">🗑</button>
      </div>
    </div>`).join("")}function renderKPItem(e,t,s){return`
    <div class="kp-item-card" id="kp-card-${t}">
      <div class="kp-item-header">
        <span class="kp-num">نقطة ${t+1}</span>
        <div class="kp-item-actions">
          <button class="kp-move-btn" title="تحريك لأعلى"
                  onclick="moveKeyPoint(${t}, -1)" ${0===t?"disabled":""}>↑</button>
          <button class="kp-move-btn" title="تحريك لأسفل"
                  onclick="moveKeyPoint(${t}, 1)" ${t===s-1?"disabled":""}>↓</button>
          <button class="kp-del-btn" title="حذف" onclick="deleteKeyPoint(${t})">✕</button>
        </div>
      </div>
      ${renderRichEditor(e,"kp-re-"+t,60,"اكتب النقطة هنا...")}
    </div>`}function updateObjective(e,t){var s=getLesson(activeLesson).lesson;s.objectives[e]=t}function deleteObjective(e){var t=getLesson(activeLesson).lesson;t.objectives.splice(e,1),renderLessonEditor()}function addObjective(){var e=getLesson(activeLesson).lesson,e=(e.objectives.push(""),renderLessonEditor(),document.querySelectorAll("#objectives-list textarea"));e.length&&e[e.length-1].focus()}function deleteKeyPoint(e){_syncKPFromDOM();var t=getLesson(activeLesson).lesson;t.keyPoints.splice(e,1),renderLessonEditor()}function addKeyPoint(){_syncKPFromDOM();let t=getLesson(activeLesson).lesson;t.keyPoints.push(""),renderLessonEditor(),setTimeout(()=>{var e=t.keyPoints.length-1,e="undefined"!=typeof tinymce?tinymce.get("kp-re-"+e):null;e&&e.focus()},400)}function moveKeyPoint(e,t){_syncKPFromDOM();var s=getLesson(activeLesson).lesson;let n=e+t;n<0||n>=s.keyPoints.length||([s.keyPoints[e],s.keyPoints[n]]=[s.keyPoints[n],s.keyPoints[e]],renderLessonEditor(),setTimeout(()=>{var e="undefined"!=typeof tinymce?tinymce.get("kp-re-"+n):null;e&&e.focus()},400))}function setKpLayout(e){_syncKPFromDOM();var t=getLesson(activeLesson).lesson;t.kpLayout=e,renderLessonEditor()}function _syncKPFromDOM(){if(activeLesson){var t=getLesson(activeLesson).lesson;if("undefined"!=typeof tinymce){var s=[];let e=0;for(;tinymce.get("kp-re-"+e);){var n=tinymce.get("kp-re-"+e).getContent().trim();n&&s.push(n),e++}0<e&&(t.keyPoints=s)}}}function saveLessonChanges(){try{var t=getLesson(activeLesson).lesson,s=(t.name=document.getElementById("f-name").value.trim(),t.summary=getCKData("f-summary"),document.querySelectorAll("#objectives-list textarea")),n=(t.objectives=[...s].map(e=>e.value.trim()).filter(e=>e),[]);let e=0;for(;"undefined"!=typeof tinymce&&tinymce.get("kp-re-"+e);){var i=tinymce.get("kp-re-"+e).getContent().trim();i&&n.push(i),e++}t.keyPoints=n,_syncCSFromDOM(),saveCurriculum(),renderSidebar(),renderStats(),showToast("✅ تم حفظ التعديلات")}catch(e){console.error("[saveLessonChanges] خطأ:",e),showToast("❌ حدث خطأ أثناء الحفظ — راجع Console")}}function renderImageItem(e,t){return`
    <div class="img-item-card" id="img-card-${t}">
      <div class="img-item-preview">
        <img src="${escHtml(e.src)}" alt="${escHtml(e.caption||"")}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23eee%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2212%22>خطأ</text></svg>'">
      </div>
      <input class="field-input img-caption-input" placeholder="تعليق على الصورة (اختياري)"
             value="${escHtml(e.caption||"")}" onchange="_updateImgCaption(${t}, this.value)">
      <button class="img-del-btn" onclick="deleteImage(${t})">🗑</button>
    </div>`}function handleImageFile(e,t){let s=e.files[0];s&&((e=new FileReader).onload=function(e){_addImageToLesson(e.target.result,s.name.replace(/\.[^.]+$/,""))},e.readAsDataURL(s))}function addImageFromURL(){var e=document.getElementById("img-url-input"),t=e.value.trim();t&&(_addImageToLesson(t,""),e.value="")}function _addImageToLesson(e,t){var s=getLesson(activeLesson).lesson,e=(s.images||(s.images=[]),s.images.push({src:e,caption:t}),document.getElementById("images-list"));e&&(e.innerHTML=s.images.map((e,t)=>renderImageItem(e,t)).join(""))}function deleteImage(e){var t=getLesson(activeLesson).lesson;t.images&&(t.images.splice(e,1),e=document.getElementById("images-list"))&&(e.innerHTML=t.images.map((e,t)=>renderImageItem(e,t)).join(""))}function _updateImgCaption(e,t){var s=getLesson(activeLesson).lesson;s.images&&s.images[e]&&(s.images[e].caption=t)}function renderCSItem(e,t,s){return`
    <div class="cs-item-card" id="cs-card-${t}">
      <div class="cs-item-header">
        <div class="cs-item-meta">
          <input class="cs-icon-input" id="cs-icon-${t}" value="${escHtml(e.icon||"📌")}" placeholder="أيقونة" maxlength="4">
          <input class="cs-title-input" id="cs-title-${t}" value="${escHtml(e.title||"")}" placeholder="عنوان القسم">
        </div>
        <div class="cs-item-actions">
          <button class="kp-move-btn" onclick="moveCustomSection(${t}, -1)" ${0===t?"disabled":""}>↑</button>
          <button class="kp-move-btn" onclick="moveCustomSection(${t}, 1)" ${t===s-1?"disabled":""}>↓</button>
          <button class="kp-del-btn" onclick="deleteCustomSection(${t})">✕</button>
        </div>
      </div>
      ${renderRichEditor(e.content||"","cs-re-"+t,80,"اكتب محتوى القسم هنا...")}
    </div>`}function addCustomSection(){_syncCSFromDOM();var e=getLesson(activeLesson).lesson;e.customSections||(e.customSections=[]),e.customSections.push({id:"cs_"+Date.now(),title:"",icon:"📌",content:""}),_reRenderCSList()}function deleteCustomSection(e){_syncCSFromDOM();var t=getLesson(activeLesson).lesson;t.customSections&&t.customSections.splice(e,1),_reRenderCSList()}function moveCustomSection(e,t){_syncCSFromDOM();var s=getLesson(activeLesson).lesson,t=e+t;!s.customSections||t<0||t>=s.customSections.length||([s.customSections[e],s.customSections[t]]=[s.customSections[t],s.customSections[e]],_reRenderCSList())}function _reRenderCSList(){var e=getLesson(activeLesson).lesson,t=document.getElementById("custom-sections-list");if(t){destroyAllTMC(t);let s=e.customSections||[];t.innerHTML=s.map((e,t)=>renderCSItem(e,t,s.length)).join(""),setTimeout(()=>initTinyMCE(100),50)}}function _syncCSFromDOM(){if(activeLesson){let i=getLesson(activeLesson).lesson;var e=document.querySelectorAll("#custom-sections-list .cs-item-card");e.length&&(i.customSections=[...e].map((e,t)=>{var s=e.querySelector("#cs-icon-"+t)?.value||"📌",n=e.querySelector("#cs-title-"+t)?.value||"",e=getCKData("cs-re-"+t)||e.querySelector(".tmc-target")?.value?.trim()||"";return{id:((i.customSections||[])[t]||{}).id||"cs_"+Date.now(),icon:s,title:n,content:e}}))}}function deleteLesson(){let{lesson:e,unit:t}=getLesson(activeLesson);showConfirm(`هل تريد حذف درس "${e.name}" نهائياً؟`,()=>{var e=t.lessons.findIndex(e=>e.id===activeLesson.lessonId);t.lessons.splice(e,1),saveCurriculum(),activeLesson=null,renderSidebar(),renderStats(),showOverview()})}function openAddLesson(){var e=Object.values(curriculum)[0],t=e.semesters[0],s=t.units[0];addLessonToUnit(e.id,t.id,s.id)}function addLessonToUnit(e,t,s){var n=curriculum[e].semesters.find(e=>e.id===t).units.find(e=>e.id===s),i=`${s}l${n.lessons.length+1}_`+Date.now();n.lessons.push({id:i,name:"درس جديد",objectives:[""],summary:"",keyPoints:[""],questions:[],images:[],customSections:[]}),saveCurriculum(),renderSidebar(),renderStats(),selectLesson(e,t,s,i)}function openQuestionBuilder(e=null){var t;qbState={editIdx:e},document.getElementById("qb-overlay").classList.remove("hidden"),document.getElementById("question-builder").classList.remove("hidden"),document.getElementById("qb-title").textContent=null!==e?"✏️ تعديل سؤال":"➕ إضافة سؤال",null!==e?(t=getLesson(activeLesson).lesson,t=t.questions[e],document.getElementById("qb-type-select").classList.add("hidden"),document.getElementById("qb-form").classList.remove("hidden"),renderQuestionForm(t.type,t)):(document.getElementById("qb-type-select").classList.remove("hidden"),document.getElementById("qb-form").classList.add("hidden"))}function closeQuestionBuilder(){document.getElementById("qb-overlay").classList.add("hidden"),document.getElementById("question-builder").classList.add("hidden"),qbState={}}function backToTypes(){document.getElementById("qb-type-select").classList.remove("hidden"),document.getElementById("qb-form").classList.add("hidden")}function selectQuestionType(e){qbState.type=e,document.getElementById("qb-type-select").classList.add("hidden"),document.getElementById("qb-form").classList.remove("hidden"),renderQuestionForm(e)}function renderQuestionForm(e,t=null){var s,n=document.getElementById("qb-form-content");if("mcq"===(qbState.type=e)){var i=t?t.options:["","","",""];let s=t?t.answer:0;n.innerHTML=`
      <div class="qb-field">
        <label class="qb-label">نص السؤال</label>
        <textarea class="qb-textarea" id="q-question" oninput="updatePreview()">${escHtml(t?.question||"")}</textarea>
      </div>
      <div class="qb-field">
        <label class="qb-label">الخيارات (اختر الإجابة الصحيحة بالنقر على الدائرة)</label>
        <div class="options-list" id="options-list">
          ${i.map((e,t)=>`
            <div class="option-row ${t===s?"selected":""}" id="opt-row-${t}">
              <input type="radio" class="option-radio" name="correct-opt" value="${t}"
                     ${t===s?"checked":""}
                     onchange="selectOption(${t})">
              <input class="option-input" placeholder="الخيار ${t+1}" value="${escHtml(e)}"
                     oninput="updatePreview()">
            </div>`).join("")}
        </div>
      </div>`}else"tf"===e?(i=t?t.answer:null,n.innerHTML=`
      <div class="qb-field">
        <label class="qb-label">نص الجملة</label>
        <textarea class="qb-textarea" id="q-question" oninput="updatePreview()">${escHtml(t?.question||"")}</textarea>
      </div>
      <div class="qb-field">
        <label class="qb-label">الإجابة الصحيحة</label>
        <div class="tf-options">
          <button class="tf-opt ${!0===i?"active-true":""}" id="tf-true"
                  onclick="selectTF(true)">✅ صح</button>
          <button class="tf-opt ${!1===i?"active-false":""}" id="tf-false"
                  onclick="selectTF(false)">❌ خطأ</button>
        </div>
      </div>`,qbState.tfAnswer=i):"match"===e?(i=t?t.pairs:[["",""],["",""],["",""]],s=t?.image||null,qbState.matchImage=s,n.innerHTML=`
      <div class="qb-field">
        <label class="qb-label">عنوان سؤال الوصل</label>
        <input class="qb-input" id="q-question" placeholder="مثال: صل كل مصطلح بتعريفه"
               value="${escHtml(t?.question||"")}" oninput="updatePreview()">
      </div>

      <!-- صورة السؤال (اختياري) -->
      <div class="qb-field">
        <label class="qb-label">صورة السؤال <span style="color:#94A3B8;font-weight:400">(اختياري)</span></label>
        <div class="qb-img-upload-area" id="qb-img-area">
          ${s?`<div class="qb-img-preview" id="qb-img-preview">
                 <img src="${s}" alt="صورة السؤال">
                 <button class="qb-img-remove" onclick="removeMatchImage()" title="حذف الصورة">✕</button>
               </div>`:`<div class="qb-img-placeholder" id="qb-img-placeholder">
                 <label class="qb-img-upload-btn">
                   🖼️ رفع صورة
                   <input type="file" accept="image/*" style="display:none" onchange="handleMatchImageUpload(this)">
                 </label>
                 <span style="color:#94A3B8;font-size:13px">أو أدخل رابط:</span>
                 <div style="display:flex;gap:8px;margin-top:6px">
                   <input class="qb-input" id="qb-img-url" placeholder="https://..." style="flex:1">
                   <button class="add-match-btn" onclick="setMatchImageFromURL()">+ إضافة</button>
                 </div>
               </div>`}
        </div>
      </div>

      <div class="qb-field">
        <label class="qb-label">الأزواج</label>
        <div class="match-grid">
          <div>
            <div class="match-col-label">العمود الأول</div>
            <div class="match-pairs" id="match-col-a">
              ${i.map((e,t)=>`
                <div class="match-pair-row">
                  <input class="match-input" id="ma-${t}" value="${escHtml(e[0])}" placeholder="العنصر ${t+1}" oninput="updatePreview()">
                  <button class="match-del" onclick="deleteMatchPair(${t})">✕</button>
                </div>`).join("")}
            </div>
          </div>
          <div>
            <div class="match-col-label">العمود الثاني</div>
            <div class="match-pairs" id="match-col-b">
              ${i.map((e,t)=>`
                <div class="match-pair-row">
                  <input class="match-input" id="mb-${t}" value="${escHtml(e[1])}" placeholder="المقابل ${t+1}" oninput="updatePreview()">
                </div>`).join("")}
            </div>
          </div>
        </div>
        <button class="add-match-btn" onclick="addMatchPair()" style="margin-top:10px">+ إضافة زوج</button>
      </div>`,qbState.pairCount=i.length):"fill"===e&&(s=t?t.sentences:[["","",""],["","",""],["","",""]],qbState.fillCount=s.length,i=s.map((e,t)=>`
      <div class="match-pair-row fill-sentence-row" id="fillrow-${t}">
        <span class="pair-num">${t+1}</span>
        <input class="match-input" id="fs-before-${t}" placeholder="النص قبل الفراغ" value="${escHtml(e[0]||"")}" oninput="updatePreview()">
        <input class="match-input fill-ans-input" id="fs-answer-${t}" placeholder="الإجابة ★" value="${escHtml(e[1]||"")}" oninput="updatePreview()" title="الإجابة الصحيحة">
        <input class="match-input" id="fs-after-${t}" placeholder="النص بعد الفراغ (اختياري)" value="${escHtml(e[2]||"")}" oninput="updatePreview()">
        <button class="match-del" onclick="deleteFillSentence(${t})">✕</button>
      </div>`).join(""),n.innerHTML=`
      <div class="qb-field">
        <label class="qb-label">تعليمات السؤال</label>
        <input class="qb-input" id="q-question" placeholder="مثال: أملأ الفراغات بالكلمة المناسبة:"
               value="${escHtml(t?.question||"أملأ الفراغات بالكلمة المناسبة:")}" oninput="updatePreview()">
      </div>
      <div class="qb-field">
        <label class="qb-label">الجمل — (نص قبل | الإجابة ★ | نص بعد)</label>
        <div id="fill-sentences-list">${i}</div>
        <button class="add-match-btn" onclick="addFillSentence()" style="margin-top:10px">+ إضافة جملة</button>
      </div>`);updatePreview()}function selectOption(s){document.querySelectorAll(".option-row").forEach((e,t)=>{e.classList.toggle("selected",t===s)}),updatePreview()}function selectTF(e){qbState.tfAnswer=e,document.getElementById("tf-true").className="tf-opt "+(!0===e?"active-true":""),document.getElementById("tf-false").className="tf-opt "+(!1===e?"active-false":""),updatePreview()}function handleMatchImageUpload(e){var t,e=e.files[0];e&&((t=new FileReader).onload=function(e){qbState.matchImage=e.target.result,_renderMatchImagePreview(e.target.result)},t.readAsDataURL(e))}function setMatchImageFromURL(){var e=(document.getElementById("qb-img-url")?.value||"").trim();e?_renderMatchImagePreview(qbState.matchImage=e):showToast("⚠️ أدخل رابط الصورة")}function removeMatchImage(){qbState.matchImage=null;var e=document.getElementById("qb-img-area");e&&(e.innerHTML=`
    <div class="qb-img-placeholder" id="qb-img-placeholder">
      <label class="qb-img-upload-btn">
        🖼️ رفع صورة
        <input type="file" accept="image/*" style="display:none" onchange="handleMatchImageUpload(this)">
      </label>
      <span style="color:#94A3B8;font-size:13px">أو أدخل رابط:</span>
      <div style="display:flex;gap:8px;margin-top:6px">
        <input class="qb-input" id="qb-img-url" placeholder="https://..." style="flex:1">
        <button class="add-match-btn" onclick="setMatchImageFromURL()">+ إضافة</button>
      </div>
    </div>`)}function _renderMatchImagePreview(e){var t=document.getElementById("qb-img-area");t&&(t.innerHTML=`
    <div class="qb-img-preview" id="qb-img-preview">
      <img src="${e}" alt="صورة السؤال">
      <button class="qb-img-remove" onclick="removeMatchImage()" title="حذف الصورة">✕</button>
    </div>`)}function addMatchPair(){qbState.pairCount=(qbState.pairCount||0)+1;var e=qbState.pairCount-1;document.getElementById("match-col-a").insertAdjacentHTML("beforeend",`
    <div class="match-pair-row">
      <input class="match-input" id="ma-${e}" placeholder="العنصر ${1+e}" oninput="updatePreview()">
      <button class="match-del" onclick="deleteMatchPair(${e})">✕</button>
    </div>`),document.getElementById("match-col-b").insertAdjacentHTML("beforeend",`
    <div class="match-pair-row">
      <input class="match-input" id="mb-${e}" placeholder="المقابل ${1+e}" oninput="updatePreview()">
    </div>`),updatePreview()}function deleteMatchPair(e){var t=document.querySelector("#ma-"+e)?.closest(".match-pair-row"),e=document.querySelector("#mb-"+e)?.closest(".match-pair-row");t&&t.remove(),e&&e.remove(),updatePreview()}function addFillSentence(){qbState.fillCount=(qbState.fillCount||0)+1;var e=qbState.fillCount-1;document.getElementById("fill-sentences-list").insertAdjacentHTML("beforeend",`
    <div class="match-pair-row fill-sentence-row" id="fillrow-${e}">
      <span class="pair-num">${1+e}</span>
      <input class="match-input" id="fs-before-${e}" placeholder="النص قبل الفراغ" oninput="updatePreview()">
      <input class="match-input fill-ans-input" id="fs-answer-${e}" placeholder="الإجابة ★" oninput="updatePreview()" title="الإجابة الصحيحة">
      <input class="match-input" id="fs-after-${e}" placeholder="النص بعد الفراغ (اختياري)" oninput="updatePreview()">
      <button class="match-del" onclick="deleteFillSentence(${e})">✕</button>
    </div>`),updatePreview()}function deleteFillSentence(e){e=document.getElementById("fillrow-"+e);e&&e.remove(),updatePreview()}function updatePreview(){var e=document.getElementById("qb-preview"),t=qbState.type,n=document.getElementById("q-question"),n=n?n.value:"";let i='<div class="preview-label">معاينة</div>';if("mcq"===t){var a=document.querySelectorAll(".option-row input[type=text], .option-input"),o=document.querySelector("input[name=correct-opt]:checked");let s=o?parseInt(o.value):0;i=i+`<div class="preview-question">${escHtml(n)||"نص السؤال..."}</div>`+'<div class="preview-options">',a.forEach((e,t)=>{i+=`<div class="preview-opt ${t===s?"correct":""}">${escHtml(e.value)||"الخيار "+(t+1)}</div>`}),i+="</div>"}else if("tf"===t){o=qbState.tfAnswer;i=i+`<div class="preview-question">${escHtml(n)||"نص الجملة..."}</div>`+`<div style="font-size:14px;margin-top:8px">الإجابة: <strong style="color:${!0===o?"var(--success)":!1===o?"var(--danger)":"var(--text-light)"}">
      ${!0===o?"✅ صح":!1===o?"❌ خطأ":"لم تُحدَّد بعد"}</strong></div>`}else if("match"===t){i+=`<div class="preview-question">${escHtml(n)||"عنوان الوصل..."}</div>`;var s=qbState.pairCount||0;i+='<div style="font-size:13px;color:var(--text-mid);margin-top:6px">';for(let e=0;e<s;e++){var l=document.getElementById("ma-"+e)?.value||"",d=document.getElementById("mb-"+e)?.value||"";(l||d)&&(i+=`<div style="padding:4px 0">${escHtml(l)} ←→ ${escHtml(d)}</div>`)}i+="</div>"}else if("fill"===t){i+=`<div class="preview-question">${escHtml(n)||"أملأ الفراغات..."}</div>`;var r=qbState.fillCount||0;i+='<div style="font-size:13px;color:var(--text-mid);margin-top:6px;line-height:2">';for(let e=0;e<r;e++){var c=document.getElementById("fs-before-"+e)?.value||"",u=document.getElementById("fs-answer-"+e)?.value||"",m=document.getElementById("fs-after-"+e)?.value||"";(c||u)&&(i+=`<div style="padding:4px 0">${escHtml(c)} <span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:6px;font-weight:700">${escHtml(u)||"___"}</span> ${escHtml(m)}</div>`)}i+="</div>"}e.innerHTML=i}function saveQuestion(){var t=qbState.type,s=document.getElementById("q-question")?.value?.trim();if(s){let e={type:t,question:s};if("mcq"===t){var s=[...document.querySelectorAll(".option-input")].map(e=>e.value.trim()),n=document.querySelector("input[name=correct-opt]:checked"),n=n?parseInt(n.value):0;if(s.some(e=>!e))return void showToast("⚠️ أكمل جميع الخيارات");e={...e,options:s,answer:n}}else if("tf"===t){if(null==qbState.tfAnswer)return void showToast("⚠️ اختر صح أو خطأ");e={...e,answer:qbState.tfAnswer}}else if("match"===t){var i=[],a=qbState.pairCount||0;for(let e=0;e<a;e++){var o=document.getElementById("ma-"+e)?.value?.trim(),l=document.getElementById("mb-"+e)?.value?.trim();o&&l&&i.push([o,l])}if(i.length<2)return void showToast("⚠️ أضف زوجين على الأقل");e={...e,pairs:i},qbState.matchImage&&(e.image=qbState.matchImage)}else if("fill"===t){var d=[],r=qbState.fillCount||0;for(let e=0;e<r;e++){var c=document.getElementById("fs-before-"+e)?.value?.trim()||"",u=document.getElementById("fs-answer-"+e)?.value?.trim()||"",m=document.getElementById("fs-after-"+e)?.value?.trim()||"";u&&d.push([c,u,m])}if(!d.length)return void showToast("⚠️ أضف جملة واحدة على الأقل مع إجابة");e={...e,sentences:d}}s=getLesson(activeLesson).lesson;null!=qbState.editIdx?(s.questions[qbState.editIdx]=e,showToast("✅ تم تعديل السؤال")):(s.questions.push(e),showToast("✅ تم إضافة السؤال")),closeQuestionBuilder(),saveCurriculum(),refreshQuestionsList()}else showToast("⚠️ أدخل نص السؤال")}function editQuestion(e){openQuestionBuilder(e)}function deleteQuestion(t){showConfirm("هل تريد حذف هذا السؤال؟",()=>{var e=getLesson(activeLesson).lesson;e.questions.splice(t,1),saveCurriculum(),refreshQuestionsList(),showToast("🗑 تم حذف السؤال")})}function refreshQuestionsList(){var e=getLesson(activeLesson).lesson,t=document.getElementById("questions-list");t&&(t.innerHTML=renderQuestionsList(e.questions),document.querySelector(".questions-title").textContent=`🎮 الأسئلة (${e.questions.length})`)}function exportJSON(){var e=`// ===================================================
//  بيانات المناهج الدراسية - تم التصدير من لوحة التحكم
// ===================================================

const CURRICULUM = ${JSON.stringify(curriculum,null,2)};
`,e=new Blob([e],{type:"application/javascript"}),e=URL.createObjectURL(e),t=document.createElement("a");t.href=e,t.download="data.js",t.click(),URL.revokeObjectURL(e),showToast("📤 تم تصدير data.js")}function importJSON(){document.getElementById("import-input").click()}function handleImport(n){var e,t=n.target.files[0];t&&((e=new FileReader).onload=e=>{try{var t=e.target.result.trim();if(t.startsWith("{"))curriculum=JSON.parse(t);else{var s=t.match(/const CURRICULUM\s*=\s*(\{[\s\S]*\});?\s*$/);if(!s)throw new Error("تنسيق غير صالح");curriculum=JSON.parse(s[1])}saveCurriculum(),renderSidebar(),renderStats(),showToast("📥 تم الاستيراد بنجاح")}catch(e){showToast("❌ خطأ في الملف: "+e.message)}n.target.value=""},e.readAsText(t))}function deepClone(e){return JSON.parse(JSON.stringify(e))}function escHtml(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}let confirmCallback=null;function showConfirm(e,t){document.getElementById("confirm-msg").textContent=e,document.getElementById("confirm-overlay").classList.remove("hidden"),confirmCallback=t,document.getElementById("confirm-ok").onclick=()=>{closeConfirm(),t()}}function closeConfirm(){document.getElementById("confirm-overlay").classList.add("hidden"),confirmCallback=null}let toastTimer;function showToast(e){let t=document.getElementById("dash-toast");t||((t=document.createElement("div")).id="dash-toast",t.className="toast",document.body.appendChild(t)),t.textContent=e,t.classList.add("show"),clearTimeout(toastTimer),toastTimer=setTimeout(()=>t.classList.remove("show"),2500)}function _parseGrade(e){e=String(e||"").trim().toLowerCase().replace("الرابع","4").replace("الخامس","5").replace("السادس","6").replace("fourth","4").replace("fifth","5").replace("sixth","6");return"4"===e||"grade4"===e?"grade4":"5"===e||"grade5"===e?"grade5":"6"===e||"grade6"===e?"grade6":null}function downloadExcelTemplate(){var e,t;window.XLSX?(e=XLSX.utils.book_new(),(t=XLSX.utils.aoa_to_sheet([["الاسم","الصف","كلمة المرور"],["أحمد محمد العلي","4","1234"],["فاطمة علي الزهراني","5","5678"],["خالد سعد المطيري","6","abcd"],["نورة عبدالله القحطاني","4","pass1"]]))["!cols"]=[{wch:30},{wch:12},{wch:16}],XLSX.utils.book_append_sheet(e,t,"الطلاب"),XLSX.writeFile(e,"نموذج_قائمة_الطلاب.xlsx"),showToast("✅ تم تحميل النموذج")):showToast("⚠ مكتبة Excel غير محملة")}function handleExcelUpload(e){var t,s=e.target.files[0];if(s){let l=document.getElementById("sp-excel-error"),d=document.getElementById("sp-excel-preview");l.classList.add("hidden"),d.classList.add("hidden"),d.innerHTML="",window.XLSX?((t=new FileReader).onload=function(t){try{var n=XLSX.read(t.target.result,{type:"binary"}),i=n.Sheets[n.SheetNames[0]];let e=XLSX.utils.sheet_to_json(i,{header:1,defval:""}).filter(e=>e.some(e=>""!==e)),a=(e.length&&isNaN(Number(e[0][1]))&&!1===String(e[0][1]).toLowerCase().includes("صف")&&!_parseGrade(e[0][1])&&(e=e.slice(1)),[]),o=[],s={grade4:"الرابع",grade5:"الخامس",grade6:"السادس"};if(e.forEach((e,t)=>{var s=String(e[0]||"").trim(),n=_parseGrade(e[1]),i=String(e[2]||"").trim();(s||n||i)&&(s?n?i?a.push({name:s,grade:n,pass:i}):o.push(`السطر ${t+2}: كلمة المرور مفقودة`):o.push(`السطر ${t+2}: الصف غير صحيح (${e[1]})`):o.push(`السطر ${t+2}: اسم الطالب مفقود`))}),0===a.length&&0===o.length)l.textContent="⚠ الملف فارغ أو لا يحتوي بيانات.",l.classList.remove("hidden");else{let e=`
        <div class="sp-excel-summary">
          <span class="sp-excel-count">✅ ${a.length} طالب جاهز للإضافة</span>
          ${o.length?`<span class="sp-excel-err-count">⚠ ${o.length} سطر به مشكلة</span>`:""}
        </div>`;o.length&&(e+=`<ul class="sp-excel-errlist">${o.map(e=>`<li>${e}</li>`).join("")}</ul>`),a.length&&(e+=`
          <div class="sp-excel-table-wrap">
            <table class="sp-table" style="margin-top:10px">
              <thead><tr><th>#</th><th>الاسم</th><th>الصف</th><th>كلمة المرور</th></tr></thead>
              <tbody>
                ${a.slice(0,8).map((e,t)=>`
                  <tr>
                    <td>${t+1}</td>
                    <td>${escHtml(e.name)}</td>
                    <td>${s[e.grade]}</td>
                    <td>${escHtml(e.pass)}</td>
                  </tr>`).join("")}
                ${8<a.length?`<tr><td colspan="4" style="text-align:center;color:#64748b">... و${a.length-8} طالب آخر</td></tr>`:""}
              </tbody>
            </table>
          </div>
          <button class="sp-excel-confirm-btn" onclick="importStudentsFromExcel()">
            ✅ إضافة ${a.length} طالب الآن
          </button>`,window._pendingExcelStudents=a),d.innerHTML=e,d.classList.remove("hidden")}}catch(e){l.textContent="⚠ تعذّر قراءة الملف: "+e.message,l.classList.remove("hidden")}},t.readAsBinaryString(s),e.target.value=""):(l.textContent="⚠ مكتبة Excel غير محملة، أعد تحميل الصفحة.",l.classList.remove("hidden"))}}async function importStudentsFromExcel(){var n=window._pendingExcelStudents;if(n&&n.length){var i=document.querySelector(".sp-excel-confirm-btn");i&&(i.disabled=!0,i.textContent="⏳ جارٍ الإضافة...");let e=0,t=0;var a,o=[];for(a of n){if(!window.StudentAuth)break;(await StudentAuth.addStudent(a.name,a.grade,a.pass)).ok?e++:(t++,o.push(a.name))}window._pendingExcelStudents=null;let s=`✅ تمت إضافة ${e} طالب بنجاح`;t&&(s+=` · تم تخطي ${t} (مكرر أو خطأ)`),showToast(s),t&&o.length?(i=document.getElementById("sp-excel-preview"))&&(i.innerHTML=`<div class="sp-excel-summary">
        <span class="sp-excel-count">✅ تمت إضافة ${e} طالب</span>
        ${t?`<span class="sp-excel-err-count">⚠ تم تخطي ${t}: ${o.join("، ")}</span>`:""}
      </div>`):document.getElementById("sp-excel-preview").classList.add("hidden"),renderStudentPanel()}}document.addEventListener("DOMContentLoaded",init);