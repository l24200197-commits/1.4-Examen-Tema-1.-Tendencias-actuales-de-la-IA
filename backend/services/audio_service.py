import io
import os

from openai import OpenAI
from werkzeug.datastructures import FileStorage

from services.base_service import BaseFileProcessor
from services.translator import TextTranslator
from utils.exceptions import AppError, ValidationError


class AudioService(BaseFileProcessor):
    """Transcribes, translates and synthesizes bilingual audio."""

    category = "audio"

    def __init__(
        self,
        translator: TextTranslator,
        client: OpenAI | None = None,
        file_validator=None,
    ):
        super().__init__(file_validator)
        self._translator = translator
        self._client = client or OpenAI()
        self._transcription_model = os.getenv(
            "OPENAI_TRANSCRIBE_MODEL", "gpt-transcribe"
        )
        self._tts_model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
        self._tts_voice = os.getenv("OPENAI_TTS_VOICE", "marin")

    def process(
        self,
        uploaded_file: FileStorage,
        source_language: str,
        target_language: str,
    ) -> dict:
        metadata = self.validate_file(uploaded_file)
        audio_buffer = io.BytesIO(self.read_bytes(uploaded_file))
        audio_buffer.name = metadata.filename

        try:
            transcription = self._client.audio.transcriptions.create(
                model=self._transcription_model,
                file=audio_buffer,
                language=source_language,
                prompt=(
                    "The audio is in Spanish or English. Preserve names, dates, "
                    "numbers, acronyms and technical vocabulary."
                ),
            )
        except Exception as exc:
            raise AppError(
                "AUDIO_PROCESSING_ERROR",
                "No fue posible procesar el audio.",
                502,
            ) from exc

        original_text = (transcription.text or "").strip()
        if not original_text:
            raise ValidationError(
                "NO_AUDIO", "No se identificó contenido hablado en el audio."
            )

        translated = self._translator.translate(
            original_text, source_language, target_language
        )
        return {
            "filename": metadata.filename,
            "transcription": original_text,
            "translation": translated,
        }

    def synthesize(self, text: str, target_language: str) -> bytes:
        if not isinstance(text, str) or not text.strip():
            raise ValidationError(
                "EMPTY_CONTENT", "No existe texto para generar el audio."
            )
        text = text.strip()
        if len(text) > 4_000:
            raise ValidationError(
                "CONTENT_TOO_LONG",
                "La traducción es demasiado larga para generar voz.",
            )

        language_name = "Spanish" if target_language == "es" else "English"
        try:
            with self._client.audio.speech.with_streaming_response.create(
                model=self._tts_model,
                voice=self._tts_voice,
                input=text,
                instructions=(
                    f"Speak clearly in {language_name} using a natural, neutral "
                    "and professional tone."
                ),
                response_format="mp3",
            ) as response:
                return response.read()
        except Exception as exc:
            raise AppError(
                "SPEECH_ERROR",
                "No fue posible generar el audio traducido.",
                502,
            ) from exc

