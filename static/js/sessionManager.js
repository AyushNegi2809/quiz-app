(function () {
    // Single source of truth for persisted quiz progress.
    const STORAGE_KEY = "quizSession";

    function isValidObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function getDefaultSession() {
        return {
            quiz: [],
            answers: {},
            currentQuestion: 0,
            timeRemaining: 0,
            totalTime: 0,
            startedAt: 0
        };
    }

    function sanitizeSession(raw) {
        // Defensive normalization so corrupted storage never breaks the app.
        const defaults = getDefaultSession();
        if (!isValidObject(raw)) {
            return defaults;
        }

        return {
            quiz: Array.isArray(raw.quiz) ? raw.quiz : [],
            answers: isValidObject(raw.answers) ? raw.answers : {},
            currentQuestion: Number.isInteger(raw.currentQuestion) && raw.currentQuestion >= 0 ? raw.currentQuestion : 0,
            timeRemaining: Number.isFinite(raw.timeRemaining) && raw.timeRemaining >= 0 ? Math.floor(raw.timeRemaining) : 0,
            totalTime: Number.isFinite(raw.totalTime) && raw.totalTime >= 0 ? Math.floor(raw.totalTime) : 0,
            startedAt: Number.isFinite(raw.startedAt) ? raw.startedAt : 0
        };
    }

    function saveSession(data) {
        const sanitized = sanitizeSession(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }

    function loadSession() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return null;
        }

        try {
            return sanitizeSession(JSON.parse(stored));
        } catch (error) {
            return null;
        }
    }

    function updateSession(updates) {
        const current = loadSession() || getDefaultSession();
        const merged = Object.assign({}, current, isValidObject(updates) ? updates : {});
        saveSession(merged);
        return merged;
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_KEY);
    }

    window.SessionManager = {
        saveSession: saveSession,
        loadSession: loadSession,
        updateSession: updateSession,
        clearSession: clearSession
    };
})();
