import os, sys, time, math, random, csv
from datetime import datetime, timedelta
import config

PROFILES = [('LINE-A','CNC_Mill',64.0,42.0,2.1,3200,74.0),('LINE-A','Robotic_Welder',68.0,48.0,2.4,2900,76.0),('LINE-B','Hydraulic_Press',71.0,128.0,4.3,1250,78.0),('LINE-C','Injection_Molder',84.0,82.0,2.8,2100,80.0)]

def get_shift(h):
    return 'Morning' if 6 <= h < 14 else ('Evening' if 14 <= h < 22 else 'Night')

def build_machines(n, lines):
    fleet = []
    for i in range(n):
        p = PROFILES[i % len(PROFILES)]
        fleet.append(('M-%02d' % (i+1), 'LINE-' + chr(65 + (i % lines)), p[1], p[2]+random.uniform(-2,2), p[3]+random.uniform(-3,3), p[4], p[5], p[6]))
    return fleet

def generate_record(m, ts):
    sh = get_shift(ts.hour)
    load = max(10.0, min(99.0, random.gauss(m[7] - (6.0 if sh=='Night' else 0.0), 11.0)))
    rpm = int(max(300, m[6]*(0.45+0.72*(load/100.0))+random.gauss(0,65)))
    vib = round(max(0.4, m[5]*(0.6+0.55*(load/100.0))+random.gauss(0,0.35)), 2)
    temp = round(m[3]+0.18*(load-70.0)+1.4*(vib-m[5])+random.gauss(0,1.8), 2)
    pres = round(max(25.0, m[4]+0.22*(load-70.0)+random.gauss(0,3.2)), 2)
    eng = round(2.5+0.16*load+4.8*((rpm/1000.0)**1.35)+random.gauss(0,0.7), 2)
    out = max(0, int(round(42.0*(1.0-0.008*abs(load-76.0))*(load/80.0)+random.gauss(0,2.5))))
    dt, st, r = 0, ('OVERLOAD' if load>90.0 else 'RUNNING'), random.random()
    if r<0.008: temp, vib, st = round(temp+26.0,2), round(vib+4.8,2), 'OVERLOAD'
    elif r<0.014: out, dt, st = 0, 1, 'MAINTENANCE'
    elif r<0.018: pres = round(pres+38.0, 2)
    return [ts.strftime('%Y-%m-%d %H:%M:%S'), m[0], m[1], m[2], sh, temp, pres, vib, rpm, round(load,2), eng, out, dt, st]

def run(total=None):
    total = int(total or config.NUMBER_OF_RECORDS)
    fleet = build_machines(config.NUMBER_OF_MACHINES, config.NUMBER_OF_PRODUCTION_LINES)
    ts, sent, b = datetime.now() - timedelta(days=7), 0, 0
    while sent < total:
        n = min(config.BATCH_SIZE, total - sent)
        b += 1
        tmp = os.path.join(config.SPOOL_DIR, 'mfg_%05d.tmp' % b)
        f = open(tmp, 'w'); w = csv.writer(f)
        for k in range(n):
            ts += timedelta(seconds=2)
            w.writerow(generate_record(fleet[(sent+k)%len(fleet)], ts))
        f.close(); os.rename(tmp, tmp[:-4]+'.csv'); sent += n
        print('Batch %d: %d/%d' % (b, sent, total)); time.sleep(config.DATA_GENERATION_INTERVAL)

if __name__ == '__main__':
    run(sys.argv[1] if len(sys.argv) > 1 else None)
