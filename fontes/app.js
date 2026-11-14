/* ===================== estado ===================== */
const KEY='simcons.v2';
const EXEMPLO='Exemplo da planilha original — sem fonte confirmada';
const defaultState=()=>({
  perfil:{nome:'',bem:'Imóvel',valor:'',recurso:'',parcela:'',prazo:'',obs:''},
  promo:{cod:'',desc:'',val:''}, campanhas:[],
  grupos:[
    {id:'G1',cod:'G1',tipo:'Outro',desc:'Grupo sem lance (exemplo)',ta:14.87486,fr:3,cmin:102345.94,cmax:102345.94,pt:'',pr:'',parc:2234.09,emax:0,lmin:'',lmed:'',lmax:'',assem:'',data:'',fonte:EXEMPLO},
    {id:'G2',cod:'G2',tipo:'Imobiliário',desc:'Imóvel com lance (exemplo)',ta:14.75,fr:3,cmin:450000,cmax:450000,pt:'',pr:'',parc:2684,emax:50,lmin:'',lmed:'',lmax:'',assem:'',data:'',fonte:EXEMPLO},
    {id:'G3',cod:'G3',tipo:'Veículos Leves',desc:'Veículo com lance (exemplo)',ta:14.4,fr:3,cmin:124448.07,cmax:124448.07,pt:'',pr:'',parc:2435.08,emax:30,lmin:'',lmed:'',lmax:'',assem:'',data:'',fonte:EXEMPLO},
  ],
    cotasL:[], comp:{}, convenios:[],
  segTx:{'Imobiliário':0.0433,'Veículos':0.0765}, inpcBcb:null, taxas:null, bancos:{}, fin:{cet:'',prazo:'',sis:'',extra:''},
  segTaxa:0.0433, segInfo:'1 amostra da tela de composição (27/10/2026): grupo 10012, carta R$ 305.576, seguro R$ 163,41 por mês sobre saldo de R$ 377.388 sem seguro',
});
let S=load();
var IMPORT_PEND; // (sem "=null": load() roda antes desta linha) pacote do botão "Atualizar Simulador" (chega no fragmento da URL, nunca vai ao servidor como link)
function load(){
  const base=defaultState();
  try{const h=location.hash.slice(1);if(h.startsWith('importar=')){IMPORT_PEND=JSON.parse(decodeURIComponent(h.slice(9)));history.replaceState(null,'',location.pathname);}}catch(e){toast('Pacote do portal ilegível: clique de novo no botão');}
  try{const h=location.hash.slice(1);if(h.startsWith('s=')){const d=JSON.parse(decodeURIComponent(escape(atob(h.slice(2)))));history.replaceState(null,'',location.pathname);toast('Caminhos carregados do link');return {...base,...d,perfil:{...base.perfil,...(d.perfil||{})},promo:{...base.promo,...(d.promo||{})}};}}catch(e){}
  try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);return {...base,...d,perfil:{...base.perfil,...(d.perfil||{})},promo:{...base.promo,...(d.promo||{})}};}}catch(e){}
  return base;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const num=v=>{const n=parseFloat(v);return isFinite(n)?n:null;};
const brl=v=>v==null||!isFinite(v)?'—':v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const brl2=v=>v==null||!isFinite(v)?'—':v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct2=v=>v==null||!isFinite(v)?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:3})+'%';
const pct=v=>v==null||!isFinite(v)?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200);}
const grupo=id=>S.grupos.find(g=>g.id===id);
const semFonte=g=>!g.fonte||g.fonte===EXEMPLO||!g.data;
const soExemplo=()=>S.grupos.every(g=>g.fonte===EXEMPLO);
const tipoDoBem=b=>({'Imóvel':['Imobiliário'],'Veículo':['Veículos Leves','Veículos Pesados'],'Serviços':['Serviços']})[b]||[];
// histórico do lance: 1 ponto por mês de colagem (só o que o gerente colou; nada automático)
function regHist(g){const n=num(g.lmin),d=num(g.lmed);if(n==null&&d==null)return;const m=new Date().toISOString().slice(0,7);
  g.h=[...(g.h||[]).filter(x=>x.m!==m),{m,n,d}].sort((a,b)=>a.m.localeCompare(b.m)).slice(-24);}
function tendencia(g){const h=(g&&g.h||[]).filter(x=>x.n!=null||x.d!=null);if(h.length<3)return null;const a=h[h.length-2],b=h[h.length-1];
  const k=a.n!=null&&b.n!=null?'n':'d';if(a[k]==null||b[k]==null)return null;const dv=b[k]-a[k];const mm=x=>x.m.slice(5)+'/'+x.m.slice(0,4);
  return {dv,sobe:dv>=0.5,txt:Math.abs(dv)<0.5?`lance estável desde ${mm(a)}`:`lance ${dv>0?'subindo':'caindo'} ${dv>0?'+':'−'}${Math.abs(dv).toLocaleString('pt-BR',{maximumFractionDigits:1})} p.p. desde ${mm(a)}`};}

/* ===================== cálculo (mesma lógica da planilha) ===================== */
function calc(c){
  const g=grupo(c.gid),P=S.perfil,r={g,alerts:[],info:[],ok:false};
  if(!g){r.alerts.push('Grupo não encontrado');return r;}
  const carta=num(c.carta)||0,cotas=Math.max(0,Math.floor(num(c.cotas)||0));
  const ll=(num(c.ll)||0)/100,le=(num(c.le)||0)/100,n=Math.max(0,num(c.n)??1);
  const prazo=num(c.prazo)??num(g.pr);
  r.total=carta*cotas;
  r.taCheia=num(g.ta)||0;r.camp=campDe({tipo:g.tipo,carta,plano:'Normal',emax:num(g.emax)});r.taEff=r.camp?taCamp(r.camp,r.taCheia):r.taCheia;r.promo=!!r.camp;
  r.taR=r.total*r.taEff/100;r.frR=r.total*(num(g.fr)||0)/100;r.sd0=r.total+r.taR+r.frR;
  if(num(g.parc)!=null){r.parcCota=num(g.parc);r.parcEst=false;}else if((num(g.pr)>0||num(g.pt)>0)&&cotas>0){r.parcCota=(r.sd0/cotas)/(num(g.pr)>0?num(g.pr):num(g.pt));r.parcEst=true;}else r.parcCota=null;
  r.parcIni=r.parcCota!=null?r.parcCota*cotas:null;
  r.lanceLivre=r.total*ll;r.lanceEmb=r.total*le;r.lanceTot=r.lanceLivre+r.lanceEmb;r.lancePct=(ll+le)*100;
  r.credLiq=r.total-r.lanceEmb;r.sdPos=r.sd0-r.lanceTot;
  r.sdAposParc=r.parcIni!=null?r.sdPos-r.parcIni*n:null;r.prazo=prazo;
  r.parcelaPos=(prazo-n>=1&&r.sdAposParc!=null)?Math.max(r.sdAposParc/(prazo-n),0.2*(r.parcIni||0)):null; // manter o prazo: saldo no mês da contemplação ÷ meses que faltam; nunca abaixo de 20% da parcela atual (FAQ do portal, 29/10/2026)
  r.mesesMant=r.parcelaPos>0?Math.min(prazo-n,Math.ceil(r.sdAposParc/r.parcelaPos-1e-9)):(r.parcelaPos===0?0:null);
  r.mesesRed=(r.parcelaPos!=null&&r.parcCota>0)?(r.sdAposParc<=0?0:Math.min(prazo-n,Math.ceil(r.sdAposParc/r.parcIni-1e-9))):null; // reduzir o prazo: mesma parcela até quitar
  r.recursoProprio=r.parcIni!=null?r.lanceLivre+r.parcIni*n:null;
  r.dinheiroNovo=r.credLiq-r.lanceLivre;r.indice=r.dinheiroNovo>0?r.sdPos/r.dinheiroNovo:null;
  r.lmin=num(g.lmin);r.dist=r.lmin>0?r.lancePct-r.lmin:null;
  if(cotas<1)r.alerts.push('Cotas deve ser ≥ 1');
  if(num(g.cmin)!=null&&num(g.cmax)>0&&(carta<num(g.cmin)-0.01||carta>num(g.cmax)+0.01))r.alerts.push(`Carta fora da faixa do grupo (${brl(num(g.cmin))} a ${brl(num(g.cmax))})`);
  if(num(g.emax)!=null&&le*100>num(g.emax)+1e-9)r.alerts.push(`Embutido acima do padrão do grupo (${pct(num(g.emax))})`);
  if(r.lanceTot>r.total)r.alerts.push('Lance total maior que o valor das cartas');
  if(r.sdPos<0||(r.sdAposParc!=null&&r.sdAposParc<0))r.alerts.push('Saldo devedor negativo — revisar lance/parcelas');
  if(!(prazo>0))r.alerts.push('Prazo remanescente não informado no grupo');else if(n>=prazo)r.alerts.push('Mês da contemplação deve ser menor que o prazo');
  if(r.parcCota==null)r.alerts.push('Sem parcela informada e sem prazo total para estimar');
  if(num(P.parcela)>0&&r.parcelaPos!=null&&r.parcelaPos>num(P.parcela))r.alerts.push(`Não cabe: parcela ${brl2(r.parcelaPos)} > o que cabe no mês (${brl2(num(P.parcela))}); +${brl2(r.parcelaPos-num(P.parcela))}`);
  if(num(P.recurso)!=null&&P.recurso!==''&&r.lanceLivre>num(P.recurso)+0.01)r.alerts.push(`Não cabe: lance do bolso ${brl(r.lanceLivre)} > o que o cliente junta (${brl(num(P.recurso))}); faltam ${brl(r.lanceLivre-num(P.recurso))}`);
  if(num(P.valor)>0&&r.credLiq<num(P.valor)-0.5)r.info.push(`Crédito líquido fica ${brl(num(P.valor)-r.credLiq)} abaixo do valor do bem`);
  if(r.dist!=null)r.info.push(r.dist<0?`Lance total ${pct(r.lancePct)}: ${pct(-r.dist)} abaixo do menor lance contemplado na última assembleia (${pct(r.lmin)}). Histórico, não previsão.`:`Lance total ${pct(r.lancePct)}: igual ou acima do menor lance contemplado na última assembleia (${pct(r.lmin)}). Histórico, não previsão.`);
  if(r.parcEst)r.info.push('Parcela estimada (saldo ÷ prazo remanescente)');
  if(r.promo)r.info.push(`Campanha ${r.camp.cod}: taxa adm ${pct(r.taEff)} (cheia ${pct(r.taCheia)}).`);
  if(semFonte(g))r.info.push('Grupo sem fonte/data confirmada');
  r.ok=r.alerts.length===0&&r.indice!=null&&r.parcelaPos!=null;
  return r;
}
/* ===================== geração automática dos caminhos ===================== */
function candidatos(){const t=S.estr&&S.estr.tipo?[S.estr.tipo]:tipoDoBem(S.perfil.bem);const gs=S.grupos.filter(g=>num(g.cmax)>0&&num(g.ta)!=null);const f=gs.filter(g=>t.includes(g.tipo));return f.length?f:gs;}
const clamp=(v,g)=>Math.min(Math.max(v,num(g.cmin)||0),num(g.cmax)||v);
/* ===================== navegação ===================== */
/* ===== trilha de passos: 5 passos, uma coisa por tela, Voltar/Próximo sempre à vista ===== */
const PASSOS=[['estrategia','','Pedido'],['cotas','busca','Buscar'],['cotas','cota','Cota'],['cotas','lance','Lance'],['oferta','','Proposta']];
const subAtual=()=>{const v=S.estr&&S.estr.sub;return ['busca','cota','lance'].includes(v)?v:'busca';};
function passoAtual(){const on=document.querySelector('.screen.on');const id=on?on.id.slice(2):'';const i=PASSOS.findIndex(p=>p[0]===id&&(id!=='cotas'||p[1]===subAtual()));return i<0?0:i+1;}
function passo(n){const p=PASSOS[n-1];if(!p)return;if(p[1]){S.estr.sub=p[1];save();}go(p[0]);}
function proximoCota(){const cf=($('#cf-carta')||{}).value||'',pt=(($('#c-paste')||{}).value||'').trim();if(cf.trim())$('#cf-go').click();else if(pt)$('#c-save').click();else if(S.estr.bestReal)passo(4);else toast('Digite a cota que achou ou cole a lista');}
const RODAPE={1:[null,'Buscar as cotas →',()=>$('#e-go').click()],2:['← Pedido','Já achei a cota →',()=>passo(3)],3:['← Buscar','Próximo: lance →',proximoCota],4:['← Cota','Ver a proposta →',()=>passo(5)],5:['← Lance','Apresentar',()=>{const o=$('#o-present');if(o&&!o.disabled)o.click();}]};
const DICA={1:'Quanto o cliente precisa receber',2:'Pesquise cada faixa no sistema',3:'Digite a cota que achou',4:'Escolha o lance e o prestamista',5:'Resumo, comparação e conferência'};
function trilha(){const t=$('#trilha'),r=$('#rodape');if(!t||!r)return;const n=passoAtual();document.body.classList.toggle('passos',n>0);
  $$('#s-cotas [data-sub]').forEach(el=>{el.hidden=el.dataset.sub!==subAtual();});
  if(!n){t.innerHTML='';r.innerHTML='';return;}
  t.innerHTML=`<ol>${PASSOS.map((p,i)=>`<li><button type="button" aria-label="Passo ${i+1}: ${p[2]}" data-passo="${i+1}" class="${i+1===n?'on':i+1<n?'ok':''}" ${i+1===n?'aria-current="step"':''}><b>${i+1<n?'✓':i+1}</b><span>${p[2]}</span></button></li>`).join('')}</ol><p class="dica">Passo ${n} de 5 · ${DICA[n]}</p>`;
  const [v,pr]=[RODAPE[n][0],RODAPE[n]];r.innerHTML=`${v?`<button type="button" class="btn ghost" id="rd-v">${v}</button>`:'<span></span>'}<button type="button" class="btn primary" id="rd-p">${pr[1]}</button>`;
  $$('#trilha [data-passo]').forEach(b=>b.onclick=()=>passo(+b.dataset.passo));if(v)$('#rd-v').onclick=()=>passo(n-1);$('#rd-p').onclick=pr[2];}
function go(id){if(id==='oferta')_rolar=true;if(id==='grupos'&&document.body.classList.contains('usuario'))id='estrategia';$$('.screen').forEach(s=>s.classList.toggle('on',s.id==='s-'+id));$$('[data-go]').forEach(b=>b.classList.toggle('on',b.dataset.go===id));try{localStorage.setItem(KEY+'.tab',id);}catch(e){}window.scrollTo({top:0});render();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){e.preventDefault();go(b.dataset.go);}});
function present(on){if(on){go('oferta');abrirCine();}else fecharCine();}
$('#btnPresent').onclick=()=>present(true);$('#btnExitPresent').onclick=()=>present(false);


/* ===================== aviso ===================== */
function avisoPrimeiroUso(){return soExemplo()?`<div class="al info" style="margin-bottom:12px">${ADM()?'Primeiro uso: os grupos cadastrados são só exemplo. Atualize pelo botão do portal (ou cole em <a href="#" data-go="grupos" style="color:inherit;font-weight:600">Grupos</a>) antes de montar uma oferta real.':'Os grupos do portal ainda não chegaram: avise o admin para atualizar antes de montar uma proposta real.'}</div>`:'';}

/* ===================== grupos ===================== */
const GF=['cod','tipo','desc','ta','fr','cmin','cmax','pt','pr','parc','emax','lmin','lmed','lmax','assem','data','fonte'];
const GX=['cs','cl','ct','clf','np']; // contemplados na última assembleia (sorteio, lance, total) — só por colagem
let editing=null;
let gBusca='',gFiltro='';
function statusPortal(){const gs=S.grupos.filter(g=>g.fonte!==EXEMPLO&&g.data);if(!gs.length)return null;const h=hojeL(),ult=gs.map(g=>g.data).sort().pop();
  const as=gs.map(g=>g.assem).filter(Boolean).sort(),passou=as.filter(a=>a<h&&a>=ult),prox=as.find(a=>a>=h);
  return {ult,prox,velho:passou.length>0,assemPassada:passou[0]||null};}
function avisoPortal(){const st=statusPortal();if(!st)return '';
  return st.velho?`<div class="al" style="margin-bottom:10px">Teve assembleia em ${fmtD(st.assemPassada)}, depois da sua colagem de ${fmtD(st.ult)}: cole a tabela do portal de novo (lance e contemplados podem ter mudado).</div>`
    :`<div class="al info" style="margin-bottom:10px">Tabela do portal colada em ${fmtD(st.ult)}.${st.prox?` Próxima assembleia: ${fmtD(st.prox)}; depois dela, cole de novo.`:''}</div>`;}
function pacoteLinhas(P){return Object.values(P&&P.grupos||{}).flat().map(parseLinha).filter(Boolean);}
function renderImport(){const el=$('#imp-card');if(!el)return;if(!IMPORT_PEND){el.innerHTML='';return;}
  const ls=pacoteLinhas(IMPORT_PEND),por={};ls.forEach(p=>{const t=tipoDoCod(p.cod)||'?';por[t]=(por[t]||0)+1;});const conv=(IMPORT_PEND.convenios||[]).length;
  el.innerHTML=`<div class="card" style="margin-bottom:14px;border-color:var(--accent)"><h2>Chegou do portal <span class="tag">${esc(new Date(IMPORT_PEND.em).toLocaleString('pt-BR'))}</span></h2>
    <p class="sub">${Object.entries(por).map(([t,n])=>esc(t)+': '+n).join(' · ')||'nenhum grupo reconhecido'}${conv?' · '+conv+' códigos de convênio':''}. Confirme pra gravar no simulador (vale pra todos os gerentes) e registrar o histórico de lances.</p>
    <div class="dlg-actions" style="justify-content:flex-start"><button class="btn primary" id="imp-ok" ${ls.length?'':'disabled'}>Gravar no simulador</button><button class="btn" id="imp-no">Descartar</button></div></div>`;
  $('#imp-no').onclick=()=>{IMPORT_PEND=null;renderImport();};
  $('#imp-ok').onclick=()=>{const P=IMPORT_PEND;IMPORT_PEND=null;if(Array.isArray(P.convenios)&&((window.SESSAO&&window.SESSAO.admin)||!temServidor()))S.convenios=P.convenios.map(c=>({cod:String(c.cod||'').replace(/\D/g,''),nome:String(c.nome||'')}));
    if(ls.some(p=>!tipoDoCod(p.cod))){toast('Há grupos de tipo desconhecido: ficaram de fora');}
    const r=importarLote(ls.filter(p=>tipoDoCod(p.cod)),p=>{const t=tipoDoCod(p.cod);return {tipo:t,...PADRAO_LOTE[t]};},'portal da Caixa Consórcio (botão Atualizar Simulador)');render();toast(resumoImport(r));};}
function renderGrupos(){renderImport();const l=$('#glist');l.innerHTML=avisoPortal();
  $('#g-exemplos').style.display=S.grupos.some(g=>g.fonte===EXEMPLO)?'':'none';
  const q=gBusca.toLowerCase();const lista=S.grupos.filter(g=>(!gFiltro||g.tipo===gFiltro)&&(!q||String(g.cod).toLowerCase().includes(q)||String(g.desc||'').toLowerCase().includes(q)));
  if(!S.grupos.length)l.innerHTML='<div class="empty">Nenhum grupo. Cole a tabela ao lado.</div>';else if(!lista.length)l.innerHTML='<div class="empty">Nada com esse filtro.</div>';
  l.insertAdjacentHTML('beforebegin','');const cab=document.createElement('div');cab.className='sub';cab.textContent=`${lista.length} de ${S.grupos.length} grupos`;l.appendChild(cab);
  lista.forEach(g=>{const d=document.createElement('div');d.className='gitem';
    d.innerHTML=`<div class="code">${esc(g.cod)} <span style="color:var(--muted);font-weight:400">· ${esc(g.tipo)}</span></div><span class="tag ${semFonte(g)?'warn':'ok'}">${semFonte(g)?'sem fonte':'fonte ok'}</span>
      <div class="meta">${esc(g.desc||'')}${g.desc?'<br>':''}Carta ${brl(num(g.cmin))}${num(g.cmax)!==num(g.cmin)?' a '+brl(num(g.cmax)):''} · TA ${pct(num(g.ta))} · FR ${pct(num(g.fr))} · embutido ${pct(num(g.emax))}${num(g.pr)?' · remanescente '+g.pr+'m':' · <b style="color:var(--warn)">sem prazo</b>'}${num(g.lmin)?' · menor lance últ. '+pct(num(g.lmin)):''}${(()=>{const t=tendencia(g);return t?` · <b style="color:${t.sobe?'var(--warn)':'var(--ok)'}">${esc(t.txt)}</b>`:'';})()}</div>`;
    d.onclick=()=>editGroup(g.id);l.appendChild(d);});}
function editGroup(id){editing=id;const g=id?grupo(id):{};$('#g-manual').open=!!id;$('#gform-title').textContent=id?'Editar grupo '+g.cod:'Atualizar grupos';GF.forEach(k=>$('#g-'+k).value=g[k]??'');$('#g-paste').value='';$('#g-paste-msg').textContent='';$('#g-emax-hint').textContent='';$('#btnDelGroup').style.display=id?'':'none';if(window.innerWidth<900&&id)$('#gform-card').scrollIntoView({behavior:'smooth'});}
$('#btnNewGroup').onclick=()=>{editGroup(null);$('#g-manual').open=true;$('#gform-title').textContent='Novo grupo (manual)';$('#gform-card').scrollIntoView({behavior:'smooth'});};$('#btnCancelGroup').onclick=()=>editGroup(null);
$('#g-busca').oninput=e=>{gBusca=e.target.value;renderGrupos();};$('#g-filtro').onchange=e=>{gFiltro=e.target.value;renderGrupos();};
$('#btnDelExemplos').onclick=()=>{const ids=S.grupos.filter(g=>g.fonte===EXEMPLO).map(g=>g.id);S.grupos=S.grupos.filter(g=>g.fonte!==EXEMPLO);save();empurrarGrupos();render();toast('Exemplos excluídos');};
$('#btnSaveGroup').onclick=()=>{const g={};GF.forEach(k=>g[k]=$('#g-'+k).value.trim());if(editing){const old=grupo(editing);GX.forEach(k=>{if(old[k]!=null)g[k]=old[k];});}
  if(window._pasteX){Object.assign(g,window._pasteX);window._pasteX=null;}if(!g.cod){toast('Informe o código');return;}
  ['ta','fr','cmin','cmax','pt','pr','parc','emax','lmin','lmed','lmax'].forEach(k=>g[k]=g[k]===''?'':num(g[k]));if(g.cmax===''&&g.cmin!=='')g.cmax=g.cmin;
  if(editing){Object.assign(grupo(editing),g);regHist(grupo(editing));}else{g.id='g'+Date.now().toString(36);regHist(g);S.grupos.push(g);}
  save();empurrarGrupos();editGroup(null);renderGrupos();toast('Grupo salvo');};
$('#btnDelGroup').onclick=()=>{if(!editing)return;S.grupos=S.grupos.filter(g=>g.id!==editing);save();empurrarGrupos();editGroup(null);renderGrupos();};
// colar linha do portal: "COD Sim|Não MIN A MAX PART PT PR D1 DNEXT DVENC ... LMED % LMIN % LMAX %"
function parseLinha(t){const s=t.replace(/\s+/g,' ').trim();const m=s.match(/^(\d{4,8})\s+(Sim|Não|Nao)\s+([\d.,]+)\s+A\s+([\d.,]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})((?:\s+\d+){10})?/i);if(!m)return null;
  const q=(m[11]||'').trim().split(/\s+/).map(Number);const cs=q.length===10?q[5]:'',cl=q.length===10?q[7]+q[8]:'',ct=q.length===10?q[9]:'',clf=q.length===10?q[8]:'';const np=+m[5]||'';
  const n=x=>num(x.includes(',')&&!x.includes('.')?x.replace(',','.'):x.replace(/,/g,''));const pcts=[...s.matchAll(/([\d]+,[\d]+|[\d]+\.[\d]+|\d+)\s*%/g)].map(x=>num(x[1].replace(',','.')));
  const iso=d=>{const [a,b,c]=d.split('/');return `${c}-${b}-${a}`;};
  return {cod:m[1],emb:/^s/i.test(m[2]),cmin:n(m[3]),cmax:n(m[4]),pt:+m[6],pr:+m[7],assem:iso(m[9]),lmed:pcts[0]??'',lmin:pcts[1]??'',lmax:pcts[2]??'',cs,cl,ct,clf,np};}
let batch=[];
$('#g-paste').addEventListener('input',e=>{const lines=e.target.value.split(/\n+/).map(x=>x.trim()).filter(Boolean);const msg=$('#g-paste-msg');
  if(lines.length>1){batch=lines.map(parseLinha).filter(Boolean);$('#g-batch').style.display=batch.length?'':'none';if(batch.length)padraoLote();$('#b-n').textContent=batch.length;msg.textContent=batch.length?`${batch.length} de ${lines.length} linhas reconhecidas. Informe tipo, taxa e fundo do lote e importe.`:'Não reconheci o formato das linhas.';return;}
  $('#g-batch').style.display='none';batch=[];
  const p=parseLinha(e.target.value);if(!p){msg.textContent=e.target.value.trim()?'Não reconheci o formato. Preencha manualmente.':'';return;}
  window._pasteX={cs:p.cs,cl:p.cl,ct:p.ct,clf:p.clf,np:p.np};$('#g-cod').value=p.cod;$('#g-cmin').value=p.cmin;$('#g-cmax').value=p.cmax;$('#g-pt').value=p.pt;$('#g-pr').value=p.pr;$('#g-assem').value=p.assem;$('#g-lmed').value=p.lmed;$('#g-lmin').value=p.lmin;$('#g-lmax').value=p.lmax;$('#g-data').value=new Date().toISOString().slice(0,10);
  if(!p.emb)$('#g-emax').value=0;else{$('#g-emax').value='';}
  $('#g-emax-hint').textContent=p.emb?'Grupo COM embutido: informe o máximo conforme o regulamento (a linha não traz o %).':'Grupo sem embutido (0%).';
  msg.textContent='Preenchi código, faixa, prazos, assembleia e lances. Faltam: tipo, taxa adm, fundo de reserva'+(p.emb?', embutido':'')+'.';});

// valores de partida do lote (banner da administradora: taxa "a partir de"; embutido fixo da administradora: 50% imóvel, 30% veículo, confirmado pelo Ricardo em 29/10/2026): o gerente confere e troca
const PADRAO_LOTE={'Imobiliário':{ta:20,fr:2.5,emax:50},'Veículos Leves':{ta:19.5,fr:2.5,emax:30},'Veículos Pesados':{ta:13,fr:2.5,emax:30}}; // pesados: 13% é a taxa divulgada no portal; a cheia está sem fonte
const tipoDoCod=c=>({'01':'Imobiliário','03':'Veículos Leves','04':'Veículos Pesados'})[String(c).padStart(6,'0').slice(0,2)]||null; // prefixo observado nos códigos do portal
function padraoLote(){const auto=$('#b-tipo').value==='auto';['b-ta','b-fr','b-emax'].forEach(id=>$('#'+id).closest('.f').style.display=auto?'none':'');if(auto)return;const p=PADRAO_LOTE[$('#b-tipo').value]||{};[['b-ta','ta'],['b-fr','fr'],['b-emax','emax']].forEach(([id,k])=>{const el=$('#'+id);if(el.value===''||el.dataset.auto==='1'){el.value=p[k]??'';el.dataset.auto='1';}});}
$('#b-tipo').addEventListener('change',padraoLote);['b-ta','b-fr','b-emax'].forEach(id=>$('#'+id).addEventListener('input',e=>{e.target.dataset.auto='';}));
$('#btnBatch').onclick=()=>{const auto=$('#b-tipo').value==='auto',fonte=$('#b-fonte').value.trim()||'portal da administradora';
  const cfg=p=>{if(auto){const t=tipoDoCod(p.cod);return t?{tipo:t,...PADRAO_LOTE[t]}:null;}return {tipo:$('#b-tipo').value,ta:num($('#b-ta').value),fr:num($('#b-fr').value),emax:num($('#b-emax').value)};};
  if(auto&&batch.some(p=>!tipoDoCod(p.cod))){toast('Há códigos que não reconheço o tipo: escolha o tipo do lote');return;}
  if(!auto){const c=cfg(batch[0]);if(c.ta==null||c.fr==null){toast('Informe taxa adm e fundo de reserva do lote');return;}if(batch.some(p=>p.emb)&&c.emax==null){toast('Informe o embutido para os grupos "Sim"');return;}}
  const r=importarLote(batch,cfg,fonte);batch=[];editGroup(null);render();toast(resumoImport(r));};
function resumoImport(r){return Object.entries(r.porTipo).map(([t,n])=>t+': '+n).join(' · ')+' — '+(r.novos||r.mudou?`${r.novos} novos, ${r.mudou} com lance ou assembleia nova`:'nada mudou desde a última atualização');}
function importarLote(batch,cfg,fonte){const porTipo={};
  const hoje=new Date().toISOString().slice(0,10);let novos=0,atual=0,mudou=0;
  batch.forEach(p=>{const {tipo,ta,fr,emax}=cfg(p);porTipo[tipo]=(porTipo[tipo]||0)+1;const g={cod:p.cod,tipo,desc:'',ta,fr,cmin:p.cmin,cmax:p.cmax,pt:p.pt,pr:p.pr,parc:'',emax:p.emb?emax:0,lmin:p.lmin,lmed:p.lmed,lmax:p.lmax,assem:p.assem,data:hoje,fonte,cs:p.cs,cl:p.cl,ct:p.ct,clf:p.clf,np:p.np};
    const ex=S.grupos.find(x=>x.cod===p.cod&&x.tipo===tipo);if(ex){const ant=JSON.stringify([ex.lmin,ex.lmed,ex.lmax,ex.cs,ex.cl,ex.assem]);Object.assign(ex,g);if(JSON.stringify([ex.lmin,ex.lmed,ex.lmax,ex.cs,ex.cl,ex.assem])!==ant)mudou++;regHist(ex);atual++;}else{g.id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);regHist(g);S.grupos.push(g);novos++;}});
  S.grupos=S.grupos.filter(g=>g.fonte!==EXEMPLO); // chegaram grupos reais: os de exemplo saem sozinhos
  save();empurrarGrupos();return {porTipo,novos,mudou,atual};}
function renderRank(){const t=$('#rank');const P={valor:S.estr.valor,bem:S.estr.tipo==='Imobiliário'?'Imóvel':S.estr.tipo?'Veículo':''},valor=num(P.valor)||0;
  if(!(valor>0)){t.innerHTML='<tr><td>Faça um pedido para ver o ranking.</td></tr>';return;}
  const gs=candidatos();if(!gs.length){t.innerHTML='<tr><td>Nenhum grupo com faixa e taxa.</td></tr>';return;}
  const rows=gs.map(g=>{const le=num(g.emax)||0;const carta=clamp(valor/(1-Math.min(le,99)/100),g);const a=num(g.lmin)>0?num(g.lmin):(num(g.lmed)>0?num(g.lmed):0);const ll=Math.min(Math.max(0,a-le),100-le);const r=calc({gid:g.id,carta,cotas:1,ll,le,n:mesC(),prazo:''});return {g,carta,r};});
  rows.sort((a,b)=>((a.r.lanceLivre??9e99)-(b.r.lanceLivre??9e99))||((a.r.indice??99)-(b.r.indice??99)));
  t.innerHTML=`<thead><tr><th>Grupo</th><th>Carta</th><th>Lance do bolso</th><th>Lance total</th><th>Menor contemplado</th><th>Crédito líquido</th><th>Parcela ~</th><th>Cabe?</th></tr></thead><tbody>${rows.map(({g,carta,r})=>`<tr><td>${esc(g.cod)}<br><span style="font-size:11px">${esc(g.tipo)}${semFonte(g)?' · <span style="color:var(--warn)">sem fonte</span>':''}</span></td><td class="num">${brl(carta)}</td><td class="num"><b>${brl(r.lanceLivre)}</b><br><span style="font-size:11px">${pct(r.lancePct-(num(g.emax)||0))} da carta</span></td><td class="num">${pct(r.lancePct)}<br><span style="font-size:11px">${pct(num(g.emax)||0)} embutido</span></td><td class="num">${r.lmin!=null?pct(r.lmin):'—'}</td><td class="num">${brl(r.credLiq)}</td><td class="num">${r.parcelaPos!=null?brl2(r.parcelaPos):'—'}</td><td>${r.ok?'<span class="tag ok">sim</span>':`<span class="tag warn" title="${esc(r.alerts[0]||'')}">${esc((r.alerts[0]||'pendente').split(':')[0].slice(0,28))}</span>`}</td></tr>`).join('')}</tbody>`;}

/* ===================== estratégia de compra ===================== */
const EF=['modo','valor','tipo','max','alvo','emb','rec','p1','p2','nome','sg','sgp','fgts','red','inpc','ger'];
// valores em reais: o campo mostra 150.000 ou 2.730,55; o estado guarda 150000 ou 2730.55
const moneyFmt=v=>{const n=num(v);if(n==null||v==='')return '';const [i,d]=n.toFixed(2).split('.');const ip=Math.trunc(+i).toLocaleString('pt-BR');return d==='00'?ip:ip+','+d;};
const moneyParse=t=>{t=String(t||'').replace(/[^\d,]/g,'');if(!t)return '';const k=t.indexOf(',');const a=(k<0?t:t.slice(0,k))||'0',b=k<0?'':t.slice(k+1).replace(/,/g,'').slice(0,2);return b?a+'.'+b:String(+a);};
const moneyLive=t=>{t=String(t).replace(/[^\d,]/g,'');const k=t.indexOf(',');let a=k<0?t:t.slice(0,k);const b=k<0?null:t.slice(k+1).replace(/,/g,'').slice(0,2);a=a.replace(/^0+(?=\d)/,'');a=a?(+a).toLocaleString('pt-BR'):'';return b==null?a:(a||'0')+','+b;};
const lerCampo=el=>el.dataset.money!=null?moneyParse(el.value):el.value;

/* ===== Glossário em 1 toque: o "?" ao lado dos termos abre uma explicação curta (sem inventar regra da Caixa) ===== */
const GLOS={
  liquido:['Valor líquido','O que o cliente recebe para usar no bem, depois de tirar o lance embutido da carta.'],
  embutido:['Lance embutido','Parte do próprio crédito da carta usada como lance. Não sai do bolso, mas reduz o crédito que o cliente recebe. No app: 50% em imóvel e 30% em veículo, como o Ricardo informou (confirme no contrato).'],
  bolso:['Lance do bolso','O dinheiro que o cliente coloca de sua conta no lance, além do embutido. Lance total = embutido + bolso. Sem garantia de contemplação.'],
  ref:['Bolso de referência','Estimativa pelo histórico do menor lance dos grupos nessa faixa de carta. Não é previsão nem garantia do lance vencedor.'],
  media3:['Lance médio (últimas 3)','Média dos lances contemplados nas últimas 3 assembleias do grupo. Menor e maior lance são da última assembleia. É histórico, não previsão; por isso a média pode ficar fora do intervalo menor-maior.'],
  concorrem:['Cotas que concorrem','Cotas do mesmo cliente no mesmo grupo disputam entre si: se todas ofertarem o menor lance, normalmente só uma passa. Regra do app, sem fonte confirmada da Caixa.'],
  ano:['Custo ao ano','Taxa anual que iguala o que o cliente paga ao que recebe, supondo contemplação no mês informado. Serve para comparar com o CET de um financiamento. É estimativa.'],
  credito:['Custo do crédito','Quanto o cliente paga a mais do que o crédito que recebe, em reais e em % da carta cheia (a taxa de administração e o fundo de reserva incidem sobre a carta inteira, inclusive a parte do lance embutido, que não chega na mão). Inclui seguro e reajuste pelo INPC, tudo estimado.'],
  mes:['Mês da contemplação','Em quantos meses todas as cotas serão contempladas. Escolha o cenário (otimista, factível ou conservador) ou mude o mês de cada um. Muda quanto o cliente paga antes de ter o crédito. É palpite do app, sem garantia de contemplação.']
};
const gl=k=>GLOS[k]?`<button type="button" class="gl" data-gl="${k}" aria-label="O que é: ${GLOS[k][0]}">?</button>`:'';
function abrirGlos(k){const t=GLOS[k];if(!t)return;fecharGlos();const d=document.createElement('div');d.id='glos';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label',t[0]);
  d.innerHTML=`<div class="glos-fundo"></div><div class="glos-card"><b>${esc(t[0])}</b><p>${esc(t[1])}</p><button type="button" class="btn primary small" id="glos-ok">Entendi</button></div>`;
  document.body.appendChild(d);const ok=d.querySelector('#glos-ok');ok.focus();ok.onclick=fecharGlos;d.querySelector('.glos-fundo').onclick=fecharGlos;}
function fecharGlos(){const d=document.getElementById('glos');if(d)d.remove();}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-gl]');if(b){e.preventDefault();abrirGlos(b.dataset.gl);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')fecharGlos();});
/* cenários de contemplação: meses padrão pela quantidade de cotas (regra do app, sem fonte da Caixa); cada mês pode ser mudado */
const CEN=[['oti','Otimista'],['fac','Factível'],['con','Conservador']];
const mesesPadrao=n=>{n=Math.max(1,Math.floor(n)||1);return {oti:Math.max(1,n-1),fac:n+2,con:Math.max(3*n,n+5)};};
const cenAtual=()=>{const k=S.estr&&S.estr.cen;return CEN.some(c=>c[0]===k)?k:'fac';};
const mesC=()=>{const E=S.estr||{},k=cenAtual(),v=Math.floor(num(E.cm&&E.cm[k]));return v>=1?Math.min(240,v):mesesPadrao(E.bestN)[k];}; // mês da contemplação do cenário escolhido (parcelas pagas antes dela)
const nomeCen=k=>(CEN.find(c=>c[0]===k)||[,'Factível'])[1];
const parseBR=v=>{const t=String(v==null?'':v).trim();if(!t)return null;const n=Number(t.replace(/\./g,'').replace(',','.'));return isFinite(n)?n:null;};
S.estr=S.estr||{modo:'liquido',valor:'',tipo:'Imobiliário',max:3,alvo:'lmin',emb:'1',rec:'',p1:'',p2:'',nome:'',lf:''};
const EF2=['lf'];
function alvoDe(g,k){const n=num(g.lmin),m=num(g.lmed);if(k==='lfolga'){if(n>0)return m>n?(n+m)/2:n;return m>0?m:null;}return num(g[k]);} // 'lfolga' = ponto médio entre o menor e a média; se a média não passa do menor, fica o menor
function cotaDe(g,carta,usaEmb,alvoK){ // números de 1 cota desse grupo com essa carta
  const le=usaEmb?(num(g.emax)||0):0;const a=alvoDe(g,alvoK)>0?alvoDe(g,alvoK):(num(g.lmin)>0?num(g.lmin):null);
  const ll=a==null?0:Math.max(0,Math.min(a-le,100-le));
  const r=calc({gid:g.id,carta,cotas:1,ll,le,n:mesC(),prazo:''});
  return {g,carta,le,ll,alvo:a,camp:r.camp||null,red:r.camp?1:0,taBase:r.taCheia,credLiq:r.credLiq,bolso:r.lanceLivre,emb:r.lanceEmb,parcIni:r.parcIni,parcPos:r.parcelaPos,sdApos:r.sdAposParc,mesesRed:r.mesesRed,mesesMant:r.mesesMant,prazo:r.prazo,sd0:r.sd0,est:!!r.parcEst,ok:r.parcIni!=null&&r.parcelaPos!=null};
}
function montar(E,prior){ // prior: 'bolso' | 'parcela' | 'semlance'
  const alvoNeed=num(E.valor)||0;if(!(alvoNeed>0))return null;
  const usaEmb=prior==='semlance'?false:E.emb==='1';
  let gs=S.grupos.filter(g=>num(g.cmax)>0&&num(g.ta)!=null&&num(g.pr)>0);if(E.tipo)gs=gs.filter(g=>g.tipo===E.tipo);
  if(!gs.length)return {erro:'Nenhum grupo com faixa, taxa e prazo remanescente'+(E.tipo?' do tipo '+E.tipo:'')+'.'};
  const base=gs.map(g=>cotaDe(g,num(g.cmax),usaEmb,E.alvo)).filter(c=>c.ok);
  if(!base.length)return {erro:'Grupos sem parcela/prazo suficientes para calcular.'};
  const metr=c=>{const liq=E.modo==='liquido'?c.credLiq:c.carta;if(prior==='semlance')return c.parcIni/liq;if(prior==='parcela')return (c.parcIni+c.parcPos)/liq;if(prior==='cotas')return -c.carta;if(prior==='mais')return c.carta;if(prior==='prazo')return (num(c.g.pr)||999)*1e6+c.bolso/liq;return (c.bolso+0.02*c.parcPos)/liq;};
  const semL=c=>{const r=calc({gid:c.g.id,carta:c.carta,cotas:1,ll:0,le:0,n:mesC(),prazo:''});Object.assign(c,{ll:0,le:0,credLiq:r.credLiq,bolso:0,emb:0,parcIni:r.parcIni,parcPos:r.parcelaPos,sdApos:r.sdAposParc,mesesRed:r.mesesRed,mesesMant:r.mesesMant,sd0:r.sd0});return c;};
  if(prior==='semlance')base.forEach(semL);
  base.sort((a,b)=>metr(a)-metr(b));
  const max=Math.max(1,Math.floor(num(E.max)||3));const linhas=[];let falta=alvoNeed;
  if(prior==='bolso'){const R=roteiro({...E,bestReal:false}),u=R&&R.rec&&R.rec.uso; // menor lance do bolso: mesma divisão que o roteiro escolheu
    if(u&&u.length){u.forEach(x=>{const g=gs.find(y=>y.cod===x.cod);if(!g)return;const le=usaEmb?(num(g.emax)||0):0,tot=E.modo==='liquido'?alvoNeed/(1-le/100):alvoNeed,c=cotaDe(g,clamp(tot/R.rec.n,g),usaEmb,E.alvo);if(c.ok)linhas.push({...c,n:x.k});});
      if(linhas.length){falta=alvoNeed-linhas.reduce((t,l)=>t+(E.modo==='liquido'?l.credLiq:l.carta)*l.n,0);if(Math.abs(falta)<=alvoNeed*0.02)falta=0;}}}
  const medida=c=>E.modo==='liquido'?c.credLiq:c.carta;
  // 1) cotas cheias (carta máxima da faixa), do melhor grupo pro pior
  for(const c of base){if(falta<=0.5)break;let n=0;while(n<max&&medida(c)<=falta+0.5){n++;falta-=medida(c);}if(n>0)linhas.push({...c,n});}
  if(falta>0&&falta<=alvoNeed*0.01)falta=0; // até 1% de diferença: fecha sem cota extra
  // 2) o resto: uma cota sob medida no melhor grupo cuja faixa aceite esse tamanho (respeitando o máximo de cotas)
  if(falta>0.5){const usadas=g=>linhas.filter(l=>l.g.id===g.id).reduce((t,l)=>t+l.n,0);
    let feita=false;
    for(const c of base){const g=c.g;if(usadas(g)>=max)continue;const le=(usaEmb&&prior!=='semlance')?(num(g.emax)||0):0;const cartaNeed=E.modo==='liquido'?falta/(1-le/100):falta;
      if(cartaNeed>=num(g.cmin)-0.01&&cartaNeed<=num(g.cmax)+0.01){let cx=cotaDe(g,cartaNeed,usaEmb&&prior!=='semlance',E.alvo);if(prior==='semlance')cx=semL(cx);linhas.push({...cx,n:1,ajustada:true});falta=0;feita=true;break;}}
    // 3) nenhuma faixa aceita o tamanho exato: fecha com a menor cota cheia que cubra o resto (sobra crédito, avisado)
    if(!feita){const cand=base.filter(c=>usadas(c.g)<max&&medida(c)>=falta).sort((a,b)=>medida(a)-medida(b))[0];if(cand){linhas.push({...cand,n:1,sobra:medida(cand)-falta});falta=0;}}
  }
  if(falta>0.5)return {erro:`Com até ${max} cotas por grupo, os grupos cadastrados cobrem só ${brl(alvoNeed-falta)} de ${brl(alvoNeed)}. Aumente o máximo de cotas ou cole mais grupos.`,parcial:true,linhas};
  const tot=linhas.reduce((t,l)=>({bruto:t.bruto+l.carta*l.n,liq:t.liq+l.credLiq*l.n,bolso:t.bolso+l.bolso*l.n,emb:t.emb+l.emb*l.n,p1:t.p1+l.parcIni*l.n,p2:t.p2+l.parcPos*l.n,cotas:t.cotas+l.n,sd0:t.sd0+l.sd0*l.n,sdEst:t.sdEst+(l.est?l.sd0*l.n:0),sdApos:t.sdApos+(l.sdApos||0)*l.n}),{bruto:0,liq:0,bolso:0,emb:0,p1:0,p2:0,cotas:0,sd0:0,sdEst:0,sdApos:0});
  tot.prazoMax=Math.max(...linhas.map(l=>l.prazo||0));tot.prazoMin=Math.min(...linhas.map(l=>l.prazo||0));prazosDepois(tot,linhas);
  // bilhetes: por assembleia, quantas contemplações históricas por cota (sorteio ÷ participantes) e quantas por lance
  tot.sorteio=linhas.reduce((t,l)=>t+(num(l.g.np)>0&&num(l.g.cs)!=null?l.n*num(l.g.cs)/num(l.g.np):0),0);
  tot.lanceUlt=linhas.reduce((t,l)=>t+(num(l.g.cl)||0),0);tot.temHist=linhas.some(l=>num(l.g.np)>0);
  tot.menorCota=Math.min(...linhas.map(l=>l.credLiq));tot.maiorCota=Math.max(...linhas.map(l=>l.credLiq));
  return {linhas,tot,prior,usaEmb};
}
function montarReal(E,prior){ // cotas reais coladas do sistema de vendas; null = não há cotas do tipo (cai no motor dos grupos)
  const need=num(E.valor)||0;if(!(need>0))return null;
  const cs=cotasComModelo().filter(x=>(x.plano==='Normal'||(E.red==='1'&&x.plano==='Reduzida'&&(S.comp[compK(x)]||compDoGrupo(x.gid,'Reduzida'))))&&x.carta>0&&x.parc>0&&x.prazo>0&&(x.vagas==null||x.vagas>0)&&tipoCasa(x,E.tipo));
  if(!cs.length)return null;
  const incSeg=E.sg!=='0',usaEmb=prior!=='semlance'&&E.emb==='1',M=mesC();
  const items=cs.map(x=>{
    const gp=S.grupos.find(g=>codN(g.cod)===x.gid),sd=segDe(x),seg=sd.seg||0,ss=sd.ss,comp=S.comp[compK(x)]||compDoGrupo(x.gid,x.plano);
    const le=usaEmb?(gp&&num(gp.emax)!=null?num(gp.emax):(x.tipo==='Imobiliário'?50:30)):0;
    const a=prior==='semlance'?0:(gp&&alvoDe(gp,E.alvo)>0?alvoDe(gp,E.alvo):x.lm);
    const ll=prior==='semlance'?0:Math.max(0,Math.min(a-le,100-le));
    const taEst=x.plano==='Normal'&&sd.parcSem>0?Math.round(((sd.parcSem*x.prazo/x.carta-1)*100-((comp&&comp.fr)??2.5))*100)/100:null;
    const taBase=comp&&comp.ta!=null?comp.ta:(gp&&num(gp.ta)!=null?num(gp.ta):(taEst>0&&taEst<40?taEst:null)),taEstim=!(comp&&comp.ta!=null)&&!(gp&&num(gp.ta)!=null)&&taBase!=null,camp=campDe({tipo:gp?gp.tipo:x.tipo,carta:x.carta,plano:x.plano,emax:gp?num(gp.emax):null});
    const red=camp&&taBase!=null?x.carta*(taBase-taCamp(camp,taBase))/100:0; // desconto linear na taxa, durante todo o contrato
    const sdPos=ss-red-x.carta*(ll+le)/100;if(!(ss>0)||sdPos<0)return null;
    const parcSS=sd.parcSem-red/x.prazo,nr=x.prazo-M,sA=sdPos-parcSS*M;if(nr<1||sA<0)return null;const g={...(gp||{cod:x.cod,tipo:x.tipo}),pr:x.prazo};if(comp){g.ta=comp.ta;g.fr=comp.fr;}
    return {x,g,seg,le,ll,alvo:a,carta:x.carta,credLiq:x.carta*(1-le/100),bolso:x.carta*ll/100,emb:x.carta*le/100,
      parcIni:incSeg?parcSS+seg:parcSS,parcPos:Math.max(sA/nr,0.2*parcSS)+(incSeg?seg:0),mesesMant:sA<=0?0:Math.min(nr,Math.ceil(sA/Math.max(sA/nr,0.2*parcSS)-1e-9)),sdApos:sA,mesesRed:sA<=0?0:Math.min(nr,Math.ceil(sA/parcSS-1e-9)),prazo:x.prazo,sd0:ss-red,camp,red,taBase,taEstim,est:false,real:true,vagas:x.vagas==null?1:x.vagas,ultimas:x.vagas==null};
  }).filter(Boolean);
  if(!items.length)return {erro:'As cotas coladas não deram saldo válido.'};
  const med=c=>E.modo==='liquido'?c.credLiq:c.carta;
  const m=c=>prior==='semlance'?c.parcIni/med(c):prior==='parcela'?(c.parcIni+c.parcPos)/med(c):prior==='cotas'?-c.carta:prior==='mais'?c.carta:prior==='prazo'?c.prazo*1e6+c.bolso/med(c):(c.bolso+0.24*c.parcPos)/med(c);
  const cand=items.slice().sort((a,b)=>m(a)-m(b)).slice(0,18);
  const score=t=>prior==='semlance'?t.p1:prior==='parcela'?t.p1+t.p2:prior==='cotas'?t.n*1e9+t.bolso:prior==='mais'?-t.n*1e9+t.bolso:prior==='prazo'?t.maxPrazo*1e9+t.bolso:t.bolso+0.24*t.p2;
  const score0=score;const scoreF=t=>score0(t)+0.01*(t.mx-t.mn)+200*t.der;
  const cap=Math.max(1,Math.floor(num(E.max)||3)),totCap=Math.min(8,Math.max(cap*2,4));
  let best=null,nodes=0;
  for(const tol of [1.05,1.15,1.35,1.6]){
    const use=[],usado={};
    const dfs=(i,t)=>{if(nodes++>300000)return;
      if(t.med>=need*0.99){const sc=scoreF(t);if(!best||sc<best.sc)best={sc,use:use.slice(),t:{...t}};return;}
      if(i>=cand.length||t.n>=totCap)return;
      dfs(i+1,t);const c=cand[i],gk=c.x.gid;
      for(let k=1;k<=c.vagas&&k<=cap-(usado[gk]||0)&&t.n+k<=totCap;k++){
        const nt={med:t.med+k*med(c),n:t.n+k,bolso:t.bolso+k*c.bolso,p1:t.p1+k*c.parcIni,p2:t.p2+k*c.parcPos,maxPrazo:Math.max(t.maxPrazo,c.prazo),mn:Math.min(t.mn,c.carta),mx:Math.max(t.mx,c.carta),der:t.der+(c.x.derivada?k:0)};
        if(nt.med>need*tol)break;
        use.push([c,k]);usado[gk]=(usado[gk]||0)+k;dfs(i+1,nt);usado[gk]-=k;use.pop();}};
    dfs(0,{med:0,n:0,bolso:0,p1:0,p2:0,maxPrazo:0,mn:1e18,mx:0,der:0});if(best)break;}
  if(!best){const maxV=items.reduce((t,c)=>t+Math.min(c.vagas,cap)*med(c),0);return {erro:`Com as cotas coladas (até ${cap} por grupo e vagas do sistema) não fecha ${brl(need)}. Cole mais páginas da lista ou aumente o máximo de cotas.`,parcial:true,linhas:[]};}
  const linhas=best.use.map(([c,k])=>({...c,n:k}));
  const sobra=best.t.med-need;if(sobra>need*0.005){const ml=linhas.reduce((a,b)=>b.carta>a.carta?b:a);ml.sobra=sobra;}
  const tot=linhas.reduce((t,l)=>({bruto:t.bruto+l.carta*l.n,liq:t.liq+l.credLiq*l.n,bolso:t.bolso+l.bolso*l.n,emb:t.emb+l.emb*l.n,p1:t.p1+l.parcIni*l.n,p2:t.p2+l.parcPos*l.n,cotas:t.cotas+l.n,sd0:t.sd0+l.sd0*l.n,sdEst:0,segReal:t.segReal+(incSeg?l.seg*l.n:0),sdApos:t.sdApos+l.sdApos*l.n}),{bruto:0,liq:0,bolso:0,emb:0,p1:0,p2:0,cotas:0,sd0:0,sdEst:0,segReal:0,sdApos:0});
  tot.prazoMax=Math.max(...linhas.map(l=>l.prazo));tot.prazoMin=Math.min(...linhas.map(l=>l.prazo));prazosDepois(tot,linhas);
  tot.sorteio=linhas.reduce((t,l)=>t+(num(l.g.np)>0&&num(l.g.cs)!=null?l.n*num(l.g.cs)/num(l.g.np):0),0);
  tot.lanceUlt=linhas.reduce((t,l)=>t+(num(l.g.cl)||0),0);tot.temHist=linhas.some(l=>num(l.g.np)>0&&num(l.g.cs)!=null);
  tot.menorCota=Math.min(...linhas.map(l=>l.credLiq));tot.maiorCota=Math.max(...linhas.map(l=>l.credLiq));
  const ems=linhas.map(l=>l.x.em).filter(Boolean).sort();
  return {linhas,tot,prior,usaEmb,real:true,desde:ems[0]||null,venc:linhas.some(l=>venceu(l.x))};
}
function prazosDepois(tot,linhas){const M=mesC();tot.mes=M;const pm=linhas.map(l=>l.mesesMant!=null?l.mesesMant:(l.prazo||0)-M);tot.pmMax=Math.max(...pm);tot.pmMin=Math.min(...pm); // manter o prazo: o que falta do prazo (menos, se bater no piso de 20% da parcela)
  const mr=linhas.map(l=>l.mesesRed).filter(v=>v!=null);tot.mrMax=mr.length?Math.max(...mr):null;tot.mrMin=mr.length?Math.min(...mr):null;} // reduzir o prazo: mesma parcela até quitar
const faixaM=(a,b)=>a===b?String(a):a+' a '+b;
const montarAuto=(E,pr)=>montarReal(E,pr)||montar(E,pr);
function instrucaoBusca(r){if(!r||r.erro)return '';const porG={};r.linhas.forEach(l=>{const k=l.g.cod;porG[k]=porG[k]||{g:l.g,n:0,min:1e18,max:0};porG[k].n+=l.n;porG[k].min=Math.min(porG[k].min,l.carta);porG[k].max=Math.max(porG[k].max,l.carta);});
  return Object.values(porG).map(x=>`${x.n} cota${x.n>1?'s':''} de ${x.min===x.max?brl(x.min):brl(x.min)+' a '+brl(x.max)} no grupo ${esc(x.g.cod)}`).join(' · ');}

/* ===== Pedido: a lista ao vivo (1 cota de X, 2 cotas de Y…) com o menor lance de cada divisão ===== */
function listaAoVivo(){const box=$('#e-lista');if(!box)return;const E={...S.estr};
  ['valor','tipo','max','alvo','emb','rec','p1'].forEach(k=>{const el=$('#e-'+k);if(el)E[k]=lerCampo(el);});E.modo=ADM()?(($('#e-modo')||{}).value||E.modo):'liquido';E.bestReal=false;
  if(!(num(E.valor)>0)){box.innerHTML='';return;}
  const R=roteiro(E);if(!R)return;
  if(R.semDados){const f=R.foraFaixa;box.innerHTML=`<div class="lista-vivo"><div class="busca-cab">Divisões possíveis</div><div class="hint">${f?`Com ${brl(R.need)} nenhuma carta dos ${f.n} grupos do portal cabe em 1 a 8 cotas. A menor carta é ${brl(f.cmin)} (≈ ${brl(f.liqMin)} líquidos). Aumente o valor.`:'Ainda não há grupos do portal deste tipo: nada para listar.'}</div></div>`;return;}
  const ops=(R.ops||[]).filter(o=>o.bolso!=null&&o.uso&&o.uso.length),mb=Math.min(...ops.map(o=>o.bolso));
  const emp=ops.filter(o=>o.bolso<=mb+1e-6),best=mb<1?emp.sort((x,y)=>x.n-y.n)[0]:emp.sort((x,y)=>y.n-x.n)[0];
  const milBR=v=>Math.round(v).toLocaleString('pt-BR'),rec=num(E.rec)>0?num(E.rec):null,mes=v=>`${Math.round(v)} meses`;
  const lin=o=>{const nao=rec!=null&&o.bolso>rec;
    return `<tr class="${o===best?'best':''}"><td><b>${o.n}</b> cota${o.n>1?'s':''} de ~${brl(o.t)}</td><td class="r"><b>${milBR(o.lo)} a ${milBR(o.hi)}</b>${o===best?'<span class="sel" style="color:var(--accent)">comece por aqui</span>':''}</td><td class="r">~${brl(o.bolso)}${nao?'<span class="sel" style="color:var(--warn)">não cabe</span>':''}</td></tr>`;};
  box.innerHTML=`<div class="lista-vivo"><div class="busca-cab">Faixas de carta para ${brl(R.need)} ${E.modo==='bruto'?'em cartas':'líquidos'}</div>
    <table class="busca-t"><thead><tr><th scope="col">Quantas cotas</th><th scope="col" class="r">Pesquise no sistema (R$)</th><th scope="col" class="r">Bolso de referência ${gl('ref')}</th></tr></thead><tbody>${ops.map(lin).join('')}</tbody></table>
    <div class="hint">Você pesquisa a faixa no vendas.seguridade e traz o que achou: grupo, vaga e parcela vêm de lá. O bolso de referência usa o histórico de lance dos grupos nessa faixa (não é previsão: nada garante o lance vencedor).</div></div>`;}
function renderEstrategia(){const E=S.estr;if(!E.tipo)E.tipo='Imobiliário';[...EF,...EF2].forEach(k=>{const el=$('#e-'+k);if(!el)return;const m=el.dataset.money!=null;el.value=m?moneyFmt(E[k]):(E[k]??'');if(m)el.oninput=()=>{el.value=moneyLive(el.value);};el.onchange=()=>{E[k]=lerCampo(el);save();};});
  $$('#e-tipo-chips .chip').forEach(b=>{b.classList.toggle('on',(E.tipo||'')===b.dataset.v);b.onclick=()=>{E.tipo=b.dataset.v;$('#e-tipo').value=E.tipo;save();renderEstrategia();};});
  $('#e-aviso').innerHTML=avisoPrimeiroUso();if(['rec','fgts','p1','p2'].some(k=>num(E[k])>0))$('#e-bolso').open=true;
  $('#e-go').onclick=()=>{[...EF,...EF2].forEach(k=>{const el=$('#e-'+k);if(el)E[k]=lerCampo(el);});if(!(num(E.valor)>0)){toast('Informe o valor');return;}if(!ADM())E.modo='liquido';E.feito=true;E.conf={};E.aba='resumo';save();renderOferta();E.bestReal?passo(4):passo(2);};
  $$('#s-estrategia input,#s-estrategia select').forEach(el=>{if(!el._lv){el._lv=1;el.addEventListener('input',listaAoVivo);el.addEventListener('change',listaAoVivo);}});listaAoVivo();
  hintInpc();renderOferta();renderCotas();renderFinForm();}
/* ===== campos de preenchimento no Pedido: cenários e financiamento (a Proposta só mostra) ===== */
function renderFinForm(){const E=S.estr,F=S.fin||(S.fin={}),pd=mesesPadrao(E.bestN),cm=E.cm||{};
  $$('[data-cmf]').forEach(el=>{const k=el.dataset.cmf;el.value=cm[k]||'';el.placeholder=String(pd[k]);el.onchange=()=>{const v=Math.floor(num(el.value)),c=E.cm||(E.cm={});if(v>=1)c[k]=Math.min(240,v);else delete c[k];save();renderOferta();};});
  const pad=$('#c-pad');if(pad){const n=E.bestN||1;pad.textContent=`Vazio = padrão para ${n} cota${n>1?'s':''}: ${pd.oti}, ${pd.fac} e ${pd.con} meses (otimista = cotas − 1, factível = cotas + 2, conservador = 3 × cotas, no mínimo factível + 3). Regra do app, sem fonte confirmada da Caixa.`;}
  $$('[data-ff]').forEach(el=>{const k=el.dataset.ff;el.value=F[k]??'';el.onchange=()=>{F[k]=el.value;save();renderOferta();};});
  const box=$('#f-bancos');if(!box)return;const k=E.tipo==='Imobiliário'?'imovel':'veiculo',T=S.taxas&&S.taxas[k];
  if(!T||!T.lista||!T.lista.length){box.innerHTML='<p class="sub">Sem dados do Banco Central agora.</p>';return;}
  const pick=pickBancos(k,T),chv=x=>x.b+'|'+x.m;
  box.innerHTML=T.lista.map(x=>`<label class="chk"><input type="checkbox" data-banco="${esc(chv(x))}" ${pick.includes(x)?'checked':''}> ${esc(nomeBanco(x.b))}${x.m==='TR'?' (+ TR)':''} · ${pct2(x.aa)}</label>`).join('');
  box.querySelectorAll('input').forEach(c=>c.onchange=()=>{(S.bancos||(S.bancos={}))[k]=[...box.querySelectorAll('input:checked')].map(i=>i.dataset.banco);save();renderOferta();});}
/* ===== custo total, INPC e financiamento (motor em fontes/custos.mjs, colado pelo build) ===== */
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const refMes=r=>{const [a,m]=String(r||'').split('-');return m?MESES[+m-1]+'/'+String(a).slice(2):'';};
function segTaxaDe(tipo){const t=tipo==='Imobiliário'?'Imobiliário':(tipo?'Veículos':null);const v=t&&S.segTx?S.segTx[t]:null;return v!=null?v:(S.segTaxa||0);} // % ao mês sobre o saldo; imóvel e veículo têm taxas diferentes
function inpcAtual(){const E=S.estr||{};if(E.inpc!==''&&E.inpc!=null&&num(E.inpc)!=null)return {v:num(E.inpc),fonte:'informado por você'};const b=S.inpcBcb;if(b&&b.v!=null)return {v:b.v,fonte:'BCB, '+refMes(b.ref)+(b.velho?' (dado antigo)':'')};return {v:0,fonte:null};}
function hintInpc(){const h=document.getElementById('e-inpc-hint');if(h)h.textContent=S.inpcBcb&&S.inpcBcb.v!=null?'vazio = BCB '+pct2(S.inpcBcb.v):'vazio = BCB';}
async function puxarInpc(){if(!temServidor())return;try{const r=await fetch('/api/inpc',{cache:'no-store'});if(!r.ok)return;const j=await r.json();if(!j.ok||j.acum12==null)return;S.inpcBcb={v:j.acum12,ref:j.ref,velho:!!j.velho};save();hintInpc();renderOferta();}catch(e){}}
function linhaEm(l,M,sgOn,R){ // números de UMA cota dessa linha se contemplar no mês M (mesmas fórmulas do calc/montarReal)
  if(l.sdApos==null||!(l.prazo>0))return null;
  const seg=l.real?(sgOn?(l.seg||0):0):((l.est&&sgOn)?R*l.sd0:0);
  const parcSS=l.real?(l.parcIni-seg):l.parcIni;
  const sA=l.sdApos+parcSS*(mesC()-M),nr=l.prazo-M;
  if(!(parcSS>0)||nr<1||sA<0)return null;
  const pm=Math.max(sA/nr,0.2*parcSS); // manter o prazo: nunca abaixo de 20% da parcela atual
  const ss=l.real?(l.sd0+(l.red||0)):l.sd0;
  return {M,parcPre:parcSS+seg,bolso:l.bolso,saldoApos:sA,taxaSeg:(seg>0&&ss>0)?seg/ss:0,credito:l.credLiq,
    Nman:sA<=0?0:Math.min(nr,Math.ceil(sA/pm-1e-9)),Nred:sA<=0?0:Math.min(nr,Math.ceil(sA/parcSS-1e-9)),
    ago:agoDe(num(l.g&&l.g.pt),l.prazo)};}
function custoVar(r,M,sgOn,R,inpc,segFixo){ // custo total das cotas da variante: {man, red}
  const man=[],red=[];
  for(const l of r.linhas){const e=linhaEm(l,M,sgOn,R);if(!e)return null;
    const c={M:e.M,parcPre:e.parcPre,bolso:e.bolso,saldoApos:e.saldoApos,taxaSeg:e.taxaSeg,credito:e.credito,ago:e.ago,inpc,segFixo:!!segFixo};
    man.push([projetar({...c,N:e.Nman}),l.n]);red.push([projetar({...c,N:e.Nred}),l.n]);}
  return {man:somar(man),red:somar(red),ago:agoDe(num(r.linhas[0].g&&r.linhas[0].g.pt),r.linhas[0].prazo)};}
const mil=v=>v==null||!isFinite(v)?'—':brl(v);
function opcaoHtml(k,nome,x,melhor,carta){const cc=x.custoCredito,tg=k==='red'?'paga menos no total':'menor parcela';
  return `<div class="opt${melhor?' win':''}"><div class="oh"><b>${nome}</b><span class="tag${melhor?' ok':''}">${tg}</span></div><div class="ot">${mil(x.total)}<small>você paga no total</small></div>
  <div class="kv"><span>Parcela depois de contemplar</span><b>${brl2(x.parcela1)}</b></div><div class="kv"><span>Quita em</span><b>${x.meses} meses</b></div><div class="kv"><span>Custo do crédito ${gl('credito')}</span><b>${cc>=0?'+ ':'− '}${mil(Math.abs(cc))}${carta>0?' · '+pct(cc/carta*100)+' da carta de '+brl(carta):''}</b></div></div>`;}
function blocoMini(c){const rm=c.red.total<=c.man.total;return `<div class="mini"><div class="kv"><span>Quitar mais rápido · ${c.red.meses} meses · total pago</span><b>${mil(c.red.total)}${rm?' ★':''}</b></div><div class="kv"><span>Parcela mais leve · ${c.man.meses} meses · total pago</span><b>${mil(c.man.total)}${rm?'':' ★'}</b></div><div class="kv"><span>Totais com INPC e seguro estimados</span><b></b></div></div>`;}
function blocoDecisao(c,I,t){const {man,red}=c,rm=red.total<=man.total;
  const dN=Math.abs(man.total-red.total),dH=Math.abs(man.vp-red.vp);
  const frase=`${rm?'Reduzir o prazo':'Manter o prazo'} custa ${mil(dN)} a menos no total.`+((I.v>0&&dH<dN*0.9)?` Em valores de hoje a diferença é ${mil(dH)}: o resto é o INPC sobre parcelas que ficam mais tempo a pagar.`:'');
  return `<div class="opts">${opcaoHtml('red','Quitar mais rápido',red,rm,t&&t.bruto)}${opcaoHtml('man','Parcela mais leve',man,!rm,t&&t.bruto)}</div><p class="vd">${frase}</p>`;}
/* ===== taxas médias de financiamento por banco (BCB; não é oferta nem CET) ===== */
const BANCOS_PADRAO=[/SANTANDER/,/BRADESCO S/,/VOTORANTIM/,/ITA[UÚ]/]; // bancos que operam dentro das lojas; Itaú só completa quando falta um (imóvel não tem BV)
async function puxarTaxas(){if(!temServidor())return;try{const r=await fetch('/api/taxas',{cache:'no-store'});if(!r.ok)return;const j=await r.json();if(!j.ok||!j.veiculo||!j.imovel)return;S.taxas={veiculo:j.veiculo,imovel:j.imovel,velho:!!j.velho};save();renderOferta();renderFinForm();}catch(e){}}
function refTaxa(k,ref){if(k==='imovel'){const m=/^(\d{4})-(\d{2})$/.exec(ref||'');return m?refMes(ref):'';}const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(ref||'');return m?`semana de ${m[3]}/${m[2]}/${m[1]}`:'';}
const nomeBanco=b=>/CAIXA ECON/.test(b)?'Caixa':/SANTANDER/.test(b)?'Santander':/ITA[UÚ]/.test(b)?'Itaú':/BRADESCO/.test(b)?'Bradesco':/VOTORANTIM/.test(b)?'BV':/DO BRASIL/.test(b)?'Banco do Brasil':b.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());
function pickBancos(k,T){const sel=(S.bancos||{})[k],chv=x=>x.b+'|'+x.m;if(sel)return T.lista.filter(x=>sel.includes(chv(x)));const pick=[];BANCOS_PADRAO.forEach(re=>{const x=T.lista.find(y=>re.test(y.b));if(x&&!pick.includes(x)&&pick.length<3)pick.push(x);});return pick;}
function blocoTaxas(E,t,c,I,sis,F){
  const k=E.tipo==='Imobiliário'?'imovel':'veiculo',T=S.taxas&&S.taxas[k];if(!T||!T.lista||!T.lista.length||!c)return '';
  const tag=x=>x.m==='TR'?' <span class="hint">+ TR</span>':'';
  const pick=pickBancos(k,T),inpc=I.v/100;
  const ex=num(String(F.extra||'').replace(',','.'))||0,aas=T.lista.map(x=>x.aa).sort((a,b)=>a-b),md=aas[Math.floor(aas.length/2)];
  const grupo=(nome,m)=>{const eq=taxaEquivalente({liq:t.liq,entrada:m.lance,meses:m.meses,totalCons:m.total,sistema:sis,inpc});
    const lin=pick.map(x=>{const f=finComEntrada({liq:t.liq,entrada:m.lance,cetAA:(x.aa+ex)/100,meses:m.meses,sistema:sis,inpc});if(!f)return '';const d=f.total-m.total;
      return `<tr><td>${esc(nomeBanco(x.b))}${tag(x)}</td><td class="num">${pct2(x.aa)}<br><small>média BCB</small></td><td class="num">${f.semFin?'—':sis==='sac'?brl(f.parcela1)+' → '+brl(f.parcelaN):brl(f.parcela1)}</td><td class="num">${brl(f.total)}</td><td class="num">${brl(Math.abs(d))}<br><small>${d>=0?'mais caro':'mais barato'}</small></td></tr>`;}).join('');
    return `<tr><th colspan="5" style="text-align:left">${nome} · ${m.meses} meses · entrada de ${brl(m.lance)} nos dois lados</th></tr><tr class="win"><td><b>Consórcio Caixa</b></td><td class="num">${eq==null?'—':pct(eq*100)}<br><small>equivale a</small></td><td class="num">${brl(m.parcela1)}</td><td class="num">${brl(m.total)}</td><td class="num">—</td></tr>${lin}`;};
  return `<div class="txbc"><p class="ck">Referência de mercado · Banco Central</p>
  <p class="sub">Mercado: de ${pct2(aas[0])} a ${pct2(aas[aas.length-1])} ao ano (mediana ${pct2(md)}), ${aas.length} instituições, ${refTaxa(k,T.ref)}${S.taxas.velho?' · dado antigo':''}.</p>
  <div class="cmp-wrap"><table class="cmp" style="font-size:12px;margin-top:10px"><thead><tr><th></th><th>Taxa ao ano</th><th>Parcela</th><th>Total pago</th><th>Financiar vs consórcio</th></tr></thead><tbody>${grupo('Quitar mais rápido',c.red)}${c.man.meses!==c.red.meses?grupo('Parcela mais leve',c.man):''}</tbody></table></div>
  <div class="nota">É a taxa média dos contratos de cada banco, não a oferta que o cliente vai receber, e não é o CET (fica de fora tarifa, seguro e IOF: some em Pedido > Avançado ou peça a simulação ao banco). Mesma entrada e mesmo prazo nos dois lados: a entrada do consórcio sai no mês ${mesC()} e a do financiamento, hoje. "Equivale a" é a taxa de financiamento que custaria o mesmo total.${k==='imovel'?' Nas linhas "+ TR", a TR vem por cima da taxa.':''} Estimativa para conversar, não proposta.</div></div>`;}
/* ===== cenários, caminho do dinheiro e economia (visual pedagógico) ===== */
const ABAS=[['resumo','Resumo'],['comparar','Comparar'],['conferir','Conferir']];
const abaAtual=()=>{const a=S.estr&&S.estr.aba;return ABAS.some(x=>x[0]===a)?a:'resumo';};
const abasBarra=()=>{const k=abaAtual();return `<div class="abas no-present" role="tablist">${ABAS.map(([c,n])=>`<button type="button" role="tab" tabindex="${c===k?0:-1}" class="aba${c===k?' on':''}" data-aba-go="${c}" aria-selected="${c===k}">${n}</button>`).join('')}</div>`;};
const campValida=E=>{const h=hojeL(),t=E.tipo==='Veículos'?'Veículos Leves':E.tipo;return (S.campanhas||[]).some(c=>(!c.ini||c.ini<=h)&&(!c.fim||h<=c.fim)&&(!c.tipos.length||c.tipos.includes(t)));};
const existeReduzida=E=>S.cotasL.some(x=>x.plano==='Reduzida'&&tipoCasa(x,E.tipo));
const temReduzida=E=>S.cotasL.some(x=>x.plano==='Reduzida'&&tipoCasa(x,E.tipo)&&(S.comp[compK(x)]||compDoGrupo(x.gid,'Reduzida')));
const TG={sg:{n:'Prestamista',on:E=>E.sg!=='0',set:(E,v)=>{E.sg=v?'':'0';}},dsc:{n:'Campanha',on:E=>E.dsc!=='0'&&(campValida(E)||!!E.campL),set:(E,v)=>{E.dsc=v?'':'0';},falta:E=>(campValida(E)||E.campL)?'':'ABRIR'},red:{n:'Parcela reduzida',on:E=>E.red==='1',set:(E,v)=>{E.red=v?'1':'';},falta:E=>temReduzida(E)?'':'A parcela reduzida precisa do detalhamento da cota reduzida: cole no passo 3 (Cota), em "cole a lista e o detalhamento".'}};
const campMan=E=>{const c=E.campL||{};return `<details class="adv no-present" id="camp-man" style="margin:-6px 0 14px"${c.desc!=null?' open':''}><summary>Campanha: desconto na taxa de administração</summary>
  <p class="sub" style="margin-top:6px">Digite o % informado pelo banco. Vale só nesta simulação, neste aparelho, e fica como “a confirmar”.</p>
  <div class="two"><div class="f"><label for="cm-desc">Desconto na taxa, %</label><input id="cm-desc" inputmode="decimal" placeholder="ex.: 20" value="${c.desc!=null?String(c.desc).replace('.',','):''}"></div>
  <div class="f" style="align-self:end"><button type="button" class="btn ghost" id="cm-rm">Remover campanha</button></div></div></details>`;};
const econCamp=b=>b&&b.r&&!b.r.erro?b.r.linhas.reduce((x,l)=>x+(l.camp&&l.real&&l.red>0?l.red*(l.n||1):0),0):0;
function blocoCenarios(E,b){const k=cenAtual(),pd=mesesPadrao(E.bestN),cm=E.cm||{};
  const bt=CEN.map(([c,nome])=>{const v=Math.floor(num(cm[c]))>=1?Math.floor(num(cm[c])):pd[c];return `<button type="button" class="cenb${c===k?' on':''}" data-cen="${c}" aria-pressed="${c===k}"><b>${nome}</b><small>mês ${v}</small></button>`;}).join('');
  const pill=([k,t])=>{const on=t.on(E),f=t.falta?t.falta(E):'';return `<button type="button" class="pill${on&&!f?' on':''}${f&&!on?' off':''}" data-tg="${k}" aria-pressed="${on}"><span>${on&&!f?'✓':'+'}</span> ${t.n}${k==='dsc'&&on&&!f&&E.campL&&E.campL.desc!=null?' −'+String(E.campL.desc).replace('.',',')+'%':''}</button>`;};
  return `<div class="cens" role="group" aria-label="Cenário de contemplação">${bt}</div><div class="pills" role="group" aria-label="Condições da simulação">${Object.entries(TG).filter(([k])=>k!=='red'||existeReduzida(E)||E.red==='1').map(pill).join('')}</div>${campMan(E)}${(()=>{const e=econCamp(b);return e>0.5&&E.dsc!=='0'?`<div class="econ-camp">A campanha economiza <b>${brl(e)}</b> no total do plano (valor nominal, sem reajuste).</div>`:'';})()}${E.red==='1'&&!temReduzida(E)?`<div class="hint" style="color:var(--warn)">${TG.red.falta(E)}</div>`:''}`;}
function mesDeCen(E,c){const v=Math.floor(num((E.cm||{})[c]));return v>=1?Math.min(240,v):mesesPadrao(E.bestN)[c];}
function listaFin(E){ // taxas a comparar: o CET informado e os bancos escolhidos (aa = mostrada; tx = usada na conta)
  const F=S.fin||{},ex=parseBR(F.extra)||0,cet=num(String(F.cet||'').replace(',','.')),L=[];
  if(F.cet!==''&&F.cet!=null&&cet!=null&&cet>=0)L.push({n:'CET informado ('+pct(cet)+' ao ano)',aa:cet,tx:cet});
  const k=E.tipo==='Imobiliário'?'imovel':'veiculo',T=S.taxas&&S.taxas[k];
  if(T&&T.lista&&T.lista.length)pickBancos(k,T).forEach(x=>L.push({n:nomeBanco(x.b),aa:x.aa,tx:x.aa+ex,bcb:true}));
  return L;}
function varFin(liq,m,L,sis,inpc){ // um prazo do consórcio contra financiar o MESMO bem com a MESMA entrada, no MESMO prazo
  const ent=m.lance;
  const fins=L.map(x=>{const f=finComEntrada({liq,entrada:ent,cetAA:x.tx/100,meses:m.meses,sistema:sis,inpc});return f?{...x,f}:null;}).filter(Boolean);
  const eq=taxaEquivalente({liq,entrada:ent,meses:m.meses,totalCons:m.total,sistema:sis,inpc});
  const vira=L.length?pontoVirada({liq,custoCons:m.custoCredito,meses:m.meses,cetAA:L[0].tx/100,sistema:sis}):null;
  return {m,ent,fins,eq,vira,refN:L.length?L[0].n:null};}
function sorteioDe(b,E,R,I){ // mesmo crédito líquido, sem lance e sem embutido (menos cotas), contemplação no cenário conservador: hipótese, nunca previsão
  const lin=b.r.linhas,M0=mesDeCen(E,'con'),sgOn=E.sg!=='0';let liqT=0,cartaT=0;
  lin.forEach(l=>{liqT+=l.credLiq*l.n;cartaT+=l.carta*l.n;});
  if(!(cartaT>0)||!(liqT>0))return null;
  const s=liqT/cartaT,it=[];let meses=0;
  for(const l of lin){
    if(l.sd0==null||!(l.prazo>0))return null;
    const seg=l.real?(sgOn?(l.seg||0):0):((l.est&&sgOn)?R*l.sd0:0),parcSS=l.real?(l.parcIni-seg):l.parcIni,ss=l.real?(l.sd0+(l.red||0)):l.sd0,nr=l.prazo-M0,sA=ss-parcSS*M0;
    if(!(parcSS>0)||nr<1||sA<0)return null;
    it.push([projetar({M:M0,N:nr,parcPre:parcSS+seg,bolso:0,saldoApos:sA,taxaSeg:(seg>0&&ss>0)?seg/ss:0,credito:l.carta,ago:agoDe(num(l.g&&l.g.pt),l.prazo),inpc:I.v/100}),l.n*s]);
    meses=Math.max(meses,l.prazo);}
  return {M:M0,r:somar(it),meses};}
function dadosCam(E,b,I,R,cli,fgU){const t=b.r.tot,M=mesC(),c=custoVar(b.r,M,E.sg!=='0',R,I.v/100);if(!c)return null;
  const F=S.fin||{},sis=F.sis||(E.tipo==='Imobiliário'?'sac':'price'),rm=c.red.total<=c.man.total,mel=rm?c.red:c.man,ex=parseBR(F.extra)||0,cet=num(String(F.cet||'').replace(',','.')),inpc=I.v/100;
  const L=listaFin(E);
  const vars=[['red','Quitar mais rápido',c.red],['man','Parcela mais leve',c.man]].map(([k,nome,m])=>({k,nome,...varFin(t.liq,m,L,sis,inpc)}));
  const sr=sorteioDe(b,E,R,I),so=sr?{...sr,fins:L.map(x=>{const f=finComEntrada({liq:t.liq,entrada:0,cetAA:x.tx/100,meses:sr.meses,sistema:sis,inpc});return f?{...x,f}:null;}).filter(Boolean)}:null;
  const saldo=parseBR(F.saldo),parc=parseBR(F.parc),rest=Math.floor(num(F.rest)||0);
  const fe=saldo>0&&parc>0&&rest>=1?{saldo,parc,rest,manter:parc*rest,quitar:parc*Math.min(M,rest)+mel.total,novo:t.liq-saldo}:null;
  return {_ex:ex,t,c,rm,mel,M,cen:cenAtual(),liq:t.liq,emb:t.emb,lance:cli(t),fgts:fgU(t),L,vars,so,fe,cet,sis};}
const _seg=(n,v,c)=>({n,v,c});
function barraH(segs,max,desc){const ss=segs.filter(x=>x.v>0.005);return `<div class="bar" role="img" aria-label="${esc(desc)}">${ss.map(x=>`<i class="sg ${x.c}" style="width:${(x.v/max*100).toFixed(2)}%"></i>`).join('')}</div><ul class="leg">${ss.map(x=>`<li><i class="sw ${x.c}"></i><span>${esc(x.n)}</span><b>${brl(x.v)}</b></li>`).join('')}</ul>`;}
function caminhoHtml(D,cine){if(!D)return '';const m=D.mel,fe=D.fe,pre=m.soPre,pos=m.soPos,N=Math.max(0,m.meses-D.M);
  const max=Math.max(m.total,D.liq+D.emb)||1;
  const paga=[_seg(`Parcelas até contemplar (${D.M} ${D.M>1?'meses':'mês'})`,pre,'c-pre'),_seg(D.fgts>0?'Lance (bolso + FGTS)':'Lance do bolso',m.lance,'c-lance'),_seg(`Parcelas depois (${N} meses)`,pos,'c-pos')];
  const novo=fe?Math.max(0,D.liq-fe.saldo):D.liq;
  const recebe=[...(fe?[_seg('Quita seu financiamento atual',Math.min(fe.saldo,D.liq),'c-fin')]:[]),_seg('Dinheiro novo na sua mão',novo,'c-novo'),_seg('Lance embutido: sai da própria carta, não chega na sua mão',D.emb,'c-emb')];
  const tl=`<div class="tl" role="img" aria-label="Linha do tempo"><div class="t1" style="flex:${Math.max(D.M,3)}"><b>${brl2(D.t.p1+0)}</b><small>por mês, ${D.M} ${D.M>1?'meses':'mês'}</small></div><div class="tm">contempla</div><div class="t2" style="flex:${Math.max(N,3)}"><b>${brl2(m.parcela1)}</b><small>por mês, ${N} meses</small></div></div>`;
  const cen=cine?`<div class="cens cens-c">${CEN.map(([k,n])=>`<button type="button" class="cenb${k===D.cen?' on':''}" data-cenc="${k}">${n}</button>`).join('')}</div>`:'';
  return `<section class="cam"><p class="ck">O caminho do dinheiro · cenário ${nomeCen(D.cen).toLowerCase()}, contemplação no mês ${D.M}</p>${cen}
  <p class="cl">Você devolve e dá</p>${barraH(paga,max,'O que você paga no total: '+brl(m.total))}
  <p class="cl">Você recebe</p>${barraH(recebe,max,'O que você recebe: '+brl(D.liq))}
  <p class="cl">Linha do tempo</p>${tl}${fe?`<p class="cs">Até contemplar você segue pagando ${brl2(fe.parc)} por mês do financiamento atual (custo de esperar).</p>`:''}</section>`;}
function economiaHtml(D,cine){if(!D)return '';
  if(!D.L.length&&!D.fe)return '';
  const ent=D.vars[0].m.lance,todos=[...D.vars.flatMap(v=>[v.m.total,...v.fins.map(x=>x.f.total)]),...(D.so?[D.so.r.total,...D.so.fins.map(x=>x.f.total)]:[]),...(D.fe?[D.fe.manter,D.fe.quitar]:[])];
  const max=Math.max(...todos)||1;
  const lin=x=>`<div class="eco"><span>${esc(x.n)}<small>${x.quando}</small></span><div class="bar"><i class="sg ${x.c}" style="width:${(x.total/max*100).toFixed(2)}%"></i></div><b>${brl(x.total)}</b></div>`;
  const menor=(fins,tot)=>{if(!fins.length)return '';const bm=fins.reduce((a,x)=>x.f.total<a.f.total?x:a),d=bm.f.total-tot;return d>=0?`Consórcio: <b>${brl(d)}</b> a menos que financiar no ${esc(bm.n)}.`:`Financiar no ${esc(bm.n)} sai <b>${brl(-d)}</b> mais barato.`;};
  const bloco=v=>{const m=v.m;
    const cons={n:'Consórcio Caixa',quando:`dinheiro no mês ${D.M} · parcela ${brl2(D.t.p1)} → ${brl2(m.parcela1)}${v.eq!=null?' · equivale a financiar a '+pct(v.eq*100)+' ao ano':''}`,total:m.total,c:'c-novo'};
    const bs=v.fins.map(x=>({n:x.n,quando:`dinheiro hoje · parcela ${brl2(x.f.parcela1)} · taxa ${pct(x.aa)} ao ano${x.bcb?' (média BCB, sem tarifas)':''}`,total:x.f.total,c:'c-fin'}));
    const vira=v.vira==null?'':v.vira<=0.001?` Com ${esc(v.refN)}, neste prazo o consórcio custa mais que financiar mesmo sem entrada.`:v.vira>=0.999?` Com ${esc(v.refN)}, o consórcio custa menos que financiar mesmo com entrada total.`:` Ponto de virada, com ${esc(v.refN)}: o consórcio custa menos se a entrada for de até <b>${pct(v.vira*100)}</b> do crédito (aqui: ${pct(ent/D.liq*100)}). Estimativa.`;
    return `<p class="cl" style="margin-top:12px">Em ${m.meses} meses · ${v.nome}</p>${[cons,...bs].map(lin).join('')}<p class="cs">${menor(v.fins,m.total)}${vira}</p>`;};
  const so=D.so?(()=>{const r=D.so.r,custo=r.total-r.creditoM;
    const cons={n:'Consórcio, se vier por sorteio',quando:`sem lance, mês ${D.so.M} (hipótese) · parcela depois ${brl2(r.parcela1)} · custo ${brl(custo)} (${pct(custo/r.creditoM*100)} do crédito)`,total:r.total,c:'c-novo'};
    const bs=D.so.fins.map(x=>({n:x.n,quando:`sem entrada · parcela ${brl2(x.f.parcela1)} · taxa ${pct(x.aa)} ao ano`,total:x.f.total,c:'c-fin'}));
    return `<p class="cl" style="margin-top:14px">Sem lance, sem entrada, em ${D.so.meses} meses (mesmo crédito líquido)</p>${[cons,...bs].map(lin).join('')}<p class="cs">${menor(D.so.fins,r.total)} Sorteio não tem mês garantido: o mês ${D.so.M} é hipótese.</p>`;})():'';
  let fe='';if(D.fe){const f=D.fe,dq=f.quitar-f.manter;fe=`<p class="cl" style="margin-top:14px">Já tem financiamento: manter × quitar com a carta</p>${lin({n:'Manter o financiamento',quando:`${f.rest} parcelas de ${brl2(f.parc)}`,total:f.manter,c:'c-fin'})}${lin({n:'Quitar com a carta',quando:'inclui o que paga até contemplar',total:f.quitar,c:'c-pos'})}<p class="cs">${dq<=0?`Quitar custa <b>${brl(-dq)}</b> a menos no total`:`Quitar custa <b>${brl(dq)}</b> a mais no total`}${f.novo>=0?` e ainda deixa <b>${brl(f.novo)}</b> de dinheiro novo na mão`:` e faltam <b>${brl(-f.novo)}</b> para quitar o saldo com a carta`}.</p>`;}
  return `<section class="cam eco-s"><p class="ck">Quanto custa cada caminho · mesmo crédito líquido de ${brl(D.liq)}, mesma entrada de ${brl(ent)}</p>${D.L.length?D.vars.map(bloco).join(''):''}${D.L.length?so:''}${fe}<p class="nota">A entrada é a mesma nos dois lados: no consórcio sai no mês ${D.M}, no financiamento sai hoje. Financiamento libera o dinheiro hoje; o consórcio, só na contemplação (sem garantia). "Equivale a financiar a" é a taxa que faria o financiamento custar o mesmo total. Taxa média do BCB: estimativa, não é oferta nem o CET (fica de fora tarifa, seguro e IOF). Lance alvo é histórico do grupo, não previsão.</p></section>`;}
function blocoFin(E,t,c,I,P1){
  const F=S.fin||(S.fin={cet:'',prazo:'',sis:'',extra:''}),cet=num(String(F.cet).replace(',','.'));
  const sis=F.sis||(E.tipo==='Imobiliário'?'sac':'price'),pz=Math.floor(num(F.prazo)||0),inpc=I.v/100;
  const bx=blocoTaxas(E,t,c,I,sis,F);
  let tab='';
  if(F.cet!==''&&cet!=null&&cet>=0){
    const fin=m=>finComEntrada({liq:t.liq,entrada:m.lance,cetAA:cet/100,meses:m.meses,sistema:sis,inpc});
    const eqx=x=>taxaEquivalente({liq:t.liq,entrada:x.lance,meses:x.meses,totalCons:x.total,sistema:sis,inpc});
    const lin=(n,par,tot,cc,ano)=>`<tr><td>${n}</td><td class="num">${par}</td><td class="num">${tot}</td><td class="num">${cc}</td><td class="num">${ano}</td></tr>`;
    const cons=(n,x)=>{const e=eqx(x);return lin(`${n} · ${x.meses} meses`,`${brl(P1)} → ${brl(x.parcela1)}`,brl(x.total),'+ '+brl(x.custoCredito),e==null?'—':pct(e*100));};
    const fl=(f,nome)=>lin(`${nome||'Financiamento'} · ${sis==='sac'?'SAC':'Price'} · ${f.meses} meses`,f.semFin?'—':sis==='sac'?`${brl(f.parcela1)} → ${brl(f.parcelaN)}`:brl(f.parcela1),brl(f.total),'+ '+brl(f.custo),pct(cet));
    const mais=(a,b)=>{const d=a-b;return `${brl(Math.abs(d))} ${d>0?'mais caro':'mais barato'}`;};
    const fr=fin(c.red),fm=fin(c.man);if(!fr||!fm)return '';
    let linhas=cons('Consórcio · quitar mais rápido',c.red)+fl(fr)+cons('Consórcio · parcela mais leve',c.man)+fl(fm);
    let vd=`Com a mesma entrada (${brl(c.red.lance)}) e no mesmo prazo, o financiamento sai ${mais(fr.total,c.red.total)} que "quitar mais rápido" e ${mais(fm.total,c.man.total)} que "parcela mais leve". O consórcio também pede a entrada, só que no mês ${mesC()}.`;
    if(pz>0&&pz!==c.red.meses&&pz!==c.man.meses){const melhor=c.red.total<=c.man.total?c.red:c.man,f=finComEntrada({liq:t.liq,entrada:melhor.lance,cetAA:cet/100,meses:pz,sistema:sis,inpc});if(f){linhas+=fl(f,'Financiamento (prazo dele)');vd+=` No prazo informado, de ${pz} meses, sai ${mais(f.total,melhor.total)} que o melhor consórcio.`;}}
    tab=`<div class="cmp-wrap"><table class="cmp" style="font-size:12px;margin-top:10px"><thead><tr><th></th><th>Parcela</th><th>Total pago</th><th>Custo do crédito</th><th>Equivale a (ao ano)</th></tr></thead><tbody>${linhas}</tbody></table></div><p class="vd">${vd}</p>`;}
  return `<details class="adv no-present"  open><summary>Comparar com financiamento</summary><p class="sub" style="margin-top:6px">Mesmo crédito líquido, ${brl(t.liq)}, e a mesma entrada. O CET informado é o do financiamento que o cliente tem em mãos: o simulador não inventa taxa.</p><div class="f no-present" style="margin:8px 0"><label for="cet-in">CET do financiamento do cliente, % ao ano</label><input id="cet-in" inputmode="decimal" placeholder="ex.: 12,5" value="${esc(String((S.fin||{}).cet||''))}"></div>${bx||tab?'':'<p class="sub">Sem comparação ainda: digite o CET acima ou escolha bancos em Pedido > Avançado.</p>'}${bx}${tab}
  <div class="nota">Financiamento libera o dinheiro hoje; o consórcio, só na contemplação (mês ${mesC()}, sem garantia). "Equivale a" é a taxa anual de financiamento (mesma entrada, mesmo prazo) que custaria o mesmo total que o consórcio; fica sem valor quando o consórcio sai mais barato que juro zero.</div></details>`;}
function limVence(E,t,c,I){ // CET (ao ano) acima do qual o consórcio sai mais barato que financiar, nas duas formas de pagar depois; {sempre:true} se vence até com juro zero
  const F=S.fin||{},sis=F.sis||(E.tipo==='Imobiliário'?'sac':'price'),inpc=I.v/100;
  const tot0=m=>{const f=finComEntrada({liq:t.liq,entrada:m.lance,cetAA:0,meses:m.meses,sistema:sis,inpc});return f?f.total:null;};
  const lim=m=>{const f0=tot0(m);if(f0==null)return null;if(m.total<=f0)return {sempre:true};const e=taxaEquivalente({liq:t.liq,entrada:m.lance,meses:m.meses,totalCons:m.total,sistema:sis,inpc});return e==null?null:{cet:e*100};};
  return {a:lim(c.red),b:lim(c.man)};}
const textoVence=({a,b})=>{const f=x=>x?(x.sempre?'sai mais barato até com juro zero':`vence financiamento com CET acima de ${pct(x.cet)} ao ano`):null,l=[f(a)&&`quitar mais rápido ${f(a)}`,f(b)&&`parcela mais leve ${f(b)}`].filter(Boolean);return l.length?l.join('; '):'';};
function blocoVence(E,t,c,I,r,R){ // abre a aba Comparar: onde o consórcio ganha do financiamento; onde perde fica em 1 linha
  const F=S.fin||{},sis=F.sis||(E.tipo==='Imobiliário'?'sac':'price'),inpc=I.v/100,cetI=F.cet!==''&&F.cet!=null?num(String(F.cet).replace(',','.')):null;
  const {a,b}=limVence(E,t,c,I);if(!a&&!b)return '';
  const f=(x,n)=>x?(x.sempre?`<li><b>${n}:</b> sai mais barato que financiar mesmo com juro zero.</li>`:`<li><b>${n}:</b> sai mais barato que um financiamento com CET acima de <b>${pct(x.cet)} ao ano</b>.</li>`):'';
  let lis=f(a,'Quitar mais rápido')+f(b,'Parcela mais leve'),perde='';
  const pf=[[a,'quitar mais rápido'],[b,'parcela mais leve']].filter(x=>x[0]&&!x[0].sempre).map(x=>`${x[1]} perde abaixo de ${pct(x[0].cet)}`);
  if(pf.length)perde=`Onde perde (CET ao ano do financiamento): ${pf.join('; ')}`;
  if(cetI!=null&&cetI>=0){
    const fr=finComEntrada({liq:t.liq,entrada:c.red.lance,cetAA:cetI/100,meses:c.red.meses,sistema:sis,inpc}),fm=finComEntrada({liq:t.liq,entrada:c.man.lance,cetAA:cetI/100,meses:c.man.meses,sistema:sis,inpc});
    if(fr&&fm){const d1=fr.total-c.red.total,d2=fm.total-c.man.total,mel=Math.max(d1,d2);
      lis+=`<li><b>Com o CET que o cliente trouxe (${pct(cetI)}):</b> ${mel>0?`o consórcio economiza até <b>${brl(mel)}</b> contra o financiamento (${d1>=d2?'quitar mais rápido':'parcela mais leve'}).`:`o financiamento sai ${brl(-Math.max(d1,d2))} mais barato.`}</li>`;}
    let lm=0;for(let M=1;M<=120;M++){const v=custoVar(r,M,E.sg!=='0',R,inpc);if(!v)break;const ff=finComEntrada({liq:t.liq,entrada:v.red.lance,cetAA:cetI/100,meses:v.red.meses,sistema:sis,inpc});if(ff&&v.red.total<ff.total)lm=M;else if(lm)break;}
    if(lm>0)lis+=`<li><b>Contemplando até o mês ${lm}</b> (quitar mais rápido), o consórcio continua mais barato com esse CET.</li>`;
    const pv=pontoVirada({liq:t.liq,custoCons:c.red.custoCredito,meses:c.red.meses,cetAA:cetI/100,sistema:sis});if(pv!=null&&pv>0&&pv<1)lis+=`<li><b>Entrada:</b> até ${pct(pv*100)} do crédito líquido o consórcio custa menos que financiar.</li>`;}
  return `<div class="vence"><div class="vence-t">Onde o consórcio vence</div><ul>${lis}</ul><div class="hint">Vale se contemplar no mês ${mesC()} (estimativa, sem garantia). O financiamento libera o dinheiro hoje; o consórcio só quando contemplar.</div>${perde?`<div class="perde">${perde}.</div>`:''}</div>`;}
function blocoEspera(r,E,R,I){
  const M0=mesC(),pdn=mesesPadrao(E.bestN),cmE=E.cm||{},mm=k=>Math.floor(num(cmE[k]))>=1?Math.floor(num(cmE[k])):pdn[k],ms=[...new Set([mm('oti'),mm('fac'),mm('con'),M0,12,24])].sort((a,b)=>a-b),nomesM=M=>CEN.filter(([k])=>mm(k)===M).map(c=>c[1]).join(' / ');
  const rows=ms.map(M=>{const c=custoVar(r,M,E.sg!=='0',R,I.v/100);return `<tr${M===M0?' style="font-weight:600"':''}><td>Mês ${M}${nomesM(M)?' <span class="tag muted">'+nomesM(M)+'</span>':''}${M===M0?' <span class="tag ok">em uso</span>':''}</td><td class="num">${c?mil(c.red.total):'—'}</td><td class="num">${c?mil(c.man.total):'—'}</td></tr>`;}).join('');
  return `<details class="adv"><summary>E se demorar a contemplar?</summary><p class="sub" style="margin-top:6px">Total pago conforme o mês da contemplação, com o mesmo lance. Contemplar antes reduz as parcelas pagas sem ter o crédito.</p><div class="cmp-wrap"><table class="cmp" style="font-size:12px"><thead><tr><th>Se contemplar no</th><th>Quitar mais rápido</th><th>Parcela mais leve</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;}
function comoCalc(r,E,R,I,c){
  const fixo=custoVar(r,mesC(),E.sg!=='0',R,I.v/100,true),dif=fixo?Math.max(fixo.red.total-c.red.total,fixo.man.total-c.man.total):0;
  const cx=r.linhas[0],seg=(cx&&cx.real)?null:R;
  return `<details class="adv"><summary>Como calculamos</summary><ul class="comoc">
  <li><b>Reajuste:</b> ${I.fonte?`INPC de ${pct2(I.v)} ao ano (${I.fonte}), aplicado a cada 12 meses de grupo; próximo reajuste em ${c.ago!=null?c.ago+' meses':'12 meses (data da assembleia não informada)'}. O índice futuro não é conhecido: é hipótese.`:'sem INPC informado: totais sem reajuste.'}</li>
  <li><b>Seguro:</b> proporcional ao saldo, então cai com o lance e com as parcelas${seg?` (${pct2(seg*100)} ao mês)`:' (taxa do detalhamento da cota)'}. A projeção do sistema mantém o seguro fixo${dif>1?`; nesse caso o total subiria até ${brl(dif)}`:''}.</li>
  <li><b>Valores de hoje:</b> descontados pelo mesmo INPC, para separar custo de inflação.</li>
  <li><b>Sem juros:</b> o consórcio cobra taxa de administração e fundo de reserva, que já estão no saldo.</li></ul></details>`;}
function prontidao(b,I){
  if(!b)return {html:'',bloq:false};
  const bloq=[],avisa=[];
  if(b.r.venc)bloq.push('dados vencidos: cole a lista de novo');
  if(!b.r.real)avisa.push('estimativa pelos grupos do portal, sem cotas reais');
  if(!I.fonte)avisa.push('sem INPC: totais sem reajuste');
  const html=bloq.length?`<div class="gate bad no-present"><b>NÃO ENTREGAR</b> · ${bloq.join(' · ')}</div>`:avisa.length?`<div class="gate warn no-present"><b>Revisar antes de enviar</b> · ${avisa.join(' · ')}</div>`:`<div class="gate ok no-present">✔ Pronto para o cliente</div>`;
  return {html,bloq:bloq.length>0,motivo:bloq.join(' · ')};}
// PDF: abre o que explica o cálculo (na tela fica recolhido); depois restaura
let _abertos=[];const _alvoPdf=()=>[...document.querySelectorAll('#e-out .best details, #e-out details.seg')].filter(d=>d.classList.contains('seg')||/^Como calculamos/.test(d.textContent.trim()));
window.addEventListener('beforeprint',()=>{_abertos=_alvoPdf().filter(d=>d.open);_alvoPdf().forEach(d=>d.open=true);});
window.addEventListener('afterprint',()=>{_alvoPdf().forEach(d=>d.open=_abertos.includes(d));});
function blocoSeguro(b,segI){const t=b&&b.r&&!b.r.erro?b.r.tot:null;const v=t?segI(t):0;
  const custo=v>0?`Cerca de ${brl2(v)} por mês hoje; ele cai junto com o saldo (a projeção do sistema o mantém fixo). Já somado na parcela até contemplar`:'Valor a confirmar no sistema';
  const ic=d=>`<span class="ic"><svg viewBox="0 0 24 24">${d}</svg></span>`;
  return `<details class="adv seg"><summary>Seguro prestamista: proteção do seu plano</summary><div class="tri">
    <div class="it">${ic('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>')}<div><b>Protege o plano</b><span>Cobertura de morte e de invalidez total e permanente do titular, conforme as condições do contrato.</span></div></div>
    <div class="it">${ic('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.2c3 0 6 1.6 6 5.8"/>')}<div><b>Protege quem fica</b><span>Se a cobertura for acionada, a família não herda a parcela de um bem que ainda estava sendo pago.</span></div></div>
    <div class="it">${ic('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.2c.4-1 1.4-1.4 2.5-1.4s2.3.5 2.3 1.6c0 2.2-4.8 1-4.8 3.2 0 1 1.1 1.7 2.5 1.7s2.1-.5 2.5-1.4"/>')}<div><b>Quanto custa</b><span>${custo}.</span></div></div>
  </div><div class="nota">Fonte: tela de simulação do sistema de vendas (27/10/2026). O sistema também lista seguro de danos físicos ao imóvel; o custo dele não aparece na tela. Carência, idade máxima e exclusões ficam no contrato: confirme antes de vender. A contratação do consórcio não deve ser condicionada ao seguro.</div></details>`;}
function fonteOferta(vars){const rv=vars.find(v=>v.r&&v.r.real);
  if(rv){const d=rv.r.desde?new Date(rv.r.desde).toLocaleDateString('pt-BR'):'';return `<div class="al ${vars.some(v=>v.r&&v.r.venc)?'':'info'}" style="margin-bottom:12px">${vars.some(v=>v.r&&v.r.venc)?'<b>Dados vencidos:</b> cole a lista de novo. ':''}Cotas reais do sistema de vendas${d?' (colagem de '+d+')':''}: carta e parcela do sistema. Confirme vagas e parcela antes de vender.</div>`;}
  return `<div class="al info" style="margin-bottom:12px">Estimativa pelos grupos do portal: ainda não há cotas reais coladas para este tipo (tela Busca).</div>`;}

/* ===== Registro anônimo de uso: só faixas; o servidor descarta o resto (ver nucleo/aprender.mjs) ===== */
const _sids={};let _ult=null;
const _rnd=()=>Math.random().toString(36).slice(2,12)+Date.now().toString(36).slice(-4);
function logar(ev,d){try{if(!_ult)return;const sid=_sids[_ult]||(_sids[_ult]=_rnd());fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,ev,sid}),keepalive:true}).catch(()=>{});}catch(e){}}

/* ===== Proposta: layout em duas colunas, número que rola, controle segmentado e gavetas ===== */
let GAV=null,_rolar=false;
const _reduz=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function rolar(el){const m=el.textContent.match(/^R\$\s?[\d.]+(?:,\d+)?/);if(!m||_reduz())return;const fim=num(m[0].replace(/[^\d,]/g,'').replace(',','.')),casas=/,/.test(m[0])?2:0,k0=el.innerHTML.indexOf('<small'),rest=k0>=0?el.innerHTML.slice(k0):'',txt=el.textContent.slice(0,m[0].length);
  const ini=performance.now(),dur=700,fmt=v=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:casas,maximumFractionDigits:casas});
  const passo=t=>{const k=Math.min(1,(t-ini)/dur),e=1-Math.pow(1-k,3);el.innerHTML=fmt(fim*e)+rest;if(k<1)requestAnimationFrame(passo);else el.innerHTML=txt+rest;};requestAnimationFrame(passo);}
function fecharGaveta(){const p=document.getElementById('gaveta');if(!p)return;const g=p.querySelector('.gbody');if(g&&g._casa){g.hidden=true;g._casa.appendChild(g);}p.remove();document.body.classList.remove('gav-on');GAV=null;}
function abrirGaveta(i){const card=document.querySelector('#e-out .path.best');if(!card)return;const g=card.querySelector(`.gbody[data-g="${i}"]`);if(!g)return;fecharGaveta();GAV=i;
  const p=document.createElement('div');p.id='gaveta';p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label',g.dataset.t);
  p.innerHTML=`<div class="g-bg" data-gx></div><div class="g-panel"><div class="g-head"><b>${esc(g.dataset.t)}</b><button class="g-x" data-gx aria-label="Fechar">×</button></div></div>`;
  g._casa=g.parentNode;g.hidden=false;p.querySelector('.g-panel').appendChild(g);document.body.appendChild(p);document.body.classList.add('gav-on');
  p.querySelectorAll('[data-gx]').forEach(x=>x.onclick=fecharGaveta);requestAnimationFrame(()=>p.classList.add('in'));p.querySelector('.g-x').focus();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&GAV!=null)fecharGaveta();});
function proposta(){const card=$('#e-out .path.best');if(!card){GAV=null;return;}
  const abre=GAV;GAV=null;if(document.getElementById('gaveta'))document.getElementById('gaveta').remove();document.body.classList.remove('gav-on');
  // duas colunas: números e próximo passo à esquerda; decisão à direita
  const kids=[...card.children],cab=kids.filter(k=>/best-badge|gname/.test(k.className)||k.tagName==='H3'),fim=kids.filter(k=>k.classList.contains('alerts'));
  const esq=kids.filter(k=>k.classList.contains('bignum')||k.classList.contains('passo'));
  const dir=kids.filter(k=>![...cab,...fim,...esq].includes(k));
  // gavetas: detalhes secundários viram chips (o "Como calculamos" fica no lugar: entra no PDF)
  const det=dir.filter(k=>k.tagName==='DETAILS'&&k.classList.contains('adv')&&!/^Como calculamos/.test(k.textContent.trim()));
  const chips=document.createElement('div');chips.className='gchips no-present';
  det.forEach((d,i)=>{const t=d.querySelector('summary').textContent.trim(),g=document.createElement('div');g.className='gbody';g.dataset.g=i;g.dataset.t=t;g.hidden=true;
    [...d.childNodes].forEach(n=>{if(n.tagName!=='SUMMARY')g.appendChild(n);});
    const b=document.createElement('button');b.className='gchip';b.type='button';b.textContent=t;b.onclick=()=>abrirGaveta(i);chips.appendChild(b);d.replaceWith(g);});
  const L=document.createElement('div'),R=document.createElement('div');L.className='pl';R.className='pr';
  esq.forEach(k=>L.appendChild(k));[...card.querySelectorAll(':scope>.gbody')].forEach(g=>R.appendChild(g));
  dir.filter(k=>k.parentNode===card).forEach(k=>R.appendChild(k));R.appendChild(chips);
  const body=document.createElement('div');body.className='pcols';body.append(L,R);
  (fim[0]||null)?card.insertBefore(body,fim[0]):card.appendChild(body);
  // controle segmentado (celular): uma forma de pagar por vez
  const opts=card.querySelector('.opts');if(opts){const os=[...opts.querySelectorAll('.opt')];if(os.length===2){const seg=document.createElement('div');seg.className='segc';seg.setAttribute('role','tablist');
    os.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','tab');b.textContent=o.querySelector('b').textContent;const on=o.classList.contains('win')||(i===0&&!os.some(x=>x.classList.contains('win')));b.className=on?'on':'';if(!on)o.classList.add('off');
      b.onclick=()=>{os.forEach((x,j)=>x.classList.toggle('off',j!==i));[...seg.children].forEach((c,j)=>c.classList.toggle('on',j===i));};seg.appendChild(b);});opts.before(seg);}}
  if(_rolar){_rolar=false;card.querySelectorAll('.bignum').forEach(rolar);}
  if(abre!=null)abrirGaveta(abre);}

/* ===== Modo Apresentar cinematográfico: uma ideia por tela, fundo escuro, avisos sempre no rodapé ===== */
let _cine=null,_cineI=0,_cineT=null;
function fecharCine(){const o=document.getElementById('cine');if(!o)return;o.remove();document.body.classList.remove('cine-on');document.removeEventListener('keydown',_cineKey);}
function _cineKey(e){if(e.key==='Escape'){fecharCine();}else if(['ArrowRight','ArrowDown','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();irCine(_cineI+1);}else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){e.preventDefault();irCine(_cineI-1);}}
function cenasCine(d){const m=(v,c)=>`<span class="cn" data-v="${v}" data-c="${c||0}">${brl(v)}</span>`;const cn=[];
  cn.push(`<p class="ck">${esc(d.tipo||'Consórcio')} · proposta de ${new Date().toLocaleDateString('pt-BR')}</p><p class="cl">Você recebe</p><h2 class="cb">${m(d.liq)}</h2><p class="cs">${d.cotas} cota${d.cotas>1?'s':''} em ${d.nG} grupo${d.nG>1?'s':''} · ${brl(d.bruto)} em cartas</p>`);
  cn.push(`<p class="ck">Para começar</p><p class="cl">Do seu bolso, de lance</p><h2 class="cb">${m(d.lance)}</h2><p class="cs">${d.fgts>0?'+ '+brl(d.fgts)+' do FGTS · ':''}${d.emb>0?'+ '+brl(d.emb)+' de lance embutido (sai do próprio crédito) · ':''}depois, ${m(d.p1,2)} por mês até contemplar${d.seg?' (com seguro)':''}</p>`);
  const op=(n,x,w)=>`<div class="co${w?' win':''}"><p class="cl">${n}</p><h3 class="cb2">${m(x.total)}</h3><p class="cs">total pago</p><p class="cs">parcela depois: <b>${brl2(x.parcela1)}</b><br>quita em <b>${x.meses} meses</b></p></div>`;
  const dN=Math.abs(d.c.man.total-d.c.red.total);
  cn.push(`<p class="ck">Depois de contemplar, você escolhe</p><div class="cd">${op('Quitar mais rápido',d.c.red,d.rm)}${op('Parcela mais leve',d.c.man,!d.rm)}</div><p class="cs">${d.rm?'Quitar mais rápido':'Parcela mais leve'} custa ${brl(dN)} a menos no total.</p>`);
  if(d.fns&&d.fns.length){cn.push(`<p class="ck">Para comparar</p><p class="cl">Com a mesma entrada de ${m(d.fns[0].m.lance)} e o CET que você informou (${pct(d.cet)} ao ano)</p>${d.fns.map(x=>{const fd=x.f.total-x.m.total;return `<p class="cs"><b>${x.n}</b> · ${x.m.meses} meses</p><div class="cd"><div class="co${fd>=0?' win':''}"><p class="cl">Consórcio</p><h3 class="cb2">${m(x.m.total)}</h3><p class="cs">total pago</p></div><div class="co${fd<0?' win':''}"><p class="cl">Financiamento</p><h3 class="cb2">${m(x.f.total)}</h3><p class="cs">total pago</p></div></div><p class="cs">Em reais, o financiamento sai ${brl(Math.abs(fd))} ${fd>0?'mais caro':'mais barato'}.</p>`;}).join('')}<p class="cs">Financiamento libera o dinheiro hoje; o consórcio só na contemplação, sem garantia de quando.</p>`);}
  if(d.cam){cn.push(caminhoHtml(d.cam,true));const ec=economiaHtml(d.cam,true);if(ec)cn.push(ec);}
  cn.push(`<p class="ck">O que você precisa saber</p><ul class="cw">${(document.querySelector('#e-out .avisos ul')||{innerHTML:''}).innerHTML}</ul>`);
  return cn;}
function irCine(i){const o=document.getElementById('cine');if(!o)return;const ss=[...o.querySelectorAll('.cena')];_cineI=Math.max(0,Math.min(ss.length-1,i));
  ss.forEach((c,j)=>{c.classList.toggle('on',j===_cineI);c.setAttribute('aria-hidden',j!==_cineI);});
  o.querySelectorAll('.cdots i').forEach((x,j)=>x.classList.toggle('on',j===_cineI));
  o.querySelector('.cprev').disabled=_cineI===0;o.querySelector('.cnext').disabled=_cineI===ss.length-1;
  o.querySelectorAll('.cena.on .cn').forEach(el=>{const v=+el.dataset.v,c=+el.dataset.c;if(_reduz()){return;}const ini=performance.now(),dur=900,f=x=>c?brl2(x):brl(x);const pas=t=>{const k=Math.min(1,(t-ini)/dur);el.textContent=f(v*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(pas);else el.textContent=f(v);};requestAnimationFrame(pas);});}
function abrirCine(){if(!_cine){toast('Nada para apresentar ainda: monte o pedido e confira a proposta.');return;}fecharCine();const d=_cine,cs=cenasCine(d);
  const o=document.createElement('div');o.id='cine';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','Apresentação da proposta');
  o.innerHTML=`<button class="cx" aria-label="Sair da apresentação">Sair</button><div class="cstage">${cs.map((h,i)=>`<section class="cena" aria-hidden="true">${h}</section>`).join('')}</div>
  <footer class="cfoot"><div class="cnav"><button class="cprev" aria-label="Anterior">‹</button><div class="cdots">${cs.map(()=>'<i></i>').join('')}</div><button class="cnext" aria-label="Próxima">›</button></div><p class="caviso"><b>Sem garantia nem previsão de contemplação.</b> Simulação informativa, estimada${d.I!=null?' (INPC '+pct2(d.I)+' ao ano)':''}. Lance alvo é histórico do grupo. Não é proposta nem contrato; confirme tudo no sistema oficial.${d.ger?' Gerente: '+esc(d.ger)+'.':''}</p></footer>`;
  document.body.appendChild(o);document.body.classList.add('cine-on');
  o.querySelectorAll('[data-cenc]').forEach(bt=>bt.onclick=()=>{const i=_cineI;S.estr.cen=bt.dataset.cenc;save();renderOferta();abrirCine();irCine(i);});o.querySelector('.cx').onclick=fecharCine;o.querySelector('.cprev').onclick=()=>irCine(_cineI-1);o.querySelector('.cnext').onclick=()=>irCine(_cineI+1);
  let x0=null;o.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});o.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)irCine(_cineI+(dx<0?1:-1));});
  document.addEventListener('keydown',_cineKey);irCine(0);o.querySelector('.cnext').focus();}
let _re=false;
function semaforoHtml(D){ // só para o gerente (no-present): não aparece no Apresentar nem na impressão
  if(!D||!D.L.length)return '';
  const pe=D.liq>0?D.vars[0].m.lance/D.liq*100:0;
  const ms=D.vars.map(v=>{if(!v.fins.length)return null;const bm=v.fins.reduce((a,x)=>x.f.total<a.f.total?x:a);return {v,d:bm.f.total-v.m.total};}).filter(Boolean);
  if(!ms.length)return '';
  const topo=ms.reduce((a,x)=>x.d>a.d?x:a),ganha=topo.d>0,sorG=!!(D.so&&D.so.fins.length&&D.so.fins.some(x=>x.f.total>D.so.r.total));
  let cor,tit,txt;
  if(ganha){cor='ok';tit='Ofertar';txt=`Com a mesma entrada, o consórcio custa ${brl(topo.d)} a menos que financiar em ${topo.v.m.meses} meses.`;}
  else if(sorG){cor='warn';tit='Ofertar com ressalva';txt=`Com este lance, financiar sai ${brl(-topo.d)} mais barato (${topo.v.m.meses} meses). O consórcio vale se o cliente aceitar esperar o sorteio, não tiver a entrada ou o banco recusar.`;}
  else{cor='warn';tit='Pensar antes de ofertar';txt=`Com este lance, financiar sai ${brl(-topo.d)} mais barato, e sem lance também não compensa. Só faz sentido se o banco recusar o cliente.`;}
  return `<div class="gate ${cor} no-present"><b>${tit}</b> · entrada de ${pct(pe)} do crédito. ${txt}<br><small>Precisa do bem rápido? Só com lance arrojado, acima do histórico do grupo, e sem garantia: o cliente topa dar esse lance? Painel só do gerente, não vai para o cliente.</small></div>`;}
function renderOferta(){const E=S.estr;const out=$('#e-out');const nAntes=E.bestN;let CAMH='',CENH='',ECOH='',ACOES='',SEMH='';
  if(!E.feito||!(num(E.valor)>0)){out.innerHTML=`<div class="card empty">Monte um pedido primeiro. <a href="#" data-go="estrategia">Ir para Pedido</a></div>`;return;}
  const vars=[['Menor lance do bolso','bolso'],['Mais cartas','mais'],['Menor parcela','parcela'],['Sem lance (só sorteio)','semlance'],['Menos cartas','cotas'],['Menor prazo','prazo']].map(([nome,pr])=>[nome,nome,pr]).map(([k,nome,pr])=>({k,nome,r:montarAuto(E,pr)}));
  const I=inpcAtual();const R=E.sg!=='0'?((num(E.sgp)>0?num(E.sgp):segTaxaDe(E.tipo))/100):0;const K=R;const segE=t=>R*(t.sdEst||0),segI=t=>segE(t)+(t.segReal||0);const P1=t=>t.p1+segE(t),P2=t=>t.p2+(t.p1>0?segE(t)*t.p2/t.p1:0);
  const depoisOld=t=>`<table class="cmp" style="margin-top:8px;font-size:12px"><thead><tr><th>Depois de contemplar (mês ${t.mes})</th><th>Parcela</th><th>Por mais</th></tr></thead><tbody><tr><td><b>Manter o prazo</b><br><span style="font-size:11px">parcela mais leve</span></td><td class="num" style="white-space:nowrap">~ ${brl2(P2(t))}</td><td class="num" style="white-space:nowrap">${faixaM(t.pmMin,t.pmMax)} meses</td></tr>${t.mrMax!=null?`<tr><td><b>Reduzir o prazo</b><br><span style="font-size:11px">mesma parcela, quita antes</span></td><td class="num" style="white-space:nowrap">${brl2(P1(t))}</td><td class="num" style="white-space:nowrap">~ ${faixaM(t.mrMin,t.mrMax)} meses</td></tr>`:''}</tbody></table>`;
  const depois=(t,r,pri)=>{const c=custoVar(r,mesC(),E.sg!=='0',R,I.v/100);return c?(pri?blocoDecisao(c,I,t):blocoMini(c)):depoisOld(t);};
  const vence=(t,r)=>{const c=custoVar(r,mesC(),E.sg!=='0',R,I.v/100);return c?blocoVence(E,t,c,I,r,R):'';};
  const extras=(t,r)=>{const c=custoVar(r,mesC(),E.sg!=='0',R,I.v/100);return c?`<div data-aba="comparar">${blocoFin(E,t,c,I,P1(t))+blocoEspera(r,E,R,I)}</div><div data-aba="conferir">${comoCalc(r,E,R,I,c)}</div>`:'';};
  const rec=num(E.rec),p1=num(E.p1),p2=num(E.p2);
  const fg=E.tipo==='Imobiliário'?Math.max(0,num(E.fgts)||0):0;const fgU=t=>Math.min(fg,t.bolso),cli=t=>t.bolso-fgU(t); // FGTS cobre parte do lance livre
  const cabe=t=>{const a=[];if(rec!=null&&E.rec!=='')a.push(cli(t)<=rec+0.5?null:`lance do bolso ${brl(cli(t))} > ${brl(rec)} (faltam ${brl(cli(t)-rec)})`);if(p1>0)a.push(P1(t)<=p1+0.5?null:`parcela até contemplar ${brl2(P1(t))} > ${brl2(p1)}`);if(p2>0)a.push(P2(t)<=p2+0.5?null:`parcela depois ${brl2(P2(t))} > ${brl2(p2)}`);return a.filter(Boolean);};
  const informou=(rec!=null&&E.rec!=='')||p1>0||p2>0;const ok=vars.map(v=>v.r&&!v.r.erro&&cabe(v.r.tot).length===0);
  let best=-1;{let el=vars.map((v,i)=>({v,i})).filter(x=>x.v.r&&!x.v.r.erro&&(!informou||ok[x.i]));const comLance=el.filter(x=>x.v.r.prior!=='semlance');if(comLance.length)el=comLance; // a oferta consultiva é com lance; "só sorteio" fica como alternativa
    if(el.length){el.sort((a,b)=>(Math.round(cli(a.v.r.tot)/100)-Math.round(cli(b.v.r.tot)/100))||(b.v.r.tot.cotas-a.v.r.tot.cotas)||(a.v.r.tot.p1-b.v.r.tot.p1));best=el[0].i;}} // foco: menor lance do bolso; empate → mais bilhetes, depois menor parcela
  S.estr.bestK=best>=0?vars[best].k:'';S.estr.bestReal=best>=0&&!!vars[best].r.real;S.estr.bestN=best>=0?vars[best].r.tot.cotas:0;S.estr.busca=best>=0?instrucaoBusca(vars[best].r):'';if(E.bestN&&E.bestN!==nAntes&&!_re){_re=true;try{renderOferta();}finally{_re=false;}return;}S.estr.buscaL=best>=0?vars[best].r.linhas.map(l=>({cod:l.g.cod,carta:l.carta,n:l.n})):[];save();
  const titulo=E.modo==='liquido'?`${brl(num(E.valor))} líquido`:`${brl(num(E.valor))} bruto`;
  const lf=num(E.lf);
  const passo=r=>{const tx=r.real?`<b>Próximo passo:</b> confirmar no sistema vagas e parcela de ${esc(instrucaoBusca(r))}.`:(()=>{const R=roteiro(E);return R?`<b>Próximo passo:</b> buscar as cotas no vendas.seguridade e colar em <a href="#" data-go="cotas" style="font-weight:600">Busca</a>. Até lá, os valores são estimativa pelos grupos do portal.`:'';})();return tx?`<div class="passo">${tx}</div>`:'';};
  const card=(v,i,principal)=>{const r=v.r;if(!r||r.erro)return `<div class="card path"><h3>${esc(v.nome)}</h3><div class="al" style="margin-top:8px">${esc(r?r.erro:'Informe o valor')}</div></div>`;const t=r.tot;const probs=cabe(t);
    const bilhetes=t.temHist?`<div class="dist" style="margin-top:8px"><b style="color:var(--ink)">Bilhetes por assembleia (histórico):</b> ${t.cotas} cota${t.cotas>1?'s':''} = ${t.cotas} bilhete${t.cotas>1?'s':''} no sorteio (≈ ${(t.sorteio*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}% de chance de pelo menos uma contemplação por sorteio, pelo histórico de 1 sorteado por assembleia)${lf>0?` · lance fixo: cerca de ${Math.round(t.cotas*lf/100*10)/10} cota(s) participando (regra de bolso ${pct(lf)})`:''} · na última assembleia desses grupos, ${t.lanceUlt} contemplaram por lance. Cada contemplação traz ${t.menorCota===t.maiorCota?brl(t.menorCota):'entre '+brl(t.menorCota)+' e '+brl(t.maiorCota)}.</div>`:'';
    return `<div class="card path ${principal?'best':''}">${principal?'<div class="best-badge">Recomendada</div>':''}<h3>${esc(v.nome)}</h3><div class="gname">${(n=>`${t.cotas} cota${t.cotas>1?'s':''} em ${n} grupo${n>1?'s':''}`)(new Set(r.linhas.map(l=>l.g.cod)).size)} · ${brl(t.bruto)} em cartas · recebe ${brl(t.liq)}</div>
    <div ${principal?'data-aba="resumo"':''}><div class="bignum${principal?' lance':''}">${brl(cli(t))}<small>de lance do bolso ${gl('bolso')}${fgU(t)>0?' · + '+brl(fgU(t))+' do FGTS':''}${t.emb>0?' · + '+brl(t.emb)+' embutido ':''}${t.emb>0?gl('embutido'):''}</small></div>
    <div class="bignum p2">${brl2(P1(t))}<small>por mês até contemplar${E.sg!=='0'&&K>0?' (com seguro)':''}</small></div>
    ${depois(t,r,principal)}</div>
    <div ${principal?'data-aba="comparar"':''}>${principal?vence(t,r)+CAMH+ECOH:''}</div>
    <div ${principal?'data-aba="resumo"':''}>${bilhetes}${principal?passo(r):''}</div>
    ${principal?extras(t,r):''}
    <details class="adv" ${principal?'data-aba="conferir"':''}><summary>Grupos e cotas</summary><table class="cmp" style="margin-top:4px;font-size:12px"><thead><tr><th>Grupo</th><th>Cotas</th><th>Carta</th><th>Lance bolso</th><th>Últ. assembleia</th></tr></thead><tbody>${r.linhas.map(l=>`<tr><td>${esc(l.g.cod)}<br><span style="font-size:11px;color:var(--muted);font-weight:400">alvo ${l.alvo!=null?pct(l.alvo):'—'} · emb ${pct(l.le)} · TA ${pct(num(l.g.ta))}${l.real?' · vagas '+(l.ultimas?'últimas':l.vagas):''}${l.x&&l.x.plano==='Reduzida'?' · plano reduzido':''}${l.x&&l.x.derivada?' · carta calculada':''}${l.camp?' · <b>código '+esc(l.camp.cod)+'</b>':''}</span></td><td class="num">${l.n}</td><td class="num">${brl(l.carta)}</td><td class="num">${brl(l.bolso*l.n)}</td><td class="num" style="font-size:11px">${l.g.cs!==''&&l.g.cs!=null?`${l.g.cs} sorteio · ${l.g.cl} lance`:'—'}${(t=>t?`<br><span style="color:${t.sobe?'var(--warn)':'var(--muted)'}">${esc(t.txt)}</span>`:'')(tendencia(l.g))}</td></tr>`).join('')}</tbody></table></details>
    <div class="alerts"${principal?' data-aba="resumo"':''}>${probs.map(a=>`<div class="al">Não cabe: ${esc(a)}</div>`).join('')}${(()=>{const s=[...new Set(r.linhas.filter(l=>(tendencia(l.g)||{}).sobe).map(l=>l.g.cod))];return s.length?`<div class="al">Lance subindo no grupo ${esc(s.join(', '))}: o alvo do mês passado pode ficar curto. Histórico, não previsão.</div>`:'';})()}${(()=>{const l=r.linhas.find(l=>l.x&&l.x.plano==='Reduzida');if(!l)return '';const c=S.comp[compK(l.x)]||compDoGrupo(l.x.gid,'Reduzida')||{},n=compDoGrupo(l.x.gid,'Normal');return `<div class="al info">Plano reduzido: parcela menor, mas taxa adm ${pct(c.ta)}${n?` (normal ${pct(n.ta)})`:''}${c.aCobrarPct>0?` e ${pct(c.aCobrarPct)} do crédito fica a cobrar (já somado no saldo de depois; quando é cobrado: sem fonte confirmada)`:''}.</div>`;})()}${informou&&!probs.length?'<div class="al ok">Cabe no bolso</div>':''}${r.linhas.some(l=>l.sobra)?`<div class="al info">Fechou com cota cheia; sobram ${brl(r.linhas.find(l=>l.sobra).sobra)} de crédito.</div>`:''}</div></div>`;};
  const b=best>=0?vars[best]:null;const PR=prontidao(b,I);
  const DC=b&&!b.r.erro?dadosCam(E,b,I,R,cli,fgU):null;CAMH=caminhoHtml(DC,false);ECOH=economiaHtml(DC,false);SEMH=semaforoHtml(DC);CENH=b?blocoCenarios(E,b):'';ACOES=`<div class="acoes no-present"><div class="ac-res">${b&&!PR.bloq?`<span>Como terminou?</span><button class="chip" data-res="fechou">Fechou</button><button class="chip" data-res="negociando">Negociando</button><button class="chip" data-res="nao_fechou">Não fechou</button>`:''}</div><div class="ac-btns">${b?`<button class="btn" id="o-msg" ${PR.bloq?'disabled':''}>Copiar mensagem</button>`:''}<button class="btn" id="o-save">Salvar no aparelho</button><button class="btn ghost" id="o-new">Novo cliente</button><button class="btn" id="o-share" ${PR.bloq?'disabled':''}>Copiar link</button><button class="btn" id="o-print" ${PR.bloq?'disabled':''}>PDF / Imprimir</button><button class="btn primary" id="o-present" ${PR.bloq?'disabled':''}>Apresentar</button></div></div>`;
  const FALTA=b&&E.modo==='liquido'&&num(E.valor)>0&&b.r.tot.liq<num(E.valor)-1?`<div class="al" data-aba="resumo">Faltam ${brl(num(E.valor)-b.r.tot.liq)} para chegar aos ${brl(num(E.valor))} pedidos.</div>`:'';
  const C=E.conf||(E.conf={});const confIt=b?[['p1','Parcela até contemplar',P1(b.r.tot)],['liq','Crédito líquido',b.r.tot.liq],['sd','Saldo após o lance (sem seguro)',b.r.tot.sdApos]]:[];
  const confHtml=`<details class="adv no-present" style="margin-top:14px" ${confIt.some(([k])=>num(C[k])>0)?'open':''}><summary>Conferir com a proposta oficial</summary><p class="sub" style="margin-top:6px">Digite os números da proposta do sistema para a oferta recomendada (proposta por cota: some as cotas). Diferença acima de 1% fica marcada. Confere a conta, não substitui a proposta.</p><div class="cmp-wrap"><table class="cmp" style="font-size:12px"><thead><tr><th></th><th>Simulador</th><th>Oficial</th><th>Diferença</th></tr></thead><tbody>${confIt.map(([k,n,v])=>`<tr><td>${n}</td><td class="num">${brl2(v)}</td><td><input data-conf="${k}" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(C[k]??'')}" style="width:105px"></td><td class="num" id="conf-${k}">—</td></tr>`).join('')}</tbody></table></div><div id="conf-res" class="hint" style="margin-top:6px"></div></details>`;
  out.innerHTML=`<div class="hero"><h1>Proposta · ${titulo}</h1><p>${E.nome&&!document.body.classList.contains('present')?esc(E.nome)+' · ':''}${esc(E.tipo||'qualquer tipo')} · ${new Date().toLocaleDateString('pt-BR')} · valores estimativos, a confirmar no sistema oficial${E.ger?' · Gerente: '+esc(E.ger):''}</p></div>
  <div class="abas-wrap" data-ab="${abaAtual()}">${abasBarra()}<div data-aba="resumo">${PR.html}${SEMH}${FALTA}${CENH}</div><div data-aba="conferir">${fonteOferta(vars)}${campOferta(vars)}</div>
  ${b?'':`<div class="concl none" data-aba="resumo" style="margin:0 0 14px">Nenhuma variante fechou${informou?' dentro do bolso':''}. Cole mais grupos, aumente o máximo de cotas ou ajuste o bolso.</div>`}
  ${b?card(b,best,true):''}
  <div data-aba="resumo">${ACOES}</div>
  ${b?`<div data-aba="conferir">${confHtml}</div>`:''}
  <details class="adv no-present" data-aba="comparar" style="margin-top:14px"><summary>Ver as outras ${vars.length-(b?1:0)} variantes</summary><div class="grid c3" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-top:10px">${vars.map((v,i)=>i===best?'':card(v,i,false)).join('')}</div></details>
  ${E.sg!=='0'?`<div data-aba="conferir">${blocoSeguro(b,segI)}</div>`:''}
  </div>
  <div class="aviso-main"><b>Antes de decidir</b><ul><li><b>Sem garantia de contemplação.</b> O lance alvo é o histórico do grupo, não previsão do lance vencedor.</li><li><b>É estimativa.</b> Os valores usam o mês de contemplação informado e o INPC; o índice futuro não é conhecido.</li><li><b>Não é proposta nem contrato.</b> Confirme taxas, parcelas, prazos e grupos no sistema oficial: esta ferramenta não substitui a simulação oficial.</li></ul></div>
  <div class="avisos"><b>Condições desta simulação</b><ul><li>O lance embutido reduz o crédito recebido.</li><li>Parcelas e totais estimados: ${I.fonte?'reajuste anual pelo INPC ('+pct2(I.v)+' ao ano, '+I.fonte+'; o índice futuro não é conhecido)':'sem reajuste (INPC não informado)'}${K>0||E.sg!=='0'?'; seguro prestamista proporcional ao saldo':''}; "depois" supõe todas as cotas contempladas no mês ${mesC()}, cenário ${nomeCen(cenAtual()).toLowerCase()} (estimativa do app: pode ser antes ou depois).</li><li>Válida só com o gerente que a gerou.</li><li>Depois do lance, o cliente escolhe reduzir o prazo ou a parcela; a parcela nova não pode ficar abaixo de 20% da atual (FAQ do portal). Prazo de "reduzir" estimado pelo saldo.</li>${fg>0?'<li>Uso do FGTS no lance depende das regras do FGTS e da administradora: confirmar antes de oferecer.</li>':''}${E.red==='1'?'<li>Plano reduzido: parte do crédito fica a cobrar (detalhamento do sistema); quando é cobrada, sem fonte confirmada.</li>':''}${vars.some(v=>v.r&&!v.r.erro&&v.r.linhas.some(l=>l.camp))?'<li>Campanha: condição promocional com validade; não vale para plano reduzido; exige débito em conta CAIXA a partir da 2ª parcela (banner da administradora).</li>':''}</ul></div>
  </div>`;
  $('#o-present').onclick=()=>{if(!PR.bloq){logar('usou',{acao:'apresentar'});abrirCine();}};$('#o-share').onclick=()=>{if(!PR.bloq){logar('usou',{acao:'link'});shareLink();}};$('#o-print').onclick=()=>{if(!PR.bloq){logar('usou',{acao:'pdf'});window.print();}};
  {const nb=$('#o-new');if(nb)nb.onclick=()=>{if(!window.confirm('Começar outro cliente? Nome, campanha e desconto digitados saem da tela (a simulação salva continua salva).'))return;['nome','sid','campL','aba'].forEach(k=>{delete S.estr[k];});S.estr.dsc='';S.estr.feito=false;save();go('estrategia');renderOferta();toast('Pronto para outro cliente');};}
  {const sb=$('#o-save');if(sb)sb.onclick=()=>{if(salvarSim())toast('Simulação de '+S.estr.nome+' salva neste aparelho');};}
  $$('[data-res]').forEach(el=>el.onclick=()=>{const it=(S.salvas||[]).find(x=>x.sid===S.estr.sid);if(it){it.res=el.dataset.res;it.snap.estr=clonar(S.estr);save();renderSalvas();}else if(!salvarSim(el.dataset.res))return;logar('resultado',{res:el.dataset.res});$$('[data-res]').forEach(x=>x.classList.toggle('on',x===el));toast('Registrado, obrigado.');});
  $$('[data-cen]').forEach(el=>el.onclick=()=>{E.cen=el.dataset.cen;save();renderOferta();});
  {const ci=$('#cet-in');if(ci)ci.onchange=()=>{S.fin=S.fin||{};S.fin.cet=ci.value.trim();const f=$('#f-cet');if(f)f.value=S.fin.cet;save();renderOferta();};}
  $$('[data-aba-go]').forEach(el=>el.onkeydown=e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const L=[...$$('[data-aba-go]')],i=L.indexOf(el),n=L[(i+(e.key==='ArrowRight'?1:L.length-1))%L.length];e.preventDefault();n.click();const x=$('[data-aba-go].on');if(x)x.focus();});
  $$('[data-aba-go]').forEach(el=>el.onclick=()=>{S.estr.aba=el.dataset.abaGo;save();const w=$('.abas-wrap');if(w)w.dataset.ab=S.estr.aba;$$('[data-aba-go]').forEach(x=>{const on=x===el;x.classList.toggle('on',on);x.setAttribute('aria-selected',on);});window.scrollTo({top:0});});
  $$('[data-tg]').forEach(el=>el.onclick=()=>{const t=TG[el.dataset.tg],E=S.estr,on=t.on(E);if(!on&&t.falta){const f=t.falta(E);if(f==='ABRIR'){const d=$('#camp-man');if(d){d.open=true;const i=$('#cm-desc');if(i)i.focus();}return;}if(f){toast(f);return;}}t.set(E,!on);save();renderOferta();});
  {const di=$('#cm-desc'),rm=$('#cm-rm');if(di)di.onchange=()=>{const raw=di.value.trim().replace(',','.');if(raw===''){delete S.estr.campL;save();renderOferta();return;}const v=parseFloat(raw);
    if(isNaN(v)||v<0||v>100){toast('Informe um desconto entre 0 e 100%');return;}S.estr.campL={desc:v};S.estr.dsc='';save();renderOferta();toast('Campanha de −'+String(v).replace('.',',')+'% aplicada');};
   if(rm)rm.onclick=()=>{delete S.estr.campL;save();renderOferta();toast('Campanha removida');};}
  proposta();
  _cine=null;if(b&&!PR.bloq){const t=b.r.tot,c=custoVar(b.r,mesC(),E.sg!=='0',R,I.v/100);if(c){const F=S.fin||{},cet=num(String(F.cet||'').replace(',','.')),rm=c.red.total<=c.man.total,mel=rm?c.red:c.man,sis=F.sis||(E.tipo==='Imobiliário'?'sac':'price');
    const fns=F.cet!==''&&F.cet!=null&&cet>=0?[['Quitar mais rápido',c.red],['Parcela mais leve',c.man]].map(([n,mm])=>({n,m:mm,f:finComEntrada({liq:t.liq,entrada:mm.lance,cetAA:cet/100,meses:mm.meses,sistema:sis,inpc:I.v/100})})).filter(x=>x.f):null;
    _cine={liq:t.liq,bruto:t.bruto,cotas:t.cotas,nG:new Set(b.r.linhas.map(l=>l.g.cod)).size,lance:cli(t),fgts:fgU(t),emb:t.emb,p1:P1(t),seg:E.sg!=='0'&&K>0,c,rm,mel,fns,cet,sis,mes:mesC(),tipo:E.tipo||'',ger:E.ger||'',titulo,I:I.fonte?I.v:null,cam:DC};}}
  if(b&&!PR.bloq){const k=[E.valor,E.tipo,E.max,mesC(),E.modo].join('|'),prim=_ult!==k;_ult=k;if(prim&&_cine)logar('proposta',{tipo:E.tipo,liq:Math.floor(_cine.liq/5000)*5000,lancePct:_cine.liq>0?_cine.lance/_cine.liq*100:null,cotas:_cine.cotas,grupos:_cine.nG,mes:_cine.mes,inpc:I.v,rm:_cine.rm,fin:!!(_cine.fns&&_cine.fns.length),real:b.r.linhas.some(l=>l.real)});}
  if(b){const updConf=()=>{let n=0,ok1=0;confIt.forEach(([k,,v])=>{const o=num(C[k]),cel=$('#conf-'+k);if(!(o>0)||v==null){cel.textContent='—';return;}n++;const d=v-o,p=Math.abs(d)/o;if(p<=0.01)ok1++;cel.innerHTML=`${d>=0?'+':'−'} ${brl2(Math.abs(d))} <span class="tag ${p<=0.01?'ok':'warn'}">${pct(p*100)}</span>`;});
      $('#conf-res').textContent=n<confIt.length?`Pendente: ${n} de ${confIt.length} valores oficiais.`:ok1===n?`✔ Os ${n} valores batem dentro de 1%.`:`⚠ ${n-ok1} valor(es) com diferença acima de 1%: confira grupo, carta, lance, seguro e mês da contemplação.`;};
    $$('[data-conf]').forEach(el=>el.oninput=()=>{C[el.dataset.conf]=el.value;save();updConf();});updConf();}
  if(b){$('#o-msg').onclick=()=>{const t=b.r.tot,nG=new Set(b.r.linhas.map(l=>l.g.cod)).size,sg=E.sg!=='0'&&K>0,cm=custoVar(b.r,mesC(),E.sg!=='0',R,I.v/100);if(PR.bloq)return;logar('usou',{acao:'msg'});
    const txt=[`*Proposta de consórcio · ${titulo}*${E.tipo?' ('+E.tipo+')':''}`,
      `• ${t.cotas} cota${t.cotas>1?'s':''} (${brl(t.bruto)} em cartas) em ${nG} grupo${nG>1?'s':''}`,
      `• Lance do bolso: ${brl(cli(t))}${fgU(t)>0?' + '+brl(fgU(t))+' do FGTS':''}${t.emb>0?' + '+brl(t.emb)+' embutido (sai do próprio crédito)':''}`,
      `• Parcela até contemplar: ${brl2(P1(t))}${sg?' (com seguro prestamista)':''}`,
      `• Depois de contemplar (estimativa no mês ${t.mes}), escolha:`,
      ...(cm?[`   – quitar mais rápido: cerca de ${brl2(cm.red.parcela1)} por mês, quita em ${cm.red.meses} meses · total pago ≈ ${brl(cm.red.total)}`,`   – parcela mais leve: cerca de ${brl2(cm.man.parcela1)} por mês, quita em ${cm.man.meses} meses · total pago ≈ ${brl(cm.man.total)}`]:[
      `   – manter o prazo: cerca de ${brl2(P2(t))} por mês, por mais ${faixaM(t.pmMin,t.pmMax)} meses`,
      ...(t.mrMax!=null?[`   – reduzir o prazo: ${brl2(P1(t))} por mês, quita em cerca de ${faixaM(t.mrMin,t.mrMax)} meses`]:[])]),
      ...(cm?(()=>{const tv=textoVence(limVence(E,t,cm,I)),ec=econCamp(b);return [...(ec>0.5&&E.dsc!=='0'?[`• Campanha informada pelo gerente (a confirmar com a administradora): economia de ≈ ${brl(ec)} no total do plano`]:[]),...(tv?[`• Contra financiamento (se contemplar no mês ${mesC()}, estimativa sem garantia; financiamento libera o dinheiro hoje): ${tv}`]:[])];})():[]),
      `• Cada contemplação libera ${t.menorCota===t.maiorCota?brl(t.menorCota):'de '+brl(t.menorCota)+' a '+brl(t.maiorCota)}`,
      '',`Valores estimados em ${new Date().toLocaleDateString('pt-BR')}, a confirmar na simulação oficial da administradora. Contemplação por sorteio ou lance, sem garantia de prazo; o lance usado é o histórico do grupo, não previsão. Total pago estimado com reajuste anual pelo INPC e seguro que cai com o saldo.${E.ger?'\nGerente: '+E.ger:''}`].join('\n');
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Mensagem copiada (sem nome do cliente)')).catch(()=>prompt('Copie a mensagem:',txt));};}
}
const numBR=x=>{const n=parseFloat(String(x).replace(/\./g,'').replace(',','.').replace('%',''));return isFinite(n)?n:null;};
const reMoney=/^\d{1,3}(\.\d{3})*,\d{2}$/,rePct=/^\d+(,\d+)?%$/,reDate=/^\d{2}\/\d{2}\/\d{4}$/,reNumBR=/^\d{1,3}(\.\d{3})*,\d+$/;
const codN=c=>String(c||'').replace(/\D/g,'').replace(/^0+/,'');
const linhasDe=t=>String(t).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const compK=x=>x.gid+'|'+x.plano+'|'+x.carta;
function lerLista(txt){const L=linhasDe(txt),rows=[];
  const mk=(cod,d,carta,dt,pr,vg,pa,pc,lm)=>{const [dd,mm,aa]=dt.split('/'),nv=/^\d+$/.test(vg);d=d.trim();
    return {cod,gid:codN(cod),desc:d,plano:/REDUZIDA/i.test(d)?'Reduzida':'Normal',tipo:/^IMO/i.test(d)?'Imobiliário':/^(VEI|AUTO)/i.test(d)?'Veículos':'',carta:numBR(carta),ass:`${aa}-${mm}-${dd}`,prazo:+pr,vagas:nv?+vg:null,vagasTxt:nv?'':vg,part:+pa,parc:numBR(pc),lm:numBR(lm)};};
  const reLinha=/^(\d{3,6})\s+(.*?[A-Za-zÀ-ú].*?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d+(?:,\d+)?%)$/;
  for(let i=0;i<L.length;i++){
    const m=L[i].match(reLinha);if(m){rows.push(mk(...m.slice(1)));continue;} // uma cota por linha (texto do e-mail)
    if(i>L.length-9||!/^\d{3,6}$/.test(L[i]))continue; // uma célula por linha (tela do sistema)
    const d=L[i+1];if(!/[A-Za-zÀ-ú]/.test(d)||!reMoney.test(L[i+2]||'')||!reDate.test(L[i+3]||''))continue;
    let j=i+4;const pr=L[j++],vg=L[j++],pa=L[j++],pc=L[j++],lm=L[j++];
    if(!/^\d+$/.test(pr||'')||!/^\d+$/.test(pa||'')||!reMoney.test(pc||'')||!rePct.test(lm||''))continue;
    rows.push(mk(L[i],d,L[i+2],L[i+3],pr,vg,pa,pc,lm));i=j-1;}
  return rows;}
// detalhamento: um bloco por cota (normal/reduzida, com/sem prestamista); colunas [fc%,fcR,ta%,taR,ad%,adR,fr%,frR,segR,totalR]
function lerComp(txt){const L=linhasDe(txt),ini=[],blocos=[];
  for(let i=0;i<L.length-8;i++)if(/^\d{3,6}$/.test(L[i])&&/[A-Za-zÀ-ú]/.test(L[i+1])&&reMoney.test(L[i+2])&&reDate.test(L[i+3]))ini.push(i);
  ini.forEach((a,k)=>{const B=L.slice(a,k+1<ini.length?ini[k+1]:L.length);const cab=lerLista(B.slice(0,9).join('\n'))[0];if(!cab)return;
    const v10=j=>{const v=B.slice(j+1,j+11);return v.length===10&&v.every(x=>reNumBR.test(x))?v.map(numBR):null;};
    let sub=null,cob=null,tot=null;const linhas=[];
    for(let i=9;i<B.length;i++){
      if(/^\d+$/.test(B[i])&&/^\d+$/.test(B[i+1]||'')){const v=B.slice(i+2,i+12);if(v.length===10&&v.every(x=>reNumBR.test(x))){linhas.push({ini:+B[i],fim:+B[i+1],v:v.map(numBR)});i+=11;continue;}}
      if(/^SubTotal$/i.test(B[i]))sub=v10(i);else if(/^% a cobrar/i.test(B[i]))cob=v10(i);else if(/^Total$/i.test(B[i]))tot=v10(i);}
    if(!linhas.length||!sub)return;const T=tot||sub;
    blocos.push({cab,ta:T[2],fr:T[6],seg1:linhas[0].v[8],parc1:linhas[0].v[9],saldoSS:T[9]-T[8],aCobrar:cob?cob[9]:0,aCobrarPct:cob?cob[0]:0,prazo:linhas[linhas.length-1].fim});});
  return blocos;}
const venceu=c=>{const hj=new Date().toISOString().slice(0,10);return (c.ass&&c.ass<hj)||(c.em&&(Date.now()-new Date(c.em).getTime())>30*864e5);};
function regHistLista(rows){const m=new Date().toISOString().slice(0,7);let mudou=false; // lance médio da lista vira ponto do histórico (o do portal tem prioridade no mês)
  [...new Map(rows.filter(r=>r.lm>0).map(r=>[r.gid,r.lm])).entries()].forEach(([gid,lm])=>{const g=S.grupos.find(x=>codN(x.cod)===gid);if(!g)return;const e=(g.h||[]).find(x=>x.m===m);
    if(e){if(e.d==null){e.d=lm;mudou=true;}}else{g.h=[...(g.h||[]),{m,n:null,d:lm}].sort((a,b)=>a.m.localeCompare(b.m)).slice(-24);mudou=true;}});
  if(mudou)empurrarGrupos();}
function guardarColagem(t){const em=new Date().toISOString();
  const up=r=>{r.em=em;const i=S.cotasL.findIndex(x=>compK(x)===compK(r));if(i>=0){S.cotasL[i]={...S.cotasL[i],...r};return 0;}S.cotasL.push(r);return 1;};
  const bl=lerComp(t);
  if(bl.length){const resumo={};
    bl.forEach(b=>{const x=b.cab;up(x);const k=compK(x),comSeg=b.seg1>0;
      S.comp[k]={...(S.comp[k]||{}),ta:b.ta,fr:b.fr,prazo:b.prazo,saldoSS:b.saldoSS,aCobrar:b.aCobrar,aCobrarPct:b.aCobrarPct,em,...(comSeg?{seg1:b.seg1}:{})};
      if(comSeg){S.segTaxa=Math.round(b.seg1/b.saldoSS*1e6)/1e4;(S.segTx=S.segTx||{})[x.tipo==='Imobiliário'?'Imobiliário':'Veículos']=S.segTaxa;S.segInfo=`composição de ${new Date().toLocaleDateString('pt-BR')}: grupo ${x.cod}, seguro ${brl2(b.seg1)} por mês sobre saldo de ${brl(b.saldoSS)}`;}
      if(Math.abs(b.parc1-x.parc)<0.02)S.listaSeg=comSeg?'com':'sem'; // a parcela da lista bate com o bloco com ou sem prestamista
      resumo[x.plano]=`${x.plano}: taxa adm ${pct(b.ta)}${b.aCobrarPct>0?`, ${pct(b.aCobrarPct)} do crédito a cobrar`:''}`;});
    regHistLista(bl.map(b=>b.cab));const ls=lerLista(t).filter(r=>!bl.some(b=>compK(b.cab)===compK(r)));let nv=0;ls.forEach(r=>{nv+=up(r);});if(ls.length)regHistLista(ls);save(); // colagem mista: a lista que veio junto também entra
    return `Detalhamento lido (${bl.length} bloco${bl.length>1?'s':''}, grupo${new Set(bl.map(b=>b.cab.gid)).size>1?'s':''} ${[...new Set(bl.map(b=>b.cab.cod))].join(', ')}). ${Object.values(resumo).join(' · ')}.${ls.length?` Lista: ${ls.length} linhas, ${new Set(ls.map(r=>r.gid)).size} grupos.`:''} Parcela da lista: ${S.listaSeg==='com'?'com':'sem'} seguro.`;}
  const lista=lerLista(t);
  if(lista.length){let novos=0;lista.forEach(r=>{novos+=up(r);});regHistLista(lista);save();
    return `Lista lida: ${lista.length} linhas, ${new Set(lista.map(r=>r.gid)).size} grupos (${novos} novas, ${lista.length-novos} atualizadas ou repetidas).`;}
  return 'Não reconheci o texto. Cole a lista "Grupos Disponíveis" ou o detalhamento da cota, inteiro.';}
function segDe(x){ // seguro, saldo sem seguro e parcela sem seguro de uma cota: real se o detalhamento dela foi lido, senão derivado
  let c=S.comp[compK(x)],k=1;const r=segTaxaDe(x.tipo)/100,sem=S.listaSeg!=='com';
  if(!(c&&c.saldoSS>0)){const g=compDoGrupo(x.gid,x.plano);if(g&&g.saldoSS>0&&g.carta>0){c=g;k=x.carta/g.carta;}} // mesmo grupo e plano: tudo é proporcional à carta
  if(c&&c.saldoSS>0){const ss=c.saldoSS*k,seg=c.seg1!=null?c.seg1*k:(r>0?r*ss:null);return {seg,real:c.seg1!=null&&k===1,ss,parcSem:sem?x.parc:x.parc-(seg||0)};}
  if(x.plano==='Reduzida')return {seg:null,ss:null};
  if(sem){const ss=x.parc*x.prazo;return {seg:r>0?r*ss:null,real:false,ss,parcSem:x.parc};}
  const ss=r>0?x.parc*x.prazo/(1+r*x.prazo):x.parc*x.prazo,seg=r>0?r*ss:null;return {seg,real:false,ss,parcSem:x.parc-(seg||0)};}
const compDoGrupo=(gid,plano)=>{const e=Object.entries(S.comp).find(([k])=>k.startsWith(gid+'|'+plano+'|'));return e?{...e[1],carta:+e[0].split('|')[2]}:null;};
// uma linha por grupo basta: carta = fator do grupo × valor nominal ("R$ 130 Mil"); parcela = % fixo da carta (conferido em 201 cotas reais)
const nomDe=d=>{const m=String(d||'').match(/R\$\s*([\d.]+)\s*Mil/i);return m?+m[1].replace(/\./g,'')*1000:null;};
// leve e pesado têm regras e taxas diferentes: a cota colada só entra no tipo do grupo dela (grupo do portal ou prefixo do código)
function tipoCota(x){const g=S.grupos.find(g=>codN(g.cod)===x.gid);return (g&&g.tipo)||tipoDoCod(x.cod)||null;}
function tipoCasa(x,t){if(!t)return true;const k=tipoCota(x);return k?(t==='Veículos'?/^Veículos/.test(k):k===t):(t==='Imobiliário'?x.tipo==='Imobiliário':x.tipo==='Veículos');}
function cotasComModelo(){const out=[...S.cotasL],por={},fator={};
  S.cotasL.forEach(x=>{(por[x.gid+'|'+x.plano]=por[x.gid+'|'+x.plano]||[]).push(x);const n=nomDe(x.desc);if(n&&x.plano==='Normal')fator[x.gid]=x.carta/n;});
  Object.values(por).forEach(rs=>{const b=rs[0],f=fator[b.gid];if(!f)return;const ks=rs.map(r=>r.parc/r.carta).sort((a,c)=>a-c),k=ks[ks.length>>1];
    const gp=S.grupos.find(g=>codN(g.cod)===b.gid),noms=rs.map(r=>Math.round(r.carta/f/10000)*10);let lo,hi;
    if(gp&&num(gp.cmax)>0){lo=Math.ceil((num(gp.cmin)||0)/f/10000)*10;hi=Math.floor(num(gp.cmax)/f/10000)*10;}else{lo=Math.max(10,Math.floor(Math.min(...noms)*0.7/10)*10);hi=Math.ceil(Math.max(...noms)*1.3/10)*10;}
    for(let N=Math.max(10,lo);N<=hi;N+=10){const carta=Math.round(f*N*1000*100)/100;if(out.some(o=>o.gid===b.gid&&o.plano===b.plano&&Math.abs(o.carta-carta)<1))continue;
      out.push({...b,carta,parc:Math.round(k*carta*100)/100,desc:b.plano==='Normal'?b.desc.replace(/R\$\s*[\d.]+\s*Mil/i,`R$ ${N} Mil`):b.desc,derivada:true});}});
  return out;}
// campanhas (códigos de convênio): cadastradas pelo admin, valem para todos
const hojeL=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fmtD=d=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR'):'—';
function campDe({tipo,carta,plano,emax}){if(plano!=='Normal'||(S.estr&&S.estr.dsc==='0'))return null;const cl=S.estr&&S.estr.campL;if(cl&&cl.desc!=null)return {cod:'',nome:'',manual:true,tipos:[],ta:null,desc:cl.desc,fim:''};const h=hojeL(),t=tipo==='Veículos'?'Veículos Leves':tipo;
  return (S.campanhas||[]).find(c=>(!c.ini||c.ini<=h)&&(!c.fim||h<=c.fim)&&(!c.tipos.length||c.tipos.includes(t))&&(c.cmin==null||carta>=c.cmin-0.01)&&(c.cmax==null||carta<=c.cmax+0.01)&&(c.emb==='ambos'||emax==null||(c.emb==='com'?emax>0:!(emax>0))))||null;}
const taCamp=(c,ta)=>c.ta!=null?Math.min(c.ta,ta??c.ta):(ta??0)*(1-(c.desc||0)/100);
function campOferta(vars){const ls=vars.flatMap(v=>v.r&&!v.r.erro?v.r.linhas:[]).filter(l=>l.camp);if(!ls.length)return '';const c=ls[0].camp,sem=ls.some(l=>!l.red),estim=ls.some(l=>l.red&&l.taEstim);
  if(c.manual)return `<div class="al info" style="margin-bottom:12px">Campanha de −${pct(c.desc)} na taxa adm, informada por você e a confirmar com a administradora (só nesta simulação), já aplicada nas cotas do plano normal.${sem?' Em cotas sem taxa lida, o desconto não entrou na conta: cole o detalhamento de 1 cota do grupo.':''} Plano reduzido fica de fora.</div>`;
  return `<div class="al info" style="margin-bottom:12px">Campanha ${esc(c.nome||'')} · <b>código ${esc(c.cod)}</b> ${c.fim?`(válida até ${fmtD(c.fim)})`:'(digitada por você, só nesta simulação)'}: ${c.ta!=null?'taxa adm '+pct(c.ta):'−'+pct(c.desc)+' na taxa adm'}, já aplicada nas cotas marcadas.${estim?' Onde não há detalhamento, a taxa foi estimada pela parcela (fundo de reserva de 2,5%).':''}${sem?' Em cotas sem taxa lida, o desconto não entrou na conta: cole o detalhamento de 1 cota do grupo.':''} Plano reduzido fica de fora.</div>`;}
function renderCampanhas(){const el=$('#camp-card');if(!el)return;const adm=!temServidor()||!!(window.SESSAO&&window.SESSAO.admin),cs=S.campanhas||[],h=hojeL();
  el.innerHTML=`<h2>Campanhas <span class="tag muted">códigos de convênio</span></h2><p class="sub">${adm?'Você cadastra; vale para todos os gerentes.':'Cadastradas pelo admin.'} A Proposta mostra o código em cada cota onde ele vale e já aplica o desconto.</p>
  ${(S.convenios||[]).length?`<details class="adv" open><summary>Códigos de convênio do portal (${S.convenios.length}) · percentual e regras no arquivo "Baixar" de cada um no portal</summary><table class="cmp" style="font-size:12px"><tbody>${S.convenios.map(c=>`<tr><td class="num">${esc(c.cod||'—')}</td><td style="text-align:left">${esc(c.nome)}</td></tr>`).join('')}</tbody></table></details>`:''}
  ${cs.length?`<div class="cmp-wrap"><table class="cmp" style="font-size:12px"><thead><tr><th>Código</th><th>Vale para</th><th>Carta</th><th>Embutido</th><th>Benefício</th><th>Validade</th>${adm?'<th></th>':''}</tr></thead><tbody>${cs.map((c,i)=>`<tr><td>${esc(c.cod)}${c.nome?'<br><span style="font-size:10px">'+esc(c.nome)+'</span>':''}</td><td>${esc(c.tipos.join(', ')||'todos')}</td><td class="num">${c.cmin!=null||c.cmax!=null?brl(c.cmin)+' a '+brl(c.cmax):'todas'}</td><td>${({com:'com',sem:'sem',ambos:'com ou sem'})[c.emb]||'—'}</td><td>${c.ta!=null?'taxa '+pct(c.ta):'−'+pct(c.desc)+' na taxa'}</td><td>${fmtD(c.ini)} a ${fmtD(c.fim)}${c.fim&&c.fim<h?' <span class="tag warn">vencida</span>':''}</td>${adm?`<td><button class="btn small danger" data-cdel="${i}">Excluir</button></td>`:''}</tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma campanha cadastrada.</div>'}
  ${adm?`
  <details class="adv" style="margin-top:10px"><summary>Adicionar campanha</summary>
    <div class="two"><div class="f"><label>Código</label><input id="cp-cod"></div><div class="f"><label>Nome (opcional)</label><input id="cp-nome"></div></div>
    <div class="f"><label>Vale para</label><div class="chips">${['Imobiliário','Veículos Leves','Veículos Pesados'].map(t=>`<label class="chip"><input type="checkbox" data-cpt="${t}"> ${t}</label>`).join('')}</div></div>
    <div class="two"><div class="f"><label>Carta de (R$, vazio = qualquer)</label><input id="cp-min" type="number" inputmode="decimal"></div><div class="f"><label>Carta até (R$)</label><input id="cp-max" type="number" inputmode="decimal"></div></div>
    <div class="two"><div class="f"><label>Embutido</label><select id="cp-emb"><option value="ambos">Com ou sem</option><option value="com">Só com embutido</option><option value="sem">Só sem embutido</option></select></div><div class="f"><label>Desconto na taxa (%) <span class="hint">ou a taxa final ao lado</span></label><input id="cp-desc" type="number" inputmode="decimal"></div></div>
    <div class="two"><div class="f"><label>Taxa adm final (%)</label><input id="cp-ta" type="number" inputmode="decimal"></div><div class="f"><label>Válida de / até</label><div class="two"><input id="cp-ini" type="date"><input id="cp-fim" type="date"></div></div></div>
    <button class="btn primary small" id="cp-add">Adicionar</button></details>`:''}`;
  if(!adm)return;const salva=()=>{save();empurrarGrupos();render();};
  el.querySelectorAll('[data-cdel]').forEach(b=>b.onclick=()=>{S.campanhas.splice(+b.dataset.cdel,1);salva();toast('Campanha excluída');});
  $('#cp-add').onclick=()=>{const v=id=>$('#'+id).value.trim(),cod=v('cp-cod');if(!cod){toast('Informe o código');return;}const desc=num(v('cp-desc')),ta=num(v('cp-ta'));if(desc==null&&ta==null){toast('Informe o desconto ou a taxa final');return;}
    S.campanhas=[...(S.campanhas||[]),{cod,nome:v('cp-nome'),tipos:[...el.querySelectorAll('[data-cpt]:checked')].map(x=>x.dataset.cpt),cmin:num(v('cp-min')),cmax:num(v('cp-max')),emb:v('cp-emb'),desc,ta,ini:v('cp-ini'),fim:v('cp-fim')}];salva();toast('Campanha adicionada');};}
// roteiro de busca: quanto comprar, em quantas cotas e que faixa pesquisar no sistema (foco: menor lance do bolso)
function roteiro(E){const need=num(E.valor)||0;if(!(need>0))return null;const tOk=x=>tipoCasa(x,E.tipo);
  const embPad=E.tipo&&E.tipo!=='Imobiliário'?30:50,conh=[]; // embutido do grupo quando o portal informa; senão o máximo usual (sem fonte confirmada)
  const pul=new Set((E.pular||[]).map(codN));
  S.grupos.filter(g=>(!E.tipo||g.tipo===E.tipo)&&num(g.cmax)>0&&!pul.has(codN(g.cod))).forEach(g=>{const a=alvoDe(g,E.alvo)>0?alvoDe(g,E.alvo):(num(g.lmin)>0?num(g.lmin):num(g.lmed));if(a>0)conh.push({cod:g.cod,a,med:num(g.lmed)>0?num(g.lmed):null,min:num(g.cmin)||0,max:num(g.cmax),emax:num(g.emax),pr:num(g.pr)>0?num(g.pr):(num(g.pt)>0?num(g.pt):null),ta:num(g.ta),fr:num(g.fr),cl:num(g.cl)>0?num(g.cl):null});});
  const mods={};cotasComModelo().filter(x=>x.plano==='Normal'&&tOk(x)).forEach(x=>{const m=mods[x.gid]=mods[x.gid]||{cod:x.cod,a:x.lm,min:1e18,max:0,vagas:x.vagas,vagasTxt:x.vagasTxt,part:x.part,emax:null};m.min=Math.min(m.min,x.carta);m.max=Math.max(m.max,x.carta);});
  Object.values(mods).filter(m=>!pul.has(codN(m.cod))).forEach(m=>{const c=conh.find(c=>codN(c.cod)===codN(m.cod));if(c)Object.assign(c,{vagas:m.vagas,vagasTxt:m.vagasTxt,part:m.part});else conh.push(m);});
  const ops=[],cap=Math.max(1,Math.floor(num(E.max)||3));
  const base=conh; // sem filtro de prazo: grupo curto entra, e a parcela mostra o preço dele (quem decide é o cliente)
  for(let n=1;n<=8;n++){ // testa de 1 a 8 cartas: em que tamanho estão os grupos de menor lance
    const gs=base.filter(c=>c.vagas!==0).map(c=>{const emb=E.emb==='1'?(c.emax!=null?c.emax:embPad):0,tot=E.modo==='liquido'?need/(1-emb/100):need,t=tot/n;
      return {...c,emb,tot,t,bolso:Math.max(0,(c.a-emb)/100)*tot,bolsoMed:c.med>0?Math.max(0,(c.med-emb)/100)*tot:null};}).filter(c=>c.t>=c.min*0.95&&c.t<=c.max*1.05).sort((x,y)=>x.bolso-y.bolso||(y.pr||0)-(x.pr||0));
    if(!gs.length)continue;const g=gs[0];
    const preenche=capK=>{ // completa com o próximo de menor lance; respeita o máximo por grupo, as vagas e o nº de contemplados por lance da última assembleia (as cotas do mesmo cliente concorrem entre si)
      let falta=n,custo=0,custoM=0,okM=true,parc=0,okP=true;const uso=[];
      for(const c of gs){const k=Math.min(capK,c.cl>0?c.cl:capK,c.vagas!=null?c.vagas:capK,falta);if(k<1)continue;
        custo+=c.bolso*k/n;if(c.bolsoMed==null)okM=false;else custoM+=c.bolsoMed*k/n;
        const pm=c.pr>0&&c.ta!=null?c.tot*(1+(c.ta+(c.fr||0))/100)/c.pr*k/n:null;if(pm==null)okP=false;else parc+=pm;
        uso.push({cod:c.cod,k,a:c.a,med:c.med,pr:c.pr,cl:c.cl});falta-=k;if(!falta)break;}
      return falta?null:{uso,bolso:custo,bolsoMed:okM?custoM:null,parc:okP?parc:null};};
    const r=preenche(cap);if(!r)continue;const dif=cap>1&&r.uso.some(u=>u.k>1)?preenche(1):null;
    ops.push({n,t:g.t,tot:g.tot,emb:g.emb,a:g.a,lo:Math.floor(g.t*0.97/5000)*5000,hi:Math.ceil(g.t*1.09/5000)*5000,gs:gs.slice(0,12),bolso:r.bolso,bolsoMed:r.bolsoMed,parc:r.parc,uso:r.uso,dif});}
  if(!ops.length){const emb=E.emb==='1'?embPad:0,tot=E.modo==='liquido'?need/(1-emb/100):need,t=tot/2; // nada colado: ponto de partida de 2 cotas
    const o={n:2,t,tot,emb,a:null,lo:Math.floor(t*0.97/5000)*5000,hi:Math.ceil(t*1.09/5000)*5000,gs:[],bolso:null};const cm=base.map(c=>c.min).filter(x=>x>0),foraFaixa=conh.length>0&&cm.length?{cmin:Math.min(...cm),liqMin:Math.min(...cm)*(1-(E.emb==='1'?embPad:0)/100),n:conh.length}:null;return {need,total:tot,embP:emb,ops:[o],rec:o,melhores:[],semDados:true,foraFaixa};}
  const mb=Math.min(...ops.map(o=>o.bolso));const emp=ops.filter(o=>o.bolso<=mb+500);let rec=mb<1?emp.sort((x,y)=>x.n-y.n)[0]:emp.sort((x,y)=>y.n-x.n)[0]; // bolso zero (embutido cobre o lance): menos contratos, não mais
  if(E.bestReal&&E.bestN>=1)rec=ops.find(o=>o.n===E.bestN)||rec; // oferta já fechou: o roteiro acompanha o tamanho de cota dela
  const melhores=ops.slice().sort((x,y)=>x.bolso-y.bolso||y.n-x.n).slice(0,2);
  return {need,total:rec.tot,embP:rec.emb,ops,rec,melhores,um:ops.find(o=>o.n===1)};}
const ADM=()=>!document.body.classList.contains('usuario'); // visão de admin (o admin pode ver como gerente pelo botão)

/* ===== Estratégia de lance: o que cada grupo do plano costuma exigir (histórico das colagens, não previsão) ===== */
function estrategiaLance(R,E){ // só com cotas reais coladas: os grupos vêm do que o gerente achou no sistema, nunca de palpite
  if(!R||!E.bestReal||!(E.buscaL||[]).length)return '';
  const porG={};E.buscaL.forEach(l=>{const k=codN(l.cod),g=S.grupos.find(x=>codN(x.cod)===k);if(!g)return;const o=porG[k]=porG[k]||{g,k:0,soma:0};o.k+=l.n;o.soma+=l.carta*l.n;});
  const gs=Object.values(porG);if(!gs.length)return '';
  const itens=[],p=v=>v>0?pct(v):'—',embs=[];
  const lin=gs.map(o=>{const g=o.g,emb=E.emb==='1'?(num(g.emax)||0):0,carta=o.soma/o.k;embs.push(emb);
    itens.push({k:o.k,carta,emb,lmin:num(g.lmin),lmed:num(g.lmed),lmax:num(g.lmax)});
    const h=(g.h||[]).filter(x=>x.n!=null),mn=h.length?Math.min(...h.map(x=>x.n)):null,mx=h.length?Math.max(...h.map(x=>x.n)):null,tr=tendencia(g),cl=num(g.cl);
    return `<tr><td><b>${esc(g.cod)}</b><span class="sel">${o.k} cota${o.k>1?'s':''}${cl>0?` · ${cl} contemplados por lance na última`:''}</span></td><td class="r">${p(num(g.lmin))}</td><td class="r">${p(num(g.lmed))}</td><td class="r">${p(num(g.lmax))}</td><td class="r" style="font-size:12px;color:var(--muted)">${h.length>1?`${h.length} meses: ${pct(mn)} a ${pct(mx)}`:'histórico começando'}${tr?`<br><span style="color:${tr.sobe?'var(--warn)':'var(--muted)'}">${esc(tr.txt)}</span>`:''}</td></tr>`;}).join('');
  const c=cenariosLance(itens),f=v=>v==null?'—':brl(v),cards=[['Se pedirem o menor lance',c.ousado,'menor da última assembleia','lmin'],['Se pedirem a média',c.central,'média das últimas 3','lmed'],['Se pedirem o maior',c.conservador,'maior da última assembleia','lmax']].filter(x=>x[1]!=null).sort((x,y)=>x[1]-y[1]);
  const conc=gs.filter(o=>o.k>=2),emb=embs[0]||0;
  const concT=conc.length?`<div class="hint" style="color:var(--warn)">${conc.map(o=>`${o.k} cotas no grupo ${esc(o.g.cod)}`).join(' e ')} concorrem entre si no lance ${gl('concorrem')}: ao menor lance tende a passar uma. Para passarem todas, mire da média para cima (regra do app, sem fonte confirmada da Caixa).</div>`:'';
  return `<div class="lance-est"><div class="busca-cab">Estratégia de lance das cotas que você trouxe <span class="sel">lances em % da carta</span></div>
    <table class="busca-t"><thead><tr><th scope="col">Grupo</th><th scope="col" class="r">Menor</th><th scope="col" class="r">Média 3 ${gl('media3')}</th><th scope="col" class="r">Maior</th><th scope="col" class="r">Série</th></tr></thead><tbody>${lin}</tbody></table>
    ${cards.length?`<div class="opts" style="margin-top:6px">${cards.map(x=>`<button type="button" class="opt opt-b${E.alvo===x[3]?' win':''}" data-alvo="${x[3]}" aria-pressed="${E.alvo===x[3]}"><div class="oh"><b>${x[0]}</b>${E.alvo===x[3]?' <span class="tag ok">alvo</span>':''}</div><div class="ot">${f(x[1])}<small>do bolso · ${x[2]}</small></div></button>`).join('')}</div>`:''}${concT}
    ${gs.map(o=>{const v=vereditoLance(o.g,E.alvo);if(!v)return '';const cs=num(o.g.cs),np=num(o.g.np);return `<div class="vered ${v.ok?'ok':'lim'}"><b>${esc(o.g.cod)}</b> · alvo ${pct(v.a)}: ${v.t}.${cs>0&&np>0?` Se não passar: na última assembleia, ${cs} de ${np} participantes foram sorteados (≈ ${pct(cs/np*100)}).`:''}</div>`;}).join('')}
    <div class="hint">Menor e maior lance: da última assembleia de cada grupo (% da carta${emb>0?`, com embutido de ${pct(emb)}`:''}). A média é a das últimas 3. Histórico do grupo, não previsão: nada garante o lance vencedor da próxima.</div></div>`;}
function buscaSimples(R,E,pronto){if(!R)return 'Monte um pedido primeiro: a busca aparece aqui.';
  const st=statusPortal(),fr=st?`<div class="hint" style="margin-top:8px">Grupos do portal de ${fmtD(st.ult)}${st.velho?` · <b style="color:var(--warn)">teve assembleia em ${fmtD(st.assemPassada)}: lances podem ter mudado${ADM()?' (atualize pelo botão do portal)':' (avise o admin)'}</b>`:''}.</div>`:'';
  if(pronto)return `<div style="font-size:15px;color:var(--ink)"><b>Pronto:</b> a proposta já fecha com o que você colou. Confirme no sistema: ${E.busca}. <a href="#" data-go="oferta" style="color:inherit;font-weight:600">Ver a proposta →</a></div>${fr}`;
  const rc=R.rec,tipoT=E.tipo==='Imobiliário'?'imóvel':(E.tipo||'').toLowerCase()||'o tipo do bem';
  const milBR=v=>Math.round(v).toLocaleString('pt-BR');
  const faixa=(o,g)=>{const lo=g?Math.max(o.lo,Math.floor((g.min||0)/1000)*1000):o.lo,hi=g?Math.min(o.hi,Math.ceil((g.max||o.hi)/1000)*1000):o.hi;return lo<=hi?[lo,hi]:[o.lo,o.hi];};
  const tab=linhas=>`<table class="busca-t"><thead><tr><th scope="col">Grupo</th><th scope="col" class="r">Cotas</th><th scope="col" class="r">De (R$)</th><th scope="col" class="r">Até (R$)</th></tr></thead><tbody>${linhas}</tbody></table>`;
  const cabP=(o,letra)=>`<div class="plano-cab"><b>Plano ${letra}</b> · ${o.n} carta${o.n>1?'s':''} de ~${brl(o.t)}${o.bolso!=null?` · lance do bolso ~${brl(o.bolso)}`:''}</div>`;
  if(R.semDados||!rc.uso||!rc.uso.length)return `<div class="busca-cab">Para ${brl(R.need)} líquido · ${brl(R.total)} em cartas${R.embP>0?` · embutido ${pct(R.embP)}`:''}</div>${cabP(rc,'A')}${tab(`<tr><td>${esc(tipoT)}<span class="sel">qualquer grupo</span></td><td class="r"><b>${rc.n}</b></td><td class="r"><b>${milBR(rc.lo)}</b></td><td class="r"><b>${milBR(rc.hi)}</b></td></tr>`)}<div class="hint">Ainda não há grupos do portal deste tipo.</div>${fr}`;
  const pl=(R.ops||[]).filter(o=>o.uso&&o.uso.length).sort((x,y)=>((x.bolso??9e99)-(y.bolso??9e99))||(y.n-x.n)); // menor dinheiro do bolso sempre em cima
  const pA=pl[0]||rc,outros=pl.slice(1,4);
  const linha=(o,i)=>`<tr class="${i===0?'best':''}"><td><b>${o.n}</b> cota${o.n>1?'s':''} de ~${brl(o.t)}${i===0?'<span class="sel" style="color:var(--accent)">comece por aqui</span>':''}</td><td class="r">${milBR(o.lo)}</td><td class="r">${milBR(o.hi)}</td></tr>`;
  const lista=[pA,...outros].filter(Boolean);
  return `<div class="busca-cab">Para ${brl(R.need)} líquido · ${brl(R.total)} em cartas${R.embP>0?` · embutido ${pct(R.embP)}`:''}</div>
    <table class="busca-t"><thead><tr><th scope="col">Quantas cotas</th><th scope="col" class="r">De (R$)</th><th scope="col" class="r">Até (R$)</th></tr></thead><tbody>${lista.map(linha).join('')}</tbody></table>
    <div class="hint">Pesquise cada faixa no vendas.seguridade, começando pela primeira, e cole o que achou: o app confere vagas, parcela e lance com as cotas reais. A primeira linha é a de menor bolso pelo histórico dos grupos. Mais cotas é outra divisão, não garantia.</div>${fr}`;}
/* ===== Cota digitada: o gerente digita na ordem do sistema e o app confere com o banco de grupos ===== */
function varLance(g){const h=(g&&g.h||[]).filter(x=>x.n!=null);if(h.length<2)return null;const a=h[h.length-2],b=h[h.length-1],dv=b.n-a.n;return {de0:a.n,de1:b.n,dv,dir:dv>=0.5?'sobe':dv<=-0.5?'cai':'estavel',meses:h.length,de:a.m.slice(5)+'/'+a.m.slice(0,4)};}
function bolsoLance(carta,lance,emb){return carta>0&&lance>0?Math.max(0,lance-Math.min(emb,lance))/100*carta:null;}
function radarGrupo(g,carta,E){ // o que a base diz do grupo, já cruzado com a carta digitada e com o limite do Pedido
  const emb=E&&E.emb==='1'?(num(g.emax)||0):0,mx=E&&E.rec!==''&&E.rec!=null?num(E.rec):null;
  const caixa=([n,v])=>{const b=bolsoLance(carta,v,emb),cabe=b!=null&&mx>0?b<=mx+0.5:null;return `<div class="rd${cabe===true?' ok':''}"><span>${n}</span><b>${v>0?pct(v):'—'}</b><small>${b!=null?`bolso ${brl(b)}${cabe===true?' · cabe ✓':cabe===false?' · acima do seu limite':''}`:'digite a carta'}</small></div>`;};
  const vl0=varLance(g),vl=vl0&&vl0.meses>=3?vl0:null,pouco=vl&&vl.meses<3?` (só ${vl.meses} meses de histórico)`:'';
  const dir=!vl?(vl0?`Histórico curto (${vl0.meses} meses): menor lance foi de ${pct(vl0.de0)} para ${pct(vl0.de1)}. Só indicação, ainda não é tendência.`:'Variação do lance: aparece a partir da 2ª atualização mensal.'):vl.dir==='cai'?`<b class="fav">↓ Lance caindo ${Math.abs(vl.dv).toLocaleString('pt-BR',{maximumFractionDigits:1})} p.p. desde ${vl.de}</b>: o bolso ficou mais leve${pouco}.`:vl.dir==='sobe'?`<b class="aten">↑ Lance subindo ${Math.abs(vl.dv).toLocaleString('pt-BR',{maximumFractionDigits:1})} p.p. desde ${vl.de}</b>: mire acima do menor${pouco}.`:`<b>→ Lance estável desde ${vl.de}</b>${pouco}.`;
  const cl=num(g.cl),cs=num(g.cs),np=num(g.np),sort=cs>0&&np>0?` · sorteados: ${cs} de ${np} (≈ ${pct(cs/np*100)})`:'';
  const ult=(cl>0||cs>0||np>0)?`<div class="hint">Última assembleia: ${cl>0?cl+' por lance':'— por lance'} · ${cs>0?cs+' por sorteio':'— por sorteio'}${np>0?' · '+np+' participantes':''}${sort} (histórico, não previsão).</div>`:'';
  return `<div class="radar"><div class="radar-cab">Grupo ${esc(g.cod)} · ${esc(g.tipo)} · carta ${num(g.cmin)>0?brl(num(g.cmin))+(num(g.cmax)!==num(g.cmin)?' a '+brl(num(g.cmax)):''):'—'}${num(g.pt)>0?' · prazo total '+num(g.pt):''} · embutido ${pct(num(g.emax)||0)}</div><div class="rds">${[['Menor',num(g.lmin)],['Média 3',num(g.lmed)],['Maior',num(g.lmax)]].map(caixa).join('')}</div><div class="hint">${dir}</div>${ult}</div>`;}
function vereditoLance(g,k){const a=alvoDe(g,k),mn=num(g.lmin),md=num(g.lmed),mx=num(g.lmax);if(!(a>0)||!(mn>0))return null;
  if(mx>0&&a>=mx)return {ok:true,a,t:'no maior lance contemplado na última: a melhor chance que o histórico dá'};
  if(md>0&&a>=md)return {ok:true,a,t:'na média das 3 últimas: folga sobre o menor contemplado'};
  if(a>mn)return {ok:true,a,t:'folga sobre o menor contemplado (entre o menor e a média)'};
  return {ok:false,a,t:'no menor contemplado da última: passou por pouco, uma alta deixa de fora'};}
function cfLer(){const v=id=>($('#'+id)||{}).value||'',m=id=>{const el=$('#'+id);return el?moneyParse(el.value):null;};
  const cod=v('cf-cod').replace(/\D/g,''),g=cod?S.grupos.find(x=>codN(x.cod)===codN(cod)):null;
  return {tipo:CF.tipo||(S.estr&&S.estr.tipo)||'',cod,g,carta:m('cf-carta'),parc:m('cf-parc'),pr:num(v('cf-pr')),vagas:v('cf-vagas')===''?null:num(v('cf-vagas')),ass:v('cf-ass')};}
const CF={tipo:''};
function cfConferir(){const box=$('#cf-conf');if(!box)return;{const rb=$('#cf-radar');if(rb)rb.innerHTML='';}const d=cfLer(),g=d.g,L=[];
  const ln=(ok,t)=>L.push(`<li class="${ok===true?'ok':ok===false?'dif':''}"><b>${ok===true?'Confere':ok===false?'Difere':'Info'}</b> · ${t}</li>`);
  if(!d.cod){box.innerHTML='';return;}
  if(!g){box.innerHTML=`<ul><li class="dif"><b>Grupo fora do banco</b> · o grupo ${esc(d.cod)} não está nos grupos do simulador: a conta usa só o que você digitou (prazo e parcela obrigatórios). Atualize os grupos pelo botão do portal.</li></ul>`;return;}
  const emb=num(g.emax)||0,pr=num(g.pr)>0?num(g.pr):null,ta=num(g.ta),fr=num(g.fr)||0;
  const RAD=radarGrupo(g,d.carta,S.estr);
  if(d.tipo&&d.tipo!==g.tipo)ln(false,`o grupo é ${esc(g.tipo)} e você marcou ${esc(d.tipo)}: leve e pesado têm regras diferentes`);
  if(d.carta>0&&num(g.cmin)>0&&num(g.cmax)>0){const dentro=d.carta>=num(g.cmin)*0.999&&d.carta<=num(g.cmax)*1.001;ln(dentro,dentro?`carta dentro da faixa do grupo (${brl(num(g.cmin))} a ${brl(num(g.cmax))})`:`carta fora da faixa do grupo (${brl(num(g.cmin))} a ${brl(num(g.cmax))})`);}
  if(d.pr&&pr)ln(d.pr===pr,d.pr===pr?`prazo restante igual ao do portal (${pr} meses)`:`você digitou ${d.pr} meses e o portal diz ${pr}${g.data?` (dados de ${fmtD(g.data)})`:''}: confira no sistema`);
  const prev=d.carta>0&&ta!=null&&(d.pr||pr)?d.carta*(1+(ta+fr)/100)/(d.pr||pr):null;
  if(prev&&d.parc>0){const df=(d.parc/prev-1)*100;ln(Math.abs(df)<=1,Math.abs(df)<=1?`parcela confere com o previsto (${brl2(prev)})`:`parcela ${df>0?'acima':'abaixo'} do previsto em ${pct(Math.abs(df))} (previsto ${brl2(prev)}, sem seguro): pode ser seguro, reajuste ou outro plano`);}
  else if(prev&&!(d.parc>0))ln(null,`sem a parcela, o app usa a prevista: ${brl2(prev)} por mês (sem seguro)`);
  const sp=statusPortal();if(sp&&sp.velho)ln(false,`teve assembleia em ${fmtD(sp.assemPassada)} depois dos dados do portal: lances podem ter mudado`);
  {const p1=num(S.estr&&S.estr.p1);if(p1>0&&d.parc>0)ln(d.parc<=p1+0.5,d.parc<=p1+0.5?`parcela cabe no limite do pedido (${brl2(p1)})`:`parcela ${brl2(d.parc)} acima do limite do pedido (${brl2(p1)})`);}
  {const rb=$('#cf-radar');if(rb)rb.innerHTML=RAD;}
  box.innerHTML=`<ul>${L.join('')}</ul>`;}
function renderCotaForm(){const box=$('#cota-form');if(!box)return;
  if(!CF.tipo)CF.tipo=(S.estr&&S.estr.tipo)||'Imobiliário';
  $$('#cf-tipo-chips .chip').forEach(b=>{b.classList.toggle('on',CF.tipo===b.dataset.v);b.onclick=()=>{CF.tipo=b.dataset.v;renderCotaForm();cfConferir();};});
  if(box._cf)return;box._cf=1;
  ['cf-carta','cf-parc'].forEach(id=>{const el=$('#'+id);el.addEventListener('input',()=>{el.value=moneyLive(el.value);});});
  ['cf-cod','cf-carta','cf-parc','cf-pr','cf-ass','cf-vagas'].forEach(id=>{const el=$('#'+id);el.addEventListener('input',()=>{cfConferir();if(id==='cf-cod')cfPlace();});el.addEventListener('change',cfConferir);});
  $('#cf-go').onclick=cfMontar;}
function cfPlace(){const d=cfLer(),g=d.g;if(!g)return;const ca=$('#cf-carta');if(ca&&num(g.cmin)>0)ca.placeholder='faixa '+brl(num(g.cmin))+(num(g.cmax)!==num(g.cmin)?' a '+brl(num(g.cmax)):'');const pr=$('#cf-pr'),as=$('#cf-ass');if(pr&&num(g.pr)>0)pr.placeholder='portal: '+num(g.pr);if(as&&g.assem)as.title='portal: '+g.assem;if(g.tipo&&CF.tipo!==g.tipo){CF.tipo=g.tipo;renderCotaForm();}}
function cfMontar(){const E=S.estr,d=cfLer(),g=d.g,msg=$('#cf-msg');const say=t=>{if(msg)msg.textContent=t;toast(t);};
  if(!E.feito||!(num(E.valor)>0)){say('Informe o valor no Pedido primeiro');return;}
  if(!d.cod){say('Digite o grupo');return;}if(!(d.carta>0)){say('Digite a carta de crédito');return;}
  const pr=d.pr||(g&&num(g.pr)>0?num(g.pr):null);if(!(pr>0)){say('Digite o prazo restante');return;}
  const ta=g?num(g.ta):null,fr=g?(num(g.fr)||0):0,prev=ta!=null?d.carta*(1+(ta+fr)/100)/pr:null,parc=d.parc>0?d.parc:prev;
  if(!(parc>0)){say('Digite a parcela (o grupo não está no banco)');return;}
  const tipoG=g?g.tipo:CF.tipo,cod=String(d.cod).padStart(6,'0');
  const r={cod,gid:codN(cod),desc:(g?g.tipo:CF.tipo)+' · digitada',plano:'Normal',tipo:tipoG==='Imobiliário'?'Imobiliário':'Veículos',carta:d.carta,ass:d.ass||(g&&g.assem)||'',prazo:pr,vagas:d.vagas,vagasTxt:'',part:g&&num(g.np)>0?num(g.np):'',parc,lm:g&&num(g.lmed)>0?num(g.lmed):'',em:new Date().toISOString()};
  const i=S.cotasL.findIndex(x=>compK(x)===compK(r));if(i>=0)S.cotasL[i]={...S.cotasL[i],...r};else S.cotasL.push(r);
  save();renderOferta();renderCotas();
  if(E.bestReal){passo(4);toast('Cota guardada: escolha o lance');}else say('Cota guardada. Ela sozinha não fecha o valor do pedido: digite outra cota ou veja as faixas.');}
function renderCotas(){const E=S.estr;renderCotaForm();cfConferir();
  const R=E.feito?roteiro(E):null,tipoT=E.tipo==='Imobiliário'?'imóvel':(E.tipo||'').toLowerCase()||'o tipo do bem';
  const pronto=E.bestReal&&E.busca;
  const velho=(statusPortal()||{}).velho;
  let det=R?`${velho?avisoPortal():''}${pronto?`<div style="font-size:15px;color:var(--ink)"><b>Pronto:</b> a proposta já fecha com o que você colou. <b>Confirme no sistema:</b> ${E.busca}. <a href="#" data-go="oferta" style="color:inherit;font-weight:600">Ver a proposta →</a></div><div class="hint">Se alguma não tiver vaga, siga o ranking abaixo ou pesquise ${brl(R.rec.lo)} a ${brl(R.rec.hi)}.</div>`:`<div style="font-size:15px;color:var(--ink)"><b>Pesquise no sistema:</b> ${esc(tipoT)} de <b>${brl(R.rec.lo)} a ${brl(R.rec.hi)}</b> e cole a 1ª página abaixo.</div>`}
    Para ${brl(R.need)} ${E.modo==='liquido'?'líquido':''}${R.embP>0?` com embutido de ${pct(R.embP)}`:''}: ${brl(R.total)} em cartas, em <b>${R.rec.n} cota${R.rec.n>1?'s':''} de ~${brl(R.rec.t)}</b>.${R.melhores&&R.melhores.length>1?`<div style="margin-top:6px"><b>Melhores faixas:</b> ${R.melhores.map(o=>`${o.n} carta${o.n>1?'s':''} de ~${brl(o.t)} (${o.uso.map(u=>u.k+'× '+esc(u.cod)+' '+pct(u.a)).join(' + ')}; bolso ~${brl(o.bolso)})`).join(' · ')}.${R.um&&R.um!==R.rec&&R.um.bolso>R.rec.bolso+500?` Não compensa 1 carta de ${brl(R.um.t)}: lance ${pct(R.um.a)}, bolso ~${brl(R.um.bolso)}.`:''}</div>`:''}
    ${R.rec.gs.length?`<div style="margin-top:6px"><b>Olhe nesta ordem (menor lance primeiro):</b><ol style="margin:4px 0 0;padding-left:20px">${R.rec.gs.map(g=>`<li>Grupo <b>${esc(g.cod)}</b>: lance ${pct(g.a)}${g.vagas!=null?' · '+g.vagas+' vaga'+(g.vagas>1?'s':''):(g.vagasTxt?' · '+esc(g.vagasTxt):'')}${g.part?' · '+g.part+' participantes':''}</li>`).join('')}</ol><div class="hint">Se o 1º não tiver cota nessa faixa, passe pro próximo. Nenhum grupo conhecido? Cole a página que o app aprende.</div></div>`:'<div class="hint">Ainda não há grupos colados desse tipo: cole a página da busca e o app monta o ranking.</div>'}
    <details class="adv" style="margin-top:6px"><summary>Comparar todas as divisões (1 a 8 cartas)</summary><table class="cmp" style="font-size:12px"><thead><tr><th>Cartas</th><th>Cada uma</th><th>Pesquise</th><th>Grupo de menor lance</th><th>Lance do bolso ~</th></tr></thead><tbody>${R.ops.map(o=>`<tr class="${o===R.rec?'best-row':''}"><td>${o.n}</td><td class="num">${brl(o.t)}</td><td class="num">${brl(o.lo)} a ${brl(o.hi)}</td><td>${o.uso?o.uso.map(u=>u.k+'× '+esc(u.cod)+' ('+pct(u.a)+')').join(' + '):'—'}</td><td class="num">${o.bolso!=null?brl(o.bolso):'—'}</td></tr>`).join('')}</tbody></table><div class="hint">Só aparecem tamanhos em que há grupo conhecido (tabela do portal em Grupos ou páginas coladas aqui). Lance pelo histórico do grupo, não é garantia. Empate no bolso: mais cartas = mais bilhetes por assembleia.</div></details>
    ${E.busca&&!pronto?`<div style="margin-top:6px"><b>Depois de colar, confirme no sistema:</b> ${E.busca}.</div>`:''}`:'';
  const busca=buscaSimples(R,E,pronto)+(det?`<details class="adv so-admin" style="margin-top:8px"><summary>Roteiro completo (admin)</summary>${det}</details>`:'');
  const reais=(E.buscaL||[]).map(l=>{const cs=S.cotasL.filter(x=>x.gid===codN(l.cod));if(!cs.length)return '';const x=cs.slice().sort((a,b)=>Math.abs(a.carta-l.carta)-Math.abs(b.carta-l.carta))[0];const gp=S.grupos.find(g=>codN(g.cod)===codN(l.cod)),prev=gp&&num(gp.ta)!=null&&x.prazo>0?x.carta*(1+(num(gp.ta)+(num(gp.fr)||0))/100)/x.prazo:null,df=prev&&S.listaSeg!=='com'&&x.parc>0?(x.parc/prev-1)*100:null,fora=R&&R.rec&&(x.carta<R.rec.lo||x.carta>R.rec.hi);
      const cmp=[fora?`<span style="color:var(--warn)">carta fora da faixa buscada (${brl(R.rec.lo)} a ${brl(R.rec.hi)})</span>`:'',df==null?'':Math.abs(df)>1?`<span style="color:var(--warn)">parcela ${df>0?'acima':'abaixo'} do previsto (${brl2(prev)}) em ${pct(Math.abs(df))}</span>`:'<span style="color:var(--accent)">parcela confere com o previsto</span>'].filter(Boolean).join(' · ');
      return `<br>Grupo ${esc(l.cod)}: carta mais próxima no sistema ${brl2(x.carta)}, parcela ${brl2(x.parc)}, vagas ${x.vagas!=null?x.vagas:esc(x.vagasTxt)||'?'}${venceu(x)?' <b>(dados vencidos)</b>':''}${cmp?`<br><span class="sel">${cmp}</span>`:''}`;}).join('');
  $('#c-busca').innerHTML=busca+reais;const lb=$('#c-lance');if(lb){lb.innerHTML=estrategiaLance(R,E);$$('#c-lance [data-alvo]').forEach(b=>b.onclick=()=>{const sel=$('#e-alvo');if(!sel)return;sel.value=b.dataset.alvo;sel.dispatchEvent(new Event('change',{bubbles:true}));});}
  const l=$('#c-lista');const porG={};S.cotasL.forEach(x=>{(porG[x.gid]=porG[x.gid]||[]).push(x);});
  const ids=Object.keys(porG).sort((a,b)=>(+a)-(+b));
  l.className=ids.length?'':'empty';
  const lt=$('#c-lista-t');if(lt)lt.textContent=ids.length?`O que foi lido · ${ids.length} grupo${ids.length>1?'s':''}`:'O que foi lido';
  l.innerHTML=(ids.length?`<div class="hint" style="margin-bottom:8px">Parcela da lista tratada como <b>${S.listaSeg==='com'?'com':'sem'} seguro</b>${S.listaSeg?' (conferido pelo detalhamento)':' (padrão; cole um detalhamento pra conferir)'}; o seguro entra por cima.</div>`:'')+(ids.length?ids.map((id,n)=>{const cs=porG[id].sort((a,b)=>a.carta-b.carta||a.plano.localeCompare(b.plano));const h=cs[0];const comp=cs.map(x=>S.comp[compK(x)]).find(Boolean);const vc=cs.some(venceu);
    return `<details class="adv" ${n===0?'open':''} style="border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:8px"><summary style="color:var(--ink);font-weight:600">Grupo ${esc(h.cod)} <span class="tag muted">${esc(h.tipo||'?')}</span> ${comp?`<span class="tag">TA ${pct(comp.ta)} · FR ${pct(comp.fr)}</span>`:'<span class="tag muted">sem composição</span>'} ${vc?'<span class="tag warn">dados vencidos</span>':''}</summary>
    <div class="hint" style="margin-bottom:6px">${h.part} participantes · próxima assembleia ${new Date(h.ass+'T12:00:00').toLocaleDateString('pt-BR')} · lance médio ${pct(h.lm)}</div>
    <table class="cmp" style="font-size:12px"><thead><tr><th>Plano</th><th>Carta</th><th>Parcela</th><th>Prazo</th><th>Vagas</th><th>Seguro/mês</th></tr></thead><tbody>${cs.map(x=>{const g=segDe(x);return `<tr><td>${esc(x.plano)}</td><td class="num">${brl2(x.carta)}</td><td class="num">${brl2(x.parc)}</td><td class="num">${x.prazo}</td><td class="num">${x.vagas!=null?x.vagas:esc(x.vagasTxt)}</td><td class="num">${g.seg!=null?brl2(g.seg)+(g.real?'':' <span style="color:var(--muted)">(derivado)</span>'):(x.plano==='Reduzida'?'a confirmar':'—')}</td></tr>`;}).join('')}</tbody></table></details>`;}).join(''):'Nada colado ainda.');
  $('#c-save').onclick=()=>{const t=$('#c-paste').value.trim();if(!t){toast('Cole o texto primeiro');return;}const m=guardarColagem(t);$('#c-msg').textContent=m;$('#c-paste').value='';renderOferta();renderCotas();if(S.estr.feito&&S.estr.bestReal){passo(4);toast('Cotas lidas: escolha o lance');}else toast(/^Não reconheci/.test(m)?'Não reconheci o texto':'Lido. Falta cota pra fechar o valor: veja a busca');};
  $('#c-clear').onclick=()=>{if(!S.cotasL.length&&!Object.keys(S.comp).length)return;if(!window.confirm('Apagar as cotas e composições lidas neste aparelho?'))return;S.cotasL=[];S.comp={};save();$('#c-msg').textContent='';renderCotas();};}

/* ===================== grupos compartilhados (servidor) ===================== */
let etag=null, syncTimer=null;
{const bv=$('#btnVer'),podeVer=!window.SESSAO||window.SESSAO.admin,lbl=()=>{bv.textContent=document.body.classList.contains('usuario')?'Visão admin':'Ver como gerente';};
  if(podeVer){bv.style.display='';lbl();bv.onclick=()=>{const u=!document.body.classList.contains('usuario');document.body.classList.toggle('usuario',u);try{localStorage.setItem('simcons.verComo',u?'1':'');}catch(e){}lbl();render();if(u&&$('#s-grupos').classList.contains('on'))go('estrategia');toast(u?'Vendo como gerente (só a tela muda)':'Visão admin');};}}
const temServidor=()=>location.protocol.startsWith('http')&&!!window.SESSAO;
async function puxarGrupos(){if(!temServidor())return;try{const r=await fetch('/api/dados',{cache:'no-store'});if(r.status===401){location.href='/entrar';return;}const j=await r.json();if(!j.ok)return;etag=j.etag;
  S.campanhas=j.campanhas||[];S.convenios=j.convenios||[];if(j.grupos.length){S.grupos=j.grupos;save();render();}else{save();render();if(S.grupos.length)empurrarGrupos();}}catch(e){}}
function empurrarGrupos(){if(!temServidor())return;clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{try{const r=await fetch('/api/dados',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({grupos:S.grupos,etag,...(window.SESSAO&&window.SESSAO.admin?{campanhas:S.campanhas||[],convenios:S.convenios||[]}:{})})});const j=await r.json();
  if(r.status===409&&j.grupos){S.grupos=j.grupos;S.campanhas=j.campanhas||[];S.convenios=j.convenios||[];etag=j.etag;save();render();toast('Grupos atualizados por outra pessoa; recarreguei.');return;}
  if(r.status===401){location.href='/entrar';return;}if(j.ok)etag=j.etag;}catch(e){toast('Sem conexão: grupos salvos só neste aparelho');}},400);}
if(window.SESSAO){const b=$('#btnSair');b.style.display='';if(window.SESSAO.admin)$('#lnkAdmin').style.display='';b.title='Sair ('+window.SESSAO.email+')';b.onclick=async()=>{try{await fetch('/api/sair',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});}catch(e){}location.href='/entrar';};}

/* ===================== link ===================== */
function shareLink(){const d={grupos:S.grupos.map(({h,...g})=>g),estr:{...S.estr,nome:'',rec:'',p1:'',p2:'',fgts:'',conf:{},ger:S.estr.ger}};
  const url=location.origin+location.pathname+'#s='+btoa(unescape(encodeURIComponent(JSON.stringify(d))));
  (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Link copiado (sem nome do cliente)')).catch(()=>prompt('Copie o link:',url));}
$('#btnShare2').onclick=shareLink;

/* ===================== render ===================== */
/* ===== simulações salvas: só neste aparelho (nada vai ao servidor) ===== */
const RESN={fechou:'Fechou',negociando:'Negociando',nao_fechou:'Não fechou'};
const clonar=o=>JSON.parse(JSON.stringify(o===undefined?null:o));
function salvarSim(res){const E=S.estr;let nome=(E.nome||'').trim();if(!nome){nome=(window.prompt('Nome do cliente (fica só neste aparelho):')||'').trim();if(!nome)return false;E.nome=nome;}
  S.salvas=S.salvas||[];let it=E.sid?S.salvas.find(x=>x.sid===E.sid&&x.nome===nome):null;
  if(!it){E.sid='s'+Date.now().toString(36);it={sid:E.sid,nome};S.salvas.unshift(it);}
  Object.assign(it,{em:new Date().toISOString(),valor:E.valor,tipo:E.tipo,res:res||it.res||'',snap:{estr:clonar(E),cotasL:clonar(S.cotasL),comp:clonar(S.comp),fin:clonar(S.fin||{})}});
  S.salvas=S.salvas.slice(0,30);save();renderSalvas();return true;}
function renderSalvas(){const el=$('#salvas');if(!el)return;const L=S.salvas||[];if(!L.length){el.innerHTML='';return;}
  el.innerHTML=`<div class="card"><h2 style="font-size:16px;margin:0 0 4px">Simulações salvas</h2><p class="sub">Ficam só neste aparelho. Nada vai para o servidor.</p>${L.map((x,i)=>`<div class="sv"><div class="sv-i"><b>${esc(x.nome)}</b><span class="sel">${brl(num(x.valor)||0)} · ${esc(x.tipo||'')} · ${new Date(x.em).toLocaleDateString('pt-BR')}</span></div>${x.res?`<span class="tag ${x.res==='fechou'?'ok':'muted'}">${RESN[x.res]||''}</span>`:''}<button type="button" class="btn" data-sv-open="${i}">Abrir</button><button type="button" class="btn ghost" data-sv-del="${i}" aria-label="Excluir ${esc(x.nome)}">Excluir</button></div>`).join('')}</div>`;
  $$('[data-sv-open]').forEach(b=>b.onclick=()=>{const x=S.salvas[+b.dataset.svOpen];if(!x||!window.confirm('Abrir a simulação de '+x.nome+'? A que está na tela será substituída (salve antes, se precisar).'))return;
    S.estr=clonar(x.snap.estr);S.cotasL=clonar(x.snap.cotasL)||[];S.comp=Object.assign({},S.comp,clonar(x.snap.comp)||{});S.fin=clonar(x.snap.fin)||S.fin;save();render();renderOferta();renderCotas();passo(5);if(S.estr.campL&&S.estr.campL.desc!=null)toast('Campanha digitada volta aplicada: confirme se ainda vale');});
  $$('[data-sv-del]').forEach(b=>b.onclick=()=>{const x=S.salvas[+b.dataset.svDel];if(!x||!window.confirm('Excluir a simulação de '+x.nome+'?'))return;S.salvas.splice(+b.dataset.svDel,1);save();renderSalvas();});}
function render(){renderGrupos();renderRank();renderCampanhas();renderEstrategia();renderSalvas();trilha();}
editGroup(null);
['e-alvo','e-sg'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener('change',()=>setTimeout(()=>{renderOferta();renderCotas();},0));});
let tab='estrategia';try{tab=localStorage.getItem(KEY+'.tab')||'estrategia';}catch(e){}
if(!['grupos','estrategia','cotas','oferta'].includes(tab))tab='estrategia';if(location.hash)tab='oferta';
if(IMPORT_PEND)tab='grupos';
go(tab);
puxarGrupos();puxarInpc();puxarTaxas();
try{const bt=document.getElementById('btnTema');if(bt)bt.onclick=()=>{const r=document.documentElement,cur=r.dataset.tema||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),n=cur==='dark'?'light':'dark';r.dataset.tema=n;try{localStorage.setItem('tema',n);}catch(e){}};}catch(e){}
