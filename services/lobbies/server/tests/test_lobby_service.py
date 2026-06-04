from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from lobby_service import database
from lobby_service.database import (
    LOBBY_CODE_ALPHABET,
    LobbyCodeExhaustedError,
    LobbyMemberAlreadyExistsError,
    add_lobby_member,
    connect,
    create_lobby,
    get_lobby,
    initialize_database,
)


class LobbyServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_dir.name) / "lobbies.sqlite3"
        self.connection = connect(self.database_path)
        initialize_database(self.connection)

    def tearDown(self) -> None:
        self.connection.close()
        self.temp_dir.cleanup()

    def test_lobby_code_alphabet_excludes_confusing_digits(self) -> None:
        self.assertNotIn("0", LOBBY_CODE_ALPHABET)
        self.assertNotIn("1", LOBBY_CODE_ALPHABET)

    def test_create_lobby_stores_admin_member(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=7,
            created_by_username="juan",
            name="Friends",
        )

        stored_lobby = get_lobby(self.connection, lobby.code)

        self.assertEqual(len(stored_lobby.code), 4)
        self.assertEqual(stored_lobby.code, stored_lobby.code.upper())
        self.assertEqual(stored_lobby.name, "Friends")
        self.assertEqual(stored_lobby.members[0].username, "juan")
        self.assertEqual(stored_lobby.members[0].role, "admin")

    def test_create_lobby_retries_when_code_collides(self) -> None:
        with patch.object(database, "generate_lobby_code", side_effect=["ABCD", "ABCD", "WXYZ"]):
            first = create_lobby(
                self.connection,
                created_by_user_id=1,
                created_by_username="juan",
            )
            second = create_lobby(
                self.connection,
                created_by_user_id=2,
                created_by_username="ana",
            )

        self.assertEqual(first.code, "ABCD")
        self.assertEqual(second.code, "WXYZ")

    def test_add_lobby_member_adds_user_to_existing_lobby(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        updated_lobby = add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )

        self.assertEqual([member.username for member in updated_lobby.members], ["juan", "ana"])
        self.assertEqual(updated_lobby.members[1].role, "member")

    def test_add_lobby_member_rejects_existing_member(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        with self.assertRaises(LobbyMemberAlreadyExistsError):
            add_lobby_member(
                self.connection,
                code=lobby.code,
                user_id=1,
                username="juan",
            )

    def test_create_lobby_fails_after_retry_limit(self) -> None:
        with patch.object(database, "generate_lobby_code", return_value="AAAA"):
            create_lobby(
                self.connection,
                created_by_user_id=1,
                created_by_username="juan",
            )

            with self.assertRaises(LobbyCodeExhaustedError):
                create_lobby(
                    self.connection,
                    created_by_user_id=2,
                    created_by_username="ana",
                    max_attempts=1,
                )


if __name__ == "__main__":
    unittest.main()
