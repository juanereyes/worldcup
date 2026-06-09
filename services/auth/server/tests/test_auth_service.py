from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from argon2 import PasswordHasher

from app import get_allowed_origins, get_cookie_secure, get_host, get_port, session_cookie_attributes
from auth_service.database import (
    DuplicateUserError,
    InvalidCredentialsError,
    InvalidPasswordError,
    UnverifiedEmailError,
    authenticate_user,
    connect,
    create_email_verification,
    create_session,
    create_user,
    delete_session,
    delete_user,
    get_user_for_session,
    initialize_database,
    verify_email_token,
)
from auth_service.password_policy import is_valid_password, password_errors


class AuthServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_dir.name) / "auth.sqlite3"
        self.connection = connect(self.database_path)
        initialize_database(self.connection)

    def tearDown(self) -> None:
        self.connection.close()
        self.temp_dir.cleanup()

    def verify_user_email(self, user: object) -> None:
        verification = create_email_verification(self.connection, user)  # type: ignore[arg-type]
        verified_user = verify_email_token(self.connection, verification.token)
        self.assertIsNotNone(verified_user)

    def test_password_policy(self) -> None:
        self.assertFalse(is_valid_password("short"))
        self.assertIn("At least 8 characters", password_errors("Abc1"))
        self.assertTrue(is_valid_password("Worldcup1"))

    def test_create_user_hashes_password_with_argon2id(self) -> None:
        user = create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )

        row = self.connection.execute(
            "SELECT password_hash FROM users WHERE id = ?",
            (user.id,),
        ).fetchone()

        self.assertIsNotNone(row)
        self.assertTrue(row["password_hash"].startswith("$argon2id$"))
        PasswordHasher().verify(row["password_hash"], "Worldcup1")
        self.assertFalse(user.email_verified)

    def test_duplicate_username_and_email_are_rejected(self) -> None:
        create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )

        with self.assertRaises(DuplicateUserError):
            create_user(
                self.connection,
                username="JUAN",
                email="other@example.com",
                display_name="Other",
                password="Worldcup1",
            )

        with self.assertRaises(DuplicateUserError):
            create_user(
                self.connection,
                username="other",
                email="JUAN@example.com",
                display_name="Other",
                password="Worldcup1",
            )

    def test_invalid_password_is_rejected(self) -> None:
        with self.assertRaises(InvalidPasswordError):
            create_user(
                self.connection,
                username="juan",
                email="juan@example.com",
                display_name="Juan",
                password="password",
            )

    def test_authenticate_user_accepts_username_or_email(self) -> None:
        user = create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )
        self.verify_user_email(user)

        by_username = authenticate_user(
            self.connection,
            identifier="juan",
            password="Worldcup1",
        )
        by_email = authenticate_user(
            self.connection,
            identifier="JUAN@example.com",
            password="Worldcup1",
        )

        self.assertEqual(by_username.username, "juan")
        self.assertEqual(by_email.email, "juan@example.com")

    def test_authenticate_user_rejects_unverified_email(self) -> None:
        create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )

        with self.assertRaises(UnverifiedEmailError) as error:
            authenticate_user(
                self.connection,
                identifier="juan",
                password="Worldcup1",
            )
        self.assertEqual(error.exception.email, "juan@example.com")

        with self.assertRaises(InvalidCredentialsError):
            authenticate_user(
                self.connection,
                identifier="juan",
                password="Wrongpass1",
            )

    def test_authenticate_user_rejects_bad_credentials(self) -> None:
        user = create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )
        self.verify_user_email(user)

        with self.assertRaises(InvalidCredentialsError):
            authenticate_user(
                self.connection,
                identifier="juan",
                password="Wrongpass1",
            )

    def test_create_session_stores_hashed_token(self) -> None:
        user = create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )
        session = create_session(self.connection, user)

        row = self.connection.execute("SELECT token_hash FROM sessions").fetchone()
        session_user = get_user_for_session(self.connection, session.token)

        self.assertIsNotNone(row)
        self.assertNotEqual(row["token_hash"], session.token)
        self.assertEqual(session_user, user)

    def test_verify_email_token_marks_user_verified_and_consumes_token(self) -> None:
        user = create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )
        verification = create_email_verification(self.connection, user)

        verified_user = verify_email_token(self.connection, verification.token)
        reused_user = verify_email_token(self.connection, verification.token)

        self.assertIsNotNone(verified_user)
        self.assertTrue(verified_user.email_verified)  # type: ignore[union-attr]
        self.assertIsNone(reused_user)

    def test_delete_session_removes_session_lookup(self) -> None:
        user = create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )
        session = create_session(self.connection, user)

        delete_session(self.connection, session.token)

        self.assertIsNone(get_user_for_session(self.connection, session.token))

    def test_delete_user_removes_account_and_sessions(self) -> None:
        user = create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )
        session = create_session(self.connection, user)

        delete_user(self.connection, user.id)

        self.assertIsNone(get_user_for_session(self.connection, session.token))
        with self.assertRaises(InvalidCredentialsError):
            authenticate_user(
                self.connection,
                identifier="juan",
                password="Worldcup1",
            )


class AuthDeploymentConfigTest(unittest.TestCase):
    def test_local_host_and_port_are_the_default_without_render_port(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(get_host(), "127.0.0.1")
            self.assertEqual(get_port(), 8001)

    def test_render_port_switches_default_host_to_public_binding(self) -> None:
        with patch.dict("os.environ", {"PORT": "10000"}, clear=True):
            self.assertEqual(get_host(), "0.0.0.0")
            self.assertEqual(get_port(), 10000)

    def test_allowed_origins_can_be_configured_from_environment(self) -> None:
        with patch.dict(
            "os.environ",
            {"ALLOWED_ORIGINS": "https://app.example.com, https://auth.example.com/"},
            clear=True,
        ):
            self.assertEqual(
                get_allowed_origins(),
                ("https://app.example.com", "https://auth.example.com"),
            )

    def test_local_cookie_defaults_do_not_require_secure_domain_cookie(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            self.assertFalse(get_cookie_secure())
            self.assertEqual(
                session_cookie_attributes(max_age=60),
                "Max-Age=60; Path=/; HttpOnly; SameSite=Lax",
            )

    def test_production_cookie_can_target_shared_domain(self) -> None:
        with patch.dict("os.environ", {"AUTH_COOKIE_DOMAIN": ".picks-football.com"}, clear=True):
            self.assertTrue(get_cookie_secure())
            self.assertEqual(
                session_cookie_attributes(max_age=60),
                "Max-Age=60; Path=/; HttpOnly; SameSite=Lax; Domain=.picks-football.com; Secure",
            )


if __name__ == "__main__":
    unittest.main()
