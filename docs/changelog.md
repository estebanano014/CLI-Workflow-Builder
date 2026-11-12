# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [0.2.2] - 2026-11-12

### Añadido
- Tema **Terminal** como tema por defecto: estética de consola del catálogo "Terminal / CLI" (variante "Cítrico"), con paleta cian/verde (acento `#7cf1ff`, verde `#4fff00`, ámbar `#ffb000`) y tipografía monoespaciada `VT323` (títulos) + `JetBrains Mono` (texto y comandos), self-hosted sin CDN en `src/styles/fonts/`.
- Glow sutil en las sombras del tema Terminal.

### Cambiado
- Tema por defecto `neutro` → `terminal` (sigue en modo oscuro).
- Documentación de temas actualizada de 9 a 10 (6 base + 4 de daltonismo).

## [0.2.1] - 2026-11-12

### Añadido
- Enlace profundo `cliwf://` que abre (o enfoca) la app instalada: registro de protocolo propio en Electron (`app.setAsDefaultProtocolClient`) e instancia única (`requestSingleInstanceLock`).
- Protocolo `cliwf` registrado en el instalador NSIS (`electron-builder.yml`).
- Página de lanzamiento estática (`landing/index.html`, sin dependencias) lista para desplegar en Vercel, con un botón que abre la app.

### Cambiado
- **Modo oscuro por defecto:** la app ahora abre con el tema `Neutro` en modo oscuro (mismo color de fondo/superficie/acento que la página de lanzamiento), en lugar del modo claro.
- Tarjeta de Login/Registro (`.auth-card`) alineada a la estética de la landing: radio 14px, sombra más marcada y padding amplio.

## [0.2.0] - 2026-11-10

### Añadido
- Autenticación local de cuenta única: registro, login, cierre de sesión y cambio de contraseña (offline, sin cuentas en la nube ni recuperación por correo).
- Endpoints `/v1/auth/{register,login,logout,session,change-password}` con sesión en memoria (token por cabecera `X-Session-Token`) y bloqueo temporal (5 fallos → 30 s).
- Credenciales en archivo separado `datos_auth.json` (schemaVersion propio, escritura atómica + backup), contraseña con `hashlib.scrypt` (fallback `pbkdf2_hmac`), sal de 16 bytes y `hmac.compare_digest`; nunca en claro.
- Protección de todos los endpoints de datos con token de sesión (401 sin sesión).
- Pantallas `Login` y `Registro` (HTML semántico, `aria-live`/`aria-describedby`, mostrar/ocultar contraseña accesible, medidor de fuerza) y gate en `App.tsx`.
- En Ajustes: cerrar sesión y cambiar contraseña (con confirmación SweetAlert2).
- Tests Python de autenticación (`test_auth.py`): registro, login, bloqueo/desbloqueo, sal, endpoints sin sesión, cambio de contraseña y ausencia de contraseña en claro.

### Cambiado
- **Cambio de alcance:** el SRS excluía el multiusuario y no contemplaba autenticación de usuario final. Se aprueba la autenticación **local, offline y de una sola cuenta** en esta máquina (SRS v1.2, sección 3.1.9, RF-069 a RF-078). Sigue fuera de alcance: cuentas en la nube, correo, recuperación por correo, OAuth, sincronización y multiperfil compartido.
- `docs/api-contract.md`, `docs/architecture.md` (dos capas de token + modelo de amenaza), `docs/frontend.md` y `README` actualizados.

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
