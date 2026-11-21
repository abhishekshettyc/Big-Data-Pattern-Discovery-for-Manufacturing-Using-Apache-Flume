import csv
from collections import defaultdict

INP = '/home/cloudera/manufacturing-project/results/processed_manufacturing.csv'
OUT = '/home/cloudera/manufacturing-project/results/production_patterns.csv'

def run():
    agg = defaultdict(lambda: [0,0.0,0.0,0.0,0])
    for r in csv.DictReader(open(INP)):
        k = (r['load_bin'], r['operating_status'])
        c,ou,en,ef,dt = agg[k]
        agg[k] = [c+1, ou+int(r['production_output']), en+float(r['energy_consumption']), ef+float(r['energy_efficiency']), dt+int(r['downtime'])]
    w = csv.writer(open(OUT,'w'))
    w.writerow(['load_regime','operating_status','records','avg_output','avg_energy','avg_efficiency','downtime_events'])
    for (lb,st) in sorted(agg):
        c,ou,en,ef,dt = agg[(lb,st)]; n = float(c)
        w.writerow([lb,st,c,round(ou/n,2),round(en/n,2),round(ef/n,3),dt])

if __name__=='__main__': run()
