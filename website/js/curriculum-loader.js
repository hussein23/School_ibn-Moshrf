// ===================================================
//  محمّل البيانات - يُطبّق تعديلات المنهج
//  الأولوية: Firebase → localStorage → data.js الأصلي
// ===================================================

(function () {
  const STORAGE_KEY = 'ibn_moshrf_curriculum';

  // ── تطبيق بيانات المنهج على CURRICULUM ──
  function applyCurriculum(data) {
    if (!data || typeof data !== 'object') return false;
    try {
      // استبدل محتوى CURRICULUM بالبيانات الجديدة
      Object.keys(data).forEach(function(key) { CURRICULUM[key] = data[key]; });
      // احذف أي صفوف حُذفت من اللوحة
      Object.keys(CURRICULUM).forEach(function(key) {
        if (!data[key]) delete CURRICULUM[key];
      });
      return true;
    } catch(e) {
      console.warn('curriculum-loader: خطأ في تطبيق البيانات', e);
      return false;
    }
  }

  // ── الخطوة 1: تطبيق localStorage فوراً (عرض سريع) ──
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) applyCurriculum(JSON.parse(saved));
  } catch(e) {}

  // ── الخطوة 2: عند وصول تحديث من Firebase (من جهاز آخر) ──
  // هذه الدالة تُستدعى من firebase-db.js عند كل تحديث خارجي
  window._onCurriculumUpdate = function(data) {
    if (!applyCurriculum(data)) return;

    // لا تُعد الرسم إذا كانت نافذة الدرس مفتوحة
    const modal = document.getElementById('lesson-modal');
    if (modal && !modal.classList.contains('hidden')) return;

    // أعد رسم العرض الحالي
    if (window._rerenderCurrentView) window._rerenderCurrentView();
  };

})();
