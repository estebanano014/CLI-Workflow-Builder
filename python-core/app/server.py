"""API HTTP local del núcleo (solo 127.0.0.1, token efímero, sesión y /v1).

Dos capas de autenticación independientes:
  1. Transporte: cabecera `Authorization: Bearer <token efímero>` (por variable
     de entorno). Prueba que el llamador es el renderer de Electron, no otro
     proceso local.
  2. Sesión: cabecera `X-Session-Token`. Prueba que el usuario ha iniciado
     sesión. Se exige en todos los endpoints de datos; los endpoints `/v1/auth/*`
     solo requieren la capa de transporte (salvo logout y change-password, que
     requieren sesión).
"""
import json
import math
import os
import secrets
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from app.auth import (
    LOCKOUT_SECONDS,
    MAX_FAILED_ATTEMPTS,
    find_user,
    hash_password,
    normalizar_username,
    validar_password,
    verify_password,
)
from app.persistence import AuthStore, Store

HOST = "127.0.0.1"
SESSION_HEADER = "X-Session-Token"


def _nuevo_id():
    return uuid.uuid4().hex


def _iso_now():
    return datetime.now(timezone.utc).isoformat()


class SessionManager:
    """Sesiones en memoria del proceso Python: token -> username."""

    def __init__(self):
        self._tokens = {}
        self._lock = threading.Lock()

    def crear(self, username):
        token = secrets.token_urlsafe(32)
        with self._lock:
            self._tokens[token] = username
        return token

    def usuario(self, token):
        if not token:
            return None
        with self._lock:
            return self._tokens.get(token)

    def invalidar(self, token):
        with self._lock:
            self._tokens.pop(token, None)

    def invalidar_todas(self):
        with self._lock:
            self._tokens.clear()


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


def make_handler(store, auth_store, token):
    sessions = SessionManager()

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

        def _sesion(self):
            username = sessions.usuario(self.headers.get(SESSION_HEADER, ""))
            if username is None:
                self._json({"detail": "Sesión no válida o expirada"}, 401)
                return None
            return username

        def _cors(self):
            # La UI local corre en otro origen (localhost:5173 en dev, file:// en producción).
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Session-Token")

        def _json(self, obj, status=200, extra_headers=None):
            body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            for k, v in (extra_headers or {}).items():
                self.send_header(k, v)
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
        def do_OPTIONS(self):
            # Preflight CORS: no exige token (el navegador no lo envía en OPTIONS).
            self.send_response(200)
            self._cors()
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self):
            if not self._autenticado():
                return
            recurso, ident = self._rutear()
            if recurso == "auth":
                return self._auth_get(ident)
            if recurso == "salud":
                return self._json({"ok": True, "schemaVersion": store.data["schemaVersion"]})
            if self._sesion() is None:
                return
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
            recurso, ident = self._rutear()
            body = self._leer_cuerpo()
            if recurso == "auth":
                return self._auth_post(ident, body)
            if self._sesion() is None:
                return
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
            if self._sesion() is None:
                return
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
            if self._sesion() is None:
                return
            if recurso == "rutas":
                return self._borrar(store.data["rutas"], ident, "Ruta")
            if recurso == "recetas":
                return self._borrar(store.data["recetas"], ident, "Receta")
            return self._json({"detail": "No encontrado"}, 404)

        # ---------- autenticación ----------
        def _auth_get(self, ident):
            if ident == "session":
                username = sessions.usuario(self.headers.get(SESSION_HEADER, ""))
                if username is None:
                    return self._json({"detail": "Sin sesión"}, 401)
                return self._json({"autenticado": True, "username": username})
            return self._json({"detail": "No encontrado"}, 404)

        def _auth_post(self, ident, body):
            if ident == "register":
                return self._auth_register(body)
            if ident == "login":
                return self._auth_login(body)
            if ident == "logout":
                return self._auth_logout()
            if ident == "change-password":
                return self._auth_change_password(body)
            return self._json({"detail": "No encontrado"}, 404)

        def _auth_register(self, body):
            if not isinstance(body, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            username, err = normalizar_username(body.get("username"))
            if err:
                return self._json({"detail": err}, 400)
            ok, msg = validar_password(body.get("password"))
            if not ok:
                return self._json({"detail": msg}, 400)
            if find_user(auth_store.data["users"], username) is not None:
                return self._json({"detail": "Ya existe una cuenta local"}, 409)
            record = hash_password(body.get("password"))
            auth_store.data["users"].append(
                {"username": username, **record, "createdAt": _iso_now()}
            )
            auth_store.data["failedAttempts"] = 0
            auth_store.data["lockedUntil"] = None
            auth_store.save()
            return self._json({"username": username}, 201)

        def _auth_login(self, body):
            if not isinstance(body, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            now = time.time()
            locked = auth_store.data.get("lockedUntil")
            if locked is not None:
                if now < locked:
                    retry = int(math.ceil(locked - now))
                    return self._json(
                        {"detail": "Demasiados intentos. Inténtalo más tarde.", "retryAfter": retry},
                        429,
                        {"Retry-After": str(retry)},
                    )
                auth_store.data["lockedUntil"] = None
                auth_store.data["failedAttempts"] = 0
            user = find_user(auth_store.data["users"], body.get("username"))
            if user is None or not verify_password(body.get("password"), user):
                attempts = auth_store.data["failedAttempts"] + 1
                if attempts >= MAX_FAILED_ATTEMPTS:
                    auth_store.data["failedAttempts"] = 0
                    auth_store.data["lockedUntil"] = now + LOCKOUT_SECONDS
                else:
                    auth_store.data["failedAttempts"] = attempts
                auth_store.save()
                return self._json({"detail": "Usuario o contraseña incorrectos"}, 401)
            auth_store.data["failedAttempts"] = 0
            auth_store.data["lockedUntil"] = None
            auth_store.save()
            session_token = sessions.crear(user["username"])
            return self._json({"token": session_token, "username": user["username"]})

        def _auth_logout(self):
            session_token = self.headers.get(SESSION_HEADER, "")
            if sessions.usuario(session_token) is None:
                return self._json({"detail": "Sin sesión"}, 401)
            sessions.invalidar(session_token)
            return self._json({"ok": True})

        def _auth_change_password(self, body):
            session_token = self.headers.get(SESSION_HEADER, "")
            username = sessions.usuario(session_token)
            if username is None:
                return self._json({"detail": "Sesión no válida o expirada"}, 401)
            if not isinstance(body, dict):
                return self._json({"detail": "Cuerpo inválido"}, 400)
            user = find_user(auth_store.data["users"], username)
            if user is None:
                return self._json({"detail": "Usuario no encontrado"}, 404)
            if not verify_password(body.get("current"), user):
                return self._json({"detail": "La contraseña actual no es correcta"}, 401)
            ok, msg = validar_password(body.get("new"))
            if not ok:
                return self._json({"detail": msg}, 400)
            record = hash_password(body.get("new"))
            for k in ("algorithm", "salt", "hash", "params"):
                user[k] = record[k]
            auth_store.save()
            sessions.invalidar_todas()
            return self._json({"ok": True})

        # ---------- acciones de dominio ----------
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
            self._cors()
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
    auth_store = AuthStore(os.path.join(data_dir, "datos_auth.json"))
    handler = make_handler(store, auth_store, token)
    server = ThreadingHTTPServer((host, port), handler)
    actual_port = server.server_address[1]
    print(f"CLI_WF_READY {actual_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
