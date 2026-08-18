# Auditoría completa de código y producto

Fecha original: 5 de agosto de 2026
Última revisión: 18 de agosto de 2026
Versión revisada: `0.7.0`
Alcance: extensión completa, interfaz de nueva pestaña, elementos y variantes, persistencia, importación/exportación, fondos, historial, sugerencias, sincronización con Drive, OAuth Worker, scripts de empaquetado y workflows de GitHub Actions.

> Revisión 0.7.0: `package.json`, `package-lock.json`, manifests de Chrome y Firefox
> y `.release-please-manifest.json` están alineados en `0.7.0`. Esta versión añadió
> la página/menú de desinstalación y el sitio público; esos cambios no invalidan los
> hallazgos funcionales de la nueva pestaña. El P0 de URLs se corrigió durante esta
> revisión y el resto de hallazgos conserva su prioridad salvo indicación expresa.

## Resumen ejecutivo

El proyecto tiene una base razonablemente clara: TypeScript estricto, modelo discriminado por tipo de elemento, separación entre render y configuración, normalización de variantes antiguas, builds independientes para Chromium y Firefox y un mecanismo de revisión optimista para Drive.

Las comprobaciones existentes pasan:

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- `npm run build`: correcto para Chromium y Firefox.
- Advertencia del build: el chunk principal minificado mide aproximadamente `771 kB` (`219 kB` gzip), por encima del umbral de `500 kB` de Vite.

Sin embargo, no existe una suite de pruebas. La revisión manual encontró problemas que no cubren TypeScript ni ESLint. Los más importantes son:

1. Los elementos nuevos se agregan todos en el centro y se superponen.
2. Aceptar datos remotos mientras existe una edición puede conservar y luego guardar un borrador local obsoleto.
3. Las URLs editadas o importadas no se normalizan ni restringen a protocolos seguros.
4. La validación de datos persistidos/importados es incompleta y acepta números no finitos, estilos inválidos y links internos mal formados.
5. Tablero y fondos se sincronizan en archivos y operaciones separadas, por lo que una interrupción puede producir configuraciones incompatibles.
6. Dos variantes de link existen y se renderizan, pero no están disponibles en la configuración.
7. La fecha se calcula una sola vez y no cambia al cruzar medianoche.

Recomendación general: antes de añadir muchos elementos nuevos, cerrar primero P0/P1, introducir validación de esquema y pruebas del modelo, y unificar el sistema de configuración visual. Esto reducirá regresiones en todas las variantes futuras.

## Escala de prioridad

| Prioridad | Significado                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| P0        | Riesgo de seguridad, pérdida o corrupción de datos; atender antes de publicar. |
| P1        | Bug funcional importante o flujo que puede sobrescribir trabajo.               |
| P2        | Inconsistencia, mantenibilidad, rendimiento o UX relevante.                    |
| P3        | Mejora incremental o nueva capacidad.                                          |

## Hallazgos priorizados

### P0 — Restringir y normalizar URLs en todos los puntos de entrada

**Estado en 0.7.0 (18 de agosto de 2026): resuelto.**

**Verificación actual**

- `parseNavigableUrl` es el punto único de validación y devuelve un resultado tipado.
- Solo se permiten explícitamente `http:` y `https:`; esquemas como `javascript:`,
  `data:` y `file:` se rechazan.
- Las URLs sin esquema se completan con `https://` y `URL` normaliza host, IDN,
  puerto y ruta.
- La creación, la edición de links, los links de grupo y la importación usan el
  mismo parser.
- La importación valida recursivamente los links internos de cada grupo y normaliza
  las URLs aceptadas.
- La interfaz muestra el error inline y desactiva “Guardar” o “Agregar link” mientras
  exista una URL inválida.
- El historial reciente ya filtraba entradas para admitir solo `http/https`.

**Pendiente de cobertura**

- Añadir una suite automatizada para URL sin esquema, espacios, IDN, puertos,
  `localhost`, esquemas bloqueados y cadenas vacías. El repositorio todavía no
  cuenta con infraestructura de pruebas.

### P1 — Evitar que todos los elementos nuevos se superpongan

**Evidencia**

En `NewTab.tsx:addItem`, `getNextLayout` calcula una posición escalonada según el número de elementos, pero inmediatamente se sobrescriben `x: 0`, `y: 0`, `anchorX: "center"` y `anchorY: "center"`.

**Impacto**

Cada elemento nuevo aparece exactamente en el centro. Después del primero, el usuario puede pensar que no se agregó o debe mover manualmente las capas para encontrarlas.

**Recomendación**

- Conservar la intención de `getNextLayout` y convertir su posición a coordenadas ancladas al centro.
- Mejor aún: implementar `findFreePlacement`, probando una espiral o cuadrícula alrededor del centro y evitando intersecciones.
- Al insertar duplicados, repetir la búsqueda si el desplazamiento de 24 px aún colisiona.
- Añadir prueba de 1, 2, 5 y 20 elementos, incluyendo viewport pequeño.

### P1 — Cerrar o reconciliar el borrador al aplicar datos remotos

**Evidencia**

- El tablero visible en edición es `draftBoard`.
- Las rutas que aplican Drive (`carga inicial`, `conflicto → usar Drive`, `descargar`, `conectar → usar Drive`) llaman `setWorkspace(remoteWorkspace)` pero no cancelan la edición ni reemplazan siempre `draftBoard`.
- `saveEditing` puede aplicar después ese borrador anterior sobre el workspace remoto.

**Escenario**

1. El usuario edita localmente.
2. Aparece un conflicto y elige usar Drive.
3. El workspace remoto se aplica, pero el borrador local sigue abierto.
4. Al pulsar guardar, el borrador anterior reemplaza el tablero remoto recién aceptado.

**Recomendación**

- Centralizar la aplicación remota en `applyRemoteWorkspace(remoteWorkspace)`.
- Si hay edición, pedir una decisión explícita: descartar borrador, exportarlo o cancelar la descarga.
- Tras aceptar remoto: `setDraftBoard(copyBoard(nextActiveSpace.board))`, cerrar ventanas, limpiar selección y salir de edición.
- Mantener una `baseRevision` en la sesión de edición y rechazar guardado si cambió.
- Probar conflictos con y sin edición, cambio de espacio y descarga manual.

### P1 — Endurecer la validación y normalización de datos

**Evidencia**

`isValidItem` valida principalmente propiedades de nivel superior:

- No valida `createdAt`, `display`, contenido ni rangos de `style`.
- En grupos solo comprueba `Array.isArray(item.links)`; no valida cada link.
- `hasValidLayout` acepta cualquier valor cuyo `typeof` sea `number`, incluyendo `NaN` e `Infinity`.
- No valida anclajes, variantes compatibles con el tipo, colores, tamaños, límites de strings, IDs duplicados ni URLs.
- `clampLayout` no corrige `NaN`.

**Impacto**

Un JSON corrupto o manipulado puede crear estilos CSS inválidos, elementos invisibles, tamaños extremos, IDs duplicados, enlaces inesperados o fallos posteriores en render. Drive confía en esta misma capa cuando se aplica el workspace.

**Recomendación**

- Incorporar un esquema versionado (Zod, Valibot o validadores propios exhaustivos).
- Usar `Number.isFinite` y límites máximos razonables.
- Validar recursivamente los links del grupo.
- Validar cada discriminante y sus propiedades específicas.
- Normalizar IDs duplicados durante importación.
- Rechazar o sanear strings excesivamente largos.
- Separar `parse`, `migrate` y `normalize`; actualmente están parcialmente mezclados.
- Hacer que el resultado informe errores concretos, no solo `null`.

### P1 — Hacer atómica o versionada la sincronización de tablero y recursos

**Evidencia**

Drive usa un archivo para el workspace y otro para fondos/icono. El workspace tiene `revision`, pero el bundle de recursos no participa en el conflicto. Guardar manualmente realiza primero una operación y después otra. Los cambios de fondos se programan con un `setTimeout` independiente.

**Impacto**

- Un guardado puede completar el tablero y fallar los fondos.
- Dos dispositivos pueden sobrescribir recursos sin detectar conflicto.
- El workspace puede referenciar un fondo que todavía no existe remotamente o que otro dispositivo sustituyó.
- La fecha “último guardado” puede representar solo recursos, no el workspace completo.

**Recomendación**

- Añadir `assetRevision`/hash y un `bundleId` compartido en ambos archivos.
- Preferir un único envelope si el tamaño es aceptable; si no, subir recursos primero y publicar después un manifest que los referencie.
- Serializar guardados mediante una cola de una sola escritura.
- Mostrar estado separado: configuración, fondos y último error.
- No declarar `synced` hasta completar todas las operaciones necesarias.

### P1 — Corregir escrituras parciales al importar fondos

**Evidencia**

`importWallpapers` escribe cada blob en IndexedDB antes de confirmar la configuración. Si una imagen posterior falla o `commit(nextSettings)` no puede guardar, los blobs ya escritos no se revierten.

**Impacto**

Puede dejar archivos huérfanos y consumir cuota. Una importación parcialmente fallida puede además reemplazar blobs que compartan ID con recursos existentes.

**Recomendación**

- Validar y decodificar todo primero.
- Generar IDs nuevos para colisiones o confirmar reemplazo.
- Ejecutar una única transacción de IndexedDB para el lote.
- Guardar un snapshot de metadatos y revertir si falla `commit`.
- Implementar limpieza al iniciar: borrar blobs sin metadatos y metadatos sin blob.

### P1 — Actualizar la fecha al cambiar el día

**Evidencia**

`today` se calcula con `useMemo(..., [])` en `NewTab.tsx`.

**Impacto**

Una pestaña dejada abierta durante la noche muestra la fecha anterior indefinidamente.

**Recomendación**

- Crear `useToday(locale)` que programe el siguiente cambio a medianoche.
- Recalcular también en `visibilitychange`, porque los temporizadores pueden suspenderse.
- Hacer configurable locale, formato, zona horaria y opción de incluir hora.

### P1 — Manejar fallos de almacenamiento local sin romper el render

**Evidencia**

`workspaceStorage.save` usa `localStorage.setItem` sin `try/catch`, y se invoca desde un efecto en cada cambio de workspace. Otras áreas sí capturan fallos.

**Impacto**

Cuota llena, almacenamiento deshabilitado o una excepción del navegador pueden escapar del efecto. El usuario no recibe indicación de que sus cambios no persistieron.

**Recomendación**

- Hacer que `save` devuelva `{ok, error}`.
- Mostrar estado “cambios no guardados localmente”.
- Debounce de persistencia para ediciones continuas.
- Considerar `browser.storage.local` para workspace y reservar IndexedDB para blobs.

### P2 — Exponer o retirar `link-text` y `link-strip`

**Evidencia**

Ambas variantes están en tipos, capacidades, documentación y render implícito, pero `LinkConfig` solo ofrece cinco opciones y omite `link-text` y `link-strip`.

**Impacto**

Datos antiguos pueden renderizarlas, pero el usuario no puede volver a elegirlas una vez que cambia de variante. La capacidad anunciada y la UI no coinciden.

**Recomendación**

- Si son válidas, agregarlas a configuración y a presets de creación.
- Si fueron descartadas, migrarlas explícitamente y eliminarlas de tipos/documentación.
- Derivar opciones de una única definición por variante para evitar divergencias.

### P2 — Unificar la definición de variantes y capacidades

Actualmente una variante está repartida entre:

- unions de TypeScript;
- `validVariantsByType`;
- `variantCapabilities`;
- arrays escritos a mano en cinco archivos de configuración;
- condicionales de render;
- cálculos de altura/tamaño;
- documentación manual.

Esto ya produjo divergencias. Crear un registro único:

```ts
type VariantDefinition = {
  type: BoardItemType;
  id: BoardItemDisplay["variant"];
  label: string;
  description: string;
  capabilities: BoardItemVariantCapabilities;
  defaults?: { layout?: Partial<BoardLayout>; style?: Partial<BoardItemStyle> };
};
```

Desde ese registro se pueden derivar opciones, validación, defaults y parte de la documentación.

### P2 — Simplificar el cálculo de altura máxima

La condición de `getItemMaxHeight` contiene lógica redundante:

```ts
(item.type !== "search" || !style.fontSizeLocked) &&
  !style.fontSizeLocked &&
  !display.iconSizeLocked;
```

Además mezcla tres responsabilidades: medición de contenido, restricciones de resize y política de autosize. Es difícil demostrar que cada variante conserva contenido al bloquear fuente/icono.

**Recomendación**

- Separar `measurePreferredHeight(item)`, `getResizeConstraints(item)` y `fitLayoutToContent(item)`.
- Declarar restricciones por variante.
- Probar combinaciones de `fontSizeLocked`, `iconSizeLocked`, padding 0/40 y contenedores mínimos.

### P2 — Impedir que elementos queden completamente fuera del viewport

`clampLayout` limita coordenadas negativas solo para anclajes laterales, pero no limita el borde derecho/inferior ni el rango de offsets centrados. Redimensionar el navegador o introducir X/Y grandes puede dejar elementos inaccesibles.

**Recomendación**

- Mantener al menos una franja interactiva (por ejemplo 24 px) visible.
- Añadir “Centrar elemento”, “Ajustar todos a pantalla” y zoom del tablero.
- Normalizar respecto al viewport al guardar o ofrecer canvas virtual explícito.

### P2 — Debounce real y cola para guardado de fondos

`scheduleWallpaperDriveSave` crea un nuevo timeout en cada llamada, sin cancelar el anterior. Varias modificaciones rápidas generan subidas concurrentes; la última en finalizar, no necesariamente la última iniciada, determina el estado remoto.

**Recomendación**

- Guardar el timer en un ref y cancelarlo.
- Mantener una cola `latest-wins` con número de operación.
- Cancelar o ignorar resultados viejos.
- Reintentar con backoff y conservar el estado pending ante fallos temporales.

### P2 — Cancelación real y caché de sugerencias

El `AbortController` de `useSearchSuggestions` solo impide aplicar el resultado; no cancela el `fetch` del background. Cada pulsación puede continuar consumiendo red. Tampoco hay caché por consulta.

**Recomendación**

- Enviar un `requestId` y soportar cancelación en background, o usar un puerto por búsqueda.
- Añadir caché LRU corta por motor/query.
- Aplicar timeout de red y límite de tamaño de respuesta.
- Consultar `permissions.contains` antes de pedir permiso; el estado de permiso actual vive solo en el montaje del componente.

### P2 — Reducir el bundle inicial

Aunque varias ventanas usan `lazy`, el chunk principal conserva gran parte de Mantine, iconos y lógica. El build reporta ~`771 kB` minificado.

**Recomendación**

- Analizar con `rollup-plugin-visualizer`.
- Evitar imports que arrastren catálogos completos de iconos.
- Cargar bajo demanda historial, Drive, selectores de iconos y renderizadores poco usados.
- Definir `manualChunks` solo después de medir.
- Añadir presupuesto CI para tamaño gzip del entry y CSS.

### P2 — Eliminar duplicación entre configuración general y diseño de título

`configSections.tsx` ya implementa color, texto y contenedor, pero `TitleDesignWindow.tsx` repite fuentes, swatches y mutadores. Mientras tanto, la ventana normal de link/search/date no expone todos esos controles, aunque el modelo los soporta.

**Recomendación**

- Crear un `ElementDesignPanel` compartido y parametrizado por capacidades.
- Integrarlo en la configuración de todos los elementos o abrirlo desde un botón de paleta consistente.
- Mantener ventanas separadas solo si resuelven tareas diferentes, no por tipo.

### P2 — Evitar efectos secundarios dentro de setters de estado

`deleteSpace` llama `setDraftBoard` dentro del callback de `setWorkspace`. Los actualizadores deben ser puros; React puede ejecutarlos más de una vez en desarrollo o bajo estrategias concurrentes.

**Recomendación**

Calcular primero `nextSpaces`, `activeSpaceId` y `nextDraft`, y ejecutar setters independientes fuera del callback; o migrar el estado relacionado a `useReducer`.

### P2 — Actualizar documentación funcional

`docs/elements.md` ya no describe la UI actual:

- Afirma que “Agregar” tiene dos zonas y que allí se elige variante; la UI actual agrega el tipo directamente y la variante se cambia después.
- Documenta `search-box`, que no existe en los tipos; el código usa `search-input`.
- Dice que búsqueda usa actualmente Google, aunque existen seis motores.
- Incluye las dos variantes de link no expuestas.
- Describe controles visuales generales que no están disponibles de forma uniforme.

Tratar la documentación como parte del criterio de aceptación de cada variante.

### P2 — Mejorar accesibilidad del editor

Puntos positivos: hay `aria-label` en muchas acciones y soporte de nudging con teclado. Pendientes:

- No hay alternativa de teclado completa para redimensionar.
- Drag-and-drop no anuncia posición ni tamaño.
- Los botones de variante no exponen `aria-pressed`.
- Colores y fondos personalizados no tienen validación automática de contraste.
- Los links de grupos solo con icono necesitan nombre accesible explícito; ocultar el texto visual no garantiza una etiqueta útil.
- La interfaz depende mucho de ventanas flotantes y posiciones absolutas en viewports pequeños.

**Recomendación**

Añadir modo de propiedades con campos X/Y/ancho/alto accesibles, `aria-live` para movimientos, foco administrado al abrir/cerrar ventanas y pruebas con teclado y lector de pantalla.

### P2 — Revisar carga de favicon remoto y caché

La política declara correctamente el uso de `geticon.dev`, pero `requestSiteFaviconPermission` siempre devuelve `true`: la acción parece solicitar permiso aunque no lo hace. Esto puede inducir a error en mantenimiento y UX.

**Recomendación**

- Renombrar a `canUseRemoteFaviconService` si no hay permiso del navegador.
- Explicar en UI que el dominio se enviará a un tercero antes de activar el favicon remoto.
- Permitir favicon local/manual y desactivar servicio remoto globalmente.
- Aplicar límites de caché, expiración y limpieza.

## Revisión por elemento y variante

### Link

| Variante          | Estado                  | Riesgos/mejoras                                                                                                        |
| ----------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `link-card`       | Disponible              | URL sin validación al editar; subtítulo usa color heredado y puede perder contraste; añadir tooltip para URL truncada. |
| `link-card-plain` | Disponible              | Padding sigue activo aunque sea “limpia”; aclarar semántica; ofrecer área clicable mínima.                             |
| `link-icon`       | Disponible              | Sin texto visible; asegurar `aria-label` y tooltip con nombre/host.                                                    |
| `link-icon-plain` | Disponible              | Riesgo de target demasiado pequeño; mínimo recomendado 44×44 CSS px o tooltip/foco visible.                            |
| `link-text`       | Oculta en configuración | Exponer o migrar/eliminar. Añadir subrayado/foco para que parezca interactivo.                                         |
| `link-strip`      | Oculta en configuración | Exponer o migrar/eliminar. Diferenciar claramente de card.                                                             |
| `link-tile`       | Disponible              | El cálculo de altura reserva subtítulo aunque sus capacidades lo ocultan; revisar fórmula y truncado de dos líneas.    |

Mejoras específicas:

- Opción abrir en pestaña actual/nueva (`target`) por link.
- Mostrar/ocultar título y dominio como propiedades reales, en lugar de forzarlas solo por capacidad.
- Detectar automáticamente nombre, dominio y favicon, con consentimiento para solicitudes remotas.
- Acción “probar enlace” desde configuración.
- Estado visual para URL inválida o sitio sin icono.

### Grupo

| Variante               | Estado     | Riesgos/mejoras                                                                                     |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `group-list`           | Disponible | El contenido se recorta sin indicar que existen más links; altura automática o scroll configurable. |
| `group-list-plain`     | Disponible | Mismos riesgos; revisar área de click cuando padding=0.                                             |
| `group-list-no-header` | Disponible | Sin título visible; necesita nombre accesible en el contenedor/editor.                              |
| `group-grid`           | Disponible | Celdas pueden hacerse demasiado pequeñas; definir mínimos y columnas.                               |
| `group-grid-no-header` | Disponible | Igual que grid, más necesidad de etiqueta accesible.                                                |
| `group-icons`          | Disponible | `getItemIconSize` puede devolver tamaños extremos según cantidad/altura; definir máximo y tooltip.  |
| `group-icons-plain`    | Disponible | Iconos solos sin etiqueta visual; tooltip y nombre accesible obligatorios.                          |

Mejoras específicas:

- Reordenar links con teclado y drag-and-drop.
- Detectar duplicados por URL normalizada.
- Importar una carpeta de marcadores.
- Elegir overflow: crecer, scroll, “ver más” o paginar.
- Columnas configurables y tamaño mínimo de celda.
- Abrir todos los links con confirmación.
- La lista interna debería validar/normalizar cada link igual que un link principal.

### Título

| Variante        | Estado     | Riesgos/mejoras                                                                        |
| --------------- | ---------- | -------------------------------------------------------------------------------------- |
| `title-heading` | Disponible | Solo una línea con truncado; ofrecer multilinea y ajuste.                              |
| `title-label`   | Disponible | La fórmula multiplica el tamaño automático por `0.45`; puede quedar demasiado pequeño. |
| `title-panel`   | Disponible | Existe editor visual especial duplicado; unificarlo.                                   |

Mejoras específicas:

- Texto multilínea, peso, cursiva, tracking y line-height.
- Semántica visual separada de etiqueta HTML si se busca accesibilidad.
- Variable dinámica opcional: saludo, nombre del espacio o contador.
- Presets compartidos con el tema.

### Fecha

| Variante       | Estado     | Riesgos/mejoras                                                     |
| -------------- | ---------- | ------------------------------------------------------------------- |
| `date-card`    | Disponible | Fecha congelada tras medianoche; etiqueta fija.                     |
| `date-large`   | Disponible | Mismo bug; formatos largos pueden truncarse.                        |
| `date-minimal` | Disponible | Etiqueta editable pero invisible, lo que confunde en configuración. |

Mejoras específicas:

- Formato corto/largo/personalizado.
- Locale y zona horaria configurables.
- Fecha, hora o ambas; formato 12/24 h.
- Próximo evento como elemento separado, no acoplado inicialmente a fecha.
- Ocultar el control “Etiqueta” cuando la variante no la muestra o explicar que es el nombre accesible.

### Búsqueda

| Variante         | Estado     | Riesgos/mejoras                                                                        |
| ---------------- | ---------- | -------------------------------------------------------------------------------------- |
| `search-bar`     | Disponible | Botón se representa mediante `showSubtitle`, nombre semánticamente confuso.            |
| `search-input`   | Disponible | Enter funciona; documentar claramente que no necesita botón.                           |
| `search-minimal` | Disponible | “Sin contenedor” solo afecta superficie externa; input/botón mantienen fondos propios. |

Mejoras específicas:

- Renombrar capacidades a rasgos semánticos (`showsSearchButton`) en vez de reutilizar `showSubtitle`.
- Indicar cuándo las sugerencias son locales y cuándo remotas.
- Botón para limpiar historial local de búsqueda.
- Atajos tipo `g consulta`, `yt consulta` y motores personalizados con plantilla segura.
- Modo URL inteligente: si el texto parece URL, navegar; si no, buscar.
- Mantener permisos por motor visibles y revocables.
- Timeout/caché/cancelación real de sugerencias.

## Configuraciones y propiedades

### Problema estructural

`BoardItemStyle` contiene propiedades específicas de búsqueda para todos los tipos, mientras `BoardItemDisplay` contiene propiedades de icono para tipos sin icono. Esto simplifica merges, pero facilita estados imposibles y controles mal nombrados.

### Propuesta

Separar:

```ts
type SurfaceStyle = {
  backgroundColor;
  backgroundImage;
  borderColor;
  borderWidth;
  borderRadius;
  padding;
};
type TextStyle = { fontFamily; fontSize; fontSizeLocked; textColor };
type IconDisplay = { icon; iconSize; iconSizeLocked; iconStyle };
type SearchControlStyle = {
  inputBackground;
  inputText;
  buttonBackground;
  buttonText;
};
```

Cada tipo puede componer solo lo que usa. Si se quiere mantener compatibilidad del JSON, la migración puede convertir el shape viejo al nuevo en `version: 2`.

### Valores por defecto

- `defaultItemStyle.padding = 2` es muy pequeño para cards; parte del espaciado aparece luego en wrappers internos, dificultando predecir el layout.
- Los defaults deberían vivir por variante, no solo por tipo.
- `getItemDisplay` fuerza `showIcon/showTitle/showSubtitle` desde capacidades, por lo que esos campos persistidos parecen configurables pero no lo son.
- Renombrar capacidades “permitido” vs propiedad “visible”: `supportsIcon` no debe implicar siempre `showIcon = true`.

### Temas

- Los temas se aplican como base y luego el estilo del elemento tiene precedencia. Documentar esta jerarquía en UI.
- Añadir “restablecer al tema” por propiedad y por elemento.
- Validar contraste entre texto/fondo y botón/fondo.
- Evitar copiar todos los defaults resueltos al cambiar una sola propiedad: guardar solo overrides reduce JSON y permite que una actualización de tema llegue a elementos no personalizados.

## Revisión de flujos

### Agregar → configurar → guardar

Flujo actual:

1. Entrar a edición.
2. Abrir “Agregar”.
3. Elegir tipo/sitio/historial.
4. El elemento aparece centrado y abre configuración.
5. Guardar toda la edición.

Simplificaciones seguras:

- Crear el elemento en un espacio libre visible.
- Mantener un único panel contextual para contenido, variante, diseño y layout.
- Permitir “Guardar y seguir editando” y autosave de borrador recuperable.
- Mostrar indicador de cambios y deshacer/rehacer; hoy cancelar descarta toda la sesión.
- No pedir confirmaciones basadas solo en `isEditing`: detectar si el borrador realmente difiere del board.

### Cambio/creación/eliminación de espacio

- Cambiar o crear espacio pregunta por cambios aunque la sesión pueda no tener modificaciones reales.
- Eliminar usa `window.confirm` y no ofrece undo.
- El nombre puede quedar temporalmente vacío hasta recargar/normalizar.

Mejoras:

- `isDirty` derivado por revisión o historial de comandos.
- Papelera/undo temporal para espacios y elementos.
- Nombres validados al confirmar, no en cada tecla.
- Duplicar espacio y exportar/importar workspace completo.

### Importación/exportación

- La importación reemplaza inmediatamente el tablero activo sin preview.
- No hay límites explícitos de tamaño para JSON/data URLs.
- Los IDs importados se conservan y pueden colisionar.
- No existe backup automático antes de reemplazar.

Mejoras:

- Preview: número de elementos, fondos, versión, advertencias y destino.
- Opciones “reemplazar”, “fusionar” o “crear espacio nuevo”.
- Backup descargable/recuperable antes de reemplazar.
- Límites de archivo, imágenes y cantidad de elementos.
- Reporte de migraciones y campos descartados.

### Sincronización Drive

El control optimista por `revision` es una buena base. Para simplificar sin romper el flujo:

- Modelar un estado único con `useReducer` en vez de refs + seis estados relacionados.
- Centralizar connect/load/save/conflict en un servicio o hook `useDriveSync`.
- Una sola función para aplicar remoto y otra para publicar local.
- Resolver conflictos por espacio cuando sea viable, no siempre reemplazar todo.
- Evitar `window.confirm`; usar un modal con fecha, dispositivo, espacios afectados y opción de exportar antes.
- El botón “desconectar” no elimina la copia remota; mantener la explicación actual y añadir acceso a instrucciones de borrado.

### Fondos

- El modelo combina una librería global de fondos con selección por espacio; es correcto, pero las operaciones se reparten entre hook y `NewTab`.
- Extraer un store/reducer de wallpapers que gestione referencias por espacio y borre solo cuando no hay referencias.
- Comprimir/redimensionar imágenes al cargar y advertir tamaño.
- Permitir focal point y overlay para legibilidad.
- No rotar a la misma imagen dos veces seguidas cuando haya alternativas.

## Arquitectura y mantenibilidad

### `NewTab.tsx` concentra demasiadas responsabilidades

Tiene aproximadamente 1,866 líneas y administra Drive, fondos, espacios, edición, importación, portapapeles, atajos, documento, tema y render del canvas. Esto eleva el riesgo de cierres incompletos y estados obsoletos.

Extracciones sugeridas:

- `useWorkspaceStore`: espacios y persistencia.
- `useBoardEditor`: draft, selección, undo/redo y dirty state.
- `useDriveSync`: máquina de estados, revisión y conflictos.
- `useTabMetadata`: título e icono.
- `useBoardImportExport`: parse, preview y descarga.
- `BoardCanvas`: viewport, fondo y elementos.

Usar `useReducer` para transiciones relacionadas. No se recomienda introducir una librería global de estado hasta comprobar que estos reducers locales son insuficientes.

### Versionado del modelo

`Board.version` y `Workspace.version` permanecen en 1 pese a cambios crecientes. Definir desde ahora:

- migraciones secuenciales puras;
- esquema actual separado de esquemas legacy;
- fixtures de cada versión;
- export envelope con versión, fecha, appVersion y checksum opcional.

### Errores y observabilidad

Muchos errores terminan en `window.alert`, estados genéricos o `catch` vacío. Añadir:

- mensajes inline recuperables;
- error boundary para el canvas;
- logging local con datos no sensibles y botón “copiar diagnóstico”;
- códigos de error estables para Drive/importación;
- nunca incluir tokens, queries o URLs del usuario en telemetría.

## Workflows y entrega

### Fortalezas

- `npm ci` y Node 20 hacen builds reproducibles.
- Release Please automatiza versionado.
- Se empaquetan Chromium, Firefox y fuentes.
- El broker se despliega con secretos separados.
- Hay concurrency groups para publicación/deploy.

### Mejoras prioritarias

1. **CI para cada PR.** No hay workflow dedicado que ejecute lint, typecheck, tests y build antes de merge.
2. **Pruebas obligatorias.** Añadir Vitest + Testing Library y, después, Playwright cargando la extensión.
3. **No usar `npx --yes web-ext@latest` en release.** Fijar `web-ext` en `devDependencies` y usar la versión del lockfile.
4. **Pin de Actions.** Para máxima seguridad de supply chain, fijar actions críticas por SHA y usar Renovate/Dependabot.
5. **Evitar duplicación.** `release.yml` y `publish-current.yml` duplican gran parte del script de Chrome; extraer composite action o script probado.
6. **Presupuesto de bundle.** Fallar o advertir si entry/CSS superan límites acordados.
7. **Validación de paquete.** Ejecutar `web-ext lint`, comprobar manifest y listar contenido del ZIP.
8. **Smoke test de OAuth Worker.** Probar CORS, métodos, límite de body y respuestas sin exponer secretos.
9. **Entornos protegidos.** Usar GitHub Environments con aprobación para stores y Cloudflare.
10. **SBOM y auditoría.** Generar SBOM, ejecutar `npm audit`/Dependabot y conservar provenance de artifacts.

Workflow PR propuesto:

```yaml
jobs:
  validate:
    steps:
      - checkout
      - setup-node con cache npm
      - npm ci
      - npm run lint
      - npm run typecheck
      - npm test -- --run
      - npm run build
      - comprobar presupuesto de bundle y manifests
```

## Estrategia de pruebas recomendada

### Unitarias — primera prioridad

- Todas las variantes válidas/invalidas por tipo.
- `normalizeUrl`/parser seguro.
- anchors y conversión viewport ↔ layout.
- resize con Shift/Ctrl, mínimos y tamaños bloqueados.
- `getItemFontSize`, `getItemIconSize`, `getItemMaxHeight` por variante.
- parse/migrate/normalize de board/workspace.
- conflictos y revisiones de Drive.
- parsers de sugerencias.
- importación transaccional de fondos.

### Componentes

- Config muestra exactamente las propiedades permitidas.
- Cambiar variante conserva overrides compatibles.
- Link/icon-only tiene nombre accesible.
- Grupo vacío, con uno, muchos y links inválidos.
- Búsqueda Enter, opción, edición y permiso rechazado.
- Fecha cambia al simular medianoche.

### End-to-end

- Crear, mover, redimensionar, duplicar, guardar y recargar.
- Cancelar edición revierte.
- Importar/exportar round-trip.
- Dos espacios con fondos distintos.
- Simular Drive remoto, conflicto, descarga y error parcial.
- Chromium y Firefox; viewport pequeño y grande.

Objetivo inicial razonable: alta cobertura del modelo y los reducers, no perseguir porcentaje alto sobre JSX meramente visual.

## Nuevos elementos recomendados

Ordenados por valor esperado y reutilización de la arquitectura:

### 1. Reloj

Comparte infraestructura con Fecha y obliga a resolver correctamente temporizadores, locale y zona horaria. Variantes: digital, analógico simple, fecha+hora.

### 2. Nota rápida

Texto multilínea local con autosave, color y tamaño. Debe incluir límite, accesibilidad y exportación/sync. Evitar rich text en primera versión.

### 3. Separador/forma

Línea horizontal/vertical, bloque o círculo. Ayuda a estructurar el tablero y reutiliza layout/estilo sin integraciones externas.

### 4. Marcadores recientes/frecuentes

Elemento dinámico basado en permiso de historial ya existente. Configurar cantidad, dominio excluido y modo lista/grid. Procesamiento local.

### 5. Clima

Alto valor, pero requiere proveedor, ubicación aproximada/manual, privacidad, caché y manejo offline. Implementar después de estabilizar integraciones.

### 6. Próximo evento

Debe ser integración opcional y separada de Fecha. Empezar con feed ICS o API autorizada; mostrar claramente fuente y última actualización.

### 7. Tareas/hábitos

Lista local simple primero; sincronización usando el workspace. Requiere IDs estables, orden, completado y archivo de historial.

### 8. Imagen

Reutiliza IndexedDB/importación de fondos, con encuadre y alt text. Resolver primero transacciones y límites de recursos.

### 9. Contador regresivo

Fecha objetivo, estado vencido y formatos. Reutiliza temporizador de Reloj y ofrece valor sin permisos.

### 10. Comando/acción

Solo acciones seguras y declarativas (abrir varias URLs, cambiar espacio, iniciar búsqueda). No ejecutar JavaScript arbitrario.

## Roadmap recomendado

### Fase 1 — Integridad y seguridad

- Parser seguro de URL.
- Esquema exhaustivo y migraciones.
- Aplicación remota segura respecto al draft.
- Sincronización consistente de recursos.
- Importación transaccional.
- Manejo de errores de persistencia.

### Fase 2 — Calidad y regresión

- Vitest para modelo/storage/sync.
- Tests de componentes por variante.
- CI de PR.
- Fixtures legacy e import/export round-trip.

### Fase 3 — Coherencia del editor

- Registro único de variantes.
- Panel visual compartido.
- Placement sin colisiones.
- Dirty state real, undo/redo y recuperación de draft.
- Accesibilidad de resize/drag.

### Fase 4 — Rendimiento y entrega

- Analizar/reducir bundle.
- Debounce/colas/cachés.
- Unificar workflows, fijar herramientas y validar paquetes.

### Fase 5 — Expansión

- Reloj, nota y separadores.
- Luego elementos dinámicos/integraciones.

## Quick wins

Cambios pequeños con buena relación beneficio/riesgo:

1. Añadir `link-text` y `link-strip` a `LinkConfig`, o retirarlas coherentemente.
2. Corregir `search-box` → `search-input` y el flujo de “Agregar” en documentación.
3. Actualizar la fecha con un hook de medianoche.
4. Conservar el resultado de `getNextLayout` al agregar.
5. Debounce del guardado de fondos.
6. `permissions.contains` para sugerencias.
7. Capturar errores de `workspaceStorage.save`.
8. Fijar `web-ext` en el lockfile.
9. Añadir workflow de PR.
10. Extraer constantes compartidas de fuentes y swatches.

## Criterio de cierre sugerido

La siguiente versión puede considerarse estable cuando:

- ningún input/import permite esquemas de URL fuera de la allowlist;
- importar datos inválidos produce errores comprensibles sin mutación parcial;
- aceptar Drive nunca permite guardar accidentalmente un draft anterior;
- tablero y fondos reportan un estado de sincronización coherente;
- cada variante expuesta tiene pruebas de render, configuración y resize;
- la definición de variantes tiene una sola fuente de verdad;
- CI valida lint, tipos, tests, build y manifests;
- la documentación coincide con la interfaz publicada.

## Archivos principales revisados

- `src/newtab/NewTab.tsx`
- `src/newtab/model/boardItemTypes.ts`
- `src/newtab/model/boardItemFactory.ts`
- `src/newtab/model/boardItemLayout.ts`
- `src/newtab/model/boardItemPresentation.ts`
- `src/newtab/storage/boardStorage.ts`
- `src/newtab/storage/driveSync.ts`
- `src/newtab/hooks/useSessionWallpaper.ts`
- `src/newtab/hooks/useSearchSuggestions.ts`
- `src/newtab/hooks/useRecentHistory.ts`
- `src/newtab/components/BoardItem.tsx`
- `src/newtab/components/ItemConfigWindow.tsx`
- `src/newtab/components/AddElementWindow.tsx`
- `src/newtab/components/GroupLinksWindow.tsx`
- render/config de link, grupo, título, fecha y búsqueda
- `src/background/index.ts`
- `worker/src/index.js`
- manifests de Chromium y Firefox
- scripts de build/empaquetado
- workflows de release, publicación y Worker
- documentación y política de privacidad

---

Esta auditoría es estática y funcional a nivel de código y build. La ausencia de pruebas automatizadas y de una sesión interactiva instrumentada impide afirmar que cubre todas las combinaciones visuales en navegadores reales; por eso el plan prioriza fixtures, pruebas por variante y E2E de la extensión.
