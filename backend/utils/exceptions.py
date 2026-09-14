class AppError(Exception):
    """Controlled exception that can be safely returned to the frontend."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class ValidationError(AppError):
    """Raised when user input does not satisfy application rules."""

