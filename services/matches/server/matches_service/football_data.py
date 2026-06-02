from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from datetime import date, datetime
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
SEASON = "2026"
BOGOTA_TZ = ZoneInfo("America/Bogota")
CACHE_TTL_SECONDS = 60
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


def fetch_world_cup_matches() -> list[dict[str, Any]]:
    token = get_api_token()
    query = urlencode({"season": SEASON})
    url = f"{API_BASE_URL}/competitions/{COMPETITION_CODE}/matches?{query}"
    request = Request(url, headers={"X-Auth-Token": token, "Accept": "application/json"})

    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise FootballDataError(f"football-data.org returned {error.code}: {detail}") from error
    except (TimeoutError, URLError, json.JSONDecodeError) as error:
        raise FootballDataError("Could not fetch World Cup matches.") from error

    matches = payload.get("matches")

    if not isinstance(matches, list):
        raise FootballDataError("football-data.org response did not include matches.")

    return matches


def read_cached_world_cup_matches() -> tuple[list[dict[str, Any]], float] | None:
    if not CACHE_PATH.exists():
        return None

    try:
        payload = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    matches = payload.get("matches")
    fetched_at = payload.get("fetchedAt")

    if not isinstance(matches, list) or not isinstance(fetched_at, (int, float)):
        return None

    return matches, float(fetched_at)


def write_cached_world_cup_matches(matches: list[dict[str, Any]], fetched_at: float) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(
        json.dumps({"fetchedAt": fetched_at, "matches": matches}),
        encoding="utf-8",
    )


def refresh_world_cup_matches_cache() -> list[dict[str, Any]]:
    global _matches_cache, _matches_cache_loaded_at

    matches = fetch_world_cup_matches()
    fetched_at = time.time()
    write_cached_world_cup_matches(matches, fetched_at)

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
        matches, fetched_at = cached

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
        home_team=str(home_team.get("name", "TBD")),
        away_team=str(away_team.get("name", "TBD")),
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
