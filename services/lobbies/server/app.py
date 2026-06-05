from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from lobby_service.database import (
    InvalidLobbyPasswordCredentialsError,
    InvalidLobbyPasswordError,
    InvalidPointSystemError,
    LobbyCodeExhaustedError,
    LobbyMemberAlreadyExistsError,
    LobbyMemberNotFoundError,
    LobbyNotFoundError,
    LobbyPermissionError,
    LobbyPasswordRequiredError,
    LobbyRecord,
    add_lobby_member,
    connect,
    create_lobby,
    delete_lobby,
    get_lobby,
    initialize_database,
    list_user_lobbies,
    remove_lobby_member,
    remove_lobby_member_by_admin,
    set_lobby_custom_settings,
    set_lobby_point_system,
)

HOST = "127.0.0.1"
PORT = 8003
ALLOWED_ORIGINS = {"http://127.0.0.1:5173"}
AUTH_SESSION_URL = os.environ.get("AUTH_SESSION_URL", "http://127.0.0.1:8001/session")


class AuthenticationError(ValueError):
    pass


def validate_auth_session(cookie_header: str) -> dict[str, Any]:
    if not cookie_header:
        raise AuthenticationError("Authentication is required.")

    request = Request(
        AUTH_SESSION_URL,
        headers={"Cookie": cookie_header},
        method="GET",
    )

    try:
        with urlopen(request, timeout=3) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code == 401:
            raise AuthenticationError("Authentication is required.") from error

        raise AuthenticationError("Could not validate authentication.") from error
    except (OSError, URLError, json.JSONDecodeError) as error:
        raise AuthenticationError("Could not validate authentication.") from error

    user = payload.get("user") if isinstance(payload, dict) else None

    if not isinstance(user, dict):
        raise AuthenticationError("Authentication is required.")

    try:
        user_id = int(user.get("id", 0))
    except (TypeError, ValueError) as error:
        raise AuthenticationError("Authentication is required.") from error

    if user_id <= 0:
        raise AuthenticationError("Authentication is required.")

    return user


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
        raw_password = payload.get("password")
        password = raw_password if isinstance(raw_password, str) else None

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
                    password=password,
                )
            except InvalidLobbyPasswordError as error:
                self.send_json(
                    400,
                    {
                        "code": "invalid_password_policy",
                        "error": str(error),
                        "requirements": error.errors,
                    },
                )
                return
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
        raw_password = payload.get("password")
        password = raw_password if isinstance(raw_password, str) and raw_password else None

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
                    password=password,
                )
            except LobbyNotFoundError as error:
                self.send_json(404, {"code": "lobby_not_found", "error": str(error)})
                return
            except LobbyMemberAlreadyExistsError as error:
                self.send_json(409, {"code": "already_member", "error": str(error)})
                return
            except LobbyPasswordRequiredError as error:
                self.send_json(403, {"code": "password_required", "error": str(error)})
                return
            except InvalidLobbyPasswordCredentialsError as error:
                self.send_json(403, {"code": "invalid_lobby_password", "error": str(error)})
                return
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
                return

        self.send_json(200, {"lobby": self.lobby_payload(lobby)})

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        path_parts = [part for part in parsed.path.split("/") if part]

        if len(path_parts) == 3 and path_parts[0] == "lobbies" and path_parts[2] == "point-system":
            self.set_lobby_point_system(path_parts[1])
            return

        if len(path_parts) == 3 and path_parts[0] == "lobbies" and path_parts[2] == "custom-settings":
            self.set_lobby_custom_settings(path_parts[1])
            return

        self.send_json(404, {"error": "Not found."})

    def set_lobby_point_system(self, code: str) -> None:
        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        point_system = str(payload.get("pointSystem", ""))

        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                lobby = set_lobby_point_system(
                    connection,
                    code=code,
                    acting_user_id=int(authenticated_user["id"]),
                    point_system=point_system,
                )
            except AuthenticationError as error:
                self.send_json(401, {"code": "not_authenticated", "error": str(error)})
                return
            except LobbyNotFoundError as error:
                self.send_json(404, {"code": "lobby_not_found", "error": str(error)})
                return
            except LobbyPermissionError as error:
                self.send_json(403, {"code": "forbidden", "error": str(error)})
                return
            except InvalidPointSystemError as error:
                self.send_json(400, {"code": "invalid_point_system", "error": str(error)})
                return

        self.send_json(200, {"lobby": self.lobby_payload(lobby)})

    def set_lobby_custom_settings(self, code: str) -> None:
        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        settings = payload.get("settings")

        if not isinstance(settings, dict):
            self.send_json(400, {"code": "invalid_custom_settings", "error": "Custom settings are required."})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                lobby = set_lobby_custom_settings(
                    connection,
                    code=code,
                    acting_user_id=int(authenticated_user["id"]),
                    settings=settings,
                )
            except AuthenticationError as error:
                self.send_json(401, {"code": "not_authenticated", "error": str(error)})
                return
            except LobbyNotFoundError as error:
                self.send_json(404, {"code": "lobby_not_found", "error": str(error)})
                return
            except LobbyPermissionError as error:
                self.send_json(403, {"code": "forbidden", "error": str(error)})
                return

        self.send_json(200, {"lobby": self.lobby_payload(lobby)})

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        path_parts = [part for part in parsed.path.split("/") if part]

        if len(path_parts) == 2 and path_parts[0] == "lobbies":
            self.delete_lobby(path_parts[1])
            return

        if len(path_parts) != 4 or path_parts[0] != "lobbies" or path_parts[2] != "members":
            self.send_json(404, {"error": "Not found."})
            return

        try:
            user_id = int(path_parts[3])
        except ValueError:
            self.send_json(400, {"error": "User id must be a number."})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                authenticated_user_id = int(authenticated_user["id"])

                if authenticated_user_id == user_id:
                    remove_lobby_member(
                        connection,
                        code=path_parts[1],
                        user_id=user_id,
                    )
                else:
                    remove_lobby_member_by_admin(
                        connection,
                        code=path_parts[1],
                        acting_user_id=authenticated_user_id,
                        target_user_id=user_id,
                    )
            except AuthenticationError as error:
                self.send_json(401, {"code": "not_authenticated", "error": str(error)})
                return
            except LobbyNotFoundError as error:
                self.send_json(404, {"code": "lobby_not_found", "error": str(error)})
                return
            except LobbyMemberNotFoundError as error:
                self.send_json(404, {"code": "member_not_found", "error": str(error)})
                return
            except LobbyPermissionError as error:
                self.send_json(403, {"code": "forbidden", "error": str(error)})
                return

        self.send_json(200, {"status": "removed"})

    def delete_lobby(self, code: str) -> None:
        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                delete_lobby(
                    connection,
                    code=code,
                    acting_user_id=int(authenticated_user["id"]),
                )
            except AuthenticationError as error:
                self.send_json(401, {"code": "not_authenticated", "error": str(error)})
                return
            except LobbyNotFoundError as error:
                self.send_json(404, {"code": "lobby_not_found", "error": str(error)})
                return
            except LobbyPermissionError as error:
                self.send_json(403, {"code": "forbidden", "error": str(error)})
                return

        self.send_json(200, {"status": "deleted"})

    def get_authenticated_user(self) -> dict[str, Any]:
        return validate_auth_session(self.headers.get("Cookie", ""))

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
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def lobby_payload(self, lobby: LobbyRecord) -> dict[str, Any]:
        return {
            "code": lobby.code,
            "name": lobby.name,
            "requiresPassword": lobby.requires_password,
            "memberCount": lobby.member_count,
            "pointSystem": lobby.point_system,
            "customSettings": lobby.custom_settings,
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
