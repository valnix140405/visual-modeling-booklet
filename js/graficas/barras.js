// Barras horizontales con foco, valores a la vista y línea de referencia opcional.
//
// Configuración (data-config del capítulo):
//   csv, filtro, orden, top    → ver cargar() en estilo.js
//   etiqueta: columna con el nombre de cada barra
//   detalle:  columna opcional que se agrega en gris junto al nombre
//   valor:    columna numérica
//   formato:  num | dec | pesos | pesosEnteros | pct | pctSigno
//   foco:     nombre(s) de etiqueta que van en morado; si falta, la primera barra
//   referencia: { tipo: "mediana" | "promedio" | número, texto } calculada sobre
//               todas las filas filtradas, antes de aplicar top
//   titulo, subtitulo, fuente, simulado

import { d3, cargar, color, formateador, marco } from "../estilo.js";

export async function barras(contenedor, cfg) {
  const todas = await cargar({ ...cfg, top: undefined });
  const filas = cfg.top ? todas.slice(0, cfg.top) : todas;
  const f = formateador(cfg.formato);
  const focos = [].concat(cfg.foco ?? filas[0][cfg.etiqueta]);

  const alto = 34 * filas.length + (cfg.referencia ? 60 : 40);
  const m = { arriba: cfg.referencia ? 28 : 8, derecha: 86, abajo: 28, izquierda: 230 };
  const { svg, ancho } = marco(contenedor, cfg, { alto });

  const nombre = (d) => (cfg.detalle ? `${d[cfg.etiqueta]} · ${d[cfg.detalle]}` : `${d[cfg.etiqueta]}`);
  const y = d3.scaleBand(d3.range(filas.length), [m.arriba, alto - m.abajo]).padding(0.28);
  const ref = valorReferencia(cfg.referencia, todas, cfg.valor);
  // La escala cubre las barras que se muestran, el cero y la referencia.
  const extremos = filas.map((d) => d[cfg.valor]).concat(0, ref ?? []);
  const [min, max] = d3.extent(extremos);
  const x = d3.scaleLinear([min, max], [m.izquierda, ancho - m.derecha]).nice();

  // Rejilla vertical suave
  svg.append("g").attr("class", "rejilla")
    .selectAll("line").data(x.ticks(5)).join("line")
    .attr("x1", x).attr("x2", x).attr("y1", m.arriba).attr("y2", alto - m.abajo);

  // Barras
  const relleno = (d) => (cfg.simulado ? "url(#rayas-simulado)"
    : focos.includes(d[cfg.etiqueta]) ? color.morado : color.grisClaro);
  svg.append("g").selectAll("rect").data(filas).join("rect")
    .attr("x", (d) => x(Math.min(0, d[cfg.valor])))
    .attr("y", (_, i) => y(i))
    .attr("width", (d) => Math.abs(x(d[cfg.valor]) - x(0)))
    .attr("height", y.bandwidth())
    .attr("rx", 3)
    .attr("fill", relleno)
    .attr("stroke", cfg.simulado ? color.gris : null);

  // Nombres a la izquierda (recortados si son muy largos)
  svg.append("g").attr("class", "eje-y-categorias")
    .selectAll("text").data(filas).join("text")
    .attr("x", m.izquierda - 10).attr("y", (_, i) => y(i) + y.bandwidth() / 2)
    .attr("dy", "0.35em").attr("text-anchor", "end")
    .text((d) => recortar(nombre(d), 34))
    .append("title").text(nombre);

  // Valores al final de cada barra
  svg.append("g").selectAll("text").data(filas).join("text")
    .attr("class", "valor")
    .attr("x", (d) => x(Math.max(0, d[cfg.valor])) + 6)
    .attr("y", (_, i) => y(i) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text((d) => f(d[cfg.valor]));

  // Eje inferior
  svg.append("g").attr("class", "eje")
    .attr("transform", `translate(0,${alto - m.abajo})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(f).tickSizeOuter(0))
    .call((g) => g.select(".domain").remove());

  // Línea de referencia (mediana, promedio o valor fijo)
  // La etiqueta va arriba de las barras para no tapar ningún valor.
  if (ref != null) {
    svg.append("line").attr("class", "referencia")
      .attr("x1", x(ref)).attr("x2", x(ref)).attr("y1", m.arriba - 10).attr("y2", alto - m.abajo);
    svg.append("text").attr("class", "anotacion")
      .attr("x", x(ref) + 6).attr("y", m.arriba - 14)
      .text(`${cfg.referencia.texto ?? cfg.referencia.tipo}: ${f(ref)}`);
  }
}

function valorReferencia(r, filas, col) {
  if (!r) return null;
  if (r.tipo === "mediana") return d3.median(filas, (d) => d[col]);
  if (r.tipo === "promedio") return d3.mean(filas, (d) => d[col]);
  const v = Number(r.tipo);
  if (Number.isNaN(v)) throw new Error(`referencia.tipo debe ser "mediana", "promedio" o un número.`);
  return v;
}

function recortar(texto, n) {
  return texto.length > n ? `${texto.slice(0, n - 1)}…` : texto;
}
