// Botão "Atualizar Simulador" (favorito do Chrome). Roda dentro do portal da Caixa Consórcio,
// com o login do próprio usuário: lê Descontos (códigos e nomes) e Informações dos Grupos
// (3 abas, todas as páginas) e abre o simulador com os dados no fragmento (#importar=...),
// que não vai para servidor nenhum. O simulador mostra o resumo e só grava com confirmação.
// Não usa token nem API do portal: lê o que a página mostra na tela.
const APP = "https://consorcio.estaleiro.co/";
const CODIGO = `(async()=>{
const APP=${JSON.stringify(APP)};
if(!/portal\\.caixaconsorcio\\.com\\.br$/.test(location.host)){alert('Abra o portal da Caixa Consórcio (já logado) e clique de novo em Atualizar Simulador.');return;}
const w=window.open('about:blank','simulador-consorcio');
const box=document.createElement('div');box.style.cssText='position:fixed;z-index:2147483647;right:16px;bottom:16px;max-width:360px;background:#0f6e56;color:#fff;padding:12px 16px;border-radius:10px;font:14px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)';document.body.appendChild(box);
const diz=t=>{box.textContent='Simulador · '+t;};
const dorme=ms=>new Promise(r=>setTimeout(r,ms));
const espera=async(f,ms)=>{const t0=Date.now();while(Date.now()-t0<(ms||15000)){try{const v=f();if(v)return v;}catch(e){}await dorme(250);}return null;};
const txt=e=>((e&&e.textContent)||'').replace(/\\s+/g,' ').trim();
const link=h=>[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')===h);
const pagTxt=()=>{const m=document.body.innerText.match(/\\d+\\s*[-–]\\s*\\d+\\s+(of|de)\\s+\\d+/);return m?m[0]:'';};
try{
  const convenios=[];const ld=link('/descontos');
  if(ld){ld.click();diz('lendo os descontos…');
    await espera(()=>/Consulte rapidamente/.test(document.body.innerText));await dorme(600);
    const L=document.body.innerText.split('\\n').map(s=>s.trim()).filter(Boolean);const i0=L.findIndex(l=>/Consulte rapidamente/.test(l));
    for(let i=i0+1;i>0&&i<L.length;i++){if(/^Calendário/.test(L[i]))break;if(L[i]==='Baixar')continue;
      if(/^\\d{8,16}$/.test(L[i])){convenios.push({cod:L[i],nome:L[i+1]&&L[i+1]!=='Baixar'?L[i+1]:''});i++;}
      else{const nome=[L[i]];while(L[i+1]&&L[i+1]!=='Baixar'&&!/^\\d{8,16}$/.test(L[i+1])){nome.push(L[++i]);}convenios.push({cod:'',nome:nome.join(' · ')});}}}
  const lg=link('/estudo-grupos');if(!lg)throw new Error('não achei o menu Informações dos Grupos');
  lg.click();diz('abrindo Informações dos Grupos…');
  if(!await espera(()=>document.querySelector('table tbody tr td'),25000))throw new Error('a tabela não carregou');
  const abas=[['Imobiliário','01'],['Veículos Leves','03'],['Veículos Pesados','04']],grupos={};
  for(const [nome,pre] of abas){
    const b=[...document.querySelectorAll('button')].find(x=>txt(x)===nome);if(!b)throw new Error('não achei a aba '+nome);
    b.click();
    if(!await espera(()=>txt(document.querySelector('table tbody tr td')).startsWith(pre),25000))throw new Error('a aba '+nome+' não carregou');
    const ini=document.querySelector('button[aria-label="Go to first page"]');if(ini&&!ini.disabled){const a=pagTxt();ini.click();await espera(()=>pagTxt()!==a,8000);}
    const vistos=new Map();
    for(let pag=1;pag<=80;pag++){diz(nome+' · página '+pag+'…');
      [...document.querySelectorAll('table tbody tr')].forEach(tr=>{const c=[...tr.children].map(txt);if(c.length>=22&&/^\\d{6}$/.test(c[0]))vistos.set(c[0],c.join(' '));});
      const nx=document.querySelector('button[aria-label="Go to next page"]');if(!nx||nx.disabled)break;
      const antes=pagTxt()+'|'+txt(document.querySelector('table tbody tr'));nx.click();
      if(!await espera(()=>pagTxt()+'|'+txt(document.querySelector('table tbody tr'))!==antes,15000))break;}
    grupos[nome]=[...vistos.values()];}
  const n=Object.values(grupos).reduce((t,a)=>t+a.length,0);if(!n)throw new Error('nenhum grupo lido');
  const url=APP+'#importar='+encodeURIComponent(JSON.stringify({v:1,em:new Date().toISOString(),grupos,convenios}));
  diz(n+' grupos e '+convenios.length+' convênios lidos. Abrindo o simulador…');
  if(w&&!w.closed)w.location.href=url;else window.open(url,'simulador-consorcio');
  setTimeout(()=>box.remove(),5000);
}catch(e){diz('não deu: '+e.message+'. Recarregue o portal e tente de novo.');if(w&&!w.closed)w.close();setTimeout(()=>box.remove(),12000);}
})()`;
export const CODIGO_BOTAO = CODIGO;
export const HREF_BOTAO = "javascript:" + encodeURIComponent(CODIGO);
const escA = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
// Área do admin: instalação do botão e situação dos grupos (lida de /api/dados).
export function cardAtualizar() {
  return `<div class="card" style="margin-top:16px">
<h1>Atualizar grupos do portal</h1>
<p class="sub">O simulador guarda os grupos, lances e convênios do portal e o histórico de cada grupo. Atualizar leva 1 clique e uns 30 segundos.</p>
<p><a class="btn primary" href="${escA(HREF_BOTAO)}" onclick="alert('Arraste este botão para a barra de favoritos do Chrome. Depois, com o portal da Caixa Consórcio aberto e logado, clique nele por lá.');return false;">Atualizar Simulador</a></p>
<div class="why"><b>Instalar (1 vez):</b> mostre a barra de favoritos (Cmd+Shift+B no Mac, Ctrl+Shift+B no Windows) e arraste o botão verde para ela.<br><b>Usar (toda semana):</b> abra o portal já logado, clique em <b>Atualizar Simulador</b> nos favoritos e confirme no simulador. O botão só lê o que aparece na tela; não guarda senha nem token.</div>
<p class="msg" id="sitGrupos">Carregando a situação dos grupos…</p>
<script>(function(){var el=document.getElementById('sitGrupos');fetch('/api/dados',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){var gs=(j.grupos||[]).filter(function(g){return g.data});if(!gs.length){el.textContent='Nenhum grupo do portal ainda. Use o botão.';return}
var ult=gs.map(function(g){return g.data}).sort().pop(),hj=new Date().toISOString().slice(0,10),as=gs.map(function(g){return g.assem}).filter(Boolean).sort(),prox=as.find(function(a){return a>=hj}),velho=as.some(function(a){return a<hj&&a>=ult});
var f=function(d){return d?d.split('-').reverse().join('/'):'—'};var por={};gs.forEach(function(g){por[g.tipo]=(por[g.tipo]||0)+1});
el.className='msg '+(velho?'erro':'ok');el.textContent=(velho?'Desatualizado: teve assembleia depois da última atualização ('+f(ult)+'). Clique no botão no portal. ':'Atualizado em '+f(ult)+'. ')+Object.keys(por).map(function(k){return k+': '+por[k]}).join(' · ')+(prox?' · próxima assembleia '+f(prox):'')+((j.convenios||[]).length?' · '+j.convenios.length+' convênios':'')}).catch(function(){el.textContent='Sem conexão.'})})();</script>
</div>`;
}
