// ===================================================
//  نظام دخول المعلم - يعمل على جميع صفحات الموقع
//  يستخدم نفس مفاتيح الجلسة الموجودة في dashboard.js
// ===================================================
(function () {

  const TEACHER_PIN_KEY = 'ibn_moshrf_teacher_pin';
  const TEACHER_SESSION = 'ibn_moshrf_teacher_auth';
  const PIN_SALT        = 'ibn_teacher_2025';

  // ── تشفير PIN (SHA-256) ──
  async function _hashPin(pin) {
    const enc  = new TextEncoder();
    const buf  = await crypto.subtle.digest('SHA-256', enc.encode(pin + PIN_SALT));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── فحص الجلسة ──
  function isTeacherLoggedIn() {
    return sessionStorage.getItem(TEACHER_SESSION) === '1';
  }

  // ── تسجيل الدخول ──
  async function teacherLogin(pin) {
    pin = (pin || '').trim();
    if (pin.length < 4) return { ok: false, msg: 'الرمز يجب أن يكون 4 أحرف على الأقل' };

    const hashed  = await _hashPin(pin);
    const stored  = localStorage.getItem(TEACHER_PIN_KEY);

    if (!stored) {
      // أول مرة: إنشاء رمز جديد
      localStorage.setItem(TEACHER_PIN_KEY, hashed);
      sessionStorage.setItem(TEACHER_SESSION, '1');
      return { ok: true, isNew: true };
    }

    if (hashed !== stored) {
      return { ok: false, msg: 'رمز الدخول غير صحيح' };
    }

    sessionStorage.setItem(TEACHER_SESSION, '1');
    return { ok: true };
  }

  // ── تسجيل الخروج ──
  function teacherLogout() {
    sessionStorage.removeItem(TEACHER_SESSION);
    _removeTeacherBar();
    _injectLoginFab();
  }

  // ── إزالة شريط المعلم ──
  function _removeTeacherBar() {
    const bar = document.getElementById('teacher-toolbar');
    if (bar) bar.remove();
  }

  // ===================================================
  //  الشريط العائم للمعلم (يظهر بعد تسجيل الدخول)
  // ===================================================
  function _injectTeacherBar() {
    _removeTeacherBar();
    const bar = document.createElement('div');
    bar.id = 'teacher-toolbar';
    bar.innerHTML = `
      <style>
        #teacher-toolbar {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          background: linear-gradient(135deg, #1565C0, #1976D2);
          border-radius: 50px;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 6px 24px rgba(21, 101, 192, 0.45);
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          animation: teacherBarIn 0.4s cubic-bezier(.34,1.56,.64,1);
          white-space: nowrap;
        }
        @keyframes teacherBarIn {
          from { transform: translateX(-50%) translateY(60px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        #teacher-toolbar .tb-label {
          color: rgba(255,255,255,0.75);
          font-size: 0.78rem;
          padding-left: 10px;
          border-left: 1px solid rgba(255,255,255,0.25);
        }
        #teacher-toolbar .tb-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 30px;
          border: none;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
        }
        #teacher-toolbar .tb-btn-exam {
          background: #fff;
          color: #1565C0;
        }
        #teacher-toolbar .tb-btn-exam:hover {
          background: #E3F2FD;
          transform: translateY(-1px);
        }
        #teacher-toolbar .tb-btn-dash {
          background: rgba(255,255,255,0.15);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.3);
        }
        #teacher-toolbar .tb-btn-dash:hover {
          background: rgba(255,255,255,0.25);
        }
        #teacher-toolbar .tb-btn-out {
          background: rgba(255,70,70,0.2);
          color: #ffcdd2;
          font-size: 0.78rem;
          padding: 5px 12px;
        }
        #teacher-toolbar .tb-btn-out:hover {
          background: rgba(255,70,70,0.35);
        }
      </style>
      <span class="tb-label">👨‍🏫 وضع المعلم</span>
      <a class="tb-btn tb-btn-exam" href="exam-builder.html" target="_blank">
        📋 منشئ الاختبار
      </a>
      <a class="tb-btn tb-btn-dash" href="dashboard.html" target="_blank">
        ⚙️ لوحة التحكم
      </a>
      <button class="tb-btn tb-btn-out" onclick="window.TeacherAuth.logout()">
        ↩ خروج
      </button>
    `;
    document.body.appendChild(bar);
  }

  // ===================================================
  //  زر الدخول العائم (FAB) عند عدم تسجيل الدخول
  // ===================================================
  function _injectLoginFab() {
    const existing = document.getElementById('teacher-login-fab');
    if (existing) existing.remove();
    const existingModal = document.getElementById('teacher-login-modal');
    if (existingModal) existingModal.remove();

    const fab = document.createElement('div');
    fab.id = 'teacher-login-fab';
    fab.innerHTML = `
      <style>
        #teacher-login-fab {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 9990;
        }
        #teacher-fab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          background: #1565C0;
          color: #fff;
          border: none;
          border-radius: 30px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(21,101,192,0.35);
          transition: all 0.2s;
          white-space: nowrap;
        }
        #teacher-fab-btn:hover {
          background: #0D47A1;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(21,101,192,0.45);
        }
        /* نافذة تسجيل الدخول */
        #teacher-login-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          animation: fadeInBg 0.2s ease;
        }
        @keyframes fadeInBg { from { opacity: 0; } to { opacity: 1; } }
        #teacher-login-box {
          background: #fff;
          border-radius: 16px;
          padding: 32px;
          width: 340px;
          max-width: 95vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: boxIn 0.3s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes boxIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        #teacher-login-box h2 {
          font-size: 1.2rem;
          margin-bottom: 6px;
          color: #1565C0;
          text-align: center;
        }
        #teacher-login-box p {
          font-size: 0.82rem;
          color: #888;
          text-align: center;
          margin-bottom: 20px;
        }
        #teacher-pin-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #E3F2FD;
          border-radius: 10px;
          font-family: 'Cairo', sans-serif;
          font-size: 1.1rem;
          text-align: center;
          letter-spacing: 4px;
          direction: ltr;
          transition: border-color 0.2s;
          margin-bottom: 8px;
        }
        #teacher-pin-input:focus {
          outline: none;
          border-color: #1976D2;
        }
        #teacher-pin-error {
          color: #C62828;
          font-size: 0.8rem;
          text-align: center;
          min-height: 20px;
          margin-bottom: 8px;
        }
        #teacher-pin-submit {
          width: 100%;
          padding: 12px;
          background: #1565C0;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 8px;
        }
        #teacher-pin-submit:hover { background: #0D47A1; }
        #teacher-pin-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        #teacher-pin-cancel {
          width: 100%;
          padding: 8px;
          background: transparent;
          color: #888;
          border: none;
          font-family: 'Cairo', sans-serif;
          font-size: 0.82rem;
          cursor: pointer;
        }
        #teacher-pin-cancel:hover { color: #333; }
      </style>
      <button id="teacher-fab-btn" onclick="window.TeacherAuth.showLoginModal()">
        🔑 دخول المعلم
      </button>
    `;
    document.body.appendChild(fab);
  }

  // ===================================================
  //  نافذة تسجيل الدخول
  // ===================================================
  function showLoginModal() {
    const existing = document.getElementById('teacher-login-modal');
    if (existing) existing.remove();

    const stored = localStorage.getItem(TEACHER_PIN_KEY);
    const isFirst = !stored;

    const modal = document.createElement('div');
    modal.id = 'teacher-login-modal';
    modal.innerHTML = `
      <div id="teacher-login-box">
        <h2>🔑 ${isFirst ? 'إنشاء رمز المعلم' : 'دخول المعلم'}</h2>
        <p>${isFirst
          ? 'أنشئ رمزاً سرياً (4 أحرف فأكثر) لحماية وضع المعلم'
          : 'أدخل رمز الدخول الخاص بك للوصول إلى أدوات المعلم'}</p>
        <input type="password" id="teacher-pin-input" placeholder="••••"
               maxlength="20" autocomplete="off">
        <div id="teacher-pin-error"></div>
        <button id="teacher-pin-submit" onclick="window.TeacherAuth._submitPin()">
          ${isFirst ? '✅ إنشاء الرمز والدخول' : '← دخول'}
        </button>
        <button id="teacher-pin-cancel" onclick="window.TeacherAuth.hideLoginModal()">
          إلغاء
        </button>
      </div>
    `;

    // إغلاق عند الضغط على الخلفية
    modal.addEventListener('click', function (e) {
      if (e.target === modal) window.TeacherAuth.hideLoginModal();
    });

    document.body.appendChild(modal);

    const input = modal.querySelector('#teacher-pin-input');
    if (input) {
      input.focus();
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') window.TeacherAuth._submitPin();
      });
    }
  }

  function hideLoginModal() {
    const modal = document.getElementById('teacher-login-modal');
    if (modal) modal.remove();
  }

  async function _submitPin() {
    const input  = document.getElementById('teacher-pin-input');
    const errEl  = document.getElementById('teacher-pin-error');
    const btn    = document.getElementById('teacher-pin-submit');
    const pin    = (input?.value || '').trim();

    if (errEl) errEl.textContent = '';
    if (btn) btn.disabled = true;

    const result = await teacherLogin(pin);

    if (btn) btn.disabled = false;

    if (!result.ok) {
      if (errEl) errEl.textContent = result.msg;
      if (input) { input.value = ''; input.focus(); }
      return;
    }

    hideLoginModal();
    const fab = document.getElementById('teacher-login-fab');
    if (fab) fab.remove();

    _injectTeacherBar();

    // رسالة ترحيب
    _showWelcome(result.isNew
      ? '✅ تم إنشاء رمزك وتسجيل دخولك بنجاح!'
      : '👨‍🏫 مرحباً! تم تسجيل دخولك كمعلم');
  }

  // ===================================================
  //  رسالة ترحيب مؤقتة
  // ===================================================
  function _showWelcome(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:80px; left:50%; transform:translateX(-50%);
      background:#1565C0; color:#fff; padding:10px 24px;
      border-radius:30px; font-family:'Cairo',sans-serif;
      font-size:0.9rem; font-weight:700; z-index:10001;
      box-shadow:0 4px 20px rgba(0,0,0,0.2);
      animation: fadeInBg 0.3s ease;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ===================================================
  //  تهيئة عند تحميل الصفحة
  // ===================================================
  function init() {
    if (isTeacherLoggedIn()) {
      _injectTeacherBar();
    } else {
      _injectLoginFab();
    }
  }

  // ===================================================
  //  API العامة
  // ===================================================
  window.TeacherAuth = {
    isLoggedIn: isTeacherLoggedIn,
    showLoginModal,
    hideLoginModal,
    logout: teacherLogout,
    _submitPin
  };

  // تشغيل بعد اكتمال تحميل DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
