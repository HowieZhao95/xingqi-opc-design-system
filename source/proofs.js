/* Shared vector artwork. A and B keep their identity across canvas size, theme and motion. */
(() => {
  const ns = "http://www.w3.org/2000/svg";
  let instance = 0;
  function draw(parent, tag, attrs, value) {
    const element = document.createElementNS(ns, tag);
    for (const [key, val] of Object.entries(attrs)) element.setAttribute(key, val);
    if (value !== undefined) element.textContent = String(value);
    if (parent) parent.append(element);
    return element;
  }
  function caption(group, x, y, value, size, family, align = "start") {
    return draw(group, "text", {x,y,fill:"currentColor","font-family":family+",OPCSans,sans-serif","font-size":size,"text-anchor":align}, value);
  }
  function rosette(group, x, y) {
    // Offset guilloché loops share a centre. Only the print turns, never the brand or data labels.
    const emblem=draw(group,"g",{transform:"translate("+x+" "+y+")",fill:"none",stroke:"currentColor","stroke-linecap":"round"});
    const points=[];
    for(let i=0;i<=240;i++){
      const a=i*Math.PI/120;
      const r=82+18*Math.cos(3*a+.35);
      points.push((i?"L":"M")+(r*Math.cos(a)).toFixed(2)+" "+(r*.90*Math.sin(a)).toFixed(2));
    }
    const line=points.join(" ")+" Z";
    for(let i=0;i<15;i++)draw(emblem,"path",{d:line,transform:"rotate("+(-38+i*4.6)+")","stroke-width":i%4===0?1.65:.9,opacity:.64+i*.019});
    draw(emblem,"circle",{cx:0,cy:0,r:15,fill:"currentColor",stroke:"none"});
  }
  function waves(group, x, y) {
    const g=draw(group,"g",{transform:"translate("+x+" "+y+")",fill:"none",stroke:"currentColor","stroke-linecap":"round"});
    for(let i=0;i<17;i++){
      const path=[];
      for(let j=0;j<=96;j++){
        const t=j/96;
        const dy=28*Math.sin(t*Math.PI*2.15+i*.13)+17*Math.sin(t*Math.PI*1.7-i*.10);
        path.push((j?"L":"M")+(t*201).toFixed(2)+" "+(dy+i*5.6).toFixed(2));
      }
      draw(g,"path",{d:path.join(" "),"stroke-width":i%4===0?2.7:1.4,opacity:.68+i*.018});
    }
  }
  function pair(rows=[{id:"A",buyers:8,visitors:40},{id:"B",buyers:12,visitors:120}]) {
    const key="opc-proof-"+(++instance)+"-";
    const svg=draw(null,"svg",{viewBox:"0 0 600 550",preserveAspectRatio:"xMidYMid meet","aria-hidden":"true",focusable:"false",class:"opc-proof-pair"});
    const defs=draw(svg,"defs",{});
    for(const [tone,stops] of [["a",["#B7FAEB","#79E1D7","#67C9C7"]],["b",["#E3DAFF","#B7A4FA","#A598E6"]]]){
      const grad=draw(defs,"linearGradient",{id:key+tone,x1:"0%",y1:"0%",x2:"98%",y2:"100%"});
      stops.forEach((color,i)=>draw(grad,"stop",{offset:i*50+"%","stop-color":color}));
    }
    const shadow=draw(defs,"filter",{id:key+"shadow",x:"-35%",y:"-30%",width:"175%",height:"180%",'color-interpolation-filters':"sRGB"});
    draw(shadow,"feDropShadow",{dx:1,dy:11,stdDeviation:7,'flood-color':"#0B1529",'flood-opacity':.16});
    for(const index of [1,0]){
      const front=index===0,row=rows[index]||{};
      const frame=draw(svg,"g",{"data-paper":front?"front":"back"});
      const paper=draw(frame,"g",{transform:front?"translate(65 178) rotate(-10 145 157)":"translate(293 49) rotate(12 125 151)",color:front?"#133E46":"#35254F"});
      const w=front?282:252,h=front?333:310,rad=front?34:33;
      draw(paper,"rect",{x:0,y:0,width:w,height:h,rx:rad,fill:"url(#"+key+(front?"a":"b")+")",filter:"url(#"+key+"shadow)"});
      draw(paper,"rect",{x:2,y:2,width:w-4,height:h-4,rx:rad-1,fill:"none",stroke:"#FFFFFF","stroke-opacity":.42,"stroke-width":1.5});
      caption(paper,22,52,row.id||String.fromCharCode(65+index),36,"OPCNumber");
      if(front){
        rosette(paper,140,166);
        draw(paper,"line",{x1:24,x2:w-24,y1:262,y2:262,stroke:"currentColor",opacity:.28,"stroke-linecap":"round"});
        caption(paper,23,295,String(row.buyers)+" / "+String(row.visitors),22,"OPCMono");
        caption(paper,w-22,294,"下单 / 访客",13,"OPCSans","end");
      }else{
        caption(paper,w-19,44,String(row.buyers)+" / "+String(row.visitors),18,"OPCMono","end");
        waves(paper,24,124);
        draw(paper,"circle",{cx:207,cy:259,r:11,fill:"#FFC795"});
      }
    }
    return svg;
  }
  window.OPCProofs=Object.freeze({pair});
})();
