import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const repositoryDirectory = resolve(projectDirectory, "..");
const generatedDirectory = resolve(projectDirectory, "server", "generated");
const examplesDirectory = resolve(projectDirectory, "examples");
const kvDirectory = resolve(repositoryDirectory, "kv-store");

const GENERATED_AT = "2026-08-31T00:00:00.000Z";
const UPDATED_EPOCH = 1_788_134_400_000;

const palette = {
  ink: "#17212b",
  muted: "#5d6974",
  paper: "#f7f4ec",
  white: "#ffffff",
  line: "#c9c6bc",
  blue: "#2563eb",
  blueSoft: "#e7efff",
  green: "#15803d",
  greenSoft: "#e8f6ec",
  purple: "#7c3aed",
  purpleSoft: "#f0eaff",
  amber: "#c66a12",
  amberSoft: "#fff0d7",
  coral: "#dc4f45",
  coralSoft: "#ffe9e5",
};

const routingLayers = [
  { title: "Global", detail: "DNS · infra", width: 178 },
  { title: "Edge", detail: "CDN · infra", width: 178 },
  { title: "Cluster", detail: "load balancer · infra", width: 196 },
  { title: "Service", detail: "API gateway · you", width: 190 },
  { title: "Application", detail: "KV endpoint · you", width: 190 },
  { title: "Data", detail: "hash placement · KV", width: 180, active: true },
];

let sequence = 0;
const elements = [];

const nextCommon = ({
  id,
  type,
  x,
  y,
  width,
  height,
  strokeColor = palette.ink,
  backgroundColor = "transparent",
  fillStyle = "solid",
  strokeWidth = 1,
  strokeStyle = "solid",
  groupIds = [],
  roundness = null,
}) => {
  sequence += 1;
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor,
    backgroundColor,
    fillStyle,
    strokeWidth,
    strokeStyle,
    roughness: 0,
    opacity: 100,
    groupIds,
    frameId: null,
    roundness,
    seed: 20_000 + sequence * 37,
    version: 1,
    versionNonce: 70_000 + sequence * 53,
    index: `a${sequence.toString(36).padStart(3, "0")}`,
    isDeleted: false,
    boundElements: null,
    updated: UPDATED_EPOCH,
    link: null,
    locked: false,
  };
};

const addRectangle = ({
  id,
  x,
  y,
  width,
  height,
  strokeColor = palette.line,
  backgroundColor = palette.white,
  strokeWidth = 1.5,
  strokeStyle = "solid",
  groupIds = [],
}) => {
  elements.push(
    nextCommon({
      id,
      type: "rectangle",
      x,
      y,
      width,
      height,
      strokeColor,
      backgroundColor,
      strokeWidth,
      strokeStyle,
      groupIds,
      roundness: { type: 3 },
    }),
  );
};

const addText = ({
  id,
  x,
  y,
  width,
  text,
  fontSize = 18,
  color = palette.ink,
  align = "left",
  groupIds = [],
}) => {
  const lines = text.split("\n").length;
  const height = Math.ceil(lines * fontSize * 1.28);
  elements.push({
    ...nextCommon({
      id,
      type: "text",
      x,
      y,
      width,
      height,
      strokeColor: color,
      groupIds,
    }),
    fontSize,
    fontFamily: 2,
    text,
    textAlign: align,
    verticalAlign: "top",
    containerId: null,
    originalText: text,
    autoResize: false,
    lineHeight: 1.28,
  });
};

const addArrow = ({
  id,
  x,
  y,
  dx,
  dy = 0,
  color = palette.blue,
  dashed = false,
  endArrowhead = "arrow",
  groupIds = [],
}) => {
  elements.push({
    ...nextCommon({
      id,
      type: "arrow",
      x,
      y,
      width: Math.abs(dx),
      height: Math.abs(dy),
      strokeColor: color,
      strokeWidth: 2.5,
      strokeStyle: dashed ? "dashed" : "solid",
      groupIds,
      roundness: { type: 2 },
    }),
    points: [
      [0, 0],
      [dx, dy],
    ],
    startBinding: null,
    endBinding: null,
    lastCommittedPoint: null,
    startArrowhead: null,
    endArrowhead,
    elbowed: false,
  });
};

const addCard = ({
  id,
  x,
  y,
  width,
  height,
  title,
  body,
  accent = palette.blue,
  fill = palette.white,
  titleSize = 20,
  bodySize = 15,
}) => {
  const groupIds = [`group-${id}`];
  addRectangle({
    id: `${id}-card`,
    x,
    y,
    width,
    height,
    strokeColor: accent,
    backgroundColor: fill,
    strokeWidth: 2,
    groupIds,
  });
  addText({
    id: `${id}-title`,
    x: x + 18,
    y: y + 15,
    width: width - 36,
    text: title,
    fontSize: titleSize,
    color: accent,
    groupIds,
  });
  if (body) {
    addText({
      id: `${id}-body`,
      x: x + 18,
      y: y + 51,
      width: width - 36,
      text: body,
      fontSize: bodySize,
      color: palette.ink,
      groupIds,
    });
  }
};

addText({
  id: "title",
  x: 52,
  y: 34,
  width: 900,
  text: "Key–Value Store · the 60-second path",
  fontSize: 34,
  color: palette.ink,
});
addText({
  id: "subtitle",
  x: 54,
  y: 80,
  width: 1100,
  text: "One request, deterministic placement, a quorum, and the repair path when replicas diverge.",
  fontSize: 16,
  color: palette.muted,
});

addRectangle({
  id: "routing-band",
  x: 42,
  y: 118,
  width: 1356,
  height: 116,
  strokeColor: palette.line,
  backgroundColor: "#fbfaf6",
  strokeWidth: 1,
});
addText({
  id: "routing-label",
  x: 58,
  y: 128,
  width: 250,
  text: "ROUTING CONTEXT",
  fontSize: 12,
  color: palette.muted,
});

let routingX = 58;
for (const [index, layer] of routingLayers.entries()) {
  const groupIds = [`group-routing-${index}`];
  addRectangle({
    id: `routing-${index}-card`,
    x: routingX,
    y: 154,
    width: layer.width,
    height: 62,
    strokeColor: layer.active ? palette.coral : palette.line,
    backgroundColor: layer.active ? palette.coralSoft : palette.white,
    strokeWidth: layer.active ? 2 : 1.25,
    groupIds,
  });
  addText({
    id: `routing-${index}-title`,
    x: routingX + 12,
    y: 162,
    width: layer.width - 24,
    text: layer.title,
    fontSize: 16,
    color: layer.active ? palette.coral : palette.ink,
    align: "center",
    groupIds,
  });
  addText({
    id: `routing-${index}-detail`,
    x: routingX + 10,
    y: 188,
    width: layer.width - 20,
    text: layer.detail,
    fontSize: 11,
    color: palette.muted,
    align: "center",
    groupIds,
  });
  if (index < routingLayers.length - 1) {
    addArrow({
      id: `routing-${index}-arrow`,
      x: routingX + layer.width + 5,
      y: 185,
      dx: 23,
      color: palette.muted,
    });
  }
  routingX += layer.width + 30;
}

addCard({
  id: "client",
  x: 54,
  y: 350,
  width: 176,
  height: 118,
  title: "Client",
  body: "GET(key)\nor PUT(key, value)",
  accent: palette.blue,
  fill: palette.blueSoft,
});

addCard({
  id: "coordinator",
  x: 302,
  y: 274,
  width: 330,
  height: 302,
  title: "Coordinator · per request",
  body:
    "1  Validate GET / PUT\n\n2  Hash key → token\n\n3  Choose N distinct nodes\n\n4  Wait for R responses or\n    W acknowledgments",
  accent: palette.purple,
  fill: palette.purpleSoft,
  titleSize: 21,
  bodySize: 17,
});

addCard({
  id: "placement",
  x: 710,
  y: 280,
  width: 258,
  height: 112,
  title: "Deterministic placement",
  body: "hash(key) → token\nreplica set → [B, C, D]",
  accent: palette.coral,
  fill: palette.coralSoft,
  titleSize: 18,
  bodySize: 15,
});

addCard({
  id: "versions",
  x: 710,
  y: 438,
  width: 258,
  height: 138,
  title: "Compare versions",
  body: "newer dominates stale\nconcurrent writes → siblings\nrepair after the read",
  accent: palette.purple,
  fill: palette.white,
  titleSize: 18,
  bodySize: 14,
});

for (const [index, replica] of ["B", "C", "D"].entries()) {
  addCard({
    id: `replica-${replica.toLowerCase()}`,
    x: 1050,
    y: 270 + index * 123,
    width: 276,
    height: 94,
    title: `Replica ${replica}`,
    body: "value + version metadata",
    accent: index === 2 ? palette.coral : palette.green,
    fill: index === 2 ? "#fff7f5" : palette.greenSoft,
    titleSize: 19,
    bodySize: 14,
  });
}

addRectangle({
  id: "quorum-badge",
  x: 990,
  y: 632,
  width: 348,
  height: 54,
  strokeColor: palette.green,
  backgroundColor: palette.greenSoft,
  strokeWidth: 2,
  groupIds: ["group-quorum"],
});
addText({
  id: "quorum-text",
  x: 1006,
  y: 647,
  width: 316,
  text: "N = 3 · R = 2 responses · W = 2 acknowledgments",
  fontSize: 12,
  color: palette.green,
  align: "center",
  groupIds: ["group-quorum"],
});

addArrow({ id: "request-arrow", x: 238, y: 392, dx: 56, color: palette.blue });
addText({
  id: "request-label",
  x: 235,
  y: 365,
  width: 64,
  text: "request",
  fontSize: 12,
  color: palette.blue,
  align: "center",
});
addArrow({ id: "placement-arrow", x: 640, y: 334, dx: 62, color: palette.blue });
addText({
  id: "placement-label",
  x: 640,
  y: 305,
  width: 63,
  text: "route",
  fontSize: 12,
  color: palette.blue,
  align: "center",
});
for (const [index, replica] of ["b", "c", "d"].entries()) {
  addArrow({
    id: `to-replica-${replica}`,
    x: 976,
    y: 336,
    dx: 66,
    dy: index * 123 - 20,
    color: palette.blue,
  });
}
addArrow({
  id: "quorum-response",
  x: 1040,
  y: 610,
  dx: -395,
  dy: -8,
  color: palette.green,
  dashed: true,
});
addArrow({
  id: "client-response",
  x: 294,
  y: 515,
  dx: -58,
  dy: -43,
  color: palette.green,
  dashed: true,
});
addText({
  id: "response-label",
  x: 652,
  y: 594,
  width: 360,
  text: "reply after quorum · background repair may continue",
  fontSize: 13,
  color: palette.green,
  align: "center",
});

addRectangle({
  id: "failure-lane",
  x: 42,
  y: 710,
  width: 1356,
  height: 116,
  strokeColor: palette.amber,
  backgroundColor: palette.amberSoft,
  strokeWidth: 1.5,
});
addText({
  id: "failure-title",
  x: 60,
  y: 723,
  width: 235,
  text: "TEMPORARY DIVERGENCE",
  fontSize: 12,
  color: palette.amber,
});
addText({
  id: "failure-step-1",
  x: 62,
  y: 758,
  width: 238,
  text: "1  Preferred D unavailable",
  fontSize: 16,
  color: palette.ink,
});
addArrow({ id: "failure-arrow-1", x: 312, y: 770, dx: 73, color: palette.amber });
addText({
  id: "failure-step-2",
  x: 402,
  y: 746,
  width: 284,
  text: "2  Temporary E accepts copy\n    + stores hint for D",
  fontSize: 16,
  color: palette.ink,
});
addArrow({ id: "failure-arrow-2", x: 699, y: 770, dx: 73, color: palette.amber });
addText({
  id: "failure-step-3",
  x: 790,
  y: 746,
  width: 255,
  text: "3  Replay hint when D heals",
  fontSize: 16,
  color: palette.ink,
});
addArrow({ id: "failure-arrow-3", x: 1055, y: 770, dx: 73, color: palette.amber });
addText({
  id: "failure-step-4",
  x: 1145,
  y: 746,
  width: 224,
  text: "4  Read repair +\n    anti-entropy converge",
  fontSize: 16,
  color: palette.ink,
});

addText({
  id: "footer-determinism",
  x: 48,
  y: 852,
  width: 570,
  text: "Invariant: the same membership snapshot maps a key to the same replica set.",
  fontSize: 13,
  color: palette.muted,
});
addText({
  id: "footer-caveat",
  x: 694,
  y: 852,
  width: 700,
  text: "R + W > N gives overlap; alone it does not guarantee linearizability.",
  fontSize: 13,
  color: palette.coral,
  align: "right",
});

const scene = {
  elements,
  appState: {
    viewBackgroundColor: palette.paper,
    theme: "light",
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 0.9 },
    gridSize: null,
    gridStep: 5,
    gridModeEnabled: false,
    objectsSnapModeEnabled: false,
  },
  files: {},
};

const template = {
  id: "kv-store",
  name: "Key–Value Store · 60-second path",
  description:
    "Follow routing, deterministic replica placement, quorum reads/writes, versions, and repair without hiding failure behavior.",
  scene,
};

const boardDocument = {
  schemaVersion: 1,
  id: "kv-store-learning-map",
  name: template.name,
  revision: 0,
  createdAt: GENERATED_AT,
  updatedAt: GENERATED_AT,
  scene,
};

const toTypeScript = (value) => JSON.stringify(value, null, 2);

const generatedModule = `// Generated by scripts/generate-kv-template.mjs. Do not edit by hand.\nimport type { TemplateDefinition } from "../../shared/contracts.js";\n\nexport const KV_STORE_TEMPLATE = ${toTypeScript(template)} satisfies TemplateDefinition;\n`;

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const svgText = ({ x, y, text, size = 16, color = palette.ink, weight = 500, anchor = "start", lineGap = 1.3 }) => {
  const lines = text.split("\n");
  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineGap}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${tspans}</text>`;
};

const svgCard = ({ x, y, width, height, title, body, accent, fill, titleSize = 20, bodySize = 15 }) => `
  <g>
    <rect x="${x}" y="${y + 4}" width="${width}" height="${height}" rx="15" fill="${palette.ink}" opacity="0.07"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="15" fill="${fill}" stroke="${accent}" stroke-width="2"/>
    ${svgText({ x: x + 18, y: y + 29, text: title, size: titleSize, color: accent, weight: 700 })}
    ${body ? svgText({ x: x + 18, y: y + 66, text: body, size: bodySize, color: palette.ink, weight: 500, lineGap: 1.6 }) : ""}
  </g>`;

const svgArrow = ({ x1, y1, x2, y2, color = palette.blue, dashed = false }) =>
  `<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2.5" ${dashed ? 'stroke-dasharray="8 7"' : ""} marker-end="url(#arrow-${color === palette.green ? "green" : color === palette.amber ? "amber" : "blue"})"/>`;

const routingSvg = [];
routingX = 58;
for (const [index, layer] of routingLayers.entries()) {
  routingSvg.push(`
    <g>
      <rect x="${routingX}" y="154" width="${layer.width}" height="62" rx="12" fill="${layer.active ? palette.coralSoft : palette.white}" stroke="${layer.active ? palette.coral : palette.line}" stroke-width="${layer.active ? 2 : 1.25}"/>
      ${svgText({ x: routingX + layer.width / 2, y: 177, text: layer.title, size: 16, color: layer.active ? palette.coral : palette.ink, weight: 700, anchor: "middle" })}
      ${svgText({ x: routingX + layer.width / 2, y: 201, text: layer.detail, size: 11, color: palette.muted, weight: 500, anchor: "middle" })}
    </g>`);
  if (index < routingLayers.length - 1) {
    routingSvg.push(svgArrow({ x1: routingX + layer.width + 5, y1: 185, x2: routingX + layer.width + 25, y2: 185, color: palette.blue }));
  }
  routingX += layer.width + 30;
}

const replicaSvg = ["B", "C", "D"]
  .map((replica, index) =>
    svgCard({
      x: 1050,
      y: 270 + index * 123,
      width: 276,
      height: 94,
      title: `Replica ${replica}`,
      body: "value + version metadata",
      accent: index === 2 ? palette.coral : palette.green,
      fill: index === 2 ? "#fff7f5" : palette.greenSoft,
      titleSize: 19,
      bodySize: 14,
    }),
  )
  .join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900" role="img" aria-labelledby="title description">
  <title id="title">Key–Value Store — the 60-second path</title>
  <desc id="description">A concise learning diagram showing routing context, client request, coordinator, deterministic replica placement, quorum, versions, hinted handoff, read repair, and anti-entropy.</desc>
  <defs>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d9d5ca" opacity="0.42"/></pattern>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#17212b" flood-opacity="0.08"/></filter>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.blue}"/></marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.green}"/></marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.amber}"/></marker>
    <style>text { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }</style>
  </defs>
  <rect width="1440" height="900" fill="${palette.paper}"/>
  <rect width="1440" height="900" fill="url(#grid)"/>
  ${svgText({ x: 52, y: 64, text: "Key–Value Store · the 60-second path", size: 34, color: palette.ink, weight: 760 })}
  ${svgText({ x: 54, y: 96, text: "One request, deterministic placement, a quorum, and the repair path when replicas diverge.", size: 16, color: palette.muted, weight: 500 })}

  <rect x="42" y="118" width="1356" height="116" rx="18" fill="#fbfaf6" stroke="${palette.line}"/>
  ${svgText({ x: 58, y: 141, text: "ROUTING CONTEXT", size: 12, color: palette.muted, weight: 700 })}
  ${routingSvg.join("")}

  ${svgCard({ x: 54, y: 350, width: 176, height: 118, title: "Client", body: "GET(key)\nor PUT(key, value)", accent: palette.blue, fill: palette.blueSoft })}
  ${svgCard({ x: 302, y: 274, width: 330, height: 302, title: "Coordinator · per request", body: "1  Validate GET / PUT\n2  Hash key → token\n3  Choose N distinct nodes\n4  Wait for R responses or\n    W acknowledgments", accent: palette.purple, fill: palette.purpleSoft, titleSize: 21, bodySize: 17 })}
  ${svgCard({ x: 710, y: 280, width: 258, height: 112, title: "Deterministic placement", body: "hash(key) → token\nreplica set → [B, C, D]", accent: palette.coral, fill: palette.coralSoft, titleSize: 18, bodySize: 15 })}
  ${svgCard({ x: 710, y: 438, width: 258, height: 138, title: "Compare versions", body: "newer dominates stale\nconcurrent writes → siblings\nrepair after the read", accent: palette.purple, fill: palette.white, titleSize: 18, bodySize: 14 })}
  ${replicaSvg}

  ${svgArrow({ x1: 238, y1: 408, x2: 294, y2: 408 })}
  ${svgText({ x: 266, y: 390, text: "request", size: 12, color: palette.blue, weight: 650, anchor: "middle" })}
  ${svgArrow({ x1: 640, y1: 336, x2: 702, y2: 336 })}
  ${svgText({ x: 671, y: 318, text: "route", size: 12, color: palette.blue, weight: 650, anchor: "middle" })}
  ${svgArrow({ x1: 976, y1: 336, x2: 1042, y2: 317 })}
  ${svgArrow({ x1: 976, y1: 336, x2: 1042, y2: 440 })}
  ${svgArrow({ x1: 976, y1: 336, x2: 1042, y2: 563 })}
  ${svgArrow({ x1: 1040, y1: 610, x2: 645, y2: 602, color: palette.green, dashed: true })}
  ${svgArrow({ x1: 294, y1: 515, x2: 236, y2: 472, color: palette.green, dashed: true })}
  ${svgText({ x: 832, y: 595, text: "reply after quorum · background repair may continue", size: 13, color: palette.green, weight: 650, anchor: "middle" })}

  <rect x="990" y="632" width="348" height="54" rx="14" fill="${palette.greenSoft}" stroke="${palette.green}" stroke-width="2"/>
  ${svgText({ x: 1164, y: 665, text: "N = 3 · R = 2 responses · W = 2 acknowledgments", size: 12, color: palette.green, weight: 760, anchor: "middle" })}

  <rect x="42" y="710" width="1356" height="116" rx="18" fill="${palette.amberSoft}" stroke="${palette.amber}" stroke-width="1.5"/>
  ${svgText({ x: 60, y: 739, text: "TEMPORARY DIVERGENCE", size: 12, color: palette.amber, weight: 760 })}
  ${svgText({ x: 62, y: 780, text: "1  Preferred D unavailable", size: 16, color: palette.ink, weight: 650 })}
  ${svgArrow({ x1: 312, y1: 770, x2: 385, y2: 770, color: palette.amber })}
  ${svgText({ x: 402, y: 764, text: "2  Temporary E accepts copy\n    + stores hint for D", size: 16, color: palette.ink, weight: 650, lineGap: 1.45 })}
  ${svgArrow({ x1: 699, y1: 770, x2: 772, y2: 770, color: palette.amber })}
  ${svgText({ x: 790, y: 780, text: "3  Replay hint when D heals", size: 16, color: palette.ink, weight: 650 })}
  ${svgArrow({ x1: 1055, y1: 770, x2: 1128, y2: 770, color: palette.amber })}
  ${svgText({ x: 1145, y: 764, text: "4  Read repair +\n    anti-entropy converge", size: 16, color: palette.ink, weight: 650, lineGap: 1.45 })}

  ${svgText({ x: 48, y: 871, text: "Invariant: the same membership snapshot maps a key to the same replica set.", size: 13, color: palette.muted, weight: 550 })}
  ${svgText({ x: 1392, y: 871, text: "R + W > N gives overlap; alone it does not guarantee linearizability.", size: 13, color: palette.coral, weight: 650, anchor: "end" })}
</svg>
`;

await Promise.all([
  mkdir(generatedDirectory, { recursive: true }),
  mkdir(examplesDirectory, { recursive: true }),
  mkdir(kvDirectory, { recursive: true }),
]);

await Promise.all([
  writeFile(
    resolve(generatedDirectory, "kv-store-template.ts"),
    generatedModule,
    "utf8",
  ),
  writeFile(
    resolve(examplesDirectory, "kv-store.system-canvas.json"),
    `${JSON.stringify(boardDocument, null, 2)}\n`,
    "utf8",
  ),
  writeFile(
    resolve(kvDirectory, "architecture.svg"),
    svg.replace(/^[ \t]+$/gm, ""),
    "utf8",
  ),
]);

console.log(
  `Generated ${elements.length} editable elements, the System Canvas document, and architecture.svg.`,
);
