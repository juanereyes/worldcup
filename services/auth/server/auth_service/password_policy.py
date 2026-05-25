from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PasswordRequirement:
    key: str
    message: str
    is_valid: bool


def evaluate_password(password: str) -> list[PasswordRequirement]:
    return [
        PasswordRequirement(
            key="length",
            message="At least 8 characters",
            is_valid=len(password) >= 8,
        ),
        PasswordRequirement(
            key="uppercase",
            message="One uppercase letter",
            is_valid=any(character.isupper() for character in password),
        ),
        PasswordRequirement(
            key="lowercase",
            message="One lowercase letter",
            is_valid=any(character.islower() for character in password),
        ),
        PasswordRequirement(
            key="number",
            message="One number",
            is_valid=any(character.isdigit() for character in password),
        ),
    ]


def password_errors(password: str) -> list[str]:
    return [
        requirement.message
        for requirement in evaluate_password(password)
        if not requirement.is_valid
    ]


def is_valid_password(password: str) -> bool:
    return not password_errors(password)
