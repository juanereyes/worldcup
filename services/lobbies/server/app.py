from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

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
    MatchPredictionRecord,
    add_lobby_member,
    connect,
    copy_default_predictions_to_lobby,
    create_lobby,
    delete_lobby,
    get_lobby_for_member,
    initialize_database,
    list_default_match_predictions,
    list_lobby_match_predictions,
    list_match_predictions,
    list_user_lobbies,
    remove_lobby_member,
    remove_lobby_member_by_admin,
    save_default_match_prediction,
    save_match_prediction,
    set_lobby_custom_settings,
    set_lobby_point_system,
)
from lobby_service.scoring import (
    ScorePrediction,
    score_regular_match_prediction,
    score_simple_match_prediction,
)

HOST = "127.0.0.1"
PORT = 8003
ALLOWED_ORIGINS = {"http://127.0.0.1:5173"}
AUTH_SESSION_URL = os.environ.get("AUTH_SESSION_URL", "http://127.0.0.1:8001/session")
MATCHES_URL = os.environ.get("MATCHES_URL", "http://127.0.0.1:8002/matches")
BOGOTA_TZ = ZoneInfo("America/Bogota")


@dataclass(frozen=True)
class FinishedMatch:
    id: int
    stage: str
    group: str | None
    date: str
    home_score: int
    away_score: int


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


def fetch_finished_matches() -> dict[int, FinishedMatch]:
    request = Request(MATCHES_URL, headers={"Accept": "application/json"}, method="GET")

    try:
        with urlopen(request, timeout=4) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, OSError, URLError, json.JSONDecodeError) as error:
        raise RuntimeError("Could not load match results for the scoreboard.") from error

    raw_matches = payload.get("matches") if isinstance(payload, dict) else None

    if not isinstance(raw_matches, list):
        raise RuntimeError("Match results payload is invalid.")

    finished_matches: dict[int, FinishedMatch] = {}

    for raw_match in raw_matches:
        if not isinstance(raw_match, dict) or raw_match.get("status") != "FINISHED":
            continue

        raw_score = raw_match.get("score") if isinstance(raw_match.get("score"), dict) else {}
        home_score = raw_score.get("home")
        away_score = raw_score.get("away")

        if not isinstance(home_score, int) or not isinstance(away_score, int):
            continue

        try:
            match_id = int(raw_match.get("id"))
        except (TypeError, ValueError):
            continue

        finished_matches[match_id] = FinishedMatch(
            id=match_id,
            stage=str(raw_match.get("stage", "")),
            group=raw_match.get("group") if isinstance(raw_match.get("group"), str) else None,
            date=match_bogota_date(str(raw_match.get("utcDate", ""))),
            home_score=home_score,
            away_score=away_score,
        )

    return finished_matches


def match_bogota_date(utc_date: str) -> str:
    try:
        parsed = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
    except ValueError:
        return ""

    return parsed.astimezone(BOGOTA_TZ).date().isoformat()


def build_scoreboard_payload(lobby: LobbyRecord, predictions: list[Any], matches: dict[int, FinishedMatch]) -> dict[str, Any]:
    today = datetime.now(BOGOTA_TZ).date().isoformat()
    rows = {
        member.user_id: {
            "userId": member.user_id,
            "username": member.username,
            "totalPoints": 0,
            "groupStagePoints": 0,
            "knockoutStagePoints": 0,
            "dailyPoints": 0,
        }
        for member in lobby.members
    }

    for prediction in predictions:
        match = matches.get(prediction.match_id)

        if (
            match is None
            or prediction.home_score is None
            or prediction.away_score is None
        ):
            continue

        points = score_lobby_match_prediction(
            lobby,
            ScorePrediction(home=prediction.home_score, away=prediction.away_score),
            ScorePrediction(home=match.home_score, away=match.away_score),
        )
        row = rows.get(prediction.user_id)

        if row is None:
            continue

        row["totalPoints"] += points

        if is_group_stage_match(match):
            row["groupStagePoints"] += points
        else:
            row["knockoutStagePoints"] += points

        if match.date == today:
            row["dailyPoints"] += points

    return {
        "scoreboard": {
            "date": today,
            "general": sort_scoreboard_rows(rows.values(), "totalPoints"),
            "groupStage": sort_scoreboard_rows(rows.values(), "groupStagePoints"),
            "knockoutStage": sort_scoreboard_rows(rows.values(), "knockoutStagePoints"),
        }
    }


def score_lobby_match_prediction(lobby: LobbyRecord, prediction: ScorePrediction, actual: ScorePrediction) -> int:
    if lobby.point_system == "regular":
        return score_regular_match_prediction(prediction, actual)

    if lobby.point_system == "custom":
        return score_custom_match_prediction(lobby.custom_settings or {}, prediction, actual)

    return score_simple_match_prediction(prediction, actual)


def score_custom_match_prediction(settings: dict[str, Any], prediction: ScorePrediction, actual: ScorePrediction) -> int:
    values = settings.get("values") if isinstance(settings.get("values"), dict) else {}
    enabled = settings.get("enabledFields") if isinstance(settings.get("enabledFields"), dict) else {}

    def points(field: str) -> int:
        try:
            return max(0, int(values.get(field, 0)))
        except (TypeError, ValueError):
            return 0

    def is_enabled(field: str) -> bool:
        return bool(enabled.get(field))

    if prediction == actual and is_enabled("exactScore"):
        return points("exactScore")

    prediction_result = match_result(prediction)
    actual_result = match_result(actual)

    if prediction_result == actual_result:
        if (
            actual_result != "draw"
            and abs(prediction.home - prediction.away) == abs(actual.home - actual.away)
            and is_enabled("resultGoalDifference")
        ):
            return points("resultGoalDifference")

        if is_enabled("correctResult"):
            return points("correctResult")

    if prediction_result != actual_result:
        home_points = points("homeGoal") if prediction.home == actual.home and is_enabled("homeGoal") else 0
        away_points = points("awayGoal") if prediction.away == actual.away and is_enabled("awayGoal") else 0
        return max(home_points, away_points)

    return 0


def match_result(score: ScorePrediction) -> str:
    if score.home > score.away:
        return "home"

    if score.away > score.home:
        return "away"

    return "draw"


def is_group_stage_match(match: FinishedMatch) -> bool:
    return match.group is not None or match.stage == "Group Stage"


def sort_scoreboard_rows(rows: Any, points_key: str) -> list[dict[str, Any]]:
    return [
        row
        for row in sorted(
            rows,
            key=lambda row: (-int(row[points_key]), str(row["username"]).casefold()),
        )
    ]


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
                    authenticated_user = self.get_authenticated_user()
                    lobby = get_lobby_for_member(
                        connection,
                        code=path_parts[1],
                        user_id=int(authenticated_user["id"]),
                    )
                except AuthenticationError as error:
                    self.send_json(401, {"code": "not_authenticated", "error": str(error)})
                    return
                except LobbyNotFoundError as error:
                    self.send_json(404, {"error": str(error)})
                    return
                except LobbyPermissionError as error:
                    self.send_json(403, {"code": "forbidden", "error": str(error)})
                    return

            self.send_json(200, {"lobby": self.lobby_payload(lobby)})
            return

        if len(path_parts) == 3 and path_parts[0] == "lobbies" and path_parts[2] == "predictions":
            self.list_lobby_predictions(path_parts[1])
            return

        if len(path_parts) == 3 and path_parts[0] == "lobbies" and path_parts[2] == "scoreboard":
            self.get_lobby_scoreboard(path_parts[1])
            return

        if len(path_parts) == 2 and path_parts[0] == "predictions" and path_parts[1] == "default":
            self.list_default_predictions()
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
        raw_point_system = payload.get("pointSystem")
        point_system = raw_point_system if isinstance(raw_point_system, str) and raw_point_system else None
        raw_custom_settings = payload.get("customSettings")
        custom_settings = raw_custom_settings if isinstance(raw_custom_settings, dict) else None

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
                    point_system=point_system,
                    custom_settings=custom_settings,
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
            except InvalidPointSystemError as error:
                self.send_json(400, {"code": "invalid_point_system", "error": str(error)})
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

        if len(path_parts) == 4 and path_parts[0] == "lobbies" and path_parts[2] == "predictions":
            self.save_lobby_prediction(path_parts[1], path_parts[3])
            return

        if len(path_parts) == 3 and path_parts[0] == "predictions" and path_parts[1] == "default":
            self.save_default_prediction(path_parts[2])
            return

        if len(path_parts) == 4 and path_parts[0] == "lobbies" and path_parts[2] == "predictions-copy":
            self.copy_default_predictions(path_parts[1], path_parts[3])
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

    def list_lobby_predictions(self, code: str) -> None:
        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                predictions = list_match_predictions(
                    connection,
                    code=code,
                    user_id=int(authenticated_user["id"]),
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

        self.send_json(200, {"predictions": [self.match_prediction_payload(prediction) for prediction in predictions]})

    def get_lobby_scoreboard(self, code: str) -> None:
        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                lobby = get_lobby_for_member(
                    connection,
                    code=code,
                    user_id=int(authenticated_user["id"]),
                )
                predictions = list_lobby_match_predictions(
                    connection,
                    code=code,
                    requesting_user_id=int(authenticated_user["id"]),
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

        try:
            matches = fetch_finished_matches()
        except RuntimeError as error:
            self.send_json(502, {"error": str(error)})
            return

        self.send_json(200, build_scoreboard_payload(lobby, predictions, matches))

    def list_default_predictions(self) -> None:
        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                predictions = list_default_match_predictions(connection, user_id=int(authenticated_user["id"]))
            except AuthenticationError as error:
                self.send_json(401, {"code": "not_authenticated", "error": str(error)})
                return

        self.send_json(200, {"predictions": [self.match_prediction_payload(prediction) for prediction in predictions]})

    def save_lobby_prediction(self, code: str, match_id_text: str) -> None:
        try:
            match_id = int(match_id_text)
        except ValueError:
            self.send_json(400, {"error": "Match id must be a number."})
            return

        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        try:
            home_score = self.optional_non_negative_int(payload.get("homeScore"))
            away_score = self.optional_non_negative_int(payload.get("awayScore"))
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                prediction = save_match_prediction(
                    connection,
                    code=code,
                    user_id=int(authenticated_user["id"]),
                    match_id=match_id,
                    home_score=home_score,
                    away_score=away_score,
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
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
                return

        self.send_json(200, {"prediction": self.match_prediction_payload(prediction)})

    def save_default_prediction(self, match_id_text: str) -> None:
        try:
            match_id = int(match_id_text)
        except ValueError:
            self.send_json(400, {"error": "Match id must be a number."})
            return

        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        try:
            home_score = self.optional_non_negative_int(payload.get("homeScore"))
            away_score = self.optional_non_negative_int(payload.get("awayScore"))
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                prediction = save_default_match_prediction(
                    connection,
                    user_id=int(authenticated_user["id"]),
                    match_id=match_id,
                    home_score=home_score,
                    away_score=away_score,
                )
            except AuthenticationError as error:
                self.send_json(401, {"code": "not_authenticated", "error": str(error)})
                return
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
                return

        self.send_json(200, {"prediction": self.match_prediction_payload(prediction)})

    def copy_default_predictions(self, code: str, scope: str) -> None:
        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        match_ids: list[int] | None = None

        if scope == "phase":
            raw_match_ids = payload.get("matchIds")

            if not isinstance(raw_match_ids, list):
                self.send_json(400, {"error": "Match ids are required for phase copy."})
                return

            try:
                match_ids = [int(match_id) for match_id in raw_match_ids]
            except (TypeError, ValueError):
                self.send_json(400, {"error": "Match ids must be numbers."})
                return
        elif scope != "all":
            self.send_json(400, {"error": "Copy scope must be all or phase."})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                predictions = copy_default_predictions_to_lobby(
                    connection,
                    code=code,
                    user_id=int(authenticated_user["id"]),
                    match_ids=match_ids,
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

        self.send_json(200, {"predictions": [self.match_prediction_payload(prediction) for prediction in predictions]})

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

    def optional_non_negative_int(self, value: Any) -> int | None:
        if value is None or value == "":
            return None

        try:
            parsed = int(value)
        except (TypeError, ValueError) as error:
            raise ValueError("Score must be a non-negative number.") from error

        if parsed < 0:
            raise ValueError("Score must be a non-negative number.")

        return parsed

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

    def match_prediction_payload(self, prediction: MatchPredictionRecord) -> dict[str, Any]:
        return {
            "matchId": prediction.match_id,
            "homeScore": prediction.home_score,
            "awayScore": prediction.away_score,
        }


def run() -> None:
    with connect() as connection:
        initialize_database(connection)

    server = ThreadingHTTPServer((HOST, PORT), LobbyRequestHandler)
    print(f"Lobby service listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
