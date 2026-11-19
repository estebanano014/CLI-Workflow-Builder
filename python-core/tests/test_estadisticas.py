import unittest
from datetime import date, timedelta

from app.estadisticas import calcular_estadisticas, racha_actual, racha_maxima


def _reg(fecha, tipo="ruta", pasos=1):
    return {"tipo": tipo, "fecha": fecha, "pasosHechos": pasos}


class TestEstadisticas(unittest.TestCase):
    def test_historial_vacio(self):
        s = calcular_estadisticas([], hoy=date(2026, 11, 19))
        self.assertEqual(s["totalEjecuciones"], 0)
        self.assertEqual(s["racha"], 0)
        self.assertEqual(s["rachaMaxima"], 0)
        self.assertEqual(s["diasActivos"], 0)
        self.assertEqual(s["ultimaFecha"], None)

    def test_conteos_basicos(self):
        historial = [
            _reg("2026-11-19T10:00:00Z", "ruta", 3),
            _reg("2026-11-19T11:00:00Z", "receta", 5),
            _reg("2026-11-18T09:00:00Z", "ruta", 1),
        ]
        s = calcular_estadisticas(historial, hoy=date(2026, 11, 19))
        self.assertEqual(s["totalEjecuciones"], 3)
        self.assertEqual(s["rutasEjecutadas"], 2)
        self.assertEqual(s["recetasCompletadas"], 1)
        self.assertEqual(s["pasosCompletados"], 9)
        self.assertEqual(s["diasActivos"], 2)

    def test_racha_actual_hoy(self):
        dias = {date(2026, 11, 19), date(2026, 11, 18), date(2026, 11, 17)}
        self.assertEqual(racha_actual(dias, date(2026, 11, 19)), 3)

    def test_racha_actual_sin_hoy_pero_con_ayer(self):
        # Si hoy aún no hubo actividad, la racha sigue viva hasta ayer.
        dias = {date(2026, 11, 18), date(2026, 11, 17)}
        self.assertEqual(racha_actual(dias, date(2026, 11, 19)), 2)

    def test_racha_actual_rota(self):
        dias = {date(2026, 11, 16), date(2026, 11, 15)}
        self.assertEqual(racha_actual(dias, date(2026, 11, 19)), 0)

    def test_racha_maxima(self):
        dias = {
            date(2026, 11, 1),
            date(2026, 11, 2),
            date(2026, 11, 3),
            date(2026, 11, 10),
            date(2026, 11, 11),
        }
        self.assertEqual(racha_maxima(dias), 3)

    def test_por_dia_solo_dias_con_actividad(self):
        historial = [_reg("2026-11-19T10:00:00Z")]
        s = calcular_estadisticas(historial, hoy=date(2026, 11, 19))
        self.assertEqual(s["porDia"], [{"fecha": "2026-11-19", "count": 1}])

    def test_fechas_invalidas_se_ignoran(self):
        historial = [_reg("no-es-fecha")]
        s = calcular_estadisticas(historial, hoy=date(2026, 11, 19))
        self.assertEqual(s["diasActivos"], 0)
        self.assertEqual(s["totalEjecuciones"], 1)


if __name__ == "__main__":
    unittest.main()
