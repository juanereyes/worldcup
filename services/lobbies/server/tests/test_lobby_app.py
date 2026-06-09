from __future__ import annotations

import unittest
from datetime import datetime, timezone
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

from app import (
    AuthenticationError,
    FinishedMatch,
    MatchSchedule,
    bracket_heavy_window_state,
    build_scoreboard_payload,
    get_allowed_origins,
    get_host,
    get_port,
    global_prediction_closes_at,
    validate_auth_session,
)
from lobby_service.database import LobbyMemberRecord, LobbyRecord, MemberMatchPredictionRecord, MemberSpecialPredictionRecord


class FakeAuthResponse:
    def __init__(self, body: bytes) -> None:
        self.body = BytesIO(body)

    def __enter__(self) -> "FakeAuthResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return self.body.read()


class LobbyAuthValidationTest(unittest.TestCase):
    def test_validate_auth_session_returns_user_from_auth_service(self) -> None:
        with patch("app.urlopen", return_value=FakeAuthResponse(b'{"user": {"id": 7, "username": "juan"}}')) as urlopen:
            user = validate_auth_session("worldcup_auth_session=session-token")

        request = urlopen.call_args.args[0]

        self.assertEqual(user["id"], 7)
        self.assertEqual(request.headers["Cookie"], "worldcup_auth_session=session-token")

    def test_validate_auth_session_rejects_missing_cookie(self) -> None:
        with self.assertRaises(AuthenticationError):
            validate_auth_session("")

    def test_validate_auth_session_rejects_invalid_session(self) -> None:
        error = HTTPError(
            url="http://127.0.0.1:8001/session",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=None,
        )

        with patch("app.urlopen", side_effect=error):
            with self.assertRaises(AuthenticationError):
                validate_auth_session("worldcup_auth_session=bad-token")


class LobbyDeploymentConfigTest(unittest.TestCase):
    def test_local_host_and_port_are_the_default_without_render_port(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(get_host(), "127.0.0.1")
            self.assertEqual(get_port(), 8003)

    def test_render_port_switches_default_host_to_public_binding(self) -> None:
        with patch.dict("os.environ", {"PORT": "10000"}, clear=True):
            self.assertEqual(get_host(), "0.0.0.0")
            self.assertEqual(get_port(), 10000)

    def test_allowed_origins_can_be_configured_from_environment(self) -> None:
        with patch.dict(
            "os.environ",
            {"ALLOWED_ORIGINS": "https://app.example.com, https://preview.example.com/"},
            clear=True,
        ):
            self.assertEqual(
                get_allowed_origins(),
                ("https://app.example.com", "https://preview.example.com"),
            )


class PredictionTimingTest(unittest.TestCase):
    def test_global_prediction_closes_at_later_of_first_match_and_joined_plus_24_hours(self) -> None:
        lobby = LobbyRecord(
            code="ABCD",
            name="Friends",
            requires_password=False,
            member_count=1,
            point_system="simple",
            custom_settings=None,
            members=[
                LobbyMemberRecord(
                    user_id=1,
                    username="ana",
                    role="admin",
                    joined_at="2026-06-11 18:30:00",
                )
            ],
        )
        schedule = {
            10: MatchSchedule(
                id=10,
                stage="Group Stage",
                group="Group A",
                utc_date=datetime(2026, 6, 11, 19, 0, tzinfo=timezone.utc),
                status="TIMED",
            )
        }

        closes_at = global_prediction_closes_at(lobby, 1, schedule)

        self.assertEqual(closes_at, datetime(2026, 6, 12, 18, 30, tzinfo=timezone.utc))

    def test_bracket_heavy_opens_after_groups_finish_before_knockouts_start(self) -> None:
        schedule = {
            10: MatchSchedule(
                id=10,
                stage="Group Stage",
                group="Group A",
                utc_date=datetime(2026, 6, 28, 2, 0, tzinfo=timezone.utc),
                status="FINISHED",
            ),
            20: MatchSchedule(
                id=20,
                stage="Last 32",
                group=None,
                utc_date=datetime(2026, 6, 28, 19, 0, tzinfo=timezone.utc),
                status="TIMED",
            ),
        }

        with patch("app.current_utc_datetime", return_value=datetime(2026, 6, 28, 18, 0, tzinfo=timezone.utc)):
            self.assertEqual(bracket_heavy_window_state(schedule), "open")

        with patch("app.current_utc_datetime", return_value=datetime(2026, 6, 28, 20, 0, tzinfo=timezone.utc)):
            self.assertEqual(bracket_heavy_window_state(schedule), "closed")

        schedule[10] = MatchSchedule(
            id=10,
            stage="Group Stage",
            group="Group A",
            utc_date=datetime(2026, 6, 28, 2, 0, tzinfo=timezone.utc),
            status="TIMED",
        )

        with patch("app.current_utc_datetime", return_value=datetime(2026, 6, 28, 18, 0, tzinfo=timezone.utc)):
            self.assertEqual(bracket_heavy_window_state(schedule), "awaiting")


class LobbyScoreboardTest(unittest.TestCase):
    def test_build_scoreboard_splits_group_and_knockout_points(self) -> None:
        lobby = LobbyRecord(
            code="ABCD",
            name="Friends",
            requires_password=False,
            member_count=2,
            point_system="simple",
            custom_settings=None,
            members=[
                LobbyMemberRecord(user_id=1, username="ana", role="admin"),
                LobbyMemberRecord(user_id=2, username="juan", role="member"),
            ],
        )
        predictions = [
            MemberMatchPredictionRecord(user_id=1, username="ana", match_id=10, home_score=2, away_score=1),
            MemberMatchPredictionRecord(user_id=1, username="ana", match_id=20, home_score=0, away_score=0),
            MemberMatchPredictionRecord(user_id=2, username="juan", match_id=10, home_score=1, away_score=0),
        ]
        matches = {
            10: FinishedMatch(
                id=10,
                stage="Group Stage",
                group="Group A",
                date="2026-06-14",
                home_team="Mexico",
                away_team="Canada",
                home_score=2,
                away_score=1,
            ),
            20: FinishedMatch(
                id=20,
                stage="Last 32",
                group=None,
                date="2026-07-01",
                home_team="Brazil",
                away_team="Germany",
                home_score=0,
                away_score=0,
            ),
        }

        payload = build_scoreboard_payload(lobby, predictions, matches)
        rows = {row["username"]: row for row in payload["scoreboard"]["general"]}

        self.assertEqual(rows["ana"]["totalPoints"], 12)
        self.assertEqual(rows["ana"]["groupStagePoints"], 4)
        self.assertEqual(rows["ana"]["knockoutStagePoints"], 8)
        self.assertEqual(rows["juan"]["totalPoints"], 2)
        self.assertEqual(rows["juan"]["groupStagePoints"], 2)
        self.assertEqual(rows["juan"]["knockoutStagePoints"], 0)

    def test_choose_team_custom_feature_doubles_matching_team_points(self) -> None:
        lobby = LobbyRecord(
            code="ABCD",
            name="Friends",
            requires_password=False,
            member_count=1,
            point_system="custom",
            custom_settings={
                "enabledFields": {"exactScore": True},
                "values": {"exactScore": "5"},
                "enabledFeatures": {"chooseTeam": True},
                "trackedTeam": "",
            },
            members=[LobbyMemberRecord(user_id=1, username="ana", role="admin")],
        )
        predictions = [MemberMatchPredictionRecord(user_id=1, username="ana", match_id=10, home_score=2, away_score=1)]
        special_predictions = [
            MemberSpecialPredictionRecord(
                user_id=1,
                username="ana",
                prediction_type="chooseTeam",
                team_name="Mexico",
                player_country=None,
                player_name=None,
                player_number=None,
                selections=None,
            )
        ]
        matches = {
            10: FinishedMatch(
                id=10,
                stage="Group Stage",
                group="Group A",
                date="2026-06-14",
                home_team="Mexico",
                away_team="Canada",
                home_score=2,
                away_score=1,
            ),
        }

        payload = build_scoreboard_payload(lobby, predictions, matches, special_predictions)
        row = payload["scoreboard"]["general"][0]

        self.assertEqual(row["totalPoints"], 10)
        self.assertEqual(row["groupStagePoints"], 10)

    def test_choose_team_custom_feature_stacks_with_knockout_double_points(self) -> None:
        lobby = LobbyRecord(
            code="ABCD",
            name="Friends",
            requires_password=False,
            member_count=1,
            point_system="custom",
            custom_settings={
                "enabledFields": {"exactScore": True},
                "values": {"exactScore": "5"},
                "enabledFeatures": {"chooseTeam": True},
                "trackedTeam": "",
            },
            members=[LobbyMemberRecord(user_id=1, username="ana", role="admin")],
        )
        predictions = [MemberMatchPredictionRecord(user_id=1, username="ana", match_id=20, home_score=2, away_score=1)]
        special_predictions = [
            MemberSpecialPredictionRecord(
                user_id=1,
                username="ana",
                prediction_type="chooseTeam",
                team_name="Mexico",
                player_country=None,
                player_name=None,
                player_number=None,
                selections=None,
            )
        ]
        matches = {
            20: FinishedMatch(
                id=20,
                stage="Last 32",
                group=None,
                date="2026-07-01",
                home_team="Mexico",
                away_team="Canada",
                home_score=2,
                away_score=1,
            ),
        }

        payload = build_scoreboard_payload(lobby, predictions, matches, special_predictions)
        row = payload["scoreboard"]["general"][0]

        self.assertEqual(row["totalPoints"], 20)
        self.assertEqual(row["knockoutStagePoints"], 20)

    def test_track_team_scores_exact_furthest_phase_prediction(self) -> None:
        lobby = LobbyRecord(
            code="ABCD",
            name="Friends",
            requires_password=False,
            member_count=1,
            point_system="custom",
            custom_settings={
                "enabledFields": {"trackTeamPoints": True},
                "values": {"trackTeamPoints": "7"},
                "enabledFeatures": {"trackTeam": True},
                "trackedTeam": "Mexico",
            },
            members=[LobbyMemberRecord(user_id=1, username="ana", role="admin")],
        )
        special_predictions = [
            MemberSpecialPredictionRecord(
                user_id=1,
                username="ana",
                prediction_type="trackTeam",
                team_name=None,
                player_country=None,
                player_name=None,
                player_number=None,
                selections={"phase": "Quarter Finals"},
            )
        ]
        matches = {
            10: FinishedMatch(
                id=10,
                stage="Last 32",
                group=None,
                date="2026-07-01",
                home_team="Mexico",
                away_team="Canada",
                home_score=2,
                away_score=1,
            ),
            20: FinishedMatch(
                id=20,
                stage="Quarter Finals",
                group=None,
                date="2026-07-08",
                home_team="Mexico",
                away_team="Brazil",
                home_score=0,
                away_score=1,
            ),
        }

        with patch("app.load_country_results", return_value={"mexico": "Quarter Finals"}):
            payload = build_scoreboard_payload(lobby, [], matches, special_predictions)
        row = payload["scoreboard"]["general"][0]

        self.assertEqual(row["totalPoints"], 7)
        self.assertEqual(row["knockoutStagePoints"], 0)


if __name__ == "__main__":
    unittest.main()
