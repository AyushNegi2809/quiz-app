(function () {
    const TIMER_MINUTES = 1;
    const TOTAL_TIME_SECONDS = TIMER_MINUTES * 60;

    const form = document.getElementById("quizForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        if (!submitBtn) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Generating...";

        const quizRequest = {
            topic: document.getElementById("topic").value,
            difficulty: document.getElementById("difficulty").value,
            questions: Number(document.getElementById("questions").value)
        };

        try {
            const response = await fetch("/generate-quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(quizRequest)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Quiz generation failed");
            }

            const quizQuestions = Array.isArray(result.questions) ? result.questions : [];
            const session = {
                quiz: quizQuestions,
                answers: {},
                currentQuestion: 0,
                timeRemaining: TOTAL_TIME_SECONDS,
                totalTime: TOTAL_TIME_SECONDS,
                startedAt: Date.now()
            };

            SessionManager.saveSession(session);
            window.location.href = "/quiz";
        } catch (error) {
            alert("Unable to generate quiz right now. Please try again.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Generate Quiz";
        }
    });
})();
