(function () {
    const QUIZ_ENDPOINT = "/generate-quiz";

    const form = document.getElementById("quizForm");
    const quizContainer = document.getElementById("quizContainer") || form;
    const loader = document.getElementById("quizLoader");
    const errorPanel = document.getElementById("errorPanel");
    const errorMessage = document.getElementById("errorMessage");
    const retryButton = document.getElementById("retryBtn");
    const topicSelect = document.getElementById("topic");
    const difficultySelect = document.getElementById("difficulty");
    const questionsSelect = document.getElementById("questions");

    if (!form) {
        return;
    }

    let isGenerating = false;
    let retryAttemptNumber = 0;

    function logEvent(level, eventName, metadata) {
        const safeLevel = level === "warn" || level === "error" ? level : "info";
        const payload = {
            event: eventName,
            timestamp: Date.now()
        };

        if (metadata && typeof metadata === "object") {
            Object.assign(payload, metadata);
        }

        console[safeLevel]("[QUIZ SYSTEM]", payload);
    }

    function createQuizError(errorType, errorMessage) {
        const err = new Error(errorMessage);
        err.errorType = errorType;
        return err;
    }

    function getFailureType(error) {
        if (error && typeof error.errorType === "string" && error.errorType.trim()) {
            return error.errorType;
        }
        if (error instanceof TypeError) {
            return "network_failure";
        }
        return "unknown_error";
    }

    function getSubmitButton() {
        return form.querySelector('button[type="submit"]');
    }

    function setLoadingState(isLoading) {
        const submitBtn = getSubmitButton();

        if (loader) {
            loader.style.display = isLoading ? "flex" : "none";
        }

        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.textContent = isLoading ? "Generating..." : "Generate Quiz";
        }

        if (form) {
            form.setAttribute("aria-busy", isLoading ? "true" : "false");
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
            errorPanel.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
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
        return Boolean(data)
            && Array.isArray(data.questions)
            && data.questions.length > 0
            && Number.isFinite(data.time_limit_seconds)
            && data.time_limit_seconds > 0;
    }

    async function generateQuiz(quizRequest) {
        if (isGenerating) {
            return;
        }

        logEvent("info", "quiz_generation_started", {
            topic: quizRequest.topic,
            difficulty: quizRequest.difficulty,
            questions: quizRequest.questions
        });

        isGenerating = true;
        hideError();
        setLoadingState(true);

        try {
            const requestStartTime = Date.now();
            logEvent("info", "api_request_sent", {
                endpoint: QUIZ_ENDPOINT
            });

            const response = await fetch(QUIZ_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(quizRequest)
            });
            logEvent("info", "api_response_received", {
                status: response.status,
                responseTimeMs: Date.now() - requestStartTime
            });

            let result = null;
            try {
                result = await response.json();
            } catch (jsonError) {
                throw createQuizError("invalid_json", "Unable to generate quiz right now. Please try again.");
            }

            if (!response.ok) {
                const backendMessage = result && typeof result.error === "string" ? result.error : "Unable to generate quiz right now. Please try again.";
                throw createQuizError("non_200_response", backendMessage);
            }

            if (result && typeof result.error === "string" && result.error.trim()) {
                throw createQuizError("backend_error", result.error.trim());
            }

            if (!isValidQuizPayload(result)) {
                throw createQuizError("validation_failure", "Unable to generate quiz right now. Please try again.");
            }

            const session = {
                quiz: result.questions,
                answers: {},
                currentQuestion: 0,
                timeRemaining: Math.floor(result.time_limit_seconds),
                totalTime: Math.floor(result.time_limit_seconds),
                startedAt: Date.now()
            };

            SessionManager.saveSession(session);
            logEvent("info", "quiz_render_success", {
                number_of_questions_rendered: result.questions.length
            });
            window.location.href = "/quiz";
        } catch (error) {
            const message = error && typeof error.message === "string" && error.message.trim()
                ? error.message.trim()
                : "Unable to generate quiz right now. Please try again.";
            logEvent("error", "quiz_generation_failed", {
                errorType: getFailureType(error),
                errorMessage: message
            });
            showError(message);
        } finally {
            setLoadingState(false);
            isGenerating = false;
        }
    }

    function buildQuizRequestFromForm() {
        return {
            topic: topicSelect.value,
            difficulty: difficultySelect.value,
            questions: Number(questionsSelect.value)
        };
    }

    function retryQuizGeneration() {
        retryAttemptNumber += 1;
        logEvent("warn", "retry_triggered", {
            retryAttemptNumber: retryAttemptNumber
        });
        const quizRequest = buildQuizRequestFromForm();
        generateQuiz(quizRequest);
    }

    function handleConfigKeyboardInput(event) {
        if (event.key !== "Enter") {
            return;
        }

        const target = event.target;
        const tagName = target && target.tagName ? target.tagName.toLowerCase() : "";
        if (tagName === "textarea") {
            return;
        }
        if (tagName === "button") {
            return;
        }

        event.preventDefault();
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

    document.addEventListener("keydown", handleConfigKeyboardInput);

    hideError();
})();
