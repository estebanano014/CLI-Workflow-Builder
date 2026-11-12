import http.client
import json
import os
import shutil
import sys
import tempfile
import threading
import time
import unittest
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.auth import hash_password
from app.persistence import AuthStore, Store
from app.server import make_handler

TOKEN = "tokendeprueba"
USER = "admin"
PASSWORD = "clave1234"


def _req(port, token, method, path, body=None, session=None):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if session:
        headers["X-Session-Token"] = session
    data = json.dumps(body).encode("utf-8") if body is not None else None
    conn.request(method, path, body=data, headers=headers)
    res = conn.getresponse()
    raw = res.read()
    conn.close()
    try:
        parsed = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        parsed = None
    return res.status, parsed


class TestAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.auth_path = os.path.join(cls.tmp, "datos_auth.json")
        cls.store = Store(os.path.join(cls.tmp, "datos_flujos.json"))
        cls.auth_store = AuthStore(cls.auth_path)
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(cls.store, cls.auth_store, TOKEN))
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def setUp(self):
        # Estado limpio entre tests.
        self.auth_store.data = {"schemaVersion": 1, "users": [], "failedAttempts": 0, "lockedUntil": None}
        self.auth_store.save()

    def _registrar(self):
        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/register", {"username": USER, "password": PASSWORD})
        self.assertEqual(status, 201, body)
        return body

    def test_registro_valido(self):
        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/register", {"username": USER, "password": PASSWORD})
        self.assertEqual(status, 201)
        self.assertEqual(body["username"], USER)

    def test_registro_duplicado(self):
        self._registrar()
        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/register", {"username": "ADMIN", "password": PASSWORD})
        self.assertEqual(status, 409)

    def test_registro_password_corta(self):
        status, _ = _req(self.port, TOKEN, "POST", "/v1/auth/register", {"username": USER, "password": "1234567"})
        self.assertEqual(status, 400)

    def test_registro_usuario_invalido(self):
        status, _ = _req(self.port, TOKEN, "POST", "/v1/auth/register", {"username": "  ", "password": PASSWORD})
        self.assertEqual(status, 400)

    def test_login_correcto_e_incorrecto(self):
        self._registrar()
        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/login", {"username": USER, "password": "equivocada"})
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Usuario o contraseña incorrectos")

        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/login", {"username": USER, "password": PASSWORD})
        self.assertEqual(status, 200)
        self.assertIn("token", body)

        # El token de sesión habilita los endpoints de datos.
        status, _ = _req(self.port, TOKEN, "GET", "/v1/rutas", session=body["token"])
        self.assertEqual(status, 200)

    def test_bloqueo_y_desbloqueo(self):
        self._registrar()
        for _ in range(5):
            status, _ = _req(self.port, TOKEN, "POST", "/v1/auth/login", {"username": USER, "password": "mala"})
            self.assertEqual(status, 401)

        # Sexto intento (aun con la correcta) -> bloqueado.
        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/login", {"username": USER, "password": PASSWORD})
        self.assertEqual(status, 429)
        self.assertIn("retryAfter", body)
        self.assertGreater(body["retryAfter"], 0)

        # Simular expiración del bloqueo.
        self.auth_store.data["lockedUntil"] = time.time() - 1
        self.auth_store.save()

        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/login", {"username": USER, "password": PASSWORD})
        self.assertEqual(status, 200)

    def test_misma_password_hashes_distintos(self):
        h1 = hash_password(PASSWORD)
        h2 = hash_password(PASSWORD)
        self.assertNotEqual(h1["salt"], h2["salt"])
        self.assertNotEqual(h1["hash"], h2["hash"])

    def test_datos_sin_sesion_401(self):
        self._registrar()
        status, _ = _req(self.port, TOKEN, "GET", "/v1/rutas")  # sin X-Session-Token
        self.assertEqual(status, 401)

    def test_cambio_password_invalida_sesion(self):
        self._registrar()
        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/login", {"username": USER, "password": PASSWORD})
        token = body["token"]

        status, body = _req(
            self.port, TOKEN, "POST", "/v1/auth/change-password",
            {"current": PASSWORD, "new": "nuevaclave123"}, session=token,
        )
        self.assertEqual(status, 200)

        # La sesión anterior queda invalidada.
        status, _ = _req(self.port, TOKEN, "GET", "/v1/rutas", session=token)
        self.assertEqual(status, 401)

        # El login con la nueva contraseña funciona.
        status, body = _req(self.port, TOKEN, "POST", "/v1/auth/login", {"username": USER, "password": "nuevaclave123"})
        self.assertEqual(status, 200)

    def test_auth_sin_password_en_claro(self):
        self._registrar()
        with open(self.auth_path, encoding="utf-8") as f:
            texto = f.read()
        self.assertNotIn(PASSWORD, texto)


if __name__ == "__main__":
    unittest.main()
