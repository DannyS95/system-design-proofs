/** Checks the reported oversized context and the complete Details open/close cycle. */
export async function verifyCompactDetails({template,evaluate,waitFor,click,settle,send,capture}) {
  const ids=template.id==='distributed-cache'?['cache-server-b1','database-workload']:['pop-lisbon-cache','pop-lisbon-edge'];
  const toggle = async (id, navigate = false) => {
    if (navigate) {
      await evaluate(`document.querySelector('[data-details-for="${id}"]').focus()`);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await settle();
      return;
    }
    await evaluate(`document.querySelector('[data-details-for="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await settle();
  };
  const bounds = id => evaluate(`(() => {const b=document.querySelector('[data-scene-root] [data-element-id="${id}"]').getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height};})()`);
  await toggle(ids[0],true);
  await waitFor("Boolean(document.querySelector('.component-details'))");
  const first=await bounds(ids[0]);
  if(await evaluate("Boolean(document.querySelector('.component-details__context')?.open)"))throw new Error('Context starts expanded.');
  const visibleText=await evaluate("document.querySelector('.component-details').innerText");
  if(visibleText.includes('Chosen workload:')||visibleText.includes('All capacities are chosen safe per-host budgets'))throw new Error('Capacity essay leaked into the default card.');
  const reference=await evaluate("document.querySelector('.capacity-brief__source').href");
  if(!await evaluate(`fetch(${JSON.stringify(reference)}).then(r=>r.text()).then(t=>t.includes('Chosen BOTEC capacity budgets'))`))throw new Error('Calculation reference is unavailable.');
  await capture(template,'compact-details');
  await click('.component-details__context > summary');
  if(!await evaluate("document.querySelector('.component-details__context').open"))throw new Error('More context failed to open.');
  if(JSON.stringify(await bounds(ids[0]))!==JSON.stringify(first))throw new Error('Opening context resized the canvas element.');
  await toggle(ids[1],true);
  if(await evaluate("Boolean(document.querySelector('.component-details__context')?.open)"))throw new Error('Expanded context leaked into another component.');
  await capture(template,'compact-workload');
  await click('.component-details__context > summary');
  await evaluate(`(() => {
    const note=document.querySelector('.component-details__notes');
    if (note) note.scrollIntoView({block:'center'});
  })()`);
  await settle();
  await capture(template,'structured-context');
  await click('.component-details__context > summary');
  if(await evaluate("document.querySelector('.component-details__context').open"))throw new Error('More context failed to close.');
  await toggle(ids[1]);
  if(await evaluate("Boolean(document.querySelector('.canvas-element-panel'))"))throw new Error('Details badge did not close its panel.');
  await toggle(ids[1]);
  if(!await evaluate("Boolean(document.querySelector('.canvas-element-panel'))"))throw new Error('Details badge did not reopen its panel.');
  await click('button[aria-label="Close element inspector"]');
  if(await evaluate("Boolean(document.querySelector('.canvas-element-panel'))"))throw new Error('Close did not dismiss details.');
  await evaluate(`document.querySelector('[data-details-for="${ids[0]}"]').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await settle();
  if(!await evaluate("Boolean(document.querySelector('.canvas-element-panel'))"))throw new Error('Keyboard could not open details.');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await settle();
  if(await evaluate("Boolean(document.querySelector('.canvas-element-panel'))"))throw new Error('Escape did not close details.');
  return {contextCollapsed:true,contextResetsOnSelection:true,toggle:true,close:true,keyboard:true,escape:true,canvasSizeUnchanged:true,calculationReference:true};
}
