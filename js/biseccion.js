/* Página del método de Bisección (procedimiento: Xi, Xf, Xr · Ea y Et).
   Requiere en el HTML: parser.js, mathrender.js, ui.js, plot.js, keypad.js
   (en ese orden). */

createKeypad({input:'fb',container:'kb-fb',preview:'pv-fb',latex:'x^{3}-x-2',onEnter:bis});

function setDec(v){
  DEC=+v;
  if(!document.getElementById('tabb').classList.contains('hide'))bis();
}
document.querySelectorAll('input[type=number]').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')bis();}));

function bis(){
  try{
    limpiar('b');
    const fs=fieldSrc('fb');
    const f=parse(fs);
    let a=+document.getElementById('a').value,b=+document.getElementById('b').value;
    const tol=+document.getElementById('tolb').value,max=+document.getElementById('maxb').value;
    if(!(tol>0)||!(max>0)) throw new Error('Tolerancia e iteraciones deben ser mayores que 0.');
    if(a>=b) throw new Error('Se requiere a < b.');
    const fa0=f(a),fb0=f(b);
    if(!Number.isFinite(fa0)||!Number.isFinite(fb0)) throw new Error('f(x) no está definida en alguno de los extremos.');
    if(fa0*fb0>0) throw new Error('Paso 1 no cumple: f(Xi)·f(Xf) no es menor que 0. Elija otro intervalo.');

    /* Valor verdadero de referencia (Xrv): bisección a alta precisión
       interna, solo para poder calcular Et. */
    let xrT=a,lo=a,hi=b,flo=fa0;
    for(let k=0;k<500;k++){
      const m=(lo+hi)/2,fm=f(m);
      xrT=m;
      if(fm===0)break;
      if(flo*fm<0)hi=m;else{lo=m;flo=fm;}
      if((hi-lo)/2<1e-13)break;
    }

    const rows=[];let prev=null,c=a,a0=a,b0=b,ok=false;
    for(let i=0;i<max;i++){
      c=(a+b)/2;const fa=f(a),fb=f(b),fc=f(c);
      const err=prev===null?null:Math.abs(c-prev);
      const ea=err===null||c===0?null:Math.abs(err/c)*100;
      const et=xrT===0?null:Math.abs(xrT-c)/Math.abs(xrT)*100;
      const prod=fa*fc;
      rows.push([a,b,c,fa,fb,fc,prod,ea,et]);
      if(fc===0||(b-a)/2<tol||(err!==null&&err<tol)){ok=true;break;}
      if(prod<0)b=c;else a=c;prev=c;
    }
    if(ok)setAns(c);
    fillTable('b',rows);
    pasosB(rows,ok,fs,{a:a0,b:b0,fa:fa0,fb:fb0,xrTrue:xrT});

    const teor=Math.max(1,Math.ceil(Math.log2((b0-a0)/tol)));
    const last=rows[rows.length-1];
    if(ok){
      result('b',true,[
        {l:'Raíz aproximada Xr',v:fmt(c),big:true},
        {l:'f(Xr)',v:fmt(f(c))},
        {l:'Iteraciones',v:rows.length+' <small>/ teóricas '+teor+'</small>'},
        {l:'Ea final (%)',v:fmt(last[7])},
        {l:'Et final (%)',v:fmt(last[8])}
      ]);
    }else{
      result('b',false,[{l:'Última aproximación Xr',v:fmt(c),big:true}],
        'No convergió en '+max+' iteraciones. Aumenta el máximo de iteraciones, amplía la tolerancia o elige otro intervalo.');
    }
    plot('cb',f,a0,b0,c,rows.map(r=>r[2]));
  }catch(e){msg('mb','err',e.message);}
}

function simB(){
  try{
    const rows=LAST.b;
    if(!rows||!rows.length){msg('mb','err','Primero pulsa Calcular para poder ver la simulación.');return;}
    const f=parse(fieldSrc('fb'));
    SIM.open({canvasId:'cb',f,scenes:bisScenes(f,rows),tableId:'tabb'});
  }catch(e){msg('mb','err',e.message);}
}

function pasosB(rows,ok,fs,ver){
  const head='<p class="nt"><span class="mm"><i>f</i>(<i>x</i>) = '+(mathOf(fs)||esc(fs))+'</span><br>'+
    'Paso 2: '+T('X_r = \\frac{X_i + X_f}{2}')+'<br>'+
    'Paso 4: '+T('E_a = \\left|\\frac{X_r - X_{r\\,ant}}{X_r}\\right| \\times 100\\%')+' &nbsp;·&nbsp; '+T('E_t = \\left|\\frac{X_{rv} - X_r}{X_{rv}}\\right| \\times 100\\%')+'<br>'+
    'X<sub>rv</sub> (valor verdadero de referencia, calculado internamente con alta precisión) ≈ <b>'+fmt(ver.xrTrue)+'</b><br>'+
    'Los valores se muestran con '+DEC+' decimales; el cálculo interno usa más precisión.</p>';

  /* Paso 1: verificación inicial (una sola vez). */
  const verHtml='<div class="it"><h4><span>1</span>Paso 1 · Verificación</h4>'+
    '<p class="mline"><span class="lbl">Paso 1</span><span class="mm"><i>f</i>(X<sub>i</sub>)·<i>f</i>(X<sub>f</sub>) = '+P(ver.fa)+' · '+P(ver.fb)+' = '+fmt(ver.fa*ver.fb)+' &lt; 0 <b>✓</b> → hay cambio de signo en ['+fmt(ver.a)+', '+fmt(ver.b)+'], se puede aplicar Bisección.</span></p></div>';

  const h=rows.map((r,i)=>{
    const [xi,xf,xr,fXi,fXf,fXr,prod,ea,et]=r,last=i===rows.length-1;
    const cond=fXr===0?'f(Xr) = 0 → Xr es la raíz exacta.'
      :prod<0?'f(Xi)·f(Xr) &lt; 0 → se reemplaza X<sub>f</sub> = X<sub>r</sub>.'
      :'f(Xi)·f(Xr) &gt; 0 → se reemplaza X<sub>i</sub> = X<sub>r</sub>.';
    const nXi=fXr===0||prod<0?xi:xr,nXf=fXr===0||prod<0?xr:xf;
    return '<div class="it"><h4><span>'+(i+1)+'</span>Iteración '+(i+1)+' · [X<sub>i</sub>, X<sub>f</sub>] = ['+fmt(xi)+', '+fmt(xf)+']</h4>'+
    '<p class="mline"><span class="lbl">Paso 2 · Xr</span><span class="mm">X<sub>r</sub> = '+FR(fmt(xi)+' + '+fmt(xf),'2')+' = <b>'+fmt(xr)+'</b></span></p>'+
    '<p class="mline"><span class="lbl">Evaluar</span><span class="mm"><i>f</i>(X<sub>i</sub>) = '+substM(fs,xi)+' = <b>'+fmt(fXi)+'</b></span></p>'+
    '<p class="mline"><span class="lbl"></span><span class="mm"><i>f</i>(X<sub>f</sub>) = '+substM(fs,xf)+' = <b>'+fmt(fXf)+'</b></span></p>'+
    '<p class="mline"><span class="lbl"></span><span class="mm"><i>f</i>(X<sub>r</sub>) = '+substM(fs,xr)+' = <b>'+fmt(fXr)+'</b></span></p>'+
    '<p class="mline"><span class="lbl">Paso 3 · Signo</span><span class="mm"><i>f</i>(X<sub>i</sub>)·<i>f</i>(X<sub>r</sub>) = '+P(fXi)+' · '+P(fXr)+' = '+fmt(prod)+' → '+cond+'</span></p>'+
    '<p class="mline"><span class="lbl">Intervalo</span><span class="mm">X<sub>i</sub> = '+fmt(nXi)+' · X<sub>f</sub> = '+fmt(nXf)+'</span></p>'+
    '<p class="mline"><span class="lbl">Paso 4 · Ea</span><span class="mm">'+(i?T('E_a = \\left|\\frac{'+P(xr)+' - '+P(rows[i-1][2])+'}{'+P(xr)+'}\\right| \\times 100\\% = '+fmt(ea)+'\\%'):'primera iteración (sin Xr anterior)')+'</span></p>'+
    '<p class="mline"><span class="lbl">Paso 4 · Et</span><span class="mm">'+T('E_t = \\left|\\frac{'+P(ver.xrTrue)+' - '+P(xr)+'}{'+P(ver.xrTrue)+'}\\right| \\times 100\\% = '+(et===null?'—':fmt(et)+'\\%'))+'</span></p>'+
    (last?(ok?'<p class="res">✔ Criterio de parada cumplido (error menor que la tolerancia). Raíz aproximada: <b>'+fmt(xr)+'</b></p>':'<p class="bad">✖ Se alcanzó el máximo de iteraciones sin cumplir la tolerancia.</p>'):'')+'</div>';
  }).join('');
  wrap('sb',head,verHtml+h);
}
