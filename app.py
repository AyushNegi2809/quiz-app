from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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
def generate_quiz():

    data = request.get_json()
    print("Received Data:", data)

    quiz_data = {
        "questions": [
            {
                "question": "What does HTML stand for?",
                "options": [
                    "Hyper Text Markup Language",
                    "High Transfer Machine Language",
                    "Hyper Tool Multi Language",
                    "None"
                ],
                "correct_answer": 0
            },

            {
                "question": "What does CSS stand for?",
                "options": [
                    "Cascade Styling Sheets",
                    "Cascading Style Sheet",
                    "Clean Style Sheet",
                    "None"
                ],
                "correct_answer": 1
            }
        ]
    }

    return jsonify(quiz_data)

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
