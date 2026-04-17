const $ = id => document.getElementById(id);
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.onclick = () => {
  tabs.forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  $('tab-'+t.dataset.tab).classList.add('active');
  if(t.dataset.tab==='palette') renderPalette();
});

// ── Toast
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),1800);}

// ── Picker
const hInput=$('h'),sInput=$('s'),lInput=$('l');
function updatePicker(){
  const h=+hInput.value,s=+sInput.value,l=+lInput.value;
  $('h-v').textContent=h;$('s-v').textContent=s;$('l-v').textContent=l;
  const hsl=`hsl(${h}, ${s}%, ${l}%)`;
  $('swatch-big').style.background=hsl;
  const rgb=hslToRgb(h/360,s/100,l/100);
  const hex=rgbToHex(rgb);
  $('hex').value=hex;
  $('rgb').value=`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  $('hsl').value=hsl;
  $('oklch').value=rgbToOklch(rgb);
}
[hInput,sInput,lInput].forEach(el=>el.oninput=updatePicker);

function hslToRgb(h,s,l){
  let r,g,b;
  if(s===0){r=g=b=l;}else{
    const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
    const q=l<.5?l*(1+s):l+s-l*s; const p=2*l-q;
    r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);
  }
  return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
}
function rgbToHex([r,g,b]){return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();}
function rgbToOklch([r,g,b]){
  // simplified sRGB → OKLab → OKLCh conversion
  r/=255;g/=255;b/=255;
  const lin=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
  const R=lin(r),G=lin(g),B=lin(b);
  const L=0.4122214708*R+0.5363325363*G+0.0514459929*B;
  const M=0.2119034982*R+0.6806995451*G+0.1073969566*B;
  const S=0.0883024619*R+0.2817188376*G+0.6299787005*B;
  const l=Math.cbrt(L),m=Math.cbrt(M),s=Math.cbrt(S);
  const OKL=0.2104542553*l+0.7936177850*m-0.0040720468*s;
  const OKa=1.9779984951*l-2.4285922050*m+0.4505937099*s;
  const OKb=0.0259040371*l+0.7827717662*m-0.8086757660*s;
  const c=Math.sqrt(OKa*OKa+OKb*OKb);
  let h=Math.atan2(OKb,OKa)*180/Math.PI;if(h<0)h+=360;
  return `oklch(${(OKL*100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

// ── Copy buttons
document.querySelectorAll('.copy-btn').forEach(btn=>btn.onclick=async()=>{
  const el = $(btn.dataset.copy);
  try{await navigator.clipboard.writeText(el.value);toast('Copied');}catch{}
});

// ── Palette
const getPal = () => JSON.parse(localStorage.getItem('cm:pal')||'[]');
const savePal = p => localStorage.setItem('cm:pal',JSON.stringify(p));
$('save-swatch').onclick=()=>{
  const p=getPal(); p.unshift({hex:$('hex').value,hsl:$('hsl').value,t:Date.now()});
  savePal(p.slice(0,48));
  toast('Saved to palette');
};
function renderPalette(){
  const grid=$('palette-grid');const p=getPal();
  if(!p.length){grid.innerHTML='<div class="pal-empty">Save colors from the picker to build a palette.</div>';return;}
  grid.innerHTML=p.map((x,i)=>`<div class="pal-swatch">
    <div class="color" style="background:${x.hex}" data-hex="${x.hex}"></div>
    <div class="info"><span class="hex">${x.hex}</span><button class="rm" data-i="${i}">×</button></div>
  </div>`).join('');
  grid.querySelectorAll('.rm').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const p=getPal();p.splice(+b.dataset.i,1);savePal(p);renderPalette();
  });
  grid.querySelectorAll('.color').forEach(c=>c.onclick=async()=>{
    await navigator.clipboard.writeText(c.dataset.hex);toast('Copied '+c.dataset.hex);
  });
}
$('clear-palette').onclick=()=>{if(confirm('Clear palette?')){savePal([]);renderPalette();}};
$('export-json').onclick=()=>download('palette.json',JSON.stringify(getPal(),null,2),'application/json');
$('export-css').onclick=()=>{
  const css=':root {\n'+getPal().map((x,i)=>`  --color-${i+1}: ${x.hex};`).join('\n')+'\n}';
  download('palette.css',css,'text/css');
};
function download(name,content,type){
  const blob=new Blob([content],{type});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);
}

// ── Gradient
function updateGradient(){
  const stops=[...document.querySelectorAll('.stop')].map(s=>{
    const [c,r]=s.querySelectorAll('input'); return {color:c.value,pos:+r.value};
  }).sort((a,b)=>a.pos-b.pos);
  const type = document.querySelector('input[name="gt"]:checked').value;
  const angle = +$('grad-angle').value;
  $('grad-angle-v').textContent=angle+'°';
  const stopStr = stops.map(s=>`${s.color} ${s.pos}%`).join(', ');
  let css;
  if(type==='linear') css = `linear-gradient(${angle}deg, ${stopStr})`;
  else if(type==='radial') css = `radial-gradient(circle, ${stopStr})`;
  else css = `conic-gradient(from ${angle}deg, ${stopStr})`;
  $('grad-preview').style.background=css;
  $('grad-css').value = 'background: '+css+';';
}
document.querySelectorAll('.stop input, input[name="gt"], #grad-angle').forEach(el=>el.oninput=el.onchange=updateGradient);

updatePicker();updateGradient();
