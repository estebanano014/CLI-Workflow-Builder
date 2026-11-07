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

from app.persistence import Store
from app.server import make_handler

TOKEN = "tokendeprueba"


def _req(port, token, method, path, body=None):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
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
        handler = make_handler(store, TOKEN)
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

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
        status, body = _req(self.port, TOKEN, "POST", "/v1/rutas", {"nombre": "Mi ruta"})
        self.assertEqual(status, 201)
        ruta_id = body["ruta"]["id"]

        status, body = _req(self.port, TOKEN, "GET", "/v1/rutas")
        self.assertEqual(len(body["rutas"]), 1)

        status, _ = _req(self.port, TOKEN, "DELETE", f"/v1/rutas/{ruta_id}")
        self.assertEqual(status, 204)

        status, body = _req(self.port, TOKEN, "GET", "/v1/rutas")
        self.assertEqual(len(body["rutas"]), 0)

    def test_nombre_duplicado_409(self):
        _req(self.port, TOKEN, "POST", "/v1/rutas", {"nombre": "Duplicada"})
        status, body = _req(self.port, TOKEN, "POST", "/v1/rutas", {"nombre": "Duplicada"})
        self.assertEqual(status, 409)

    def test_import_export(self):
        payload = {
            "schemaVersion": 1,
            "rutas": [{"nombre": "a"}, {"nombre": "b"}],
            "recetas": [{"titulo": "r1"}],
            "ajustes": {"variablesGlobales": [], "soPreferido": "linux"},
        }
        status, body = _req(self.port, TOKEN, "POST", "/v1/import", payload)
        self.assertEqual(status, 200)
        self.assertEqual(body["importados"], {"rutas": 2, "recetas": 1})

        status, body = _req(self.port, TOKEN, "GET", "/v1/export")
        self.assertEqual(status, 200)
        self.assertEqual(len(body["rutas"]), 2)
        self.assertEqual(body["ajustes"]["soPreferido"], "linux")

    def test_import_estructura_invalida_400(self):
        status, _ = _req(self.port, TOKEN, "POST", "/v1/import", {"foo": "bar"})
        self.assertEqual(status, 400)


if __name__ == "__main__":
    unittest.main()
