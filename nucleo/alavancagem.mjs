// Alavancagem: funções puras (sem DOM, sem rede). Premissas entram sempre por parâmetro.
// Nada aqui promete contemplação. Taxas e regras sem fonte vêm marcadas "sem fonte confirmada".

const AVISO_CONTEMPLACAO = "Consórcio não tem contemplação garantida; lance alvo é histórico do grupo, não previsão.";
const AVISO_TAXA = "Taxa de financiamento é premissa editável (veículo: médias do BCB por banco (via iDinheiro) ou média de mercado, não a taxa do cliente; imóvel: colada do simulador Caixa).";
const AVISO_REAJUSTE = "Parcelas do consórcio são reajustadas anualmente (INPC, não incluído); financiamento comparado como prefixado.";
const AVISO_IR = "IR: ganho de capital 15% · sem fonte confirmada · pode haver isenção para venda de pequeno valor; confirmar com contador.";

// Valida números; devolve true se ok, senão registra aviso.
function checa(avisos, nome, v, { min = 0, estrito = false } = {}) {
  if (typeof v !== "number" || !Number.isFinite(v) || (estrito ? v <= min : v < min)) {
    avisos.push(`Entrada inválida: ${nome}${estrito ? " deve ser maior que " : " não pode ser menor que "}${min}.`);
    return false;
  }
  return true;
}

const nan = () => NaN;

// 1) Aluguel x parcela depois da contemplação.
export function aluguelXParcela({ valorImovel, rendAnualPct, descontoPct = 0, parcelaPos } = {}) {
  const avisos = [];
  const ok = [
    checa(avisos, "valorImovel", valorImovel),
    checa(avisos, "rendAnualPct", rendAnualPct),
    checa(avisos, "descontoPct", descontoPct),
    checa(avisos, "parcelaPos", parcelaPos, { estrito: true }),
  ].every(Boolean);
  if (ok && descontoPct > 100) { avisos.push("Entrada inválida: descontoPct não pode passar de 100."); }
  if (!ok || descontoPct > 100) {
    return { aluguelBruto: nan(), aluguelLiquido: nan(), saldoMes: nan(), cobertura: nan(), avisos };
  }
  const aluguelBruto = valorImovel * (rendAnualPct / 100) / 12;
  const aluguelLiquido = aluguelBruto * (1 - descontoPct / 100);
  avisos.push("Rendimento de aluguel é premissa editável (referência pública, não garantia); vacância e custos podem reduzi-lo.");
  return {
    aluguelBruto,
    aluguelLiquido,
    saldoMes: aluguelLiquido - parcelaPos,
    cobertura: aluguelLiquido / parcelaPos,
    avisos,
  };
}

// 2) Financiamento Price. Taxa anual vira mensal equivalente composta.
export function financiamentoPrice({ principal, taxaAnualPct, meses } = {}) {
  const avisos = [];
  const ok = [
    checa(avisos, "principal", principal),
    checa(avisos, "taxaAnualPct", taxaAnualPct),
    checa(avisos, "meses", meses, { estrito: true }),
  ].every(Boolean);
  if (!ok) return { taxaMensalPct: nan(), parcela: nan(), totalPago: nan(), juros: nan(), avisos };
  const i = Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1;
  const parcela = i === 0 ? principal / meses : (principal * i) / (1 - Math.pow(1 + i, -meses));
  const totalPago = parcela * meses;
  avisos.push(AVISO_TAXA);
  return { taxaMensalPct: i * 100, parcela, totalPago, juros: totalPago - principal, avisos };
}

// 3) Consórcio x financiamento do mesmo crédito líquido.
// Veículo: financiamento calculado por Price (taxaAnualFinanc + mesesFinanc).
// Imóvel: o simulador habitacional da Caixa costuma ser SAC (+TR), então o app NÃO calcula Price:
// o gerente cola o "total pago" do simulador (totalPagoFinanc). Sem ele, não compara.
export function consorcioXFinanciamento({
  creditoLiquido, lanceBolso, parcelasAteContemplar, parcelaPos, mesesPos, taxaAnualFinanc, mesesFinanc, totalPagoFinanc,
} = {}) {
  const porTotal = totalPagoFinanc !== undefined;
  const avisos = [AVISO_CONTEMPLACAO];
  if (porTotal) {
    avisos.push("Total pago do financiamento colado do simulador habitacional da Caixa (sistema SAC/Price e correção pela TR: sem fonte confirmada); o app não recalcula.");
    avisos.push("Parcelas do consórcio são reajustadas anualmente (INPC, não incluído); o total do financiamento é o colado, sem ajuste do app.");
  } else {
    avisos.push(AVISO_TAXA, AVISO_REAJUSTE);
  }
  // Aceita [{n,valor}] ou {meses,valor}
  let lista = [];
  if (Array.isArray(parcelasAteContemplar)) {
    lista = parcelasAteContemplar.map((p) => ({ n: p?.n, valor: p?.valor }));
    if (!lista.length) avisos.push("Entrada inválida: parcelasAteContemplar não pode ser lista vazia.");
  } else if (parcelasAteContemplar && typeof parcelasAteContemplar === "object")
    lista = [{ n: parcelasAteContemplar.meses, valor: parcelasAteContemplar.valor }];
  else avisos.push("Entrada inválida: parcelasAteContemplar.");
  let okLista = lista.length > 0;
  for (const p of lista) {
    if (!checa(avisos, "parcelasAteContemplar.n", p.n) || !checa(avisos, "parcelasAteContemplar.valor", p.valor)) okLista = false;
  }
  const checks = [
    checa(avisos, "creditoLiquido", creditoLiquido, { estrito: true }),
    checa(avisos, "lanceBolso", lanceBolso),
    checa(avisos, "parcelaPos", parcelaPos),
    checa(avisos, "mesesPos", mesesPos),
  ];
  if (porTotal) checks.push(checa(avisos, "totalPagoFinanc", totalPagoFinanc, { estrito: true }));
  else checks.push(checa(avisos, "taxaAnualFinanc", taxaAnualFinanc), checa(avisos, "mesesFinanc", mesesFinanc, { estrito: true }));
  const ok = checks.every(Boolean) && okLista;
  if (!ok) {
    return { mesesAteContemplar: nan(), custoConsorcio: nan(), custoFinanciamento: nan(), diferenca: nan(), diferencaPct: nan(), avisos };
  }
  const mesesAteContemplar = lista.reduce((s, p) => s + p.n, 0);
  const parcelasAte = lista.reduce((s, p) => s + p.n * p.valor, 0);
  const parcelasDepois = parcelaPos * mesesPos;
  const custoConsorcio = lanceBolso + parcelasAte + parcelasDepois;
  let custoFinanciamento, parcelaFinanciamento = nan();
  if (porTotal) custoFinanciamento = totalPagoFinanc;
  else {
    const fin = financiamentoPrice({ principal: creditoLiquido, taxaAnualPct: taxaAnualFinanc, meses: mesesFinanc });
    custoFinanciamento = fin.totalPago;
    parcelaFinanciamento = fin.parcela;
  }
  const diferenca = custoFinanciamento - custoConsorcio; // positivo = consórcio mais barato
  return {
    mesesAteContemplar,
    lanceBolso,
    parcelasAteContemplar: parcelasAte,
    parcelasDepois,
    custoConsorcio,
    custoFinanciamento,
    parcelaFinanciamento,
    diferenca,
    diferencaPct: (diferenca / custoFinanciamento) * 100,
    avisos,
  };
}

// 4) Ágio: faixa de preço de venda de cota contemplada.
// piso   = o que a vendedora já pagou (lance do bolso + parcelas pagas).
// teto   = custo NOMINAL de financiar − saldo assumido (soma simples: superestima, ignora o tempo).
// tetoVP = crédito recebido − valor presente das parcelas que o comprador assume (parcelaAssumida × mesesAssumidos,
//          descontadas à taxa mensal do financiamento de referência, parcelas ao fim de cada mês). O comprador paga o
//          ágio à vista; por isso o limite conservador é em valor presente.
export function agio({
  lanceBolso, parcelasPagas, valorParcelaPagas, creditoRecebido, saldoAssumido, parcelaAssumida,
  mesesAssumidos, taxaAnualFinanc, mesesFinanc, precoVenda,
} = {}) {
  const avisos = [];
  const ok = [
    checa(avisos, "lanceBolso", lanceBolso),
    checa(avisos, "parcelasPagas", parcelasPagas),
    checa(avisos, "valorParcelaPagas", valorParcelaPagas),
    checa(avisos, "creditoRecebido", creditoRecebido, { estrito: true }),
    checa(avisos, "saldoAssumido", saldoAssumido),
    checa(avisos, "taxaAnualFinanc", taxaAnualFinanc),
  ].every(Boolean);
  // Prazo do financiamento de referência: mesesFinanc, ou mesesAssumidos se não vier.
  const prazo = mesesFinanc ?? mesesAssumidos;
  const okPrazo = checa(avisos, "mesesFinanc/mesesAssumidos", prazo, { estrito: true });
  if (precoVenda !== undefined) checa(avisos, "precoVenda", precoVenda);
  if (parcelaAssumida !== undefined) checa(avisos, "parcelaAssumida", parcelaAssumida);
  if (mesesAssumidos !== undefined) checa(avisos, "mesesAssumidos", mesesAssumidos);
  if (!ok || !okPrazo || avisos.length) {
    return { piso: nan(), teto: nan(), tetoVP: nan(), faixa: nan(), avisos };
  }
  const piso = lanceBolso + parcelasPagas * valorParcelaPagas;
  const fin = financiamentoPrice({ principal: creditoRecebido, taxaAnualPct: taxaAnualFinanc, meses: prazo });
  const custoFinanciar = fin.totalPago;
  const teto = custoFinanciar - saldoAssumido;
  const r = { piso, custoFinanciar, teto, tetoVP: nan(), vpParcelasAssumidas: nan(), faixa: teto - piso, parcelaAssumida, mesesAssumidos, taxaMensalPct: fin.taxaMensalPct, avisos };
  if (teto < piso) avisos.push("Teto pela soma simples abaixo do piso: com essas premissas a venda não cobre o que a vendedora já pagou.");
  if (parcelaAssumida !== undefined && mesesAssumidos !== undefined) {
    const i = fin.taxaMensalPct / 100;
    const vp = i === 0 ? parcelaAssumida * mesesAssumidos : parcelaAssumida * (1 - Math.pow(1 + i, -mesesAssumidos)) / i;
    r.vpParcelasAssumidas = vp;
    r.tetoVP = creditoRecebido - vp;
    r.faixaVP = r.tetoVP - piso;
    if (r.tetoVP <= piso) avisos.push("O comprador não tem folga para pagar ágio nesta taxa: o teto em valor presente não passa do piso.");
    const soma = parcelaAssumida * mesesAssumidos;
    if (saldoAssumido > 0 ? Math.abs(soma - saldoAssumido) > saldoAssumido * 0.01 : soma > 0) {
      avisos.push("Saldo assumido difere de parcela assumida × meses que faltam em mais de 1%: confira os números (o teto em valor presente usa parcela × meses; o teto pela soma simples usa o saldo).");
    }
  } else {
    avisos.push("Teto em valor presente não calculado: informe parcela assumida e meses que faltam.");
  }
  const limite = Number.isFinite(r.tetoVP) ? r.tetoVP : teto; // preço acima do limite conservador avisa
  if (precoVenda !== undefined) {
    const lucroBruto = Math.max(0, precoVenda - piso);
    const ir = lucroBruto * 0.15; // ganho de capital, 15% sobre o lucro
    Object.assign(r, { precoVenda, lucroBruto, ir, lucroLiquido: lucroBruto - ir });
    if (precoVenda > limite) avisos.push("Preço de venda acima do teto: comprador pagaria mais que financiar.");
    if (precoVenda < piso) avisos.push("Preço de venda abaixo do piso: a vendedora perde o que já pagou.");
  }
  avisos.push(
    "Taxa de transferência da Caixa e regras de cessão vêm do normativo (CCAN): sem fonte confirmada.",
    "Ágio é negociado em reais entre as partes; a transferência de cota é regulada pela Lei 11.795/2008, art. 13.",
    AVISO_IR,
    AVISO_CONTEMPLACAO,
  );
  return r;
}

// 5) Rendimento de fundo (CDI). irPct é parâmetro: tabela regressiva sem fonte confirmada.
export function rendimentoFundo({ valor, meses, cdiAnualPct, pctCdi = 99.53, irPct } = {}) {
  const avisos = [];
  const ok = [
    checa(avisos, "valor", valor),
    checa(avisos, "meses", meses, { estrito: true }),
    checa(avisos, "cdiAnualPct", cdiAnualPct),
    checa(avisos, "pctCdi", pctCdi),
    checa(avisos, "irPct", irPct),
  ].every(Boolean);
  if (!ok) return { valorFinalBruto: nan(), rendimentoBruto: nan(), ir: nan(), valorFinalLiquido: nan(), avisos };
  if (irPct > 100) { avisos.push("Entrada inválida: irPct não pode passar de 100."); return { valorFinalBruto: nan(), rendimentoBruto: nan(), ir: nan(), valorFinalLiquido: nan(), avisos }; }
  const taxaAnual = (cdiAnualPct / 100) * (pctCdi / 100);
  const valorFinalBruto = valor * Math.pow(1 + taxaAnual, meses / 12);
  const rendimentoBruto = valorFinalBruto - valor;
  const ir = rendimentoBruto * (irPct / 100);
  avisos.push("Alíquota de IR (tabela regressiva do fundo) e CDI futuro: sem fonte confirmada; são premissas editáveis. Rentabilidade passada não garante a futura.");
  return { valorFinalBruto, rendimentoBruto, ir, valorFinalLiquido: valorFinalBruto - ir, avisos };
}
