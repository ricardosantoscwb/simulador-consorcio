// Painel de usuários: só a casa (admin). GET /admin mostra; POST /api/usuarios muda.
import { html, json, redirect, pedidoValido, corpoJson, jsonParaScript } from "../nucleo/base.mjs";
import { sessaoDe, anularAcessoDoEmail } from "../nucleo/auth.mjs";
import { painel, incluir, ativar, excluir, alterar } from "../nucleo/usuarios.mjs";
import { paginaAdmin } from "../nucleo/paginas.mjs";

export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return redirect("/entrar");
  if (!s.admin) return redirect("/");
  const url = new URL(req.url);
  if (url.pathname === "/admin") return html(paginaAdmin(s.email));
  if (!pedidoValido(req)) return json({ ok: false }, 403);
  let d; try { d = await corpoJson(req, 4_000); } catch { return json({ ok: false }, 400); }
  let r = { ok: false, erro: "Ação desconhecida." };
  if (d.acao === "listar") r = { ok: true };
  else if (d.acao === "incluir") r = await incluir(d.email, d.nome, s.email);
  else if (d.acao === "pausar") { r = await ativar(d.email, false, s.email); if (r.ok) await anularAcessoDoEmail(d.email); }
  else if (d.acao === "reativar") r = await ativar(d.email, true, s.email);
  else if (d.acao === "alterar") { r = await alterar(d.email, d.novoEmail, d.nome, s.email); if (r.ok && r.trocouEmail) await anularAcessoDoEmail(d.email); }
  else if (d.acao === "excluir") { r = await excluir(d.email); if (r.ok) await anularAcessoDoEmail(d.email); }
  return json({ ...r, usuarios: await painel() }, r.ok ? 200 : 400);
};
export const config = { path: ["/admin", "/api/usuarios"] };
