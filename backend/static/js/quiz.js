(function () {
    const TIMER_BASE_CLASS = "m-0 text-[clamp(1.8rem,calc(2vw+1rem),2.7rem)] font-extrabold tracking-[0.06em] transition-[color,text-shadow,transform] duration-200 ease-in-out";
    const TIMER_GOLD_CLASS = "text-[#d4af37] [text-shadow:0_0_18px_rgba(212,175,55,0.25)]";
    const TIMER_MEDIUM_CLASS = "text-[#f59e0b] [text-shadow:0_0_18px_rgba(245,158,11,0.3)]";
    const TIMER_LOW_CLASS = "text-[#ef4444] [text-shadow:0_0_20px_rgba(239,68,68,0.35)] animate-pulse";
    const NAV_BUTTON_BASE_CLASS = "q-nav-btn min-w-0 w-full h-[42px] rounded-xl border border-[#343948] bg-[#232734] text-[#f5f3ef] font-bold cursor-pointer transition-[transform,box-shadow,border-color,background,color] duration-200 ease-in-out hover:-translate-y-px hover:shadow-[0_10px_20px_rgba(0,0,0,0.22)] max-[640px]:h-[38px] max-[640px]:rounded-[10px]";
    const NAV_CURRENT_CLASS = "bg-[linear-gradient(135deg,rgba(212,175,55,0.88),#f5df90)] border-[rgba(245,223,144,0.9)] text-[#1a160b] shadow-[0_0_0_1px_rgba(212,175,55,0.12),0_12px_20px_rgba(212,175,55,0.2)]";
    const NAV_ANSWERED_CLASS = "bg-[rgba(30,166,114,0.18)] border-[rgba(30,166,114,0.55)] text-[#dff9ef]";
    const NAV_UNANSWERED_CLASS = "bg-[#2a303c] border-[#39404e] text-[#d2d7e2]";
    const OPTION_BASE_CLASS = "quiz-option relative flex cursor-pointer items-center gap-[14px] rounded-[10px] border border-[#333846] bg-[rgba(255,255,255,0.02)] px-4 py-[14px] transition-[transform,box-shadow,border-color,background] duration-200 ease-in-out hover:border-[rgba(212,175,55,0.46)] hover:bg-[rgba(255,255,255,0.04)] hover:shadow-[0_0_0_1px_rgba(212,175,55,0.12),0_10px_22px_rgba(0,0,0,0.24)]";
    const OPTION_SELECTED_CLASS = "border-[#d4af37] bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(255,255,255,0.04))] shadow-[0_0_0_1px_rgba(212,175,55,0.18),0_14px_26px_rgba(0,0,0,0.28)] scale-[1.01]";
    const OPTION_INDICATOR_BASE_CLASS = "quiz-option-indicator h-5 w-5 shrink-0 rounded-full border-2 border-[rgba(255,255,255,0.35)] bg-transparent transition-[border-color,box-shadow,background] duration-200 ease-in-out";
    const OPTION_INDICATOR_SELECTED_CLASS = "border-[#d4af37] bg-[radial-gradient(circle,#d4af37_0_45%,transparent_50%)] shadow-[0_0_12px_rgba(212,175,55,0.28)]";
    const container = document.getElementById("quizContainer");
    const form = document.getElementById("quizForm");
    const submitBtn = form ? form.querySelector("button[type='submit']") : null;
    const timerDisplay = document.getElementById("timerDisplay");
    const progressDisplay = document.getElementById("progress");
    const progressBarFill = document.getElementById("progressBarFill");
    const panelProgress = document.getElementById("panelProgress");
    const panelRemaining = document.getElementById("panelRemaining");
    const panelTimeLeft = document.getElementById("panelTimeLeft");
    const panelAvgTime = document.getElementById("panelAvgTime");

    if (
        !container ||
        !form ||
        !submitBtn ||
        !timerDisplay ||
        !progressDisplay ||
        !progressBarFill ||
        !panelProgress ||
        !panelRemaining ||
        !panelTimeLeft ||
        !panelAvgTime
    ) {
        return;
    }

    let session = SessionManager.loadSession();
    let timerInterval = null;
    let isSubmitted = false;
    let panelContainer = null;

    function formatTime(totalSeconds) {
        const safeSeconds = Math.max(0, Math.floor(totalSeconds));
        const mins = Math.floor(safeSeconds / 60);
        const secs = safeSeconds % 60;
        return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }

    function hasQuizData(quizList) {
        return Array.isArray(quizList) && quizList.length > 0;
    }

    function isElementVisible(element) {
        if (!element) {
            return false;
        }
        return element.style.display !== "none" && element.offsetParent !== null;
    }

    function isTypingTarget(target) {
        if (!target) {
            return false;
        }
        const tagName = target.tagName ? target.tagName.toLowerCase() : "";
        const type = target.type ? String(target.type).toLowerCase() : "";
        const isTextInput = tagName === "input" && (
            type === "text" ||
            type === "search" ||
            type === "email" ||
            type === "password" ||
            type === "url" ||
            type === "tel" ||
            type === "number"
        );
        return Boolean(
            target.isContentEditable ||
            tagName === "textarea" ||
            tagName === "select" ||
            isTextInput
        );
    }

    function shouldIgnoreQuizKeyboardInput(event) {
        const loader = document.getElementById("quizLoader");
        const errorPanel = document.getElementById("errorPanel");
        return (
            !hasQuizData(session.quiz) ||
            isSubmitted ||
            isElementVisible(loader) ||
            isElementVisible(errorPanel) ||
            isTypingTarget(event.target)
        );
    }

    function clampQuestionIndex(index, quizLength) {
        if (quizLength <= 0) {
            return 0;
        }
        if (!Number.isInteger(index)) {
            return 0;
        }
        return Math.min(Math.max(index, 0), quizLength - 1);
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = "Time Left: " + formatTime(session.timeRemaining);
        const totalTime = Math.max(0, Math.floor(session.totalTime || 0));
        const ratio = totalTime > 0 ? session.timeRemaining / totalTime : 1;
        if (ratio < 0.2) {
            timerDisplay.className = TIMER_BASE_CLASS + " " + TIMER_LOW_CLASS;
            return;
        }
        if (ratio < 0.5) {
            timerDisplay.className = TIMER_BASE_CLASS + " " + TIMER_MEDIUM_CLASS;
            return;
        }
        timerDisplay.className = TIMER_BASE_CLASS + " " + TIMER_GOLD_CLASS;
    }

    function calculateStats() {
        const safeSession = session && typeof session === "object" ? session : {};
        const questions = Array.isArray(safeSession.quiz) ? safeSession.quiz : [];
        const userAnswers = safeSession.answers && typeof safeSession.answers === "object" ? safeSession.answers : {};
        const totalQuestions = questions.length;
        const answeredCount = Object.keys(userAnswers).length;
        const remaining = Math.max(0, totalQuestions - answeredCount);
        const timeRemaining = Math.max(0, Math.floor(safeSession.timeRemaining || 0));
        const totalTime = Math.max(0, Math.floor(safeSession.totalTime || 0));
        const timeSpent = Math.max(0, totalTime - timeRemaining);
        const avgTime = answeredCount > 0 ? Math.round(timeSpent / answeredCount) : 0;

        return {
            totalQuestions: totalQuestions,
            answeredCount: answeredCount,
            remaining: remaining,
            timeRemaining: timeRemaining,
            totalTime: totalTime,
            avgTime: avgTime
        };
    }

    function updateProgressPanel() {
        const stats = calculateStats();
        panelProgress.textContent = "Progress: " + stats.answeredCount + " / " + stats.totalQuestions;
        panelRemaining.textContent = "Remaining: " + stats.remaining;
        panelTimeLeft.textContent = "Time Left: " + formatTime(stats.timeRemaining);
        panelAvgTime.textContent = "Average Time per Question: " + stats.avgTime + " sec";
        submitBtn.disabled = stats.answeredCount < 1 || isSubmitted;
    }

    function updateProgressDisplay() {
        const stats = calculateStats();
        progressDisplay.textContent = "Answered: " + stats.answeredCount + " / " + stats.totalQuestions;
        const completion = stats.totalQuestions > 0
            ? (stats.answeredCount / stats.totalQuestions) * 100
            : 0;
        progressBarFill.style.width = completion + "%";
    }

    function renderEmptyState() {
        container.innerHTML = ''
            + '<div class="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[rgba(255,255,255,0.03)] p-7">'
            + '<h3 class="mt-0">No quiz data found.</h3>'
            + '<a class="text-[#d4af37]" href="/quiz-config">Go to quiz setup</a>'
            + "</div>";
        submitBtn.disabled = true;
        timerDisplay.textContent = "Time Left: 00:00";
        progressDisplay.textContent = "Answered: 0 / 0";
        progressBarFill.style.width = "0%";
        timerDisplay.className = TIMER_BASE_CLASS + " " + TIMER_GOLD_CLASS;
        updateProgressPanel();
    }

    function getQuestionStatus(index) {
        if (index === session.currentQuestion) {
            return "current";
        }
        if (Object.prototype.hasOwnProperty.call(session.answers, String(index))) {
            return "answered";
        }
        return "unanswered";
    }

    function statusClass(status) {
        if (status === "current") {
            return NAV_CURRENT_CLASS;
        }
        if (status === "answered") {
            return NAV_ANSWERED_CLASS;
        }
        return NAV_UNANSWERED_CLASS;
    }

    function ensurePanelContainer() {
        if (panelContainer) {
            return panelContainer;
        }
        panelContainer = document.createElement("div");
        panelContainer.id = "questionNavigationPanel";
        const navigationMount = document.getElementById("questionNavigatorMount");
        if (navigationMount) {
            navigationMount.appendChild(panelContainer);
        } else {
            form.insertBefore(panelContainer, container);
        }
        return panelContainer;
    }

    function goToQuestion(index) {
        const target = clampQuestionIndex(index, session.quiz.length);
        if (target === session.currentQuestion) {
            return;
        }

        session.currentQuestion = target;
        SessionManager.updateSession({ currentQuestion: session.currentQuestion });
        renderQuestion();
        updateNavigationStyles();
        updateProgressPanel();
    }

    function nextQuestion() {
        const nextIndex = clampQuestionIndex(session.currentQuestion + 1, session.quiz.length);
        goToQuestion(nextIndex);
    }

    function previousQuestion() {
        const previousIndex = clampQuestionIndex(session.currentQuestion - 1, session.quiz.length);
        goToQuestion(previousIndex);
    }

    function selectAnswerOption(optionIndex) {
        const safeIndex = Number(optionIndex);
        if (!Number.isInteger(safeIndex) || safeIndex < 0) {
            return;
        }
        const selector = 'input[name="currentQuestionOption"][value="' + safeIndex + '"]';
        const optionRadio = container.querySelector(selector);
        if (!optionRadio) {
            return;
        }
        optionRadio.checked = true;
        optionRadio.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function handleQuizKeyboardInput(event) {
        if (shouldIgnoreQuizKeyboardInput(event)) {
            return;
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            nextQuestion();
            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            previousQuestion();
            return;
        }

        if (event.key >= "1" && event.key <= "4") {
            event.preventDefault();
            selectAnswerOption(Number(event.key) - 1);
        }
    }

    function renderNavigationPanel() {
        const host = ensurePanelContainer();
        let panelHtml = '<p class="mb-[10px] text-[0.9rem] text-[#b9bcc8]">Navigate by question number</p>';
        panelHtml += '<div class="grid grid-cols-5 gap-[10px] max-[640px]:gap-2">';

        for (let i = 0; i < session.quiz.length; i += 1) {
            panelHtml += ''
                + '<button type="button" class="' + NAV_BUTTON_BASE_CLASS + '" data-index="' + i + '" '
                + 'aria-label="Go to question ' + (i + 1) + '">'
                + (i + 1)
                + "</button>";
        }

        panelHtml += "</div>";
        host.innerHTML = panelHtml;

        const navButtons = host.querySelectorAll(".q-nav-btn");
        navButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                const idx = Number(btn.getAttribute("data-index"));
                if (Number.isInteger(idx)) {
                    goToQuestion(idx);
                }
            });
        });
    }

    function updateNavigationStyles() {
        const host = ensurePanelContainer();
        const navButtons = host.querySelectorAll(".q-nav-btn");
        navButtons.forEach(function (btn) {
            const idx = Number(btn.getAttribute("data-index"));
            if (!Number.isInteger(idx)) {
                return;
            }
            btn.className = NAV_BUTTON_BASE_CLASS + " " + statusClass(getQuestionStatus(idx));
        });
    }

    function renderQuestion() {
        const questionIndex = clampQuestionIndex(session.currentQuestion, session.quiz.length);
        session.currentQuestion = questionIndex;

        const q = session.quiz[questionIndex];
        if (!q || !Array.isArray(q.options)) {
            renderEmptyState();
            return;
        }

        const selectedValue = Object.prototype.hasOwnProperty.call(session.answers, String(questionIndex))
            ? String(session.answers[questionIndex])
            : null;

        let html = "";
        html += '<article class="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[rgba(255,255,255,0.03)] p-[25px] shadow-[0_18px_55px_rgba(0,0,0,0.35)] max-[640px]:p-[18px]">';
        html += '<p class="mb-[10px] mt-0 text-[0.85rem] font-bold uppercase tracking-[0.06em] text-[#d4af37]">Question ' + (questionIndex + 1) + ' of ' + session.quiz.length + "</p>";
        html += '<h3 class="m-0 text-[clamp(1.25rem,calc(1rem+1vw),1.85rem)] leading-[1.5] text-[#f5f3ef]">Q' + (questionIndex + 1) + ": " + q.question + "</h3>";
        html += '<div id="questionOptions" class="mt-[22px] grid gap-[10px]">';

        q.options.forEach(function (opt, optionIndex) {
            const isChecked = selectedValue === String(optionIndex) ? "checked" : "";
            const optionClass = isChecked ? OPTION_BASE_CLASS + " " + OPTION_SELECTED_CLASS : OPTION_BASE_CLASS;
            const indicatorClass = isChecked ? OPTION_INDICATOR_BASE_CLASS + " " + OPTION_INDICATOR_SELECTED_CLASS : OPTION_INDICATOR_BASE_CLASS;
            html += '' +
                '<label class="' + optionClass + '">' +
                '<input class="absolute opacity-0 pointer-events-none" type="radio" name="currentQuestionOption" value="' + optionIndex + '" ' + isChecked + ">" +
                '<span class="' + indicatorClass + '" aria-hidden="true"></span>' +
                '<span class="text-[1rem] leading-[1.5] text-[#f5f3ef]">' + opt + "</span>" +
                "</label>";
        });

        html += "</div>";
        html += "</article>";

        container.innerHTML = html;

        const radios = container.querySelectorAll('input[name="currentQuestionOption"]');
        radios.forEach(function (radio) {
            radio.addEventListener("change", function () {
                // Persist answer immediately on every selection change.
                const selected = Number(radio.value);
                session.answers[String(questionIndex)] = selected;
                SessionManager.updateSession({ answers: session.answers });
                const optionCards = container.querySelectorAll(".quiz-option");
                optionCards.forEach(function (card) {
                    card.className = OPTION_BASE_CLASS;
                    const indicator = card.querySelector(".quiz-option-indicator");
                    if (indicator) {
                        indicator.className = OPTION_INDICATOR_BASE_CLASS;
                    }
                });
                const parentLabel = radio.closest(".quiz-option");
                if (parentLabel) {
                    parentLabel.className = OPTION_BASE_CLASS + " " + OPTION_SELECTED_CLASS;
                    const activeIndicator = parentLabel.querySelector(".quiz-option-indicator");
                    if (activeIndicator) {
                        activeIndicator.className = OPTION_INDICATOR_BASE_CLASS + " " + OPTION_INDICATOR_SELECTED_CLASS;
                    }
                }
                updateProgressDisplay();
                updateNavigationStyles();
                updateProgressPanel();
            });
        });

        updateProgressPanel();
    }

    function collectAnswersForSubmit() {
        const answers = {};
        const keys = Object.keys(session.answers);

        keys.forEach(function (key) {
            const idx = Number(key);
            if (Number.isInteger(idx) && idx >= 0 && idx < session.quiz.length) {
                answers["q" + idx] = Number(session.answers[key]);
            }
        });

        return answers;
    }

    async function submitQuiz() {
        if (isSubmitted) {
            return;
        }

        if (!hasQuizData(session.quiz)) {
            return;
        }

        isSubmitted = true;
        submitBtn.disabled = true;

        if (timerInterval) {
            clearInterval(timerInterval);
        }

        try {
            const response = await fetch("/submit-quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    quiz: { questions: session.quiz },
                    answers: collectAnswersForSubmit()
                })
            });

            if (!response.ok) {
                throw new Error("Failed to submit quiz");
            }

            const result = await response.json();

            const quizSnapshot = {
                questions: Array.isArray(session.quiz) ? session.quiz : [],
                userAnswers: session.answers && typeof session.answers === "object" ? session.answers : {},
                totalTime: Number.isFinite(session.totalTime) ? Math.floor(session.totalTime) : 0,
                timeRemaining: Number.isFinite(session.timeRemaining) ? Math.floor(session.timeRemaining) : 0
            };

            localStorage.setItem("quizResult", JSON.stringify({
                score: Number.isFinite(result.score) ? result.score : 0,
                total: Number.isFinite(result.total) ? result.total : quizSnapshot.questions.length,
                questions: quizSnapshot.questions,
                userAnswers: quizSnapshot.userAnswers,
                totalTime: quizSnapshot.totalTime,
                timeRemaining: quizSnapshot.timeRemaining
            }));
            SessionManager.clearSession();
            window.location.href = "/result";
        } catch (error) {
            alert("Unable to submit quiz right now. Please try again.");
            isSubmitted = false;
            submitBtn.disabled = false;
        }
    }

    function startTimer() {
        updateTimerDisplay();
        updateProgressPanel();
        updateProgressDisplay();

        timerInterval = setInterval(function () {
            session.timeRemaining -= 1;

            if (session.timeRemaining <= 0) {
                session.timeRemaining = 0;
                SessionManager.updateSession({ timeRemaining: 0 });
                updateTimerDisplay();
                updateProgressPanel();
                submitQuiz();
                return;
            }

            // Persist every tick so countdown survives refreshes.
            SessionManager.updateSession({ timeRemaining: session.timeRemaining });
            updateTimerDisplay();
            updateProgressPanel();
        }, 1000);
    }

    function restoreFromLegacyStorage() {
        // Backward compatibility with previous storage key used by older builds.
        const legacy = localStorage.getItem("quizData");
        if (!legacy) {
            return null;
        }

        try {
            const parsed = JSON.parse(legacy);
            const quizQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
            if (!quizQuestions.length) {
                return null;
            }

            const fallbackSession = {
                quiz: quizQuestions,
                answers: {},
                currentQuestion: 0,
                timeRemaining: 60,
                totalTime: 60,
                startedAt: Date.now()
            };

            SessionManager.saveSession(fallbackSession);
            localStorage.removeItem("quizData");
            return fallbackSession;
        } catch (error) {
            return null;
        }
    }

    if (!session) {
        session = restoreFromLegacyStorage();
    }

    if (!session || !hasQuizData(session.quiz)) {
        renderEmptyState();
        return;
    }

    session.currentQuestion = clampQuestionIndex(session.currentQuestion, session.quiz.length);
    SessionManager.updateSession({ currentQuestion: session.currentQuestion });

    updateProgressPanel();
    renderQuestion();
    renderNavigationPanel();
    updateNavigationStyles();
    updateProgressDisplay();
    startTimer();

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitQuiz();
    });

    document.addEventListener("keydown", handleQuizKeyboardInput);
})();
