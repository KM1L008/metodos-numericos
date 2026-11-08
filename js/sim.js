/* Simulación animada de los métodos sobre la gráfica: la "cámara" hace
   zoom suave hacia cada iteración mientras se trazan progresivamente las
   líneas del método (intervalos y punto medio en Bisección, tangentes en
   Newton). Controles: reproducir/pausa, paso a paso, velocidad y cierre.
   Depende de plot.js (renderPlot) y ui.js (fmt, DEC). */

const SIM={on:false,raf:0,idx:0,t:0,playing:true,finished:false,speed:1,last:0,
  scenes:[],initCam:null,canvasId:null,tableId:null,bar:null,f:null,finTimer:0};

const simEase=t=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const simClamp=v=>Math.max(0,Math.min(1,v));
const simLerp=(a,b,t)=>a+(b-a)*t;
const simCol=n=>getComputedStyle(document.body).getPropertyValue(n).trim();
const lerpCam=(a,b,t)=>({x0:simLerp(a.x0,b.x0,t),x1:simLerp(a.x1,b.x1,t),y0:simLerp(a.y0,b.y0,t),y1:simLerp(a.y1,b.y1,t)});

/* Cámara centrada en un foco, con la curva visible. */
function focusCam(f,xs,ys){
  let x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs);
  if(!(x1-x0>1e-9)){x0-=0.5;x1+=0.5;}
  const xp=(x1-x0)*0.3;x0-=xp;x1+=xp;
  let y0=Math.min.apply(null,[0].concat(ys)),y1=Math.max.apply(null,[0].concat(ys));
  for(let i=0;i<=40;i++){const y=f(x0+(x1-x0)*i/40);if(Number.isFinite(y)){if(y<y0)y0=y;if(y>y1)y1=y;}}
  if(!(y1-y0>1e-9)){y0-=1;y1+=1;}
  const yp=(y1-y0)*0.18;y0-=yp;y1+=yp;
  return {x0,x1,y0,y1};
}

/* ===== Escenas de Bisección ===== */
function bisScenes(f,rows){
  return rows.map((r,i)=>{
    const [xi,xf,xr,fa,fb,fc]=r;
    const prod=fa*fc,keepLeft=fc===0||prod<0; // raíz en [xi,xr] → se descarta la mitad derecha
    const cam=focusCam(f,[xi,xf,xr],[fa,fb,fc]);
    const last=i===rows.length-1;
    return {cam,draw(g,geo,p){
      const {X,Y,lab}=geo;
      const pri=simCol('--pri'),mut=simCol('--mut'),tx=simCol('--tx'),bg=simCol('--bg'),err=simCol('--err'),oran='#e67e22';
      const axY=Y(0);
      lab('Iteración '+(i+1)+(last?' · final':''),geo.L+10,geo.T+14);
      /* Fase 1 (0–35%): extremos del intervalo y sus imágenes. */
      const s1=simClamp(p/0.35);
      if(s1>0){
        g.globalAlpha=s1;
        g.strokeStyle=mut;g.lineWidth=1.2;
        g.beginPath();g.moveTo(X(xi),axY);g.lineTo(X(xi),Y(fa));g.stroke();
        g.beginPath();g.moveTo(X(xf),axY);g.lineTo(X(xf),Y(fb));g.stroke();
        g.fillStyle=pri;
        [[xi,fa],[xf,fb]].forEach(([vx,vy])=>{g.beginPath();g.arc(X(vx),Y(vy),4,0,7);g.fill();});
        g.fillStyle=tx;
        [[xi],[xf]].forEach(([vx])=>{g.beginPath();g.arc(X(vx),axY,3.5,0,7);g.fill();});
        g.globalAlpha=1;
      }
      /* Fase 2 (30–70%): punto medio Xr baja hasta la curva y al eje. */
      const s2=simClamp((p-0.3)/0.4);
      if(s2>0){
        g.strokeStyle=oran;g.lineWidth=1.4;g.setLineDash([4,3]);
        g.beginPath();g.moveTo(X(xr),axY);g.lineTo(X(xr),simLerp(axY,Y(fc),s2));g.stroke();g.setLineDash([]);
        g.fillStyle=oran;g.beginPath();g.arc(X(xr),simLerp(axY,Y(fc),s2),4,0,7);g.fill();
        if(s2>0.75){g.fillStyle=tx;g.beginPath();g.arc(X(xr),axY,4,0,7);g.fill();}
      }
      /* Fase 3 (72–100%): se descarta la mitad sin raíz y se marca el nuevo intervalo. */
      const s3=simClamp((p-0.72)/0.28);
      if(s3>0){
        const rx0=keepLeft?X(xr):X(xi),rx1=X(xf);
        g.globalAlpha=0.6*s3;g.fillStyle=bg;
        g.fillRect(rx0,geo.T,rx1-rx0,geo.h);
        g.globalAlpha=s3;g.strokeStyle=err;g.lineWidth=1.2;g.setLineDash([5,4]);
        g.strokeRect(rx0,geo.T,rx1-rx0,geo.h);g.setLineDash([]);
        g.globalAlpha=1;
        g.fillStyle=mut;g.font='11px system-ui,sans-serif';g.textAlign='center';g.textBaseline='top';
        if(rx1-rx0>52)g.fillText('se descarta',(rx0+rx1)/2,geo.T+geo.h-16);
        const n0=keepLeft?xi:xr,n1=keepLeft?xr:xf;
        g.strokeStyle=pri;g.lineWidth=4;g.globalAlpha=s3;
        g.beginPath();g.moveTo(X(n0),axY);g.lineTo(X(n1),axY);g.stroke();
        g.globalAlpha=1;
        g.fillStyle=pri;g.textAlign='center';g.textBaseline='bottom';
        g.fillText('Xr = '+fmt(xr),X(xr),axY-8);
        g.textBaseline='top';
      }
    }};
  });
}

/* ===== Escenas de Newton-Raphson ===== */
function newtonScenes(f,rows){
  return rows.map((r,i)=>{
    const [x,fx,xn]=[r[0],r[1],r[3]];
    const cam=focusCam(f,[x,xn],[fx,0]);
    const last=i===rows.length-1;
    return {cam,draw(g,geo,p){
      const {X,Y,lab}=geo;
      const pri=simCol('--pri'),mut=simCol('--mut'),tx=simCol('--tx'),oran='#e67e22';
      const axY=Y(0);
      lab('Iteración '+(i+1)+(last?' · final':''),geo.L+10,geo.T+14);
      /* Fase 1 (0–30%): punto (xn, f(xn)) y su vertical. */
      const s1=simClamp(p/0.3);
      if(s1>0){
        g.globalAlpha=s1;
        g.strokeStyle=mut;g.lineWidth=1.2;g.setLineDash([4,3]);
        g.beginPath();g.moveTo(X(x),axY);g.lineTo(X(x),simLerp(axY,Y(fx),s1));g.stroke();g.setLineDash([]);
        g.fillStyle=pri;g.beginPath();g.arc(X(x),Y(fx),4.5,0,7);g.fill();
        g.fillStyle=tx;g.beginPath();g.arc(X(x),axY,3.5,0,7);g.fill();
        g.globalAlpha=1;
      }
      /* Fase 2 (25–75%): la tangente crece desde el punto hasta el eje. */
      const s2=simClamp((p-0.25)/0.5);
      if(s2>0){
        g.strokeStyle=oran;g.lineWidth=2;
        g.beginPath();g.moveTo(X(x),Y(fx));
        g.lineTo(simLerp(X(x),X(xn),s2),simLerp(Y(fx),axY,s2));g.stroke();
        g.fillStyle=oran;g.beginPath();g.arc(X(x),Y(fx),4.5,0,7);g.fill();
      }
      /* Fase 3 (72–100%): el nuevo punto x(n+1) sobre el eje. */
      const s3=simClamp((p-0.72)/0.28);
      if(s3>0){
        g.globalAlpha=s3;
        g.fillStyle=tx;g.beginPath();g.arc(X(xn),axY,4.5,0,7);g.fill();
        g.strokeStyle=tx;g.lineWidth=1.4;
        g.beginPath();g.arc(X(xn),axY,8,0,7);g.stroke();
        g.globalAlpha=1;
        g.fillStyle=pri;g.font='11px system-ui,sans-serif';g.textAlign='center';g.textBaseline='bottom';
        g.fillText('xₙ₊₁ = '+fmt(xn),X(xn),axY-12);
        g.textBaseline='top';
      }
    }};
  });
}

/* ===== Motor y controles ===== */
function simBar(canvasId){
  const c=document.getElementById(canvasId);
  let bar=c.previousElementSibling;
  if(bar&&bar.classList.contains('simbar'))return bar;
  bar=document.createElement('div');bar.className='simbar hide';
  bar.innerHTML='<span class="sim-title">Simulación</span>'+
    '<button type="button" class="sim-btn" data-a="play">⏸ Pausa</button>'+
    '<button type="button" class="sim-btn" data-a="prev" title="Iteración anterior">⏮ Ant</button>'+
    '<button type="button" class="sim-btn" data-a="next" title="Siguiente iteración">Sig ⏭</button>'+
    '<span class="sim-count"></span>'+
    '<span class="sim-sp"></span>'+
    '<label class="sim-speed">Velocidad <select data-a="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>'+
    '<button type="button" class="sim-btn sim-x" data-a="close">✕ Cerrar</button>';
  c.parentNode.insertBefore(bar,c);
  bar.addEventListener('click',e=>{
    const a=e.target.dataset&&e.target.dataset.a;
    if(!a)return;
    if(a==='play')simPlayPause();
    else if(a==='prev')simStep(-1);
    else if(a==='next')simStep(1);
    else if(a==='close')SIM.close(true);
  });
  bar.querySelector('select').addEventListener('change',e=>{SIM.speed=+e.target.value;});
  return bar;
}
function simUI(){
  if(!SIM.bar)return;
  SIM.bar.querySelector('[data-a="play"]').textContent=SIM.finished?'↺ Repetir':(SIM.playing?'⏸ Pausa':'▶ Continuar');
  SIM.bar.querySelector('.sim-count').textContent='Iteración '+Math.min(SIM.idx+1,SIM.scenes.length)+'/'+SIM.scenes.length;
}
function onScene(){
  simUI();
  if(SIM.tableId){
    const trs=document.querySelectorAll('#'+SIM.tableId+' tbody tr');
    trs.forEach(tr=>tr.classList.remove('cur'));
    const tr=trs[SIM.idx];
    if(tr){tr.classList.add('cur');tr.scrollIntoView({behavior:'smooth',block:'nearest'});}
  }
}
function simPlayPause(){
  clearTimeout(SIM.finTimer);
  if(SIM.finished){SIM.idx=0;SIM.t=0;SIM.finished=false;SIM.playing=true;onScene();}
  else SIM.playing=!SIM.playing;
  simUI();
}
function simStep(d){
  clearTimeout(SIM.finTimer);
  SIM.finished=false;
  SIM.idx=Math.max(0,Math.min(SIM.scenes.length-1,SIM.idx+d));
  SIM.t=0;SIM.playing=false;
  onScene();
}
function simFrame(now){
  if(!SIM.on)return;
  const dt=Math.min(60,now-SIM.last);SIM.last=now;
  const sc=SIM.scenes[SIM.idx],dur=sc.dur||2800;
  if(SIM.playing){
    SIM.t+=dt*SIM.speed;
    if(SIM.t>=dur){
      if(SIM.idx<SIM.scenes.length-1){SIM.idx++;SIM.t=0;onScene();}
      else{
        SIM.t=dur;SIM.playing=false;SIM.finished=true;simUI();
        SIM.finTimer=setTimeout(()=>{if(SIM.on&&!SIM.playing)SIM.close(true);},1600);
      }
    }
  }
  const p=simClamp(SIM.t/dur);
  const camT=simEase(simClamp(SIM.t/(dur*0.45)));
  const from=SIM.idx===0?SIM.initCam:SIM.scenes[SIM.idx-1].cam;
  const cam=lerpCam(from,sc.cam,camT);
  renderPlot(SIM.canvasId,SIM.f,cam,(g,geo)=>sc.draw(g,geo,p));
  SIM.raf=requestAnimationFrame(simFrame);
}

SIM.open=function(opts){
  if(SIM.on)SIM.close(false);
  SIM.bar=simBar(opts.canvasId);
  const cvEl=document.getElementById(opts.canvasId);
  if(cvEl.parentNode.classList.contains('plot-wrap'))cvEl.parentNode.classList.add('sim-on');
  SIM.canvasId=opts.canvasId;SIM.f=opts.f;SIM.scenes=opts.scenes;SIM.tableId=opts.tableId||null;
  SIM.idx=0;SIM.t=0;SIM.playing=true;SIM.finished=false;SIM.speed=1;SIM.last=performance.now();
  const cams=SIM.scenes.map(s=>s.cam);
  const x0=Math.min.apply(null,cams.map(c=>c.x0)),x1=Math.max.apply(null,cams.map(c=>c.x1));
  const y0=Math.min.apply(null,cams.map(c=>c.y0)),y1=Math.max.apply(null,cams.map(c=>c.y1));
  const px=(x1-x0)*0.06,py=(y1-y0)*0.06;
  SIM.initCam={x0:x0-px,x1:x1+px,y0:y0-py,y1:y1+py};
  SIM.bar.classList.remove('hide');
  SIM.bar.querySelector('select').value='1';
  SIM.on=true;
  onScene();
  cancelAnimationFrame(SIM.raf);
  SIM.raf=requestAnimationFrame(simFrame);
};
SIM.close=function(replot){
  if(!SIM.on)return;
  SIM.on=false;
  clearTimeout(SIM.finTimer);
  cancelAnimationFrame(SIM.raf);
  if(SIM.bar){
    SIM.bar.classList.add('hide');
    const wrap=SIM.bar.parentNode;
    if(wrap&&wrap.classList.contains('plot-wrap'))wrap.classList.remove('sim-on');
  }
  if(SIM.tableId)document.querySelectorAll('#'+SIM.tableId+' tbody tr').forEach(tr=>tr.classList.remove('cur'));
  if(replot&&typeof PLOT_STATE!=='undefined'&&PLOT_STATE[SIM.canvasId])replotAll();
};
