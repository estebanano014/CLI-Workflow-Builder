# ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE (SRS)

## GESTOR VISUAL DE FLUJOS DE TRABAJO (CLI WORKFLOW BUILDER)

- Versión: 1.0 (MVP)
- Estándar: IEEE 830
- Estado: Línea base para desarrollo
- SO objetivo: Windows 10/11
- Dependencia de Internet: Ninguna (offline por diseño)

## 1. INTRODUCCIÓN

### 1.1 Propósito

Definir los requisitos funcionales y no funcionales de una aplicación de escritorio offline que ayuda a un usuario único a recordar, ordenar y practicar comandos de consola mediante flujos secuenciales visuales, y a descomponer problemas simples en pasos lógicos antes de programar.

### 1.2 Alcance

Dentro del MVP: Dashboard, Constructor de Rutas, Modo Ejecución paso a paso, Módulo de Recetas de Lógica, Ajustes, Import/Export, API local del núcleo, persistencia JSON local.

Fuera del MVP: ejecución real de comandos en terminal, sincronización en nube, multiusuario, historial de ejecuciones, práctica guiada formal, drag & drop, internacionalización, ejecución en sistemas operativos distintos de Windows.

### 1.3 Definiciones

- **Ruta:** flujo secuencial ordenado de comandos.
- **Paso:** unidad de una Ruta (título, variantes de comando por sistema operativo, nota, flag destructivo).
- **Variante:** comando concreto asociado a un sistema operativo (windows, linux, macos, any), con marca de alternativo.
- **Receta:** descomposición lógica de un problema (entrada, salida, pasos en texto).
- **Variable de paso:** placeholder `{{x}}` definido en el paso, rellenado al iniciar la ejecución.
- **Variable global:** valor reutilizable definido en Ajustes, resuelto en silencio.
- **Núcleo:** proceso Python que expone la API local y gestiona el dominio y la persistencia.

### 1.4 Referencias

- IEEE Std 830-1998.
- Decisiones de diseño registradas en el Apéndice A.

### 1.5 Resumen

La sección 2 describe el producto y su contexto. La sección 3 lista los requisitos específicos (RF y RNF) con prioridad y criterio de aceptación. Los apéndices contienen trazabilidad y supuestos.

## 2. DESCRIPCIÓN GENERAL

### 2.1 Perspectiva del producto

Aplicación de escritorio Electron + React + TypeScript con un núcleo Python que expone una API HTTP local (solo 127.0.0.1, puerto efímero, token efímero por variable de entorno). La interfaz de usuario consume la API y no accede al JSON directamente. Todo el sistema opera sin Internet.

### 2.2 Funciones principales

1. Gestión de Rutas y Recetas (CRUD) con etiquetas y favoritos.
2. Constructor visual de Rutas con variantes de comando por sistema operativo.
3. Modo Ejecución paso a paso con variables y copia al portapapeles.
4. Módulo de Recetas de Lógica con checklist volátil.
5. Ajustes (variables globales, sistema operativo preferido, import/export).
6. API local documentada para comunicación con la interfaz y herramientas locales.

### 2.3 Usuarios

Usuario único (solopreneur). Sin roles ni autenticación de usuarios finales. El token efímero protege la API frente a otros procesos locales.

### 2.4 Restricciones

- Compila y ejecuta en Windows 10/11.
- Sin dependencia de Internet ni telemetría.
- Persistencia en un solo archivo JSON local.
- Entregable documental en dos versiones: sin formato y Unicode.

### 2.5 Supuestos

"Comunicación externa" se interpreta como API local offline consumible por la interfaz y por herramientas locales. La exposición a red queda fuera del MVP (ver Apéndice B).

## 3. REQUISITOS ESPECÍFICOS

Prioridades: M = Must (imprescindible en MVP), S = Should, C = Could.

### 3.1 Requisitos Funcionales (RF)

#### 3.1.1 Dashboard

- **RF-001.** Mostrar pestañas "Todo / Rutas / Recetas" con indicador de tipo por tarjeta. Prioridad: M. Criterio de aceptación: las tres vistas filtran correctamente; cada tarjeta muestra su tipo.
- **RF-002.** Buscar por texto en título, descripción y etiquetas. Prioridad: M. Criterio de aceptación: resultados en menos de 300 ms con 200 elementos.
- **RF-003.** Filtrar por etiqueta y por favorito. Prioridad: M. Criterio de aceptación: combinable con búsqueda; resultados coherentes.
- **RF-004.** Ordenar por recientes (usa lastRunAt), nombre y favorito. Prioridad: M. Criterio de aceptación: orden estable y persistente en sesión.
- **RF-005.** Acciones rápidas por tarjeta: Iniciar/Ejecutar, Editar, Duplicar, Eliminar con confirmación. Prioridad: M. Criterio de aceptación: eliminar exige confirmación modal; duplicar crea copia con nuevo id.
- **RF-006.** Botones primarios: Crear Ruta, Crear Receta. Prioridad: M. Criterio de aceptación: abren el editor correspondiente en estado vacío válido.
- **RF-007.** Acceso a Ajustes e Import/Export. Prioridad: M. Criterio de aceptación: navegación funcional; Import pide confirmación de sobrescritura.

#### 3.1.2 Constructor de Rutas

- **RF-010.** Crear y editar Ruta con nombre (obligatorio, único), descripción, etiquetas, favorito, color e icono. Prioridad: M. Criterio de aceptación: no se guarda sin nombre; duplicado rechazado con mensaje.
- **RF-011.** Gestionar pasos: agregar, insertar en medio, duplicar, eliminar con confirmación, reordenar con botones subir/bajar. Prioridad: M. Criterio de aceptación: reordenamiento reflejado en el campo orden; eliminación con confirmación.
- **RF-012.** Cada paso contiene título, descripción, esDestructivo y una lista de variantes {so, comando, nota, esAlternativo}. Prioridad: M. Criterio de aceptación: se permite al menos una variante por paso; so en {windows, linux, macos, any}.
- **RF-013.** Validaciones: no pasos vacíos, máximo 50 pasos por Ruta, advertencia (no bloqueo) si falta variante para el sistema operativo preferido. Prioridad: M. Criterio de aceptación: mensajes junto al campo, en lenguaje humano.
- **RF-014.** Declarar variables de paso `{{x}}` con defaultValue opcional. Prioridad: M. Criterio de aceptación: la vista previa del comando resuelto refleja el default.
- **RF-015.** Vista previa del comando con variables resaltadas. Prioridad: S. Criterio de aceptación: las variables se distinguen visualmente.

#### 3.1.3 Modo Ejecución

- **RF-020.** Pantalla previa de variables: muestra solo las variables de paso usadas en el flujo, con defaults precargados y editables. Prioridad: M. Criterio de aceptación: no inicia sin rellenar obligatorias; las globales no se piden.
- **RF-021.** Presentación del paso: comando resuelto en monoespaciado con variables resaltadas, título, indicador "Paso X de Y", nota y etiqueta de sistema operativo activa. Prioridad: M. Criterio de aceptación: cambio de sistema operativo en caliente si hay variantes.
- **RF-022.** Barra de progreso siempre visible; lista lateral solo lectura y colapsable. Prioridad: M. Criterio de aceptación: no permite saltar pasos.
- **RF-023.** Botón "Siguiente" siempre habilitado; énfasis visual condicionado a copiar. Prioridad: M. Criterio de aceptación: sin diálogos intrusivos; nunca bloquea el avance.
- **RF-024.** Controles: Anterior (conserva variables), Reiniciar (conserva variables de la ejecución en curso, con confirmación), Salir (confirmación si hay progreso). Prioridad: M. Criterio de aceptación: comportamiento verificable en cada control.
- **RF-025.** Copiar comando: feedback en el propio botón (aproximadamente 1.5 s más check); fallback a campo seleccionable si falla el portapapeles. Prioridad: M. Criterio de aceptación: fallback probado forzando error de portapapeles.
- **RF-026.** Comandos multilínea: se copia el bloque completo. Prioridad: M. Criterio de aceptación: verificado con comando de tres líneas.
- **RF-027.** Aviso visible si esDestructivo es verdadero antes de copiar. Prioridad: M. Criterio de aceptación: el aviso aparece solo cuando aplica.
- **RF-028.** Pantalla de completado: resumen en memoria (pasos y comandos resueltos, no persistido) más acciones Repetir y Volver al Dashboard. Prioridad: M. Criterio de aceptación: no se escribe nada en disco salvo lastRunAt.
- **RF-029.** Persistir únicamente lastRunAt por Ruta al completar. Prioridad: M. Criterio de aceptación: JSON verificado; no contiene valores de variables.

#### 3.1.4 Recetas de Lógica

- **RF-030.** Crear y editar Receta con título, descripción, entrada y salida (opcionales, texto libre), etiquetas y favorito. Prioridad: M. Criterio de aceptación: guardado válido sin entrada ni salida.
- **RF-031.** Pasos como objetos {id, texto} ordenados; insertar, duplicar, eliminar con confirmación, reordenar con botones. Prioridad: M. Criterio de aceptación: mismo componente reutilizado que en Rutas.
- **RF-032.** Checklist volátil (no persistente) para marcar pasos durante la sesión de pantalla. Prioridad: M. Criterio de aceptación: al cerrar la pantalla los checks se pierden; lastRunAt se actualiza al marcar todos o pulsar "Terminé".
- **RF-033.** Toggle "Ocultar pasos" (desenfoque hasta clic por paso). Prioridad: C. Criterio de aceptación: funcional si se implementa; no bloquea entrega.

#### 3.1.5 Ajustes

- **RF-040.** Definir variables globales `{{x}}` reutilizables. Prioridad: M. Criterio de aceptación: disponibles en todas las Rutas; precedencia paso sobre global.
- **RF-041.** Configurar sistema operativo preferido. Prioridad: M. Criterio de aceptación: afecta la variante mostrada por defecto y las advertencias del Constructor.
- **RF-042.** Import y Export del JSON propio. Prioridad: M. Criterio de aceptación: Import valida estructura mínima y pide confirmación de sobrescritura.

#### 3.1.6 API local del núcleo

- **RF-050.** Exponer API HTTP local con endpoints /v1/rutas, /v1/recetas, /v1/ajustes, /v1/import, /v1/export y /v1/salud. Prioridad: M. Criterio de aceptación: contratos documentados; la interfaz opera exclusivamente vía API.
- **RF-051.** Escuchar solo en 127.0.0.1, puerto libre automático y token efímero recibido por variable de entorno. Prioridad: M. Criterio de aceptación: petición sin token devuelve 401; acceso remoto rechazado.
- **RF-052.** La interfaz no accede directamente al JSON. Prioridad: M. Criterio de aceptación: revisión de código sin lecturas ni escrituras de archivo en el frontend.

#### 3.1.7 Persistencia

- **RF-060.** Persistir todo en datos_flujos.json con schemaVersion. Prioridad: M. Criterio de aceptación: archivo legible; versión numérica presente.
- **RF-061.** Escritura atómica (tmp más rename) y backup antes de cada guardado exitoso. Prioridad: M. Criterio de aceptación: simulación de cierre a mitad de guardado no corrompe el original.
- **RF-062.** Si el JSON está corrupto, no sobrescribir; avisar y ofrecer restaurar backup. Prioridad: M. Criterio de aceptación: escenario probado con archivo corrupto.

### 3.2 Requisitos No Funcionales (RNF)

- **RNF-001.** Offline por diseño: ninguna funcionalidad depende de Internet ni envía telemetría. Prioridad: M. Criterio de aceptación: prueba con red desconectada; todas las funciones operan.
- **RNF-002.** Compilación en Windows 10/11: build reproducible desde cero en máquina limpia. Prioridad: M. Criterio de aceptación: instrucciones en README; build exitoso en máquina virtual limpia.
- **RNF-003.** Usabilidad: toda operación destructiva pide confirmación; errores junto al campo en lenguaje humano. Prioridad: M. Criterio de aceptación: inspección más checklist de aceptación.
- **RNF-004.** Primera Ruta en menos de 3 minutos sin manual, validado con 2 o 3 personas ajenas al proyecto. Prioridad: M. Criterio de aceptación: registro de la prueba con métricas.
- **RNF-005.** Rendimiento: arranque en frío menor a 4 s; operaciones menores a 300 ms con 200 elementos totales (Rutas más Recetas). Prioridad: M. Criterio de aceptación: archivo de prueba generado; medición documentada.
- **RNF-006.** Almacenamiento: un solo JSON más backup; tamaño esperado menor a 5 MB con uso normal. Prioridad: M. Criterio de aceptación: verificación con archivo de prueba.
- **RNF-007.** Fiabilidad de datos: escritura atómica, backup y schemaVersion. Prioridad: M. Criterio de aceptación: pruebas de corrupción y restauración.
- **RNF-008.** Mantenibilidad: componente de lista ordenada editable reutilizado; separación de dominio, persistencia e interfaz. Prioridad: M. Criterio de aceptación: revisión de código.
- **RNF-009.** Privacidad: no se persisten valores de variables (tokens, rutas, contraseñas). Prioridad: M. Criterio de aceptación: auditoría del JSON tras ejecuciones.
- **RNF-010.** Seguridad de la API local: solo 127.0.0.1, token efímero por arranque vía variable de entorno, rechazo de orígenes no locales. Prioridad: M. Criterio de aceptación: pruebas de acceso sin token y desde otra interfaz.
- **RNF-011.** Accesibilidad mínima: navegación por teclado en Modo Ejecución con atajos flecha derecha o Enter, flecha izquierda, C, R y Esc; teclas de una letra inactivas con foco en campo de texto. Prioridad: M. Criterio de aceptación: pruebas manuales de teclado.
- **RNF-012.** Contraste suficiente en resaltado de variables y avisos de destructivo. Prioridad: S. Criterio de aceptación: verificación visual con herramienta de contraste.
- **RNF-013.** API documentada y versionada (/v1); cambios incompatibles pasan a /v2. Prioridad: M. Criterio de aceptación: documento de contratos en el repositorio.
- **RNF-014.** Latencia de API menor a 100 ms por endpoint con 200 elementos. Prioridad: M. Criterio de aceptación: medición con archivo de prueba.
- **RNF-015.** Compatibilidad: solo Windows 10/11 verificado en el MVP; otros sistemas operativos no soportados. Prioridad: M. Criterio de aceptación: declarado en README y SRS.
- **RNF-016.** Internacionalización: fuera del MVP; interfaz en español. Prioridad: C. Criterio de aceptación: declarado.

## 4. APÉNDICES

### Apéndice A. Trazabilidad de decisiones

- Stack Electron + React + TypeScript y Python: afecta RF-050 a RF-052, RNF-002, RNF-008, RNF-010.
- HTTP local con token efímero: afecta RF-051, RNF-010, RNF-013, RNF-014.
- JSON único, atómico y con backup: afecta RF-060 a RF-062, RNF-006, RNF-007.
- Variables globales y de paso: afecta RF-014, RF-020, RF-040.
- Modo Ejecución (siguiente siempre habilitado, lista solo lectura, lastRunAt): afecta RF-021 a RF-029.
- Recetas ({id, texto}, checks volátiles, ocultar pasos como Could): afecta RF-030 a RF-033.
- Atajos de teclado: afecta RNF-011.
- Sin drag & drop en MVP: afecta RF-011.
- Sin ejecución real de comandos: ver alcance 1.2.

### Apéndice B. Supuestos y dependencias externas

- Supuesto A: "comunicación externa" equivale a API local offline. Si se requiere exposición a otros programas en red, se evalúa como evolución (cambio de configuración, no rediseño).
- Dependencia: toolchain de Electron/Node y Python embebido para empaquetado en Windows.
- No dependencia: Internet, servicios cloud, autenticación remota.

### Apéndice C. Entregable documental

- Versión sin formato: texto plano UTF-8 (.txt o .md sin estilos), misma estructura de secciones 1 a 4, sin tablas decorativas (listas con guiones).
- Versión Unicode: documento con UTF-8, tildes, ñ, símbolos de flecha y de advertencia, y tablas Markdown.
- Ambas versiones deben ser idénticas en contenido; solo difieren en presentación.

### Apéndice D. Fuera de alcance (evolutivo)

Ejecución real de comandos, historial de ejecuciones, estadísticas y rachas, práctica guiada formal, drag & drop, enlace Ruta-Receta, internacionalización, multiusuario, sincronización, instaladores firmados, auto-actualización.

FIN DEL DOCUMENTO
