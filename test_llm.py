from openai import OpenAI


client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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",
)

messages = [
    {
        "role": "system",
        "content": (
            "Generate exactly 20 beginner-level HTML multiple-choice questions. "
            "Use this exact structure for each question and no extra text: "
            "Q<number>: <question>\\n"
            "A) <option>\\n"
            "B) <option>\\n"
            "C) <option>\\n"
            "D) <option>\\n"
            "Answer: <A/B/C/D>."
        ),
    },
    {"role": "user", "content": "Generate a Quiz on HTML with beginner difficulty. Number of questions are 20."},
]

# Use a low-latency model and stream tokens so output appears immediately.
stream = client.chat.completions.create(
    model="openai/gpt-4o-mini",
    messages=messages,
    temperature=0.3,
    max_tokens=2200,
    timeout=45,
    stream=True,
)

printed = False
for chunk in stream:
    delta = chunk.choices[0].delta.content if chunk.choices else None
    if delta:
        print(delta, end="", flush=True)
        printed = True

if printed:
    print()
else:
    raise RuntimeError("No streamed content returned.")
