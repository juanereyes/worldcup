from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from threading import Lock, Thread
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = "https://api.football-data.org/v4"
COMPETITION_CODE = "WC"
COMPETITION_ID = "2000"
SEASON = "2026"
BOGOTA_TZ = ZoneInfo("America/Bogota")
CACHE_TTL_SECONDS = 60
RECENT_MATCH_LOOKBACK_DAYS = 1
TEAM_MATCH_FALLBACK_LIMIT = 6
CACHE_PATH = Path(__file__).resolve().parents[2] / "cache" / "world-cup-2026-matches.json"
_matches_cache: list[dict[str, Any]] | None = None
_matches_cache_loaded_at = 0.0
_matches_cache_lock = Lock()
_matches_refresh_lock = Lock()


class ConfigurationError(RuntimeError):
    pass


class FootballDataError(RuntimeError):
    pass


@dataclass(frozen=True)
class CarouselMatch:
    id: int
    utc_date: str
    status: str
    stage: str
    group: str | None
    home_team: str
    away_team: str
    home_score: int | None
    away_score: int | None

    def to_payload(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "utcDate": self.utc_date,
            "status": self.status,
            "stage": self.stage,
            "group": self.group,
            "homeTeam": self.home_team,
            "awayTeam": self.away_team,
            "score": {
                "home": self.home_score,
                "away": self.away_score,
            },
        }


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def get_api_token() -> str:
    token = os.environ.get("FOOTBALL_DATA_API_TOKEN", "").strip()

    if not token:
        raise ConfigurationError("FOOTBALL_DATA_API_TOKEN is not configured.")

    return token


def fetch_football_data_json(path: str, query: dict[str, str]) -> dict[str, Any]:
    token = get_api_token()
    encoded_query = urlencode(query)
    url = f"{API_BASE_URL}{path}?{encoded_query}" if encoded_query else f"{API_BASE_URL}{path}"
    request = Request(url, headers={"X-Auth-Token": token, "Accept": "application/json"})

    try:
        with urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise FootballDataError(f"football-data.org returned {error.code}: {detail}") from error
    except (TimeoutError, URLError, json.JSONDecodeError) as error:
        raise FootballDataError("Could not fetch football-data.org data.") from error


def fetch_world_cup_matches() -> list[dict[str, Any]]:
    payload = fetch_football_data_json(
        f"/competitions/{COMPETITION_CODE}/matches",
        {"season": SEASON},
    )

    matches = payload.get("matches")

    if not isinstance(matches, list):
        raise FootballDataError("football-data.org response did not include matches.")

    return matches


def fetch_team_matches(team_id: int, date_from: date, date_to: date) -> list[dict[str, Any]]:
    payload = fetch_football_data_json(
        f"/teams/{team_id}/matches",
        {
            "dateFrom": date_from.isoformat(),
            "dateTo": date_to.isoformat(),
            "season": SEASON,
            "competitions": COMPETITION_ID,
            "limit": "20",
        },
    )
    matches = payload.get("matches")

    if not isinstance(matches, list):
        raise FootballDataError("football-data.org team response did not include matches.")

    return matches


def parse_utc_datetime(match: dict[str, Any]) -> datetime | None:
    utc_date = match.get("utcDate")

    if not isinstance(utc_date, str):
        return None

    try:
        return datetime.fromisoformat(utc_date.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def full_time_score(match: dict[str, Any]) -> dict[str, Any]:
    score = match.get("score") if isinstance(match.get("score"), dict) else {}
    full_time = score.get("fullTime") if isinstance(score.get("fullTime"), dict) else {}

    return full_time


def has_full_time_score(match: dict[str, Any]) -> bool:
    full_time = full_time_score(match)

    return isinstance(full_time.get("home"), int) and isinstance(full_time.get("away"), int)


def team_id(team: Any) -> int | None:
    if not isinstance(team, dict):
        return None

    value = team.get("id")

    return value if isinstance(value, int) else None


def is_recent_started_match_with_missing_score(match: dict[str, Any], now: datetime) -> bool:
    if has_full_time_score(match):
        return False

    kickoff = parse_utc_datetime(match)

    if kickoff is None or kickoff > now:
        return False

    local_day = kickoff.astimezone(BOGOTA_TZ).date()
    earliest_day = now.astimezone(BOGOTA_TZ).date() - timedelta(days=RECENT_MATCH_LOOKBACK_DAYS)

    return local_day >= earliest_day


def fallback_team_id(match: dict[str, Any]) -> int | None:
    return team_id(match.get("homeTeam")) or team_id(match.get("awayTeam"))


def merge_score_from_team_match(match: dict[str, Any], team_match: dict[str, Any]) -> dict[str, Any]:
    updated = dict(match)
    updated_score = dict(updated.get("score")) if isinstance(updated.get("score"), dict) else {}
    team_score = team_match.get("score") if isinstance(team_match.get("score"), dict) else {}

    updated_score["fullTime"] = dict(full_time_score(team_match))

    if "winner" in team_score:
        updated_score["winner"] = team_score.get("winner")

    updated["score"] = updated_score
    updated["status"] = team_match.get("status", updated.get("status"))
    updated["lastUpdated"] = team_match.get("lastUpdated", updated.get("lastUpdated"))

    return updated


def fallback_resolution_match(resolution: Any) -> dict[str, Any] | None:
    if not isinstance(resolution, dict):
        return None

    match = resolution.get("match")

    return match if isinstance(match, dict) and has_full_time_score(match) else None


def add_recent_team_match_scores(
    matches: list[dict[str, Any]],
    fallback_resolutions: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    now = datetime.now(timezone.utc)
    known_match_ids = {
        str(match["id"])
        for match in matches
        if isinstance(match.get("id"), int)
    }
    next_fallback_resolutions = {
        match_id: resolution
        for match_id, resolution in (fallback_resolutions or {}).items()
        if match_id in known_match_ids and fallback_resolution_match(resolution) is not None
    }
    candidates = [
        match
        for match in matches
        if is_recent_started_match_with_missing_score(match, now)
    ]

    if not candidates:
        return matches, next_fallback_resolutions

    by_id = {
        int(match["id"]): match
        for match in matches
        if isinstance(match.get("id"), int)
    }
    team_matches_cache: dict[int, list[dict[str, Any]]] = {}
    team_calls = 0

    for candidate in candidates:
        match_id = candidate.get("id")

        if not isinstance(match_id, int):
            continue

        stored_match = fallback_resolution_match(next_fallback_resolutions.get(str(match_id)))

        if stored_match is not None:
            by_id[match_id] = merge_score_from_team_match(candidate, stored_match)
            continue

        kickoff = parse_utc_datetime(candidate)

        if kickoff is None:
            continue

        local_date = kickoff.astimezone(BOGOTA_TZ).date()
        utc_date = kickoff.date()
        date_from = min(local_date, utc_date)
        date_to = max(local_date, utc_date)
        candidate_team_id = fallback_team_id(candidate)

        if candidate_team_id is None:
            continue

        if candidate_team_id not in team_matches_cache:
            if team_calls >= TEAM_MATCH_FALLBACK_LIMIT:
                return [by_id.get(int(match.get("id", 0)), match) for match in matches], next_fallback_resolutions

            try:
                team_matches_cache[candidate_team_id] = fetch_team_matches(
                    candidate_team_id,
                    date_from,
                    date_to,
                )
            except FootballDataError:
                team_matches_cache[candidate_team_id] = []
            team_calls += 1

        team_match = next(
            (
                team_match
                for team_match in team_matches_cache[candidate_team_id]
                if team_match.get("id") == match_id and has_full_time_score(team_match)
            ),
            None,
        )

        if team_match is not None:
            updated_match = merge_score_from_team_match(candidate, team_match)
            by_id[match_id] = updated_match
            next_fallback_resolutions[str(match_id)] = {
                "resolvedAt": time.time(),
                "teamId": candidate_team_id,
                "match": updated_match,
            }

    return [by_id.get(int(match.get("id", 0)), match) for match in matches], next_fallback_resolutions


def read_cached_world_cup_matches() -> tuple[list[dict[str, Any]], float, dict[str, Any]] | None:
    if not CACHE_PATH.exists():
        return None

    try:
        payload = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    matches = payload.get("matches")
    fetched_at = payload.get("fetchedAt")
    fallback_resolutions = payload.get("resolvedByTeamFallback")

    if not isinstance(matches, list) or not isinstance(fetched_at, (int, float)):
        return None

    return matches, float(fetched_at), fallback_resolutions if isinstance(fallback_resolutions, dict) else {}


def write_cached_world_cup_matches(
    matches: list[dict[str, Any]],
    fetched_at: float,
    fallback_resolutions: dict[str, Any] | None = None,
) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(
        json.dumps(
            {
                "fetchedAt": fetched_at,
                "matches": matches,
                "resolvedByTeamFallback": fallback_resolutions or {},
            }
        ),
        encoding="utf-8",
    )


def refresh_world_cup_matches_cache() -> list[dict[str, Any]]:
    global _matches_cache, _matches_cache_loaded_at

    cached = read_cached_world_cup_matches()
    fallback_resolutions = cached[2] if cached is not None else {}
    matches, fallback_resolutions = add_recent_team_match_scores(
        fetch_world_cup_matches(),
        fallback_resolutions,
    )
    fetched_at = time.time()
    write_cached_world_cup_matches(matches, fetched_at, fallback_resolutions)

    with _matches_cache_lock:
        _matches_cache = matches
        _matches_cache_loaded_at = fetched_at

    return matches


def start_background_cache_refresh() -> None:
    if not _matches_refresh_lock.acquire(blocking=False):
        return

    def refresh() -> None:
        try:
            refresh_world_cup_matches_cache()
        except (ConfigurationError, FootballDataError):
            pass
        finally:
            _matches_refresh_lock.release()

    Thread(target=refresh, daemon=True).start()


def get_world_cup_matches() -> list[dict[str, Any]]:
    global _matches_cache, _matches_cache_loaded_at

    now = time.time()

    with _matches_cache_lock:
        if _matches_cache is not None and now - _matches_cache_loaded_at < CACHE_TTL_SECONDS:
            return _matches_cache

    cached = read_cached_world_cup_matches()

    if cached is not None:
        matches, fetched_at, _fallback_resolutions = cached

        with _matches_cache_lock:
            _matches_cache = matches
            _matches_cache_loaded_at = fetched_at

        if now - fetched_at >= CACHE_TTL_SECONDS:
            start_background_cache_refresh()

        return matches

    with _matches_cache_lock:
        if _matches_cache is not None:
            start_background_cache_refresh()
            return _matches_cache

    matches = refresh_world_cup_matches_cache()

    with _matches_cache_lock:
        _matches_cache = matches
        _matches_cache_loaded_at = now

    return matches


def match_date(match: dict[str, Any]) -> date | None:
    utc_date = match.get("utcDate")

    if not isinstance(utc_date, str):
        return None

    try:
        parsed = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
    except ValueError:
        return None

    return parsed.astimezone(BOGOTA_TZ).date()


def select_carousel_matches(matches: list[dict[str, Any]], today: date | None = None) -> list[dict[str, Any]]:
    selected_today = today or datetime.now(BOGOTA_TZ).date()
    grouped_dates = sorted({day for match in matches if (day := match_date(match)) is not None})

    if not grouped_dates:
        return []

    if selected_today in grouped_dates:
        selected_dates = [selected_today]
        selected_dates.extend(day for day in grouped_dates if day > selected_today)
    else:
        selected_dates = [day for day in grouped_dates if day >= selected_today]

    if not selected_dates:
        selected_dates = grouped_dates[-2:]

    selected_days = set(selected_dates[:2])

    return [match for match in matches if match_date(match) in selected_days]


def format_api_label(label: str) -> str:
    return label.replace("_", " ").title()


def team_name(team: dict[str, Any]) -> str:
    name = team.get("name")

    return str(name) if isinstance(name, str) and name else "TBD"


def normalize_match(match: dict[str, Any]) -> CarouselMatch:
    score = match.get("score") if isinstance(match.get("score"), dict) else {}
    full_time = score.get("fullTime") if isinstance(score.get("fullTime"), dict) else {}
    home_team = match.get("homeTeam") if isinstance(match.get("homeTeam"), dict) else {}
    away_team = match.get("awayTeam") if isinstance(match.get("awayTeam"), dict) else {}

    return CarouselMatch(
        id=int(match.get("id", 0)),
        utc_date=str(match.get("utcDate", "")),
        status=str(match.get("status", "")),
        stage=format_api_label(str(match.get("stage", ""))),
        group=format_api_label(match.get("group")) if isinstance(match.get("group"), str) else None,
        home_team=team_name(home_team),
        away_team=team_name(away_team),
        home_score=full_time.get("home") if isinstance(full_time.get("home"), int) else None,
        away_score=full_time.get("away") if isinstance(full_time.get("away"), int) else None,
    )


def carousel_payload(today: date | None = None) -> dict[str, Any]:
    matches = get_world_cup_matches()
    selected = select_carousel_matches(matches, today=today)
    normalized = [normalize_match(match).to_payload() for match in selected]
    days = sorted({
        day.isoformat()
        for match in selected
        if (day := match_date(match)) is not None
    })

    return {
        "competition": COMPETITION_CODE,
        "season": SEASON,
        "days": days,
        "matches": normalized,
    }


def all_matches_payload() -> dict[str, Any]:
    matches = get_world_cup_matches()
    normalized = [normalize_match(match).to_payload() for match in matches]
    days = sorted({
        day.isoformat()
        for match in matches
        if (day := match_date(match)) is not None
    })

    return {
        "competition": COMPETITION_CODE,
        "season": SEASON,
        "days": days,
        "matches": normalized,
    }
