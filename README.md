# CLI Workflow Builder

## 📖 ¿De qué trata la aplicación?

CLI Workflow Builder es una aplicación de escritorio **offline para Windows** que te ayuda a recordar, ordenar y practicar comandos de consola mediante flujos secuenciales, y a descomponer problemas lógicos antes de programar.

Resuelve dos problemas habituales:

- **No recuerdas el comando exacto** (ni su variante por sistema operativo): incluye una **Biblioteca** con los comandos más usados organizados por Windows (CMD y PowerShell), macOS y Linux.
- **Repites procesos de varios pasos**: crea **Rutas** (secuencias de comandos) y ejecútalas paso a paso, copiando cada comando al portapapeles.

Va dirigida a un usuario único (desarrollador, estudiante o entusiasta) en Windows 10/11 que quiere una referencia rápida y fiable de comandos, sin depender de Internet.

## 🚀 Guía de instrucciones: ¿Cómo se usa?

### 1. Abrir la aplicación

- **Desarrollo:** `npm install` y luego `npm run dev`.
- **Instalada:** ejecuta el instalador `CLI Workflow Builder Setup <versión>.exe` o abre el ejecutable directamente.

### 2. Crear tu cuenta local (primera vez)

Al abrir la app por primera vez verás **Crear cuenta**. Elige un usuario y una contraseña (entre 8 y 128 caracteres) y luego inicia sesión. Es una **cuenta única local**: las credenciales se guardan en `datos_auth.json`, separadas de tus datos.

**¿Olvidaste la contraseña?** No hay recuperación por correo. Borra el archivo `datos_auth.json` de la carpeta de datos para restablecer el acceso; tus flujos (`datos_flujos.json`) no se tocan.

### 3. Buscar un comando

Al iniciar sesión, la app abre directamente en la **Biblioteca** (también accesible
desde el menú lateral). Escribe en el buscador por *acción*, *comando* o *palabra
clave*. Ejemplos:

- `"subir cambios"` → el comando para subir al repositorio de GitHub.
- `"grep"` o `"buscar texto"` → cómo buscar texto dentro de archivos.
- `"instalar"` → los gestores de paquetes por sistema operativo.

### 4. Filtrar por sistema operativo

En la Biblioteca usa el selector **Todos los sistemas / Windows / macOS / Linux**. En Windows se muestran por separado **CMD** y **PowerShell** cuando el comando difiere. También puedes filtrar por **categoría** (Git, Red, Procesos…).

### 5. Copiar los comandos

Cada comando tiene un botón **Copiar**. En el **Modo Ejecución** de una Ruta, el botón copia el comando ya resuelto (y te avisa antes si es un paso destructivo).

### 6. Funcionalidades extra

- **Rutas:** secuencias de comandos con variantes por SO, variables `{{x}}` y vista previa.
- **Modo Ejecución:** avanza paso a paso con barra de progreso y atajos de teclado (`→`, `←`, `C`, `R`, `Esc`).
- **Recetas:** descompón problemas en pasos con checklist.
- **Progreso:** historial de ejecuciones, rachas (días seguidos) y calendario de actividad, para convertir la práctica en un hábito.
- **Terminal integrada:** ejecuta comandos reales en tu equipo, con modo seguro (lista blanca) por defecto y confirmación ante comandos peligrosos.
- **Asistente de IA local (Ollama):** un chat que entiende lenguaje natural y ejecuta acciones reales (comandos, Git, leer/editar archivos, tests). Ver la sección [Asistente de IA](#asistente-de-ia-local-ollama).
- **Dashboard:** panel de resumen y widgets colapsables (Resumen, Progreso, Plantillas, Acciones rápidas, Recientes, Favoritos, Pendientes, Etiquetas, Ajustes y Seguridad).
- **Temas:** 10 temas (6 base × claro/oscuro + 4 de daltonismo), con el tema **Terminal** (monoespaciado, acento cian/verde) por defecto.
- **Importar / Exportar** tu archivo de datos.
- **Cuenta local:** registro y login offline (una sola cuenta por equipo).

## Tecnologías usadas

- **UI:** Electron + React + TypeScript + Vite (electron-vite), SweetAlert2, Font Awesome y Manrope (todo local, sin CDN).
- **Núcleo:** Python (biblioteca estándar) con API HTTP local `/v1` (solo `127.0.0.1`, token efímero).
- **Persistencia:** JSON local (`datos_flujos.json`) con escritura atómica y backup, y `datos_auth.json` para la cuenta local (contraseña con hash, nunca en claro).
- **Asistente de IA:** integración local con [Ollama](https://ollama.com) (API `/api/chat` con tool calling y streaming) ejecutada en el proceso principal de Electron; sin dependencias npm nuevas (usa `fetch` de Node).

## 🔗 Enlace para abrir la app (deep link)

La app registra el protocolo propio `cliwf://`. Con la app **instalada**, un enlace
`cliwf://abrir` (o `cliwf://`) abre la aplicación; si ya está abierta, la trae al
frente.

Para tener una URL pública con un botón, se incluye una página de lanzamiento en
`landing/` (un solo `index.html`, sin dependencias). Para publicarla en Vercel:

1. Importa este repositorio en Vercel.
2. Configura el **Root Directory** en `landing`.
3. Despliega. El botón "Abrir la aplicación" usará `cliwf://`.

Nota: el enlace solo funciona en el equipo donde la app esté instalada.

## 🤖 Asistente de IA local (Ollama)

La app incluye un asistente de IA que corre **100 % local** sobre
[Ollama](https://ollama.com). Puedes pedirle en lenguaje natural que ejecute
acciones reales: comandos de terminal, operaciones de Git, leer/editar archivos y
ejecutar tests.

### Requisitos

1. Instala [Ollama](https://ollama.com/download) e inícialo (`ollama serve` o la
   app de escritorio).
2. Descarga un modelo con soporte de *tool/function calling*. Recomendados:

   ```bash
   ollama pull qwen2.5:7b      # 7B, excelente en español y tool calling (por defecto)
   ollama pull qwen2.5:14b     # 14B, aún mejor para tareas complejas (más RAM)
   ollama pull llama3.1        # 8B, alternativa muy usada
   ollama pull qwen2.5:3b      # 3B, ligero para equipos modestos
   ```

### Configuración

Abre la sección **Asistente** (menú lateral) → **Configuración**. Ahí puedes
cambiar:

- **URL de Ollama** (por defecto `http://localhost:11434`).
- **Modelo** (con autocompletado de los modelos instalados).
- **Temperatura** y **contexto** (`num_ctx`).
- **Directorio de trabajo** (el proyecto sobre el que opera el asistente).

La configuración se guarda en `cliwf-ia-config.json` (carpeta de datos de la app).
También puedes usar variables de entorno como valores por defecto:
`CLI_WF_OLLAMA_URL` y `CLI_WF_OLLAMA_MODEL`.

### Qué puede hacer

- **Responder y ejecutar cualquier petición** con contexto de conversación.
- **Git:** revisar `git status`/`git diff`, agrupar cambios en commits lógicos con
  mensajes Conventional Commits, hacer `push`/`pull`, crear y cambiar de rama y
  deshacer cambios.
- **Terminal:** ejecutar comandos (con confirmación para los peligrosos).
- **Archivos:** leer, buscar, crear y editar archivos del proyecto.
- **Código:** explicar, revisar y refactorizar.
- **Tests:** ejecutar los tests de Python y el typecheck del frontend.
- **Resumen del proyecto:** estado del repositorio y cambios recientes.

Las acciones destructivas o irreversibles (`push --force`, `reset --hard`, borrar
ramas, descartar cambios, sobrescribir archivos) **piden confirmación** antes de
ejecutarse. Todas las acciones quedan registradas en `cliwf-ia.log` (carpeta de
datos).

## Documentación

- `docs/SRS.md` — Especificación de requisitos (resumen de una página).
- `docs/srs/IEEE-830.md` — Especificación de requisitos completa conforme a
  IEEE 830-1998 (introducción, descripción general, requisitos específicos,
  diagramas y matriz de trazabilidad, todo en un solo documento).
- `docs/architecture.md` — Decisiones de arquitectura (Electron + Python + API local).
- `docs/api-contract.md` — Contratos de la API local.
- `docs/frontend.md` — Decisiones de UI (temas, Font Awesome local, SweetAlert2, semántica).
- `docs/changelog.md` — Registro de cambios.

## Contribuir

1. Haz un fork y clona el repositorio.
2. Ejecuta `npm install`.
3. Crea una rama para tu cambio.
4. Verifica que pasan `npm run typecheck` y `npm run test:python`.
5. Abre un pull request.

## Licencia

MIT.

## Autor

[estebanano014](https://github.com/estebanano014)
