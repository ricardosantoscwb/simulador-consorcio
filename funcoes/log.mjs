// Registro anônimo de uso (ver nucleo/aprender.mjs). POST: qualquer usuário com sessão grava um evento.
// GET: só o admin lê (e baixa). Nada identifica a pessoa nem o cliente.
import { json, corpoJson, atualizar, pedidoValido } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
import { limparEvento, LIMITE_LOG } from "../nucleo/aprender.mjs";
const K = "dados/log";
export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return json({ ok: false }, 401);
  if (req.method === "GET") {
    if (!s.admin) return json({ ok: false }, 403);
    const eventos = (await atualizar(K, (d) => ({ resultado: Array.isArray(d) ? d : [] }))) || [];
    if (new URL(req.url).searchParams.get("baixar")) return new Response(JSON.stringify({ geradoEm: new Date().toISOString(), eventos }, null, 1), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="log-simulador.json"', "Cache-Control": "no-store" } });
    return json({ ok: true, eventos });
  }
  if (req.method !== "POST" || !pedidoValido(req)) return json({ ok: false }, 403);
  let d; try { d = await corpoJson(req, 2_000); } catch { return json({ ok: false }, 400); }
  const e = limparEvento(d);
  if (!e) return json({ ok: false }, 400);
  await atualizar(K, (v) => { const l = Array.isArray(v) ? v : []; l.push(e); return { novo: l.slice(-LIMITE_LOG), resultado: true }; });
  return json({ ok: true });
};
export const config = { path: "/api/log" };
