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

Entra en **Biblioteca** (menú lateral) y escribe en el buscador por *acción*, *comando* o *palabra clave*. Ejemplos:

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
- **Temas:** 9 temas (5 base × claro/oscuro + 4 de daltonismo).
- **Importar / Exportar** tu archivo de datos.
- **Cuenta local:** registro y login offline (una sola cuenta por equipo).

## Tecnologías usadas

- **UI:** Electron + React + TypeScript + Vite (electron-vite), SweetAlert2, Font Awesome y Manrope (todo local, sin CDN).
- **Núcleo:** Python (biblioteca estándar) con API HTTP local `/v1` (solo `127.0.0.1`, token efímero).
- **Persistencia:** JSON local (`datos_flujos.json`) con escritura atómica y backup, y `datos_auth.json` para la cuenta local (contraseña con hash, nunca en claro).

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
