# Auditoría vigente de código y producto

Fecha original: 5 de agosto de 2026

Última revisión: 20 de agosto de 2026

Versión revisada: `0.7.0`

## Alcance de esta revisión

Esta pasada se concentra en el uso real de los elementos del tablero:

- creación, duplicación, edición y guardado;
- variantes disponibles y variantes admitidas por el modelo;
- render, tamaños, anclajes y comportamiento responsive;
- configuración visual e iconos;
- links internos de grupos y búsqueda;
- importación, persistencia y aplicación de datos remotos.

El archivo contiene únicamente hallazgos que permanecen pendientes. Los problemas
ya corregidos —validación de protocolos de URL, snapshot atómico de Drive, fecha al
cambiar el día, fallos de `localStorage`, cola de guardado y presupuesto del bundle—
se retiraron de la lista activa.

## Verificación realizada

- Lectura completa del modelo discriminado y sus cinco tipos.
- Comparación de las 23 variantes declaradas con configuración, capacidades y render.
- Revisión de creación, edición, resize, anclajes, importación y sincronización.
- `npm run typecheck`, `npm run lint` y `npm run build` pasan para Chrome y Firefox.
- No existe una suite automatizada de variantes.
- No fue posible completar la prueba visual automatizada: la sesión no expuso un
  navegador controlable. Los hallazgos visuales se basan en la estructura DOM/CSS y
  deben confirmarse manualmente antes de cerrar cada corrección.

## Resumen ejecutivo

El modelo reconoce 5 tipos y 23 variantes. La mayoría renderiza y puede cambiarse
después de crear el elemento, pero la definición está repartida entre tipos,
capacidades, arrays de configuración, render y fórmulas de tamaño. Esa duplicación ya
produce divergencias visibles.

Pendientes principales:

1. Todos los elementos nuevos se colocan en el mismo punto central.
2. Un borrador local puede sobrevivir a la aplicación de un workspace remoto y
   sobrescribirlo después.
3. La validación de datos acepta layouts, estilos y displays peligrosos o inválidos.
4. `group-grid` y `group-grid-no-header` no construyen una cuadrícula real.
5. `link-text` y `link-strip` existen y renderizan, pero no pueden seleccionarse.
6. Gran parte del sistema de diseño existe en código pero no está expuesta para link,
   grupo, fecha y búsqueda.
7. No hay pruebas que recorran cada combinación tipo/variante/configuración.

## Escala de prioridad

| Prioridad | Significado |
| --- | --- |
| P1 | Puede ocultar, sobrescribir o corromper trabajo, o una variante no cumple su función principal. |
| P2 | Inconsistencia funcional, accesibilidad, mantenibilidad o UX relevante. |
| P3 | Mejora incremental que no bloquea el uso principal. |

## Hallazgos pendientes

### P1 — Evitar que todos los elementos nuevos se superpongan

**Evidencia**

`NewTab.tsx:addItem` obtiene una posición con `getNextLayout`, pero conserva solo el
tamaño y reemplaza la posición por `x: 0`, `y: 0`, `anchorX: "center"` y
`anchorY: "center"`.

**Impacto**

Desde el segundo elemento, los nuevos componentes aparecen exactamente encima de los
anteriores. El usuario puede pensar que la acción falló o editar/eliminar la capa
equivocada.

**Cierre recomendado**

- Implementar `findFreePlacement` con detección de intersecciones.
- Aplicarlo también al duplicar y al importar elementos sin posición utilizable.
- Probar 1, 2, 5 y 20 inserciones en viewports grandes y pequeños.

### P1 — Reconciliar el borrador al aplicar datos remotos

**Evidencia**

El tablero visible durante edición es `draftBoard`. Las rutas que aceptan Drive
reemplazan `workspace`, pero no centralizan la cancelación/rebase de `draftBoard`,
selección y ventanas de edición.

**Impacto**

Después de aceptar la copia remota, “Guardar” puede volver a aplicar un borrador
creado sobre la revisión local anterior.

**Cierre recomendado**

- Centralizar en `applyRemoteWorkspace`.
- Si existe edición, ofrecer descartar, exportar o cancelar.
- Guardar una `baseRevision` al iniciar la edición y rechazar el commit si cambió.
- Probar descarga, conflicto, fusión y cambio de espacio con edición abierta.

### P1 — Endurecer validación y normalización de elementos

**Evidencia actual**

`isValidItem` valida el discriminante, algunos strings y la existencia de cuatro
números de layout, pero todavía no valida exhaustivamente:

- `Number.isFinite`, máximos y mínimos de layout;
- anclajes permitidos;
- variante compatible con el tipo;
- forma y rangos de `display` y `style`;
- colores, tamaños, padding y locks;
- `createdAt`, longitud de strings e IDs duplicados.

Los links, incluidos los internos de grupos, sí se validan recursivamente y sus URLs
se restringen actualmente a `http/https`; esa parte del hallazgo original ya no está
pendiente.

**Impacto**

`NaN`, `Infinity`, tamaños extremos, displays manipulados o IDs repetidos pueden
producir elementos invisibles, CSS inválido, selección ambigua o fallos posteriores.
Drive e importación usan esta misma frontera de confianza.

**Cierre recomendado**

- Crear un esquema versionado exhaustivo y separar `parse`, `migrate` y `normalize`.
- Normalizar IDs duplicados y limitar tamaños y strings.
- Devolver errores concretos con ruta del campo.
- Añadir fixtures válidos, legacy, corruptos y maliciosos.

### P1 — Hacer que las variantes `group-grid` sean una cuadrícula real

**Evidencia**

En `GroupRender`, para variantes grid el contenedor interior usa `className="contents"`.
Los anchors terminan como hijos del `Stack` exterior, cuyo layout es vertical. Las
celdas reciben borde y padding de grid, pero no hay `display: grid`, columnas ni
regla de distribución.

**Impacto**

`group-grid` y `group-grid-no-header` se comportan como una lista vertical decorada,
no como la variante prometida. Con muchos links, el contenido se recorta rápidamente.

**Cierre recomendado**

- Usar un contenedor `display: grid` con columnas responsive y ancho mínimo de celda.
- Hacer que alineación actúe sobre contenido de celda, no sobre la cuadrícula.
- Probar 1, 2, 3, 6 y 20 links, con y sin header y padding 0/40.

### P1 — Evitar importaciones parciales de fondos

**Evidencia**

`importWallpapers` escribe blobs en IndexedDB antes de confirmar todos los metadatos.
Un fallo posterior puede dejar blobs huérfanos o reemplazos parciales.

**Cierre recomendado**

- Decodificar y validar todo antes de escribir.
- Usar una sola transacción o revertir desde un snapshot.
- Limpiar al iniciar blobs sin metadata y metadata sin blob.

### P2 — Exponer o retirar `link-text` y `link-strip`

**Evidencia**

Ambas variantes están en tipos, `validVariantsByType`, capacidades, render y
documentación. `LinkConfig` solo ofrece `link-card`, `link-card-plain`, `link-icon`,
`link-icon-plain` y `link-tile`.

**Impacto**

Datos importados pueden mostrarlas, pero el usuario no puede elegirlas ni volver a
ellas después de cambiar de variante.

**Cierre recomendado**

Exponer ambas con previews y pruebas, o migrarlas explícitamente y retirarlas de todo
el contrato.

### P2 — Exponer la configuración visual que ya existe

**Evidencia**

`configSections.tsx` implementa `ColorConfig`, `ContainerConfig`, `TextConfig` y
`SearchColorConfig`, pero las configuraciones de link, grupo, fecha y búsqueda no
las montan. Solo título tiene una ventana de diseño separada.

Además, `hasIconStyle` existe para múltiples variantes, pero no hay un control para
cambiar `iconStyle`. El usuario puede elegir el icono de un link y el tamaño de los
iconos de grupo, no el estilo declarado por el modelo.

**Impacto**

El modelo y la documentación prometen personalización que la UI no permite. Los
valores solo pueden llegar por tema, datos legacy/importados o código.

**Cierre recomendado**

- Crear un `ElementDesignPanel` común gobernado por capacidades.
- Incluir color, texto, contenedor, colores de búsqueda, icono, tamaño y estilo solo
  cuando correspondan.
- Retirar `TitleDesignWindow` duplicada cuando el panel común cubra título.

### P2 — Hacer configurable o coherente el icono de encabezado de grupo

**Evidencia**

Las capacidades de varias variantes de grupo declaran header con icono y estilo,
pero `GroupRender` siempre pinta `PlusIcon`. `GroupConfig` no ofrece selector para el
icono de encabezado.

**Impacto**

Todos los grupos tienen el mismo símbolo “+”, que además parece una acción para
agregar en vez de una identidad del grupo.

**Cierre recomendado**

Permitir elegir `display.linkIcon` para el grupo o usar un icono neutro fijo y retirar
las capacidades que no sean reales.

### P2 — Unificar el registro de variantes y capacidades

La definición de cada variante está repartida entre:

- unions de TypeScript;
- `validVariantsByType`;
- `variantCapabilities`;
- arrays manuales de cada `*Config`;
- ramas de cada `*Render`;
- fórmulas de fuente, icono y altura;
- documentación.

Esto explica las variantes ocultas y capacidades sin UI. Crear un registro tipado
único con label, descripción, capacidades, defaults, renderer y restricciones.

### P2 — Corregir fórmulas y límites de resize por variante

**Evidencia**

- El mínimo global de resize es `1×1`, permitiendo componentes invisibles o
  imposibles de recuperar.
- `getItemMaxHeight` reserva subtítulo para `link-tile` aunque esa variante lo oculta.
- Las fórmulas de card también se reutilizan para variantes con contenido distinto.
- Un `iconSizeLocked` heredado puede influir en el máximo de tipos/variantes sin icono.
- El tamaño automático de icono prioriza altura y puede desbordar layouts muy angostos.

**Cierre recomendado**

Definir mínimos, máximos y medición de contenido por variante; separar
`measurePreferredHeight`, `getResizeConstraints` y `fitLayoutToContent`.

### P2 — Mantener los elementos recuperables dentro del viewport

`clampLayout` limita algunos valores negativos, pero no el borde derecho/inferior ni
offsets centrados. Redimensionar la ventana o editar X/Y puede dejar un elemento
completamente inaccesible.

Mantener al menos 24 px interactivos visibles y añadir “Centrar elemento” y “Ajustar
todos a pantalla”.

### P2 — Mejorar grupos con contenido que no cabe

Todas las variantes usan `overflow-hidden`. Al superar la altura no hay scroll,
contador, gradiente ni indicación de links ocultos. Definir por variante altura
automática, scroll interno o indicador “N más”.

### P2 — Accesibilidad de variantes sin texto y del editor

Pendientes observados:

- `link-icon` y `link-icon-plain` pueden producir un `<a>` sin nombre accesible si el
  icono elegido no aporta texto.
- Los links de `group-icons*` ocultan el título y el `Anchor` no define `aria-label`.
- Los botones de variante no exponen `aria-pressed`.
- No hay alternativa de teclado completa para resize ni anuncios de posición/tamaño.
- Los elementos sin header necesitan nombre accesible en render y edición.
- No existe validación automática de contraste.

### P2 — Cancelar realmente y cachear sugerencias de búsqueda

El `AbortController` impide aplicar respuestas antiguas en React, pero no cancela el
`fetch` que ejecuta background. Tampoco existe caché por motor/query. Añadir
`requestId`, cancelación en background, timeout y una LRU corta.

### P2 — Revisar consentimiento y caché de favicon remoto

`requestSiteFaviconPermission` siempre devuelve `true`; el nombre sugiere un permiso
que no existe. Al elegir “Usar icono del sitio”, el hostname puede enviarse a
`geticon.dev`.

Explicar esa transferencia antes de activarla, permitir deshabilitar el servicio y
aplicar expiración/límite/limpieza de caché.

### P2 — Eliminar efectos secundarios dentro de setters

`deleteSpace` coordina otros setters desde el callback de `setWorkspace`. Los
actualizadores de React deben ser puros porque pueden ejecutarse más de una vez.
Calcular el siguiente estado fuera o migrar el conjunto relacionado a `useReducer`.

### P2 — Corregir documentación de elementos

`docs/elements.md` no coincide con la interfaz actual:

- describe selección de variante antes de crear, pero “Agregar” crea inmediatamente
  la variante por defecto y abre configuración después;
- anuncia controles visuales que no están disponibles uniformemente;
- presenta `link-text` y `link-strip` como seleccionables;
- algunas descripciones de grupo hablan de grid aunque el DOM actual es vertical.

Actualizarla junto con las correcciones, no antes, y generar la tabla de variantes
desde el futuro registro único.

## Matriz actual por elemento y variante

### Link

| Variante | Render | Seleccionable | Pendiente principal |
| --- | --- | --- | --- |
| `link-card` | Sí | Sí | Diseño general e icon style no expuestos. |
| `link-card-plain` | Sí | Sí | Diseño general e icon style no expuestos. |
| `link-icon` | Sí | Sí | Nombre accesible y tamaño mínimo. |
| `link-icon-plain` | Sí | Sí | Nombre accesible, foco y target mínimo. |
| `link-text` | Sí | No | Exponer o retirar. |
| `link-strip` | Sí | No | Exponer o retirar y diferenciar de card. |
| `link-tile` | Sí | Sí | Fórmula de altura reserva contenido oculto. |

### Grupo

| Variante | Render | Seleccionable | Pendiente principal |
| --- | --- | --- | --- |
| `group-list` | Sí | Sí | Overflow sin indicación; header fijo “+”. |
| `group-list-plain` | Sí | Sí | Overflow; controles visuales incompletos. |
| `group-list-no-header` | Sí | Sí | Nombre accesible y overflow. |
| `group-grid` | Incorrecto | Sí | No existe layout grid real. |
| `group-grid-no-header` | Incorrecto | Sí | No existe grid y falta nombre accesible. |
| `group-icons` | Parcial | Sí | Links sin nombre accesible; tamaños extremos. |
| `group-icons-plain` | Parcial | Sí | Igual, además target/foco sobre fondo abierto. |

### Título

| Variante | Render | Seleccionable | Pendiente principal |
| --- | --- | --- | --- |
| `title-heading` | Sí | Sí | Diseño duplicado entre dos superficies. |
| `title-label` | Sí | Sí | Mínimos/altura y truncado. |
| `title-panel` | Sí | Sí | Unificar configuración con el resto. |

### Fecha

| Variante | Render | Seleccionable | Pendiente principal |
| --- | --- | --- | --- |
| `date-card` | Sí | Sí | Diseño visual no expuesto. |
| `date-large` | Sí | Sí | Diseño visual y límites de resize. |
| `date-minimal` | Sí | Sí | Alineación/diseño limitados; truncado. |

### Búsqueda

| Variante | Render | Seleccionable | Pendiente principal |
| --- | --- | --- | --- |
| `search-bar` | Sí | Sí | Colores definidos en modelo pero sin UI. |
| `search-input` | Sí | Sí | Colores definidos en modelo pero sin UI. |
| `search-minimal` | Sí | Sí | Colores sin UI; revisar semántica visual “mínima”. |

## Orden de corrección recomendado

1. Esquema exhaustivo y reconciliación segura del borrador.
2. Placement sin colisiones.
3. Corregir `group-grid` y accesibilidad de variantes solo icono.
4. Registro único de variantes.
5. Panel de diseño común y decisión sobre `link-text`/`link-strip`.
6. Restricciones de resize, recuperación en viewport y overflow de grupos.
7. Tests automatizados y actualización final de `docs/elements.md`.

## Criterio de cierre

- Cada variante declarada es seleccionable o tiene migración explícita.
- Cada opción visible modifica el render y cada capacidad declarada tiene UI o una
  razón documentada para no tenerla.
- Todas las variantes pasan fixtures de render, cambio de configuración,
  import/export y resize.
- Crear/duplicar nunca oculta un elemento bajo otro.
- Aplicar Drive nunca permite guardar después un borrador basado en otra revisión.
- Datos no finitos, variantes cruzadas e IDs duplicados se rechazan o normalizan.
- Variantes sin texto conservan nombre accesible y foco visible.
- La documentación se genera o verifica contra la fuente única de variantes.
