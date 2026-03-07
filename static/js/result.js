(function () {
    const scoreMetric = document.getElementById("scoreMetric");
    const accuracyMetric = document.getElementById("accuracyMetric");
    const answeredMetric = document.getElementById("answeredMetric");
    const unansweredMetric = document.getElementById("unansweredMetric");
    const timeUsedMetric = document.getElementById("timeUsedMetric");
    const avgTimeMetric = document.getElementById("avgTimeMetric");
    const performanceLabel = document.getElementById("performanceLabel");
    const emptyState = document.getElementById("emptyState");

    const resultsPanel = document.getElementById("resultsPanel");
    const reviewPanel = document.getElementById("reviewPanel");
    const reviewBtn = document.getElementById("reviewBtn");
    const reviewPrevBtn = document.getElementById("reviewPrevBtn");
    const reviewNextBtn = document.getElementById("reviewNextBtn");
    const reviewExitBtn = document.getElementById("reviewExitBtn");
    const reviewIndexDisplay = document.getElementById("reviewIndexDisplay");
    const reviewQuestionText = document.getElementById("reviewQuestionText");
    const reviewOptions = document.getElementById("reviewOptions");
    const reviewUserAnswer = document.getElementById("reviewUserAnswer");
    const reviewCorrectAnswer = document.getElementById("reviewCorrectAnswer");
    const reviewExplanationRow = document.getElementById("reviewExplanationRow");
    const reviewExplanation = document.getElementById("reviewExplanation");

    if (
        !scoreMetric ||
        !accuracyMetric ||
        !answeredMetric ||
        !unansweredMetric ||
        !timeUsedMetric ||
        !avgTimeMetric ||
        !performanceLabel ||
        !emptyState ||
        !resultsPanel ||
        !reviewPanel ||
        !reviewBtn ||
        !reviewPrevBtn ||
        !reviewNextBtn ||
        !reviewExitBtn ||
        !reviewIndexDisplay ||
        !reviewQuestionText ||
        !reviewOptions ||
        !reviewUserAnswer ||
        !reviewCorrectAnswer ||
        !reviewExplanationRow ||
        !reviewExplanation
    ) {
        return;
    }

    SessionManager.clearSession();

    let reviewIndex = 0;
    let reviewQuestions = [];
    let reviewUserAnswers = {};

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
        reviewBtn.style.display = "none";
    }

    function clampReviewIndex(index) {
        if (!Array.isArray(reviewQuestions) || reviewQuestions.length === 0) {
            return 0;
        }
        if (!Number.isInteger(index)) {
            return 0;
        }
        return Math.min(Math.max(index, 0), reviewQuestions.length - 1);
    }

    function getOptionLabelByIndex(question, optionIndex) {
        if (!question || !Array.isArray(question.options) || !Number.isInteger(optionIndex)) {
            return "Not available";
        }
        if (optionIndex < 0 || optionIndex >= question.options.length) {
            return "Not available";
        }
        return question.options[optionIndex];
    }

    function updateReviewNavigationButtons() {
        reviewPrevBtn.disabled = reviewIndex <= 0;
        reviewNextBtn.disabled = reviewIndex >= reviewQuestions.length - 1;
    }

    function renderReviewQuestion(index) {
        if (!Array.isArray(reviewQuestions) || reviewQuestions.length === 0) {
            return;
        }

        reviewIndex = clampReviewIndex(index);
        const question = reviewQuestions[reviewIndex];
        if (!question || !Array.isArray(question.options)) {
            return;
        }

        const userAnswerValue = reviewUserAnswers[String(reviewIndex)];
        const userAnswerIndex = Number.isInteger(Number(userAnswerValue)) ? Number(userAnswerValue) : null;
        const correctAnswerIndex = Number.isInteger(Number(question.correct_answer)) ? Number(question.correct_answer) : null;

        reviewIndexDisplay.textContent = "Question " + (reviewIndex + 1) + " of " + reviewQuestions.length;
        reviewQuestionText.textContent = question.question || "";

        let optionsHtml = "";
        question.options.forEach(function (optionText, optionIndex) {
            let stateClass = "normal_option";
            if (correctAnswerIndex === optionIndex) {
                stateClass = "correct_option";
            } else if (userAnswerIndex === optionIndex && correctAnswerIndex !== userAnswerIndex) {
                stateClass = "user_wrong_option";
            }

            optionsHtml += '<li class="' + stateClass + '">' + optionText + "</li>";
        });
        reviewOptions.innerHTML = optionsHtml;

        if (userAnswerIndex === null || !Number.isInteger(userAnswerIndex)) {
            reviewUserAnswer.textContent = "Not answered";
        } else {
            const answerText = getOptionLabelByIndex(question, userAnswerIndex);
            if (correctAnswerIndex === userAnswerIndex) {
                reviewUserAnswer.textContent = answerText + " (Correct)";
            } else {
                reviewUserAnswer.textContent = answerText + " (Incorrect)";
            }
        }

        reviewCorrectAnswer.textContent = getOptionLabelByIndex(question, correctAnswerIndex) + " (Correct)";

        const explanation = typeof question.explanation === "string" ? question.explanation.trim() : "";
        if (explanation) {
            reviewExplanation.textContent = explanation;
            reviewExplanationRow.style.display = "block";
        } else {
            reviewExplanation.textContent = "";
            reviewExplanationRow.style.display = "none";
        }

        updateReviewNavigationButtons();
    }

    function startReviewMode() {
        if (!Array.isArray(reviewQuestions) || reviewQuestions.length === 0) {
            return;
        }
        resultsPanel.style.display = "none";
        reviewPanel.style.display = "block";
        reviewIndex = 0;
        renderReviewQuestion(reviewIndex);
    }

    function goToNextReviewQuestion() {
        if (reviewIndex >= reviewQuestions.length - 1) {
            return;
        }
        renderReviewQuestion(reviewIndex + 1);
    }

    function goToPreviousReviewQuestion() {
        if (reviewIndex <= 0) {
            return;
        }
        renderReviewQuestion(reviewIndex - 1);
    }

    function exitReviewMode() {
        reviewPanel.style.display = "none";
        resultsPanel.style.display = "block";
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

        reviewQuestions = questions;
        reviewUserAnswers = userAnswers;

        if (!reviewQuestions.length) {
            reviewBtn.style.display = "none";
        }
    } catch (error) {
        showEmptyState();
        return;
    }

    reviewBtn.addEventListener("click", function () {
        startReviewMode();
    });

    reviewNextBtn.addEventListener("click", function () {
        goToNextReviewQuestion();
    });

    reviewPrevBtn.addEventListener("click", function () {
        goToPreviousReviewQuestion();
    });

    reviewExitBtn.addEventListener("click", function () {
        exitReviewMode();
    });

    window.startReviewMode = startReviewMode;
    window.renderReviewQuestion = renderReviewQuestion;
    window.goToNextReviewQuestion = goToNextReviewQuestion;
    window.goToPreviousReviewQuestion = goToPreviousReviewQuestion;
    window.exitReviewMode = exitReviewMode;
})();
