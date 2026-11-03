// Cola fontes/index.html dentro de nucleo/app-html.mjs (a função app serve só com sessão).
// Também embute nucleo/alavancagem.mjs (sem `export`) no marcador do index.html, para as mesmas
// funções puras rodarem no navegador e continuarem testáveis em Node.
import { readFileSync, writeFileSync } from "node:fs";
const MARCADOR = "/*__ALAVANCAGEM__*/";
let html = readFileSync(new URL("./fontes/index.html", import.meta.url), "utf8");
const alav = readFileSync(new URL("./nucleo/alavancagem.mjs", import.meta.url), "utf8").replace(/^export\s+/gm, "");
if (html.split(MARCADOR).length !== 2) throw new Error(`build: o marcador ${MARCADOR} tem de aparecer uma única vez em fontes/index.html`);
if (/^\s*(import|export)\b/m.test(alav)) throw new Error("build: nucleo/alavancagem.mjs não pode ter import/export restante");
if (/<\/script/i.test(alav)) throw new Error("build: nucleo/alavancagem.mjs não pode conter </script");
html = html.replace(MARCADOR, () => alav);
if (html.includes("__ALAVANCAGEM__")) throw new Error("build: o marcador vazou para o HTML final");
writeFileSync(new URL("./nucleo/app-html.mjs", import.meta.url), `// GERADO por build.mjs a partir de fontes/index.html. Não edite à mão.\nexport const APP = ${JSON.stringify(html)};\n`);
console.log("app-html.mjs gerado:", html.length, "bytes");
