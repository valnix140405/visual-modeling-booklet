// Booklet Visual Modeling UPY · estilo común para las gráficas de D3.
// Todas las gráficas importan de aquí: D3 (una sola versión), colores,
// formatos de número y las piezas que se repiten (marco, carga de datos,
// aviso de datos simulados). Ningún capítulo define colores por su cuenta.

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

export { d3 };

// Raíz del repositorio: las rutas de datos se escriben relativas a ella
// ("data/equipo-02/archivo.csv") y funcionan igual desde un capítulo suelto
// que desde el booklet completo.
export const RAIZ = new URL("../", import.meta.url);

// Mismos valores que css/estilo.css. El significado de cada color es fijo
// en todo el libro (ver la guía de storytelling).
export const color = {
  morado: "#600d8b",     // foco: lo que el capítulo analiza
  moradoClaro: "#8b1da8",
  oro: "#ed9f22",        // comparación
  oroOscuro: "#b45309",  // anotaciones en color cálido
  gris: "#555555",       // contexto
  grisClaro: "#9ca3af",
  tinta: "#0d0d0d",
  borde: "#e5e7eb",
  blanco: "#ffffff",
};

// Color por rol, para que los capítulos digan qué es la serie y no qué color usa.
export const rol = { foco: color.morado, comparacion: color.oro, contexto: color.grisClaro };

// Escalas para mapas: secuencial (blanco a morado) y divergente (oro a morado).
export const escala = {
  secuencial: (dominio) => d3.scaleSequential(dominio, d3.interpolateRgb("#f5eefa", color.morado)),
  divergente: (dominio) =>
    d3.scaleDiverging(dominio, (t) => (t < 0.5
      ? d3.interpolateRgb(color.oro, "#f7f7f7")(t * 2)
      : d3.interpolateRgb("#f7f7f7", color.morado)((t - 0.5) * 2))),
};

// Formatos en español de México: punto decimal, coma de miles, signo de pesos.
const mx = d3.formatLocale({ decimal: ".", thousands: ",", grouping: [3], currency: ["$", ""] });

export const fmt = {
  num: mx.format(",.0f"),                       // 8,815
  dec: mx.format(",.1f"),                       // 27.9
  pesos: mx.format("$,.2f"),                    // $2,379.47
  pesosEnteros: mx.format("$,.0f"),             // $2,379
  pct: (v) => `${mx.format(".1f")(v)} %`,       // 19.0 %
  pctSigno: (v) => `${mx.format("+.1f")(v)} %`, // +174.3 %
};

export const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fechaCorta = (f) => `${meses[f.getMonth()]} ${f.getFullYear()}`;

// Elige el formateador por nombre en la configuración de la gráfica.
export function formateador(nombre = "num") {
  const f = fmt[nombre];
  if (!f) throw new Error(`Formato desconocido: "${nombre}". Usa: ${Object.keys(fmt).join(", ")}.`);
  return f;
}

// Lee un CSV (o JSON) y aplica filtro, orden y tope declarados en la configuración.
//   csv:    ruta desde la raíz del repositorio
//   filtro: { columna: valor } o { columna: [valor1, valor2] }
//   orden:  { columna, dir: "desc" | "asc" }
//   top:    número máximo de filas
export async function cargar({ csv, json, filtro, orden, top }) {
  const ruta = new URL(csv || json, RAIZ);
  let filas = csv ? await d3.csv(ruta, d3.autoType) : await d3.json(ruta);
  if (filtro) {
    for (const [col, val] of Object.entries(filtro)) {
      const valores = Array.isArray(val) ? val : [val];
      filas = filas.filter((d) => valores.includes(d[col]));
    }
  }
  if (!filas.length) throw new Error(`Sin filas en ${csv || json} con el filtro indicado.`);
  if (orden) {
    const comp = orden.dir === "asc" ? d3.ascending : d3.descending;
    filas = filas.slice().sort((a, b) => comp(a[orden.columna], b[orden.columna]));
  }
  return top ? filas.slice(0, top) : filas;
}

// Arma el marco de cada gráfica: título-hallazgo, subtítulo, SVG y pie de fuente.
// Título, subtítulo y fuente van en HTML para que el texto se ajuste solo.
export function marco(contenedor, { titulo, subtitulo, fuente, simulado = false }, { ancho = 680, alto = 400 } = {}) {
  const raiz = d3.select(contenedor).html("");
  const h = raiz.append("p").attr("class", "grafica-titulo");
  if (simulado) h.append("span").attr("class", "simulado").text("SIMULADO");
  if (simulado) h.append("span").text(" ");
  h.append("span").text(titulo || "Falta el título-hallazgo");
  if (subtitulo) raiz.append("p").attr("class", "grafica-subtitulo").text(subtitulo);
  const svg = raiz.append("svg")
    .attr("viewBox", [0, 0, ancho, alto])
    .attr("role", "img")
    .attr("aria-label", `${simulado ? "Datos simulados. " : ""}${titulo || ""}`);
  raiz.append("p").attr("class", "grafica-fuente").text(fuente || "Fuente: falta indicar la fuente y la fecha de corte");
  if (simulado) svg.call(defsRayas);
  return { svg, ancho, alto };
}

// Relleno rayado para datos simulados: fill="url(#rayas-simulado)".
export function defsRayas(svg) {
  const p = svg.append("defs").append("pattern")
    .attr("id", "rayas-simulado").attr("width", 6).attr("height", 6)
    .attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
  p.append("rect").attr("width", 6).attr("height", 6).attr("fill", color.blanco);
  p.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6)
    .attr("stroke", color.grisClaro).attr("stroke-width", 3);
}

// Muestra un error dentro de la escena en lugar de dejarla en blanco.
export function mostrarError(contenedor, error) {
  d3.select(contenedor).html("")
    .append("p").attr("class", "grafica-error")
    .text(`No se pudo dibujar esta gráfica: ${error.message}`);
  console.error(error);
}
