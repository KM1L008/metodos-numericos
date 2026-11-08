/* Descarga del informe completo en PDF con jsPDF + jsPDF-AutoTable:
   encabezado con la ecuación y los datos de entrada, panel de resultado,
   gráfica (imagen del canvas en tema claro), tabla de iteraciones y
   procedimiento paso a paso en texto.
   Depende de ui.js (LAST, msg, fmt, fieldSrc) y plot.js (replotAll). */

function descargarPDF(k,titulo){
  const mid='m'+k;
  if(typeof jspdf==='undefined'||!window.jspdf||!window.jspdf.jsPDF){msg(mid,'err','No se pudo cargar la librería del PDF. Revisa tu conexión y recarga la página.');return;}
  const rows=LAST[k];
  if(!rows||!rows.length){msg(mid,'err','Primero pulsa Calcular para poder descargar el PDF.');return;}
  if(typeof SIM!=='undefined'&&SIM.on)SIM.close(false);

  /* Gráfica re-renderizada en tema claro para que se lea bien en el PDF. */
  const root=document.documentElement,prevTheme=root.getAttribute('data-theme');
  if(prevTheme)root.removeAttribute('data-theme');
  if(typeof replotAll==='function')replotAll();
  const cv=document.getElementById('c'+k);
  let img=null;
  if(cv&&!cv.classList.contains('hide')){
    try{img={url:cv.toDataURL('image/png'),w:cv.width,h:cv.height};}catch(e){img=null;}
  }
  if(prevTheme)root.setAttribute('data-theme',prevTheme);
  if(typeof replotAll==='function')replotAll();

  try{
    const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
    if(typeof doc.autoTable!=='function')throw new Error('Falta el complemento AutoTable.');
    const ML=14,CW=210-ML*2;
    let y=ML;
    const need=h=>{if(y+h>285){doc.addPage();y=ML;}};
    const line=(t,bold)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(bold?10.5:9.5);
      const ls=doc.splitTextToSize(t,CW);need(ls.length*4.4+1);
      doc.text(ls,ML,y+4);y+=ls.length*4.4+1;};

    /* Encabezado */
    doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(30,41,59);
    doc.text(titulo,ML,y+5);y+=11;
    line('Calculadora de Métodos Numericos - Integrantes: Carlos Vargas, Camilo Grimaldo');
    line('Fecha: '+new Date().toLocaleDateString('es-ES'));
    line('Ecuacion:  f(x) = '+fieldSrc('f'+k),true);
    if(k==='b'){
      line('Datos:  Xi = '+document.getElementById('a').value+
        ', Xf = '+document.getElementById('b').value+
        ', tolerancia = '+document.getElementById('tolb').value+
        ', max. iteraciones = '+document.getElementById('maxb').value+
        ', decimales = '+DEC);
    }else{
      line('Datos:  x0 = '+document.getElementById('x0').value+
        ', tolerancia = '+document.getElementById('toln').value+
        ', max. iteraciones = '+document.getElementById('maxn').value+
        ', decimales = '+DEC);
    }
    y+=2;

    /* Panel de resultado (mismo contenido que la tarjeta en pantalla). */
    const rp=document.getElementById('r'+k);
    if(rp&&rp.innerHTML){
      const ok=rp.querySelector('.rp-in').classList.contains('ok');
      line(ok?'RESULTADO: raiz encontrada':'RESULTADO: no se alcanzo la tolerancia',true);
      rp.querySelectorAll('.rp-item').forEach(it=>{
        line(it.querySelector('span').textContent+': '+it.querySelector('b').textContent);
      });
      const note=rp.querySelector('.rp-note');
      if(note)line(note.textContent);
      y+=2;
    }

    /* Gráfica */
    if(img){
      const h=CW*img.h/img.w;
      need(Math.min(h,110)+4);
      doc.addImage(img.url,'PNG',ML,y,CW,Math.min(h,110));
      y+=Math.min(h,110)+5;
    }

    /* Tabla de iteraciones */
    line('TABLA DE ITERACIONES',true);
    const head=k==='b'
      ?['n','Xi','Xf','Xr','f(Xi)','f(Xf)','f(Xr)','f(Xi)*f(Xr)','Ea (%)','Et (%)']
      :['n','xn','f(xn)',"f'(xn)",'xn+1','Ea (%)','Et (%)'];
    doc.autoTable({
      head:[head],
      body:rows.map((r,i)=>[String(i+1)].concat(r.map(v=>fmt(v)))),
      startY:y,margin:{left:ML,right:ML},
      styles:{fontSize:7.5,cellPadding:1.4,textColor:[30,41,59]},
      headStyles:{fillColor:[36,87,214],textColor:255,fontStyle:'bold'},
      alternateRowStyles:{fillColor:[240,243,249]},
      theme:'grid'
    });
    y=doc.lastAutoTable.finalY+7;

    /* Procedimiento paso a paso */
    line('PROCEDIMIENTO PASO A PASO',true);
    rows.forEach((r,i)=>{
      if(k==='b'){
        const xi=r[0],xf=r[1],xr=r[2],fXi=r[3],fXf=r[4],fXr=r[5],prod=r[6],ea=r[7],et=r[8];
        const cond=fXr===0?'f(Xr) = 0 -> Xr es la raiz exacta.'
          :prod<0?'f(Xi)*f(Xr) < 0 -> se reemplaza Xf = Xr.'
          :'f(Xi)*f(Xr) > 0 -> se reemplaza Xi = Xr.';
        const nXi=fXr===0||prod<0?xi:xr,nXf=fXr===0||prod<0?xr:xf;
        line('Iteracion '+(i+1)+' - [Xi, Xf] = ['+fmt(xi)+', '+fmt(xf)+']',true);
        line('  Paso 2:  Xr = ('+fmt(xi)+' + '+fmt(xf)+') / 2 = '+fmt(xr));
        line('  Evaluar:  f(Xi) = '+fmt(fXi)+',  f(Xf) = '+fmt(fXf)+',  f(Xr) = '+fmt(fXr));
        line('  Paso 3:  '+cond);
        line('  Nuevo intervalo:  Xi = '+fmt(nXi)+',  Xf = '+fmt(nXf));
        line('  Paso 4:  Ea = '+(ea===null?'- (primera iteracion)':fmt(ea)+'%')+
          ',  Et = '+(et===null?'-':fmt(et)+'%'));
      }else{
        const x=r[0],fx=r[1],dx=r[2],xn=r[3],ea=r[4],et=r[5];
        line('Iteracion '+(i+1)+' - xn = '+fmt(x),true);
        line("  Paso 2:  f(xn) = "+fmt(fx)+",  f'(xn) = "+fmt(dx));
        line('  Paso 3:  xn+1 = '+fmt(x)+' - ('+fmt(fx)+') / ('+fmt(dx)+') = '+fmt(xn));
        line('  Paso 4:  Ea = '+(ea===null?'-':fmt(ea)+'%')+
          ',  Et = '+(et===null?'-':fmt(et)+'%'));
      }
      y+=1.5;
    });

    /* Pie de página con numeración. */
    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++){
      doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(120,130,145);
      doc.text('Pagina '+p+' de '+pages,196,291,{align:'right'});
    }

    doc.save(titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')+'.pdf');
  }catch(e){
    msg(mid,'err','No se pudo generar el PDF: '+e.message);
  }
}
