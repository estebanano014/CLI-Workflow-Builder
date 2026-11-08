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
- Logo/icono de la aplicación (PNG + ICO) generado por `scripts/gen-icon.py`.
- Sección "Biblioteca": catálogo de comandos por sistema operativo (Windows/macOS/Linux, CMD/PowerShell) con buscador por acción y filtros por SO y categoría.
- Rediseño visual: fuente Manrope self-hosted, design system con tokens (espaciado 8px, radios, sombras suaves, transiciones), estética "aire y sombra" y footer.
- `docs/SRS.md` actualizado (v1.1): sección 3.1.8 "Biblioteca de comandos" (RF-063 a RF-068), RNF-017/RNF-018, alcance y funciones actualizadas, portada con índice.

### Corregido
- CORS en la API local: cabeceras `Access-Control-Allow-*` y manejo de preflight `OPTIONS` para que la UI (origen distinto) pueda consumir la API en desarrollo.

## [0.0.1] - 2026-11-07

### Añadido
- Estructura inicial y reglas de UI.
- Esqueleto documental: `README.md`, `AGENTS.md`, `docs/SRS.md`, `docs/frontend.md`.
- Definición del sistema de temas (5 base × claro/oscuro + 4 de daltonismo = 9 temas independientes).
