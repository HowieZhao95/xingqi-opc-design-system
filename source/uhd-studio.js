(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const photos=JSON.parse($('source-images').textContent);
  const logos=JSON.parse($('brand-images').textContent);
  const templates=JSON.parse($('scene-templates').textContent);
  const query=new URLSearchParams(window.OPC_PREVIEW_QUERY||location.search);
  const names={title:'开场标题',pin:'位置标注',metric:'数据读数',caption:'讲解字幕'};
  const scenes=structuredClone(templates);
  const ui={scene:query.get('scene')==='studio'?'studio':'talk',mode:Object.hasOwn(names,query.get('mode'))?query.get('mode'):'title',solid:false,brand:true};
  let scene=scenes[ui.scene],clean=false,aim=false,request=0,objectUrl='',customName='',vid=null,leaveTimer;
  const shellTheme=query.get('theme')==='light'?'light':'dark';
  document.documentElement.dataset.theme=shellTheme;
  const brandImg=document.createElement('img');brandImg.src=logos[shellTheme==='light'?'dark':'white'];brandImg.alt='星启 OPC · AI+社群';$('home-brand').append(brandImg);
  document.querySelectorAll('.mast a').forEach(a=>{const href=a.getAttribute('href');a.href=href+'?theme='+shellTheme;});
  const stage=$('stage');
  function config(){return {...structuredClone(scene),mode:ui.mode,solid:ui.solid,brand:ui.brand};}
  function say(text){$('status').textContent=text;}
  function setAiming(value){
    aim=!!value;stage.classList.toggle('aiming',aim);
    $('pin-move').setAttribute('aria-pressed',String(aim));
    $('pin-move').textContent=aim?'取消定位':'在画面定位';
    if(aim){clean=false;stage.classList.remove('clean');$('original').setAttribute('aria-pressed','false');$('original').textContent='看原片';stage.tabIndex=0;stage.setAttribute('aria-label','点选锚点，或用方向键微调后按回车');stage.focus({preventScroll:true});say('点选物体，或用方向键微调、回车确定。');}
    else{stage.removeAttribute('tabindex');stage.removeAttribute('aria-label');}
  }
  function draw(){
    XQUHD.render($('layer'),config(),logos);
    for(const [key,val] of [['scene',ui.scene],['mode',ui.mode],['tone',scene.tone]]){
      document.querySelectorAll('[data-'+key+']').forEach(b=>{if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset[key]===val));});
    }
    $('solid').checked=ui.solid;$('brand').checked=ui.brand;
    $('side-tools').hidden=!['title','metric'].includes(ui.mode);
    $('pin-tools').hidden=ui.mode!=='pin';
    $('side').textContent=scene.side==='left'?'移至右侧':'移至左侧';
    $('source-label').textContent=ui.scene==='custom'?'本地底图 · '+customName:scene.name+' · 场地实拍';
  }
  function stopVideo(){if(vid){vid.pause();vid.removeAttribute('src');vid.load();vid=null;} $('video-toggle').hidden=true;}
  function usePreset(key){
    request++;stopVideo();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl='';
    const img=document.createElement('img');img.src=photos[key];img.alt=key==='talk'?'项目讲解现场，讲解者与项目展板':'日光下的开放工作区和共创桌组';
    $('footage').replaceChildren(img);ui.scene=key;scene=scenes[key];
    setAiming(false);$('upload').value='';say('');draw();
  }
  document.querySelectorAll('button[data-scene]').forEach(b=>b.onclick=()=>usePreset(b.dataset.scene));
  document.querySelectorAll('button[data-mode]').forEach(b=>b.onclick=()=>{ui.mode=b.dataset.mode;setAiming(false);setClean(false);say('');draw();});
  document.querySelectorAll('button[data-tone]').forEach(b=>b.onclick=()=>{scene.tone=b.dataset.tone;setClean(false);draw();});
  $('solid').onchange=()=>{ui.solid=$('solid').checked;setClean(false);draw();};
  $('brand').onchange=()=>{ui.brand=$('brand').checked;setClean(false);draw();};
  $('side').onclick=()=>{scene.side=scene.side==='left'?'right':'left';setClean(false);draw();};
  $('pin-move').onclick=()=>setAiming(!aim);
  function movePoint(x,y){
    scene.pin.x=Math.max(.0625,Math.min(.9375,x));scene.pin.y=Math.max(.0926,Math.min(.9074,y));draw();
  }
  stage.addEventListener('click',e=>{
    if(!aim)return;const rect=stage.getBoundingClientRect();movePoint((e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height);
    setAiming(false);say('标注位置已更新。');
  });
  stage.addEventListener('keydown',e=>{
    if(!aim)return;const moves={ArrowLeft:[-.005,0],ArrowRight:[.005,0],ArrowUp:[0,-.005],ArrowDown:[0,.005]};
    if(moves[e.key]){e.preventDefault();movePoint(scene.pin.x+moves[e.key][0],scene.pin.y+moves[e.key][1]);}
    if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();setAiming(false);$('pin-move').focus();say('定位结束。');}
  });
  function setClean(value){clean=value;stage.classList.toggle('clean',clean);$('original').setAttribute('aria-pressed',String(clean));$('original').textContent=clean?'看叠加':'看原片';}
  $('original').onclick=()=>{setAiming(false);setClean(!clean);};
  $('safe-toggle').onclick=()=>{const show=$('safe').hidden;setClean(false);$('safe').hidden=!show;$('safe-toggle').setAttribute('aria-pressed',String(show));};
  $('upload').onchange=async()=>{
    const file=$('upload').files[0];if(!file)return;
    const ticket=++request,url=URL.createObjectURL(file);
    const video=file.type.startsWith('video/')||/\.(mp4|mov|m4v|webm)$/i.test(file.name);
    let media;try{
      if(video){media=document.createElement('video');media.muted=true;media.loop=true;media.playsInline=true;media.preload='auto';
        await new Promise((ok,fail)=>{media.onloadeddata=ok;media.onerror=()=>fail(Error('此视频编码无法在当前浏览器播放。'));media.src=url;});media.onloadeddata=media.onerror=null;
      }else{media=document.createElement('img');media.alt='本地实景';media.src=url;await media.decode();}
      if(ticket!==request){URL.revokeObjectURL(url);return;}
      stopVideo();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=url;
      scene=structuredClone(templates.talk);scene.name='本地实景';scene.title={tag:'现场导览',text:'空间介绍',sub:'可在控制区修改上屏文案'};scene.pin={tag:'位置标注',text:'关注位置',sub:'在画面中点选物体',x:.54,y:.5};ui.solid=true;
      ui.scene='custom';customName=file.name;$('footage').replaceChildren(media);
      if(video){vid=media;$('video-toggle').hidden=false;$('video-toggle').textContent='播放底图';
        vid.onplay=()=>{$('video-toggle').textContent='暂停底图';};vid.onpause=()=>{$('video-toggle').textContent='播放底图';};}
      setAiming(false);setClean(false);draw();say('本地底图已载入。请检查文字的落位和衬底。');
    }catch(error){URL.revokeObjectURL(url);if(ticket===request){$('upload').value='';say(video?'视频未能载入。请试用 H.264 MP4 或 WebM。':'图片未能载入。请试用 JPEG、PNG 或 WebP。');}}
  };
  $('video-toggle').onclick=async()=>{if(!vid)return;if(vid.paused){try{await vid.play();}catch{say('无法播放该视频，请尝试其他编码。');}}else vid.pause();};
  const fieldSets={
    title:[['tag','场景标签',8],['text','主标题',10],['sub','副标题',22]],
    pin:[['tag','标注类别',8],['text','标注名称',9],['sub','一句说明',16]],
    metric:[['text','指标名',9],['orders','下单人数',0],['visitors','访客人数',0]],
    caption:[['text','字幕，可手动分成两行',56]]
  };
  $('edit').onclick=()=>{
    $('fields').replaceChildren();$('field-error').textContent='';$('edit-title').textContent='编辑'+names[ui.mode];
    for(const [key,name,len] of fieldSets[ui.mode]){
      const label=document.createElement('label');label.textContent=name;
      const c=document.createElement(ui.mode==='caption'?'textarea':'input');c.name=key;c.required=true;
      if(len){c.maxLength=len;}else{c.type='number';c.min=0;c.max=99999999;c.step=1;}
      c.value=scene[ui.mode][key];label.append(c);$('fields').append(label);
    }
    $('editor').showModal();
  };
  $('cancel').onclick=()=>$('editor').close();
  $('form').onsubmit=e=>{
    e.preventDefault();const v={};
    for(const [key,,len] of fieldSets[ui.mode]){const f=$('form').elements.namedItem(key);v[key]=len?f.value.trim():f.valueAsNumber;if(len&&!v[key]){f.focus();$('field-error').textContent='请填写可见文字。';return;}}
    if(ui.mode==='metric'&&(!Number.isSafeInteger(v.orders)||!Number.isSafeInteger(v.visitors)||v.orders>v.visitors)){$('field-error').textContent='请填写整数，下单人数应小于或等于访客人数。';return;}
    if(ui.mode==='caption'&&(v.text.split('\n').length>2||v.text.split('\n').some(line=>[...line].length>28))){$('field-error').textContent='请控制在两行以内，每行最多 28 字。';return;}
    Object.assign(scene[ui.mode],v);setClean(false);draw();$('editor').close();say('已更新当前组件。');
  };
  function showLeave(){if(!document.body.classList.contains('present'))return;document.body.classList.add('controls-visible');clearTimeout(leaveTimer);leaveTimer=setTimeout(()=>document.body.classList.remove('controls-visible'),1800);}
  function preparePresent(){setClean(false);setAiming(false);document.body.classList.add('present');document.body.classList.remove('controls-visible');}
  function exitPresent(){document.body.classList.remove('present','controls-visible');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}
  $('full').onclick=async()=>{preparePresent();try{await document.documentElement.requestFullscreen();}catch{showLeave();}};
  $('leave').onclick=exitPresent;
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('present','controls-visible');});
  document.addEventListener('pointermove',showLeave,{passive:true});document.addEventListener('touchstart',showLeave,{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('editor').open&&document.body.classList.contains('present'))exitPresent();});
  $('export').onclick=()=>{
    const doc=document.implementation.createHTMLDocument(names[ui.mode]+' · 星启 OPC UHD');
    doc.documentElement.lang='zh-CN';
    const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';doc.head.append(viewport);
    const charset=doc.createElement('meta');charset.setAttribute('charset','utf-8');doc.head.prepend(charset);
    const style=$('overlay-style').cloneNode(true);
    style.textContent+='\nhtml,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden;}body{display:grid;place-items:center;}#canvas{width:min(100vw,177.7777778vh);background:transparent;}';
    doc.head.append(style);const box=doc.createElement('main');box.id='canvas';box.className='uhd-stage';
    const layer=doc.createElement('div');layer.id='overlay';box.append(layer);doc.body.append(box);
    const json=doc.createElement('script');json.type='application/json';json.id='overlay-settings';json.textContent=JSON.stringify(config(),null,2).replace(/</g,'\\u003c');
    doc.body.append(json,$('brand-images').cloneNode(true),$('overlay-runtime').cloneNode(true));
    const run=doc.createElement('script');run.textContent="XQUHD.render(document.getElementById('overlay'),JSON.parse(document.getElementById('overlay-settings').textContent),JSON.parse(document.getElementById('brand-images').textContent));";doc.body.append(run);
    const a=document.createElement('a');a.download='星启OPC-UHD-'+names[ui.mode]+'-透明层.html';a.href=URL.createObjectURL(new Blob(['<!doctype html>\n'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'}));a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    say('已导出当前透明层，可叠在自己的画面上。');
  };
  usePreset(ui.scene);
  if(query.get('output')==='1')preparePresent();
})();
