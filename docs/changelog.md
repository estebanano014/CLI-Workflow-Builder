# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [0.0.4] - 2026-11-19

### Añadido
- **Asistente de IA local (Ollama):** chat que entiende lenguaje natural y ejecuta
  acciones reales. Cliente de Ollama (`electron/ollama.ts`, `/api/chat` con tool
  calling y streaming), registro de herramientas (`electron/tools.ts`: terminal,
  Git, archivos y tests) y orquestador (`electron/assistant.ts`). Funciones de Git
  (status/diff/log/ramas/checkout/add/commit/push/pull/reset/deshacer), lectura y
  edición de archivos, búsqueda, tests y resumen del proyecto. Confirmación de
  acciones destructivas, log en `cliwf-ia.log` y configuración en
  `cliwf-ia-config.json` (o variables `CLI_WF_OLLAMA_URL`/`CLI_WF_OLLAMA_MODEL`).
  Vista "Asistente" (`src/pages/Asistente.tsx`) con streaming, estado de conexión y
  panel de configuración.

### Cambiado
- Versión de la aplicación a `0.0.4` (`package.json`, `package-lock.json` y `APP_VERSION`).

## [0.0.3] - 2026-11-19

### Añadido
- **Historial de ejecuciones:** cada vez que se completa una Ruta (Modo Ejecución) o
  una Receta (al marcar todos los pasos o pulsar "Terminé") se registra una entrada
  con metadatos (tipo, referencia, nombre, pasos hechos/total, duración y fecha).
  Por privacidad (RNF-009) **nunca** se guardan comandos resueltos ni valores de
  variables, solo metadatos.
- **Estadísticas y rachas:** nueva vista **Progreso** (`/v1/estadisticas`) con racha
  actual, racha máxima, ejecuciones totales, pasos completados y días activos.
- **Calendario de actividad:** rejilla estilo GitHub con los últimos 6 meses,
  coloreada por intensidad (regla de oro de daltonismo: cada celda tiene `title`
  con fecha y conteo en texto).
- **Widget "Progreso" en el Dashboard** con racha, ejecuciones y enlace a la vista
  completa.
- **Limpieza del historial** con confirmación (SweetAlert2) desde la vista Progreso.
- `schemaVersion` del almacén pasa de `1` a `2` con migración automática (los
  archivos v1 se normalizan añadiendo `historial: []` al cargar).
- Endpoints nuevos: `GET/POST/DELETE /v1/historial` (listar con `?limit=`, registrar
  y vaciar/borrar) y `GET /v1/estadisticas`.
- Módulo `app/estadisticas.py` (funciones puras) y tests de estadísticas y de
  migración de esquema.
- **Paleta de comandos (Ctrl+K / Cmd+K):** búsqueda global instantánea (fuzzy) por
  acciones (Biblioteca, Dashboard, Progreso, Ajustes, Nueva Ruta, Nueva Receta),
  tus Rutas (ejecutar), tus Recetas (abrir) y los comandos del catálogo (copiar al
  portapapeles con la variante del sistema operativo preferido). Navegación con
  teclado (`↑`/`↓`/`Enter`/`Esc`) y resaltado de coincidencias. Componente
  `CommandPalette` y buscador `lib/fuzzy.ts` (sin dependencias).
- **Drag & drop en el editor:** los pasos (Rutas y Recetas) y las variantes de
  comando se pueden reordenar arrastrando el asa (`⋮⋮`) de cada tarjeta. Los
  botones ↑/↓ se conservan como alternativa accesible por teclado. Aislamiento
  entre listas anidadas mediante claves de arrastre (`dragKey`).
- **Pasos plegables:** cada paso del editor se puede plegar/desplegar (chevron)
  para reducir el ruido en flujos largos. Estado local por sesión de pantalla.
- Helper `moverItem()` en `utils.ts` reutilizado por los reordenados.
- **Exportar a Markdown:** nueva vista de exportación de cheatsheet. El Dashboard
  exporta un `cli-workflow-cheatsheet.md` completo (biblioteca + rutas + recetas) y
  los editores de Ruta y Receta permiten "Copiar Markdown" del elemento. Los
  comandos se exportan con placeholders `{{x}}` intactos (RNF-009). Módulo
  `lib/markdown.ts` (generadores puros) y helpers `descargarArchivo` /
  `exportarMarkdown` / `copiarComoMarkdown` en `lib/io.ts`.
- **Plantillas:** widget "Plantillas" en el Dashboard con 3 rutas y 3 recetas de
  ejemplo (Git, despliegue, diagnóstico de red, validación, primalidad, ordenación).
  "Usar" crea el elemento con nombre único y abre su editor. Módulo
  `lib/plantillas.ts`.
- **Terminal integrado (ejecución real):** nueva vista "Terminal" que ejecuta
  comandos de verdad en el equipo (a través del proceso principal de Electron, vía
  IPC `cliWF:ejecutar`, con `child_process.exec`, timeout de 30 s y captura de
  stdout/stderr). Guardarraíles: **modo seguro** por defecto (lista blanca de
  comandos de consulta), detección heurística de comandos peligrosos con
  confirmación previa, aviso permanente de "terminal real" y timeout que cancela
  el proceso. Módulo `lib/terminal.ts` y página `Terminal.tsx`.

### Cambiado
- "Historial de ejecuciones, estadísticas y rachas", "drag & drop" y "ejecución
  real de comandos" pasan de "evolutivo" (Apéndice D del SRS) a implementado.
  `docs/SRS.md` se deja sin tocar (requiere aprobación expresa para modificar la
  especificación). La ejecución real se limita a la vista "Terminal", con
  guardarraíles y sin ejecutar los comandos de las Rutas automáticamente.
- `recargar()` del `AppContext` ahora también carga historial y estadísticas.
- Versión de la aplicación a `0.0.3` (`package.json`, `package-lock.json` y `APP_VERSION`).

## [0.3.1] - 2026-11-17

### Añadido
- **Dashboard modular y colapsable:** el panel de resumen y los nuevos bloques del
  Dashboard ahora son *widgets* plegables/desplegables. El estado (abierto/cerrado)
  se persiste en `localStorage` (clave `cliwf.dashboard.*`), siguiendo la convención
  de prefijo ya usada por los temas.
- **Componente reutilizable `Collapsible`** (`src/components/Collapsible.tsx`) con
  `aria-expanded`/`aria-controls` y persistencia de estado (RNF-008).
- **Widget "Resumen" ampliado:** además de Rutas, Recetas, Favoritos y Ejecutados,
  ahora muestra Pasos, Variantes, Etiquetas y Variables globales.
- **Widget "Recientes":** últimos 5 elementos ejecutados (por `lastRunAt`) con
  acceso rápido.
- **Widget "Favoritos":** lista de rutas y recetas marcadas como favoritas.
- **Widget "Pendientes":** elementos que nunca se han ejecutado (`lastRunAt` null).
- **Widget "Etiquetas":** nube de etiquetas con contador; al hacer clic filtra la
  lista del Dashboard (sincronizado con el selector de etiqueta).
- **Widget "Ajustes":** resumen en un vistazo del sistema operativo preferido y de
  las variables globales definidas.
- **Widget "Seguridad":** contador de pasos destructivos con aviso visual e icono
  (regla de oro de daltonismo), o estado "sin pasos destructivos".
- **Widget "Acciones rápidas":** botones destacados de Nueva Ruta, Nueva Receta,
  Importar y Exportar, que sacan la importación/exportación de Ajustes a un clic
  en el Dashboard.

### Cambiado
- Versión de la aplicación a `0.3.1` (`package.json` y `APP_VERSION`).

### Corregido
- Al importar datos se refresca la vista (`recargar`) para que contadores y
  listados se actualicen al instante, tanto desde el Dashboard como desde Ajustes.
  En Ajustes, el formulario (`draft`) también se sincroniza con los ajustes
  importados.

## [0.3.0] - 2026-11-16

### Añadido
- **Biblioteca como pantalla de inicio:** al entrar (con sesión válida o tras iniciar sesión) la vista predeterminada ahora es la **Biblioteca** en lugar del Dashboard (RF-079). El menú lateral reordena la Biblioteca en primer lugar.
- **Cabecera de bienvenida en Biblioteca:** texto de introducción y panel de estadísticas del catálogo (número de comandos, categorías y sistemas soportados) (RF-080).
- **Chips de categoría** en Biblioteca para filtrar con un clic, además del selector existente (RF-081).
- **Sección "Destacados"** en Biblioteca con los comandos más habituales en tarjetas compactas (visible cuando no hay filtros activos) (RF-082).
- **Panel de resumen en Dashboard:** contadores de Rutas, Recetas, Favoritos y Ejecutados (RF-083).
- **Sección informativa "Acerca de" en Ajustes:** versión, stack, atajos de teclado del Modo Ejecución y consejo de uso (RF-084).
- **Estados vacíos con acciones:** el Dashboard y la Biblioteca ofrecen botones de acción ("Crear Ruta/Receta" y "Limpiar filtros") cuando no hay resultados (RF-085).
- Nueva ERS conforme a IEEE 830-1998 en un único documento `docs/srs/IEEE-830.md` (índice y trazabilidad, introducción, descripción general, requisitos específicos y diagramas de arquitectura en Mermaid).

### Cambiado
- Vista predeterminada de `dashboard` → `biblioteca` en `AppContext` (arranque, cierre de sesión y cambio de contraseña).
- Orden del menú lateral: Biblioteca, Dashboard, Ajustes.
- Versión de la aplicación mostrada en Ajustes (`APP_VERSION`) a `0.3.0`.

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
