import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError
from app.core.config import settings

logger = logging.getLogger("hostelshare.db")

db_url = settings.effective_database_url

def init_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)

# Attempt connection to configured database
if not db_url.startswith("sqlite"):
    try:
        logger.info("HostelShare: Testing remote PostgreSQL / Supabase connection...")
        temp_engine = init_engine(db_url)
        with temp_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = temp_engine
        logger.info("HostelShare: Successfully connected to remote PostgreSQL / Supabase!")
    except Exception as e:
        logger.warning(
            "HostelShare: Remote Supabase connection failed (%s). "
            "Falling back to local SQLite (sqlite:///./hostelshare.db) for uninterrupted development.",
            e
        )
        db_url = "sqlite:///./hostelshare.db"
        engine = init_engine(db_url)
else:
    logger.info("HostelShare: Using local SQLite database (%s)", db_url)
    engine = init_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
