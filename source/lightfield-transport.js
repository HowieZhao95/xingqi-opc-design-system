window.XQFrameClock=({start,end,fps,initial=start,loop=false,paint,change=()=>{},ended=()=>{}})=>{
  let frame=start,playing=false,raf=0,origin=0,offset=start,destroyed=false;
  const report=()=>change({frame,local:frame-start,playing,frames:end-start});
  function draw(f,force=false){
    const n=Math.max(start,Math.min(end-1,Math.round(f)));
    if(n!==frame||force){frame=n;paint(n);report();}return n;
  }
  function pause(){
    if(playing){cancelAnimationFrame(raf);playing=false;report();}
  }
  function tick(now){
    if(!playing||destroyed)return;
    let n=offset+Math.floor((now-origin)*fps/1000);
    if(n>=end){
      if(!loop){draw(end-1);pause();ended();return;}
      n=start+(n-start)%(end-start);offset=n;origin=now;
    }
    draw(n);raf=requestAnimationFrame(tick);
  }
  function play(){
    if(playing||destroyed)return;
    if(frame===end-1)draw(start);playing=true;offset=frame;origin=performance.now();report();raf=requestAnimationFrame(tick);
  }
  draw(initial,true);
  return {play,pause,toggle:()=>playing?pause():play(),seek(f){pause();return draw(f,true);},
    step(n){pause();return draw(frame+n,true);},refresh(){draw(frame,true);},
    destroy(){pause();destroyed=true;},get frame(){return frame;},get playing(){return playing;},get frames(){return end-start;}};
};
