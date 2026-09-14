# Diseño orientado a objetos

```mermaid
classDiagram
    class BaseProcessor {
        <<abstract>>
        +process()* dict
    }
    class BaseFileProcessor {
        <<abstract>>
        -file_validator
        +validate_file()
        +read_bytes()
    }
    class TextTranslator {
        -client
        -model
        +process() dict
        +translate() str
    }
    class ChatService {
        -translator
        +process() dict
    }
    class AudioService {
        -translator
        -client
        +process() dict
        +synthesize() bytes
    }
    class DocumentService {
        -translator
        +process() dict
    }
    class ImageService {
        -client
        -model
        +process() dict
    }
    class FileValidator {
        +validate() ValidatedFile
    }
    class LanguageValidator {
        +validate_pair()
    }
    class ApplicationContainer {
        +translator
        +chat
        +audio
        +documents
        +images
    }

    BaseProcessor <|-- TextTranslator
    BaseProcessor <|-- ChatService
    BaseProcessor <|-- BaseFileProcessor
    BaseFileProcessor <|-- AudioService
    BaseFileProcessor <|-- DocumentService
    BaseFileProcessor <|-- ImageService
    BaseFileProcessor o-- FileValidator
    ChatService o-- TextTranslator
    AudioService o-- TextTranslator
    DocumentService o-- TextTranslator
    ApplicationContainer o-- LanguageValidator
    ApplicationContainer o-- TextTranslator
    ApplicationContainer o-- ChatService
    ApplicationContainer o-- AudioService
    ApplicationContainer o-- DocumentService
    ApplicationContainer o-- ImageService
```

## Responsabilidades

| Clase | Responsabilidad |
|---|---|
| `BaseProcessor` | Establecer el contrato polimórfico de procesamiento. |
| `BaseFileProcessor` | Reutilizar validación y lectura segura de archivos. |
| `TextTranslator` | Encapsular prompts y llamadas de traducción. |
| `ChatService` | Construir contexto conversacional temporal. |
| `AudioService` | Transcribir, traducir y sintetizar audio. |
| `DocumentService` | Extraer, dividir y traducir documentos. |
| `ImageService` | Validar imágenes, reconocer texto y traducirlo. |
| `FileValidator` | Validar extensión, MIME, tamaño y archivo vacío. |
| `LanguageValidator` | Validar el par español-inglés. |
| `ApplicationContainer` | Crear objetos e inyectar dependencias compartidas. |

