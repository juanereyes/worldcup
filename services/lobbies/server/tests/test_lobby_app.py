from __future__ import annotations

import unittest
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

from app import AuthenticationError, FinishedMatch, build_scoreboard_payload, validate_auth_session
from lobby_service.database import LobbyMemberRecord, LobbyRecord, MemberMatchPredictionRecord


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
                home_score=2,
                away_score=1,
            ),
            20: FinishedMatch(
                id=20,
                stage="Last 32",
                group=None,
                date="2026-07-01",
                home_score=0,
                away_score=0,
            ),
        }

        payload = build_scoreboard_payload(lobby, predictions, matches)
        rows = {row["username"]: row for row in payload["scoreboard"]["general"]}

        self.assertEqual(rows["ana"]["totalPoints"], 8)
        self.assertEqual(rows["ana"]["groupStagePoints"], 4)
        self.assertEqual(rows["ana"]["knockoutStagePoints"], 4)
        self.assertEqual(rows["juan"]["totalPoints"], 2)
        self.assertEqual(rows["juan"]["groupStagePoints"], 2)
        self.assertEqual(rows["juan"]["knockoutStagePoints"], 0)


if __name__ == "__main__":
    unittest.main()
