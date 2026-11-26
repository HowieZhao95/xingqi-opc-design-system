(() => {
'use strict';
const $=id=>document.getElementById(id);
const settings=JSON.parse($('mg-settings').textContent);
const original=document.documentElement.cloneNode(true);
original.querySelectorAll('[data-opc-fonts]').forEach(e=>e.remove());
const plan=structuredClone(OPC_ASSETS.plan);
const scenes=plan.content.scenes;
const names=['TitleIn','StepIn','CompareBars','LowerThird','LogoOut'];
const labels=['片头','步骤','图表','下三分之一','品牌收尾'];
const hero=Object.values(plan.qa_frames);
const options=new URLSearchParams(window.OPC_PREVIEW_QUERY||location.search);
const fixed=settings.componentOnly || null;
if(fixed)document.querySelector('.hud-sibling')?.remove();
const theme=['dark','light'].includes(options.get('theme'))?options.get('theme'):settings.theme;
const format=['wide','portrait'].includes(options.get('format'))?options.get('format'):settings.format;
const embedded=options.get('embed')==='1'||(!!fixed&&options.get('editor')!=='1'&&options.get('embed')!=='0');
let selection=fixed||(names.includes(options.get('scene'))?options.get('scene'):'');
let transparent=settings.transparent!==false;
let edits=structuredClone(settings.edits||{});
$('theme').value=theme;$('format').value=format;
document.documentElement.classList.toggle('embed',embedded);
document.documentElement.classList.toggle('nocontrols',embedded&&options.get('controls')==='0');
let movie,frame=0,playing=false,req,fresh=true,origin=null,initial=0,editKind=null;
const icons={play:'<path d="m5 3 10 6-10 6z" fill="currentColor" stroke="currentColor" stroke-linejoin="round"/>',pause:'<path d="M5.5 4v10M12.5 4v10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'};
function playUi(){
  const name=playing?'暂停':'播放',icon='<svg viewBox="0 0 18 18" aria-hidden="true">'+icons[playing?'pause':'play']+'</svg>';
  $('play').innerHTML=icon+name;$('embedplay').innerHTML=icon;
  for(const id of ['play','embedplay']){$(id).setAttribute('aria-label',name);$(id).setAttribute('aria-pressed',String(playing));}
}
function pause(){playing=false;cancelAnimationFrame(req);origin=null;playUi();}
function current(){
  if(selection) return selection;
  return (scenes.find(s=>frame>=s.frames[0]&&frame<s.frames[1])||scenes[0]).component.name;
}
function seek(n){
  frame=movie.seekFrame(n);$('scrub').value=frame;
  const pct=100*frame/(movie.frames-1);
  $('scrub').style.background='linear-gradient(90deg,var(--cyan) '+pct+'%,var(--line) '+pct+'%)';
  $('time').value=(frame/movie.fps).toFixed(2)+' / '+(movie.frames/movie.fps).toFixed(2)+' s';
  showChapter();
  $('download').textContent='下载'+labels[names.indexOf(current())]+' HTML';
}
function play(){
  if(playing){pause();return;}
  if(fresh||frame>=movie.frames-1) seek(0);
  fresh=false;initial=frame;playing=true;playUi();
  const tick=now=>{
    if(origin===null) origin=now;
    const elapsed=initial+Math.floor((now-origin)*movie.fps/1000);
    if(elapsed>=movie.frames && options.get('loop')==='1'){origin=now;initial=0;seek(0);}
    else {seek(elapsed);if(frame>=movie.frames-1){pause();return;}}
    req=requestAnimationFrame(tick);
  };
  req=requestAnimationFrame(tick);
}
function resize(){
  if(!movie)return;
  const screen=$('screen'), scale=Math.min(screen.clientWidth/movie.size.w,screen.clientHeight/movie.size.h);
  Object.assign($('box').style,{width:movie.size.w*scale+'px',height:movie.size.h*scale+'px'});
  $('stage').style.transform='scale('+scale+')';
}
function applyEdits(){
  for(const [name,v] of Object.entries(edits)){
    const scene=scenes[names.indexOf(name)];
    if(!scene)continue;
    if(v.props) Object.assign(scene.component.props,v.props);
    if(v.data) plan.content.data=structuredClone(v.data);
    if(v.labels) plan.content.labels=v.labels.slice();
    if(v.headline) scene.text=v.headline;
  }
  if(edits.CompareBars?.data&&!edits.LowerThird?.props?.text){
    const [a,b]=plan.content.data,ra=a.buyers/a.visitors,rb=b.buyers/b.visitors;
    const conclusion=ra===rb?'两组的下单转化率相同。':
      rb>0&&ra>=rb?a.id+' 的下单转化率是 '+b.id+' 的 '+Number((ra/rb).toFixed(2))+' 倍。':
      ra>0&&rb>ra?b.id+' 的下单转化率是 '+a.id+' 的 '+Number((rb/ra).toFixed(2))+' 倍。':
      (ra>rb?a.id:b.id)+' 的下单转化率更高。';
    scenes[3].component.props.text=conclusion;
  }
}
function mount(atFrame){
  pause();applyEdits();
  const theme=$('theme').value,format=$('format').value;
  const pal=OPC_ASSETS.tokens.themes[theme];
  for(const [k,v] of Object.entries(pal)) document.documentElement.style.setProperty('--'+k,v);
  document.documentElement.style.colorScheme=theme;
  const alpha=selection==='LowerThird'&&transparent;
  document.documentElement.classList.toggle('alpha',embedded&&alpha);
  $('brand').src=OPC_ASSETS.logos[theme];$('screen').dataset.format=format;
  movie=OPCMotion.mount($('stage'),{plan,theme,format,component:selection,transparent:alpha});
  $('scrub').max=movie.frames-1;resize();
  const i=names.indexOf(selection);
  seek(atFrame??(i<0?hero[0]:hero[i]-scenes[i].frames[0]));
  fresh=true;
  for(const button of $('shots').children)button.setAttribute('aria-pressed',String(button.dataset.name===selection));
}
function showChapter(){
  const rail=$('chapters');
  rail.hidden=!!selection;
  if(selection)return;
  const active=current();
  if(rail.dataset.current===active)return;
  rail.dataset.current=active;
  for(const b of rail.children){
    if(b.dataset.scene===active)b.setAttribute('aria-current','step');
    else b.removeAttribute('aria-current');
  }
}
if(!fixed){
  scenes.forEach((scene,i)=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.scene=names[i];
    button.style.setProperty('--frames',scene.frames[1]-scene.frames[0]);
    button.textContent=['片头','步骤','比较','字幕','片尾'][i];
    const time=document.createElement('small');
    time.textContent=(scene.frames[0]/plan.fps).toFixed(1)+' s';
    button.append(time);
    button.setAttribute('aria-label','定位'+labels[i]+'的可读帧');
    button.onclick=()=>{pause();fresh=false;seek(hero[i]);};
    $('chapters').append(button);
  });
}
function addShot(name,caption){
  const b=document.createElement('button');b.textContent=caption;b.dataset.name=name;
  const seconds=document.createElement('small');
  const i=names.indexOf(name),range=i<0?[0,plan.total_frames]:scenes[i].frames;
  seconds.textContent=((range[1]-range[0])/plan.fps).toFixed(1)+' s';b.append(seconds);
  b.onclick=()=>{selection=name;mount();};
  $('shots').appendChild(b);
}
if(!fixed)addShot('','完整演示');
names.forEach((n,i)=>{if(!fixed||n===fixed) addShot(n,labels[i]);});
$('source').textContent='教学示例 · 同周访客按人去重，每位下单者只下一单。';
function input(id,title,val,kind='text',attrs={}){
  const group=document.createElement('label');group.className='field-group';group.textContent=title;
  const el=document.createElement(kind==='area'?'textarea':'input');
  el.id='field-'+id;if(kind!=='area')el.type=kind;
  if(kind==='checkbox'){el.checked=val;el.style.width='auto';el.style.justifySelf='start';}
  else {el.value=val;el.required=!!attrs.required;}
  Object.entries(attrs).filter(([k])=>k!=='required').forEach(([k,v])=>el.setAttribute(k,v));
  group.appendChild(el);$('fields').appendChild(group);
}
function editor(){
  pause();editKind=current();const i=names.indexOf(editKind),scene=scenes[i],p=scene.component.props;
  $('fields').replaceChildren();$('error').textContent='';$('editorTitle').textContent='编辑'+labels[i];
  if(editKind==='TitleIn'){input('lines','标题（每行一段）',p.text.join('\n'),'area',{required:true,maxlength:80});input('accent','强调短语',p.accent);input('eyebrow','标签',p.eyebrow);}
  if(editKind==='StepIn'){input('title','步骤标题',p.title,'text',{required:true,maxlength:35});input('steps','三个步骤（每行一个）',p.items.join('\n'),'area',{required:true,maxlength:100});input('active','当前步骤',p.active+1,'number',{min:1,max:3,required:true});}
  if(editKind==='CompareBars'){
    input('title','图表标题',scene.text,'text',{required:true,maxlength:40});
    plan.content.data.forEach((row,k)=>{
      input('raw'+k,'第 '+(k+1)+' 组 · 标签 / 下单人数 / 访客人数',plan.content.labels[k]+' / '+row.buyers+' / '+row.visitors,'text',{required:true});
    });
  }
  if(editKind==='LowerThird'){input('text','字幕（最多两行）',p.text,'area',{required:true,maxlength:100});input('alpha','下载时使用透明画布',transparent,'checkbox');}
  if(editKind==='LogoOut'){const natural=plan.layout[$('format').value].lockup.width;input('width','字标宽度（原画布像素）',p.width||natural,'number',{required:true,min:100,max:$('format').value==='portrait'?842:1680});}
  $('editor').showModal();
}
function values(){const field=n=>$('field-'+n),val=n=>field(n).value.trim();
  if(editKind==='TitleIn'){const text=val('lines').split('\n').map(s=>s.trim()).filter(Boolean);if(text.length<1||text.length>2)throw Error('标题请填写一至两行。');return {props:{text,accent:val('accent'),eyebrow:val('eyebrow')}};}
  if(editKind==='StepIn'){const items=val('steps').split('\n').map(s=>s.trim()).filter(Boolean);if(items.length!==3)throw Error('请填写三个步骤，每行一个。');return {props:{title:val('title'),items,active:Number(val('active'))-1}};}
  if(editKind==='CompareBars'){
    const data=[],labels=[];
    for(let i=0;i<2;i++){
      const parts=val('raw'+i).split('/').map(s=>s.trim()),[label,b,v]=parts;
      const buyers=Number(b),visitors=Number(v);
      if(parts.length!==3||!label||!b||!v||!Number.isSafeInteger(buyers)||!Number.isSafeInteger(visitors)||visitors<=0||buyers<0||buyers>visitors)throw Error('每组按“标签 / 下单人数 / 访客人数”填写，访客人数须大于零。');
      labels.push(label);data.push({id:plan.content.data[i].id,buyers,visitors});
    }
    return {data,labels,headline:val('title')};
  }
  if(editKind==='LowerThird'){if(val('text').split('\n').length>2)throw Error('字幕最多使用两行。');transparent=field('alpha').checked;return {props:{text:val('text'),maxLines:2}};}
  return {props:{width:Number(val('width'))}};
}
$('edit').onclick=editor;$('cancel').onclick=()=>$('editor').close();
$('form').onsubmit=e=>{
  e.preventDefault();
  try{const next=values();edits[editKind]=next;selection=editKind;mount();$('editor').close();}
  catch(err){$('error').textContent=err.message;}
};
function download(){
  const component=current(),copy=original.cloneNode(true);
  copy.querySelector('.hud-sibling')?.remove();
  const cfg={theme:$('theme').value,format:$('format').value,componentOnly:component,transparent,edits};
  // JSON stays editable even when a caption contains literal HTML.
  copy.querySelector('#mg-settings').textContent=JSON.stringify(cfg,null,2).replaceAll('<','\\u003c');
  copy.querySelector('title').textContent='星启 OPC · '+labels[names.indexOf(component)];
  const url=URL.createObjectURL(new Blob(['<!doctype html>\n',copy.outerHTML],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='opc-'+component+'-'+cfg.theme+'-'+cfg.format+'.html';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$('download').onclick=download;$('play').onclick=play;$('embedplay').onclick=play;
$('theme').onchange=()=>mount(frame);$('format').onchange=()=>mount(frame);
$('scrub').oninput=e=>{fresh=false;pause();seek(Number(e.target.value));};
mount(options.has('frame')&&Number.isFinite(Number(options.get('frame')))?Number(options.get('frame')):undefined);
new ResizeObserver(resize).observe($('screen'));
if(options.get('autoplay')==='1'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)movie.ready.then(play);
})();
