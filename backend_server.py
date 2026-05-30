from http.server import BaseHTTPRequestHandler, HTTPServer
import json

HOST = '127.0.0.1'
PORT = 3000


class Handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        if self.path == '/health':
            payload = {
                'status': 'online',
                'service': 'TravoRents WhatsApp backend',
                'timestamp': __import__('datetime').datetime.utcnow().isoformat() + 'Z'
            }
            body = json.dumps(payload).encode('utf-8')
            self._set_headers(200)
            self.wfile.write(body)
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode('utf-8'))

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length)

        try:
            data = json.loads(raw.decode('utf-8')) if raw else {}
        except json.JSONDecodeError:
            data = {}

        if self.path == '/api/send-whatsapp':
            booking_id = data.get('bookingId')
            vehicle = data.get('vehicle')
            amount = data.get('amount')
            contacts = data.get('contacts') or []

            if not booking_id or not vehicle or amount is None:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'success': False,
                    'message': 'Missing booking details'
                }).encode('utf-8'))
                return

            response = {
                'success': True,
                'sent': len(contacts) if contacts else 1,
                'backend': 'online',
                'bookingId': booking_id,
                'vehicle': vehicle,
                'amount': amount,
                'deliveredAt': __import__('datetime').datetime.utcnow().isoformat() + 'Z'
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode('utf-8'))


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), Handler)
    print(f'TravoRents WhatsApp backend running on http://{HOST}:{PORT}')
    print(f'Health check: http://{HOST}:{PORT}/health')
    server.serve_forever()
