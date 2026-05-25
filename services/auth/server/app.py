from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from auth_service.database import (
    DuplicateUserError,
    InvalidCredentialsError,
    InvalidPasswordError,
    SESSION_DAYS,
    authenticate_user,
    connect,
    create_session,
    create_user,
    delete_session,
    get_user_for_session,
    initialize_database,
)
from auth_service.password_policy import evaluate_password

HOST = "127.0.0.1"
PORT = 8001
ALLOWED_ORIGINS = {"http://127.0.0.1:5173", "http://127.0.0.1:5174"}


class AuthRequestHandler(BaseHTTPRequestHandler):
    server_version = "WorldCupAuth/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_json(200, {"status": "ok"})
            return

        if self.path == "/password-policy":
            self.send_json(
                200,
                {
                    "requirements": [
                        {"key": requirement.key, "message": requirement.message}
                        for requirement in evaluate_password("")
                    ]
                },
            )
            return

        if self.path == "/session":
            token = self.get_session_token()

            if not token:
                self.send_json(401, {"error": "Not signed in."})
                return

            with connect() as connection:
                initialize_database(connection)
                user = get_user_for_session(connection, token)

            if user is None:
                self.send_json(401, {"error": "Session expired or invalid."})
                return

            self.send_json(200, {"user": self.user_payload(user)})
            return

        self.send_json(404, {"error": "Not found."})

    def do_POST(self) -> None:
        if self.path == "/sessions":
            self.create_login_session()
            return

        if self.path != "/users":
            self.send_json(404, {"error": "Not found."})
            return

        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        username = str(payload.get("username", ""))
        email = str(payload.get("email", ""))
        display_name = str(payload.get("displayName", ""))
        password = str(payload.get("password", ""))

        if not username.strip() or not email.strip() or not display_name.strip():
            self.send_json(400, {"error": "Username, email, and name are required."})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                user = create_user(
                    connection,
                    username=username,
                    email=email,
                    display_name=display_name,
                    password=password,
                )
            except InvalidPasswordError as error:
                self.send_json(
                    400,
                    {
                        "error": "Password does not meet requirements.",
                        "requirements": error.errors,
                    },
                )
                return
            except DuplicateUserError as error:
                self.send_json(409, {"error": str(error)})
                return

            session = create_session(connection, user)

        self.send_json(
            201,
            {"user": self.user_payload(user)},
            extra_headers=[self.session_cookie_header(session.token)],
        )

    def do_DELETE(self) -> None:
        if self.path != "/session":
            self.send_json(404, {"error": "Not found."})
            return

        token = self.get_session_token()

        if token:
            with connect() as connection:
                initialize_database(connection)
                delete_session(connection, token)

        self.send_json(
            200,
            {"status": "signed_out"},
            extra_headers=[self.clear_session_cookie_header()],
        )

    def create_login_session(self) -> None:
        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        identifier = str(payload.get("identifier", ""))
        password = str(payload.get("password", ""))

        if not identifier.strip() or not password:
            self.send_json(400, {"error": "Username/email and password are required."})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                user = authenticate_user(
                    connection,
                    identifier=identifier,
                    password=password,
                )
            except InvalidCredentialsError as error:
                self.send_json(401, {"error": str(error)})
                return

            session = create_session(connection, user)

        self.send_json(
            201,
            {"user": self.user_payload(user)},
            extra_headers=[self.session_cookie_header(session.token)],
        )

    def read_json_body(self) -> dict[str, Any] | None:
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)

        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            return None

        return payload if isinstance(payload, dict) else None

    def send_json(
        self,
        status: int,
        payload: dict[str, Any],
        extra_headers: list[tuple[str, str]] | None = None,
    ) -> None:
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        for header, value in extra_headers or []:
            self.send_header(header, value)
        self.end_headers()
        self.wfile.write(response)

    def send_cors_headers(self) -> None:
        origin = self.headers.get("Origin")
        allowed_origin = origin if origin in ALLOWED_ORIGINS else "http://127.0.0.1:5174"

        self.send_header("Access-Control-Allow-Origin", allowed_origin)
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def session_cookie_header(self, token: str) -> tuple[str, str]:
        return (
            "Set-Cookie",
            (
                f"worldcup_auth_session={token}; "
                f"Max-Age={SESSION_DAYS * 24 * 60 * 60}; "
                "Path=/; HttpOnly; SameSite=Lax"
            ),
        )

    def clear_session_cookie_header(self) -> tuple[str, str]:
        return (
            "Set-Cookie",
            "worldcup_auth_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
        )

    def get_session_token(self) -> str | None:
        cookie_header = self.headers.get("Cookie", "")

        for cookie in cookie_header.split(";"):
            name, _, value = cookie.strip().partition("=")

            if name == "worldcup_auth_session" and value:
                return value

        return None

    def user_payload(self, user: Any) -> dict[str, Any]:
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "displayName": user.display_name,
        }


def run() -> None:
    with connect() as connection:
        initialize_database(connection)

    server = ThreadingHTTPServer((HOST, PORT), AuthRequestHandler)
    print(f"Auth service listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
