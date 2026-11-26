(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const registry=JSON.parse($('registry').textContent),tokens=JSON.parse($('design-tokens').textContent);
  const groups=new Map(registry.groups.map(g=>[g.id,g])),entries=new Map(registry.entries.map(x=>[x.id,x]));
  const family=id=>registry.entries.filter(e=>e.group===id);
  const el=(tag,cls='',text)=>{const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;};
  const a=(href,text,cls)=>{const n=el('a',cls,text);n.href=href;return n;};
  const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem('opc.library.'+key))??fallback;}catch{return fallback;}};
  const store=(key,value)=>{try{localStorage.setItem('opc.library.'+key,JSON.stringify(value));return true;}catch{return false;}};
  const initialTheme=new URLSearchParams(location.search).get('theme');
  let theme=(initialTheme||load('theme','dark'))==='light'?'light':'dark';
  const starIds=load('favorites',[]),favorites=new Set((Array.isArray(starIds)?starIds:[]).filter(id=>entries.has(id)));
  const expanded=new Set(),drafts=new Map();
  let route,story,options,instance,clock,sample,pendingEdit=false;
  const mobile=matchMedia('(max-width:740px)');
  const groupCount=id=>String(family(id).length).padStart(2,'0');
  const glyph=g=>el('i','sign mark-'+g.mark);
  function notify(s){$(route==='manage'?'manage-status':'story-status').textContent=s;}
  async function copy(text,message){
    try{await navigator.clipboard.writeText(text);notify(message);}
    catch{$('copy-value').value=text;$('copy-dialog').showModal();$('copy-value').focus();$('copy-value').select();}
  }
  function crumb(group,leaf){
    const b=$('breadcrumbs');b.replaceChildren(a('#overview','规范库'));b.append(' / ');
    if(group){b.append(a('#group/'+group.id,group.name),' / ');}b.append(el('b','',leaf));
  }
  function applyTheme(){
    document.documentElement.dataset.theme=theme;$('theme').querySelector('span').textContent=theme==='dark'?'切换亮色':'切换深色';
    $('theme').setAttribute('aria-label',$('theme').textContent);$('quick-logo').src=OPC_INLINE.brand['xingqi-lockup-dark.svg'];
    const palette=$('quick-palette');palette.replaceChildren();for(const k of ['cyan','mint','violet','lilac','apricot']){const chip=el('i');chip.style.background='var(--'+k+')';palette.append(chip);}
  }
  function markNav(){
    document.querySelectorAll('[data-route]').forEach(n=>{if(n.dataset.route===route)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
  }
  function navigation(){
    const nav=$('group-nav');nav.replaceChildren();
    for(const g of registry.groups){
      const row=el('div','group-line'),link=a('#group/'+g.id,'','group-heading'),toggle=el('button','expand',expanded.has(g.id)?'−':'+');
      link.dataset.route='group/'+g.id;link.append(glyph(g),el('span','',g.name),el('small','count',groupCount(g.id)));
      toggle.type='button';toggle.setAttribute('aria-expanded',String(expanded.has(g.id)));toggle.setAttribute('aria-label',(expanded.has(g.id)?'收起':'展开')+g.name);toggle.setAttribute('aria-controls','children-'+g.id);
      const kids=el('div','children');kids.id='children-'+g.id;kids.hidden=!expanded.has(g.id);
      for(const item of family(g.id)){const l=a('#'+item.id,item.name,'child-link');l.dataset.route=item.id;kids.append(l);}
      toggle.onclick=()=>{if(expanded.has(g.id))expanded.delete(g.id);else expanded.add(g.id);navigation();$('group-nav').querySelector('[aria-controls="children-'+g.id+'"]').focus();};
      row.append(link,toggle);nav.append(row,kids);
    }
    markNav();
  }
  function directoryRow(href,title,description,end,group){
    const row=a(href,'','directory-row'),name=el('strong');
    if(group)name.append(glyph(group));name.append(title);row.append(name,el('small','',description),el('span','end',end||'↗'));return row;
  }
  function fillHome(){
    const list=$('medium-list');for(const g of registry.groups.filter(g=>g.id!=='foundation'))list.append(directoryRow('#group/'+g.id,g.name,g.use,groupCount(g.id)+'  ↗',g));
    $('media-total').textContent=(registry.entries.length-family('foundation').length)+' 个样例';
  }
  const resources=[
    ['handbook.html','跨媒介手册','并排对照同一内容在网页、汇报与 MG 中的呈现。'],
    ['visual-guide.html','三端视觉规范','完整的色彩、字体、层级、安全区与交接规则。'],
    ['web-starter.html','网页起步页','可离线使用的响应式网页。'],
    ['slides-dark.html','深色汇报','九页 HTML，支持编辑与单页导出。'],['slides-light.html','亮色汇报','同一套版式的亮色版本。'],
    ['motion-dark.html','深色基础 MG','标题、步骤、图表、字幕与品牌收尾。'],['motion-light.html','亮色基础 MG','支持横竖构图和透明结论字幕。'],
    ['mg-hud.html','光学 HUD 动效库','八件透明组件与二十秒组合演示。'],['uhd-scene.html','实景叠加工作台','更换本地照片或视频并定位字幕和测点。'],
    ['uhd-lightfield.html','浮光展厅','可逐帧定位的光学 HUD 实景导览。']
  ];
  function listView(title,description,items){
    $('list-title').textContent=title;$('list-description').textContent=description;
    $('list-items').replaceChildren(...items);
  }
  function entryRow(e){return directoryRow('#'+e.id,e.name,e.description,groups.get(e.group).name+'  ↗');}
  function parseHash(){
    const [raw,search='']=location.hash.slice(1).split('?');
    const aliases={top:'overview',foundation:'group/foundation',library:'group/web','main-view':'overview','':'overview'};
    return {id:aliases[raw]||raw,params:new URLSearchParams(search)};
  }
  function variants(s){return s.kind==='foundation'?(OPCFoundations.variants[s.key]||[]):s.kind==='web'?[['default','标准样例'],...s.variants.map(v=>[v.id,v.name])]:[];}
  function currentOptions(s,q){
    const choose=(k,choices,defaultValue)=>choices.includes(q.get(k))?q.get(k):defaultValue;
    const vs=variants(s);
    return {theme,variant:choose('variant',vs.map(x=>x[0]),vs[0]?.[0]||'default'),format:choose('format',['wide','portrait'],'wide'),
      bg:choose('bg',['solid','transparent'],s.kind==='hud'&&s.key!=='sequence'?'transparent':'solid'),
      scene:choose('scene',['talk','studio'],'talk'),output:choose('output',['scene','alpha','plate'],'scene'),grid:choose('grid',['off','on'],'off')};
  }
  function persistOption(k,value){
    const url=new URL(location.href),q=parseHash().params;q.set(k,value);url.hash=route+'?'+q.toString();history.replaceState(null,'',url);
  }
  function webProps(){
    const key=story.id+'?'+options.variant;
    return structuredClone(drafts.get(key)||{...story.props,...(story.variants.find(v=>v.id===options.variant)?.props||{})});
  }
  function nativeReady(){
    $('download').disabled=false;$('edit').disabled=false;
    if(story.frames)setupClock();
  }
  function setupClock(){
    clock?.destroy();clock=null;
    const t=instance?.timing();if(!t)return;
    const slider=$('seek');slider.max=t.frames-1;$('playbar').hidden=false;
    clock=XQFrameClock({start:0,end:t.frames,fps:t.fps,initial:t.frame,
      paint:frame=>instance.seek(frame),change:({frame,playing})=>{
        slider.value=frame;$('timecode').textContent=(frame/t.fps).toFixed(2)+' / '+(t.frames/t.fps).toFixed(2)+' s';
        $('play').textContent=playing?'暂停':frame===t.frames-1?'重播':'播放';$('play').setAttribute('aria-pressed',String(playing));
      }});
  }
  function dropSample(){
    clock?.destroy();clock=null;instance?.dispose();instance=null;sample=null;
    $('playbar').hidden=true;document.body.classList.remove('editing-media');
  }
  function reference(){
    let values=story.defaults;
    if(story.kind==='web')values={...story.props,...(story.variants.find(v=>v.id===options.variant)?.props||{})};
    if(story.kind==='overlay')values=story.defaults[options.scene];
    if(story.kind==='foundation'){
      const l=tokens.layout,k=options.variant==='uhd'?2:1;
      const grid=options.variant==='portrait'?{width:2160,height:3840,bottomReserve:600}:{width:l.width*k,height:l.height*k,columns:l.columns,marginX:l.marginX*k,marginY:l.marginY*k,gutter:l.gutter*k};
      values=({color:options.variant==='accent'?tokens.accents:tokens.themes[theme],type:tokens.fonts,grid,edges:{base:8,radiusUi:l.radiusUi,radiusPanel:l.radiusPanel},tempo:tokens.motion})[story.key];
    }
    $('parameter-reference').hidden=!values;
    $('ref-json').textContent=values?JSON.stringify(values,null,2):'';
  }
  function showSample(){
    dropSample();reference();
    const stage=$('stage');stage.replaceChildren();stage.dataset.portrait=String(['motion','hud'].includes(story.kind)&&options.format==='portrait');
    stage.dataset.projection=story.kind==='hud'&&options.bg==='transparent'?'alpha':'solid';
    $('edit').hidden=['foundation','page'].includes(story.kind);$('edit').disabled=false;$('download').disabled=false;
    if(['foundation','web'].includes(story.kind)){
      stage.dataset.stage='local';sample=el('div',story.kind==='web'?'web-specimen':'');stage.append(sample);
      if(story.kind==='foundation')OPCFoundations.render(sample,story,tokens,theme,options.variant,document.querySelector('.exhibit img').src);
      else sample.append(OPC.create(story.key,webProps()));
    }else{
      stage.dataset.stage=story.kind==='page'?'page':'media';$('download').disabled=true;$('edit').disabled=true;
      instance=OPCLibraryMedia.mount(stage,story,options,nativeReady);
    }
  }
  function selectControl(key,name,choices){
    const label=el('label','',name),select=el('select');select.dataset.option=key;
    for(const [val,text] of choices){const opt=el('option','',text);opt.value=val;select.append(opt);}
    select.value=options[key];label.append(select);$('variant-controls').append(label);
    select.onchange=()=>{
      const value=select.value;options[key]=value;persistOption(key,value);reference();notify('');
      if(key==='variant'){showSample();return;}
      clock?.pause();
      if(instance?.loaded){
        instance.change(key,value);$('stage').dataset.portrait=String(options.format==='portrait');
        $('stage').dataset.projection=story.kind==='hud'&&options.bg==='transparent'?'alpha':'solid';
        if(story.frames)setupClock();
      }else showSample();
    };
  }
  function details(s){
    if(s.rules)return s.rules;
    const notes={
      web:['调整参数后可下载同款独立 HTML。明暗版使用相同排版和语义变量。','保持数据、单位与出处相邻。可见面板最多三层。'],
      slide:['画布为 1920 × 1080，左右安全区 120px，上下 100px。网格可在预览中打开。','编辑当前版式后下载本页 HTML，可独立演示或继续编辑。'],
      motion:['以 30 fps 预览，横版 1920 × 1080，竖版 1080 × 1920。各镜头使用自己的本地时间轴。','文字落稳后留出停读时间。替换数据与字幕后下载当前镜头。'],
      hud:['横版 3840 × 2160，竖版 2160 × 3840。亮底用深青，暗底用青辉或冰白。','通过参数面板替换内容与读数，按需要选择透明叠加。导出后按 E 可继续编辑。'],
      overlay:['4K 横屏左右安全区 240px，上下 200px。字标按其所在局部的明暗选色。','生成场景用于预览。导出只含当前透明叠加层，可配合自己的画面。'],
      field:['展厅场景由 ImageGen 生成。示例照度为模拟数据，各位置和图层共享帧号。','导出当前镜头时可以保留场景、取透明叠加层，或单独取运动底图。'],
      page:['打开完整页面检查响应式排版、键盘焦点与明暗主题。','单文件 HTML 可直接离线打开。']
    };
    return notes[s.kind];
  }
  function storyView(s,q){
    story=s;options=currentOptions(s,q);$('parameter-reference').open=false;crumb(groups.get(s.group),s.name);
    $('story-title').textContent=s.name;$('story-description').textContent=s.description;
    $('story-rules').replaceChildren(...details(s).map(r=>el('li','',r)));$('source').textContent=s.source;
    $('guide-link').href='visual-guide.html?theme='+theme+'#'+(s.guide||groups.get(s.group).guide);
    const ctrls=$('variant-controls');ctrls.replaceChildren();const vs=variants(s);if(vs.length>1)selectControl('variant','样例',vs);
    if(['motion','hud'].includes(s.kind))selectControl('format','画幅',[['wide','横屏 16:9'],['portrait','竖屏 9:16']]);
    if(s.kind==='slide')selectControl('grid','网格',[['off','演示画面'],['on','12 栏校样']]);
    if(s.kind==='hud')selectControl('bg','画布',[['transparent','透明叠加'],['solid','含背景']]);
    if(s.kind==='overlay')selectControl('scene','实景',[['talk','项目讲解'],['studio','日光工作室']]);
    if(s.kind==='field')selectControl('output','导出图层',[['scene','含生成场景'],['alpha','透明叠加'],['plate','运动底图']]);
    $('stage-meta').textContent={foundation:'设计样张',web:'响应式 HTML',slide:'1920 × 1080',motion:'30 FPS',hud:'UHD · MG',overlay:'3840 × 2160',field:'UHD · 30 FPS',page:'HTML'}[s.kind];
    $('download').textContent=s.kind==='foundation'?'下载规范 HTML ↓':s.kind==='overlay'?'下载透明 HTML ↓':'下载样例 HTML ↓';
    favoriteLabel();notify('');showSample();
  }
  function favoriteLabel(){
    const on=favorites.has(story.id);$('favorite').textContent=on?'★ 已收藏':'☆ 收藏';$('favorite').setAttribute('aria-pressed',String(on));
  }
  function routeTo(focus=false){
    for(const id of ['menu-dialog','search-dialog','edit-dialog','copy-dialog'])if($(id).open)$(id).close();
    pendingEdit=false;
    const {id,params}=parseHash();dropSample();story=null;route=id;
    const group=id.startsWith('group/')?groups.get(id.slice(6)):null;
    const home=id==='overview',manage=id==='manage',s=entries.get(id);
    $('home-view').hidden=!home;$('story-view').hidden=!s;$('list-view').hidden=home||manage||!!s;$('manage-view').hidden=!manage;
    if(home)crumb(null,'总览');
    else if(manage)crumb(null,'维护指南');
    else if(s){expanded.add(s.group);storyView(s,params);}
    else if(group){expanded.add(group.id);crumb(null,group.name);listView(group.name,group.use,family(group.id).map(entryRow));}
    else if(id==='saved'){
      crumb(null,'常用收藏');listView('常用收藏','收藏保存在当前浏览器。',favorites.size?[...favorites].map(id=>entryRow(entries.get(id))):[el('p','empty-state','打开任一样例，点击标题旁的「收藏」即可加入。')]);
    }else if(id==='files'){
      crumb(null,'制作文件');listView('制作文件','完整工作台与交接文档。整包解压后可按此目录直接打开。',resources.map(([url,name,desc])=>directoryRow(url,name,desc)));
    }else{crumb(null,'查找条目');listView('未找到此条目','搜索名称，或从下列分类继续。',registry.groups.map(g=>directoryRow('#group/'+g.id,g.name,g.use,groupCount(g.id)+'  ↗',g)));}
    document.title=(s?.name||group?.name||({overview:'视觉风格规范库',files:'制作文件',saved:'常用收藏',manage:'维护指南'}[id])||'查找条目')+' · 星启 OPC';
    navigation();if(focus){window.scrollTo({top:0,behavior:'instant'});$('main-view').focus({preventScroll:true});}
  }
  function search(){
    const value=$('search').value.trim().toLowerCase(),terms=value.split(/\s+/).filter(Boolean);
    const ranked=registry.entries.map(s=>{const g=groups.get(s.group),text=[s.name,s.id,s.component,g.name,s.description,...(s.tags||[])].join(' ').toLowerCase();
      return {s,hit:terms.every(term=>text.includes(term)),score:value&&(s.name.toLowerCase().startsWith(value)||s.key.toLowerCase()===value)?1:0};})
      .filter(r=>r.hit).sort((a,b)=>b.score-a.score);
    $('hits').textContent=value?(ranked.length?'找到 '+ranked.length+' 个条目':'没有匹配。可以换一个名称或媒介。'):'全部 '+ranked.length+' 个条目';
    $('results').replaceChildren(...ranked.map(({s})=>{const link=a('#'+s.id,'');link.append(el('span','',s.name),el('small','',groups.get(s.group).name));return link;}));
  }
  function openSearch(){if($('menu-dialog').open)$('menu-dialog').close();$('search').value='';search();$('search-dialog').showModal();$('search').focus();}
  $('open-menu').onclick=()=>{$('drawer-seat').append($('nav-content'));$('menu-dialog').showModal();};
  $('menu-dialog').addEventListener('close',()=>$('rail').append($('nav-content')));
  mobile.addEventListener('change',()=>{if(!mobile.matches&&$('menu-dialog').open)$('menu-dialog').close();});
  $('search-button').onclick=$('mobile-search').onclick=openSearch;$('search').oninput=search;
  for(const [key,id] of [['menu','menu-dialog'],['search','search-dialog'],['edit','edit-dialog'],['copy','copy-dialog']])$('close-'+key).onclick=()=>$(id).close();
  document.addEventListener('click',event=>{if(event.target.closest('a[href^="#"]'))for(const id of ['menu-dialog','search-dialog'])if($(id).open)$(id).close();});
  $('search-dialog').addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();$('search-dialog').close();return;}
    const links=[...$('results').querySelectorAll('a')];if(!links.length)return;
    const i=links.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();links[(i<0?(e.key==='ArrowDown'?0:links.length-1):(i+(e.key==='ArrowDown'?1:-1)+links.length)%links.length)].focus();}
    if(e.key==='Enter'&&e.target===$('search')){e.preventDefault();links[0].click();}
  });
  document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||pendingEdit||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(e.key==='/'||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')){e.preventDefault();openSearch();}});
  $('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';store('theme',theme);const u=new URL(location.href);u.searchParams.set('theme',theme);history.replaceState(null,'',u);applyTheme();
    if(story){options.theme=theme;$('guide-link').search='?theme='+theme;if(instance?.loaded){instance.refreshTheme(theme);if(story.frames)setupClock();}else showSample();}};
  $('favorite').onclick=()=>{if(favorites.has(story.id))favorites.delete(story.id);else favorites.add(story.id);const persisted=store('favorites',[...favorites]);favoriteLabel();if(!persisted)notify('本次打开期间已记录收藏。');};
  $('share').onclick=()=>{const u=new URL(location.href);u.searchParams.set('theme',theme);u.hash=route+(parseHash().params.size?'?'+parseHash().params:'');
    copy(u.protocol==='file:'?'index.html'+u.search+u.hash:u.href,'已复制条目地址，打开同一份规范库即可定位。');};
  document.querySelector('.skip-main').onclick=e=>{e.preventDefault();$('main-view').focus();};
  $('copy-registration').onclick=()=>copy($('register-example').textContent,'已复制登记示例。');
  $('copy-params').onclick=()=>copy($('ref-json').textContent,'已复制预设参数。');
  $('copy-rules').onclick=()=>copy([story.name,story.description,...details(story)].join('\n'),'已复制使用规范。');
  $('download').onclick=()=>{
    if(story.kind==='web')OPCFiles.save('星启OPC-'+story.name+'-'+theme+'.html',OPCFiles.web(story.key,story.name,webProps(),theme));
    else if(story.kind==='foundation'){
      const j=OPCFiles.json;
      const run='const host=document.getElementById("demo"),s='+j(story)+';const heading=document.createElement("h1");heading.textContent=s.name;host.append(heading);const body=document.createElement("section");host.append(body);OPCFoundations.render(body,s,'+j(tokens)+','+j(theme)+','+j(options.variant)+','+j(story.key==='imagery'&&options.variant==='scene'?document.querySelector('.exhibit img').src:'')+');for(const rule of s.rules){const p=document.createElement("p");p.textContent=rule;host.append(p);}';
      OPCFiles.save('星启OPC-'+story.name+'-'+theme+'.html',OPCFiles.html(story.name,theme,['system-style','foundation-style'],['inline-assets','kit-script','foundation-script'],run));
    }else{clock?.pause();instance.download();}
    notify('已生成独立 HTML。');
  };
  $('edit').onclick=()=>{
    clock?.pause();
    if(story.kind==='web'){$('props').value=JSON.stringify(webProps(),null,2);$('edit-title').textContent='编辑'+story.name;$('edit-status').textContent='';$('edit-dialog').showModal();return;}
    document.body.classList.add('editing-media');pendingEdit=true;
    const finish=()=>{document.body.classList.remove('editing-media');pendingEdit=false;if(story?.frames&&instance?.loaded)setupClock();$('edit').focus({preventScroll:true});};
    if(!instance.edit(finish))finish();
  };
  $('apply-props').onclick=()=>{try{const props=JSON.parse($('props').value);OPCFiles.checkProps(story.key,props);const next=OPC.create(story.key,props);sample.replaceChildren(next);drafts.set(story.id+'?'+options.variant,props);$('edit-dialog').close();notify('参数已应用。下载 HTML 可保存这次修改。');}catch(error){$('edit-status').textContent=error.message;}};
  $('reset-props').onclick=()=>{$('props').value=JSON.stringify({...story.props,...(story.variants.find(v=>v.id===options.variant)?.props||{})},null,2);$('edit-status').textContent='已填入当前变体的默认值。';};
  $('play').onclick=()=>clock?.toggle();$('seek').oninput=()=>clock?.seek(Number($('seek').value));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clock?.pause();});
  window.addEventListener('hashchange',()=>routeTo(true));
  document.querySelector('[data-logo]').append(OPC.create('brand'));applyTheme();fillHome();routeTo();
})();
