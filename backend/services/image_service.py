import base64
import json
import os
from io import BytesIO

from openai import OpenAI
from PIL import Image, UnidentifiedImageError
from werkzeug.datastructures import FileStorage

from services.base_service import BaseFileProcessor
from utils.exceptions import AppError, ValidationError


class ImageService(BaseFileProcessor):
    """Reads visible text from an image and translates it with vision."""

    category = "image"

    def __init__(self, client: OpenAI | None = None, file_validator=None):
        super().__init__(file_validator)
        self._client = client or OpenAI()
        self._model = os.getenv("OPENAI_TEXT_MODEL", "gpt-5.6-luna")

    def process(
        self,
        uploaded_file: FileStorage,
        source_language: str,
        target_language: str,
    ) -> dict:
        metadata = self.validate_file(uploaded_file)
        image_data = self.read_bytes(uploaded_file)
        self._verify_image(image_data)

        mime_type = metadata.mime_type
        if mime_type in {"application/octet-stream", "binary/octet-stream"}:
            mime_type = {
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "png": "image/png",
                "webp": "image/webp",
            }[metadata.extension]

        data_url = (
            f"data:{mime_type};base64,"
            + base64.b64encode(image_data).decode("utf-8")
        )
        source_name = "Spanish" if source_language == "es" else "English"
        target_name = "Spanish" if target_language == "es" else "English"
        schema = {
            "type": "object",
            "properties": {
                "readable": {"type": "boolean"},
                "detected_text": {"type": "string"},
                "translation": {"type": "string"},
                "warning": {"type": "string"},
            },
            "required": ["readable", "detected_text", "translation", "warning"],
            "additionalProperties": False,
        }
        prompt = f"""
Inspect the attached image and identify all readable text.
The expected source language is {source_name}. Translate it into {target_name}.
Preserve order, line breaks, names, numbers, dates, prices, units and acronyms.
Never invent text. If no readable text exists, set readable to false.
If image quality creates uncertainty, explain it briefly in warning.
""".strip()

        try:
            response = self._client.responses.create(
                model=self._model,
                input=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": prompt},
                            {
                                "type": "input_image",
                                "image_url": data_url,
                                "detail": "high",
                            },
                        ],
                    }
                ],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "image_translation",
                        "strict": True,
                        "schema": schema,
                    }
                },
                max_output_tokens=5_000,
                store=False,
            )
            result = json.loads(response.output_text)
        except json.JSONDecodeError as exc:
            raise AppError(
                "AI_UNEXPECTED_RESPONSE",
                "La IA devolvió un resultado inesperado.",
                502,
            ) from exc
        except AppError:
            raise
        except Exception as exc:
            raise AppError(
                "IMAGE_PROCESSING_ERROR",
                "No fue posible analizar la imagen.",
                502,
            ) from exc

        detected = result.get("detected_text", "").strip()
        translated = result.get("translation", "").strip()
        if not result.get("readable") or not detected or not translated:
            raise ValidationError(
                "NO_IMAGE_TEXT", "No se encontró texto legible en la imagen."
            )
        return {
            "filename": metadata.filename,
            "detected_text": detected,
            "translation": translated,
            "warning": result.get("warning", "").strip(),
        }

    @staticmethod
    def _verify_image(image_data: bytes) -> None:
        try:
            image = Image.open(BytesIO(image_data))
            image.verify()
        except (UnidentifiedImageError, OSError) as exc:
            raise ValidationError(
                "INVALID_IMAGE", "La imagen está dañada o no es válida."
            ) from exc
