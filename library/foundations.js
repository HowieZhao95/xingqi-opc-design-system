window.OPCFoundations=(()=>{
  'use strict';
  const el=(tag,cls='',value)=>{const n=document.createElement(tag);n.className=cls;if(value!==undefined)n.textContent=value;return n;};
  const variants={
    brand:[['lockup','完整字标'],['symbol','独立图形']],
    color:[['primary','色彩角色'],['surface','背景层级'],['accent','材料配色']],
    grid:[['slides','汇报横屏'],['uhd','UHD 横屏'],['portrait','UHD 竖屏']],
    imagery:[['prints','海报印样'],['scene','实景配准']],
    tempo:[['30','30 fps'],['60','60 fps']],
    reading:[['sample','有效读数'],['empty','零与缺样']]
  };
  const roles={bg:'画布',ink:'主文字',muted:'辅助文字',cyan:'主要强调',violet:'次要强调',magenta:'结果标记',surface:'常规面板',inset:'内嵌区域',raised:'浮层',modal:'模态弹窗',scrim:'遮罩',line:'分隔线',strong:'焦点边界',onAccent:'主按钮文字',lilac:'丁香紫',mint:'薄荷',apricot:'杏色',lilacInk:'丁香紫文字',mintInk:'薄荷文字',apricotInk:'杏色文字'};
  function brand(host,variant){
    const pair=el('div','f-brands');
    for(const [tone,name] of [['dark','暗底反白'],['light','亮底暗色']]){
      const cell=el('figure','f-brand f-'+tone),image=el('img');
      image.src=OPC_INLINE.brand['xingqi-'+(variant==='symbol'?'logo':'lockup')+'-'+(tone==='dark'?'white':'dark')+'.svg'];
      image.alt='星启 OPC '+name;image.classList.toggle('symbol',variant==='symbol');
      cell.append(image,el('figcaption','',name));pair.append(cell);
    }
    host.append(pair);
  }
  function colors(host,v,tokens,theme){
    const keys=v==='accent'?Object.keys(tokens.accents):v==='surface'?['bg','surface','inset','raised','modal','scrim','line','strong']:['bg','ink','muted','cyan','violet','magenta','onAccent'];
    const values=v==='accent'?tokens.accents:tokens.themes[theme],shelf=el('div','f-colors'),readout=el('output','f-code');
    const chips=[];
    function select(k){readout.textContent='--'+k+'   '+values[k];for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.key===k));}
    for(const k of keys){
      const b=el('button','f-chip'),chip=el('i');b.type='button';b.dataset.key=k;chip.style.background=values[k];b.append(chip,el('strong','',roles[k]),el('code','',values[k]));b.onclick=()=>select(k);shelf.append(b);chips.push(b);
    }
    const tools=el('div','f-color-tools'),copy=el('button','opc-button secondary','复制色值'),status=el('small');
    status.setAttribute('role','status');copy.onclick=async()=>{
      const k=chips.find(b=>b.getAttribute('aria-pressed')==='true').dataset.key;
      try{await navigator.clipboard.writeText(values[k]);status.textContent='已复制 '+values[k];}
      catch{status.textContent=values[k];const range=document.createRange();range.selectNodeContents(status);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);}
    };
    select(keys.includes('cyan')?'cyan':keys[0]);tools.append(readout,copy,status);host.append(shelf,tools);
  }
  function type(host,tokens){
    const list=el('div','f-fonts');
    for(const [key,cls,sample,label] of [['display','display','让创意有形','标题'],['body','sans','读懂一项现场记录。','正文'],['number','number','20.6%','数字'],['mono','mono','A / 04','刻度']]){
      const f=el('figure','f-font f-'+cls);f.append(el('strong','',sample),el('figcaption','',label+' · '+tokens.fonts[key]));list.append(f);
    }
    host.append(list);
  }
  function grid(host,v,tokens){
    const L=tokens.layout,k=v==='uhd'?2:1,vertical=v==='portrait',w=vertical?2160:L.width*k,h=vertical?3840:L.height*k;
    const frame=el('div','f-grid-frame'+(vertical?' vertical':'')),inside=el('div','f-grid-safe');
    if(!vertical){inside.style.inset=L.marginY/L.height*100+'% '+L.marginX/L.width*100+'%';inside.style.gap=L.gutter/(L.width-2*L.marginX)*100+'%';for(let i=0;i<L.columns;i++)inside.append(el('i'));}
    else{inside.classList.add('portrait-zones');for(const label of ['仪表与读数','主体','字幕','平台控件预留'])inside.append(el('span','',label));}
    frame.append(inside);host.append(frame,el('p','f-legend',w+' × '+h+' px  ·  '+(vertical?'底部约 600px 预留区':L.columns+' 栏  /  边距 '+L.marginX*k+' × '+L.marginY*k+' px  /  栏距 '+L.gutter*k+' px')));
  }
  function edges(host,tokens){
    const row=el('div','f-edges');for(const [name,r] of [['控件',tokens.layout.radiusUi],['面板',tokens.layout.radiusPanel],['大面板',28],['胶囊',999]]){
      const f=el('figure'),shape=el('i');shape.style.borderRadius=r+'px';f.append(shape,el('figcaption','',name+' · '+(r===999?'全圆角':r+'px')));row.append(f);
    }
    const steps=el('div','f-spaces');for(const n of [8,16,24,32,48]){const s=el('span'),i=el('i');i.style.width=n+'px';s.append(i,el('code','',String(n)));steps.append(s);}
    host.append(row,steps);
  }
  function layers(host,tokens,theme){
    const p=el('div','f-layers'),panel=el('div','f-panel'),entry=el('div','f-inset','内嵌区域　'+tokens.themes[theme].inset);
    panel.append(el('p','','内容面板　'+tokens.themes[theme].surface),entry);p.append(el('p','','页面　'+tokens.themes[theme].bg),panel);
    const b=el('button','opc-button secondary','打开实色弹窗'),d=el('dialog','opc-modal f-dialog'),close=el('button','opc-button secondary','关闭');
    d.append(el('h3','','采样口径'),el('p','','同一周内，分别按人去重统计两张海报的访客。'),close);
    b.onclick=()=>d.showModal();close.onclick=()=>d.close();d.addEventListener('close',()=>b.focus());
    host.append(p,b,d);
  }
  function tempo(host,v,t){
    const rail=el('div','f-beats'),fps=Number(v)||t.motion.fps,ratio=fps/t.motion.fps,rows=[];
    for(const name of ['标题','步骤','读数']){const row=el('div'),track=el('span'),bar=el('i');track.append(bar);row.append(el('strong','',name),track);rail.append(row);rows.push(bar);}
    const b=el('button','opc-button secondary','重播节奏'),advance=1000/t.motion.fps;
    b.onclick=()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;rows.forEach((bar,i)=>{bar.getAnimations().forEach(a=>a.cancel());bar.animate([{transform:'scaleX(.02)',opacity:0,offset:0},{transform:'scaleX(1)',opacity:1,offset:.30},{transform:'scaleX(1)',opacity:1,offset:.80},{transform:'scaleX(.96)',opacity:0,offset:1}],{duration:40*advance,delay:i*t.motion.staggerFrames*advance,easing:'linear'});});};
    host.append(rail,el('p','f-legend',fps+' fps　入场 '+t.motion.enterFrames*ratio+' 帧 · 错峰 '+t.motion.staggerFrames*ratio+' 帧 · 退出 '+t.motion.exitFrames*ratio+' 帧'),b);
  }
  function reading(host,v){
    const rows=v==='empty'?[{label:'未有访客',orders:0,visitors:0},{label:'有访客，零订单',orders:0,visitors:40}]:[{label:'海报 A',orders:8,visitors:40,highlight:true},{label:'海报 B',orders:12,visitors:120}];
    host.append(OPC.create('comparison',{title:'下单转化率',rows,note:'教学示例。同一周内，按人去重。'}));
  }
  function imagery(host,v,photo){
    const figure=el('figure','f-imagery');
    if(v==='scene'){
      const image=el('img');image.src=photo;image.alt='曲面的扫描网和三个实景探针';figure.append(image,el('figcaption','','浮光展厅 · 网线沿玻璃鳍片上下缘配准。'));
    }else{
      figure.append(OPCProofs.pair(),el('figcaption','','海报 A · 薄荷环纹　 /　 海报 B · 丁香紫波纹'));
    }
    host.append(figure);
  }
  function controls(host){
    const row=el('div','f-controls'),primary=el('button','opc-button','选用此样本'),second=el('button','opc-button secondary','恢复选择'),disabled=el('button','opc-button secondary','不可用');
    disabled.disabled=true;primary.setAttribute('aria-pressed','false');
    function setSelected(on){primary.textContent=on?'✓ 已选用':'选用此样本';primary.setAttribute('aria-pressed',String(on));}
    primary.onclick=()=>setSelected(primary.getAttribute('aria-pressed')!=='true');second.onclick=()=>setSelected(false);
    row.append(primary,second,disabled);host.append(row,el('p','f-legend','使用 Tab 移动焦点，按空格或 Enter 操作。'));
  }
  function render(host,story,tokens,theme,v,photo){
    host.replaceChildren();host.classList.add('foundation-example');
    const key=story.key;v=v||variants[key]?.[0][0]||'default';
    if(key==='brand')brand(host,v);
    if(key==='color')colors(host,v,tokens,theme);
    if(key==='type')type(host,tokens);
    if(key==='grid')grid(host,v,tokens);
    if(key==='edges')edges(host,tokens);
    if(key==='layers')layers(host,tokens,theme);
    if(key==='tempo')tempo(host,v,tokens);
    if(key==='reading')reading(host,v);
    if(key==='imagery')imagery(host,v,photo);
    if(key==='controls')controls(host);
  }
  return Object.freeze({render,variants});
})();
