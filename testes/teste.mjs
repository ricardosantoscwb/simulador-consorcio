// Fluxo inteiro com store em memória e e-mail capturado. Roda: npm test
import assert from "node:assert/strict";
import { usarStore, usarMailer, COOKIE, COOKIE_PEND } from "../nucleo/base.mjs";
process.env.MINIMO_MS = "0";
process.env.USUARIOS = "ricardo@exemplo.com, janaina@exemplo.com";
process.env.ADMIN_EMAILS = "ricardo@exemplo.com";

const mem = new Map(); let versao = 0;
usarStore({
  async get(k) { const x = mem.get(k); return x ? JSON.parse(x.v) : null; },
  async getWithMetadata(k) { const x = mem.get(k); return x ? { data: JSON.parse(x.v), etag: x.e, metadata: {} } : null; },
  async setJSON(k, v, o = {}) { const x = mem.get(k); if (o.onlyIfNew && x) return { modified: false }; if (o.onlyIfMatch && (!x || x.e !== o.onlyIfMatch)) return { modified: false }; const e = `e${++versao}`; mem.set(k, { v: JSON.stringify(v), e }); return { modified: true, etag: e }; },
  async delete(k) { mem.delete(k); },
  async list({ prefix }) { return { blobs: [...mem.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
});
const caixa = []; usarMailer(async (m) => { caixa.push(m); });

const codigo = (await import("../funcoes/codigo.mjs")).default;
const entrar = (await import("../funcoes/entrar.mjs")).default;
const app = (await import("../funcoes/app.mjs")).default;
const dados = (await import("../funcoes/dados.mjs")).default;
const sair = (await import("../funcoes/sair.mjs")).default;
const entrarPagina = (await import("../funcoes/entrar-pagina.mjs")).default;

const O = "https://consorcio.estaleiro.co";
const cookies = {};
const jar = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
function guarda(res) { for (const c of res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")].filter(Boolean)) { const [kv, ...attrs] = c.split(";"); const [k, v] = kv.split("="); if (attrs.some((a) => a.trim() === "Max-Age=0")) delete cookies[k]; else cookies[k] = v; } }
const post = (u, d, extra = {}) => new Request(O + u, { method: "POST", headers: { "Content-Type": "application/json", Origin: O, Cookie: jar(), ...extra }, body: JSON.stringify(d) });
const get = (u) => new Request(O + u, { headers: { Cookie: jar() } });
const ctx = { ip: "1.2.3.4", waitUntil: (p) => p };

// 1. sem sessão: / manda pra /entrar; /entrar abre
assert.equal((await app(get("/"))).status, 303);
const pe = await entrarPagina(get("/entrar")); assert.equal(pe.status, 200); assert.ok((await pe.text()).includes("Receber o código"));

// 2. e-mail não cadastrado: mesma resposta, sem e-mail
let r = await codigo(post("/api/codigo", { email: "fulano@exemplo.com" }), ctx); guarda(r); assert.equal(r.status, 200); assert.equal(caixa.length, 0);

// 3. pedido de outra origem é recusado
r = await codigo(new Request(O + "/api/codigo", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://outro.site" }, body: "{}" }), ctx); assert.equal(r.status, 403);

// 4. cadastrada: código chega e fica preso ao cookie de pedido
r = await codigo(post("/api/codigo", { email: "Janaina@Exemplo.com" }), ctx); guarda(r); assert.equal(r.status, 200); assert.equal(caixa.length, 1);
const cod = caixa[0].assunto.match(/(\d{8})/)[1]; assert.equal(caixa[0].para, "janaina@exemplo.com");

// 5. código errado 401; sem cookie de pedido 401; certo abre sessão
r = await entrar(post("/api/entrar", { email: "janaina@exemplo.com", codigo: "00000000" }), ctx); assert.equal(r.status, 401);
r = await entrar(post("/api/entrar", { email: "janaina@exemplo.com", codigo: cod }, { Cookie: "" }), ctx); assert.equal(r.status, 401);
r = await entrar(post("/api/entrar", { email: "janaina@exemplo.com", codigo: cod }), ctx); guarda(r); assert.equal(r.status, 200); assert.ok(cookies[COOKIE]); assert.ok(!cookies[COOKIE_PEND]);
// o mesmo código não entra duas vezes
r = await entrar(post("/api/entrar", { email: "janaina@exemplo.com", codigo: cod }), ctx); assert.equal(r.status, 401);

// 6. com sessão: / serve o app com a sessão colada; /entrar redireciona
r = await app(get("/")); assert.equal(r.status, 200); const h = await r.text(); assert.ok(h.includes('window.SESSAO={"email":"janaina@exemplo.com","admin":false}')); assert.ok(h.includes("Simulador de Consórcio"));
assert.equal((await entrarPagina(get("/entrar"))).status, 303);

// 7. dados: vazio, grava, conflito de versão
r = await dados(get("/api/dados")); let j = await r.json(); assert.deepEqual(j.grupos, []); assert.equal(j.etag, null);
r = await dados(new Request(O + "/api/dados", { method: "PUT", headers: { "Content-Type": "application/json", Origin: O, Cookie: jar() }, body: JSON.stringify({ grupos: [{ id: "g1", cod: "010016", ta: 14.75, fr: 3, evil: "x", "muito-longo": 1 }], etag: null }) })); j = await r.json(); assert.ok(j.ok && j.etag);
const e1 = j.etag;
r = await dados(get("/api/dados")); j = await r.json(); assert.deepEqual(j.grupos, [{ id: "g1", cod: "010016", ta: 14.75, fr: 3 }]);
r = await dados(new Request(O + "/api/dados", { method: "PUT", headers: { "Content-Type": "application/json", Origin: O, Cookie: jar() }, body: JSON.stringify({ grupos: [], etag: "velha" }) })); assert.equal(r.status, 409); j = await r.json(); assert.ok(j.conflito && j.etag === e1);
// participantes e histórico de lance passam; lixo no histórico é limpo
r = await dados(get("/api/dados")); j = await r.json();
r = await dados(new Request(O + "/api/dados", { method: "PUT", headers: { "Content-Type": "application/json", Origin: O, Cookie: jar() }, body: JSON.stringify({ grupos: [{ id: "g1", cod: "010016", np: 1000, clf: 2, h: [{ m: "2026-09", n: 61.1, d: 65, x: 1 }, { m: "ruim", n: 1 }, { m: "2026-10", n: "63", d: 66.2 }, "lixo"] }], etag: j.etag }) })); assert.ok((await r.json()).ok);
r = await dados(get("/api/dados")); j = await r.json(); assert.deepEqual(j.grupos, [{ id: "g1", cod: "010016", np: 1000, clf: 2, h: [{ m: "2026-09", n: 61.1, d: 65 }, { m: "2026-10", n: null, d: 66.2 }] }]);
// campanhas: quem não é admin não grava; grupos não apagam campanhas
r = await dados(get("/api/dados")); j = await r.json(); assert.deepEqual(j.campanhas, []);
r = await dados(new Request(O + "/api/dados", { method: "PUT", headers: { "Content-Type": "application/json", Origin: O, Cookie: jar() }, body: JSON.stringify({ grupos: j.grupos, campanhas: [{ cod: "123" }], etag: j.etag }) })); assert.ok((await r.json()).ok);
r = await dados(get("/api/dados")); j = await r.json(); assert.deepEqual(j.campanhas, [], "não-admin não grava campanha");
const etagDados = () => dados(get("/api/dados")).then((x) => x.json());
// sem sessão: 401
r = await dados(new Request(O + "/api/dados")); assert.equal(r.status, 401);

// 8. limite de tentativas: 3 erros matam o código
r = await codigo(post("/api/codigo", { email: "ricardo@exemplo.com" }), ctx); guarda(r); const cod2 = caixa[1].assunto.match(/(\d{8})/)[1];
for (let i = 0; i < 3; i++) await entrar(post("/api/entrar", { email: "ricardo@exemplo.com", codigo: "12345678" }), ctx);
r = await entrar(post("/api/entrar", { email: "ricardo@exemplo.com", codigo: cod2 }), ctx); assert.equal(r.status, 401);

// 9. sair apaga a sessão
r = await sair(post("/api/sair", {})); guarda(r); assert.ok(!cookies[COOKIE]);
assert.equal((await app(get("/"))).status, 303);

// 10. quem saiu da lista perde a sessão
r = await codigo(post("/api/codigo", { email: "janaina@exemplo.com" }), ctx); guarda(r); const cod3 = caixa.at(-1).assunto.match(/(\d{8})/)[1];
r = await entrar(post("/api/entrar", { email: "janaina@exemplo.com", codigo: cod3 }), ctx); guarda(r); assert.equal(r.status, 200);
process.env.USUARIOS = "ricardo@exemplo.com";
assert.equal((await app(get("/"))).status, 303);

console.log("ok · 10 blocos, e-mails capturados:", caixa.length);

// ── painel de usuários ────────────────────────────────────────────────────────
const admin = (await import("../funcoes/admin.mjs")).default;
process.env.USUARIOS = "ricardo@exemplo.com";
// janaina (não fixa) não entra antes de ser incluída
assert.equal((await app(get("/"))).status, 303);
r = await codigo(post("/api/codigo", { email: "maria@exemplo.com" }), ctx); guarda(r); assert.equal(caixa.length, 3, "não cadastrada: sem e-mail");
// admin entra
r = await codigo(post("/api/codigo", { email: "ricardo@exemplo.com" }), ctx); guarda(r); const c4 = caixa.at(-1).assunto.match(/(\d{8})/)[1];
r = await entrar(post("/api/entrar", { email: "ricardo@exemplo.com", codigo: c4 }), ctx); guarda(r); assert.equal(r.status, 200);
r = await admin(get("/admin")); assert.equal(r.status, 200); assert.ok((await r.text()).includes("Usuários"));
r = await admin(post("/api/usuarios", { acao: "incluir", email: "Maria@Exemplo.com", nome: "Maria" })); j = await r.json(); assert.ok(j.ok); assert.ok(j.usuarios.some((u) => u.email === "maria@exemplo.com" && u.ativo && !u.fixo));
r = await admin(post("/api/usuarios", { acao: "incluir", email: "ricardo@exemplo.com" })); assert.equal(r.status, 400);
// maria entra
const cookiesAdmin = { ...cookies }; for (const k in cookies) delete cookies[k];
r = await codigo(post("/api/codigo", { email: "maria@exemplo.com" }), ctx); guarda(r); const c5 = caixa.at(-1).assunto.match(/(\d{8})/)[1]; assert.equal(caixa.at(-1).para, "maria@exemplo.com");
r = await entrar(post("/api/entrar", { email: "maria@exemplo.com", codigo: c5 }), ctx); guarda(r); assert.equal(r.status, 200);
assert.equal((await app(get("/"))).status, 200);
assert.equal((await admin(get("/admin"))).status, 303, "maria não é admin");
const cookiesMaria = { ...cookies };
// admin pausa: maria perde a sessão; reativa: precisa de código novo; exclui
Object.assign(cookies, cookiesAdmin);
r = await admin(post("/api/usuarios", { acao: "pausar", email: "maria@exemplo.com" })); j = await r.json(); assert.ok(j.ok && j.usuarios.find((u) => u.email === "maria@exemplo.com").ativo === false);
for (const k in cookies) delete cookies[k]; Object.assign(cookies, cookiesMaria);
assert.equal((await app(get("/"))).status, 303, "pausada não entra");
const antes = caixa.length; r = await codigo(post("/api/codigo", { email: "maria@exemplo.com" }), ctx); assert.equal(caixa.length, antes, "pausada não recebe código");
for (const k in cookies) delete cookies[k]; Object.assign(cookies, cookiesAdmin);
r = await admin(post("/api/usuarios", { acao: "reativar", email: "maria@exemplo.com" })); j = await r.json(); assert.ok(j.ok);
r = await admin(post("/api/usuarios", { acao: "excluir", email: "maria@exemplo.com" })); j = await r.json(); assert.ok(j.ok && !j.usuarios.some((u) => u.email === "maria@exemplo.com"));
// não-admin não mexe na lista
for (const k in cookies) delete cookies[k];
r = await admin(post("/api/usuarios", { acao: "incluir", email: "x@exemplo.com" })); assert.equal(r.status, 303);
// admin grava campanha (limpa campos estranhos); grupos gravados depois preservam a campanha
for (const k in cookies) delete cookies[k]; Object.assign(cookies, cookiesAdmin);
j = await etagDados();
r = await dados(new Request(O + "/api/dados", { method: "PUT", headers: { "Content-Type": "application/json", Origin: O, Cookie: jar() }, body: JSON.stringify({ grupos: j.grupos, campanhas: [{ cod: "20262026000030", tipos: ["Imobiliário", "Lixo"], desc: 30, emb: "x", ini: "2026-10-29", fim: "2026-10-30", mal: 1 }], etag: j.etag }) })); assert.ok((await r.json()).ok);
j = await etagDados(); assert.deepEqual(j.campanhas, [{ cod: "20262026000030", nome: "", tipos: ["Imobiliário"], cmin: null, cmax: null, emb: "ambos", desc: 30, ta: null, ini: "2026-10-29", fim: "2026-10-30" }]);
r = await dados(new Request(O + "/api/dados", { method: "PUT", headers: { "Content-Type": "application/json", Origin: O, Cookie: jar() }, body: JSON.stringify({ grupos: [], etag: j.etag }) })); assert.ok((await r.json()).ok);
j = await etagDados(); assert.equal(j.campanhas.length, 1, "grupos sem campanhas no corpo preservam as campanhas");
console.log("ok · painel de usuários");
// alterar
for (const k in cookies) delete cookies[k]; Object.assign(cookies, cookiesAdmin);
r = await admin(post("/api/usuarios", { acao: "incluir", email: "ana@exemplo.com", nome: "Ana" })); assert.ok((await r.json()).ok);
r = await admin(post("/api/usuarios", { acao: "alterar", email: "ana@exemplo.com", novoEmail: "Ana2@Exemplo.com", nome: "Ana Dois" })); j = await r.json(); assert.ok(j.ok && j.usuarios.some((u) => u.email === "ana2@exemplo.com" && u.nome === "Ana Dois") && !j.usuarios.some((u) => u.email === "ana@exemplo.com"));
r = await admin(post("/api/usuarios", { acao: "alterar", email: "ana2@exemplo.com", novoEmail: "ricardo@exemplo.com" })); assert.equal(r.status, 400);
console.log("ok · alterar usuário");
