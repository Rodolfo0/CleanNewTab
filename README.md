# Custom New Tab

Extensión de navegador construida con React, Vite, Mantine y Tailwind. Reemplaza la página de nueva pestaña con una pantalla limpia.

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

- `clean-new-tab-firefox-0.1.0.zip`: extensión compilada para subir a AMO.
- `clean-new-tab-source-0.1.0.zip`: código fuente legible para la revisión.

El código fuente se reconstruye con Node.js 20 o posterior mediante `npm ci` y
`npm run build`. No requiere variables de entorno ni pasos de generación
adicionales.

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
