# Big Data Pattern Discovery for Manufacturing Using Apache Flume
# Big Data Pattern Discovery for Manufacturing Using Apache Flume

An end-to-end **Smart Manufacturing Big Data Analytics & Pattern Discovery Pipeline** built on **Cloudera Hadoop (HDFS)** and **Apache Flume**. The system ingests multi-sensor industrial telemetry across factory production lines, processes and engineers operational features, mines six categories of hidden manufacturing patterns, stores all results in HDFS, and serves a live web dashboard.

---

## System Architecture

```text
[Industrial Sensor Simulator (M-01..M-11)]
                  │
                  ▼
     [stream_buffer/spool/*.csv]
                  │
                  ▼  (Apache Flume SpoolingDirectorySource)
       [HDFS: /manufacturing/raw/]
                  │
                  ▼  (preprocess_data.py)
    [HDFS: /manufacturing/processed/]
                  │
                  ▼  (6 Pattern Discovery Modules)
     [HDFS: /manufacturing/patterns/*]
                  │
                  ▼  (server.py /api/patterns)
   [Live Web Dashboard: http://localhost:8050]
```

---

## Key Features & Pattern Discovery Modules

| Module | Script Path | HDFS Output Path | Analytical Objective |
| :--- | :--- | :--- | :--- |
| **Data Preprocessing** | `analysis/preprocessing/preprocess_data.py` | `/manufacturing/processed/` | Cleans raw sensor logs, validates schemas, and computes `energy_efficiency`, `temp_pressure_ratio`, `shift`, and `load_bin`. |
| **1. Machine Behaviour** | `analysis/machine_patterns/machine_behaviour.py` | `/manufacturing/patterns/machine_behaviour/` | Profiles per-machine baseline thermal, vibration, pressure, energy, and throughput metrics. |
| **2. Sensor Relationships** | `analysis/sensor_patterns/sensor_relationships.py` | `/manufacturing/patterns/sensor_relationships/` | Computes pairwise Pearson correlation coefficients (r) to classify Strong, Moderate, and Weak physical dependencies. |
| **3. Temporal Patterns** | `analysis/temporal_patterns/temporal_analysis.py` | `/manufacturing/patterns/temporal_patterns/` | Analyzes hourly and shift-level (`Morning`, `Afternoon`, `Night`) production output and power consumption. |
| **4. Association Rules** | `analysis/association_patterns/association_mining.py` | `/manufacturing/patterns/association_rules/` | Mines `IF -> THEN` operational rules using Apriori Support, Confidence, and Lift metrics. |
| **5. Production Efficiency** | `analysis/production_patterns/production_analysis.py` | `/manufacturing/patterns/production_patterns/` | Compares output-per-energy efficiency across `Low`, `Medium`, and `High` operating load regimes. |
| **6. Anomaly Detection** | `analysis/anomaly_patterns/anomaly_detection.py` | `/manufacturing/patterns/anomalies_detected/` | Flags statistical `Sensor_Surge` outliers (|Z| > 2.5) in temperature and vibration for predictive maintenance. |

---

## Project Structure

```text
Big-Data-Pattern-Discovery-for-Manufacturing-Using-Apache-Flume/
├── analysis/
│   ├── anomaly_patterns/anomaly_detection.py
│   ├── association_patterns/association_mining.py
│   ├── machine_patterns/machine_behaviour.py
│   ├── preprocessing/preprocess_data.py
│   ├── production_patterns/production_analysis.py
│   ├── sensor_patterns/sensor_relationships.py
│   └── temporal_patterns/temporal_analysis.py
├── dashboard/
│   ├── index.html          # Industrial dark-theme pattern discovery UI
│   └── server.py           # Lightweight HTTP server streaming live HDFS JSON
├── data_generator/
│   ├── config.py           # Machine, production line, and sensor thresholds
│   ├── machine_simulator.py# Multi-sensor industrial telemetry batch generator
│   └── DATA_MODEL.md       # Sensor schema and data dictionary
├── flume/
│   └── manufacturing-flume.conf  # Apache Flume SpoolDir -> HDFS agent configuration
├── results/                # Discovered CSV pattern datasets
├── stream_buffer/spool/    # Spooled telemetry batch files ingested by Flume
├── run_pipeline.sh         # One-command end-to-end pipeline orchestrator
└── .gitignore
```

---

## Tech Stack
* **Big Data Storage & Ingestion:** Hadoop HDFS, Apache Flume (`SpoolingDirectorySource`)
* **Analytics & Pattern Mining:** Python (Statistical Profiling, Pearson Correlation, Apriori Rule Mining, Z-Score Anomaly Detection)
* **Visualization & API:** Python `SimpleHTTPServer` / `SocketServer`, HTML5, CSS3, ES5 JavaScript
* **Environment:** Cloudera QuickStart VM (CentOS / Linux)

---

## How to Run on Cloudera Hadoop

### 1. Start Apache Flume Ingestion Agent
```bash
flume-ng agent \
  --conf /etc/flume-ng/conf \
  --conf-file ~/manufacturing-project/flume/manufacturing-flume.conf \
  --name mfg_agent \
  -Dflume.root.logger=INFO,console
```

### 2. Run the End-to-End Preprocessing & Pattern Mining Pipeline
```bash
bash ~/manufacturing-project/run_pipeline.sh
```

### 3. Launch the Live HDFS Web Dashboard
```bash
nohup python ~/manufacturing-project/dashboard/server.py > ~/manufacturing-project/logs/dashboard.log 2>&1 &
```
Open **`http://localhost:8050`** in your browser to view live KPI cards and all six discovered HDFS pattern tables.
