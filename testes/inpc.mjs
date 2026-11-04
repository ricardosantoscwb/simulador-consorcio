// INPC do BCB: leitura da série real (13 pontos baixados em 03/11/2026; usamos os 12 últimos) e falhas.
import assert from "node:assert/strict";
import { acumulado12, buscarInpc } from "../nucleo/inpc.mjs";
const real = [{"data":"01/09/2025","valor":"0.52"},{"data":"01/10/2025","valor":"0.03"},{"data":"01/11/2025","valor":"0.03"},{"data":"01/12/2025","valor":"0.21"},{"data":"01/01/2026","valor":"0.39"},{"data":"01/02/2026","valor":"0.56"},{"data":"01/03/2026","valor":"0.91"},{"data":"01/04/2026","valor":"0.81"},{"data":"01/05/2026","valor":"0.65"},{"data":"01/06/2026","valor":"0.14"},{"data":"01/07/2026","valor":"-0.01"},{"data":"01/08/2026","valor":"-0.32"},{"data":"01/09/2026","valor":"0.82"}];
const doze = real.slice(1);
const r = acumulado12(doze);
assert.equal(r.ref, "2026-09");
assert.ok(Math.abs(r.acum12 - 4.29) < 0.02, "acumulado 12m = " + r.acum12); // bate com os 4,29% da planilha do Ricardo
assert.throws(() => acumulado12(real), /12 meses/); // 13 pontos
assert.throws(() => acumulado12([...doze.slice(0, 5), ...doze.slice(6), doze[5]]), /consecutivos/);
assert.throws(() => acumulado12(doze.map((p, i) => (i === 3 ? { ...p, valor: "abc" } : p))), /inválido/);
assert.throws(() => acumulado12(doze.map((p, i) => (i === 3 ? { ...p, valor: "40" } : p))), /inválido/);
const ok = await buscarInpc(async () => new Response(JSON.stringify(doze), { status: 200 }));
assert.equal(ok.ref, "2026-09");
await assert.rejects(buscarInpc(async () => new Response("x", { status: 500 })), /500/);
console.log("inpc.mjs: ok", r);
