/* Renderizado de expresiones matemáticas.
   - Genera LaTeX desde el AST y lo compone con KaTeX (si está disponible),
     alineación perfecta de fracciones, raíces y superíndices.
   - Si KaTeX no cargó (p. ej. sin internet), usa el renderizador HTML propio
     (fracciones con flexbox) como respaldo. */

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const KATEX_OK=(()=>{try{return typeof katex!=='undefined'&&!!katex.renderToString;}catch(e){return false;}})();

/* Sustituye la variable x por un valor constante en el AST. */
function subX(n,v){
  if(n.t==='x')return num(v);
  if(!n.a&&!n.b)return n;
  const r={t:n.t};
  if(n.v!==undefined)r.v=n.v;
  if(n.s!==undefined)r.s=n.s;
  if(n.n!==undefined)r.n=n.n;
  if(n.a)r.a=subX(n.a,v);
  if(n.b)r.b=subX(n.b,v);
  return r;
}

function mprec(n){return n.t==='+'||n.t==='-'?1:n.t==='*'||n.t==='/'?2:n.t==='neg'?3:n.t==='^'?4:5;}
function isAtomM(n){return n.t==='n'||n.t==='x'||n.t==='c'||n.t==='f';}

/* ===== LaTeX ===== */
const TEXFN={sin:'\\sin',cos:'\\cos',tan:'\\tan',asin:'\\arcsin',acos:'\\arccos',atan:'\\arctan',
  sinh:'\\sinh',cosh:'\\cosh',tanh:'\\tanh',ln:'\\ln',log:'\\log',exp:'\\exp'};
function texOf(n){
  const T=m=>texOf(m);
  const wrap=m=>'\\left('+T(m)+'\\right)';
  const P=(m,k)=>mprec(m)<k?wrap(m):T(m);
  switch(n.t){
    case 'n':return (Number.isInteger(n.v)&&Math.abs(n.v)<1e15)?String(n.v):fmt(n.v);
    case 'c':return n.s==='π'?'\\pi':n.s==='e'?'e':'\\mathrm{ans}';
    case 'x':return 'x';
    case 'neg':return '-'+(isAtomM(n.a)?T(n.a):wrap(n.a));
    case '+':return P(n.a,1)+' + '+P(n.b,1);
    case '-':return P(n.a,1)+' - '+P(n.b,2);
    case '*':{
      if(n.a.t==='n'){
        const coef=n.a.v<0?'-'+String(Math.abs(n.a.v)):T(n.a);
        const simple=isAtomM(n.b)||(n.b.t==='^'&&isAtomM(n.b.a));
        return coef+(simple?T(n.b):wrap(n.b));
      }
      if(n.b.t==='n')return (isAtomM(n.a)?T(n.a):wrap(n.a))+' \\cdot '+T(n.b);
      return (isAtomM(n.a)?T(n.a):wrap(n.a))+(isAtomM(n.b)?T(n.b):wrap(n.b));
    }
    case '/':return '\\frac{'+T(n.a)+'}{'+T(n.b)+'}';
    case '^':{
      const base=n.a.t==='n'?'{'+T(n.a)+'}':P(n.a,4);
      return base+'^{'+T(n.b)+'}';
    }
    case 'f':{
      if(n.n==='sqrt')return '\\sqrt{'+T(n.a)+'}';
      if(n.n==='abs')return '\\left|'+T(n.a)+'\\right|';
      return (TEXFN[n.n]||'\\operatorname{'+n.n+'}')+'\\left('+T(n.a)+'\\right)';
    }
  }
}

/* ===== Renderizado: KaTeX si hay, HTML propio si no ===== */
function nodeHTML(n){
  if(KATEX_OK)return katex.renderToString(texOf(n),{throwOnError:false});
  return mhtml(n);
}
const mathOf=src=>{if(!(src||'').trim())return null;try{return nodeHTML(astOf(src));}catch(e){return null;}};
const substM=(src,v)=>{try{return nodeHTML(subX(astOf(src),v));}catch(e){return esc(src);}};

/* Fórmulas LaTeX estáticas (etiquetas, fórmulas de los métodos). */
const T=latex=>KATEX_OK
  ?katex.renderToString(latex,{throwOnError:false})
  :'<span class="mm">'+esc(latex)+'</span>';
const FR=(n,d)=>KATEX_OK
  ?T('\\frac{'+n+'}{'+d+'}')
  :'<span class="mm">('+n+') ⁄ ('+d+')</span>';

/* ===== Renderizador HTML de respaldo (sin dependencias) ===== */
function mnum(v){return (Number.isInteger(v)&&Math.abs(v)<1e15)?String(v):fmt(v);}
function mhtml(n){
  const mh=m=>mhtml(m);
  const wrap=m=>'<span class="mpr">(</span>'+mh(m)+'<span class="mpr">)</span>';
  const P=(m,k)=>mprec(m)<k?wrap(m):mh(m);
  switch(n.t){
    case 'n':return '<span class="mn2">'+mnum(n.v)+'</span>';
    case 'c':return '<span class="mc">'+esc(n.s)+'</span>';
    case 'x':return '<i class="mi">x</i>';
    case 'neg':return '<span class="mo">−</span>'+(isAtomM(n.a)?mh(n.a):wrap(n.a));
    case '+':return P(n.a,1)+'<span class="mo">&thinsp;+&thinsp;</span>'+P(n.b,1);
    case '-':return P(n.a,1)+'<span class="mo">&thinsp;−&thinsp;</span>'+P(n.b,2);
    case '*':{
      const B=mh(n.b);
      if(n.a.t==='n'){
        const coef=n.a.v<0?'<span class="mo">−</span>'+mnum(Math.abs(n.a.v)):mnum(n.a.v);
        const simple=isAtomM(n.b)||(n.b.t==='^'&&isAtomM(n.b.a));
        return coef+(simple?B:wrap(n.b));
      }
      const A=mh(n.a);
      if(n.b.t==='n')return (isAtomM(n.a)?A:wrap(n.a))+'<span class="mo">&thinsp;·&thinsp;</span>'+mnum(n.b.v);
      return (isAtomM(n.a)?A:wrap(n.a))+(isAtomM(n.b)?B:wrap(n.b));
    }
    case '/':return '<span class="mfrac"><span class="mn">'+mh(n.a)+'</span><span class="md">'+mh(n.b)+'</span></span>';
    case '^':return P(n.a,4)+'<sup>'+(isAtomM(n.b)?mh(n.b):wrap(n.b))+'</sup>';
    case 'f':{
      if(n.n==='sqrt')return '<span class="mroot"><span class="mrs">√</span><span class="mvinc">'+mh(n.a)+'</span></span>';
      return '<span class="mf">'+esc(n.n)+'</span><span class="mpr">(</span>'+mh(n.a)+'<span class="mpr">)</span>';
    }
  }
}

/* Convierte el LaTeX que genera MathQuill a la sintaxis del parser.
   Soporta: \frac, \sqrt, \sqrt[n], potencias, \pi, funciones trig/log,
   \cdot/\times/\div, \left|\right| (valor absoluto) y \text{ans}. */
function latexToSrc(lx){
  lx=String(lx||'');
  let i=0;
  function grp(){
    i++;
    let out='';
    while(i<lx.length&&lx[i]!=='}')out+=atom();
    if(lx[i]==='}')i++;
    return out;
  }
  function atom(){
    const c=lx[i];
    if(c==='\\'){
      const m=/^\\([a-zA-Z]+)/.exec(lx.slice(i));
      if(!m){i+=2;return '';} // secuencias como \% o \, : se ignoran
      const cmd=m[1];i+=m[0].length;
      switch(cmd){
        case 'frac':{const a=grp(),b=grp();return '(('+a+')/('+b+'))';}
        case 'sqrt':{
          if(lx[i]==='['){
            const j=lx.indexOf(']',i);
            if(j===-1)throw new Error('Raíz incompleta.');
            const n=lx.slice(i+1,j);i=j+1;
            const a=grp();
            return '(('+a+')^(1/('+n+')))';
          }
          const a=grp();return 'sqrt('+a+')';
        }
        case 'pi':return 'pi';
        case 'cdot':case 'times':return '*';
        case 'div':return '/';
        case 'left':if(lx[i]==='|'){i++;return 'abs(';}return '';
        case 'right':if(lx[i]==='|'){i++;return ')';}return '';
        case 'sin':case 'cos':case 'tan':case 'sinh':case 'cosh':case 'tanh':
        case 'ln':case 'log':case 'exp':return cmd;
        case 'arcsin':return 'asin';
        case 'arccos':return 'acos';
        case 'arctan':return 'atan';
        case 'text':case 'mathrm':case 'operatorname':
          if(lx[i]==='{')return grp().trim();
          return '';
        default:throw new Error('Comando no soportado: \\'+cmd);
      }
    }
    if(c==='{')return grp();
    if(c==='^'){i++;const e=lx[i]==='{'?grp():atom();return '^('+e+')';}
    if(c==='_')throw new Error('Los subíndices no son válidos en f(x).');
    if(/\s/.test(c)){i++;return '';}
    i++;
    return c;
  }
  let out='';
  while(i<lx.length)out+=atom();
  return out;
}
