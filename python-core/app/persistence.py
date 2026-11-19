"""Persistencia JSON local: schemaVersion, escritura atómica y backup.

Proporciona una base reutilizable (`AtomicJsonStore`) con escritura atómica
(tmp + rename) y backup del estado anterior, usada tanto por el JSON de dominio
(`datos_flujos.json`) como por el JSON de credenciales (`datos_auth.json`).
"""
import copy
import json
import os
import shutil
import threading


class AtomicJsonStore:
    """Carga/guarda un archivo JSON con escritura atómica y backup ante corrupción."""

    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()
        self.data = self._load()

    @staticmethod
    def _read_json(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _default(self):
        return {}

    def _normalize(self, data):
        return data

    def _load(self):
        if not os.path.exists(self.path):
            return copy.deepcopy(self._default())
        try:
            return self._normalize(self._read_json(self.path))
        except Exception:
            # No sobrescribir: intentar restaurar desde backup.
            backup = self.path + ".bak"
            if os.path.exists(backup):
                try:
                    data = self._normalize(self._read_json(backup))
                    shutil.copy2(self.path, self.path + ".corrupt")
                    return data
                except Exception:
                    pass
            raise RuntimeError(
                "El archivo de datos está corrupto y no hay un backup válido."
            )

    def save(self):
        """Escritura atómica (tmp + rename) y backup del estado anterior."""
        with self.lock:
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
            if os.path.exists(self.path):
                shutil.copy2(self.path, self.path + ".bak")
            os.replace(tmp, self.path)


class Store(AtomicJsonStore):
    """Gestiona `datos_flujos.json` (dominio: rutas, recetas, ajustes, historial)."""

    def _default(self):
        return {
            "schemaVersion": 2,
            "rutas": [],
            "recetas": [],
            "historial": [],
            "ajustes": {"variablesGlobales": [], "soPreferido": "windows"},
        }

    def _normalize(self, data):
        if not isinstance(data, dict):
            raise ValueError("el archivo no contiene un objeto JSON")
        data.setdefault("rutas", [])
        data.setdefault("recetas", [])
        data.setdefault("historial", [])
        if not isinstance(data.get("historial"), list):
            data["historial"] = []
        if not isinstance(data.get("ajustes"), dict):
            data["ajustes"] = copy.deepcopy(self._default()["ajustes"])
        data["ajustes"].setdefault("variablesGlobales", [])
        data["ajustes"].setdefault("soPreferido", "windows")
        # Migración silenciosa a la versión vigente del esquema (v2 añade historial).
        data["schemaVersion"] = 2
        return data


class AuthStore(AtomicJsonStore):
    """Gestiona `datos_auth.json` (credenciales de la cuenta local y bloqueo)."""

    def _default(self):
        return {
            "schemaVersion": 1,
            "users": [],
            "failedAttempts": 0,
            "lockedUntil": None,
        }

    def _normalize(self, data):
        if not isinstance(data, dict):
            raise ValueError("el archivo no contiene un objeto JSON")
        data.setdefault("schemaVersion", 1)
        data.setdefault("users", [])
        data.setdefault("failedAttempts", 0)
        data.setdefault("lockedUntil", None)
        return data
