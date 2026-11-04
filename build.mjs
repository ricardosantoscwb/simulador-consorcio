// Monta a página única do app e cola em nucleo/app-html.mjs (a função app serve só com sessão).
// Fontes: fontes/index.html (marcação) + app.css + app.js + custos.mjs (motor, o mesmo que o teste importa).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const ler = (f) => readFileSync(new URL("./fontes/" + f, import.meta.url), "utf8");

/** Devolve o HTML final (usado pelo build e pelas conferências de tela). */
export function montar() {
  const motor = ler("custos.mjs").replace(/^export /gm, "");
  const trocas = [["/*MOTOR_CUSTOS*/", motor], ["/*APP_CSS*/", ler("app.css")], ["/*APP_JS*/", ler("app.js")]];
  let html = ler("index.html");
  for (const [marca, texto] of trocas) {
    if (!html.includes(marca)) throw new Error("build: falta a marca " + marca + " em fontes/index.html");
    html = html.replace(marca, () => texto);
  }
  return html;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = montar();
  writeFileSync(new URL("./nucleo/app-html.mjs", import.meta.url), `// GERADO por build.mjs a partir de fontes/. Não edite à mão.\nexport const APP = ${JSON.stringify(html)};\n`);
  console.log("app-html.mjs gerado:", html.length, "bytes");
}
