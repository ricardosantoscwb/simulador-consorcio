// Quem pode entrar: a casa (ADMIN_EMAILS) e a lista USUARIOS da Netlify entram sempre;
// o resto é a lista do painel (Netlify Blobs), com incluir, pausar e excluir.
import { ler, atualizar, normEmail, emailValido, usuarios as fixos, admins, hoje } from "./base.mjs";
const K = "usuarios";
export const MAX = 500;

export async function lista() { return ((await ler(K)) || { lista: [] }).lista; }

/** { email, admin, fixo, ativo } | null */
export async function quemE(email) {
  const e = normEmail(email);
  if (!emailValido(e)) return null;
  if (fixos().has(e)) return { email: e, admin: admins().has(e), fixo: true, ativo: true };
  const u = (await lista()).find((x) => x.email === e);
  if (!u) return null;
  return { email: e, admin: false, fixo: false, ativo: !!u.ativo };
}

/** A lista inteira pro painel: fixos primeiro, depois os do painel. */
export async function painel() {
  const f = [...fixos()].map((email) => ({ email, admin: admins().has(email), fixo: true, ativo: true }));
  const l = (await lista()).filter((u) => !fixos().has(u.email)).map((u) => ({ ...u, admin: false, fixo: false }));
  return [...f, ...l];
}

export async function incluir(email, nome, por) {
  const e = normEmail(email);
  if (!emailValido(e)) return { ok: false, erro: "E-mail inválido." };
  if (fixos().has(e)) return { ok: false, erro: "Esse e-mail já entra pela configuração da Netlify." };
  return atualizar(K, (d) => {
    const l = (d && d.lista) || [];
    if (l.some((u) => u.email === e)) return { resultado: { ok: false, erro: "Já cadastrado." } };
    if (l.length >= MAX) return { resultado: { ok: false, erro: "Lista cheia." } };
    l.push({ email: e, nome: String(nome || "").slice(0, 80), ativo: true, desde: hoje().toISOString(), por });
    return { novo: { lista: l }, resultado: { ok: true } };
  });
}

export async function ativar(email, ativo, por) {
  const e = normEmail(email);
  return atualizar(K, (d) => {
    const l = (d && d.lista) || [];
    const u = l.find((x) => x.email === e);
    if (!u) return { resultado: { ok: false, erro: "Não encontrado." } };
    u.ativo = !!ativo; u.mudou = hoje().toISOString(); u.por = por;
    return { novo: { lista: l }, resultado: { ok: true } };
  });
}

export async function excluir(email) {
  const e = normEmail(email);
  return atualizar(K, (d) => {
    const l = ((d && d.lista) || []).filter((x) => x.email !== e);
    return { novo: { lista: l }, resultado: { ok: true } };
  });
}
