from __future__ import annotations

import unittest
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

from app import AuthenticationError, validate_auth_session


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


if __name__ == "__main__":
    unittest.main()
