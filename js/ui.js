/* Utilidades de interfaz compartidas: formato numérico, tabla, mensajes,
   panel de resultados y helpers del paso a paso.
   Depende de parser.js y mathrender.js. */

let DEC=3;
const LAST={};
const fmt=v=>(v===null||v===undefined)?'—':(Number.isFinite(v)?(+v.toFixed(DEC)===0?'0':(+v.toFixed(DEC)).toString()):'NaN');

function msg(id,type,t){const m=document.getElementById(id);m.className='msg '+type;m.textContent=t;}

function limpiar(k){
  LAST[k]=null;
  if(typeof SIM!=='undefined'&&SIM.on)SIM.close(false);
  const rp=document.getElementById('r'+k);if(rp)rp.innerHTML='';
  document.getElementById('s'+k).innerHTML='';
  document.querySelector('#tab'+k+' tbody').innerHTML='';
  document.getElementById('tab'+k).classList.add('hide');
  const cv=document.getElementById('c'+k);
  cv.classList.add('hide');
  cv.getContext('2d').clearRect(0,0,cv.width,cv.height);
  const fab=document.getElementById('fab-'+k);if(fab)fab.classList.add('hide');
  const pdf=document.getElementById('pdf-'+k);if(pdf)pdf.classList.add('hide');
  document.getElementById('m'+k).className='msg';
  if(typeof clearPlot==='function')clearPlot('c'+k);
}
function fillTable(k,rows){
  LAST[k]=rows;
  const t=document.getElementById('tab'+k),last=rows.length-1;
  t.querySelector('tbody').innerHTML=rows.map((r,i)=>'<tr'+(i===last?' class="last"':'')+'><td>'+(i+1)+'</td>'+r.map(v=>'<td>'+fmt(v)+'</td>').join('')+'</tr>').join('');
  t.classList.remove('hide');
  const fab=document.getElementById('fab-'+k);if(fab)fab.classList.remove('hide');
  const pdf=document.getElementById('pdf-'+k);if(pdf)pdf.classList.remove('hide');
}

/* Panel de resultado: tarjeta con los datos clave en lugar de un texto plano. */
const IC_OK='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
const IC_X='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
function result(k,ok,items,note){
  const el=document.getElementById('r'+k);
  el.innerHTML='<div class="rp-in '+(ok?'ok':'err')+'" role="status">'+
    '<div class="rp-head">'+(ok?IC_OK+'<span>Raíz encontrada</span>':IC_X+'<span>No se alcanzó la tolerancia</span>')+'</div>'+
    '<div class="rp-grid">'+items.map(it=>'<div class="rp-item'+(it.big?' big':'')+'"><span>'+it.l+'</span><b>'+it.v+'</b></div>').join('')+'</div>'+
    (note?'<p class="rp-note">'+note+'</p>':'')+
  '</div>';
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}

/* Ayudantes para el procedimiento paso a paso. */
const P=v=>v<0?'('+fmt(v)+')':fmt(v);
const shown=src=>{const m=mathOf(src);return m?'<span class="mm">'+m+'</span>':esc(src);};
const wrap=(id,head,h)=>{document.getElementById(id).innerHTML='<details class="pasos" open><summary>Paso a paso por iteración</summary>'+head+h+'</details>';};
