// ===================================================
//  نظام المظهر الليلي (Dark Mode)
// ===================================================

// ===== تفعيل المظهر الليلي عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
  const savedTheme = localStorage.getItem('theme-mode') || 'light';
  if (savedTheme === 'dark') {
    enableDarkMode();
  }
});

// ===== تبديل المظهر =====
function toggleDarkMode() {
  const body = document.body;
  const btn = document.querySelector('.theme-toggle');
  
  if (body.classList.contains('dark-mode')) {
    disableDarkMode();
  } else {
    enableDarkMode();
  }
}

// ===== تفعيل المظهر الليلي =====
function enableDarkMode() {
  document.body.classList.add('dark-mode');
  localStorage.setItem('theme-mode', 'dark');
  updateThemeIcon('☀️');
  applyDarkModeStyles();
}

// ===== تعطيل المظهر الليلي =====
function disableDarkMode() {
  document.body.classList.remove('dark-mode');
  localStorage.setItem('theme-mode', 'light');
  updateThemeIcon('🌙');
  applyLightModeStyles();
}

// ===== تحديث أيقونة الزر =====
function updateThemeIcon(icon) {
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = icon;
  }
}

// ===== تطبيق أسلوب المظهر الليلي على العناصر المضافة ديناميكياً =====
function applyDarkModeStyles() {
  // تطبيق الأسلوب على جميع العناصر البيضاء
  document.querySelectorAll('.grade-card, .page-header, .unit-card, .content-section, .question-card').forEach(el => {
    if (document.body.classList.contains('dark-mode')) {
      el.style.backgroundColor = 'var(--white)';
    }
  });
}

// ===== تطبيق أسلوب المظهر الفاتح =====
function applyLightModeStyles() {
  document.querySelectorAll('.grade-card, .page-header, .unit-card, .content-section, .question-card').forEach(el => {
    if (!document.body.classList.contains('dark-mode')) {
      el.style.backgroundColor = '';
    }
  });
}
