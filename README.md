# Booklet Visual Modeling UPY

Una sola historia de Mérida contada con las fuentes de los 9 equipos. Pregunta guía: **¿para quién está creciendo Mérida?** Se construye con D3 v7 y JavaScript sin frameworks, con el estilo base del Equipo 2. La versión web y el PDF salen del mismo código y de los mismos datos.

Los lineamientos completos (historia común, plantilla de capítulo, estilo, reglas de datos y comentarios por equipo) están en la guía de storytelling del Data Visualization Team.

## Estructura

```text
index.html                 Portada e índice (se arma con js/capitulos.js)
booklet.html               Todos los capítulos en una página; de aquí sale el PDF
capitulos/00-plantilla.html  Capítulo de ejemplo con las 8 partes de la plantilla
css/estilo.css             Colores, tipografía, plantilla de capítulo y reglas de impresión
js/estilo.js               D3, colores, formatos en español de México y piezas comunes
js/booklet.js              Dibuja las gráficas declaradas en el HTML y arma el booklet
js/capitulos.js            Orden de los capítulos
js/graficas/               Una función por tipo de gráfica: barras.js, linea.js
data/equipo-NN/            Tablas que usa cada capítulo (CSV, JSON, GeoJSON)
scripts/imprimir.js        Genera booklet.pdf con Playwright
```

## Ver el booklet

Los módulos de JavaScript no cargan si abres el HTML con doble clic. Usa un servidor local desde la raíz del repositorio:

```bash
python3 -m http.server 8000
```

Abre http://localhost:8000/.

## Hacer un capítulo

1. Copia `capitulos/00-plantilla.html` como `capitulos/NN-equipo-XX.html` (NN = orden en el booklet).
2. Cambia el contenido y conserva las clases. Todo lo que está dentro de `<article class="capitulo">` entra al booklet.
3. Pon tus datos en `data/equipo-XX/`. Cada gráfica declara su configuración en JSON dentro del HTML:

   ```html
   <div class="grafica" data-grafica="barras">
     <script type="application/json">
       { "csv": "data/equipo-XX/archivo.csv", "etiqueta": "colonia", "valor": "accidentes",
         "formato": "num", "titulo": "…", "subtitulo": "…", "fuente": "Fuente: … · Corte: …" }
     </script>
   </div>
   ```

   Las rutas de datos van **desde la raíz del repositorio**. Las opciones de cada tipo están al inicio de su archivo en `js/graficas/`.
4. Agrega tu capítulo a `js/capitulos.js`.

Si una gráfica falla, la escena muestra el motivo en lugar de quedar en blanco.

## Reglas que no se negocian

- **Cada cifra sale de un archivo de `data/`.** Nada de números escritos en el JavaScript ni `Math.random`.
- **Fuente y fecha de corte en cada gráfica** (`"fuente"` en la configuración).
- **Datos simulados fuera del booklet.** Si hay que mostrar un instrumento, `"simulado": true` agrega la marca SIMULADO y el relleno rayado.
- **Colores solo desde `css/estilo.css` y `js/estilo.js`.** Morado = foco, oro = comparación, gris = contexto, en todo el libro.
- **Nada depende del hover:** el dato clave va escrito en la gráfica, porque en papel no hay cursor.
- **Ningún dato personal:** nombres, teléfonos o direcciones se agregan por AGEB, colonia o día antes de entrar a `data/`.

## Agregar un tipo de gráfica

1. Crea `js/graficas/<tipo>.js` con `export async function <tipo>(contenedor, cfg)`.
2. Usa `cargar()`, `marco()`, `color`, `rol` y `fmt` de `js/estilo.js`; no definas colores ni fuentes propias.
3. Regístrala en `GRAFICAS` dentro de `js/booklet.js`.

Pendientes acordados: mapa por AGEB (`mapa-ageb.js`, espera la base de AGEB del Spatial Data Team) y calendario de días de salario (`calendario.js`).

## Generar el PDF

```bash
npm install
npx playwright install chromium
npm run pdf
```

Sale `booklet.pdf` en tamaño carta. El script termina con error si alguna gráfica no se pudo dibujar.

## Datos de ejemplo

`data/equipo-02/` trae dos tablas del repositorio del Equipo 2 ([valnix140405/visual_modeling](https://github.com/valnix140405/visual_modeling)) para que la plantilla funcione:

| Archivo | Origen | Fuente |
|---|---|---|
| `comparables_por_canal.csv` | `reports/looker_studio/looker_05_comparables_por_canal.csv` | PROFECO, Quién es Quién en los Precios, Mérida, mayo 2026 |
| `coneval_lineas_pobreza.csv` | `data/fuente_a/03_siegy_yucatan/coneval_lineas_pobreza_2018_2025.csv` | CONEVAL, líneas de pobreza por ingresos, ene 2018 a mar 2025 |
