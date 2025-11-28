"""
Application Configuration Management

This module loads environment variables and provides type-safe access
to configuration values throughout the application.

Using Pydantic Settings for:
- Type validation (catches config errors at startup)
- Environment variable loading (.env file)
- Default values
- Immutability (frozen=True)

Usage:
    from app.config import settings
    api_key = settings.openai_api_key
"""

from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All settings are loaded from .env file or environment variables.
    Settings are immutable (frozen) to prevent accidental modification.
    
    Attributes:
        openai_api_key: OpenAI API key for LLM access
        gmail_credentials_path: Path to Gmail OAuth credentials
        gmail_token_path: Path to cached Gmail token
        qdrant_host: Qdrant server hostname
        qdrant_port: Qdrant server port
        qdrant_collection_name: Default collection name
        embedding_model_name: Sentence transformers model ID
        embedding_dimension: Embedding vector dimension
        llm_model: OpenAI model name
        llm_temperature: LLM temperature (0 = deterministic)
        llm_max_tokens: Maximum tokens per LLM response
        log_level: Logging verbosity level
        data_dir: Root directory for data storage
    """
    
    # OpenAI Configuration
    openai_api_key: str = Field(
        ...,
        description="OpenAI API key (required)",
        min_length=20
    )
    
    # Gmail Configuration
    gmail_credentials_path: Path = Field(
        default=Path("credentials.json"),
        description="Path to Gmail OAuth credentials file"
    )
    gmail_token_path: Path = Field(
        default=Path("token.json"),
        description="Path to Gmail OAuth token file"
    )
    
    # Qdrant Configuration
    qdrant_host: str = Field(
        default="localhost",
        description="Qdrant server hostname"
    )
    qdrant_port: int = Field(
        default=6333,
        ge=1,
        le=65535,
        description="Qdrant server port"
    )
    qdrant_collection_name: str = Field(
        default="feedprism_emails",
        description="Default Qdrant collection name"
    )
    
    # Embedding Configuration
    embedding_model_name: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Sentence transformers model identifier"
    )
    embedding_dimension: int = Field(
        default=384,
        gt=0,
        description="Embedding vector dimension"
    )
    
    # LLM Configuration
    llm_model: str = Field(
        default="gpt-4o-mini",
        description="OpenAI model name"
    )
    llm_temperature: float = Field(
        default=0.0,
        ge=0.0,
        le=2.0,
        description="LLM temperature (0 = deterministic, 2 = very random)"
    )
    llm_max_tokens: int = Field(
        default=2000,
        gt=0,
        description="Maximum tokens per LLM response"
    )
    
    # Application Configuration
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Logging level"
    )
    data_dir: Path = Field(
        default=Path("data"),
        description="Root directory for data storage"
    )
    
    # Email Fetch Configuration
    email_fetch_hours_back: int = Field(
        default=8,
        ge=1,
        le=168,  # Max 1 week
        description="Hours back to fetch emails for processing (default: 8 hours)"
    )
    
    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        frozen=True,  # Immutable settings
        extra="forbid"  # Reject unknown environment variables
    )
    
    @field_validator('gmail_credentials_path', 'gmail_token_path')
    @classmethod
    def validate_paths_exist(cls, v: Path) -> Path:
        """Validate that credential files exist (token.json may not exist yet)."""
        if v.name == 'credentials.json' and not v.exists():
            raise FileNotFoundError(
                f"Gmail credentials not found: {v}\n"
                f"Please download from Google Cloud Console"
            )
        return v

# Create global settings instance
try:
    settings = Settings()
except Exception as e:
    print(f"❌ Configuration Error: {e}")
    print(f"\nPlease check your .env file and ensure:")
    print(f"  1. OPENAI_API_KEY is set")
    print(f"  2. credentials.json exists")
    print(f"  3. All required variables are defined")
    raise

# Create data directories on import
settings.data_dir.mkdir(exist_ok=True)
(settings.data_dir / "raw_emails").mkdir(exist_ok=True)
(settings.data_dir / "extracted").mkdir(exist_ok=True)
(settings.data_dir / "benchmark").mkdir(exist_ok=True)
(settings.data_dir / "logs").mkdir(exist_ok=True)

# Log configuration (only in non-production)
if settings.log_level == "DEBUG":
    print(f"✅ Configuration loaded:")
    print(f"   - Qdrant: {settings.qdrant_host}:{settings.qdrant_port}")
    print(f"   - LLM: {settings.llm_model}")
    print(f"   - Embeddings: {settings.embedding_model_name} ({settings.embedding_dimension}D)")
    print(f"   - Data dir: {settings.data_dir.absolute()}")
