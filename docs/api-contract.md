# Contrato de la API local (v1)

API HTTP local expuesta por el núcleo Python. Base URL: `http://127.0.0.1:<puerto>`.

## Autenticación

Toda petición debe incluir la cabecera:

```
Authorization: Bearer <token>
```

- El `token` es efímero y se entrega al proceso Python por variable de entorno (`CLI_WF_TOKEN`).
- Sin token o con token incorrecto → `401 { "detail": "No autorizado" }`.
- Cliente que no sea `127.0.0.1` → `403 { "detail": "Acceso remoto no permitido" }`.

## Codificación y tipos

- JSON UTF-8.
- Cuerpos de entrada: `Content-Type: application/json`.
- Los `id` son cadenas (`uuid4().hex`).
- Fechas en ISO 8601 UTC.

## Endpoints

### Salud

`GET /v1/salud`

```json
{ "ok": true, "schemaVersion": 1 }
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
{ "schemaVersion": 1, "rutas": [], "recetas": [], "ajustes": { "variablesGlobales": [], "soPreferido": "windows" } }
```

Respuesta: `{ "importados": { "rutas": 2, "recetas": 1 } }`. Estructura inválida → `400`.

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

## Códigos de error

| Código | Significado |
|---|---|
| `400` | Cuerpo inválido o estructura incorrecta |
| `401` | Falta token o es incorrecto |
| `403` | Origen no local |
| `404` | Recurso no encontrado |
| `409` | Nombre/título duplicado |

## Versionado (RNF-013)

- Prefijo `/v1`. Cambios incompatibles migrarán a `/v2` sin romper `/v1`.
