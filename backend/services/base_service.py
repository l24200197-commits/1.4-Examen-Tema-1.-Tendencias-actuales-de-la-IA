from abc import ABC, abstractmethod
from typing import Any

from werkzeug.datastructures import FileStorage

from utils.validators import FileValidator, ValidatedFile


class BaseProcessor(ABC):
    """Abstract contract implemented by every processing service."""

    @abstractmethod
    def process(self, *args: Any, **kwargs: Any) -> dict:
        """Process one modality and return a serializable result."""
        raise NotImplementedError


class BaseFileProcessor(BaseProcessor):
    """Abstract parent for audio, document and image processors."""

    category: str

    def __init__(self, file_validator: FileValidator | None = None):
        self._file_validator = file_validator or FileValidator()

    def validate_file(self, uploaded_file: FileStorage | None) -> ValidatedFile:
        return self._file_validator.validate(uploaded_file, self.category)

    @staticmethod
    def read_bytes(uploaded_file: FileStorage) -> bytes:
        uploaded_file.stream.seek(0)
        data = uploaded_file.stream.read()
        uploaded_file.stream.seek(0)
        return data

