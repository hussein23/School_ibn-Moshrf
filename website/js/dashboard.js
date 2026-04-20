const STORAGE_KEY='ibn_moshrf_curriculum';const TEACHER_PIN_KEY='ibn_moshrf_teacher_pin';const TEACHER_SESSION='ibn_moshrf_teacher_auth';const PIN_SALT='ibn_teacher_2025';let curriculum={};let activeLesson=null;let qbState={};async function _hashPin(pin){const encoder=new TextEncoder();const data=encoder.encode(pin+PIN_SALT);const buf=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
function _isTeacherAuthed(){return sessionStorage.getItem(TEACHER_SESSION)==='1';}
function showPinModal(){const overlay=document.getElementById('pin-overlay');if(!overlay)return;const stored=localStorage.getItem(TEACHER_PIN_KEY);const title=document.getElementById('pin-modal-title');const hint=document.getElementById('pin-modal-hint');if(!stored){if(title)title.textContent='إنشاء رمز الدخول للمعلم';if(hint)hint.textContent='أنشئ رمزاً سرياً (4 أحرف على الأقل) لحماية لوحة التحكم';}else{if(title)title.textContent='لوحة تحكم المعلم 🔒';if(hint)hint.textContent='أدخل رمز الدخول للمتابعة';}
overlay.classList.remove('hidden');setTimeout(()=>document.getElementById('pin-input')?.focus(),100);}
async function submitPin(){const pinEl=document.getElementById('pin-input');const errEl=document.getElementById('pin-error');const btn=document.getElementById('pin-submit-btn');const pin=(pinEl?.value||'').trim();if(pin.length<4){if(errEl){errEl.textContent='الرمز يجب أن يكون 4 أحرف على الأقل';errEl.classList.remove('hidden');}
return;}
if(btn)btn.disabled=true;const hashed=await _hashPin(pin);if(btn)btn.disabled=false;const stored=localStorage.getItem(TEACHER_PIN_KEY);if(!stored){localStorage.setItem(TEACHER_PIN_KEY,hashed);document.getElementById('pin-overlay').classList.add('hidden');sessionStorage.setItem(TEACHER_SESSION,'1');_initDashboard();return;}
if(hashed!==stored){if(errEl){errEl.textContent='رمز الدخول غير صحيح';errEl.classList.remove('hidden');}
if(pinEl){pinEl.value='';pinEl.focus();}
return;}
document.getElementById('pin-overlay').classList.add('hidden');sessionStorage.setItem(TEACHER_SESSION,'1');_initDashboard();}
function resetTeacherPin(){const conf=confirm('هل تريد إعادة تعيين رمز الدخول؟ ستحتاج لإنشاء رمز جديد في المرة القادمة.');if(!conf)return;localStorage.removeItem(TEACHER_PIN_KEY);sessionStorage.removeItem(TEACHER_SESSION);location.reload();}
function init(){if(!_isTeacherAuthed()){showPinModal();return;}
_initDashboard();}
function _initDashboard(){loadCurriculum();renderSidebar();renderStats();const _prevHandler=window._onCurriculumUpdate;window._onCurriculumUpdate=function(data){if(_prevHandler)_prevHandler(data);curriculum=deepClone(data);renderSidebar();renderStats();if(!activeLesson)showOverview();setSaveStatus('☁️ تم التزامن مع Firebase');};}
function loadCurriculum(){const firebaseData=window.FirebaseDB&&window.FirebaseDB.dbLoadCurriculum?window.FirebaseDB.dbLoadCurriculum():null;if(firebaseData){curriculum=deepClone(firebaseData);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(curriculum));}catch(e){}
setSaveStatus('☁️ تم التزامن مع Firebase');return;}
const saved=localStorage.getItem(STORAGE_KEY);if(saved){try{curriculum=JSON.parse(saved);setSaveStatus('✅ بيانات معدّلة محلياً');}catch{curriculum=deepClone(CURRICULUM);}}else{curriculum=deepClone(CURRICULUM);setSaveStatus('✅ البيانات الأصلية');}}
function saveCurriculum(){localStorage.setItem(STORAGE_KEY,JSON.stringify(curriculum));if(window.FirebaseDB&&window.FirebaseDB.dbSaveCurriculum){const isActive=window.FirebaseDB.isFirebaseActive&&window.FirebaseDB.isFirebaseActive();if(isActive){setSaveStatus('☁️ يتم الرفع…');window.FirebaseDB.dbSaveCurriculum(curriculum,function(){setSaveStatus('✅ محفوظ للجميع ☁️');showToast('✅ تم الحفظ — سيظهر لجميع الأجهزة');},function(err){setSaveStatus('⚠️ فشل الرفع');showToast('⚠️ لم يُرفع إلى Firebase: '+(err&&err.message||err));console.error('curriculum save error:',err);});}else{window.FirebaseDB.dbSaveCurriculum(curriculum);setSaveStatus('⚠️ محفوظ محلياً فقط (Firebase غير متصل)');showToast('⚠️ Firebase غير متصل — الحفظ محلي فقط');}}else{setSaveStatus('✅ تم الحفظ');showToast('✅ تم الحفظ بنجاح');}}
function resetToDefault(){showConfirm('سيتم مسح جميع التعديلات والعودة للبيانات الأصلية. هل أنت متأكد؟',()=>{localStorage.removeItem(STORAGE_KEY);curriculum=deepClone(CURRICULUM);saveCurriculum();activeLesson=null;renderSidebar();renderStats();showOverview();showToast('↺ تمت الاستعادة للبيانات الأصلية');});}
function setSaveStatus(msg){document.getElementById('save-status').textContent=msg;}
function renderSidebar(){const tree=document.getElementById('sidebar-tree');tree.innerHTML=Object.values(curriculum).map(grade=>renderGradeNode(grade)).join('');}
function renderGradeNode(grade){const gradeNum=grade.id.replace('grade','');const colorVar=`var(--grade${gradeNum})`;return`
    <div class="tree-grade" id="tree-${grade.id}">
      <div class="tree-grade-label" onclick="toggleNode('tree-${grade.id}')">
        <span class="grade-dot" style="background:${grade.color}"></span>
        <span>${grade.icon} ${grade.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-grade-children">
        ${grade.semesters.map(sem => renderSemNode(grade, sem)).join('')}
      </div>
    </div>`;}
function renderSemNode(grade,sem){const nodeId=`tree-${grade.id}-${sem.id}`;return`
    <div class="tree-sem" id="${nodeId}">
      <div class="tree-sem-label" onclick="toggleNode('${nodeId}')">
        <span>📅</span>
        <span>${sem.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-sem-children">
        ${sem.units.map(unit => renderUnitNode(grade, sem, unit)).join('')}
      </div>
    </div>`;}
function renderUnitNode(grade,sem,unit){const nodeId=`tree-${unit.id}`;return`
    <div class="tree-unit" id="${nodeId}">
      <div class="tree-unit-label" onclick="toggleNode('${nodeId}')">
        <span>${unit.icon}</span>
        <span>${unit.name}</span>
        <span class="tree-arrow">▶</span>
      </div>
      <div class="tree-unit-children">
        ${unit.lessons.map(lesson => renderLessonNode(grade, sem, unit, lesson)).join('')}
      </div>
    </div>`;}
function renderLessonNode(grade,sem,unit,lesson){const isActive=activeLesson&&activeLesson.lessonId===lesson.id;return`
    <div class="tree-lesson-item ${isActive ? 'active' : ''}"
         id="tree-lesson-${lesson.id}"
         onclick="selectLesson('${grade.id}','${sem.id}','${unit.id}','${lesson.id}')">
      📄 ${lesson.name}
    </div>`;}
function toggleNode(nodeId){const node=document.getElementById(nodeId);if(node)node.classList.toggle('open');}
function filterSidebar(query){const q=query.trim().toLowerCase();document.querySelectorAll('.tree-lesson-item').forEach(item=>{const visible=!q||item.textContent.toLowerCase().includes(q);item.style.display=visible?'':'none';});if(q){document.querySelectorAll('.tree-grade, .tree-sem, .tree-unit').forEach(n=>n.classList.add('open'));}}
function renderStats(){const grid=document.getElementById('stats-grid');let totalLessons=0,totalQuestions=0;const gradeColors=['var(--grade4)','var(--grade5)','var(--grade6)'];const cards=Object.values(curriculum).map((grade,i)=>{const lessons=grade.semesters.reduce((a,s)=>a+s.units.reduce((b,u)=>b+u.lessons.length,0),0);const questions=grade.semesters.reduce((a,s)=>a+s.units.reduce((b,u)=>b+u.lessons.reduce((c,l)=>c+l.questions.length,0),0),0);totalLessons+=lessons;totalQuestions+=questions;return`
      <div class="stat-card" style="border-color:${grade.color}">
        <div class="stat-card-num" style="color:${grade.color}">${lessons}</div>
        <div class="stat-card-label">${grade.icon} ${grade.name} — ${questions} سؤال</div>
      </div>`;});cards.unshift(`
    <div class="stat-card" style="border-color:#22C55E">
      <div class="stat-card-num" style="color:#22C55E">${totalLessons}</div>
      <div class="stat-card-label">📚 إجمالي الدروس</div>
    </div>
    <div class="stat-card" style="border-color:#3B82F6">
      <div class="stat-card-num" style="color:#3B82F6">${totalQuestions}</div>
      <div class="stat-card-label">❓ إجمالي الأسئلة</div>
    </div>`);grid.innerHTML=cards.join('');}
function showOverview(){document.getElementById('overview-panel').classList.remove('hidden');document.getElementById('lesson-editor').classList.add('hidden');document.getElementById('student-panel').classList.add('hidden');}
function showStudentPanel(){document.getElementById('overview-panel').classList.add('hidden');document.getElementById('lesson-editor').classList.add('hidden');document.getElementById('student-panel').classList.remove('hidden');renderStudentPanel();}
let _spFilter={grade:'all',category:'all',sort:'points'};function renderStudentPanel(){const panel=document.getElementById('student-panel');if(!window.StudentAuth)return;const gradeNames={grade4:'الصف الرابع',grade5:'الصف الخامس',grade6:'الصف السادس'};const gradeColors={grade4:'#FF6B35',grade5:'#2196F3',grade6:'#7C3AED'};const gradeIcons={grade4:'🟠',grade5:'🔵',grade6:'🟣'};const catLabels={excellent:'🌟 متفوق',good:'👍 جيد',normal:'📘 عادي',needs_help:'⚠️ يحتاج دعم'};const catColors={excellent:'#16a34a',good:'#2196F3',normal:'#64748b',needs_help:'#ef4444'};let all=StudentAuth.getAllStudents();all.forEach(st=>{const pts=st.points||0;const lc=Object.keys(st.lessons||{}).length;if(!st.category||st.category==='normal'){if(pts>=200||lc>=10)st.category='excellent';else if(pts>=100||lc>=5)st.category='good';else if(pts===0&&lc===0)st.category='needs_help';else st.category='normal';}});let students=all.filter(st=>{if(_spFilter.grade!=='all'&&st.grade!==_spFilter.grade)return false;if(_spFilter.category!=='all'&&(st.category||'normal')!==_spFilter.category)return false;return true;});if(_spFilter.sort==='points')students.sort((a,b)=>(b.points||0)-(a.points||0));if(_spFilter.sort==='visits')students.sort((a,b)=>(b.visitCount||0)-(a.visitCount||0));if(_spFilter.sort==='attempts')students.sort((a,b)=>(b.attemptCount||0)-(a.attemptCount||0));if(_spFilter.sort==='lessons')students.sort((a,b)=>Object.keys(b.lessons||{}).length-Object.keys(a.lessons||{}).length);if(_spFilter.sort==='name')students.sort((a,b)=>a.username.localeCompare(b.username,'ar'));const totalPts=all.reduce((s,st)=>s+(st.points||0),0);const countByGrade={grade4:0,grade5:0,grade6:0};all.forEach(st=>{if(countByGrade[st.grade]!==undefined)countByGrade[st.grade]++;});panel.innerHTML=`
    <div class="sp-dash-header">
      <div>
        <h2 class="sp-dash-title">👥 إدارة الطلاب</h2>
        <p class="sp-dash-sub">${all.length} طالب · إجمالي النقاط: ${totalPts}</p>
      </div>
      <button class="back-overview-btn" onclick="showOverview()">← رجوع</button>
    </div>

    <!-- إحصائيات سريعة -->
    <div class="sp-stats-row">
      <div class="sp-stat-chip" style="border-color:#FF6B35">
        <span style="color:#FF6B35">🟠</span> ${countByGrade.grade4} رابع
      </div>
      <div class="sp-stat-chip" style="border-color:#2196F3">
        <span style="color:#2196F3">🔵</span> ${countByGrade.grade5} خامس
      </div>
      <div class="sp-stat-chip" style="border-color:#7C3AED">
        <span style="color:#7C3AED">🟣</span> ${countByGrade.grade6} سادس
      </div>
      <div class="sp-stat-chip" style="border-color:#16a34a">
        🌟 ${all.filter(s=>s.category==='excellent').length} متفوق
      </div>
      <div class="sp-stat-chip" style="border-color:#ef4444">
        ⚠️ ${all.filter(s=>s.category==='needs_help').length} يحتاج دعم
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
      <div class="editor-card-title">🔍 تصفية وترتيب الطلاب</div>
      <div class="sp-filters-row">
        <div class="sp-filter-group">
          <label class="field-label">الصف</label>
          <select class="field-input sp-filter-sel" onchange="_spFilter.grade=this.value;renderStudentPanel()">
            <option value="all" ${_spFilter.grade==='all'?'selected':''}>كل الصفوف</option>
            <option value="grade4" ${_spFilter.grade==='grade4'?'selected':''}>🟠 الرابع</option>
            <option value="grade5" ${_spFilter.grade==='grade5'?'selected':''}>🔵 الخامس</option>
            <option value="grade6" ${_spFilter.grade==='grade6'?'selected':''}>🟣 السادس</option>
          </select>
        </div>
        <div class="sp-filter-group">
          <label class="field-label">التصنيف</label>
          <select class="field-input sp-filter-sel" onchange="_spFilter.category=this.value;renderStudentPanel()">
            <option value="all"       ${_spFilter.category==='all'?'selected':''}>كل التصنيفات</option>
            <option value="excellent" ${_spFilter.category==='excellent'?'selected':''}>🌟 متفوق</option>
            <option value="good"      ${_spFilter.category==='good'?'selected':''}>👍 جيد</option>
            <option value="normal"    ${_spFilter.category==='normal'?'selected':''}>📘 عادي</option>
            <option value="needs_help"${_spFilter.category==='needs_help'?'selected':''}>⚠️ يحتاج دعم</option>
          </select>
        </div>
        <div class="sp-filter-group">
          <label class="field-label">الترتيب حسب</label>
          <select class="field-input sp-filter-sel" onchange="_spFilter.sort=this.value;renderStudentPanel()">
            <option value="points"   ${_spFilter.sort==='points'?'selected':''}>⭐ النقاط</option>
            <option value="lessons"  ${_spFilter.sort==='lessons'?'selected':''}>📚 الدروس</option>
            <option value="visits"   ${_spFilter.sort==='visits'?'selected':''}>👁 الزيارات</option>
            <option value="attempts" ${_spFilter.sort==='attempts'?'selected':''}>🎯 المحاولات</option>
            <option value="name"     ${_spFilter.sort==='name'?'selected':''}>أ-ي الاسم</option>
          </select>
        </div>
        <div class="sp-filter-group" style="padding-top:24px">
          <button class="sp-reset-filter-btn" onclick="_spFilter={grade:'all',category:'all',sort:'points'};renderStudentPanel()">↺ إعادة تعيين</button>
        </div>
      </div>
    </div>

    <!-- جدول الطلاب -->
    <div class="editor-card">
      <div class="editor-card-title">🏆 قائمة الطلاب
        <span style="font-size:13px;font-weight:400;color:var(--text-mid);margin-right:8px">${students.length} نتيجة</span>
      </div>
      ${students.length === 0
        ? `<div class="sp-empty">لا يوجد طلاب بهذه الفلاتر</div>`
        : `<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>#</th><th>الاسم</th><th>الصف</th><th>التصنيف</th><th>النقاط ⭐</th><th>دروس محلولة 📚</th><th>زيارات 👁</th><th>محاولات 🎯</th><th>آخر زيارة</th><th>الإجراءات</th></tr></thead><tbody>${students.map((st,i)=>{const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;const gc=gradeColors[st.grade]||'#64748B';const gi=gradeIcons[st.grade]||'📚';const gn=gradeNames[st.grade]||st.grade;const lc=Object.keys(st.lessons||{}).length;const cat=st.category||'normal';const catLabel=catLabels[cat]||cat;const catColor=catColors[cat]||'#64748b';return`
              <tr>
                <td class="sp-rank">${medal}</td>
                <td class="sp-student-name">${escHtml(st.username)}</td>
                <td><span class="sp-grade-badge" style="background:${gc}20;color:${gc}">${gi} ${gn}</span></td>
                <td>
                  <select class="sp-cat-sel" style="color:${catColor}"
                    onchange="setStudentCategory('${st.id}', this.value)">
                    <option value="excellent" ${cat==='excellent'?'selected':''}>🌟 متفوق</option>
                    <option value="good"      ${cat==='good'?'selected':''}>👍 جيد</option>
                    <option value="normal"    ${cat==='normal'?'selected':''}>📘 عادي</option>
                    <option value="needs_help"${cat==='needs_help'?'selected':''}>⚠️ يحتاج دعم</option>
                  </select>
                </td>
                <td class="sp-pts-cell"><strong>${st.points || 0}</strong></td>
                <td class="sp-lc-cell">${lc}</td>
                <td class="sp-visits-cell">${st.visitCount || 0}</td>
                <td class="sp-attempts-cell">${st.attemptCount || 0}</td>
                <td class="sp-date-cell">${st.lastVisit || '—'}</td>
                <td class="sp-actions-cell">
                  <button class="sp-reset-btn" onclick="resetStudentFromDash('${st.id}')" title="صفر النقاط">🔄</button>
                  <button class="sp-del-btn"   onclick="deleteStudentFromDash('${st.id}')" title="حذف">🗑</button>
                </td>
              </tr>`;}).join('')}</tbody></table></div>`
      }
    </div>
  `;}
function setStudentCategory(id,cat){if(!window.StudentAuth)return;StudentAuth.updateStudent(id,{category:cat});showToast('✅ تم تحديث تصنيف الطالب');}
async function addStudentFromDash(){const name=document.getElementById('sp-new-name').value;const grade=document.getElementById('sp-new-grade').value;const pass=document.getElementById('sp-new-pass').value;const err=document.getElementById('sp-add-error');const btn=document.querySelector('.sp-add-btn');if(!window.StudentAuth)return;if(btn)btn.disabled=true;const result=await StudentAuth.addStudent(name,grade,pass);if(btn)btn.disabled=false;if(!result.ok){err.textContent=result.msg;err.classList.remove('hidden');return;}
err.classList.add('hidden');document.getElementById('sp-new-name').value='';document.getElementById('sp-new-grade').value='';document.getElementById('sp-new-pass').value='';showToast(`✅ تم إضافة الطالب: ${result.student.username}`);renderStudentPanel();}
function deleteStudentFromDash(id){showConfirm('سيتم حذف الطالب ونقاطه نهائياً. هل أنت متأكد؟',()=>{StudentAuth.deleteStudent(id);showToast('🗑 تم حذف الطالب');renderStudentPanel();});}
function resetStudentFromDash(id){showConfirm('سيتم تصفير نقاط الطالب وسجل الدروس. هل أنت متأكد؟',()=>{StudentAuth.resetPoints(id);showToast('🔄 تم تصفير النقاط');renderStudentPanel();});}
function togglePass(id){const el=document.getElementById('pd-'+id);if(!el)return;if(el.textContent==='••••'){el.textContent='🔒 مشفرة';setTimeout(()=>{el.textContent='••••';},2000);}}
const _TMC_CONFIG={directionality:'rtl',menubar:'edit insert format tools table',plugins:'advlist autolink lists link image charmap preview anchor '+'searchreplace visualblocks code fullscreen '+'insertdatetime media table wordcount emoticons codesample quickbars',toolbar1:'undo redo | styles | bold italic underline strikethrough | forecolor backcolor',toolbar2:'alignright aligncenter alignleft alignjustify | '+'bullist numlist outdent indent | blockquote | '+'link image media table charmap emoticons codesample | '+'searchreplace fullscreen code | removeformat | tmc_video',toolbar_mode:'wrap',quickbars_selection_toolbar:'bold italic underline | forecolor backcolor | quicklink blockquote',quickbars_insert_toolbar:false,image_advtab:true,automatic_uploads:false,file_picker_types:'image',file_picker_callback:function(cb,value,meta){const input=document.createElement('input');input.setAttribute('type','file');input.setAttribute('accept','image/*');input.onchange=function(){const file=this.files[0];const reader=new FileReader();reader.onload=function(){cb(reader.result,{title:file.name});};reader.readAsDataURL(file);};input.click();},images_upload_handler:function(blobInfo){return Promise.resolve('data:'+blobInfo.blob().type+';base64,'+blobInfo.base64());},media_live_embeds:true,media_alt_source:false,table_default_styles:{'border-collapse':'collapse',width:'100%'},codesample_languages:[{text:'HTML/XML',value:'markup'},{text:'JavaScript',value:'javascript'},{text:'Python',value:'python'},{text:'CSS',value:'css'}],skin:'oxide',content_css:'default',content_style:['body{font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:14px;','direction:rtl;text-align:right;color:#1e293b;line-height:1.8;padding:8px 12px}','img{max-width:100%;height:auto;border-radius:6px}','table{border-collapse:collapse;width:100%}','td,th{border:1px solid #cbd5e1;padding:8px 12px}','th{background:#f1f5f9;font-weight:700}','pre{background:#1e293b;color:#e2e8f0;padding:12px;border-radius:6px;font-size:13px;overflow-x:auto}','blockquote{border-right:4px solid #6366f1;margin:0;padding:8px 16px;background:#f8fafc;color:#475569}'].join(''),branding:false,promotion:false,resize:true,statusbar:true,setup:function(editor){editor.ui.registry.addButton('tmc_video',{icon:'embed',tooltip:'إدراج فيديو (YouTube / Google Drive / MP4)',onAction:function(){const url=prompt('أدخل رابط الفيديو (YouTube أو Google Drive أو .mp4):','');if(!url)return;let embedHtml='';const ytMatch=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);if(ytMatch){embedHtml='<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;margin:12px 0">'+'<iframe src="https://www.youtube.com/embed/'+ytMatch[1]+'"'+' style="position:absolute;top:0;right:0;width:100%;height:100%;border:0"'+' allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe></div>';}else if(url.includes('drive.google.com')){const driveId=(url.match(/\/d\/([\w-]+)/)||url.match(/id=([\w-]+)/)||[])[1];if(driveId){embedHtml='<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;margin:12px 0">'+'<iframe src="https://drive.google.com/file/d/'+driveId+'/preview"'+' style="position:absolute;top:0;right:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>';}}else if(/\.(mp4|webm|ogg)(\?|$)/i.test(url)){embedHtml='<video controls style="width:100%;border-radius:10px;margin:12px 0"><source src="'+url+'"></video>';}
if(embedHtml){editor.insertContent(embedHtml);}else{alert('رابط غير مدعوم. استخدم YouTube أو Google Drive أو رابط .mp4 مباشر');}}});}};function initTinyMCE(minHeight){if(typeof tinymce==='undefined'){console.warn('[TinyMCE] المكتبة لم تُحمَّل بعد');return;}
const targets=document.querySelectorAll('.tmc-target:not([data-tmc-init])');targets.forEach(function(el){el.setAttribute('data-tmc-init','1');tinymce.init(Object.assign({},_TMC_CONFIG,{target:el,min_height:minHeight||160}));});}
function destroyTMC(id){if(typeof tinymce==='undefined')return;const ed=tinymce.get(id);if(ed)ed.remove();const el=document.getElementById(id);if(el)el.removeAttribute('data-tmc-init');}
function destroyAllTMC(containerSelector){if(typeof tinymce==='undefined')return;const container=typeof containerSelector==='string'?document.querySelector(containerSelector):containerSelector;if(!container)return;container.querySelectorAll('.tmc-target[data-tmc-init]').forEach(function(el){const ed=tinymce.get(el.id);if(ed)ed.remove();el.removeAttribute('data-tmc-init');});}
function getCKData(id){if(typeof tinymce==='undefined')return'';const ed=tinymce.get(id);return ed?ed.getContent():(document.getElementById(id)?.value||'');}
function renderRichEditor(html,id,minHeight,placeholder){return`<textarea class="tmc-target" id="${id}"
    style="min-height:${minHeight || 80}px"
    placeholder="${placeholder || 'اكتب هنا...'}">${html || ''}</textarea>`;}
function selectLesson(gradeId,semId,unitId,lessonId){activeLesson={gradeId,semId,unitId,lessonId};document.querySelectorAll('.tree-lesson-item').forEach(el=>el.classList.remove('active'));const el=document.getElementById(`tree-lesson-${lessonId}`);if(el){el.classList.add('active');let parent=el.parentElement;while(parent){if(parent.classList.contains('tree-unit')||parent.classList.contains('tree-sem')||parent.classList.contains('tree-grade')){parent.classList.add('open');}
parent=parent.parentElement;}}
document.getElementById('student-panel').classList.add('hidden');renderLessonEditor();}
function getLesson(al){const grade=curriculum[al.gradeId];const sem=grade.semesters.find(s=>s.id===al.semId);const unit=sem.units.find(u=>u.id===al.unitId);const lesson=unit.lessons.find(l=>l.id===al.lessonId);return{grade,sem,unit,lesson};}
function renderLessonEditor(){const{grade,sem,unit,lesson}=getLesson(activeLesson);const editor=document.getElementById('lesson-editor');destroyAllTMC(editor);document.getElementById('overview-panel').classList.add('hidden');editor.classList.remove('hidden');editor.innerHTML=`
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
        ${lesson.objectives.map((obj, i) => `<div class="list-item-row"><textarea oninput="updateObjective(${i}, this.value)">${escHtml(obj)}</textarea><button class="list-item-del"onclick="deleteObjective(${i})">✕</button></div>`).join('')}
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
  `;setTimeout(()=>initTinyMCE(160),100);}
function renderQuestionsList(questions){if(!questions.length)return`<div class="empty-questions">لا توجد أسئلة بعد — أضف سؤالاً الآن</div>`;const typeLabel={mcq:'MCQ',tf:'صح/خطأ',match:'وصل',fill:'أملأ الفراغ'};const typeBadge={mcq:'badge-mcq',tf:'badge-tf',match:'badge-match',fill:'badge-fill'};return questions.map((q,i)=>`
    <div class="q-item">
      <span class="q-type-badge ${typeBadge[q.type] || ''}">${typeLabel[q.type] || q.type}</span>
      <span class="q-text">${escHtml(q.question)}</span>
      <div class="q-actions">
        <button class="q-btn q-btn-edit" onclick="editQuestion(${i})" title="تعديل">✏️</button>
        <button class="q-btn q-btn-del" onclick="deleteQuestion(${i})" title="حذف">🗑</button>
      </div>
    </div>`).join('');}
function renderKPItem(html,i,total){return`
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
    </div>`;}
function updateObjective(i,val){const{lesson}=getLesson(activeLesson);lesson.objectives[i]=val;}
function deleteObjective(i){const{lesson}=getLesson(activeLesson);lesson.objectives.splice(i,1);renderLessonEditor();}
function addObjective(){const{lesson}=getLesson(activeLesson);lesson.objectives.push('');renderLessonEditor();const inputs=document.querySelectorAll('#objectives-list textarea');if(inputs.length)inputs[inputs.length-1].focus();}
function deleteKeyPoint(i){_syncKPFromDOM();const{lesson}=getLesson(activeLesson);lesson.keyPoints.splice(i,1);renderLessonEditor();}
function addKeyPoint(){_syncKPFromDOM();const{lesson}=getLesson(activeLesson);lesson.keyPoints.push('');renderLessonEditor();setTimeout(()=>{const lastIdx=lesson.keyPoints.length-1;const lastEd=typeof tinymce!=='undefined'?tinymce.get('kp-re-'+lastIdx):null;if(lastEd)lastEd.focus();},400);}
function moveKeyPoint(i,dir){_syncKPFromDOM();const{lesson}=getLesson(activeLesson);const j=i+dir;if(j<0||j>=lesson.keyPoints.length)return;[lesson.keyPoints[i],lesson.keyPoints[j]]=[lesson.keyPoints[j],lesson.keyPoints[i]];renderLessonEditor();setTimeout(()=>{const targetEd=typeof tinymce!=='undefined'?tinymce.get('kp-re-'+j):null;if(targetEd)targetEd.focus();},400);}
function setKpLayout(layout){_syncKPFromDOM();const{lesson}=getLesson(activeLesson);lesson.kpLayout=layout;renderLessonEditor();}
function _syncKPFromDOM(){if(!activeLesson)return;const{lesson}=getLesson(activeLesson);if(typeof tinymce==='undefined')return;const kps=[];let i=0;while(tinymce.get('kp-re-'+i)){const d=tinymce.get('kp-re-'+i).getContent().trim();if(d)kps.push(d);i++;}
if(i>0)lesson.keyPoints=kps;}
function saveLessonChanges(){try{const{lesson}=getLesson(activeLesson);lesson.name=document.getElementById('f-name').value.trim();lesson.summary=getCKData('f-summary');const objTextareas=document.querySelectorAll('#objectives-list textarea');lesson.objectives=[...objTextareas].map(t=>t.value.trim()).filter(v=>v);const kps=[];let _kpi=0;while(typeof tinymce!=='undefined'&&tinymce.get('kp-re-'+_kpi)){const d=tinymce.get('kp-re-'+_kpi).getContent().trim();if(d)kps.push(d);_kpi++;}
lesson.keyPoints=kps;_syncCSFromDOM();saveCurriculum();renderSidebar();renderStats();showToast('✅ تم حفظ التعديلات');}catch(err){console.error('[saveLessonChanges] خطأ:',err);showToast('❌ حدث خطأ أثناء الحفظ — راجع Console');}}
function renderImageItem(img,i){return`
    <div class="img-item-card" id="img-card-${i}">
      <div class="img-item-preview">
        <img src="${escHtml(img.src)}" alt="${escHtml(img.caption || '')}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23eee%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2212%22>خطأ</text></svg>'">
      </div>
      <input class="field-input img-caption-input" placeholder="تعليق على الصورة (اختياري)"
             value="${escHtml(img.caption || '')}" onchange="_updateImgCaption(${i}, this.value)">
      <button class="img-del-btn" onclick="deleteImage(${i})">🗑</button>
    </div>`;}
function handleImageFile(input,_unused){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=function(e){_addImageToLesson(e.target.result,file.name.replace(/\.[^.]+$/,''));};reader.readAsDataURL(file);}
function addImageFromURL(){const input=document.getElementById('img-url-input');const url=input.value.trim();if(!url)return;_addImageToLesson(url,'');input.value='';}
function _addImageToLesson(src,caption){const{lesson}=getLesson(activeLesson);if(!lesson.images)lesson.images=[];lesson.images.push({src,caption});const list=document.getElementById('images-list');if(list){list.innerHTML=lesson.images.map((img,i)=>renderImageItem(img,i)).join('');}}
function deleteImage(i){const{lesson}=getLesson(activeLesson);if(!lesson.images)return;lesson.images.splice(i,1);const list=document.getElementById('images-list');if(list)list.innerHTML=lesson.images.map((img,j)=>renderImageItem(img,j)).join('');}
function _updateImgCaption(i,val){const{lesson}=getLesson(activeLesson);if(lesson.images&&lesson.images[i])lesson.images[i].caption=val;}
function renderCSItem(cs,i,total){return`
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
    </div>`;}
function addCustomSection(){_syncCSFromDOM();const{lesson}=getLesson(activeLesson);if(!lesson.customSections)lesson.customSections=[];lesson.customSections.push({id:'cs_'+Date.now(),title:'',icon:'📌',content:''});_reRenderCSList();}
function deleteCustomSection(i){_syncCSFromDOM();const{lesson}=getLesson(activeLesson);if(lesson.customSections)lesson.customSections.splice(i,1);_reRenderCSList();}
function moveCustomSection(i,dir){_syncCSFromDOM();const{lesson}=getLesson(activeLesson);const j=i+dir;if(!lesson.customSections||j<0||j>=lesson.customSections.length)return;[lesson.customSections[i],lesson.customSections[j]]=[lesson.customSections[j],lesson.customSections[i]];_reRenderCSList();}
function _reRenderCSList(){const{lesson}=getLesson(activeLesson);const list=document.getElementById('custom-sections-list');if(!list)return;destroyAllTMC(list);const cs=lesson.customSections||[];list.innerHTML=cs.map((s,i)=>renderCSItem(s,i,cs.length)).join('');setTimeout(()=>initTinyMCE(100),50);}
function _syncCSFromDOM(){if(!activeLesson)return;const{lesson}=getLesson(activeLesson);const cards=document.querySelectorAll('#custom-sections-list .cs-item-card');if(!cards.length)return;lesson.customSections=[...cards].map((card,i)=>{const icon=card.querySelector(`#cs-icon-${i}`)?.value||'📌';const title=card.querySelector(`#cs-title-${i}`)?.value||'';const edId=`cs-re-${i}`;const content=getCKData(edId)||card.querySelector('.tmc-target')?.value?.trim()||'';const prev=(lesson.customSections||[])[i]||{};return{id:prev.id||'cs_'+Date.now(),icon,title,content};});}
function deleteLesson(){const{lesson,unit}=getLesson(activeLesson);showConfirm(`هل تريد حذف درس "${lesson.name}" نهائياً؟`,()=>{const idx=unit.lessons.findIndex(l=>l.id===activeLesson.lessonId);unit.lessons.splice(idx,1);saveCurriculum();activeLesson=null;renderSidebar();renderStats();showOverview();});}
function openAddLesson(){const grade=Object.values(curriculum)[0];const sem=grade.semesters[0];const unit=sem.units[0];addLessonToUnit(grade.id,sem.id,unit.id);}
function addLessonToUnit(gradeId,semId,unitId){const grade=curriculum[gradeId];const sem=grade.semesters.find(s=>s.id===semId);const unit=sem.units.find(u=>u.id===unitId);const newId=`${unitId}l${unit.lessons.length + 1}_${Date.now()}`;const newLesson={id:newId,name:'درس جديد',objectives:[''],summary:'',keyPoints:[''],questions:[],images:[],customSections:[]};unit.lessons.push(newLesson);saveCurriculum();renderSidebar();renderStats();selectLesson(gradeId,semId,unitId,newId);}
function openQuestionBuilder(editIdx=null){qbState={editIdx};document.getElementById('qb-overlay').classList.remove('hidden');document.getElementById('question-builder').classList.remove('hidden');document.getElementById('qb-title').textContent=editIdx!==null?'✏️ تعديل سؤال':'➕ إضافة سؤال';if(editIdx!==null){const{lesson}=getLesson(activeLesson);const q=lesson.questions[editIdx];document.getElementById('qb-type-select').classList.add('hidden');document.getElementById('qb-form').classList.remove('hidden');renderQuestionForm(q.type,q);}else{document.getElementById('qb-type-select').classList.remove('hidden');document.getElementById('qb-form').classList.add('hidden');}}
function closeQuestionBuilder(){document.getElementById('qb-overlay').classList.add('hidden');document.getElementById('question-builder').classList.add('hidden');qbState={};}
function backToTypes(){document.getElementById('qb-type-select').classList.remove('hidden');document.getElementById('qb-form').classList.add('hidden');}
function selectQuestionType(type){qbState.type=type;document.getElementById('qb-type-select').classList.add('hidden');document.getElementById('qb-form').classList.remove('hidden');renderQuestionForm(type);}
function renderQuestionForm(type,existing=null){const content=document.getElementById('qb-form-content');qbState.type=type;if(type==='mcq'){const opts=existing?existing.options:['','','',''];const ans=existing?existing.answer:0;content.innerHTML=`
      <div class="qb-field">
        <label class="qb-label">نص السؤال</label>
        <textarea class="qb-textarea" id="q-question" oninput="updatePreview()">${escHtml(existing?.question || '')}</textarea>
      </div>
      <div class="qb-field">
        <label class="qb-label">الخيارات (اختر الإجابة الصحيحة بالنقر على الدائرة)</label>
        <div class="options-list" id="options-list">
          ${opts.map((opt, i) => `<div class="option-row ${i === ans ? 'selected' : ''}"id="opt-row-${i}"><input type="radio"class="option-radio"name="correct-opt"value="${i}"
${i===ans?'checked':''}
onchange="selectOption(${i})"><input class="option-input"placeholder="الخيار ${i+1}"value="${escHtml(opt)}"
oninput="updatePreview()"></div>`).join('')}
        </div>
      </div>`;}else if(type==='tf'){const ans=existing?existing.answer:null;content.innerHTML=`
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
      </div>`;qbState.tfAnswer=ans;}else if(type==='match'){const pairs=existing?existing.pairs:[['',''],['',''],['','']];content.innerHTML=`
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
              ${pairs.map((p, i) => `<div class="match-pair-row"><input class="match-input"id="ma-${i}"value="${escHtml(p[0])}"placeholder="العنصر ${i+1}"oninput="updatePreview()"><button class="match-del"onclick="deleteMatchPair(${i})">✕</button></div>`).join('')}
            </div>
          </div>
          <div>
            <div class="match-col-label">العمود الثاني</div>
            <div class="match-pairs" id="match-col-b">
              ${pairs.map((p, i) => `<div class="match-pair-row"><input class="match-input"id="mb-${i}"value="${escHtml(p[1])}"placeholder="المقابل ${i+1}"oninput="updatePreview()"></div>`).join('')}
            </div>
          </div>
        </div>
        <button class="add-match-btn" onclick="addMatchPair()" style="margin-top:10px">+ إضافة زوج</button>
      </div>`;qbState.pairCount=pairs.length;}else if(type==='fill'){const sentences=existing?existing.sentences:[['','',''],['','',''],['','','']];qbState.fillCount=sentences.length;const rows=sentences.map((s,i)=>`
      <div class="match-pair-row fill-sentence-row" id="fillrow-${i}">
        <span class="pair-num">${i+1}</span>
        <input class="match-input" id="fs-before-${i}" placeholder="النص قبل الفراغ" value="${escHtml(s[0] || '')}" oninput="updatePreview()">
        <input class="match-input fill-ans-input" id="fs-answer-${i}" placeholder="الإجابة ★" value="${escHtml(s[1] || '')}" oninput="updatePreview()" title="الإجابة الصحيحة">
        <input class="match-input" id="fs-after-${i}" placeholder="النص بعد الفراغ (اختياري)" value="${escHtml(s[2] || '')}" oninput="updatePreview()">
        <button class="match-del" onclick="deleteFillSentence(${i})">✕</button>
      </div>`).join('');content.innerHTML=`
      <div class="qb-field">
        <label class="qb-label">تعليمات السؤال</label>
        <input class="qb-input" id="q-question" placeholder="مثال: أملأ الفراغات بالكلمة المناسبة:"
               value="${escHtml(existing?.question || 'أملأ الفراغات بالكلمة المناسبة:')}" oninput="updatePreview()">
      </div>
      <div class="qb-field">
        <label class="qb-label">الجمل — (نص قبل | الإجابة ★ | نص بعد)</label>
        <div id="fill-sentences-list">${rows}</div>
        <button class="add-match-btn" onclick="addFillSentence()" style="margin-top:10px">+ إضافة جملة</button>
      </div>`;}
updatePreview();}
function selectOption(idx){document.querySelectorAll('.option-row').forEach((row,i)=>{row.classList.toggle('selected',i===idx);});updatePreview();}
function selectTF(val){qbState.tfAnswer=val;document.getElementById('tf-true').className=`tf-opt ${val === true  ? 'active-true'  : ''}`;document.getElementById('tf-false').className=`tf-opt ${val === false ? 'active-false' : ''}`;updatePreview();}
function addMatchPair(){qbState.pairCount=(qbState.pairCount||0)+1;const i=qbState.pairCount-1;document.getElementById('match-col-a').insertAdjacentHTML('beforeend',`
    <div class="match-pair-row">
      <input class="match-input" id="ma-${i}" placeholder="العنصر ${i+1}" oninput="updatePreview()">
      <button class="match-del" onclick="deleteMatchPair(${i})">✕</button>
    </div>`);document.getElementById('match-col-b').insertAdjacentHTML('beforeend',`
    <div class="match-pair-row">
      <input class="match-input" id="mb-${i}" placeholder="المقابل ${i+1}" oninput="updatePreview()">
    </div>`);updatePreview();}
function deleteMatchPair(i){const rowA=document.querySelector(`#ma-${i}`)?.closest('.match-pair-row');const rowB=document.querySelector(`#mb-${i}`)?.closest('.match-pair-row');if(rowA)rowA.remove();if(rowB)rowB.remove();updatePreview();}
function addFillSentence(){qbState.fillCount=(qbState.fillCount||0)+1;const i=qbState.fillCount-1;document.getElementById('fill-sentences-list').insertAdjacentHTML('beforeend',`
    <div class="match-pair-row fill-sentence-row" id="fillrow-${i}">
      <span class="pair-num">${i+1}</span>
      <input class="match-input" id="fs-before-${i}" placeholder="النص قبل الفراغ" oninput="updatePreview()">
      <input class="match-input fill-ans-input" id="fs-answer-${i}" placeholder="الإجابة ★" oninput="updatePreview()" title="الإجابة الصحيحة">
      <input class="match-input" id="fs-after-${i}" placeholder="النص بعد الفراغ (اختياري)" oninput="updatePreview()">
      <button class="match-del" onclick="deleteFillSentence(${i})">✕</button>
    </div>`);updatePreview();}
function deleteFillSentence(i){const row=document.getElementById(`fillrow-${i}`);if(row)row.remove();updatePreview();}
function updatePreview(){const preview=document.getElementById('qb-preview');const type=qbState.type;const questionEl=document.getElementById('q-question');const question=questionEl?questionEl.value:'';let html=`<div class="preview-label">معاينة</div>`;if(type==='mcq'){const opts=document.querySelectorAll('.option-row input[type=text], .option-input');const checkedRadio=document.querySelector('input[name=correct-opt]:checked');const correctIdx=checkedRadio?parseInt(checkedRadio.value):0;html+=`<div class="preview-question">${escHtml(question) || 'نص السؤال...'}</div>`;html+=`<div class="preview-options">`;opts.forEach((opt,i)=>{html+=`<div class="preview-opt ${i === correctIdx ? 'correct' : ''}">${escHtml(opt.value) || `الخيار ${i+1}`}</div>`;});html+=`</div>`;}else if(type==='tf'){const ans=qbState.tfAnswer;html+=`<div class="preview-question">${escHtml(question) || 'نص الجملة...'}</div>`;html+=`<div style="font-size:14px;margin-top:8px">الإجابة: <strong style="color:${ans === true ? 'var(--success)' : ans === false ? 'var(--danger)' : 'var(--text-light)'}">
      ${ans === true ? '✅ صح' : ans === false ? '❌ خطأ' : 'لم تُحدَّد بعد'}</strong></div>`;}else if(type==='match'){html+=`<div class="preview-question">${escHtml(question) || 'عنوان الوصل...'}</div>`;const count=qbState.pairCount||0;html+=`<div style="font-size:13px;color:var(--text-mid);margin-top:6px">`;for(let i=0;i<count;i++){const a=document.getElementById(`ma-${i}`)?.value||'';const b=document.getElementById(`mb-${i}`)?.value||'';if(a||b)html+=`<div style="padding:4px 0">${escHtml(a)} ←→ ${escHtml(b)}</div>`;}
html+=`</div>`;}else if(type==='fill'){html+=`<div class="preview-question">${escHtml(question) || 'أملأ الفراغات...'}</div>`;const count=qbState.fillCount||0;html+=`<div style="font-size:13px;color:var(--text-mid);margin-top:6px;line-height:2">`;for(let i=0;i<count;i++){const before=document.getElementById(`fs-before-${i}`)?.value||'';const answer=document.getElementById(`fs-answer-${i}`)?.value||'';const after=document.getElementById(`fs-after-${i}`)?.value||'';if(before||answer){html+=`<div style="padding:4px 0">${escHtml(before)} <span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:6px;font-weight:700">${escHtml(answer) || '___'}</span> ${escHtml(after)}</div>`;}}
html+=`</div>`;}
preview.innerHTML=html;}
function saveQuestion(){const type=qbState.type;const questionEl=document.getElementById('q-question');const question=questionEl?.value?.trim();if(!question){showToast('⚠️ أدخل نص السؤال');return;}
let q={type,question};if(type==='mcq'){const opts=[...document.querySelectorAll('.option-input')].map(el=>el.value.trim());const checkedRadio=document.querySelector('input[name=correct-opt]:checked');const answer=checkedRadio?parseInt(checkedRadio.value):0;if(opts.some(o=>!o)){showToast('⚠️ أكمل جميع الخيارات');return;}
q={...q,options:opts,answer};}else if(type==='tf'){if(qbState.tfAnswer===null||qbState.tfAnswer===undefined){showToast('⚠️ اختر صح أو خطأ');return;}
q={...q,answer:qbState.tfAnswer};}else if(type==='match'){const pairs=[];const count=qbState.pairCount||0;for(let i=0;i<count;i++){const a=document.getElementById(`ma-${i}`)?.value?.trim();const b=document.getElementById(`mb-${i}`)?.value?.trim();if(a&&b)pairs.push([a,b]);}
if(pairs.length<2){showToast('⚠️ أضف زوجين على الأقل');return;}
q={...q,pairs};}else if(type==='fill'){const sentences=[];const count=qbState.fillCount||0;for(let i=0;i<count;i++){const before=document.getElementById(`fs-before-${i}`)?.value?.trim()||'';const answer=document.getElementById(`fs-answer-${i}`)?.value?.trim()||'';const after=document.getElementById(`fs-after-${i}`)?.value?.trim()||'';if(answer)sentences.push([before,answer,after]);}
if(!sentences.length){showToast('⚠️ أضف جملة واحدة على الأقل مع إجابة');return;}
q={...q,sentences};}
const{lesson}=getLesson(activeLesson);if(qbState.editIdx!==null&&qbState.editIdx!==undefined){lesson.questions[qbState.editIdx]=q;showToast('✅ تم تعديل السؤال');}else{lesson.questions.push(q);showToast('✅ تم إضافة السؤال');}
closeQuestionBuilder();saveCurriculum();refreshQuestionsList();}
function editQuestion(idx){openQuestionBuilder(idx);}
function deleteQuestion(idx){showConfirm('هل تريد حذف هذا السؤال؟',()=>{const{lesson}=getLesson(activeLesson);lesson.questions.splice(idx,1);saveCurriculum();refreshQuestionsList();showToast('🗑 تم حذف السؤال');});}
function refreshQuestionsList(){const{lesson}=getLesson(activeLesson);const container=document.getElementById('questions-list');if(container){container.innerHTML=renderQuestionsList(lesson.questions);document.querySelector('.questions-title').textContent=`🎮 الأسئلة (${lesson.questions.length})`;}}
function exportJSON(){const content=`// ===================================================\n//  بيانات المناهج الدراسية - تم التصدير من لوحة التحكم\n// ===================================================\n\nconst CURRICULUM = ${JSON.stringify(curriculum, null, 2)};\n`;const blob=new Blob([content],{type:'application/javascript'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='data.js';a.click();URL.revokeObjectURL(url);showToast('📤 تم تصدير data.js');}
function importJSON(){document.getElementById('import-input').click();}
function handleImport(event){const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=(e)=>{try{let text=e.target.result.trim();if(text.startsWith('{')){curriculum=JSON.parse(text);}else{const match=text.match(/const CURRICULUM\s*=\s*(\{[\s\S]*\});?\s*$/);if(!match)throw new Error('تنسيق غير صالح');curriculum=JSON.parse(match[1]);}
saveCurriculum();renderSidebar();renderStats();showToast('📥 تم الاستيراد بنجاح');}catch(err){showToast('❌ خطأ في الملف: '+err.message);}
event.target.value='';};reader.readAsText(file);}
function deepClone(obj){return JSON.parse(JSON.stringify(obj));}
function escHtml(str){if(!str)return'';return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
let confirmCallback=null;function showConfirm(msg,cb){document.getElementById('confirm-msg').textContent=msg;document.getElementById('confirm-overlay').classList.remove('hidden');confirmCallback=cb;document.getElementById('confirm-ok').onclick=()=>{closeConfirm();cb();};}
function closeConfirm(){document.getElementById('confirm-overlay').classList.add('hidden');confirmCallback=null;}
let toastTimer;function showToast(msg){let toast=document.getElementById('dash-toast');if(!toast){toast=document.createElement('div');toast.id='dash-toast';toast.className='toast';document.body.appendChild(toast);}
toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2500);}
function _parseGrade(raw){const v=String(raw||'').trim().toLowerCase().replace('الرابع','4').replace('الخامس','5').replace('السادس','6').replace('fourth','4').replace('fifth','5').replace('sixth','6');if(v==='4'||v==='grade4')return'grade4';if(v==='5'||v==='grade5')return'grade5';if(v==='6'||v==='grade6')return'grade6';return null;}
function downloadExcelTemplate(){if(!window.XLSX){showToast('⚠ مكتبة Excel غير محملة');return;}
const data=[['الاسم','الصف','كلمة المرور'],['أحمد محمد العلي','4','1234'],['فاطمة علي الزهراني','5','5678'],['خالد سعد المطيري','6','abcd'],['نورة عبدالله القحطاني','4','pass1'],];const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=[{wch:30},{wch:12},{wch:16}];XLSX.utils.book_append_sheet(wb,ws,'الطلاب');XLSX.writeFile(wb,'نموذج_قائمة_الطلاب.xlsx');showToast('✅ تم تحميل النموذج');}
function handleExcelUpload(event){const file=event.target.files[0];if(!file)return;const errEl=document.getElementById('sp-excel-error');const previewEl=document.getElementById('sp-excel-preview');errEl.classList.add('hidden');previewEl.classList.add('hidden');previewEl.innerHTML='';if(!window.XLSX){errEl.textContent='⚠ مكتبة Excel غير محملة، أعد تحميل الصفحة.';errEl.classList.remove('hidden');return;}
const reader=new FileReader();reader.onload=function(e){try{const wb=XLSX.read(e.target.result,{type:'binary'});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});let dataRows=rows.filter(r=>r.some(c=>c!==''));if(dataRows.length&&isNaN(Number(dataRows[0][1]))&&String(dataRows[0][1]).toLowerCase().includes('صف')===false&&!_parseGrade(dataRows[0][1])){dataRows=dataRows.slice(1);}
const parsed=[];const errors=[];const gradeNames={grade4:'الرابع',grade5:'الخامس',grade6:'السادس'};dataRows.forEach((row,i)=>{const name=String(row[0]||'').trim();const grade=_parseGrade(row[1]);const pass=String(row[2]||'').trim();if(!name&&!grade&&!pass)return;if(!name){errors.push(`السطر ${i+2}: اسم الطالب مفقود`);return;}
if(!grade){errors.push(`السطر ${i+2}: الصف غير صحيح (${row[1]})`);return;}
if(!pass){errors.push(`السطر ${i+2}: كلمة المرور مفقودة`);return;}
parsed.push({name,grade,pass});});if(parsed.length===0&&errors.length===0){errEl.textContent='⚠ الملف فارغ أو لا يحتوي بيانات.';errEl.classList.remove('hidden');return;}
let html=`
        <div class="sp-excel-summary">
          <span class="sp-excel-count">✅ ${parsed.length} طالب جاهز للإضافة</span>
          ${errors.length ? `<span class="sp-excel-err-count">⚠ ${errors.length}سطر به مشكلة</span>` : ''}
        </div>`;if(errors.length){html+=`<ul class="sp-excel-errlist">${errors.map(e => `<li>${e}</li>`).join('')}</ul>`;}
if(parsed.length){html+=`
          <div class="sp-excel-table-wrap">
            <table class="sp-table" style="margin-top:10px">
              <thead><tr><th>#</th><th>الاسم</th><th>الصف</th><th>كلمة المرور</th></tr></thead>
              <tbody>
                ${parsed.slice(0, 8).map((s, i) => `<tr><td>${i+1}</td><td>${escHtml(s.name)}</td><td>${gradeNames[s.grade]}</td><td>${escHtml(s.pass)}</td></tr>`).join('')}
                ${parsed.length > 8 ? `<tr><td colspan="4"style="text-align:center;color:#64748b">...و${parsed.length-8}طالب آخر</td></tr>` : ''}
              </tbody>
            </table>
          </div>
          <button class="sp-excel-confirm-btn" onclick="importStudentsFromExcel()">
            ✅ إضافة ${parsed.length} طالب الآن
          </button>`;window._pendingExcelStudents=parsed;}
previewEl.innerHTML=html;previewEl.classList.remove('hidden');}catch(err){errEl.textContent='⚠ تعذّر قراءة الملف: '+err.message;errEl.classList.remove('hidden');}};reader.readAsBinaryString(file);event.target.value='';}
async function importStudentsFromExcel(){const students=window._pendingExcelStudents;if(!students||!students.length)return;const btn=document.querySelector('.sp-excel-confirm-btn');if(btn){btn.disabled=true;btn.textContent='⏳ جارٍ الإضافة...';}
let added=0,skipped=0;const skippedNames=[];for(const s of students){if(!window.StudentAuth)break;const res=await StudentAuth.addStudent(s.name,s.grade,s.pass);if(res.ok){added++;}else{skipped++;skippedNames.push(s.name);}}
window._pendingExcelStudents=null;let msg=`✅ تمت إضافة ${added} طالب بنجاح`;if(skipped)msg+=` · تم تخطي ${skipped} (مكرر أو خطأ)`;showToast(msg);if(skipped&&skippedNames.length){const previewEl=document.getElementById('sp-excel-preview');if(previewEl){previewEl.innerHTML=`<div class="sp-excel-summary">
        <span class="sp-excel-count">✅ تمت إضافة ${added} طالب</span>
        ${skipped ? `<span class="sp-excel-err-count">⚠ تم تخطي ${skipped}:${skippedNames.join('، ')}</span>` : ''}
      </div>`;}}else{document.getElementById('sp-excel-preview').classList.add('hidden');}
renderStudentPanel();}
document.addEventListener('DOMContentLoaded',init);