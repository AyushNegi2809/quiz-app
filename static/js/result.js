(function () {
    const resultText = document.getElementById("resultText");
    if (!resultText) {
        return;
    }

    SessionManager.clearSession();

    const stored = localStorage.getItem("quizResult");
    if (!stored) {
        resultText.textContent = "No result found. Please complete a quiz first.";
        return;
    }

    try {
        const result = JSON.parse(stored);
        resultText.textContent = "You scored " + result.score + " out of " + result.total + ".";
    } catch (error) {
        resultText.textContent = "No result found. Please complete a quiz first.";
    }
})();
