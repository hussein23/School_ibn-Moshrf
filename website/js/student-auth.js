window.StudentAuth=(function(){const STUDENTS_KEY='ibn_moshrf_students';const CURRENT_KEY='ibn_moshrf_current_student';const SALT='ibn_moshrf_salt_2025';const GRADE_NAMES={grade4:'الصف الرابع',grade5:'الصف الخامس',grade6:'الصف السادس'};const GRADE_COLORS={grade4:'#FF6B35',grade5:'#2196F3',grade6:'#7C3AED'};const GRADE_ICONS={grade4:'🟠',grade5:'🔵',grade6:'🟣'};const PTS_PER_CORRECT=10;const COMPLETION_BONUS=20;const MAX_ATTEMPTS=5;const LOCKOUT_MS=5*60*1000;async function _hashPassword(pw){const encoder=new TextEncoder();const data=encoder.encode(pw+SALT);const buf=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
function _getLockData(username){const key='ibn_lock_'+username.toLowerCase();try{return JSON.parse(sessionStorage.getItem(key))||{attempts:0};}
catch{return{attempts:0};}}
function _saveLockData(username,data){sessionStorage.setItem('ibn_lock_'+username.toLowerCase(),JSON.stringify(data));}
function _clearLockData(username){sessionStorage.removeItem('ibn_lock_'+username.toLowerCase());}
function _checkLock(username){const d=_getLockData(username);if(d.until&&Date.now()<d.until){const mins=Math.ceil((d.until-Date.now())/60000);return{locked:true,msg:`تم تجميد الحساب مؤقتاً. حاول بعد ${mins} دقيقة`};}
return{locked:false};}
function _recordFailedAttempt(username){const d=_getLockData(username);if(d.until&&Date.now()>=d.until){d.attempts=0;d.until=null;}
d.attempts=(d.attempts||0)+1;if(d.attempts>=MAX_ATTEMPTS){d.until=Date.now()+LOCKOUT_MS;d.attempts=0;}
_saveLockData(username,d);}
function _load(){if(window.FirebaseDB)return window.FirebaseDB.dbLoad();try{return JSON.parse(localStorage.getItem(STUDENTS_KEY))||{};}catch{return{};}}
function _save(d){if(window.FirebaseDB){window.FirebaseDB.dbSave(d);return;}
localStorage.setItem(STUDENTS_KEY,JSON.stringify(d));}
function getCurrent(){try{return JSON.parse(localStorage.getItem(CURRENT_KEY));}catch{return null;}}
function _setCurrent(s){if(s)localStorage.setItem(CURRENT_KEY,JSON.stringify({id:s.id,username:s.username,grade:s.grade}));else localStorage.removeItem(CURRENT_KEY);}
function getCurrentFull(){const cur=getCurrent();if(!cur)return null;return _load()[cur.id]||null;}
async function login(username,password){username=(username||'').trim();password=(password||'').trim();if(!username||!password)return{ok:false,msg:'يرجى إدخال الاسم وكلمة المرور'};const lock=_checkLock(username);if(lock.locked)return{ok:false,msg:lock.msg};const db=_load();const student=Object.values(db).find(s=>s.username.toLowerCase()===username.toLowerCase());if(!student)return{ok:false,msg:'هذا الاسم غير موجود — راجع معلمك'};const hashedInput=await _hashPassword(password);let passwordMatch=false;if(student.passwordHashed){passwordMatch=student.password===hashedInput;}else{passwordMatch=student.password===password;if(passwordMatch){student.password=hashedInput;student.passwordHashed=true;db[student.id]=student;_save(db);}}
if(!passwordMatch){_recordFailedAttempt(username);const d=_getLockData(username);const remaining=MAX_ATTEMPTS-(d.attempts||0);const remMsg=d.until?`تم تجميد الحساب. حاول بعد 5 دقائق`:`كلمة المرور غير صحيحة (${remaining} محاولة متبقية)`;return{ok:false,msg:remMsg};}
_clearLockData(username);_setCurrent(student);const db2=_load();if(db2[student.id]){db2[student.id].visitCount=(db2[student.id].visitCount||0)+1;db2[student.id].lastVisit=new Date().toISOString().slice(0,10);_save(db2);}
return{ok:true,student};}
function logout(){_setCurrent(null);updateHeaderBtn();updateStudentBar();if(window._refreshLeaderboard)window._refreshLeaderboard();}
async function addStudent(username,grade,password){username=(username||'').trim();password=(password||'').trim();if(!username||!grade||!password)return{ok:false,msg:'يرجى ملء جميع الحقول'};const db=_load();const exists=Object.values(db).find(s=>s.username.toLowerCase()===username.toLowerCase());if(exists)return{ok:false,msg:'هذا الاسم مسجّل بالفعل'};const id=crypto.randomUUID();const hashedPassword=await _hashPassword(password);const student={id,username,grade,password:hashedPassword,passwordHashed:true,points:0,lessons:{},visitCount:0,attemptCount:0,lastVisit:'',category:'normal',addedDate:new Date().toISOString().slice(0,10)};db[id]=student;_save(db);return{ok:true,student};}
function deleteStudent(id){const db=_load();delete db[id];_save(db);}
function updateStudent(id,fields){const db=_load();if(!db[id])return{ok:false};Object.assign(db[id],fields);_save(db);return{ok:true};}
function getAllStudents(){return Object.values(_load()).sort((a,b)=>(b.points||0)-(a.points||0));}
function resetPoints(id){const db=_load();if(db[id]){db[id].points=0;db[id].lessons={};_save(db);}}
function awardPoints(correct,total,lessonId,lessonGradeId){const cur=getCurrent();if(!cur)return null;const db=_load();const student=db[cur.id];if(!student)return null;const gradeMatch=!lessonGradeId||(student.grade===lessonGradeId);if(!gradeMatch){student.attemptCount=(student.attemptCount||0)+1;db[cur.id]=student;_save(db);return{earned:0,totalPoints:student.points||0,isRetry:false,wrongGrade:true};}
student.attemptCount=(student.attemptCount||0)+1;let earned=correct*PTS_PER_CORRECT;if(correct===total&&total>0)earned+=COMPLETION_BONUS;const isRetry=!!(lessonId&&student.lessons&&student.lessons[lessonId]);if(isRetry)earned=Math.floor(earned*0.5);if(earned<0)earned=0;student.points=(student.points||0)+earned;if(lessonId){student.lessons=student.lessons||{};const prev=student.lessons[lessonId];if(!prev||correct>=(prev.correct||0)){student.lessons[lessonId]={correct,total,date:new Date().toISOString().slice(0,10)};}}
db[cur.id]=student;_save(db);updateHeaderBtn();updateStudentBar();if(window._refreshLeaderboard)window._refreshLeaderboard();return{earned,totalPoints:student.points,isRetry,wrongGrade:false};}
function _getMotivation(pct,points,isRetry){if(pct===100)return{emoji:'🏆',msg:'مثالي! أنت نجم الفصل! استمر على هذا المستوى الرائع'};if(pct>=90)return{emoji:'⭐⭐',msg:'ممتاز جداً! قريب من الكمال — لا تتوقف!'};if(pct>=80)return{emoji:'⭐',msg:'جيد جداً! مجهود رائع — تستطيع الوصول للقمة!'};if(pct>=60)return{emoji:'👍',msg:'جيد! راجع الدرس مرة أخرى وستتحسن أكثر'};if(isRetry)return{emoji:'💪',msg:'لا تيأس — المحاولة المتكررة طريق النجاح!'};return{emoji:'📖',msg:'راجع الدرس بعناية وحاول مجدداً — أنت تستطيع!'};}
function getGradeRank(studentId){const db=_load();const st=db[studentId];if(!st)return null;const sameGrade=Object.values(db).filter(s=>s.grade===st.grade).sort((a,b)=>(b.points||0)-(a.points||0));const pos=sameGrade.findIndex(s=>s.id===studentId)+1;return{rank:pos,total:sameGrade.length};}
function getLeaderboard(limit){limit=limit||15;return Object.values(_load()).sort((a,b)=>(b.points||0)-(a.points||0)).slice(0,limit).map((s,i)=>({rank:i+1,id:s.id,username:s.username,grade:s.grade,gradeName:GRADE_NAMES[s.grade]||s.grade,gradeColor:GRADE_COLORS[s.grade]||'#64748B',gradeIcon:GRADE_ICONS[s.grade]||'📚',points:s.points||0,lessons:Object.keys(s.lessons||{}).length}));}
function updateHeaderBtn(){const area=document.getElementById('student-header-area');if(area)area.innerHTML='';}
function updateStudentBar(){const bar=document.getElementById('student-bar');if(!bar)return;const cur=getCurrent();const full=cur?getCurrentFull():null;bar.classList.add('sb-visible');if(cur&&full){const gc=GRADE_COLORS[full.grade]||'#3B82F6';const gn=GRADE_NAMES[full.grade]||full.grade;const gi=GRADE_ICONS[full.grade]||'📚';const gradeRankData=getGradeRank(full.id);const rank=gradeRankData?gradeRankData.rank:null;const rankOf=gradeRankData?gradeRankData.total:null;const rankVal=rank===1?'🥇 الأول':rank===2?'🥈 الثاني':rank===3?'🥉 الثالث':rank?`#${rank} من ${rankOf}`:'—';bar.innerHTML=`
        <div class="sb-card">
          <div class="sb-card-bg">🎓</div>
          <div class="sb-card-inner">
            <div class="sb-block">
              <div class="sb-avatar" style="background:${gc}" id="sb-avatar-icon"></div>
              <div class="sb-block-text">
                <span class="sb-block-label">اسم الطالب</span>
                <span class="sb-block-value" id="sb-username-val"></span>
              </div>
            </div>
            <div class="sb-divider"></div>
            <div class="sb-block">
              <div class="sb-block-icon" id="sb-grade-icon"></div>
              <div class="sb-block-text">
                <span class="sb-block-label">الصف الدراسي</span>
                <span class="sb-block-value" id="sb-grade-val"></span>
              </div>
            </div>
            <div class="sb-divider"></div>
            <div class="sb-block">
              <div class="sb-block-icon">⭐</div>
              <div class="sb-block-text">
                <span class="sb-block-label">مجموع النقاط</span>
                <span class="sb-block-value sb-pts-val" id="sb-pts-live"></span>
              </div>
            </div>
            <div class="sb-divider"></div>
            <div class="sb-block">
              <div class="sb-block-icon">🏆</div>
              <div class="sb-block-text">
                <span class="sb-block-label">الترتيب</span>
                <span class="sb-block-value" id="sb-rank-val"></span>
              </div>
            </div>
            <button class="sb-logout-btn" onclick="StudentAuth.logout()">↩ خروج</button>
          </div>
        </div>`;document.getElementById('sb-avatar-icon').textContent=full.username[0]||'?';document.getElementById('sb-username-val').textContent=full.username;document.getElementById('sb-grade-icon').textContent=gi;document.getElementById('sb-grade-val').textContent=gn;document.getElementById('sb-pts-live').textContent=full.points;document.getElementById('sb-rank-val').textContent=rankVal;}else{bar.innerHTML=`
        <div class="sb-card">
          <div class="sb-card-bg">🔑</div>
          <div class="sb-card-inner">
            <div class="sb-block">
              <div class="sb-block-icon">🎓</div>
              <div class="sb-block-text">
                <span class="sb-block-label">بوابة الطالب</span>
                <span class="sb-block-value" style="font-size:16px;opacity:.85">سجّل دخولك</span>
              </div>
            </div>
            <div class="sb-divider"></div>
            <div class="sb-block">
              <div class="sb-block-icon">👤</div>
              <div class="sb-block-text">
                <span class="sb-block-label">اسم الطالب</span>
                <input class="sb-val-input" id="sb-username" type="text"
                       placeholder="أدخل اسمك" autocomplete="off">
              </div>
            </div>
            <div class="sb-divider"></div>
            <div class="sb-block">
              <div class="sb-block-icon">🔑</div>
              <div class="sb-block-text">
                <span class="sb-block-label">كلمة المرور</span>
                <input class="sb-val-input" id="sb-password" type="password"
                       placeholder="••••••">
              </div>
            </div>
            <button class="sb-login-btn" onclick="StudentAuth._doBarLogin()">دخول ←</button>
            <div id="sb-err-msg" class="sb-err-msg hidden"></div>
          </div>
        </div>`;const pw=bar.querySelector('#sb-password');if(pw)pw.addEventListener('keydown',e=>{if(e.key==='Enter')_doBarLogin();});const un=bar.querySelector('#sb-username');if(un)un.addEventListener('keydown',e=>{if(e.key==='Enter')bar.querySelector('#sb-password')?.focus();});}}
async function _doBarLogin(){const nameEl=document.getElementById('sb-username');const passEl=document.getElementById('sb-password');const errEl=document.getElementById('sb-err-msg');const btn=document.querySelector('.sb-login-btn');if(!nameEl||!passEl)return;if(btn)btn.disabled=true;const res=await login(nameEl.value,passEl.value);if(btn)btn.disabled=false;if(!res.ok){if(errEl){errEl.textContent='⚠ '+res.msg;errEl.classList.remove('hidden');}
nameEl.classList.add('sb-err-shake');passEl.classList.add('sb-err-shake');setTimeout(()=>{nameEl.classList.remove('sb-err-shake');passEl.classList.remove('sb-err-shake');if(errEl)errEl.classList.add('hidden');},2200);return;}
updateStudentBar();_welcomeToast(res.student.username,res.student.points);if(window._refreshLeaderboard)window._refreshLeaderboard();}
function showPointsToast(earned,totalPoints,isRetry){if(earned<=0)return;const t=document.createElement('div');t.className='points-toast';t.innerHTML=`
      <div class="pt-star">⭐</div>
      <div class="pt-body">
        <strong>+${earned} نقطة${isRetry ? ' (إعادة)' : ''}</strong>
        <span>مجموعك: ${totalPoints} نقطة</span>
      </div>`;document.body.appendChild(t);setTimeout(()=>t.classList.add('pt-show'),30);setTimeout(()=>{t.classList.remove('pt-show');setTimeout(()=>t.remove(),400);},3500);const ptsEl=document.getElementById('sb-pts-live');if(ptsEl){ptsEl.textContent=totalPoints;ptsEl.classList.add('pts-bump');setTimeout(()=>ptsEl.classList.remove('pts-bump'),400);}}
function _welcomeToast(name,points){const t=document.createElement('div');t.className='points-toast';const strong=document.createElement('strong');strong.textContent='أهلاً '+name+'!';const span=document.createElement('span');span.textContent='رصيدك: '+points+' نقطة';t.innerHTML='<div class="pt-star">👋</div>';const body=document.createElement('div');body.className='pt-body';body.appendChild(strong);body.appendChild(span);t.appendChild(body);document.body.appendChild(t);setTimeout(()=>t.classList.add('pt-show'),30);setTimeout(()=>{t.classList.remove('pt-show');setTimeout(()=>t.remove(),400);},3200);}
function init(){const doInit=function(){updateHeaderBtn();updateStudentBar();};if(window.FirebaseDB){window.FirebaseDB.onReady(doInit);}else{if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',doInit);}else{doInit();}}}
init();return{getCurrent,getCurrentFull,login,logout,addStudent,deleteStudent,updateStudent,getAllStudents,resetPoints,awardPoints,getLeaderboard,getGradeRank,_getMotivation,updateHeaderBtn,updateStudentBar,showPointsToast,_doBarLogin};})();