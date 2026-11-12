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
