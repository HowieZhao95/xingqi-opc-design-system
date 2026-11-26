/* Deterministic, scene-independent HUD blocks. Coordinates in each local viewBox are
   mapped into landscape or portrait UHD by the sequencer. No bitmap footage is needed. */
window.XQHudBlocks=(()=>{
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  let instance=0;
  const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const span=(t,a,b)=>clamp((t-a)/(b-a));
  const ease=t=>1-(1-clamp(t))**3;
  const smooth=t=>(t=clamp(t),t*t*(3-2*t));
  const fix=n=>Number(n.toFixed(2));
  const point=(x,y)=>fix(x)+' '+fix(y);
  const pathOf=ps=>ps.map(([x,y],i)=>(i?'L':'M')+point(x,y)).join(' ');
  const collect=(n,fn)=>Array.from({length:n+1},(_,i)=>fn(i/n));
  const set=(el,props)=>{for(const [k,v] of Object.entries(props))el.setAttribute(k,v);return el;};
  function svg(parent,tag,props={},content){
    const el=document.createElementNS(NS,tag);set(el,props);
    if(content!==undefined)el.textContent=content;parent.append(el);return el;
  }
  const g=(p,role)=>svg(p,'g',role?{'data-graphic':role}:{});
  const box=(p,x,y,w,h,r,fill,more={})=>svg(p,'rect',{x,y,width:w,height:h,rx:r,ry:r,fill,...more});
  const circ=(p,x,y,r,fill,more={})=>svg(p,'circle',{cx:x,cy:y,r,fill,...more});
  const line=(p,x,y,ex,ey,col,w=2,more={})=>svg(p,'line',{x1:x,y1:y,x2:ex,y2:ey,stroke:col,'stroke-width':w,'stroke-linecap':'round',...more});
  const stroke=(p,d,col,w=2,more={})=>svg(p,'path',{d,fill:'none',stroke:col,'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round',...more});
  const txt=(p,x,y,s,size,col,cls='',extra={})=>svg(p,'text',{x,y,'font-size':size,fill:col,class:cls,...extra},s);
  const tmove=(el,x,y)=>el.setAttribute('transform','translate('+point(x,y)+')');
  const value=(el,v)=>{if(el.textContent!==String(v))el.textContent=v;};
  function polar(x,y,r,a){const t=(a-90)*Math.PI/180;return [x+r*Math.cos(t),y+r*Math.sin(t)];}
  function arc(x,y,r,a,b){return 'M'+point(...polar(x,y,r,a))+' A'+r+' '+r+' 0 '+(b-a>180?1:0)+' 1 '+point(...polar(x,y,r,b));}
  function ticks(p,x,y,r,a,b,count,col){
    const d=['',''];for(let i=0;i<=count;i++){const major=i%5===0,ang=mix(a,b,i/count);d[+major]+='M'+point(...polar(x,y,r-(major?13:6),ang))+'L'+point(...polar(x,y,r,ang));}
    stroke(p,d[0],col,1.5,{opacity:.56});stroke(p,d[1],col,2.5);
  }
  function gradient(ctx,stops,radial=false){
    const id=ctx.id+'-grad'+ctx.defs.children.length,el=svg(ctx.defs,radial?'radialGradient':'linearGradient',radial?{id,cx:'.47',cy:'.44',r:'.61'}:{id,x1:'0%',y1:'0%',x2:'100%',y2:'46%'});
    for(const [offset,col,alpha=1] of stops)svg(el,'stop',{offset,'stop-color':col,'stop-opacity':alpha});return 'url(#'+id+')';
  }
  function plate(ctx,p,x,y,w,h,r=23){return box(p,x,y,w,h,r,ctx.pal.glass,{stroke:ctx.pal.edge,'stroke-width':1.2});}
  const mono='h-mono',display='h-display',number='h-number';
  const end={'text-anchor':'end'},middle={'text-anchor':'middle'};
  const palette=ink=>ink==='day'?{beam:'#006E80',core:'#104554',purple:'#6250B5',amber:'#8F4D18',ink:'#152238',muted:'#435771',tick:'#62758C',edge:'#A7B6C9',glass:'rgba(251,253,255,.94)'}:ink==='ice'?{beam:'#DEFFFF',core:'#F3FFFF',purple:'#B5CAFF',amber:'#FFCB92',ink:'#F3FAFF',muted:'#B2CDD8',tick:'#87A6B4',edge:'#4A6D80',glass:'rgba(6,20,32,.87)'}:{beam:'#56F9DD',core:'#C5FFF2',purple:'#B09BFF',amber:'#FFBE7C',ink:'#F2FCFF',muted:'#B6D3DB',tick:'#719BA9',edge:'#385E6D',glass:'rgba(6,20,32,.87)'};
  const tones=c=>[c.beam,c.purple,c.amber];
  const printNum=v=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1,useGrouping:false}).format(Math.abs(v)<.00001?0:v);
  function sampleAt(seq,t){const at=clamp(t)*(seq.length-1),n=Math.floor(at);return mix(seq[n],seq[Math.min(n+1,seq.length-1)],at-n);}
  function frameline(p,x,y,width,c){
    line(p,x,y,x+width,y,c.edge,1.6);for(let i=0;i<=10;i++){const px=x+i*width/10;line(p,px,y+(i%5===0?-7:-3),px,y+3,c.tick,i%5===0?2.3:1.25);}
  }
  function makeTitle(ctx,props){
    const p=g(ctx.svg,'title'),c=ctx.pal;
    ctx.fit(txt(p,7,39,props.channel,21,c.beam,mono,{'letter-spacing':2}),401);
    const large=txt(p,3,153,props.title,97,c.ink,display);
    const sub=txt(p,7,215,props.subtitle,28,c.muted);
    const reveal=ctx.id+'-title'+ctx.defs.children.length,clip=svg(ctx.defs,'clipPath',{id:reveal}),crop=box(clip,0,52,548,132,9,'white');
    large.setAttribute('clip-path','url(#'+reveal+')');
    const scanner=line(p,0,69,0,158,c.core,3);const rail=line(p,6,249,502,249,c.edge,2);
    const tag=box(p,5,247,58,4,2,c.beam);
    const read=txt(p,525,37,'',18,c.beam,mono,end);
    ctx.fit(large,523);ctx.fit(sub,529);
    return {p,w:550,h:264,paint(s){
      const r=ease(s.enter);value(read,Math.round(s.progress*100)+'%');crop.setAttribute('width',fix(550*r));set(scanner,{x1:fix(548*r),x2:fix(548*r),opacity:1-r});
      set(sub,{opacity:fix(ease(span(s.enter,.28,1)))});set(tag,{width:fix(35+83*r)});rail.setAttribute('opacity','.68');
    }};
  }
  function surfaceBuilder(ctx,props){
    const p=g(ctx.svg,'surface'),c=ctx.pal,points=props.profile;
    const slices=props.sections;const first=points[0][0],last=points.at(-1)[0];
    const interpolate=(u,j)=>{
      const x=mix(first,last,clamp(u));let i=0;while(i<points.length-2&&points[i+1][0]<x)i++;
      const a=points[i],b=points[i+1],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+2)],dx=b[0]-a[0],t=clamp((x-a[0])/dx);
      const m=(b[j]-prev[j])/(b[0]-prev[0]),n=(next[j]-a[j])/(next[0]-a[0]);
      return (2*t**3-3*t*t+1)*a[j]+(t**3-2*t*t+t)*dx*m+(-2*t**3+3*t*t)*b[j]+(t**3-t*t)*dx*n;
    };
    // Projection of a folded optical foil: neighbouring ribs span a contour, with a second edge in depth.
    function at(u,v,depth=0){
      const x=58+u*778,yt=interpolate(u,1)*388+43,yb=interpolate(u,2)*388+43;
      return [x+16*Math.sin(Math.PI*v)+depth*mix(23,47,u),mix(yt,yb,v)-depth*(35+13*Math.sin(u*4))];
    }
    const contour=(v,depth=0)=>pathOf(collect(88,u=>at(u,v,depth)));
    const topFill=gradient(ctx,[['0%',c.beam,.80],['28%','#59B4BB',.46],['60%',c.purple,.60],['86%',c.purple,.75],['100%',c.amber,.54]]);
    const faceFill=gradient(ctx,[['0%','#0C817E',.48],['37%','#1C5C72',.37],['68%','#51458A',.49],['100%','#C29D7A',.43]]);
    const topPoly=pathOf([...collect(88,u=>at(u,0)),...collect(88,u=>at(1-u,0,1))])+' Z';
    svg(p,'path',{d:topPoly,fill:topFill});svg(p,'path',{d:pathOf([...collect(88,u=>at(u,0)),...collect(88,u=>at(1-u,1))])+' Z',fill:faceFill});
    const endFace=pathOf([at(1,0),at(1,0,1),at(1,1,1),at(1,1)])+' Z';svg(p,'path',{d:endFace,fill:c.purple,'fill-opacity':.26});
    for(const v of [0,.2,.4,.6,.8,1]){stroke(p,contour(v),v>.65?c.purple:c.beam,v===0||v===1?2.65:1.1,{opacity:v===0||v===1?.9:.62});}
    stroke(p,contour(0,1),c.core,1.9,{opacity:.85});
    for(const d of [.25,.55,.82])stroke(p,contour(0,d),c.core,1,{opacity:.41});
    stroke(p,contour(.61),c.purple,7,{opacity:.10});
    stroke(p,contour(.61),c.purple,1.7,{opacity:.74});
    let ribs='',seams='',diag='';for(let i=0;i<=slices;i++){
      const u=i/slices;ribs+=pathOf(collect(5,v=>at(u,v)))+' ';seams+=pathOf([at(u,0),at(u,0,1)])+' ';
      if(i<slices&&i%2===0)diag+=pathOf([at(u,.2),at((i+1)/slices,.6)])+' ';
      if(i%4===0)for(const v of [0,.6,1]){const [x,y]=at(u,v);circ(p,x,y,1.85,c.core);}
    }
    stroke(p,ribs,c.beam,1.25,{opacity:.80});stroke(p,seams,c.core,1.35,{opacity:.85});stroke(p,diag,c.purple,1,{opacity:.50});
    const active=stroke(p,contour(0),c.core,3.7,{pathLength:1,'stroke-dasharray':'1 1'});
    const sweepEcho=stroke(p,contour(0),c.beam,10,{pathLength:1,'stroke-dasharray':'.10 1',opacity:.16});
    // A transverse light sheet intersects the object and registers its footprint.
    const scan=g(p,'sweep-plane');const curtain=svg(scan,'path',{fill:gradient(ctx,[['0%',c.beam,0],['72%',c.beam,.10],['100%',c.core,.38]])});
    const edge=stroke(scan,'',c.core,1.45,{opacity:.83});
    const hoop=g(scan);
    for(const [rx,delta,col,width,opacity,dash] of [[30,0,c.beam,9,.12,'none'],[30,0,c.core,2.75,.97,'none'],[38,9,c.beam,1.4,.83,'4 8']]){
      svg(hoop,'ellipse',{cx:0,cy:0,rx,ry:98+delta,fill:'none',stroke:col,'stroke-width':width,opacity,'stroke-dasharray':dash});
    }
    line(hoop,0,-110,0,113,c.beam,10,{opacity:.11});line(hoop,0,-110,0,113,c.core,2.2);
    const foot=svg(scan,'ellipse',{rx:38,ry:7,fill:c.beam,'fill-opacity':.10,stroke:c.beam,'stroke-width':1.35});
    const id=txt(scan,0,0,'',18,c.core,mono);
    const bx=52,by=416,bw=818;frameline(p,bx,by,bw,c);
    ctx.fit(txt(p,bx,450,props.label,24,c.ink,display),220);
    const profileX=bx+235,profileWidth=312;
    const profileY=u=>443-(interpolate(u,2)-interpolate(u,1))*58;
    stroke(p,pathOf(collect(64,u=>[profileX+u*profileWidth,profileY(u)])),c.tick,1.5);
    const profileDot=circ(p,profileX,profileY(0),3.2,c.beam);
    txt(p,profileX+profileWidth+14,449,'ΔY',14,c.muted,mono);
    const strip=txt(p,bx+bw,450,'',19,c.muted,mono,end);
    return {p,w:925,h:466,at,paint(s){
      const u=s.progress,[x,top]=at(u,0),[,bottom]=at(u,1),floorY=by-15,fx=x+25;
      hoop.setAttribute('transform','translate('+point(x,(top+bottom)/2)+') rotate(-7) scale(1 '+fix((bottom-top+29)/196)+')');
      curtain.setAttribute('d',pathOf([[x-22,top-28],[x+10,top-35],[fx+39,floorY],[fx-34,floorY+2]])+' Z');
      edge.setAttribute('d',pathOf([[x+10,top-35],[fx+39,floorY]]));set(foot,{cx:fix(fx),cy:floorY});
      active.setAttribute('stroke-dashoffset',fix(1-u));
      sweepEcho.setAttribute('stroke-dashoffset',(.10-u).toFixed(4));
      set(profileDot,{cx:fix(profileX+u*profileWidth),cy:fix(profileY(u))});
      const k=1+Math.round((slices-1)*u);
      set(id,{x:fix(x-26),y:fix(top-40)});value(id,'S'+String(k).padStart(2,'0'));value(strip,k+' / '+slices);
    }};
  }
  function dialBuilder(ctx,props){
    const p=g(ctx.svg,'dial'),c=ctx.pal,x=200,y=193,r=145,lo=-137,hi=137;
    circ(p,x,y,r-7,gradient(ctx,ctx.light?[['0%','#FFFFFF',.96],['74%','#EDF3F7',.94],['100%','#DCE7EC',.9]]:[['0%','#071423',.89],['70%','#0A2330',.82],['100%','#132A37',.65]],true));
    stroke(p,arc(x,y,r,lo,hi),c.edge,7);const sweep=stroke(p,arc(x,y,r,lo,hi),c.beam,5.8,{pathLength:1,'stroke-dasharray':'1 1'});
    stroke(p,arc(x,y,r+10,lo+20,hi-8),c.tick,1.3);ticks(p,x,y,r-13,lo,hi,60,c.core);
    const quant=stroke(p,'',c.beam,4,{'stroke-dasharray':'2 9',opacity:.68});
    const tip=g(p);line(tip,0,-r-4,0,-r+18,c.ink,3.2);
    for(let i=0;i<=4;i++){const [xx,yy]=polar(x,y,r+24,mix(lo,hi,i/4));txt(p,xx,yy+5,printNum(mix(props.min,props.max,i/4)),14,c.muted,mono,middle);}
    ctx.fit(txt(p,x,y-34,props.label,25,c.muted,'',middle),186);
    const n=txt(p,x,y+32,'',64,c.ink,number,middle),unit=txt(p,x,y+67,props.unit,20,c.beam,mono,middle);
    ctx.fit(unit,130);
    const legend=txt(p,x,387,printNum(props.min)+' – '+printNum(props.max)+' '+props.unit,19,c.muted,mono,middle);
    ctx.fit(legend,343);
    return {p,w:400,h:405,paint(s){
      const val=mix(props.from,props.to,s.progress),rate=clamp((val-props.min)/(props.max-props.min)),a=mix(lo,hi,rate);
      sweep.setAttribute('stroke-dashoffset',fix(1-rate));quant.setAttribute('d',arc(x,y,r-31,lo,Math.max(lo+.1,a)));
      tip.setAttribute('transform','translate('+x+' '+y+') rotate('+fix(a)+')');value(n,printNum(Math.round(val*10)/10));
      n.setAttribute('font-size',Math.min(64,260/Math.max(1,n.textContent.length)));
    }};
  }
  function probeBuilder(ctx,props){
    const p=g(ctx.svg,'probe'),c=ctx.pal;const r=32,mark=g(p);
    circ(mark,0,0,r-3,ctx.light?'#E4F7F4':'#061522',{opacity:.55});
    const ring=g(mark);for(const [a,b] of [[-70,12],[45,136],[160,248]])stroke(ring,arc(0,0,r,a,b),c.beam,3.1);
    circ(mark,0,0,r-10,'none',{stroke:c.purple,'stroke-width':1.6,'stroke-dasharray':'2 6'});circ(mark,0,0,5,c.core);
    const lead=stroke(p,'',c.beam,2,{pathLength:1,'stroke-dasharray':'1 1'});
    const label=g(p);plate(ctx,label,0,0,243,85,20);
    ctx.fit(txt(label,17,31,props.tag,18,c.beam,mono),41);const name=txt(label,66,32,props.label,23,c.ink);ctx.fit(name,158);
    const reading=txt(label,17,67,'',25,c.ink,mono);
    return {p,w:600,h:335,paint(s){
      const [x,y]=s.anchor||[mix(props.start[0],props.end[0],s.progress)*600,mix(props.start[1],props.end[1],s.progress)*335];
      tmove(mark,x,y);value(reading,printNum(s.reading??props.value)+' '+(s.unit??props.unit));
      ring.setAttribute('transform','rotate('+fix(125*s.progress)+')');
      const right=s.anchor?x<300:x<335,lx=right?x+69:x-310,ly=s.anchor?y-112:clamp(y-103,0,248);
      const ex=right?lx:lx+243,ey=ly+52,sign=right?1:-1;
      lead.setAttribute('d','M'+point(x+sign*22,y-22)+' Q'+point(x+sign*43,y-52)+' '+point(ex-sign*20,ey)+' L'+point(ex,ey));
      lead.setAttribute('stroke-dashoffset',fix(1-ease(span(s.enter,.18,.85))));tmove(label,lx,ly);label.setAttribute('opacity',fix(ease(span(s.enter,.40,1))));
    }};
  }
  function traceBuilder(ctx,props){
    const p=g(ctx.svg,'trace'),c=ctx.pal;
    function scalePoint([x,y]){return [54+x*746,32+y*218];}
    const guide=stroke(p,'',c.tick,1.5,{'stroke-dasharray':'3 9',opacity:.85});
    const ink=stroke(p,'',c.beam,3.8,{pathLength:1,'stroke-dasharray':'1 1'});
    const trails=Array.from({length:6},(_,i)=>circ(p,0,0,6-i*.76,i?c.beam:c.core,{opacity:1-i*.12}));
    const ring=svg(p,'ellipse',{cx:0,cy:0,rx:16,ry:16,fill:'none',stroke:c.beam,'stroke-width':1.5});
    const knots=props.points.map((_,i)=>circ(p,0,0,4,c.glass,{stroke:i===props.points.length-1?c.amber:c.beam,'stroke-width':2}));
    let length;
    function bind(project){
      const linePoints=[];
      props.points.forEach((a,i)=>{
        const [x,y]=project(a);set(knots[i],{cx:fix(x),cy:fix(y)});
        if(!i){linePoints.push([x,y]);return;}
        const b=props.points[i-1];
        for(let j=1;j<=24;j++){
          const t=j/24;
          linePoints.push(project([mix(b[0],a[0],t),mix(b[1],a[1],smooth(t))]));
        }
      });
      const d=pathOf(linePoints);ink.setAttribute('d',d);guide.setAttribute('d',d);length=ink.getTotalLength();
    }
    bind(scalePoint);
    function headAt(u){const q=ink.getPointAtLength(length*clamp(u));return [q.x,q.y];}
    ctx.fit(txt(p,55,292,props.source,24,c.muted),181);ctx.fit(txt(p,800,292,props.destination,24,c.muted,'',end),181);
    const code=txt(p,425,292,props.label,27,c.ink,display,middle);
    ctx.fit(code,325);
    return {p,w:864,h:324,bind,headAt,paint(s){
      const u=s.progress;ink.setAttribute('stroke-dashoffset',fix(1-u));trails.forEach((n,i)=>{const t=ink.getPointAtLength(Math.max(0,length*u-i*12));set(n,{cx:fix(t.x),cy:fix(t.y)});});
      const head=ink.getPointAtLength(length*u);set(ring,{cx:fix(head.x),cy:fix(head.y),rx:fix(11+8*u),ry:fix(11+8*u)});
    }};
  }
  function plotBuilder(ctx,props){
    const p=g(ctx.svg,'plot'),c=ctx.pal;const x=90,y=102,w=542,h=192;
    plate(ctx,p,4,4,669,411,28);const head=txt(p,31,59,props.label,36,c.ink,display);ctx.fit(head,380);
    ctx.fit(txt(p,31,84,props.provenance,16,c.muted),362);
    const clock=txt(p,637,56,'',21,c.beam,mono,end);
    const xs=u=>x+w*u,ys=v=>y+h*(1-v/props.max);
    [0,.5,1].forEach(k=>{const yy=ys(k*props.max);line(p,x,yy,x+w,yy,c.edge,1.3,{'stroke-dasharray':k?'3 7':'none'});txt(p,x-14,yy+6,printNum(k*props.max),18,c.muted,mono,end);});
    [0,.25,.5,.75,1].forEach(k=>{line(p,xs(k),y,xs(k),y+h,c.edge,1,{opacity:.55});if(k===0||k===.5||k===1)txt(p,xs(k),y+h+27,printNum(props.sampleSeconds*k)+'s',18,c.muted,mono,middle);});
    const charts=props.series.map((r,i)=>{const col=tones(c)[i],trace=stroke(p,'',col,3.5);const dot=circ(p,x,y,5,col);const colX=32+i*211;
      line(p,colX,367,colX+21,367,col,4);const n=txt(p,colX+31,374,r.name,21,c.ink);ctx.fit(n,105);const v=txt(p,colX+192,374,'',21,col,mono,end);
      return {trace,dot,v};});
    const cursor=line(p,x,y,x,y+h,c.core,1.3,{'stroke-dasharray':'4 5'});
    return {p,w:678,h:420,paint(s){
      const u=s.progress;value(clock,printNum(u*props.sampleSeconds)+' s  /  '+props.unit);set(cursor,{x1:fix(xs(u)),x2:fix(xs(u))});
      charts.forEach(({trace,dot,v},i)=>{const vals=props.series[i].values,points=[];
        for(let j=0;j<vals.length;j++){const at=j/(vals.length-1);if(at>u)break;points.push([xs(at),ys(vals[j])]);}
        const actual=sampleAt(vals,u);points.push([xs(u),ys(actual)]);trace.setAttribute('d',pathOf(points));set(dot,{cx:fix(xs(u)),cy:fix(ys(actual))});value(v,printNum(actual));});
    }};
  }
  function bandBuilder(ctx,props){
    const p=g(ctx.svg,'band'),c=ctx.pal,vert=ctx.portrait,w=vert?540:1210,h=vert?296:120;
    plate(ctx,p,3,3,w-6,h-6,vert?22:30);
    ctx.fit(txt(p,26,vert?42:49,props.label,25,c.ink,display),vert?420:171);
    ctx.fit(txt(p,26,vert?69:82,props.provenance+' / '+props.unit,17,c.muted,mono),vert?404:177);
    const entries=props.series.map((row,i)=>{
      const x=vert?29:233+i*326, top=vert?99+i*72:23, col=tones(c)[i];
      if(vert)line(p,26,top-14,w-24,top-14,c.edge,1);else line(p,x-19,top+6,x-19,top+65,c.edge,1);
      circ(p,x+4,top+10,4,col);const caption=txt(p,x+16,top+19,row.name,22,c.muted);ctx.fit(caption,130);
      const reading=txt(p,vert?260:x+4,vert?top+29:top+62,'',vert?32:34,col,number,vert?end:{});
      const sx=vert?330:x+161,sw=vert?160:111,sy=vert?top+38:top+63,hh=vert?43:47;
      const xy=(u,v)=>[sx+sw*u,sy-hh*v/props.max];
      const ref=pathOf(row.values.map((v,k)=>xy(k/(row.values.length-1),v)));stroke(p,ref,col,1.7,{opacity:.36});
      const dot=circ(p,sx,sy,4,col);return {reading,dot,xy};
    });
    return {p,w,h,paint(s){entries.forEach(({reading,dot,xy},i)=>{const v=sampleAt(props.series[i].values,s.progress);value(reading,printNum(v));const [x,y]=xy(s.progress,v);set(dot,{cx:fix(x),cy:fix(y)});});}};
  }
  function sealBuilder(ctx,props){
    const p=g(ctx.svg,'seal'),c=ctx.pal,x=393;
    const halo=g(p,'completion-arcs');
    for(const [r,a,b,col] of [[188,-136,-70,c.beam],[188,44,108,c.purple],[201,-103,-57,c.tick],[201,79,122,c.tick]])stroke(halo,arc(x,170,r,a,b),col,2.1,{opacity:.78});
    const logo=svg(p,'image',{x:x-161,y:125,width:322,height:96.6,href:ctx.logos[ctx.light?'dark':'white'],preserveAspectRatio:'xMidYMid meet','aria-label':'星启 OPC · AI+社群'});
    const heading=txt(p,x,340,props.label,36,c.ink,display,middle);
    const note=txt(p,x,388,props.detail+'   /   '+String(props.count).padStart(2,'0'),23,c.muted,'',middle);
    ctx.fit(heading,635);ctx.fit(note,700);
    return {p,w:786,h:409,paint(s){
      halo.setAttribute('transform','rotate('+fix((1-ease(s.enter))*18)+' '+x+' 170)');
      logo.setAttribute('opacity',fix(ease(span(s.enter,.10,.92))));
    }};
  }
  const builders={title:makeTitle,surface:surfaceBuilder,dial:dialBuilder,probe:probeBuilder,trace:traceBuilder,plot:plotBuilder,band:bandBuilder,seal:sealBuilder};
  const dims={title:[550,264],surface:[925,466],dial:[400,405],probe:[600,335],trace:[864,324],plot:[678,420],band:[1210,120],seal:[786,409]};
  // Each tuple describes x, y and width in the layout's logical pixels; height follows the block.
  const compound={
    wide:{title:[120,327,590],surface:[773,274,1035],dial:[145,278,428],probe:[880,375,602],trace:[755,334,1010],plot:[120,293,633],band:[124,810,1562],seal:[491,255,937]},
    portrait:{title:[99,302,760],surface:[94,687,833],dial:[112,200,398],probe:[264,791,596],trace:[85,739,839],plot:[91,249,791],band:[127,1170,752],seal:[100,549,831]}
  };
  const alone={
    wide:{title:[174,350,940],surface:[385,223,1150],dial:[686,242,548],probe:[475,280,907],trace:[284,273,1352],plot:[458,246,1002],band:[124,810,1562],seal:[455,261,1010]},
    portrait:{title:[89,584,855],surface:[72,579,916],dial:[222,558,620],probe:[95,600,864],trace:[86,639,882],plot:[91,562,872],band:[98,1131,838],seal:[79,576,910]}
  };
  function phase(time,a,b,fadeIn=.37,fadeOut=.28){
    if(time<a||time>=b)return 0;
    return ease(span(time,a,a+fadeIn))*(1-smooth(span(time,b-fadeOut,b)));
  }
  function placement(block,where,layout,extra={}){
    const [x,y,width]=where;
    const scale=Math.min(width/block.w*(extra.scale??1),layout.width/block.w,layout.height/block.h);
    const dx=(extra.x||0)*layout.width,dy=(extra.y||0)*layout.height;
    const tx=clamp(x+dx,0,Math.max(0,layout.width-block.w*scale));
    const ty=clamp(y+dy,0,Math.max(0,layout.height-block.h*scale));
    return {x:fix(tx),y:fix(ty),scale:Number(scale.toFixed(5))};
  }
  function convert([x,y],from,to){
    return [(from.x+x*from.scale-to.x)/to.scale,(from.y+y*from.scale-to.y)/to.scale];
  }
  function register(ctx,w,h,source){
    const p=g(ctx.svg,'registration'),c=ctx.pal,portrait=ctx.portrait;
    const x=portrait?72:82,y=portrait?96:74;const r=18,a=53;
    [[x,y,1,1],[w-x,y,-1,1],[x,h-y,1,-1],[w-x,h-y,-1,-1]].forEach(([xx,yy,sx,sy])=>stroke(p,'M'+point(xx+a*sx,yy)+' H'+(xx+r*sx)+' Q'+point(xx,yy)+' '+point(xx,yy+r*sy)+' V'+(yy+a*sy),c.tick,1.8,{opacity:.70}));
    svg(p,'image',{x:portrait?92:120,y:portrait?155:100,width:211,height:63.3,href:ctx.logos[ctx.light?'dark':'white'],preserveAspectRatio:'xMinYMid meet'});
    const right=portrait?w-150:w-120;
    const code=txt(p,right,portrait?195:139,'',23,c.muted,mono,end);
    ctx.fit(txt(p,portrait?333:376,portrait?194:138,source,24,c.muted),portrait?233:409);
    const t=txt(p,right,portrait?157:104,'',18,c.muted,mono,end);
    return {p,set(frame,fps,n,name){value(t,(frame/fps).toFixed(2)+' s');value(code,String(n+1).padStart(2,'0')+' / 05   '+name);}};
  }
  const cues=[{name:'扫描开场',at:0,hero:2.2},{name:'截面推进',at:3.6,hero:5.5},{name:'光路定位',at:7.6,hero:9.4},{name:'同步采样',at:11,hero:14.3},{name:'品牌收束',at:16.4,hero:18.2}];
  function mount(host,options){
    const {catalog,settings,logos}=options, kind=settings.kind, sequence=kind==='sequence',port=settings.format==='portrait';
    if(!sequence&&!Object.hasOwn(builders,kind))throw Error('未知的 MG 组件');
    host.replaceChildren();host.classList.add('hm-stage');host.dataset.format=port?'portrait':'wide';
    const width=port?1080:1920,height=port?1920:1080;
    const root=svg(host,'svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':catalog[kind].name+' · 星启 OPC UHD MG','preserveAspectRatio':'xMidYMid meet'});
    const defs=svg(root,'defs'),pal=palette(settings.ink),fitters=[];
    const ctx={id:'xqhud'+(++instance),defs,svg:root,pal,logos,portrait:port,light:settings.ink==='day',fit(el,max){
      fitters.push(()=>{
        if(!root.isConnected)return;
        const measure=el.cloneNode(true);
        set(measure,{visibility:'hidden','aria-hidden':'true'});root.append(measure);
        const width=measure.getComputedTextLength();measure.remove();
        if(width>max)set(el,{textLength:max,lengthAdjust:'spacingAndGlyphs'});
      });
    }};
    const backdrop=g(root,'canvas');
    if(settings.background!=='transparent'){
      box(backdrop,0,0,width,height,0,gradient(ctx,ctx.light?[['0%','#FFFFFF'],['65%','#F6F8FC'],['100%','#EAF0F6']]:[['0%','#152539'],['62%','#0B1522'],['100%','#08121D']],true));
      // A low-contrast registration plane occupies the object side of the scene.
      const grid=g(backdrop);const gx=width*(port?.14:.4),gy=height*.63,gw=width*(port?.68:.49),gh=height*.14;
      const plane=(u,v)=>[gx+u*gw+v*.18*gw,gy+v*gh-u*gh*.17];
      for(let i=0;i<=12;i++)stroke(grid,pathOf([plane(i/12,0),plane(i/12,1)]),pal.tick,1,{opacity:.14});
      for(let i=0;i<=5;i++)stroke(grid,pathOf([plane(0,i/5),plane(1,i/5)]),pal.tick,1,{opacity:.14});
    }
    const blocks={};
    const props=Object.fromEntries(Object.keys(builders).map(k=>[k,structuredClone(settings.edits?.[k]||catalog[k].props)]));
    // A composed sampled scene intentionally binds the strip and plot to the same source.
    const reg=sequence?register(ctx,width,height,props.plot.provenance):null;
    if(sequence){
      Object.assign(props.band,{series:props.plot.series,unit:props.plot.unit,max:props.plot.max,provenance:props.plot.provenance});
      props.seal.count=props.plot.series.length;
    }
    const order=sequence?['surface','trace','title','dial','plot','probe','band','seal']:[kind];
    for(const key of order){
      const block=builders[key](ctx,props[key]);blocks[key]=block;
      const loc=(sequence?compound:alone)[port?'portrait':'wide'][key];
      if(options.thumbnail)root.setAttribute('viewBox','-22 -16 '+(block.w+44)+' '+(block.h+32));
      else{
        block.home=placement(block,loc,{width,height});
        block.pose=placement(block,loc,{width,height},sequence?settings.layerPlacements?.[key]:settings.placement);
        block.p.setAttribute('transform','translate('+point(block.pose.x,block.pose.y)+') scale('+block.pose.scale+')');
      }
    }
    if(sequence)blocks.trace.bind(([u,v])=>convert(blocks.surface.at(u,v),blocks.surface.pose,blocks.trace.home));
    const fps=settings.fps,seconds=settings.seconds,frames=Math.max(2,Math.round(fps*seconds));
    function draw(block,opacity,enter,progress,extra={}){
      if(sequence&&settings.enabled?.[block.p.dataset.graphic]===false)opacity=0;
      block.p.style.display=opacity<=0?'none':'';
      if(opacity<=0)return;
      block.p.setAttribute('opacity',fix(opacity));
      block.paint({enter:clamp(enter),progress:clamp(progress),...extra});
    }
    function render(frame,{reduced=false}={}){
      frame=Math.round(clamp(Number.isFinite(frame)?frame:0,0,frames-1));
      const frac=frame/(frames-1),sec=frac*20;
      if(!sequence){
        const f=frame*30/fps, endFrame=(frames-1)*30/fps;
        const entry=reduced?1:span(f,0,12);
        const exit=reduced?1:1-smooth(span(f,endFrame-8,endFrame));
        const progress=reduced?1:smooth(span(frac,.10,.77));
        draw(blocks[kind],reduced?1:ease(entry)*exit,entry,progress);
        return {frame,frames,chapter:0};
      }
      const chapter=Math.max(0,cues.findLastIndex(c=>sec>=c.at));
      // One timing source couples the sweep and dial. The trace drives the later probe;
      // the plot and band subsequently read the same sample cursor.
      const time=reduced?cues[chapter].hero:sec;
      const en=(a)=>reduced?1:span(time,a,a+.40);
      const sweep=smooth(span(time,.28,7.45)),trail=smooth(span(time,7.9,10.5)),samples=span(time,11.4,15.65);
      reg.set(frame,fps,chapter,cues[chapter].name);
      reg.p.querySelector('image').style.visibility=chapter===4?'hidden':'';
      const f=(a,b)=>phase(time,a,b);
      draw(blocks.title,f(-.35,3.62),en(0),sweep);
      draw(blocks.surface,f(-.36,16.45)*(1-.56*smooth(span(time,7.65,8.4))),en(0),sweep);
      draw(blocks.dial,f(3.33,10.96),en(3.33),sweep);
      draw(blocks.trace,f(7.48,11.04),en(7.48),trail);
      const probeOpacity=f(8.1,11.1);
      if(probeOpacity>0){
        const {probe,trace,surface}=blocks;
        const pointOnFoil=()=>surface.at(...props.probe.start.map((v,i)=>mix(v,props.probe.end[i],trail)));
        const anchor=props.probe.follow==='surface'?convert(pointOnFoil(),surface.pose,probe.home):convert(trace.headAt(trail),trace.pose,probe.home);
        const channel=props.plot.series[clamp(props.probe.channelIndex-1,0,props.plot.series.length-1)];
        draw(probe,probeOpacity,en(8.1),trail,{anchor,reading:sampleAt(channel.values,samples),unit:props.plot.unit});
      }else draw(blocks.probe,0,0,0);
      draw(blocks.plot,f(10.89,16.48),en(10.89),samples);
      draw(blocks.band,f(3.5,16.5),en(3.5),samples);
      draw(blocks.seal,time>=16.35?ease(en(16.35)):0,en(16.35),1);
      return {frame,frames,chapter};
    }
    const ready=Promise.all(['OPCSans','OPCDisplay','OPCNumber','OPCMono'].map(face=>document.fonts.load('32px '+face,'光学扫描 0123456789'))).then(()=>{fitters.forEach(fn=>fn());});
    return {render,frames,fps,ready,svg:root,width,height};
  }
  return Object.freeze({mount,keys:Object.freeze(Object.keys(builders)),cues:Object.freeze(cues),dims});
})();
