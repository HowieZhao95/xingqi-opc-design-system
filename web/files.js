window.OPCFiles=(()=>{
'use strict';
function checkProps(kind,props){
 if(!props||typeof props!=='object'||Array.isArray(props))throw Error('请输入 JSON 对象。');
 if(['steps','tiers'].includes(kind)&&(!Array.isArray(props.items)||!props.items.length||props.items.some(i=>!i||typeof i.title!=='string'||typeof i.note!=='string')))throw Error('items 需要包含 title 和 note。');
 if(kind==='tiers'&&props.items.length>3)throw Error('架构最多三层。');
 if(kind==='comparison'&&(!Array.isArray(props.rows)||!props.rows.length||props.rows.some(r=>!r||typeof r.label!=='string'||!Number.isInteger(r.orders)||!Number.isInteger(r.visitors)||r.orders<0||r.visitors<0||r.orders>r.visitors)))throw Error('填写组名及非负的整数人数，下单人数应小于或等于访客数。');
 if(kind==='table'&&(!Array.isArray(props.rows)||!Array.isArray(props.headers)||props.rows.some(row=>!Array.isArray(row)||row.length!==props.headers.length)))throw Error('表格各行应与表头列数相同。');
}

  const json=value=>JSON.stringify(value).replaceAll('<','\\u003c');
  function html(title,theme,styles,scripts,run) {
    const doc=document.implementation.createHTMLDocument(title+' · 星启 OPC');
    doc.documentElement.lang='zh-CN';doc.documentElement.className='opc';doc.documentElement.dataset.theme=theme;
    const charset=doc.createElement('meta');charset.setAttribute('charset','utf-8');doc.head.prepend(charset);
    const view=doc.createElement('meta');view.name='viewport';view.content='width=device-width,initial-scale=1';doc.head.append(view);
    for(const id of styles)doc.head.append(document.getElementById(id).cloneNode(true));
    const base=doc.createElement('style');base.textContent='body{margin:0;padding:clamp(16px,5vw,70px)}main{max-width:960px;margin:auto}';doc.head.append(base);
    const main=doc.createElement('main');main.id='demo';doc.body.append(main);
    for(const id of scripts)doc.body.append(document.getElementById(id).cloneNode(true));
    const app=doc.createElement('script');app.textContent=run;doc.body.append(app);
    return '<!doctype html>\n'+doc.documentElement.outerHTML;
  }
  function web(kind,name,props,theme) {
    checkProps(kind,props);
    return html(name,theme,['system-style'],['inline-assets','kit-script'],'document.getElementById("demo").append(OPC.create('+json(kind)+','+json(props)+'));');
  }
  function save(name,content) {
    const url=URL.createObjectURL(new Blob([content],{type:'text/html;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  return Object.freeze({checkProps,html,web,save,json});
})();
