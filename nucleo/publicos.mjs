// Dados PÚBLICOS de referência (Banco Central, API SGS aberta; sem login, nada da Caixa).
// Guarda no Blobs, chave "publicos": { atualizadoEm, cdi, selic, taxaVeiculoPF }.
// FipeZap não tem API pública: preço de referência de imóvel/veículo é entrada manual no app.
import { ler, gravar, hoje } from "./base.mjs";

export const CHAVE = "publicos";
const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";
// Códigos confirmados no catálogo de dados abertos do BCB (dadosabertos.bcb.gov.br) e por consulta à API.
export const SERIES = {
  cdi: { codigo: 4389, nome: "CDI anualizada base 252 (% a.a.)", nota: "" },
  selic: { codigo: 432, nome: "Meta Selic definida pelo Copom (% a.a.)", nota: "" },
  taxaVeiculoPF: { codigo: 20749, nome: "Taxa média de juros, crédito livre, PF, aquisição de veículos (% a.a.)", nota: "Média do mercado (todas as instituições), não é taxa da Caixa. Sem fonte confirmada para taxa específica da Caixa." },
};
// Cada série tem 8 s; as três correm em paralelo (Promise.allSettled), então o total fica perto de 8 s
// e cabe com folga no limite de 30 s da função agendada da Netlify.
export const TIMEOUT_MS = 8_000;
const urlDe = (c) => `${BASE}.${c}/dados/ultimos/5?formato=json`;
const iso = (d) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d)); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };

/** Busca uma série e devolve o ponto de data mais recente. Erros viram mensagem curta (sem corpo da resposta). */
async function buscar(codigo, f, timeoutMs) {
  let r;
  try { r = await f(urlDe(codigo), { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "application/json" } }); }
  catch (e) { throw new Error(e?.name === "TimeoutError" ? "BCB: tempo esgotado" : "BCB: sem conexão"); }
  if (!r.ok) throw new Error(`BCB: HTTP ${r.status}`);
  let v; try { v = await r.json(); } catch { throw new Error("BCB: resposta inválida"); }
  const pts = (Array.isArray(v) ? v : []).map((p) => ({ data: iso(p && p.data), aaPct: Number(String(p && p.valor).replace(",", ".")) })).filter((p) => p.data && isFinite(p.aaPct));
  if (!pts.length) throw new Error("BCB: série vazia");
  pts.sort((a, b) => (a.data < b.data ? -1 : 1));
  return pts[pts.length - 1];
}

/** Atualiza as três séries em paralelo. Falha de uma não derruba as outras: mantém o último valor e anota `erro`. */
export async function atualizarPublicos(f = globalThis.fetch, { timeoutMs = TIMEOUT_MS } = {}) {
  const antes = (await ler(CHAVE)) || {};
  const novo = { atualizadoEm: antes.atualizadoEm || null };
  const itens = Object.entries(SERIES);
  const res = await Promise.allSettled(itens.map(([, s]) => buscar(s.codigo, f, timeoutMs)));
  let algum = false;
  itens.forEach(([k, s], idx) => {
    const url = urlDe(s.codigo);
    const base = { serie: s.codigo, nome: s.nome, url, ...(s.nota ? { nota: s.nota } : {}) };
    const o = res[idx];
    if (o.status === "fulfilled") {
      novo[k] = { aaPct: o.value.aaPct, data: o.value.data, ...base };
      algum = true;
    } else {
      const ant = antes[k] || {};
      novo[k] = { aaPct: ant.aaPct ?? null, data: ant.data ?? null, ...base, erro: o.reason?.message || "BCB: sem conexão", erroEm: hoje().toISOString() };
    }
  });
  if (algum) novo.atualizadoEm = hoje().toISOString();
  await gravar(CHAVE, novo);
  return novo;
}
export async function lerPublicos() { return (await ler(CHAVE)) || { vazio: true }; }
