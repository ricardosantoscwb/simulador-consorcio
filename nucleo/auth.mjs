// Entrar sem senha: e-mail cadastrado + código que chega no e-mail.
// Portado da área do Estaleiro, enxuto: um tipo só de usuário (a lista USUARIOS).
// O código fica preso ao navegador que pediu (cookie de pedido): ninguém chuta
// nem queima o código de outra pessoa. Cada aparelho novo pede código.
import { ler, gravar, apagar, atualizar, listar, sha, token, codigoN, iguais, normEmail, emailValido, usuarios, admins, hoje, mandarEmail, lerCookie } from "./base.mjs";

export const CODIGO_MIN = 10;
export const CODIGO_TENTATIVAS = 3;
export const PEDIDOS_EMAIL_IP_15MIN = 5;
export const PEDIDOS_EMAIL_IP_DIA = 20;
export const PEDIDOS_EMAIL_DIA = 60;
export const PEDIDOS_IP_HORA = 20;
export const TENTATIVAS_IP_HORA = 30;
export const SESSAO_DIAS = 30;
export const DIGITOS = 8;

const kCodigo = (e, n) => `codigo/${sha(e)}/${sha(n)}`;
const kSessao = (t) => `sessao/${sha(t)}`;

/** Quem é esse e-mail: { email, admin } | null */
export function quemE(email) {
  const e = normEmail(email);
  if (!usuarios().has(e)) return null;
  return { email: e, admin: admins().has(e) };
}

/** Conta um evento numa janela. Devolve false se passou do limite. Atômico. */
export async function conta(chave, max, janelaMs) {
  const t = hoje().getTime();
  return atualizar(chave, (reg) => {
    const lista = ((reg && reg.t) || []).filter((x) => t - x < janelaMs);
    if (lista.length >= max) return { resultado: false };
    lista.push(t);
    return { novo: { t: lista }, resultado: true };
  }).catch(() => false);
}

/** Pede um código. Cadastrado ou não, a resposta é a mesma. */
export async function pedirCodigo(email, origem = "") {
  const e = normEmail(email);
  if (!emailValido(e)) return { ok: false, erro: "email" };
  const nonce = token(24);
  const nada = { ok: true, nonce, tarefa: null };
  if (!(await conta(`limite/ip/${sha(origem)}`, PEDIDOS_IP_HORA, 60 * 60e3))) return nada;
  const quem = quemE(e);
  if (!quem) return nada;
  if (!(await conta(`limite/email15/${sha(e)}/${sha(origem)}`, PEDIDOS_EMAIL_IP_15MIN, 15 * 60e3))) return nada;
  if (!(await conta(`limite/emaildia/${sha(e)}/${sha(origem)}`, PEDIDOS_EMAIL_IP_DIA, 24 * 60 * 60e3))) return nada;
  if (!(await conta(`limite/emailteto/${sha(e)}`, PEDIDOS_EMAIL_DIA, 24 * 60 * 60e3))) return nada;
  const cod = codigoN(DIGITOS);
  const tarefa = (async () => {
    await mandarEmail({
      para: e,
      assunto: `Seu código de acesso ao Simulador: ${cod}`,
      texto: `Seu código de acesso: ${cod}\n\nVale por ${CODIGO_MIN} minutos, só no aparelho onde você pediu.\nSe você não pediu este código, ignore este e-mail: ninguém entra sem ele.\n\nSimulador de Consórcio`,
      html: htmlCodigo(cod),
    });
    await gravar(kCodigo(e, nonce), { h: sha(`${e}:${nonce}:${cod}`), expira: hoje().getTime() + CODIGO_MIN * 60e3, erros: 0 });
  })();
  return { ok: true, nonce, tarefa };
}

/** Confere o código. Deu certo: cria a sessão e devolve o token do cookie. */
export async function conferirCodigo(email, cod, nonce, origem = "", lugar = "") {
  const e = normEmail(email);
  const c = String(cod || "").replace(/\D/g, "");
  if (!nonce || typeof nonce !== "string" || nonce.length > 100 || !emailValido(e) || c.length < 6 || c.length > 8) return { ok: false };
  if (!(await conta(`limite/entrarip/${sha(origem)}`, TENTATIVAS_IP_HORA, 60 * 60e3))) return { ok: false };
  const chave = kCodigo(e, nonce);
  let r;
  try {
    r = await atualizar(chave, (reg) => {
      if (!reg || reg.usado || hoje().getTime() > reg.expira || reg.erros >= CODIGO_TENTATIVAS) return { resultado: "nao" };
      if (iguais(reg.h, sha(`${e}:${nonce}:${c}`))) return { novo: { ...reg, usado: true }, resultado: "ok" };
      return { novo: { ...reg, erros: reg.erros + 1 }, resultado: "errado" };
    });
  } catch { r = "nao"; }
  if (r !== "ok") return { ok: false };
  await apagar(chave);
  const quem = quemE(e);
  if (!quem) return { ok: false };
  const tk = token(32);
  await gravar(kSessao(tk), { email: e, admin: quem.admin, criada: hoje().toISOString(), expira: hoje().getTime() + SESSAO_DIAS * 864e5, lugar });
  return { ok: true, token: tk, dias: SESSAO_DIAS };
}

export async function sessaoDe(req) {
  const t = lerCookie(req);
  if (!t || t.length < 20 || t.length > 100) return null;
  const s = await ler(kSessao(t));
  if (!s || hoje().getTime() > s.expira) return null;
  if (!usuarios().has(s.email)) return null; // saiu da lista: a sessão morre
  return { ...s, admin: admins().has(s.email), token: t };
}

export async function sair(req) {
  const t = lerCookie(req);
  if (t) await apagar(kSessao(t));
}

/** Anula códigos e sessões de um e-mail. */
export async function anularAcessoDoEmail(email) {
  const e = normEmail(email);
  for (const k of await listar(`codigo/${sha(e)}/`)) await apagar(k);
  for (const k of await listar("sessao/")) { const s = await ler(k); if (s && s.email === e) await apagar(k); }
}

export function htmlCodigo(cod) {
  const c = String(cod).replace(/\D/g, "");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seu código de acesso</title></head>
<body style="margin:0;padding:28px 16px;background:#f4f3ef;color:#1b2a2f;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:480px;margin:0 auto">
<p style="margin:0 0 20px;padding-bottom:14px;border-bottom:1px solid #e2e0d8;font-size:14px;letter-spacing:3px;color:#0f6e56">SIMULADOR DE CONSÓRCIO</p>
<p style="margin:0 0 8px;font-size:15px;color:#5d6b70">Seu código de acesso</p>
<p style="margin:0 0 20px;font-family:'Courier New',Courier,monospace;font-size:40px;line-height:1.1;font-weight:bold;letter-spacing:6px;color:#1b2a2f;user-select:all;-webkit-user-select:all">${c}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5">Digite este número na página de entrada. Vale por ${CODIGO_MIN} minutos, só no aparelho onde você pediu.</p>
<p style="margin:0;padding-top:14px;border-top:1px solid #e2e0d8;font-size:14px;line-height:1.5;color:#5d6b70">Se você não pediu este código, ignore este e-mail: ninguém entra sem ele.</p>
</div></body></html>`;
}
