from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class SoilRecord(BaseModel):
    village: str
    lat: float
    lon: float
    sample_date: date
    ph: float = Field(ge=0, le=14)
    nitrogen: float
    phosphorus: float
    potassium: float
    organic_carbon: Optional[float] = None
    moisture: Optional[float] = None

class WeatherRecord(BaseModel):
    station_id: str
    date: date
    max_temp_c: float
    min_temp_c: float
    rainfall_mm: float
    humidity_pct: Optional[float] = None
    district: Optional[str] = None
    state: Optional[str] = None

class MandiRecord(BaseModel):
    mandi: str
    state: str
    commodity: str
    variety: Optional[str] = None
    date: date
    modal_price_inr_per_qtl: float
    arrivals_qtl: Optional[float] = None

class CropRecord(BaseModel):
    plot_id: str
    farmer_id: str
    state: str
    district: str
    crop: str
    variety: Optional[str] = None
    sowing_date: date
    expected_harvest_date: Optional[date] = None
    area_acres: float

class PriceSignalRequest(BaseModel):
    commodity: str
    state: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
