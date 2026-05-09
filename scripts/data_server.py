import http.server
import sys
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8082
    os.chdir(ROOT)
    http.server.test(HandlerClass=CORSHandler, port=port)
