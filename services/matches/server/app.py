from __future__ import annotations

import json
import os
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from matches_service.football_data import (
    ConfigurationError,
    FootballDataError,
    all_matches_payload,
    carousel_payload,
    load_env_file,
)


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = "8002"
DEFAULT_ALLOWED_ORIGINS = ("*",)
ROOT_DIR = Path(__file__).resolve().parents[3]


def get_host() -> str:
    return os.environ.get("HOST", "0.0.0.0" if os.environ.get("PORT") else DEFAULT_HOST)


def get_port() -> int:
    return int(os.environ.get("PORT", DEFAULT_PORT))


def get_allowed_origins() -> tuple[str, ...]:
    configured_origins = os.environ.get("ALLOWED_ORIGINS")

    if not configured_origins:
        return DEFAULT_ALLOWED_ORIGINS

    origins = tuple(
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    )
    return origins or DEFAULT_ALLOWED_ORIGINS

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

        if parsed.path == "/matches":
            self.send_matches_payload(all_matches_payload)
            return

        if parsed.path != "/matches/carousel":
            self.send_json(404, {"error": "Not found."})
            return

        query = parse_qs(parsed.query)
        today = self.parse_today(query.get("today", [None])[0])
        self.send_matches_payload(lambda: carousel_payload(today=today))

    def send_matches_payload(self, payload_factory: Any) -> None:
        try:
            self.send_json(200, payload_factory())
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
        allowed_origins = get_allowed_origins()
        origin = self.headers.get("Origin")
        normalized_origin = origin.rstrip("/") if origin else None
        allowed_origin = (
            "*"
            if "*" in allowed_origins
            else normalized_origin if normalized_origin in allowed_origins else allowed_origins[0]
        )

        self.send_header("Access-Control-Allow-Origin", allowed_origin)
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


def run() -> None:
    load_env_file(ROOT_DIR / ".env")
    host = get_host()
    port = get_port()
    server = ThreadingHTTPServer((host, port), MatchesRequestHandler)
    print(f"Matches service listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
