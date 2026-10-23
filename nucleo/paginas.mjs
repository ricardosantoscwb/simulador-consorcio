import { esc, EMAIL_CASA } from "./base.mjs";

const CSS = `:root{--bg:#f4f3ef;--card:#fff;--ink:#1b2a2f;--muted:#5d6b70;--line:#e2e0d8;--accent:#0f6e56;--accent-soft:#e3f1ec;--warn:#b4541a;--warn-soft:#fbe9dd;--ok:#1f7a4d;--ok-soft:#e1f3e8;--input:#fff8dc;--input-line:#e6d79a}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:440px;margin:0 auto;padding:40px 16px}.brand{display:flex;align-items:center;gap:10px;font-weight:600;margin-bottom:22px}.brand .dot{width:28px;height:28px;border-radius:8px;background:var(--accent);display:grid;place-items:center;color:#fff;font-size:13px}.brand small{display:block;font-weight:400;color:var(--muted);font-size:11px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:0 1px 2px rgba(20,30,30,.06),0 8px 24px -12px rgba(20,30,30,.18)}
h1{font-size:20px;margin:0 0 6px;font-weight:600}.sub{color:var(--muted);font-size:13px;margin:0 0 14px}label{display:block;font-size:12px;color:var(--muted);font-weight:500;margin-bottom:4px}
input{width:100%;padding:12px;border:1px solid var(--input-line);background:var(--input);border-radius:10px;font:inherit;outline:0}input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.btn{border:1px solid var(--line);background:#fff;padding:11px 14px;border-radius:10px;cursor:pointer;font:inherit;font-weight:500;margin-top:12px}.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff;width:100%}.btn.t{background:transparent;border-color:transparent;color:var(--muted);padding-left:0}
.msg{font-size:13px;margin:10px 0 0;min-height:18px}.msg.erro{color:var(--warn)}.msg.ok{color:var(--ok)}.why{font-size:12px;color:var(--muted);margin-top:16px;border-left:3px solid var(--accent);padding:6px 10px;background:#eef2f4;border-radius:0 8px 8px 0}
#codigo{font-family:ui-monospace,Menlo,monospace;font-size:24px;letter-spacing:4px;text-align:center}[hidden]{display:none!important}`;

const topo = (titulo) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titulo)}</title><style>${CSS}</style></head><body><main>
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
