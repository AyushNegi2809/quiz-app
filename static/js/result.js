(function () {
    const scoreMetric = document.getElementById("scoreMetric");
    const accuracyMetric = document.getElementById("accuracyMetric");
    const answeredMetric = document.getElementById("answeredMetric");
    const unansweredMetric = document.getElementById("unansweredMetric");
    const timeUsedMetric = document.getElementById("timeUsedMetric");
    const avgTimeMetric = document.getElementById("avgTimeMetric");
    const performanceLabel = document.getElementById("performanceLabel");
    const emptyState = document.getElementById("emptyState");

    if (
        !scoreMetric ||
        !accuracyMetric ||
        !answeredMetric ||
        !unansweredMetric ||
        !timeUsedMetric ||
        !avgTimeMetric ||
        !performanceLabel ||
        !emptyState
    ) {
        return;
    }

    SessionManager.clearSession();

    function formatTime(totalSeconds) {
        const safeSeconds = Math.max(0, Math.floor(totalSeconds));
        const mins = Math.floor(safeSeconds / 60);
        const secs = safeSeconds % 60;
        return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }

    function getPerformanceBucket(accuracy) {
        if (accuracy >= 80) {
            return { text: "Excellent", className: "excellent" };
        }
        if (accuracy >= 60) {
            return { text: "Good", className: "good" };
        }
        if (accuracy >= 40) {
            return { text: "Average", className: "average" };
        }
        return { text: "Needs Improvement", className: "needs-improvement" };
    }

    function showEmptyState() {
        performanceLabel.textContent = "No Data";
        performanceLabel.className = "performance-label needs-improvement";
        emptyState.style.display = "block";
    }

    const stored = localStorage.getItem("quizResult");
    if (!stored) {
        showEmptyState();
        return;
    }

    try {
        const result = JSON.parse(stored);
        const questions = Array.isArray(result.questions) ? result.questions : [];
        const userAnswers = result.userAnswers && typeof result.userAnswers === "object" ? result.userAnswers : {};
        const totalQuestions = questions.length > 0 ? questions.length : (Number.isFinite(result.total) ? result.total : 0);
        const answeredCount = Object.keys(userAnswers).length;
        const unanswered = Math.max(0, totalQuestions - answeredCount);
        const score = Number.isFinite(result.score) ? result.score : 0;
        const accuracy = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
        const totalTime = Number.isFinite(result.totalTime) ? result.totalTime : 0;
        const timeRemaining = Number.isFinite(result.timeRemaining) ? result.timeRemaining : 0;
        const timeUsed = Math.max(0, totalTime - timeRemaining);
        const avgTimePerQuestion = answeredCount > 0 ? Math.round(timeUsed / answeredCount) : 0;

        const performance = getPerformanceBucket(accuracy);

        scoreMetric.textContent = score + " / " + totalQuestions;
        accuracyMetric.textContent = Math.round(accuracy) + "%";
        answeredMetric.textContent = String(answeredCount);
        unansweredMetric.textContent = String(unanswered);
        timeUsedMetric.textContent = formatTime(timeUsed);
        avgTimeMetric.textContent = avgTimePerQuestion + " sec";

        performanceLabel.textContent = performance.text;
        performanceLabel.className = "performance-label " + performance.className;
        emptyState.style.display = "none";
    } catch (error) {
        showEmptyState();
    }
})();
