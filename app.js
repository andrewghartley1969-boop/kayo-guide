(function(){
const TZ='Australia/Melbourne';
const fT=new Intl.DateTimeFormat('en-AU',{timeZone:TZ,hour:'numeric',minute:'2-digit',hour12:true});
const fD=new Intl.DateTimeFormat('en-AU',{timeZone:TZ,weekday:'short',day:'numeric',month:'short'});
const fK=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'});
const t=m=>fT.format(new Date(m*60000)).replace(' ','').toLowerCase();
const key=m=>fK.format(new Date(m*60000));
const nowM=()=>Math.floor(Date.now()/60000);
const PX=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px-per-min'))||5;
const LW=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-w'))||112;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D=window.GUIDE;
try{const c=JSON.parse(localStorage.getItem('kg-guide')||'null');if(c&&c.updated&&(!D||new Date(c.updated)>new Date(D.updated)))D=c}catch(e){}
let all=[],minS=0,maxE=0,days=[];
function build(){
  D.channels.sort((a,b)=>(parseInt(a.num)||9999)-(parseInt(b.num)||9999));
  all=[];D.channels.forEach((c,ci)=>c.p.forEach(p=>all.push({ci,s:p[0],e:p[1],title:p[2],comp:p[3]})));
  minS=Math.min(...all.map(p=>p.s));maxE=Math.max(...all.map(p=>p.e));
  const today=key(nowM());days=[];
  for(let m=minS;m<maxE;m+=60){const k=key(m);if(k>=today&&!days.some(d=>d.k===k))days.push({k,m})}
  if(!days.length)days.push({k:today,m:nowM()});
}
function dayStart(k){let m=(days.find(d=>d.k===k)||days[0]).m;while(key(m-1)===k)m--;return m}
let lastCheck=0;
async function refresh(manual){const btn=document.getElementById('refresh');btn.disabled=true;btn.textContent='Updating…';
  try{const r=await fetch('guide.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(r.status);
    const j=await r.json();if(!j.channels||!j.channels.length)throw new Error('empty');
    lastCheck=Date.now();
    if(!D||j.updated!==D.updated){D=j;try{localStorage.setItem('kg-guide',JSON.stringify(j))}catch(e){}rebuild()}else status();
  }catch(e){status('Couldn’t check for a newer guide just now.')}
  btn.disabled=false;btn.textContent='Refresh'}
function status(extra){const u=new Date(D.updated);
  document.getElementById('updated').textContent='Listings updated '+fD.format(u)+', '+t(Math.floor(u.getTime()/60000))+'. Times are Melbourne time.'+(extra?' '+extra:'')}
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
function logo(c,sz){return '<span class="logo'+(sz?' '+sz:'')+'"><img src="logos/'+esc(c.num)+'.png?v=2" alt="'+esc(c.name)+'" onerror="this.parentNode.outerHTML=\'<b>'+esc(c.name)+'</b>\'"></span>'}
function cls(p,n){return p.e<=n?'past':(p.s<=n?'on':'')}
function renderStrip(){const n=nowM();const el=document.getElementById('strip');el.innerHTML='';
  D.channels.forEach((c,ci)=>{const ps=all.filter(p=>p.ci===ci);const cur=ps.find(p=>p.s<=n&&p.e>n);const nx=ps.find(p=>p.s>n);
    const b=document.createElement('button');b.className='nowcard';
    if(!cur&&!nx){return}
    const pct=cur?Math.round((n-cur.s)/(cur.e-cur.s)*100):0;
    b.innerHTML='<span class="ch">'+logo(c,'xs')+esc(c.name)+' · '+esc(c.num)+'</span><span class="t">'+(cur?'<span class="live">ON NOW</span>'+esc(cur.title):'Up next: '+esc(nx.title))+'</span>'+
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
  D.channels.forEach((c,ci)=>{h+='<div class="row" style="width:'+W+'px"><div class="label">'+logo(c)+'</div>';
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
    h+='<section><h2>'+logo(c,'sm')+esc(c.name)+' <small>CH '+esc(c.num)+'</small></h2>';
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
document.getElementById('refresh').onclick=()=>refresh(true);refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastCheck>5*60000)refresh()});
setInterval(()=>{tick();const g=document.getElementById('grid');const sl=g.scrollLeft;render(false);g.scrollLeft=sl},60000);
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>render(true),200)});
})();
