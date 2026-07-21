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
