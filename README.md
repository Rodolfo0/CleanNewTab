# Custom New Tab

Extensión de navegador construida con React, Vite, Mantine y Tailwind. Reemplaza la página de nueva pestaña con una pantalla limpia.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Cargar la extensión

1. Ejecuta `npm run build`.
2. Abre `chrome://extensions`.
3. Activa el modo desarrollador.
4. Elige `Load unpacked`.
5. Selecciona la carpeta `dist`.

El archivo `public/manifest.json` se copia a `dist/manifest.json` durante el build.
