// ===================================================
//  محمّل البيانات - يُطبّق تعديلات localStorage على CURRICULUM
//  يُحمَّل مباشرة بعد data.js في كل صفحة
// ===================================================

(function () {
  const STORAGE_KEY = 'ibn_moshrf_curriculum';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    // استبدال محتوى CURRICULUM بالبيانات المعدّلة
    Object.keys(parsed).forEach(key => {
      CURRICULUM[key] = parsed[key];
    });
    // حذف أي صفوف حُذفت من اللوحة
    Object.keys(CURRICULUM).forEach(key => {
      if (!parsed[key]) delete CURRICULUM[key];
    });
  } catch (e) {
    console.warn('curriculum-loader: تعذّر تحميل البيانات المحفوظة', e);
  }
})();
