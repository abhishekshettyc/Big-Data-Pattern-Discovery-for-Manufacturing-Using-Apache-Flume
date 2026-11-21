import csv, math
from collections import defaultdict

INP = '/home/cloudera/manufacturing-project/results/processed_manufacturing.csv'
OUT = '/home/cloudera/manufacturing-project/results/machine_behaviour.csv'

def run():
    agg = defaultdict(lambda: [0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,'',''])
    for r in csv.DictReader(open(INP)):
        a = agg[r['machine_id']]; a[0] += 1; a[8] = r['production_line']; a[9] = r['machine_type']
        for i,k in enumerate(['temperature','pressure','vibration','rpm','load','energy_consumption','production_output']): a[i+1]+=float(r[k])
    w = csv.writer(open(OUT,'w'))
    w = csv.writer(open(OUT,'w'))
    hdr = ['machine_id','production_line','machine_type','records','avg_temp','avg_pressure','avg_vibration']
    hdr += ['avg_rpm','avg_load','avg_energy','avg_output','behaviour_group']
    w.writerow(hdr)
    for m in sorted(agg):
        cnt,t,pr,vb,rp,ld,en,ou,pl,mt = agg[m]; n = float(cnt)
        av = [round(x/n,2) for x in (t,pr,vb,rp,ld,en,ou)]
        grp = 'High-Speed' if rp/n>2500 else ('High-Pressure' if pr/n>105 else 'Thermal')
        w.writerow([m,pl,mt,cnt]+av+[grp])

if __name__=='__main__': run()
