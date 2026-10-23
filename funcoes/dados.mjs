// Grupos compartilhados entre os usuários: GET lê, PUT grava (com etiqueta de versão).
import { json, corpoJson, lerComEtag, gravarSe, hoje } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
const K = "dados/grupos";
const CAMPOS = new Set(["id","cod","tipo","desc","ta","fr","cmin","cmax","pt","pr","parc","emax","lmin","lmed","lmax","assem","data","fonte","cs","cl","ct"]);
export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return json({ ok: false }, 401);
  if (req.method === "GET") { const { dado, etag } = await lerComEtag(K); return json({ ok: true, grupos: (dado && dado.grupos) || [], etag, quem: s.email }); }
  if (req.method !== "PUT" || !(req.headers.get("content-type") || "").includes("application/json") || req.headers.get("origin") !== new URL(req.url).origin) return json({ ok: false }, 403);
  let d; try { d = await corpoJson(req, 400_000); } catch { return json({ ok: false }, 400); }
  if (!Array.isArray(d.grupos) || d.grupos.length > 500) return json({ ok: false }, 400);
  const grupos = d.grupos.filter((g) => g && typeof g === "object").map((g) => Object.fromEntries(Object.entries(g).filter(([k, v]) => CAMPOS.has(k) && (typeof v === "string" ? v.length <= 300 : typeof v === "number" || v === null || v === ""))));
  const ok = await gravarSe(K, { grupos, por: s.email, em: hoje().toISOString() }, d.etag || null);
  if (!ok) { const { dado, etag } = await lerComEtag(K); return json({ ok: false, conflito: true, grupos: (dado && dado.grupos) || [], etag }, 409); }
  const { etag } = await lerComEtag(K);
  return json({ ok: true, etag });
};
export const config = { path: "/api/dados" };
