(function(){
const D=window.GUIDE;
const TZ='Australia/Sydney';
const fT=new Intl.DateTimeFormat('en-AU',{timeZone:TZ,hour:'numeric',minute:'2-digit',hour12:true});
const fD=new Intl.DateTimeFormat('en-AU',{timeZone:TZ,weekday:'short',day:'numeric',month:'short'});
const fK=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'});
const t=m=>fT.format(new Date(m*60000)).replace(' ','').toLowerCase();
const key=m=>fK.format(new Date(m*60000));
const nowM=()=>Math.floor(Date.now()/60000);
const PX=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px-per-min'))||5;
const LW=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-w'))||112;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MAP={fsa500:'500',fsa501:'501',fsa502:'502',fsa503:'503',fsa504:'504',fsa505:'505',fsa506:'506',fsa507:'507',espn1:'509',espn2:'510',racing:'529',kayo:'KAYO'};
const BASE=JSON.parse(JSON.stringify(D.channels));
let all=[],minS=0,maxE=0,days=[],live=null,lastFetch=null;
try{const c=JSON.parse(localStorage.getItem('kg-live')||'null');if(c){live=c.ev;lastFetch=c.at}}catch(e){}
function build(){
  const chans=BASE.map(c=>({name:c.name,num:c.num,p:c.p.slice()}));
  if(live&&live.length){
    if(live.some(e=>e.num==='KAYO')&&!chans.some(c=>c.num==='KAYO'))chans.push({name:'Kayo Exclusives',num:'KAYO',p:[]});
    chans.forEach(c=>{const ev=live.filter(e=>e.num===c.num);if(!ev.length)return;
      c.p=c.p.filter(p=>!ev.some(e=>e.s<p[1]&&e.e>p[0])).concat(ev.map(e=>[e.s,e.e,e.title,e.comp,1])).sort((a,b)=>a[0]-b[0])});
  }
  D.channels=chans;all=[];
  chans.forEach((c,ci)=>c.p.forEach(p=>all.push({ci,s:p[0],e:p[1],title:p[2],comp:p[3]})));
  minS=Math.min(...all.map(p=>p.s));maxE=Math.max(...all.map(p=>p.e));
  const today=key(nowM());days=[];
  for(let m=minS;m<maxE;m+=60){const k=key(m);if(k>=today&&!days.some(d=>d.k===k))days.push({k,m})}
  if(!days.length)days.push({k:today,m:nowM()});
}
function dayStart(k){let m=(days.find(d=>d.k===k)||days[0]).m;while(key(m-1)===k)m--;return m}
function syd(offsetDays){return key(nowM()+offsetDays*1440)}
async function refresh(){const btn=document.getElementById('refresh');btn.disabled=true;btn.textContent='Updating…';
  try{const ev=[];
    for(let i=-1;i<3;i++){const dt=syd(i);
      const r=await fetch('https://epg.discovery.indazn.com/eu/v5/Epg?date='+dt+'&country=au&languageCode=en&openBrowse=true&timeZoneOffset=660&platform=web&brand=kayo',{cache:'no-store'});
      if(!r.ok)throw new Error(r.status);const j=await r.json();
      (j.Tiles||[]).forEach(x=>{if(!x||x.IsLinear)return;const num=MAP[x.LinearProvider];if(!num)return;
        const s=Math.floor(Date.parse(x.Start)/60000),e=Math.ceil(Date.parse(x.End)/60000);if(!(e>s)||e-s>1440)return;
        if(ev.some(o=>o.num===num&&o.s===s&&o.title===x.Title))return;
        ev.push({num,s,e,title:x.Title,comp:(x.Competition&&x.Competition.Title)||x.Label||''})})}
    live=ev;lastFetch=Date.now();try{localStorage.setItem('kg-live',JSON.stringify({ev,at:lastFetch}))}catch(e){}
    rebuild();
  }catch(e){status('Couldn’t reach Kayo just now. Showing the last update.')}
  btn.disabled=false;btn.textContent='Refresh'}
function status(extra){const el=document.getElementById('updated');
  el.textContent=(lastFetch?'Live events updated '+fD.format(new Date(lastFetch))+', '+t(Math.floor(lastFetch/60000))+'. ':'')+
  'Full listings copied from your Kayo account '+fD.format(new Date(D.updated))+'. Times are Sydney time.'+(extra?' '+extra:'')}
function rebuild(){build();if(!days.some(d=>d.k===day))day=days[0].k;renderDays();render(true);status()}
build();
let view='grid', day=null;
try{view=localStorage.getItem('kg-view')||'grid'}catch(e){}
const todayK=key(nowM());
day=days.some(d=>d.k===todayK)?todayK:days[0].k;
const dayEl=document.getElementById('days');
function renderDays(){dayEl.innerHTML='';days.forEach(d=>{const b=document.createElement('button');b.className='tab';b.id='d-'+d.k;
  b.textContent=d.k===key(nowM())?'Today':(d.k===key(nowM()+1440)?'Tomorrow':fD.format(new Date(d.m*60000)));
  b.setAttribute('aria-pressed',d.k===day);b.onclick=()=>{day=d.k;renderDays();render(true)};dayEl.appendChild(b)})}
function cls(p,n){return p.e<=n?'past':(p.s<=n?'on':'')}
function renderStrip(){const n=nowM();const el=document.getElementById('strip');el.innerHTML='';
  D.channels.forEach((c,ci)=>{const ps=all.filter(p=>p.ci===ci);const cur=ps.find(p=>p.s<=n&&p.e>n);const nx=ps.find(p=>p.s>n);
    const b=document.createElement('button');b.className='nowcard';
    if(!cur&&!nx){return}
    const pct=cur?Math.round((n-cur.s)/(cur.e-cur.s)*100):0;
    b.innerHTML='<span class="ch">'+esc(c.name)+' · '+esc(c.num)+'</span><span class="t">'+(cur?'<span class="live">ON NOW</span>'+esc(cur.title):'Up next: '+esc(nx.title))+'</span>'+
      (cur?'<span class="bar"><i style="width:'+pct+'%"></i></span>':'')+
      '<span class="next">'+(cur&&nx?'Next '+t(nx.s)+' · '+esc(nx.title):(nx?t(nx.s):'Until '+t(cur.e)))+'</span>';
    b.onclick=()=>open(cur||nx);el.appendChild(b)})}
function render(scroll){const n=nowM();const px=PX(),lw=LW();
  const ds=dayStart(day);let s=Math.max(ds,minS), e=Math.min(ds+1440,maxE);
  s=Math.floor(s/30)*30;
  const W=lw+(e-s)*px;const cv=document.getElementById('canvas');cv.style.width=W+'px';
  let h='<div class="ruler" style="width:'+W+'px"><div class="corner"></div>';
  for(let m=Math.ceil(s/30)*30;m<e;m+=30){h+='<div class="tick" style="left:'+(lw+(m-s)*px)+'px">'+t(m)+'</div>'}
  h+='</div>';
  D.channels.forEach((c,ci)=>{h+='<div class="row" style="width:'+W+'px"><div class="label"><b>'+esc(c.name)+'</b><small>CH '+esc(c.num)+'</small></div>';
    all.filter(p=>p.ci===ci&&p.e>s&&p.s<e).forEach(p=>{const a=Math.max(p.s,s),b=Math.min(p.e,e);const x=lw+(a-s)*px+2,w=Math.max((b-a)*px-4,6);const k=cls(p,n);
      h+='<button class="prog '+k+'" data-i="'+all.indexOf(p)+'" style="left:'+x+'px;width:'+w+'px" title="'+esc(p.title)+'">'+
      '<span class="t">'+(k==='on'?'<span class="live">LIVE</span>':'')+esc(p.title)+'</span>'+(p.comp?'<span class="c">'+esc(p.comp)+'</span>':'')+'<span class="tm">'+t(p.s)+' – '+t(p.e)+'</span></button>'});
    h+='</div>'});
  if(n>=s&&n<e)h+='<div class="nowline" style="left:'+(lw+(n-s)*px)+'px"></div>';
  cv.innerHTML=h;
  if(scroll){const g=document.getElementById('grid');const target=(n>=s&&n<e)?(Math.max(s,Math.floor((n-45)/30)*30)-s)*px:0;g.scrollLeft=Math.max(0,target)}
  renderList();renderStrip()}
function renderList(){const n=nowM();const ds=dayStart(day),de=ds+1440;let h='';
  D.channels.forEach((c,ci)=>{const ps=all.filter(p=>p.ci===ci&&p.e>ds&&p.s<de);if(!ps.length)return;
    h+='<section><h2>'+esc(c.name)+' <small>CH '+esc(c.num)+'</small></h2>';
    ps.forEach(p=>{const k=cls(p,n);h+='<div class="li '+k+'" data-i="'+all.indexOf(p)+'" tabindex="0"><div class="tm">'+t(p.s)+' – '+t(p.e)+'</div><div class="t">'+(k==='on'?'<span class="live">LIVE</span>':'')+esc(p.title)+(p.comp?'<div class="c">'+esc(p.comp)+'</div>':'')+'</div></div>'});
    h+='</section>'});
  document.getElementById('list').innerHTML=h||'<p class="note">No listings for this day.</p>'}
function open(p){if(!p)return;const c=D.channels[p.ci];
  document.getElementById('s-ch').textContent=c.name+' · Channel '+c.num;
  document.getElementById('s-title').textContent=p.title;
  document.getElementById('s-comp').textContent=p.comp||'';
  document.getElementById('s-when').textContent=fD.format(new Date(p.s*60000))+' · '+t(p.s)+' – '+t(p.e)+' ('+(p.e-p.s)+' min)';
  document.getElementById('sheet').hidden=false;document.getElementById('s-close').focus()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)open(all[+b.dataset.i])});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('sheet').hidden=true;
  if(e.key==='Enter'){const b=e.target.closest('.li[data-i]');if(b)open(all[+b.dataset.i])}});
document.getElementById('sheet').onclick=e=>{if(e.target.id==='sheet'||e.target.id==='s-close')document.getElementById('sheet').hidden=true};
function setView(v){view=v;try{localStorage.setItem('kg-view',v)}catch(e){}
  document.getElementById('grid').hidden=v!=='grid';document.getElementById('list').hidden=v!=='list';
  document.getElementById('v-grid').setAttribute('aria-pressed',v==='grid');document.getElementById('v-list').setAttribute('aria-pressed',v==='list')}
document.getElementById('v-grid').onclick=()=>setView('grid');document.getElementById('v-list').onclick=()=>setView('list');
function tick(){document.getElementById('clock').textContent=t(nowM())}
renderDays();setView(view);tick();render(true);status();
document.getElementById('refresh').onclick=refresh;refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(!lastFetch||Date.now()-lastFetch>10*60000))refresh()});
setInterval(()=>{tick();const g=document.getElementById('grid');const sl=g.scrollLeft;render(false);g.scrollLeft=sl},60000);
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>render(true),200)});
})();
