// Comparação justa com financiamento: mesma entrada, mesmo prazo; taxa equivalente e ponto de virada.
import assert from "node:assert/strict";
import { financiar, finComEntrada, taxaEquivalente, pontoVirada } from "../fontes/custos.mjs";

const liq = 131570.208, ent = 55694.60883, cet = 0.245;

// sem entrada = financiar o valor todo
const f0 = finComEntrada({ liq, entrada: 0, cetAA: cet, meses: 34 });
const g0 = financiar({ valor: liq, cetAA: cet, meses: 34 });
assert.ok(Math.abs(f0.total - g0.total) < 0.01);

// com entrada: total = entrada + parcelas do saldo; auditoria independente (Fable) deu 158.483 em 34 meses
const f1 = finComEntrada({ liq, entrada: ent, cetAA: cet, meses: 34 });
assert.ok(Math.abs(f1.total - (ent + financiar({ valor: liq - ent, cetAA: cet, meses: 34 }).total)) < 0.01);
assert.ok(Math.abs(f1.total - 158483) < 150, "34 meses: " + f1.total);
const f2 = finComEntrada({ liq, entrada: ent, cetAA: cet, meses: 64 });
assert.ok(Math.abs(f2.total - 185537) < 250, "64 meses: " + f2.total);

// entrada que cobre o bem: nada a financiar
const f3 = finComEntrada({ liq, entrada: liq + 10, cetAA: cet, meses: 34 });
assert.equal(f3.semFin, true);
assert.ok(Math.abs(f3.total - liq) < 0.01);

// taxa equivalente: se o consórcio custa o que um financiamento a 18% custaria, devolve 18%
const alvo = finComEntrada({ liq, entrada: ent, cetAA: 0.18, meses: 64 }).total;
assert.ok(Math.abs(taxaEquivalente({ liq, entrada: ent, meses: 64, totalCons: alvo }) - 0.18) < 1e-4);
// consórcio abaixo até de juro zero: sem taxa
assert.equal(taxaEquivalente({ liq, entrada: ent, meses: 64, totalCons: liq - 1 }), null);

// ponto de virada: na entrada indicada, o juro do financiamento iguala o custo do consórcio
const custo = 60507;
const pv = pontoVirada({ liq, custoCons: custo, meses: 64, cetAA: cet });
assert.ok(pv > 0.3 && pv < 0.4, "virada 64 meses " + pv); // auditoria: ~33,5%
const eq = finComEntrada({ liq, entrada: pv * liq, cetAA: cet, meses: 64 });
assert.ok(Math.abs(eq.custo - custo) < 5, "custo no ponto de virada " + eq.custo);
// 34 meses: o consórcio já custa mais mesmo sem entrada
assert.equal(pontoVirada({ liq, custoCons: 53195, meses: 34, cetAA: cet }), 0);
// taxa zero: sem juro, sem virada calculável
assert.equal(pontoVirada({ liq, custoCons: custo, meses: 64, cetAA: 0 }), null);

console.log("comparacao.mjs: ok");
