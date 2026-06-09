from __future__ import annotations

import json
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from auth_service.database import (
    DuplicateUserError,
    EmailVerificationRecord,
    InvalidCredentialsError,
    InvalidPasswordError,
    SESSION_DAYS,
    UnverifiedEmailError,
    authenticate_user,
    connect,
    create_email_verification,
    create_session,
    create_user,
    delete_session,
    delete_user,
    get_user_by_email,
    get_user_for_session,
    initialize_database,
    verify_email_token,
)
from auth_service.password_policy import evaluate_password

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = "8001"
DEFAULT_ALLOWED_ORIGINS = ("http://127.0.0.1:5173", "http://127.0.0.1:5174")
DEFAULT_COOKIE_SAMESITE = "Lax"
DEFAULT_AUTH_CLIENT_URL = "http://127.0.0.1:5174/"
VERIFICATION_MINUTES = 5
ROOT_DIR = Path(__file__).resolve().parents[3]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")

        if key and key not in os.environ:
            os.environ[key] = value


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


def get_cookie_domain() -> str | None:
    configured_domain = os.environ.get("AUTH_COOKIE_DOMAIN", "").strip()
    return configured_domain or None


def get_cookie_secure() -> bool:
    configured_secure = os.environ.get("AUTH_COOKIE_SECURE")

    if configured_secure is None:
        return get_cookie_domain() is not None

    return configured_secure.strip().lower() in {"1", "true", "yes", "on"}


def get_cookie_samesite() -> str:
    configured_samesite = os.environ.get("AUTH_COOKIE_SAMESITE", DEFAULT_COOKIE_SAMESITE).strip()

    if configured_samesite in {"Strict", "Lax", "None"}:
        return configured_samesite

    return DEFAULT_COOKIE_SAMESITE


def session_cookie_attributes(*, max_age: int | None) -> str:
    attributes = ["Path=/", "HttpOnly", f"SameSite={get_cookie_samesite()}"]
    cookie_domain = get_cookie_domain()

    if max_age is not None:
        attributes.insert(0, f"Max-Age={max_age}")

    if cookie_domain:
        attributes.append(f"Domain={cookie_domain}")

    if get_cookie_secure():
        attributes.append("Secure")

    return "; ".join(attributes)


def get_auth_client_url() -> str:
    url = os.environ.get("AUTH_CLIENT_URL", DEFAULT_AUTH_CLIENT_URL).strip() or DEFAULT_AUTH_CLIENT_URL
    return url if url.endswith("/") else f"{url}/"


def verification_link(token: str) -> str:
    return f"{get_auth_client_url()}?verify={token}"


class EmailDeliveryError(RuntimeError):
    pass


def resend_error_message(error: HTTPError) -> str:
    try:
        body = error.read().decode("utf-8").strip()
    except OSError:
        body = ""

    request_id = error.headers.get("x-request-id") or error.headers.get("resend-request-id")
    request_id_note = f" Resend request id: {request_id}." if request_id else ""

    if body:
        try:
            details = json.loads(body)
        except json.JSONDecodeError:
            return (
                f"Resend rejected the verification email with status {error.code}: "
                f"{body[:500]}{request_id_note}"
            )

        if isinstance(details, dict):
            message = (
                details.get("message")
                or details.get("error")
                or details.get("name")
                or details.get("type")
            )

            if isinstance(message, str) and message.strip():
                return f"Resend rejected the verification email: {message.strip()}{request_id_note}"

        return (
            f"Resend rejected the verification email with status {error.code}: "
            f"{body[:500]}{request_id_note}"
        )

    return f"Resend rejected the verification email with status {error.code}.{request_id_note}"


def send_verification_email(verification: EmailVerificationRecord) -> bool:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()

    if not api_key:
        return False

    sender = os.environ.get("RESEND_FROM_EMAIL", "World Cup Picks <verify@picks-football.com>").strip()
    link = verification_link(verification.token)
    payload = json.dumps(
        {
            "from": sender,
            "to": [verification.user.email],
            "subject": "Verify your World Cup Picks email",
            "html": (
                "<p>Welcome to World Cup Picks.</p>"
                f"<p>Verify your email within {VERIFICATION_MINUTES} minutes:</p>"
                f'<p><a href="{link}">Verify your email</a></p>'
                "<p>If you did not create this account, you can ignore this email.</p>"
            ),
            "text": (
                "Welcome to World Cup Picks.\n\n"
                f"Verify your email within {VERIFICATION_MINUTES} minutes:\n{link}\n\n"
                "If you did not create this account, you can ignore this email."
            ),
        }
    ).encode("utf-8")
    request = Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "WorldCupPicksAuth/0.1 (+https://picks-football.com)",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10):
            pass
    except HTTPError as error:
        raise EmailDeliveryError(resend_error_message(error)) from error
    except (URLError, OSError) as error:
        raise EmailDeliveryError("Could not send verification email.") from error

    return True


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
                self.send_json(
                    401,
                    {"error": "Session expired or invalid."},
                    extra_headers=[self.clear_session_cookie_header()],
                )
                return

            if not user.email_verified:
                with connect() as connection:
                    initialize_database(connection)
                    delete_session(connection, token)
                self.send_json(
                    401,
                    {"code": "email_not_verified", "error": "Please verify your email before signing in."},
                    extra_headers=[self.clear_session_cookie_header()],
                )
                return

            self.send_json(200, {"user": self.user_payload(user)})
            return

        if self.path.startswith("/email-verifications/"):
            token = self.path.removeprefix("/email-verifications/").strip()
            self.verify_email(token)
            return

        self.send_json(404, {"error": "Not found."})

    def do_POST(self) -> None:
        if self.path == "/sessions":
            self.create_login_session()
            return

        if self.path == "/email-verifications":
            self.resend_verification_email()
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

            verification = create_email_verification(
                connection,
                user,
                minutes_to_live=VERIFICATION_MINUTES,
            )

        try:
            was_email_sent = send_verification_email(verification)
        except EmailDeliveryError as error:
            self.send_json(502, {"error": str(error)})
            return

        self.send_json(
            201,
            {
                "user": self.user_payload(user),
                "verificationRequired": True,
                "emailSent": was_email_sent,
                **(
                    {"devVerificationUrl": verification_link(verification.token)}
                    if not was_email_sent
                    else {}
                ),
            },
            extra_headers=[self.clear_session_cookie_header()],
        )

    def do_DELETE(self) -> None:
        if self.path == "/account":
            self.delete_account()
            return

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

    def delete_account(self) -> None:
        token = self.get_session_token()

        if not token:
            self.send_json(401, {"error": "Not signed in."})
            return

        with connect() as connection:
            initialize_database(connection)
            user = get_user_for_session(connection, token)

            if user is None:
                self.send_json(
                    401,
                    {"error": "Session expired or invalid."},
                    extra_headers=[self.clear_session_cookie_header()],
                )
                return

            delete_user(connection, user.id)

        self.send_json(
            200,
            {"status": "account_deleted"},
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
            except UnverifiedEmailError as error:
                self.send_json(
                    403,
                    {"code": "email_not_verified", "error": str(error), "email": error.email},
                    extra_headers=[self.clear_session_cookie_header()],
                )
                return

            session = create_session(connection, user)

        self.send_json(
            201,
            {"user": self.user_payload(user)},
            extra_headers=[self.session_cookie_header(session.token)],
        )

    def verify_email(self, token: str) -> None:
        if not token:
            self.send_json(400, {"error": "Verification token is required."})
            return

        with connect() as connection:
            initialize_database(connection)
            user = verify_email_token(connection, token)

        if user is None:
            self.send_json(404, {"code": "verification_expired", "error": "Verification link expired or was already used."})
            return

        self.send_json(200, {"status": "verified", "user": self.user_payload(user)})

    def resend_verification_email(self) -> None:
        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        email = str(payload.get("email", "")).strip()

        if not email:
            self.send_json(400, {"error": "Email is required."})
            return

        with connect() as connection:
            initialize_database(connection)
            user = get_user_by_email(connection, email)

            if user is None or user.email_verified:
                self.send_json(200, {"status": "ok"})
                return

            verification = create_email_verification(
                connection,
                user,
                minutes_to_live=VERIFICATION_MINUTES,
            )

        try:
            was_email_sent = send_verification_email(verification)
        except EmailDeliveryError as error:
            self.send_json(502, {"error": str(error)})
            return

        self.send_json(
            200,
            {
                "status": "sent",
                "emailSent": was_email_sent,
                **(
                    {"devVerificationUrl": verification_link(verification.token)}
                    if not was_email_sent
                    else {}
                ),
            },
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
        allowed_origins = get_allowed_origins()
        origin = self.headers.get("Origin")
        normalized_origin = origin.rstrip("/") if origin else None
        allowed_origin = normalized_origin if normalized_origin in allowed_origins else allowed_origins[-1]

        self.send_header("Access-Control-Allow-Origin", allowed_origin)
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def session_cookie_header(self, token: str) -> tuple[str, str]:
        return (
            "Set-Cookie",
            (
                f"worldcup_auth_session={token}; "
                f"{session_cookie_attributes(max_age=SESSION_DAYS * 24 * 60 * 60)}"
            ),
        )

    def clear_session_cookie_header(self) -> tuple[str, str]:
        return (
            "Set-Cookie",
            f"worldcup_auth_session=; {session_cookie_attributes(max_age=0)}",
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
            "emailVerified": user.email_verified,
        }


def run() -> None:
    load_env_file(ROOT_DIR / ".env")

    with connect() as connection:
        initialize_database(connection)

    host = get_host()
    port = get_port()
    server = ThreadingHTTPServer((host, port), AuthRequestHandler)
    print(f"Auth service listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
