from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from lobby_service.database import (
    LobbyCodeExhaustedError,
    LobbyMemberAlreadyExistsError,
    LobbyNotFoundError,
    LobbyRecord,
    add_lobby_member,
    connect,
    create_lobby,
    get_lobby,
    initialize_database,
    list_user_lobbies,
)

HOST = "127.0.0.1"
PORT = 8003
ALLOWED_ORIGINS = {"http://127.0.0.1:5173"}


class LobbyRequestHandler(BaseHTTPRequestHandler):
    server_version = "WorldCupLobbies/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/health":
            self.send_json(200, {"status": "ok"})
            return

        path_parts = [part for part in parsed.path.split("/") if part]

        if len(path_parts) == 2 and path_parts[0] == "lobbies":
            with connect() as connection:
                initialize_database(connection)

                try:
                    lobby = get_lobby(connection, path_parts[1])
                except LobbyNotFoundError as error:
                    self.send_json(404, {"error": str(error)})
                    return

            self.send_json(200, {"lobby": self.lobby_payload(lobby)})
            return

        if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "lobbies":
            try:
                user_id = int(path_parts[1])
            except ValueError:
                self.send_json(400, {"error": "User id must be a number."})
                return

            with connect() as connection:
                initialize_database(connection)
                lobbies = list_user_lobbies(connection, user_id)

            self.send_json(200, {"lobbies": [self.lobby_payload(lobby) for lobby in lobbies]})
            return

        self.send_json(404, {"error": "Not found."})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path_parts = [part for part in parsed.path.split("/") if part]

        if len(path_parts) == 3 and path_parts[0] == "lobbies" and path_parts[2] == "members":
            self.add_lobby_member(path_parts[1])
            return

        if parsed.path != "/lobbies":
            self.send_json(404, {"error": "Not found."})
            return

        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        try:
            created_by_user_id = int(payload.get("createdByUserId", 0))
        except (TypeError, ValueError):
            created_by_user_id = 0

        created_by_username = str(payload.get("createdByUsername", ""))
        name = str(payload.get("name", "World Cup Lobby"))

        if created_by_user_id <= 0 or not created_by_username.strip():
            self.send_json(400, {"error": "Creator user id and username are required."})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                lobby = create_lobby(
                    connection,
                    created_by_user_id=created_by_user_id,
                    created_by_username=created_by_username,
                    name=name,
                )
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
                return
            except LobbyCodeExhaustedError as error:
                self.send_json(503, {"error": str(error)})
                return

        self.send_json(201, {"lobby": self.lobby_payload(lobby)})

    def add_lobby_member(self, code: str) -> None:
        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        try:
            user_id = int(payload.get("userId", 0))
        except (TypeError, ValueError):
            user_id = 0

        username = str(payload.get("username", ""))

        if user_id <= 0 or not username.strip():
            self.send_json(400, {"error": "User id and username are required."})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                lobby = add_lobby_member(
                    connection,
                    code=code,
                    user_id=user_id,
                    username=username,
                )
            except LobbyNotFoundError as error:
                self.send_json(404, {"code": "lobby_not_found", "error": str(error)})
                return
            except LobbyMemberAlreadyExistsError as error:
                self.send_json(409, {"code": "already_member", "error": str(error)})
                return
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
                return

        self.send_json(200, {"lobby": self.lobby_payload(lobby)})

    def read_json_body(self) -> dict[str, Any] | None:
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)

        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            return None

        return payload if isinstance(payload, dict) else None

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def send_cors_headers(self) -> None:
        origin = self.headers.get("Origin")
        allowed_origin = origin if origin in ALLOWED_ORIGINS else "http://127.0.0.1:5173"

        self.send_header("Access-Control-Allow-Origin", allowed_origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def lobby_payload(self, lobby: LobbyRecord) -> dict[str, Any]:
        return {
            "code": lobby.code,
            "name": lobby.name,
            "members": [
                {
                    "userId": member.user_id,
                    "username": member.username,
                    "role": member.role,
                }
                for member in lobby.members
            ],
        }


def run() -> None:
    with connect() as connection:
        initialize_database(connection)

    server = ThreadingHTTPServer((HOST, PORT), LobbyRequestHandler)
    print(f"Lobby service listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
