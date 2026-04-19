// ===================================================
//  Firebase Database Layer
//  طبقة قاعدة البيانات - تربط التطبيق بـ Firebase
//  مع نسخة احتياطية على localStorage
// ===================================================

(function () {

  let _cache   = {};       // نسخة الذاكرة من بيانات الطلاب
  let _ready   = false;    // هل جهزت Firebase؟
  let _queue   = [];       // وظائف تنتظر الجهوزية
  let _useFirebase = false;

  // ── بيانات المناهج ──
  let _curriculumCache = null;   // نسخة الذاكرة من المنهج
  let _curriculumReady = false;
  let _curriculumQueue = [];
  let _ignoreNextCurriculumUpdate = false; // لتجنب حلقة عند الحفظ

  // ──────────────────────────────
  //  تهيئة Firebase
  // ──────────────────────────────
  function _init() {
    const cfg = window.FIREBASE_CONFIG;

    // إذا لم يكن هناك إعدادات Firebase → استخدم localStorage كاحتياط
    if (!cfg || !window.firebase ||
        cfg.apiKey === 'PASTE_YOUR_API_KEY_HERE' ||
        !cfg.databaseURL) {
      console.info('[FirebaseDB] لم يتم ضبط Firebase — سيُستخدم localStorage');
      _ready = true;
      _flush();
      return;
    }

    try {
      // تهيئة تطبيق Firebase (مرة واحدة فقط)
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(cfg);
      }

      _useFirebase = true;

      // ── مستمع بيانات الطلاب ──
      const studentsRef = firebase.database().ref('ibn_moshrf_students');
      studentsRef.on('value', function (snapshot) {
        _cache = snapshot.val() || {};

        if (!_ready) {
          _ready = true;
          _flush();
        }

        // تحديث الواجهة عند وصول بيانات جديدة
        if (window.StudentAuth) {
          window.StudentAuth.updateStudentBar();
          if (window._refreshLeaderboard) window._refreshLeaderboard();
        }
      }, function (err) {
        console.error('[FirebaseDB] خطأ في القراءة:', err);
        try {
          _cache = JSON.parse(localStorage.getItem('ibn_moshrf_students')) || {};
        } catch(_) { _cache = {}; }
        _ready = true;
        _flush();
      });

      // ── مستمع بيانات المنهج ──
      const curriculumRef = firebase.database().ref('ibn_moshrf_curriculum');
      curriculumRef.on('value', function (snapshot) {
        const val = snapshot.val();

        if (!_curriculumReady) {
          // أول قراءة: خزّن البيانات وأطلق الصف المنتظِر
          if (val) _curriculumCache = val;
          _curriculumReady = true;
          _curriculumQueue.forEach(fn => fn());
          _curriculumQueue = [];
          return;
        }

        // تحديث لاحق: جاء من جهاز آخر (مثلاً المعلم حفظ تعديلاً)
        if (_ignoreNextCurriculumUpdate) {
          _ignoreNextCurriculumUpdate = false;
          return;
        }

        if (val) {
          _curriculumCache = val;
          // خزّن في localStorage حتى يعمل بدون إنترنت
          try { localStorage.setItem('ibn_moshrf_curriculum', JSON.stringify(val)); } catch(e) {}
          // أخبر curriculum-loader بالتحديث
          if (window._onCurriculumUpdate) window._onCurriculumUpdate(val);
        }
      }, function (err) {
        console.error('[FirebaseDB] خطأ في قراءة المنهج:', err);
        _curriculumReady = true;
        _curriculumQueue.forEach(fn => fn());
        _curriculumQueue = [];
      });

    } catch (err) {
      console.error('[FirebaseDB] خطأ في التهيئة:', err);
      _ready = true;
      _flush();
    }
  }

  // تشغيل الوظائف المنتظِرة
  function _flush() {
    _queue.forEach(fn => fn());
    _queue = [];
  }

  // ──────────────────────────────
  //  API عامة
  // ──────────────────────────────

  // انتظر حتى تجهز قاعدة البيانات ثم نفّذ fn
  function onReady(fn) {
    if (_ready) fn();
    else _queue.push(fn);
  }

  // اقرأ البيانات (متزامن من الذاكرة)
  function dbLoad() {
    return _cache;
  }

  // احفظ البيانات (في الذاكرة + Firebase/localStorage)
  function dbSave(data) {
    _cache = data;

    if (_useFirebase) {
      firebase.database().ref('ibn_moshrf_students').set(data)
        .catch(err => console.error('[FirebaseDB] خطأ في الحفظ:', err));
    } else {
      // احتياط: localStorage
      try {
        localStorage.setItem('ibn_moshrf_students', JSON.stringify(data));
      } catch(e) {}
    }
  }

  // حذف طالب واحد بكفاءة (بدلاً من تحديث الكل)
  function dbDeleteStudent(id) {
    delete _cache[id];
    if (_useFirebase) {
      firebase.database().ref('ibn_moshrf_students/' + id).remove()
        .catch(err => console.error('[FirebaseDB] خطأ في الحذف:', err));
    } else {
      try {
        localStorage.setItem('ibn_moshrf_students', JSON.stringify(_cache));
      } catch(e) {}
    }
  }

  // تحديث حقول محددة لطالب (بكفاءة)
  function dbUpdateStudent(id, fields) {
    if (!_cache[id]) return;
    Object.assign(_cache[id], fields);
    if (_useFirebase) {
      firebase.database().ref('ibn_moshrf_students/' + id).update(fields)
        .catch(err => console.error('[FirebaseDB] خطأ في التحديث:', err));
    } else {
      try {
        localStorage.setItem('ibn_moshrf_students', JSON.stringify(_cache));
      } catch(e) {}
    }
  }

  // هل يعمل مع Firebase؟
  function isFirebaseActive() { return _useFirebase; }

  // ──────────────────────────────
  //  API المنهج
  // ──────────────────────────────

  function onCurriculumReady(fn) {
    if (_curriculumReady) fn();
    else _curriculumQueue.push(fn);
  }

  function dbLoadCurriculum() {
    return _curriculumCache;
  }

  function dbSaveCurriculum(data) {
    _curriculumCache = data;
    // حفظ محلي فوري
    try { localStorage.setItem('ibn_moshrf_curriculum', JSON.stringify(data)); } catch(e) {}

    if (_useFirebase) {
      _ignoreNextCurriculumUpdate = true; // تجنب إعادة الرسم على نفس الجهاز
      firebase.database().ref('ibn_moshrf_curriculum').set(data)
        .catch(function(err) {
          console.error('[FirebaseDB] خطأ في حفظ المنهج:', err);
          _ignoreNextCurriculumUpdate = false;
        });
    }
  }

  // ──────────────────────────────
  //  تعريض الـ API
  // ──────────────────────────────
  window.FirebaseDB = {
    onReady,
    dbLoad,
    dbSave,
    dbDeleteStudent,
    dbUpdateStudent,
    isFirebaseActive,
    onCurriculumReady,
    dbLoadCurriculum,
    dbSaveCurriculum
  };

  // ابدأ التهيئة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
