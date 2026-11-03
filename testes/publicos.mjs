// Dados públicos do BCB: gravação, falha mantém o último valor, rota exige sessão. Roda: node testes/publicos.mjs
import assert from "node:assert/strict";
import { usarStore, usarMailer, COOKIE, COOKIE_PEND } from "../nucleo/base.mjs";
process.env.USUARIOS = "janaina@exemplo.com";
const mem = new Map(); let versao = 0;
usarStore({
  async get(k) { const x = mem.get(k); return x ? JSON.parse(x.v) : null; },
  async getWithMetadata(k) { const x = mem.get(k); return x ? { data: JSON.parse(x.v), etag: x.e, metadata: {} } : null; },
  async setJSON(k, v, o = {}) { const x = mem.get(k); if (o.onlyIfNew && x) return { modified: false }; if (o.onlyIfMatch && (!x || x.e !== o.onlyIfMatch)) return { modified: false }; const e = `e${++versao}`; mem.set(k, { v: JSON.stringify(v), e }); return { modified: true, etag: e }; },
  async delete(k) { mem.delete(k); },
  async list({ prefix }) { return { blobs: [...mem.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
});
const caixa = []; usarMailer(async (m) => { caixa.push(m); });
const { atualizarPublicos, TIMEOUT_MS } = await import("../nucleo/publicos.mjs");
const rota = (await import("../funcoes/publicos.mjs")).default;
const codigo = (await import("../funcoes/codigo.mjs")).default;
const entrar = (await import("../funcoes/entrar.mjs")).default;
const agendada = await import("../funcoes/publicos-agendada.mjs");

const O = "https://consorcio.estaleiro.co";
const cookies = {};
const jar = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
function guarda(res) { for (const c of res.headers.getSetCookie()) { const [kv, ...a] = c.split(";"); const [k, v] = kv.split("="); if (a.some((x) => x.trim() === "Max-Age=0")) delete cookies[k]; else cookies[k] = v; } }
const post = (u, d) => new Request(O + u, { method: "POST", headers: { "Content-Type": "application/json", Origin: O, Cookie: jar() }, body: JSON.stringify(d) });
const get = (u) => new Request(O + u, { headers: { Cookie: jar() } });
const ctx = { ip: "1.2.3.4", waitUntil: (p) => p };

const resp = (v, status = 200) => new Response(JSON.stringify(v), { status });
const bcb = {
  4389: [{ data: "28/10/2026", valor: "13.65" }, { data: "29/10/2026", valor: "13.65" }],
  432: [{ data: "04/11/2026", valor: "13.75" }, { data: "03/11/2026", valor: "13.75" }],
  20749: [{ data: "01/07/2026", valor: "26.52" }, { data: "01/08/2026", valor: "26.42" }],
};
const feliz = async (url) => resp(bcb[url.match(/sgs\.(\d+)\//)[1]]);

// 0. vazio
assert.equal((await rota(get("/api/publicos"))).status, 401);

// 1. gravação feliz (pega o ponto de data mais recente, mesmo fora de ordem)
let r = await atualizarPublicos(feliz);
assert.equal(r.cdi.aaPct, 13.65); assert.equal(r.cdi.data, "2026-10-29"); assert.equal(r.cdi.serie, 4389);
assert.equal(r.selic.data, "2026-11-04"); assert.equal(r.taxaVeiculoPF.aaPct, 26.42); assert.equal(r.taxaVeiculoPF.data, "2026-08-01");
assert.ok(r.taxaVeiculoPF.nota.includes("Caixa")); assert.ok(r.cdi.url.startsWith("https://api.bcb.gov.br/")); assert.ok(r.atualizadoEm); assert.ok(!r.cdi.erro);
const t1 = r.atualizadoEm;

// 2. BCB fora do ar: mantém o último valor e registra erro curto, sem corpo da resposta
r = await atualizarPublicos(async () => resp({ segredo: "CORPO-DO-ERRO" }, 503));
assert.equal(r.cdi.aaPct, 13.65); assert.equal(r.cdi.erro, "BCB: HTTP 503"); assert.equal(r.atualizadoEm, t1);
assert.ok(!JSON.stringify(r).includes("CORPO-DO-ERRO"));
// timeout / rede / lixo / série vazia
r = await atualizarPublicos(async () => { throw Object.assign(new Error("x https://segredo"), { name: "TimeoutError" }); }); assert.equal(r.cdi.erro, "BCB: tempo esgotado");
r = await atualizarPublicos(async () => { throw new Error("ECONNRESET https://segredo"); }); assert.equal(r.selic.erro, "BCB: sem conexão"); assert.ok(!JSON.stringify(r).includes("segredo"));
r = await atualizarPublicos(async () => new Response("<html>", { status: 200 })); assert.equal(r.cdi.erro, "BCB: resposta inválida");
r = await atualizarPublicos(async () => resp([])); assert.equal(r.cdi.erro, "BCB: série vazia"); assert.equal(r.cdi.aaPct, 13.65);
// falha parcial: só a Selic cai, o resto atualiza
r = await atualizarPublicos(async (u) => (u.includes("sgs.432/") ? resp({}, 500) : feliz(u)));
assert.equal(r.selic.erro, "BCB: HTTP 500"); assert.equal(r.selic.aaPct, 13.75); assert.ok(!r.cdi.erro);
// sem nada gravado antes e BCB fora: null, sem chute
mem.clear();
r = await atualizarPublicos(async () => resp({}, 500)); assert.equal(r.cdi.aaPct, null); assert.equal(r.atualizadoEm, null);
await atualizarPublicos(feliz);

// 2b. as três séries correm em PARALELO (todas iniciadas antes de qualquer resposta) e cada uma leva timeout de 8 s
assert.equal(TIMEOUT_MS, 8000);
{
  let voando = 0, pico = 0; const sinais = [];
  const lento = async (url, opts) => {
    sinais.push(opts && opts.signal);
    voando++; pico = Math.max(pico, voando);
    await new Promise((res) => setTimeout(res, 30));
    voando--; return feliz(url);
  };
  const t0 = Date.now(); r = await atualizarPublicos(lento);
  assert.equal(pico, 3, "as 3 buscas têm de estar em voo ao mesmo tempo");
  assert.ok(Date.now() - t0 < 85, "paralelo: tempo total ~ uma busca, não três");
  assert.equal(sinais.length, 3); assert.ok(sinais.every((x) => x instanceof AbortSignal), "cada busca leva um AbortSignal de timeout");
  assert.equal(r.cdi.aaPct, 13.65); assert.equal(r.selic.aaPct, 13.75); assert.equal(r.taxaVeiculoPF.aaPct, 26.42);
  // timeout real (sinal curto): uma série que trava falha sozinha e mantém o último valor; as outras atualizam
  const trava = (url, opts) => (url.includes("sgs.432/")
    ? new Promise((_, rej) => opts.signal.addEventListener("abort", () => rej(opts.signal.reason)))
    : feliz(url));
  const vivo = setInterval(() => {}, 10); // AbortSignal.timeout não segura o processo; o fetch real seguraria
  r = await atualizarPublicos(trava, { timeoutMs: 40 }); clearInterval(vivo);
  assert.equal(r.selic.erro, "BCB: tempo esgotado"); assert.equal(r.selic.aaPct, 13.75); assert.ok(!r.cdi.erro && !r.taxaVeiculoPF.erro);
}

// 3. rota: sem sessão 401; com sessão devolve o objeto
assert.equal((await rota(get("/api/publicos"))).status, 401);
r = await codigo(post("/api/codigo", { email: "janaina@exemplo.com" }), ctx); guarda(r);
const cod = caixa[0].assunto.match(/(\d{8})/)[1];
r = await entrar(post("/api/entrar", { email: "janaina@exemplo.com", codigo: cod }), ctx); guarda(r); assert.ok(cookies[COOKIE]);
r = await rota(get("/api/publicos")); assert.equal(r.status, 200); const j = await r.json();
assert.equal(j.cdi.aaPct, 13.65); assert.equal(j.taxaVeiculoPF.serie, 20749);
mem.delete("publicos"); r = await rota(get("/api/publicos")); assert.deepEqual(await r.json(), { vazio: true });
assert.equal(agendada.config.schedule, "0 9 * * *");
console.log("ok · publicos");
