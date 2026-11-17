import time

import tiktoken

MODEL_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o": {
        "prompt": 2.50 / 1_000_000,  # $2.50 per 1M tokens
        "completion": 10.00 / 1_000_000,  # $10.00 per 1M tokens
    },
    "gpt-4o-mini": {"prompt": 0.15 / 1_000_000, "completion": 0.60 / 1_000_000},
    "gemini-1.5-pro": {"prompt": 1.25 / 1_000_000, "completion": 5.00 / 1_000_000},
    "default": {"prompt": 2.50 / 1_000_000, "completion": 10.00 / 1_000_000},
}

try:
    _encoding = tiktoken.get_encoding("cl100k_base")
except Exception:
    _encoding = None


def count_tokens(text: str) -> int:
    if not text:
        return 0
    if _encoding:
        try:
            return len(_encoding.encode(text))
        except Exception:
            pass
    # fallback rough estimate (4 characters per token)
    return max(1, len(text) // 4)


def calculate_cost(prompt_tokens: int, completion_tokens: int, model: str = "gpt-4o") -> float:
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["default"])
    cost = (prompt_tokens * pricing["prompt"]) + (completion_tokens * pricing["completion"])
    return round(cost, 6)


class ExecutionTimer:
    def __init__(self):
        self.start_time: float = 0.0
        self.end_time: float = 0.0

    def start(self):
        self.start_time = time.perf_counter()
        return self

    def stop(self) -> int:
        self.end_time = time.perf_counter()
        return int((self.end_time - self.start_time) * 1000)
