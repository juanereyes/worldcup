from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from argon2 import PasswordHasher

from auth_service.database import (
    DuplicateUserError,
    InvalidCredentialsError,
    InvalidPasswordError,
    authenticate_user,
    connect,
    create_session,
    create_user,
    delete_session,
    get_user_for_session,
    initialize_database,
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
        create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )

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

    def test_authenticate_user_rejects_bad_credentials(self) -> None:
        create_user(
            self.connection,
            username="juan",
            email="juan@example.com",
            display_name="Juan",
            password="Worldcup1",
        )

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


if __name__ == "__main__":
    unittest.main()
