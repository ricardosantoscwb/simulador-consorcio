// Simulador de Consórcio · o básico que todas as rotas usam (portado da área do Estaleiro).
// Nada de segredo neste arquivo: o repositório é privado, mas a regra é tratar
// o código como se fosse lido por qualquer um.
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import nodemailer from "nodemailer";

// ── store ───────────────────────────────────────────────────────────────────
// Em produção é o Netlify Blobs. Nos testes, um Map em memória com a mesma cara.
let _store = null;
export function usarStore(s) { _store = s; }
export async function store() {
  if (_store) return _store;
  _store = getStore({ name: "simulador-consorcio", consistency: "strong" });
  return _store;
}
export async function ler(chave) {
  const s = await store();
  return (await s.get(chave, { type: "json" })) ?? null;
}
export async function gravar(chave, valor) {
  const s = await store();
  await s.setJSON(chave, valor);
}
export async function apagar(chave) {
  const s = await store();
  await s.delete(chave);
}
/** Lê com a etiqueta de versão (etag), pra gravar só se ninguém mexeu no meio. */
export async function lerComEtag(chave) {
  const s = await store();
  const r = await s.getWithMetadata(chave, { type: "json" });
  return r ? { dado: r.data ?? null, etag: r.etag || null } : { dado: null, etag: null };
}
export async function gravarSe(chave, valor, etag) {
  const s = await store();
  const r = await s.setJSON(chave, valor, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
  return !!(r && r.modified);
}
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
/**
 * Lê, muda e grava sem perder a mudança de outro pedido no meio.
 * fn(dado) devolve { novo, resultado } pra gravar, ou { resultado } pra só responder.
 * fn pode rodar mais de uma vez: nada de e-mail ou efeito lá dentro.
 */
export async function atualizar(chave, fn, tentativas = 5) {
  for (let i = 0; i < tentativas; i++) {
    const { dado, etag } = await lerComEtag(chave);
    const r = await fn(dado === null ? null : structuredClone(dado));
    if (!r || r.novo === undefined) return r ? r.resultado : undefined;
    if (await gravarSe(chave, r.novo, etag)) return r.resultado;
    await espera(15 + Math.random() * 60);
  }
  throw new Error("conflito");
}
/** Roda depois da resposta (Netlify: context.waitUntil); sem isso, espera. */
export async function emSegundoPlano(context, promessa) {
  const p = Promise.resolve(promessa).catch((e) => console.error("segundo plano:", e.message));
  if (context && typeof context.waitUntil === "function") { context.waitUntil(p); return; }
  await p;
}
export async function listar(prefixo) {
  const s = await store();
  const r = await s.list({ prefix: prefixo });
  return (r.blobs || []).map((b) => b.key);
}

/** Arquivo inteiro (os pedaços dos Documentos): grava e lê os bytes como vieram. */
export async function gravarBin(chave, bytes) {
  const s = await store();
  await s.set(chave, bytes);
}
export async function lerBin(chave) {
  const s = await store();
  const r = await s.get(chave, { type: "arrayBuffer" });
  return r ? new Uint8Array(r) : null;
}

// ── e-mail (injetável nos testes) ───────────────────────────────────────────
let _mailer = null;
export function usarMailer(m) { _mailer = m; }
/** html (opcional): vai junto com o texto (multipart), pra quem lê em HTML. */
export async function mandarEmail({ para, assunto, texto, html, responderPara }) {
  if (_mailer) return _mailer({ para, assunto, texto, html, responderPara });
  const user = process.env.GMAIL_USER || "estaleiro.ai@gmail.com";
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) throw new Error("GMAIL_APP_PASSWORD não configurada");
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  await t.sendMail({ from: `Simulador de Consórcio <${user}>`, to: para, subject: assunto, text: texto, ...(html ? { html } : {}), replyTo: responderPara || user });
}

// ── quem é da casa ──────────────────────────────────────────────────────────
export const EMAIL_CASA = "estaleiro.ai@gmail.com";
export function admins() {
  const extra = (process.env.ADMIN_EMAILS || "").split(",").map(normEmail).filter(Boolean);
  return new Set([EMAIL_CASA, ...extra]);
}
/** Quem pode entrar: a casa mais a lista USUARIOS (e-mails separados por vírgula). */
export function usuarios() {
  const lista = (process.env.USUARIOS || "").split(",").map(normEmail).filter(Boolean);
  return new Set([...admins(), ...lista]);
}

// ── utilidades ──────────────────────────────────────────────────────────────
export const agora = () => new Date();
let _relogio = null;
export function usarRelogio(f) { _relogio = f; }
export const hoje = () => (_relogio ? _relogio() : new Date());

export function sha(s) { return createHash("sha256").update(String(s)).digest("hex"); }
export function token(bytes = 32) { return randomBytes(bytes).toString("base64url"); }
export function codigoN(n = 6) { let c = ""; for (let i = 0; i < n; i++) c += String(randomInt(0, 10)); return c; }
export function iguais(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
export function normEmail(e) { return String(e || "").trim().toLowerCase(); }
export function emailValido(e) { return /^[^@\s<>"'\/\\,;:]+@[^@\s<>"'\/\\,;:]+\.[^@\s<>"'\/\\,;:]{2,}$/.test(e) && e.length <= 200; }
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function jsonParaScript(v) { return JSON.stringify(v).replace(/</g, "\\u003c").split("\u2028").join("\\u2028").split("\u2029").join("\\u2029"); }
export function slug(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";
}

// ── respostas ───────────────────────────────────────────────────────────────
const SEGURANCA = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'";

export function html(corpo, status = 200, extra = {}) {
  return new Response(corpo, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": CSP, ...SEGURANCA, ...extra } });
}
export function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...SEGURANCA, ...extra } });
}
/** Arquivo .txt pra baixar. nome: só letras, números, hífen e ponto. */
export function anexo(texto, nome) {
  const limpo = String(nome).replace(/[^A-Za-z0-9.-]/g, "") || "envio.txt";
  return new Response(texto, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${limpo}"`, ...SEGURANCA } });
}
/** Um documento da casa pra clínica: os cabeçalhos de segurança de sempre, mais os do documento. */
export function arquivo(corpo, cabecalhos) {
  return new Response(corpo, { status: 200, headers: { ...SEGURANCA, "Cache-Control": "private, no-store", ...cabecalhos } });
}
export function redirect(para, extra = {}) {
  return new Response(null, { status: 303, headers: { Location: para, ...SEGURANCA, ...extra } });
}

// ── pedido que muda alguma coisa: só da própria origem, só JSON ──────────────
// Formulário de outro site não consegue mandar JSON sem pedir licença ao
// navegador, e o Origin tem que bater com o nosso.
export function pedidoValido(req) {
  if (req.method !== "POST") return false;
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return false;
  const origem = req.headers.get("origin");
  const nossa = new URL(req.url).origin;
  return origem === nossa;
}
export async function corpoJson(req, limite = 300_000) {
  const txt = await req.text();
  if (txt.length > limite) throw new Error("grande demais");
  const d = JSON.parse(txt || "{}");
  if (!d || typeof d !== "object" || Array.isArray(d)) throw new Error("corpo");
  return d;
}

// ── cookie da sessão ────────────────────────────────────────────────────────
export const COOKIE = "__Host-consorcio";
export function lerCookie(req, nome = COOKIE) {
  const c = req.headers.get("cookie") || "";
  for (const parte of c.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) return v.join("=");
  }
  return null;
}
export function cookieSessao(valor, maxAgeSeg) {
  return `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeg}`;
}
export function cookieApaga(nome = COOKIE) { return `${nome}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }
// o código fica preso ao navegador que pediu: ninguém chuta nem queima o código de outro
export const COOKIE_PEND = "__Host-consorcio-pend";
export function cookiePend(valor) { return `${COOKIE_PEND}=${valor}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`; }

// ── de onde entrou (pro registro de acesso, sem guardar IP) ─────────────────
export function deOnde(req, context) {
  const g = context?.geo || {};
  const lugar = [g.city, g.subdivision?.code, g.country?.code].filter(Boolean).join(", ");
  const ua = req.headers.get("user-agent") || "";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "outro";
  const so = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "outro";
  return `${lugar || "lugar desconhecido"} · ${nav} no ${so}`;
}
