# Clean New Tab

Extensión de navegador construida con React, Vite, Mantine y Tailwind. Reemplaza la página de nueva pestaña con una pantalla limpia.

El sitio público está construido con Astro en [`website/`](./website) y se
publica automáticamente en Cloudflare Pages mediante
`.github/workflows/deploy-website.yml`.

[Política de privacidad](./PRIVACY.md)

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Construir la extensión

Ejecuta `npm run build`. Se generan dos paquetes:

- `dist/chrome`: Chrome, Edge y otros navegadores Chromium.
- `dist/firefox`: Firefox.

Para preparar los archivos de entrega a Mozilla, ejecuta:

```bash
npm run package:mozilla
```

Esto genera en `artifacts/`:

- `clean-new-tab-chrome-<versión>.zip`: extensión compilada para Chromium.
- `clean-new-tab-firefox-<versión>.zip`: extensión compilada para subir a AMO.
- `clean-new-tab-source-<versión>.zip`: código fuente legible para la revisión.

Los nombres usan automáticamente la versión definida en `package.json`.

El código fuente se reconstruye con Node.js 20 o posterior mediante `npm ci` y
`npm run build`. No requiere variables de entorno ni pasos de generación
adicionales.

## Versionado y publicaciones

El repositorio usa Release Please. Los cambios se integran a `main` mediante
commits convencionales:

```text
fix: corrige un error
feat: agrega una funcionalidad
feat!: introduce un cambio incompatible
```

Release Please mantiene un PR de publicación y calcula la siguiente versión
según los cambios acumulados. Al fusionar ese PR, GitHub crea la etiqueta y la
publicación, construye los paquetes y adjunta los tres ZIP automáticamente.

- `fix` incrementa la versión patch: `0.1.0` → `0.1.1`.
- `feat` incrementa la versión minor: `0.1.0` → `0.2.0`.
- `feat!` incrementa la versión major: `0.1.0` → `1.0.0`.

### Chrome / Chromium

1. Abre `chrome://extensions` (o `edge://extensions`).
2. Activa el modo desarrollador.
3. Elige `Cargar descomprimida`.
4. Selecciona la carpeta `dist/chrome`.

### Firefox

1. Abre `about:debugging#/runtime/this-firefox`.
2. Elige `Cargar complemento temporal`.
3. Selecciona `dist/firefox/manifest.json`.

La instalación temporal de Firefox desaparece al reiniciar. Para distribuirla de
forma permanente, el paquete debe estar firmado por Mozilla.
