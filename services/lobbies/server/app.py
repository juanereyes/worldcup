from __future__ import annotations

import json
import os
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
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
    list_lobby_member_default_match_predictions,
    list_lobby_match_predictions,
    list_lobby_special_predictions,
    list_match_predictions,
    list_user_lobbies,
    remove_lobby_member,
    remove_lobby_member_by_admin,
    remove_user_from_all_lobbies,
    save_default_match_prediction,
    save_match_prediction,
    save_special_prediction,
    set_lobby_custom_settings,
    set_lobby_point_system,
)
from lobby_service.scoring import (
    REGULAR_GLOBAL_POINTS,
    SIMPLE_GLOBAL_POINTS,
    ScorePrediction,
    score_regular_match_prediction,
    score_simple_match_prediction,
)

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = "8003"
DEFAULT_ALLOWED_ORIGINS = ("http://127.0.0.1:5173",)


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

AUTH_SESSION_URL = os.environ.get("AUTH_SESSION_URL", "http://127.0.0.1:8001/session")
MATCHES_URL = os.environ.get("MATCHES_URL", "http://127.0.0.1:8002/matches")
BOGOTA_TZ = ZoneInfo("America/Bogota")
PLAYER_STATS_PATH = os.environ.get(
    "PLAYER_STATS_PATH",
    str(os.path.join(os.path.dirname(__file__), "..", "..", "..", "src", "playerGuideData.json")),
)
COUNTRY_RESULTS_PATH = os.environ.get(
    "COUNTRY_RESULTS_PATH",
    str(os.path.join(os.path.dirname(__file__), "..", "..", "..", "src", "countryResults.json")),
)
GLOBAL_PLACEMENT_TYPES = {"champion", "runnerUp", "thirdPlace", "fourthPlace"}
PLAYER_PREDICTION_TYPES = {"topScorer", "goldenBall", "favoritePlayer"}
SPECIAL_PREDICTION_TYPES = GLOBAL_PLACEMENT_TYPES | PLAYER_PREDICTION_TYPES | {"chooseTeam", "trackTeam", "bracketHeavy"}


@dataclass(frozen=True)
class FinishedMatch:
    id: int
    stage: str
    group: str | None
    date: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int


@dataclass(frozen=True)
class MatchSchedule:
    id: int
    stage: str
    group: str | None
    utc_date: datetime
    status: str


@dataclass(frozen=True)
class PlayerStat:
    country: str
    name: str
    number: int
    goals: int
    assists: int
    is_top_scorer: bool
    is_golden_ball: bool


class AuthenticationError(ValueError):
    pass


class PredictionWindowError(ValueError):
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


def fetch_all_match_payloads() -> list[dict[str, Any]]:
    request = Request(MATCHES_URL, headers={"Accept": "application/json"}, method="GET")

    try:
        with urlopen(request, timeout=4) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, OSError, URLError, json.JSONDecodeError) as error:
        raise RuntimeError("Could not load World Cup matches.") from error

    raw_matches = payload.get("matches") if isinstance(payload, dict) else None

    if not isinstance(raw_matches, list):
        raise RuntimeError("Match payload is invalid.")

    return [match for match in raw_matches if isinstance(match, dict)]


def fetch_match_schedule() -> dict[int, MatchSchedule]:
    schedule: dict[int, MatchSchedule] = {}

    for raw_match in fetch_all_match_payloads():
        try:
            match_id = int(raw_match.get("id"))
            utc_date = parse_utc_datetime(str(raw_match.get("utcDate", "")))
        except (TypeError, ValueError):
            continue

        schedule[match_id] = MatchSchedule(
            id=match_id,
            stage=str(raw_match.get("stage", "")),
            group=raw_match.get("group") if isinstance(raw_match.get("group"), str) else None,
            utc_date=utc_date,
            status=str(raw_match.get("status", "")),
        )

    return schedule


def fetch_finished_matches() -> dict[int, FinishedMatch]:
    raw_matches = fetch_all_match_payloads()

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
            home_team=str(raw_match.get("homeTeam", "")),
            away_team=str(raw_match.get("awayTeam", "")),
            home_score=home_score,
            away_score=away_score,
        )

    return finished_matches


def parse_utc_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def match_bogota_date(utc_date: str) -> str:
    try:
        parsed = parse_utc_datetime(utc_date)
    except ValueError:
        return ""

    return parsed.astimezone(BOGOTA_TZ).date().isoformat()


def current_utc_datetime() -> datetime:
    return datetime.now(timezone.utc)


def parse_database_timestamp(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        parsed = datetime.strptime(value, "%Y-%m-%d %H:%M:%S")

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def current_member_joined_at(lobby: LobbyRecord, user_id: int) -> datetime | None:
    member = next((member for member in lobby.members if member.user_id == user_id), None)

    if member is None or not member.joined_at:
        return None

    try:
        return parse_database_timestamp(member.joined_at)
    except ValueError:
        return None


def first_match_start(schedule: dict[int, MatchSchedule]) -> datetime | None:
    dates = [match.utc_date for match in schedule.values()]
    return min(dates) if dates else None


def global_prediction_closes_at(
    lobby: LobbyRecord,
    user_id: int,
    schedule: dict[int, MatchSchedule],
) -> datetime | None:
    first_start = first_match_start(schedule)
    joined_at = current_member_joined_at(lobby, user_id)

    if first_start is None and joined_at is None:
        return None

    joined_deadline = joined_at + timedelta(hours=24) if joined_at else None
    deadlines = [deadline for deadline in [first_start, joined_deadline] if deadline is not None]

    return max(deadlines) if deadlines else None


def ensure_match_prediction_open(match_id: int, schedule: dict[int, MatchSchedule]) -> None:
    match = schedule.get(match_id)

    if match is None:
        raise PredictionWindowError("Match schedule is not available.")

    if current_utc_datetime() >= match.utc_date:
        raise PredictionWindowError("Match predictions are closed for this match.")


def ensure_global_prediction_open(lobby: LobbyRecord, user_id: int, schedule: dict[int, MatchSchedule]) -> None:
    closes_at = global_prediction_closes_at(lobby, user_id, schedule)

    if closes_at is None:
        raise PredictionWindowError("Prediction window is not available yet.")

    if current_utc_datetime() >= closes_at:
        raise PredictionWindowError("This prediction window is already closed.")


def bracket_heavy_window_state(schedule: dict[int, MatchSchedule]) -> str:
    group_matches = [match for match in schedule.values() if is_group_stage_schedule(match)]
    knockout_matches = [match for match in schedule.values() if not is_group_stage_schedule(match)]

    if not group_matches or not knockout_matches:
        return "awaiting"

    first_knockout_start = min(match.utc_date for match in knockout_matches)

    if current_utc_datetime() >= first_knockout_start:
        return "closed"

    if all(match.status == "FINISHED" for match in group_matches):
        return "open"

    return "awaiting"


def ensure_bracket_heavy_prediction_open(schedule: dict[int, MatchSchedule]) -> None:
    state = bracket_heavy_window_state(schedule)

    if state == "open":
        return

    if state == "awaiting":
        raise PredictionWindowError("Bracket predictions are not open yet.")

    raise PredictionWindowError("Bracket predictions are already closed.")


def is_complete_prediction(prediction: Any) -> bool:
    return prediction.home_score is not None and prediction.away_score is not None


def apply_default_predictions_for_finished_matches(
    predictions: list[Any],
    default_predictions: list[Any],
    matches: dict[int, FinishedMatch],
) -> list[Any]:
    merged = {
        (prediction.user_id, prediction.match_id): prediction
        for prediction in predictions
    }

    for default_prediction in default_predictions:
        if default_prediction.match_id not in matches or not is_complete_prediction(default_prediction):
            continue

        key = (default_prediction.user_id, default_prediction.match_id)
        lobby_prediction = merged.get(key)

        if lobby_prediction is None or not is_complete_prediction(lobby_prediction):
            merged[key] = default_prediction

    return list(merged.values())


def build_scoreboard_payload(
    lobby: LobbyRecord,
    predictions: list[Any],
    matches: dict[int, FinishedMatch],
    special_predictions: list[Any] | None = None,
    default_predictions: list[Any] | None = None,
) -> dict[str, Any]:
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
    special_by_user = special_predictions_by_user(special_predictions or [])
    scoring_predictions = apply_default_predictions_for_finished_matches(
        predictions,
        default_predictions or [],
        matches,
    )

    for prediction in scoring_predictions:
        match = matches.get(prediction.match_id)

        if (
            match is None
            or prediction.home_score is None
            or prediction.away_score is None
        ):
            continue

        points = score_lobby_match_prediction(
            lobby,
            prediction.user_id,
            ScorePrediction(home=prediction.home_score, away=prediction.away_score),
            ScorePrediction(home=match.home_score, away=match.away_score),
            match,
            special_by_user,
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

    for user_id, points in score_special_predictions(lobby, special_by_user, matches).items():
        row = rows.get(user_id)

        if row is None:
            continue

        row["totalPoints"] += points["total"]
        row["knockoutStagePoints"] += points["knockoutStage"]

    return {
        "scoreboard": {
            "date": today,
            "general": sort_scoreboard_rows(rows.values(), "totalPoints"),
            "groupStage": sort_scoreboard_rows(rows.values(), "groupStagePoints"),
            "knockoutStage": sort_scoreboard_rows(rows.values(), "knockoutStagePoints"),
        }
    }


def score_lobby_match_prediction(
    lobby: LobbyRecord,
    user_id: int,
    prediction: ScorePrediction,
    actual: ScorePrediction,
    match: FinishedMatch,
    special_by_user: dict[int, dict[str, Any]],
) -> int:
    if lobby.point_system == "regular":
        points = score_regular_match_prediction(prediction, actual)
    elif lobby.point_system == "custom":
        points = score_custom_match_prediction(lobby.custom_settings or {}, prediction, actual)
    else:
        points = score_simple_match_prediction(prediction, actual)

    multiplier = 2 if not is_group_stage_match(match) else 1

    if (
        lobby.point_system == "custom"
        and is_custom_feature_enabled(lobby, "chooseTeam")
        and normalized_team(special_by_user.get(user_id, {}).get("chooseTeam", {}).get("teamName"))
        in {normalized_team(match.home_team), normalized_team(match.away_team)}
    ):
        multiplier *= 2

    return points * multiplier


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


def special_predictions_by_user(predictions: list[Any]) -> dict[int, dict[str, Any]]:
    grouped: dict[int, dict[str, Any]] = {}

    for prediction in predictions:
        user_predictions = grouped.setdefault(prediction.user_id, {})
        payload: dict[str, Any] = {}

        if prediction.team_name:
            payload["teamName"] = prediction.team_name

        if prediction.player_country:
            payload["playerCountry"] = prediction.player_country

        if prediction.player_name:
            payload["playerName"] = prediction.player_name

        if prediction.player_number is not None:
            payload["playerNumber"] = prediction.player_number

        if prediction.selections is not None:
            payload["selections"] = prediction.selections

        user_predictions[prediction.prediction_type] = payload

    return grouped


def score_special_predictions(
    lobby: LobbyRecord,
    special_by_user: dict[int, dict[str, Any]],
    matches: dict[int, FinishedMatch],
) -> dict[int, dict[str, int]]:
    actual_placements = actual_global_placements(matches)
    player_stats = load_player_stats()
    points_by_user: dict[int, dict[str, int]] = {}

    for user_id, predictions in special_by_user.items():
        total_points = 0
        knockout_points = 0

        for prediction_type in global_prediction_types_for_lobby(lobby):
            prediction = predictions.get(prediction_type)

            if not isinstance(prediction, dict):
                continue

            if prediction_type in GLOBAL_PLACEMENT_TYPES:
                total_points += score_global_placement_prediction(lobby, prediction_type, prediction, actual_placements)
            elif prediction_type in {"topScorer", "goldenBall"}:
                total_points += score_player_award_prediction(lobby, prediction_type, prediction, player_stats)

        if lobby.point_system == "custom":
            if is_custom_feature_enabled(lobby, "trackTeam"):
                total_points += score_track_team_prediction(lobby, predictions.get("trackTeam"), matches)

            if is_custom_feature_enabled(lobby, "favoritePlayer"):
                total_points += score_favorite_player_prediction(lobby, predictions.get("favoritePlayer"), player_stats)

            if is_custom_feature_enabled(lobby, "bracketHeavy"):
                bracket_points = score_bracket_heavy_prediction(lobby, predictions.get("bracketHeavy"), matches)
                total_points += bracket_points
                knockout_points += bracket_points

        points_by_user[user_id] = {"total": total_points, "knockoutStage": knockout_points}

    return points_by_user


def global_prediction_types_for_lobby(lobby: LobbyRecord) -> list[str]:
    if lobby.point_system == "simple":
        return ["champion", "runnerUp", "topScorer"]

    if lobby.point_system == "regular":
        return ["champion", "runnerUp", "thirdPlace", "fourthPlace", "topScorer", "goldenBall"]

    if lobby.point_system != "custom":
        return []

    enabled = lobby.custom_settings.get("enabledFields") if lobby.custom_settings and isinstance(lobby.custom_settings.get("enabledFields"), dict) else {}

    return [
        prediction_type
        for prediction_type in ["champion", "runnerUp", "thirdPlace", "fourthPlace", "topScorer", "goldenBall"]
        if bool(enabled.get(prediction_type))
    ]


def score_global_placement_prediction(
    lobby: LobbyRecord,
    prediction_type: str,
    prediction: dict[str, Any],
    actual_placements: dict[str, str],
) -> int:
    selected_team = normalized_team(prediction.get("teamName"))
    actual_team = normalized_team(actual_placements.get(prediction_type))

    if not selected_team or selected_team != actual_team:
        return 0

    return points_for_global_type(lobby, prediction_type)


def score_player_award_prediction(
    lobby: LobbyRecord,
    prediction_type: str,
    prediction: dict[str, Any],
    player_stats: list[PlayerStat],
) -> int:
    player = find_player_stat(player_stats, prediction)

    if player is None:
        return 0

    if prediction_type == "topScorer" and player.is_top_scorer:
        return points_for_global_type(lobby, "topScorer")

    if prediction_type == "goldenBall" and player.is_golden_ball:
        return points_for_global_type(lobby, "goldenBall")

    return 0


def score_favorite_player_prediction(
    lobby: LobbyRecord,
    raw_prediction: Any,
    player_stats: list[PlayerStat],
) -> int:
    if not isinstance(raw_prediction, dict):
        return 0

    player = find_player_stat(player_stats, raw_prediction)

    if player is None:
        return 0

    threshold = custom_points_value(lobby, "favoritePlayerContributions")
    points_per_award = custom_points_value(lobby, "favoritePlayerPoints")

    if threshold <= 0 or points_per_award <= 0:
        return 0

    return ((player.goals + player.assists) // threshold) * points_per_award


def score_track_team_prediction(
    lobby: LobbyRecord,
    raw_prediction: Any,
    matches: dict[int, FinishedMatch],
) -> int:
    if not isinstance(raw_prediction, dict) or not isinstance(raw_prediction.get("selections"), dict):
        return 0

    predicted_phase = str(raw_prediction["selections"].get("phase", ""))
    actual_phase = tracked_team_actual_phase(lobby)

    if not predicted_phase or predicted_phase != actual_phase:
        return 0

    return custom_points_value(lobby, "trackTeamPoints")


def tracked_team_actual_phase(lobby: LobbyRecord) -> str:
    tracked_team = normalized_team(lobby.custom_settings.get("trackedTeam") if lobby.custom_settings else "")

    if not tracked_team:
        return ""

    country_results = load_country_results()

    return country_results.get(tracked_team, "")


def load_country_results() -> dict[str, str]:
    try:
        with open(COUNTRY_RESULTS_PATH, "r", encoding="utf-8") as results_file:
            payload = json.load(results_file)
    except (OSError, json.JSONDecodeError):
        return {}

    countries = payload.get("countries") if isinstance(payload, dict) else None

    if not isinstance(countries, list):
        return {}

    results: dict[str, str] = {}

    for country in countries:
        if not isinstance(country, dict):
            continue

        country_name = country.get("country")
        reached_phase = country.get("reachedPhase")

        if isinstance(country_name, str) and isinstance(reached_phase, str):
            results[normalized_team(country_name)] = reached_phase

    return results


def score_bracket_heavy_prediction(
    lobby: LobbyRecord,
    raw_prediction: Any,
    matches: dict[int, FinishedMatch],
) -> int:
    if not isinstance(raw_prediction, dict) or not isinstance(raw_prediction.get("selections"), dict):
        return 0

    selections = {
        str(key): normalized_team(value)
        for key, value in raw_prediction["selections"].items()
        if isinstance(value, str)
    }
    points = 0

    for stage, field in [
        ("Last 32", "roundOf32"),
        ("Last 16", "roundOf16"),
        ("Quarter Finals", "quarterFinal"),
        ("Semi Finals", "semiFinal"),
        ("Third Place", "thirdPlaceMatch"),
        ("Final", "final"),
    ]:
        if not is_custom_field_enabled(lobby, field):
            continue

        stage_points = custom_points_value(lobby, field)
        stage_matches = sorted((match for match in matches.values() if match.stage == stage), key=lambda match: match.id)
        selected_winners = bracket_selected_winners_for_stage(selections, stage)

        for index, match in enumerate(stage_matches):
            winner = normalized_team(match_winner(match))

            if index < len(selected_winners) and selected_winners[index] == winner:
                points += stage_points

    return points


def bracket_selected_winners_for_stage(selections: dict[str, str], stage: str) -> list[str]:
    stage_entries: list[tuple[int, str, str]] = []

    for key, selected in selections.items():
        parts = key.split(":")

        if len(parts) != 3 or parts[0] != stage:
            continue

        side = parts[1]

        try:
            index = int(parts[2])
        except ValueError:
            continue

        side_rank = 0 if side == "left" else 1 if side == "right" else 2
        stage_entries.append((side_rank, index, selected))

    return [selected for _, _, selected in sorted(stage_entries)]


def points_for_global_type(lobby: LobbyRecord, prediction_type: str) -> int:
    if lobby.point_system == "simple":
        return SIMPLE_GLOBAL_POINTS.get(to_scoring_key(prediction_type), 0)

    if lobby.point_system == "regular":
        return REGULAR_GLOBAL_POINTS.get(to_scoring_key(prediction_type), 0)

    if lobby.point_system == "custom":
        return custom_points_value(lobby, prediction_type)

    return 0


def custom_points_value(lobby: LobbyRecord, field: str) -> int:
    values = lobby.custom_settings.get("values") if lobby.custom_settings and isinstance(lobby.custom_settings.get("values"), dict) else {}

    try:
        return max(0, int(values.get(field, 0)))
    except (TypeError, ValueError):
        return 0


def is_custom_feature_enabled(lobby: LobbyRecord, feature: str) -> bool:
    enabled = lobby.custom_settings.get("enabledFeatures") if lobby.custom_settings and isinstance(lobby.custom_settings.get("enabledFeatures"), dict) else {}

    return bool(enabled.get(feature))


def is_custom_field_enabled(lobby: LobbyRecord, field: str) -> bool:
    enabled = lobby.custom_settings.get("enabledFields") if lobby.custom_settings and isinstance(lobby.custom_settings.get("enabledFields"), dict) else {}

    return bool(enabled.get(field))


def actual_global_placements(matches: dict[int, FinishedMatch]) -> dict[str, str]:
    placements: dict[str, str] = {}
    final = next((match for match in matches.values() if match.stage == "Final"), None)
    third_place = next((match for match in matches.values() if match.stage == "Third Place"), None)

    if final:
        placements["champion"] = match_winner(final)
        placements["runnerUp"] = match_loser(final)

    if third_place:
        placements["thirdPlace"] = match_winner(third_place)
        placements["fourthPlace"] = match_loser(third_place)

    return placements


def match_winner(match: FinishedMatch) -> str:
    return match.home_team if match.home_score > match.away_score else match.away_team


def match_loser(match: FinishedMatch) -> str:
    return match.away_team if match.home_score > match.away_score else match.home_team


def load_player_stats() -> list[PlayerStat]:
    try:
        with open(PLAYER_STATS_PATH, "r", encoding="utf-8") as player_file:
            raw_players = json.load(player_file)
    except (OSError, json.JSONDecodeError):
        return []

    if not isinstance(raw_players, list):
        return []

    players: list[PlayerStat] = []

    for raw_player in raw_players:
        if not isinstance(raw_player, dict):
            continue

        try:
            number = int(raw_player.get("number", 0))
            goals = max(0, int(raw_player.get("goals", 0)))
            assists = max(0, int(raw_player.get("assists", 0)))
        except (TypeError, ValueError):
            continue

        players.append(
            PlayerStat(
                country=str(raw_player.get("country", "")),
                name=str(raw_player.get("name", "")),
                number=number,
                goals=goals,
                assists=assists,
                is_top_scorer=bool(raw_player.get("isTopScorer")),
                is_golden_ball=bool(raw_player.get("isGoldenBall")),
            )
        )

    return players


def find_player_stat(players: list[PlayerStat], prediction: dict[str, Any]) -> PlayerStat | None:
    selected_country = normalized_team(prediction.get("playerCountry"))
    selected_name = normalized_team(prediction.get("playerName"))

    try:
        selected_number = int(prediction.get("playerNumber", 0))
    except (TypeError, ValueError):
        selected_number = 0

    return next(
        (
            player
            for player in players
            if normalized_team(player.country) == selected_country
            and normalized_team(player.name) == selected_name
            and player.number == selected_number
        ),
        None,
    )


def normalized_team(value: Any) -> str:
    normalized = unicodedata.normalize("NFD", str(value or "").strip())
    return "".join(character for character in normalized if unicodedata.category(character) != "Mn").casefold()


def to_scoring_key(prediction_type: str) -> str:
    return {
        "runnerUp": "runner_up",
        "thirdPlace": "third_place",
        "fourthPlace": "fourth_place",
        "topScorer": "top_scorer",
        "goldenBall": "golden_ball",
    }.get(prediction_type, prediction_type)


def match_result(score: ScorePrediction) -> str:
    if score.home > score.away:
        return "home"

    if score.away > score.home:
        return "away"

    return "draw"


def is_group_stage_match(match: FinishedMatch) -> bool:
    return match.group is not None or match.stage == "Group Stage"


def is_group_stage_schedule(match: MatchSchedule) -> bool:
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

        if len(path_parts) == 4 and path_parts[0] == "lobbies" and path_parts[2] == "special-predictions":
            self.save_lobby_special_prediction(path_parts[1], path_parts[3])
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
                special_predictions = list_lobby_special_predictions(
                    connection,
                    code=code,
                    requesting_user_id=int(authenticated_user["id"]),
                )
                default_predictions = list_lobby_member_default_match_predictions(
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

        self.send_json(
            200,
            build_scoreboard_payload(
                lobby,
                predictions,
                matches,
                special_predictions,
                default_predictions,
            ),
        )

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
                user_id = int(authenticated_user["id"])
                get_lobby_for_member(connection, code=code, user_id=user_id)
                schedule = fetch_match_schedule()
                ensure_match_prediction_open(match_id, schedule)
                prediction = save_match_prediction(
                    connection,
                    code=code,
                    user_id=user_id,
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
            except PredictionWindowError as error:
                self.send_json(403, {"code": "prediction_window_closed", "error": str(error)})
                return
            except RuntimeError as error:
                self.send_json(502, {"error": str(error)})
                return
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
                return

        self.send_json(200, {"prediction": self.match_prediction_payload(prediction)})

    def save_lobby_special_prediction(self, code: str, prediction_type: str) -> None:
        if prediction_type not in SPECIAL_PREDICTION_TYPES:
            self.send_json(400, {"error": "Special prediction type is not supported."})
            return

        payload = self.read_json_body()

        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        raw_player_number = payload.get("playerNumber")
        player_number: int | None = None

        if raw_player_number is not None:
            try:
                player_number = int(raw_player_number)
            except (TypeError, ValueError):
                self.send_json(400, {"error": "Player number must be a number."})
                return

        raw_selections = payload.get("selections")
        selections = None

        if raw_selections is not None:
            if not isinstance(raw_selections, dict):
                self.send_json(400, {"error": "Selections must be an object."})
                return

            selections = {
                str(key): str(value)
                for key, value in raw_selections.items()
                if isinstance(key, str) and isinstance(value, str)
            }

        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                user_id = int(authenticated_user["id"])
                lobby = get_lobby_for_member(connection, code=code, user_id=user_id)
                schedule = fetch_match_schedule()
                if prediction_type == "bracketHeavy":
                    ensure_bracket_heavy_prediction_open(schedule)
                else:
                    ensure_global_prediction_open(lobby, user_id, schedule)
                prediction = save_special_prediction(
                    connection,
                    code=code,
                    user_id=user_id,
                    prediction_type=prediction_type,
                    team_name=payload.get("teamName") if isinstance(payload.get("teamName"), str) else None,
                    player_country=payload.get("playerCountry") if isinstance(payload.get("playerCountry"), str) else None,
                    player_name=payload.get("playerName") if isinstance(payload.get("playerName"), str) else None,
                    player_number=player_number,
                    selections=selections,
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
            except PredictionWindowError as error:
                self.send_json(403, {"code": "prediction_window_closed", "error": str(error)})
                return
            except RuntimeError as error:
                self.send_json(502, {"error": str(error)})
                return
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
                return

        self.send_json(200, {"prediction": self.special_prediction_payload(prediction)})

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
                schedule = fetch_match_schedule()
                ensure_match_prediction_open(match_id, schedule)
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
            except PredictionWindowError as error:
                self.send_json(403, {"code": "prediction_window_closed", "error": str(error)})
                return
            except RuntimeError as error:
                self.send_json(502, {"error": str(error)})
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
                schedule = fetch_match_schedule()
                open_match_ids = [
                    match_id
                    for match_id in (match_ids or [match.id for match in schedule.values()])
                    if match_id in schedule and current_utc_datetime() < schedule[match_id].utc_date
                ]
                predictions = copy_default_predictions_to_lobby(
                    connection,
                    code=code,
                    user_id=int(authenticated_user["id"]),
                    match_ids=open_match_ids,
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
            except RuntimeError as error:
                self.send_json(502, {"error": str(error)})
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

        if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "lobbies":
            self.remove_user_from_all_lobbies(path_parts[1])
            return

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

    def remove_user_from_all_lobbies(self, user_id_text: str) -> None:
        try:
            user_id = int(user_id_text)
        except ValueError:
            self.send_json(400, {"error": "User id must be a number."})
            return

        with connect() as connection:
            initialize_database(connection)

            try:
                authenticated_user = self.get_authenticated_user()
                authenticated_user_id = int(authenticated_user["id"])

                if authenticated_user_id != user_id:
                    self.send_json(403, {"code": "forbidden", "error": "Users can only remove their own lobbies."})
                    return

                removed_count = remove_user_from_all_lobbies(connection, user_id)
            except AuthenticationError as error:
                self.send_json(401, {"code": "not_authenticated", "error": str(error)})
                return

        self.send_json(200, {"status": "removed", "removedCount": removed_count})

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
        allowed_origins = get_allowed_origins()
        origin = self.headers.get("Origin")
        normalized_origin = origin.rstrip("/") if origin else None
        allowed_origin = normalized_origin if normalized_origin in allowed_origins else allowed_origins[0]

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
                    "joinedAt": member.joined_at,
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

    def special_prediction_payload(self, prediction: Any) -> dict[str, Any]:
        return {
            "userId": prediction.user_id,
            "username": prediction.username,
            "type": prediction.prediction_type,
            "teamName": prediction.team_name,
            "playerCountry": prediction.player_country,
            "playerName": prediction.player_name,
            "playerNumber": prediction.player_number,
            "selections": prediction.selections,
        }


def run() -> None:
    with connect() as connection:
        initialize_database(connection)

    host = get_host()
    port = get_port()
    server = ThreadingHTTPServer((host, port), LobbyRequestHandler)
    print(f"Lobby service listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
