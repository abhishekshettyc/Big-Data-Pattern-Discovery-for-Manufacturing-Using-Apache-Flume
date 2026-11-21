#!/bin/bash
set -e
cd ~/manufacturing-project
python analysis/preprocessing/preprocess_data.py
for s in analysis/*_patterns/*.py; do python "$s"; done
for f in machine_behaviour sensor_relationships temporal_patterns association_rules production_patterns anomalies_detected; do hdfs dfs -put -f results/$f.csv /manufacturing/patterns/$f/; done
echo "PIPELINE COMPLETE"
