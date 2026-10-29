// Grupos compartilhados entre os usuários: GET lê, PUT grava (com etiqueta de versão).
import { json, corpoJson, lerComEtag, gravarSe, hoje } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
const K = "dados/grupos";
const CAMPOS = new Set(["id","cod","tipo","desc","ta","fr","cmin","cmax","pt","pr","parc","emax","lmin","lmed","lmax","assem","data","fonte","cs","cl","ct","clf","np"]);
// h: histórico do lance por colagem mensal [{m:"2026-10", n:menor%, d:média%}], até 24 meses
const nOuNull = (x) => (typeof x === "number" && isFinite(x) ? x : null);
const limpaH = (v) => (Array.isArray(v) ? v.slice(-24).filter((x) => x && typeof x === "object" && /^\d{4}-\d{2}$/.test(x.m)).map((x) => ({ m: x.m, n: nOuNull(x.n), d: nOuNull(x.d) })) : []);
export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return json({ ok: false }, 401);
  if (req.method === "GET") { const { dado, etag } = await lerComEtag(K); return json({ ok: true, grupos: (dado && dado.grupos) || [], etag, quem: s.email }); }
  if (req.method !== "PUT" || !(req.headers.get("content-type") || "").includes("application/json") || req.headers.get("origin") !== new URL(req.url).origin) return json({ ok: false }, 403);
  let d; try { d = await corpoJson(req, 400_000); } catch { return json({ ok: false }, 400); }
  if (!Array.isArray(d.grupos) || d.grupos.length > 500) return json({ ok: false }, 400);
  const grupos = d.grupos.filter((g) => g && typeof g === "object").map((g) => {
    const o = Object.fromEntries(Object.entries(g).filter(([k, v]) => CAMPOS.has(k) && (typeof v === "string" ? v.length <= 300 : typeof v === "number" || v === null || v === "")));
    if (g.h !== undefined) o.h = limpaH(g.h);
    return o;
  });
  const ok = await gravarSe(K, { grupos, por: s.email, em: hoje().toISOString() }, d.etag || null);
  if (!ok) { const { dado, etag } = await lerComEtag(K); return json({ ok: false, conflito: true, grupos: (dado && dado.grupos) || [], etag }, 409); }
  const { etag } = await lerComEtag(K);
  return json({ ok: true, etag });
};
export const config = { path: "/api/dados" };
