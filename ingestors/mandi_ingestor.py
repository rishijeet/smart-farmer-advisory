import argparse, pandas as pd, json, time
from sqlalchemy import create_engine
from pathlib import Path

def main(file: str):
    engine = create_engine("sqlite:///./storage/agri.db")
    df = pd.read_csv(file)
    df.to_sql("mandi", engine, if_exists="append", index=False)
    reg_path = Path("storage/registry.json")
    reg = json.loads(reg_path.read_text()) if reg_path.exists() else {"datasets": []}
    reg["datasets"].append({
        "name": "mandi",
        "source": file,
        "rows": len(df),
        "ingested_at": int(time.time())
    })
    reg_path.write_text(json.dumps(reg, indent=2))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    args = ap.parse_args()
    main(args.file)
