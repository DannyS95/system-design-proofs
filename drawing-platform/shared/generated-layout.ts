import type { BoardScene, CanvasElement, CanvasConnectorElement, CanvasPoint, CanvasShapeElement } from './contracts.js';
import { routeOrthogonal, routeOrthogonalWithPorts } from './orthogonal-routing.js';
import { availableConnectorPorts, type ConnectorPort } from './connector-ports.js';
import { LAYOUT_STANDARD, SPACING, arrowheadSize, connectorClearance, portOffsets, requiredPortSpan } from './layout-standard.js';
import { preferredTextWidth, minimumTextHeight, getConnectorLabelLayout } from '../src/editor/text-layout.js';

type Box = { x: number; y: number; width: number; height: number };
type Segment = [CanvasPoint, CanvasPoint];
const right = (b: Box) => b.x + b.width;
const bottom = (b: Box) => b.y + b.height;
const contains = (a: Box, b: Box) => a.x <= b.x && a.y <= b.y && right(a) >= right(b) && bottom(a) >= bottom(b);
const overlaps = (a: Box, b: Box, gap = 0) => a.x < right(b) + gap && right(a) + gap > b.x && a.y < bottom(b) + gap && bottom(a) + gap > b.y;
const expanded = (b: Box, amount: number): Box => ({ x: b.x - amount, y: b.y - amount, width: b.width + amount * 2, height: b.height + amount * 2 });
const union = (items: Box[]): Box => { const x = Math.min(...items.map(b => b.x)), y = Math.min(...items.map(b => b.y)); return { x, y, width: Math.max(...items.map(right)) - x, height: Math.max(...items.map(bottom)) - y }; };
const absolute = (c: CanvasConnectorElement): CanvasPoint[] => c.points.map(([x,y]) => [c.x+x,c.y+y]);
const segments = (points: CanvasPoint[]): Segment[] => points.slice(1).map((p,i) => [points[i],p]);
const isContainer = (e: CanvasElement): e is CanvasShapeElement & { layoutRole: "container" } => e.type === 'shape' && e.layoutRole === 'container';
const lineHitsBox = ([a,b]: Segment, box: Box) => {
  // Liang–Barsky clipping, including nonorthogonal mechanism segments.
  let lo = 0, hi = 1;
  const dx = b[0]-a[0], dy = b[1]-a[1];
  for (const [p,q] of [[-dx,a[0]-box.x],[dx,right(box)-a[0]],[-dy,a[1]-box.y],[dy,bottom(box)-a[1]]]) {
    if (Math.abs(p)<1e-8) { if(q<=0) return false; }
    else if(p<0) lo=Math.max(lo,q/p); else hi=Math.min(hi,q/p);
  }
  return lo < hi && hi > 0 && lo < 1;
};
const intersect = ([a,b]:Segment,[c,d]:Segment) => {
  const cross=(p:CanvasPoint,q:CanvasPoint,r:CanvasPoint)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  return cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0;
};
const parallelOverlap = ([a,b]:Segment,[c,d]:Segment, gap:number) => {
  if(a[1]===b[1] && c[1]===d[1]) return Math.abs(a[1]-c[1])<gap && Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0])) < Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]));
  if(a[0]===b[0] && c[0]===d[0]) return Math.abs(a[0]-c[0])<gap && Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1])) < Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]));
  return false;
};
const simplify = (points:CanvasPoint[]) => points.filter((p,i) => (!i || p[0]!==points[i-1][0] || p[1]!==points[i-1][1])).filter((p,i,a) => !i || i===a.length-1 || !((a[i-1][0]===p[0] && p[0]===a[i+1][0]) || (a[i-1][1]===p[1] && p[1]===a[i+1][1])));
const setPoints = (c:CanvasConnectorElement,p:CanvasPoint[]) => { const oldX=c.x, oldY=c.y; const b=union(p.map(([x,y])=>({x,y,width:0,height:0}))); Object.assign(c,b); c.points=p.map(([x,y])=>[x-c.x,y-c.y]); if(c.labelPosition)c.labelPosition=[c.labelPosition[0]+oldX-c.x,c.labelPosition[1]+oldY-c.y]; };

/** Only called for constructors/generated scenes, never while loading saved boards. */
export interface LayoutSpacing { nodeGap: number; edgeClearance: number }
export function layoutGeneratedScene(input:BoardScene, profile?:LayoutSpacing, generated = true):BoardScene {
  const nodeGap=Math.max(24,Math.min(160,profile?.nodeGap??SPACING.sibling));
  const edgeClearance=Math.max(24,Math.min(96,profile?.edgeClearance??SPACING.connector));
  const scene=structuredClone(input), elements=scene.elements;
  const rigidGroups=new Set(elements.filter(e=>e.type==='shape'&&e.layoutRole==='mechanism'&&!e.iconId).map(e=>e.layoutGroup).filter((g):g is string=>!!g));
  const original=new Map(elements.map(e=>[e.id,structuredClone(e)]));
  // Declare the legacy spatial containers before measuring their children.
  for(const e of elements) if(e.type==='shape' && !e.label && !e.iconId && e.shape==='rectangle' && !e.layoutGroup) e.layoutRole='container';
  const containers=elements.filter(isContainer);
  for(const e of elements) {
    if(e.parentId || e.type==='connector' || e.layoutGroup) continue;
    const parent=containers.filter(p=>p!==e && contains(p,e)).sort((a,b)=>a.width*a.height-b.width*b.height)[0];
    if(parent) e.parentId=parent.id;
  }
  // Text-bearing boxes shrink to natural content; mechanism geometry stays rigid.
  for(const e of elements) {
    if(e.type==='connector') { if(generated){e.fontSize=LAYOUT_STANDARD.labelFontSize;e.style.strokeWidth=Math.min(2.5,e.style.strokeWidth);} continue; }
    if(isContainer(e)) continue;
    if(rigidGroups.has(e.layoutGroup??'') && e.type==='shape') {
      if(e.iconId==='virtual-node'&&generated){e.fontSize=14;}
      continue;
    }
    if(generated && e.type==='system') { e.titleFontSize=LAYOUT_STANDARD.titleFontSize; e.bodyFontSize=LAYOUT_STANDARD.bodyFontSize; }
    if(generated && e.type==='shape' && e.label) e.fontSize=Math.min(20,e.fontSize??18);
    if(generated && e.type==='text') e.fontSize=Math.min(e.id==='title'?34:20,e.fontSize);
    if(e.type==='system' || e.type==='text' || (e.type==='shape' && e.label)) {
      e.width=Math.ceil(preferredTextWidth(e));
      e.height=Math.ceil(minimumTextHeight(e));
    }
  }
  // Port space is routing space. Measure each side from neighboring arrow
  // envelopes and order its ports by their destinations to avoid crossed fans.
  type PortEntry={connector:CanvasConnectorElement;end:'start'|'end';neighbor:number;offset:number};
  const sidePorts=new Map<string,PortEntry[]>(),endpointSides=new Map<string,number>();
  for(const c of elements){
    if(c.type!=='connector'||rigidGroups.has(c.layoutGroup??''))continue;
    const points=absolute(original.get(c.id) as CanvasConnectorElement);
    for(const end of ['start','end'] as const){
      const id=end==='start'?c.startBinding:c.endBinding,old=id?original.get(id):undefined;
      if(!old)continue;
      const p=end==='start'?points[0]:points.at(-1)!;
      const d=[Math.abs(p[0]-old.x),Math.abs(p[0]-right(old)),Math.abs(p[1]-old.y),Math.abs(p[1]-bottom(old))];
      const side=d.indexOf(Math.min(...d)),key=`${id}:${side}`;
      const otherId=end==='start'?c.endBinding:c.startBinding,other=otherId?original.get(otherId):undefined;
      const otherPoint=end==='start'?points.at(-1)!:points[0];
      const neighbor=side<2?(other?other.y+other.height/2:otherPoint[1]):(other?other.x+other.width/2:otherPoint[0]);
      const entries=sidePorts.get(key)??[];
      entries.push({connector:c,end,neighbor,offset:side<2?p[1]:p[0]});
      sidePorts.set(key,entries);endpointSides.set(`${c.id}:${end}`,side);
    }
  }
  for(const entries of sidePorts.values())entries.sort((a,b)=>a.neighbor-b.neighbor||a.connector.id.localeCompare(b.connector.id)||a.offset-b.offset||a.end.localeCompare(b.end));
  for(const e of elements){
    if(e.type==='connector'||rigidGroups.has(e.layoutGroup??'')||isContainer(e))continue;
    const spans=[0,1,2,3].map(side=>requiredPortSpan((sidePorts.get(`${e.id}:${side}`)??[]).map(p=>p.connector),edgeClearance));
    e.height=Math.max(e.height,spans[0],spans[1]);
    e.width=Math.max(e.width,spans[2],spans[3]);
  }
  // A text heading and its owning card form a compact division without a box.
  for(const group of new Set(elements.map(e=>e.layoutGroup).filter(Boolean))){
    if(rigidGroups.has(group??''))continue;
    const members=elements.filter(e=>e.layoutGroup===group&&!e.parentId&&e.type!=='connector');
    if(members.length<2||members.some(isContainer))continue;
    const x=Math.min(...members.map(e=>e.x));let y=Math.min(...members.map(e=>e.y));
    const gap=members.every(e=>e.type==='system')?Math.max(nodeGap,edgeClearance*3):SPACING.compact;
    for(const e of members.sort((a,b)=>a.y-b.y)){e.x=x;e.y=y;y+=e.height+gap;}
  }
  const shift=(e:CanvasElement,dx:number,dy:number)=>{
    e.x+=dx;e.y+=dy;
    for(const c of elements.filter(c=>c.parentId===e.id))shift(c,dx,dy);
  };
  // A section is packed from its child rows; a mechanism group translates as
  // one rigid unit. Original order provides topology, never empty box sizes.
  type Unit={members:CanvasElement[];before:Box;bounds:Box};
  const pack=(parent?:CanvasShapeElement)=>{
    const children=elements.filter(e=>e.type!=='connector' && e.parentId===parent?.id);
    for(const child of children.filter(isContainer))pack(child);
    const units:Unit[]=[];
    for(const child of children){
      let unit=child.layoutGroup?units.find(u=>u.members[0].layoutGroup===child.layoutGroup):undefined;
      if(!unit){unit={members:[],before:child,bounds:child};units.push(unit);}
      unit.members.push(child);
      unit.before=union(unit.members.map(e=>original.get(e.id)!));unit.bounds=union(unit.members);
    }
    const rows:{items:Unit[];y:number;oldHeight:number;header:boolean}[]=[];
    for(const unit of units.sort((a,b)=>a.before.y-b.before.y||a.before.x-b.before.x)){
      let row=rows.at(-1);
      const allText=unit.members.every(e=>e.type==='text');
      const header=allText&&unit.members.some(e=>(parent&&e.id===`${parent.id}-label`)||(e.type==='text'&&e.fontSize>=18));
      if(!row || (row.header&&!allText) || (header&&!row.items.every(u=>u.members.every(e=>e.type==='text'))) || unit.before.y-row.y>Math.max(SPACING.section,row.oldHeight*.4)){
        row={items:[],y:unit.before.y,oldHeight:unit.before.height,header};rows.push(row);
      }
      row.items.push(unit);
    }
    const anchors=[...new Set(units.map(u=>u.before.x))].sort((a,b)=>a-b);
    const positions=new Map(anchors.map(a=>[a,parent?parent.x+(parent.containerPadding??LAYOUT_STANDARD.sectionPadding):SPACING.sibling]));
    const constraints:{from:number;to:number;distance:number}[]=[];
    const between=(a:Unit,b:Unit)=>{
      const descendants=(unit:Unit,id:string|undefined):boolean=>{
        let current=id?elements.find(e=>e.id===id):undefined;
        while(current){if(unit.members.includes(current))return true;current=current.parentId?elements.find(e=>e.id===current!.parentId):undefined;}
        return false;
      };
      const links=elements.filter((e):e is CanvasConnectorElement=>e.type==='connector' && !!e.label && ((descendants(a,e.startBinding)&&descendants(b,e.endBinding))||(descendants(a,e.endBinding)&&descendants(b,e.startBinding))));
      return Math.max(nodeGap,edgeClearance*2,...links.map(e=>getConnectorLabelLayout(e.label!,e.fontSize).width+edgeClearance*2));
    };
    for(const a of units)for(const b of units){
      if(a.before.x>=b.before.x)continue;
      const sameRow=rows.some(row=>row.items.includes(a)&&row.items.includes(b));
      const columnPeers=a.members.some(e=>e.type!=='text')&&b.members.some(e=>e.type!=='text')&&right(a.before)<=b.before.x;
      if(sameRow||columnPeers)constraints.push({from:a.before.x,to:b.before.x,distance:a.bounds.width+between(a,b)});
    }
    for(const [i,anchor] of anchors.entries()){
      if(i)positions.set(anchor,Math.max(positions.get(anchor)!,positions.get(anchors[i-1])!));
      for(const c of constraints.filter(c=>c.from===anchor))positions.set(c.to,Math.max(positions.get(c.to)!,positions.get(anchor)!+c.distance));
    }
    let y=parent?parent.y+(parent.containerPadding??LAYOUT_STANDARD.sectionPadding):SPACING.sibling;
    for(const row of rows){
      let height=0;
      const largest=Math.max(...row.items.map(u=>u.bounds.height));
      let previousUnit: Unit | undefined;
      let previousRight = Number.NEGATIVE_INFINITY;
      for(const unit of row.items.sort((a,b)=>a.before.x-b.before.x)){
        const offset=row.header?0:Math.min(unit.before.y-row.y,largest/2);
        const targetX = Math.max(positions.get(unit.before.x)!, previousUnit ? previousRight + between(previousUnit, unit) : Number.NEGATIVE_INFINITY);
        const dx=targetX-unit.bounds.x,dy=y+offset-unit.bounds.y;
        previousRight = targetX + unit.bounds.width;
        previousUnit = unit;
        unit.members.forEach(e=>shift(e,dx,dy));
        const group=unit.members[0].layoutGroup;
        if(group)for(const c of elements.filter(e=>e.type==='connector'&&e.layoutGroup===group&&!e.parentId))shift(c,dx,dy);
        height=Math.max(height,offset+unit.bounds.height);
      }
      y+=height+(row.header?SPACING.sibling:Math.max(nodeGap,edgeClearance*3,Math.ceil(getConnectorLabelLayout("operation",LAYOUT_STANDARD.labelFontSize).plateHeight+SPACING.label*2+edgeClearance)));
    }
    if(parent && children.length)Object.assign(parent,expanded(union(children),parent.containerPadding??LAYOUT_STANDARD.sectionPadding));
  };
  pack();
  // Packing can change which side faces a destination. Reassign into measured
  // free side slots using the placed geometry, without growing a packed card.
  const placedById=new Map(elements.map(e=>[e.id,e]));
  const nodePorts=new Map<string,PortEntry[]>();
  for(const entries of sidePorts.values())for(const entry of entries){
    const id=entry.end==='start'?entry.connector.startBinding:entry.connector.endBinding;
    if(!id)continue;
    const own=nodePorts.get(id)??[];own.push(entry);nodePorts.set(id,own);
  }
  sidePorts.clear();
  for(const [id,entries] of nodePorts){
    const e=placedById.get(id)!;
    const endpointTarget=(entry:PortEntry):CanvasPoint=>{
      const otherId=entry.end==='start'?entry.connector.endBinding:entry.connector.startBinding;
      const other=otherId?placedById.get(otherId):undefined;
      const points=absolute(original.get(entry.connector.id) as CanvasConnectorElement);
      return other?[other.x+other.width/2,other.y+other.height/2]:entry.end==='start'?points.at(-1)!:points[0];
    };
    const blocked=(side:number)=>{
      const center:CanvasPoint=side<2?[side===0?e.x:right(e),e.y+e.height/2]:[e.x+e.width/2,side===2?e.y:bottom(e)];
      const out:CanvasPoint=[center[0]+(side===0?-edgeClearance:side===1?edgeClearance:0),center[1]+(side===2?-edgeClearance:side===3?edgeClearance:0)];
      return elements.some(other=>other!==e&&other.type!=='connector'&&!isContainer(other)&&
        !(rigidGroups.has(e.layoutGroup??'')&&other.layoutGroup===e.layoutGroup)&&!contains(other,e)&&!contains(e,other)&&
        lineHitsBox([center,out],expanded(other,SPACING.compact)));
    };
    for(const entry of entries.sort((a,b)=>a.connector.id.localeCompare(b.connector.id)||a.end.localeCompare(b.end))){
      const target=endpointTarget(entry),dx=(target[0]-e.x-e.width/2)/Math.max(1,e.width),dy=(target[1]-e.y-e.height/2)/Math.max(1,e.height);
      const scores=[dx,-dx,dy,-dy];
      if(rigidGroups.has(e.layoutGroup??'')){
        const ring=elements.find(m=>m.layoutGroup===e.layoutGroup&&m.type==='shape'&&m.layoutRole==='mechanism'&&!m.iconId);
        if(ring){const rx=e.x+e.width/2-ring.x-ring.width/2,ry=e.y+e.height/2-ring.y-ring.height/2;
          const outward=Math.abs(rx)>=Math.abs(ry)?(rx<0?0:1):(ry<0?2:3);
          for(let side=0;side<4;side++)scores[side]=side===outward?-100000:100000;
        }
      }
      const candidates=[0,1,2,3].map(side=>{
        const current=sidePorts.get(`${id}:${side}`)??[];
        const required=requiredPortSpan([...current.map(p=>p.connector),entry.connector],edgeClearance);
        const overflow=Math.max(0,required-(side<2?e.height:e.width));
        return {side,score:scores[side]+Number(blocked(side))*10000+overflow*100000};
      }).sort((a,b)=>a.score-b.score||a.side-b.side);
      const side=candidates[0].side,key=`${id}:${side}`;
      entry.neighbor=side<2?target[1]:target[0];
      const current=sidePorts.get(key)??[];current.push(entry);sidePorts.set(key,current);
      endpointSides.set(`${entry.connector.id}:${entry.end}`,side);
    }
  }
  for(const entries of sidePorts.values())entries.sort((a,b)=>a.neighbor-b.neighbor||a.connector.id.localeCompare(b.connector.id)||a.offset-b.offset||a.end.localeCompare(b.end));
  for(const group of rigidGroups){
    const ring=elements.find(e=>e.layoutGroup===group&&e.type==='shape'&&e.layoutRole==='mechanism'&&!e.iconId);
    if(!ring)continue;
    const tokens=elements.filter(e=>e.layoutGroup===group&&e!==ring&&e.type==='shape');
    for(const label of elements.filter(e=>e.layoutGroup===group&&e.type==='text')){
      if(tokens.some(token=>overlaps(token,label,SPACING.label))){
        label.x=ring.x+(ring.width-label.width)/2;
        label.y=ring.y+(ring.height-label.height)/2;
      }
    }
  }
  // Repair bindings against measured bounds using their originally chosen side.
  const byId=new Map(elements.map(e=>[e.id,e]));
  const port=(c:CanvasConnectorElement,end:'start'|'end'): {point:CanvasPoint;out:CanvasPoint}|undefined=>{
    const id=end==='start'?c.startBinding:c.endBinding,e=id?byId.get(id):undefined;
    const side=endpointSides.get(`${c.id}:${end}`);
    if(!e||side===undefined)return undefined;
    const entries=sidePorts.get(`${id}:${side}`)??[];
    const index=entries.findIndex(entry=>entry.connector.id===c.id&&entry.end===end);
    const along=side<2?e.height:e.width;
    const offset=portOffsets(entries.map(entry=>entry.connector),along,edgeClearance)[index]??along/2;
    const point:CanvasPoint=side<2?[side===0?e.x:right(e),e.y+offset]:[e.x+offset,side===2?e.y:bottom(e)];
    if(e.type==='shape' && e.shape!=='rectangle'){
      // Project distinct side slots to the actual outline. Resetting all slots
      // to a cardinal point would pile multiple arrowheads on one another.
      const ratio=Math.min(1,Math.abs(offset-along/2)/(along/2));
      const extent=e.shape==='ellipse'?Math.sqrt(1-ratio*ratio):1-ratio;
      if(side<2)point[0]=e.x+e.width/2+(side===0?-1:1)*e.width/2*extent;
      else point[1]=e.y+e.height/2+(side===2?-1:1)*e.height/2*extent;
    }
    const out:CanvasPoint=side<2?[side===0?e.x-edgeClearance:right(e)+edgeClearance,point[1]]:
      [point[0],side===2?e.y-edgeClearance:bottom(e)+edgeClearance];
    return {point,out};
  };
  const routes=elements.filter((e):e is CanvasConnectorElement=>e.type==='connector');
  const routed:CanvasConnectorElement[]=[];
  const contexts=new Map<string,{a:CanvasPoint;b:CanvasPoint;start?:CanvasPoint;end?:CanvasPoint;boxes:Box[]}>();
  const obstacles=elements.filter(e=>e.type!=='connector'&&!isContainer(e)&&!(e.type==='shape'&&e.layoutRole==='mechanism'));
  for(const c of routes){
    if(rigidGroups.has(c.layoutGroup??'')){routed.push(c);continue;}
    const s=port(c,'start'),t=port(c,'end'),old=absolute(c);
    const a=s?.out??old[0],b=t?.out??old.at(-1)!;
    const forbidden=obstacles.filter(e=>e.id!==c.startBinding&&e.id!==c.endBinding && e.parentId!==c.startBinding && e.parentId!==c.endBinding);
    const mechanism=elements.filter(e=>e.type==='shape'&&e.layoutRole==='mechanism'&&!e.iconId);
    for(const m of mechanism)if(m.id!==c.startBinding&&m.id!==c.endBinding && m.layoutGroup!==byId.get(c.endBinding??'')?.layoutGroup && m.layoutGroup!==byId.get(c.startBinding??'')?.layoutGroup)forbidden.push(m);
    const ancestor=(p:CanvasElement,id:string|undefined):boolean=>{
      let current=id?byId.get(id):undefined;
      while(current){if(current.id===p.id)return true;current=current.parentId?byId.get(current.parentId):undefined;}
      return false;
    };
    for(const frame of containers)if(!ancestor(frame,c.startBinding)&&!ancestor(frame,c.endBinding))forbidden.push(frame);
    const endpointBoxes=[byId.get(c.startBinding??''),byId.get(c.endBinding??'')].filter((e):e is CanvasElement=>!!e && !rigidGroups.has(e.layoutGroup??''));
    contexts.set(c.id,{a,b,start:s?.point,end:t?.point,boxes:[...forbidden,...endpointBoxes].map(e=>expanded(e,edgeClearance))});
    const boxes=forbidden.map(e=>expanded(e,SPACING.compact));
    // Dedicated semantic lanes are preferred at the right edge for long paths.
    const contentRight=Math.max(...obstacles.map(right));
    const colorLane=c.style.strokeStyle==='dotted'?5:c.style.stroke==='#527760'?2:c.style.stroke==='#775d83'?1:3;
    const xs=[(a[0]+b[0])/2,a[0],b[0],...old.map(p=>p[0]),contentRight+edgeClearance*(colorLane+1),...boxes.flatMap(e=>[e.x-SPACING.compact,right(e)+SPACING.compact])];
    const ys=[(a[1]+b[1])/2,a[1],b[1],...old.map(p=>p[1]),...boxes.flatMap(e=>[e.y-SPACING.compact,bottom(e)+SPACING.compact])];
    const candidates:CanvasPoint[][]=[[a,b],[a,[b[0],a[1]],b],[a,[a[0],b[1]],b]];
    for(const x of new Set(xs))candidates.push([a,[x,a[1]],[x,b[1]],b]);
    for(const y of new Set(ys))candidates.push([a,[a[0],y],[b[0],y],b]);
    if(old.length>2)candidates.push([a,...old.slice(1,-1),b]);
    let best:CanvasPoint[]|undefined,bestScore=Infinity;
    for(const route of candidates){
      const p=simplify([...(s?[s.point]:[]),...route,...(t?[t.point]:[])]),ss=segments(p);
      if(ss.some(([u,v])=>u[0]!==v[0]&&u[1]!==v[1]))continue;
      if(ss.some(seg=>boxes.some(box=>lineHitsBox(seg,box))))continue;
      const boundBoxes=[byId.get(c.startBinding??''),byId.get(c.endBinding??'')].filter((e):e is CanvasElement=>!!e);
      if(segments(route).some(seg=>boundBoxes.some(box=>lineHitsBox(seg,box))))continue;
      let cost=ss.reduce((n,[u,v])=>n+Math.abs(u[0]-v[0])+Math.abs(u[1]-v[1]),0)+p.length*edgeClearance;
      for(const r of routed)for(const rs of segments(absolute(r)))for(const cs of ss){
        if(parallelOverlap(cs,rs,connectorClearance(c,r)))cost+=100000;
        if(intersect(cs,rs))cost+=10000;
      }
      if(cost<bestScore){best=p;bestScore=cost;}
    }
    if(!best || bestScore>=10000){
      const occupied=routed.map(r=>({points:absolute(r),clearance:Math.max(edgeClearance,connectorClearance(c,r))}));
      const safe=routeOrthogonal(a,b,contexts.get(c.id)!.boxes,occupied,edgeClearance)
        ??routeOrthogonal(a,b,contexts.get(c.id)!.boxes,occupied,edgeClearance,{allowCrossings:true})
        ??routeOrthogonal(a,b,contexts.get(c.id)!.boxes,[],edgeClearance);
      if(safe)best=simplify([...(s?[s.point]:[]),...safe,...(t?[t.point]:[])]);
    }
    // A wider clearance can put the old outward stub inside a neighbor.
    // Try free boundary ports before rejecting an otherwise routable board.
    if (!best) {
      const context = contexts.get(c.id)!;
      const occupied = routed.map(r => ({ points: absolute(r), clearance: Math.max(edgeClearance, connectorClearance(c,r)) }));
      const working = [...elements.filter(e => e.type !== 'connector'), ...routed];
      const alternatives = (end:'start'|'end'):ConnectorPort[] => {
        const id = end === 'start' ? c.startBinding : c.endBinding;
        const node = id ? byId.get(id) : undefined;
        const fallback = end === 'start' ? { point: s?.point ?? a, out: a } : { point: t?.point ?? b, out: b };
        return [fallback, ...(node ? availableConnectorPorts(node,c,working,edgeClearance) : [])]
          .filter(p => !boxes.some(box => lineHitsBox([p.point,p.out],box)));
      };
      const starts = alternatives('start'), ends = alternatives('end');
      // Arrow clearance governs neighboring routes. Fixed mechanism labels
      // still reserve normal content padding, even at the widest route setting.
      const fallbackBoxes = [...forbidden, ...endpointBoxes].map(e => expanded(e,SPACING.compact));
      const flexible = routeOrthogonalWithPorts(starts.map(p=>p.out),ends.map(p=>p.out),fallbackBoxes,occupied,edgeClearance)
        ?? routeOrthogonalWithPorts(starts.map(p=>p.out),ends.map(p=>p.out),fallbackBoxes,occupied,edgeClearance,{allowCrossings:true});
      if (flexible) {
        const same = (p:CanvasPoint,q:CanvasPoint) => Math.abs(p[0]-q[0])<1e-7 && Math.abs(p[1]-q[1])<1e-7;
        const start = starts.find(p=>same(p.out,flexible[0]))!, end = ends.find(p=>same(p.out,flexible.at(-1)!))!;
        best = simplify([start.point,...flexible,end.point]);
        Object.assign(context,{a:start.out,b:end.out,start:start.point,end:end.point,boxes:fallbackBoxes});
      }
    }
    if(best)setPoints(c,best);
    else throw new Error(`No obstacle-free route for ${c.id}`);
    routed.push(c);
  }
  // Negotiated routing: later routes can constrain an earlier greedy choice.
  // Retry the actual conflicting path against every other route before labels.
  for(let pass=0;pass<3;pass++){
    let changed=false;
    for(const c of routes){
      const context=contexts.get(c.id);if(!context)continue;
      const others=routes.filter(r=>r!==c);
      const current=segments(absolute(c));
      const conflicts=others.some(r=>segments(absolute(r)).some(rs=>current.some(cs=>intersect(cs,rs)||parallelOverlap(cs,rs,Math.max(edgeClearance,connectorClearance(c,r))))));
      if(!conflicts)continue;
      const occupied=others.map(r=>({points:absolute(r),clearance:Math.max(edgeClearance,connectorClearance(c,r))}));
      const clear=(path:CanvasPoint[])=>!others.some(r=>segments(absolute(r)).some(rs=>segments(path).some(cs=>intersect(cs,rs)||parallelOverlap(cs,rs,Math.max(edgeClearance,connectorClearance(c,r))))));
      const safe=routeOrthogonal(context.a,context.b,context.boxes,occupied,edgeClearance);
      const fixed=safe?simplify([...(context.start?[context.start]:[]),...safe,...(context.end?[context.end]:[])]):undefined;
      if(fixed&&clear(fixed)){setPoints(c,fixed);changed=true;continue;}
      const alternatives=(end:'start'|'end'):ConnectorPort[]=>{
        const id=end==='start'?c.startBinding:c.endBinding,node=id?byId.get(id):undefined;
        const out=end==='start'?context.a:context.b,point=(end==='start'?context.start:context.end)??out;
        if(!node||rigidGroups.has(node.layoutGroup??''))return [{point,out}];
        return availableConnectorPorts(node,c,elements,edgeClearance);
      };
      const starts=alternatives('start'),ends=alternatives('end');
      const flexible=routeOrthogonalWithPorts(starts.map(p=>p.out),ends.map(p=>p.out),context.boxes,occupied,edgeClearance);
      if(flexible){
        const same=(a:CanvasPoint,b:CanvasPoint)=>Math.abs(a[0]-b[0])<1e-7&&Math.abs(a[1]-b[1])<1e-7;
        const start=starts.find(p=>same(p.out,flexible[0]))!,end=ends.find(p=>same(p.out,flexible.at(-1)!))!;
        const path=simplify([start.point,...flexible,end.point]);
        if(clear(path)){setPoints(c,path);Object.assign(context,{a:start.out,b:end.out,start:start.point,end:end.point});changed=true;}
      }
    }
    if(!changed)break;
  }
  // A planar solution may require moving two mutually blocking routes at once.
  // Rip up only connected sets of conflicting routes, preserving every clean
  // route, then accept a batch only when all its paths fit without crossings.
  const conflictGraph=new Map<string,Set<string>>();
  for(const [index,c] of routes.entries())for(const other of routes.slice(index+1)){
    if(!contexts.has(c.id)||!contexts.has(other.id))continue;
    if(!segments(absolute(c)).some(cs=>segments(absolute(other)).some(rs=>intersect(cs,rs)||parallelOverlap(cs,rs,Math.max(edgeClearance,connectorClearance(c,other))))))continue;
    const first=conflictGraph.get(c.id)??new Set<string>(),second=conflictGraph.get(other.id)??new Set<string>();
    first.add(other.id);second.add(c.id);conflictGraph.set(c.id,first);conflictGraph.set(other.id,second);
  }
  const processed=new Set<string>();
  for(const id of conflictGraph.keys()){
    if(processed.has(id))continue;
    const ids=new Set<string>(),pending=[id];
    while(pending.length){const next=pending.pop()!;if(ids.has(next))continue;ids.add(next);processed.add(next);pending.push(...(conflictGraph.get(next)??[]));}
    const batch=routes.filter(c=>ids.has(c.id));
    const length=(c:CanvasConnectorElement)=>segments(absolute(c)).reduce((sum,[a,b])=>sum+Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]),0);
    const orders=[batch,[...batch].reverse(),[...batch].sort((a,b)=>length(a)-length(b)),[...batch].sort((a,b)=>length(b)-length(a)),[...batch].sort((a,b)=>a.id.localeCompare(b.id))];
    for(const order of orders){
      const working=elements.filter(e=>!ids.has(e.id)),results:{connector:CanvasConnectorElement;path:CanvasPoint[];start:ConnectorPort;end:ConnectorPort}[]=[];
      for(const c of order){
        const context=contexts.get(c.id)!;
        const alternatives=(end:'start'|'end'):ConnectorPort[]=>{
          const nodeId=end==='start'?c.startBinding:c.endBinding,node=nodeId?byId.get(nodeId):undefined;
          const out=end==='start'?context.a:context.b,point=(end==='start'?context.start:context.end)??out;
          return !node||rigidGroups.has(node.layoutGroup??'')?[{point,out}]:availableConnectorPorts(node,c,working,edgeClearance);
        };
        const starts=alternatives('start'),ends=alternatives('end');
        const occupied=working.filter((e):e is CanvasConnectorElement=>e.type==='connector').map(r=>({points:absolute(r),clearance:Math.max(edgeClearance,connectorClearance(c,r))}));
        const middle=routeOrthogonalWithPorts(starts.map(p=>p.out),ends.map(p=>p.out),context.boxes,occupied,edgeClearance);
        if(!middle)break;
        const same=(a:CanvasPoint,b:CanvasPoint)=>Math.abs(a[0]-b[0])<1e-7&&Math.abs(a[1]-b[1])<1e-7;
        const start=starts.find(p=>same(p.out,middle[0]))!,end=ends.find(p=>same(p.out,middle.at(-1)!))!;
        const path=simplify([start.point,...middle,end.point]),copy=structuredClone(c);setPoints(copy,path);working.push(copy);
        results.push({connector:c,path,start,end});
      }
      if(results.length===batch.length){
        for(const result of results){setPoints(result.connector,result.path);Object.assign(contexts.get(result.connector.id)!,{a:result.start.out,b:result.end.out,start:result.start.point,end:result.end.point});}
        break;
      }
    }
  }
  // Final compaction removes edge capacity freed by route repair. Side ports
  // keep their separation; trailing boundary stubs follow the shrinking card.
  for(const e of elements){
    if(e.type==='connector'||isContainer(e)||rigidGroups.has(e.layoutGroup??''))continue;
    const endpoints=routes.flatMap(c=>['start','end'].flatMap(end=>{
      if((end==='start'?c.startBinding:c.endBinding)!==e.id)return [];
      const p=end==='start'?absolute(c)[0]:absolute(c).at(-1)!;
      return [{p,margin:SPACING.padding+arrowheadSize(c.style.strokeWidth)/2}];
    }));
    const oldRight=right(e),oldBottom=bottom(e);
    e.width=Math.min(e.width,Math.max(preferredTextWidth(e),...endpoints.filter(({p})=>Math.abs(p[0]-oldRight)>=.5).map(({p,margin})=>p[0]-e.x+margin)));
    e.height=Math.min(e.height,Math.max(minimumTextHeight(e),...endpoints.filter(({p})=>Math.abs(p[1]-oldBottom)>=.5).map(({p,margin})=>p[1]-e.y+margin)));
    // Extend boundary stubs only into the strip just vacated by the card.
    // This removes unused port capacity even when a bottom/right port is used.
    for(const c of routes){
      if(c.startBinding!==e.id&&c.endBinding!==e.id)continue;
      const points=absolute(c);
      for(const end of ['start','end'] as const){
        if((end==='start'?c.startBinding:c.endBinding)!==e.id)continue;
        const p=end==='start'?points[0]:points.at(-1)!;
        if(Math.abs(p[0]-oldRight)<.5)p[0]=right(e);
        if(Math.abs(p[1]-oldBottom)<.5)p[1]=bottom(e);
      }
      setPoints(c,points);
    }
  }
  const depth=(e:CanvasElement):number=>e.parentId?1+depth(byId.get(e.parentId)!):0;
  for(const frame of [...containers].sort((a,b)=>depth(b)-depth(a))){
    const children=elements.filter(e=>e.parentId===frame.id);
    if(children.length&&!routes.some(c=>c.startBinding===frame.id||c.endBinding===frame.id))Object.assign(frame,expanded(union(children),frame.containerPadding??LAYOUT_STANDARD.sectionPadding));
  }
  // Labels are measured after routes, on straight segments, away from all ink.
  const labels:Box[]=[];
  const labelObstacles=elements.filter(e=>e.type!=="connector"&&!isContainer(e));
  const ancestorOf=(frame:CanvasElement,id:string|undefined):boolean=>{
    let e=id?byId.get(id):undefined;
    while(e){if(e.id===frame.id)return true;e=e.parentId?byId.get(e.parentId):undefined;}
    return false;
  };
  const frameGrowth=new Map<string,Box>();
  for(const c of routes){
    if(!c.label)continue;
    const layout=getConnectorLabelLayout(c.label,c.fontSize),w=layout.width,h=layout.height+LAYOUT_STANDARD.labelPaddingY*2;
    const ss=segments(absolute(c)).sort((a,b)=>Math.hypot(b[1][0]-b[0][0],b[1][1]-b[0][1])-Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1]));
    let chosen:Box|undefined;
    findLabel: for(const [a,b] of ss){
      // Try familiar anchors first, then scan the remaining straight segment.
      // A long route can have a small free interval between two occupied plates.
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const steps=Math.max(1,Math.ceil(length/SPACING.label));
      const anchors=[.5,.25,.75,.1,.9];
      const samples=Array.from({length:steps-1},(_,i)=>(i+1)/steps);
      for(const fractions of [anchors,samples])for(const distance of [SPACING.label,SPACING.padding,edgeClearance,SPACING.sibling])for(const fraction of fractions)for(const sign of [-1,1]){
        const horizontal=Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1]);
        const box={x:a[0]+(b[0]-a[0])*fraction-w/2+(horizontal?0:sign*(w/2+distance)),y:a[1]+(b[1]-a[1])*fraction-h/2+(horizontal?sign*(h/2+distance):0),width:w,height:h};
        if(labelObstacles.some(e=>overlaps(e,box,SPACING.label))||labels.some(l=>overlaps(l,box,SPACING.label)))continue;
        const touched=containers.filter(frame=>overlaps(expanded(frame,SPACING.label),box)&&!contains(expanded(frame,-SPACING.label),box));
        if(touched.some(frame=>!ancestorOf(frame,c.startBinding)||!ancestorOf(frame,c.endBinding)))continue;
        const growth=touched.map(frame=>({frame,bounds:union([frameGrowth.get(frame.id)??frame,expanded(box,frame.containerPadding??LAYOUT_STANDARD.sectionPadding)])}));
        if(growth.some(({bounds})=>labels.some(l=>overlaps(expanded(bounds,SPACING.label),l)&&!contains(expanded(bounds,-SPACING.label),l))))continue;
        if(growth.some(({frame,bounds})=>elements.some(e=>e.type!=='connector'&&e!==frame&&!ancestorOf(frame,e.id)&&!ancestorOf(e,frame.id)&&overlaps(bounds,e,SPACING.label))))continue;
        if(routes.some(r=>segments(absolute(r)).some(seg=>lineHitsBox(seg,expanded(box,4)))))continue;
        chosen=box;
        for(const {frame,bounds} of growth){frameGrowth.set(frame.id,bounds);Object.assign(frame,bounds);}
        break findLabel;
      }
      if(chosen)break;
    }
    if(chosen){c.labelPosition=[chosen.x+w/2-c.x,chosen.y+h/2-c.y];labels.push(chosen);}
  }
  for(const [id,bounds] of frameGrowth){const frame=byId.get(id);if(frame)Object.assign(frame,bounds);}
  const bounds=union([...elements.filter(e=>e.type!=='connector'||!e.layoutGroup),...labels]);
  scene.appState.camera={x:nodeGap-bounds.x*.8,y:96-bounds.y*.8,zoom:.8};
  scene.appState.layoutSpacing={nodeGap,edgeClearance};
  return scene;
}

/** Explicit, undoable editor operation; preserves authored typography. */
export const tidySceneLayout = (scene:BoardScene, profile:LayoutSpacing):BoardScene => {
  const visible = scene.elements.filter(element => !element.deleted);
  if (visible.some(element => element.locked)) throw new Error("Unlock all elements before tidying the board.");
  if (!visible.length) return { ...structuredClone(scene), appState: { ...structuredClone(scene.appState), layoutSpacing: { ...profile } } };
  const next = layoutGeneratedScene({ ...scene, elements: visible },profile,false);
  const byId = new Map(next.elements.map(element => [element.id, element]));
  next.elements = scene.elements.map(element => byId.get(element.id) ?? structuredClone(element));
  return next;
};
