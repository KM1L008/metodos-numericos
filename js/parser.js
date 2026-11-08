/* Núcleo matemático: normalización, parser de expresiones, evaluación y
   derivación simbólica. Sin dependencias del DOM. */

const FUN={
  sin:x=>Math.sin(x*RADFAC()),sen:x=>Math.sin(x*RADFAC()),cos:x=>Math.cos(x*RADFAC()),tan:x=>Math.tan(x*RADFAC()),
  asin:x=>Math.asin(x)/RADFAC(),acos:x=>Math.acos(x)/RADFAC(),atan:x=>Math.atan(x)/RADFAC(),
  exp:Math.exp,sqrt:Math.sqrt,abs:Math.abs,
  sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,
  ln:Math.log,log:Math.log10
};
let DEG=false;
const RADFAC=()=>DEG?Math.PI/180:1;
function setDeg(v){DEG=!!v;}

let ANS=null;
function setAns(v){ANS=v;}

const SUP={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
function norm(src){
  src=(src||'').trim();
  if(!src) throw new Error('Escriba una función.');
  src=src.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,m=>'^('+[...m].map(c=>SUP[c]).join('')+')')
    .replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/\*\*/g,'^')
    .replace(/,/g,'.').replace(/π/g,'pi')
    .replace(/√\(/g,'sqrt(').replace(/√/g,'sqrt(')
    .toLowerCase();
  src=src.replace(/(^|[^a-z])x(\d+(?:\.\d+)?)/g,'$1x^$2');
  const o=(src.match(/\(/g)||[]).length,c=(src.match(/\)/g)||[]).length;
  if(o>c)src+=')'.repeat(o-c);
  return src;
}
function astOf(src){
  src=norm(src);
  const tk=[],re=/\s*(?:(\d+(?:\.\d+)?|\.\d+)|([a-z]+)|([+\-*\/^()]))/y;let i=0;
  while(i<src.length){
    re.lastIndex=i;const m=re.exec(src);
    if(!m){if(src.slice(i).trim()==='')break;throw new Error('La función contiene caracteres no permitidos.');}
    tk.push(m[1]!==undefined?{n:+m[1]}:m[2]?{id:m[2]}:{op:m[3]});i=re.lastIndex;
  }
  let p=0;const peek=()=>tk[p],bad=()=>new Error('Función inválida. Revise la sintaxis.');
  const B=(t,a,b)=>({t,a,b});
  function expr(){let l=term();while(peek()&&(peek().op==='+'||peek().op==='-')){const o=tk[p++].op;l=B(o,l,term());}return l;}
  function term(){let l=unary();for(;;){const t=peek();if(!t)break;let o;
    if(t.op==='*'||t.op==='/')o=tk[p++].op;else if(t.id||t.op==='(')o='*';else break;
    l=B(o,l,unary());}return l;}
  function unary(){const t=peek();if(t&&t.op==='-'){p++;return{t:'neg',a:unary()};}if(t&&t.op==='+'){p++;return unary();}return power();}
  function power(){const b=atom();if(peek()&&peek().op==='^'){p++;return B('^',b,unary());}return b;}
  function atom(){
    const t=tk[p++];if(!t)throw bad();
    if(t.n!==undefined)return{t:'n',v:t.n};
    if(t.op==='('){const e=expr();if(!peek()||peek().op!==')')throw bad();p++;return e;}
    if(t.id){
      if(t.id==='x')return{t:'x'};
      if(t.id==='pi')return{t:'c',v:Math.PI,s:'π'};
      if(t.id==='e')return{t:'c',v:Math.E,s:'e'};
      if(t.id==='ans'){
        if(ANS===null)throw new Error('“ans” aún no tiene valor: calcula una raíz primero.');
        return{t:'c',v:ANS,s:'ans'};
      }
      const nm=t.id==='sen'?'sin':t.id;
      if(FUN[nm]){if(!peek()||peek().op!=='(')throw new Error('Use paréntesis: '+t.id+'(...)');p++;const e=expr();if(!peek()||peek().op!==')')throw bad();p++;return{t:'f',n:nm,a:e};}
      throw new Error('Término desconocido: "'+t.id+'".');
    }
    throw bad();
  }
  const r=expr();if(p<tk.length)throw bad();return r;
}
function comp(n){
  switch(n.t){
    case 'n':case 'c':{const v=n.v;return()=>v;}
    case 'x':return x=>x;
    case 'neg':{const a=comp(n.a);return x=>-a(x);}
    case 'f':{const a=comp(n.a),g=FUN[n.n];return x=>g(a(x));}
    default:{const a=comp(n.a),b=comp(n.b);
      return n.t==='+'?x=>a(x)+b(x):n.t==='-'?x=>a(x)-b(x):n.t==='*'?x=>a(x)*b(x):n.t==='/'?x=>a(x)/b(x):x=>Math.pow(a(x),b(x));}
  }
}
function parse(src){const f=comp(astOf(src));f(1);return f;}
const hasX=n=>n.t==='x'||!!(n.a&&hasX(n.a))||!!(n.b&&hasX(n.b));
const num=v=>({t:'n',v}),isN=(n,v)=>n.t==='n'&&(v===undefined||n.v===v);
const neg=a=>isN(a)?num(-a.v):a.t==='neg'?a.a:{t:'neg',a};
const add=(a,b)=>isN(a,0)?b:isN(b,0)?a:isN(a)&&isN(b)?num(a.v+b.v):b.t==='neg'?sub(a,b.a):isN(b)&&b.v<0?sub(a,num(-b.v)):{t:'+',a,b};
const sub=(a,b)=>isN(b,0)?a:isN(a,0)?neg(b):isN(a)&&isN(b)?num(a.v-b.v):b.t==='neg'?add(a,b.a):isN(b)&&b.v<0?add(a,num(-b.v)):{t:'-',a,b};
const mul=(a,b)=>isN(a,0)||isN(b,0)?num(0):isN(a,1)?b:isN(b,1)?a:isN(a)&&isN(b)?num(a.v*b.v):a.t==='neg'?neg(mul(a.a,b)):b.t==='neg'?neg(mul(a,b.a)):{t:'*',a,b};
const div=(a,b)=>isN(a,0)?num(0):isN(b,1)?a:isN(a)&&a.v<0?neg(div(num(-a.v),b)):b.t==='neg'?neg(div(a,b.a)):a.t==='neg'?neg(div(a.a,b)):{t:'/',a,b};
const pw=(a,b)=>isN(b,0)?num(1):isN(b,1)?a:{t:'^',a,b};
const fnc=(n,a)=>({t:'f',n,a});
function dif(n){
  switch(n.t){
    case 'n':case 'c':return num(0);
    case 'x':return num(1);
    case 'neg':return neg(dif(n.a));
    case '+':return add(dif(n.a),dif(n.b));
    case '-':return sub(dif(n.a),dif(n.b));
    case '*':return add(mul(dif(n.a),n.b),mul(n.a,dif(n.b)));
    case '/':return div(sub(mul(dif(n.a),n.b),mul(n.a,dif(n.b))),pw(n.b,num(2)));
    case '^':
      if(!hasX(n.b))return mul(mul(n.b,pw(n.a,sub(n.b,num(1)))),dif(n.a));
      if(!hasX(n.a))return mul(mul(n,fnc('ln',n.a)),dif(n.b));
      return mul(n,add(mul(dif(n.b),fnc('ln',n.a)),div(mul(n.b,dif(n.a)),n.a)));
    case 'f':{const a=n.a,da=dif(a),sq=()=>fnc('sqrt',sub(num(1),pw(a,num(2))));
      const F=num(RADFAC());
      const o={sin:()=>mul(mul(fnc('cos',a),da),F),cos:()=>neg(mul(mul(fnc('sin',a),da),F)),
        tan:()=>div(mul(da,F),pw(fnc('cos',a),num(2))),
        asin:()=>div(da,mul(F,sq())),acos:()=>neg(div(da,mul(F,sq()))),atan:()=>div(da,mul(F,add(num(1),pw(a,num(2))))),
        exp:()=>mul(n,da),sqrt:()=>div(da,mul(num(2),n)),abs:()=>mul(div(a,n),da),
        sinh:()=>mul(fnc('cosh',a),da),cosh:()=>mul(fnc('sinh',a),da),tanh:()=>div(da,pw(fnc('cosh',a),num(2))),
        ln:()=>div(da,a),log:()=>div(da,mul(a,num(Math.LN10)))};
      return o[n.n]();}
  }
}
const prc=n=>n.t==='+'||n.t==='-'?1:n.t==='*'||n.t==='/'?2:n.t==='neg'||(n.t==='n'&&n.v<0)?3:n.t==='^'?4:5;
function str(n){
  const P=(m,k)=>prc(m)<k?'('+str(m)+')':str(m);
  switch(n.t){
    case 'n':return String(+n.v.toFixed(6));
    case 'x':return 'x';
    case 'c':return n.s;
    case 'neg':return '-'+P(n.a,2);
    case 'f':return n.n+'('+str(n.a)+')';
    case '+':return P(n.a,1)+' + '+P(n.b,1);
    case '-':return P(n.a,1)+' - '+P(n.b,2);
    case '*':return P(n.a,2)+'*'+P(n.b,2);
    case '/':return P(n.a,2)+'/'+P(n.b,3);
    case '^':return P(n.a,5)+'^'+P(n.b,5);
  }
}
const derivStr=src=>str(dif(astOf(src)));
