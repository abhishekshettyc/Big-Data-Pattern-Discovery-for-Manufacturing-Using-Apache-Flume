import csv, math

COLS = ['temperature','pressure','vibration','rpm','load','energy_consumption','production_output']
INP = '/home/cloudera/manufacturing-project/results/processed_manufacturing.csv'
OUT = '/home/cloudera/manufacturing-project/results/sensor_relationships.csv'

def run():
    data = dict((c, []) for c in COLS)
    for r in csv.DictReader(open(INP)):
        for c in COLS: data[c].append(float(r[c]))
    w = csv.writer(open(OUT,'w')); w.writerow(['sensor_x','sensor_y','pearson_r','strength'])
    n = float(len(data['load']))
    for x in COLS:
        for y in COLS:
            xs, ys = data[x], data[y]
            mx, my = sum(xs)/n, sum(ys)/n
            num = sum((a-mx)*(b-my) for a,b in zip(xs,ys))
            den = math.sqrt(sum((a-mx)**2 for a in xs)*sum((b-my)**2 for b in ys))
            r = round(num/den, 4) if den>0 else 0.0
            r = round(num/den, 4) if den>0 else 0.0
            s = 'Strong' if abs(r)>=0.6 else ('Moderate' if abs(r)>=0.3 else 'Weak')
            w.writerow([x,y,r,s])

if __name__=='__main__': run()
