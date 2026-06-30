from __future__ import annotations

from datetime import date

from app import get_allowed_origins, get_host, get_port
from matches_service import football_data
from matches_service.football_data import select_carousel_matches


def match(match_id: int, utc_date: str) -> dict:
    return {
        "id": match_id,
        "utcDate": utc_date,
        "homeTeam": {"name": "A"},
        "awayTeam": {"name": "B"},
        "score": {"fullTime": {"home": None, "away": None}},
    }


def test_local_host_and_port_are_the_default_without_render_port(monkeypatch) -> None:
    monkeypatch.delenv("HOST", raising=False)
    monkeypatch.delenv("PORT", raising=False)

    assert get_host() == "127.0.0.1"
    assert get_port() == 8002


def test_render_port_switches_default_host_to_public_binding(monkeypatch) -> None:
    monkeypatch.delenv("HOST", raising=False)
    monkeypatch.setenv("PORT", "10000")

    assert get_host() == "0.0.0.0"
    assert get_port() == 10000


def test_allowed_origins_can_be_configured_from_environment(monkeypatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.example.com, https://preview.example.com/")

    assert get_allowed_origins() == ("https://app.example.com", "https://preview.example.com")


def test_selects_first_two_match_days_before_tournament() -> None:
    matches = [
        match(1, "2026-06-11T19:00:00Z"),
        match(2, "2026-06-12T02:00:00Z"),
        match(3, "2026-06-12T19:00:00Z"),
        match(4, "2026-06-13T19:00:00Z"),
    ]

    selected = select_carousel_matches(matches, today=date(2026, 6, 1))

    assert [item["id"] for item in selected] == [1, 2, 3]


def test_keeps_current_match_day_and_next_match_day() -> None:
    matches = [
        match(1, "2026-06-11T19:00:00Z"),
        match(2, "2026-06-12T19:00:00Z"),
        match(3, "2026-06-14T19:00:00Z"),
    ]

    selected = select_carousel_matches(matches, today=date(2026, 6, 12))

    assert [item["id"] for item in selected] == [2, 3]


def test_skips_today_when_there_are_no_matches() -> None:
    matches = [
        match(1, "2026-06-11T19:00:00Z"),
        match(2, "2026-06-14T19:00:00Z"),
        match(3, "2026-06-15T19:00:00Z"),
    ]

    selected = select_carousel_matches(matches, today=date(2026, 6, 12))

    assert [item["id"] for item in selected] == [2, 3]


def test_regular_duration_uses_full_time_score() -> None:
    raw_match = match(1, "2026-06-11T19:00:00Z")
    raw_match["score"] = {
        "duration": "REGULAR",
        "fullTime": {"home": 2, "away": 1},
        "regularTime": {"home": 2, "away": 1},
        "extraTime": {"home": 0, "away": 0},
    }

    normalized = football_data.normalize_match(raw_match).to_payload()

    assert normalized["score"] == {"home": 2, "away": 1, "penalties": None}


def test_non_regular_duration_scores_regular_plus_extra_time_without_penalties() -> None:
    raw_match = match(1, "2026-06-11T19:00:00Z")
    raw_match["score"] = {
        "duration": "PENALTY_SHOOTOUT",
        "fullTime": {"home": 6, "away": 5},
        "regularTime": {"home": 1, "away": 1},
        "extraTime": {"home": 1, "away": 1},
        "penalties": {"home": 0, "away": 0},
    }

    normalized = football_data.normalize_match(raw_match).to_payload()

    assert normalized["score"] == {"home": 2, "away": 2, "penalties": {"home": 4, "away": 3}}


def test_penalty_shootout_score_is_inferred_from_full_time_difference() -> None:
    raw_match = match(1, "2026-06-11T19:00:00Z")
    raw_match["score"] = {
        "duration": "PENALTY_SHOOTOUT",
        "fullTime": {"home": 5, "away": 6},
        "regularTime": {"home": 1, "away": 1},
        "extraTime": {"home": 0, "away": 0},
        "penalties": {"home": 99, "away": 99},
    }

    normalized = football_data.normalize_match(raw_match).to_payload()

    assert normalized["score"] == {"home": 1, "away": 1, "penalties": {"home": 4, "away": 5}}


def test_fallback_merge_preserves_extra_time_score_fields() -> None:
    raw_match = match(1, "2026-06-11T19:00:00Z")
    team_match = match(1, "2026-06-11T19:00:00Z")
    team_match["score"] = {
        "duration": "PENALTY_SHOOTOUT",
        "fullTime": {"home": 6, "away": 5},
        "regularTime": {"home": 1, "away": 1},
        "extraTime": {"home": 1, "away": 1},
        "penalties": {"home": 0, "away": 0},
    }

    merged = football_data.merge_score_from_team_match(raw_match, team_match)
    normalized = football_data.normalize_match(merged).to_payload()

    assert normalized["score"] == {"home": 2, "away": 2, "penalties": {"home": 4, "away": 3}}


def test_world_cup_matches_cache_reuses_recent_fetch(monkeypatch) -> None:
    calls = 0
    football_data._matches_cache = None
    football_data._matches_cache_loaded_at = 0

    def fake_fetch() -> list[dict]:
        nonlocal calls
        calls += 1
        return [match(1, "2026-06-11T19:00:00Z")]

    monkeypatch.setattr(football_data, "fetch_world_cup_matches", fake_fetch)
    monkeypatch.setattr(football_data.time, "time", lambda: 100)

    assert football_data.get_world_cup_matches() == [match(1, "2026-06-11T19:00:00Z")]
    assert football_data.get_world_cup_matches() == [match(1, "2026-06-11T19:00:00Z")]
    assert calls == 1


def test_stale_file_cache_is_served_before_refresh(monkeypatch, tmp_path) -> None:
    cached_match = match(1, "2026-06-11T19:00:00Z")
    football_data._matches_cache = None
    football_data._matches_cache_loaded_at = 0

    monkeypatch.setattr(football_data, "CACHE_PATH", tmp_path / "matches.json")
    monkeypatch.setattr(football_data.time, "time", lambda: 200)
    monkeypatch.setattr(football_data, "start_background_cache_refresh", lambda: None)

    football_data.write_cached_world_cup_matches([cached_match], fetched_at=100)

    assert football_data.get_world_cup_matches() == [cached_match]
