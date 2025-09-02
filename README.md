# Smart Farmer Advisory App

An end-to-end, lightweight app for Indian agriculture. Farmers can search a village to view **soil, weather, crop, and mandi (market)** insights in a clean UI, powered by a simple FastAPI backend.

## Features
- Clean UI for village search with recent suggestions and filters (state, date range).
- Ingestors for soil, weather, crop, and mandi data (CSV/JSON).
- SQLite + SQLAlchemy data store (swap with Postgres later).
- FastAPI service with endpoints:
  - `/v1/soil`, `/v1/weather`, `/v1/mandi`, `/v1/crops`
  - `/v1/features/price-signal` – blends mandi prices and weather anomalies.
- Basic dataset registry & lineage in `storage/registry.json`.
- Sample data in `sample_data/` to try end-to-end quickly.

## Quickstart

### 1) Backend setup (Python 3.10+)
```bash
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2) Load sample data
```bash
python ingestors/soil_ingestor.py --file sample_data/soil.csv
python ingestors/weather_ingestor.py --file sample_data/weather.json
python ingestors/mandi_ingestor.py --file sample_data/mandi.csv
python ingestors/crop_ingestor.py --file sample_data/crops.csv
```

### 3) Run the API
```bash
uvicorn api.main:app --reload --port 8000
```

Open http://localhost:8000/docs

### 4) Run the UI (Node 18+)
```bash
cd ui
npm install
npm start
```

Open http://localhost:3000 and search for a village (e.g., "Rampur"). The UI calls the local API at port 8000.

## Design Notes
- This is intentionally **SQLite-first** for simplicity. Switch to Postgres by changing `DATABASE_URL` in `api/db.py`.
- Add auth & row-level access with a gateway (e.g., Ory/Hydra or an API key middleware).
- Add a message bus (Kafka) & object storage (MinIO/S3) for production-grade pipelines.
- Treat `registry.json` as a placeholder for a real catalog (e.g., OpenMetadata/Amundsen) and policy engine (OPA/Rego).

## Author
Rishijeet Mishra

## License
MIT

