// ===================================================
//  نظام الاحتفالات والرسوم المتحركة التفاعلية
// ===================================================

// ===== احتفالات عند الإجابة الصحيحة =====
function celebrateCorrectAnswer() {
  createConfetti();
  playSuccessAnimation();
  playCelebrationSound();
}

// ===== إنشاء بالونات احتفالية =====
function createConfetti() {
  const celebration = document.getElementById('celebration');
  celebration.classList.remove('hidden');
  celebration.innerHTML = '';

  const confettiPieces = 30;
  const colors = ['#FF6B35', '#2196F3', '#7C3AED', '#22C55E', '#F59E0B', '#EC4899'];

  for (let i = 0; i < confettiPieces; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.textContent = getRandomEmoji();
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = (Math.random() * 0.3) + 's';
    celebration.appendChild(confetti);
  }

  // إزالة الاحتفالات بعد انتهائها
  setTimeout(() => {
    celebration.classList.add('hidden');
  }, 2000);
}

// ===== رسم متحرك للنجاح =====
function playSuccessAnimation() {
  const modal = document.getElementById('lesson-modal');
  if (modal && !modal.classList.contains('hidden')) {
    const content = modal.querySelector('#lesson-content');
    
    // إضافة فئة الرسم المتحرك
    const success = document.createElement('div');
    success.className = 'success-burst';
    success.innerHTML = '✨ ممتاز! ✨';
    content.appendChild(success);

    // إزالة بعد الانتهاء
    setTimeout(() => {
      success.remove();
    }, 1500);
  }
}

// ===== أصوات احتفالية (اختياري - استخدام Web Audio API) =====
function playCelebrationSound() {
  // استخدام صيحة احتفالية بـ emoji
  console.log('🎉 تم الإجابة الصحيحة! 🎉');
}

// ===== الحصول على emoji عشوائي =====
function getRandomEmoji() {
  const emojis = ['🎉', '⭐', '✨', '🎊', '🌟', '💫', '🏆', '👏', '🎈'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// ===== رسوم متحركة لعناصر الصفحة =====
function addPageEnterAnimation() {
  const main = document.getElementById('main-content');
  const elements = main.querySelectorAll('.grade-card, .unit-card, .lesson-card');
  
  elements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(() => {
      el.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, index * 50);
  });
}

// ===== إضافة أنيميشن الهز عند اختيار إجابة خاطئة =====
function shakeElement(element) {
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 500);
}

// ===== إضافة نبض عند التصحيح =====
function pulseElement(element) {
  element.style.animation = 'pulse-large 0.6s ease-in-out';
  setTimeout(() => {
    element.style.animation = '';
  }, 600);
}

// ===== رسم متحرك عند الانتقال بين الصفحات =====
function pageTransition() {
  const main = document.getElementById('main-content');
  main.style.opacity = '0.7';
  main.style.transform = 'scale(0.95)';
  
  setTimeout(() => {
    main.style.transition = 'all 0.4s ease-out';
    main.style.opacity = '1';
    main.style.transform = 'scale(1)';
  }, 50);
}

// ===== استدعاء رسوم الصفحة عند بدء الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
  addPageEnterAnimation();
});

// ===== رسم متحرك عند التركيز على الأسئلة =====
function addQuestionAnimations() {
  const qcards = document.querySelectorAll('.question-card');
  qcards.forEach(card => {
    card.addEventListener('focus', () => {
      card.style.transform = 'scale(1.02)';
      card.style.boxShadow = 'var(--shadow-lg)';
    });
    card.addEventListener('blur', () => {
      card.style.transform = 'scale(1)';
      card.style.boxShadow = 'var(--shadow)';
    });
  });
}
