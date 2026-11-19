"""Estadísticas y rachas calculadas a partir del historial de ejecuciones.

Estas funciones son puras (no leen ni escriben disco) para poder testearlas de
forma aislada. El historial solo guarda metadatos —nunca valores de variables ni
comandos resueltos— en cumplimiento de RNF-009.
"""
from collections import defaultdict
from datetime import date, datetime, timedelta

# Un año completo más margen para el calendario de actividad de la UI.
DIAS_MOSTRADOS = 371


def _fecha_local(iso):
    """Convierte una fecha ISO 8601 a `datetime` local; `None` si es inválida."""
    if not isinstance(iso, str) or not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone()
    return dt


def _dia(iso):
    dt = _fecha_local(iso)
    return dt.date() if dt else None


def racha_actual(dias, hoy):
    """Días consecutivos de actividad terminando hoy (o ayer, si aún no hubo actividad hoy)."""
    if not dias:
        return 0
    dias = set(dias)
    cursor = hoy if hoy in dias else hoy - timedelta(days=1)
    if cursor not in dias:
        return 0
    racha = 0
    while cursor in dias:
        racha += 1
        cursor -= timedelta(days=1)
    return racha


def racha_maxima(dias):
    """Máxima cantidad de días consecutivos con actividad en todo el historial."""
    if not dias:
        return 0
    dias = sorted(set(dias))
    mejor = actual = 1
    for i in range(1, len(dias)):
        if (dias[i] - dias[i - 1]).days == 1:
            actual += 1
            mejor = max(mejor, actual)
        else:
            actual = 1
    return mejor


def calcular_estadisticas(historial, hoy=None):
    """Agrega el historial en un resumen listo para la UI.

    `hoy` es inyectable para hacer los tests deterministas; por defecto usa la
    fecha local del equipo.
    """
    if hoy is None:
        hoy = date.today()

    dias_con_actividad = set()
    conteo_diario = defaultdict(int)
    total_ejecuciones = 0
    total_pasos = 0
    por_tipo = {"ruta": 0, "receta": 0}

    for reg in historial or []:
        if not isinstance(reg, dict):
            continue
        total_ejecuciones += 1
        d = _dia(reg.get("fecha"))
        if d is not None:
            dias_con_actividad.add(d)
            conteo_diario[d] += 1
        try:
            total_pasos += int(reg.get("pasosHechos") or 0)
        except (TypeError, ValueError):
            pass
        tipo = reg.get("tipo")
        if tipo in por_tipo:
            por_tipo[tipo] += 1

    inicio = hoy - timedelta(days=DIAS_MOSTRADOS - 1)
    por_dia = []
    for i in range(DIAS_MOSTRADOS):
        d = inicio + timedelta(days=i)
        n = conteo_diario.get(d)
        if n:
            por_dia.append({"fecha": d.isoformat(), "count": n})

    return {
        "totalEjecuciones": total_ejecuciones,
        "rutasEjecutadas": por_tipo["ruta"],
        "recetasCompletadas": por_tipo["receta"],
        "pasosCompletados": total_pasos,
        "diasActivos": len(dias_con_actividad),
        "racha": racha_actual(dias_con_actividad, hoy),
        "rachaMaxima": racha_maxima(dias_con_actividad),
        "porDia": por_dia,
        "ultimaFecha": max((d.isoformat() for d in dias_con_actividad), default=None),
    }
