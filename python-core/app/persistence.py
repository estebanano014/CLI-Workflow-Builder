"""Persistencia JSON local: schemaVersion, escritura atómica y backup."""
import copy
import json
import os
import shutil
import threading

DEFAULT_DATA = {
    "schemaVersion": 1,
    "rutas": [],
    "recetas": [],
    "ajustes": {"variablesGlobales": [], "soPreferido": "windows"},
}


class Store:
    """Gestiona el archivo datos_flujos.json con escritura atómica y backup."""

    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()
        self.data = self._load()

    def _read_json(self, path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def _normalize(data):
        if not isinstance(data, dict):
            raise ValueError("el archivo no contiene un objeto JSON")
        data.setdefault("schemaVersion", 1)
        data.setdefault("rutas", [])
        data.setdefault("recetas", [])
        if not isinstance(data.get("ajustes"), dict):
            data["ajustes"] = copy.deepcopy(DEFAULT_DATA["ajustes"])
        data["ajustes"].setdefault("variablesGlobales", [])
        data["ajustes"].setdefault("soPreferido", "windows")
        return data

    def _load(self):
        if not os.path.exists(self.path):
            return copy.deepcopy(DEFAULT_DATA)
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
