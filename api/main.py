from fastapi import FastAPI, Query
from typing import List, Optional
from datetime import date
from sqlalchemy import text
from .schemas import SoilRecord, WeatherRecord, MandiRecord, CropRecord, PriceSignalRequest
from .db import SessionLocal, init_db

app = FastAPI(title="Agri Data Platform – Prototype", version="0.1.0")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

# --- Generic helpers ---
def insert(table: str, payload: dict):
    keys = ",".join(payload.keys())
    placeholders = ",".join([f":{k}" for k in payload.keys()])
    sql = text(f"INSERT INTO {table} ({keys}) VALUES ({placeholders})")
    with SessionLocal() as s:
        s.execute(sql, payload)
        s.commit()

def query(sql: str, params: dict = None):
    with SessionLocal() as s:
        res = s.execute(text(sql), params or {})
        cols = res.keys()
        return [dict(zip(cols, row)) for row in res.fetchall()]

# --- Soil ---
@app.post("/v1/soil")
def add_soil(record: SoilRecord):
    insert("soil", record.model_dump())
    return {"ok": True}

@app.get("/v1/soil")
def get_soil(village: Optional[str] = None, state: Optional[str] = None):
    sql = "SELECT * FROM soil"
    if village:
        sql += " WHERE village = :village"
        return query(sql, {"village": village})
    return query(sql)

# --- Weather ---
@app.post("/v1/weather")
def add_weather(record: WeatherRecord):
    insert("weather", record.model_dump())
    return {"ok": True}

@app.get("/v1/weather")
def get_weather(state: Optional[str] = None, start: Optional[date] = None, end: Optional[date] = None):
    sql = "SELECT * FROM weather WHERE 1=1"
    params = {}
    if state:
        sql += " AND state = :state"
        params["state"] = state
    if start:
        sql += " AND date >= :start"
        params["start"] = str(start)
    if end:
        sql += " AND date <= :end"
        params["end"] = str(end)
    return query(sql, params)

# --- Mandi ---
@app.post("/v1/mandi")
def add_mandi(record: MandiRecord):
    insert("mandi", record.model_dump())
    return {"ok": True}

@app.get("/v1/mandi")
def get_mandi(commodity: Optional[str] = None, state: Optional[str] = None, start: Optional[date] = None, end: Optional[date] = None):
    sql = "SELECT * FROM mandi WHERE 1=1"
    params = {}
    if commodity:
        sql += " AND commodity = :commodity"
        params["commodity"] = commodity
    if state:
        sql += " AND state = :state"
        params["state"] = state
    if start:
        sql += " AND date >= :start"
        params["start"] = str(start)
    if end:
        sql += " AND date <= :end"
        params["end"] = str(end)
    return query(sql, params)

# --- Crops ---
@app.post("/v1/crops")
def add_crops(record: CropRecord):
    insert("crops", record.model_dump())
    return {"ok": True}

@app.get("/v1/crops")
def get_crops(farmer_id: Optional[str] = None, crop: Optional[str] = None):
    sql = "SELECT * FROM crops WHERE 1=1"
    params = {}
    if farmer_id:
        sql += " AND farmer_id = :farmer_id"
        params["farmer_id"] = farmer_id
    if crop:
        sql += " AND crop = :crop"
        params["crop"] = crop
    return query(sql, params)

# --- Simple Feature: Price Signal ---
@app.post("/v1/features/price-signal")
def price_signal(req: PriceSignalRequest):
    # Mean price and simple weather anomaly factor (rainfall deviation from 50mm baseline)
    params = {"commodity": req.commodity}
    sql = "SELECT date, state, modal_price_inr_per_qtl FROM mandi WHERE commodity = :commodity"
    if req.state:
        sql += " AND state = :state"
        params["state"] = req.state
    if req.start_date:
        sql += " AND date >= :start"
        params["start"] = str(req.start_date)
    if req.end_date:
        sql += " AND date <= :end"
        params["end"] = str(req.end_date)
    prices = query(sql, params)
    if not prices:
        return {"commodity": req.commodity, "signal": None, "reason": "No price data"}

    # Compute mean price
    avg_price = sum(p["modal_price_inr_per_qtl"] for p in prices) / len(prices)

    # Weather anomaly (very naive): last 7 days rainfall vs 50mm baseline
    w = query("SELECT AVG(rainfall_mm) as avg_rain FROM weather WHERE date >= date('now','-7 day')")
    avg_rain = (w[0]["avg_rain"] or 0) if w else 0
    anomaly = (avg_rain - 50.0) / 50.0

    signal = avg_price * (1 + 0.1 * anomaly)
    return {
        "commodity": req.commodity,
        "avg_price": round(avg_price, 2),
        "weather_anomaly": round(anomaly, 3),
        "signal": round(signal, 2)
    }
