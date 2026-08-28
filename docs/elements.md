# Elementos del tablero

Este documento describe los elementos disponibles en la nueva pestaña, sus variantes de creación y cómo se comportan en edición y render.

## Flujo general

Los elementos se agregan desde la floating window `Agregar`.

La ventana tiene dos zonas:

- Izquierda: tipo de elemento.
- Derecha: variantes disponibles para el tipo seleccionado.

La variante se elige al crear el elemento. Después de creado, la ventana de configuración solo muestra propiedades aplicables a esa variante. Esto evita cambiar entre diseños incompatibles y limita las opciones visibles.

Las capacidades de una variante viven en el modelo. Por ejemplo, una variante sin fondo no solo oculta el control de fondo: `getItemStyle` fuerza `backgroundColor: "transparent"` y `borderWidth: 0` si esa variante tampoco usa borde. En código, una card con superficie y una variante limpia son variantes distintas.

Cada elemento guarda:

- `type`: tipo de elemento.
- `layout`: posición, tamaño y anclaje.
- `style`: color, borde, padding, fuente, etc.
- `display`: variante, ícono, alineación y opciones visuales.

En edición, el elemento muestra tiradores en sus cuatro lados y cuatro esquinas. Un lado cambia solo ese eje y mantiene fijo el borde contrario. Una esquina cambia ancho y alto. `Shift` conserva la proporción al arrastrar una esquina y `Ctrl` o `Cmd` redimensiona desde el centro.

## Link

Tipo: `link`

Representa un acceso a una URL. En modo normal, todo el contenedor funciona como link.

### Variantes

#### Card completa

Valor: `link-card`

Muestra:

- Ícono.
- Nombre.
- URL como detalle.
- Fondo y borde.

#### Card limpia

Valor: `link-card-plain`

Muestra:

- Ícono.
- Nombre.
- URL como detalle.

No muestra:

- Fondo.
- Borde.

Propiedades relevantes:

- URL.
- Nombre.
- Ícono.
- Tamaño de ícono.
- Estilo del ícono: plano, base o sólido.
- Alineación.
- Estilos generales del contenedor.

#### Solo ícono

Valor: `link-icon`

Muestra:

- Solo el ícono.
- Fondo y borde.

#### Solo ícono limpio

Valor: `link-icon-plain`

Muestra:

- Solo el ícono.

No muestra:

- Nombre.
- URL como detalle.
- Fondo.
- Borde.

Propiedades relevantes:

- URL.
- Ícono.
- Tamaño de ícono.
- Estilo del ícono.
- Alineación.
- Estilos generales del contenedor.

#### Solo texto

Valor: `link-text`

Muestra:

- Solo el nombre.

No muestra:

- Ícono.
- URL como detalle.
- Fondo.
- Borde.

#### Franja

Valor: `link-strip`

Muestra:

- Ícono.
- Nombre.
- Fondo y borde.

#### Tile

Valor: `link-tile`

Muestra:

- Ícono.
- Nombre.
- Fondo y borde.

Propiedades relevantes:

- URL.
- Nombre.
- Alineación.
- Estilos de texto y contenedor.

## Grupo

Tipo: `group`

Contiene una lista de links internos. Los links del grupo se administran desde una floating window separada: `Links de {grupo}`.

### Variantes

#### Lista

Valor: `group-list`

Muestra:

- Header del grupo con ícono y título.
- Links internos con ícono y texto.
- Fondo y borde.

#### Lista limpia

Valor: `group-list-plain`

Muestra:

- Header del grupo con ícono y título.
- Links internos con ícono y texto.

No muestra:

- Fondo.
- Borde.

#### Lista sin header

Valor: `group-list-no-header`

Muestra:

- Links internos con ícono y texto.
- Fondo y borde.

No muestra:

- Header del grupo.

#### Grid

Valores: `group-grid`, `group-grid-no-header`

Muestra:

- Links internos en celdas.
- Fondo y borde.

`group-grid-no-header` no muestra el header.

Propiedades relevantes:

- Nombre del grupo.
- Ícono del grupo.
- Links internos.
- Ícono por cada link interno.
- Alineación.
- Estilos generales del contenedor.

#### Íconos

Valor: `group-icons`

Muestra:

- Links internos como una cuadrícula de solo íconos.
- Fondo y borde.

#### Íconos limpios

Valor: `group-icons-plain`

Muestra:

- Links internos como una cuadrícula de solo íconos.

No muestra:

- Header del grupo.
- Texto de los links internos.
- Fondo.
- Borde.

Propiedades relevantes:

- Links internos.
- Ícono por cada link interno.
- Tamaño y estilo visual del grupo.
- Estilos generales del contenedor.

## Título

Tipo: `title`

Representa texto libre dentro del tablero.

### Variantes

#### Título limpio

Valor: `title-heading`

Muestra:

- Texto principal.

Propiedades relevantes:

- Nombre/texto.
- Fuente.
- Tamaño de fuente, automático o bloqueado.
- Color de texto.
- Alineación.

No muestra:

- Fondo.
- Borde.

#### Etiqueta

Valor: `title-label`

Muestra texto pequeño en mayúsculas, sin fondo ni borde.

#### Panel

Valor: `title-panel`

Muestra texto con fondo y borde configurables.

## Fecha

Tipo: `date`

Muestra la fecha actual usando formato local en español.

### Variantes

#### Fecha card

Valor: `date-card`

Muestra:

- Etiqueta.
- Fecha actual.
- Fondo y borde.

#### Fecha grande

Valor: `date-large`

Muestra:

- Etiqueta.
- Fecha actual en formato grande.

No muestra fondo ni borde.

#### Fecha mínima

Valor: `date-minimal`

Muestra solo la fecha actual, sin etiqueta, fondo ni borde.

Propiedades relevantes:

- Etiqueta.
- Fuente.
- Tamaño de fuente, automático o bloqueado.
- Color de texto.
- Fondo, borde, radio y padding.
- Alineación.

## Búsqueda

Tipo: `search`

Permite buscar en la web. Actualmente usa Google con el query ingresado.

### Variantes

#### Barra card

Valor: `search-bar`

Muestra:

- Input de búsqueda.
- Botón de búsqueda.
- Fondo y borde.

#### Caja

Valor: `search-box`

Muestra:

- Título.
- Input de búsqueda.
- Botón de búsqueda.
- Fondo y borde.

#### Mínima

Valor: `search-minimal`

Muestra:

- Input de búsqueda.
- Botón de búsqueda.

No muestra fondo ni borde.

Propiedades relevantes:

- Placeholder.
- Fuente.
- Tamaño de fuente, automático o bloqueado.
- Fondo, borde, radio y padding.
- Alineación.

## Tamaños automáticos y bloqueo

Los elementos calculan automáticamente tamaño de fuente e ícono a partir del tamaño del contenedor.

Si el usuario activa `Bloquear`:

- El tamaño manual queda fijo.
- El autosize deja de modificar ese valor.

Esto aplica a:

- Tamaño de texto.
- Tamaño de ícono, cuando el elemento usa ícono.

## Padding

El padding configurado en el elemento controla el espacio interno real del canvas.

Cuando el padding está en `0`, también se reducen espacios internos que podrían venir de Mantine o de wrappers del componente, por ejemplo:

- Padding interno del buscador.
- Padding del botón de búsqueda.
- Espacios entre ícono y texto.
- Padding de links dentro de grupos.
- Gaps internos de stacks/grupos dentro del canvas.

## Persistencia

El tablero se guarda en `localStorage`.

También se puede:

- Exportar como JSON.
- Importar desde JSON.

Al cargar o importar, el tablero se valida y los layouts se normalizan.

## Compatibilidad de íconos

Los íconos de Phosphor se guardan usando el formato nuevo con sufijo `Icon`, por ejemplo:

- `LinkSimpleIcon`
- `HouseIcon`
- `GithubLogoIcon`

Valores antiguos sin sufijo, como `LinkSimple`, se normalizan automáticamente al renderizar.
