// Motor de custo: gabarito da planilha do Ricardo (03/11/2026, grupo 30066, veículo, 3 cotas) + propriedades.
import assert from "node:assert/strict";
import { agoDe, fatorAGO, projetar, somar, custoEfetivoAno, financiar, cenariosLance } from "../fontes/custos.mjs";

const perto = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b} (tol ${tol})`);

// AGO: prazo 80, restante 64 → posição 16 → próxima 24 → 8 meses
assert.equal(agoDe(80, 64), 8);
assert.equal(agoDe(80, 80), 12);
assert.equal(agoDe(80, 56), 12); // posição 24 = acabou de reajustar
assert.equal(agoDe("", 64), null);

// reajuste: antes da AGO = 1; na AGO e até 11 meses depois = 1+i; 12 depois = (1+i)²
assert.equal(fatorAGO(7, 8, 0.0429), 1);
perto(fatorAGO(8, 8, 0.0429), 1.0429, 1e-12, "AGO");
perto(fatorAGO(19, 8, 0.0429), 1.0429, 1e-12, "AGO+11");
perto(fatorAGO(20, 8, 0.0429), 1.0429 ** 2, 1e-12, "AGO+12");

// === gabarito da planilha, POR COTA (valores que o Excel calculou) ===
const cota = { M: 2, parcPre: 1268.13, bolso: 18564.869611200003, saldoApos: 37597.67638879999, taxaSeg: 59.19 / 77376.17, credito: 43856.736, ago: 8, inpc: 0.0429 };
const red = projetar({ ...cota, N: 32 });
const man = projetar({ ...cota, N: 62 });
perto(red.total, 184520.69148457155 / 3, 0.01, "total reduzir (planilha Relatório D23 ÷ 3)");
perto(man.total, 192635.21854489818 / 3, 0.01, "total manter (planilha Relatório G23 ÷ 3)");
perto(man.total - red.total, 2704.842353442211, 0.01, "manter − reduzir (planilha F57)");
perto(red.porReal, 1.402450404916678, 1e-6, "R$ por R$ 1, reduzir (planilha E59)");
perto(man.porReal, 1.4641249069462454, 1e-6, "R$ por R$ 1, manter (planilha F59)");
perto(red.parcela1, 1203.688263598822, 0.01, "1ª parcela reduzir com seguro (planilha E54)");
perto(man.parcela1, 635.1750117520479, 0.01, "1ª parcela manter com seguro (planilha F54)");

// auditoria: a diferença "manter custa mais" é quase toda INPC sobre parcelas mais tardias
const difNominal = man.total - red.total, difHoje = man.vp - red.vp;
assert.ok(difHoje < difNominal * 0.6, `em valor de hoje a diferença cai (${difHoje.toFixed(0)} de ${difNominal.toFixed(0)})`);
// sem INPC, a diferença é só o seguro de uma cauda maior
const man0 = projetar({ ...cota, N: 62, inpc: 0 }), red0 = projetar({ ...cota, N: 32, inpc: 0 });
perto(man0.total - red0.total, man0.seguroPos - red0.seguroPos, 0.01, "sem INPC, a diferença é só seguro");
// seguro fixo (como a projeção do sistema) custa mais que o seguro que cai com o saldo
assert.ok(projetar({ ...cota, N: 62, segFixo: true }).total > man.total);

// somar: 3 cotas iguais = 3 × uma cota; custo ao ano igual ao de uma cota
const tres = somar([[red, 3]]);
perto(tres.total, 184520.69148457155, 0.01, "3 cotas");
perto(tres.custoAno, red.custoAno, 1e-9, "custo ao ano não depende da quantidade");

// custo efetivo ao ano: empréstimo comum devolve a taxa do contrato
for (const cet of [0.12, 0.2465, 0.35]) {
  const i = Math.pow(1 + cet, 1 / 12) - 1, n = 48, pmt = (100000 * i) / (1 - Math.pow(1 + i, -n));
  const fluxo = [100000, ...new Array(n).fill(-pmt)];
  perto(custoEfetivoAno(fluxo), cet, 1e-6, `TIR do empréstimo a ${cet}`);
}
// sem inflação nem lance, consórcio sem juros: custo ao ano ≈ 0 + efeito das taxas (não negativo)
assert.equal(custoEfetivoAno([0, -100, -100]), null); // só paga, nunca recebe → sem taxa

// financiamento: Price e SAC fecham o saldo
const price = financiar({ valor: 100000, cetAA: 0.24, meses: 60, sistema: "price" });
perto(price.total, price.parcela1 * 60, 1e-6, "Price: parcelas iguais");
const sac = financiar({ valor: 100000, cetAA: 0.24, meses: 60, sistema: "sac" });
assert.ok(sac.parcela1 > sac.parcelaN, "SAC: parcela cai");
perto(sac.parcelas.reduce((a, b) => a + b, 0), sac.total, 1e-6, "SAC soma");
assert.ok(sac.total < price.total, "SAC paga menos juros que Price na mesma taxa");
assert.equal(financiar({ valor: 0, cetAA: 0.2, meses: 12 }), null);
perto(financiar({ valor: 1200, cetAA: 0, meses: 12 }).total, 1200, 1e-9, "taxa zero");

// consórcio de uma cota: M=1 dá custo ao ano finito; contemplar mais tarde custa mais ao ano
const c1 = projetar({ ...cota, M: 1, N: 62 }).custoAno, c6 = projetar({ ...cota, M: 6, N: 62 }).custoAno, c12 = projetar({ ...cota, M: 12, N: 62 }).custoAno;
if (c1 != null && c6 != null && c12 != null) assert.ok(c1 < c6 && c6 < c12, `custo ao ano cresce com a espera: ${c1} ${c6} ${c12}`);
// cenários de lance: grupo 30066, 3 cotas, embutido 30%: o menor lance dá o bolso da planilha (R$ 55.695)
const cz = cenariosLance([{ k: 3, carta: 62652.48, emb: 30, lmin: 59.6315, lmed: 61, lmax: 65 }]);
perto(cz.ousado, 55694.6, 1, "bolso no lance mínimo (planilha: ~55.695)");
assert.ok(cz.ousado < cz.central && cz.central < cz.conservador, "mais lance exigido, mais bolso");
assert.equal(cenariosLance([{ k: 3, carta: 1000, emb: 30, lmin: 50, lmed: null, lmax: 60 }]).central, null, "sem dado, sem cenário");
assert.equal(cenariosLance([{ k: 1, carta: 1000, emb: 40, lmin: 30, lmed: 30, lmax: 30 }]).ousado, 0, "embutido cobre tudo: bolso zero");
console.log("custos.mjs: ok", { reduzirTotal: +red.total.toFixed(2), manterTotal: +man.total.toFixed(2), difNominal: +difNominal.toFixed(2), difHoje: +difHoje.toFixed(2), custoAnoReduzir: red.custoAno, custoAnoManter: man.custoAno, c1, c6, c12 });
