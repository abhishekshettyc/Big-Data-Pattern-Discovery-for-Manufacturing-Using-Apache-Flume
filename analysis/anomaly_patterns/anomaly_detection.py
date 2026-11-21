import csv, math
from collections import defaultdict

INP = '/home/cloudera/manufacturing-project/results/processed_manufacturing.csv'
OUT = '/home/cloudera/manufacturing-project/results/anomalies_detected.csv'

def run():
    rows = list(csv.DictReader(open(INP)))
    stats = defaultdict(list)
    for r in rows: stats[r['machine_id']].append((float(r['temperature']), float(r['vibration'])))
    base = {}
    for m, vals in stats.items():
        ts, vs = zip(*vals); n = float(len(ts)); mt, mv = sum(ts)/n, sum(vs)/n
        st = math.sqrt(sum((x-mt)**2 for x in ts)/n) or 1.0
        sv = math.sqrt(sum((x-mv)**2 for x in vs)/n) or 1.0
        base[m] = (mt, st, mv, sv)
    w = csv.writer(open(OUT,'w'))
    w.writerow(['timestamp','machine_id','production_line','temperature','vibration','temp_z','vib_z','anomaly_type'])
    for r in rows:
        mt, st, mv, sv = base[r['machine_id']]
        tz, vz = (float(r['temperature'])-mt)/st, (float(r['vibration'])-mv)/sv
        if abs(tz)>2.5 or abs(vz)>2.5:
            w.writerow([r['timestamp'],r['machine_id'],r['production_line'],r['temperature'],r['vibration'],round(tz,2),round(vz,2),'Sensor_Surge'])
if __name__=='__main__': run()
