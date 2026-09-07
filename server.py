import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
from concurrent.futures import ThreadPoolExecutor

PORT = 8001

def fetch_url(url):
    try:
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def compile_history(league_id):
    standings_url = f"https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/"
    standings_data = fetch_url(standings_url)
    if not standings_data:
        return None
    
    entries = standings_data.get('standings', {}).get('results', [])
    history_urls = [f"https://fantasy.premierleague.com/api/entry/{entry['entry']}/history/" for entry in entries]
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        histories = list(executor.map(fetch_url, history_urls))
    
    max_gw = 0
    for h in histories:
        if h and 'current' in h:
            max_gw = max(max_gw, max(item['event'] for item in h['current']) if h['current'] else 0)
            
    gw_standings = {}
    for gw in range(1, max_gw + 1):
        gw_results = []
        for i, entry in enumerate(entries):
            history = histories[i]
            if not history or 'current' not in history:
                continue
            
            gw_record = next((item for item in history['current'] if item['event'] == gw), None)
            if gw_record:
                gw_results.append({
                    "entry": entry['entry'],
                    "player_name": entry['player_name'],
                    "entry_name": entry['entry_name'],
                    "event_total": gw_record['points'],
                    "total": gw_record['total_points']
                })
        
        gw_results.sort(key=lambda x: x['total'], reverse=True)
        for rank, item in enumerate(gw_results, start=1):
            item['rank'] = rank
            
        gw_standings[str(gw)] = gw_results
        
    return {
        "max_gw": max_gw,
        "standings": gw_standings
    }

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/standings/history/'):
            league_id = self.path.split('/')[-1]
            data = compile_history(league_id)
            if data:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            else:
                self.send_error(500, "Failed to compile history data")
        elif self.path.startswith('/api/standings/'):
            league_id = self.path.split('/')[-1]
            fpl_url = f"https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/"
            try:
                with urllib.request.urlopen(fpl_url) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_error(500, str(e))
        else:
            super().do_GET()

# Set the working directory to the current directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
