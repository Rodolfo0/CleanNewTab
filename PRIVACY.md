# Política de privacidad de Clean New Tab

**Última actualización: 4 de agosto de 2026**

Clean New Tab (“la Extensión”) reemplaza la página de nueva pestaña del
navegador por un tablero personalizable. Esta política explica qué información
maneja la Extensión, para qué se utiliza y cuándo se comparte con servicios
externos.

## Resumen

- No es necesario crear una cuenta.
- El desarrollador no recopila, recibe ni vende datos personales.
- La configuración del tablero se guarda localmente y, sólo si el usuario lo
  solicita, puede sincronizarse con su propio Google Drive.
- El acceso al historial de navegación es opcional.
- Las sugerencias remotas de búsqueda son opcionales y requieren autorización.
- Los dominios de los accesos directos pueden enviarse a `geticon.dev` para
  obtener sus iconos.

## Información manejada por la Extensión

### Configuración y contenido del tablero

La Extensión guarda localmente los espacios, accesos directos, grupos, títulos,
preferencias visuales, fondos y demás opciones creadas por el usuario. Esta
información no se envía al desarrollador.

### Sincronización opcional con Google Drive

Cuando el usuario selecciona explícitamente **“Sincronizar mi configuración con
Drive”**, la Extensión solicita autorización para acceder únicamente a su
carpeta privada de datos de aplicación (`appDataFolder`) en Google Drive. La
Extensión puede subir y descargar allí los tableros, accesos directos, URLs,
preferencias visuales y fondos personalizados necesarios para mantener la misma
configuración en los dispositivos del usuario.

Estos archivos no se comparten con otros usuarios ni son visibles en la carpeta
normal de Google Drive. Google procesa y almacena la información conforme a sus
propias condiciones y política de privacidad. El desarrollador no recibe los
archivos ni el contenido de los tableros.

La autorización se inicia sólo por acción del usuario. Los tokens necesarios
para mantener la conexión son administrados por el navegador o almacenados
localmente por la Extensión. En Chrome y Firefox, un servicio OAuth alojado en Cloudflare
Workers procesa de forma transitoria el código y los tokens de autorización para
intercambiarlos o renovarlos con Google. Este servicio no guarda esos tokens ni
recibe tableros, fondos o archivos de Drive. Los tokens se utilizan
exclusivamente para acceder a la carpeta privada de datos de esta aplicación.

### Historial de navegación

Si el usuario concede voluntariamente el permiso de historial, la Extensión
consulta las páginas visitadas recientemente para mostrarlas dentro de la nueva
pestaña y facilitar la creación de accesos directos.

El historial se procesa localmente. No se envía al desarrollador ni se utiliza
para publicidad, elaboración de perfiles o seguimiento.

### Búsquedas y sugerencias

La Extensión conserva localmente un historial limitado de términos buscados
para ofrecer sugerencias locales. El usuario puede borrar estos datos
eliminando los datos de la Extensión o desinstalándola.

Cuando el usuario habilita las sugerencias remotas y concede el permiso
correspondiente, el texto que escribe puede enviarse mediante HTTPS al proveedor
de búsqueda seleccionado para obtener sugerencias. Los posibles proveedores
son:

- Google: `suggestqueries.google.com`
- Microsoft Bing: `api.bing.com`
- DuckDuckGo: `duckduckgo.com`
- Brave Search: `search.brave.com`
- Ecosia: `ac.ecosia.org`

La Extensión no envía estos términos a servidores operados por el desarrollador.
Cada proveedor externo trata la información conforme a su propia política de
privacidad.

Al realizar una búsqueda, el navegador abre el proveedor elegido con el término
introducido. Esta acción funciona del mismo modo que visitar y utilizar
directamente ese buscador.

### Iconos de sitios web

Para mostrar el icono de un acceso directo, la Extensión puede enviar el nombre
de dominio de ese sitio a `geticon.dev` mediante HTTPS. El servicio devuelve la
imagen del icono, que puede almacenarse localmente para evitar solicitudes
repetidas.

No se envía a `geticon.dev` el historial completo del usuario. Sólo se solicita
el dominio asociado al acceso directo cuyo icono debe mostrarse.

Como ocurre con cualquier conexión a un servicio de Internet, el proveedor que
recibe la solicitud puede recibir información técnica necesaria para procesarla,
como la dirección IP y datos HTTP básicos, conforme a su propia política.

## Información que no se recopila

La Extensión no solicita ni recopila:

- Nombre, correo electrónico, dirección u otros identificadores personales.
- Contraseñas, números PIN o credenciales introducidas manualmente por el
  usuario. La Extensión sí maneja localmente la autorización OAuth necesaria
  para la sincronización opcional con Drive, como se describe anteriormente.
- Información financiera o de pagos.
- Información médica o de salud.
- Comunicaciones personales.
- Coordenadas GPS o ubicación precisa.

## Uso y divulgación de la información

La información manejada por la Extensión se utiliza exclusivamente para ofrecer
las funciones visibles de la nueva pestaña. El desarrollador:

- No vende datos de usuarios.
- No utiliza datos para publicidad personalizada.
- No crea perfiles de usuarios.
- No permite que personas revisen datos de usuarios.
- No transfiere datos con fines crediticios, publicitarios o comerciales.

La transmisión a proveedores externos se limita a las funciones descritas:
sincronización opcional con Google Drive, sugerencias de búsqueda e iconos de
sitios web. Cloudflare proporciona la infraestructura del servicio OAuth usado
por la Extensión y puede procesar los datos técnicos necesarios para atender esas
solicitudes conforme a su propia política de privacidad.

El uso de la información obtenida mediante las API de Chrome cumple con la
Política de Datos de Usuario de Chrome Web Store, incluidos sus requisitos de
Uso Limitado.

El uso de la información recibida de las API de Google se limitará a proporcionar
la función visible de sincronización solicitada por el usuario y cumplirá con la
Política de Datos de Usuario de Chrome Web Store, incluidos los requisitos de
Uso Limitado.

## Almacenamiento, conservación y eliminación

Los tableros, preferencias, términos de búsqueda locales e iconos almacenados en
caché permanecen en el dispositivo mientras la Extensión esté instalada o hasta
que el usuario elimine sus datos. Si se habilita la sincronización, la copia de
los tableros y fondos permanece en `appDataFolder` hasta que el usuario elimine
los datos de la aplicación desde su cuenta de Google.

El usuario puede eliminar la información:

1. Borrando los datos de la Extensión desde la configuración del navegador.
2. Restableciendo o eliminando los elementos desde la interfaz cuando esa opción
   esté disponible.
3. Quitando la conexión con Google Drive desde la Extensión.
4. Eliminando los datos asociados a la aplicación desde su cuenta de Google si
   también desea borrar la copia remota.
5. Desinstalando la Extensión.

El desarrollador no puede recuperar estos datos porque no recibe ni mantiene una
copia en sus servidores.

## Seguridad

Las solicitudes externas realizadas por la Extensión utilizan HTTPS. Ningún
método de transmisión o almacenamiento es completamente infalible, pero la
Extensión limita el acceso y la transmisión a lo necesario para proporcionar
sus funciones.

## Menores de edad

La Extensión no está dirigida específicamente a menores de edad y no recopila
deliberadamente información personal de menores.

## Cambios en esta política

Esta política puede actualizarse cuando cambien las funciones o las prácticas de
datos de la Extensión. La fecha de la parte superior indicará la revisión más
reciente. Si un cambio requiere manejar nuevas categorías de información, se
actualizarán también los avisos y consentimientos correspondientes.

## Contacto

Para preguntas o solicitudes relacionadas con esta política, abre un reporte en:

https://github.com/Rodolfo0/CustomNewTab/issues
