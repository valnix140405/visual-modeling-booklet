// Líneas en el tiempo con etiqueta directa al final de cada serie (sin leyenda).
//
// Configuración (data-config del capítulo):
//   csv, filtro           → ver cargar() en estilo.js
//   x:       columna de fecha; texto "AAAA-MM", "AAAA-MM-DD" o año
//   series:  [{ columna, nombre, rol: "foco" | "comparacion" | "contexto" }]
//   formato: num | dec | pesos | pesosEnteros | pct | pctSigno
//   desdeCero: true para que el eje y empiece en 0
//   titulo, subtitulo, fuente, simulado

import { d3, cargar, rol, formateador, marco } from "../estilo.js";

const leerFecha = (v) => {
  // d3.autoType lee "2018-01" como medianoche UTC; se rearma en hora local
  // para que en México no caiga en el 31 de diciembre anterior.
  if (v instanceof Date) return new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
  const s = String(v);
  if (/^\d{4}$/.test(s)) return new Date(Number(s), 0, 1);
  const [a, mes = "01", dia = "01"] = s.split("-");
  return new Date(Number(a), Number(mes) - 1, Number(dia));
};

export async function linea(contenedor, cfg) {
  const filas = (await cargar(cfg))
    .map((d) => ({ ...d, _fecha: leerFecha(d[cfg.x]) }))
    .sort((a, b) => a._fecha - b._fecha);
  const f = formateador(cfg.formato);
  const series = cfg.series;

  const alto = 340;
  const m = { arriba: 16, derecha: 170, abajo: 30, izquierda: 64 };
  const { svg, ancho } = marco(contenedor, cfg, { alto });

  const valores = series.flatMap((s) => filas.map((d) => d[s.columna]));
  const yMin = cfg.desdeCero ? 0 : d3.min(valores);
  const x = d3.scaleTime(d3.extent(filas, (d) => d._fecha), [m.izquierda, ancho - m.derecha]);
  const y = d3.scaleLinear([yMin, d3.max(valores)], [alto - m.abajo, m.arriba]).nice();

  svg.append("g").attr("class", "rejilla")
    .selectAll("line").data(y.ticks(5)).join("line")
    .attr("x1", m.izquierda).attr("x2", ancho - m.derecha).attr("y1", y).attr("y2", y);

  svg.append("g").attr("class", "eje")
    .attr("transform", `translate(${m.izquierda},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(f).tickSize(0).tickPadding(8))
    .call((g) => g.select(".domain").remove());

  svg.append("g").attr("class", "eje")
    .attr("transform", `translate(0,${alto - m.abajo})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0));

  // Las series de contexto se dibujan primero para que el foco quede encima.
  const orden = { contexto: 0, comparacion: 1, foco: 2 };
  const ordenadas = series.slice().sort((a, b) => (orden[a.rol] ?? 0) - (orden[b.rol] ?? 0));

  for (const s of ordenadas) {
    const c = cfg.simulado ? rol.contexto : rol[s.rol] ?? rol.contexto;
    const datos = filas.filter((d) => d[s.columna] != null);
    svg.append("path").datum(datos)
      .attr("fill", "none").attr("stroke", c)
      .attr("stroke-width", s.rol === "foco" ? 3 : 2)
      .attr("stroke-dasharray", cfg.simulado ? "6 4" : null)
      .attr("d", d3.line().x((d) => x(d._fecha)).y((d) => y(d[s.columna])));

    const ult = datos.at(-1);
    svg.append("circle").attr("cx", x(ult._fecha)).attr("cy", y(ult[s.columna])).attr("r", 4).attr("fill", c);
    const etiqueta = svg.append("text").attr("class", "etiqueta-serie")
      .attr("x", x(ult._fecha) + 10).attr("y", y(ult[s.columna])).attr("dy", "0.35em").attr("fill", c);
    etiqueta.append("tspan").text(f(ult[s.columna]));
    etiqueta.append("tspan").attr("x", x(ult._fecha) + 10).attr("dy", "1.2em")
      .attr("font-weight", 400).attr("fill", "#555555").text(s.nombre);
  }
}
