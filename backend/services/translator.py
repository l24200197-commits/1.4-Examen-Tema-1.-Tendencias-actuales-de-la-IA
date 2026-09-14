import os

from openai import OpenAI

from services.base_service import BaseProcessor
from utils.exceptions import AppError, ValidationError


LANGUAGE_NAMES = {"es": "Spanish", "en": "English"}


class TextTranslator(BaseProcessor):
    """Encapsulates all text translation calls to OpenAI."""

    MAX_TEXT_LENGTH = 30_000

    def __init__(self, client: OpenAI | None = None, model: str | None = None):
        self._client = client or OpenAI()
        self._model = model or os.getenv("OPENAI_TEXT_MODEL", "gpt-5.6-luna")

    def process(
        self,
        content: str,
        source_language: str,
        target_language: str,
        context: str | None = None,
    ) -> dict:
        translation = self.translate(content, source_language, target_language, context)
        return {"original": content.strip(), "translation": translation}

    def translate(
        self,
        content: str,
        source_language: str,
        target_language: str,
        context: str | None = None,
    ) -> str:
        if not isinstance(content, str) or not content.strip():
            raise ValidationError("EMPTY_CONTENT", "Escribe contenido antes de traducir.")

        content = content.strip()
        if len(content) > self.MAX_TEXT_LENGTH:
            raise ValidationError(
                "CONTENT_TOO_LONG",
                "El contenido supera el límite de 30,000 caracteres.",
            )

        source_name = LANGUAGE_NAMES[source_language]
        target_name = LANGUAGE_NAMES[target_language]
        instructions = f"""
You are a professional bilingual translator specialized in Spanish and English.
Translate the user's content from {source_name} to {target_name}.

Rules:
- Preserve the original meaning and produce natural writing.
- Preserve names, numbers, dates, measurements, technical terms and acronyms.
- Preserve paragraphs, headings and lists when possible.
- Do not summarize, censor, explain or add commentary.
- Do not invent missing information.
- Return only the translated content.
""".strip()

        input_text = content
        if context:
            input_text = (
                "Conversation context for terminology only:\n"
                f"{context}\n\nContent to translate:\n{content}"
            )

        try:
            response = self._client.responses.create(
                model=self._model,
                instructions=instructions,
                input=input_text,
                max_output_tokens=12_000,
                store=False,
            )
        except Exception as exc:
            raise AppError(
                "AI_ERROR",
                "El servicio de IA no pudo completar la traducción.",
                502,
            ) from exc

        translation = (response.output_text or "").strip()
        if not translation:
            raise AppError(
                "AI_EMPTY_RESPONSE",
                "La Inteligencia Artificial devolvió una respuesta vacía.",
                502,
            )
        return translation

