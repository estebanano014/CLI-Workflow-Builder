# AGENTS.md

Instrucciones de trabajo para agentes en el repositorio **CLI Workflow Builder**.

## Contexto del proyecto

Aplicación de escritorio **offline para Windows** que ayuda a un usuario único a recordar y practicar comandos de consola mediante flujos secuenciales, y a descomponer problemas lógicos antes de programar.

La especificación completa de requisitos (SRS IEEE 830) está en `docs/SRS.md`. **Léela antes de escribir cualquier código.**

## Stack técnico (fijo, no cambiar sin consultar)

- **UI:** Electron + React + TypeScript + Vite.
- **Núcleo:** Python con API HTTP local (solo `127.0.0.1`, puerto efímero, token efímero por variable de entorno).
- **Persistencia:** un solo archivo JSON local (`datos_flujos.json`) con `schemaVersion`, escritura atómica y backup.
- **Sin Internet:** nada de CDNs, telemetría ni servicios cloud. Todo debe funcionar desconectado.
- **SO objetivo:** Windows 10/11.

## Reglas de documentación (OBLIGATORIAS en cada sesión)

El repositorio debe quedar documentado de forma continua, como un portafolio técnico.

1. **`README.md` en la raíz** con: nombre, descripción, stack, instalación, uso rápido, estructura de carpetas, estado del proyecto y enlace a `docs/`.
2. **`docs/` organizado:**
   - `docs/SRS.md` → Especificación de requisitos (no modificar sin permiso).
   - `docs/architecture.md` → Decisiones de arquitectura (Electron + Python + API local).
   - `docs/api-contract.md` → Contratos de la API local.
   - `docs/frontend.md` → Decisiones de UI: Font Awesome local, SweetAlert2, semántica, sistema de temas.
   - `docs/changelog.md` → Registro de cambios (Keep a Changelog).
3. Cada funcionalidad nueva **actualiza el changelog** y, si aplica, `README` o `frontend.md`.
4. **Nunca borres documentación existente** sin justificar y pedir confirmación.

## Requisitos de UI/UX (obligatorios)

### Font Awesome (OFFLINE, sin CDN)
- Instalar Font Awesome **localmente** (no `<link>` a CDN).
- Vía elegida documentada en `docs/frontend.md`.

### SweetAlert2
- Usar `sweetalert2` para: confirmación de eliminación, aviso de paso destructivo antes de copiar y feedback de copiado exitoso.
- **No usar `alert()` nativo.**

### Semántica HTML
- Toda pantalla usa `<header>`, `<main>`, `<footer>`, `<aside>` (sidebar), `<nav>`, `<section>`.
- Usar `aria-label` donde aplique. No usar `<div>` para todo.

### Sistema de temas
- CSS variables + atributo `data-theme` en `<html>`.
- React Context (`ThemeContext`) que expone: `temaActual`, `cambiarTema(nombre)`, `modo` (claro/oscuro), `cambiarModo()`.
- Persistir en `localStorage`.
- Aplicar el tema **antes** de cargar React (script inline en `index.html`).
- 5 temas base × claro/oscuro + 4 temas de daltonismo = **9 temas independientes** en el mismo selector.
- **Regla de oro (daltonismo):** si un color comunica un estado (éxito/error/peligro), acompáñalo siempre con un icono o texto.

## Estructura de carpetas esperada

```
/
├── README.md
├── AGENTS.md
├── package.json
├── electron/
│   ├── main.ts
│   └── preload.ts
├── src/
│   ├── components/
│   ├── pages/
│   ├── context/ThemeContext.tsx
│   ├── styles/themes.css
│   └── lib/
├── python-core/
│   ├── app/
│   ├── tests/
│   └── requirements.txt
├── docs/
│   ├── SRS.md
│   ├── architecture.md
│   ├── api-contract.md
│   ├── frontend.md
│   └── changelog.md
└── data/            # (ignorado en git)
```

## Flujo de trabajo en OpenCode

- Empieza en modo `plan` para explorar y proponer. Cambia a `build` solo cuando el plan esté claro.
- Usa `/init` para generar o mejorar `AGENTS.md` si es necesario.
- Antes de escribir código nuevo, revisa `docs/SRS.md` y `docs/frontend.md`.
- Después de cada bloque, actualiza la documentación correspondiente.
- Si una decisión no está en el SRS o en `frontend.md`, pregunta antes de asumir.

## Definición de "terminado" (DoD)

Una tarea está terminada cuando:

1. Compila y corre en Windows.
2. Los tests relevantes pasan (si existen).
3. `README`, `changelog` y `frontend.md` reflejan el estado real.
4. No se introdujeron dependencias de Internet (Font Awesome local, SweetAlert2 local).
5. Los temas nuevos se ven correctamente en claro y oscuro, y los temas de daltonismo fueron verificados visualmente.
6. El commit message describe el cambio.
