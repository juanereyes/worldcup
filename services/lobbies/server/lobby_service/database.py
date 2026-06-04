from __future__ import annotations

import os
import secrets
import sqlite3
from dataclasses import dataclass
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = SERVICE_ROOT / "data" / "lobbies.sqlite3"
LOBBY_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789"
LOBBY_CODE_LENGTH = 4


class LobbyNotFoundError(ValueError):
    pass


class LobbyCodeExhaustedError(RuntimeError):
    pass


class LobbyMemberAlreadyExistsError(ValueError):
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
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
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
    connection.commit()


def generate_lobby_code() -> str:
    return "".join(secrets.choice(LOBBY_CODE_ALPHABET) for _ in range(LOBBY_CODE_LENGTH))


def create_lobby(
    connection: sqlite3.Connection,
    *,
    created_by_user_id: int,
    created_by_username: str,
    name: str = "World Cup Lobby",
    max_attempts: int = 100,
) -> LobbyRecord:
    lobby_name = name.strip() or "World Cup Lobby"
    username = created_by_username.strip()

    if not username:
        raise ValueError("Username is required.")

    for _ in range(max_attempts):
        code = generate_lobby_code()

        try:
            connection.execute(
                """
                INSERT INTO lobbies (code, name, created_by_user_id)
                VALUES (?, ?, ?)
                """,
                (code, lobby_name, created_by_user_id),
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
) -> LobbyRecord:
    normalized_code = code.strip().upper()
    clean_username = username.strip()

    if not clean_username:
        raise ValueError("Username is required.")

    get_lobby(connection, normalized_code)
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

    connection.execute(
        """
        INSERT INTO lobby_members (lobby_code, user_id, username, role)
        VALUES (?, ?, ?, 'member')
        """,
        (normalized_code, user_id, clean_username),
    )
    connection.commit()

    return get_lobby(connection, normalized_code)


def get_lobby(connection: sqlite3.Connection, code: str) -> LobbyRecord:
    normalized_code = code.strip().upper()
    lobby = connection.execute(
        """
        SELECT code, name
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
