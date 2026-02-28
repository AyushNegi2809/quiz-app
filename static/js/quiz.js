(function () {
    const container = document.getElementById("quizContainer");
    const form = document.getElementById("quizForm");
    const submitBtn = form ? form.querySelector("button[type='submit']") : null;
    const timerDisplay = document.getElementById("timerDisplay");
    const progressDisplay = document.getElementById("progress");

    if (!container || !form || !submitBtn || !timerDisplay || !progressDisplay) {
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
    }

    function updateProgressDisplay() {
        const totalQuestions = session.quiz.length;
        const answeredCount = Object.keys(session.answers).length;
        progressDisplay.textContent = "Answered: " + answeredCount + " / " + totalQuestions;
    }

    function renderEmptyState() {
        container.innerHTML = '<h3>No quiz data found.</h3><a href="/quiz-config">Go to quiz setup</a>';
        submitBtn.disabled = true;
        timerDisplay.textContent = "Time Left: 00:00";
        progressDisplay.textContent = "Answered: 0 / 0";
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

    function statusStyle(status) {
        if (status === "current") {
            return "background:#2563eb;color:#fff;border:1px solid #1d4ed8;";
        }
        if (status === "answered") {
            return "background:#16a34a;color:#fff;border:1px solid #15803d;";
        }
        return "background:#9ca3af;color:#111827;border:1px solid #6b7280;";
    }

    function ensurePanelContainer() {
        if (panelContainer) {
            return panelContainer;
        }
        panelContainer = document.createElement("div");
        panelContainer.id = "questionNavigationPanel";
        panelContainer.style.margin = "12px 0 18px 0";
        form.insertBefore(panelContainer, container);
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
    }

    function renderNavigationPanel() {
        const host = ensurePanelContainer();
        let panelHtml = '<div style="font-weight:600;margin-bottom:8px;">Question Navigator</div>';
        panelHtml += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';

        for (let i = 0; i < session.quiz.length; i += 1) {
            const status = getQuestionStatus(i);
            panelHtml += ''
                + '<button type="button" class="q-nav-btn" data-index="' + i + '" '
                + 'style="min-width:38px;height:34px;border-radius:6px;cursor:pointer;' + statusStyle(status) + '">'
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
            btn.style.cssText = "min-width:38px;height:34px;border-radius:6px;cursor:pointer;" + statusStyle(getQuestionStatus(idx));
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
        html += "<h3>Q" + (questionIndex + 1) + ": " + q.question + "</h3>";
        html += '<div id="questionOptions">';

        q.options.forEach(function (opt, optionIndex) {
            const isChecked = selectedValue === String(optionIndex) ? "checked" : "";
            html += '' +
                '<label>' +
                '<input type="radio" name="currentQuestionOption" value="' + optionIndex + '" ' + isChecked + ">" +
                opt +
                "</label><br>";
        });

        html += "</div><br>";

        container.innerHTML = html;

        const radios = container.querySelectorAll('input[name="currentQuestionOption"]');
        radios.forEach(function (radio) {
            radio.addEventListener("change", function () {
                // Persist answer immediately on every selection change.
                const selected = Number(radio.value);
                session.answers[String(questionIndex)] = selected;
                SessionManager.updateSession({ answers: session.answers });
                updateProgressDisplay();
                updateNavigationStyles();
            });
        });
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
            localStorage.setItem("quizResult", JSON.stringify(result));
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

        timerInterval = setInterval(function () {
            session.timeRemaining -= 1;

            if (session.timeRemaining <= 0) {
                session.timeRemaining = 0;
                SessionManager.updateSession({ timeRemaining: 0 });
                updateTimerDisplay();
                submitQuiz();
                return;
            }

            // Persist every tick so countdown survives refreshes.
            SessionManager.updateSession({ timeRemaining: session.timeRemaining });
            updateTimerDisplay();
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

    renderQuestion();
    renderNavigationPanel();
    updateNavigationStyles();
    updateProgressDisplay();
    startTimer();

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitQuiz();
    });
})();
