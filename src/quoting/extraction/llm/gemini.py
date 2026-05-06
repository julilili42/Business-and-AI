"""Gemini client (google-genai SDK)."""
from __future__ import annotations

from typing import Any

from ...core import Settings
from .base import LLMClient, LLMResponse, TokenUsage


class GeminiClient(LLMClient):
    def __init__(self, settings: Settings):
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY missing in environment")

        from google import genai

        self._client = genai.Client(api_key=settings.google_api_key)
        self._model = settings.gemini_model

    def generate(
        self,
        prompt: str,
        images: list[dict[str, Any]] | None = None,
    ) -> LLMResponse:
        from google.genai import types

        contents: list[Any] = [prompt]
        if images:
            for img in images:
                contents.append(types.Part.from_bytes(
                    data=img["data"],
                    mime_type=img["mime_type"],
                ))

        response = self._client.models.generate_content(
            model=self._model,
            contents=contents,
        )

        usage = None
        meta = getattr(response, "usage_metadata", None)
        if meta is not None:
            usage = TokenUsage(
                input_tokens=getattr(meta, "prompt_token_count", 0) or 0,
                output_tokens=getattr(meta, "candidates_token_count", 0) or 0,
                total_tokens=getattr(meta, "total_token_count", 0) or 0,
            )

        return LLMResponse(text=response.text or "", usage=usage)
