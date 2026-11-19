import http.client
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.persistence import AuthStore, Store
from app.server import make_handler

TOKEN = "tokendeprueba"


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


class TestApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        store = Store(os.path.join(cls.tmp, "datos_flujos.json"))
        auth_store = AuthStore(os.path.join(cls.tmp, "datos_auth.json"))
        handler = make_handler(store, auth_store, TOKEN)
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

        # Cuenta y sesión para los tests de datos.
        _req(cls.port, TOKEN, "POST", "/v1/auth/register", {"username": "tester", "password": "clave1234"})
        status, body = _req(cls.port, TOKEN, "POST", "/v1/auth/login", {"username": "tester", "password": "clave1234"})
        assert status == 200, body
        cls.session = body["token"]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_salud_sin_token_401(self):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        conn.request("GET", "/v1/salud")
        res = conn.getresponse()
        res.read()
        self.assertEqual(res.status, 401)
        conn.close()

    def test_salud_con_token(self):
        status, body = _req(self.port, TOKEN, "GET", "/v1/salud")
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])

    def test_crud_ruta(self):
        status, body = _req(self.port, TOKEN, "POST", "/v1/rutas", {"nombre": "Mi ruta"}, session=self.session)
        self.assertEqual(status, 201)
        ruta_id = body["ruta"]["id"]

        status, body = _req(self.port, TOKEN, "GET", "/v1/rutas", session=self.session)
        self.assertEqual(len(body["rutas"]), 1)

        status, _ = _req(self.port, TOKEN, "DELETE", f"/v1/rutas/{ruta_id}", session=self.session)
        self.assertEqual(status, 204)

        status, body = _req(self.port, TOKEN, "GET", "/v1/rutas", session=self.session)
        self.assertEqual(len(body["rutas"]), 0)

    def test_nombre_duplicado_409(self):
        _req(self.port, TOKEN, "POST", "/v1/rutas", {"nombre": "Duplicada"}, session=self.session)
        status, body = _req(self.port, TOKEN, "POST", "/v1/rutas", {"nombre": "Duplicada"}, session=self.session)
        self.assertEqual(status, 409)

    def test_import_export(self):
        payload = {
            "schemaVersion": 2,
            "rutas": [{"nombre": "a"}, {"nombre": "b"}],
            "recetas": [{"titulo": "r1"}],
            "ajustes": {"variablesGlobales": [], "soPreferido": "linux"},
        }
        status, body = _req(self.port, TOKEN, "POST", "/v1/import", payload, session=self.session)
        self.assertEqual(status, 200)
        self.assertEqual(body["importados"], {"rutas": 2, "recetas": 1})

        status, body = _req(self.port, TOKEN, "GET", "/v1/export", session=self.session)
        self.assertEqual(status, 200)
        self.assertEqual(len(body["rutas"]), 2)
        self.assertEqual(body["ajustes"]["soPreferido"], "linux")

    def test_import_estructura_invalida_400(self):
        status, _ = _req(self.port, TOKEN, "POST", "/v1/import", {"foo": "bar"}, session=self.session)
        self.assertEqual(status, 400)

    def test_historial_y_estadisticas(self):
        # Limpiar historial para partir de un estado conocido.
        _req(self.port, TOKEN, "DELETE", "/v1/historial", session=self.session)

        status, body = _req(
            self.port, TOKEN, "POST", "/v1/historial",
            {"tipo": "ruta", "refId": "r1", "nombre": "Desplegar", "pasosHechos": 3, "pasosTotal": 3},
            session=self.session,
        )
        self.assertEqual(status, 201)
        self.assertIn("id", body["registro"])

        status, body = _req(self.port, TOKEN, "GET", "/v1/historial", session=self.session)
        self.assertEqual(status, 200)
        self.assertEqual(len(body["historial"]), 1)

        status, body = _req(self.port, TOKEN, "GET", "/v1/estadisticas", session=self.session)
        self.assertEqual(status, 200)
        self.assertEqual(body["estadisticas"]["totalEjecuciones"], 1)
        self.assertEqual(body["estadisticas"]["pasosCompletados"], 3)

    def test_historial_sin_sesion_401(self):
        status, _ = _req(self.port, TOKEN, "GET", "/v1/historial")
        self.assertEqual(status, 401)


if __name__ == "__main__":
    unittest.main()
