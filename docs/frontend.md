# Decisiones de UI (frontend)

Este documento registra las decisiones de interfaz de usuario del proyecto. Es de lectura obligatoria antes de escribir código de frontend.

## Font Awesome (offline, sin CDN)

**Decisión:** instalar `@fortawesome/fontawesome-free` como dependencia de desarrollo y servir sus archivos locales desde el bundle de Vite. No se usa ningún `<link>` a CDN.

- Los archivos CSS y fuentes (`webfonts/`) se importan localmente.
- Esto garantiza el funcionamiento **100 % offline** (RNF-001).

## SweetAlert2

**Decisión:** usar `sweetalert2` (instalado localmente vía npm) para toda interacción modal de feedback y confirmación.

Casos de uso obligatorios:
- Confirmación de eliminación (Rutas, Recetas, pasos).
- Aviso de paso destructivo antes de copiar el comando (RF-027).
- Feedback de copiado exitoso (RF-025).

**Prohibido:** usar `alert()`, `confirm()` o `prompt()` nativos.

## Semántica HTML

**Decisión:** toda pantalla usa etiquetas semánticas, no `<div>` para todo.

- `<header>` → cabecera/título de pantalla.
- `<main>` → contenido principal.
- `<footer>` → pie/acciones de pantalla.
- `<aside>` → sidebar (lista lateral del Modo Ejecución).
- `<nav>` → navegación principal.
- `<section>` → bloques de contenido.
- `aria-label` donde aplique (iconos de acción, controles sin texto visible).

## Sistema de temas

### Mecanismo

- **CSS variables** definidas por tema y por modo.
- Atributo `data-theme` en `<html>` (por ejemplo `data-theme="neutro" data-mode="oscuro"`).
- **React Context** (`ThemeContext`) que expone:
  - `temaActual`: nombre del tema activo.
  - `cambiarTema(nombre)`: cambia de tema.
  - `modo`: `"claro"` | `"oscuro"`.
  - `cambiarModo()`: alterna claro/oscuro.
- Persistencia en `localStorage`.
- Se aplica el tema **antes** de que cargue React (script inline en `index.html`) para evitar flash (FOUC).
- **Tema y modo por defecto: `Terminal` + oscuro.** La app abre con el tema
  `Terminal` en modo oscuro, que replica la estética de consola del catálogo
  "Terminal / CLI" (variante "Cítrico"): fondo `#121b20`, superficie `#1d2c35`,
  acento cian `#7cf1ff`, verde `#4fff00`, ámbar `#ffb000` y tipografía
  monoespaciada.

### Variables por tema

Cada tema define, para **claro** y **oscuro**:

`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-border`, `--color-success`, `--color-error`, `--color-warning`, `--color-info`.

### Los 10 temas

| # | Nombre | Descripción | Nota de accesibilidad |
|---|--------|-------------|------------------------|
| 1 | Terminal | Consola cian/verde + monoespaciado | — |
| 2 | Neutro | Grises + acento azul | — |
| 3 | Cálido | Tierra + naranja | — |
| 4 | Frío | Azul/verde + cian | — |
| 5 | Oscuro profundo | Casi negro + violeta | — |
| 6 | Claro suave | Blanco roto + verde | — |
| 7 | Protanopia | Azul-naranja para estados críticos | Diferencia por luminancia, no por tono |
| 8 | Deuteranopia | Azul-naranja (par seguro) | Deficiencia más común |
| 9 | Tritanopia | Rojo-naranja vs azul-verde | Contraste de luminancia |
| 10 | Alto contraste | Blanco puro / negro puro, bordes gruesos | Todo legible en escala de grises |

Los temas 7–10 son **temas independientes** seleccionables en el mismo selector (no son filtros que se superponen a los temas base). Se implementan con el mismo mecanismo de CSS variables.

El tema **Terminal** es especial: además de la paleta, redefine la tipografía
(`VT323` para títulos y `JetBrains Mono` para texto/comandos, self-hosted desde
`src/styles/fonts/`) y usa un glow sutil en las sombras.

### Regla de oro (daltonismo)

Si un color comunica un estado (éxito / error / peligro), **debe ir siempre acompañado de un icono o texto**. La redundancia (color + icono/texto) es obligatoria.

## Design system (tokens)

Definidos en `:root` (en `src/styles/themes.css`) y reutilizados en `src/styles/global.css`.

- **Tipografía:** `Manrope` (variable, self-hosted vía `@fontsource-variable/manrope`, offline). Fuente mono para comandos: `Cascadia Code / Consolas`. El tema **Terminal** añade `VT323` (títulos) y `JetBrains Mono` (texto y comandos), self-hosted en `src/styles/fonts/` (sin CDN).
- **Escala tipográfica:** `12 / 13 / 15 / 16 / 18 / 22 / 28px` (`--text-xs` … `--text-2xl`).
- **Espaciado:** sistema de 8px (`--space-1`=4 … `--space-10`=40).
- **Radios:** `6px` (inputs), `10px` (tarjetas), `14px` (modales), `999px` (pills).
- **Sombras suaves:** `--shadow-xs/sm/shadow/lg` (difusas, p. ej. `0 4px 20px rgba(0,0,0,.06)`).
- **Transiciones:** `--transition-fast` (150ms) y `--transition` (200ms); se desactivan con `prefers-reduced-motion: reduce`.
- **Derivados de color** con `color-mix()`: `--border-subtle` (borde hairline), `--primary-soft` (fondo de elemento activo) y `--focus-ring` (anillo de foco). Resuelven el color del tema activo sin duplicar paletas.

### Estética

- Enfoque **minimalista "aire y sombra"**: tarjetas con borde hairline + sombra difusa, mucho espacio en blanco.
- Header sticky con `backdrop-filter` sutil; sidebar y footer con bordes hairline.
- Foco visible unificado (`:focus-visible` con anillo del color primario).
- Buscador protagonista (input tipo pill con icono) en la sección Biblioteca.

## Pantallas de autenticación (Login / Registro)

- **Gate en `App.tsx`:** al arrancar se consulta `GET /v1/auth/session`. Si no hay
  sesión se muestra `Login`/`Registro`; si la hay, el shell normal. Nunca se ve el
  Dashboard sin sesión.
- **Semántica:** `<main>` centrado, `<section class="card">`, `<header>`, `<form>`,
  `<label htmlFor>` asociado y `<footer>`. Navegación por teclado y Enter para
  enviar (submit del formulario).
- **Estética de tarjeta:** `.auth-card` replica la tarjeta de la landing:
  `max-width: 420px`, radio `--radius-lg` (14px), padding amplio y
  `--shadow-lg`.
- **Errores:** los errores del formulario (validación local y respuestas del
  servidor como credenciales incorrectas o bloqueo) se muestran en una región
  accesible inline (`role="alert"`, `aria-live="assertive"`, `aria-describedby`
  desde los inputs) con icono + texto (regla de oro de daltonismo). Nunca se
  muestran hashes ni detalles técnicos.
- **SweetAlert2** se usa para confirmaciones y feedback modal (cuenta creada,
  cerrar sesión, cambiar contraseña). Nunca `alert()`.
- **Contraseña:** botón mostrar/ocultar accesible (`aria-pressed`) como botón
  independiente del input, de modo que no impide pegar. En el registro hay un
  medidor de fuerza simple (`role="meter"`) con texto además de color.
- **Ajustes:** cerrar sesión y cambiar contraseña con confirmación previa y
  feedback con SweetAlert2. Al cambiar la contraseña se cierra la sesión y se
  vuelve a Login.

## Pantalla de inicio y secciones de resumen (v0.3.0)

- **Vista inicial = Biblioteca (RF-079):** la app abre directamente en la
  Biblioteca de comandos (no en el Dashboard) tanto al arrancar con sesión válida
  como tras iniciar sesión, cerrar sesión o cambiar contraseña. El menú lateral
  coloca la Biblioteca en primer lugar.
- **Cabecera de la Biblioteca (RF-080):** bloque `.biblioteca-hero` con texto de
  introducción (`.hero-lead`) y un panel de estadísticas del catálogo
  (`.stat-row` / `.stat` / `.stat-value` / `.stat-label`): total de comandos,
  categorías y sistemas soportados.
- **Chips de categoría (RF-081):** barra `.category-chips` con píldoras (`.chip`,
  `.chip-active`) que filtran por categoría con un clic, redundante con el
  `<select>` para accesibilidad.
- **Destacados (RF-082):** sección `.featured-grid` con tarjetas compactas
  (`.featured-card`) de los comandos más habituales, visible solo cuando no hay
  filtros activos.
- **Panel de resumen del Dashboard (RF-083):** tarjeta `.dashboard-stats` con
  contadores de Rutas, Recetas, Favoritos y Ejecutados (reutiliza `.stat`).
- **Ajustes informativos (RF-084):** sección "Acerca de" con versión
  (`APP_VERSION`, sincronizada con `package.json`), stack, atajos del Modo
  Ejecución (`.kbd` / `.shortcut-list`) y consejo de uso.
- **Estados vacíos accionables (RF-085):** los estados vacíos incluyen botones de
  acción ("Crear Ruta/Receta", "Limpiar filtros") en lugar de solo texto.

## Dashboard modular y colapsable (v0.3.1)

- **Widgets colapsables:** el Dashboard se organiza en bloques plegables
  construidos con el componente reutilizable `Collapsible`
  (`src/components/Collapsible.tsx`). Cada widget es un `<section class="card
  dashboard-widget">` con un `<header>` que contiene un botón de toggle
  (`aria-expanded` + `aria-controls` apuntando al cuerpo con `id` estable).
- **Persistencia del estado:** el estado abierto/cerrado se guarda en
  `localStorage` con clave `cliwf.dashboard.<storageKey>` (valores `open` /
  `closed`), siguiendo el prefijo `cliwf.*` ya usado por los temas. El valor por
  defecto es abierto.
- **Grid de widgets:** `.dashboard-widgets` usa una rejilla responsive
  (`repeat(auto-fill, minmax(300px, 1fr))`). El widget "Resumen" ocupa el ancho
  completo con `.dashboard-widget--full`.
- **Widgets incluidos (v0.3.1):** Resumen (contadores ampliados), Acciones
  rápidas (Nueva Ruta/Receta, Importar/Exportar), Recientes, Favoritos,
  Pendientes, Etiquetas (nube con contador), Ajustes (SO preferido y variables
  globales) y Seguridad (pasos destructivos).
- **Listas compactas:** los widgets de listas reutilizan `.mini-list` /
  `.mini-item` (acceso directo con un clic, badge de tipo y, en "Recientes",
  fecha).
- **Nube de etiquetas:** reutiliza `.chip` / `.chip-active` (ya usadas en
  Biblioteca) con `.chip-count`; al hacer clic filtra la lista principal y queda
  sincronizada con el `<select>` de etiqueta.
- **Accesibilidad (regla de oro):** el aviso de pasos destructivos usa icono +
  texto además de color (`.alert-box.danger` con `fa-triangle-exclamation`), y el
  estado seguro usa icono + texto (`.alert-box.ok` con `fa-circle-check`).

## Vista de Progreso (v0.0.3)

- **Ruta del menú lateral:** nueva entrada "Progreso" (`fa-chart-line`) entre
  Dashboard y Ajustes, y nueva `Vista { nombre: 'progreso' }`.
- **Hero de resumen:** `.progreso-hero` (mismo gradiente que `.biblioteca-hero`)
  con `stat-row` de racha actual, racha máxima, ejecuciones, pasos completados y
  días activos. La racha usa icono `fa-fire` para no depender solo del color.
- **Calendario de actividad:** `.activity-calendar` con una rejilla estilo GitHub
  de los últimos 6 meses (26 semanas, lunes como primer día). Las celdas
  `.activity-day` usan 5 niveles de intensidad (`level-0`…`level-4`) derivados del
  color primario con `color-mix()`. Accesibilidad: cada celda lleva un `title` con
  fecha y conteo en texto (regla de oro de daltonismo), y la leyenda "Menos → Más"
  es textual.
- **Actividad reciente:** lista `.mini-list` reutilizada con tipo (Ruta/Receta),
  nombre, fecha, pasos hechos/total y duración. Botón "Vaciar historial" con
  confirmación SweetAlert2 (`limpiarHistorial` en `AppContext`).
- **Widget "Progreso" en el Dashboard:** resumen compacto (racha, ejecuciones,
  racha máxima) con botón "Ver Progreso" que navega a la vista completa.
- **Privacidad (RNF-009):** el historial solo muestra metadatos; la UI nunca pinta
  comandos resueltos ni valores de variables en esta vista.

## Paleta de comandos (Ctrl+K) (v0.0.3)

- **Atajo global:** `Ctrl+K` (o `Cmd+K`) alterna la paleta en cualquier pantalla;
  `Esc` la cierra. Se registra en el `Shell` de `App.tsx`, junto al resto de
  atajos de teclado.
- **Componente `CommandPalette`:** overlay modal (`role="dialog"`,
  `aria-modal="true"`) con campo de búsqueda autoenfocado y lista `role="listbox"`
  con opciones `role="option"` y `aria-selected`.
- **Búsqueda fuzzy propia (`lib/fuzzy.ts`):** coincidencia por subsecuencia
  insensible a mayúsculas, con bonus por inicio de palabra y caracteres
  consecutivos. Sin dependencias (offline). Devuelve puntuación y posiciones para
  resaltar con `<mark>`.
- **Resultados:** Acciones (navegación y creación), Rutas (ejecutar), Recetas
  (abrir) y Comandos del catálogo (copiar con la variante del SO preferido). Los
  comandos usan SweetAlert2 para el feedback de copiado.
- **Accesibilidad:** navegación completa por teclado (`↑`/`↓`/`Enter`/`Esc`),
  scroll-into-view del elemento activo y footer con la leyenda de atajos en `.kbd`.

## Drag & drop y pasos plegables en el editor (v0.0.3)

- **Reordenado por arrastre en `EditableList`:** cada tarjeta expone un asa
  `.drag-handle` (`fa-grip-vertical`) con `draggable`. Al soltar sobre otra
  tarjeta se llama a `onReorder(from, to)`; los editores reordenan con el helper
  `moverItem()` de `utils.ts`. Se aplica a los pasos de Ruta y Receta y a las
  variantes de comando.
- **Aislamiento entre listas anidadas:** cada `EditableList` recibe una `dragKey`
  (`pasos`, `receta-pasos`, `variantes-<id>`) que se usa como tipo MIME propio
  (`application/x-cliwf-*`). Los eventos `dragOver`/`drop` solo actúan si el tipo
  coincide, evitando cruces entre la lista de pasos y las listas de variantes.
- **Alternativa accesible:** los botones ↑/↓ se mantienen (y siguen siendo el
  camino por teclado); el asa de arrastre es `aria-hidden` y meramente visual.
- **Pasos plegables:** prop `collapsible` en `EditableList` añade un chevron
  (`aria-expanded`/`aria-controls`) para plegar cada tarjeta; el estado vive en un
  `Set` local por sesión de pantalla.
- **Feedback visual:** la tarjeta arrastrada baja de opacidad (`.dragging`) y la
  tarjeta objetivo se resalta con borde primario (`.drag-over`).

## Exportar Markdown y plantillas (v0.0.3)

- **Generadores Markdown (`lib/markdown.ts`):** funciones puras `rutaAMarkdown`,
  `recetaAMarkdown`, `bibliotecaAMarkdown` y `cheatsheetCompleto`. Los comandos se
  exportan con sus placeholders `{{variable}}` **sin resolver** (RNF-009) y con
  fence de código según el SO (`powershell`/`bash`).
- **Puntos de exportación:** el Dashboard (widget "Acciones rápidas") descarga un
  cheatsheet completo, y los editores de Ruta/Receta ofrecen "Copiar Markdown" en
  el footer (feedback con SweetAlert2). Reutilizan `descargarArchivo` (Blob +
  ancla, offline) en `lib/io.ts`.
- **Plantillas (`lib/plantillas.ts`):** datos estáticos de rutas/recetas de
  ejemplo, materializados con `rutaDesdePlantilla`/`recetaDesdePlantilla` y
  `nombreUnico` para evitar duplicados. El widget "Plantillas" del Dashboard crea
  el elemento y navega a su editor. Todo offline y en español.

## Terminal integrado (v0.0.3)

- **Vista "Terminal"** en el menú lateral (`fa-terminal`), accesible tras iniciar
  sesión. Estética de consola: salida monoespaciada (`.terminal-output`,
  `.terminal-line`) sobre `--color-bg`, prompt `>` en `--color-primary`.
- **Semántica:** el área de salida es `aria-live="polite"`, el input de comandos
  tiene `aria-label`, y el aviso de peligro reutiliza `.alert-box.danger` (icono +
  texto, regla de oro de daltonismo).
- **Guardarraíles:** "modo seguro" (lista blanca) activado por defecto; bloqueo con
  mensaje en la propia salida si el comando no está permitido. Los comandos
  peligrosos piden confirmación con SweetAlert2. El botón muestra "Ejecutando…"
  con spinner mientras corre.
- **Salida coloreada por tipo** (`.entrada` en primario, `.error` en error,
  `.sistema` en muted) siempre con el prefijo `>` en las entradas, de modo que el
  color nunca es la única señal. Timeout, stderr y errores se muestran como texto.

## Asistente de IA (v0.0.4)

- **Vista "Asistente"** (`fa-robot`) en el menú lateral. Chat con burbujas: el
  usuario a la derecha (`.assistant-msg.usuario`, fondo `--primary-soft`), el
  asistente a la izquierda (`.assistant-msg.asistente`) y los errores con
  `.assistant-msg.error` (icono + texto, regla de oro de daltonismo).
- **Streaming:** el texto del asistente llega por IPC (`ollama:chunk`) y se pinta
  en una burbuja con cursor parpadeante (`.assistant-cursor`); `ollama:done`
  finaliza el mensaje y `ollama:error` muestra el error.
- **Indicador de herramienta:** mientras se ejecuta una acción, se muestra un
  mensaje "Ejecutando herramienta: `nombre`" (`.assistant-tool`).
- **Confirmaciones:** `ollama:confirm` abre un SweetAlert2 (Permitir/Cancelar) y
  responde por `cliWF:assistant-confirm`.
- **Cabecera de estado:** punto de conexión (Conectado/Sin conexión) + modelo
  activo, botón "Configuración" (panel colapsable con URL, modelo con
  autocompletado, temperatura, contexto y directorio de trabajo) y "Nueva
  conversación".
- **Accesibilidad:** el área de mensajes se desplaza automáticamente al final; el
  input tiene `aria-label` y Enter envía (Shift+Enter no).
