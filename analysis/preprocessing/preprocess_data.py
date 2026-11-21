import os, csv, subprocess

def bin_val(v, lo, hi):
    return 'Low' if v < lo else ('High' if v > hi else 'Medium')

def preprocess():
    out_local = '/home/cloudera/manufacturing-project/results/processed_manufacturing.csv'
    f_out = open(out_local, 'w'); w = csv.writer(f_out)
    w.writerow(['timestamp','date','hour','machine_id','production_line','machine_type','shift','temperature','pressure','vibration','rpm','load','energy_consumption','production_output','downtime','operating_status','energy_efficiency','load_bin','rpm_bin','temp_bin','vib_bin','pres_bin','eng_bin'])
    p = subprocess.Popen(['hdfs','dfs','-cat','/manufacturing/raw/mfg_events*'], stdout=subprocess.PIPE)
    n = 0
    for r in csv.reader(p.stdout):
        if len(r)!=14: continue
        ts,mid,pl,mt,sh,t,pr,vb,rp,ld,en,ou,dt,st = r
        t,pr,vb,rp,ld,en,ou,dt = float(t),float(pr),float(vb),int(rp),float(ld),float(en),int(ou),int(dt)
        eff = round(ou/en, 3) if en > 0 else 0.0
        row = [ts,ts[:10],int(ts[11:13]),mid,pl,mt,sh,t,pr,vb,rp,ld,en,ou,dt,st,eff]
        row += [bin_val(ld,60,84),bin_val(rp,1800,3000),bin_val(t,66,82),bin_val(vb,2.3,3.8),bin_val(pr,55,115),bin_val(en,22,34)]
        w.writerow(row); n += 1
    f_out.close(); subprocess.call(['hdfs','dfs','-put','-f',out_local,'/manufacturing/processed/'])
    print('Processed:', n)



if __name__=='__main__': preprocess()
