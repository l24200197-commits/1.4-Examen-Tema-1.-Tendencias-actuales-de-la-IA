from dataclasses import dataclass
from pathlib import Path

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from utils.exceptions import ValidationError


@dataclass(frozen=True)
class ValidatedFile:
    filename: str
    extension: str
    mime_type: str
    size: int


class FileValidator:
    """Encapsulates file format, MIME type and size validation."""

    MAX_FILE_SIZE = 3_800_000

    ALLOWED_EXTENSIONS = {
        "audio": {"mp3", "wav", "m4a", "webm"},
        "document": {"pdf", "docx", "txt"},
        "image": {"jpg", "jpeg", "png", "webp"},
    }

    ALLOWED_MIME_TYPES = {
        "audio": {
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/mp4",
            "audio/x-m4a",
            "audio/webm",
            "video/webm",
        },
        "document": {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/zip",
        },
        "image": {"image/jpeg", "image/png", "image/webp"},
    }

    GENERIC_MIME_TYPES = {
        "application/octet-stream",
        "binary/octet-stream",
    }

    def validate(self, uploaded_file: FileStorage | None, category: str) -> ValidatedFile:
        if uploaded_file is None or not uploaded_file.filename:
            raise ValidationError("NO_FILE", "Selecciona un archivo antes de continuar.")

        if category not in self.ALLOWED_EXTENSIONS:
            raise ValidationError("INVALID_CATEGORY", "La categoría del archivo no es válida.")

        filename = secure_filename(uploaded_file.filename)
        if not filename:
            raise ValidationError("INVALID_FILENAME", "El nombre del archivo no es válido.")

        extension = Path(filename).suffix.lower().lstrip(".")
        if extension not in self.ALLOWED_EXTENSIONS[category]:
            allowed = ", ".join(sorted(self.ALLOWED_EXTENSIONS[category]))
            raise ValidationError(
                "INVALID_FORMAT",
                f"Formato no permitido. Formatos admitidos: {allowed}.",
            )

        mime_type = (uploaded_file.mimetype or "application/octet-stream").lower()
        if (
            mime_type not in self.GENERIC_MIME_TYPES
            and mime_type not in self.ALLOWED_MIME_TYPES[category]
        ):
            raise ValidationError(
                "INVALID_FORMAT",
                "El tipo real del archivo no coincide con un formato permitido.",
            )

        uploaded_file.stream.seek(0)
        content = uploaded_file.stream.read(self.MAX_FILE_SIZE + 1)
        uploaded_file.stream.seek(0)

        if not content:
            raise ValidationError("EMPTY_FILE", "El archivo seleccionado está vacío.")

        if len(content) > self.MAX_FILE_SIZE:
            raise ValidationError(
                "FILE_TOO_LARGE",
                "El archivo excede el límite de 3.8 MB.",
                413,
            )

        return ValidatedFile(filename, extension, mime_type, len(content))


class LanguageValidator:
    """Validates the supported Spanish-English language pair."""

    ALLOWED_LANGUAGES = {"es", "en"}

    def validate_pair(self, source_language: str, target_language: str) -> None:
        if source_language not in self.ALLOWED_LANGUAGES:
            raise ValidationError(
                "INVALID_LANGUAGE",
                "El idioma de origen debe ser español o inglés.",
            )
        if target_language not in self.ALLOWED_LANGUAGES:
            raise ValidationError(
                "INVALID_LANGUAGE",
                "El idioma de destino debe ser español o inglés.",
            )
        if source_language == target_language:
            raise ValidationError(
                "SAME_LANGUAGE",
                "Los idiomas de origen y destino deben ser diferentes.",
            )

