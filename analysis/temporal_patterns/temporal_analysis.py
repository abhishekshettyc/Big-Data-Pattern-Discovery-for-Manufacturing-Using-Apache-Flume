import csv
from collections import defaultdict

INP = '/home/cloudera/manufacturing-project/results/processed_manufacturing.csv'
OUT = '/home/cloudera/manufacturing-project/results/temporal_patterns.csv'

def run():
    agg = defaultdict(lambda: [0,0.0,0.0,0.0,0.0])
    for r in csv.DictReader(open(INP)):
        k = (r['shift'], int(r['hour'])); c,ld,en,ou,tp = agg[k]
        agg[k] = [c+1, ld+float(r['load']), en+float(r['energy_consumption']), ou+int(r['production_output']), tp+float(r['temperature'])]
    w = csv.writer(open(OUT,'w'))
    w.writerow(['shift','hour','records','avg_load','avg_energy','total_output','avg_temp'])
    for (sh,hr) in sorted(agg):
        c,ld,en,ou,tp = agg[(sh,hr)]; n = float(c)
        w.writerow([sh,hr,c,round(ld/n,2),round(en/n,2),int(ou),round(tp/n,2)])

if __name__=='__main__': run()
