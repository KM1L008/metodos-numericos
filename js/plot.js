/* Dibujo de la gráfica en canvas con "cámara" (viewport) parametrizable,
   para poder animar zoom y desplazamiento en la simulación.
   Depende de ui.js (fmt, DEC). */

const PLOT_STATE={};
function clearPlot(id){delete PLOT_STATE[id];}
function replotAll(){for(const id in PLOT_STATE){const p=PLOT_STATE[id];plot(p.id,p.f,p.x1,p.x2,p.root,p.its,p.tans);}}

function nice(range,n){
  const raw=range/n,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;
  return (m<1.5?1:m<3.5?2:m<7.5?5:10)*p;
}

/* Cámara con la vista completa (heurística original). */
function camOf(f,x1,x2,root,tans){
  const span=Math.max((x2-x1)||0,Math.max(1,Math.abs(root))*1.2),mid=(x1+x2)/2;
  let lo=mid-span*0.62,hi=mid+span*0.62;
  if(lo>0)lo=-hi*0.08;if(hi<0)hi=-lo*0.08;
  const N=500,vals=[];
  for(let i=0;i<=N;i++){const y=f(lo+(hi-lo)*i/N);if(Number.isFinite(y))vals.push(y);}
  let mn=0,mx=0;
  if(vals.length){vals.sort((a,b)=>a-b);mn=vals[Math.floor(vals.length*0.03)];mx=vals[Math.ceil(vals.length*0.97)-1];}
  (tans||[]).forEach(t=>{if(Number.isFinite(t[1])){mn=Math.min(mn,t[1]);mx=Math.max(mx,t[1]);}});
  mn=Math.min(mn,0);mx=Math.max(mx,0);if(mn===mx){mn-=1;mx+=1;}
  const py=(mx-mn)*0.08;mn-=py;mx+=py;
  return {x0:lo,x1:hi,y0:mn,y1:mx};
}

/* Renderiza un frame: ejes, rejilla, curva y etiquetas con la cámara dada.
   overlay(g, geo) se ejecuta al final (geo = {X, Y, L, T, w, h, cam, lab}). */
function renderPlot(id,f,cam,overlay){
  const c=document.getElementById(id);c.classList.remove('hide');
  const dpr=window.devicePixelRatio||1,W=c.clientWidth,H=c.clientHeight;
  if(c.width!==Math.round(W*dpr)||c.height!==Math.round(H*dpr)){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);}
  const g=c.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const css=getComputedStyle(document.body),col=n=>css.getPropertyValue(n).trim();
  const lo=cam.x0,hi=cam.x1,mn=cam.y0,mx=cam.y1;
  const L=48,R=14,T=14,B=30,w=W-L-R,h=H-T-B;
  const X=x=>L+(x-lo)/(hi-lo)*w,Y=y=>T+(mx-y)/(mx-mn)*h;
  const sx=nice(Math.max(1e-12,hi-lo),10),sy=nice(Math.max(1e-12,mx-mn),8);
  const dLab=Math.min(12,Math.max(DEC,-Math.floor(Math.log10(sx))+1));
  const labFmt=v=>String(+v.toFixed(dLab));
  g.font='11px system-ui,sans-serif';
  g.save();g.beginPath();g.rect(L,T,w,h);g.clip();
  g.lineWidth=1;g.strokeStyle=col('--bd');
  for(let x=Math.ceil(lo/sx)*sx;x<=hi;x+=sx){g.beginPath();g.moveTo(X(x),T);g.lineTo(X(x),T+h);g.stroke();}
  for(let y=Math.ceil(mn/sy)*sy;y<=mx;y+=sy){g.beginPath();g.moveTo(L,Y(y));g.lineTo(L+w,Y(y));g.stroke();}
  g.strokeStyle=col('--tx');g.lineWidth=1.6;
  g.beginPath();g.moveTo(L,Y(0));g.lineTo(L+w,Y(0));g.stroke();
  if(lo<=0&&hi>=0){g.beginPath();g.moveTo(X(0),T);g.lineTo(X(0),T+h);g.stroke();}
  g.strokeStyle=col('--pri');g.lineWidth=2.5;g.beginPath();
  let on=false;
  const N=500;
  for(let i=0;i<=N;i++){
    const x=lo+(hi-lo)*i/N,y=f(x);
    if(!Number.isFinite(y)){on=false;continue;}
    const px=X(x),py=Y(y);
    if(px<L-60||px>L+w+60){on=false;continue;}
    on?g.lineTo(px,py):g.moveTo(px,py);on=true;
  }
  g.stroke();
  g.restore();
  g.strokeStyle=col('--bd');g.lineWidth=1;g.strokeRect(L,T,w,h);
  const lab=(t,x,y)=>{g.lineWidth=3;g.strokeStyle=col('--bg');g.strokeText(t,x,y);g.fillText(t,x,y);};
  const ox=X(0),oy=Y(0),yl=Math.min(oy+5,T+h-13);
  g.fillStyle=col('--mut');g.textAlign='center';g.textBaseline='top';
  for(let x=Math.ceil(lo/sx)*sx;x<=hi;x+=sx){if(Math.abs(x)<sx/2)continue;lab(labFmt(x),X(x),yl);}
  g.textAlign='right';g.textBaseline='middle';
  for(let y=Math.ceil(mn/sy)*sy;y<=mx;y+=sy){if(Math.abs(y)<sy/2)continue;lab(labFmt(y),ox-6,Y(y));}
  g.fillStyle=col('--tx');g.font='bold 12px system-ui,sans-serif';g.textAlign='right';g.textBaseline='top';
  lab('0',ox-6,yl);
  g.font='11px system-ui,sans-serif';g.fillStyle=col('--tx');g.font='bold 12px system-ui,sans-serif';
  g.textAlign='right';g.textBaseline='bottom';g.fillText('x',L+w-4,Math.min(Math.max(Y(0)-4,T+14),T+h-2));
  g.textAlign='left';g.textBaseline='top';g.fillText('y',Math.min(Math.max(X(0)+5,L+4),L+w-12),T+3);
  if(overlay)overlay(g,{X,Y,L,T,w,h,cam,lab,g});
}

/* Gráfica estática (comportamiento original). */
function plot(id,f,x1,x2,root,its,tans){
  PLOT_STATE[id]={id,f,x1,x2,root,its,tans};
  const cam=camOf(f,x1,x2,root,tans);
  renderPlot(id,f,cam,(g,geo)=>{
    const {X,Y}=geo;
    const css=getComputedStyle(document.body),col=n=>css.getPropertyValue(n).trim();
    (tans||[]).forEach(t=>{
      g.strokeStyle='#e67e22';g.lineWidth=1.4;g.beginPath();
      g.moveTo(X(t[0]),Y(0));g.lineTo(X(t[0]),Y(t[1]));g.lineTo(X(t[2]),Y(0));g.stroke();
      g.fillStyle='#e67e22';g.beginPath();g.arc(X(t[0]),Y(t[1]),3.5,0,7);g.fill();
    });
    g.fillStyle=col('--mut');
    (its||[]).forEach(x=>{const y=f(x);if(Number.isFinite(y)){g.beginPath();g.arc(X(x),Y(0),3,0,7);g.fill();}});
    if(root!=null&&Number.isFinite(root)){
      g.strokeStyle=col('--err');g.setLineDash([5,4]);g.lineWidth=1.2;
      g.beginPath();g.moveTo(X(root),geo.T);g.lineTo(X(root),geo.T+geo.h);g.stroke();g.setLineDash([]);
      g.fillStyle=col('--err');g.beginPath();g.arc(X(root),Y(0),6,0,7);g.fill();
      g.textAlign='center';g.textBaseline='bottom';g.fillStyle=col('--err');
      geo.lab('raíz ≈ '+fmt(root),Math.min(Math.max(X(root),geo.L+45),geo.L+geo.w-45),Y(0)-10>geo.T+14?Y(0)-10:geo.T+geo.h-4);
    }
  });
}
