// Teste de fumaça do tipo "Menor valor / moto" (navegador). NÃO entra no npm test.
// Como rodar (na raiz do repo; precisa do Playwright já instalado, sem "playwright install"):
//   node testes/fumaca-menor-valor.mjs
// Carrega fontes/index.html por file:// (sem servidor: temServidor() = false, nada vai à rede),
// com window.SESSAO simulada (admin), cadastra grupos fictícios pelo formulário e confere 3 cenários:
//   1) R$ 20 mil líquido em "Menor valor / moto" gera plano só com grupos da faixa;
//   2) R$ 120 mil no mesmo tipo mostra o aviso de fora da faixa (e não monta plano);
//   3) os outros tipos (Veículo leve, Imóvel) seguem montando plano como antes.
// Extra: sem grupo na faixa avisa (não cai em todos os grupos); o link compartilhado leva tipo e teto.
// Os grupos abaixo são FICTÍCIOS (só para o teste; nada disso é dado da CAIXA).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/npm-tools/node_modules/playwright")); }

const URL_APP = "file://" + fileURLToPath(new URL("../fontes/index.html", import.meta.url));
const GRUPOS = [
  // cod, tipo, cmin, cmax, ta, fr, pr, parc, emax, lmin
  ["030001", "Veículos Leves", 15000, 45000, 19.5, 2.5, 70, 480, 30, 25],
  ["030002", "Veículos Leves", 20000, 80000, 19.5, 2.5, 75, 600, 30, 32],
  ["030003", "Veículos Leves", 90000, 180000, 19.5, 2.5, 80, 1500, 30, 20],
  ["010001", "Imobiliário", 100000, 500000, 20, 2.5, 150, 1800, 50, 35],
];
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).replace(/\s/g, " ");

const nb = (x) => x.replace(/\u00a0/g, " "); // o pt-BR formata "R$ 20.000" com espaço sem quebra
const browser = await chromium.launch();
const resultados = [];
const ok = (nome, extra = "") => { resultados.push(nome); console.log("OK  ", nome, extra); };
try {
  const ctx = await browser.newContext();
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.addInitScript(() => { window.SESSAO = { admin: true, email: "teste@exemplo.com" }; });
  await page.goto(URL_APP);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  assert.equal(await page.evaluate(() => temServidor()), false, "tem de rodar sem servidor");

  // grupos fictícios pelo formulário da tela Grupos
  await page.click('[data-go="grupos"]');
  await page.click("#btnDelExemplos");
  for (const [cod, tipo, cmin, cmax, ta, fr, pr, parc, emax, lmin] of GRUPOS) {
    await page.click("#btnNewGroup");
    await page.evaluate((v) => { for (const [k, x] of Object.entries(v)) document.querySelector("#g-" + k).value = String(x); },
      { cod, tipo, cmin, cmax, ta, fr, pr, parc, emax, lmin, fonte: "Fictício do teste de fumaça", data: "2026-11-02" }); // campos às vezes ficam em seção recolhida: grava direto
    await page.click("#btnSaveGroup");
  }
  assert.equal(await page.evaluate(() => S.grupos.length), GRUPOS.length);

  const pedir = async (chip, valor) => {
    await page.click('[data-go="estrategia"]');
    await page.click(`#e-tipo-chips .chip:text-is("${chip}")`);
    await page.fill("#e-valor", String(valor));
    await page.click("#e-go");
  };
  const oferta = () => page.evaluate(() => { renderOferta(); return $("#e-out").textContent.replace(/\u00a0/g, " "); });
  const busca = () => page.evaluate(() => { renderCotas(); return $("#c-busca").textContent.replace(/\u00a0/g, " "); });
  const estado = () => page.evaluate(() => ({ tipo: S.estr.tipo, menor: S.estr.menor, feito: !!S.estr.feito, buscaL: S.estr.buscaL, tela: document.querySelector(".screen.on").id }));
  const NOTA = "o portal não tem grupo próprio de moto (sem fonte confirmada); confirmar no MO se leves aceita moto";

  // 1) R$ 20 mil no menor valor: gera plano, só grupos da faixa, tipo continua Leves, nota da moto, avisos
  await pedir("Menor valor / moto", 20000);
  let e = await estado();
  assert.equal(e.tipo, "Veículos Leves"); assert.equal(e.menor, "1"); assert.ok(e.feito, "pedido deve avançar");
  let t = await oferta();
  assert.match(t, /Proposta · R\$ 20\.000 líquido/); assert.match(t, /Veículos Leves/);
  assert.ok(!/Fora da faixa/.test(t), "não deve avisar fora da faixa");
  assert.ok(e.buscaL.length > 0, "tem de haver cotas no plano");
  for (const l of e.buscaL) { assert.ok(l.carta <= 60000 + 0.5, `carta ${l.carta} acima do teto`); assert.ok(["030001", "030002"].includes(l.cod), "grupo fora da faixa: " + l.cod); }
  assert.ok(t.includes(NOTA), "nota da moto na proposta");
  assert.match(t, /sem garantia nem previsão/); assert.match(t, /teto escolhido pelo app, sem fonte confirmada/);
  let b = await busca();
  assert.match(b, /veículos leves/); assert.ok(b.includes(NOTA), "nota da moto na busca");
  ok("1) R$ 20 mil no menor valor gera plano", `(${e.buscaL.map((l) => `${l.n}x ${l.cod} ${brl(l.carta)}`).join(" + ")})`);

  // 2) R$ 120 mil no menor valor: aviso de fora da faixa, não avança, não monta plano
  await pedir("Menor valor / moto", 120000);
  e = await estado();
  assert.equal(e.tela, "s-estrategia", "não deve avançar fora da faixa");
  let av = nb(await page.textContent("#e-menor"));
  assert.match(av, /Fora da faixa de menor valor/); assert.match(av, /acima do teto de R\$ 60\.000/);
  t = await page.evaluate(() => { S.estr.feito = true; renderOferta(); return $("#e-out").textContent.replace(/\u00a0/g, " "); }); // como se viesse de um link
  assert.match(t, /Fora da faixa de menor valor/); assert.ok(!/Recomendada/.test(t)); assert.match(t, /sem garantia nem previsão/);
  b = await busca(); assert.match(b, /Fora da faixa de menor valor/);
  ok("2) R$ 120 mil no menor valor avisa fora da faixa", "(sem plano, sem erro de script)");

  // 3) outros tipos seguem iguais
  await pedir("Veículo leve", 120000);
  e = await estado(); assert.equal(e.menor, ""); assert.equal(e.tipo, "Veículos Leves"); assert.ok(e.feito);
  t = await oferta(); assert.match(t, /Proposta · R\$ 120\.000 líquido/); assert.ok(!/Fora da faixa/.test(t)); assert.ok(!t.includes(NOTA), "nota da moto só no menor valor");
  assert.ok(e.buscaL.length > 0 && e.buscaL.some((l) => l.carta > 60000), "Veículo leve usa a faixa inteira");
  await pedir("Imóvel", 200000);
  e = await estado(); assert.equal(e.tipo, "Imobiliário"); assert.equal(e.menor, "");
  t = await oferta(); assert.match(t, /Proposta · R\$ 200\.000 líquido/); assert.ok(e.buscaL.length > 0 && e.buscaL.every((l) => l.cod === "010001"));
  ok("3) Veículo leve (R$ 120 mil) e Imóvel (R$ 200 mil) montam plano como antes");

  // extra: teto editável sem grupo na faixa avisa e não cai em todos os grupos; link leva tipo e teto
  await page.click('[data-go="estrategia"]');
  await page.click('#e-tipo-chips .chip:text-is("Menor valor / moto")');
  await page.locator("#e-teto").evaluate((el) => { el.value = "10.000"; el.dispatchEvent(new Event("change")); });
  await page.fill("#e-valor", "5000");
  await page.click("#e-go");
  assert.equal((await estado()).tela, "s-estrategia");
  assert.match(nb(await page.textContent("#e-menor")), /Nenhum grupo de Veículos Leves cadastrado tem carta até R\$ 10\.000/);
  await page.locator("#e-teto").evaluate((el) => { el.value = "60.000"; el.dispatchEvent(new Event("change")); });
  await page.fill("#e-valor", "20000"); await page.click("#e-go");
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: (x) => { window.__clip = x; return Promise.resolve(); } }, configurable: true }); shareLink(); });
  await page.waitForFunction(() => window.__clip);
  const link = await page.evaluate(() => window.__clip);
  const d = JSON.parse(decodeURIComponent(escape(Buffer.from(link.split("#s=")[1], "base64").toString("binary"))));
  assert.equal(d.estr.menor, "1"); assert.equal(String(d.estr.teto), "60000"); assert.equal(d.estr.tipo, "Veículos Leves");
  const p2 = await ctx.newPage(); await p2.addInitScript(() => { window.SESSAO = { admin: true, email: "teste@exemplo.com" }; });
  await p2.goto(URL_APP + "#s=" + link.split("#s=")[1]);
  assert.equal(await p2.evaluate(() => S.estr.menor + "|" + S.estr.teto + "|" + S.estr.tipo), "1|60000|Veículos Leves");
  assert.match(nb(await p2.textContent("#e-out")), /Proposta · R\$ 20\.000 líquido/);
  ok("extra) sem grupo na faixa avisa; link compartilhado leva menor valor e teto");

  assert.deepEqual(erros, [], "erros de script na página: " + erros.join(" | "));
  console.log(`\n${resultados.length} verificações passaram.`);
} finally {
  await browser.close();
}
