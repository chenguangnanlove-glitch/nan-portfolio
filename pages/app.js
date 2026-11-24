const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const sections=[...document.querySelectorAll('section')];
let scene='home', transition;
let worksScroll=0;
const galleryKey='nan-works-view';
const filters=[...document.querySelectorAll('nav button')];
function selectKind(kind){
  for(const b of filters) b.setAttribute('aria-pressed',String(b.textContent===kind));
  for(const card of document.querySelectorAll('.card')) card.hidden=kind!=='全部' && card.dataset.kind!==kind;
}
try {
  const saved=JSON.parse(sessionStorage.getItem(galleryKey)||'null');
  const formerKinds = {'交互网页':'练琴工具','动画':'动画实验'};
  if(saved && Object.hasOwn(formerKinds,saved.kind)) saved.kind=formerKinds[saved.kind];
  if(saved && filters.some(b=>b.textContent===saved.kind)){
    selectKind(saved.kind);
    worksScroll=Number(saved.scroll)||0;
  }
}catch{}
function rememberGallery(){
  if(scene!=='works') return;
  worksScroll=window.scrollY;
  const kind=filters.find(b=>b.getAttribute('aria-pressed')==='true').textContent;
  try{sessionStorage.setItem(galleryKey,JSON.stringify({kind,scroll:worksScroll}));}catch{}
}
document.querySelector('.grid').addEventListener('click',rememberGallery);
addEventListener('pagehide',rememberGallery);
function route(initial = false){
  const next=sections.find(s=>'#'+s.id===location.hash)||sections[0];
  const old=document.getElementById(scene);
  transition?.cancel();
  function show(){
    sections.forEach(s=>s.hidden=s!==next);
    scene=next.id;
    document.body.classList.toggle('sub',scene!=='home');
    const back=document.querySelector('.homeLink');
    back.href=scene==='mars'?'#works':'#home';
    back.textContent=scene==='mars'?'← 作品':'← 主页';
    back.setAttribute('aria-label',scene==='mars'?'返回作品':'返回主页');
    if(old!==next){
      const previousLink = next.querySelector('a[href="#' + old.id + '"]');
      const focusTarget = initial ? next.querySelector('h1') : previousLink || next.querySelector('h1');
      if (focusTarget.tagName === 'H1') focusTarget.tabIndex = -1;
      focusTarget.focus({preventScroll:true});
    }
    window.scrollTo(0,scene==='works'?worksScroll:0);
    if(!initial && !reduced.matches) transition=next.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:360,easing:'ease-out'});
    draw(performance.now());
  }
  if(!initial && old!==next&&!old.hidden&&!reduced.matches){
    transition=old.animate([{opacity:1},{opacity:0}],{duration:145});
    transition.onfinish=show;
  }else show();
}
for(const button of filters) button.onclick=()=>{
  selectKind(button.textContent);
  rememberGallery();
};
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
let w,h,dx=0,dy=0,px=0,py=0,frame,last=0;
const pad=document.querySelector('.orbit-pad');
let tilt=0, turn=0, targetTilt=0, targetTurn=0, drag=null;
pad.addEventListener('pointerdown',event=>{
  if(drag || event.button!==0) return;
  targetTilt = tilt;
  targetTurn = turn;
  drag = { id:event.pointerId, x:event.clientX, y:event.clientY, tilt, turn,
    lastTime:event.timeStamp, speed:0 };
  pad.setPointerCapture(event.pointerId);
});
pad.addEventListener('pointermove',event=>{
  if(!drag || event.pointerId!==drag.id) return;
  targetTilt=Math.max(-.21,Math.min(.44,drag.tilt+(drag.y-event.clientY)/pad.clientHeight));
  const nextTurn = drag.turn + (event.clientX-drag.x)/pad.clientWidth*1.8;
  const elapsed = Math.max(1, event.timeStamp-drag.lastTime);
  const speed = (nextTurn-targetTurn)/elapsed;
  drag.speed += (speed-drag.speed) * (1-Math.exp(-elapsed/28));
  drag.lastTime = event.timeStamp;
  targetTurn = nextTurn;
  if(reduced.matches) draw(performance.now());
});
pad.addEventListener('pointerup', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const idle = Math.max(0, event.timeStamp-drag.lastTime);
  const coast = drag.speed * 115 * Math.exp(-idle/30);
  if (!reduced.matches) targetTurn += Math.max(-.42, Math.min(.42, coast));
  drag = null;
});
pad.addEventListener('lostpointercapture', event => {
  if (drag && event.pointerId === drag.id) drag = null;
});
const stars=Array.from({length:105},()=>[Math.random(),Math.random(),Math.random()]);
// Paint each orbital band once, then composite the rotating textures.
function makeBand(inner, width, count, tint){
  const layer=document.createElement('canvas');
  layer.width=layer.height=720;
  const pen=layer.getContext('2d');
  pen.translate(360,360);
  for(let i=0;i<count;i++){
    const angle=Math.random()*Math.PI*2;
    const spread=(Math.random()+Math.random()+Math.random())/3;
    const radius=inner+width*spread+4*Math.sin(angle*3+spread*8);
    pen.globalAlpha=(1-Math.abs(spread-.5)*1.75)*(.20+Math.random()*.72);
    pen.fillStyle=tint;
    const size=.6+Math.random()*1.6;
    pen.fillRect(Math.cos(angle)*radius,Math.sin(angle)*radius,size,size);
  }
  return layer;
}
const bands=[makeBand(110,205,12000,'#acb8cd'),makeBand(128,54,6000,'#e8e5df'),makeBand(205,38,2600,'#8198b7')];
function resize(){w=innerWidth;h=innerHeight;const r=Math.min(devicePixelRatio,1.5);canvas.width=w*r;canvas.height=h*r;ctx.setTransform(r,0,0,r,0,0);draw(performance.now())}
function draw(ms){
  cancelAnimationFrame(frame);
  const moving=!reduced.matches&&!document.hidden&&scene==='home';
  if(moving) frame=requestAnimationFrame(draw);
  if(moving && !drag && Math.abs(targetTurn-turn)<.001 && ms-last<32)return;
  const ease = reduced.matches || drag ? 1 : 1-Math.exp(-Math.min(100,Math.max(1,ms-last))/125);
  tilt+=(targetTilt-tilt)*ease;
  turn+=(targetTurn-turn)*ease;
  last=ms;const t=reduced.matches?0:ms*.000055;
  ctx.clearRect(0,0,w,h);px+=(dx-px)*.1;py+=(dy-py)*.1;
  for(const [x,y,z] of stars){ctx.fillStyle='rgba(202,212,230,'+(.10+z*.40)+')';ctx.fillRect((x*w+px*z+Math.sin(t+x*5)*3+w)%w,y*h+py*z,1+z*.6,1+z*.6)}
  const mobile=w<650,r=mobile?w*.32:Math.min(w*.19,h*.27),cx=w*(mobile?.69:.71)+px,cy=h*(mobile?.31:.50)+py;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(-.31+turn+.025*Math.sin(t));
  const halo=ctx.createRadialGradient(0,0,r*.15,0,0,r*1.2);
  halo.addColorStop(0,'rgba(158,173,200,.12)');
  halo.addColorStop(.48,'rgba(110,127,162,.055)');
  halo.addColorStop(1,'transparent');
  ctx.fillStyle=halo;
  ctx.fillRect(-r*1.2,-r*1.2,r*2.4,r*2.4);
  const depth=.30+tilt+.045*Math.sin(t*.4)+py*.003;
  function plane(){
    ctx.save();
    ctx.scale(1,depth);
    bands.forEach((texture,i)=>{
      ctx.save();
      ctx.rotate(t*(.32+i*.18));
      ctx.drawImage(texture,-r*1.28,-r*1.28,r*2.56,r*2.56);
      ctx.restore();
    });
    ctx.restore();
  }
  plane();
  // Occlude the far side and reveal only the near half over the silhouette.
  const rim=ctx.createRadialGradient(0,0,r*.265,0,0,r*.34);
  rim.addColorStop(0,'#030409');rim.addColorStop(.2,'#161923');
  rim.addColorStop(.32,'#8b909c');rim.addColorStop(.44,'#323948');rim.addColorStop(1,'transparent');
  ctx.fillStyle=rim;
  ctx.beginPath();ctx.arc(0,0,r*.34,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.rect(-r*.35,0,r*.7,r*.35);ctx.clip();plane();
  ctx.restore();
}
addEventListener('pointermove',e=>{if(!reduced.matches){dx=(e.clientX/w-.5)*14;dy=(e.clientY/h-.5)*12}});
addEventListener('resize',resize);addEventListener('hashchange',()=>route());
document.addEventListener('visibilitychange',()=>draw(performance.now()));reduced.addEventListener('change',()=>draw(performance.now()));
resize();route(true);
