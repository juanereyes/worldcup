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


class UnverifiedEmailError(ValueError):
    def __init__(self, email: str) -> None:
        super().__init__("Please verify your email before signing in.")
        self.email = email


@dataclass(frozen=True)
class UserRecord:
    id: int
    username: str
    email: str
    display_name: str
    email_verified: bool


@dataclass(frozen=True)
class EmailVerificationRecord:
    token: str
    expires_at: datetime
    user: UserRecord


@dataclass(frozen=True)
class PasswordResetRecord:
    token: str
    expires_at: datetime
    user: UserRecord


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
          email_verified INTEGER NOT NULL DEFAULT 1,
          email_verified_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    user_columns = {
        str(row["name"])
        for row in connection.execute("PRAGMA table_info(users)").fetchall()
    }

    if "email_verified" not in user_columns:
        connection.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1")

    if "email_verified_at" not in user_columns:
        connection.execute("ALTER TABLE users ADD COLUMN email_verified_at TEXT")

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
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS email_verifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
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
        email_verified=bool(row["email_verified"]),
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
        connection.execute(
            """
            UPDATE users
            SET email_verified = 0, email_verified_at = NULL
            WHERE id = ?
            """,
            (int(cursor.lastrowid),),
        )
        connection.commit()
    except sqlite3.IntegrityError as error:
        raise DuplicateUserError("Username or email is already registered.") from error

    return UserRecord(
        id=int(cursor.lastrowid),
        username=username,
        email=email,
        display_name=display_name,
        email_verified=False,
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
        SELECT id, username, email, display_name, password_hash, email_verified
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

    if not bool(row["email_verified"]):
        raise UnverifiedEmailError(str(row["email"]))

    return row_to_user(row)


def get_user_by_email(connection: sqlite3.Connection, email: str) -> UserRecord | None:
    row = connection.execute(
        """
        SELECT id, username, email, display_name, email_verified
        FROM users
        WHERE email = ? COLLATE NOCASE
        """,
        (email.strip(),),
    ).fetchone()

    return row_to_user(row) if row else None


def get_user_by_identifier(connection: sqlite3.Connection, identifier: str) -> UserRecord | None:
    normalized_identifier = identifier.strip()
    row = connection.execute(
        """
        SELECT id, username, email, display_name, email_verified
        FROM users
        WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
        """,
        (normalized_identifier, normalized_identifier),
    ).fetchone()

    return row_to_user(row) if row else None


def create_email_verification(
    connection: sqlite3.Connection,
    user: UserRecord,
    *,
    minutes_to_live: int = 5,
) -> EmailVerificationRecord:
    token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(token)
    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(minutes=minutes_to_live)

    connection.execute(
        "DELETE FROM email_verifications WHERE user_id = ?",
        (user.id,),
    )
    connection.execute(
        """
        INSERT INTO email_verifications (user_id, token_hash, created_at, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        (user.id, token_hash, created_at.isoformat(), expires_at.isoformat()),
    )
    connection.commit()

    return EmailVerificationRecord(token=token, expires_at=expires_at, user=user)


def create_password_reset(
    connection: sqlite3.Connection,
    user: UserRecord,
    *,
    minutes_to_live: int = 15,
) -> PasswordResetRecord:
    token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(token)
    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(minutes=minutes_to_live)

    connection.execute(
        "DELETE FROM password_resets WHERE user_id = ?",
        (user.id,),
    )
    connection.execute(
        """
        INSERT INTO password_resets (user_id, token_hash, created_at, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        (user.id, token_hash, created_at.isoformat(), expires_at.isoformat()),
    )
    connection.commit()

    return PasswordResetRecord(token=token, expires_at=expires_at, user=user)


def verify_email_token(connection: sqlite3.Connection, token: str) -> UserRecord | None:
    token_hash = hash_session_token(token)
    now = datetime.now(timezone.utc)
    row = connection.execute(
        """
        SELECT
          email_verifications.id AS verification_id,
          email_verifications.expires_at,
          users.id,
          users.username,
          users.email,
          users.display_name,
          users.email_verified
        FROM email_verifications
        JOIN users ON users.id = email_verifications.user_id
        WHERE email_verifications.token_hash = ?
        """,
        (token_hash,),
    ).fetchone()

    if row is None:
        return None

    verification_id = int(row["verification_id"])
    expires_at = datetime.fromisoformat(str(row["expires_at"]))

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now >= expires_at:
        connection.execute(
            "DELETE FROM email_verifications WHERE id = ?",
            (verification_id,),
        )
        connection.commit()
        return None

    connection.execute(
        """
        UPDATE users
        SET email_verified = 1, email_verified_at = ?
        WHERE id = ?
        """,
        (now.isoformat(), int(row["id"])),
    )
    connection.execute(
        "DELETE FROM email_verifications WHERE id = ?",
        (verification_id,),
    )
    connection.commit()

    verified_row = connection.execute(
        """
        SELECT id, username, email, display_name, email_verified
        FROM users
        WHERE id = ?
        """,
        (int(row["id"]),),
    ).fetchone()

    return row_to_user(verified_row) if verified_row else None


def reset_password_with_token(connection: sqlite3.Connection, token: str, password: str) -> UserRecord | None:
    errors = password_errors(password)

    if errors:
        raise InvalidPasswordError(errors)

    token_hash = hash_session_token(token)
    now = datetime.now(timezone.utc)
    row = connection.execute(
        """
        SELECT
          password_resets.id AS reset_id,
          password_resets.expires_at,
          users.id,
          users.username,
          users.email,
          users.display_name,
          users.email_verified
        FROM password_resets
        JOIN users ON users.id = password_resets.user_id
        WHERE password_resets.token_hash = ?
        """,
        (token_hash,),
    ).fetchone()

    if row is None:
        return None

    reset_id = int(row["reset_id"])
    expires_at = datetime.fromisoformat(str(row["expires_at"]))

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now >= expires_at:
        connection.execute(
            "DELETE FROM password_resets WHERE id = ?",
            (reset_id,),
        )
        connection.commit()
        return None

    password_hash = password_hasher.hash(password)
    user_id = int(row["id"])
    connection.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (password_hash, user_id),
    )
    connection.execute(
        "DELETE FROM password_resets WHERE id = ?",
        (reset_id,),
    )
    connection.execute(
        "DELETE FROM sessions WHERE user_id = ?",
        (user_id,),
    )
    connection.commit()

    updated_row = connection.execute(
        """
        SELECT id, username, email, display_name, email_verified
        FROM users
        WHERE id = ?
        """,
        (user_id,),
    ).fetchone()

    return row_to_user(updated_row) if updated_row else None


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
        SELECT users.id, users.username, users.email, users.display_name, users.email_verified
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
