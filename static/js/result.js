const storageKey = 'quizResult';

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function getPerformanceTier(accuracy) {
  if (accuracy >= 80) return { label: 'Advanced Level', color: 'text-lime-300' };
  if (accuracy >= 50) return { label: 'Intermediate Level', color: 'text-yellow-300' };
  return { label: 'Beginner Level', color: 'text-pink-200' };
}

function getFeedbackMessage(accuracy) {
  if (accuracy >= 80) return "Excellent performance! You're mastering this topic.";
  if (accuracy >= 50) return 'Good effort! Keep practicing to improve.';
  return 'Needs improvement. Review concepts and try again.';
}

function setEmptyState() {
  const w = id => document.getElementById(id);
  w('scoreValue').textContent = '0/0';
  w('answeredValue').textContent = '0';
  w('unansweredValue').textContent = '0';
  w('totalTimeValue').textContent = '00:00';
  w('avgTimeValue').textContent = '0 sec';
  w('needsReviewValue').textContent = '0';
  w('feedbackText').textContent = 'No quiz data available. Please take a quiz first.';
  w('accuracyValue').textContent = '0%';
  w('performanceBadge').textContent = 'Beginner Level';
  document.getElementById('scoreBar').style.width = '0%';
  document.getElementById('answeredBar').style.width = '0%';
  document.getElementById('unansweredBar').style.width = '0%';
  document.getElementById('needsReviewBar').style.width = '0%';
  const circle = document.getElementById('progressRing');
  if (circle) {
    circle.setAttribute('stroke-dasharray', '565.48');
    circle.setAttribute('stroke-dashoffset', '565.48');
  }
  document.getElementById('reviewQuestions').innerHTML = '<p class="text-white/80">No questions to review.</p>';
}

function computeAndRender() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) { setEmptyState(); return; }

  let payload;
  try { payload = JSON.parse(raw); } catch { setEmptyState(); return; }

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const totalQuestions = Number(payload.total) || questions.length || 0;
  let score = Number(payload.score);
  score = Number.isFinite(score) ? Math.max(0, score) : 0;
  score = Math.min(score, totalQuestions);

  const userAnswers = payload.userAnswers && typeof payload.userAnswers === 'object' ? payload.userAnswers : {};
  const answered = Math.min(Object.keys(userAnswers).length, totalQuestions);
  const unanswered = Math.max(totalQuestions - answered, 0);

  const needsReview = questions.reduce((acc, question, idx) => {
    const uid = question.id != null ? String(question.id) : String(idx);
    const user = userAnswers[uid];
    const correct = question.correct_answer;
    if (user == null || user === '') return acc;
    if (String(user).trim() !== String(correct).trim()) return acc + 1;
    return acc;
  }, 0);

  const totalTime = Number(payload.totalTime) || 0;
  const avgTime = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;
  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  document.getElementById('scoreValue').textContent = `${score}/${totalQuestions}`;
  document.getElementById('answeredValue').textContent = String(answered);
  document.getElementById('unansweredValue').textContent = String(unanswered);
  document.getElementById('totalTimeValue').textContent = formatTime(totalTime);
  document.getElementById('avgTimeValue').textContent = `${avgTime} sec`;
  document.getElementById('needsReviewValue').textContent = String(needsReview);

  const scorePct = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  const answeredPct = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
  const unansweredPct = totalQuestions > 0 ? (unanswered / totalQuestions) * 100 : 0;
  const reviewPct = totalQuestions > 0 ? (needsReview / totalQuestions) * 100 : 0;

  document.getElementById('scoreBar').style.width = `${Math.min(100, Math.max(0, scorePct))}%`;
  document.getElementById('answeredBar').style.width = `${Math.min(100, Math.max(0, answeredPct))}%`;
  document.getElementById('unansweredBar').style.width = `${Math.min(100, Math.max(0, unansweredPct))}%`;
  document.getElementById('needsReviewBar').style.width = `${Math.min(100, Math.max(0, reviewPct))}%`;

  const ring = document.getElementById('progressRing');
  if (ring) {
    const radius = Number(ring.getAttribute('r')) || 90;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.max(0, Math.min(100, accuracy)) / 100);
    ring.setAttribute('stroke-dasharray', `${circumference}`);
    ring.setAttribute('stroke-dashoffset', `${offset}`);
  }

  document.getElementById('accuracyValue').textContent = `${Math.max(0, Math.min(100, accuracy))}%`;

  const tier = getPerformanceTier(accuracy);
  const badge = document.getElementById('performanceBadge');
  badge.textContent = tier.label;
  badge.className = `mt-4 mb-8 inline-flex px-5 py-2 border rounded-full text-xs font-bold tracking-widest uppercase ${tier.color}`;

  document.getElementById('feedbackText').textContent = getFeedbackMessage(accuracy);

  const reviewQuestionsNode = document.getElementById('reviewQuestions');
  reviewQuestionsNode.innerHTML = '';

  if (!questions.length) {
    reviewQuestionsNode.innerHTML = '<p class="text-white/80">No questions available for review.</p>';
  } else {
    questions.forEach((question, idx) => {
      const uid = question.id != null ? String(question.id) : String(idx);
      const userAnswer = userAnswers[uid] ?? 'No answer';
      const correctAnswer = question.correct_answer ?? 'N/A';
      const isCorrect = String(userAnswer).trim() === String(correctAnswer).trim();

      const block = document.createElement('article');
      block.className = `rounded-lg p-4 ${isCorrect ? 'border-l-4 border-lime-400 bg-white/5' : 'border-l-4 border-rose-400 bg-white/5'}`;
      block.innerHTML = `
        <div class="text-xs text-white/70 mb-1">Question ${idx + 1}</div>
        <div class="text-sm font-semibold text-white mb-2">${question.question ?? 'Unknown question'}</div>
        <div class="text-xs text-white/70">Your Answer: <span class="font-semibold ${isCorrect ? 'text-lime-300' : 'text-rose-300'}">${userAnswer}</span></div>
        <div class="text-xs text-white/70">Correct Answer: <span class="font-semibold text-yellow-300">${correctAnswer}</span></div>
      `;
      reviewQuestionsNode.appendChild(block);
    });
  }
}

function openReview() {
  const modal = document.getElementById('reviewModal');
  const inner = document.getElementById('reviewScrollInner');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.setAttribute('aria-hidden', 'false');
  // Re-trigger the entry animation every time
  if (inner) {
    inner.classList.remove('review-animate');
    void inner.offsetWidth; // force reflow to reset animation
    inner.classList.add('review-animate');
  }
}

function closeReview() {
  const modal = document.getElementById('reviewModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  modal.setAttribute('aria-hidden', 'true');
}

function setupHandlers() {
  document.getElementById('reviewBtn').addEventListener('click', () => {
    computeAndRender();
    openReview();
  });

  document.getElementById('closeReview').addEventListener('click', closeReview);

  document.getElementById('takeAnother').addEventListener('click', () => {
    localStorage.removeItem(storageKey);
    window.location.href = '/quiz-config';
  });

  document.getElementById('reviewModal').addEventListener('click', (event) => {
    if (event.target.id === 'reviewModal') closeReview();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeReview();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  computeAndRender();
  setupHandlers();
});
