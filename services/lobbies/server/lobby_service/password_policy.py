from __future__ import annotations


def password_errors(password: str) -> list[str]:
    errors: list[str] = []

    if len(password) < 8:
        errors.append("At least 8 characters")

    if not any(character.isupper() for character in password):
        errors.append("One uppercase letter")

    if not any(character.islower() for character in password):
        errors.append("One lowercase letter")

    if not any(character.isdigit() for character in password):
        errors.append("One number")

    return errors


def is_valid_password(password: str) -> bool:
    return not password_errors(password)
