// Cola fontes/index.html dentro de nucleo/app-html.mjs (a função app serve só com sessão).
import { readFileSync, writeFileSync } from "node:fs";
// O motor de custo (fontes/custos.mjs) é o mesmo arquivo que o teste importa; aqui ele vira texto dentro da página.
const motor = readFileSync(new URL("./fontes/custos.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
const html = readFileSync(new URL("./fontes/index.html", import.meta.url), "utf8").replace("/*MOTOR_CUSTOS*/", () => motor);
writeFileSync(new URL("./nucleo/app-html.mjs", import.meta.url), `// GERADO por build.mjs a partir de fontes/index.html. Não edite à mão.\nexport const APP = ${JSON.stringify(html)};\n`);
console.log("app-html.mjs gerado:", html.length, "bytes");
