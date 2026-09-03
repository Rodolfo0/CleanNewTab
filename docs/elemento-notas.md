# Especificación del elemento de notas

Estado: primera versión implementada; ampliaciones en definición.

## Objetivo

El elemento de notas permite escribir y consultar texto enriquecido desde el tablero de la nueva pestaña. Está pensado para recordatorios, listas, checklists y texto breve que conviene tener visible. No pretende sustituir a una aplicación de documentos.

## Alcance de la primera versión

Cada elemento contiene una sola nota.

- Crear una nota desde la ventana `Agregar`.
- Usar un cuerpo libre sin límite propio de caracteres y sin un campo de título separado.
- Editar directamente sobre el tablero.
- Aplicar formato mediante una barra de edición.
- Mostrar negrita, cursiva, subrayado, tachado, tamaños de texto de `xs` a `xl`, listas, enlaces y checklist.
- Abrir los enlaces desde el modo de lectura.
- Mover, redimensionar, duplicar y eliminar la nota como cualquier otro elemento.
- Usar tipografía, colores, fondo, borde, radio y padding compatibles con el tema actual.
- Guardar la nota en el workspace local e incluirla siempre en la sincronización con Google Drive.
- Incluir el contenido completo en futuras exportaciones del tablero.
- Admitir emojis y cualquier carácter Unicode.

No habrá búsqueda global, historial persistente, recuperación de notas eliminadas, recordatorios, fechas de vencimiento, enlaces entre notas ni modo privado local.

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

El editor mantiene hasta 10 estados temporales para deshacer y rehacer. Agrupa cambios después de 1.5 segundos sin escritura. El historial existe solo durante la sesión de edición y se descarta al cerrar el editor. El contenido actual se guarda al salir, pero el historial no se sincroniza ni sobrevive a una recarga.

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

La nota no impone un límite de texto. El usuario puede activar o desactivar por separado el contador de caracteres y el contador de palabras. Ambos aparecen solo durante la edición y la preferencia se guarda por nota. El conteo de caracteres usa unidades Unicode visibles para tratar un emoji compuesto como un solo carácter.

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

## Ampliaciones propuestas

Esta sección define posibles mejoras posteriores a la primera versión. Las decisiones pendientes están al final y usan identificadores estables para poder responderlas directamente en este archivo.

### Historial de cambios

El historial funciona solo mientras la nota está en edición. Conserva hasta 10 estados y agrupa cambios después de 1.5 segundos sin escritura. Deshacer y rehacer recorren esos estados. Al salir se guarda el contenido actual y se descarta el historial. No se guarda en Drive ni se restaura después de recargar.

### Edición de enlaces

El botón de enlace debería abrir un panel pequeño junto a la selección. El panel puede incluir:

- Texto visible.
- URL de destino.
- Opción para abrir en una pestaña nueva.
- Acciones para aplicar, editar o quitar el enlace.

Si no hay texto seleccionado, pegar una URL la inserta directamente y usa la propia URL como texto visible. Al pegar una URL sobre texto seleccionado, la selección se convierte en enlace sin abrir el panel.

La aplicación debe normalizar direcciones sin protocolo, por ejemplo convertir `example.com` a `https://example.com`, y rechazar protocolos peligrosos. En modo de lectura, un enlace necesita abrirse sin entrar en edición. En modo de edición, un clic coloca el cursor y el panel permite modificarlo.

Cada enlace incluye una opción para abrirlo en la pestaña actual o en una nueva. Se inserta como texto por defecto, pero el usuario puede convertirlo en una tarjeta con título, dominio, descripción e imagen. La tarjeta depende de metadatos externos y debe conservar una presentación simple si el sitio bloquea la consulta.

### Listas de tareas

Las listas de tareas muestran siempre un resumen de avance, por ejemplo `3 de 7`, cuando la nota contiene al menos una casilla. El cálculo se obtiene del documento y no necesita guardarse por separado.

Las acciones posibles serían:

- Marcar o desmarcar casillas en lectura y edición.
- Atenuar y tachar automáticamente las tareas completadas.
- Mover las tareas completadas al final de su lista.
- Ocultar temporalmente las tareas completadas.
- Marcar o desmarcar toda una lista.

Completar una tarea la marca, atenúa y tacha. No se mueve por defecto. Cada nota tiene controles independientes para ocultar tareas completadas y para moverlas al final. Cuando se activa el orden automático, la tarea cambia de posición con una animación y el movimiento forma parte del historial de deshacer.

Cada casilla, incluidas las anidadas, cuenta como una tarea independiente en el progreso. Completar una tarea principal completa también todas sus subtareas. Desmarcar una tarea principal no cambia automáticamente las subtareas, salvo que se decida lo contrario durante la implementación.

### Búsqueda dentro de una nota

La búsqueda local aparece solo para la nota activa. Se abre desde un botón visible o con `Ctrl+F` y `Cmd+F` cuando el editor tiene foco. Fuera de una nota, el navegador conserva su comportamiento normal.

La barra mostraría la consulta, el número de coincidencias y botones para ir a la anterior o siguiente. Las coincidencias se resaltarían sin modificar el documento Tiptap. La búsqueda debería ignorar diferencias entre mayúsculas y minúsculas y respetar caracteres acentuados.

En notas pequeñas puede ocultarse del menú principal y depender del atajo para no ocupar espacio permanente. Si el elemento es demasiado bajo, la barra puede aparecer por encima de la nota, como la barra de formato.

La misma barra permite cambiar entre `Buscar` y `Buscar y reemplazar`. El reemplazo debe conservar las marcas de formato que no formen parte del texto sustituido y pedir confirmación antes de `Reemplazar todo`.

### Contador y límite

No existe un límite de caracteres. Cada nota permite activar por separado el contador de caracteres y el de palabras. Los contadores aparecen durante toda la edición cuando están habilitados y se ocultan en lectura. En elementos estrechos pueden compartir una sola línea compacta.

### Alineación

La barra ofrece alineación a la izquierda, centrada, a la derecha y justificada. El valor se aplica al párrafo o bloque actual, no como una marca sobre palabras individuales.

Listas, títulos y celdas de tabla también pueden admitir alineación. Conviene usar la misma propiedad de Tiptap para todos los bloques permitidos y conservarla al duplicar, sincronizar o restaurar una versión.

Un botón abre un menú desplegable propio con las opciones de alineación. No se usa un componente `select`.

### Sangría y listas anidadas

La sangría debería operar de dos maneras:

- Dentro de una lista, `Tab` anida el elemento y `Shift+Tab` lo saca un nivel.
- En un párrafo u otro bloque compatible, `Tab` aumenta la sangría y `Shift+Tab` la reduce.

Para evitar documentos difíciles de leer, el editor puede limitar la profundidad a cuatro niveles. No se guardarán valores CSS libres; cada bloque usará un nivel entero validado.

Mientras el editor tiene foco, `Tab` controla la sangría en todos los bloques compatibles, hasta cuatro niveles. La barra debe ofrecer también controles de aumentar y reducir sangría para usuarios que navegan entre controles con teclado. `Escape` devuelve la navegación de foco fuera del editor.

### Elemento de contenido plegable

El contenido plegable sería un elemento nuevo, no una variante de nota. Su objetivo es ahorrar espacio al mostrar un encabezado y revelar el cuerpo bajo demanda.

Una estructura inicial podría ser:

```ts
type CollapsibleItem = BaseBoardItem & {
  type: "collapsible";
  title: string;
  content: JSONContent;
  contentVersion: 1;
  defaultExpanded: boolean;
};
```

El encabezado permanece visible y tiene un control para expandir o contraer. Admite texto y un icono opcional. El cuerpo reutiliza el mismo editor enriquecido y todas las funciones de una nota.

El elemento guarda por separado el tamaño expandido de la tarjeta y la altura del encabezado visible cuando está contraído. Al contraerlo reduce su altura; al expandirlo restaura el tamaño anterior. Ambos tamaños se pueden modificar desde el tablero. El estado expandido o contraído forma parte del workspace y se sincroniza entre dispositivos.

### Adjuntos e imágenes

El editor acepta imágenes pegadas, soltadas, enlazadas por URL o seleccionadas desde un archivo. Cada imagen necesita texto alternativo, tamaño y alineación. El usuario puede mostrarla dentro del documento o como una fila de archivo descargable, y cambiar entre ambas presentaciones después de insertarla. Los GIF conservan su animación.

No conviene guardar archivos grandes como Base64 dentro del JSON de Tiptap. Aumentan el workspace aproximadamente un tercio y hacen que cada edición vuelva a sincronizar el archivo completo. Una implementación más segura separaría los archivos del documento:

```ts
type NoteAttachment = {
  id: string;
  mimeType: string;
  name: string;
  size: number;
  storageKey: string;
};
```

El nodo de imagen guardaría el identificador del adjunto. El almacenamiento local mantendría el archivo como `Blob`, y la sincronización necesitaría subirlo a Drive junto con el workspace. También harían falta reglas para archivos huérfanos, duplicación, eliminación y conflictos.

La aplicación no impondrá un límite propio al tamaño de cada archivo ni al total de adjuntos. El espacio utilizado pertenece a la cuenta de Google Drive vinculada y se descuenta de su almacenamiento disponible. La interfaz debe informar esto antes de la primera subida y mostrar el tamaño del archivo antes de confirmarla. Los límites técnicos y las cuotas que aplique Google siguen vigentes. Todos los archivos locales se sincronizan con Drive; no habrá adjuntos disponibles solo en un dispositivo.

Los archivos se guardarán separados del JSON del workspace. Así, editar el texto de una nota no vuelve a subir todos sus adjuntos. Las cargas grandes deberían usar el protocolo de carga reanudable de Drive para poder continuar después de una interrupción.

Una imagen podrá tener uno de estos orígenes:

- Archivo subido. La extensión conserva una copia local y, si Drive está conectado, crea un archivo en `appDataFolder`. Consume espacio de la cuenta vinculada.
- URL remota. El documento guarda la URL y solicita la imagen al servidor de origen al mostrarla. No consume espacio de Drive, pero depende de que el servidor mantenga la URL disponible y permita cargarla desde la extensión.

La extensión no copiará automáticamente una imagen remota a Drive. El usuario podrá elegir una acción posterior para guardar una copia propia. Al usar una URL remota, la solicitud revela al servidor de la imagen la dirección IP y datos HTTP básicos del dispositivo. La interfaz y la política de privacidad deben explicarlo.

El sistema solo debe mostrar un aviso de falta de espacio cuando Drive responda con el motivo `storageQuotaExceeded`. Un código HTTP `403` por sí solo no basta, porque también puede indicar permisos, políticas del dominio o límites de solicitudes. El mensaje propuesto es:

> No se pudo subir el archivo porque la cuenta de Google Drive vinculada no tiene espacio disponible. Libera espacio o amplía el almacenamiento e inténtalo de nuevo.

El archivo debe conservarse localmente si la subida remota falla. La nota mostrará que el adjunto está pendiente de sincronización y ofrecerá `Reintentar` y `Quitar de la nota`. Los errores de red, autorización y cuota temporal tendrán mensajes propios.

### Archivos admitidos y uso

La aplicación usa una lista cerrada de imágenes y documentos. Los archivos que no pertenezcan a esa lista se rechazan antes de guardarlos. Los documentos se tratan como descargas opacas y la vista previa integrada se limita a formatos que puedan mostrarse de forma segura.

Categorías que podrían almacenarse:

- Imágenes como `PNG`, `JPEG`, `WebP`, `GIF` y otros formatos compatibles.
- Documentos como `PDF`, archivos de texto y formatos de oficina.
- Documentos de oficina definidos en la lista de tipos permitidos.

La interfaz mostrará nombre, extensión, tipo declarado y tamaño. Estos datos no garantizan que el archivo sea seguro. Los formatos activos, por ejemplo HTML o SVG con contenido incrustado, no se renderizarán directamente dentro de la nota. Se ofrecerán como descarga. La extensión tampoco abrirá ejecutables dentro de su interfaz.

La aplicación no inspeccionará el contenido para decidir si es legal, correcto o seguro. Esto no elimina la necesidad de validar nombres, rutas, tipos, URLs y contenido que se intente renderizar. La responsabilidad del usuario y la seguridad técnica son asuntos separados.

### Cambios requeridos en privacidad

Antes de publicar adjuntos, `PRIVACY.md`, la política del sitio y las declaraciones de Chrome Web Store deberán indicar:

- Que la extensión procesa contenido creado por el usuario, incluidos texto, imágenes, archivos y URLs remotas.
- Que guarda el contenido del archivo, su nombre, tipo, tamaño e identificadores internos.
- Que los archivos pueden permanecer en el dispositivo y, si Drive está conectado, en `appDataFolder` dentro de la cuenta vinculada.
- Que los archivos sincronizados consumen el almacenamiento de esa cuenta y quedan sujetos a las cuotas de Google.
- Que una imagen remota no consume Drive si solo se conserva su URL.
- Que solicitar una imagen remota comunica la dirección IP y datos HTTP básicos al servidor que aloja la imagen.
- Que el desarrollador no recibe, revisa, clasifica ni usa los archivos para publicidad, perfiles o analítica.
- Cuándo se elimina la copia local y cuándo se elimina la copia de Drive.
- Que desconectar Drive no equivale a borrar automáticamente los archivos remotos, salvo que la implementación lo haga de forma expresa.
- Que la sincronización usa HTTPS, pero no ofrece cifrado de extremo a extremo.

La política actual afirma que la extensión no recopila comunicaciones personales, información médica ni financiera. Esa afirmación deberá cambiar porque el usuario podría incluir esas categorías dentro de un archivo, aunque la aplicación no las solicite. Texto propuesto:

> Clean New Tab no solicita que el usuario proporcione categorías específicas de información personal. El usuario decide qué escribe o adjunta. Sus notas y archivos podrían contener información personal o sensible. La Extensión solo procesa ese contenido para guardarlo, mostrarlo y, cuando el usuario habilita Google Drive, sincronizarlo con su propia cuenta.

Antes de adjuntar el primer archivo, la interfaz deberá mostrar un aviso breve y pedir una acción afirmativa. Texto propuesto:

> Los archivos se guardan en este dispositivo. Si Google Drive está conectado, también se subirán a la carpeta privada de datos de Clean New Tab y usarán espacio de esa cuenta. El desarrollador no recibe tus archivos.

### Cambios requeridos en los términos de uso

La exclusión de responsabilidad por el contenido corresponde a los términos de uso, no a la política de privacidad. Una frase absoluta como `la aplicación no se hace responsable` puede ser imprecisa y no elimina responsabilidades que establezca la ley. Conviene definir primero qué debe hacer el usuario y después limitar la responsabilidad en la medida permitida.

Texto propuesto para `Responsabilidad del usuario`:

> Eres responsable de los textos, enlaces y archivos que agregues o sincronices mediante Clean New Tab. Debes contar con los derechos y permisos necesarios sobre ese contenido y no utilizar la Extensión para almacenar o distribuir material ilegal, dañino, malicioso o que infrinja derechos de terceros. También eres responsable de proteger el acceso a tu navegador y cuenta de Google, revisar el espacio disponible y conservar copias de la información que consideres importante.

Texto propuesto para `Disponibilidad y garantías`:

> Clean New Tab no revisa ni controla los archivos elegidos por el usuario. En la medida permitida por la legislación aplicable, el desarrollador no responde por el contenido almacenado por el usuario, el uso que este haga de los archivos, la pérdida de acceso a contenido remoto ni las acciones de servicios externos como Google Drive. Esta limitación no excluye responsabilidades que no puedan limitarse legalmente.

Estos textos necesitan una revisión legal antes de publicarse. La implementación, la política pública, los términos, el aviso dentro de la extensión y las declaraciones de Chrome Web Store deben describir el mismo comportamiento.

### Tablas

Las tablas serán nodos estructurados de Tiptap, no texto con separadores. La primera versión permite:

- Insertar una tabla eligiendo filas y columnas.
- Agregar y eliminar filas o columnas.
- Escribir texto enriquecido dentro de cada celda.
- Definir una fila de encabezado.
- Alinear el contenido de las celdas.
- Redimensionar filas y columnas.
- Navegar entre celdas con `Tab` y `Shift+Tab`.
- Eliminar la tabla completa.

Una tabla admite hasta 20 filas, 10 columnas y 100 celdas totales. Si no cabe en la nota, usa desplazamiento horizontal dentro del cuerpo y conserva un ancho mínimo por columna. El usuario puede redimensionar filas y columnas.

Las tablas no se pueden anidar ni permiten combinar celdas. Cada celda admite todo el contenido disponible en una nota, incluidas listas, checklist, enlaces, imágenes y archivos.

Al pegar datos desde Excel o Google Sheets, el editor los convierte automáticamente en tabla cuando el portapapeles contiene HTML tabular o texto separado por tabulaciones. La importación respeta el máximo de filas, columnas y celdas; si lo supera, muestra un aviso y no inserta una tabla parcial.

## Decisiones confirmadas

Las respuestas siguientes se conservaron como registro de producto. El comportamiento normativo ya está incorporado en las secciones anteriores.

### Historial

**H1.** ¿El historial debe sobrevivir al cierre del navegador y sincronizarse con Drive, o basta con conservarlo durante la sesión?

Respuesta:que se conserve durante la sesión

**H2.** ¿Cuántas versiones debería conservar cada nota? Una opción inicial razonable sería 10.

Respuesta:10 me parece bien

**H3.** ¿Las versiones se crean automáticamente al cerrar el editor, manualmente, o de ambas formas?

Respuesta: Las versiones son al momento de editar, algo como un debounce de uno o dos segundos, y solo funcionan durante la sesión y mientras se esté editando, si se sale de edición se guarda, pero solo se puede deshacer o rehacer dentro de edición.

### Enlaces

**E1.** Si no hay texto seleccionado, ¿pegar una URL debe insertar un enlace con la propia URL como texto o abrir un formulario para pedir el texto visible?

Respuesta: Debe de pegar de forma directa

**E2.** ¿Los enlaces deben abrir siempre en una pestaña nueva o debe poder elegirse por enlace?

Respuesta: Debe poder elejirse en su config interna del enlace

**E3.** ¿Quieres tarjetas enriquecidas al pegar enlaces o solo enlaces de texto?

Respuesta: me gustaría que sea enlace de texto, pero que igual se pueda cambiar a tarjeta enriquecida si se desea.

### Listas de tareas

**L1.** ¿El progreso debe mostrarse siempre que exista una checklist, solo durante la edición o nunca?

Respuesta: Siempre que exista una checklist

**L2.** ¿Qué debe ocurrir al completar una tarea: solo marcarla, atenuarla y tacharla, moverla al final, o combinar estas opciones?

Respuesta: Atenuarla y tacharla adempas de la marca, no se mueve.

**L3.** ¿Quieres un control para ocultar las tareas completadas? Si se ocultan, ¿la preferencia se guarda por nota?

Respuesta: Si me gustaría un control para ocultarlas, y otro para que se muevan al final al completar con una animación.

**L4.** ¿Las tareas principales y subtareas deben cambiar de estado automáticamente entre sí?

Respuesta: Si se completa una principal, sus subtareas se completan igual.

**L5.** Si se desmarca una tarea principal, ¿también se deben desmarcar todas sus subtareas?

Respuesta: si

### Búsqueda

**B1.** ¿La búsqueda necesita un botón visible, el atajo `Ctrl/Cmd+F`, o ambos?

Respuesta: Ambos, cuando se busca aparece el campo de búsqueda y poder cambiar a buscar y reemplazar

**B2.** ¿Necesitas reemplazar texto o solo recorrer coincidencias?

Respuesta: Ambos

### Contador

**C1.** ¿Se mantiene el límite de 2,000 caracteres, se configura por nota o se elimina?

Respuesta: Que se elimine el límite, pero que siga el contador, de letras y palabras, y que sea configurable en la nota

**C2.** ¿El contador debe mostrar caracteres, palabras o ambos?

Respuesta: se pueden ambos pero se configuran individual

**C3.** ¿Debe mostrarse durante toda la edición o solo al acercarse al límite?

Respuesta:Se quita el límite

### Alineación y sangría

**F1.** ¿Incluimos alineación justificada además de izquierda, centro y derecha?

Respuesta: Si

**F2.** ¿La barra debe usar botones separados o un menú compacto para la alineación?

Respuesta: Un menú desplegable, no quiero un select

**F3.** ¿Los párrafos normales necesitan sangría o solo las listas anidadas?

Respuesta: La sangría funciona en todo si se hace un tab

**F4.** ¿Cuántos niveles máximos de sangría permitimos? La propuesta inicial es cuatro.

Respuesta: Me agradan 4

### Elemento plegable

**P1.** ¿El cuerpo plegable usa el mismo editor y todas las funciones de una nota?

Respuesta: Si

**P2.** Al contraerlo, ¿debe mantener el tamaño del marco o reducir su altura y restaurarla después?

Respuesta: Se reduce su altura, me gustaría que se pueda editar tanto el tamaño de la card, como del texto que mostrará

**P3.** ¿El estado expandido se sincroniza entre dispositivos o se recuerda localmente en cada dispositivo?

Respuesta: Se sincroniza

**P4.** ¿El encabezado admite solo texto simple o también icono, color y checklist de estado?

Respuesta: Texto e ícono opcional

### Adjuntos

**A1.** ¿La primera versión admite solo imágenes o también archivos descargables como PDF?

Respuesta: Imágenes y otros archivos, cuando se sube una imagen, se puede decidir si se ve en forma de archivo o de imagen., cuando se le de click a un archivo, se puede descargar.

**A2.** ¿Cuál debe ser el tamaño máximo por archivo y por nota?

Respuesta: La aplicación no impone un límite propio. El usuario utiliza el espacio disponible en la cuenta de Drive vinculada. Se debe informar el tamaño antes de subir y mostrar un error específico si Drive no tiene espacio.

**A3.** ¿Las imágenes animadas GIF se conservan animadas o se convierten a una imagen estática?

Respuesta: se conservan animadas

**A4.** ¿Las imágenes deben sincronizarse siempre con Drive o puede haber adjuntos disponibles solo en el dispositivo actual?

Respuesta: Siempre se sincronizan

**A5.** ¿Se permiten imágenes enlazadas desde una URL o solo archivos copiados al almacenamiento de la extensión?

Respuesta: Se permiten ambas. Una URL remota no se copia automáticamente y no consume espacio de Drive. El usuario puede pedir después que la extensión guarde una copia propia.

**A6.** ¿La aplicación debe aceptar cualquier tipo de archivo como descarga o usar una lista cerrada, por ejemplo imágenes, PDF, texto y documentos de oficina?

Respuesta: Una lista cerrada de archivos, imágenes y documentos, otras cosas ya no.

**A7.** ¿Qué extensiones debe incluir la lista cerrada? Propuesta inicial: `png`, `jpg`, `jpeg`, `webp`, `gif`, `pdf`, `txt`, `md`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `csv`, `odt`, `ods` y `odp`.

Respuesta: todas hasta csv, las últimas 3 no

### Tablas

**T1.** ¿Qué tamaño máximo debe tener una tabla? Una propuesta inicial es 20 filas por 10 columnas y 100 celdas totales.

Respuesta: Me agrada ese límite

**T2.** ¿La primera versión necesita combinar celdas y redimensionar columnas?

Respuesta: No se combinan, pero si se redimensionan, filas y columnas

**T3.** ¿Se permiten checklist y listas dentro de las celdas o solo texto con formato y enlaces?

Respuesta: Se permite todo, hasta las imágenes o archivos

**T4.** ¿Al pegar desde Excel o Google Sheets debe convertirse automáticamente en tabla?

Respuesta: Si

**T5.** ¿Una tabla que no cabe debe usar desplazamiento horizontal o hacer más pequeño su contenido?

Respuesta: Desplazamiento

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
- La nota no limita la cantidad de texto.
- Los contadores de caracteres y palabras se pueden activar por separado en cada nota.
- Deshacer y rehacer conservan hasta 10 estados durante la edición y se descartan al salir.
- Una nota larga usa scroll interno.
- Marcar una checklist actualiza y guarda su estado.
- Marcar una checklist en lectura no abre el editor de texto.
- Toda checklist muestra su progreso.
- Completar una tarea principal completa también sus subtareas.
- Las tareas completadas se atenúan y tachan; ocultarlas o moverlas al final son opciones por nota.
- La búsqueda y el reemplazo funcionan mediante botón y atajo dentro de la nota activa.
- La alineación y la sangría se conservan después de recargar.
- Una tabla respeta el máximo de 20 filas, 10 columnas y 100 celdas.
- Las tablas permiten redimensionar filas y columnas, pero no combinar celdas.
- Una tabla ancha usa desplazamiento horizontal.
- Pegar datos tabulares desde Excel o Google Sheets crea una tabla si respeta los límites.
- Los archivos fuera de la lista permitida se rechazan antes de guardarlos.
- Las imágenes pueden mostrarse como imagen o como archivo y los GIF conservan su animación.
- Un archivo local se sincroniza con Drive y un error de espacio muestra el mensaje específico.
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
