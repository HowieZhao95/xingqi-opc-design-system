(() => {
  'use strict';
  const $=id=>document.getElementById(id),read=id=>JSON.parse($(id).textContent);
  const plan=read('lf-plan'),original=structuredClone(plan),logos=read('lf-logos'),plate=read('lf-plate');
  const query=new URLSearchParams(window.OPC_PREVIEW_QUERY||location.search),stage=$('stage');
  let tone=query.get('theme')==='light'?'light':'dark',raw=false,scene,clock,lastChapter=-1,leaveTimer;
  const channels={surface:true,probes:true,readout:true};
  const reduction=matchMedia('(prefers-reduced-motion: reduce)');
  function label(n){return n.toFixed(2);}
  function buildShots(){
    for(const [i,shot] of plan.shots.entries()){
      const b=document.createElement('button');b.className='shot';b.type='button';b.dataset.shot=shot.id;
      const id=document.createElement('span');id.className='scene-id';id.textContent=String(i+1).padStart(2,'0');
      const name=document.createElement('b');name.textContent=shot.name;
      const time=document.createElement('span');time.className='scene-time';time.textContent=(shot.start/plan.fps).toFixed(1)+' s';
      const rail=document.createElement('span');rail.className='shot-track';rail.append(document.createElement('i'));rail.setAttribute('aria-hidden','true');
      b.append(id,name,time,rail);b.title=shot.note;b.setAttribute('aria-label','定位到'+shot.name+'的可读画面');
      b.onclick=()=>{raw=false;syncRaw();clock.seek(shot.hero);};
      $('shots').append(b);
    }
  }
  function syncRaw(){$('raw').setAttribute('aria-pressed',String(raw));$('raw').textContent=raw?'返回动效':'原图对照';}
  function renderScene(){
    document.documentElement.dataset.theme=tone;
    $('mast-logo').src=logos[tone==='light'?'dark':'white'];
    $('tone').textContent=tone==='dark'?'冰白 HUD':'青辉 HUD';
    scene=XQLightField.mount(stage,{data:plan,tone},{plate,logos});
  }
  function refresh({frame,playing}){
    $('scrub').value=frame;$('scrub').style.background='linear-gradient(to right,var(--cyan) '+(frame*100/(plan.frames-1))+'%,var(--line) 0)';
    $('clock').textContent=label(frame/plan.fps)+' / '+label(plan.frames/plan.fps)+' s';
    $('scrub').setAttribute('aria-valuetext','第 '+frame+' 帧');
    $('frame-count').textContent='F '+String(frame).padStart(3,'0');
    $('play').setAttribute('aria-pressed',String(playing));$('play').textContent=playing?'暂停':frame===plan.frames-1?'重播':'播放';
    $('prev-frame').disabled=frame<=0;$('next-frame').disabled=frame>=plan.frames-1;
    const idx=plan.shots.findIndex(s=>frame>=s.start&&frame<s.end);
    if(idx!==lastChapter){[...$('shots').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===idx)));lastChapter=idx;}
    const s=plan.shots[idx];
    $('shots').children[idx].querySelector('.shot-track i').style.transform='scaleX('+((frame-s.start)/(s.end-s.start-1))+')';
  }
  const requested=plan.shots.find(s=>s.id===query.get('shot'));
  const givenFrame=query.has('frame')&&Number.isFinite(Number(query.get('frame')));
  const initial=givenFrame?Number(query.get('frame')):requested?requested.hero:0;
  buildShots();renderScene();
  clock=XQFrameClock({start:0,end:plan.frames,fps:plan.fps,loop:query.get('loop')==='1',initial,
    paint:f=>scene.render(f,{raw,reduced:reduction.matches,channels}),change:refresh});
  reduction.addEventListener('change',()=>{if(reduction.matches)clock.pause();clock.refresh();});
  const isAuto=!givenFrame&&!requested&&query.get('autoplay')!=='0'&&!reduction.matches;
  scene.ready.then(()=>{if(isAuto&&!document.hidden){clock.play();}});
  function resume(){if(raw){raw=false;syncRaw();clock.refresh();}clock.toggle();}
  $('play').onclick=resume;$('scrub').oninput=()=>{raw=false;syncRaw();clock.seek(Number($('scrub').value));};
  function nudge(n){raw=false;syncRaw();clock.step(n);}
  $('prev-frame').onclick=()=>nudge(-1);$('next-frame').onclick=()=>nudge(1);
  document.querySelectorAll('[data-channel]').forEach(input=>input.onchange=()=>{
    channels[input.dataset.channel]=input.checked;raw=false;syncRaw();clock.refresh();
  });
  $('raw').onclick=()=>{clock.pause();raw=!raw;syncRaw();clock.refresh();};
  $('tone').onclick=()=>{tone=tone==='dark'?'light':'dark';raw=false;syncRaw();renderScene();clock.refresh();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clock.pause();});
  function active(){return plan.shots.find(s=>clock.frame>=s.start&&clock.frame<s.end);}
  function openEditor(){
    clock.pause();$('inputs').replaceChildren();$('error').textContent='';
    for(const [i,p] of plan.points.entries()){
      const lab=document.createElement('label');lab.textContent=p.tag+' · '+p.name;
      const input=document.createElement('input');input.type='text';input.name='p'+i;input.value=p.samples.join(', ');input.required=true;
      lab.append(input);$('inputs').append(lab);
    }
    $('editor').showModal();
  }
  $('edit').onclick=openEditor;$('cancel').onclick=()=>$('editor').close();
  $('reset').onclick=()=>{original.points.forEach((p,i)=>$('data-form').elements['p'+i].value=p.samples.join(', '));$('error').textContent='点“应用读数”保存。';};
  $('data-form').onsubmit=e=>{
    e.preventDefault();const updated=[];
    for(let i=0;i<plan.points.length;i++){
      const input=$('data-form').elements['p'+i],words=input.value.trim().split(/[，,\s]+/);
      if(words.length!==7||words.some(v=>!/^\d+$/.test(v)||Number(v)>plan.axisMax)){
        $('error').textContent='每行需要 7 个 0–400 的整数，可以用逗号或空格分隔。';input.focus();return;
      }
      updated.push(words.map(Number));
    }
    updated.forEach((values,i)=>plan.points[i].samples=values);
    raw=false;syncRaw();renderScene();clock.seek(plan.shots.find(s=>s.id==='measure').hero);$('editor').close();$('status').textContent='三个位置的模拟读数已更新。';
  };
  function wake(){if(!document.body.classList.contains('full-view'))return;document.body.classList.add('pointer-awake');clearTimeout(leaveTimer);leaveTimer=setTimeout(()=>document.body.classList.remove('pointer-awake'),1500);}
  async function full(){document.body.classList.add('full-view');stage.tabIndex=-1;stage.focus({preventScroll:true});try{await document.documentElement.requestFullscreen();}catch{wake();}}
  function leave(){document.body.classList.remove('full-view','pointer-awake');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('full').focus({preventScroll:true});}
  $('full').onclick=full;$('exit-full').onclick=leave;
  document.addEventListener('pointermove',wake,{passive:true});document.addEventListener('touchstart',wake,{passive:true});
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('full-view','pointer-awake');});
  function keys(e){
    if($('editor').open||e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.key==='Escape'&&document.body.classList.contains('full-view')){leave();return;}
    if(e.target.closest('input,button,select,textarea,a,summary'))return;
    if(e.code==='Space'){e.preventDefault();resume();}
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();nudge(e.key==='ArrowRight'?1:-1);}
  }
  document.addEventListener('keydown',keys);if(query.get('output')==='1')document.body.classList.add('full-view');
  // Export a complete browser source; both layers can be driven by the same local frame index.
  function playback(){
    'use strict';
    const get=id=>document.getElementById(id);
    const config=JSON.parse(get('lf-export-config').textContent);
    const q=new URLSearchParams(location.search),reduce=matchMedia('(prefers-reduced-motion: reduce)');
    const assets={logos:JSON.parse(get('lf-logos').textContent),plate:get('lf-plate')?JSON.parse(get('lf-plate').textContent):''};
    const scene=XQLightField.mount(get('stage'),config,assets);
    const still=()=>q.get('reduced')==='0'?false:reduce.matches;
    const seeked=q.has('frame')&&Number.isFinite(Number(q.get('frame')));
    const clock=XQFrameClock({start:config.start,end:config.end,fps:config.data.fps,loop:q.get('loop')==='1',
      initial:config.start+(seeked?Number(q.get('frame')):0),
      paint:f=>scene.render(f,{reduced:still(),plateOnly:config.kind==='plate'})});
    window.LightfieldPlayer=Object.freeze({ready:scene.ready,frames:clock.frames,fps:config.data.fps,
      seekFrame:n=>clock.seek(config.start+Number(n))-config.start,play:clock.play,pause:clock.pause,
      get frame(){return clock.frame-config.start;}});
    document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();clock.toggle();}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();clock.step(e.key==='ArrowLeft'?-1:1);}});
    reduce.addEventListener('change',()=>{if(still())clock.pause();clock.refresh();});
    scene.ready.then(()=>{if(!seeked&&q.get('autoplay')!=='0'&&!still())clock.play();});
  }
  function exportHtml(){
    const range=$('scope').value==='shot'?active():{start:0,end:plan.frames,name:'完整导览'},kind=$('output-kind').value;
    const kindName={scene:'含景',alpha:'透明层',plate:'运动底图'}[kind];
    if(kind==='alpha'&&!Object.values(channels).some(Boolean)){$('status').textContent='请先开启要导出的 HUD 图层。';return;}
    const config={data:plan,tone,channels:{...channels},start:range.start,end:range.end,kind,transparent:kind==='alpha'};
    const name='浮光-'+range.name+'-'+kindName;
    const out=document.implementation.createHTMLDocument(name+' · 星启 OPC');out.documentElement.lang='zh-CN';
    const viewport=document.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';out.head.append(viewport);
    const charset=document.createElement('meta');charset.setAttribute('charset','utf-8');out.head.prepend(charset);
    const style=$('lf-stage-style').cloneNode(true);
    const canvasColor=kind==='alpha'?'transparent':'#0B101A';
    style.textContent+='\nhtml,body{margin:0;width:100%;height:100%;overflow:hidden;background:'+canvasColor+';}body{display:grid;place-items:center;}#stage{width:min(100vw,177.77778vh);}';
    out.head.append(style);
    const stage=out.createElement('main');stage.id='stage';out.body.append(stage);
    const json=out.createElement('script');json.type='application/json';json.id='lf-export-config';json.textContent=JSON.stringify(config,null,2).replace(/</g,'\\u003c');
    out.body.append(json,$('lf-logos').cloneNode(true));if(kind!=='alpha')out.body.append($('lf-plate').cloneNode(true));
    out.body.append($('lf-runtime').cloneNode(true),$('lf-transport').cloneNode(true));
    const app=out.createElement('script');app.textContent='('+playback.toString()+')();';out.body.append(app);
    const link=document.createElement('a');link.download=name+'.html';
    link.href=URL.createObjectURL(new Blob(['<!doctype html>\n',out.documentElement.outerHTML],{type:'text/html;charset=utf-8'}));
    link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1800);
    $('status').textContent='已导出'+range.name+' · '+kindName+'，共 '+(range.end-range.start)+' 帧。';
  }
  $('export').onclick=exportHtml;
})();
