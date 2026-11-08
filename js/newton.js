/* Página del método de Newton-Raphson (procedimiento tipo Bisección:
   Paso 1 verificación, Paso 2 evaluar, Paso 3 siguiente valor, Paso 4 Ea y Et).
   Requiere en el HTML: parser.js, mathrender.js, ui.js, plot.js, keypad.js
   (en ese orden). */

createKeypad({input:'fn',container:'kb-fn',preview:'pv-fn',latex:'x^{3}-x-2',onEnter:newt});

function setDec(v){
  DEC=+v;
  if(!document.getElementById('tabn').classList.contains('hide'))newt();
}
document.querySelectorAll('input[type=number]').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')newt();}));

function newt(){
  try{
    limpiar('n');
    const fs=fieldSrc('fn');
    const f=parse(fs);
    let dStr,d;
    try{dStr=derivStr(fs);d=parse(dStr);}
    catch(e){dStr='';d=x=>{const h=1e-6*Math.max(1,Math.abs(x));return (f(x+h)-f(x-h))/(2*h);};}
    let x=+document.getElementById('x0').value;
    const tol=+document.getElementById('toln').value,max=+document.getElementById('maxn').value;
    if(!(tol>0)||!(max>0)) throw new Error('Tolerancia e iteraciones deben ser mayores que 0.');
    if(!Number.isFinite(x)) throw new Error('Valor inicial inválido.');

    /* Valor verdadero de referencia (Xrv): Newton a alta precisión interna,
       solo para poder calcular Et. */
    let xrT=x;
    {
      let xx=x;
      for(let k=0;k<500;k++){
        const fx=f(xx),dx=d(xx);
        if(!Number.isFinite(fx)||!Number.isFinite(dx)||Math.abs(dx)<1e-14)break;
        const xn=xx-fx/dx;
        if(!Number.isFinite(xn)||Math.abs(xn)>1e12)break;
        xrT=xn;
        if(Math.abs(xn-xx)<1e-13){break;}
        xx=xn;
      }
    }

    const rows=[];let ok=false,x0=x,lo=x,hi=x;
    for(let i=0;i<max;i++){
      const fx=f(x),dx=d(x);
      if(!Number.isFinite(fx)||!Number.isFinite(dx)) throw new Error('Valor no definido en x = '+fmt(x)+'. Pruebe otro x₀.');
      if(Math.abs(dx)<1e-12) throw new Error('f\'(x) ≈ 0 en x = '+fmt(x)+'. Newton no puede continuar: prueba otro x₀ o usa Bisección.');
      const xn=x-fx/dx,err=Math.abs(xn-x);
      if(!Number.isFinite(xn)||Math.abs(xn)>1e12) throw new Error('Newton diverge desde este x₀. Prueba otro valor inicial o usa Bisección.');
      const ea=xn===0?null:err/Math.abs(xn)*100;
      const et=xrT===0?null:Math.abs(xrT-xn)/Math.abs(xrT)*100;
      rows.push([x,fx,dx,xn,ea,et]);lo=Math.min(lo,xn);hi=Math.max(hi,xn);
      x=xn;
      if(err<tol||Math.abs(f(x))===0){ok=true;break;}
    }
    if(ok)setAns(x);
    fillTable('n',rows);
    pasosN(rows,ok,fs,dStr,{x0:x0,xrTrue:xrT});

    const last=rows[rows.length-1];
    if(ok){
      result('n',true,[
        {l:'Raíz aproximada',v:fmt(x),big:true},
        {l:'f(raíz)',v:fmt(f(x))},
        {l:'Iteraciones',v:String(rows.length)},
        {l:'Ea final (%)',v:fmt(last[4])},
        {l:'Et final (%)',v:fmt(last[5])}
      ]);
    }else{
      result('n',false,[{l:'Última aproximación',v:fmt(x),big:true}],
        'No convergió en '+max+' iteraciones. Prueba otro x₀ o aumenta el máximo de iteraciones.');
    }
    plot('cn',f,Math.min(lo,x0),Math.max(hi,x0)+1e-9,x,rows.map(r=>r[0]),rows.map(r=>[r[0],r[1],r[3]]));
  }catch(e){msg('mn','err',e.message);}
}

function simN(){
  try{
    const rows=LAST.n;
    if(!rows||!rows.length){msg('mn','err','Primero pulsa Calcular para poder ver la simulación.');return;}
    const f=parse(fieldSrc('fn'));
    SIM.open({canvasId:'cn',f,scenes:newtonScenes(f,rows),tableId:'tabn'});
  }catch(e){msg('mn','err',e.message);}
}

function pasosN(rows,ok,fs,ds,ver){
  const head='<p class="nt"><span class="mm"><i>f</i>(<i>x</i>) = '+(mathOf(fs)||esc(fs))+'</span><br>'+
    (ds?'<span class="mm">f\'(<i>x</i>) = '+(mathOf(ds)||esc(ds))+'</span> (derivada automática)<br>':'f\'(x) calculada numéricamente (diferencias centrales)<br>')+
    'Paso 3: '+T('x_{n+1} = x_{n} - \\frac{f(x_{n})}{f\'(x_{n})}')+'<br>'+
    'Paso 4: '+T('E_a = \\left|\\frac{x_{n+1} - x_{n}}{x_{n+1}}\\right| \\times 100\\%')+' &nbsp;·&nbsp; '+T('E_t = \\left|\\frac{X_{rv} - x_{n+1}}{X_{rv}}\\right| \\times 100\\%')+'<br>'+
    'X<sub>rv</sub> (valor verdadero de referencia, calculado internamente con alta precisión) ≈ <b>'+fmt(ver.xrTrue)+'</b><br>'+
    'Los valores se muestran con '+DEC+' decimales; el cálculo interno usa más precisión.</p>';

  /* Paso 1: datos y verificación inicial. */
  const f0=rows.length?rows[0][1]:null,d0=rows.length?rows[0][2]:null;
  const verHtml='<div class="it"><h4><span>1</span>Paso 1 · Verificación</h4>'+
    '<p class="mline"><span class="lbl">Paso 1</span><span class="mm">x₀ = <span class="mn2">'+fmt(ver.x0)+'</span> · <i>f</i>(x₀) = '+substM(fs,ver.x0)+' = <b>'+fmt(f0)+'</b></span></p>'+
    '<p class="mline"><span class="lbl"></span><span class="mm">f\'(x₀) = '+(ds?substM(ds,ver.x0)+' = <b>'+fmt(d0)+'</b>':fmt(d0)+'&nbsp;<small>(numérica)</small>')+' ≠ 0 <b>✓</b> → se puede aplicar Newton-Raphson.</span></p></div>';

  const h=rows.map((r,i)=>{
    const [x,fx,dx,xn,ea,et]=r,last=i===rows.length-1;
    return '<div class="it"><h4><span>'+(i+1)+'</span>Iteración '+(i+1)+' · x<sub>n</sub> = '+fmt(x)+'</h4>'+
    '<p class="mline"><span class="lbl">Paso 2 · f(xₙ)</span><span class="mm"><i>f</i>(<i>x</i><sub>n</sub>) = '+substM(fs,x)+' = <b>'+fmt(fx)+'</b></span></p>'+
    '<p class="mline"><span class="lbl">Paso 2 · f\'(xₙ)</span><span class="mm">f\'(<i>x</i><sub>n</sub>) = '+(ds?substM(ds,x)+' = <b>'+fmt(dx)+'</b>':fmt(dx)+'&nbsp;<small>(numérica)</small>')+'</span></p>'+
    '<p class="mline"><span class="lbl">Paso 3 · xₙ₊₁</span><span class="mm"><i>x</i><sub>n+1</sub> = <span class="mn2">'+fmt(x)+'</span> − '+FR(P(fx),P(dx))+' = <span class="mn2">'+fmt(x)+'</span> − '+P(fx/dx)+' = <b>'+fmt(xn)+'</b></span></p>'+
    '<p class="mline"><span class="lbl">Paso 4 · Ea</span><span class="mm">'+T('E_a = \\left|\\frac{'+P(xn)+' - '+P(x)+'}{'+P(xn)+'}\\right| \\times 100\\% = '+(ea===null?'—':fmt(ea)+'\\%'))+'</span></p>'+
    '<p class="mline"><span class="lbl">Paso 4 · Et</span><span class="mm">'+T('E_t = \\left|\\frac{'+P(ver.xrTrue)+' - '+P(xn)+'}{'+P(ver.xrTrue)+'}\\right| \\times 100\\% = '+(et===null?'—':fmt(et)+'\\%'))+'</span></p>'+
    (last?(ok?'<p class="res">✔ Criterio de parada cumplido (error menor que la tolerancia). Raíz aproximada: <b>'+fmt(xn)+'</b></p>':'<p class="bad">✖ Se alcanzó el máximo de iteraciones sin cumplir la tolerancia.</p>'):'')+'</div>';
  }).join('');
  wrap('sn',head,verHtml+h);
}
