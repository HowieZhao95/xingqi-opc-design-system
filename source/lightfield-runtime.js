/* Optical HUD. Measurement graphics and sensor plane use the same image coordinates.
   The plate, transparent overlay and composite all sample this frame function. */
window.XQLightField = (() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg',W=1920,H=1080;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const span=(v,a,b)=>clamp((v-a)/(b-a));
  const smooth=t=>(t=clamp(t),t*t*(3-2*t));
  const ease=t=>1-(1-clamp(t))**3;
  const fix=n=>Number(n.toFixed(2));
  const pxy=p=>fix(p[0])+' '+fix(p[1]);
  const attrs=(node,props)=>{for(const [key,value] of Object.entries(props))node.setAttribute(key,value);return node;};
  function add(parent,tag,props={},value){
    const n=document.createElementNS(NS,tag);attrs(n,props);
    if(value!==undefined)n.textContent=value;
    parent.append(n);return n;
  }
  const g=(p,name)=>add(p,'g',name?{'data-part':name}:{});
  const box=(p,x,y,width,height,r,fill,extra={})=>add(p,'rect',{x,y,width,height,rx:r,ry:r,fill,...extra});
  const circle=(p,cx,cy,r,fill,extra={})=>add(p,'circle',{cx,cy,r,fill,...extra});
  const line=(p,x1,y1,x2,y2,stroke,width=2,extra={})=>add(p,'line',{x1,y1,x2,y2,stroke,'stroke-width':width,'stroke-linecap':'round',...extra});
  const stroke=(p,d,color,width=2,extra={})=>add(p,'path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',...extra});
  const text=(p,x,y,value,size,color,face='',extra={})=>add(p,'text',{x,y,fill:color,'font-size':size,class:face,...extra},value);
  const place=(n,x,y)=>n.setAttribute('transform','translate('+fix(x)+' '+fix(y)+')');
  function show(n,opacity){
    n.setAttribute('opacity',fix(opacity));
    n.style.display=opacity<=0?'none':'';
  }
  function gradient(defs,type,id,props,stops){
    const n=add(defs,type,{id,...props});
    for(const [offset,col,opacity] of stops)add(n,'stop',{offset,'stop-color':col,'stop-opacity':opacity});
    return 'url(#'+id+')';
  }
  function polar(x,y,r,a){
    const t=(a-90)*Math.PI/180;
    return [x+r*Math.cos(t),y+r*Math.sin(t)];
  }
  function arc(x,y,r,a,b){
    return 'M'+pxy(polar(x,y,r,a))+' A '+r+' '+r+' 0 '+(b-a>180?1:0)+' 1 '+pxy(polar(x,y,r,b));
  }
  function pointsPath(points){return points.map((v,i)=>(i?'L':'M')+pxy(v)).join(' ');}
  function ticks(p,x,y,r,a,b,num,col,every=5){
    let minor='',major='';
    for(let i=0;i<=num;i++){
      const ang=mix(a,b,i/num),t=i%every===0;
      const d='M'+pxy(polar(x,y,r-(t?14:6),ang))+' L'+pxy(polar(x,y,r,ang))+' ';
      if(t)major+=d;else minor+=d;
    }
    stroke(p,minor,col,1.5,{opacity:.61});stroke(p,major,col,2.8,{opacity:.94});
  }
  const keys=[[0,1,0,0],[150,1.028,.009,.008],[310,1.078,.046,.026],[433,1.105,.064,.036],[540,1.067,.053,.028],[765,1.036,.030,.018],[899,1,0,0]];
  function camera(f,still){
    if(still)return {s:1,dx:0,dy:0};
    const i=keys.findIndex(k=>k[0]>=f);
    if(i<=0)return {s:1,dx:0,dy:0};
    const a=keys[i-1],b=keys[i],u=smooth(span(f,a[0],b[0]));
    return {s:mix(a[1],b[1],u),dx:-W*mix(a[2],b[2],u),dy:-H*mix(a[3],b[3],u)};
  }
  // Upper and lower envelopes measured on the 960 × 540 preview, following the glass.
  const stations=[[378,139,222],[401,154,246],[425,171,264],[449,187,277],[473,200,285],
    [498,210,286],[523,208,280],[548,196,269],[575,180,256],[602,161,240],
    [628,144,221],[655,125,205],[681,114,198],[705,112,198],[730,120,205],
    [754,135,220],[779,156,237],[800,180,253],[820,199,264],[839,211,268],
    [859,208,265],[878,199,255],[896,185,240],[917,178,208]];
  const firstX=stations[0][0],lastX=stations.at(-1)[0];
  function envelope(x,key){
    let j=0;while(j<stations.length-2&&x>stations[j+1][0])j++;
    const a=stations[j],b=stations[j+1],d=b[0]-a[0],t=clamp((x-a[0])/d);
    const before=stations[Math.max(0,j-1)],after=stations[Math.min(stations.length-1,j+2)];
    const m0=(b[key]-before[key])/(b[0]-before[0]),m1=(after[key]-a[key])/(after[0]-a[0]);
    return (2*t**3-3*t*t+1)*a[key]+(t**3-2*t*t+t)*d*m0+(-2*t**3+3*t*t)*b[key]+(t**3-t*t)*d*m1;
  }
  function surface(u,v){
    const x=mix(firstX,lastX,clamp(u)),top=envelope(x,1),bottom=envelope(x,2);
    return [2*x+6*Math.sin(v*Math.PI)-3*v,2*mix(top,bottom,v)];
  }
  const sample=(fn,n)=>Array.from({length:n+1},(_,i)=>fn(i/n));
  const contour=v=>pointsPath(sample(u=>surface(u,v),76));
  const outline=pointsPath([...sample(u=>surface(u,0),76),...sample(u=>surface(1-u,1),76)])+' Z';
  function scanPosition(f,index,still){
    if(index===0)return still?.54:span(f,0,139);
    if(index===1)return .92-.65*smooth(span(f,150,350));
    if(index===2)return smooth(span(f,360,470));
    if(index===3)return span(f,554,734);
    return 1;
  }
  function dimSurface(defs,id){
    return gradient(defs,'linearGradient',id,{x1:'0%',y1:'0%',x2:'100%',y2:'0%'},[
      ['0%','#07151E',.77],['49%','#08151B',.47],['100%','#0A141B',0]]);
  }

  function meshRig(world,defs,id,pal,footPoint){
    const rig=g(world,'surface-reconstruction');
    const tint=gradient(defs,'linearGradient',id+'-film',{x1:'0%',y1:'0%',x2:'100%',y2:'0%'},[
      ['0%',pal.beam,.20],['42%',pal.beam,.11],['72%',pal.violet,.26],['99%',pal.amber,.13]]);
    const clip=add(defs,'clipPath',{id:id+'-mask'});add(clip,'path',{d:outline});
    add(rig,'path',{d:outline,fill:tint});
    const lattice=g(rig);
    // Longitudinal contours and transverse ribs supply depth; edge contrast survives highlights.
    for(const v of [0,.2,.4,.6,.8,1]){
      const d=contour(v);
      if(v===0||v===1)stroke(lattice,d,'#03212C',5.5,{opacity:.48});
      stroke(lattice,d,v>.65?pal.violet:pal.beam,v===0||v===1?2.8:1.30,{opacity:v===0||v===1?.94:.68});
    }
    const bins=48;
    let ribs='',hatch='';
    for(let i=0;i<=bins;i++){
      const u=i/bins;
      ribs+=pointsPath(sample(v=>surface(u,v),8))+' ';
      if(i<bins&&i%2===0)for(let j=0;j<4;j++)hatch+='M'+pxy(surface(u,j/4))+' L'+pxy(surface((i+1)/bins,(j+1)/4))+' ';
      if(i%3===0)for(const v of [0,.4,1]){const [x,y]=surface(u,v);circle(lattice,x,y,2.1,'#D3FFF7',{opacity:.88});}
    }
    stroke(lattice,ribs,pal.beam,1.35,{opacity:.78});
    stroke(lattice,hatch,pal.beam,.95,{opacity:.40});
    const floor=g(rig,'floor-registration');const origin=footPoint;
    function floorPt(a,b){return [origin[0]+a*102+b*37,origin[1]+a*2-b*31];}
    for(let x=-3;x<=3;x++)stroke(floor,pointsPath([floorPt(x,-1.7),floorPt(x,1.7)]),pal.beam,1.2,{opacity:.48,'stroke-dasharray':'4 7'});
    for(let y=-1.5;y<=1.5;y+=.5)stroke(floor,pointsPath([floorPt(-3,y),floorPt(3,y)]),pal.beam,1.2,{opacity:.50});
    for(const [x,y] of [[-3,-1.5],[3,-1.5],[-3,1.5],[3,1.5]]){const [cx,cy]=floorPt(x,y);circle(floor,cx,cy,3.6,pal.beam);}
    // A narrow sheared light sheet connects the active slice with its footprint.
    const fan=g(rig,'scan-volume');
    const fanInk=gradient(defs,'linearGradient',id+'-fan',{x1:'0%',x2:'100%',y1:'0%',y2:'0%'},[
      ['0%',pal.beam,0],['55%',pal.beam,.065],['88%',pal.beam,.29],['100%',pal.beam,.04]]);
    const fanFace=add(fan,'path',{fill:fanInk});
    const fanEdge=stroke(fan,'',pal.beam,1.5,{opacity:.71});
    const footprint=add(fan,'ellipse',{cx:0,cy:0,rx:48,ry:10,fill:pal.beam,'fill-opacity':.12,stroke:pal.beam,'stroke-width':1.65});
    const afterglow=[.02,.95].map(v=>stroke(rig,contour(v),v<.5?pal.beam:pal.violet,3.5,{pathLength:1,'stroke-dasharray':'1 1',opacity:.8}));
    const scan=g(rig,'scan-slice');
    const stripe=gradient(defs,'linearGradient',id+'-beam',{x1:'0%',y1:'0%',x2:'100%',y2:'0%'},[
      ['0%',pal.beam,0],['65%',pal.beam,.31],['96%','#EDFFFA',.74],['100%',pal.beam,0]]);
    const clipped=add(scan,'g',{'clip-path':'url(#'+id+'-mask)'});
    const blade=box(clipped,0,128,88,580,0,stripe);
    const hoop=g(scan,'scan-plane');
    add(hoop,'ellipse',{cx:0,cy:0,rx:34,ry:116,fill:pal.beam,'fill-opacity':.09,stroke:'#063340','stroke-width':6,opacity:.76});
    add(hoop,'ellipse',{cx:0,cy:0,rx:34,ry:116,fill:'none',stroke:pal.beam,'stroke-width':2.8});
    add(hoop,'ellipse',{cx:0,cy:0,rx:43,ry:124,fill:'none',stroke:pal.beam,'stroke-width':1.3,'stroke-dasharray':'4 12',opacity:.8});
    line(hoop,0,-132,0,132,pal.beam,16,{opacity:.08});
    line(hoop,0,-135,0,132,pal.beam,7,{opacity:.24});
    line(hoop,0,-137,0,133,'#D7FFF8',2.3);
    line(hoop,-12,-129,12,-129,pal.beam,3);line(hoop,-12,126,12,126,pal.beam,3);
    const label=g(scan);box(label,-55,-27,110,36,14,'#061722',{opacity:.9});const serial=text(label,0,-2,'',18,pal.beam,'mono',{'text-anchor':'middle'});
    // Curved guide envelope frames the piece without covering the optical surface.
    const extent=g(rig,'registered-extent');
    for(const [cx,cy,sx,sy] of [[732,199,1,1],[1843,199,-1,1],[732,596,1,-1],[1843,596,-1,-1]]){
      stroke(extent,'M'+(cx+40*sx)+' '+cy+' H'+(cx+12*sx)+' Q'+cx+' '+cy+' '+cx+' '+(cy+12*sy)+' V'+(cy+32*sy),pal.beam,2.7,{opacity:.83});
    }
    return {render(u,index,still){
      const [x,top]=surface(u,0),[,base]=surface(u,1);const h=base-top;
      const footX=x-38+Math.sin(u*Math.PI)*21,footY=780-104*u;
      fanFace.setAttribute('d','M'+pxy([x-60,top-33])+' Q'+pxy([x-17,top-53])+' '+pxy([x+13,top-41])+' L'+pxy([footX+48,footY])+' Q'+pxy([footX,footY+19])+' '+pxy([footX-49,footY])+' Z');
      fanEdge.setAttribute('d','M'+pxy([x+13,top-40])+' L'+pxy([footX+48,footY]));
      attrs(footprint,{cx:fix(footX),cy:fix(footY)});
      setOpacity(fan,[.91,.65,.35,.18,0][index]);
      afterglow.forEach(n=>{n.setAttribute('stroke-dashoffset',fix(1-u));setOpacity(n,index===0?.9:.45);});
      blade.setAttribute('x',fix(x-82));
      hoop.setAttribute('transform','translate('+fix(x)+' '+fix((top+base)/2)+') rotate(-3) scale(1 '+fix((h+50)/232)+')');
      place(label,x-80*smooth(span(u,.84,.98)),base+60);
      serial.textContent='S '+String(1+Math.round(47*u)).padStart(2,'0')+' / 48';
      setOpacity(scan,index===0?1:index===1?.81:index===2?.56:index===3?.42:.22);
      setOpacity(lattice,[.85,1,.6,.49,.67][index]);setOpacity(floor,[.45,.68,1,.74,.53][index]);setOpacity(extent,index===0||index===1?.85:.33);
    }};
  }
  function setOpacity(el,a){el.setAttribute('opacity',fix(a));}
  function traceRig(world,pal,footPoint){
    const rig=g(world,'trace');
    const first=stroke(rig,contour(.5),pal.beam,4.2);
    const p0=surface(1,.5);const second=stroke(rig,'M'+pxy(p0)+' C 1870 605 1684 649 1591 682 S 1442 757 '+pxy(footPoint),pal.amber,3.2);
    const l1=first.getTotalLength(),l2=second.getTotalLength();
    const guide=stroke(rig,second.getAttribute('d'),pal.amber,1.5,{'stroke-dasharray':'3 11',opacity:.55});rig.insertBefore(guide,second);
    for(const [p,len] of [[first,l1],[second,l2]])p.setAttribute('stroke-dasharray',len+' '+(len+3));
    const dots=Array.from({length:7},(_,i)=>circle(rig,0,0,i===0?7:Math.max(2,5-i*.5),i===0?'#F0FFF8':pal.beam,{opacity:(1-i/9)}));
    const wave=g(rig,'reflected-wave');place(wave,...footPoint);
    const rings=[0,1,2].map(()=>add(wave,'ellipse',{rx:50,ry:15,fill:'none',stroke:pal.amber,'stroke-width':2.1,transform:'rotate(-7)'}));
    return {render(f,index,still){
      show(rig,index===2?1:0); if(index!==2)return;
      const a=still?1:smooth(span(f,360,466)),b=still?1:smooth(span(f,466,524));
      first.setAttribute('stroke-dashoffset',fix(l1*(1-a)));second.setAttribute('stroke-dashoffset',fix(l2*(1-b)));
      const distance=l1*a+l2*b;
      dots.forEach((dot,i)=>{const d=Math.max(0,distance-i*16),p=d<=l1?first.getPointAtLength(d):second.getPointAtLength(d-l1);attrs(dot,{cx:fix(p.x),cy:fix(p.y),fill:d<=l1?pal.beam:pal.amber});});
      rings.forEach((n,i)=>{const t=still?.56:span(f,503+i*7,534+i*7);attrs(n,{rx:fix(18+t*116),ry:fix(4+t*22),opacity:fix(t>0&&t<1?(1-t)*.95:0)});});
    }};
  }

  function prospectFrame(hud,data,pal,defs,uid,logos){
    // Perimeter reference marks stay thin and open, even on the white phosphor preset.
    const frame=g(hud,'viewport-calibration');
    for(const [x,y,sx,sy] of [[67,63,1,1],[1853,63,-1,1],[67,1016,1,-1],[1853,1016,-1,-1]]){
      const d='M'+(x+80*sx)+' '+y+' H'+(x+20*sx)+' Q'+x+' '+y+' '+x+' '+(y+20*sy)+' V'+(y+61*sy);
      stroke(frame,d,pal.beam,2.4,{opacity:.8});
    }
    for(const [x,s] of [[67,1],[1853,-1]])for(let i=0;i<53;i++){
      const y=167+i*14; const major=i%5===0;
      line(frame,x,y,x+s*(major?13:5),y,pal.tick,major?1.8:1,{opacity:major?.79:.52});
    }
    const brandShade=gradient(defs,'radialGradient',uid+'-brand',{cx:'.5',cy:'.5',r:'.5'},[['0%','#07141D',.67],['45%','#07141D',.50],['100%','#07141D',0]]);
    box(frame,-150,-49,725,350,0,brandShade);
    add(frame,'image',{href:logos.white,x:118,y:90,width:202,height:64,preserveAspectRatio:'xMinYMid meet'});
    line(frame,357,99,357,142,pal.tick,1.3);
    text(frame,382,131,'展厅光场',30,pal.white,'display');
    const rail=g(frame);
    const offset=695,len=510;
    text(rail,offset,102,'TC / S',17,pal.sub,'mono');
    for(let i=0;i<=30;i++){
      const x=offset+i*len/30,y=i%5===0?119:127;line(rail,x,y,x,136,pal.tick,i%5===0?2:1);
    }
    const marker=add(rail,'path',{d:'M-6 0 Q-8 -2 -5 -3 H5 Q8 -2 6 0 L1 7 Q0 8 -1 7 Z',fill:pal.beam});
    const time=text(rail,offset+len,102,'',19,pal.white,'mono',{'text-anchor':'end'});
    const status=g(frame);box(status,1457,95,343,56,18,'#07151E',{opacity:.8});
    const shotLabel=text(status,1479,131,'',24,pal.white);
    const leds=data.shots.map((_,i)=>box(status,1719+i*13,115,6,15,3,pal.tick));
    const ribbon=g(hud,'readout-bus');
    const busShade=gradient(defs,'linearGradient',uid+'-bus',{x1:'0%',y1:'0%',x2:'0%',y2:'100%'},[['0%','#091A25',.87],['100%','#07131F',.92]]);
    box(ribbon,119,894,1682,89,26,busShade,{stroke:pal.rim,'stroke-width':1.3});
    text(ribbon,150,936,'照度模拟',27,pal.white,'display');text(ribbon,151,962,'ILLUMINANCE  /  lx',15,pal.sub,'mono');
    const meters=data.points.map((pt,i)=>{
      const x=432+i*438, col=pal.points[i];
      line(ribbon,x-27,919,x-27,958,pal.tick,1.1,{opacity:.5});
      circle(ribbon,x+5,928,4,col);text(ribbon,x+21,934,pt.tag,19,col,'mono');
      text(ribbon,x,963,pt.name,22,pal.sub);
      const value=text(ribbon,x+178,950,'',36,pal.white,'number',{'text-anchor':'end'});
      text(ribbon,x+188,949,'lx',18,col,'mono');
      const trackX=x+237,trackY=958,tw=113,th=42;
      const series=pt.samples;
      const sampleAt=sec=>{const s=clamp(sec/data.sampleSeconds)*(series.length-1),j=Math.floor(s);return mix(series[j],series[Math.min(j+1,series.length-1)],s-j);};
      const spark=(sec)=>[trackX+tw*sec/data.sampleSeconds,trackY-th*sampleAt(sec)/data.axisMax];
      const outline=pointsPath(series.map((_,j)=>spark(data.sampleSeconds*j/(series.length-1))));
      stroke(ribbon,outline,col,2,{opacity:.4});
      const dot=circle(ribbon,0,0,4.4,col);
      return {value,dot,spark};
    });
    return {render(f,index,seconds,read){
      const shot=data.shots[index];
      shotLabel.textContent=String(index+1).padStart(2,'0')+' / 05   '+shot.name;
      time.textContent=(f/data.fps).toFixed(2)+' s';place(marker,offset+len*f/(data.frames-1),113);
      leds.forEach((n,i)=>attrs(n,{fill:i<=index?pal.beam:pal.tick,opacity:i===index?1:.56}));
      meters.forEach((m,i)=>{m.value.textContent=String(Math.round(read[i]));const [x,y]=m.spark(seconds);attrs(m.dot,{cx:fix(x),cy:fix(y)});});
    }};
  }
  function sensorGates(hud,pal,data){
    const gates=data.points.map((pt,i)=>{
      const node=g(hud,'probe-'+pt.tag),col=pal.points[i];
      const rim=g(node),inner=g(node);
      const r=i===0?34:27;
      for(const [a,b] of [[-75,14],[50,131],[165,257]]){
        const d=arc(0,0,r,a,b);
        stroke(rim,d,'#052332',6,{opacity:.85});stroke(rim,d,col,2.8);
      }
      circle(inner,0,0,r-9,'none',{stroke:col,'stroke-width':1.5,'stroke-dasharray':'2 8'});
      circle(inner,0,0,5,col,{stroke:'#051821','stroke-width':2});
      line(inner,-r-13,0,-r-4,0,col,2);line(inner,r+4,0,r+14,0,col,2);
      const tag=g(node);const sign=i===0?1:-1;
      const dy=i===0?-83:i===1?-64:-50;
      const labelX=sign*(i===0?78:53),labelY=dy-7;
      stroke(tag,'M'+pxy([sign*(r*.68),-r*.7])+' Q'+pxy([sign*39,-48])+' '+pxy([labelX,dy])+' h'+(i===0?88:54),col,2.1);
      box(tag,labelX-5,labelY-27,i===0?145:103,34,13,'#071725',{opacity:.89});
      text(tag,labelX+6,labelY-2,pt.tag,18,col,'mono');
      text(tag,labelX+45,labelY-2,i===0?'鳍片':i===1?'基座':'地面',18,pal.white);
      return {node,rim,inner,tag};
    });
    return {render(f,c,index,active,still){
      gates.forEach(({node,rim,inner,tag},i)=>{
        const p=data.points[i].at;place(node,p[0]*W*c.s+c.dx,p[1]*H*c.s+c.dy);
        const focused=index===3||index===4||i===active;
        rim.setAttribute('transform','rotate('+fix(still?i*16:(f*.45+i*22)*(focused?1:.30))+')');
        setOpacity(rim,focused?1:.70);setOpacity(inner,focused?1:.66);setOpacity(tag,focused?1:.84);
      });
    }};
  }
  function dialModule(parent,pal,defs,id){
    const module=g(parent,'dial-module');
    const cx=328,cy=512,r=171,low=-133,high=133;
    const shade=gradient(defs,'radialGradient',id+'scopeface',{cx:'.43',cy:'.48',r:'.67'},[['0%','#081624',.93],['61%','#0A2230',.85],['100%','#132A37',.68]]);
    circle(module,cx,cy,r-8,shade);
    const track=arc(cx,cy,r,low,high);
    stroke(module,track,pal.tick,8,{opacity:.44});const live=stroke(module,track,pal.beam,6,{pathLength:1,'stroke-dasharray':'1 1'});
    stroke(module,arc(cx,cy,r+14,low+21,high-6),pal.pale,1.5,{opacity:.47});
    ticks(module,cx,cy,r-15,low,high,60,pal.pale,5);
    stroke(module,arc(cx,cy,r-48,-151,-115),pal.violet,4,{opacity:.85});
    stroke(module,arc(cx,cy,r-48,60,137),pal.violet,2,{opacity:.66});
    for(let i=0;i<5;i++){
      const [x,y]=polar(cx,cy,r+29,mix(low,high,i/4));
      text(module,x,y+5,String(i*25),15,pal.sub,'mono',{'text-anchor':'middle'});
    }
    const hand=g(module);line(hand,0,-r-6,0,-r+19,pal.white,4);
    const segment=stroke(module,arc(cx,cy,r-32,low,high),pal.beam,5,{'stroke-dasharray':'2.5 13',opacity:.5});
    const sweepArc=stroke(module,arc(cx,cy,r+7,low-13,low),pal.beam,3.2,{opacity:.93});
    const end=g(module);circle(end,0,0,7,pal.beam,{stroke:'#091820','stroke-width':2});
    text(module,cx,cy-40,'SCAN  /  %',22,pal.pale,'mono',{'text-anchor':'middle'});
    const number=text(module,cx,cy+54,'00',76,pal.white,'number',{'text-anchor':'middle'});
    const bin=text(module,cx,cy+101,'',21,pal.beam,'mono',{'text-anchor':'middle'});
    // Unwrapped shape profile: scanner and cursor express the same optical slice.
    const x0=125,y0=760,sx=411,sy=55;
    text(module,x0,727,'纵向轮廓',25,pal.white);text(module,x0+sx,727,'48 SECTIONS',17,pal.sub,'mono',{'text-anchor':'end'});
    const profilePt=u=>[x0+u*sx,y0+sy*(surface(u,.5)[1]-245)/375];
    const d=pointsPath(sample(profilePt,80));
    stroke(module,d,pal.beam,2.4);line(module,x0,y0+sy+8,x0+sx,y0+sy+8,pal.rim,1.3);
    for(let i=0;i<=24;i++)line(module,x0+sx*i/24,y0+sy+8,x0+sx*i/24,y0+sy+8+(i%4===0?9:4),pal.tick,1.4);
    const cursor=line(module,x0,y0-9,x0,y0+sy+11,pal.amber,1.9);
    const bead=circle(module,x0,y0,5,pal.amber);
    return {module,render(u){
      const a=mix(low,high,u),[px,py]=polar(cx,cy,r,a);
      sweepArc.setAttribute('d',arc(cx,cy,r+7,a-14,a));
      segment.setAttribute('d',arc(cx,cy,r-32,low,Math.max(low+.1,a)));
      live.setAttribute('stroke-dashoffset',fix(1-u));hand.setAttribute('transform','translate('+cx+' '+cy+') rotate('+fix(a)+')');place(end,px,py);
      number.textContent=String(Math.round(u*100)).padStart(2,'0');
      bin.textContent='S '+String(1+Math.round(47*u)).padStart(2,'0')+' / 48';
      const [x,y]=profilePt(u);attrs(cursor,{x1:fix(x),x2:fix(x)});attrs(bead,{cx:fix(x),cy:fix(y)});
    }};
  }
  function sectionModule(parent,pal,defs,id){
    const node=g(parent,'section-module');
    const cx=318,cy=506,r=145;
    circle(node,cx,cy,r+4,'#0A1924',{opacity:.87});
    ticks(node,cx,cy,r+15,-145,145,54,pal.tick,6);stroke(node,arc(cx,cy,r,-138,129),pal.beam,2.6);
    const projector=g(node,'section-optics');
    const filterGrad=gradient(defs,'linearGradient',id+'-slice',{x1:'0%',x2:'100%',y1:'0%',y2:'100%'},[['0%',pal.beam,.10],['60%',pal.beam,.34],['100%',pal.violet,.12]]);
    const fin=g(projector);
    for(let i=0;i<7;i++){
      const x=217+i*23,y=476+Math.sin(i*.68)*9-i*3;
      const d='M'+x+' '+y+' q 1 -6 6 -9 l 32 -16 q 5 -2 5 4 v 99 q 0 5 -5 8 l -33 17 q -5 2 -5 -3 Z';
      add(fin,'path',{d,fill:filterGrad,stroke:pal.beam,'stroke-width':1.85,'stroke-linejoin':'round'});
    }
    const base=g(projector);
    for(let i=0;i<5;i++){
      const y=477+i*16;const d='M209 '+y+' C260 '+(y+37)+' 330 '+(y-52)+' 415 '+(y-23)+' Q428 '+(y-15)+' 413 '+(y-7)+' C348 '+(y-38)+' 263 '+(y+56)+' 214 '+(y+20)+' Q196 '+(y+11)+' 209 '+y+'Z';
      add(base,'path',{d,fill:'#142A39',stroke:i===4?pal.amber:pal.violet,'stroke-width':i===4?3:1.75,'stroke-linejoin':'round'});
    }
    const title=text(node,cx,718,'',40,pal.white,'display',{'text-anchor':'middle'});
    const sub=text(node,cx,765,'',25,pal.sub,'',{'text-anchor':'middle'});
    const cable=stroke(node,'',pal.beam,2.2);
    const srcDot=circle(node,0,0,5,pal.beam);
    return {node,render(f,active,loc,still){
      const isFin=active===0;
      show(fin,isFin?1:0);show(base,isFin?0:1);
      title.textContent=isFin?'P1  玻璃鳍片':'P2  弧形基座';
      sub.textContent=isFin?'截面排列 / 结构示意':'支承轮廓 / 结构示意';
      const start=[cx+r+18,cy],tx=loc[0],ty=loc[1];
      const d='M'+pxy(start)+' h60 C '+pxy([cx+r+167,cy])+' '+pxy([tx-145,ty+66])+' '+pxy([tx-65,ty+20])+' Q '+pxy([tx-32,ty-2])+' '+pxy([tx-20,ty]);
      const u=still?1:ease(span(f,isFin?150:253,isFin?175:278));
      attrs(cable,{d,stroke:isFin?pal.beam:pal.violet,pathLength:1,'stroke-dasharray':'1 1','stroke-dashoffset':fix(1-u)});
      attrs(srcDot,{cx:start[0],cy:start[1],fill:isFin?pal.beam:pal.violet});
      place(projector,0,still?0:mix(12,0,u));
    }};
  }
  function dataModule(parent,data,pal,defs,id){
    const node=g(parent,'comparison');
    const face=gradient(defs,'linearGradient',id+'-instrument',{x1:'0%',y1:'0%',x2:'100%',y2:'100%'},[['0%','#0A1C28',.92],['65%','#0A1B2B',.85],['100%','#151E37',.67]]);
    box(node,120,308,485,424,22,face,{stroke:pal.rim,'stroke-width':1.6});
    text(node,150,356,'LX  /  3 CHANNELS',18,pal.sub,'mono');
    const t=text(node,576,356,'',24,pal.white,'mono',{'text-anchor':'end'});
    const gx=178,gy=412,w=391,h=206;
    const xp=s=>gx+w*s/data.sampleSeconds,yp=v=>gy+h*(1-v/data.axisMax);
    for(let j=0;j<=4;j++){
      const y=gy+h*j/4;line(node,gx,y,gx+w,y,pal.tick,1.2,{opacity:.55,'stroke-dasharray':j===4?'none':'3 6'});
      if(j%2===0)text(node,gx-9,y+5,String(data.axisMax*(1-j/4)),16,pal.sub,'mono',{'text-anchor':'end'});
    }
    for(let j=0;j<=6;j++){
      const x=xp(j);line(node,x,gy,x,gy+h,pal.tick,1,{opacity:.34});
      if(j%2===0)text(node,x,648,String(j)+'s',16,pal.sub,'mono',{'text-anchor':'middle'});
    }
    const plots=data.points.map((_,i)=>stroke(node,'',pal.points[i],3.6));
    const dots=plots.map((_,i)=>circle(node,gx,gy,5,pal.points[i],{stroke:'#07141E','stroke-width':2}));
    const vertical=line(node,gx,gy,gx,gy+h,pal.pale,1.7,{'stroke-dasharray':'4 5'});
    data.points.forEach((pt,i)=>{const x=151+i*146;line(node,x,693,x+17,693,pal.points[i],4);text(node,x+27,701,pt.tag,21,pal.points[i],'mono');});
    return {node,render(sec,sample){
      t.textContent=sec.toFixed(1)+' / 6 s';const x=xp(sec);attrs(vertical,{x1:fix(x),x2:fix(x)});
      plots.forEach((p,i)=>{const pts=[[gx,yp(sample(i,0))]];for(let s=1;s<sec;s++)pts.push([xp(s),yp(sample(i,s))]);pts.push([x,yp(sample(i,sec))]);p.setAttribute('d',pointsPath(pts));attrs(dots[i],{cx:fix(x),cy:fix(pts.at(-1)[1])});});
    }};
  }
  let serial=0;
  function mount(host,config,assets){
    const data=config.data,id='lfhud'+(++serial),white=config.tone==='light';
    // Both HUD inks are projected onto the same dark gallery; interface chrome follows the theme.
    const pal={beam:white?'#DCFFFF':'#56F9DD',pale:white?'#F2FBFF':'#ADFFF0',white:'#F2FCFF',sub:'#B9D8E0',tick:'#85AEBC',rim:'#497889',violet:white?'#B5CAFF':'#B09BFF',amber:'#FFBE7C'};
    pal.points=[pal.beam,pal.violet,pal.amber];
    host.replaceChildren();host.classList.add('lf-surface');host.dataset.transparent=String(!!config.transparent);
    const svg=document.createElementNS(NS,'svg');attrs(svg,{viewBox:'0 0 1920 1080',role:'img','aria-label':'浮光 · 光场扫描 HUD。装置曲面重建、空间探针与三通道模拟照度。'});host.append(svg);
    const defs=add(svg,'defs');
    const leftDim=dimSurface(defs,id+'left');
    const world=g(svg,'world');
    if(!config.transparent)add(world,'image',{href:assets.plate,width:W,height:H,preserveAspectRatio:'xMidYMid slice'});
    // The instrument exposure is a calibrated dark tint; raw comparison removes it.
    const grade=box(world,0,0,W,H,0,'#051825',{opacity:.24});
    const registration=g(world,'world-instrumentation');
    const floorAnchor=data.points[2].at.map((v,i)=>v*(i?H:W));
    const mesh=meshRig(registration,defs,id,pal,floorAnchor);
    const trace=traceRig(registration,pal,floorAnchor);
    const hud=g(svg,'hud');
    const instruments=g(hud,'instrument-layer'),sensors=g(hud,'probe-layer');
    box(instruments,0,168,735,719,0,leftDim,{mask:makeFeather(defs,id)});
    const frame=prospectFrame(instruments,data,pal,defs,id,assets.logos);
    const names=['光场扫描','截面重建','光迹解析','照度采样','采样完成'];
    const heading=text(instruments,120,240,names[0],46,pal.white,'display');
    const headingDetail=text(instruments,122,277,'',19,pal.beam,'mono');
    const descriptions=['SURFACE SCAN   /   模拟','SECTION VIEW   /   模拟','OPTICAL TRACE   /   模拟','PHOTOMETRY   /   模拟','SAMPLE REPORT   /   模拟'];
    const gates=sensorGates(sensors,pal,data);
    const dial=dialModule(instruments,pal,defs,id);
    const section=sectionModule(instruments,pal,defs,id);
    const routeScope=g(instruments,'path-readout');
    text(routeScope,122,406,'传播位置',27,pal.sub);const routeStage=text(routeScope,118,489,'',53,pal.white,'display');
    const lengthPct=text(routeScope,118,592,'',66,pal.beam,'number');
    text(routeScope,126,712,'鳍片轮廓',25,pal.sub);text(routeScope,518,712,'地面反射',25,pal.sub,'',{'text-anchor':'end'});
    const routePath='M128 665 C178 600 224 713 285 663 S374 607 410 636 S475 722 523 650';
    const routeRef=stroke(routeScope,routePath,pal.tick,2.1),routeLive=stroke(routeScope,routePath,pal.beam,4.5,{pathLength:1,'stroke-dasharray':'1 1'});
    const signal=circle(routeScope,128,665,6,pal.amber);
    const graph=dataModule(instruments,data,pal,defs,id);
    const report=g(instruments,'coda');const peakTitle=text(report,122,392,'',35,pal.sub,'display');
    const peakValue=text(report,117,505,'',84,pal.beam,'number');
    const deltaText=text(report,123,559,'',27,pal.white);
    line(report,125,610,518,610,pal.tick,1.4);
    const finalBars=data.points.map((p,i)=>{const y=668+i*53;
      text(report,122,y,p.tag,23,pal.points[i],'mono');box(report,178,y-13,258,9,4.5,'#213747');
      const fill=box(report,178,y-13,0,9,4.5,pal.points[i]);text(report,517,y,String(p.samples.at(-1)),26,pal.white,'mono',{'text-anchor':'end'});return fill;});
    function sample(i,t){const a=data.points[i].samples,u=clamp(t/data.sampleSeconds)*(a.length-1),j=Math.floor(u);return mix(a[j],a[Math.min(j+1,a.length-1)],u-j);}
    function render(frameNumber,opts={}){
      const f=Math.round(clamp(frameNumber,0,data.frames-1)),index=data.shots.findIndex(s=>f>=s.start&&f<s.end);
      const still=Boolean(opts.reduced),raw=Boolean(opts.raw)&&!config.transparent;
      const c=camera(f,still||raw);world.setAttribute('transform','matrix('+c.s+' 0 0 '+c.s+' '+c.dx+' '+c.dy+')');
      const phase=still?data.shots[index].hero:f,u=scanPosition(phase,index,still);
      const sec=still&&index>=3?data.sampleSeconds:span(f,554,734)*data.sampleSeconds;
      const live=data.points.map((_,i)=>sample(i,sec));
      const visible=!raw&&!opts.plateOnly;
      const channels=opts.channels||config.channels||{};
      show(grade,(config.transparent||raw)?0:(white?.26:.32));
      show(registration,visible&&channels.surface!==false?1:0);show(hud,visible?1:0);
      show(instruments,channels.readout!==false?1:0);show(sensors,channels.probes!==false?1:0);
      if(!visible)return {frame:f,index};
      mesh.render(u,index,still);trace.render(phase,index,still);
      const active=index===1?(phase<253?0:1):index===2?(phase<476?0:2):0;
      gates.render(phase,c,index,active,still);frame.render(f,index,sec,live);
      heading.textContent=names[index];headingDetail.textContent=descriptions[index];
      [dial.module,section.node,routeScope,graph.node,report].forEach((n,i)=>show(n,index===i?1:0));
      if(index===0)dial.render(u);
      if(index===1){const at=data.points[active].at;section.render(phase,active,[at[0]*W*c.s+c.dx,at[1]*H*c.s+c.dy],still);}
      if(index===2){const v=still?1:span(f,360,524),length=routeRef.getTotalLength(),pos=routeRef.getPointAtLength(v*length);
        routeStage.textContent=v<.34?'迎光边缘':v<.68?'鳍片峰部':'地面反射';lengthPct.textContent=Math.round(v*100)+'%';
        routeLive.setAttribute('stroke-dashoffset',fix(1-v));attrs(signal,{cx:fix(pos.x),cy:fix(pos.y)});}
      if(index===3)graph.render(sec,sample);
      if(index===4){
        const highest=Math.max(...live),lowest=Math.min(...live),p=data.points[live.indexOf(highest)];
        peakTitle.textContent='最高读数  /  '+p.tag+' '+p.name;peakValue.textContent=Math.round(highest)+' lx';
        deltaText.textContent='三点极差   '+Math.round(highest-lowest)+' lx';
        finalBars.forEach((bar,i)=>bar.setAttribute('width',fix(258*live[i]/data.axisMax*(still?1:ease(span(f,765+i*5,792+i*5))))));
      }
      return {frame:f,index};
    }
    const ready=Promise.all(['OPCSans','OPCDisplay','OPCNumber','OPCMono'].map(face=>document.fonts.load('32px '+face,'浮光展厅照度剖面 0123456789'))).then(()=>document.fonts.ready);
    return {render,ready};
  }
  function makeFeather(defs,id){
    const fill=gradient(defs,'linearGradient',id+'feather',{x1:'0%',y1:'0%',x2:'0%',y2:'100%'},[['0%','#000',1],['16%','#FFF',1],['82%','#FFF',1],['100%','#000',1]]);
    const mask=add(defs,'mask',{id:id+'fade',maskUnits:'userSpaceOnUse',x:0,y:168,width:735,height:719});
    box(mask,0,168,735,719,0,fill);return 'url(#'+id+'fade)';
  }
  return Object.freeze({mount});
})();
