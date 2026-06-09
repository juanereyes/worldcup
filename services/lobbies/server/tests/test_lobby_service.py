from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from argon2 import PasswordHasher

from lobby_service import database
from lobby_service.database import (
    InvalidLobbyPasswordCredentialsError,
    InvalidLobbyPasswordError,
    InvalidPointSystemError,
    LOBBY_CODE_ALPHABET,
    LobbyCodeExhaustedError,
    LobbyMemberAlreadyExistsError,
    LobbyMemberNotFoundError,
    LobbyNotFoundError,
    LobbyPermissionError,
    LobbyPasswordRequiredError,
    add_lobby_member,
    connect,
    copy_default_predictions_to_lobby,
    create_lobby,
    delete_lobby,
    get_lobby,
    get_lobby_for_member,
    initialize_database,
    list_default_match_predictions,
    list_user_lobbies,
    list_match_predictions,
    remove_lobby_member,
    remove_lobby_member_by_admin,
    remove_user_from_all_lobbies,
    save_default_match_prediction,
    save_match_prediction,
    set_lobby_custom_settings,
    set_lobby_point_system,
)
from lobby_service.scoring import (
    ScorePrediction,
    score_regular_global_predictions,
    score_regular_match_prediction,
    score_simple_global_predictions,
    score_simple_match_prediction,
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
        self.assertEqual(stored_lobby.member_count, 1)
        self.assertIsNone(stored_lobby.point_system)
        self.assertEqual(stored_lobby.members[0].username, "juan")
        self.assertEqual(stored_lobby.members[0].role, "admin")
        self.assertFalse(stored_lobby.requires_password)

    def test_create_lobby_hashes_optional_password_with_argon2id(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=7,
            created_by_username="juan",
            name="Friends",
            password="Worldcup1",
        )
        row = self.connection.execute(
            "SELECT password_hash FROM lobbies WHERE code = ?",
            (lobby.code,),
        ).fetchone()

        self.assertTrue(lobby.requires_password)
        self.assertIsNotNone(row)
        self.assertTrue(row["password_hash"].startswith("$argon2id$"))
        PasswordHasher().verify(row["password_hash"], "Worldcup1")

    def test_create_lobby_can_start_with_point_system(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=7,
            created_by_username="juan",
            name="Friends",
            point_system="regular",
        )

        self.assertEqual(lobby.point_system, "regular")
        self.assertIsNone(lobby.custom_settings)

    def test_create_lobby_can_start_with_custom_settings(self) -> None:
        settings = {"values": {"exactScore": "5"}, "enabledFields": {"exactScore": True}}

        lobby = create_lobby(
            self.connection,
            created_by_user_id=7,
            created_by_username="juan",
            name="Friends",
            point_system="custom",
            custom_settings=settings,
        )

        self.assertEqual(lobby.point_system, "custom")
        self.assertEqual(lobby.custom_settings, settings)

    def test_create_lobby_rejects_invalid_optional_password(self) -> None:
        with self.assertRaises(InvalidLobbyPasswordError):
            create_lobby(
                self.connection,
                created_by_user_id=7,
                created_by_username="juan",
                password="password",
            )

    def test_create_lobby_rejects_custom_settings_without_custom_point_system(self) -> None:
        with self.assertRaises(InvalidPointSystemError):
            create_lobby(
                self.connection,
                created_by_user_id=7,
                created_by_username="juan",
                point_system="regular",
                custom_settings={"values": {}},
            )

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
        self.assertEqual(updated_lobby.member_count, 2)
        self.assertEqual(updated_lobby.members[1].role, "member")

    def test_add_lobby_member_requires_password_for_protected_lobby(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
            password="Worldcup1",
        )

        with self.assertRaises(LobbyPasswordRequiredError):
            add_lobby_member(
                self.connection,
                code=lobby.code,
                user_id=2,
                username="ana",
            )

        with self.assertRaises(InvalidLobbyPasswordCredentialsError):
            add_lobby_member(
                self.connection,
                code=lobby.code,
                user_id=2,
                username="ana",
                password="Wrongpass1",
            )

        updated_lobby = add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
            password="Worldcup1",
        )

        self.assertEqual([member.username for member in updated_lobby.members], ["juan", "ana"])

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

    def test_list_user_lobbies_returns_only_memberships(self) -> None:
        first = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
            name="First",
        )
        second = create_lobby(
            self.connection,
            created_by_user_id=2,
            created_by_username="ana",
            name="Second",
        )

        add_lobby_member(
            self.connection,
            code=second.code,
            user_id=1,
            username="juan",
        )

        lobbies = list_user_lobbies(self.connection, 1)

        self.assertEqual({lobby.code for lobby in lobbies}, {first.code, second.code})
        self.assertEqual(list_user_lobbies(self.connection, 99), [])

    def test_get_lobby_for_member_requires_membership(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        visible_lobby = get_lobby_for_member(self.connection, code=lobby.code, user_id=1)

        self.assertEqual(visible_lobby.code, lobby.code)
        with self.assertRaises(LobbyPermissionError):
            get_lobby_for_member(self.connection, code=lobby.code, user_id=99)

    def test_save_match_prediction_upserts_member_prediction(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        first = save_match_prediction(
            self.connection,
            code=lobby.code,
            user_id=1,
            match_id=1001,
            home_score=2,
            away_score=1,
        )
        second = save_match_prediction(
            self.connection,
            code=lobby.code,
            user_id=1,
            match_id=1001,
            home_score=3,
            away_score=None,
        )
        predictions = list_match_predictions(self.connection, code=lobby.code, user_id=1)

        self.assertEqual(first.home_score, 2)
        self.assertEqual(second.home_score, 3)
        self.assertIsNone(second.away_score)
        self.assertEqual(len(predictions), 1)
        self.assertEqual(predictions[0].match_id, 1001)
        self.assertEqual(predictions[0].home_score, 3)
        self.assertIsNone(predictions[0].away_score)

    def test_save_match_prediction_rejects_non_member(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        with self.assertRaises(LobbyPermissionError):
            save_match_prediction(
                self.connection,
                code=lobby.code,
                user_id=99,
                match_id=1001,
                home_score=2,
                away_score=1,
            )

    def test_default_match_prediction_upserts_without_lobby(self) -> None:
        save_default_match_prediction(
            self.connection,
            user_id=1,
            match_id=1001,
            home_score=2,
            away_score=1,
        )
        save_default_match_prediction(
            self.connection,
            user_id=1,
            match_id=1001,
            home_score=None,
            away_score=3,
        )
        predictions = list_default_match_predictions(self.connection, user_id=1)

        self.assertEqual(len(predictions), 1)
        self.assertEqual(predictions[0].match_id, 1001)
        self.assertIsNone(predictions[0].home_score)
        self.assertEqual(predictions[0].away_score, 3)

    def test_copy_default_predictions_to_lobby_can_limit_by_match_ids(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        save_default_match_prediction(
            self.connection,
            user_id=1,
            match_id=1001,
            home_score=2,
            away_score=1,
        )
        save_default_match_prediction(
            self.connection,
            user_id=1,
            match_id=1002,
            home_score=0,
            away_score=0,
        )

        copied = copy_default_predictions_to_lobby(
            self.connection,
            code=lobby.code,
            user_id=1,
            match_ids=[1002],
        )
        lobby_predictions = list_match_predictions(self.connection, code=lobby.code, user_id=1)

        self.assertEqual([prediction.match_id for prediction in copied], [1002])
        self.assertEqual(len(lobby_predictions), 1)
        self.assertEqual(lobby_predictions[0].match_id, 1002)
        self.assertEqual(lobby_predictions[0].home_score, 0)
        self.assertEqual(lobby_predictions[0].away_score, 0)

    def test_remove_lobby_member_deletes_empty_lobby(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
            name="First",
        )

        remove_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=1,
        )

        with self.assertRaises(LobbyNotFoundError):
            get_lobby(self.connection, lobby.code)
        self.assertEqual(list_user_lobbies(self.connection, 1), [])

    def test_remove_lobby_member_keeps_lobby_with_remaining_members(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
            name="First",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )

        remove_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=1,
        )

        updated_lobby = get_lobby(self.connection, lobby.code)

        self.assertEqual([member.username for member in updated_lobby.members], ["ana"])
        self.assertEqual(updated_lobby.member_count, 1)
        self.assertEqual(list_user_lobbies(self.connection, 1), [])

    def test_remove_user_from_all_lobbies_removes_memberships_and_empty_lobbies(self) -> None:
        solo_lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
            name="Solo",
        )
        shared_lobby = create_lobby(
            self.connection,
            created_by_user_id=2,
            created_by_username="ana",
            name="Shared",
        )
        add_lobby_member(
            self.connection,
            code=shared_lobby.code,
            user_id=1,
            username="juan",
        )
        save_default_match_prediction(
            self.connection,
            user_id=1,
            match_id=1001,
            home_score=2,
            away_score=1,
        )

        removed_count = remove_user_from_all_lobbies(self.connection, 1)

        self.assertEqual(removed_count, 2)
        with self.assertRaises(LobbyNotFoundError):
            get_lobby(self.connection, solo_lobby.code)
        updated_shared_lobby = get_lobby(self.connection, shared_lobby.code)
        self.assertEqual([member.username for member in updated_shared_lobby.members], ["ana"])
        self.assertEqual(list_user_lobbies(self.connection, 1), [])
        self.assertEqual(list_default_match_predictions(self.connection, user_id=1), [])

    def test_initialize_database_backfills_member_count(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )
        self.connection.execute(
            "UPDATE lobbies SET member_count = 0 WHERE code = ?",
            (lobby.code,),
        )
        self.connection.commit()

        initialize_database(self.connection)
        updated_lobby = get_lobby(self.connection, lobby.code)

        self.assertEqual(updated_lobby.member_count, 2)

    def test_remove_lobby_member_rejects_missing_membership(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        with self.assertRaises(LobbyMemberNotFoundError):
            remove_lobby_member(
                self.connection,
                code=lobby.code,
                user_id=99,
            )

    def test_admin_can_remove_lobby_member(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )

        remove_lobby_member_by_admin(
            self.connection,
            code=lobby.code,
            acting_user_id=1,
            target_user_id=2,
        )
        updated_lobby = get_lobby(self.connection, lobby.code)

        self.assertEqual([member.username for member in updated_lobby.members], ["juan"])
        self.assertEqual(updated_lobby.member_count, 1)

    def test_non_admin_cannot_remove_lobby_member(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=3,
            username="luis",
        )

        with self.assertRaises(LobbyPermissionError):
            remove_lobby_member_by_admin(
                self.connection,
                code=lobby.code,
                acting_user_id=2,
                target_user_id=3,
            )

    def test_admin_can_delete_lobby(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )

        delete_lobby(
            self.connection,
            code=lobby.code,
            acting_user_id=1,
        )

        with self.assertRaises(LobbyNotFoundError):
            get_lobby(self.connection, lobby.code)
        self.assertEqual(list_user_lobbies(self.connection, 1), [])
        self.assertEqual(list_user_lobbies(self.connection, 2), [])

    def test_non_admin_cannot_delete_lobby(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )

        with self.assertRaises(LobbyPermissionError):
            delete_lobby(
                self.connection,
                code=lobby.code,
                acting_user_id=2,
            )

    def test_admin_can_set_simple_point_system(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        updated_lobby = set_lobby_point_system(
            self.connection,
            code=lobby.code,
            acting_user_id=1,
            point_system="simple",
        )

        self.assertEqual(updated_lobby.point_system, "simple")
        self.assertEqual(get_lobby(self.connection, lobby.code).point_system, "simple")

    def test_admin_can_set_regular_point_system(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        updated_lobby = set_lobby_point_system(
            self.connection,
            code=lobby.code,
            acting_user_id=1,
            point_system="regular",
        )

        self.assertEqual(updated_lobby.point_system, "regular")

    def test_non_admin_cannot_set_point_system(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )

        with self.assertRaises(LobbyPermissionError):
            set_lobby_point_system(
                self.connection,
                code=lobby.code,
                acting_user_id=2,
                point_system="simple",
            )

    def test_set_point_system_rejects_unknown_setting(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )

        with self.assertRaises(InvalidPointSystemError):
            set_lobby_point_system(
                self.connection,
                code=lobby.code,
                acting_user_id=1,
                point_system="chaos",
            )

    def test_admin_can_set_custom_settings(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        settings = {
            "values": {"exactScore": "5"},
            "enabledFields": {"exactScore": True},
            "enabledFeatures": {"trackTeam": True},
            "trackedTeam": "Colombia",
        }

        updated_lobby = set_lobby_custom_settings(
            self.connection,
            code=lobby.code,
            acting_user_id=1,
            settings=settings,
        )

        self.assertEqual(updated_lobby.point_system, "custom")
        self.assertEqual(updated_lobby.custom_settings, settings)

    def test_non_admin_cannot_set_custom_settings(self) -> None:
        lobby = create_lobby(
            self.connection,
            created_by_user_id=1,
            created_by_username="juan",
        )
        add_lobby_member(
            self.connection,
            code=lobby.code,
            user_id=2,
            username="ana",
        )

        with self.assertRaises(LobbyPermissionError):
            set_lobby_custom_settings(
                self.connection,
                code=lobby.code,
                acting_user_id=2,
                settings={"values": {}},
            )

    def test_simple_match_scoring(self) -> None:
        actual = ScorePrediction(home=2, away=1)

        self.assertEqual(score_simple_match_prediction(ScorePrediction(home=2, away=1), actual), 4)
        self.assertEqual(score_simple_match_prediction(ScorePrediction(home=3, away=1), actual), 2)
        self.assertEqual(score_simple_match_prediction(ScorePrediction(home=1, away=1), actual), 0)

    def test_simple_global_scoring(self) -> None:
        points = score_simple_global_predictions(
            {
                "champion": "Brazil",
                "runner_up": "Spain",
                "top_scorer": "Mbappe",
            },
            {
                "champion": "brazil",
                "runner_up": "Argentina",
                "top_scorer": " Mbappe ",
            },
        )

        self.assertEqual(points, 23)

    def test_regular_match_scoring_exact_score(self) -> None:
        points = score_regular_match_prediction(
            ScorePrediction(home=2, away=1),
            ScorePrediction(home=2, away=1),
        )

        self.assertEqual(points, 5)

    def test_regular_match_scoring_correct_winner_and_goal_difference(self) -> None:
        points = score_regular_match_prediction(
            ScorePrediction(home=3, away=1),
            ScorePrediction(home=2, away=0),
        )

        self.assertEqual(points, 4)

    def test_regular_match_scoring_correct_result_without_exact_score(self) -> None:
        winner_points = score_regular_match_prediction(
            ScorePrediction(home=4, away=1),
            ScorePrediction(home=2, away=0),
        )
        draw_points = score_regular_match_prediction(
            ScorePrediction(home=2, away=2),
            ScorePrediction(home=1, away=1),
        )

        self.assertEqual(winner_points, 3)
        self.assertEqual(draw_points, 3)

    def test_regular_match_scoring_wrong_result_with_one_correct_goal(self) -> None:
        home_goal_points = score_regular_match_prediction(
            ScorePrediction(home=2, away=2),
            ScorePrediction(home=2, away=1),
        )
        away_goal_points = score_regular_match_prediction(
            ScorePrediction(home=1, away=1),
            ScorePrediction(home=2, away=1),
        )

        self.assertEqual(home_goal_points, 1)
        self.assertEqual(away_goal_points, 1)

    def test_regular_match_scoring_wrong_result_without_correct_goals(self) -> None:
        points = score_regular_match_prediction(
            ScorePrediction(home=0, away=2),
            ScorePrediction(home=2, away=1),
        )

        self.assertEqual(points, 0)

    def test_regular_global_scoring(self) -> None:
        points = score_regular_global_predictions(
            {
                "champion": "Brazil",
                "runner_up": "Spain",
                "third_place": "France",
                "fourth_place": "Portugal",
                "top_scorer": "Mbappe",
                "golden_ball": "Vinicius",
            },
            {
                "champion": "brazil",
                "runner_up": "Argentina",
                "third_place": "France",
                "fourth_place": "Portugal",
                "top_scorer": "Haaland",
                "golden_ball": " vinicius ",
            },
        )

        self.assertEqual(points, 42)


if __name__ == "__main__":
    unittest.main()
