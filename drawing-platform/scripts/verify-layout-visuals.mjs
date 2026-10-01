/** Browser verification of the real selectable templates; no saved user boards. */
import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { createServer } from "vite";
import { buildApp } from "../server/app.ts";
import { DEFAULT_TEMPLATES } from "../server/templates.ts";
import { verifyCompactDetails } from "./verify-compact-details.mjs";
import { verifyComponentDetails } from "./verify-component-details.mjs";
import { LAYOUT_STANDARD } from "../shared/layout-standard.ts";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const outputDirectory = resolve(argument("--output") ?? join(tmpdir(), "system-canvas-layout-visuals"));
const templateId = argument("--template");
const width = 1600;
const height = 1000;
const templates = DEFAULT_TEMPLATES.filter((template) => template.id !== "blank" &&
  (!templateId || template.id === templateId));
if (!templates.length) throw new Error(`Unknown template: ${templateId}`);
if (!globalThis.WebSocket) throw new Error("Run with node --experimental-websocket --import tsx on Node 20, or Node 22+.");

async function chromiumPath() {
  const cache = join(homedir(), ".cache", "ms-playwright");
  const versions = await readdir(cache).catch(() => []);
  const candidates = [argument("--chromium"), process.env.CHROMIUM_PATH,
    ...versions.filter((name) => name.startsWith("chromium-")).sort().reverse()
      .map((name) => join(cache, name, "chrome-linux64", "chrome")),
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch { /* Try the next installed browser. */ }
  }
  throw new Error("No Chromium found; supply --chromium /path/to/chrome or CHROMIUM_PATH.");
}

async function connect(url) {
  const socket = new globalThis.WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", ({ data }) => {
    const result = JSON.parse(data);
    if (result.method === "Runtime.exceptionThrown") errors.push(result.params.exceptionDetails);
    const request = pending.get(result.id);
    if (!request) return;
    pending.delete(result.id);
    if (result.error) request.reject(new Error(JSON.stringify(result.error)));
    else request.resolve(result.result);
  });
  return {
    errors,
    close: () => socket.close(),
    send(method, params = {}, sessionId) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    },
  };
}

const runtimeDirectory = await mkdtemp(join(tmpdir(), "system-canvas-visual-run-"));
let api;
let vite;
let chrome;
let cdp;
try {
  await mkdir(outputDirectory, { recursive: true });
  api = await buildApp({ dataDirectory: join(runtimeDirectory, "boards") });
  const apiAddress = await api.listen({ host: "127.0.0.1", port: 0 });
  vite = await createServer({
    root: projectDirectory,
    configFile: join(projectDirectory, "vite.config.ts"),
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false, watch: null, hmr: false,
      proxy: { "/api": apiAddress } },
  });
  await vite.listen();
  const webAddress = `http://127.0.0.1:${vite.httpServer.address().port}`;
  chrome = spawn(await chromiumPath(), [
    "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
    "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0",
    `--user-data-dir=${join(runtimeDirectory, "browser")}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const devtoolsUrl = await new Promise((resolve, reject) => {
    let log = "";
    chrome.on("error", reject);
    chrome.on("exit", (code) => reject(new Error(`Chromium exited ${code}: ${log}`)));
    chrome.stderr.on("data", (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/u);
      if (match) resolve(match[1]);
    });
  });
  cdp = await connect(devtoolsUrl);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (await evaluate(expression)) return;
      await delay(100);
    }
    throw new Error(`Browser condition timed out: ${expression}`);
  };
  const settle = () => evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  const click = async (selector) => {
    const position = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error('Missing UI control: ' + ${JSON.stringify(selector)});
      element.scrollIntoView({block:'center'});
      const bounds = element.getBoundingClientRect();
      return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...position, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...position, button: "left", clickCount: 1 });
    await settle();
  };
  const camera = () => evaluate(`(() => {
    const transform = document.querySelector('[data-scene-root]').transform.baseVal.consolidate().matrix;
    return {x:transform.e,y:transform.f,zoom:transform.a};
  })()`);
  const zoomTo = async (zoom) => {
    const current = await camera();
    await evaluate(`(() => {
      const surface = document.querySelector('.canvas-surface');
      const bounds = surface.getBoundingClientRect();
      surface.dispatchEvent(new WheelEvent('wheel', {bubbles:true,cancelable:true,ctrlKey:true,
        clientX:bounds.x+80,clientY:bounds.y+80,deltaY:${-Math.log(zoom / current.zoom) / 0.0015}}));
    })()`);
    await settle();
  };
  const capture = async (template, mode) => {
    await settle();
    const file = `${template.id}-${mode}.png`;
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(join(outputDirectory, file), Buffer.from(data, "base64"));
    return { mode, file, camera: await camera() };
  };
  const elementIds = () => evaluate("[...new Set([...document.querySelectorAll('[data-scene-root] [data-element-id]')].map(e=>e.dataset.elementId))].sort()");
  const addTestShape = async () => {
    await evaluate(`(() => {
      const surface=document.querySelector('.canvas-surface');
      surface.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX:6000,deltaY:6000}));
    })()`);
    await click('button[aria-label="Rectangle (R)"]');
    const point = await evaluate(`(() => {const b=document.querySelector('.canvas-surface').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()`);
    await send("Input.dispatchMouseEvent", {type:"mousePressed", ...point, button:"left", clickCount:1});
    await send("Input.dispatchMouseEvent", {type:"mouseMoved", x:point.x+120, y:point.y+80, button:"left", buttons:1});
    await send("Input.dispatchMouseEvent", {type:"mouseReleased", x:point.x+120, y:point.y+80, button:"left", clickCount:1});
    await settle();
  };
  await send("Page.navigate", { url: webAddress });
  await waitFor("Boolean(document.querySelector('button[aria-label=\"Open boards\"]'))");
  const manifest = { viewport: { width, height }, templates: [], browserErrors: [] };
  for (const template of templates) {
    await waitFor("Boolean(document.querySelector('button[aria-label=\"Open boards\"]'))");
    const selector = `button[aria-label=${JSON.stringify(`Preview ${template.name} without saving`)}]`;
    const visiblePreview = await evaluate(`(() => {
      const bounds=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();
      return Boolean(bounds?.width&&bounds?.height);
    })()`);
    if (!visiblePreview) await click('button[aria-label="Open boards"]');
    await waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    await click(selector);
    await waitFor(`document.querySelector('.canvas-surface')?.getAttribute('aria-label')?.startsWith(${JSON.stringify(template.name)})`);
    await waitFor("document.body.textContent.includes('Template preview')");
    await evaluate("document.querySelector('button[aria-label=\"Dismiss Template preview\"]')?.click()");
    const rendered = await evaluate(`(() => {
      const root = document.querySelector('[data-scene-root]');
      return {ids:[...new Set([...root.querySelectorAll('[data-element-id]')].map(e=>e.dataset.elementId))],
        text:root.textContent.replace(/\\s+/gu,'')};
    })()`);
    const visible = template.scene.elements.filter((element) => !element.deleted);
    const missing = visible.filter((element) => !rendered.ids.includes(element.id)).map((element) => element.id);
    if (missing.length) throw new Error(`${template.id} preview lost elements: ${missing.join(", ")}`);
    const labels = visible.flatMap((element) => element.type === "system"
      ? [element.title, element.subtitle, element.body, element.capacity] : [element.text ?? element.label]).filter(Boolean);
    const missingText = labels.filter((text) => !rendered.text.includes(text.replace(/\s+/gu, "")));
    if (missingText.length) throw new Error(`${template.id} preview lost visible text: ${missingText.join("; ")}`);
    const screenshots = [await capture(template, "initial")];
    const initialZoom = screenshots[0].camera.zoom;
    if (initialZoom < LAYOUT_STANDARD.minInitialZoom - 0.001 ||
        initialZoom > LAYOUT_STANDARD.maxInitialZoom + 0.001) {
      throw new Error(`${template.id} initial zoom ${initialZoom} violates the readable shared viewport range.`);
    }
    await zoomTo(1);
    screenshots.push(await capture(template, "100-percent"));
    const textOverflow = await evaluate(`(() => {
      const source = new Map(${JSON.stringify(visible)}.map(element=>[element.id,element]));
      const root = document.querySelector('[data-scene-root]');
      const inverse = root.getCTM().inverse();
      const issues = [];
      for (const text of root.querySelectorAll('text')) {
        const owner = text.closest('[data-element-id]');
        const element = source.get(owner?.dataset.elementId);
        if (!element) continue;
        const box = text.getBBox();
        const matrix = inverse.multiply(text.getCTM());
        const corners = [[box.x,box.y],[box.x+box.width,box.y+box.height]]
          .map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
        let bounds = element;
        if (element.type==='connector') {
          const plate = text.closest('.canvas-connector-label')?.querySelector('rect');
          if (!plate) continue;
          const plateBox = plate.getBBox();
          const plateMatrix = inverse.multiply(plate.getCTM());
          const corner = new DOMPoint(plateBox.x,plateBox.y).matrixTransform(plateMatrix);
          bounds = {x:corner.x,y:corner.y,width:plateBox.width,height:plateBox.height};
        }
        if(corners[0].x<bounds.x-2||corners[0].y<bounds.y-2||
          corners[1].x>bounds.x+bounds.width+2||corners[1].y>bounds.y+bounds.height+2)
          issues.push({elementId:element.id,text:text.textContent,font:getComputedStyle(text).font,bounds,
            textBounds:{x:corners[0].x,y:corners[0].y,width:box.width,height:box.height}});
      }
      return issues;
    })()`);
    await click('button[aria-label="Fit all content to viewport"]');
    screenshots.push(await capture(template, "fit-content"));
    await zoomTo(1.4);
    const details = {
      "distributed-cache": "hash-ring-visual", "social-feed-distributed-cache": "hash-ring",
      "kv-store": "replica-b", cdn: "pop-lisbon-hull", "system-canvas-app": "custom-editor",
    };
    const detailId = details[template.id] ?? visible.find((element) => element.type === "system")?.id;
    await evaluate(`(() => {
      const surface = document.querySelector('.canvas-surface');
      const viewport = surface.getBoundingClientRect();
      const detail = document.querySelector(${JSON.stringify(`[data-element-id="${detailId}"]`)}).getBoundingClientRect();
      surface.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,
        deltaX:detail.x+detail.width/2-viewport.x-viewport.width/2,
        deltaY:detail.y+detail.height/2-viewport.y-viewport.height/2}));
    })()`);
    screenshots.push(await capture(template, "detail"));
    if (template.id === "system-canvas-app") {
      manifest.componentDetails = await verifyComponentDetails({ evaluate, waitFor, click, settle, send, capture, template });
    }
    if (["cdn", "distributed-cache"].includes(template.id)) {
      (manifest.compactDetails ??= {})[template.id] = await verifyCompactDetails({template,evaluate,waitFor,click,settle,send,capture});
    }
    const originalIds = await elementIds();
    await addTestShape();
    const editedIds = await elementIds();
    if (editedIds.length !== originalIds.length + 1) throw new Error(`${template.id}: test shape was not inserted.`);
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Reset design').click()");
    await waitFor("document.body.textContent.includes('Design reset')");
    if (JSON.stringify(await elementIds()) !== JSON.stringify(originalIds)) throw new Error(`${template.id}: reset failed to restore template elements.`);
    await click('button[aria-label="Undo"]');
    if (JSON.stringify(await elementIds()) !== JSON.stringify(editedIds)) throw new Error(`${template.id}: undo failed to recover edits after reset.`);
    await click('button[aria-label="Redo"]');
    if (JSON.stringify(await elementIds()) !== JSON.stringify(originalIds)) throw new Error(`${template.id}: redo failed to restore reset.`);
    await evaluate("document.querySelector('button[aria-label=\"Dismiss Design reset\"]')?.click()");
    manifest.templates.push({ id: template.id, name: template.name, elementCount: visible.length, detailId, textOverflow, screenshots, resetUndoRedo: true });
    console.log(`${template.id}: verified ${visible.length} editable elements; captured initial, 100%, fit, and detail.`);
  }
  manifest.browserErrors = cdp.errors;
  const boards = await globalThis.fetch(`${apiAddress}/api/boards`).then((response) => response.json());
  if (boards.boards.length) throw new Error("Template preview unexpectedly created a saved board.");
  // Exercise the persistence branch separately in this disposable API store.
  const savedTemplate = templates[0];
  const saved = await globalThis.fetch(`${apiAddress}/api/boards`, {
    method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({name:"Renamed reset verification",templateId:savedTemplate.id}),
  }).then(response=>response.json());
  if (!saved.id) throw new Error("Could not create the isolated reset verification board.");
  await send("Page.navigate", {url:`${webAddress}/?board=${saved.id}`});
  await waitFor("Boolean(document.querySelector('[data-scene-root]'))");
  const savedOriginalIds = await elementIds();
  await addTestShape();
  const savedEditedIds = await elementIds();
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Reset design').click()");
  await waitFor("document.body.textContent.includes('Design reset')");
  const local = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(`system-canvas:board:${saved.id}`)}))`);
  if (local.id !== saved.id || local.name !== saved.name ||
      JSON.stringify(local.scene.elements.map(e=>e.id).sort()) !== JSON.stringify(savedOriginalIds)) {
    throw new Error("Saved reset did not preserve board identity/name and immediately write the restored local snapshot.");
  }
  await delay(1200);
  const unchanged = await globalThis.fetch(`${apiAddress}/api/boards/${saved.id}`).then(r=>r.json());
  if (unchanged.revision !== saved.revision) throw new Error("Edits were saved without a manual Save.");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Save').click()");
  await waitFor(`fetch('/api/boards/${saved.id}').then(r=>r.json()).then(b=>b.revision>${saved.revision}&&JSON.stringify(b.scene.elements.map(e=>e.id).sort())===${JSON.stringify(JSON.stringify(savedOriginalIds))})`);
  await click('button[aria-label="Undo"]');
  if (JSON.stringify(await elementIds()) !== JSON.stringify(savedEditedIds)) throw new Error("Saved reset could not be undone.");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Save').click()");
  await waitFor(`fetch('/api/boards/${saved.id}').then(r=>r.json()).then(b=>JSON.stringify(b.scene.elements.map(e=>e.id).sort())===${JSON.stringify(JSON.stringify(savedEditedIds))})`);
  const savedBeforeClear = await globalThis.fetch(`${apiAddress}/api/boards/${saved.id}`).then(r=>r.json());
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Clear board').click()");
  if ((await elementIds()).length) throw new Error("Clear board left visible objects.");
  await delay(1200);
  const savedAfterClear = await globalThis.fetch(`${apiAddress}/api/boards/${saved.id}`).then(r=>r.json());
  if (JSON.stringify(savedAfterClear)!==JSON.stringify(savedBeforeClear)) throw new Error("Clear board changed the server design.");
  await click('button[aria-label="Undo"]');
  if (JSON.stringify(await elementIds())!==JSON.stringify(savedEditedIds)) throw new Error("Clear board could not be undone.");
  await click('.canvas-layout-controls summary');
  const snapshot = () => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(`system-canvas:board:${saved.id}`)})).scene`);
  const beforeTidy = await snapshot();
  await evaluate("[...document.querySelectorAll('.canvas-layout-controls button')].find(b=>!b.disabled).click()");
  await settle();
  const afterTidy = await snapshot();
  if (JSON.stringify(afterTidy.elements)===JSON.stringify(beforeTidy.elements)) throw new Error("Tidy had no effect without a selection.");
  for (const label of ['Node distance','Arrow clearance']) {
    const selector = `input[aria-label="${label}"]`;
    await click(selector);
    await send('Input.dispatchKeyEvent', {type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35});
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35});
    await settle();
    const spacing = (await snapshot()).appState.layoutSpacing;
    if (spacing[label==='Node distance'?'nodeGap':'edgeClearance']!==(label==='Node distance'?160:96)) throw new Error(`${label} did not apply: ${JSON.stringify(spacing)}`);
  }
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Lock all').click()");
  await settle();
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Unlock all and tidy').click()");
  await settle();
  if ((await snapshot()).elements.some(e=>!e.deleted&&e.locked)) throw new Error("Unlock and tidy left locked elements.");
  await click('button[aria-label="Undo"]');
  if ((await snapshot()).elements.some(e=>!e.deleted&&!e.locked)) throw new Error("Undo failed to restore locks.");
  await click('button[aria-label="Redo"]');
  await capture(savedTemplate, "tidied-wide-spacing");
  manifest.boardControls = {manualSave:true,clearPreservesServer:true,clearUndo:true,tidyWithoutSelection:true,slidersApply:true};
  if (savedTemplate.id === "system-canvas-app") {
    // The fit view hides small badges; zoom in before testing the saved reader.
    await zoomTo(1);
    manifest.savedComponentDetails = await verifyComponentDetails({ evaluate, waitFor, click, settle, send, capture, template:savedTemplate, savedId:saved.id });
  }
  manifest.savedReset = {identityPreserved:true,localSnapshot:true,remoteSnapshot:true,undoPersisted:true};
  await writeFile(join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const previews = manifest.templates.flatMap((template, row) => template.screenshots.map((shot, column) => ({
    file: join(outputDirectory, shot.file), left: column * 480, top: row * 300,
  })));
  const composites = await Promise.all(previews.map(async ({ file, left, top }) => ({
    input: await sharp(file).resize(480, 300).toBuffer(), left, top,
  })));
  await sharp({ create: { width: 1920, height: templates.length * 300, channels: 3, background: "#f8fafc" } })
    .composite(composites).png().toFile(join(outputDirectory, "contact-sheet.png"));
  if (cdp.errors.length) throw new Error(`Browser renderer raised ${cdp.errors.length} exceptions; see manifest.json.`);
  const overflowCount = manifest.templates.reduce((sum, template) => sum + template.textOverflow.length, 0);
  if (overflowCount) throw new Error(`Actual browser glyph bounds overflow ${overflowCount} elements; see manifest.json.`);
  console.log(`Visual evidence: ${outputDirectory}`);
} finally {
  cdp?.close();
  if (chrome && chrome.exitCode === null) {
    chrome.kill("SIGTERM");
    for (let attempt = 0; attempt < 30 && chrome.exitCode === null; attempt += 1) await delay(100);
    if (chrome.exitCode === null) chrome.kill("SIGKILL");
  }
  await vite?.close();
  await api?.close();
  await rm(runtimeDirectory, { recursive: true, force: true });
}
