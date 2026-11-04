import { esc, EMAIL_CASA } from "./base.mjs";

const CSS = `:root{--bg:#fff;--card:#fff;--surface:#f6f6f5;--ink:#121212;--ink-2:#4a4a48;--muted:#6b6b68;--line:#e6e6e3;--line-2:#cfcfcb;--accent:#0b6b52;--accent-soft:#eaf3ef;--warn:#a2401a;--warn-soft:#fbf1ec;--ok:#0b6b52;--font:"Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 var(--font);-webkit-font-smoothing:antialiased}
button,input{font:inherit;color:inherit}
main{max-width:440px;margin:0 auto;padding:clamp(32px,10vh,96px) 20px 64px}main.wide{max-width:980px}
.brand{display:flex;align-items:center;gap:12px;font-weight:600;margin-bottom:clamp(28px,6vh,56px)}.brand .dot{width:32px;height:32px;border-radius:9px;background:var(--ink);display:grid;place-items:center;color:#fff;font-size:15px}.brand small{display:block;font-weight:400;color:var(--muted);font-size:12px}
.card{background:var(--card);border:0;border-top:1px solid var(--line);padding:28px 0 0;margin-top:24px}.brand+.card{border-top:0;padding-top:0;margin-top:0}
h1{font-size:clamp(28px,5vw,40px);margin:0 0 8px;font-weight:600;letter-spacing:-.035em;line-height:1.1}.sub{color:var(--muted);font-size:15px;margin:0 0 24px;max-width:56ch}.sub a{color:var(--ink)}
label{display:block;font-size:13px;color:var(--ink-2);font-weight:500;margin-bottom:6px}
input{width:100%;min-height:52px;padding:12px 14px;border:1px solid var(--line-2);background:#fff;border-radius:12px;outline:0;transition:border-color .15s}input:focus{border-color:var(--ink);box-shadow:0 0 0 3px rgba(18,18,18,.08)}
.btn{min-height:44px;border:1px solid var(--line-2);background:#fff;padding:0 18px;border-radius:999px;cursor:pointer;font-weight:500;margin-top:12px;transition:border-color .15s,transform .15s}.btn:hover{border-color:var(--ink)}.btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.btn.primary{background:var(--ink);border-color:var(--ink);color:#fff;width:100%;min-height:52px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}.btn.primary:hover{background:#000}.btn.t{background:transparent;border-color:transparent;color:var(--muted);padding-left:0}.btn:disabled{opacity:.5;cursor:default}
.msg{font-size:14px;margin:12px 0 0;min-height:20px}.msg.erro{color:var(--warn)}.msg.ok{color:var(--ok)}
.why{font-size:13px;color:var(--muted);margin-top:24px;line-height:1.55;max-width:64ch}.why b{color:var(--ink-2)}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:12px}th,td{text-align:left;padding:14px 8px 14px 0;border-bottom:1px solid var(--line);vertical-align:middle}th{font-size:12px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:.06em}
.tag{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2);white-space:nowrap}.tag::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent)}.tag.warn::before{background:var(--warn)}.tag.muted::before{background:var(--line-2)}
.acoes{display:flex;gap:6px;flex-wrap:wrap}.acoes button{margin:0;min-height:36px;padding:0 14px;font-size:13px}
.row{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end}.row .btn.primary{width:auto;margin:0;padding:0 24px}@media(max-width:700px){.row{grid-template-columns:1fr}.row .btn.primary{width:100%}th:nth-child(2),td:nth-child(2){display:none}}
#codigo{font-family:ui-monospace,Menlo,monospace;font-size:28px;letter-spacing:6px;text-align:center}[hidden]{display:none!important}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}`;

const topo = (titulo) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet"><title>${esc(titulo)}</title><style>${CSS}</style></head><body><main>
<div class="brand"><div class="dot">∑</div><div>Simulador de Consórcio<small>acesso restrito</small></div></div>`;

export function paginaEntrar() {
  return `${topo("Entrar · Simulador de Consórcio")}
<div class="card">
<h1>Entrar</h1><p class="sub">Use o e-mail cadastrado. Um código de 8 dígitos chega nele.</p>
<form id="f1" autocomplete="on"><label for="email">E-mail</label>
<input id="email" name="email" type="email" inputmode="email" autocomplete="email" required>
<button class="btn primary" type="submit" id="b1">Receber o código</button></form>
<form id="f2" hidden><p class="sub" id="pra-quem"></p><label for="codigo">Código</label>
<input id="codigo" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9 ]*" required>
<button class="btn primary" type="submit" id="b2">Entrar</button>
<button class="btn t" type="button" id="b-outro">Pedir outro código</button>
<button class="btn t" type="button" id="volta">Trocar o e-mail</button></form>
<p class="msg" id="msg" role="status" aria-live="polite"></p>
<div class="why">Não chegou? Olhe no spam e na aba Promoções. Quem envia é ${esc(EMAIL_CASA)}. O código vale 10 minutos e só neste aparelho.</div>
</div>
<script>
(function(){
  var f1=document.getElementById('f1'),f2=document.getElementById('f2'),msg=document.getElementById('msg'),email='';
  function diz(t,c){msg.textContent=t;msg.className='msg '+(c||'')}
  function post(u,d){return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})}
  f1.addEventListener('submit',function(e){e.preventDefault();email=document.getElementById('email').value.trim();
    var b=document.getElementById('b1');b.disabled=true;diz('Enviando…');
    post('/api/codigo',{email:email}).then(function(r){b.disabled=false;
      if(r.status===400){diz('Confira o e-mail.','erro');return}
      f1.hidden=true;f2.hidden=false;document.getElementById('codigo').focus();
      document.getElementById('pra-quem').textContent='Código pedido para '+email+'.';
      diz('Se esse e-mail estiver cadastrado, o código chega em instantes.','ok')
    }).catch(function(){b.disabled=false;diz('Sem conexão. Tente de novo.','erro')})});
  f2.addEventListener('submit',function(e){e.preventDefault();var b=document.getElementById('b2');b.disabled=true;diz('Conferindo…');
    post('/api/entrar',{email:email,codigo:document.getElementById('codigo').value}).then(function(r){return r.json().then(function(j){return{r:r,j:j}})})
    .then(function(x){b.disabled=false;if(x.r.ok&&x.j.ok){location.href='/';return}
      diz('Código errado ou vencido. Confira, ou peça outro.','erro')}).catch(function(){b.disabled=false;diz('Sem conexão. Tente de novo.','erro')})});
  document.getElementById('volta').addEventListener('click',function(){f2.hidden=true;f1.hidden=false;diz('')});
  var bo=document.getElementById('b-outro');
  bo.addEventListener('click',function(){bo.disabled=true;diz('Pedindo outro código…');
    post('/api/codigo',{email:email}).then(function(r){
      if(r.status===400){diz('Confira o e-mail.','erro');bo.disabled=false;return}
      diz('Pedimos outro código para '+email+'. Use o do e-mail mais novo.','ok');
      var n=30;bo.textContent='Pedir outro código ('+n+' s)';var t=setInterval(function(){n--;if(n<=0){clearInterval(t);bo.disabled=false;bo.textContent='Pedir outro código'}else bo.textContent='Pedir outro código ('+n+' s)'},1000)
    }).catch(function(){bo.disabled=false;diz('Sem conexão. Tente de novo.','erro')})});
})();
</script></main></body></html>`;
}

export function paginaAdmin(quem, extra = "") { // extra: bloco do app (o módulo de usuários segue portável)
  return `${topo("Usuários · Simulador de Consórcio").replace("<main>", '<main class="wide">')}
<div class="card">
<h1>Usuários</h1><p class="sub">Quem pode entrar no simulador. Pausado não entra e perde a sessão na hora. Você está como ${esc(quem)}. <a href="/">Voltar ao simulador</a></p>
<form id="f" class="row"><div><label for="email">E-mail</label><input id="email" type="email" inputmode="email" required></div><div><label for="nome">Nome (opcional)</label><input id="nome" maxlength="80"></div><button class="btn primary" type="submit" style="margin:0">Incluir</button></form>
<p class="msg" id="msg" role="status" aria-live="polite"></p>
<table><thead><tr><th>E-mail</th><th>Nome</th><th>Situação</th><th></th></tr></thead><tbody id="lista"><tr><td colspan="4">Carregando…</td></tr></tbody></table>
<div class="why">Os e-mails marcados como <b>fixo</b> vêm da configuração da Netlify (ADMIN_EMAILS e USUARIOS) e não se pausam por aqui. Excluir apaga o cadastro; pausar mantém o histórico e dá pra reativar; alterar troca e-mail ou nome (trocar o e-mail encerra a sessão atual da pessoa).</div>
</div>
${extra}
<script>
(function(){
  var msg=document.getElementById('msg'),lista=document.getElementById('lista');
  function diz(t,c){msg.textContent=t;msg.className='msg '+(c||'')}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function post(d){return fetch('/api/usuarios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(function(r){return r.json()})}
  function mostra(us){lista.innerHTML=us.map(function(u){var sit=u.fixo?'<span class="tag muted">fixo'+(u.admin?' · admin':'')+'</span>':(u.ativo?'<span class="tag">ativo</span>':'<span class="tag warn">pausado</span>');
    var ac=u.fixo?'':'<span class="acoes">'+(u.ativo?'<button class="btn" data-a="pausar" data-e="'+esc(u.email)+'">Pausar</button>':'<button class="btn" data-a="reativar" data-e="'+esc(u.email)+'">Reativar</button>')+'<button class="btn" data-a="alterar" data-e="'+esc(u.email)+'" data-n="'+esc(u.nome||'')+'">Alterar</button><button class="btn" data-a="excluir" data-e="'+esc(u.email)+'">Excluir</button></span>';
    return '<tr><td>'+esc(u.email)+'</td><td>'+esc(u.nome||'')+'</td><td>'+sit+'</td><td>'+ac+'</td></tr>'}).join('')||'<tr><td colspan="4">Ninguém ainda.</td></tr>'}
  function carrega(){post({acao:'listar'}).then(function(j){if(j.usuarios)mostra(j.usuarios)}).catch(function(){diz('Sem conexão.','erro')})}
  document.getElementById('f').addEventListener('submit',function(e){e.preventDefault();diz('Incluindo…');
    post({acao:'incluir',email:document.getElementById('email').value.trim(),nome:document.getElementById('nome').value.trim()}).then(function(j){if(j.usuarios)mostra(j.usuarios);if(j.ok){diz('Incluído. A pessoa já pode pedir o código em /entrar.','ok');document.getElementById('f').reset()}else diz(j.erro||'Não deu.','erro')}).catch(function(){diz('Sem conexão.','erro')})});
  lista.addEventListener('click',function(e){var b=e.target.closest('button[data-a]');if(!b)return;var a=b.dataset.a,em=b.dataset.e;
    if(a==='excluir'&&!window.confirm('Excluir '+em+'? A pessoa perde o acesso na hora.'))return;
    var extra={};if(a==='alterar'){var ne=window.prompt('Novo e-mail (deixe igual para manter):',em);if(ne===null)return;var nn=window.prompt('Nome:',b.dataset.n||'');if(nn===null)return;extra={novoEmail:ne.trim(),nome:nn.trim()};}
    diz('Salvando…');post(Object.assign({acao:a,email:em},extra)).then(function(j){if(j.usuarios)mostra(j.usuarios);diz(j.ok?'Feito.':(j.erro||'Não deu.'),j.ok?'ok':'erro')}).catch(function(){diz('Sem conexão.','erro')})});
  carrega();
})();
</script></main></body></html>`;
}
