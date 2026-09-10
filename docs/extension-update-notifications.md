# Avisos y actualización de la extensión

## Objetivo

Avisar al usuario cuando el navegador tenga una nueva versión de Clean New Tab lista para instalar y ofrecerle un botón para aplicarla.

La extensión no debe descargar ZIPs ni reemplazar sus propios archivos. Chrome y Firefox administran la descarga desde sus tiendas. Clean New Tab solo detectará la actualización pendiente y solicitará la recarga de la extensión.

## Decisión técnica

Usar estas APIs:

- `runtime.onUpdateAvailable` para detectar una actualización descargada por el navegador.
- `runtime.reload()` para instalarla cuando el usuario pulse "Actualizar ahora".
- `runtime.getManifest().version` para mostrar la versión instalada.
- `storage.local` para conservar el aviso si no hay una nueva pestaña abierta cuando llega el evento.

Chrome recomienda escuchar `onUpdateAvailable` en lugar de ejecutar comprobaciones periódicas con `requestUpdateCheck()`. Firefox documenta el mismo flujo para extensiones WebExtensions. [Chrome Runtime API](https://developer.chrome.com/docs/extensions/reference/api/runtime/), [Firefox `runtime.onUpdateAvailable`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onUpdateAvailable), [Firefox `runtime.reload`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/reload).

El aviso será una alerta dentro de la nueva pestaña. No se agregará una notificación del sistema operativo ni el permiso `notifications` en esta primera versión.

## Flujo esperado

1. El navegador detecta una nueva versión publicada en la tienda.
2. El background recibe `runtime.onUpdateAvailable` con la versión disponible.
3. El background guarda la actualización pendiente en `storage.local`.
4. Si hay una nueva pestaña abierta, el background envía un mensaje para actualizar el aviso inmediatamente.
5. La nueva pestaña muestra la versión instalada, la versión disponible y las acciones "Actualizar ahora" y "Más tarde".
6. "Más tarde" oculta el aviso durante la sesión, pero no borra la actualización pendiente.
7. "Actualizar ahora" espera a que no haya cambios locales pendientes y solicita `runtime.reload()`.
8. Al recargar, `runtime.onInstalled` recibe `reason: "update"` y elimina el estado pendiente.

Si el background recibe el evento cuando no hay una nueva pestaña abierta, el estado guardado se carga la próxima vez que el usuario abra una.

## Estado persistido

Agregar una clave como:

```ts
const extensionUpdateKey = "clean-new-tab:extension-update:v1";
```

El valor debe tener una forma pequeña y validable:

```ts
type PendingExtensionUpdate = {
  version: string;
  detectedAt: number;
};
```

El background debe ignorar eventos sin una versión válida. La versión instalada se obtiene directamente del manifest, por lo que no se debe duplicar en el frontend.

## Cambios previstos

### `src/background/index.ts`

- Cambiar el listener actual de `runtime.onInstalled` para recibir `details` sin alterar la configuración de los menús.
- Registrar `runtime.onUpdateAvailable`.
- Agregar funciones para leer, guardar y eliminar `PendingExtensionUpdate`.
- Extender el router existente de `runtime.onMessage` con estos mensajes:

```ts
{ type: "extension-update-status" }
{ type: "extension-update-apply" }
{ type: "extension-update-available", version: string }
```

- `extension-update-status` devolverá la versión actual y la actualización pendiente.
- `extension-update-apply` ejecutará `runtime.reload()`.
- `extension-update-available` se enviará desde el background a las páginas abiertas. El estado persistido seguirá siendo la fuente de recuperación si el mensaje no llega.
- En `onInstalled`, cuando la razón sea `update`, se limpiará la actualización pendiente.

El listener de `extension-update-available` debe registrarse siempre. Al escuchar ese evento, el navegador puede conservar la actualización pendiente hasta que la extensión se recargue.

### `src/newtab/hooks/useExtensionUpdate.ts`

Crear un hook que:

- Consulte `extension-update-status` al montar `NewTab`.
- Escuche mensajes `extension-update-available` mientras la página esté abierta.
- Mantenga los estados `checking`, `available`, `applying` y `error`.
- Exponga la acción para aplicar la actualización.
- Permita ocultar el aviso en la sesión actual sin eliminar el estado persistido.

La comunicación debe seguir el patrón compatible con Chrome y Firefox que ya usa `src/newtab/storage/driveSync.ts`.

Si se extrae una función genérica para enviar mensajes del runtime, Drive y actualizaciones deben reutilizarla en lugar de mantener dos implementaciones iguales.

### `src/newtab/components/ExtensionUpdateNotice.tsx`

Crear un componente visual con:

- `Alert` de Mantine o un panel equivalente.
- Texto claro, por ejemplo: "Hay una actualización disponible: 0.8.1".
- Botón principal "Actualizar ahora".
- Acción secundaria "Más tarde".
- Estado de carga mientras se solicita la recarga.
- Mensaje de error y opción de reintentar si el background no responde.
- `aria-live="polite"`, foco visible y soporte de teclado.

El componente debe funcionar con los temas claro, oscuro y personalizados. Debe ser fijo y quedar por encima del tablero sin bloquear toda la pantalla.

### `src/newtab/NewTab.tsx`

- Consumir `useExtensionUpdate()`.
- Renderizar `ExtensionUpdateNotice` cerca del inicio del layout principal.
- Pasar al aviso si hay una edición activa, cambios locales pendientes o una sincronización de Drive en curso.
- Impedir la recarga si el tablero tiene cambios sin guardar.

La aplicación ya guarda el workspace con un retraso de 400 ms. El botón debe quedar deshabilitado mientras `localSaveState` sea `pending` o `error`.

Mientras `isEditing` sea `true`, la interfaz debe indicar que el usuario tiene que guardar o cancelar sus cambios antes de actualizar. Esto evita perder el contenido de un tablero durante `runtime.reload()`.

## Versionado y publicación

No hace falta cambiar el sistema de versiones actual:

- `package.json` mantiene la versión principal.
- Release Please actualiza `manifests/chrome.json` y `manifests/firefox.json`.
- `scripts/build-extension.mjs` copia los manifests al directorio de salida.
- Los workflows existentes publican los paquetes en Chrome Web Store y Mozilla Add-ons.

La funcionalidad debe publicarse con un commit convencional como:

```text
feat(update): notify users about available extension updates
```

El flujo nativo aplica a instalaciones hechas desde las tiendas. Las extensiones cargadas como "unpacked" y las instalaciones temporales de Firefox seguirán requiriendo una recarga manual durante el desarrollo.

## Pruebas

### Verificaciones automatizadas

Ejecutar:

```bash
npm run lint
npm run typecheck
npm run build
```

También conviene probar que el background:

- Guarda una versión recibida por `onUpdateAvailable`.
- Devuelve correctamente el estado pendiente.
- Limpia el estado cuando `onInstalled` informa una actualización.
- Ejecuta `runtime.reload()` solo después de recibir la acción explícita del usuario.

### Pruebas manuales

- Sin una actualización disponible, no aparece el aviso.
- Con una actualización pendiente, el aviso aparece al abrir una nueva pestaña.
- El aviso se actualiza sin recargar la página si llega el evento con la nueva pestaña abierta.
- "Más tarde" oculta el aviso y este vuelve a aparecer al abrir otra nueva pestaña.
- "Actualizar ahora" recarga la extensión y muestra la nueva versión.
- Los tableros, fondos, íconos, preferencias y conexión de Drive permanecen intactos.
- El botón se bloquea mientras haya una edición o un guardado pendiente.
- El comportamiento funciona en Chrome y Firefox.

## Límite conocido

El navegador decide cuándo consulta la tienda. La extensión no puede garantizar que el aviso aparezca en el mismo instante en que se publica una versión. No se debe agregar un temporizador que llame continuamente a `requestUpdateCheck()`, porque Chrome limita esa API y desaconseja su uso periódico.
