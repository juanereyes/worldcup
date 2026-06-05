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


def _result(score: ScorePrediction) -> str:
    if score.home > score.away:
        return "home"

    if score.away > score.home:
        return "away"

    return "draw"


def _normalized(value: str | None) -> str:
    return (value or "").strip().casefold()
