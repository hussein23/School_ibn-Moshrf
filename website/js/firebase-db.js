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
  let _ignoreNextCurriculumUpdate = false; // لتجنب حلقة عند الحفظ

  // ──────────────────────────────
  //  تهيئة Firebase
  // ──────────────────────────────
  function _init() {
    const cfg = window.FIREBASE_CONFIG;

    if (!cfg || !window.firebase ||
        cfg.apiKey === 'PASTE_YOUR_API_KEY_HERE' ||
        !cfg.databaseURL) {
      console.info('[FirebaseDB] لم يتم ضبط Firebase — سيُستخدم localStorage');
      _ready = true;
      _flush();
      return;
    }

    try {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(cfg);
      }

      _useFirebase = true;

      // ── مستمع بيانات الطلاب ──
      const studentsRef = firebase.database().ref('ibn_moshrf_students');
      studentsRef.on('value', function (snapshot) {
        _cache = snapshot.val() || {};
        if (!_ready) { _ready = true; _flush(); }
        if (window.StudentAuth) {
          window.StudentAuth.updateStudentBar();
          if (window._refreshLeaderboard) window._refreshLeaderboard();
        }
      }, function (err) {
        console.error('[FirebaseDB] خطأ في قراءة الطلاب:', err);
        try { _cache = JSON.parse(localStorage.getItem('ibn_moshrf_students')) || {}; } catch(_) { _cache = {}; }
        _ready = true;
        _flush();
      });

      // ── مستمع بيانات المنهج (مخزّن كـ JSON string لتجنب تحويل المصفوفات) ──
      const curriculumRef = firebase.database().ref('ibn_moshrf_curriculum_v2');
      curriculumRef.on('value', function (snapshot) {
        const jsonStr = snapshot.val();

        if (_ignoreNextCurriculumUpdate) {
          _ignoreNextCurriculumUpdate = false;
          return;
        }

        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr);
            // حفظ محلي للعمل بدون إنترنت
            try { localStorage.setItem('ibn_moshrf_curriculum', jsonStr); } catch(e) {}
            // إبلاغ curriculum-loader بالتحديث الجديد
            if (window._onCurriculumUpdate) window._onCurriculumUpdate(data);
          } catch(e) {
            console.error('[FirebaseDB] خطأ في تحليل المنهج:', e);
          }
        }
      }, function (err) {
        console.error('[FirebaseDB] خطأ في قراءة المنهج:', err);
      });

    } catch (err) {
      console.error('[FirebaseDB] خطأ في التهيئة:', err);
      _ready = true;
      _flush();
    }
  }

  function _flush() {
    _queue.forEach(fn => fn());
    _queue = [];
  }

  // ──────────────────────────────
  //  API الطلاب
  // ──────────────────────────────
  function onReady(fn) {
    if (_ready) fn();
    else _queue.push(fn);
  }

  function dbLoad() { return _cache; }

  function dbSave(data) {
    _cache = data;
    if (_useFirebase) {
      firebase.database().ref('ibn_moshrf_students').set(data)
        .catch(err => console.error('[FirebaseDB] خطأ في الحفظ:', err));
    } else {
      try { localStorage.setItem('ibn_moshrf_students', JSON.stringify(data)); } catch(e) {}
    }
  }

  function dbDeleteStudent(id) {
    delete _cache[id];
    if (_useFirebase) {
      firebase.database().ref('ibn_moshrf_students/' + id).remove()
        .catch(err => console.error('[FirebaseDB] خطأ في الحذف:', err));
    } else {
      try { localStorage.setItem('ibn_moshrf_students', JSON.stringify(_cache)); } catch(e) {}
    }
  }

  function dbUpdateStudent(id, fields) {
    if (!_cache[id]) return;
    Object.assign(_cache[id], fields);
    if (_useFirebase) {
      firebase.database().ref('ibn_moshrf_students/' + id).update(fields)
        .catch(err => console.error('[FirebaseDB] خطأ في التحديث:', err));
    } else {
      try { localStorage.setItem('ibn_moshrf_students', JSON.stringify(_cache)); } catch(e) {}
    }
  }

  function isFirebaseActive() { return _useFirebase; }

  // ──────────────────────────────
  //  API المنهج
  // ──────────────────────────────
  function dbSaveCurriculum(data) {
    // نخزّن كـ JSON string لأن Firebase يحوّل المصفوفات إلى objects
    const jsonStr = JSON.stringify(data);
    try { localStorage.setItem('ibn_moshrf_curriculum', jsonStr); } catch(e) {}

    if (_useFirebase) {
      _ignoreNextCurriculumUpdate = true;
      firebase.database().ref('ibn_moshrf_curriculum_v2').set(jsonStr)
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
    dbSaveCurriculum
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
