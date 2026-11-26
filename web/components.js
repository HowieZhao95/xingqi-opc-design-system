/*! 星启 OPC V3.0 · 原生 DOM 组件。用法见 guides/web.md。 */
(() => {
  "use strict";
  const script = document.currentScript;
  const bundle = window.OPC_INLINE || {};
  const brandDir = new URL("../assets/brand/", script && script.src ? script.src : document.baseURI);
  const text = (tag, cls, label) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (label !== undefined && label !== null) node.textContent = String(label);
    return node;
  };
  const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
  const pct = n => new Intl.NumberFormat("zh-CN",{maximumFractionDigits:1}).format(n*100)+"%";
  function brand({symbol=false}={}) {
    const name = symbol ? "logo" : "lockup";
    const wrap=text("span","opc-brand"+(symbol?" opc-symbol":""));
    for(const [theme,suffix] of [["dark","white"],["light","dark"]]){
      const img=text("img","opc-brand-"+theme);
      const file="xingqi-"+name+"-"+suffix+".svg";
      img.alt="星启 OPC · AI+社群";
      img.src=bundle.brand?.[file] || new URL(file,brandDir).href;
      wrap.append(img);
    }
    return wrap;
  }
  function headline({context="",title="",accent="",body=""}={}){
    const wrap=text("div","opc-headline");
    if(context) wrap.append(text("small","opc-kicker",context));
    const h=text("h3","",title);
    if(accent)h.append(text("em","",accent));
    wrap.append(h);
    if(body)wrap.append(text("p","",body));
    return wrap;
  }
  function metric({label="",value="",unit="",note="",showHundred=false}={}){
    const wrap=text("figure","opc-metric");
    const line=text("div","opc-numeric",value);
    if(unit)line.append(text("small","",unit));
    const reading=text("div","metric-reading");reading.append(line);
    const n=Number(value);
    if(showHundred&&unit==="%"&&String(value).trim()!==""&&Number.isInteger(n)&&n>=0&&n<=100){
      const matrix=text("div","unit-array");matrix.setAttribute("aria-hidden","true");
      const dots=text("div","unit-dots");
      for(let i=0;i<100;i++){const dot=text("i",i<n?"lit":"");dots.append(dot);}
      matrix.append(dots,text("small","","每百人 · "+n+" 位"));reading.append(matrix);
    }
    wrap.append(text("figcaption","",label),reading);
    if(note)wrap.append(text("p","opc-note",note));
    return wrap;
  }
  function steps({items=[],current=-1}={}){
    const ol=text("ol","opc-steps");
    items.forEach((item,i)=>{
      const li=text("li","");
      if(i===current)li.setAttribute("aria-current","step");
      li.append(text("span","opc-step-num",String(i+1).padStart(2,"0")),text("strong","",item.title),text("p","",item.note));
      ol.append(li);
    });
    return ol;
  }
  function tiers({items=[]}={}){
    const list=text("dl","opc-tiers");
    items.forEach((item,i)=>{
      const row=text("div","");
      row.append(text("dt","",item.title),text("dd","",item.note));
      if(i<items.length-1){const arrow=text("span","opc-support","↑");arrow.setAttribute("aria-label","下一层支撑本层");row.append(arrow);}
      list.append(row);
    });
    return list;
  }
  function evidence({source="",quote="",status="",reason=""}={}){
    const f=text("figure","opc-evidence");
    f.append(text("figcaption","opc-kicker",status),text("blockquote","",quote),text("cite","",source));
    if(reason){const d=text("details","");d.append(text("summary","","查看判断依据"),text("p","",reason));f.append(d);}
    return f;
  }
  function comparison({title="",rows=[],note=""}={}){
    const f=text("figure","opc-chart");
    if(title)f.append(text("figcaption","",title));
    rows.forEach(({label,orders,visitors,highlight})=>{
      const valid=Number.isFinite(orders)&&Number.isFinite(visitors)&&visitors>0&&orders>=0&&orders<=visitors;
      const rate=valid? orders/visitors:0;
      const row=text("div","opc-chart-row"+(highlight?" is-focus":""));
      const head=text("div","opc-chart-label");
      head.append(text("b","",label),text("span","",valid?(orders+" / "+visitors+" 位访客"):"无有效样本"),text("strong","",valid?pct(rate):"—"));
      const track=text("div","opc-meter"),fill=text("i","");
      fill.style.width=(clamp(rate,0,1)*100)+"%";
      track.setAttribute("aria-hidden","true");track.append(fill);row.append(head,track);f.append(row);
    });
    const axis=text("div","opc-axis");for(const s of ["0%","50%","100%"])axis.append(text("span","",s));
    f.append(axis);
    if(note)f.append(text("p","opc-note",note));
    return f;
  }
  function table({caption="",headers=[],rows=[]}={}){
    const scroll=text("div","opc-table-scroll"),t=text("table","opc-table");
    t.append(text("caption","",caption));
    const head=t.createTHead().insertRow();headers.forEach(v=>{const c=text("th","",v);c.scope="col";head.append(c);});
    const body=t.createTBody();
    rows.forEach(values=>{const row=body.insertRow();values.forEach(v=>row.insertCell().textContent=String(v));});
    scroll.append(t);return scroll;
  }
  function notice({title="",body=""}={}){
    const n=text("aside","opc-notice");n.append(text("strong","",title),text("p","",body));return n;
  }
  function modal({label="查看说明",title="说明",body=""}={}){
    const wrap=text("div","opc-modal-host"),trigger=text("button","opc-button secondary",label);
    const d=text("dialog","opc-modal");
    d.setAttribute("aria-label",title);
    const close=text("button","opc-button","关闭");
    d.append(brand(),text("h3","",title),text("p","",body),close);
    trigger.type=close.type="button";
    trigger.addEventListener("click",()=>d.showModal());close.addEventListener("click",()=>d.close());
    d.addEventListener("close",()=>trigger.focus());
    d.addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();close.focus();}});
    d.addEventListener("click",e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});
    wrap.append(trigger,d);return wrap;
  }
  const components={brand,headline,metric,steps,tiers,evidence,comparison,table,notice,modal};
  window.OPC=Object.freeze({
    create(name,props={}){if(!Object.hasOwn(components,name))throw Error("没有此组件："+name);return components[name](props);},
    setTheme(root,mode){if(!["dark","light"].includes(mode))throw Error("主题为 dark 或 light");root.classList.add("opc");root.dataset.theme=mode;},
    names:Object.freeze(Object.keys(components))
  });
})();
