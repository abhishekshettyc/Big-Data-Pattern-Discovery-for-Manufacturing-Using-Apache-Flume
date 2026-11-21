import csv, itertools
from collections import defaultdict

INP = '/home/cloudera/manufacturing-project/results/processed_manufacturing.csv'
OUT = '/home/cloudera/manufacturing-project/results/association_rules.csv'

def run():
    single, pair, n = defaultdict(int), defaultdict(int), 0.0
    for r in csv.DictReader(open(INP)):
        n += 1
        items = ['Load='+r['load_bin'], 'RPM='+r['rpm_bin'], 'Temp='+r['temp_bin']]
        items += ['Vib='+r['vib_bin'], 'Pres='+r['pres_bin'], 'Eng='+r['eng_bin'], 'Status='+r['operating_status']]
        for x in items: single[x] += 1
        for a, b in itertools.combinations(sorted(items), 2): pair[(a,b)] += 1
    w = csv.writer(open(OUT,'w'))
    w.writerow(['antecedent','consequent','support','confidence','lift'])
    for (a, b), cnt in sorted(pair.items(), key=lambda x: -x[1]):
        sup, conf = cnt/n, cnt/float(single[a])
        lift = conf/(single[b]/n)
        if sup>=0.05 and lift>1.1: w.writerow([a,b,round(sup,4),round(conf,4),round(lift,4)])

