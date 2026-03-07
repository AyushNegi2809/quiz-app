(function () {
    const TIMER_MINUTES = 1;
    const TOTAL_TIME_SECONDS = TIMER_MINUTES * 60;

    const form = document.getElementById("quizForm");
    const quizContainer = document.getElementById("quizContainer") || form;
    const loader = document.getElementById("quizLoader");
    const errorPanel = document.getElementById("errorPanel");
    const errorMessage = document.getElementById("errorMessage");
    const retryButton = document.getElementById("retryBtn");

    if (!form) {
        return;
    }

    let isGenerating = false;

    function getSubmitButton() {
        return form.querySelector('button[type="submit"]');
    }

    function setLoadingState(isLoading) {
        const submitBtn = getSubmitButton();

        if (loader) {
            loader.style.display = isLoading ? "block" : "none";
        }

        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.textContent = isLoading ? "Generating..." : "Generate Quiz";
        }
    }

    function showError(message) {
        const safeMessage = typeof message === "string" && message.trim()
            ? message.trim()
            : "Unable to generate quiz right now. Please try again.";

        if (quizContainer) {
            quizContainer.style.display = "none";
        }

        if (errorMessage) {
            errorMessage.textContent = safeMessage;
        }

        if (errorPanel) {
            errorPanel.style.display = "block";
        }
    }

    function hideError() {
        if (errorPanel) {
            errorPanel.style.display = "none";
        }

        if (errorMessage) {
            errorMessage.textContent = "";
        }

        if (quizContainer) {
            quizContainer.style.display = "block";
        }
    }

    function isValidQuizPayload(data) {
        return Boolean(data) && Array.isArray(data.questions) && data.questions.length > 0;
    }

    async function generateQuiz(quizRequest) {
        if (isGenerating) {
            return;
        }

        isGenerating = true;
        hideError();
        setLoadingState(true);

        try {
            const response = await fetch("/generate-quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(quizRequest)
            });

            let result = null;
            try {
                result = await response.json();
            } catch (jsonError) {
                throw new Error("Unable to generate quiz right now. Please try again.");
            }

            if (!response.ok) {
                const backendMessage = result && typeof result.error === "string" ? result.error : "Unable to generate quiz right now. Please try again.";
                throw new Error(backendMessage);
            }

            if (result && typeof result.error === "string" && result.error.trim()) {
                throw new Error(result.error.trim());
            }

            if (!isValidQuizPayload(result)) {
                throw new Error("Unable to generate quiz right now. Please try again.");
            }

            const session = {
                quiz: result.questions,
                answers: {},
                currentQuestion: 0,
                timeRemaining: TOTAL_TIME_SECONDS,
                totalTime: TOTAL_TIME_SECONDS,
                startedAt: Date.now()
            };

            SessionManager.saveSession(session);
            window.location.href = "/quiz";
        } catch (error) {
            const message = error && typeof error.message === "string" && error.message.trim()
                ? error.message.trim()
                : "Unable to generate quiz right now. Please try again.";
            showError(message);
        } finally {
            setLoadingState(false);
            isGenerating = false;
        }
    }

    function buildQuizRequestFromForm() {
        return {
            topic: document.getElementById("topic").value,
            difficulty: document.getElementById("difficulty").value,
            questions: Number(document.getElementById("questions").value)
        };
    }

    function retryQuizGeneration() {
        const quizRequest = buildQuizRequestFromForm();
        generateQuiz(quizRequest);
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const quizRequest = buildQuizRequestFromForm();
        generateQuiz(quizRequest);
    });

    if (retryButton) {
        retryButton.addEventListener("click", function () {
            retryQuizGeneration();
        });
    }

    hideError();

    window.showError = showError;
    window.hideError = hideError;
    window.retryQuizGeneration = retryQuizGeneration;
})();
