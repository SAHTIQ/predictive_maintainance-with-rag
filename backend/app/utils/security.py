import os
import hmac
import hashlib

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2 with SHA-256 and a random 16-byte salt.
    Returns format: {salt_hex}${key_hex}
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}${key.hex()}"

def verify_password(plain_password: str, hashed_value: str) -> bool:
    """
    Verifies a plaintext password against a stored {salt_hex}${key_hex} hash.
    Uses constant-time comparison to protect against timing attacks.
    """
    if not hashed_value or "$" not in hashed_value:
        return False
    try:
        salt_hex, key_hex = hashed_value.split("$", 1)
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        actual_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(actual_key, expected_key)
    except Exception:
        return False
