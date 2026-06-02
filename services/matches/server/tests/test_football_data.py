from __future__ import annotations

from datetime import date

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
