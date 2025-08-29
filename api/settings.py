from pydantic import BaseSettings


class Settings(BaseSettings):
    REDIS_URL: str = "redis://localhost:6379/0"
    JOB_TTL: int = 60 * 60 * 24 * 3  # 3 days
    JOB_STATUS_PREFIX: str = "job:"
    
    class Config:
        env_file = ".env"


settings = Settings()
