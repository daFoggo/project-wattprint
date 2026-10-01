from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "WattPrint API"
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: list[str] = []

    # NILM inference service (nilmformer-experiment, `docker compose up -d inference`)
    NILM_SERVICE_URL: str = "http://host.docker.internal:8002"

    POSTGRES_USER: str = "wattprint"
    POSTGRES_PASSWORD: str = "change-me"
    POSTGRES_DB: str = "wattprint"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
