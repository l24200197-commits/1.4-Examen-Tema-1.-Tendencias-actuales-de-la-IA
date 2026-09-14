from services.base_service import BaseProcessor
from services.translator import TextTranslator
from utils.exceptions import ValidationError


class ChatService(BaseProcessor):
    """Maintains conversational context through composition with TextTranslator."""

    MAX_HISTORY_ITEMS = 8

    def __init__(self, translator: TextTranslator):
        self._translator = translator

    def process(
        self,
        message: str,
        source_language: str,
        target_language: str,
        history: list | None = None,
    ) -> dict:
        history = history or []
        if not isinstance(history, list):
            raise ValidationError("INVALID_HISTORY", "El historial no es válido.")

        context_parts = []
        for item in history[-self.MAX_HISTORY_ITEMS :]:
            if not isinstance(item, dict):
                continue
            speaker = str(item.get("speaker", "Participante"))[:50]
            original = str(item.get("original", ""))[:1000]
            translation = str(item.get("translation", ""))[:1000]
            if original:
                context_parts.append(
                    f"{speaker}: {original}\nTranslation: {translation}"
                )

        translated = self._translator.translate(
            message,
            source_language,
            target_language,
            context="\n\n".join(context_parts) or None,
        )
        return {"original": message.strip(), "translation": translated}
