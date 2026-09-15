import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge


BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

from services.audio_service import AudioService
from services.chat_service import ChatService
from services.document_service import DocumentService
from services.image_service import ImageService
from services.translator import TextTranslator
from utils.exceptions import AppError, ValidationError
from utils.validators import FileValidator, LanguageValidator


class ApplicationContainer:
    """Creates and connects reusable application objects in one place."""

    def __init__(self):
        self.file_validator = FileValidator()
        self.language_validator = LanguageValidator()
        self.translator = TextTranslator()
        self.chat = ChatService(self.translator)
        self.audio = AudioService(self.translator, file_validator=self.file_validator)
        self.documents = DocumentService(
            self.translator, file_validator=self.file_validator
        )
        self.images = ImageService(file_validator=self.file_validator)


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4_200_000
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("traductor-ia")

configured_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500",
)
ALLOWED_ORIGINS = {
    origin.strip() for origin in configured_origins.split(",") if origin.strip()
}
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": list(ALLOWED_ORIGINS),
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"],
        }
    },
)
services = ApplicationContainer()


@app.before_request
def verify_origin():
    if request.method == "OPTIONS":
        return None
    origin = request.headers.get("Origin")
    if origin and origin not in ALLOWED_ORIGINS:
        raise AppError(
            "FORBIDDEN_ORIGIN",
            "El origen de la solicitud no está autorizado.",
            403,
        )
    return None


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.get("/api/health")
def health():
    return jsonify({"success": True, "message": "Backend funcionando."})


@app.post("/api/translate")
def translate_text():
    data = request.get_json(silent=True) or {}
    source = data.get("source_language")
    target = data.get("target_language")
    services.language_validator.validate_pair(source, target)
    result = services.translator.process(data.get("content", ""), source, target)
    return jsonify({"success": True, "source_language": source,
                    "target_language": target, **result})


@app.post("/api/chat")
def translate_chat():
    data = request.get_json(silent=True) or {}
    source = data.get("source_language")
    target = data.get("target_language")
    services.language_validator.validate_pair(source, target)
    speaker = str(data.get("speaker", "Participante")).strip()[:50] or "Participante"
    result = services.chat.process(
        data.get("message", ""), source, target, data.get("history", [])
    )
    return jsonify({"success": True, "speaker": speaker,
                    "source_language": source, "target_language": target, **result})


@app.post("/api/audio")
def translate_audio():
    source = request.form.get("source_language")
    target = request.form.get("target_language")
    services.language_validator.validate_pair(source, target)
    result = services.audio.process(request.files.get("file"), source, target)
    return jsonify({"success": True, "source_language": source,
                    "target_language": target, **result})


@app.post("/api/speech")
def generate_speech():
    data = request.get_json(silent=True) or {}
    target = data.get("target_language")
    if target not in LanguageValidator.ALLOWED_LANGUAGES:
        raise ValidationError("INVALID_LANGUAGE", "El idioma del audio no es válido.")
    audio_bytes = services.audio.synthesize(data.get("text", ""), target)
    return Response(
        audio_bytes,
        mimetype="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="traduccion.mp3"'},
    )


@app.post("/api/document")
def translate_document():
    source = request.form.get("source_language")
    target = request.form.get("target_language")
    services.language_validator.validate_pair(source, target)
    result = services.documents.process(request.files.get("file"), source, target)
    return jsonify({"success": True, "source_language": source,
                    "target_language": target, **result})


@app.post("/api/image")
def translate_image():
    source = request.form.get("source_language")
    target = request.form.get("target_language")
    services.language_validator.validate_pair(source, target)
    result = services.images.process(request.files.get("file"), source, target)
    return jsonify({"success": True, "source_language": source,
                    "target_language": target, **result})


@app.errorhandler(AppError)
def handle_app_error(error):
    return jsonify({"success": False, "error": error.code,
                    "message": error.message}), error.status_code


@app.errorhandler(RequestEntityTooLarge)
def handle_large_request(_error):
    return jsonify({"success": False, "error": "FILE_TOO_LARGE",
                    "message": "La solicitud excede el límite permitido."}), 413


@app.errorhandler(404)
def handle_not_found(_error):
    return jsonify({"success": False, "error": "NOT_FOUND",
                    "message": "El endpoint solicitado no existe."}), 404


# Without this, Werkzeug routing errors such as 405 fall through to the
# catch-all below and are reported as internal failures.
@app.errorhandler(HTTPException)
def handle_http_error(error):
    messages = {
        400: "La solicitud está mal formada.",
        405: "El método HTTP no está permitido en este endpoint.",
        415: "El tipo de contenido enviado no es compatible.",
    }
    return jsonify({
        "success": False,
        "error": error.name.upper().replace(" ", "_"),
        "message": messages.get(error.code, "La solicitud no pudo procesarse."),
    }), error.code


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    logger.exception("Error interno no controlado: %s", type(error).__name__)
    return jsonify({"success": False, "error": "INTERNAL_ERROR",
                    "message": "Ocurrió un error interno. Intenta nuevamente."}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5001")),
            debug=os.getenv("FLASK_DEBUG") == "1")

