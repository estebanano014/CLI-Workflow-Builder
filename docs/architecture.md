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

## Autenticación local (RF-069 a RF-078)

- **Cuenta única local:** las credenciales viven en `datos_auth.json`, un archivo
  separado del JSON de dominio, con su propio `schemaVersion`. El modelo se guarda
  como lista `users` con un elemento, para poder crecer a multiperfil sin migrar.
- **Hash:** `hashlib.scrypt` (con fallback a `pbkdf2_hmac` si el intérprete
  embebido no lo soporta), sal aleatoria de 16 bytes (`secrets.token_bytes`) y
  verificación en tiempo constante (`hmac.compare_digest`). El algoritmo y sus
  parámetros se guardan en el archivo para poder migrarlos. La contraseña nunca se
  guarda en claro, ni en logs, ni llega al renderer.
- **Dos capas de token (independientes):**
  1. *Transporte:* cabecera `Authorization: Bearer <token efímero>`, generado por
     Electron y entregado por variable de entorno. Prueba que el llamador es el
     renderer de la propia app (no otro proceso local).
  2. *Sesión:* cabecera `X-Session-Token`, devuelta al hacer login y exigida en
     todos los endpoints de datos. Vive solo en memoria del proceso Python y muere
     al cerrar la app (sin "recordarme" en esta iteración).
- **Bloqueo:** 5 fallos → bloqueo temporal de 30 s. El contador y `lockedUntil` se
  persisten en `datos_auth.json`. El mensaje de error es genérico ("Usuario o
  contraseña incorrectos"), sin revelar qué falló.
- **Restablecimiento:** no hay recuperación de contraseña. Borrar `datos_auth.json`
  restablece el acceso sin tocar `datos_flujos.json`.
- **Persistencia de `datos_auth.json`:** reutiliza `AtomicJsonStore` (escritura
  atómica + backup), igual que el JSON de dominio.

### Modelo de amenaza (quién puede leer el JSON local)

El login es **control de acceso, no cifrado**: `datos_flujos.json` permanece en
texto claro en disco. Cualquier proceso con permisos del usuario de Windows (u
otra persona con acceso a la sesión o a la carpeta de datos) puede leer los flujos.
Lo que la autenticación local **sí** protege es:

- Evitar que quien abre la aplicación sin la contraseña vea los flujos en la UI.
- No almacenar la contraseña en claro (solo su hash derivado), de modo que un
  atacante con el archivo no obtiene una contraseña reutilizable.

Si se requiere confidencialidad real de los datos en disco, habría que cifrar
`datos_flujos.json` (fuera del alcance de esta iteración).

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
- `Registro de historial`: `{id, tipo, refId, nombre, pasosHechos, pasosTotal, duracionMs, fecha}`. Solo metadatos: nunca comandos resueltos ni valores de variables (RNF-009).

**Historial y estadísticas:**
- `schemaVersion` del JSON de dominio es `2` desde la v0.0.3 (v1 → v2 se migra
  automáticamente al cargar, añadiendo `historial: []`).
- Las rachas y agregados se calculan en `app/estadisticas.py` (funciones puras),
  no se persisten derivados; se derivan del historial en cada petición a
  `/v1/estadisticas`.
- `lastRunAt` sigue siendo el único dato de ejecución que se persiste en cada
  Ruta/Receta (RF-029); el historial añade el registro temporal de actividad sin
  sustituirlo.

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

## Enlace profundo (deep link)

- La app registra el protocolo propio `cliwf://` (`app.setAsDefaultProtocolClient`),
  de modo que un enlace `cliwf://...` abre la app instalada.
- Se usa instancia única (`requestSingleInstanceLock`): si la app ya está abierta,
  el enlace la enfoca en lugar de abrir una segunda instancia.
- En el instalador NSIS el protocolo se registra vía `protocols` en
  `electron-builder.yml`.
- `landing/index.html` es una página estática opcional (sin dependencias) para
  publicar el enlace en un host estático (p. ej. Vercel). No forma parte de la
  aplicación ni afecta su funcionamiento offline.

## Terminal integrado (ejecución real)

La vista "Terminal" ejecuta comandos **reales** en el equipo. Decisión de diseño
clave: la ejecución vive en el **proceso principal de Electron** (no en el núcleo
Python ni en el renderer), porque `child_process` de Node es la vía natural para
lanzar procesos con timeout y capturar salida, y mantiene el núcleo Python
enfocado en dominio + persistencia + API.

- **Flujo:** renderer → IPC `cliWF:ejecutar` (preload con `contextBridge`) →
  `ipcMain.handle` → `child_process.exec` en una shell del sistema (CMD o
  `/bin/sh`), con directorio de trabajo, `timeout` (30 s por defecto, máx. 120 s),
  `maxBuffer` de 1 MB y `windowsHide`.
- **Guardarraíles (en el renderer, `lib/terminal.ts`):**
  1. *Modo seguro* activo por defecto: lista blanca de comandos de consulta
     (`git status`, `ls`, `whoami`, `ping`, `node --version`, …). Cualquier otro
     comando se bloquea con un mensaje.
  2. *Detección de peligrosos*: patrones heurísticos (`rm -rf`, `del /s`, `format`,
     `git reset --hard`, `drop table`, …) piden confirmación antes de ejecutar.
  3. *Aviso permanente* de "terminal real" y timeout que cancela procesos colgados.
- **Modelo de amenaza:** la vista Terminal es la única que ejecuta comandos reales
  (las Rutas siguen siendo solo copiar/pegar, RF-025). Queda detrás de la
  autenticación local y su alcance es el del usuario de Windows. No se integra
  con el historial ni con la persistencia (la salida solo vive en pantalla).
- **Limitaciones conocidas:** cada comando corre en una shell nueva (sin estado
  entre ejecuciones); `cd` no persiste el directorio entre comandos. El cwd se
  edita manualmente y por defecto es la carpeta de usuario.

## Asistente de IA local (Ollama)

El asistente integra un LLM local vía **Ollama** (API HTTP `http://localhost:11434`)
para interpretar lenguaje natural y ejecutar acciones reales. Todo vive en el
**proceso principal de Electron**, por las mismas razones que el terminal (acceso a
`child_process`/`fs`) y para evitar CORS en el renderer (que en producción carga por
`file://`).

- **Módulos:**
  - `electron/ollama.ts` — cliente de `/api/chat` (tool calling + streaming NDJSON)
    y `/api/tags`; errores claros para "Ollama apagado", "modelo no descargado" y
    timeout. Usa `fetch` global de Node (sin dependencias nuevas).
  - `electron/tools.ts` — registro de herramientas con esquemas JSON: `terminal_ejecutar`,
    `git_*`, `archivo_*`, `tests_ejecutar`, `proyecto_resumen`. Las destructivas
    declaran `requiresConfirmation`.
  - `electron/assistant.ts` — orquestador del bucle de tool-calling (hasta 10
    iteraciones), mantiene el historial de la conversación y emite streaming.
- **Flujo:** renderer → IPC `cliWF:assistant-chat` → bucle en main (Ollama ↔
  herramientas) → eventos `ollama:chunk/status/confirm/done/error` hacia el
  renderer. La confirmación de acciones destructivas es un *round-trip*: main
  espera la respuesta del renderer (`cliWF:assistant-confirm`).
- **Configuración:** `cliwf-ia-config.json` en la carpeta de datos (URL, modelo,
  temperatura, `num_ctx`, directorio de trabajo y system prompt), con defaults en
  variables de entorno `CLI_WF_OLLAMA_URL` / `CLI_WF_OLLAMA_MODEL` (modelo por
  defecto `qwen2.5:7b`).
- **Registro:** cada ejecución de herramienta se añade a `cliwf-ia.log` (JSON lines
  con timestamp, herramienta, argumentos, resultado y confirmación).
- **Ollama embebido:** el binario portable de Ollama se empaqueta en
  `resources/ollama` (vía `extraResources` en `electron-builder.yml`, descargado con
  `scripts/fetch-ollama.ps1`). Al arrancar, `ensureOllamaRunning()` comprueba si ya
  hay un servidor en `127.0.0.1:11434`; si no, lanza `ollama.exe serve` (con
  `OLLAMA_HOST` fijado a loopback) y espera a que responda. Al cerrar la app se
  detiene el proceso embebido. Los modelos se comparten con la instalación del
  sistema (`~/.ollama/models`), así que no hay que re-descargarlos. Por defecto se
  empaqueta **solo en modo CPU** (se eliminan `cuda_v12`/`cuda_v13`); para conservar
  la aceleración NVIDIA se usa `npm run fetch:ollama -- -KeepCuda`.
- **Historial de conversaciones:** las conversaciones se persisten por usuario en
  `cliwf-ia-conversaciones.json` (id, usuario, título, mensajes y fechas). El
  orquestador expone `snapshot()`/`restore()` y los handlers IPC
  `assistant-list/load/delete/new-conversation` permiten retomar, listar y borrar
  conversaciones. Se guarda tras cada intercambio (sin el mensaje `system`, que se
  reinyecta al restaurar).
- **Modelo de amenaza:** el asistente hereda el alcance de la terminal (ejecuta
  comandos reales y lee/escribe archivos confinados al directorio de trabajo) y
  queda detrás de la autenticación local. Las acciones irreversibles piden
  confirmación; el log permite auditar lo que se ejecutó.
