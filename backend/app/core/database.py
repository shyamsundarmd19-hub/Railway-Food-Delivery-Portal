import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)


def build_engine(url: str):
    if "sqlite" in url:
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


# Attempt connection with resilient local development fallback
try:
    engine = build_engine(db_url)
    with engine.connect() as probe_conn:
        pass
except Exception as exc:
    # If developer has not started local Postgres, fallback gracefully to SQLite for local development
    if "localhost" in db_url or "127.0.0.1" in db_url:
        print(f"[Database Notice] Local Postgres at localhost:5432 not reachable. Using SQLite fallback 'sqlite:///./railfood_dev.db'.")
        db_url = "sqlite:///./railfood_dev.db"
        engine = build_engine(db_url)
    else:
        # In staging/production (e.g. AWS RDS), retain original engine so it raises on failure
        engine = build_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    """Dependency for obtaining an isolated SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
