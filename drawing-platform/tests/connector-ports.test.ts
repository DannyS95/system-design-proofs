import { describe, expect, it } from "vitest";
import type { CanvasConnectorElement, CanvasShapeElement } from "../shared/contracts.js";
import { availableConnectorPorts } from "../shared/connector-ports.js";
import { connectorClearance } from "../shared/layout-standard.js";

const style={fill:'#fff',stroke:'#123456',strokeWidth:2,strokeStyle:'solid' as const,opacity:1,textColor:'#123456'};
const node:CanvasShapeElement={id:'node',type:'shape',shape:'rectangle',x:0,y:0,width:200,height:120,rotation:0,style};
const connector:CanvasConnectorElement={id:'route',type:'connector',x:200,y:60,width:100,height:0,rotation:0,style,
  points:[[0,0],[100,0]],startArrow:'none',endArrow:'arrow',startBinding:'node'};

describe('available connector boundary ports',()=>{
  it('reserves clearance from existing neighboring ports and outgoing strokes',()=>{
    const existing:CanvasConnectorElement={...connector,id:'existing',y:30,style:{...style,strokeWidth:10}};
    const ports=availableConnectorPorts(node,connector,[node,existing],24);
    expect(ports.length).toBeGreaterThan(0);
    const gap=connectorClearance(connector,existing);
    expect(ports.every(({point})=>Math.hypot(point[0]-200,point[1]-30)>=gap-1e-6)).toBe(true);
    expect(ports.filter(({point})=>point[0]===200).every(({point})=>Math.abs(point[1]-30)>=gap-1e-6)).toBe(true);
  });

  it('rejects a side whose outward stub enters a nearby heading',()=>{
    const grouped={...node,layoutGroup:'routing'};
    const heading:CanvasShapeElement={...grouped,id:'heading',y:-50,height:30,label:'Routing'};
    const ports=availableConnectorPorts(grouped,connector,[grouped,heading],24);
    expect(ports.some(({point})=>point[1]===0)).toBe(false);
    expect(ports.some(({point})=>point[1]===120)).toBe(true);
  });

  it.each(['ellipse','diamond'] as const)('projects free ports onto the actual %s outline',(shape)=>{
    const curved={...node,shape};
    for(const {point} of availableConnectorPorts(curved,connector,[curved],24)){
      const x=(point[0]-100)/100,y=(point[1]-60)/60;
      expect(shape==='ellipse'?x*x+y*y:Math.abs(x)+Math.abs(y)).toBeCloseTo(1);
    }
  });
});
