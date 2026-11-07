# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [0.1.0] - 2026-11-07

### Añadido
- Núcleo Python con API HTTP local `/v1` (rutas, recetas, ajustes, import/export, salud) y autenticación por token efímero.
- Persistencia JSON única con `schemaVersion`, escritura atómica y backup (con restauración ante corrupción).
- Proceso Electron (`main`/`preload`) que lanza el núcleo, negocia puerto/token y abre la ventana.
- Sistema de temas completo: 9 temas × claro/oscuro (CSS variables + `ThemeContext` + script anti-flash).
- Frontend React: Dashboard, Constructor de Rutas, Modo Ejecución, Recetas (editor y detalle), Ajustes.
- Componente reutilizable `EditableList` (RNF-008).
- Font Awesome y SweetAlert2 locales (sin CDN); confirmaciones y feedback con SweetAlert2.
- Atajos de teclado en Modo Ejecución (flechas, Enter, C, R, Esc).
- Tests Python (persistencia y API) con `unittest`.
- Documentación: `architecture.md` y `api-contract.md`.
- Empaquetado Windows con `electron-builder` (instalador NSIS) e intérprete Python embebido (no requiere Python en destino).

## [0.0.1] - 2026-11-07

### Añadido
- Estructura inicial y reglas de UI.
- Esqueleto documental: `README.md`, `AGENTS.md`, `docs/SRS.md`, `docs/frontend.md`.
- Definición del sistema de temas (5 base × claro/oscuro + 4 de daltonismo = 9 temas independientes).
