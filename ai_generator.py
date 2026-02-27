import json
import html
import re
from collections import defaultdict, deque
from typing import Any, Dict, List

from openai import OpenAI


client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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",
)

_RECENT_HISTORY_MAX = 200
_PROMPT_AVOID_MAX = 25
_recent_questions: Dict[str, deque] = defaultdict(lambda: deque(maxlen=_RECENT_HISTORY_MAX))


def _strip_markdown_fences(text):
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    return cleaned


def _extract_json_blob(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model response")
    return text[start : end + 1]


def _parse_model_json(response_text: str) -> Dict[str, Any]:
    cleaned = _strip_markdown_fences(response_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return json.loads(_extract_json_blob(cleaned))


def _normalize_quiz(data: Dict[str, Any], num_questions: int) -> Dict[str, List[Dict[str, Any]]]:
    questions = data.get("questions", [])
    if not isinstance(questions, list):
        raise ValueError("Response JSON missing 'questions' list")

    normalized: List[Dict[str, Any]] = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        question_text = html.escape(str(q.get("question", "")).strip())
        options = q.get("options", [])
        correct_answer = q.get("correct_answer")

        if not question_text:
            continue
        if not isinstance(options, list) or len(options) != 4:
            continue

        clean_options = [html.escape(str(opt).strip()) for opt in options]
        if any(not opt for opt in clean_options):
            continue

        try:
            answer_index = int(correct_answer)
        except (TypeError, ValueError):
            continue
        if answer_index < 0 or answer_index > 3:
            continue

        normalized.append(
            {
                "question": question_text,
                "options": clean_options,
                "correct_answer": answer_index,
            }
        )

        if len(normalized) >= num_questions:
            break

    if len(normalized) == 0:
        raise ValueError("No valid questions generated")

    return {"questions": normalized}


def _normalize_question_key(text: str) -> str:
    lowered = text.lower()
    collapsed = re.sub(r"\s+", " ", lowered).strip()
    alnum_only = re.sub(r"[^a-z0-9 ]+", "", collapsed)
    return alnum_only


def _history_key(topic: str, difficulty: str) -> str:
    return f"{str(topic).strip().lower()}::{str(difficulty).strip().lower()}"


def _build_prompt(topic: str, difficulty: str, remaining: int, avoid_questions: List[str]) -> str:
    avoid_text = ""
    if avoid_questions:
        avoid_lines = "\n".join(f"- {item}" for item in avoid_questions)
        avoid_text = f"""
Avoid generating questions that are the same or very similar to these recent questions:
{avoid_lines}
""".rstrip()

    return f"""
Generate a multiple-choice quiz.

Topic: {topic}
Difficulty: {difficulty}
Number of questions: {remaining}

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0
    }}
  ]
}}

Rules:
- Provide exactly {remaining} questions.
- Each question must have exactly 4 options.
- "correct_answer" must be the index (0-3) of the correct option.
- Avoid common repeated starter questions for this topic.
- Ensure all questions are distinct in wording and concept coverage.
- Prefer varied question styles (concept, scenario, code snippet, troubleshooting).
- Do not include markdown, comments, or explanation text.
{avoid_text}
""".strip()


def _call_model(prompt: str) -> Dict[str, Any]:
    response = client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You generate strict JSON quiz data. Return JSON only."},
            {"role": "user", "content": prompt},
        ],
        temperature=1,
        max_tokens=2500,
        timeout=60,
    )

    response_text = response.choices[0].message.content or ""
    parsed = _parse_model_json(response_text)
    return parsed


def generate_quiz(topic, difficulty, num_questions):
    target_count = int(num_questions)
    key = _history_key(topic, difficulty)
    recent_list = list(_recent_questions[key])
    avoid_norm = set(recent_list)
    prompt_avoid = recent_list[-_PROMPT_AVOID_MAX:]

    collected: List[Dict[str, Any]] = []
    attempts = 0
    max_attempts = 3

    while len(collected) < target_count and attempts < max_attempts:
        attempts += 1
        remaining = target_count - len(collected)
        prompt = _build_prompt(topic, difficulty, remaining, prompt_avoid)
        parsed = _call_model(prompt)
        batch = _normalize_quiz(parsed, remaining).get("questions", [])

        for q in batch:
            norm_key = _normalize_question_key(q.get("question", ""))
            if not norm_key:
                continue
            if norm_key in avoid_norm:
                continue
            avoid_norm.add(norm_key)
            collected.append(q)
            if len(collected) >= target_count:
                break

        prompt_avoid = list(avoid_norm)[-_PROMPT_AVOID_MAX:]

    if len(collected) == 0:
        raise ValueError("No valid unique questions generated")

    for q in collected:
        norm_key = _normalize_question_key(q.get("question", ""))
        if norm_key:
            _recent_questions[key].append(norm_key)

    return {"questions": collected}
