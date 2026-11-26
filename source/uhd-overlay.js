/* Native 16:9 overlay. All positions and type sizes use the canvas, not the browser chrome. */
window.XQUHD = (() => {
  'use strict';
  const S='http://www.w3.org/2000/svg';
  function el(tag,cls,value){
    const n=document.createElement(tag);if(cls)n.className=cls;if(value!=null)n.textContent=String(value);return n;
  }
  function vector(parent,tag,props){
    const n=document.createElementNS(S,tag);
    for(const [k,v] of Object.entries(props))n.setAttribute(k,v);
    parent.append(n);return n;
  }
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function addBrand(layer,config,logos){
    layer.append(el('div','uhd-brand-veil'));
    const img=el('img','uhd-brand');img.alt='星启 OPC · AI+社群';
    img.src=logos[config.tone==='light'?'dark':'white'];layer.append(img);
  }
  function title(layer,config){
    const d=config.title,n=el('div','uhd-title arrive');
    n.append(el('p','u-kicker',d.tag),el('h2','',d.text),el('p','u-sub',d.sub));
    layer.append(el('div','uhd-wash'),n);
  }
  function pin(layer,config){
    const d=config.pin,x=clamp(d.x,.0625,.9375),y=clamp(d.y,.0926,.9074);
    const w=.26,gap=.048,left=x+w+gap<.9375, lx=left?x+gap:x-gap-w;
    const ly=clamp(y<.53?y+.074:y-.21,.235,.716);
    const bx=(left?lx:lx+w)*3840,by=(ly+.061)*2160;
    const ax=x*3840,ay=y*2160,sign=left?1:-1;
    const root=vector(layer,'svg',{viewBox:'0 0 3840 2160',class:'u-leader','aria-hidden':'true'});
    // The backing stroke keeps the line identifiable when it crosses a window or dark hair.
    const points='M '+ax+' '+ay+' Q '+(ax+52*sign)+' '+ay+' '+(ax+100*sign)+' '+((ay+by)/2)+' T '+bx+' '+by;
    for(const [stroke,width] of [['rgba(10,20,30,.70)',12],['#B7F2EB',5]])vector(root,'path',{d:points,fill:'none',stroke,'stroke-width':width,'stroke-linecap':'round'});
    vector(root,'circle',{cx:ax,cy:ay,r:25,fill:'rgba(10,20,30,.66)',stroke:'#B7F2EB','stroke-width':5});
    vector(root,'circle',{cx:ax,cy:ay,r:6,fill:'#FFF'});
    const label=el('div','uhd-pin-label arrive');label.style.left=lx*100+'%';label.style.top=ly*100+'%';
    label.append(el('small','',d.tag),el('h2','',d.text),el('p','',d.sub));layer.append(label);
  }
  function metric(layer,config){
    const d=config.metric,n=el('div','uhd-metric arrive'),head=el('div','uhd-metric-head');
    head.append(el('strong','',d.text),el('span','','教学示例'));
    const value=d.visitors>0?d.orders/d.visitors:null;
    const reading=el('div','uhd-metric-reading',value===null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:1}).format(value*100));
    if(value!==null)reading.append(el('small','','%'));
    const bar=el('div','u-meter'),fill=el('i');fill.style.width=clamp((value??0)*100,0,100)+'%';bar.append(fill);
    n.append(head,reading,el('div','uhd-metric-note',d.orders+' 人下单 / '+d.visitors+' 位访客'),bar);layer.append(n);
  }
  function caption(layer,config){
    const n=el('div','uhd-caption arrive');n.append(el('p','u-kicker','字幕示例'),el('p','',config.caption.text));layer.append(n);
  }
  const modes={title,pin,metric,caption};
  function render(layer,config,logos){
    layer.className='uhd-layer';layer.replaceChildren();
    layer.dataset.tone=config.tone;layer.dataset.side=config.side;layer.dataset.solid=String(config.solid);
    if(config.brand)addBrand(layer,config,logos);
    modes[config.mode](layer,config);
  }
  return Object.freeze({render});
})();
