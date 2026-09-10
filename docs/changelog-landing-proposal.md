# Changelog publicado en la landing de Astro

## Objetivo

Mostrar las novedades de Clean New Tab en el sitio público sin mantener dos archivos de cambios separados.

La fuente de datos debe seguir siendo el `CHANGELOG.md` raíz, porque Release Please ya lo actualiza cuando crea una release. Astro debe leer ese archivo durante el build y generar una página estática.

El resultado tendría dos partes:

- Una página completa en `/changelog/`.
- Un resumen de la release más reciente dentro de la landing principal.

## Estado actual

El repositorio ya tiene estas piezas:

- `CHANGELOG.md` en la raíz, generado por Release Please.
- Una landing estática en `website/` construida con Astro.
- Publicación automática en Cloudflare Pages mediante `.github/workflows/deploy-website.yml`.
- Una configuración Astro con `output: "static"` y `trailingSlash: "always"`.

El workflow de la landing actualmente solo se activa cuando cambia `website/**`. Si Release Please modifica únicamente `CHANGELOG.md`, la landing no se vuelve a construir. Ese será el ajuste principal del flujo de publicación.

## Decisión de arquitectura

El changelog se procesará durante el build, no en el navegador.

Esto evita:

- Consultar GitHub desde cada visita.
- Depender de la API de GitHub o de sus límites de uso.
- Mostrar contenido distinto al que se usó para generar una release.
- Mantener una copia manual del changelog dentro de `website/`.

El sitio seguirá siendo completamente estático. El HTML final incluirá el contenido ya renderizado.

## Estructura propuesta

### Sincronización durante el build

Crear:

```text
scripts/sync-website-changelog.mjs
```

Este script leerá el archivo raíz con Node durante el build:

```js
const sourcePath = path.join(repositoryRoot, "CHANGELOG.md");
```

El script generará dos archivos dentro de `website/`:

```text
website/src/pages/changelog.md
website/src/generated/changelog-releases.ts
```

`changelog.md` conservará el contenido de `CHANGELOG.md`, agregará frontmatter de Astro y usará el procesador Markdown nativo de Astro.

`changelog-releases.ts` contendrá los datos mínimos que necesita la landing para mostrar la última release:

```ts
export const changelogReleases = [
  {
    version: "0.9.0",
    compareUrl: "https://github.com/Rodolfo0/CleanNewTab/compare/...",
    date: "2026-09-05",
    entries: ["note: add rich note element with Tiptap"],
  },
] as const;
```

El script debe reconocer el formato que genera Release Please, por ejemplo:

```md
## [0.9.0](https://github.com/Rodolfo0/CleanNewTab/compare/...) (2026-09-05)

### Features

* **note:** add rich note element with Tiptap ([commit](...))
```

El parser del script solo extrae los encabezados de release y algunas entradas para el resumen. El historial completo lo procesa Astro como una página Markdown normal.

### Página completa

El script genera:

```text
website/src/pages/changelog.md
```

La página generada debe declarar `ChangelogLayout.astro` como layout. El layout vive en:

```text
website/src/layouts/ChangelogLayout.astro
```

Este layout usa `BaseLayout.astro` y muestra:

- Título "Novedades".
- Descripción breve del historial.
- La release más reciente al principio.
- Enlaces a los commits y comparaciones de GitHub.
- Todas las releases disponibles en `CHANGELOG.md`.

La URL final será:

```text
https://cleannewtab.com/changelog/
```

### Resumen en la landing

Modificar:

```text
website/src/pages/index.astro
```

Agregar una sección después de las funciones principales o antes del CTA final:

```text
Novedades recientes

0.9.0 · 5 de septiembre de 2026

- Elemento de notas enriquecidas.
- Búsqueda y controles de alineación.
- Contadores configurables.

Ver todo el changelog
```

La landing debe mostrar solo la release más reciente. El historial completo queda en `/changelog/`, así la página principal no se vuelve demasiado larga.

### Navegación

Modificar:

```text
website/src/layouts/BaseLayout.astro
```

Agregar un enlace a `Novedades` en la navegación principal y en el footer:

```astro
<a href={`${import.meta.env.BASE_URL}changelog/`}>Novedades</a>
```

La ruta debe usar `BASE_URL`, igual que los enlaces actuales, para que funcione en desarrollo y en cualquier despliegue con una base distinta.

### Estilos

Modificar:

```text
website/src/styles/global.css
```

Agregar estilos para:

- El contenedor de la página del changelog.
- Cabeceras de versión.
- Fecha y enlace de comparación.
- Listas de cambios.
- Separadores entre releases.
- Vista móvil.

Se debe conservar el estilo actual de la landing. El changelog puede tener una lectura más compacta, porque tendrá más texto que la página principal.

## Scripts del sitio

Actualizar `website/package.json` para sincronizar el changelog antes de iniciar Astro, revisar tipos o construir:

```json
{
  "scripts": {
    "sync:changelog": "node ../scripts/sync-website-changelog.mjs",
    "predev": "npm run sync:changelog",
    "prebuild": "npm run sync:changelog",
    "precheck": "npm run sync:changelog"
  }
}
```

No se necesita una dependencia nueva. El render Markdown lo hace Astro.

## Flujo de publicación

Modificar `.github/workflows/deploy-website.yml`:

```yaml
paths:
  - website/**
  - CHANGELOG.md
  - .github/workflows/deploy-website.yml
```

El flujo completo quedaría así:

1. Se fusiona el PR de release creado por Release Please.
2. Release Please actualiza la versión y `CHANGELOG.md`.
3. GitHub ejecuta `deploy-website.yml` porque cambió `CHANGELOG.md`.
4. Astro lee el changelog raíz.
5. Astro genera `/changelog/` y el resumen de la landing.
6. Cloudflare Pages publica la versión nueva.

No hace falta que `release.yml` despliegue directamente el sitio. El workflow de la landing ya tiene las credenciales y el comando de Cloudflare necesarios.

## Manejo de errores

El build debe fallar si `CHANGELOG.md` no existe o no se puede leer. No conviene publicar una landing sin historial aparentando que el proceso terminó bien.

El parser debe tolerar:

- Una release sin secciones.
- Una entrada sin enlace a commit.
- Cambios antiguos con un formato ligeramente distinto.
- Una sección desconocida, que debe conservarse con su título original.

Si el contenido no tiene ninguna release válida, `sync-website-changelog.mjs` debe detener el build con un mensaje claro.

## Pruebas

### Sitio

Ejecutar desde `website/`:

```bash
npm run check
npm run build
npm run preview
```

Verificar:

- `/changelog/` carga con el historial actual.
- La versión más reciente aparece en la landing.
- Los enlaces de GitHub apuntan a commits y comparaciones correctas.
- La navegación funciona desde `/`, `/privacy/` y `/changelog/`.
- La URL canónica y el título de la página son correctos.
- El layout funciona en móvil y escritorio.
- El build no hace peticiones de red para mostrar el changelog.

### Integración con releases

Para probar el flujo completo:

1. Crear un cambio con un commit convencional.
2. Dejar que Release Please actualice el changelog en su PR.
3. Fusionar la release en una rama de prueba o revisar el workflow con `workflow_dispatch`.
4. Confirmar que el cambio de `CHANGELOG.md` activa el deploy de la landing.

No se debe modificar manualmente `CHANGELOG.md` para una release normal. Release Please debe seguir siendo el encargado de generar las versiones, fechas y enlaces.

## Criterios de aceptación

- El historial completo está disponible en `https://cleannewtab.com/changelog/`.
- La landing muestra la última release publicada.
- Una nueva release actualiza ambas vistas sin editar archivos del sitio a mano.
- El sitio conserva su salida estática.
- El deploy se activa cuando cambia `CHANGELOG.md`.
- Las versiones y enlaces coinciden con el changelog generado por Release Please.
- El build de Astro falla si no puede leer el archivo fuente.

## Alternativa descartada

No se recomienda consultar la API de GitHub desde el navegador. Añadiría una dependencia externa en cada visita, complicaría el manejo de límites y podría dejar la landing sin novedades si GitHub no responde.

Tampoco conviene copiar manualmente cada release a `website/`. El archivo raíz ya contiene la información necesaria y Release Please lo mantiene actualizado.
