# CLI Workflow Builder

Gestor visual de flujos de trabajo: aplicación de escritorio **offline para Windows** que ayuda a un usuario único a recordar, ordenar y practicar comandos de consola mediante flujos secuenciales, y a descomponer problemas lógicos en pasos antes de programar.

## Stack

- **UI:** Electron + React + TypeScript + Vite (`electron-vite`).
- **Núcleo:** Python con API HTTP local (solo `127.0.0.1`, puerto efímero, token efímero por variable de entorno). Solo biblioteca estándar.
- **Persistencia:** un solo archivo JSON local (`datos_flujos.json`) con `schemaVersion`, escritura atómica y backup.
- **Sin Internet:** nada de CDNs, telemetría ni servicios cloud. Font Awesome y SweetAlert2 empaquetados localmente.
- **SO objetivo:** Windows 10/11.

## Estado del proyecto

- Versión: `0.1.0`.
- Implementado: Dashboard, Constructor de Rutas, Modo Ejecución, Recetas (editor + detalle), Ajustes, Import/Export, API local `/v1`, persistencia atómica con backup, sistema de 9 temas.
- Fuera del MVP (ver `docs/SRS.md`): ejecución real de comandos, historial, sincronización, multiusuario, drag & drop, i18n.

## Requisitos

- Node.js 18+ y npm.
- Python 3.10+ (para el núcleo). Se usa el launcher `py` en Windows para evitar el alias de Microsoft Store; alternativamente define `CLI_WF_PYTHON`.

## Instalación

```bash
npm install
```

## Uso rápido

```bash
npm run dev          # modo desarrollo (Electron + Vite)
npm run build        # compilar a out/
npm start            # preview del build
npm run typecheck    # verificación de tipos (renderer + electron)
npm run test:python  # tests del núcleo Python (unittest)
```

Al abrir la app: crea una **Ruta** (secuencia de comandos con variantes por sistema operativo) o una **Receta** (descomposición lógica), ejecútala paso a paso, copia comandos al portapapeles y configura variables y tema.

## Empaquetado (Windows)

```bash
npm run fetch:python   # descarga el intérprete Python embebido (vendor/python)
npm run dist:win       # genera dist/CLI Workflow Builder Setup <versión>.exe
npm run dist:dir       # build desempaquetado (dist/win-unpacked) para depurar
```

El instalador incluye el intérprete Python embebido, por lo que **no requiere Python instalado** en la máquina destino (offline por diseño).

El icono de la app está en `build/icon.ico`; se regenera con `py scripts/gen-icon.py`.

## Estructura de carpetas

```
/
├── README.md
├── AGENTS.md
├── package.json
├── electron.vite.config.ts
├── electron/
│   ├── main.ts          # proceso principal: lanza Python, negocia puerto/token
│   └── preload.ts       # puente IPC (contextBridge)
├── src/
│   ├── components/      # EditableList, ThemeSelector, Sidebar, TagInput, CommandPreview
│   ├── pages/           # Dashboard, RutaEditor, Ejecucion, RecetaEditor, RecetaDetalle, Ajustes
│   ├── context/         # ThemeContext, AppContext
│   ├── styles/          # themes.css (9 temas), global.css
│   ├── lib/             # api, types, utils, io, clipboard, themes
│   ├── index.html
│   └── main.tsx
├── python-core/
│   ├── app/             # main.py, server.py, persistence.py
│   ├── tests/           # test_persistence.py, test_api.py
│   └── requirements.txt
├── docs/                # SRS, architecture, api-contract, frontend, changelog
└── data/                # datos_flujos.json (ignorado en git)
```

## Documentación

Ver [`docs/`](docs/): `SRS.md` (requisitos), `architecture.md`, `api-contract.md`, `frontend.md` y `changelog.md`.
