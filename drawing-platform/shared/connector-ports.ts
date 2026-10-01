import type { CanvasConnectorElement, CanvasElement, CanvasPoint } from "./contracts.js";
import { arrowheadSize, connectorClearance, SPACING } from "./layout-standard.js";

export interface ConnectorPort { point:CanvasPoint; out:CanvasPoint }

const strokesConflict=(a:CanvasPoint,b:CanvasPoint,c:CanvasPoint,d:CanvasPoint,gap:number)=>{
  const overlap=(a:number,b:number,c:number,d:number)=>
    Math.max(Math.min(a,b),Math.min(c,d))<Math.min(Math.max(a,b),Math.max(c,d))-1e-7;
  if(a[1]===b[1]&&c[1]===d[1])return Math.abs(a[1]-c[1])<gap-1e-7&&overlap(a[0],b[0],c[0],d[0]);
  if(a[0]===b[0]&&c[0]===d[0])return Math.abs(a[0]-c[0])<gap-1e-7&&overlap(a[1],b[1],c[1],d[1]);
  const cross=(a:CanvasPoint,b:CanvasPoint,c:CanvasPoint)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
  return abC*abD<=0&&cdA*cdB<=0&&
    Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&
    Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]));
};

/** Free boundary slots for a route that needs a different planar entry side. */
export function availableConnectorPorts(
  node:CanvasElement,
  connector:CanvasConnectorElement,
  elements:readonly CanvasElement[],
  clearance:number,
):ConnectorPort[] {
  const occupied=elements.filter((e):e is CanvasConnectorElement=>e.type==='connector'&&!e.deleted&&e.id!==connector.id)
    .flatMap(route=>['start','end'].flatMap(end=>{
      if((end==='start'?route.startBinding:route.endBinding)!==node.id)return [];
      const point=end==='start'?route.points[0]:route.points.at(-1)!;
      return [{point:[route.x+point[0],route.y+point[1]] as CanvasPoint,
        clearance:Math.max(clearance,connectorClearance(connector,route))}];
    }));
  const cornerPadding=SPACING.padding+arrowheadSize(connector.style.strokeWidth)/2;
  const ports:ConnectorPort[]=[];
  const byId=new Map(elements.map(element=>[element.id,element]));
  const ancestorIds=new Set<string>();
  let parent=node.parentId;
  while(parent&&!ancestorIds.has(parent)){ancestorIds.add(parent);parent=byId.get(parent)?.parentId;}
  const rigidGroup=node.layoutGroup&&elements.some(e=>e.layoutGroup===node.layoutGroup&&
    e.type==='shape'&&e.layoutRole==='mechanism'&&!e.iconId);
  const blocks=elements.filter(e=>e.type!=='connector'&&!e.deleted&&e.id!==node.id&&!ancestorIds.has(e.id)&&
    !(e.parentId===node.id)&&!(rigidGroup&&e.layoutGroup===node.layoutGroup));
  const stubBlocked=(point:CanvasPoint,out:CanvasPoint)=>blocks.some(box=>{
    const left=box.x-SPACING.compact,right=box.x+box.width+SPACING.compact;
    const top=box.y-SPACING.compact,bottom=box.y+box.height+SPACING.compact;
    if(point[1]===out[1])return point[1]>top&&point[1]<bottom&&
      Math.max(Math.min(point[0],out[0]),left)<Math.min(Math.max(point[0],out[0]),right);
    return point[0]>left&&point[0]<right&&
      Math.max(Math.min(point[1],out[1]),top)<Math.min(Math.max(point[1],out[1]),bottom);
  });
  for(const side of [0,1,2,3]){
    const along=side<2?node.height:node.width;
    const low=Math.min(along/2,cornerPadding),high=Math.max(along/2,along-cornerPadding);
    const offsets=new Set([along/2,low,high,low+(high-low)/4,low+(high-low)*3/4]);
    for(const endpoint of occupied){
      const offset=side<2?endpoint.point[1]-node.y:endpoint.point[0]-node.x;
      for(const candidate of [offset-endpoint.clearance,offset+endpoint.clearance])
        if(candidate>=low&&candidate<=high)offsets.add(candidate);
    }
    for(const offset of [...offsets].sort((a,b)=>a-b)){
      const point:CanvasPoint=side<2?[side===0?node.x:node.x+node.width,node.y+offset]:
        [node.x+offset,side===2?node.y:node.y+node.height];
      if(node.type==='shape'&&node.shape!=='rectangle'){
        const ratio=Math.min(1,Math.abs(offset-along/2)/(along/2));
        const extent=node.shape==='ellipse'?Math.sqrt(1-ratio*ratio):1-ratio;
        if(side<2)point[0]=node.x+node.width/2+(side===0?-1:1)*node.width/2*extent;
        else point[1]=node.y+node.height/2+(side===2?-1:1)*node.height/2*extent;
      }
      if(occupied.some(endpoint=>Math.hypot(point[0]-endpoint.point[0],point[1]-endpoint.point[1])<endpoint.clearance-1e-6))continue;
      const out:CanvasPoint=side<2?[side===0?node.x-clearance:node.x+node.width+clearance,point[1]]:
        [point[0],side===2?node.y-clearance:node.y+node.height+clearance];
      const routeBlocked=elements.some(e=>e.type==='connector'&&!e.deleted&&e.id!==connector.id&&
        e.points.slice(1).some((end,index)=>strokesConflict(point,out,
          [e.x+e.points[index][0],e.y+e.points[index][1]],[e.x+end[0],e.y+end[1]],
          Math.max(clearance,connectorClearance(connector,e)))));
      if(!stubBlocked(point,out)&&!routeBlocked)ports.push({point,out});
    }
  }
  return ports;
}
