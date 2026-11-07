import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.persistence import Store


class TestPersistence(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.path = os.path.join(self.tmp, "datos_flujos.json")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_crear_vacio(self):
        s = Store(self.path)
        self.assertEqual(s.data["schemaVersion"], 1)
        self.assertEqual(s.data["rutas"], [])
        self.assertFalse(os.path.exists(self.path))  # no escribe al cargar

    def test_save_escribe_y_hace_backup(self):
        s = Store(self.path)
        s.data["rutas"].append({"id": "1", "nombre": "x"})
        s.save()
        self.assertTrue(os.path.exists(self.path))

        s.data["rutas"].append({"id": "2", "nombre": "y"})
        s.save()
        self.assertTrue(os.path.exists(self.path + ".bak"))
        with open(self.path + ".bak", encoding="utf-8") as f:
            bak = json.load(f)
        self.assertEqual(len(bak["rutas"]), 1)

    def test_corrupto_restaura_backup(self):
        s = Store(self.path)
        s.data["rutas"].append({"id": "1", "nombre": "x"})
        s.save()
        s.data["rutas"].append({"id": "2", "nombre": "y"})
        s.save()  # .bak contiene 1 ruta

        with open(self.path, "w", encoding="utf-8") as f:
            f.write("{ esto no es json")

        s2 = Store(self.path)
        self.assertEqual(len(s2.data["rutas"]), 1)
        self.assertTrue(os.path.exists(self.path + ".corrupt"))

    def test_atomic_escribe_sin_tmp_residual(self):
        s = Store(self.path)
        s.data["rutas"].append({"id": "1", "nombre": "x"})
        s.save()
        self.assertFalse(os.path.exists(self.path + ".tmp"))


if __name__ == "__main__":
    unittest.main()
