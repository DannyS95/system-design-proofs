/** Interaction checks run in the existing disposable browser/API harness. */
export async function verifyComponentDetails({ evaluate, waitFor, click, settle, send, capture, template, savedId }) {
  const button = async text => {
    await evaluate(`(() => {
      const button = [...document.querySelectorAll('.canvas-element-panel button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});
      if(!button) throw new Error('Missing details action: '+${JSON.stringify(text)});
      button.click();
    })()`);
    await settle();
  };
  let firstOpen = true;
  const open = async () => {
    if (firstOpen && !savedId) {
      firstOpen = false;
      await click('[data-details-for="custom-editor"]');
      await waitFor("Boolean(document.querySelector('.component-details'))");
      return;
    }
    await evaluate("document.querySelector('[data-details-for=\"custom-editor\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))");
    await waitFor("Boolean(document.querySelector('.component-details'))");
  };
  const references = () => evaluate("[...document.querySelectorAll('.component-details__links a')].map(a=>({href:a.href,target:a.target,rel:a.rel}))");
  const setReferences = async value => {
    await evaluate(`(() => {
      const input = document.querySelector('textarea[aria-label="Reference links"]');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(value)});
      input.dispatchEvent(new Event('input',{bubbles:true}));
    })()`);
    await settle();
  };
  await open();
  if (await evaluate("Boolean(document.querySelector('.component-details input,.component-details textarea'))")) throw new Error('Details opened as an edit form.');
  const originalLinks = await references();
  if (!originalLinks.some(link=>link.href.endsWith('/DESIGN.md'))) throw new Error('Missing real Markdown reference.');
  if (originalLinks.some(link=>link.target!=='_blank'||!link.rel.includes('noopener'))) throw new Error('Unsafe reference link target.');
  await capture(template, savedId ? 'saved-component-details' : 'component-details');
  await click(".component-details__references > summary");
  await settle();
  await capture(template, savedId ? 'saved-component-links' : 'component-links');
  const originalCamera = await evaluate("document.querySelector('[data-scene-root]').getAttribute('transform')");
  const target = await evaluate("document.querySelector('.component-details__connections button strong').textContent");
  await click('.component-details__connections button');
  await waitFor(`document.querySelector('.canvas-element-panel__header strong')?.textContent===${JSON.stringify(target)}`);
  if (await evaluate("document.querySelector('[data-scene-root]').getAttribute('transform')") === originalCamera) throw new Error('Connected component navigation did not move the camera.');
  await open();
  // Unlock remains an explicit action, and reading a locked component already worked.
  await evaluate("document.querySelector('button[aria-label=\"Unlock selected element\"]')?.click()");
  await settle();
  await button('Edit details');
  await evaluate("[...document.querySelectorAll('.canvas-element-panel details')].find(d=>d.querySelector('summary').textContent==='Architecture details').open=true");
  const original = await evaluate("document.querySelector('textarea[aria-label=\"Reference links\"]').value");
  await setReferences('Discarded draft | https://example.com/discard');
  await button('Cancel changes');
  if (JSON.stringify(await references())!==JSON.stringify(originalLinks)) throw new Error('Unapplied references leaked into the reader.');
  await button('Edit details');
  await setReferences('Unsafe | javascript:alert(1)');
  await button('Apply changes');
  if (await evaluate("Boolean(document.querySelector('.component-details'))")) throw new Error('Unsafe link was accepted.');
  await setReferences(original+'\nMVP verification | https://example.com/details');
  await button('Apply changes');
  await waitFor("Boolean(document.querySelector('.component-details a[href=\"https://example.com/details\"]'))");
  if (savedId) {
    const local = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(`system-canvas:board:${savedId}`)})).scene.elements.find(e=>e.id==='custom-editor').metadata.referenceLinks`);
    if (!local.includes('MVP verification')) throw new Error('Applied links did not persist locally.');
    await evaluate("[...document.querySelectorAll('.app-header button')].find(b=>b.textContent.trim()==='Save').click()");
    await waitFor(`fetch('/api/boards/${savedId}').then(r=>r.json()).then(b=>b.scene.elements.find(e=>e.id==='custom-editor').metadata.referenceLinks.includes('MVP verification'))`);
  }
  await click('button[aria-label="Close element inspector"]');
  await click('button[aria-label="Undo"]');
  await open();
  if ((await references()).some(link=>link.href==='https://example.com/details')) throw new Error('Undo did not restore references.');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await settle();
  if (await evaluate("Boolean(document.querySelector('.canvas-element-panel'))")) throw new Error('Escape did not close details.');
  return {reader:true,namedLinks:true,navigation:true,cancel:true,unsafeLinksRejected:true,apply:true,undo:true,escape:true,localAndManualSave:Boolean(savedId)};
}
