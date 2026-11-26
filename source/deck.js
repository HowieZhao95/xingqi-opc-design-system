const slides = JSON.parse(document.querySelector('#slides-data').textContent);
const query = new URLSearchParams(window.OPC_PREVIEW_QUERY||location.search);
const stage = document.getElementById('stage');
const editor = document.getElementById('editor-dialog');
const directory = document.getElementById('directory');
const node = (tag, cls, str) => {const n=document.createElement(tag);if(cls)n.className=cls;if(str!=null)n.textContent=str;return n;};
const get=id=>document.getElementById(id);
const startKey=window.OPC_PREVIEW_SLIDE||decodeURIComponent(location.hash.slice(1));
let page=Math.max(0,slides.findIndex(p=>p.id===startKey)),shownAnswer=false;
if(query.get('embed')==='1')document.documentElement.classList.add('embed');
const requestedTheme=query.get('theme');
if(['dark','light'].includes(requestedTheme))OPC.setTheme(document.documentElement,requestedTheme);
function makePoster(){
  const art=node('div','print-art');
  const dataset=slides.find(s=>s.kind==='compare')?.chart?.rows;
  const rows=dataset?.map((r,i)=>({id:i===0?'A':'B',buyers:r.orders,visitors:r.visitors}));
  art.append(OPCProofs.pair(rows));return art;
}
function makeBody(d,index=page){
 const section=node('section','slide slide-inner');section.dataset.layout=d.kind;section.setAttribute('aria-label',d.label+'：'+d.title);
 const top=node('div','topline');top.append(OPC.create('brand'),node('small','','教学示例 / '+d.label));section.append(top);
 if(d.kind==='cover'||d.kind==='chapter'){
   const copy=node('div',d.kind==='cover'?'cover-type':'chapter');
   const h=node('h1','',d.title);h.append(node('span','',d.accent));
   copy.append(node('small','',d.tag),h,node('p','',d.body));section.append(copy);
   if(d.kind==='cover'){
     const a=node('div','cover-art');a.append(makePoster());section.append(a);
   }else{
     const mark=node('div','question-art');mark.setAttribute('aria-hidden','true');
     mark.append(node('span','','?'),node('i',''));section.append(mark);
   }
 }else{
   section.append(node('h1','body-title',d.title));
   const body=node('div','deck-content');
   if(d.kind==='summary'){
     body.classList.add('two');const facts=node('dl','facts');
     for(const [k,v] of d.facts){const row=node('div');row.append(node('dt','',k),node('dd','',v));facts.append(row);}
     body.append(OPC.create('metric',d.metric),facts);
   }else if(d.kind==='flow'){body.append(OPC.create('steps',{items:d.items}));}
   else if(d.kind==='architecture'){body.classList.add('two');body.append(node('p','takeaway',d.body),OPC.create('tiers',{items:d.items}));}
   else if(d.kind==='evidence'){
     body.classList.add('two');const q=node('div');q.append(node('p','statement',d.body));
     const cue=node('button','answer-cue',shownAnswer?'收起结论':'揭示结论');
     cue.type='button';cue.setAttribute('aria-expanded',String(shownAnswer));
     cue.onclick=()=>{shownAnswer=!shownAnswer;render();stage.querySelector('.answer-cue')?.focus({preventScroll:true});};
     q.append(cue);if(shownAnswer)q.append(node('p','answer',d.answer));
     const refs=node('div','evidence-list');d.records.forEach((record,i)=>{const quote=OPC.create('evidence',record);quote.classList.toggle('is-current',i===d.records.length-1);refs.append(quote);});
     body.append(q,refs);
   }else if(d.kind==='table'){
     body.append(OPC.create('table',{caption:d.caption,headers:d.headers,rows:d.rows}),node('p','table-note',d.body));
   }else if(d.kind==='compare'){
     body.classList.add('two');body.append(OPC.create('metric',d.metric),OPC.create('comparison',d.chart));
   }else if(d.kind==='action'){
     const list=node('div','action-list');d.items.forEach(({title,note})=>{const row=node('div');row.append(node('b','',title),node('p','',note));list.append(row);});
     body.append(node('h2','action-title',d.accent),list);
   }
   section.append(body);
 }
 const foot=node('footer','bottomline');foot.append(node('span','','星启 OPC'),node('span','',String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0')));section.append(foot);
 return section;
}
function render(){
 const d=slides[page];stage.replaceChildren(makeBody(d));
 get('position').textContent=(page+1)+' / '+slides.length+' · '+d.label;
 get('theme').textContent='切换'+(document.documentElement.dataset.theme==='dark'?'亮色':'深色');
 get('prev').disabled=page===0;get('next').disabled=page===slides.length-1;
 get('reveal').hidden=true;get('reveal').textContent=shownAnswer?'收起结论':'揭示结论';get('reveal').setAttribute('aria-pressed',String(shownAnswer));
 document.title=d.label+' · 星启 OPC 汇报模板';
}
function openDirectory(){
  const choices=get('choices');choices.replaceChildren();
  slides.forEach((d,i)=>{
    const tile=node('div','slide-tile');
    const thumb=node('div','deck-stage thumb');thumb.inert=true;thumb.setAttribute('aria-hidden','true');
    thumb.append(makeBody(d,i));
    const pick=node('button','slide-pick');pick.type='button';
    pick.append(node('span','pick-id',String(i+1).padStart(2,'0')),node('span','',d.label));
    pick.setAttribute('aria-label',String(i+1)+' '+d.label+' · '+d.title);
    if(i===page)pick.setAttribute('aria-current','page');
    pick.onclick=()=>{directory.close();go(i);};
    tile.append(thumb,pick);choices.append(tile);
  });
  directory.showModal();
  choices.querySelector('[aria-current=page]')?.focus({preventScroll:true});
}
function go(next){if(next<0||next>=slides.length||next===page)return;page=next;shownAnswer=false;render();try{history.replaceState(null,'','#'+slides[page].id);}catch{}}
function edit(){const d=slides[page];get('deck-params').value=JSON.stringify(d,null,2);get('notes').textContent=d.note;get('edit-title').textContent='编辑'+d.label;get('edit-status').textContent='';editor.showModal();}
function updated(){
 try{
   const change=JSON.parse(get('deck-params').value),original=slides[page];
   if(change.kind!==original.kind||change.id!==original.id)throw Error('保留本页的 id 和 kind。');
   if(!change.title||typeof change.title!=='string')throw Error('填写标题字符串。');
   for(const key of Object.keys(original))if(!(key in change))throw Error('缺少 '+key+' 字段。');
   if(change.kind==='architecture'&&change.items.length>3)throw Error('架构示例最多三层。');
   makeBody(change);slides[page]=change;render();return true;
 }catch(e){get('edit-status').textContent='请检查参数。'+e.message;return false;}
}
function save(file,html){
 const a=node('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function exportDeck(one){
 if(editor.open&&!updated())return;
 const clone=document.documentElement.cloneNode(true);
 clone.classList.remove('embed');clone.querySelector('body').classList.remove('project');
 clone.querySelector('#slides-data').textContent=JSON.stringify(one?[slides[page]]:slides).replace(/</g,'\\u003c');
 clone.querySelectorAll('dialog').forEach(d=>d.removeAttribute('open'));clone.querySelector('#stage').replaceChildren();clone.querySelector('#choices').replaceChildren();
 clone.querySelectorAll('[data-brand]').forEach(el=>el.replaceChildren());
 clone.querySelectorAll('.exit-show').forEach(el=>el.remove());
 clone.querySelector('#stage').classList.remove('show-grid');clone.querySelector('#grid').setAttribute('aria-pressed','false');
 save('星启OPC-'+(one?slides[page].label:'汇报稿')+'.html','<!doctype html>\n'+clone.outerHTML);
 get('edit-status').textContent='已导出可再次编辑的独立 HTML。';
}
get('theme').onclick=()=>{const light=document.documentElement.dataset.theme==='light';OPC.setTheme(document.documentElement,light?'dark':'light');render();};
get('prev').onclick=()=>go(page-1);get('next').onclick=()=>go(page+1);
get('overview').onclick=openDirectory;get('edit').onclick=edit;
get('apply').onclick=()=>{if(updated())editor.close();};get('export-one').onclick=()=>exportDeck(true);get('export-deck').onclick=()=>exportDeck(false);
get('reveal').onclick=()=>{shownAnswer=!shownAnswer;render();};
get('grid').onclick=()=>{const on=stage.classList.toggle('show-grid');get('grid').setAttribute('aria-pressed',String(on));};
get('full').onclick=async()=>{document.body.classList.add('project');try{await document.documentElement.requestFullscreen();}catch{}};
function exitShow(){document.body.classList.remove('project');if(document.fullscreenElement)document.exitFullscreen();}
const closeShow=node('button','exit-show','退出演示');closeShow.setAttribute('aria-label','退出全屏演示');document.body.append(closeShow);closeShow.onclick=exitShow;
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('project');});
document.addEventListener('keydown',event=>{
 if(document.querySelector('dialog[open]'))return;
 if(event.key==='Escape'){exitShow();return;}
 if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();go(page+1);}
 if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(page-1);}
 if(event.key==='Home'){event.preventDefault();go(0);}if(event.key==='End'){event.preventDefault();go(slides.length-1);}
 if(event.key.toLowerCase()==='r'&&slides[page].kind==='evidence'){shownAnswer=!shownAnswer;render();}
});
let touch=null;stage.addEventListener('touchstart',e=>touch=[e.changedTouches[0].clientX,e.changedTouches[0].clientY],{passive:true});
stage.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];if(Math.abs(dx)>48&&Math.abs(dx)>2*Math.abs(dy))go(page+(dx<0?1:-1));touch=null;},{passive:true});
document.querySelectorAll('[data-brand]').forEach(el=>el.replaceChildren(OPC.create('brand')));
document.querySelectorAll('.exit-show:not(:last-child)').forEach(el=>el.remove());
render();
