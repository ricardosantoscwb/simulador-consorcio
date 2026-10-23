import { json, pedidoValido, corpoJson, cookiePend, emSegundoPlano } from "../nucleo/base.mjs";
import { pedirCodigo } from "../nucleo/auth.mjs";

// Tempo mínimo e e-mail em segundo plano: cadastrado ou não, mesma resposta no mesmo tempo.
const MINIMO_MS = process.env.MINIMO_MS !== undefined ? Number(process.env.MINIMO_MS) : 1200;
const segura = (inicio) => new Promise((ok) => setTimeout(ok, Math.max(0, MINIMO_MS + Math.random() * 300 - (Date.now() - inicio))));

export default async (req, context) => {
  const inicio = Date.now();
  if (!pedidoValido(req)) return json({ ok: false }, 403);
  let d; try { d = await corpoJson(req, 2_000); } catch { return json({ ok: false }, 400); }
  let r;
  try { r = await pedirCodigo(d.email, context?.ip || req.headers.get("x-nf-client-connection-ip") || ""); }
  catch (e) { console.error("codigo:", e.message); r = { ok: true, nonce: "x", tarefa: null }; }
  if (!r.ok) { await segura(inicio); return json({ ok: false }, 400); }
  if (r.tarefa) await emSegundoPlano(context, r.tarefa);
  await segura(inicio);
  return json({ ok: true }, 200, { "Set-Cookie": cookiePend(r.nonce) });
};
export const config = { path: "/api/codigo" };
