// Taxa média de juros de financiamento por banco, do Banco Central (Olinda, serviço taxaJuros v2).
// É a média dos contratos de cada banco no período: não é a oferta ao cliente e não é o CET (sem tarifas, seguros, IOF).
const BASE = "https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/";
const MOD_VEIC = "Aquisição de veículos - Prefixado"; // série semanal, pessoa física
const MOD_IMOV = ["Financiamento imobiliário com taxas de mercado - Prefixado", "Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR"]; // série mensal
const q = (s) => encodeURIComponent(s);
export const URL_VEICULO = `${BASE}TaxasJurosDiariaPorInicioPeriodo?$top=200&$format=json&$orderby=${q("InicioPeriodo desc")}&$filter=${q(`Modalidade eq '${MOD_VEIC}' and Segmento eq 'PESSOA FÍSICA'`)}`;
export const URL_IMOVEL = `${BASE}TaxasJurosMensalPorMes?$top=100&$format=json&$orderby=${q("anoMes desc")}&$filter=${q(MOD_IMOV.map((m) => `Modalidade eq '${m}'`).join(" or "))}`;

const ok = (r) => r && typeof r.InstituicaoFinanceira === "string" && Number.isFinite(r.TaxaJurosAoAno) && r.TaxaJurosAoAno > 0 && r.TaxaJurosAoAno < 200;

/** Fica só com o período mais recente. Devolve { ref, lista:[{b, aa, m}] } ordenada da menor taxa para a maior. Lança erro se vier vazio. */
export function lerTaxas(rows, tipo) {
  if (!Array.isArray(rows)) throw new Error("taxas: resposta inesperada");
  const chave = (r) => (tipo === "veiculo" ? r.InicioPeriodo : r.anoMes);
  const bons = rows.filter(ok).filter((r) => chave(r));
  if (!bons.length) throw new Error("taxas: sem dados");
  const ult = bons.map(chave).sort().pop();
  const lista = bons.filter((r) => chave(r) === ult).map((r) => ({
    b: r.InstituicaoFinanceira.trim(), aa: Math.round(r.TaxaJurosAoAno * 100) / 100,
    m: tipo === "veiculo" ? "prefixado" : /TR$/.test(r.Modalidade) ? "TR" : "prefixado",
  })).sort((a, b) => a.aa - b.aa);
  const ref = tipo === "veiculo" ? ult : ult; // veículo: início da semana (AAAA-MM-DD); imóvel: AAAA-MM
  return { ref, lista };
}

/** Busca os dois tipos no BCB. `buscar` existe só para o teste trocar a rede. */
export async function buscarTaxas(buscar = fetch) {
  const um = async (url, tipo) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await buscar(url, { signal: ctl.signal, headers: { accept: "application/json" } });
      if (!r.ok) throw new Error("taxas: BCB respondeu " + r.status);
      return lerTaxas((await r.json()).value, tipo);
    } finally { clearTimeout(t); }
  };
  const [veiculo, imovel] = await Promise.all([um(URL_VEICULO, "veiculo"), um(URL_IMOVEL, "imovel")]);
  return { veiculo, imovel };
}
