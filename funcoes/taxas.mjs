// Taxas médias de financiamento (BCB), guardadas por 12 horas. Só quem tem sessão lê. Sem dado de cliente.
import { json, ler, gravar, hoje } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
import { buscarTaxas } from "../nucleo/taxas.mjs";
const K = "dados/taxas", VALE_MS = 12 * 3600 * 1000;
export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return json({ ok: false }, 401);
  if (req.method !== "GET") return json({ ok: false }, 405);
  const cache = await ler(K);
  const agora = hoje().getTime();
  if (cache && cache.em && agora - new Date(cache.em).getTime() < VALE_MS) return json({ ok: true, veiculo: cache.veiculo, imovel: cache.imovel, fonte: "BCB taxaJuros" });
  try {
    const n = await buscarTaxas();
    await gravar(K, { ...n, em: new Date(agora).toISOString() });
    return json({ ok: true, ...n, fonte: "BCB taxaJuros" });
  } catch {
    if (cache && cache.veiculo) return json({ ok: true, veiculo: cache.veiculo, imovel: cache.imovel, fonte: "BCB taxaJuros", velho: true });
    return json({ ok: false }, 502);
  }
};
export const config = { path: "/api/taxas" };
