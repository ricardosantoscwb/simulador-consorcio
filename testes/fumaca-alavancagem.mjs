// Teste de fumaça da tela "Alavancagem" (navegador). NÃO entra no npm test.
// Como rodar (na raiz do repo; precisa do Playwright já instalado, sem "playwright install"):
//   node testes/fumaca-alavancagem.mjs
// Roda `node build.mjs` antes (a tela usa as funções de nucleo/alavancagem.mjs coladas pelo build),
// grava o HTML gerado numa pasta temporária e abre por file:// (sem servidor: temServidor() = false,
// nada vai à rede) com window.SESSAO de gerente (não admin). Confere:
//   1) bloco 2: caso 040003 (crédito líquido 164.869, lance 32.974, 1 parcela de 5.692, depois 3.605 × 47)
//      mostra os 3 grandes bancos com o padrão editável, 4ª referência do BCB, aviso de reajuste (INPC) e o modo
//      imóvel (usa o TOTAL PAGO colado do simulador da Caixa, não Price; vazio = pede o total);
//   2) bloco 3: piso 38.666, teto conservador em valor presente (tetoVP) e teto pela soma simples, tabela de 3 preços
//      dentro de piso–tetoVP, "seu preço" 45.000 / 55.000 → líquido ≈ 5.384 / 13.884, avisos fixos, "sem folga",
//      divergência saldo × parcela × meses, imóvel sem taxa padrão ("Preencha a taxa");
//   3) bloco 4: fundo, CDI vindo de /api/publicos (simulado por aplicaPublicos), IR manual;
//   4) sem erro de script, sem rolagem lateral de 360 a 1440 px, alvos de toque >= 44 px, marcador não vaza;
//   5) valores persistem ao recarregar; o link compartilhado NÃO leva o que foi digitado à mão (sem nome de cliente);
//   6) com uma proposta montada, a tela puxa parcela e crédito dela (campos em verde) e o usuário pode editar;
//      o link leva só os campos puxados; um pedido novo zera os campos digitados à mão.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/npm-tools/node_modules/playwright")); }

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
execFileSync(process.execPath, ["build.mjs"], { cwd: RAIZ, stdio: "pipe" });
const { APP } = await import(new URL("../nucleo/app-html.mjs", import.meta.url) + "?t=" + Date.now());
const { consorcioXFinanciamento, agio, rendimentoFundo } = await import("../nucleo/alavancagem.mjs");
assert.ok(!APP.includes("__ALAVANCAGEM__"), "o marcador vazou para o HTML final");
const pasta = mkdtempSync(join(tmpdir(), "fumaca-alav-"));
writeFileSync(join(pasta, "index.html"), APP);
const URL_APP = "file://" + join(pasta, "index.html");

const GRUPOS = [ // FICTÍCIOS, só para o teste (cod, tipo, cmin, cmax, ta, fr, pr, parc, emax, lmin)
  ["030002", "Veículos Leves", 20000, 180000, 19.5, 2.5, 75, 600, 30, 32],
  ["010001", "Imobiliário", 100000, 500000, 20, 2.5, 150, 1800, 50, 35],
];
const nb = (x) => String(x).replace(/ /g, " ").replace(/\s+/g, " ").trim();
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).replace(/\s/g, " ");
const brl0 = (n) => nb(brl(n));
const browser = await chromium.launch();
const resultados = [];
const ok = (nome, extra = "") => { resultados.push(nome); console.log("OK  ", nome, extra); };
try {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|fonts\./.test(m.text())) erros.push("console: " + m.text()); });
  await page.addInitScript(() => { window.SESSAO = { admin: false, email: "gerente@exemplo.com" }; });
  await page.goto(URL_APP);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  assert.equal(await page.evaluate(() => temServidor()), false, "tem de rodar sem servidor");
  assert.equal(await page.evaluate(() => typeof aluguelXParcela + typeof agio + typeof rendimentoFundo), "functionfunctionfunction", "funções do núcleo no navegador");

  const abrirTela = async () => { await page.click('.bnav [data-go="alavanca"]'); assert.ok(await page.locator("#s-alavanca").isVisible(), "tela Alavancagem visível"); };
  const abrir = async (n) => { if (!(await page.locator(`#lv-d${n}`).evaluate((d) => d.open))) await page.click(`#lv-d${n} > summary`); };
  const dig = async (id, v) => { await page.fill("#lv-" + id, String(v)); await page.locator("#lv-" + id).blur(); };
  const txt = async (sel) => nb(await page.innerText(sel));
  await abrirTela();
  assert.match(await txt("#lv-b1"), /^—$/); // sem dados: nada inventado

  // ---- 1) bloco 2: caso 040003 ----
  await abrir(2);
  const entrada = { cred: 164869, lance: 32974, n: 1, p1: 5692, p2: 3605, m2: 47 };
  await dig("f_cred", "164.869"); await dig("f_lance", "32.974"); await dig("f_n", 1); await dig("f_p1", "5.692"); await dig("f_p2", "3.605"); await dig("f_m2", 47);
  assert.equal(await page.inputValue("#lv-f_prazo"), "60", "prazo padrão editável");
  assert.deepEqual(await Promise.all(["itau", "san", "bra"].map((k) => page.inputValue("#lv-f_tx_" + k))), ["27,50", "24,26", "22,81"]);
  for (const k of ["itau", "san", "bra"]) assert.ok(await page.locator("#lv-c-" + k).isVisible(), "coluna " + k);
  assert.ok(await page.locator("#lv-c-mkt").isHidden() && await page.locator("#lv-c-cx").isHidden(), "mercado e Caixa ocultos no veículo");
  const exp = (taxa) => consorcioXFinanciamento({ creditoLiquido: entrada.cred, lanceBolso: entrada.lance, parcelasAteContemplar: { meses: entrada.n, valor: entrada.p1 }, parcelaPos: entrada.p2, mesesPos: entrada.m2, taxaAnualFinanc: taxa, mesesFinanc: 60 });
  for (const [k, taxa] of [["itau", 27.5], ["san", 24.26], ["bra", 22.81]]) {
    const e = exp(taxa), t = await txt("#lv-fr-" + k);
    assert.ok(t.includes(brl0(e.custoFinanciamento)), `${k}: custo total ${brl0(e.custoFinanciamento)} em "${t}"`);
    assert.ok(t.includes(brl0(Math.abs(e.diferenca))), `${k}: diferença em R$ em "${t}"`);
    assert.ok(/abaixo em/.test(t) && /%/.test(t), `${k}: diferença em % em "${t}"`);
  }
  const e0 = exp(22.81);
  assert.ok(Math.abs(e0.custoConsorcio - (32974 + 5692 + 3605 * 47)) < 1);
  assert.equal(await txt("#lv-b2"), `${brl0(Math.abs(e0.diferenca))} a menos que financiar`); // vs o financiamento mais barato (Bradesco)
  assert.match(await txt("#lv-s2"), /Bradesco a 22,81% a\.a\., 60 meses/);
  assert.match(await txt("#lv-o2"), /Consórcio não tem contemplação garantida/);
  assert.match(await txt("#lv-fonte2"), /26\/08 a 01\/09\/2026, via iDinheiro\. É média de mercado, não a taxa do cliente/);
  // editar a taxa muda o resultado e fica guardado
  await dig("f_tx_itau", "30,5");
  assert.ok((await txt("#lv-fr-itau")).includes(brl0(exp(30.5).custoFinanciamento)));
  assert.equal(await page.evaluate(() => S.alav.f_tx_itau), "30,5");
  await dig("f_tx_itau", "27,50");
  // 4ª referência: média do BCB vinda de /api/publicos (simulada)
  await page.evaluate(() => aplicaPublicos({ cdi: { aaPct: 14.9, data: "2026-10-30" }, selic: { aaPct: 14.75, data: "2026-10-30" }, taxaVeiculoPF: { aaPct: 26.1, data: "2026-09-30", nota: "Média do mercado, não é taxa da Caixa." } }));
  assert.ok(await page.locator("#lv-c-mkt").isVisible());
  assert.match(await txt("#lv-c-mkt"), /Média do mercado.*26,1% a\.a\./);
  assert.ok((await txt("#lv-fr-mkt")).includes(brl0(exp(26.1).custoFinanciamento)));
  // avisos: reajuste anual das parcelas (INPC) e rótulo da taxa (veículo)
  assert.match(await txt("#lv-o2"), /Parcelas do consórcio são reajustadas anualmente \(INPC, não incluído\); financiamento comparado como prefixado/);
  assert.match(await txt("#lv-o2"), /médias do BCB por banco \(via iDinheiro\) ou média de mercado, não a taxa do cliente; imóvel: colada do simulador Caixa/);
  assert.ok(!/três maiores financiadores/.test(await txt("#s-alavanca")) && /três grandes bancos/.test(await txt("#lv-fonte2")));
  // imóvel: sem Price. Pede o TOTAL PAGO do simulador habitacional da Caixa (sem padrão); vazio = não compara
  await page.click('[data-lvchip="f_bem"][data-v="imovel"]');
  assert.ok(await page.locator("#lv-c-cx").isVisible() && await page.locator("#lv-c-itau").isHidden());
  assert.equal(await page.inputValue("#lv-f_total_cx"), "");
  assert.ok(await page.locator("#lv-w-prazo").isHidden(), "imóvel não usa prazo/taxa no bloco 2");
  assert.match(await txt("#lv-s2"), /Cole o total pago do simulador habitacional da Caixa \(Price subestima\/superestima: sem fonte confirmada\)/);
  assert.match(await txt("#lv-fr-cx"), /Cole o total pago do simulador habitacional da Caixa/);
  assert.equal(await txt("#lv-b2"), "—");
  await dig("f_total_cx", "300.000");
  const eImo = consorcioXFinanciamento({ creditoLiquido: entrada.cred, lanceBolso: entrada.lance, parcelasAteContemplar: { meses: 1, valor: 5692 }, parcelaPos: 3605, mesesPos: 47, totalPagoFinanc: 300000 });
  assert.ok((await txt("#lv-fr-cx")).includes(brl0(300000)) && (await txt("#lv-fr-cx")).includes(brl0(Math.abs(eImo.diferenca))));
  assert.equal(await txt("#lv-b2"), `${brl0(Math.abs(eImo.diferenca))} a menos que financiar`);
  assert.match(await txt("#lv-s2"), /total pago colado do simulador habitacional da Caixa/);
  assert.match(await txt("#lv-o2"), /SAC/); assert.match(await txt("#lv-o2"), /INPC, não incluído/);
  assert.ok(!/prefixado/.test(await txt("#lv-o2")), "imóvel não é comparado como prefixado");
  await dig("f_total_cx", "");
  assert.equal(await txt("#lv-b2"), "—");
  await dig("f_total_cx", "300.000");
  await page.click('[data-lvchip="f_bem"][data-v="veiculo"]');
  ok("1) bloco 2 mostra 3 bancos (padrão editável), média BCB, aviso INPC e modo imóvel por total pago", `(dominante: ${await txt("#lv-b2")})`);

  // ---- 2) bloco 3: ágio ----
  await abrir(3);
  await dig("g_lance", "32.974"); await dig("g_np", 1); await dig("g_vp", "5.692"); await dig("g_cred", "164.869"); await dig("g_saldo", "163.887"); await dig("g_prazo", 47);
  assert.equal(await page.inputValue("#lv-g_fin"), "bra");
  assert.match(await txt("#lv-s3"), /Preencha: parcela assumida/, "parcela assumida agora é obrigatória (entra no tetoVP)");
  await dig("g_parc", "3.487");
  const base3 = { lanceBolso: 32974, parcelasPagas: 1, valorParcelaPagas: 5692, creditoRecebido: 164869, saldoAssumido: 163887, parcelaAssumida: 3487, mesesAssumidos: 47, taxaAnualFinanc: 22.81, mesesFinanc: 60 };
  const r3 = agio(base3);
  assert.equal(Math.round(r3.piso), 38666);
  assert.ok(r3.tetoVP > r3.piso && r3.tetoVP < r3.teto);
  assert.match(await txt("#lv-b3"), new RegExp(`^R\\$ 38\\.666 a ${brl0(r3.tetoVP).replace(/[$.]/g, "\\$&")}$`)); // faixa vai do piso ao teto em VALOR PRESENTE
  let o3 = await txt("#lv-o3");
  assert.ok(o3.includes("Teto conservador (valor presente) " + brl0(r3.tetoVP)), "tetoVP na tela");
  assert.ok(o3.includes("Teto pela soma simples (superestima) " + brl0(r3.teto)), "teto nominal rotulado como superestimado");
  assert.match(o3, /O comprador paga o ágio à vista e as parcelas depois/);
  const linhas = await page.locator("#lv-o3 .lv-tb tbody tr").count();
  assert.equal(linhas, 3, "tabela com 3 preços");
  const t3 = await txt("#lv-o3 .lv-tb");
  assert.match(t3, /Rápido/); assert.match(t3, /Meio da faixa/); assert.match(t3, /Teto/); assert.match(t3, /teto conservador \(valor presente\)/);
  assert.match(t3, /margem escolhida pelo app, sem fonte confirmada/);
  assert.match(t3, /IR: ganho de capital 15% · sem fonte confirmada · pode haver isenção para venda de pequeno valor; confirmar com contador/, "cabeçalho do IR");
  const r100 = (x) => Math.round(x / 100) * 100, clamp = (x) => Math.round(Math.min(Math.max(x, r3.piso), r3.tetoVP));
  const precos = [clamp(r100(Math.min(r3.piso * 1.16, r3.piso + (r3.tetoVP - r3.piso) / 4))), clamp(r100((r3.piso + r3.tetoVP) / 2)), clamp(Math.floor(r3.tetoVP / 100) * 100)];
  assert.ok(precos[0] < precos[1] && precos[1] < precos[2] && precos[0] >= r3.piso && precos[2] <= r3.tetoVP, "3 preços distintos dentro de piso–tetoVP: " + precos);
  for (const p of precos) {
    const y = agio({ ...base3, precoVenda: p });
    assert.ok(t3.includes(brl0(p)) && t3.includes(brl0(y.lucroLiquido)) && t3.includes(brl0(y.ir)), `linha do preço ${p}`);
  }
  await dig("g_preco", "45.000");
  let meu = await txt("#lv-o3");
  assert.match(meu, /Seu preço: R\$ 45\.000/i); assert.match(meu, /Lucro bruto \(preço − piso\) R\$ 6\.334/); assert.match(meu, /IR 15% sobre o lucro R\$ 950/); assert.match(meu, /Lucro líquido R\$ 5\.384/);
  await dig("g_preco", "55.000");
  meu = await txt("#lv-o3");
  assert.match(meu, /Seu preço: R\$ 55\.000/i); assert.match(meu, /Lucro líquido R\$ 13\.884/); assert.match(meu, /IR 15% sobre o lucro R\$ 2\.450/);
  for (const re of [/sem fonte confirmada/, /11\.795/, /confirmar com contador/, /Ágio é negociado em reais/, /Consórcio não tem contemplação garantida/, /pode haver isenção para venda de pequeno valor/]) assert.match(meu, re);
  assert.ok(!/NaN/.test(meu));
  // outro banco na referência muda o teto
  await page.selectOption("#lv-g_fin", "itau");
  assert.match(await txt("#lv-s3"), /Itaú Unibanco a 27,5% a\.a\./);
  assert.ok((await txt("#lv-b3")).includes(brl0(agio({ ...base3, taxaAnualFinanc: 27.5 }).tetoVP)));
  await page.selectOption("#lv-g_fin", "bra");
  // parcela assumida alta: teto em valor presente não passa do piso → aviso claro, sem tabela de preços
  await dig("g_parc", "5.000");
  assert.equal(await txt("#lv-b3"), "Sem folga para ágio");
  assert.match(await txt("#lv-o3"), /o comprador não tem folga para pagar ágio nesta taxa/i);
  assert.equal(await page.locator("#lv-o3 .lv-tb").count(), 0);
  await dig("g_parc", "3.487");
  // saldo ≠ parcela × meses em mais de 1%: avisa
  await dig("g_saldo", "400.000");
  assert.match(await txt("#lv-o3"), /Saldo assumido difere de parcela assumida × meses que faltam em mais de 1%/);
  assert.match(await txt("#lv-o3"), /Teto pela soma simples abaixo do piso/);
  await dig("g_saldo", "163.887");
  assert.ok(!/difere de parcela assumida/.test(await txt("#lv-o3")));
  // imóvel: sem taxa padrão (não herda a do Bradesco veículo) até o gerente digitar/colar
  await page.click('[data-lvchip="f_bem"][data-v="imovel"]');
  assert.equal(await txt("#lv-b3"), "Preencha a taxa");
  assert.ok(await page.locator("#lv-g_fin").isHidden() && await page.locator("#lv-g_tx").isVisible());
  assert.equal(await page.inputValue("#lv-g_tx"), "");
  await dig("g_prazoFin", 360);
  await dig("g_tx", "11,2");
  const rImo = agio({ ...base3, taxaAnualFinanc: 11.2, mesesFinanc: 360 });
  assert.ok((await txt("#lv-b3")).includes(brl0(rImo.tetoVP)) || (await txt("#lv-b3")) === "Sem folga para ágio", await txt("#lv-b3"));
  assert.match(await txt("#lv-s3"), /Taxa informada \(imóvel\)|não passa do piso/);
  await dig("g_tx", ""); assert.equal(await txt("#lv-b3"), "Preencha a taxa");
  await dig("g_prazoFin", ""); await dig("g_tx", "");
  await page.click('[data-lvchip="f_bem"][data-v="veiculo"]');
  assert.equal(await page.inputValue("#lv-g_fin"), "bra");
  ok("2) bloco 3: piso 38.666, tetoVP, 3 preços em piso–tetoVP, líquido 5.384/13.884, sem folga, divergência e imóvel sem taxa padrão", `(faixa ${await txt("#lv-b3")}; soma simples ${brl0(r3.teto)})`);

  // ---- 3) bloco 4: fundo ----
  await abrir(4);
  assert.equal(await page.inputValue("#lv-h_pct"), "99,53");
  assert.equal(await page.inputValue("#lv-h_cdi"), "14,9", "CDI vem de /api/publicos");
  assert.match(await txt("#lv-h-cdi"), /Banco Central.*30\/10\/2026/);
  await dig("h_valor", "100.000"); await dig("h_meses", 12);
  assert.match(await txt("#lv-s4"), /sem IR: informe a alíquota/);
  await dig("h_cdi", "10"); await dig("h_ir", "15");
  const f4 = rendimentoFundo({ valor: 100000, meses: 12, cdiAnualPct: 10, pctCdi: 99.53, irPct: 15 });
  assert.equal(await txt("#lv-b4"), brl0(f4.valorFinalLiquido));
  const o4 = await txt("#lv-o4");
  assert.ok(o4.includes(brl0(f4.valorFinalBruto)) && o4.includes(brl0(f4.rendimentoBruto)) && o4.includes(brl0(f4.ir)), o4);
  assert.match(o4, /sem sem fonte confirmada|sem fonte confirmada/);
  assert.match(await txt("#s-alavanca"), /tabela do fundo: sem fonte confirmada/);
  assert.match(await txt("#s-alavanca"), /fonte: documento do fundo CAIXA Institucional Soberano RF Ref DI informado pelo gerente \(sem data\/link confirmados\); confirmar se o fundo é acessível a pessoa física/);
  assert.ok(!/PDF do fundo/.test(await txt("#s-alavanca")));
  ok("3) bloco 4: fundo com % do CDI 99,53, CDI do BCB e IR manual", `(${await txt("#lv-b4")})`);

  // bloco 1 (aluguel): números do teste unitário
  await abrir(1);
  await dig("a_valor", "300.000"); await dig("a_rend", "4,74"); await dig("a_desc", "10"); await dig("a_parc", "1.000");
  assert.match(await txt("#lv-b1"), /^\+ R\$ 67 por mês$/); assert.match(await txt("#lv-s1"), /cobre 106,7% da parcela de R\$ 1\.000/);
  assert.match(await txt("#lv-h1") + (await txt("#lv-o1")), /Rendimento de aluguel é premissa editável/);
  await dig("a_parc", "3.000"); assert.match(await txt("#lv-b1"), /^− R\$ 1\.93[34] por mês$/);
  await dig("a_parc", "1.000");
  assert.match(await txt("#s-alavanca"), /FipeZap Curitiba residencial 4,74% a\.a\., abr\/2026 · comercial 5,96%, mar\/2026; FipeZap não tem API, atualize à mão/);
  ok("extra) bloco 1: aluguel × parcela com saldo e cobertura");

  // ---- 4) avisos, rolagem lateral, alvos de toque, marcador ----
  const aviso = "Simulação estimada · não substitui a proposta oficial da administradora · não é recomendação de investimento";
  assert.ok((await txt("#s-alavanca .lv-avisos")).includes(aviso), "aviso de rodapé");
  for (const n of [1, 2, 3, 4]) await abrir(n);
  const medir = () => page.evaluate(() => {
    const W = document.documentElement.clientWidth, fora = [];
    for (const el of document.querySelectorAll("#s-alavanca *")) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (r.right > W + 0.5 || r.left < -0.5) fora.push(`${el.tagName}#${el.id || el.className}:${Math.round(r.left)}-${Math.round(r.right)}`);
    }
    const pequenos = [...document.querySelectorAll("#s-alavanca input, #s-alavanca select, #s-alavanca .chip, #s-alavanca summary")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 43.5).map((e) => e.id || e.className);
    return { W, sw: document.documentElement.scrollWidth, fora, pequenos };
  });
  for (const w of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    const m = await medir();
    assert.ok(m.sw <= m.W, `rolagem lateral em ${w}px: scrollWidth ${m.sw} > ${m.W}`);
    assert.deepEqual(m.fora, [], `elementos fora da tela em ${w}px: ${m.fora.slice(0, 5)}`);
    assert.deepEqual(m.pequenos, [], `alvos menores que 44px em ${w}px: ${m.pequenos}`);
  }
  // modo imóvel (total pago + taxa do ágio): mesmos limites de tela
  await page.click('[data-lvchip="f_bem"][data-v="imovel"]');
  for (const w of [360, 1024]) {
    await page.setViewportSize({ width: w, height: 900 });
    const m = await medir();
    assert.ok(m.sw <= m.W, `imóvel: rolagem lateral em ${w}px`); assert.deepEqual(m.fora, [], `imóvel: fora da tela em ${w}px`); assert.deepEqual(m.pequenos, [], `imóvel: alvos pequenos em ${w}px: ${m.pequenos}`);
  }
  await page.click('[data-lvchip="f_bem"][data-v="veiculo"]');
  // no desktop a navegação do topo também leva à tela
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.click('nav.tabs [data-go="estrategia"]'); assert.ok(await page.locator("#s-alavanca").isHidden());
  await page.click('nav.tabs [data-go="alavanca"]'); assert.ok(await page.locator("#s-alavanca").isVisible());
  assert.ok(!(await page.content()).includes("__ALAVANCAGEM__"), "marcador no DOM");
  await page.setViewportSize({ width: 360, height: 780 });
  ok("4) sem rolagem lateral de 360 a 1440 px, alvos >= 44 px, avisos no rodapé, marcador não vaza");

  // ---- 5) persistência e link ----
  await page.reload();
  await abrirTela();
  assert.equal(await page.inputValue("#lv-f_cred"), "164.869"); assert.equal(await page.inputValue("#lv-g_saldo"), "163.887"); assert.equal(await page.inputValue("#lv-h_cdi"), "10");
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: (x) => { window.__clip = x; return Promise.resolve(); } }, configurable: true }); S.estr.nome = "Fulano de Tal"; shareLink(); });
  await page.waitForFunction(() => window.__clip);
  const link = await page.evaluate(() => window.__clip);
  const d = JSON.parse(decodeURIComponent(escape(Buffer.from(link.split("#s=")[1], "base64").toString("binary"))));
  assert.equal(d.estr.nome, "", "nome do cliente fora do link");
  assert.ok(!/Fulano/.test(link) && !/Fulano/.test(JSON.stringify(d)));
  // nada digitado à mão na Alavancagem vai no link (números de outro cliente)
  const manuais = JSON.stringify(d.alav);
  for (const v of ["164869", "163887", "55000", "32974", "5692", "3487", "300000", "10"]) assert.ok(!manuais.includes(`"${v}"`), `valor manual ${v} vazou no link: ${manuais}`);
  for (const k of ["f_cred", "g_preco", "g_saldo", "h_cdi", "f_total_cx", "g_tx", "a_valor"]) assert.ok(!(k in d.alav), `campo manual ${k} no link`);
  assert.deepEqual(Object.keys(d.alav).filter((k) => k !== "_auto").sort(), Object.keys(d.alav._auto).sort(), "o link leva só campos puxados automaticamente");
  // quem abre o link (outro aparelho: contexto novo, sem localStorage) não recebe números do outro cliente
  const ctx2 = await browser.newContext({ viewport: { width: 360, height: 780 } }); await ctx2.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p2 = await ctx2.newPage(); await p2.addInitScript(() => { window.SESSAO = { admin: false, email: "gerente@exemplo.com" }; });
  await p2.goto(URL_APP + "#s=" + link.split("#s=")[1]);
  assert.match(await p2.innerText("#toast"), /Caminhos carregados do link/, "o link foi de fato carregado");
  assert.equal(await p2.evaluate(() => [S.alav.f_cred, S.alav.g_preco, S.alav.g_saldo, S.alav.h_valor].join("|")), "|||", "quem abre o link não vê números do outro cliente");
  assert.equal(await p2.evaluate(() => S.grupos.length), await page.evaluate(() => S.grupos.length), "os grupos vão no link");
  await ctx2.close();
  ok("5) valores persistem ao recarregar; o link não leva nada digitado à mão nem o nome do cliente");

  // ---- 6) puxa a parcela da proposta atual ----
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  // sessão de gerente não cadastra grupos pela tela: grava direto o que o portal traria
  await page.evaluate((gs) => {
    S.grupos = gs.map(([cod, tipo, cmin, cmax, ta, fr, pr, parc, emax, lmin]) => ({ id: "G" + cod, cod, tipo, desc: "", ta, fr, cmin, cmax, pt: "", pr, parc, emax, lmin, lmed: "", lmax: "", assem: "", data: "2026-11-02", fonte: "Fictício do teste de fumaça" }));
    save();
  }, GRUPOS);
  await page.reload();
  const pedir = async (chip, valor) => { await page.click('.bnav [data-go="estrategia"]'); await page.click(`#e-tipo-chips .chip:text-is("${chip}")`); await page.fill("#e-valor", String(valor)); await page.click("#e-go"); };
  await pedir("Imóvel", 200000);
  await page.evaluate(() => renderOferta());
  const B = await page.evaluate(() => S.estr.bestSum);
  assert.ok(B && B.tipo === "Imobiliário" && B.liq > 0 && B.p2 > 0 && B.mes >= 1, "proposta guarda o resumo para a Alavancagem: " + JSON.stringify(B));
  await abrirTela();
  const c2 = (x) => Math.round(x * 100) / 100;
  const val = async (id) => Number((await page.inputValue("#lv-" + id)).replace(/\./g, "").replace(",", "."));
  assert.equal(await val("a_parc"), c2(B.p2)); assert.ok(await page.locator("#lv-a_parc").evaluate((e) => e.classList.contains("lv-auto")), "campo verde");
  assert.equal(await val("f_cred"), c2(B.liq)); assert.equal(await val("f_lance"), c2(B.bolso)); assert.equal(await val("f_p1"), c2(B.p1)); assert.equal(await val("f_p2"), c2(B.p2));
  await abrir(2);
  assert.ok(await page.locator("#lv-c-cx").isVisible() && await page.locator("#lv-c-itau").isHidden(), "proposta de imóvel abre o modo imóvel");
  await abrir(1); await dig("a_valor", "400.000"); await dig("a_rend", "4,74");
  assert.match(await txt("#lv-b1"), /^[+−] R\$ [\d.]+ por mês$/);
  // editar à mão vence a proposta (enquanto o pedido é o mesmo)
  await dig("a_parc", "2.000");
  await page.evaluate(() => renderOferta());
  await abrirTela();
  assert.equal(await val("a_parc"), 2000, "edição manual não é sobrescrita pela mesma proposta");
  // o link leva só o que foi puxado da proposta: crédito sim; valor do imóvel e a parcela editada à mão, não
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: (x) => { window.__clip = x; return Promise.resolve(); } }, configurable: true }); window.__clip = null; shareLink(); });
  await page.waitForFunction(() => window.__clip);
  const link6 = await page.evaluate(() => window.__clip);
  const d6 = JSON.parse(decodeURIComponent(escape(Buffer.from(link6.split("#s=")[1], "base64").toString("binary"))));
  assert.equal(d6.alav.f_cred, String(c2(B.liq)), "campo puxado vai no link"); assert.ok(!("a_valor" in d6.alav) && !("a_parc" in d6.alav), "campos digitados à mão ficam fora do link: " + JSON.stringify(d6.alav));
  // pedido novo zera os campos digitados à mão (valor do imóvel, parcela editada, preço de venda, fundo...) e mantém premissas de mercado
  await dig("a_rend", "4,74"); await abrir(3); await dig("g_preco", "50.000"); await abrir(4); await dig("h_valor", "100.000");
  await pedir("Veículo leve", 120000);
  assert.equal(await page.evaluate(() => [S.alav.a_valor, S.alav.a_parc, S.alav.g_preco, S.alav.h_valor, S.alav.f_total_cx, S.alav.g_tx].join("|")), "|||||", "pedido novo zera os campos manuais");
  assert.equal(await page.evaluate(() => S.alav.a_rend), "4,74", "premissa de mercado (rendimento do aluguel) fica");
  await page.evaluate(() => renderOferta());
  const B2 = await page.evaluate(() => S.estr.bestSum);
  assert.equal(B2.tipo, "Veículos Leves");
  await abrirTela(); await abrir(2);
  assert.equal(await val("f_cred"), c2(B2.liq), "crédito segue a proposta nova");
  assert.ok(await page.locator("#lv-c-itau").isVisible() && await page.locator("#lv-c-bra").isVisible(), "veículo volta aos 3 financiadores");
  assert.equal(await page.inputValue("#lv-f_prazo"), "60");
  await abrir(2);
  assert.ok(!/NaN/.test(await txt("#s-alavanca")));
  ok("6) com proposta montada a tela puxa crédito, lance e parcelas; edição manual vence; link só com o puxado; pedido novo zera o manual", `(proposta veículo: crédito ${brl0(B2.liq)}, parcela depois ${brl0(B2.p2)} × ${B2.pm})`);

  assert.deepEqual(erros, [], "erros de script na página: " + erros.join(" | "));
  ok("nenhum erro de script");
  console.log(`\n${resultados.length} verificações passaram.`);
} finally {
  await browser.close();
}
