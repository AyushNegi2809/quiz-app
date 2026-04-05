import logging

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

from ai_generator import generate_quiz

app = Flask(__name__)
CORS(app)
app.logger.setLevel(logging.INFO)

ALLOWED_TOPICS = {"html", "css", "javascript"}
ALLOWED_DIFFICULTIES = {"beginner", "intermediate", "advance"}
ALLOWED_QUESTION_COUNTS = {10, 15, 20}
DIFFICULTY_TIME_LIMITS_MINUTES = {
    "beginner": 10,
    "intermediate": 15,
    "advance": 20,
}


def _validate_generate_payload(data):
    if not isinstance(data, dict):
        return None, "Invalid request payload"

    topic = str(data.get("topic", "")).strip()
    difficulty = str(data.get("difficulty", "")).strip()

    try:
        question_count = int(data.get("questions"))
    except (TypeError, ValueError):
        return None, "Question count must be a number"

    if topic.lower() not in ALLOWED_TOPICS:
        return None, "Invalid topic"
    if difficulty.lower() not in ALLOWED_DIFFICULTIES:
        return None, "Invalid difficulty"
    if question_count not in ALLOWED_QUESTION_COUNTS:
        return None, "Invalid question count"

    return {
        "topic": topic,
        "difficulty": difficulty,
        "questions": question_count
    }, None

# ---------------- PAGE ROUTES ----------------

@app.route("/")
def gotohome():
    return render_template("index.html")

@app.route("/quiz-config")
def home():
    return render_template("config.html")

@app.route("/quiz")
def quiz_page():
    return render_template("quiz.html")

@app.route("/result")
def result_page():
    return render_template("result.html")

# ---------------- API ROUTE ----------------

@app.route("/generate-quiz", methods=["POST"])
def generate_quiz_route():
    data = request.get_json(silent=True)
    payload, error = _validate_generate_payload(data)
    if error:
        app.logger.warning("generate-quiz validation failed: %s", error)
        return jsonify({"error": error}), 400

    try:
        quiz_data = generate_quiz(
            payload["topic"],
            payload["difficulty"],
            payload["questions"]
        )
        difficulty_key = payload["difficulty"].strip().lower()
        time_limit_minutes = DIFFICULTY_TIME_LIMITS_MINUTES[difficulty_key]
        quiz_data["difficulty"] = difficulty_key
        quiz_data["time_limit_minutes"] = time_limit_minutes
        quiz_data["time_limit_seconds"] = time_limit_minutes * 60
        return jsonify(quiz_data)
    except ValueError as exc:
        app.logger.exception("Quiz generation value error")
        return jsonify({"error": str(exc)}), 500
    except Exception:
        app.logger.exception("Unexpected quiz generation error")
        return jsonify({"error": "Quiz generation failed"}), 500

@app.route("/submit-quiz", methods=["POST"])
def submit_quiz():
    data = request.get_json(silent=True) or {}

    quiz = data.get("quiz") or {}
    answers = data.get("answers") or {}

    questions = quiz.get("questions") if isinstance(quiz, dict) else []
    if not isinstance(questions, list):
        questions = []

    if not isinstance(answers, dict):
        answers = {}

    score = 0

    for index, question in enumerate(questions):
        if not isinstance(question, dict):
            continue

        correct_answer = question.get("correct_answer")
        submitted_answer = answers.get(f"q{index}")

        try:
            if submitted_answer is not None and int(submitted_answer) == int(correct_answer):
                score += 1
        except (TypeError, ValueError):
            continue

    return jsonify({
        "score": score,
        "total": len(questions)
    })

# ------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
