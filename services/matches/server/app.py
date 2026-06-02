from __future__ import annotations

import json
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from matches_service.football_data import (
    ConfigurationError,
    FootballDataError,
    carousel_payload,
    load_env_file,
)


HOST = "127.0.0.1"
PORT = 8002
ROOT_DIR = Path(__file__).resolve().parents[3]


class MatchesRequestHandler(BaseHTTPRequestHandler):
    server_version = "WorldCupMatches/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/health":
            self.send_json(200, {"status": "ok"})
            return

        if parsed.path != "/matches/carousel":
            self.send_json(404, {"error": "Not found."})
            return

        query = parse_qs(parsed.query)
        today = self.parse_today(query.get("today", [None])[0])

        try:
            self.send_json(200, carousel_payload(today=today))
        except ConfigurationError as error:
            self.send_json(500, {"error": str(error)})
        except FootballDataError as error:
            self.send_json(502, {"error": str(error)})

    def parse_today(self, raw_today: str | None) -> date | None:
        if raw_today is None:
            return None

        try:
            return date.fromisoformat(raw_today)
        except ValueError:
            return None

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


def run() -> None:
    load_env_file(ROOT_DIR / ".env")
    server = ThreadingHTTPServer((HOST, PORT), MatchesRequestHandler)
    print(f"Matches service listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
