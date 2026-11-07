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

### Variables por tema

Cada tema define, para **claro** y **oscuro**:

`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-border`, `--color-success`, `--color-error`, `--color-warning`, `--color-info`.

### Los 9 temas

| # | Nombre | Descripción | Nota de accesibilidad |
|---|--------|-------------|------------------------|
| 1 | Neutro | Grises + acento azul | — |
| 2 | Cálido | Tierra + naranja | — |
| 3 | Frío | Azul/verde + cian | — |
| 4 | Oscuro profundo | Casi negro + violeta | — |
| 5 | Claro suave | Blanco roto + verde | — |
| 6 | Protanopia | Azul-naranja para estados críticos | Diferencia por luminancia, no por tono |
| 7 | Deuteranopia | Azul-naranja (par seguro) | Deficiencia más común |
| 8 | Tritanopia | Rojo-naranja vs azul-verde | Contraste de luminancia |
| 9 | Alto contraste | Blanco puro / negro puro, bordes gruesos | Todo legible en escala de grises |

Los temas 6–9 son **temas independientes** seleccionables en el mismo selector (no son filtros que se superponen a los temas base). Se implementan con el mismo mecanismo de CSS variables.

### Regla de oro (daltonismo)

Si un color comunica un estado (éxito / error / peligro), **debe ir siempre acompañado de un icono o texto**. La redundancia (color + icono/texto) es obligatoria.
