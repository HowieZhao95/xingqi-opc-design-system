/* Browser API: OPCMotion.mount(stage, {plan, theme, format}).seekFrame(frame). */
(() => {
  'use strict';
  const A = window.OPC_ASSETS;
  const NS = 'http://www.w3.org/2000/svg';
  const font = {display:'OPCDisplay, PingFang SC, sans-serif',body:'OPCSans, PingFang SC, sans-serif',number:'OPCNumber, sans-serif',mono:'OPCMono, monospace'};
  const color = name => 'var(--' + name + ')';
  const faces = document.createElement('style');
  faces.textContent = Object.entries(A.fonts).map(([name,url]) =>
    '@font-face{font-family:'+name+';src:url('+url+') format("woff2");font-display:block}').join('\n');
  faces.dataset.opcFonts='';
  document.head.appendChild(faces);

  function svg(tag, attrs, parent) {
    const node = document.createElementNS(NS,tag);
    for (const [key,value] of Object.entries(attrs || {})) node.setAttribute(key,value);
    if (parent) parent.appendChild(node);
    return node;
  }
  const group = (parent,id) => svg('g',id ? {id} : {},parent);
  const rect = (g,x,y,width,height,fill,r=height/2) => svg('rect',{x,y,width,height,rx:r,ry:r,fill:color(fill)},g);
  const rule = (g,x1,y1,x2,y2,stroke='line',w=2) => svg('line',{x1,y1,x2,y2,stroke:color(stroke),'stroke-width':w,'stroke-linecap':'round'},g);
  function label(g,x,y,content,size,face='body',ink='ink',anchor='start') {
    const el = svg('text',{x,y,'font-size':size,'font-family':font[face],fill:color(ink),'text-anchor':anchor},g);
    el.textContent = content;
    return el;
  }
  function fitted(labelEl, limit) {
    const natural = labelEl.getComputedTextLength();
    if (natural > limit && natural > 0) labelEl.setAttribute('font-size',Number(labelEl.getAttribute('font-size')) * limit/natural);
  }
  function eyebrow(g,x,y,caption) {
    rule(g,x,y-10,x+66,y-10,'cyan',5);
    label(g,x+86,y,caption,30,'body','muted');
  }

  function motif(ctx,group,bounds) {
    const [x,y,right,bottom]=bounds;
    const art=OPCProofs.pair(ctx.data);
    for (const [key,val] of Object.entries({x,y,width:right-x,height:bottom-y})) art.setAttribute(key,val);
    group.append(art);
  }
  function titleIn(ctx,scene) {
    const g=group(ctx.canvas,ctx.key+'-title');
    const p=scene.component.props, layout=ctx.layout.title;
    const [x,y]=layout.anchor;
    eyebrow(g,x,ctx.portrait?y-75:y-60,p.eyebrow);
    p.text.forEach((line,i)=>{
      const el=label(g,x,y+layout.fontPx*(i*1.13+0.85),'',layout.fontPx,'display');
      const pieces=p.accent ? line.split(p.accent) : [line];
      pieces.forEach((piece,k)=>{
        if (k) svg('tspan',{fill:color('cyan')},el).textContent=p.accent;
        svg('tspan',{},el).textContent=piece;
      });
      ctx.fitters.push(()=>fitted(el,ctx.portrait?845:1020));
    });
    motif(ctx,g,layout.motifBounds);
    return {g};
  }
  function stepIn(ctx,scene) {
    const g=group(ctx.canvas,ctx.key+'-steps');
    const p=scene.component.props, l=ctx.layout.steps;
    const [x,y]=l.anchor;
    eyebrow(g,x,y-56,ctx.sample);
    const heading=label(g,x,y+l.titleFontPx,p.title,l.titleFontPx,'display');
    ctx.fitters.push(()=>fitted(heading,ctx.portrait?842:1600));
    const items=p.items.map((s,i)=>{
      const item=group(g);
      const dx=ctx.portrait?l.stackX:l.columnStarts[i];
      const dy=ctx.portrait?l.stackY[i]:l.rowY;
      const accent=i===p.active?'cyan':'muted';
      const edge=ctx.portrait?842:493;
      rule(item,dx,dy,dx+edge,dy,i===p.active?'cyan':'strong',3);
      const numberBaseline=dy+(ctx.portrait?92:95);
      if(i===p.active){
        const pill=rect(item,dx,numberBaseline-59,123,74,'cyan',36);
        pill.setAttribute('transform','rotate(-3 '+(dx+61)+' '+(numberBaseline-20)+')');
        label(item,dx+61,numberBaseline-4,String(i+1).padStart(2,'0'),48,'number','onAccent','middle');
      } else label(item,dx,numberBaseline,String(i+1).padStart(2,'0'),ctx.portrait?62:70,'number',accent);
      const text=label(item,ctx.portrait?dx+165:dx,dy+(ctx.portrait?92:190),s,ctx.portrait?52:54,'display');
      ctx.fitters.push(()=>fitted(text,ctx.portrait?652:edge));
      return item;
    });
    return {g,items};
  }
  function compareBars(ctx,scene) {
    const g=group(ctx.canvas,ctx.key+'-chart');
    const p=scene.component.props, l=ctx.layout.chart, [x,y]=l.heading;
    const [min,max]=p.domain;
    if (min!==0 || !Number.isFinite(max) || max<=0) throw new Error('条形刻度必须从 0 开始，且上限大于 0。');
    eyebrow(g,x,y-24,ctx.sample);
    const title=label(g,x,y+(ctx.portrait?84:104),scene.text,ctx.portrait?74:86,'display');
    ctx.fitters.push(()=>fitted(title,ctx.portrait?842:1600));
    const {trackX,trackWidth,trackCentersY,railHeight}=l;
    const scale = pct => trackX+trackWidth*pct/max;
    const fills=ctx.data.map((row,i)=>{
      if (!(Number.isInteger(row.buyers) && Number.isInteger(row.visitors) && row.visitors>0 && row.buyers>=0 && row.buyers<=row.visitors)) throw new Error('访客人数须为正整数，下单人数须在 0 至访客人数之间。');
      const rate=row.buyers/row.visitors*100;
      if(rate>max) throw new Error('数据超过条形刻度上限，请调高 domain。');
      const cy=trackCentersY[i], active=row.id===p.emphasis;
      const ly=ctx.portrait?l.labelTopY[i]:cy-6;
      const rowName=ctx.plan.content.labels[i] || row.id;
      const name=label(g,l.rowLabelX,ly,rowName,ctx.portrait?59:55,'display');
      const desc=p.format.replaceAll('{buyers}',row.buyers).replaceAll('{visitors}',row.visitors);
      const text=label(g,l.rowLabelX,ly+(ctx.portrait?76:63),desc,ctx.portrait?36:32,'body','muted');
      ctx.fitters.push(()=>{fitted(name,ctx.portrait?510:500); fitted(text,ctx.portrait?820:500)});
      label(g,trackX+trackWidth,ctx.portrait?ly:cy-32,Number(rate.toFixed(1))+'%',ctx.portrait?66:62,'number',active?'cyan':'muted','end');
      rect(g,trackX,cy-railHeight/2,trackWidth,railHeight,'line');
      const fill=rect(g,trackX,cy-railHeight/2,trackWidth*rate/max,railHeight,active?'cyan':'muted');
      return {el:fill,width:trackWidth*rate/max};
    });
    const yAxis=l.axisY;
    rule(g,trackX,yAxis,trackX+trackWidth,yAxis,'strong',2);
    const ticks=ctx.plan.customize.ticks_pct, labels=ctx.plan.customize.label_ticks_pct;
    for (const t of ticks.filter(t=>t>=min && t<=max)) {
      const isLabel=labels.includes(t);
      rule(g,scale(t),yAxis,scale(t),yAxis+(isLabel?14:8),'strong',2);
      if (isLabel) label(g,scale(t),yAxis+49,t+'%',ctx.portrait?23:25,'mono','muted',t===0?'start':t===max?'end':'middle');
    }
    label(g,ctx.portrait?x:trackX,ctx.portrait?l.labelTopY[0]-109:trackCentersY[0]-108,p.axis,30,'body','muted');
    return {g,fills};
  }
  function lowerThird(ctx,scene) {
    const g=group(ctx.canvas,ctx.key+'-caption'), l=ctx.layout.caption;
    const [x,y]=l.anchor, p=scene.component.props;
    rule(g,x,y+9,x+66,y+9,'cyan',6);
    const lines=p.text.split('\n').slice(0,p.maxLines);
    lines.forEach((line,i)=>{
      const text=label(g,x,y+88+i*l.fontPx*1.18,line,l.fontPx,'display');
      ctx.fitters.push(()=>fitted(text,l.maxWidth));
    });
    return {g};
  }
  function logoOut(ctx,scene) {
    const g=group(ctx.canvas,ctx.key+'-lockup'), l=ctx.layout.lockup;
    const p=scene.component.props, width=p.width ?? l.width;
    const [cx,cy]=p.center || l.center; const h=width*0.3;
    svg('image',{href:A.logos[ctx.theme],x:cx-width/2,y:cy-h/2,width,height:h,preserveAspectRatio:'xMidYMid meet'},g);
    return {g};
  }
  function cubicEase([x1,y1,x2,y2]) {
    const cubic=(p1,p2,t)=>3*(1-t)*(1-t)*t*p1+3*(1-t)*t*t*p2+t*t*t;
    return x=>{
      if (x<=0 || x>=1) return x;
      let low=0,high=1;
      for(let i=0;i<14;i++){
        const t=(low+high)/2;
        if(cubic(x1,x2,t)<x) low=t; else high=t;
      }
      return cubic(y1,y2,(low+high)/2);
    };
  }
  function mount(stage,options={}) {
    const plan=options.plan || A.plan;
    const theme=options.theme || 'dark', format=options.format || 'wide';
    const size=plan.variants.formats.find(f=>f.id===format);
    if (!size || !A.tokens.themes[theme]) throw new Error('未找到主题或画幅。');
    if (plan.content.data.length!==2) throw new Error('比较条模板需要两组数据。');
    const fps=plan.fps;
    const only=options.component;
    const scenes=plan.content.scenes.filter(s=>!only || s.component.name===only);
    if (!scenes.length) throw new Error('未知的组件名称。');
    const sourceStart=only?scenes[0].frames[0]:0;
    const frames=only?scenes[0].frames[1]-sourceStart:plan.total_frames;
    const clear=options.transparent && only==='LowerThird';
    const tr=window.__timelines ||= {};
    const key=stage.dataset.compositionId || 'opc-motion';
    let clip=stage.querySelector('.clip');
    if (!clip) {clip=document.createElement('div'); clip.id=key+'-track'; clip.className='clip'; stage.appendChild(clip);}
    clip.replaceChildren();
    Object.assign(stage.style,{width:size.w+'px',height:size.h+'px',background:clear?'transparent':A.tokens.themes[theme].bg});
    Object.assign(stage.dataset,{width:size.w,height:size.h,fps,duration:frames/fps,compositionId:key,start:'0'});
    Object.assign(clip.dataset,{duration:frames/fps,start:'0',trackIndex:'0'});
    for (const [k,v] of Object.entries(A.tokens.themes[theme])) stage.style.setProperty('--'+k,v);
    const canvas=svg('svg',{width:size.w,height:size.h,viewBox:'0 0 '+size.w+' '+size.h,role:'img','aria-label':plan.content.headline},clip);
    if (!clear) rect(canvas,0,0,size.w,size.h,'bg',0);
    const ctx={canvas,plan,key,data:plan.content.data,sample:plan.content.sample_label,layout:plan.layout[format],theme,portrait:format==='portrait',fitters:[]};
    const builders={TitleIn:titleIn,StepIn:stepIn,CompareBars:compareBars,LowerThird:lowerThird,LogoOut:logoOut};
    const components=scenes.map(scene=>({...builders[scene.component.name](ctx,scene),scene}));
    const {entryFrames:enter,exitFrames:exit,staggerFrames:stagger}=plan.animation;
    const ease=cubicEase(plan.animation.ease);
    const progress=(frame,start,length)=>Math.max(0,Math.min(1,(frame-start)/length));
    const back=(p,amount)=>1+(amount+1)*(p-1)**3+amount*(p-1)**2;
    const caption=components.find(item=>item.scene.component.name==='LowerThird');
    const shots=components.map(c=>{
      const kind=c.scene.component.name;
      const [a,b]=c.scene.frames;
      const end=kind==='CompareBars'?(only?Infinity:caption?.scene.frames[1]??b):kind==='LogoOut'?Infinity:b;
      const papers=[...c.g.querySelectorAll('[data-paper]')];
      return {...c,start:a-sourceStart,end:end-sourceStart,papers,
        offset:kind==='LogoOut'||kind==='CompareBars'?0:24};
    });
    function draw(frame){
      for(const shot of shots){
        const reveal=ease(progress(frame,shot.start,enter));
        const leave=progress(frame,shot.end-exit,exit);
        shot.g.setAttribute('opacity',reveal*(1-leave**2));
        shot.g.setAttribute('transform','translate(0 '+(shot.offset*(1-reveal))+')');
        shot.papers.forEach((paper,i)=>{
          const p=1-back(progress(frame,shot.start+i*2,enter+3),.85);
          paper.setAttribute('transform',i?`translate(0 ${15*p}) rotate(${4*p} 206 342)`:`translate(0 ${8*p}) rotate(${-5*p} 414 195)`);
        });
        shot.items?.forEach((item,i)=>{
          const p=back(progress(frame,shot.start+i*stagger,enter),1.05);
          item.setAttribute('opacity',Math.min(1,p));
          item.setAttribute('transform','translate(0 '+(22*(1-p))+')');
        });
        shot.fills?.forEach(({el,width})=>el.setAttribute('width',width*reveal));
      }
    }
    const ready=Promise.all(Object.keys(A.fonts).map(f=>document.fonts.load('30px '+f))).then(()=>{
      ctx.fitters.forEach(fn=>fn());
    });
    function seekFrame(f){
      const frame=Math.max(0,Math.min(frames-1,Math.round(f)||0));
      draw(frame);
      return frame;
    }
    const timeline={
      seek(seconds){seekFrame(seconds*fps);return this;},
      time(seconds){return this.seek(seconds);},
      duration(){return frames/fps;}
    };
    tr[key]=timeline;
    seekFrame(0);
    return {ready,seekFrame,timeline,frames,fps,size,theme,format};
  }
  function mountComponent(stage,name,props={},options={}) {
    const plan=structuredClone(options.plan || A.plan);
    const scene=plan.content.scenes.find(s=>s.component.name===name);
    if(!scene) throw new Error('未知的组件名称。');
    Object.assign(scene.component.props,props);
    if (options.data) plan.content.data=options.data;
    if (options.labels) plan.content.labels=options.labels;
    if (options.headline) scene.text=options.headline;
    return mount(stage,{...options,plan,component:name});
  }
  window.OPCMotion={mount,mountComponent};
})();
