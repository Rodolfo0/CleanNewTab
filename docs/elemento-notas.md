# Especificación del elemento de notas

Estado: listo para diseño técnico e implementación.

## Objetivo

El elemento de notas permite escribir y consultar texto enriquecido desde el tablero de la nueva pestaña. Está pensado para recordatorios, listas, checklists y texto breve que conviene tener visible. No pretende sustituir a una aplicación de documentos.

## Alcance de la primera versión

Cada elemento contiene una sola nota.

- Crear una nota desde la ventana `Agregar`.
- Usar un cuerpo libre de hasta 2,000 caracteres, sin un campo de título separado.
- Editar directamente sobre el tablero.
- Aplicar formato mediante una barra de edición.
- Mostrar negrita, cursiva, subrayado, tachado, tamaños de texto de `xs` a `xl`, listas, enlaces y checklist.
- Abrir los enlaces desde el modo de lectura.
- Mover, redimensionar, duplicar y eliminar la nota como cualquier otro elemento.
- Usar tipografía, colores, fondo, borde, radio y padding compatibles con el tema actual.
- Guardar la nota en el workspace local e incluirla siempre en la sincronización con Google Drive.
- Incluir el contenido completo en futuras exportaciones del tablero.
- Admitir emojis y cualquier carácter Unicode.

No habrá búsqueda global, historial de cambios, recuperación de notas eliminadas, recordatorios, fechas de vencimiento, enlaces entre notas ni modo privado local.

## Modos de la nota

### Lectura

La nota muestra el documento enriquecido en modo de solo lectura. Un clic sobre un enlace lo abre. El contenido no se puede modificar en este modo.

La nota incluye un botón de edición visible por defecto. El botón necesita un nombre accesible, por ejemplo `Editar nota`, y no debe aparecer dentro del contenido.

### Edición

El usuario puede entrar al modo de edición de dos formas:

- Doble clic sobre una zona de la nota que no sea un enlace ni un control interactivo.
- Clic en el botón `Editar nota`.

La edición de texto solo está disponible cuando el tablero está en modo normal. Al entrar a la edición de layout, la nota guarda los cambios pendientes y sale de la edición de texto.

Al entrar, el mismo documento se vuelve editable. Los enlaces dejan de abrirse y el usuario puede modificar su texto o destino. Los gestos de mover y redimensionar quedan desactivados dentro del editor y su barra de herramientas.

El doble clic no debe competir con los enlaces. Un clic sobre un enlace siempre abre el enlace y no inicia la edición. El usuario puede usar el botón para editar una nota cuyo contenido visible esté ocupado por enlaces. Esta regla evita retrasar artificialmente la apertura de todos los links mientras el sistema espera un posible segundo clic.

El usuario sale del modo de edición al pulsar `Escape`, usar un control de cierre o llevar el foco fuera de la nota. Antes de salir se guarda cualquier cambio pendiente. `Ctrl+S` en Windows y Linux, o `Cmd+S` en macOS, guarda de inmediato sin cerrar el editor.

## Editor enriquecido

La edición usa Tiptap. El usuario ve el formato aplicado mientras escribe y el contenido persistente se guarda como Tiptap JSON. No se almacena HTML ni Markdown.

La barra de herramientas aplica marcas y bloques al documento. Como mínimo tendrá controles para:

- Negrita.
- Cursiva.
- Subrayado.
- Tachado.
- Tamaño de texto `xs`, `sm`, `md`, `lg` y `xl`.
- Lista con viñetas.
- Lista numerada.
- Checklist.
- Enlace.

Mientras se edita, la barra se muestra fuera de la nota, por encima del borde superior. El botón para entrar a edición permanece en la esquina inferior derecha de la nota.

Los tamaños se guardan como un atributo controlado de la marca de texto. Solo se aceptan `xs`, `sm`, `md`, `lg` y `xl`. La interfaz traduce cada token a un tamaño CSS definido por el producto. No guarda valores CSS libres dentro de la nota.

El editor usa el comportamiento nativo del navegador para deshacer y rehacer. No se agregará un historial propio.

### Checklist

Tiptap guarda cada checklist como nodos `taskList` y `taskItem`. En lectura, las casillas se muestran como controles interactivos. Al marcar una casilla, la nota actualiza el atributo `checked` del nodo y guarda el cambio sin abrir el editor. Marcar una casilla tampoco activa la edición del tablero.

## Creación

Al elegir `Nota` en la ventana `Agregar`, se crea una nota vacía de 320 por 220 px. Mientras el tablero sigue en edición, la nota queda seleccionada para moverla o cambiar su tamaño. Al guardar el tablero, entra al modo de edición de texto y enfoca el cuerpo.

La nota no tiene un campo de título ni una opción de título en la ventana de configuración. El contenido es libre y la barra no ofrece presets de encabezado.

Una nota vacía conserva una superficie visible para que el usuario pueda editarla, moverla o eliminarla.

La primera versión tendrá una sola variante, `note-card`, con fondo y borde configurables. Usará los valores del tema activo y no tendrá un selector rápido de color tipo nota adhesiva.

## Guardado

Cada cambio programa un guardado con debounce. Una espera inicial de 500 ms ofrece respuesta rápida sin escribir en el almacenamiento por cada tecla. Cambiar de espacio, cerrar el editor o perder el foco fuerza el guardado pendiente.

El shortcut `Ctrl+S` o `Cmd+S` fuerza el guardado actual y evita que el navegador abra su diálogo para guardar la página.

El contador aparece en la esquina inferior derecha durante la edición con el formato `usados / 2000`. Al llegar a 2,000 caracteres, el editor impide insertar más texto. Todavía debe permitir borrar, reemplazar una selección, cortar y deshacer.

El límite cuenta el texto que ve el usuario, no el tamaño del JSON almacenado. La implementación debe contar caracteres Unicode visibles para no dividir un emoji compuesto al pegar contenido cerca del límite.

Si una nota cargada desde almacenamiento o Drive supera el límite, la aplicación conserva y muestra todo el contenido. El editor permite borrar o reemplazar texto, pero bloquea cambios que aumenten la longitud. La nota no puede guardarse hasta quedar en 2,000 caracteres o menos. La aplicación nunca la recorta automáticamente.

## Tamaño y desbordamiento

La nota conserva el tamaño que el usuario elija. Si el cuerpo no cabe, muestra scroll vertical interno. El contenido no aumenta automáticamente el alto del elemento.

La barra de herramientas y el contador permanecen visibles mientras se desplaza el cuerpo. La nota necesita un alto mínimo que permita usar esos controles sin que se superpongan.

## Apariencia

El fondo, borde, radio, padding y color base provienen del tema y de los controles visuales existentes.

El formato aplicado dentro del editor tiene prioridad en el cuerpo. El estilo del elemento define los valores base cuando el contenido no tiene una marca específica.

## Librerías elegidas

La implementación usará Tiptap 3 con sus bindings para React. Tiptap está construido sobre ProseMirror y permite montar una barra propia con componentes Mantine, sin adoptar la interfaz visual de otra librería.

Paquetes previstos:

- `@tiptap/react`, `@tiptap/pm` y `@tiptap/starter-kit` para el editor.
- `@tiptap/extension-list` para listas y checklist.
- `@tiptap/extension-text-style` para la marca de tamaño.
- `@tiptap/extensions` para `CharacterCount`.

La nota usará Tiptap también en modo de solo lectura. Así, ambos modos comparten el mismo esquema, las reglas de enlaces y la representación de checklist. Guardar Tiptap JSON evita conversiones con pérdida y permite quitar `@tiptap/markdown`, que sigue marcado como beta.

La interfaz solo usará extensiones gratuitas y locales. No necesita Tiptap Cloud ni servicios externos.

## Modelo de datos tentativo

```ts
type NoteItem = BaseBoardItem & {
  type: "note";
  content: JSONContent;
  contentVersion: 1;
};

type NoteItemVariant = "note-card";
```

`JSONContent` es el tipo de documento que expone Tiptap. `contentVersion` permite migrar las notas si el esquema cambia en una versión posterior.

Mientras `BaseBoardItem` requiera `title`, las notas lo guardarán como una cadena vacía y no lo mostrarán ni expondrán en configuración. Si el modelo base se divide más adelante, `NoteItem` puede dejar de incluir esa propiedad.

La nota vive en el mismo objeto `Board` que los links, grupos, títulos, fechas y búsquedas. Por eso la copia local, la sincronización con Drive y las futuras exportaciones no requieren un almacén separado.

La validación al cargar debe aceptar `note`, comprobar `contentVersion` y validar el documento contra el esquema de extensiones permitido. Los nodos o atributos desconocidos no se renderizan sin validación. Una nota mayor al límite se conserva y queda bajo las restricciones descritas en la sección de guardado. Duplicar una nota copia contenido y estilos, pero genera un identificador y una fecha de creación nuevos.

## Seguridad y privacidad

El renderizador debe tratar el Tiptap JSON como contenido no confiable, incluso si viene del almacenamiento local o de Drive.

- No aceptar HTML incrustado ni nodos fuera del esquema permitido.
- No permitir scripts, manejadores de eventos ni URLs peligrosas como `javascript:`.
- Abrir enlaces externos con las mismas protecciones que los links del tablero.
- No enviar contenido de notas a analítica, telemetría ni reportes de errores.
- No escribir el cuerpo completo en logs.

Las notas se guardan en el navegador. Si el usuario conecta Google Drive, se incluyen siempre en el workspace sincronizado. No habrá un aviso adicional específico para notas ni una opción para excluirlas. La documentación general de sincronización y privacidad debe cubrir que el workspace contiene texto escrito por el usuario.

La sincronización no equivale a cifrado de extremo a extremo. Dos dispositivos pueden editar la misma nota antes de sincronizar. El sistema resuelve conflictos a nivel del workspace y no combina cambios dentro de un mismo texto.

## Accesibilidad y teclado

- El editor y todos los controles deben funcionar sin mouse.
- `Delete`, `Backspace`, flechas, copiar, pegar y deshacer actúan sobre el texto cuando el editor tiene foco.
- `Escape` sale de la edición sin perder cambios.
- `Ctrl+S` y `Cmd+S` guardan sin cerrar la nota.
- La barra de formato expone nombres accesibles y estados, por ejemplo si la selección está en negrita.
- El botón de edición y los links tienen indicadores de foco visibles.
- El contenido renderizado conserva una jerarquía válida de títulos y listas.
- El contador anuncia que se alcanzó el límite sin interrumpir cada pulsación.

## Criterios de aceptación

- Una nota conserva contenido, posición y estilo después de recargar.
- Los saltos de línea, marcas, bloques, enlaces y checklist se conservan.
- El doble clic sobre una zona no interactiva entra a edición.
- El botón de edición funciona con mouse y teclado.
- El editor de texto no se puede abrir durante la edición del tablero.
- Entrar a la edición del tablero cierra el editor de texto y conserva sus cambios.
- Un clic sobre un enlace lo abre sin entrar a edición.
- Los enlaces no son interactivos mientras se edita.
- Escribir o seleccionar texto no mueve ni elimina la nota.
- El guardado ocurre 500 ms después del último cambio y se fuerza al salir.
- El shortcut de guardado conserva el contenido y mantiene abierto el editor.
- Un clic fuera de la nota guarda el contenido y cierra el editor.
- El contador aparece durante la edición y no permite superar 2,000 caracteres.
- Una nota externa que supere el límite se muestra completa, no se recorta y no se puede guardar hasta reducirla.
- Una nota larga usa scroll interno.
- Marcar una checklist actualiza y guarda su estado.
- Marcar una checklist en lectura no abre el editor de texto.
- Duplicar una nota copia el contenido y genera un identificador nuevo.
- El contenido se conserva al cambiar de espacio y volver.
- Drive recibe la nota como parte del workspace.
- El renderizador bloquea nodos desconocidos, HTML y URLs peligrosas.
- La nota completa se puede usar solo con teclado.

## Referencias técnicas

- [Tiptap para React](https://tiptap.dev/docs/editor/getting-started/install/react)
- [Listas de tareas](https://tiptap.dev/docs/editor/extensions/nodes/task-list)
- [Tamaños de fuente](https://tiptap.dev/docs/editor/extensions/functionality/fontsize)
- [Límite y conteo de caracteres](https://tiptap.dev/docs/editor/extensions/functionality/character-count)
