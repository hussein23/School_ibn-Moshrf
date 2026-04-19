// ===================================================
//  محمّل بيانات المنهج
//  الأولوية: localStorage (فوري) ثم Firebase (دقيق)
// ===================================================

(function () {
  const STORAGE_KEY = 'ibn_moshrf_curriculum';

  function applyCurriculum(data) {
    if (!data || typeof data !== 'object') return false;
    try {
      Object.keys(data).forEach(function(key) { CURRICULUM[key] = data[key]; });
      Object.keys(CURRICULUM).forEach(function(key) {
        if (!data[key]) delete CURRICULUM[key];
      });
      return true;
    } catch(e) {
      console.warn('curriculum-loader: خطأ في تطبيق البيانات', e);
      return false;
    }
  }

  // ── الخطوة 1: تطبيق localStorage فوراً لعرض سريع ──
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) applyCurriculum(JSON.parse(saved));
  } catch(e) {}

  // ── الخطوة 2: عند وصول تحديث من Firebase ──
  // هذه الدالة تُستدعى من firebase-db.js عند كل تغيير يُرفعه المعلم
  window._onCurriculumUpdate = function(data) {
    if (!applyCurriculum(data)) return;

    // لا تُعد الرسم إذا كانت نافذة الدرس مفتوحة
    var modal = document.getElementById('lesson-modal');
    if (modal && !modal.classList.contains('hidden')) return;

    // أعد رسم العرض الحالي
    if (window._rerenderCurrentView) window._rerenderCurrentView();
  };

})();
