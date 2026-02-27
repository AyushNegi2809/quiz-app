# AI Configuration

## Purpose
This file defines the AI-related configuration used during development
and testing of the AI-Based Dynamic Quiz Generation System.
This file is intended for developer reference only.

---

## AI Model Details
- Type: Large Language Model (LLM)
- Provider: OpenAI
- Model Name: <model-name-here>
- Temperature: 0.3
- Max Tokens: As required per quiz size

---

## Prompting Strategy
- Prompt Type: Structured prompt
- Output Format: JSON only
- Question Type: Multiple Choice Questions (MCQs)
- Options per Question: 4
- Correct Answer: Included as index/key

---

## Input Parameters
The AI model receives the following inputs:
- Topic
- Difficulty Level (Beginner / Intermediate / Advanced)
- Number of Questions

---

## Output Constraints
- Strict JSON response
- No explanations or extra text
- Each question must include:
  - Question text
  - Options
  - Correct answer

---

## Notes
- The model name may be changed without affecting the core system logic.
- API keys are stored in environment variables and not hardcoded.
