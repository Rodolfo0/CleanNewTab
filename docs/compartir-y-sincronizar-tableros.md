# Sincronización personal de tableros con Google Drive

## Alcance y decisión

Clean New Tab permitirá que una misma persona mantenga su configuración
sincronizada entre sus navegadores y dispositivos mediante su propia cuenta de
Google Drive.

La única integración remota será **“Sincronizar mi configuración con Drive”**,
utilizando la carpeta privada `appDataFolder` de Google Drive.

Queda fuera del alcance:

- Compartir tableros con otras personas.
- Archivos visibles en “Mi unidad”.
- Enlaces públicos o privados.
- Roles, colaboración y cuentas propias de Clean New Tab.
- Sincronización mediante la cuenta de Chrome o Firefox.

La extensión seguirá funcionando completamente sin cuenta. Drive será una
función voluntaria que el usuario activa desde la configuración.

## Por qué `appDataFolder`

`appDataFolder` es una carpeta oculta de Drive creada para guardar datos de una
aplicación. Sólo Clean New Tab puede acceder a los archivos que haya creado ahí;
el usuario no necesita elegir una carpeta ni administrar manualmente el archivo.

El alcance OAuth requerido es:

```text
https://www.googleapis.com/auth/drive.appdata
```

Es un alcance limitado y no da acceso a los demás documentos del usuario. Los
archivos de `appDataFolder` no pueden compartirse, que coincide con la decisión
del producto. Google documenta sus características y restricciones en
[Store application-specific data](https://developers.google.com/workspace/drive/api/guides/appdata).

## Objetivo de experiencia

Una persona puede tener, por ejemplo:

- Chrome en una computadora de escritorio.
- Firefox en una laptop.
- Otro navegador compatible en un tercer dispositivo.

Después de conectar en cada instalación la **misma cuenta de Google**, todos los
dispositivos leen y actualizan el mismo workspace privado. Los cambios deben
estar disponibles localmente de inmediato y sincronizarse cuando haya conexión.

No se promete edición simultánea en tiempo real. Sí se deben detectar cambios
hechos en dos dispositivos para no sobrescribir silenciosamente el trabajo.

## Situación actual

`src/newtab/storage/boardStorage.ts` guarda un `BoardWorkspace` versión 1 en
`localStorage`, bajo la clave `clean-new-tab:workspace:v1`. El workspace contiene
el espacio activo y todos los espacios, tableros, preferencias visuales e IDs de
fondos.

La validación y normalización existentes se pueden reutilizar, pero deben
exponerse como funciones públicas para validar tanto datos locales como remotos.
También es conveniente migrar la persistencia local a `browser.storage.local`,
que está diseñada para extensiones y puede usarse desde distintos contextos.

## Arquitectura propuesta

La fuente de respuesta rápida siempre será la copia local. Drive funcionará como
réplica remota y punto común entre dispositivos.

```text
Interfaz del tablero
        |
        v
WorkspaceRepository
   |             |
   v             v
LocalProvider    DriveAppDataProvider
(respuesta       (sincronización
 inmediata)       en segundo plano)
```

Separar las responsabilidades evita introducir OAuth y peticiones HTTP en los
componentes de React.

```ts
type WorkspaceEnvelope = {
  format: 'clean-new-tab-workspace'
  formatVersion: 1
  workspace: BoardWorkspace
  revision: number
  updatedAt: string
  updatedBy: string
}

interface WorkspaceProvider {
  load(): Promise<WorkspaceEnvelope | null>
  save(value: WorkspaceEnvelope): Promise<WorkspaceEnvelope>
}
```

Componentes sugeridos:

- `WorkspaceRepository`: carga local, coordina guardados y emite el estado de
  sincronización.
- `LocalWorkspaceProvider`: usa `browser.storage.local` y migra una vez desde el
  `localStorage` actual.
- `GoogleAuthService`: inicia, renueva y desconecta la autorización.
- `DriveAppDataProvider`: busca, crea, descarga y actualiza el archivo privado.
- `WorkspaceSyncEngine`: compara revisiones, combina cambios seguros y gestiona
  conflictos.

## Archivo remoto

Usar un único archivo llamado, por ejemplo:

```text
clean-new-tab-workspace-v1.json
```

Contenido:

```json
{
  "format": "clean-new-tab-workspace",
  "formatVersion": 1,
  "revision": 18,
  "updatedAt": "2026-08-03T12:00:00.000Z",
  "updatedBy": "device-random-id",
  "workspace": {
    "version": 1,
    "activeSpaceId": "space-id",
    "spaces": []
  }
}
```

El `device-random-id` se genera una vez por instalación y no contiene el nombre,
correo ni datos del equipo. Sirve para explicar el origen de un cambio y evitar
confundir una escritura propia con una remota.

La extensión debe guardar localmente el `fileId` que devuelve Drive. Si no
existe, buscar por nombre dentro de `appDataFolder`; si hay varios resultados por
un fallo anterior, elegir el válido más reciente y no borrar automáticamente los
demás.

Los fondos actuales son IDs de recursos incluidos en la extensión y pueden
permanecer en el JSON. Si en el futuro se permiten imágenes subidas por el
usuario, deberán diseñarse como archivos adicionales; no deben convertirse a
Base64 dentro del workspace.

## Flujo de conexión

1. El usuario pulsa **“Sincronizar mi configuración con Drive”**.
2. La interfaz explica antes del consentimiento que se guardarán nombres,
   apariencia y URLs de los accesos directos en una carpeta privada de Drive.
3. La extensión abre el flujo OAuth por una acción explícita del usuario.
4. Solicita únicamente `drive.appdata`.
5. Una vez autorizada, busca el archivo remoto.
6. Si no existe, sube la configuración local.
7. Si existe, compara la copia local y la remota y muestra una decisión sólo si
   ambas contienen cambios que no se pueden combinar con seguridad.
8. La pantalla muestra la cuenta conectada sólo si se obtuvo ese dato con un
   alcance separado; no es necesario pedir correo o perfil para sincronizar.

Los flujos interactivos de identidad deben iniciarse desde una acción visible,
no automáticamente al abrir una pestaña. Chrome ofrece
[`chrome.identity`](https://developer.chrome.com/docs/extensions/reference/api/identity)
y Firefox expone la API WebExtensions
[`identity.launchWebAuthFlow`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity/launchWebAuthFlow).

Google desaconseja el flujo OAuth implícito para clientes JavaScript y recomienda
Authorization Code con PKCE. La implementación final de autenticación debe usar
PKCE y registrar correctamente los clientes/redirect URIs de cada navegador;
véase [OAuth 2.0 for client-side web applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow).

## Funcionamiento diario

### Al abrir una nueva pestaña

1. Renderizar inmediatamente la copia local.
2. Si Drive está conectado y hay red, consultar en segundo plano los metadatos o
   el archivo remoto.
3. Si la revisión remota es nueva, descargarla, validarla y aplicar los cambios.
4. No abrir una ventana de inicio de sesión. Si hace falta interacción, mostrar
   el estado **“Vuelve a conectar Drive”**.

Consultar Drive en cada nueva pestaña puede generar peticiones repetidas. Se
debe compartir un `lastSyncAt` en el almacenamiento local y omitir la consulta
si otra pestaña sincronizó recientemente. Un intervalo inicial razonable es
entre 30 y 60 segundos, más una sincronización al recuperar conectividad.

### Al modificar un tablero

1. Guardar el nuevo workspace localmente de inmediato.
2. Marcarlo como pendiente con la revisión base conocida.
3. Esperar un `debounce` corto, por ejemplo 1–2 segundos.
4. Al terminar acciones continuas como arrastrar o redimensionar, ejecutar la
   sincronización sin esperar más eventos de píxel.
5. Leer la revisión remota antes de escribir.
6. Si no cambió desde la revisión base, incrementar la revisión y actualizar el
   archivo.
7. Si cambió, ejecutar la estrategia de conflicto.

### Sin conexión

- El usuario continúa trabajando con normalidad.
- Los cambios se guardan localmente y quedan con estado `pending`.
- Al volver la red se consulta primero el remoto; nunca se sube a ciegas.
- Los errores usan reintentos con espera incremental y no bloquean la interfaz.

## Conflictos entre tres dispositivos

Un número `revision` por sí solo no impide una carrera: dos dispositivos pueden
leer la misma revisión y escribir después. Conviene conservar también la versión
o identificador remoto que permita detectar que el archivo cambió y, antes de
actualizar, volver a comprobar el estado remoto. El motor debe diseñarse para
que una escritura tardía no destruya una copia sin conservarla.

### Metadatos locales mínimos

```ts
type SyncMetadata = {
  connected: boolean
  driveFileId?: string
  deviceId: string
  lastSyncedRevision?: number
  lastSyncedSnapshot?: WorkspaceEnvelope
  pending: boolean
  lastSyncAt?: string
  lastError?: string
}
```

`lastSyncedSnapshot` permite una comparación de tres vías:

```text
base que ambos conocían
        /          \
cambio local    cambio remoto
```

### Regla de combinación inicial

- Si sólo cambió el remoto, aceptar el remoto.
- Si sólo cambió el local, subir el local.
- Si local y remoto modificaron espacios diferentes, combinar ambos.
- Si ambos modificaron el mismo espacio, no intentar mezclar elementos
  arbitrariamente en la primera versión.
- Conservar las dos variantes y pedir al usuario elegir **“Usar este
  dispositivo”** o **“Usar Drive”**, mostrando fecha, dispositivo y cantidad de
  espacios/elementos.

Antes de resolver, guardar localmente una copia de recuperación de ambas
variantes. Una mejora posterior puede añadir revisiones por espacio para reducir
los conflictos sin construir colaboración en tiempo real.

### Espacio activo

`activeSpaceId` es una preferencia de navegación, no necesariamente contenido
que deba imponerse a todos los dispositivos. Se recomienda mantener el espacio
activo local por dispositivo y sincronizar sólo `spaces`. Así, cambiar de espacio
en la laptop no mueve automáticamente al usuario en la computadora de escritorio.

Esto requiere separar `activeSpaceId` del contenido remoto o ignorarlo al aplicar
una actualización. Es una modificación deliberada respecto al `BoardWorkspace`
actual.

## Autenticación y sesiones

- Declarar el permiso `identity` en Chrome y Firefox.
- Añadir los hosts estrictamente necesarios para OAuth y Drive API según lo que
  exija cada manifiesto y la implementación final.
- Crear credenciales OAuth apropiadas en un proyecto de Google Cloud y habilitar
  Google Drive API.
- Configurar la pantalla de consentimiento y publicar la política de privacidad.
- Usar Authorization Code con PKCE; una extensión distribuida es un cliente
  público y no puede proteger un `client_secret` embebido.
- Mantener tokens fuera del archivo de workspace.
- Preferir la caché/gestión de tokens proporcionada por el navegador cuando sea
  aplicable. No guardar tokens en `localStorage`.
- Ante un `401`, invalidar/renovar la sesión una vez. Si requiere interacción,
  detener reintentos y mostrar **“Vuelve a conectar Drive”**.
- **Desconectar** elimina credenciales/caché local de autenticación y detiene la
  sincronización, pero no debe borrar el archivo remoto sin confirmación aparte.

Firefox y Chromium pueden requerir clientes OAuth y redirect URIs diferentes.
Esta parte debe probarse con los IDs definitivos de las extensiones publicadas;
los IDs temporales de desarrollo no son una base estable para producción.

## Estados de interfaz

En la configuración:

- **Drive no conectado** — botón “Sincronizar mi configuración con Drive”.
- **Conectando…** — autorización en curso.
- **Sincronizado** — incluir hora de la última sincronización.
- **Cambios pendientes** — guardados en este dispositivo, esperando red.
- **Sincronizando…** — lectura o escritura remota en curso.
- **Conflicto** — requiere elegir una versión.
- **Vuelve a conectar Drive** — autorización revocada o expirada.
- **Error temporal** — se reintentará; ofrecer “Reintentar ahora”.

Acciones disponibles cuando está conectado:

- “Sincronizar ahora”.
- “Desconectar Drive”.
- “Eliminar copia de Drive…”, separada y con confirmación clara.

No hace falta mostrar “Compartir”, permisos, miembros ni enlace al archivo: el
contenido de `appDataFolder` no es visible en la interfaz normal de Drive.

## Validación y seguridad

Todo archivo descargado se considera no confiable aunque provenga del Drive del
usuario:

- Validar `format`, `formatVersion`, `workspace.version` y cada elemento.
- Establecer un tamaño máximo antes de parsear.
- Rechazar números no finitos, layouts inválidos y tipos desconocidos.
- Normalizar URLs y no ejecutar contenido del archivo como HTML.
- Implementar migraciones explícitas para versiones futuras.
- No sincronizar historial reciente, búsquedas locales, caché de iconos, tokens,
  errores de diagnóstico ni datos de autenticación.
- No registrar en consola el JSON completo, tokens o URLs privadas.
- Conservar una última copia local válida si la remota está dañada.

La política de privacidad actual afirma que la configuración no sale del
dispositivo. Debe actualizarse antes de publicar esta función para explicar que,
con consentimiento, la configuración se transmite a Google Drive y puede
contener nombres y URLs de accesos directos. También debe explicar cómo
desconectar y eliminar la copia remota.

## Registrar Clean New Tab en Google Cloud

Los nombres de los menús pueden variar ligeramente según el idioma o los cambios
de la consola. Actualmente la configuración de OAuth se agrupa bajo **Google
Auth Platform**, con las secciones Branding, Audience, Data Access y Clients.

### Datos que conviene preparar

Antes de entrar a la consola, tener disponibles:

- Nombre público: `Clean New Tab`.
- Correo de soporte al usuario.
- Correo de contacto del desarrollador.
- Página pública de la extensión.
- URL pública de la política de privacidad actualizada.
- URL de términos de servicio, si se utilizará.
- Icono cuadrado de la aplicación, sin marcas de Google.
- ID definitivo de la publicación en Chrome Web Store.
- ID definitivo del complemento de Firefox:
  `clean-new-tab@rodolfopulido` según el manifiesto actual.

El nombre, la página y la política mostrados en OAuth deben coincidir con el
producto publicado. Para producción, la página principal debe ser pública,
explicar para qué se usa Drive y enlazar la política de privacidad.

### 1. Crear o seleccionar el proyecto

1. Abrir la [Biblioteca de APIs de Google
   Cloud](https://console.cloud.google.com/apis/library?hl=es-419).
2. En el selector superior, elegir un proyecto existente o pulsar **Proyecto
   nuevo**.
3. Usar un nombre reconocible, por ejemplo `Clean New Tab`.
4. Elegir la organización y ubicación sólo si la cuenta pertenece a Google
   Workspace; una cuenta personal puede dejarlo sin organización.
5. Confirmar que el proyecto recién creado aparezca seleccionado antes de
   continuar. Todas las pantallas siguientes deben mostrar el mismo ID de
   proyecto.

Google describe este requisito en [Create a Google Cloud
project](https://developers.google.com/workspace/guides/create-project). No se
debe habilitar facturación por anticipado si la consola no la solicita para el
uso previsto; sí conviene configurar alertas si más adelante se vincula una
cuenta de facturación.

### 2. Habilitar Google Drive API

1. En la Biblioteca, buscar **Google Drive API**.
2. Abrir el resultado que pertenece a Google Workspace.
3. Pulsar **Habilitar**.
4. Esperar a que la consola abra la página de detalles de la API.
5. En **APIs y servicios > APIs y servicios habilitados**, comprobar que
   `Google Drive API` figure en la lista.

No hace falta habilitar Google Picker API porque no se mostrarán archivos ni se
usará “Mi unidad”. Tampoco se necesita People API si no se mostrará el nombre o
correo de la cuenta.

### 3. Registrar la aplicación en Google Auth Platform

1. Abrir **Google Auth Platform > Descripción general** dentro del proyecto.
2. Si aparece **Comenzar** o **Get started**, pulsarlo.
3. En **Información de la aplicación**, escribir `Clean New Tab` y elegir el
   correo de soporte.
4. En **Público/Audience**, elegir:
   - **Externo** si cualquier persona con cuenta de Google podrá usar la
     extensión.
   - **Interno** únicamente si la extensión será exclusiva de una organización
     de Google Workspace.
5. Agregar el correo de contacto del desarrollador y terminar el registro
   inicial.

Para una extensión pública debe elegirse **Externo**. En modo Testing sólo
podrán autorizar usuarios de prueba y las autorizaciones que incluyen scopes de
Drive pueden expirar después de siete días. Google documenta estos límites en
[Manage App Audience](https://support.google.com/cloud/answer/15549945).

### 4. Configurar Branding

En **Google Auth Platform > Branding**:

1. Confirmar el nombre y correo de soporte.
2. Subir el logotipo si ya está listo. Si no, se puede omitir durante desarrollo
   y agregar antes de verificación.
3. Para producción, agregar la página principal, política de privacidad y, si
   corresponde, términos de servicio.
4. Añadir y verificar los dominios usados por esas URLs. La propiedad se suele
   demostrar mediante Google Search Console.
5. Guardar los cambios.

No usar “Google”, “Drive” ni sus logotipos como parte de la identidad de Clean
New Tab. La descripción puede decir que la extensión sincroniza con Google
Drive, pero no debe parecer un producto oficial de Google.

### 5. Declarar sólo `drive.appdata`

En **Google Auth Platform > Data Access / Acceso a datos**:

1. Pulsar **Add or remove scopes / Agregar o quitar permisos**.
2. Buscar Google Drive API.
3. Seleccionar exclusivamente:

   ```text
   https://www.googleapis.com/auth/drive.appdata
   ```

4. Confirmar y guardar.
5. Revisar que no hayan quedado agregados `drive`, `drive.file`,
   `drive.readonly`, correo, perfil u otros alcances.

La consola sólo muestra scopes de APIs previamente habilitadas. Google clasifica
`drive.appdata` como no sensible en la documentación actual de
[`appDataFolder`](https://developers.google.com/workspace/drive/api/guides/appdata),
pero la consola es la fuente definitiva y mostrará su categoría vigente. Si la
clasificación o los requisitos cambian, debe seguirse lo que indique Data
Access. La administración de scopes se explica en [Manage App Data
Access](https://support.google.com/cloud/answer/15549135).

### 6. Agregar usuarios de prueba

Mientras el público esté en **Testing**:

1. Abrir **Google Auth Platform > Audience / Público**.
2. En **Test users / Usuarios de prueba**, pulsar **Add users**.
3. Agregar cada cuenta de Google que se usará en desarrollo.
4. Incluir las cuentas necesarias para probar tres dispositivos y, si es
   posible, una cuenta Google Workspace administrada.

No utilizar las cuentas reales de usuarios finales como solución permanente.
Antes de publicar, cambiar a producción y completar cualquier revisión que la
consola solicite.

### 7. Crear el cliente OAuth de Chromium

Para el paquete de Chrome/Chromium:

1. Publicar primero un borrador de la extensión en Chrome Web Store para obtener
   un ID estable. El cliente no debe basarse en el ID aleatorio de una carga
   descomprimida.
2. Abrir **Google Auth Platform > Clients / Clientes**.
3. Pulsar **Create client / Crear cliente**.
4. Elegir **Chrome Extension / Extensión de Chrome**.
5. Escribir el ID definitivo de Chrome Web Store, sin el prefijo
   `chrome-extension://`.
6. Usar un nombre descriptivo, por ejemplo `Clean New Tab - Chrome`.
7. Crear el cliente y copiar su `client_id`.
8. Cuando la publicación y el propietario estén disponibles, usar **Verify app
   ownership / Verificar propiedad de la aplicación**.

El manifiesto de Chromium necesitará, como mínimo, el permiso `identity` y la
configuración OAuth correspondiente:

```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "CLIENT_ID_DE_CHROME.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/drive.appdata"]
  }
}
```

El `client_id` es público y puede formar parte del manifiesto; un
`client_secret` no debe incluirse. Google detalla la propiedad requerida del
elemento de Chrome Web Store en [OAuth 2.0 for iOS & Desktop
Apps](https://developers.google.com/identity/protocols/oauth2/native-app#protect-your-apps).

### 8. Resolver el cliente OAuth de Firefox antes de registrarlo

Firefox no puede reutilizar automáticamente el cliente de tipo **Chrome
Extension**. Además, su URL generada por `browser.identity.getRedirectURL()` y
las restricciones de redirect URI de Google deben encajar con el flujo OAuth
elegido.

Antes de crear credenciales de Firefox:

1. Obtener la redirect URI real de la extensión firmada usando
   `browser.identity.getRedirectURL()`.
2. Construir una prueba mínima de Authorization Code con PKCE.
3. Confirmar en la consola qué tipo de cliente permite registrar exactamente
   esa URI.
4. Si Google no acepta la URI generada, decidir explícitamente entre:
   - un endpoint HTTPS propio que complete/redirija el flujo sin almacenar los
     tableros; o
   - limitar inicialmente la integración a Chromium.
5. Sólo después crear el cliente compatible, por ejemplo
   `Clean New Tab - Firefox`, y mantener su ID separado.

No se debe seleccionar arbitrariamente **Aplicación web** o **Aplicación de
escritorio** y asumir que funcionará. Las aplicaciones web exigen orígenes y
redirect URIs autorizados; los clientes públicos no pueden guardar secretos. La
API de identidad de Firefox y sus restricciones están documentadas en
[`identity`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity).

Esta validación es un bloqueo técnico real para prometer sincronización
Chrome–Firefox sin backend. Debe resolverse con un prototipo antes de diseñar el
resto del motor de sincronización.

### 9. Guardar la configuración del proyecto

Registrar en variables de construcción o archivos de configuración no secretos:

```text
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_OAUTH_CLIENT_ID_CHROME
GOOGLE_OAUTH_CLIENT_ID_FIREFOX (cuando el flujo esté validado)
GOOGLE_DRIVE_SCOPE=https://www.googleapis.com/auth/drive.appdata
```

No guardar en Git tokens de acceso, refresh tokens, archivos JSON de cuentas de
servicio ni secretos OAuth. Una cuenta de servicio tampoco sustituye el permiso
del usuario: los tableros deben almacenarse en el Drive de la persona que
autoriza la extensión.

### 10. Pasar de pruebas a producción

1. Completar primero la implementación y probar el consentimiento de extremo a
   extremo con los usuarios de prueba.
2. Actualizar la página pública y `PRIVACY.md` antes de solicitar revisión.
3. En **Audience**, pulsar **Publish app / Publicar aplicación** cuando esté
   lista para usuarios externos.
4. En **Verification Center / Centro de verificación**, atender los requisitos
   que muestre el proyecto.
5. Si Google solicita verificación, preparar:
   - explicación del uso de `drive.appdata`;
   - video del flujo completo de conexión y sincronización;
   - URLs públicas y verificadas;
   - IDs de todos los clientes OAuth;
   - evidencia de propiedad de Chrome Web Store.
6. No solicitar scopes adicionales “por si acaso”; cualquier permiso agregado
   puede cambiar los requisitos y provocar una nueva revisión.

Las aplicaciones que sólo usan scopes no sensibles pueden no requerir la
verificación completa de scopes, aunque mostrar nombre y logotipo verificados
puede requerir verificación de marca. La consola determinará el proceso exacto;
véase [OAuth App Verification](https://support.google.com/cloud/answer/13463073).

### Lista de comprobación de Google Cloud

- [ ] Proyecto correcto seleccionado.
- [ ] Google Drive API habilitada.
- [ ] Aplicación registrada en Google Auth Platform.
- [ ] Audience configurado como External para publicación pública.
- [ ] Desarrolladores añadidos como usuarios de prueba.
- [ ] Página, privacidad y dominios configurados en Branding.
- [ ] Único scope de datos: `drive.appdata`.
- [ ] Cliente Chrome Extension creado con el ID definitivo de la tienda.
- [ ] Propiedad del elemento de Chrome verificada.
- [ ] Flujo y cliente de Firefox validados por separado.
- [ ] Ningún client secret o token incluido en la extensión.
- [ ] Consentimiento, desconexión y revocación probados.
- [ ] Aplicación publicada/verificada antes de liberar la función.

## Plan de implementación

### Fase 1: preparar almacenamiento y formato

1. Extraer validación, normalización y migraciones del workspace.
2. Crear `WorkspaceEnvelope` y pruebas con datos válidos, corruptos y versiones
   desconocidas.
3. Implementar `LocalWorkspaceProvider` sobre `browser.storage.local`.
4. Migrar una sola vez desde `clean-new-tab:workspace:v1` en `localStorage` sin
   borrar la copia anterior hasta confirmar el nuevo guardado.
5. Separar `activeSpaceId` como estado local por dispositivo.

### Fase 2: autenticación y operaciones básicas de Drive

1. Configurar el proyecto de Google Cloud, Drive API, consentimiento y clientes.
2. Implementar OAuth con PKCE para Chromium y Firefox.
3. Solicitar únicamente `drive.appdata` al pulsar el botón.
4. Implementar búsqueda, creación, descarga y actualización del archivo.
5. Añadir conexión, desconexión, sincronización manual y estados de error.

### Fase 3: motor offline-first

1. Guardado local inmediato y cola pendiente.
2. `debounce`, exclusión mutua entre pestañas y reintentos incrementales.
3. Sincronización al iniciar, al volver la red y por acción manual.
4. Comparación de tres vías con `lastSyncedSnapshot`.
5. Resolución visual de conflictos y copias de recuperación.

### Fase 4: publicación segura

1. Pruebas reales entre al menos tres instalaciones: dos Chromium y una Firefox.
2. Pruebas de edición desconectada, expiración de token, archivo corrupto,
   duplicados y dos escrituras concurrentes.
3. Actualizar manifiestos, `PRIVACY.md` y declaraciones de las tiendas.
4. Verificar instalación/actualización sobre usuarios con datos existentes.
5. Desplegar gradualmente y observar errores sin registrar contenido privado.

## Criterios de aceptación

- La extensión funciona sin conectar Drive.
- La conexión ocurre sólo después de pulsar el botón y solicita únicamente el
  acceso necesario a `appDataFolder`.
- Al conectar un segundo o tercer dispositivo con la misma cuenta aparece el
  mismo conjunto de espacios.
- Un cambio normal realizado en un dispositivo llega a los demás sin recargar ni
  reinstalar la extensión.
- Trabajar sin conexión nunca pierde el cambio local.
- Dos cambios sobre espacios diferentes se combinan.
- Dos cambios incompatibles sobre el mismo espacio muestran una decisión y
  conservan ambas versiones hasta resolverla.
- Conectar otra cuenta de Google no expone el workspace de la cuenta anterior.
- Desconectar detiene la sincronización sin borrar los tableros locales.
- Ningún token, historial o caché forma parte del archivo remoto.
- Chrome y Firefox pueden sincronizar entre sí usando la misma cuenta de Drive.

## Decisiones que conviene mantener

1. Drive es opcional y la copia local permite trabajar siempre.
2. Sólo se usa `appDataFolder`; no hay funciones para compartir.
3. Sólo se solicita `drive.appdata`, salvo que el producto decida mostrar datos
   de perfil en el futuro.
4. El espacio activo permanece local a cada dispositivo.
5. La primera versión combina únicamente cambios claramente independientes; en
   conflictos reales conserva ambas variantes y pregunta.
6. Las imágenes subidas por el usuario quedan fuera hasta diseñar su propio
   almacenamiento y sincronización.
