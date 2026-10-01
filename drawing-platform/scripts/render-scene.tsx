import { renderToStaticMarkup } from 'react-dom/server';
import type { BoardScene } from '../shared/contracts.js';
import { SceneElementView, ConnectorView } from '../src/editor/CanvasElementView.js';
import { getSceneBounds } from '../src/editor/canvas-model.js';
import { SPACING } from '../shared/layout-standard.js';

const noop = () => {};
export function renderSceneSvg(scene: BoardScene, title: string, description: string, viewport?: {width:number;height:number;camera:{x:number;y:number;zoom:number}}):string {
  const bounds=getSceneBounds(scene.elements),padding=SPACING.sibling;
  const width=viewport?.width??Math.ceil(bounds.width+padding*2),height=viewport?.height??Math.ceil(bounds.height+padding*2);
  const camera=viewport?.camera??{x:padding-bounds.x,y:padding-bounds.y,zoom:1};
  const connectors=scene.elements.filter(e=>e.type==='connector');
  const nodes=scene.elements.filter(e=>e.type!=='connector');
  const backgrounds=nodes.filter(e=>e.type==='shape'&&(e.layoutRole==='container'||e.layoutRole==='mechanism'&&!e.iconId));
  const view=(element:typeof nodes[number])=><SceneElementView key={element.id} element={element} selected={false} editing={false} editingText="" onPointerDown={noop} onDoubleClick={noop} onEditingTextChange={noop} onFinishEditing={noop} onResizePointerDown={noop}/>;
  return renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">
    <title>{title}</title><desc>{description}</desc>
    <rect width={width} height={height} fill={scene.appState.background.color}/>
    <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
      {backgrounds.map(view)}
      {connectors.map(element=><ConnectorView key={element.id} element={element} selected={false} onPointerDown={noop} layer="path"/>)}
      {connectors.map(element=><ConnectorView key={element.id} element={element} selected={false} onPointerDown={noop} layer="label"/>)}
      {nodes.filter(e=>!backgrounds.includes(e)).map(view)}
    </g>
  </svg>)+'\n';
}
