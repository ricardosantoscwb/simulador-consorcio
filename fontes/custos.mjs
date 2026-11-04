// Motor de custo (puro, sem DOM). O teste importa este arquivo; o build cola o mesmo texto no app.
// Hipóteses (nenhuma é promessa): reajuste anual pelo INPC na AGO do grupo; seguro prestamista
// proporcional ao saldo (cai com o lance e com as parcelas); sem juros no consórcio (saldo = taxas + fundo).
// Conferido com a planilha do Ricardo de 03/11/2026 (grupo 30066): ver testes/custos.mjs.

/** Meses até o próximo reajuste: a posição do grupo (prazo total − restante) sobe de 12 em 12. */
export const agoDe = (prazoTotal, restante) => {
  if (!(prazoTotal > 0) || !(restante > 0) || restante > prazoTotal) return null;
  const pos = prazoTotal - restante;
  return (Math.floor(pos / 12) + 1) * 12 - pos;
};

/** Fator acumulado do reajuste na parcela número t (t = 1 é a próxima). Sem data de AGO: supõe 12 meses. */
export const fatorAGO = (t, ago, inpc) => {
  const a = ago > 0 ? ago : 12;
  return t >= a ? Math.pow(1 + (inpc || 0), Math.floor((t - a) / 12) + 1) : 1;
};

/** Valor presente de um fluxo mensal pela inflação (mesma régua do INPC): "valores de hoje". */
export const emValorDeHoje = (valor, t, inpc) => valor * Math.pow(1 + (inpc || 0), -t / 12);

/**
 * Projeta o que UMA cota custa do início ao fim.
 *  M          mês estimado da contemplação          N        meses de parcela depois dela
 *  parcPre    parcela mensal até contemplar (como no sistema, com seguro)
 *  bolso      lance do bolso (R$ de hoje)           saldoApos saldo a pagar depois do lance, sem seguro
 *  taxaSeg    seguro por mês ÷ saldo (fração)       credito  crédito líquido que o cliente recebe (R$ de hoje)
 *  ago, inpc  reajuste                              entrada  custos de entrada (0 se não houver)
 *  segFixo    true = seguro não cai (como a projeção do sistema); padrão: cai com o saldo
 */
export function projetar({ M, N, parcPre, bolso, saldoApos, taxaSeg = 0, credito = 0, ago = null, inpc = 0, entrada = 0, segFixo = false }) {
  const f = (t) => fatorAGO(t, ago, inpc);
  const base = N > 0 ? saldoApos / N : 0;
  const seg0 = taxaSeg * saldoApos;
  const pag = [0]; // pag[t] = parcela do mês t, já reajustada
  for (let t = 1; t <= M; t++) pag.push(parcPre * f(t));
  let seguroPos = 0;
  for (let j = 1; j <= N; j++) {
    const s = segFixo ? seg0 : (seg0 * (N - j + 1)) / N;
    seguroPos += s * f(M + j);
    pag.push((base + s) * f(M + j));
  }
  const lance = bolso * f(M);
  const creditoM = credito * f(M); // o crédito também é reajustado na AGO
  const soPre = pag.slice(1, M + 1).reduce((a, b) => a + b, 0);
  const soPos = pag.slice(M + 1).reduce((a, b) => a + b, 0);
  const total = entrada + soPre + lance + soPos;
  let vp = entrada + emValorDeHoje(lance, M, inpc);
  for (let t = 1; t < pag.length; t++) vp += emValorDeHoje(pag[t], t, inpc);
  const vpCredito = emValorDeHoje(creditoM, M, inpc);
  // fluxo do cliente (+ recebe, − paga) para o custo efetivo ao ano
  const fluxo = pag.map((v) => -v);
  fluxo[0] = -entrada;
  fluxo[M] += creditoM - lance;
  return {
    total, soPre, lance, soPos, seguroPos, creditoM,
    custoCredito: total - creditoM,            // quanto sai a mais que o crédito recebido
    porReal: creditoM > 0 ? total / creditoM : null, // R$ pagos por R$ 1 de crédito
    vp, vpCredito, custoCreditoHoje: vp - vpCredito,
    parcela1: N > 0 ? pag[M + 1] : 0, meses: M + N,
    custoAno: custoEfetivoAno(fluxo),
    fluxo,
  };
}

/** Soma de projeções (várias cotas/grupos); cada item multiplica por n. Custo ao ano refeito no fluxo somado. */
export function somar(itens) {
  const r = { total: 0, soPre: 0, lance: 0, soPos: 0, seguroPos: 0, creditoM: 0, custoCredito: 0, vp: 0, vpCredito: 0, custoCreditoHoje: 0, parcela1: 0, meses: 0 };
  const L = Math.max(0, ...itens.map(([p]) => p.fluxo.length));
  const fluxo = new Array(L).fill(0);
  for (const [p, n] of itens) {
    for (const k of ["total", "soPre", "lance", "soPos", "seguroPos", "creditoM", "custoCredito", "vp", "vpCredito", "custoCreditoHoje", "parcela1"]) r[k] += p[k] * n;
    r.meses = Math.max(r.meses, p.meses);
    p.fluxo.forEach((v, t) => { fluxo[t] += v * n; });
  }
  r.porReal = r.creditoM > 0 ? r.total / r.creditoM : null;
  r.custoAno = custoEfetivoAno(fluxo);
  r.fluxo = fluxo;
  return r;
}

/** Custo efetivo ao ano (TIR) de um fluxo mensal; null se não houver taxa. Procura a menor taxa ≥ −2% ao mês. */
export function custoEfetivoAno(fluxo) {
  const vp = (r) => { let s = 0; for (let t = 0; t < fluxo.length; t++) s += fluxo[t] / Math.pow(1 + r, t); return s; };
  let a = -0.02, fa = vp(a);
  for (let r = -0.02 + 0.0005; r <= 0.6; r += 0.0005) {
    const fr = vp(r);
    if (fa < 0 && fr >= 0) { // troca de sinal: refina por bissecção
      let lo = r - 0.0005, hi = r;
      for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; (vp(m) < 0 ? (lo = m) : (hi = m)); }
      return Math.pow(1 + (lo + hi) / 2, 12) - 1;
    }
    if (fa >= 0 && fr < 0) { // sinal invertido: fluxo de aplicação, não de crédito
      return null;
    }
    a = r; fa = fr;
  }
  return null;
}

/** Financiamento de `valor` a CET `cetAA` (fração ao ano) em `meses`. sistema: "price" ou "sac". */
export function financiar({ valor, cetAA, meses, sistema = "price", inpc = 0 }) {
  if (!(valor > 0) || !(meses >= 1) || !(cetAA >= 0)) return null;
  const i = Math.pow(1 + cetAA, 1 / 12) - 1;
  const parcelas = [];
  if (sistema === "sac") {
    const am = valor / meses;
    for (let k = 1; k <= meses; k++) parcelas.push(am + (valor - am * (k - 1)) * i);
  } else {
    const p = i > 0 ? (valor * i) / (1 - Math.pow(1 + i, -meses)) : valor / meses;
    for (let k = 1; k <= meses; k++) parcelas.push(p);
  }
  const total = parcelas.reduce((a, b) => a + b, 0);
  let vp = 0;
  parcelas.forEach((v, k) => { vp += emValorDeHoje(v, k + 1, inpc); });
  return { parcelas, parcela1: parcelas[0], parcelaN: parcelas[meses - 1], total, custo: total - valor, vp, custoHoje: vp - valor, meses, custoAno: cetAA, sistema };
}

/**
 * Cenários de lance de um plano: quanto sai do bolso se cada grupo exigir o menor, a média ou o maior lance
 * contemplado na última assembleia (histórico do grupo, não previsão). itens: [{k cotas, carta, emb %, lmin, lmed, lmax %}].
 * Devolve null no nível em que algum grupo não tem o dado.
 */
export function cenariosLance(itens) {
  const nivel = (campo) => {
    let s = 0, ok = 0, n = 0;
    for (const i of itens) { n += i.k; const x = i[campo]; if (!(x > 0)) continue; s += (i.k * Math.max(0, x - (i.emb || 0)) / 100) * i.carta; ok += i.k; }
    return n > 0 && ok === n ? s : null;
  };
  return { ousado: nivel("lmin"), central: nivel("lmed"), conservador: nivel("lmax") };
}
