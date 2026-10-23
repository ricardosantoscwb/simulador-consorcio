// Cola fontes/index.html dentro de nucleo/app-html.mjs (a função app serve só com sessão).
import { readFileSync, writeFileSync } from "node:fs";
const html = readFileSync(new URL("./fontes/index.html", import.meta.url), "utf8");
writeFileSync(new URL("./nucleo/app-html.mjs", import.meta.url), `// GERADO por build.mjs a partir de fontes/index.html. Não edite à mão.\nexport const APP = ${JSON.stringify(html)};\n`);
console.log("app-html.mjs gerado:", html.length, "bytes");
