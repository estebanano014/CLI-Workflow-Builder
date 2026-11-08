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

### 2. Buscar un comando

Entra en **Biblioteca** (menú lateral) y escribe en el buscador por *acción*, *comando* o *palabra clave*. Ejemplos:

- `"subir cambios"` → el comando para subir al repositorio de GitHub.
- `"grep"` o `"buscar texto"` → cómo buscar texto dentro de archivos.
- `"instalar"` → los gestores de paquetes por sistema operativo.

### 3. Filtrar por sistema operativo

En la Biblioteca usa el selector **Todos los sistemas / Windows / macOS / Linux**. En Windows se muestran por separado **CMD** y **PowerShell** cuando el comando difiere. También puedes filtrar por **categoría** (Git, Red, Procesos…).

### 4. Copiar los comandos

Cada comando tiene un botón **Copiar**. En el **Modo Ejecución** de una Ruta, el botón copia el comando ya resuelto (y te avisa antes si es un paso destructivo).

### 5. Funcionalidades extra

- **Rutas:** secuencias de comandos con variantes por SO, variables `{{x}}` y vista previa.
- **Modo Ejecución:** avanza paso a paso con barra de progreso y atajos de teclado (`→`, `←`, `C`, `R`, `Esc`).
- **Recetas:** descompón problemas en pasos con checklist.
- **Temas:** 9 temas (5 base × claro/oscuro + 4 de daltonismo).
- **Importar / Exportar** tu archivo de datos.

## Tecnologías usadas

- **UI:** Electron + React + TypeScript + Vite (electron-vite), SweetAlert2, Font Awesome y Manrope (todo local, sin CDN).
- **Núcleo:** Python (biblioteca estándar) con API HTTP local `/v1` (solo `127.0.0.1`, token efímero).
- **Persistencia:** un único JSON local (`datos_flujos.json`) con escritura atómica y backup.

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
