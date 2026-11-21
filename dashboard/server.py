import os, csv, json, subprocess, SimpleHTTPServer, SocketServer

FILES = ['machine_behaviour','sensor_relationships','temporal_patterns','association_rules','production_patterns','anomalies_detected']

def read_hdfs(path):
    p = subprocess.Popen(['hdfs','dfs','-cat',path], stdout=subprocess.PIPE)
    return list(csv.DictReader(p.stdout))

class Handler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/patterns':
            data = dict((f, read_hdfs("/manufacturing/patterns/%s/%s.csv"%(f,f))) for f in FILES)
            body = json.dumps(data)
            self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers()
            self.wfile.write(body)
        else: SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

os.chdir('/home/cloudera/manufacturing-project/dashboard')
SocketServer.TCPServer(('',8050),Handler).serve_forever()
