# Minimal Architecture

```
+-------------------+        +------------------+        +------------------+
|  Data Sources     | -----> |   Ingestors      | -----> |  Unified Store   |
| (Soil/Weather/    |        | (CSV/JSON/       |        | (SQLite/Parquet) |
|  Mandi/Crops)     |        |  Streams)        |        |                  |
+---------+---------+        +---------+--------+        +---------+--------+
          |                             |                           |
          |                             v                           v
          |                     +---------------+           +---------------+
          |                     | Registry      |           | FastAPI       |
          |                     | (metadata)    |           | /v1/*         |
          |                     +-------+-------+           +-------+-------+
          |                             |                           |
          |                             v                           v
          |                     +---------------+           +---------------+
          |                     | Feature Logic |           | AI/BI Clients |
          |                     +---------------+           +---------------+
```

- Replace SQLite with Postgres; add Kafka + MinIO for scale.
- Replace the simple registry with OpenMetadata/Amundsen later.
- Add OPA/Rego policies for authZ (RLS, tenant isolation).
