// INPC acumulado em 12 meses, da série 188 do Banco Central (SGS, variação mensal %).
// Formato do BCB: [{"data":"01/09/2026","valor":"0.82"}, ...]. Só lê o número; não inventa nenhum.
export const URL_BCB = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.188/dados/ultimos/12?formato=json";

/** Lê a série (12 meses seguidos) e devolve o acumulado em %. Lança erro se algo estiver fora do esperado. */
export function acumulado12(serie) {
  if (!Array.isArray(serie) || serie.length !== 12) throw new Error("inpc: a série deve ter 12 meses");
  let fator = 1, ant = null;
  for (const p of serie) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(p && p.data));
    const v = Number(String(p && p.valor).replace(",", "."));
    if (!m || !Number.isFinite(v) || v < -3 || v > 6) throw new Error("inpc: ponto inválido");
    const idx = Number(m[3]) * 12 + Number(m[2]) - 1;
    if (ant !== null && idx !== ant + 1) throw new Error("inpc: meses não consecutivos");
    ant = idx;
    fator *= 1 + v / 100;
  }
  const ult = serie[11].data.split("/");
  return { acum12: Math.round((fator - 1) * 1e6) / 1e4, ref: `${ult[2]}-${ult[1]}` }; // ex.: 4.29 (%) e "2026-09"
}

/** Busca no BCB com limite de tempo. `buscar` existe só para o teste trocar a rede. */
export async function buscarInpc(buscar = fetch) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await buscar(URL_BCB, { signal: ctl.signal, headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("inpc: BCB respondeu " + r.status);
    return acumulado12(await r.json());
  } finally { clearTimeout(t); }
}
