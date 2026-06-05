from __future__ import annotations

from dataclasses import dataclass

SIMPLE_MATCH_EXACT_SCORE_POINTS = 4
SIMPLE_MATCH_CORRECT_RESULT_POINTS = 2
SIMPLE_MATCH_WRONG_RESULT_POINTS = 0

SIMPLE_GLOBAL_POINTS = {
    "champion": 15,
    "runner_up": 10,
    "top_scorer": 8,
}

REGULAR_MATCH_EXACT_SCORE_POINTS = 5
REGULAR_MATCH_CORRECT_RESULT_AND_GOAL_DIFFERENCE_POINTS = 4
REGULAR_MATCH_CORRECT_RESULT_POINTS = 3
REGULAR_MATCH_ONE_CORRECT_GOAL_WRONG_RESULT_POINTS = 1
REGULAR_MATCH_WRONG_RESULT_POINTS = 0

REGULAR_GLOBAL_POINTS = {
    "champion": 20,
    "runner_up": 12,
    "third_place": 8,
    "fourth_place": 6,
    "top_scorer": 10,
    "golden_ball": 8,
}


@dataclass(frozen=True)
class ScorePrediction:
    home: int
    away: int


def score_simple_match_prediction(prediction: ScorePrediction, actual: ScorePrediction) -> int:
    if prediction == actual:
        return SIMPLE_MATCH_EXACT_SCORE_POINTS

    if _result(prediction) == _result(actual):
        return SIMPLE_MATCH_CORRECT_RESULT_POINTS

    return SIMPLE_MATCH_WRONG_RESULT_POINTS


def score_simple_global_predictions(predictions: dict[str, str], actuals: dict[str, str]) -> int:
    return sum(
        points
        for key, points in SIMPLE_GLOBAL_POINTS.items()
        if _normalized(predictions.get(key)) == _normalized(actuals.get(key))
    )


def score_regular_match_prediction(prediction: ScorePrediction, actual: ScorePrediction) -> int:
    if prediction == actual:
        return REGULAR_MATCH_EXACT_SCORE_POINTS

    prediction_result = _result(prediction)
    actual_result = _result(actual)

    if prediction_result == actual_result:
        if actual_result != "draw" and _goal_difference(prediction) == _goal_difference(actual):
            return REGULAR_MATCH_CORRECT_RESULT_AND_GOAL_DIFFERENCE_POINTS

        return REGULAR_MATCH_CORRECT_RESULT_POINTS

    if prediction.home == actual.home or prediction.away == actual.away:
        return REGULAR_MATCH_ONE_CORRECT_GOAL_WRONG_RESULT_POINTS

    return REGULAR_MATCH_WRONG_RESULT_POINTS


def score_regular_global_predictions(predictions: dict[str, str], actuals: dict[str, str]) -> int:
    return sum(
        points
        for key, points in REGULAR_GLOBAL_POINTS.items()
        if _normalized(predictions.get(key)) == _normalized(actuals.get(key))
    )


def _result(score: ScorePrediction) -> str:
    if score.home > score.away:
        return "home"

    if score.away > score.home:
        return "away"

    return "draw"


def _goal_difference(score: ScorePrediction) -> int:
    return abs(score.home - score.away)


def _normalized(value: str | None) -> str:
    return (value or "").strip().casefold()
