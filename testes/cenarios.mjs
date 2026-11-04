// Meses padrão dos cenários de contemplação (regra do app, sem fonte da Caixa): lê a função direto do app.js.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../fontes/app.js", import.meta.url), "utf8");
const m = /const mesesPadrao=(n=>\{[^\n]*\});/.exec(src);
assert.ok(m, "mesesPadrao não encontrada");
const f = new Function("return " + m[1])();
const casos = { 1: [1, 3, 6], 2: [1, 4, 7], 3: [2, 5, 9], 4: [3, 6, 12], 6: [5, 8, 18] };
for (const [n, [o, fa, c]] of Object.entries(casos)) assert.deepEqual(f(Number(n)), { oti: o, fac: fa, con: c }, "cotas " + n);
assert.deepEqual(f(0), f(1)); assert.deepEqual(f(undefined), f(1));
for (let n = 1; n <= 12; n++) { const r = f(n); assert.ok(r.oti >= 1 && r.oti <= r.fac && r.fac < r.con, "ordem " + n); }
console.log("cenarios.mjs: ok");
