(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const catalog=JSON.parse($('hud-catalog').textContent),logos=JSON.parse($('hud-logos').textContent);
  const original=document.documentElement.cloneNode(true);
  const saved=JSON.parse($('hud-default').textContent);
  const query=new URLSearchParams(window.OPC_PREVIEW_QUERY||location.search);
  const hasFrame=query.has('frame')&&Number.isFinite(Number(query.get('frame')));
  const keys=XQHudBlocks.keys,allowed=k=>k==='sequence'||keys.includes(k);
  const kind=allowed(query.get('component'))?query.get('component'):(allowed(saved.kind)?saved.kind:'sequence');
  const output=query.get('edit')!=='1'&&(query.get('embed')==='1'||query.get('output')==='1'||saved.output);
  const embeddedPreview=query.get('controls')==='1'&&query.get('embed')==='1'&&!saved.output;
  const inkOptions=['cyan','ice','day'],formats=['wide','portrait'];
  const choose=(key,opts,standard)=>opts.includes(query.get(key))?query.get(key):(opts.includes(saved[key])?saved[key]:standard);
  const ink=query.get('theme')==='light'?'day':choose('ink',inkOptions,'cyan');
  const settings={kind,ink,format:choose('format',formats,'wide'),fps:[30,60].includes(Number(query.get('fps')))?Number(query.get('fps')):(saved.fps||30),
    background:choose('background',['solid','transparent'],kind==='sequence'?'solid':'transparent'),edits:structuredClone(saved.edits||{}),
    enabled:structuredClone(saved.enabled||{}),layerPlacements:structuredClone(saved.layerPlacements||{}),placements:structuredClone(saved.placements||{}),durations:structuredClone(saved.durations||{})};
  const blankPose=()=>({x:0,y:0,scale:1}),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const make=(tag,cls,str)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(str!=null)n.textContent=String(str);return n;};
  const propsFor=k=>structuredClone(settings.edits[k]||catalog[k].props);
  const duration=k=>settings.durations[k]||catalog[k].seconds;
  const currentSettings=()=>({...settings,seconds:duration(settings.kind),placement:settings.placements[settings.kind]||blankPose()});
  const scrollToPreview=()=>{if(innerWidth<=750)$('monitor-seat').scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});};
  document.documentElement.classList.toggle('output',!!output);
  $('embed-play').hidden=!embeddedPreview;
  if(saved.output)$('main-nav').hidden=true;
  let model,clock,generation=0,lastChapter=-1,exitTimer,manualFrame=hasFrame;
  function seekTo(n){if(Number.isFinite(n)){manualFrame=true;return clock.seek(n);}}
  function play(){manualFrame=false;clock.play();}
  function toggle(){if(clock.playing)clock.pause();else play();}
  function appearance(){
    const light=settings.ink==='day';document.documentElement.dataset.theme=light?'light':'dark';
    $('brand-logo').src=logos[light?'dark':'white'];$('screen').dataset.format=settings.format;$('screen').dataset.bg=settings.background;
    for(const k of ['ink','format','fps','background'])$(k).value=String(settings[k]);
    $('name').textContent=catalog[settings.kind].name;$('role').textContent=catalog[settings.kind].use;
    $('use').textContent=catalog[settings.kind].note;$('quick-kind').value=settings.kind;
    $('export').textContent='下载'+(settings.kind==='sequence'?'组合':catalog[settings.kind].name)+' HTML ↓';
    $('sequence').setAttribute('aria-pressed',String(settings.kind==='sequence'));
    document.querySelectorAll('.shelf-card').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===settings.kind)));
    document.title=catalog[settings.kind].name+' · 星启光学 HUD';
  }
  function drawMarks(){
    const group=$('beat-nav');group.replaceChildren();
    const combo=settings.kind==='sequence';
    const items=combo?XQHudBlocks.cues:[{name:'入场',at:0,hero:.28},{name:'展开',at:.1,hero:.52},{name:'停读',at:.77,hero:.85},{name:'退出',at:1-8/(duration(settings.kind)*30),hero:1-4/(duration(settings.kind)*30)}];
    for(const [i,beat] of items.entries()){
      const at=combo?beat.at/20:beat.at,end=items[i+1]?(combo?items[i+1].at/20:items[i+1].at):1;
      const b=make('button','',beat.name);b.type='button';b.dataset.start=at;b.style.setProperty('--span',Math.max(.09,end-at));
      b.onclick=()=>seekTo(Math.round((combo?beat.hero/20:beat.hero)*(clock.frames-1)));group.append(b);
    }
    lastChapter=-1;
  }
  function thumbnail(host,k){
    const m=XQHudBlocks.mount(host,{catalog,logos,thumbnail:true,settings:{...currentSettings(),kind:k,format:'wide',background:'transparent',seconds:catalog[k].seconds}});
    m.render(Math.round(catalog[k].hero*settings.fps/30));return m.ready;
  }
  function drawShelf(){
    if(output)return;
    const shelf=$('shelf');shelf.replaceChildren();
    for(const k of keys){
      const meta=catalog[k],b=make('button','shelf-card');b.type='button';b.dataset.kind=k;
      const thumb=make('span','thumb');thumb.setAttribute('aria-hidden','true');
      b.setAttribute('aria-pressed',String(k===settings.kind));b.append(thumb,make('strong','',meta.name),make('small','',meta.use+'  ·  '+duration(k)+' s'));
      b.onclick=()=>select(k);shelf.append(b);thumbnail(thumb,k);
    }
  }
  function status({frame,playing,frames}){
    function playState(button,caption){if(button.textContent!==caption)button.textContent=caption;if(button.ariaPressed!==String(playing))button.ariaPressed=String(playing);}
    if(embeddedPreview)playState($('embed-play'),playing?'暂停动画':'播放动画');
    if(output)return;
    playState($('play'),playing?'暂停':frame===frames-1?'重播':'播放');
    $('scrub').value=String(frame);
    const fraction=frame/(frames-1);$('scrub').style.background='linear-gradient(90deg,var(--cyan) '+(fraction*100)+'%,var(--line) 0)';
    $('scrub').setAttribute('aria-valuetext','第 '+frame+' 帧');
    $('time').textContent=(frame/settings.fps).toFixed(2)+' / '+duration(settings.kind).toFixed(2)+' s';
    $('frame-label').textContent='F '+String(frame).padStart(3,'0');$('minus').disabled=frame===0;$('plus').disabled=frame===frames-1;
    const buttons=[...$('beat-nav').children],chapter=buttons.findLastIndex(b=>fraction>=Number(b.dataset.start));
    if(chapter!==lastChapter){buttons.forEach((b,i)=>{if(i===chapter)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});lastChapter=chapter;}
  }
  function rebuild(frame,autoplay=false){
    const stamp=++generation;if(clock)clock.destroy();
    appearance();drawMarks();
    model=XQHudBlocks.mount($('canvas'),{catalog,logos,settings:currentSettings()});
    const f=frame??Math.round((settings.kind==='sequence'?catalog.sequence.hero/(30*20):catalog[settings.kind].hero/(catalog[settings.kind].seconds*30))*(model.frames-1));
    $('scrub').max=model.frames-1;$('canvas-label').textContent=(settings.format==='wide'?'3840 × 2160':'2160 × 3840')+'  /  '+settings.fps+' fps';
    clock=XQFrameClock({start:0,end:model.frames,fps:settings.fps,initial:f,
      loop:query.get('loop')==='1'||(query.get('loop')!=='0'&&(!output||settings.kind!=='sequence')),
      paint:n=>model.render(n,{reduced:reduced.matches&&!manualFrame}),change:status});
    model.ready.then(()=>{if(generation===stamp){clock.refresh();if(autoplay&&!reduced.matches&&!document.hidden)clock.play();}});
  }
  function select(k){settings.kind=k;$('status').textContent='';rebuild();scrollToPreview();}
  for(const k of ['sequence',...keys]){const opt=make('option','',catalog[k].name);opt.value=k;$('quick-kind').append(opt);}
  $('quick-kind').onchange=()=>select($('quick-kind').value);
  const auto=!hasFrame&&query.get('autoplay')!=='0';
  rebuild(hasFrame?Number(query.get('frame')):auto&&!reduced.matches?0:undefined,auto);
  drawShelf();
  $('play').onclick=$('embed-play').onclick=toggle;$('scrub').oninput=()=>seekTo(Number($('scrub').value));
  $('minus').onclick=()=>seekTo(clock.frame-1);$('plus').onclick=()=>seekTo(clock.frame+1);
  $('sequence').onclick=()=>select('sequence');
  for(const key of ['ink','format','fps','background'])$(key).onchange=()=>{
    const progress=clock.frame/(clock.frames-1);settings[key]=key==='fps'?Number($(key).value):$(key).value;
    rebuild(Math.round(progress*(duration(settings.kind)*settings.fps-1)));if(key==='ink')drawShelf();
  };
  reduced.addEventListener('change',()=>{if(reduced.matches)clock.pause();clock.refresh();});
  let resumeOnShow=false;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){resumeOnShow=clock.playing;clock.pause();}
    else if(resumeOnShow){resumeOnShow=false;if(!reduced.matches)play();}
  });
  const looseText=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
  function validPoint(p){return Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&v>=0&&v<=1);}
  function validate(k,p){
    if(!p||Array.isArray(p)||typeof p!=='object')throw Error('内容应为 JSON 对象。');
    for(const [key,v] of Object.entries(catalog[k].props)){
      if(!(key in p))throw Error('缺少 '+key+' 字段。');
      if(typeof v==='string'&&!looseText(p[key],key==='unit'||key==='tag'?8:48))throw Error('请检查 '+key+' 的文字长度。');
      if(typeof v==='number'&&!Number.isFinite(p[key]))throw Error(key+' 需要有效数值。');
    }
    if(k==='dial'&&!(p.max>p.min&&[p.from,p.to].every(v=>v>=p.min&&v<=p.max)))throw Error('读数必须在量程内，最大值须大于最小值。');
    if(k==='surface'){
      if(!Number.isInteger(p.sections)||p.sections<8||p.sections>96)throw Error('截面数为 8–96 的整数。');
      if(!Array.isArray(p.profile)||p.profile.length<3||p.profile.length>24||p.profile.some((v,i)=>!Array.isArray(v)||v.length!==3||!v.every(n=>Number.isFinite(n)&&n>=0&&n<=1)||v[2]-v[1]<.035||(i&&v[0]<=p.profile[i-1][0])))throw Error('轮廓至少 3 组 [横坐标,上沿,下沿]；横坐标递增，均为 0–1。');
    }
    if(k==='probe'){
      if(!validPoint(p.start)||!validPoint(p.end))throw Error('锚点需要两个 0–1 坐标。');
      if(!['trace','surface'].includes(p.follow)||![1,2,3].includes(p.channelIndex))throw Error('请指定光迹或曲面跟随，以及第 1–3 个采样通道。');
    }
    if(k==='trace'&&(!Array.isArray(p.points)||p.points.length<2||p.points.length>12||!p.points.every(validPoint)))throw Error('光迹需要 2–12 个 [x,y] 坐标，范围 0–1。');
    if(k==='plot'||k==='band'){
      if(!(p.max>0)||(k==='plot'&&!(p.sampleSeconds>0&&p.sampleSeconds<=3600)))throw Error('量程与采样时长需为正数，采样时长至多 3600 秒。');
      if(!Array.isArray(p.series)||p.series.length<1||p.series.length>3||p.series.some(r=>!r||!looseText(r.name,8)||!Array.isArray(r.values)||r.values.length<2||r.values.length>60||r.values.some(v=>!Number.isFinite(v)||v<0||v>p.max)))throw Error('请填 1–3 个通道，每通道 2–60 个处于量程内的样本。');
    }
    if(k==='seal'&&(!Number.isInteger(p.count)||p.count<0||p.count>9999))throw Error('归档数需为 0–9999 的整数。');
  }
  const captions={title:'主标题',subtitle:'副标题',channel:'英文通道名',provenance:'数据来源',label:'名称',sections:'扫描截面数',min:'量程下限',max:'量程上限',from:'起始读数',to:'终止读数',unit:'单位',tag:'测点编号',value:'测点值',start:'起点 [x,y]',end:'终点 [x,y]',source:'起点名称',destination:'终点名称',sampleSeconds:'采样时长（秒）',detail:'签出说明',count:'归档数量',follow:'附着位置',channelIndex:'取样通道（1–3）'};
  let draft,editKind,combo,poseBank;
  function updateJSON(){
    try{
      const props=JSON.parse($('json').value);
      for(const el of $('direct').querySelectorAll('[data-key]')){
        const key=el.dataset.key,orig=catalog[editKind].props[key];
        props[key]=typeof orig==='number'?el.valueAsNumber:Array.isArray(orig)?el.value.split(/[,，\s]+/).filter(Boolean).map(Number):el.value;
      }
      for(const el of $('direct').querySelectorAll('[data-series]')){
        props.series[Number(el.dataset.series)].values=el.value.trim().split(/[,，\s]+/).filter(Boolean).map(Number);
      }
      $('json').value=JSON.stringify(props,null,2);$('error').textContent='';
    }catch{ $('error').textContent='请先修正 JSON，或恢复预设。'; }
  }
  function fillDirect(props){
    const host=$('direct');host.replaceChildren();
    for(const [k,v] of Object.entries(props)){
      if(!captions[k]||(!combo&&['follow','channelIndex'].includes(k)))continue;
      if(combo&&((editKind==='seal'&&k==='count')||(editKind==='band'&&['max','unit','provenance'].includes(k))||(editKind==='probe'&&['value','unit'].includes(k))))continue;
      const label=make('label',typeof v==='string'&&v.length>15?'long':'',captions[k]),inp=make(k==='follow'?'select':'input');inp.dataset.key=k;
      if(k==='follow'){
        for(const [key,name] of [['trace','光迹前端'],['surface','曲面锚点']]){const o=make('option','',name);o.value=key;inp.append(o);}
      }else{inp.type=typeof v==='number'?'number':'text';if(inp.type==='number')inp.step='any';}
      inp.value=Array.isArray(v)?v.join(', '):v;inp.oninput=updateJSON;label.append(inp);host.append(label);
    }
    if(Array.isArray(props.series)&&!(combo&&editKind==='band'))props.series.forEach((row,i)=>{const label=make('label','long',row.name+' · 样本值'),inp=make('input');inp.value=row.values.join(', ');inp.dataset.series=i;inp.oninput=updateJSON;label.append(inp);host.append(label);});
    if(props.points||props.profile)host.append(make('p','direct-note',props.profile?'展开 JSON 可改曲面上下轮廓控制点。':'展开 JSON 可改路径的归一化控制点。'));
    if(combo&&editKind==='band')host.append(make('p','direct-note','组合中的字幕共用曲线的数据与单位，可在“多通道曲线”中修改。'));
    if(combo&&editKind==='probe')host.append(make('p','direct-note','曲面锚点模式使用起点和终点。读数与单位取自所选曲线通道，通道不足时取最后一路。'));
    if(combo&&editKind==='seal')host.append(make('p','direct-note','签出的归档数跟随当前曲线通道数。'));
  }
  function readLayer(){
    const props=JSON.parse($('json').value);validate(editKind,props);
    const pose={x:Number($('xoff').value)/100,y:Number($('yoff').value)/100,scale:Number($('scale').value)/100};
    if(![pose.x,pose.y,pose.scale].every(Number.isFinite)||pose.scale<.25||pose.scale>1.6||Math.abs(pose.x)>.9||Math.abs(pose.y)>.9)throw Error('检查缩放和横纵偏移。');
    draft.edits[editKind]=props;poseBank[editKind]=pose;if(combo)draft.enabled[editKind]=$('layer-on').checked;
  }
  function loadLayer(k){
    editKind=k;const props=draft.edits[k]||catalog[k].props,pose=poseBank[k]||blankPose();
    $('edit-kind').value=k;$('layer-on').checked=draft.enabled[k]!==false;
    $('scale').value=Math.round(pose.scale*100);$('xoff').value=Math.round(pose.x*100);$('yoff').value=Math.round(pose.y*100);
    $('json').value=JSON.stringify(props,null,2);fillDirect(props);$('error').textContent='';
  }
  function edit(){
    clock.pause();combo=settings.kind==='sequence';draft=structuredClone(settings);poseBank=combo?draft.layerPlacements:draft.placements;
    $('layer-controls').hidden=!combo;$('editor-title').textContent=combo?'编辑组合与图层':'编辑'+catalog[settings.kind].name;
    $('hint').textContent=combo?'选择一个图层调整内容、位置或可见性。时长作用于完整演示。':catalog[settings.kind].note;
    $('seconds').value=duration(settings.kind);$('advanced').open=false;loadLayer(combo?'surface':settings.kind);$('editor').showModal();
  }
  keys.forEach(k=>{const opt=make('option','',catalog[k].name);opt.value=k;$('edit-kind').append(opt);});
  $('edit-kind').onchange=()=>{const next=$('edit-kind').value;try{readLayer();loadLayer(next);}catch(e){$('edit-kind').value=editKind;$('error').textContent=e.message;}};
  $('json').oninput=()=>{try{const v=JSON.parse($('json').value);validate(editKind,v);fillDirect(v);$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
  $('edit').onclick=edit;$('cancel').onclick=()=>$('editor').close();
  $('form').onsubmit=e=>{
    e.preventDefault();try{
      readLayer();if(combo&&keys.every(k=>draft.enabled[k]===false))throw Error('请至少保留一个图层。');
      const sec=$('seconds').valueAsNumber;if(!Number.isFinite(sec)||sec<2||sec>60)throw Error('时长应在 2–60 秒内。');
      settings.edits=draft.edits;settings.enabled=draft.enabled;settings.layerPlacements=draft.layerPlacements;settings.placements=draft.placements;settings.durations[settings.kind]=sec;
      $('editor').close();rebuild();drawShelf();$('status').textContent='已应用到当前动画。';
    }catch(error){$('error').textContent=error.message;}
  };
  $('restore').onclick=()=>{
    const k=settings.kind;if(k==='sequence'){settings.edits={};settings.layerPlacements={};settings.enabled={};}
    else{delete settings.edits[k];delete settings.placements[k];}delete settings.durations[k];rebuild();drawShelf();$('status').textContent='当前预设已恢复。';
  };
  function exportFile(){
    const cfg=structuredClone(settings);cfg.output=true;const copy=original.cloneNode(true);
    copy.querySelector('#hud-default').textContent=JSON.stringify(cfg,null,2).replace(/</g,'\\u003c');
    copy.querySelector('#main-nav').replaceChildren();
    copy.querySelector('title').textContent=catalog[cfg.kind].name+' · 星启光学 HUD';
    const blob=new Blob(['<!doctype html>\n',copy.outerHTML],{type:'text/html;charset=utf-8'});
    const a=make('a');a.href=URL.createObjectURL(blob);a.download='星启HUD-'+catalog[cfg.kind].name+'-'+(settings.format==='portrait'?'竖':'横')+'-'+(settings.background==='transparent'?'透明':'含底')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);$('status').textContent='已导出。单独打开后按 E 可继续编辑。';
  }
  $('export').onclick=exportFile;
  function wake(){if(!document.body.classList.contains('full'))return;document.body.classList.add('show-exit');clearTimeout(exitTimer);exitTimer=setTimeout(()=>document.body.classList.remove('show-exit'),1600);}
  $('fullscreen').onclick=async()=>{document.body.classList.add('full');$('canvas').tabIndex=-1;$('canvas').focus({preventScroll:true});try{await document.documentElement.requestFullscreen();}catch{wake();}};
  const leave=()=>{document.body.classList.remove('full','show-exit');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});};
  $('exit-full').onclick=leave;document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('full','show-exit');});
  document.addEventListener('pointermove',wake,{passive:true});document.addEventListener('touchstart',wake,{passive:true});
  document.addEventListener('keydown',e=>{
    if($('editor').open||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,button,a,summary'))return;
    if(output&&saved.output&&e.key.toLowerCase()==='e'){
      const editURL=new URL(location.href);editURL.searchParams.set('edit','1');editURL.searchParams.set('autoplay','0');
      location.assign(editURL.href);return;
    }
    if(e.code==='Space'){e.preventDefault();toggle();}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();seekTo(clock.frame+(e.key==='ArrowLeft'?-1:1));}
    if(e.key==='Escape'&&document.body.classList.contains('full'))leave();
  });
  window.HudMG=Object.freeze({get ready(){return model.ready;},get frames(){return clock.frames;},get fps(){return settings.fps;},get frame(){return clock.frame;},seekFrame:seekTo,play,pause(){clock.pause();},
    mountComponent(host,k,props={},opts={}){
      if(!keys.includes(k))throw Error('请选择一个组件。');
      const payload={...catalog[k].props,...props};validate(k,payload);
      const conf={...currentSettings(),...opts,kind:k,seconds:opts.seconds??catalog[k].seconds,edits:{[k]:payload},placement:opts.placement||blankPose(),background:opts.background||'transparent'};
      if(![30,60].includes(conf.fps)||!Number.isFinite(conf.seconds)||conf.seconds<2||conf.seconds>60)throw Error('请使用 30 或 60 fps，时长 2–60 秒。');
      const instance=XQHudBlocks.mount(host,{catalog,settings:conf,logos});
      let manual=false;
      const local=XQFrameClock({start:0,end:instance.frames,fps:instance.fps,initial:0,paint:n=>instance.render(n,{reduced:reduced.matches&&!manual})});
      return {ready:instance.ready,frames:instance.frames,fps:instance.fps,seekFrame(n){if(Number.isFinite(n)){manual=true;return local.seek(n);}},play(){manual=false;local.play();},pause:local.pause,destroy(){local.destroy();host.replaceChildren();}};
    }
  });
  addEventListener('message',event=>{
    if(parent===window||event.source!==parent)return;const msg=event.data;
    if(!msg||typeof msg!=='object')return;
    if(msg.type==='XQHUD:seek')seekTo(msg.frame);
    if(msg.type==='XQHUD:play')play();if(msg.type==='XQHUD:pause')clock.pause();
  });
})();
