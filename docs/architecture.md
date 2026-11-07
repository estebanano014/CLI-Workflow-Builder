# Arquitectura

Decisiones de arquitectura del proyecto **CLI Workflow Builder**.

## Visión general

Aplicación de escritorio offline para Windows dividida en dos procesos:

1. **Interfaz (Electron + React + TypeScript + Vite).**
   - Proceso principal (`electron/main.ts`), preload (`electron/preload.ts`) y renderer (`src/`).
   - El renderer **nunca** accede al archivo JSON directamente (RF-052): consume la API local.

2. **Núcleo (Python).**
   - API HTTP local en `127.0.0.1` (RF-050/051).
   - Gestiona el dominio y la persistencia.

```
┌──────────────────────────────┐        HTTP local         ┌─────────────────────┐
│  Electron                    │  ───────────────────────► │  Núcleo Python      │
│  ├─ main.ts (lanza Python)   │  127.0.0.1:<puerto>       │  app/server.py       │
│  ├─ preload.ts (puente IPC)  │  Authorization: Bearer    │  app/persistence.py  │
│  └─ renderer/ (React)        │   <token efímero>         │  datos_flujos.json   │
└──────────────────────────────┘                            └─────────────────────┘
```

## Arranque y "handshake"

1. El proceso principal genera un **token efímero** (`crypto.randomBytes`).
2. Elige un **puerto libre** (socket temporal en `127.0.0.1:0`).
3. Lanza `python -m app.main` con `cwd = python-core/` y variables de entorno:
   - `CLI_WF_TOKEN` → token.
   - `CLI_WF_PORT` → puerto.
   - `CLI_WF_DATA_DIR` → carpeta de datos.
4. Python levanta el servidor y escribe `CLI_WF_READY <puerto>` en stdout.
5. Electron espera esa línea y abre la ventana.
6. El renderer obtiene `{port, token}` vía IPC (`cliWF:connection`) y construye el cliente API.

## Seguridad de la API local (RNF-010)

- Bind estricto a `127.0.0.1` (no accesible desde red).
- Cada petición exige cabecera `Authorization: Bearer <token>`; sin ella → `401`.
- Se verifica además que la IP del cliente sea `127.0.0.1`.
- El token no se persiste y cambia en cada arranque.

## Persistencia (RF-060/061/062)

- Un único archivo `datos_flujos.json` con `schemaVersion`.
- **Escritura atómica:** se escribe a `<archivo>.tmp` y luego `os.replace` (rename).
- **Backup:** antes de cada guardado exitoso se copia el estado anterior a `<archivo>.bak`.
- **Corrupción:** si el JSON principal es inválido, se intenta restaurar desde `.bak`; el original corrupto se conserva como `<archivo>.corrupt` (nunca se sobrescribe en frío).

## Modelo de datos

- `Ruta`: `{id, nombre, descripcion, etiquetas, favorito, color, icono, createdAt, updatedAt, lastRunAt, pasos[], variables[]}`.
- `Paso`: `{id, titulo, descripcion, esDestructivo, variantes[]}`.
- `Variante`: `{id, so, comando, nota, esAlternativo}` con `so ∈ {windows, linux, macos, any}`.
- `Receta`: `{id, titulo, descripcion, entrada, salida, etiquetas, favorito, pasos[{id, texto}]}`.
- `Ajustes`: `{variablesGlobales[], soPreferido}`.

**Decisiones de diseño (no en el SRS):**
- Las variables de paso se **detectan** de los comandos (`{{x}}`) y sus valores por defecto se declaran a nivel de Ruta (`ruta.variables`). Precedencia: variable de paso > variable global.
- Los `id` se generan con `uuid4` (Python) o `crypto.randomUUID` (renderer).
- `lastRunAt` es el único dato de ejecución que se persiste (RF-029); los valores de variables nunca se guardan (RNF-009).

## Trazabilidad (Apéndice A del SRS)

| Decisión | RF/RNF afectados |
|---|---|
| Electron + React + TS + Python | RF-050–052, RNF-002, RNF-008, RNF-010 |
| HTTP local + token efímero | RF-051, RNF-010, RNF-013, RNF-014 |
| JSON único, atómico, backup | RF-060–062, RNF-006, RNF-007 |
| Variables paso/globales | RF-014, RF-020, RF-040 |
| Modo Ejecución (siguiente siempre, lista lectura, lastRunAt) | RF-021–029 |
| Atajos de teclado | RNF-011 |
| Componente `EditableList` reutilizado | RNF-008 |

## Toolchain

- `electron-vite` compila los tres objetivos: `main`, `preload` y `renderer`.
- Salida en `out/` (`out/main`, `out/preload`, `out/renderer`).
- Font Awesome y SweetAlert2 se instalan vía npm y se empaquetan localmente (sin CDN).
- El núcleo Python usa **solo biblioteca estándar** (sin dependencias externas).

## Empaquetado (electron-builder)

- `electron-builder` produce un instalador NSIS para Windows (`npm run dist:win`).
- **Python embebido:** el script `scripts/fetch-python.ps1` descarga el paquete *embeddable* de Python a `vendor/python`; electron-builder lo copia a `resources/python` (junto a `resources/python-core`) mediante `extraResources`.
- En modo empaquetado, `main.ts` usa `resources/python/python.exe`; se añade `..\python-core` al `python312._pth` para que el intérprete importe el paquete `app`.
- Resultado: la app empaquetada funciona **sin Python instalado** en el equipo destino.
