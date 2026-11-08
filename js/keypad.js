/* Teclado matemático en pantalla sobre un campo MathQuill (la librería que
   usa Desmos): el mismo campo acepta escritura física y botones; "/" crea
   fracciones, "^" exponentes, etc. La vista previa valida la expresión.
   Depende de parser.js y mathrender.js (latexToSrc, astOf).
   Si MathQuill no cargó, usa un shim con un div editable en texto plano. */

const MQF={};
const fieldSrc=id=>{const f=MQF[id];return f?latexToSrc(f.latex()):'';};

function makeMathField(el,opts){
  if(window.MathQuill&&window.jQuery){
    const MQ=MathQuill.getInterface(2);
    return MQ.MathField(el,{
      handlers:{
        edit:()=>opts.onEdit&&opts.onEdit(),
        enter:()=>opts.onEnter&&opts.onEnter()
      }
    });
  }
  /* Respaldo sin MathQuill: div contenteditable con comandos en ASCII. */
  el.contentEditable='true';
  el.classList.add('kb-fallback');
  const MAP={'\\sqrt':'sqrt(','\\nthroot':'^(1/','\\pi':'pi','\\sin':'sin(','\\cos':'cos(','\\tan':'tan(',
    '\\ln':'ln(','\\log':'log(','\\exp':'exp(','\\arcsin':'asin(','\\arccos':'acos(','\\arctan':'atan(',
    '\\sinh':'sinh(','\\cosh':'cosh(','\\tanh':'tanh(','\\text{ans}':'ans'};
  const fire=()=>opts.onEdit&&opts.onEdit();
  return {
    latex(s){
      if(s===undefined)return el.textContent;
      try{el.textContent=latexToSrc(s);}catch(e){el.textContent=s;}
      fire();
    },
    typedText(t){el.textContent+=t;fire();},
    cmd(c){el.textContent+=(MAP[c]!==undefined?MAP[c]:c);fire();},
    write(w){el.textContent+=(MAP[w]!==undefined?MAP[w]:w);fire();},
    keystroke(k){if(k==='Backspace'){el.textContent=el.textContent.slice(0,-1);fire();}},
    clear(){el.textContent='';fire();},
    focus(){el.focus();}
  };
}

const K=(l,t,v)=>({l,t,v});
const KB_TABS={
  ppal:[
    K('x²','txt','^2'),K('x^y','txt','^'),K('√','cmd','\\sqrt'),K('ⁿ√','cmd','\\nthroot'),
    K('|x|','txt','|'),K('π','cmd','\\pi'),K('e','txt','e'),K('x','txt','x'),
    K('sin','cmd','\\sin'),K('cos','cmd','\\cos'),K('tan','cmd','\\tan'),K('ln','cmd','\\ln'),
    K('ans','write','\\text{ans}'),K('(','txt','('),K(')','txt',')'),K('1/x','txt','^-1')
  ],
  fnc:[
    K('sin','cmd','\\sin'),K('cos','cmd','\\cos'),K('tan','cmd','\\tan'),K('ln','cmd','\\ln'),
    K('asin','cmd','\\arcsin'),K('acos','cmd','\\arccos'),K('atan','cmd','\\arctan'),K('log','cmd','\\log'),
    K('sinh','cmd','\\sinh'),K('cosh','cmd','\\cosh'),K('tanh','cmd','\\tanh'),K('exp','cmd','\\exp'),
    K('√','cmd','\\sqrt'),K('|x|','txt','|'),K('(','txt','('),K(')','txt',')')
  ]
};
const KB_DIG=[['7','7'],['8','8'],['9','9'],['÷','/'],['4','4'],['5','5'],['6','6'],['×','*'],['1','1'],['2','2'],['3','3'],['−','-'],['0','0'],['.','.'],['x','x'],['+','+']];

function createKeypad(opts){
  const el=document.getElementById(opts.input);
  const root=document.getElementById(opts.container);
  const pv=opts.preview?document.getElementById(opts.preview):null;

  const mq=makeMathField(el,{onEdit:changed,onEnter:opts.onEnter});
  MQF[opts.input]=mq;
  if(opts.latex){try{mq.latex(opts.latex);}catch(e){}}

  root.classList.add('kb');
  const head=document.createElement('div');head.className='kb-head';
  const tabP=document.createElement('button');tabP.type='button';tabP.className='kb-tab';tabP.textContent='ppal';
  const tabF=document.createElement('button');tabF.type='button';tabF.className='kb-tab';tabF.textContent='fnc';
  const sp=document.createElement('span');sp.className='sp';
  const deg=document.createElement('button');deg.type='button';deg.className='kb-util';deg.title='Cambiar unidad angular';
  const delBtn=document.createElement('button');delBtn.type='button';delBtn.className='kb-util';delBtn.title='Borrar último carácter';delBtn.textContent='⌫';
  const clrBtn=document.createElement('button');clrBtn.type='button';clrBtn.className='kb-util';clrBtn.title='Borrar todo';clrBtn.textContent='C';
  head.append(tabP,tabF,sp,deg,delBtn,clrBtn);

  const body=document.createElement('div');body.className='kb-grid';
  root.append(head,body);

  let mode='ppal';

  function changed(){
    upd();
    if(opts.onInput)opts.onInput();
  }
  function upd(){
    if(!pv)return;
    let src='';
    try{src=latexToSrc(mq.latex());}catch(e){}
    if(!src.trim()){
      let t='';
      if(opts.emptyPreview){try{t=opts.emptyPreview()||'';}catch(e){t='';}}
      pv.innerHTML=t;
      pv.className='kb-pv'+(t?' kb-pv-hint':'');
      return;
    }
    try{
      astOf(src);
      pv.textContent='✓ Válida';
      pv.className='kb-pv kb-pv-ok';
    }catch(e){
      pv.textContent=e.message;
      pv.className='kb-pv kb-pv-err';
    }
  }

  function press(k){
    switch(k.t){
      case 'txt':mq.typedText(k.v);break;
      case 'cmd':mq.cmd(k.v);break;
      case 'write':mq.write(k.v);break;
    }
  }
  function keyButton(k){
    const b=document.createElement('button');
    b.type='button';
    b.className='kb-b'+(k.t!=='txt'||isNaN(k.v)?' kb-fn':'');
    b.textContent=k.l;
    b.addEventListener('click',()=>press(k));
    return b;
  }
  function render(){
    tabP.classList.toggle('on',mode==='ppal');
    tabF.classList.toggle('on',mode==='fnc');
    deg.textContent=DEG?'DEG':'RAD';
    deg.classList.toggle('on',DEG);
    body.innerHTML='';
    KB_TABS[mode].forEach(k=>body.appendChild(keyButton(k)));
    KB_DIG.forEach(([l,v])=>body.appendChild(keyButton(K(l,'txt',v))));
  }

  tabP.addEventListener('click',()=>{mode='ppal';render();});
  tabF.addEventListener('click',()=>{mode='fnc';render();});
  deg.addEventListener('click',()=>{setDeg(!DEG);render();changed();if(window.replotAll)replotAll();});
  delBtn.addEventListener('click',()=>mq.keystroke('Backspace'));
  clrBtn.addEventListener('click',()=>mq.latex(''));

  render();
  upd();
  return {update:upd,mq};
}
