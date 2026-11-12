"""Autenticación local: hash de contraseñas, políticas y constantes de bloqueo.

La contraseña nunca se guarda en claro. Se deriva con `hashlib.scrypt` (o
`pbkdf2_hmac` si scrypt no está disponible en el intérprete embebido) con sal
aleatoria de 16 bytes. Los parámetros del algoritmo se guardan junto al hash
para poder migrarlos en el futuro.
"""
import hashlib
import hmac
import secrets
import unicodedata

SALT_BYTES = 16

# Parámetros por defecto de derivación (se guardan en el archivo por registro).
SCRYPT = {"n": 16384, "r": 8, "p": 1, "dklen": 32}
PBKDF2 = {"iterations": 600_000, "dklen": 32}

PASSWORD_MIN = 8
PASSWORD_MAX = 128
USERNAME_MAX = 64

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 30


def normalizar(texto: str) -> str:
    """Normalización Unicode NFKC (para usuario y contraseña)."""
    return unicodedata.normalize("NFKC", texto)


def normalizar_username(username):
    """Valida y normaliza el nombre de usuario. Devuelve (usuario, error)."""
    if not isinstance(username, str):
        return None, "El usuario no es válido"
    u = unicodedata.normalize("NFKC", username)
    if u != username.strip():
        return None, "El usuario no puede empezar ni terminar con espacios"
    u = u.strip()
    if not u:
        return None, "El usuario es obligatorio"
    if len(u) > USERNAME_MAX:
        return None, f"El usuario no puede superar {USERNAME_MAX} caracteres"
    return u, None


def validar_password(password):
    """Valida la política de contraseña. Devuelve (ok, mensaje)."""
    if not isinstance(password, str):
        return False, "La contraseña no es válida"
    if password != password.strip():
        return False, "La contraseña no puede empezar ni terminar con espacios"
    p = unicodedata.normalize("NFKC", password)
    if len(p) < PASSWORD_MIN:
        return False, f"La contraseña debe tener al menos {PASSWORD_MIN} caracteres"
    if len(p) > PASSWORD_MAX:
        return False, f"La contraseña no puede superar {PASSWORD_MAX} caracteres"
    return True, None


def _scrypt_digest(password: str, salt: bytes, params: dict) -> bytes:
    n = params["n"]
    r = params["r"]
    p = params["p"]
    return hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=n,
        r=r,
        p=p,
        dklen=params["dklen"],
        maxmem=128 * n * r * 2 + 1024,
    )


def hash_password(password: str) -> dict:
    """Deriva una contraseña con sal aleatoria. Devuelve el registro a persistir."""
    salt = secrets.token_bytes(SALT_BYTES)
    try:
        digest = _scrypt_digest(password, salt, SCRYPT)
        algorithm = "scrypt"
        params = dict(SCRYPT)
    except (AttributeError, ValueError, OSError):
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            PBKDF2["iterations"],
            dklen=PBKDF2["dklen"],
        )
        algorithm = "pbkdf2_hmac"
        params = dict(PBKDF2)
    return {
        "algorithm": algorithm,
        "salt": salt.hex(),
        "hash": digest.hex(),
        "params": params,
    }


def verify_password(password, record) -> bool:
    """Verifica una contraseña contra un registro persistido (comparación en tiempo constante)."""
    if not isinstance(password, str) or not isinstance(record, dict):
        return False
    try:
        salt = bytes.fromhex(record["salt"])
        expected = bytes.fromhex(record["hash"])
    except (KeyError, ValueError, TypeError):
        return False
    algorithm = record.get("algorithm", "scrypt")
    params = record.get("params") or {}
    try:
        if algorithm == "pbkdf2_hmac":
            actual = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt,
                params.get("iterations", PBKDF2["iterations"]),
                dklen=params.get("dklen", PBKDF2["dklen"]),
            )
        else:
            actual = _scrypt_digest(
                password, salt, {**SCRYPT, **params}
            )
    except (ValueError, TypeError, AttributeError, OSError):
        return False
    return hmac.compare_digest(actual, expected)


def find_user(users, raw_username):
    """Busca un usuario en la lista comparando sin distinguir mayúsculas (NFKC + casefold)."""
    if not isinstance(raw_username, str):
        return None
    target = normalizar(raw_username).strip().casefold()
    for u in users:
        if normalizar(u.get("username", "")).strip().casefold() == target:
            return u
    return None
