from __future__ import annotations

import os
import secrets
import hashlib
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError
from argon2.low_level import Type

from .password_policy import password_errors

SERVICE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = SERVICE_ROOT / "data" / "auth.sqlite3"


class DuplicateUserError(ValueError):
    pass


class InvalidPasswordError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("Password does not meet the required policy.")
        self.errors = errors


class InvalidCredentialsError(ValueError):
    pass


@dataclass(frozen=True)
class UserRecord:
    id: int
    username: str
    email: str
    display_name: str


@dataclass(frozen=True)
class SessionRecord:
    token: str
    expires_at: datetime
    user: UserRecord


password_hasher = PasswordHasher(type=Type.ID)
SESSION_DAYS = 7


def get_database_path() -> Path:
    configured_path = os.environ.get("AUTH_DB_PATH")
    return Path(configured_path) if configured_path else DEFAULT_DB_PATH


def connect(database_path: Path | None = None) -> sqlite3.Connection:
    path = database_path or get_database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE COLLATE NOCASE,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          display_name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    connection.commit()


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def row_to_user(row: sqlite3.Row) -> UserRecord:
    return UserRecord(
        id=int(row["id"]),
        username=str(row["username"]),
        email=str(row["email"]),
        display_name=str(row["display_name"]),
    )


def create_user(
    connection: sqlite3.Connection,
    *,
    username: str,
    email: str,
    display_name: str,
    password: str,
) -> UserRecord:
    username = username.strip()
    email = email.strip()
    display_name = display_name.strip()
    errors = password_errors(password)

    if errors:
        raise InvalidPasswordError(errors)

    existing_user = connection.execute(
        """
        SELECT username, email
        FROM users
        WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
        """,
        (username, email),
    ).fetchone()

    if existing_user:
        if existing_user["username"].lower() == username.lower():
            raise DuplicateUserError("Username is already taken.")
        raise DuplicateUserError("Email is already registered.")

    password_hash = password_hasher.hash(password)

    try:
        cursor = connection.execute(
            """
            INSERT INTO users (username, email, display_name, password_hash)
            VALUES (?, ?, ?, ?)
            """,
            (username, email, display_name, password_hash),
        )
        connection.commit()
    except sqlite3.IntegrityError as error:
        raise DuplicateUserError("Username or email is already registered.") from error

    return UserRecord(
        id=int(cursor.lastrowid),
        username=username,
        email=email,
        display_name=display_name,
    )


def authenticate_user(
    connection: sqlite3.Connection,
    *,
    identifier: str,
    password: str,
) -> UserRecord:
    identifier = identifier.strip()
    row = connection.execute(
        """
        SELECT id, username, email, display_name, password_hash
        FROM users
        WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
        """,
        (identifier, identifier),
    ).fetchone()

    if row is None:
        raise InvalidCredentialsError("Invalid username/email or password.")

    try:
        password_hasher.verify(row["password_hash"], password)
    except (VerificationError, VerifyMismatchError) as error:
        raise InvalidCredentialsError("Invalid username/email or password.") from error

    return row_to_user(row)


def create_session(connection: sqlite3.Connection, user: UserRecord) -> SessionRecord:
    token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)

    connection.execute(
        """
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
        """,
        (user.id, token_hash, expires_at.isoformat()),
    )
    connection.commit()

    return SessionRecord(token=token, expires_at=expires_at, user=user)


def get_user_for_session(connection: sqlite3.Connection, token: str) -> UserRecord | None:
    row = connection.execute(
        """
        SELECT users.id, users.username, users.email, users.display_name
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?
        """,
        (hash_session_token(token), datetime.now(timezone.utc).isoformat()),
    ).fetchone()

    return row_to_user(row) if row else None


def delete_session(connection: sqlite3.Connection, token: str) -> None:
    connection.execute(
        "DELETE FROM sessions WHERE token_hash = ?",
        (hash_session_token(token),),
    )
    connection.commit()


def delete_user(connection: sqlite3.Connection, user_id: int) -> None:
    connection.execute(
        "DELETE FROM users WHERE id = ?",
        (user_id,),
    )
    connection.commit()
