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


@dataclass(frozen=True)
class MatchPredictionRecord:
    match_id: int
    home_score: int | None
    away_score: int | None


@dataclass(frozen=True)
class MemberMatchPredictionRecord:
    user_id: int
    username: str
    match_id: int
    home_score: int | None
    away_score: int | None


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
        CREATE TABLE IF NOT EXISTS match_predictions (
          lobby_code TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          match_id INTEGER NOT NULL,
          home_score INTEGER CHECK (home_score IS NULL OR home_score >= 0),
          away_score INTEGER CHECK (away_score IS NULL OR away_score >= 0),
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (lobby_code, user_id, match_id),
          FOREIGN KEY (lobby_code, user_id) REFERENCES lobby_members(lobby_code, user_id) ON DELETE CASCADE
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS default_match_predictions (
          user_id INTEGER NOT NULL,
          match_id INTEGER NOT NULL,
          home_score INTEGER CHECK (home_score IS NULL OR home_score >= 0),
          away_score INTEGER CHECK (away_score IS NULL OR away_score >= 0),
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, match_id)
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
    point_system: str | None = None,
    custom_settings: dict[str, Any] | None = None,
    max_attempts: int = 100,
) -> LobbyRecord:
    lobby_name = name.strip() or "World Cup Lobby"
    username = created_by_username.strip()
    password_hash = None
    normalized_point_system = point_system.strip().lower() if point_system else None

    if not username:
        raise ValueError("Username is required.")

    if normalized_point_system is not None and normalized_point_system not in POINT_SYSTEMS:
        raise InvalidPointSystemError("Point system is not supported.")

    if custom_settings is not None and normalized_point_system != "custom":
        raise InvalidPointSystemError("Custom settings require the custom point system.")

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
                INSERT INTO lobbies (
                  code,
                  name,
                  created_by_user_id,
                  password_hash,
                  member_count,
                  point_system,
                  custom_settings_json
                )
                VALUES (?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    code,
                    lobby_name,
                    created_by_user_id,
                    password_hash,
                    normalized_point_system,
                    json.dumps(custom_settings, sort_keys=True) if custom_settings is not None else None,
                ),
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


def get_lobby_for_member(connection: sqlite3.Connection, *, code: str, user_id: int) -> LobbyRecord:
    normalized_code = code.strip().upper()
    lobby = get_lobby(connection, normalized_code)

    if not _is_lobby_member(connection, normalized_code, user_id):
        raise LobbyPermissionError("Only lobby members can view this lobby.")

    return lobby


def list_match_predictions(
    connection: sqlite3.Connection,
    *,
    code: str,
    user_id: int,
) -> list[MatchPredictionRecord]:
    normalized_code = code.strip().upper()
    get_lobby(connection, normalized_code)

    if not _is_lobby_member(connection, normalized_code, user_id):
        raise LobbyPermissionError("Only lobby members can view predictions.")

    rows = connection.execute(
        """
        SELECT match_id, home_score, away_score
        FROM match_predictions
        WHERE lobby_code = ? AND user_id = ?
        ORDER BY match_id ASC
        """,
        (normalized_code, user_id),
    ).fetchall()

    return [
        MatchPredictionRecord(
            match_id=int(row["match_id"]),
            home_score=int(row["home_score"]) if row["home_score"] is not None else None,
            away_score=int(row["away_score"]) if row["away_score"] is not None else None,
        )
        for row in rows
    ]


def list_lobby_match_predictions(
    connection: sqlite3.Connection,
    *,
    code: str,
    requesting_user_id: int,
) -> list[MemberMatchPredictionRecord]:
    normalized_code = code.strip().upper()
    get_lobby(connection, normalized_code)

    if not _is_lobby_member(connection, normalized_code, requesting_user_id):
        raise LobbyPermissionError("Only lobby members can view the scoreboard.")

    rows = connection.execute(
        """
        SELECT
          match_predictions.user_id,
          lobby_members.username,
          match_predictions.match_id,
          match_predictions.home_score,
          match_predictions.away_score
        FROM match_predictions
        JOIN lobby_members
          ON lobby_members.lobby_code = match_predictions.lobby_code
         AND lobby_members.user_id = match_predictions.user_id
        WHERE match_predictions.lobby_code = ?
        ORDER BY lobby_members.username COLLATE NOCASE ASC, match_predictions.match_id ASC
        """,
        (normalized_code,),
    ).fetchall()

    return [
        MemberMatchPredictionRecord(
            user_id=int(row["user_id"]),
            username=str(row["username"]),
            match_id=int(row["match_id"]),
            home_score=int(row["home_score"]) if row["home_score"] is not None else None,
            away_score=int(row["away_score"]) if row["away_score"] is not None else None,
        )
        for row in rows
    ]


def list_default_match_predictions(connection: sqlite3.Connection, *, user_id: int) -> list[MatchPredictionRecord]:
    rows = connection.execute(
        """
        SELECT match_id, home_score, away_score
        FROM default_match_predictions
        WHERE user_id = ?
        ORDER BY match_id ASC
        """,
        (user_id,),
    ).fetchall()

    return [
        MatchPredictionRecord(
            match_id=int(row["match_id"]),
            home_score=int(row["home_score"]) if row["home_score"] is not None else None,
            away_score=int(row["away_score"]) if row["away_score"] is not None else None,
        )
        for row in rows
    ]


def save_match_prediction(
    connection: sqlite3.Connection,
    *,
    code: str,
    user_id: int,
    match_id: int,
    home_score: int | None,
    away_score: int | None,
) -> MatchPredictionRecord:
    normalized_code = code.strip().upper()
    get_lobby(connection, normalized_code)

    if match_id <= 0:
        raise ValueError("Match id must be positive.")

    if home_score is not None and home_score < 0:
        raise ValueError("Home score must be non-negative.")

    if away_score is not None and away_score < 0:
        raise ValueError("Away score must be non-negative.")

    if not _is_lobby_member(connection, normalized_code, user_id):
        raise LobbyPermissionError("Only lobby members can save predictions.")

    connection.execute(
        """
        INSERT INTO match_predictions (lobby_code, user_id, match_id, home_score, away_score, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(lobby_code, user_id, match_id)
        DO UPDATE SET
          home_score = excluded.home_score,
          away_score = excluded.away_score,
          updated_at = CURRENT_TIMESTAMP
        """,
        (normalized_code, user_id, match_id, home_score, away_score),
    )
    connection.commit()

    return MatchPredictionRecord(match_id=match_id, home_score=home_score, away_score=away_score)


def save_default_match_prediction(
    connection: sqlite3.Connection,
    *,
    user_id: int,
    match_id: int,
    home_score: int | None,
    away_score: int | None,
) -> MatchPredictionRecord:
    if match_id <= 0:
        raise ValueError("Match id must be positive.")

    if home_score is not None and home_score < 0:
        raise ValueError("Home score must be non-negative.")

    if away_score is not None and away_score < 0:
        raise ValueError("Away score must be non-negative.")

    connection.execute(
        """
        INSERT INTO default_match_predictions (user_id, match_id, home_score, away_score, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, match_id)
        DO UPDATE SET
          home_score = excluded.home_score,
          away_score = excluded.away_score,
          updated_at = CURRENT_TIMESTAMP
        """,
        (user_id, match_id, home_score, away_score),
    )
    connection.commit()

    return MatchPredictionRecord(match_id=match_id, home_score=home_score, away_score=away_score)


def copy_default_predictions_to_lobby(
    connection: sqlite3.Connection,
    *,
    code: str,
    user_id: int,
    match_ids: list[int] | None = None,
) -> list[MatchPredictionRecord]:
    normalized_code = code.strip().upper()
    get_lobby(connection, normalized_code)

    if not _is_lobby_member(connection, normalized_code, user_id):
        raise LobbyPermissionError("Only lobby members can save predictions.")

    if match_ids is not None:
        clean_match_ids = [match_id for match_id in match_ids if match_id > 0]

        if not clean_match_ids:
            return []

        placeholders = ",".join("?" for _ in clean_match_ids)
        rows = connection.execute(
            f"""
            SELECT match_id, home_score, away_score
            FROM default_match_predictions
            WHERE user_id = ? AND match_id IN ({placeholders})
            ORDER BY match_id ASC
            """,
            (user_id, *clean_match_ids),
        ).fetchall()
    else:
        rows = connection.execute(
            """
            SELECT match_id, home_score, away_score
            FROM default_match_predictions
            WHERE user_id = ?
            ORDER BY match_id ASC
            """,
            (user_id,),
        ).fetchall()

    predictions = [
        MatchPredictionRecord(
            match_id=int(row["match_id"]),
            home_score=int(row["home_score"]) if row["home_score"] is not None else None,
            away_score=int(row["away_score"]) if row["away_score"] is not None else None,
        )
        for row in rows
    ]

    for prediction in predictions:
        connection.execute(
            """
            INSERT INTO match_predictions (lobby_code, user_id, match_id, home_score, away_score, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(lobby_code, user_id, match_id)
            DO UPDATE SET
              home_score = excluded.home_score,
              away_score = excluded.away_score,
              updated_at = CURRENT_TIMESTAMP
            """,
            (normalized_code, user_id, prediction.match_id, prediction.home_score, prediction.away_score),
        )

    connection.commit()

    return predictions


def _is_lobby_member(connection: sqlite3.Connection, code: str, user_id: int) -> bool:
    row = connection.execute(
        """
        SELECT user_id
        FROM lobby_members
        WHERE lobby_code = ? AND user_id = ?
        """,
        (code, user_id),
    ).fetchone()

    return row is not None


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
