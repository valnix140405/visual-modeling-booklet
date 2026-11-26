// Genera booklet.pdf a partir de booklet.html.
// Levanta un servidor local (los módulos de JavaScript no cargan con file://),
// espera a que todas las gráficas estén dibujadas y exporta en tamaño carta.
//
// Uso:  npm install  &&  npm run pdf
//       (o: node scripts/imprimir.js [salida.pdf])

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const RAIZ = path.resolve(__dirname, "..");
const SALIDA = path.resolve(process.argv[2] || path.join(RAIZ, "booklet.pdf"));
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".csv": "text/csv; charset=utf-8", ".geojson": "application/geo+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
};

const servidor = http.createServer((req, res) => {
  const ruta = path.join(RAIZ, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(ruta)] || "application/octet-stream" });
  fs.createReadStream(ruta).pipe(res);
});

servidor.listen(0, "127.0.0.1", async () => {
  const { port } = servidor.address();
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    const errores = [];
    pagina.on("pageerror", (e) => errores.push(e.message));
    await pagina.goto(`http://127.0.0.1:${port}/booklet.html`, { waitUntil: "networkidle" });
    await pagina.waitForSelector('body[data-listo="si"]', { timeout: 60000 });
    const fallidas = await pagina.locator(".grafica-error").count();
    await pagina.emulateMedia({ media: "print" });
    await pagina.pdf({
      path: SALIDA,
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-size:8px;width:100%;padding:0 15mm;color:#555;display:flex;justify-content:space-between;font-family:sans-serif">' +
        '<span>Mérida a ras de calle · Visual Modeling UPY</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
    });
    console.log(`PDF: ${path.relative(process.cwd(), SALIDA)}`);
    if (fallidas) console.warn(`Aviso: ${fallidas} gráfica(s) con error; revisa el PDF.`);
    if (errores.length) console.warn("Errores de la página:", errores);
    process.exitCode = fallidas || errores.length ? 1 : 0;
  } finally {
    await navegador.close();
    servidor.close();
  }
});
