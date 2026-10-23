import { json, pedidoValido, corpoJson, cookieSessao, cookieApaga, deOnde, COOKIE_PEND, lerCookie } from "../nucleo/base.mjs";
import { conferirCodigo } from "../nucleo/auth.mjs";

const MINIMO_MS = process.env.MINIMO_MS !== undefined ? Number(process.env.MINIMO_MS) : 700;
const segura = (inicio) => new Promise((ok) => setTimeout(ok, Math.max(0, MINIMO_MS + Math.random() * 200 - (Date.now() - inicio))));

export default async (req, context) => {
  const inicio = Date.now();
  if (!pedidoValido(req)) return json({ ok: false }, 403);
  let d; try { d = await corpoJson(req, 2_000); } catch { return json({ ok: false }, 400); }
  const origem = context?.ip || req.headers.get("x-nf-client-connection-ip") || "";
  const r = await conferirCodigo(d.email, d.codigo, lerCookie(req, COOKIE_PEND), origem, deOnde(req, context));
  await segura(inicio);
  if (!r.ok) return json({ ok: false }, 401);
  const h = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  h.append("Set-Cookie", cookieSessao(r.token, r.dias * 86400));
  h.append("Set-Cookie", cookieApaga(COOKIE_PEND));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: h });
};
export const config = { path: "/api/entrar" };
