import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./storage/agri.db")

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

DDL = [
    """CREATE TABLE IF NOT EXISTS soil (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        village TEXT, lat REAL, lon REAL, sample_date TEXT,
        ph REAL, nitrogen REAL, phosphorus REAL, potassium REAL,
        organic_carbon REAL, moisture REAL
    )""",
    """CREATE TABLE IF NOT EXISTS weather (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT, date TEXT,
        max_temp_c REAL, min_temp_c REAL, rainfall_mm REAL,
        humidity_pct REAL, district TEXT, state TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS mandi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mandi TEXT, state TEXT, commodity TEXT, variety TEXT,
        date TEXT, modal_price_inr_per_qtl REAL, arrivals_qtl REAL
    )""",
    """CREATE TABLE IF NOT EXISTS crops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plot_id TEXT, farmer_id TEXT, state TEXT, district TEXT,
        crop TEXT, variety TEXT, sowing_date TEXT,
        expected_harvest_date TEXT, area_acres REAL
    )"""
]

def init_db():
    with engine.connect() as conn:
        for stmt in DDL:
            conn.execute(text(stmt))
        conn.commit()
