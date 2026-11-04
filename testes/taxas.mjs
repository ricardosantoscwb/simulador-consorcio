// Taxas do BCB: leitura de linhas reais (amostra de 04/11/2026) e falhas.
import assert from "node:assert/strict";
import { lerTaxas, buscarTaxas } from "../nucleo/taxas.mjs";
const veic = [
  { InicioPeriodo: "2026-10-07", InstituicaoFinanceira: "CAIXA ECONOMICA FEDERAL", TaxaJurosAoAno: 11.0 },
  { InicioPeriodo: "2026-10-14", InstituicaoFinanceira: "CAIXA ECONOMICA FEDERAL", TaxaJurosAoAno: 12.92 },
  { InicioPeriodo: "2026-10-14", InstituicaoFinanceira: "SANTANDER SCFI S", TaxaJurosAoAno: 24.55 },
  { InicioPeriodo: "2026-10-14", InstituicaoFinanceira: "BCO RNX S.A.", TaxaJurosAoAno: 0 },
];
const v = lerTaxas(veic, "veiculo");
assert.equal(v.ref, "2026-10-14");
assert.deepEqual(v.lista.map((x) => x.b), ["CAIXA ECONOMICA FEDERAL", "SANTANDER SCFI S"]); // período antigo e taxa zero ficam fora
const imo = [
  { anoMes: "2026-09", Modalidade: "Financiamento imobiliário com taxas de mercado - Prefixado", InstituicaoFinanceira: "BCO SANTANDER (BRASIL) S.A.", TaxaJurosAoAno: 15.04 },
  { anoMes: "2026-09", Modalidade: "Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR", InstituicaoFinanceira: "ITAÚ UNIBANCO S.A.", TaxaJurosAoAno: 12.14 },
];
const i = lerTaxas(imo, "imovel");
assert.equal(i.ref, "2026-09");
assert.deepEqual(i.lista.map((x) => x.m), ["TR", "prefixado"]);
assert.throws(() => lerTaxas([], "veiculo"), /sem dados/);
assert.throws(() => lerTaxas(null, "imovel"), /inesperada/);
const tudo = await buscarTaxas(async (u) => new Response(JSON.stringify({ value: /Diaria/.test(u) ? veic : imo }), { status: 200 }));
assert.ok(tudo.veiculo.lista.length && tudo.imovel.lista.length);
await assert.rejects(buscarTaxas(async () => new Response("x", { status: 500 })), /500/);
console.log("taxas.mjs: ok");
