# Contrato de la API local (v1)

API HTTP local expuesta por el núcleo Python. Base URL: `http://127.0.0.1:<puerto>`.

## Autenticación (dos capas)

Toda petición lleva dos capas independientes de autorización:

1. **Transporte** — cabecera `Authorization: Bearer <token efímero>`. El token lo
   genera Electron y se entrega al núcleo por variable de entorno (`CLI_WF_TOKEN`).
   Prueba que el llamador es el renderer de la propia app, no otro proceso local.
2. **Sesión** — cabecera `X-Session-Token: <token de sesión>`. Se obtiene al hacer
   `login` y muere al cerrar la app (vive solo en memoria del proceso Python).
   Prueba que el usuario ha iniciado sesión.

Errores de capa de transporte:

- Sin token o incorrecto → `401 { "detail": "No autorizado" }`.
- Cliente no local → `403 { "detail": "Acceso remoto no permitido" }`.

Errores de capa de sesión (endpoints de datos) → `401 { "detail": "Sesión no válida o expirada" }`.

## Codificación y tipos

- JSON UTF-8.
- Cuerpos de entrada: `Content-Type: application/json`.
- Los `id` son cadenas (`uuid4().hex`).
- Fechas en ISO 8601 UTC.

## Endpoints de autenticación de usuario (sesión local)

Estos endpoints **solo exigen la capa de transporte** (salvo `logout` y
`change-password`, que además exigen sesión).

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| `POST` | `/v1/auth/register` | `{ username, password }` | `201 { username }` · `409` si la cuenta ya existe · `400` si no cumple la política |
| `POST` | `/v1/auth/login` | `{ username, password }` | `200 { token, username }` · `401` genérico · `429 { retryAfter }` si está bloqueado |
| `POST` | `/v1/auth/logout` | — | `200 { ok }` (invalida la sesión actual) |
| `GET` | `/v1/auth/session` | — | `200 { autenticado, username }` · `401` sin sesión |
| `POST` | `/v1/auth/change-password` | `{ current, new }` | `200 { ok }` · `401` si la actual no es correcta · `400` si la nueva no cumple la política. Invalida **todas** las sesiones |

**Política de contraseña:** 8–128 caracteres, sin espacios al inicio/fin, sin
exigir mayúsculas ni símbolos. Se normaliza con NFKC.

**Cuenta única local:** el modelo se guarda como lista `users` con un elemento
(para crecer a multiperfil sin migrar). Comparación de usuario sin distinguir
mayúsculas. Las credenciales viven en `datos_auth.json` (archivo separado del
JSON de dominio); los datos de flujos **no se cifran**: el login es control de
acceso, no cifrado.

**Bloqueo:** 5 fallos → bloqueo temporal de 30 s. El contador y `lockedUntil` se
persisten en `datos_auth.json`. Mientras dura, `login` responde `429` con
`retryAfter` (segundos restantes) y cabecera `Retry-After`. El mensaje de error
es genérico (`"Usuario o contraseña incorrectos"`) y no revela qué falló.

## Endpoints de datos (exigen sesión)

Todos los siguientes exigen **transporte + sesión**.

### Salud

`GET /v1/salud` (solo transporte, sin sesión)

```json
{ "ok": true, "schemaVersion": 2 }
```

### Rutas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/v1/rutas` | Lista todas las rutas → `{ "rutas": [...] }` |
| `POST` | `/v1/rutas` | Crea una ruta → `201 { "ruta": {...} }` |
| `GET` | `/v1/rutas/{id}` | Obtiene una ruta → `{ "ruta": {...} }` |
| `PUT` | `/v1/rutas/{id}` | Reemplaza una ruta → `{ "ruta": {...} }` |
| `DELETE` | `/v1/rutas/{id}` | Elimina una ruta → `204` |

Validación: `nombre` obligatorio y único (duplicado → `409`).

### Recetas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/v1/recetas` | Lista todas → `{ "recetas": [...] }` |
| `POST` | `/v1/recetas` | Crea → `201 { "receta": {...} }` |
| `GET` | `/v1/recetas/{id}` | Obtiene → `{ "receta": {...} }` |
| `PUT` | `/v1/recetas/{id}` | Reemplaza → `{ "receta": {...} }` |
| `DELETE` | `/v1/recetas/{id}` | Elimina → `204` |

Validación: `titulo` obligatorio y único (duplicado → `409`).

### Ajustes

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/v1/ajustes` | Obtiene ajustes → `{ "ajustes": {...} }` |
| `PUT` | `/v1/ajustes` | Reemplaza ajustes → `{ "ajustes": {...} }` |

### Import / Export

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/v1/export` | Devuelve el JSON completo del almacén |
| `POST` | `/v1/import` | Reemplaza el almacén; valida estructura mínima |

`POST /v1/import` con cuerpo:

```json
{
  "schemaVersion": 2,
  "rutas": [],
  "recetas": [],
  "historial": [],
  "ajustes": { "variablesGlobales": [], "soPreferido": "windows" }
}
```

Respuesta: `{ "importados": { "rutas": 2, "recetas": 1 } }`. Estructura inválida → `400`.
`historial` es opcional en la importación (si falta, se inicializa vacío).

### Historial y estadísticas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/v1/historial` | Lista el historial (más recientes primero) → `{ "historial": [...] }`. Admite `?limit=N` |
| `POST` | `/v1/historial` | Registra una entrada → `201 { "registro": {...} }` |
| `DELETE` | `/v1/historial` | Vacía todo el historial → `204` |
| `DELETE` | `/v1/historial/{id}` | Borra una entrada concreta → `204` |
| `GET` | `/v1/estadisticas` | Agregados y rachas → `{ "estadisticas": {...} }` |

Cuerpo de `POST /v1/historial` (los campos `id` y `fecha` los genera el núcleo):

```json
{
  "tipo": "ruta",
  "refId": "abc",
  "nombre": "Desplegar",
  "pasosHechos": 3,
  "pasosTotal": 3,
  "duracionMs": 120000
}
```

Respuesta de `GET /v1/estadisticas`:

```json
{
  "totalEjecuciones": 12,
  "rutasEjecutadas": 8,
  "recetasCompletadas": 4,
  "pasosCompletados": 41,
  "diasActivos": 6,
  "racha": 3,
  "rachaMaxima": 5,
  "porDia": [{ "fecha": "2026-11-19", "count": 2 }],
  "ultimaFecha": "2026-11-19"
}
```

`porDia` cubre los últimos 371 días y solo incluye días con actividad. Por
privacidad (RNF-009) el historial **no** almacena comandos resueltos ni valores de
variables.

## Formas de los objetos

### Ruta

```json
{
  "id": "abc",
  "nombre": "Desplegar",
  "descripcion": "",
  "etiquetas": ["prod"],
  "favorito": false,
  "color": "#2563eb",
  "icono": "terminal",
  "createdAt": "2026-11-07T00:00:00Z",
  "updatedAt": "2026-11-07T00:00:00Z",
  "lastRunAt": null,
  "pasos": [
    {
      "id": "p1",
      "titulo": "Compilar",
      "descripcion": "",
      "esDestructivo": false,
      "variantes": [
        { "id": "v1", "so": "windows", "comando": "npm run build", "nota": "", "esAlternativo": false }
      ]
    }
  ],
  "variables": [{ "nombre": "rama", "defaultValue": "main" }]
}
```

### Receta

```json
{
  "id": "abc",
  "titulo": "Validar contraseña",
  "descripcion": "",
  "entrada": "texto",
  "salida": "booleano",
  "etiquetas": [],
  "favorito": false,
  "pasos": [{ "id": "p1", "texto": "Comprobar longitud mínima" }]
}
```

### Ajustes

```json
{ "variablesGlobales": [{ "nombre": "usuario", "valor": "admin" }], "soPreferido": "windows" }
```

### Registro de historial

```json
{
  "id": "abc",
  "tipo": "ruta",
  "refId": "ruta-id",
  "nombre": "Desplegar",
  "pasosHechos": 3,
  "pasosTotal": 3,
  "duracionMs": 120000,
  "fecha": "2026-11-19T10:00:00+00:00"
}
```

## Códigos de error

| Código | Significado |
|---|---|
| `400` | Cuerpo inválido, estructura incorrecta o no cumple la política de usuario/contraseña |
| `401` | Falta/incorrecta la capa de transporte, falta/incorrecta la sesión, o credenciales incorrectas |
| `403` | Origen no local |
| `404` | Recurso no encontrado |
| `409` | Nombre/título duplicado, o cuenta local ya existente |
| `429` | Bloqueo temporal por demasiados intentos (incluye `retryAfter`) |

## Versionado (RNF-013)

- Prefijo `/v1`. Cambios incompatibles migrarán a `/v2` sin romper `/v1`.
