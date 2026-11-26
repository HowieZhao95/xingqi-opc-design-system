const get=id=>document.getElementById(id);
const node=(tag,cls,str)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(str!==undefined)el.textContent=String(str);return el;};
let mode=document.documentElement.dataset.theme,media='web',selected='comparison',activeProof=0;
const edited=structuredClone(RECIPES);
function proofPreview(){
 const scene=node('div','web-scene');
 const sampleRows=RECIPES.comparison.props.rows;
 const area=node('div','proof-copy'), readout=node('div','proof-rate');
 const label=node('small','scene-tag','海报投放 · 教学示例');
 const heading=node('h3','','下单转化率');
 const detail=node('p','proof-detail');
 const choices=node('div','proof-choices');
 choices.setAttribute('role','group');choices.setAttribute('aria-label','对照两张海报的转化率');
 const art=node('div','art-slot');
 art.append(OPCProofs.pair(sampleRows.map((r,i)=>({id:i===0?'A':'B',buyers:r.orders,visitors:r.visitors}))));
 const buttons=sampleRows.map((row,i)=>{
   const b=node('button','',row.label);b.type='button';b.onclick=()=>choose(i);choices.append(b);return b;
 });
 function choose(i){
   activeProof=i;const row=sampleRows[i];const pct=row.visitors?Math.round(row.orders/row.visitors*100):'—';
   readout.replaceChildren(node('b','',pct),node('span','','%'));
   detail.textContent=row.orders+' 人下单 / '+row.visitors+' 位访客';
   buttons.forEach((b,n)=>b.setAttribute('aria-pressed',String(i===n)));
   art.dataset.focus=i===0?'a':'b';
 }
 choose(activeProof);area.append(label,heading,readout,detail,choices);scene.append(area,art);return scene;
}
function mediaView(){
 document.querySelectorAll('[data-media]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.media===media)));
 const frame=get('specimen');frame.replaceChildren();
 const link=get('media-link');
 if(media==='web'){
  frame.append(proofPreview());link.href='web-starter.html?theme='+mode;link.textContent='打开网页样例 ↗';get('media-tag').textContent='响应式 HTML';get('media-caption').textContent='原始人数与百分比同屏显示。';
 }else{
  const slide=media==='ppt',name=slide?'slides-'+mode+'.html':'mg-hud.html';
  const iframe=node('iframe');
  iframe.title=slide?'汇报稿第八页，双海报比较':'可播放的光学 HUD 组合演示';
  iframe.allow='fullscreen';
  const query='embed=1&theme='+mode+(slide?'':'&autoplay=1&loop=1&controls=1');
  const source=new TextDecoder().decode(Uint8Array.from(atob(MEDIA[slide?'slides':'motion']),c=>c.charCodeAt(0)));
  const config='<script>window.OPC_PREVIEW_QUERY='+JSON.stringify(query)+';window.OPC_PREVIEW_SLIDE="conversion";<'+'/script>';
  iframe.srcdoc=source.replace('<head>','<head>'+config);
  frame.append(iframe);link.href=name+(slide?'#conversion':'?theme='+mode);link.textContent=slide?'打开汇报演示 ↗':'打开 HUD 动效库 ↗';get('media-tag').textContent=slide?'16:9 / HTML':'30 FPS / HTML';get('media-caption').textContent=slide?'一页只讲一个判断。':'曲面、百分比与遥测读数共用一条 MG 时间线。';
 }
}
function readTheme(){
 OPC.setTheme(document.documentElement,mode);get('theme').textContent=mode==='dark'?'切换亮色':'切换深色';
 for(const a of document.querySelectorAll('a[href]')){
   const href=a.getAttribute('href');
   if(!/^(visual-guide|web-starter|uhd-scene|uhd-lightfield|mg-hud)\.html/.test(href))continue;
   const u=new URL(href,document.baseURI);u.searchParams.set('theme',mode);
   a.setAttribute('href',u.pathname.split('/').pop()+u.search+u.hash);
 }
 drawSpec();
 mediaView();
}
const inkRoles=[
 {key:'bg',name:'画布',use:'铺在整页背景，给标题和主视觉留出阅读空间。'},
 {key:'ink',name:'文字',use:'用于主标题、正文和决定性的数值。'},
 {key:'cyan',name:'重点',use:'标记当前步骤、关键读数和主要操作。'},
 {key:'violet',name:'支撑',use:'用在层级关系、图形辅线与次要材料。'},
 {key:'magenta',name:'结果',use:'小面积标注交易或终点，旁边写出含义。'}
];
let sampleType='color',inkChoice='cyan';
function drawSpec(){
 const holder=get('spec-sheet');holder.replaceChildren();
 document.querySelectorAll('[data-spec]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spec===sampleType)));
 if(sampleType==='color'){
   const palette=node('div','ink-scale'),info=node('div','ink-info');
   const use=node('p',''),copy=node('button','quiet-control','复制色值'),result=node('span','ink-status');
   result.setAttribute('role','status');copy.type='button';
   const read=key=>getComputedStyle(document.documentElement).getPropertyValue('--'+key).trim().toUpperCase();
   function select(role){
     inkChoice=role.key;use.textContent=role.use;result.textContent='';
     palette.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ink===inkChoice)));
     copy.textContent='复制 '+read(role.key);
   }
   for(const r of inkRoles){
     const b=node('button','ink-sample');b.type='button';b.dataset.ink=r.key;
     const chip=node('i');chip.style.setProperty('--swatch','var(--'+r.key+')');
     b.append(chip,node('strong','',r.name),node('code','',read(r.key)));b.onclick=()=>select(r);palette.append(b);
   }
   copy.onclick=async()=>{const value=read(inkChoice);try{await navigator.clipboard.writeText(value);result.textContent='已复制';}catch{result.textContent=value;const range=document.createRange();range.selectNodeContents(result);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);}};
   info.append(use,copy,result);holder.append(palette,info);select(inkRoles.find(r=>r.key===inkChoice));
 }else if(sampleType==='type'){
   const group=node('div','type-proofs');
   for(const [word,role,font] of [['创意有形','判断标题','OPCDisplay'],['20%','关键读数','OPCNumber'],['A / B','编号与刻度','OPCMono']]){
     const cell=node('div',''),sample=node('strong','',word);sample.style.fontFamily=font+',sans-serif';cell.append(sample,node('small','',role));group.append(cell);
   }
   holder.append(group,node('p','sheet-note','中文正文使用 Noto Sans SC。投影版用 12 栏对齐标题、读数和出处。'));
 }else{
   const strip=node('div','beat-proof'),nodes=[];
   for(const name of ['采集','核对','交付']){const mark=node('i');const cell=node('div');cell.append(mark,node('span','',name));strip.append(cell);nodes.push(mark);}
   const foot=node('div','ink-info'),play=node('button','quiet-control','重播入场');play.type='button';
   const run=()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
     nodes.forEach((m,i)=>{m.getAnimations().forEach(a=>a.cancel());m.animate([{opacity:0,transform:'translateY(10px) scale(.86)'},{opacity:1,transform:'translateY(-2px) scale(1.03)',offset:.75},{opacity:1,transform:'none'}],{duration:400,delay:i*4/30*1000,fill:'backwards',easing:'cubic-bezier(.22,1,.36,1)'});});};
   play.onclick=run;foot.append(node('p','','30 fps · 入场 12 帧，节点相隔 4 帧。'),play);holder.append(strip,foot);run();
 }
}
document.querySelectorAll('[data-spec]').forEach(b=>b.onclick=()=>{sampleType=b.dataset.spec;drawSpec();});
function quickCompare(){
 const wrap=get('quick-compare');wrap.replaceChildren();
 const rows=edited.comparison.props.rows||[];
 wrap.hidden=selected!=='comparison'||rows.length!==2;
 if(wrap.hidden)return;
 const form=node('form','quick-form');
 const inputs=rows.map(row=>{
   const group=node('fieldset');group.append(node('legend','',row.label));
   const parts={};
   for(const [key,name] of [['orders','下单人数'],['visitors','访客人数']]){
     const label=node('label','',name),input=node('input');input.type='number';input.min='0';input.step='1';input.required=true;input.value=row[key];label.append(input);group.append(label);parts[key]=input;
   }
   form.append(group);return parts;
 });
 const update=node('button','quiet-control','更新读数');update.type='submit';form.append(update);wrap.append(form);
 form.onsubmit=e=>{e.preventDefault();const props={...edited.comparison.props,rows:rows.map((row,i)=>({...row,orders:inputs[i].orders.valueAsNumber,visitors:inputs[i].visitors.valueAsNumber}))};
   try{checkProps('comparison',props);edited.comparison.props=props;get('params').value=JSON.stringify(props,null,2);get('live').replaceChildren(OPC.create('comparison',props));get('status').textContent='已按人数更新读数';}
   catch(error){get('status').textContent=error.message;}};
}
function drawComponent(){
 const item=edited[selected];get('component-name').textContent=item.name;get('component-use').textContent=item.use;
 get('api-name').textContent='OPC.create("'+selected+'")';get('live').replaceChildren(OPC.create(selected,item.props));
 document.querySelectorAll('[data-cmp]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cmp===selected)));
 get('params').value=JSON.stringify(item.props,null,2);get('editor').hidden=true;get('edit').setAttribute('aria-expanded','false');get('manual').hidden=true;get('status').textContent='';quickCompare();
}
function snippet(){return 'document.querySelector("#demo").replaceChildren(\n  OPC.create('+JSON.stringify(selected)+', '+JSON.stringify(edited[selected].props,null,2)+')\n);';}
const checkProps=OPCFiles.checkProps;
function apply(){
 try{const props=JSON.parse(get('params').value);checkProps(selected,props);const preview=OPC.create(selected,props);edited[selected].props=props;get('live').replaceChildren(preview);quickCompare();get('status').textContent='已应用参数';return true;}
 catch(e){get('status').textContent=e.message;return false;}
}
for(const [title,keys] of [['叙事',['headline','steps','tiers','evidence']],['读数',['comparison','metric','table']],['界面',['brand','notice','modal']]]){
 const group=node('div','menu-family');group.append(node('h3','',title));
 for(const id of keys){const b=node('button','',RECIPES[id].name);b.type='button';b.dataset.cmp=id;b.onclick=()=>{selected=id;drawComponent();};group.append(b);}
 get('components').append(group);
}
document.querySelectorAll('[data-media]').forEach(b=>b.onclick=()=>{media=b.dataset.media;mediaView();});
get('theme').onclick=()=>{mode=mode==='dark'?'light':'dark';readTheme();};
get('edit').onclick=()=>{const e=get('editor');e.hidden=!e.hidden;get('edit').setAttribute('aria-expanded',String(!e.hidden));if(!e.hidden)get('params').focus();};
get('apply').onclick=apply;get('reset').onclick=()=>{edited[selected]=structuredClone(RECIPES[selected]);drawComponent();get('status').textContent='已恢复示例';};
get('copy').onclick=async()=>{
 if(!get('editor').hidden&&!apply())return;
 const payload=snippet();
 try{await navigator.clipboard.writeText(payload);get('status').textContent='调用代码已复制';}
 catch{get('manual').hidden=false;get('manual-text').value=payload;get('manual-text').focus();get('manual-text').select();}
};
get('standalone').onclick=()=>{
 if(!get('editor').hidden&&!apply())return;
 OPCFiles.save('星启OPC-'+edited[selected].name+'-'+mode+'.html',OPCFiles.web(selected,edited[selected].name,edited[selected].props,mode));get('status').textContent='已导出独立 HTML';
};
document.querySelectorAll('[data-logo]').forEach(n=>n.append(OPC.create('brand')));
const startingTheme=new URLSearchParams(location.search).get('theme');if(['dark','light'].includes(startingTheme))mode=startingTheme;
readTheme();drawComponent();

const sectionLinks=[...document.querySelectorAll('.nav nav a')];
const markSection=()=>{
  const limit=document.querySelector('.top').getBoundingClientRect().height+28;
  let current='';
  for(const anchor of sectionLinks){if(document.querySelector(anchor.hash).getBoundingClientRect().top<=limit)current=anchor.hash;}
  if(innerHeight+scrollY>=document.documentElement.scrollHeight-3)current='#files';
  sectionLinks.forEach(anchor=>{if(anchor.hash===current)anchor.setAttribute('aria-current','location');else anchor.removeAttribute('aria-current');});
};
const navObserver=new IntersectionObserver(markSection,{rootMargin:'-78px 0px -50% 0px'});
sectionLinks.forEach(a=>navObserver.observe(document.querySelector(a.hash)));
markSection();
