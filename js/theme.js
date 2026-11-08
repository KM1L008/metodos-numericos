/* Alternador de tema claro/oscuro. Persiste la elección en localStorage;
   sin elección guardada sigue la preferencia del sistema. */

(function(){
  const root=document.documentElement;
  const btn=document.getElementById('theme-btn');
  const sys=()=>matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  const cur=()=>root.getAttribute('data-theme')||sys();

  let saved=null;
  try{saved=localStorage.getItem('theme');}catch(e){}
  root.setAttribute('data-theme',saved||sys());

  if(!btn)return;
  btn.addEventListener('click',()=>{
    const t=cur()==='dark'?'light':'dark';
    try{localStorage.setItem('theme',t);}catch(e){}
    root.setAttribute('data-theme',t);
    if(window.replotAll)replotAll();
  });

  try{
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
      let s=null;
      try{s=localStorage.getItem('theme');}catch(e){}
      if(!s)root.setAttribute('data-theme',sys());
    });
  }catch(e){}
})();
