import { clamp01, smoothstep01, tileProgress, requestedScene } from './flip-motion';

type Tile = { element: HTMLElement; row: number; col: number; x: number; y: number; spinAt: number };

/** Two wheel-triggered scenes, then ordinary page scrolling. No scroll scrubbing. */
export function initFlipStage() {
  const root = document.querySelector<HTMLElement>('[data-flip-story]');
  if (!root) return;
  const story: HTMLElement = root;
  const stage = story.querySelector<HTMLElement>('.flip-stage')!;
  const front = stage.querySelector<HTMLElement>('.archive-portal')!;
  const back = stage.querySelector<HTMLElement>('.archive-manifesto')!;
  const orbit = front.querySelector<HTMLElement>('.scroll-orbit')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let tiles: Tile[] = [], layer: HTMLElement | undefined, cursor: HTMLElement | undefined;
  let enabled = false, initialized = false, printing = false, printScroll = 0, printScene = 0;
  let frame = 0, resizeFrame = 0, width = 0, height = 0, columns = 6, top = 0;
  let progress = 0, target = 0, from = 0, started = -Infinity;
  let lastWheel = -Infinity, consumedGesture = false, gestureUntil = 0, hoverIndex = -1;
  let focusScene: number | null = null;
  let pointer: {x:number;y:number} | undefined;
  let pointerMovedAt = -Infinity;
  let touch: {x:number;y:number;consumed:boolean;eligible:boolean} | undefined;
  const disabled = () => printing || reduce.matches || document.documentElement.classList.contains('motion-paused') || innerHeight < 560;
  const transitioning = () => Math.abs(progress-target) > .0001;

  function geometry() {
    top = story.getBoundingClientRect().top + scrollY;
    height = stage.clientHeight;
    width = stage.clientWidth - (innerWidth <= 600 ? 12 : 20);
    columns = innerWidth <= 600 ? 3 : 6;
  }
  function resetPointer(clearSpins = true) {
    pointer = undefined; hoverIndex = -1;
    stage.classList.remove('pointer-active');
    if (clearSpins) tiles.forEach(tile => { tile.spinAt = -Infinity; });
  }
  function cloneArtwork(source: HTMLElement, side: string) {
    const copy = source.cloneNode(true) as HTMLElement;
    copy.removeAttribute('id'); copy.removeAttribute('aria-labelledby'); copy.removeAttribute('aria-hidden'); copy.removeAttribute('inert');
    copy.querySelectorAll('.portal-tiles,.portal-seams,.scroll-orbit,.portal-bottom,.portal-copyright,a,button').forEach(node=>node.remove());
    copy.querySelectorAll('[id],[aria-labelledby],[aria-controls]').forEach(node=>{
      node.removeAttribute('id');node.removeAttribute('aria-labelledby');node.removeAttribute('aria-controls');
    });
    const art = document.createElement('div'); art.className = `flip-artwork flip-artwork--${side}`; art.append(copy); return art;
  }
  function build() {
    geometry();
    const next = document.createElement('div'); next.className='flip-render';next.inert=true;next.setAttribute('aria-hidden','true');
    next.style.setProperty('--frame-width',`${width}px`);next.style.setProperty('--frame-height',`${height-16}px`);
    const frontArt=cloneArtwork(front,'front'),backArt=cloneArtwork(back,'back');
    const tw=width/columns,th=(height-16)/6; const nextTiles:Tile[]=[];
    for(let row=0;row<6;row++)for(let col=0;col<columns;col++) {
      const el=document.createElement('div'),x=col*tw,y=row*th,phase=tileProgress(progress,row,col,6,columns);
      el.className='flip-tile';el.style.cssText=`left:${x}px;top:${y}px;width:${tw-3}px;height:${th-3}px;transform:rotateX(${-180*phase}deg);--back-bleed:${phase*1.5}px;--back-radius:${(1-phase)*9}px;`;
      for(const [side,art] of [['front',frontArt],['back',backArt]] as const) {
        const face=document.createElement('div');face.className=`flip-face flip-face--${side}`;
        const contents=art.cloneNode(true) as HTMLElement;contents.style.left=`${-x}px`;contents.style.top=`${-y}px`;
        face.append(contents);el.append(face);
      }
      next.append(el);nextTiles.push({element:el,row,col,x:x+tw/2,y:y+th/2,spinAt:-Infinity});
    }
    layer?.remove();layer=next;tiles=nextTiles;stage.append(next);
    if(!cursor) {
      cursor=orbit.cloneNode(true) as HTMLElement;cursor.classList.add('flip-cursor');cursor.removeAttribute('href');cursor.removeAttribute('aria-label');cursor.setAttribute('aria-hidden','true');cursor.inert=true;cursor.tabIndex=-1;stage.append(cursor);
    }
    resetPointer();
  }
  function headerState() {
    const box=stage.getBoundingClientRect(); const visible=box.top<100&&box.bottom>100;
    const green=enabled ? tileProgress(progress,0,columns-1,6,columns)>.55 : back.getBoundingClientRect().top<100;
    document.documentElement.classList.toggle('flip-stage-visible',visible&&!printing);
    document.documentElement.classList.toggle('flip-on-green',visible&&green&&!printing);
    return visible;
  }
  function semanticState() {
    const settled=progress>=.999;
    story.dataset.flipSide=settled?'back':progress<=.001?'front':'turning';
    front.inert=progress>.5;back.inert=progress<=.5;
    front.setAttribute('aria-hidden',String(front.inert));back.setAttribute('aria-hidden',String(back.inert));
    front.querySelectorAll('a').forEach(a=>a.tabIndex=progress>.001?-1:0);
    back.querySelectorAll('a').forEach(a=>a.tabIndex=settled?0:-1);
    if(focusScene!==null) {
      if(document.querySelector('dialog[open]')) focusScene=null;
      else if((focusScene===1&&settled)||(focusScene===0&&progress<=.001)) {
        const title=(focusScene===1?back:front).querySelector<HTMLElement>(focusScene===1?'#manifesto-title':'#portal-title')!;
        title.tabIndex=-1;title.focus({preventScroll:true});focusScene=null;
      }
    }
  }
  function render(now:number) {
    frame=0;
    if(!enabled||disabled()||document.hidden)return;
    progress=from+(target-from)*smoothstep01(clamp01((now-started)/1000));
    if(Math.abs(progress-target)<.0001)progress=target;
    const box=stage.getBoundingClientRect(),visible=box.bottom>0&&box.top<innerHeight;
    if(!visible){resetPointer();progress=target;}
    const active=visible&&fine.matches&&!document.querySelector('dialog[open]')?pointer:undefined;
    const pointerEnergy = active ? 1-smoothstep01(clamp01((now-pointerMovedAt)/260)) : 0;
    let spins=false;
    for(const tile of tiles) {
      const phase=tileProgress(progress,tile.row,tile.col,6,columns),base=-180*phase;
      const age=now-tile.spinAt,u=clamp01(age/1000),spinning=Number.isFinite(tile.spinAt)&&age<1000;
      const spin=spinning?smoothstep01(u)*360:0;
      const distance=active?Math.hypot(tile.x-active.x,tile.y-active.y):Infinity;
      const proximity=Math.max(0,1-distance/Math.min(300,width*.4))*pointerEnergy;
      const rx=active?(active.y-tile.y)/160*proximity*7:0,ry=active?(tile.x-active.x)/180*proximity*9:0;
      tile.element.style.transform=`translateZ(${(spinning?Math.sin(u*Math.PI)*18:0)+proximity*8}px) rotateX(${base+spin+rx}deg) rotateY(${ry}deg)`;
      tile.element.style.setProperty('--face-shade',String(Math.abs(Math.sin((base+spin+rx)*Math.PI/180))*.22));
      tile.element.style.setProperty('--back-bleed',`${phase*1.5}px`);
      tile.element.style.setProperty('--back-radius',`${(1-phase)*9}px`);
      spins ||= spinning;
    }
    if(active&&cursor){cursor.style.left=`${active.x+(stage.clientWidth-width)/2}px`;cursor.style.top=`${active.y+8-56}px`;}
    story.classList.toggle('is-back-readable',progress===1&&pointerEnergy===0&&!spins);
    semanticState();headerState();
    if(visible&&(transitioning()||spins||pointerEnergy>0))frame=requestAnimationFrame(render);
  }
  function schedule(){if(enabled&&!disabled()&&!document.hidden&&!frame)frame=requestAnimationFrame(render);}
  function setScene(next:number,focus=false,keepPointer=false) {
    if(keepPointer){hoverIndex=-1;tiles.forEach(tile=>{tile.spinAt=-Infinity;});}
    else resetPointer();
    from=progress;target=next;started=performance.now();focusScene=focus?next:null; schedule();
  }
  function changeMode() {
    cancelAnimationFrame(frame);frame=0;
    const desired=!disabled()&&CSS.supports('transform-style','preserve-3d');
    if(desired===enabled){initialized=true;headerState();schedule();return;}
    const preserve=initialized;initialized=true;
    const oldTop=story.getBoundingClientRect().top+scrollY,oldHeight=story.offsetHeight,oldY=scrollY;
    const below=oldY>=oldTop+oldHeight,wasBack=enabled?progress>.5:back.getBoundingClientRect().top<innerHeight*.5;
    enabled=desired;resetPointer();
    if(enabled) {
      try {
        progress=target=from=(preserve?wasBack:scrollY>oldTop+10||location.hash==='#archive')?1:0;started=-Infinity;
        story.classList.add('is-enhanced');build();
        if(preserve&&below)window.scrollTo({top:oldY+story.offsetHeight-oldHeight,behavior:'instant'});
        else if(preserve&&oldY>=oldTop)window.scrollTo({top:oldTop,behavior:'instant'});
        render(performance.now());
      }catch{enabled=false;}
    }
    if(!enabled) {
      story.classList.remove('is-enhanced','is-back-readable');delete story.dataset.flipSide;layer?.remove();cursor?.remove();layer=undefined;cursor=undefined;tiles=[];
      for(const face of [front,back]){face.inert=false;face.removeAttribute('aria-hidden');face.querySelectorAll('a').forEach(a=>a.removeAttribute('tabindex'));}
      if(preserve&&!printing){if(below)window.scrollTo({top:oldY+story.offsetHeight-oldHeight,behavior:'instant'});else if(oldY>=oldTop)window.scrollTo({top:wasBack?back.getBoundingClientRect().top+scrollY:oldTop,behavior:'instant'});}
      headerState();
    }
  }
  function jumpBack(push:boolean) {
    if(!enabled)return;
    if(push)history.pushState(null,'','#archive');
    geometry();window.scrollTo({top,behavior:'instant'});setScene(1,push);
  }
  front.querySelectorAll<HTMLAnchorElement>('a[href="#archive"]').forEach(a=>a.addEventListener('click',e=>{
    if(enabled&&e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey){e.preventDefault();jumpBack(true);}
  }));
  // Consume only the gesture which changes the first scene, plus its inertia.
  // Once that gesture ends, ordinary downward scrolling resumes immediately.
  window.addEventListener('wheel',e=>{
    if(!enabled||disabled()||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||document.querySelector('dialog[open]'))return;
    if(Math.abs(scrollY-top)>3)return;
    const now=performance.now(),newGesture=now-lastWheel>180;lastWheel=now;
    if(newGesture)consumedGesture=false;
    if(transitioning()||(consumedGesture&&now<gestureUntil)){e.preventDefault();return;}
    consumedGesture=false;
    const next=requestedScene(target,e.deltaY);
    if(next!==null){e.preventDefault();consumedGesture=true;gestureUntil=now+1200;setScene(next,false,true);}
  },{passive:false});
  stage.addEventListener('touchstart',e=>{
    const p=e.touches[0];
    const control=(e.target as Element).closest('a,button,input,textarea,select,[contenteditable="true"]');
    touch=p?{x:p.clientX,y:p.clientY,consumed:false,eligible:!control&&enabled&&!disabled()&&Math.abs(scrollY-top)<=3&&!document.querySelector('dialog[open]')}:undefined;
  },{passive:true});
  stage.addEventListener('touchmove',e=>{
    if(!touch?.eligible||!enabled||disabled()||e.touches.length!==1)return;
    const p=e.touches[0],dy=touch.y-p.clientY,dx=touch.x-p.clientX;
    if(touch.consumed||transitioning()){e.preventDefault();return;}
    if(Math.abs(dy)<=Math.abs(dx))return;
    const next=requestedScene(target,dy);
    // Reserve the first vertical move, even a slow 1px drag. Waiting for a
    // larger threshold lets the browser scroll the scene away before flipping.
    if(next!==null){e.preventDefault();touch.consumed=true;window.scrollTo({top,behavior:'instant'});setScene(next);}
  },{passive:false});
  stage.addEventListener('touchend',()=>{touch=undefined;},{passive:true});
  stage.addEventListener('touchcancel',()=>{touch=undefined;},{passive:true});
  window.addEventListener('keydown',e=>{
    if(!enabled||disabled()||Math.abs(scrollY-top)>3||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;
    if((e.target as HTMLElement).closest('input,textarea,select,button,a,[contenteditable="true"]'))return;
    if(transitioning()&&['PageDown','PageUp',' ','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();return;}
    if((e.key==='ArrowDown'||e.key==='PageDown'||(e.key===' '&&!e.shiftKey))&&target===0){e.preventDefault();setScene(1,true);}
    else if((e.key==='ArrowUp'||e.key==='PageUp'||(e.key===' '&&e.shiftKey))&&target===1){e.preventDefault();setScene(0,true);}
  });
  window.addEventListener('scroll',()=>{
    headerState();
    if(enabled&&scrollY>top+height*.2&&target===0){progress=target=from=1;started=-Infinity;}
    schedule();
  },{passive:true});
  stage.addEventListener('pointermove',e=>{
    if(!enabled||disabled()||!fine.matches||e.pointerType==='touch'||document.querySelector('dialog[open]'))return;
    if((e.target as HTMLElement).closest('a,button')){resetPointer(false);schedule();return;}
    const b=stage.getBoundingClientRect();pointer={x:e.clientX-b.left-(stage.clientWidth-width)/2,y:e.clientY-b.top-8};stage.classList.add('pointer-active');pointerMovedAt=performance.now();
    const col=Math.floor(pointer.x/(width/columns)),row=Math.floor(pointer.y/((height-16)/6)),index=row*columns+col;
    if(col>=0&&col<columns&&row>=0&&row<6&&index!==hoverIndex){const now=performance.now();if(now-tiles[index].spinAt>1050&&!transitioning())tiles[index].spinAt=now;hoverIndex=index;}schedule();
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{resetPointer(false);schedule();});
  const rebuild=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{changeMode();if(enabled){cancelAnimationFrame(frame);frame=0;build();render(performance.now());}});};
  window.addEventListener('resize',rebuild);document.fonts.ready.then(rebuild);window.addEventListener('pageshow',rebuild);
  window.addEventListener('archive:motion',changeMode);reduce.addEventListener('change',changeMode);fine.addEventListener('change',()=>{resetPointer();schedule();});
  window.addEventListener('hashchange',()=>{if(!enabled)return;if(location.hash==='#archive')jumpBack(false);else if(!location.hash&&Math.abs(scrollY-top)<4)setScene(0);});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;resetPointer();if(!document.hidden)schedule();});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);cancelAnimationFrame(resizeFrame);frame=0;});
  window.addEventListener('beforeprint',()=>{printScroll=scrollY;printScene=target;printing=true;changeMode();});
  window.addEventListener('afterprint',()=>{printing=false;changeMode();window.scrollTo({top:printScroll,behavior:'instant'});if(enabled){progress=target=from=printScene;started=-Infinity;render(performance.now());}});
  changeMode();
  const nav=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  if(location.hash==='#archive'&&nav?.type!=='back_forward')requestAnimationFrame(()=>jumpBack(false));
}
