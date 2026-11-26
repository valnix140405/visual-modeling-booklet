// Booklet Visual Modeling UPY · cargador común.
//
// Los capítulos no escriben JavaScript: declaran cada gráfica en el HTML con
//   <div class="grafica" data-grafica="barras">
//     <script type="application/json">{ ...configuración... }</script>
//   </div>
// y este archivo la dibuja. Para un tipo de gráfica nuevo, se agrega su
// función en js/graficas/ y se registra en GRAFICAS.

import { RAIZ, mostrarError } from "./estilo.js";
import { CAPITULOS } from "./capitulos.js";
import { barras } from "./graficas/barras.js";
import { linea } from "./graficas/linea.js";

export const GRAFICAS = { barras, linea };

// Dibuja todas las gráficas declaradas dentro de `raiz`.
export async function renderizar(raiz = document) {
  const nodos = [...raiz.querySelectorAll("[data-grafica]")];
  await Promise.all(nodos.map(async (el) => {
    try {
      const tipo = el.dataset.grafica;
      const dibujar = GRAFICAS[tipo];
      if (!dibujar) {
        throw new Error(`no existe el tipo "${tipo}". Disponibles: ${Object.keys(GRAFICAS).join(", ")}.`);
      }
      await dibujar(el, leerConfig(el));
    } catch (error) {
      mostrarError(el, error);
    }
  }));
  if (document.fonts) await document.fonts.ready;
  // Señal para scripts/imprimir.js: ya se puede generar el PDF.
  document.body.dataset.listo = "si";
}

function leerConfig(el) {
  const script = el.querySelector('script[type="application/json"]');
  const texto = script ? script.textContent : el.dataset.config;
  if (!texto) throw new Error('falta la configuración (<script type="application/json"> dentro del div).');
  try {
    return JSON.parse(texto);
  } catch (e) {
    throw new Error(`la configuración no es JSON válido: ${e.message}`);
  }
}

// Une todos los capítulos de js/capitulos.js en `destino`, en orden.
// Corrige las rutas de imágenes y enlaces para que funcionen desde la raíz.
export async function ensamblar(destino) {
  for (const cap of CAPITULOS) {
    const url = new URL(cap.archivo, RAIZ);
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      destino.insertAdjacentHTML("beforeend",
        `<p class="grafica-error">Falta el capítulo ${cap.archivo} (${respuesta.status}).</p>`);
      continue;
    }
    const doc = new DOMParser().parseFromString(await respuesta.text(), "text/html");
    const articulo = doc.querySelector("article.capitulo");
    if (!articulo) {
      destino.insertAdjacentHTML("beforeend",
        `<p class="grafica-error">${cap.archivo} no tiene un &lt;article class="capitulo"&gt;.</p>`);
      continue;
    }
    for (const n of articulo.querySelectorAll("[src]")) n.setAttribute("src", new URL(n.getAttribute("src"), url).href);
    for (const n of articulo.querySelectorAll("a[href]:not([href^='#'])")) n.setAttribute("href", new URL(n.getAttribute("href"), url).href);
    articulo.querySelectorAll(".solo-capitulo").forEach((n) => n.remove());
    destino.append(document.importNode(articulo, true));
  }
}
