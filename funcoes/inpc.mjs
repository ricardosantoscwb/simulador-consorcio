// INPC acumulado em 12 meses (BCB), guardado por 12 horas. Só quem tem sessão lê. Sem dado de cliente.
import { json, ler, gravar, hoje } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
import { buscarInpc } from "../nucleo/inpc.mjs";
const K = "dados/inpc", VALE_MS = 12 * 3600 * 1000;
export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return json({ ok: false }, 401);
  if (req.method !== "GET") return json({ ok: false }, 405);
  const cache = await ler(K);
  const agora = hoje().getTime();
  if (cache && cache.em && agora - new Date(cache.em).getTime() < VALE_MS) return json({ ok: true, acum12: cache.acum12, ref: cache.ref, fonte: "BCB SGS 188" });
  try {
    const n = await buscarInpc();
    await gravar(K, { ...n, em: new Date(agora).toISOString() });
    return json({ ok: true, ...n, fonte: "BCB SGS 188" });
  } catch {
    if (cache && cache.acum12 != null) return json({ ok: true, acum12: cache.acum12, ref: cache.ref, fonte: "BCB SGS 188", velho: true });
    return json({ ok: false }, 502);
  }
};
export const config = { path: "/api/inpc" };
