"""API HTTP local del núcleo (solo 127.0.0.1, token efímero, /v1)."""
import json
import os
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from app.persistence import Store

HOST = "127.0.0.1"


def _nuevo_id():
    return uuid.uuid4().hex


def _normalize_ruta(ruta):
    ruta.setdefault("id", _nuevo_id())
    ruta.setdefault("descripcion", "")
    ruta.setdefault("etiquetas", [])
    ruta.setdefault("favorito", False)
    ruta.setdefault("color", "#2563eb")
    ruta.setdefault("icono", "terminal")
    ruta.setdefault("pasos", [])
    ruta.setdefault("variables", [])
    return ruta


def _normalize_receta(receta):
    receta.setdefault("id", _nuevo_id())
    receta.setdefault("descripcion", "")
    receta.setdefault("entrada", "")
    receta.setdefault("salida", "")
    receta.setdefault("etiquetas", [])
    receta.setdefault("favorito", False)
    receta.setdefault("pasos", [])
    return receta


def make_handler(store, token):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *args):  # silenciar logs por petición
            pass

        # ---------- utilidades ----------
        def _autenticado(self):
            if self.headers.get("Authorization", "") != f"Bearer {token}":
                self._json({"detail": "No autorizado"}, 401)
                return False
            if self.client_address[0] != HOST:
                self._json({"detail": "Acceso remoto no permitido"}, 403)
                return False
            return True

        def _json(self, obj, status=200):
            body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _leer_cuerpo(self):
            length = int(self.headers.get("Content-Length", "0"))
            if length == 0:
                return None
            try:
                return json.loads(self.rfile.read(length).decode("utf-8"))
            except Exception:
                return None

        def _rutear(self):
            """Devuelve (tipo, id) según el path /v1/..."""
            path = urlsplit(self.path).path.strip("/").split("/")
            if len(path) >= 2 and path[0] == "v1":
                recurso = path[1]
                ident = path[2] if len(path) > 2 else None
                return recurso, ident
            return None, None

        # ---------- despacho ----------
        def do_GET(self):
            if not self._autenticado():
                return
            recurso, ident = self._rutear()
            if recurso == "salud":
                return self._json({"ok": True, "schemaVersion": store.data["schemaVersion"]})
            if recurso == "rutas":
                if ident:
                    ruta = next((r for r in store.data["rutas"] if r["id"] == ident), None)
                    if not ruta:
                        return self._json({"detail": "Ruta no encontrada"}, 404)
                    return self._json({"ruta": ruta})
                return self._json({"rutas": store.data["rutas"]})
            if recurso == "recetas":
                if ident:
                    receta = next((r for r in store.data["recetas"] if r["id"] == ident), None)
                    if not receta:
                        return self._json({"detail": "Receta no encontrada"}, 404)
                    return self._json({"receta": receta})
                return self._json({"recetas": store.data["recetas"]})
            if recurso == "ajustes":
                return self._json({"ajustes": store.data["ajustes"]})
            if recurso == "export":
                return self._json(store.data)
            return self._json({"detail": "No encontrado"}, 404)

        def do_POST(self):
            if not self._autenticado():
                return
            recurso, _ = self._rutear()
            body = self._leer_cuerpo()
            if recurso == "rutas":
                return self._crear_ruta(body)
            if recurso == "recetas":
                return self._crear_receta(body)
            if recurso == "import":
                return self._importar(body)
            return self._json({"detail": "No encontrado"}, 404)

        def do_PUT(self):
            if not self._autenticado():
                return
            recurso, ident = self._rutear()
            body = self._leer_cuerpo()
            if recurso == "rutas":
                return self._actualizar_ruta(ident, body)
            if recurso == "recetas":
                return self._actualizar_receta(ident, body)
            if recurso == "ajustes":
                return self._actualizar_ajustes(body)
            return self._json({"detail": "No encontrado"}, 404)

        def do_DELETE(self):
            if not self._autenticado():
                return
            recurso, ident = self._rutear()
            if recurso == "rutas":
                return self._borrar(store.data["rutas"], ident, "Ruta")
            if recurso == "recetas":
                return self._borrar(store.data["recetas"], ident, "Receta")
            return self._json({"detail": "No encontrado"}, 404)

        # ---------- acciones ----------
        def _crear_ruta(self, body):
            ruta = body.get("ruta") if isinstance(body, dict) and "ruta" in body else body
            if not isinstance(ruta, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            nombre = (ruta.get("nombre") or "").strip()
            if not nombre:
                return self._json({"detail": "El nombre es obligatorio"}, 400)
            if any(r["nombre"].strip().lower() == nombre.lower() for r in store.data["rutas"]):
                return self._json({"detail": "Ya existe una ruta con ese nombre"}, 409)
            ruta["nombre"] = nombre
            _normalize_ruta(ruta)
            store.data["rutas"].append(ruta)
            store.save()
            return self._json({"ruta": ruta}, 201)

        def _actualizar_ruta(self, ident, body):
            ruta = body.get("ruta") if isinstance(body, dict) and "ruta" in body else body
            if not isinstance(ruta, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            idx = next((i for i, r in enumerate(store.data["rutas"]) if r["id"] == ident), None)
            if idx is None:
                return self._json({"detail": "Ruta no encontrada"}, 404)
            nombre = (ruta.get("nombre") or "").strip()
            if not nombre:
                return self._json({"detail": "El nombre es obligatorio"}, 400)
            if any(r["nombre"].strip().lower() == nombre.lower() and r["id"] != ident for r in store.data["rutas"]):
                return self._json({"detail": "Ya existe una ruta con ese nombre"}, 409)
            ruta["nombre"] = nombre
            ruta["id"] = ident
            _normalize_ruta(ruta)
            store.data["rutas"][idx] = ruta
            store.save()
            return self._json({"ruta": ruta})

        def _crear_receta(self, body):
            receta = body.get("receta") if isinstance(body, dict) and "receta" in body else body
            if not isinstance(receta, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            titulo = (receta.get("titulo") or "").strip()
            if not titulo:
                return self._json({"detail": "El título es obligatorio"}, 400)
            if any(r["titulo"].strip().lower() == titulo.lower() for r in store.data["recetas"]):
                return self._json({"detail": "Ya existe una receta con ese título"}, 409)
            receta["titulo"] = titulo
            _normalize_receta(receta)
            store.data["recetas"].append(receta)
            store.save()
            return self._json({"receta": receta}, 201)

        def _actualizar_receta(self, ident, body):
            receta = body.get("receta") if isinstance(body, dict) and "receta" in body else body
            if not isinstance(receta, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            idx = next((i for i, r in enumerate(store.data["recetas"]) if r["id"] == ident), None)
            if idx is None:
                return self._json({"detail": "Receta no encontrada"}, 404)
            titulo = (receta.get("titulo") or "").strip()
            if not titulo:
                return self._json({"detail": "El título es obligatorio"}, 400)
            if any(r["titulo"].strip().lower() == titulo.lower() and r["id"] != ident for r in store.data["recetas"]):
                return self._json({"detail": "Ya existe una receta con ese título"}, 409)
            receta["titulo"] = titulo
            receta["id"] = ident
            _normalize_receta(receta)
            store.data["recetas"][idx] = receta
            store.save()
            return self._json({"receta": receta})

        def _actualizar_ajustes(self, body):
            ajustes = body.get("ajustes") if isinstance(body, dict) and "ajustes" in body else body
            if not isinstance(ajustes, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            ajustes.setdefault("variablesGlobales", [])
            ajustes.setdefault("soPreferido", "windows")
            store.data["ajustes"] = ajustes
            store.save()
            return self._json({"ajustes": ajustes})

        def _borrar(self, lista, ident, nombre_tipo):
            idx = next((i for i, item in enumerate(lista) if item["id"] == ident), None)
            if idx is None:
                return self._json({"detail": f"{nombre_tipo} no encontrada"}, 404)
            del lista[idx]
            store.save()
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()

        def _importar(self, body):
            if not isinstance(body, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            if not isinstance(body.get("rutas"), list) or not isinstance(body.get("recetas"), list):
                return self._json({"detail": "El archivo no tiene la estructura esperada"}, 400)
            rutas = body.get("rutas", [])
            recetas = body.get("recetas", [])
            for r in rutas:
                _normalize_ruta(r)
            for r in recetas:
                _normalize_receta(r)
            ajustes = body.get("ajustes", {})
            if not isinstance(ajustes, dict):
                ajustes = {}
            ajustes.setdefault("variablesGlobales", [])
            ajustes.setdefault("soPreferido", "windows")
            store.data = {"schemaVersion": 1, "rutas": rutas, "recetas": recetas, "ajustes": ajustes}
            store.save()
            return self._json({"importados": {"rutas": len(rutas), "recetas": len(recetas)}})

    return Handler


def run(host=HOST, port=0, token="", data_dir="./data"):
    os.makedirs(data_dir, exist_ok=True)
    store = Store(os.path.join(data_dir, "datos_flujos.json"))
    handler = make_handler(store, token)
    server = ThreadingHTTPServer((host, port), handler)
    actual_port = server.server_address[1]
    print(f"CLI_WF_READY {actual_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
