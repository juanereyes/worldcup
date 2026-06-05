from __future__ import annotations

import os
import json
import secrets
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError
from argon2.low_level import Type

from .password_policy import password_errors

SERVICE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = SERVICE_ROOT / "data" / "lobbies.sqlite3"
LOBBY_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789"
LOBBY_CODE_LENGTH = 4
POINT_SYSTEMS = {"simple", "regular", "custom"}
password_hasher = PasswordHasher(type=Type.ID)


class LobbyNotFoundError(ValueError):
    pass


class LobbyCodeExhaustedError(RuntimeError):
    pass


class LobbyMemberAlreadyExistsError(ValueError):
    pass


class LobbyMemberNotFoundError(ValueError):
    pass


class InvalidLobbyPasswordError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("Lobby password does not meet the required policy.")
        self.errors = errors


class LobbyPasswordRequiredError(ValueError):
    pass


class InvalidLobbyPasswordCredentialsError(ValueError):
    pass


class LobbyPermissionError(ValueError):
    pass


class InvalidPointSystemError(ValueError):
    pass


@dataclass(frozen=True)
class LobbyMemberRecord:
    user_id: int
    username: str
    role: str


@dataclass(frozen=True)
class LobbyRecord:
    code: str
    name: str
    requires_password: bool
    member_count: int
    point_system: str | None
    custom_settings: dict[str, Any] | None
    members: list[LobbyMemberRecord]


def get_database_path() -> Path:
    configured_path = os.environ.get("LOBBIES_DB_PATH")
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
        CREATE TABLE IF NOT EXISTS lobbies (
          code TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_by_user_id INTEGER NOT NULL,
          password_hash TEXT,
          member_count INTEGER NOT NULL DEFAULT 0,
          point_system TEXT CHECK (point_system IN ('simple', 'regular', 'custom')),
          custom_settings_json TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    columns = {
        str(row["name"])
        for row in connection.execute("PRAGMA table_info(lobbies)").fetchall()
    }

    if "password_hash" not in columns:
        connection.execute("ALTER TABLE lobbies ADD COLUMN password_hash TEXT")

    if "member_count" not in columns:
        connection.execute("ALTER TABLE lobbies ADD COLUMN member_count INTEGER NOT NULL DEFAULT 0")

    if "point_system" not in columns:
        connection.execute(
            "ALTER TABLE lobbies ADD COLUMN point_system TEXT CHECK (point_system IN ('simple', 'regular', 'custom'))"
        )

    if "custom_settings_json" not in columns:
        connection.execute("ALTER TABLE lobbies ADD COLUMN custom_settings_json TEXT")

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS lobby_members (
          lobby_code TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
          joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (lobby_code, user_id),
          FOREIGN KEY (lobby_code) REFERENCES lobbies(code) ON DELETE CASCADE
        )
        """
    )
    connection.execute(
        """
        UPDATE lobbies
        SET member_count = (
          SELECT COUNT(*)
          FROM lobby_members
          WHERE lobby_members.lobby_code = lobbies.code
        )
        """
    )
    connection.commit()


def generate_lobby_code() -> str:
    return "".join(secrets.choice(LOBBY_CODE_ALPHABET) for _ in range(LOBBY_CODE_LENGTH))


def create_lobby(
    connection: sqlite3.Connection,
    *,
    created_by_user_id: int,
    created_by_username: str,
    name: str = "World Cup Lobby",
    password: str | None = None,
    max_attempts: int = 100,
) -> LobbyRecord:
    lobby_name = name.strip() or "World Cup Lobby"
    username = created_by_username.strip()
    password_hash = None

    if not username:
        raise ValueError("Username is required.")

    if password is not None:
        errors = password_errors(password)

        if errors:
            raise InvalidLobbyPasswordError(errors)

        password_hash = password_hasher.hash(password)

    for _ in range(max_attempts):
        code = generate_lobby_code()

        try:
            connection.execute(
                """
                INSERT INTO lobbies (code, name, created_by_user_id, password_hash, member_count)
                VALUES (?, ?, ?, ?, 1)
                """,
                (code, lobby_name, created_by_user_id, password_hash),
            )
            connection.execute(
                """
                INSERT INTO lobby_members (lobby_code, user_id, username, role)
                VALUES (?, ?, ?, 'admin')
                """,
                (code, created_by_user_id, username),
            )
            connection.commit()
            return get_lobby(connection, code)
        except sqlite3.IntegrityError:
            connection.rollback()

    raise LobbyCodeExhaustedError("Could not generate a unique lobby code.")


def add_lobby_member(
    connection: sqlite3.Connection,
    *,
    code: str,
    user_id: int,
    username: str,
    password: str | None = None,
) -> LobbyRecord:
    normalized_code = code.strip().upper()
    clean_username = username.strip()

    if not clean_username:
        raise ValueError("Username is required.")

    lobby = get_lobby(connection, normalized_code)
    existing_member = connection.execute(
        """
        SELECT user_id
        FROM lobby_members
        WHERE lobby_code = ? AND user_id = ?
        """,
        (normalized_code, user_id),
    ).fetchone()

    if existing_member is not None:
        raise LobbyMemberAlreadyExistsError("User is already in this lobby.")

    if lobby.requires_password:
        row = connection.execute(
            """
            SELECT password_hash
            FROM lobbies
            WHERE code = ?
            """,
            (normalized_code,),
        ).fetchone()
        password_hash = str(row["password_hash"]) if row and row["password_hash"] else ""

        if not password:
            raise LobbyPasswordRequiredError("Lobby password is required.")

        try:
            password_hasher.verify(password_hash, password)
        except (VerificationError, VerifyMismatchError) as error:
            raise InvalidLobbyPasswordCredentialsError("Lobby password is incorrect.") from error

    connection.execute(
        """
        INSERT INTO lobby_members (lobby_code, user_id, username, role)
        VALUES (?, ?, ?, 'member')
        """,
        (normalized_code, user_id, clean_username),
    )
    connection.execute(
        """
        UPDATE lobbies
        SET member_count = member_count + 1
        WHERE code = ?
        """,
        (normalized_code,),
    )
    connection.commit()

    return get_lobby(connection, normalized_code)


def remove_lobby_member(
    connection: sqlite3.Connection,
    *,
    code: str,
    user_id: int,
) -> None:
    normalized_code = code.strip().upper()
    get_lobby(connection, normalized_code)
    cursor = connection.execute(
        """
        DELETE FROM lobby_members
        WHERE lobby_code = ? AND user_id = ?
        """,
        (normalized_code, user_id),
    )

    if cursor.rowcount == 0:
        connection.rollback()
        raise LobbyMemberNotFoundError("User is not in this lobby.")

    remaining_member = connection.execute(
        """
        SELECT user_id
        FROM lobby_members
        WHERE lobby_code = ?
        LIMIT 1
        """,
        (normalized_code,),
    ).fetchone()

    if remaining_member is None:
        connection.execute(
            """
            DELETE FROM lobbies
            WHERE code = ?
            """,
            (normalized_code,),
        )
    else:
        connection.execute(
            """
            UPDATE lobbies
            SET member_count = member_count - 1
            WHERE code = ?
            """,
            (normalized_code,),
        )

    connection.commit()


def remove_lobby_member_by_admin(
    connection: sqlite3.Connection,
    *,
    code: str,
    acting_user_id: int,
    target_user_id: int,
) -> None:
    normalized_code = code.strip().upper()
    lobby = get_lobby(connection, normalized_code)

    if not _is_lobby_admin(connection, normalized_code, acting_user_id):
        raise LobbyPermissionError("Only lobby admins can remove other members.")

    if acting_user_id == target_user_id:
        raise LobbyPermissionError("Admins should leave the lobby instead of kicking themselves.")

    target_member = next((member for member in lobby.members if member.user_id == target_user_id), None)

    if target_member is None:
        raise LobbyMemberNotFoundError("User is not in this lobby.")

    if target_member.role == "admin":
        raise LobbyPermissionError("Admins cannot remove another admin.")

    remove_lobby_member(connection, code=normalized_code, user_id=target_user_id)


def delete_lobby(
    connection: sqlite3.Connection,
    *,
    code: str,
    acting_user_id: int,
) -> None:
    normalized_code = code.strip().upper()
    get_lobby(connection, normalized_code)

    if not _is_lobby_admin(connection, normalized_code, acting_user_id):
        raise LobbyPermissionError("Only lobby admins can delete this lobby.")

    connection.execute(
        """
        DELETE FROM lobbies
        WHERE code = ?
        """,
        (normalized_code,),
    )
    connection.commit()


def set_lobby_point_system(
    connection: sqlite3.Connection,
    *,
    code: str,
    acting_user_id: int,
    point_system: str,
) -> LobbyRecord:
    normalized_code = code.strip().upper()
    normalized_point_system = point_system.strip().lower()
    get_lobby(connection, normalized_code)

    if normalized_point_system not in POINT_SYSTEMS:
        raise InvalidPointSystemError("Point system is not supported.")

    if not _is_lobby_admin(connection, normalized_code, acting_user_id):
        raise LobbyPermissionError("Only lobby admins can choose the point system.")

    connection.execute(
        """
        UPDATE lobbies
        SET point_system = ?
        WHERE code = ?
        """,
        (normalized_point_system, normalized_code),
    )
    connection.commit()

    return get_lobby(connection, normalized_code)


def set_lobby_custom_settings(
    connection: sqlite3.Connection,
    *,
    code: str,
    acting_user_id: int,
    settings: dict[str, Any],
) -> LobbyRecord:
    normalized_code = code.strip().upper()
    get_lobby(connection, normalized_code)

    if not _is_lobby_admin(connection, normalized_code, acting_user_id):
        raise LobbyPermissionError("Only lobby admins can choose custom settings.")

    connection.execute(
        """
        UPDATE lobbies
        SET point_system = 'custom', custom_settings_json = ?
        WHERE code = ?
        """,
        (json.dumps(settings, sort_keys=True), normalized_code),
    )
    connection.commit()

    return get_lobby(connection, normalized_code)


def get_lobby(connection: sqlite3.Connection, code: str) -> LobbyRecord:
    normalized_code = code.strip().upper()
    lobby = connection.execute(
        """
        SELECT code, name, password_hash, member_count, point_system, custom_settings_json
        FROM lobbies
        WHERE code = ?
        """,
        (normalized_code,),
    ).fetchone()

    if lobby is None:
        raise LobbyNotFoundError("Lobby was not found.")

    rows = connection.execute(
        """
        SELECT user_id, username, role
        FROM lobby_members
        WHERE lobby_code = ?
        ORDER BY role = 'admin' DESC, joined_at ASC, username COLLATE NOCASE ASC
        """,
        (normalized_code,),
    ).fetchall()

    return LobbyRecord(
        code=str(lobby["code"]),
        name=str(lobby["name"]),
        requires_password=lobby["password_hash"] is not None,
        member_count=int(lobby["member_count"]),
        point_system=str(lobby["point_system"]) if lobby["point_system"] else None,
        custom_settings=json.loads(str(lobby["custom_settings_json"])) if lobby["custom_settings_json"] else None,
        members=[
            LobbyMemberRecord(
                user_id=int(row["user_id"]),
                username=str(row["username"]),
                role=str(row["role"]),
            )
            for row in rows
        ],
    )


def list_user_lobbies(connection: sqlite3.Connection, user_id: int) -> list[LobbyRecord]:
    rows = connection.execute(
        """
        SELECT lobbies.code
        FROM lobby_members
        JOIN lobbies ON lobbies.code = lobby_members.lobby_code
        WHERE lobby_members.user_id = ?
        ORDER BY lobby_members.joined_at DESC
        """,
        (user_id,),
    ).fetchall()

    return [get_lobby(connection, str(row["code"])) for row in rows]


def _is_lobby_admin(connection: sqlite3.Connection, code: str, user_id: int) -> bool:
    row = connection.execute(
        """
        SELECT role
        FROM lobby_members
        WHERE lobby_code = ? AND user_id = ?
        """,
        (code, user_id),
    ).fetchone()

    return row is not None and str(row["role"]) == "admin"
