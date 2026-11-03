// Testes de alavancagem. Rodar: node testes/alavancagem.mjs
import assert from "node:assert/strict";
import { aluguelXParcela, financiamentoPrice, consorcioXFinanciamento, agio, rendimentoFundo } from "../nucleo/alavancagem.mjs";

const perto = (a, b, tol = 1, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} esperado ${b}, veio ${a}`);
const pertoPct = (a, b, pct = 0.5, msg) => assert.ok(Math.abs(a - b) <= Math.abs(b) * pct / 100, `${msg || ""} esperado ${b}, veio ${a}`);

// Cenário real grupo 040003 (veículos pesados)
const carta = 235526, embutido = carta * 0.30, lanceBolso = 32974, creditoLiquido = 164869;
perto(embutido, 70658, 1, "embutido");
perto(carta - embutido, creditoLiquido, 1, "crédito líquido");
perto(carta - embutido, creditoLiquido, 1);
const piso = 38666; // 1ª parcela + lance do bolso
// Taxa/prazo implícitos que reproduzem ~R$ 231 mil: 15,12% a.a. em 60 meses (exemplo, não é taxa da Caixa)
const TAXA = 15.12, PRAZO = 60;

// Aluguel (rendimento FipeZap Curitiba como exemplo editável)
{
  const r = aluguelXParcela({ valorImovel: 300000, rendAnualPct: 4.74, descontoPct: 10, parcelaPos: 1000 });
  perto(r.aluguelBruto, 1185, 0.01);
  perto(r.aluguelLiquido, 1066.5, 0.01);
  perto(r.saldoMes, 66.5, 0.01);
  pertoPct(r.cobertura, 1.0665);
  assert.ok(Array.isArray(r.avisos));
  assert.ok(aluguelXParcela({ valorImovel: 1, rendAnualPct: 5, parcelaPos: 0 }).avisos.length > 0);
}

// Price
{
  const f = financiamentoPrice({ principal: creditoLiquido, taxaAnualPct: TAXA, meses: PRAZO });
  pertoPct(f.totalPago, 231000, 0.5, "total financiado");
  perto(f.taxaMensalPct, (Math.pow(1.1512, 1 / 12) - 1) * 100, 1e-9);
  perto(f.juros, f.totalPago - creditoLiquido, 1e-6);
  const z = financiamentoPrice({ principal: 1200, taxaAnualPct: 0, meses: 12 });
  perto(z.parcela, 100, 1e-9);
  for (const bad of [{ principal: NaN, taxaAnualPct: 1, meses: 10 }, { principal: 1, taxaAnualPct: -1, meses: 10 }, { principal: 1, taxaAnualPct: 1, meses: 0 }]) {
    const r = financiamentoPrice(bad);
    assert.ok(r.avisos.length > 0 && Number.isNaN(r.totalPago));
  }
  assert.doesNotThrow(() => financiamentoPrice());
}

// Consórcio x financiamento
{
  const a = consorcioXFinanciamento({ creditoLiquido, lanceBolso, parcelasAteContemplar: [{ n: 1, valor: piso - lanceBolso }],
    parcelaPos: 3487, mesesPos: 47, taxaAnualFinanc: TAXA, mesesFinanc: PRAZO });
  const b = consorcioXFinanciamento({ creditoLiquido, lanceBolso, parcelasAteContemplar: { meses: 1, valor: piso - lanceBolso },
    parcelaPos: 3487, mesesPos: 47, taxaAnualFinanc: TAXA, mesesFinanc: PRAZO });
  perto(a.custoConsorcio, lanceBolso + 5692 + 3487 * 47, 1);
  assert.equal(a.custoConsorcio, b.custoConsorcio);
  perto(a.diferenca, a.custoFinanciamento - a.custoConsorcio, 1e-6);
  assert.ok(a.avisos.some((s) => /contemplação/.test(s)));
  assert.ok(Number.isNaN(consorcioXFinanciamento({}).custoConsorcio));
  // aviso de reajuste (item 5) e de taxa (item 1)
  assert.ok(a.avisos.some((s) => /reajustadas anualmente \(INPC, não incluído\); financiamento comparado como prefixado/.test(s)));
  assert.ok(a.avisos.some((s) => /médias do BCB por banco \(via iDinheiro\) ou média de mercado, não a taxa do cliente; imóvel: colada do simulador Caixa/.test(s)));
  assert.ok(!a.avisos.some((s) => /média Caixa do BCB/.test(s)));
  // lista vazia: aviso claro, não NaN mudo (item 13)
  const vazia = consorcioXFinanciamento({ creditoLiquido, lanceBolso, parcelasAteContemplar: [], parcelaPos: 3487, mesesPos: 47, taxaAnualFinanc: TAXA, mesesFinanc: PRAZO });
  assert.ok(Number.isNaN(vazia.custoConsorcio) && vazia.avisos.some((s) => /^Entrada inválida: parcelasAteContemplar/.test(s)), "lista vazia avisa");
  // imóvel: usa o TOTAL PAGO colado do simulador da Caixa, não Price
  const imo = consorcioXFinanciamento({ creditoLiquido, lanceBolso, parcelasAteContemplar: { meses: 1, valor: piso - lanceBolso },
    parcelaPos: 3487, mesesPos: 47, totalPagoFinanc: 300000 });
  assert.equal(imo.custoFinanciamento, 300000);
  perto(imo.diferenca, 300000 - (lanceBolso + 5692 + 3487 * 47), 1e-6);
  assert.ok(Number.isNaN(imo.parcelaFinanciamento), "sem Price: sem parcela calculada");
  assert.ok(imo.avisos.some((s) => /SAC/.test(s) && /sem fonte confirmada/.test(s)) && imo.avisos.some((s) => /INPC/.test(s)));
  assert.ok(!imo.avisos.some((s) => /prefixado/.test(s)));
  assert.ok(Number.isNaN(consorcioXFinanciamento({ creditoLiquido, lanceBolso, parcelasAteContemplar: { meses: 1, valor: 1 }, parcelaPos: 1, mesesPos: 1, totalPagoFinanc: 0 }).custoConsorcio), "total 0 é inválido");
  assert.ok(consorcioXFinanciamento({ creditoLiquido, lanceBolso, parcelasAteContemplar: { meses: 1, valor: 1 }, parcelaPos: 1, mesesPos: 1, totalPagoFinanc: NaN }).avisos.some((s) => /^Entrada inválida: totalPagoFinanc/.test(s)));
}

// Ágio
{
  const base = { lanceBolso, parcelasPagas: 1, valorParcelaPagas: piso - lanceBolso, creditoRecebido: creditoLiquido,
    saldoAssumido: 163887, parcelaAssumida: 3487, mesesAssumidos: 47, taxaAnualFinanc: TAXA, mesesFinanc: PRAZO };
  const r = agio(base);
  perto(r.piso, 38666, 1);
  pertoPct(r.teto, 67000, 1.5, "teto"); // ~R$ 67 mil
  perto(r.faixa, r.teto - r.piso, 1e-6);
  const tabela = [[45000, 6334, 950, 5384], [55000, 16334, 2450, 13884], [67000, 28334, 4250, 24084]];
  for (const [p, bruto, ir, liq] of tabela) {
    const x = agio({ ...base, precoVenda: p });
    perto(x.lucroBruto, bruto, 1); perto(x.ir, ir, 1); perto(x.lucroLiquido, liq, 1);
  }
  assert.equal(agio({ ...base, precoVenda: 30000 }).lucroBruto, 0);
  assert.ok(r.avisos.some((s) => /sem fonte confirmada/.test(s)) && r.avisos.some((s) => /11\.795/.test(s)));
  assert.ok(r.avisos.some((s) => /ganho de capital 15% · sem fonte confirmada · pode haver isenção para venda de pequeno valor; confirmar com contador/.test(s)), "rótulo do IR 15%");

  // TETO EM VALOR PRESENTE (caso 040003): crédito 164.869 − VP de 47 × 3.487 à taxa mensal equivalente de 15,12% a.a.
  const im = Math.pow(1.1512, 1 / 12) - 1;
  let vpForca = 0; for (let k = 1; k <= 47; k++) vpForca += 3487 / Math.pow(1 + im, k); // soma mês a mês, sem fórmula fechada
  perto(r.vpParcelasAssumidas, vpForca, 1e-6, "VP fecha com a soma mês a mês");
  perto(r.tetoVP, 164869 - vpForca, 1e-6);
  perto(r.tetoVP, 39631, 1, "tetoVP do caso 040003 ≈ R$ 39,6 mil");
  assert.ok(r.tetoVP < r.teto, "VP é mais conservador que a soma nominal");
  perto(r.teto, r.custoFinanciar - 163887, 1e-6, "teto nominal continua sendo a soma simples");
  assert.ok(r.tetoVP > r.piso && !r.avisos.some((s) => /não tem folga/.test(s)));
  assert.ok(!r.avisos.some((s) => /difere de parcela assumida/.test(s)), "163.887 ≈ 3.487 × 47 (dentro de 1%)");
  // taxa zero: VP = soma simples das parcelas
  perto(agio({ ...base, taxaAnualFinanc: 0 }).vpParcelasAssumidas, 3487 * 47, 1e-6);
  // sem folga: parcela assumida alta demais → tetoVP ≤ piso e aviso claro
  const sem = agio({ ...base, parcelaAssumida: 5000 });
  assert.ok(sem.tetoVP <= sem.piso && sem.avisos.some((s) => /não tem folga para pagar ágio nesta taxa/.test(s)));
  // saldo assumido difere de parcela × meses em mais de 1%: avisa; dentro de 1%: não avisa
  assert.ok(agio({ ...base, saldoAssumido: 150000 }).avisos.some((s) => /difere de parcela assumida × meses que faltam em mais de 1%/.test(s)));
  assert.ok(!agio({ ...base, saldoAssumido: 163889 * 1.009 }).avisos.some((s) => /difere de parcela assumida/.test(s)));
  // sem parcela/meses assumidos: tetoVP não calculado, com aviso (não NaN mudo)
  const semParc = agio({ ...base, parcelaAssumida: undefined, mesesAssumidos: undefined });
  assert.ok(Number.isNaN(semParc.tetoVP) && semParc.avisos.some((s) => /não calculado: informe parcela assumida e meses que faltam/.test(s)));
  // preço de venda acima do tetoVP avisa (limite é o conservador)
  assert.ok(agio({ ...base, precoVenda: 45000 }).avisos.some((s) => /Preço de venda acima do teto/.test(s)));
  assert.ok(!agio({ ...base, precoVenda: 39000 }).avisos.some((s) => /Preço de venda acima do teto/.test(s)));
  assert.ok(Number.isNaN(agio({ ...base, creditoRecebido: -1 }).piso));
  assert.doesNotThrow(() => agio());
}

// Fundo
{
  const r = rendimentoFundo({ valor: 10000, meses: 12, cdiAnualPct: 10, pctCdi: 100, irPct: 15 });
  perto(r.valorFinalBruto, 11000, 1e-6);
  perto(r.ir, 150, 1e-6);
  perto(r.valorFinalLiquido, 10850, 1e-6);
  const d = rendimentoFundo({ valor: 10000, meses: 12, cdiAnualPct: 10, irPct: 0 }); // pctCdi padrão 99,53
  perto(d.valorFinalBruto, 10000 * (1 + 0.1 * 0.9953), 1e-6);
  assert.ok(Number.isNaN(rendimentoFundo({ valor: 1, meses: 1, cdiAnualPct: 10 }).valorFinalLiquido)); // sem irPct
  assert.ok(Number.isNaN(rendimentoFundo({ valor: 1, meses: 0, cdiAnualPct: 10, irPct: 0 }).valorFinalBruto));
}

// O build cola estas funções no navegador: o marcador não pode vazar e não pode sobrar export.
{
  const { APP } = await import("../nucleo/app-html.mjs");
  assert.ok(!APP.includes("__ALAVANCAGEM__"), "marcador vazou para o HTML final");
  assert.ok(APP.includes("function aluguelXParcela") && APP.includes("function rendimentoFundo"), "funções do núcleo coladas no HTML");
  assert.ok(!/^\s*export\s/m.test(APP.split("<script>").pop()), "sobrou export no script do navegador");
}

console.log("ok · alavancagem");
