// Grupos e campanhas compartilhados entre os usuários: GET lê, PUT grava (com etiqueta de versão).
// Campanhas (códigos de convênio) só o admin altera; nada de dado de cliente aqui.
import { json, corpoJson, lerComEtag, gravarSe, hoje } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
const K = "dados/grupos";
const CAMPOS = new Set(["id","cod","tipo","desc","ta","fr","cmin","cmax","pt","pr","parc","emax","lmin","lmed","lmax","assem","data","fonte","cs","cl","ct","clf","np"]);
// h: histórico do lance por colagem mensal [{m:"2026-10", n:menor%, d:média%}], até 24 meses
const nOuNull = (x) => (typeof x === "number" && isFinite(x) ? x : null);
const limpaH = (v) => (Array.isArray(v) ? v.slice(-24).filter((x) => x && typeof x === "object" && /^\d{4}-\d{2}$/.test(x.m)).map((x) => ({ m: x.m, n: nOuNull(x.n), d: nOuNull(x.d) })) : []);
const TIPOS = ["Imobiliário", "Veículos Leves", "Veículos Pesados"];
const txt = (x, n) => (typeof x === "string" ? x.slice(0, n) : "");
const data = (x) => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : "");
const limpaC = (v) => (Array.isArray(v) ? v.slice(0, 30).filter((c) => c && typeof c === "object" && txt(c.cod, 30)).map((c) => ({
  cod: txt(c.cod, 30), nome: txt(c.nome, 60), tipos: Array.isArray(c.tipos) ? c.tipos.filter((t) => TIPOS.includes(t)) : [],
  cmin: nOuNull(c.cmin), cmax: nOuNull(c.cmax), emb: ["com", "sem", "ambos"].includes(c.emb) ? c.emb : "ambos",
  desc: nOuNull(c.desc), ta: nOuNull(c.ta), ini: data(c.ini), fim: data(c.fim),
})) : []);
const limpaConv = (v) => (Array.isArray(v) ? v.slice(0, 40).map((c) => ({ cod: txt(c && c.cod, 30).replace(/\D/g, ""), nome: txt(c && c.nome, 160) })).filter((c) => c.cod || c.nome) : []);
const lista = (dado, k) => (dado && Array.isArray(dado[k]) ? dado[k] : []);
export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return json({ ok: false }, 401);
  if (req.method === "GET") { const { dado, etag } = await lerComEtag(K); return json({ ok: true, grupos: lista(dado, "grupos"), campanhas: lista(dado, "campanhas"), convenios: lista(dado, "convenios"), etag, quem: s.email }); }
  if (req.method !== "PUT" || !(req.headers.get("content-type") || "").includes("application/json") || req.headers.get("origin") !== new URL(req.url).origin) return json({ ok: false }, 403);
  let d; try { d = await corpoJson(req, 400_000); } catch { return json({ ok: false }, 400); }
  if (!Array.isArray(d.grupos) || d.grupos.length > 500) return json({ ok: false }, 400);
  const grupos = d.grupos.filter((g) => g && typeof g === "object").map((g) => {
    const o = Object.fromEntries(Object.entries(g).filter(([k, v]) => CAMPOS.has(k) && (typeof v === "string" ? v.length <= 300 : typeof v === "number" || v === null || v === "")));
    if (g.h !== undefined) o.h = limpaH(g.h);
    return o;
  });
  const atual = await lerComEtag(K);
  const campanhas = s.admin && Array.isArray(d.campanhas) ? limpaC(d.campanhas) : lista(atual.dado, "campanhas"); // quem não é admin não mexe nas campanhas
  const convenios = s.admin && Array.isArray(d.convenios) ? limpaConv(d.convenios) : lista(atual.dado, "convenios");
  const ok = await gravarSe(K, { grupos, campanhas, convenios, por: s.email, em: hoje().toISOString() }, d.etag || null);
  if (!ok) { const { dado, etag } = await lerComEtag(K); return json({ ok: false, conflito: true, grupos: lista(dado, "grupos"), campanhas: lista(dado, "campanhas"), convenios: lista(dado, "convenios"), etag }, 409); }
  const { etag } = await lerComEtag(K);
  return json({ ok: true, etag });
};
export const config = { path: "/api/dados" };
