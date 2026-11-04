// Registro anônimo de uso, para o app aprender com o que acontece de verdade.
// Só faixas e categorias: nada de nome, e-mail, CPF, valor exato nem horário. O servidor
// faz a faixa (o valor exato nunca é gravado) e o dia vem do relógio do servidor.
import { hoje } from "./base.mjs";
const TIPOS = ["Imobiliário", "Veículos Leves", "Veículos Pesados"];
const EVENTOS = ["proposta", "usou", "resultado"];
const USOU = ["msg", "link", "pdf", "apresentar"];
const RESULTADO = ["fechou", "nao_fechou", "negociando"];
const num = (x) => (typeof x === "number" && isFinite(x) ? x : null);
const inteiro = (x, a, b) => { const n = num(x); return n != null && n >= a && n <= b ? Math.round(n) : null; };
/** Faixa do crédito líquido, em reais. */
export function faixaValor(v) {
  const n = num(v); if (n == null || n <= 0) return null;
  const f = [[50e3, "até 50 mil"], [100e3, "50 a 100 mil"], [150e3, "100 a 150 mil"], [250e3, "150 a 250 mil"], [500e3, "250 a 500 mil"]];
  for (const [lim, nome] of f) if (n < lim) return nome;
  return "acima de 500 mil";
}
const passo5 = (x) => { const n = num(x); return n == null || n < 0 || n > 100 ? null : Math.round(n / 5) * 5; };
/** Deixa passar só o que está na lista; o resto é descartado. Devolve null se não for evento válido. */
export function limparEvento(d) {
  if (!d || typeof d !== "object" || !EVENTOS.includes(d.ev)) return null;
  const sid = typeof d.sid === "string" && /^[a-z0-9]{8,24}$/.test(d.sid) ? d.sid : null;
  if (!sid) return null;
  const o = { dia: hoje().toISOString().slice(0, 10), sid, ev: d.ev };
  if (d.ev === "proposta") {
    o.tipo = TIPOS.includes(d.tipo) ? d.tipo : "qualquer";
    o.faixa = faixaValor(d.liq); o.lancePct = passo5(d.lancePct);
    o.cotas = inteiro(d.cotas, 1, 60); o.grupos = inteiro(d.grupos, 1, 20); o.mes = inteiro(d.mes, 1, 240);
    const i = num(d.inpc); o.inpc = i != null && i >= 0 && i <= 30 ? Math.round(i * 10) / 10 : null;
    o.reduzirMenor = d.rm === true; o.fin = d.fin === true; o.real = d.real === true;
    const c = num(d.dif); o.conf = c == null ? null : Math.abs(c) <= 1 ? "bate" : Math.abs(c) <= 5 ? "ate5" : "acima5";
  } else if (d.ev === "usou") { if (!USOU.includes(d.acao)) return null; o.acao = d.acao; }
  else { if (!RESULTADO.includes(d.res)) return null; o.res = d.res; }
  return o;
}
export const LIMITE_LOG = 3000;
/** Bloco do admin: quantos registros, resumo e botão para baixar. */
export function cardLog() {
  return `<div class="card">
<h1>Aprendizado do simulador</h1>
<p class="sub">Registro anônimo de uso: só faixas e categorias, sem nome, e-mail, CPF nem valor exato. Serve para trazer para a conversa e ajustar o app.</p>
<p><a class="btn" id="baixaLog" href="/api/log?baixar=1" download="log-simulador.json">Baixar log (JSON)</a></p>
<p class="msg" id="sitLog">Carregando…</p>
<script>(function(){fetch('/api/log').then(function(r){return r.json()}).then(function(j){var el=document.getElementById('sitLog');if(!j.ok){el.textContent='Sem acesso.';return}var c={};j.eventos.forEach(function(e){var k=e.ev==='resultado'?'resultado: '+e.res:e.ev;c[k]=(c[k]||0)+1});el.className='msg ok';el.textContent=j.eventos.length?j.eventos.length+' registros · '+Object.keys(c).sort().map(function(k){return k+' '+c[k]}).join(' · '):'Nenhum registro ainda.'}).catch(function(){document.getElementById('sitLog').textContent='Sem conexão.'})})();</script>
</div>`;
}
