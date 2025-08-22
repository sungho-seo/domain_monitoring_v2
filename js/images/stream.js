// js/images/stream.js
export function renderShotsStream(container, images){
  if(!container) return;
  container.innerHTML='';
  const arr = images && images.all ? images.all : [];
  arr.forEach((it,idx)=>{
    const wrap=document.createElement('div'); wrap.className='shot';
    const title=document.createElement('div'); title.className='title';
    title.innerHTML = `<div>${idx+1} / ${arr.length}</div><div>${it.name}</div>`;
    const imgw=document.createElement('div'); imgw.className='imgwrap';
    const img=new Image(); img.src=it.url; img.alt=it.name;
    imgw.appendChild(img);
    wrap.appendChild(title); wrap.appendChild(imgw);
    container.appendChild(wrap);
  });
}
