window.OPCLibraryMedia=(()=>{
  'use strict';
  let docs;
  function source(file){
    docs??=JSON.parse(document.getElementById('documents').textContent);
    if(!Object.hasOwn(docs.pages,file))throw Error('未收录的示例文件 '+file);
    return docs.pages[file].replace(/__OPC_ASSET_(\d+)__/g,(_,n)=>docs.assets[Number(n)]);
  }
  const files={slide:'slides-dark.html',motion:'motion-dark.html',hud:'mg-hud.html',overlay:'uhd-scene.html',field:'uhd-lightfield.html'};
  function mount(host,story,state,ready){
    const {kind}=story,iframe=document.createElement('iframe');
    const query=new URLSearchParams({theme:state.theme,autoplay:'0'});
    if(kind==='slide')query.set('embed','1');
    if(kind==='motion'||kind==='hud'){
      query.set('embed','1');query.set('controls','0');query.set('format',state.format);
      if(kind==='motion')query.set('scene',story.component);
      else{query.set('component',story.key);query.set('background',state.bg);query.set('frame',story.hero);}
    }
    if(kind==='field'){query.set('output','1');query.set('shot',story.shot);query.set('frame',story.hero);}
    if(kind==='overlay'){query.set('output','1');query.set('scene',state.scene);query.set('mode',story.key);}
    const filename=story.page||files[kind],raw=source(filename);
    // Run before the native workbench starts, then remove the setup script so downloads keep their own settings.
    const boot='<script>window.OPC_PREVIEW_QUERY='+OPCFiles.json(query.toString())+';window.OPC_PREVIEW_SLIDE='+OPCFiles.json(kind==='slide'?story.key:'')+';document.currentScript.remove();<'+'/script>';
    iframe.title=story.name+' · 真实样例';
    iframe.srcdoc=raw.replace(/<head([^>]*)>/i,m=>m+boot);
    const byId=id=>iframe.contentDocument?.getElementById(id);
    const dispatch=(id,value,type='change')=>{const el=byId(id);if(el){el.value=value;el.dispatchEvent(new Event(type,{bubbles:true}));}};
    let active=true,loaded=false;
    const self={
      get loaded(){return loaded;},
      dispose(){active=false;iframe.remove();},
      refreshTheme(theme){
        if(!loaded)return;
        if(kind==='hud')dispatch('ink',theme==='light'?'day':'cyan');
        if(kind==='motion')dispatch('theme',theme);
        if(kind==='slide'||kind==='page'){
          if(iframe.contentDocument.documentElement.dataset.theme!==theme)byId('theme')?.click();
        }
        if(kind==='field'&&iframe.contentDocument.documentElement.dataset.theme!==theme)byId('tone')?.click();
        if(kind==='overlay')iframe.contentDocument.documentElement.dataset.theme=theme;
      },
      change(key,value){
        if(!loaded)return;
        if(key==='format'||key==='bg'){dispatch(key==='bg'?'background':key,value);}
        if(key==='scene')iframe.contentDocument.querySelector('button[data-scene="'+value+'"]')?.click();
        if(key==='grid'&&Boolean(byId('grid')?.getAttribute('aria-pressed')==='true')!==(value==='on'))byId('grid')?.click();
      },
      timing(){
        if(!loaded||!story.frames)return null;
        const native=iframe.contentWindow.HudMG;
        return {frames:kind==='hud'?native.frames:story.frames,fps:kind==='hud'?native.fps:story.fps,
          frame:kind==='hud'?native.frame:Number(byId('scrub').value)-(story.start||0)};
      },
      seek(n){
        if(kind==='hud')iframe.contentWindow.HudMG.seekFrame(n);
        else dispatch('scrub',Number(n)+(story.start||0),'input');
      },
      edit(onClose){
        const control=byId('edit');
        if(!control)return false;
        control.click();
        const dialog=iframe.contentDocument.querySelector('dialog[open]');
        if(!dialog)return false;
        dialog.addEventListener('close',onClose,{once:true});return true;
      },
      download(){
        if(kind==='page'){
          // Keep the selected theme as the initial setting. Direct URL parameters can still override it.
          const doc=new DOMParser().parseFromString(raw,'text/html');
          doc.documentElement.dataset.theme=state.theme;
          const init=doc.createElement('script');
          init.textContent='window.OPC_PREVIEW_QUERY=location.search||'+OPCFiles.json('theme='+state.theme)+';document.currentScript.remove();';
          doc.head.prepend(init);OPCFiles.save(story.name+'.html','<!doctype html>\n'+doc.documentElement.outerHTML);return;
        }
        if(kind==='field'){byId('scope').value='shot';byId('output-kind').value=state.output;}
        byId(kind==='slide'?'export-one':kind==='motion'?'download':'export').click();
      }
    };
    iframe.onload=async()=>{
      if(!active)return;
      await iframe.contentDocument.fonts.ready;
      if(kind==='hud')await iframe.contentWindow.HudMG.ready;
      if(!active)return;loaded=true;
      if(kind==='slide'&&state.grid==='on')self.change('grid','on');
      ready();
    };
    host.replaceChildren(iframe);return self;
  }
  return Object.freeze({mount});
})();
