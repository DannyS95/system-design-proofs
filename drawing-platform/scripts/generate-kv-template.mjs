import { resolve } from "node:path";

import {
  Diagram,
  palette,
  repositoryDirectory,
  writeTemplateArtifacts,
} from "./template-diagram-kit.mjs";

const diagram = new Diagram({
  title: "Dynamo-inspired key–value store topology",
  description:
    "An icon-led routing rail, deterministic replica topology, scoped failure recovery routes, and a concurrent-version route.",
  width: 2500,
  height: 1540,
});

diagram.shape({ id: "routing-layers-zone", x: 40, y: 120, width: 2420, height: 220, label: "ROUTING LAYERS · WHO CHOOSES THE NEXT HOP", fill: "#fbfaf6" });
diagram.shape({ id: "replica-topology-zone", x: 40, y: 380, width: 2420, height: 590, label: "REQUEST + REPLICA TOPOLOGY · N=3 · W=2 · R=2", fill: palette.blueSoft, stroke: "#b8c9f7" });
diagram.shape({ id: "version-route-zone", x: 40, y: 1010, width: 1400, height: 470, label: "CONCURRENT VERSION ROUTE", fill: palette.purpleSoft, stroke: "#c7b5f7" });
diagram.shape({ id: "quorum-boundary-zone", x: 1470, y: 1010, width: 990, height: 470, label: "QUORUM BOUNDARY", fill: palette.amberSoft, stroke: "#e8c38a" });

diagram.text({ id: "title", x: 52, y: 38, width: 1550, text: "Key–Value Store · routes, replicas, recovery", fontSize: 34 });
diagram.text({ id: "title-kicker", x: 1850, y: 50, width: 560, text: "BLUE request · AMBER failure · PURPLE repair", fontSize: 14, align: "right", color: palette.muted });

const routing = [
  ["route-internet", "internet", "Internet", "client network"],
  ["route-global", "global-routing", "Global routing", "DNS / anycast · infra"],
  ["route-edge", "edge-pop", "Edge routing", "PoP · infra"],
  ["route-cluster", "load-balancer", "Cluster routing", "region LB · infra"],
  ["route-service", "service-routing", "Service routing", "API gateway · you"],
  ["route-application", "application-router", "App routing", "KV endpoint · you"],
  ["route-data", "data-router", "Data routing", "partition / replica · KV"],
];

routing.forEach(([id, iconId, title, subtitle], index) => {
  const x = 70 + index * 340;
  diagram.system({ id, x, y: 175, width: 285, height: 105, iconId, title, subtitle, accent: id === "route-data" ? palette.purple : palette.blue, fill: id === "route-data" ? palette.purpleSoft : palette.white });
  if (index > 0) {
    const previousId = routing[index - 1][0];
    const previousX = 70 + (index - 1) * 340;
    diagram.connector({ id: `routing-hop-${index}`, points: [{ x: previousX + 285, y: 228 }, { x, y: 228 }], color: id === "route-data" ? palette.purple : palette.blue, startBinding: previousId, endBinding: id });
  }
});

diagram.system({ id: "client", x: 80, y: 570, width: 235, height: 106, iconId: "client", title: "Client", subtitle: "key + context token" });
diagram.system({ id: "coordinator", x: 405, y: 570, width: 270, height: 106, iconId: "application-server", title: "Coordinator", subtitle: "any request node" });
diagram.system({ id: "hash-placement", x: 775, y: 570, width: 300, height: 106, iconId: "data-router", title: "Hash placement", subtitle: "token + preference list", accent: palette.purple, fill: palette.purpleSoft });

[
  ["replica-b", 1150, "Replica B", "preferred · owner 1", palette.green, palette.greenSoft],
  ["replica-c", 1480, "Replica C", "preferred · owner 2", palette.green, palette.greenSoft],
  ["replica-d", 1810, "Replica D", "preferred · unavailable", palette.coral, palette.coralSoft],
].forEach(([id, x, title, subtitle, accent, fill]) => {
  diagram.system({ id, x, y: 475, width: 260, height: 104, iconId: "replica-group", title, subtitle, accent, fill });
});

diagram.system({ id: "quorum-result", x: 1480, y: 745, width: 300, height: 108, iconId: "replica-group", title: "Quorum result", subtitle: "W=2 ACKs · R=2 versions", accent: palette.green, fill: palette.greenSoft });
diagram.system({ id: "fallback-e", x: 2110, y: 745, width: 285, height: 108, iconId: "server", title: "Fallback E", subtitle: "temporary copy + hint→D", accent: palette.amber, fill: palette.amberSoft });

diagram.connector({ id: "route-client-coordinator", points: [{ x: 315, y: 623 }, { x: 405, y: 623 }], label: "PUT / GET", startBinding: "client", endBinding: "coordinator" });
diagram.connector({ id: "route-coordinator-placement", points: [{ x: 675, y: 623 }, { x: 775, y: 623 }], label: "hash(key)", startBinding: "coordinator", endBinding: "hash-placement" });
diagram.connector({ id: "route-data-ownership", points: [{ x: 2325, y: 280 }, { x: 2325, y: 355 }, { x: 925, y: 355 }, { x: 925, y: 570 }], label: "inside KV · data routing takes over", color: palette.purple, strokeStyle: "dashed", startBinding: "route-data", endBinding: "hash-placement" });

[
  ["placement-b", "replica-b", 1280, "preferred 1"],
  ["placement-c", "replica-c", 1610, "preferred 2"],
  ["placement-d", "replica-d", 1940, "preferred 3"],
].forEach(([id, target, targetX, label], index) => {
  const laneY = 615 + index * 36;
  diagram.connector({ id, points: [{ x: 1075, y: 615 }, { x: 1110, y: 615 }, { x: 1110, y: laneY }, { x: targetX, y: laneY }, { x: targetX, y: 579 }], label, startBinding: "hash-placement", endBinding: target });
});

diagram.connector({ id: "replica-b-response", points: [{ x: 1280, y: 579 }, { x: 1280, y: 700 }, { x: 1530, y: 700 }, { x: 1530, y: 745 }], label: "ACK / version", color: palette.green, startBinding: "replica-b", endBinding: "quorum-result" });
diagram.connector({ id: "replica-c-response", points: [{ x: 1610, y: 579 }, { x: 1610, y: 745 }], label: "ACK / version", color: palette.green, startBinding: "replica-c", endBinding: "quorum-result" });
diagram.connector({ id: "quorum-return", points: [{ x: 1480, y: 800 }, { x: 540, y: 800 }, { x: 540, y: 676 }], label: "2 responses → return", color: palette.green, startBinding: "quorum-result", endBinding: "coordinator" });

diagram.connector({ id: "sloppy-quorum-route", points: [{ x: 1075, y: 660 }, { x: 2010, y: 660 }, { x: 2010, y: 799 }, { x: 2110, y: 799 }], label: "D down → sloppy quorum", color: palette.amber, strokeStyle: "dashed", startBinding: "hash-placement", endBinding: "fallback-e" });
diagram.connector({ id: "hinted-handoff-route", points: [{ x: 2250, y: 745 }, { x: 2250, y: 700 }, { x: 1940, y: 700 }, { x: 1940, y: 579 }], label: "D heals → hinted handoff", color: palette.amber, strokeStyle: "dashed", startBinding: "fallback-e", endBinding: "replica-d" });
diagram.connector({ id: "read-repair-route", points: [{ x: 1780, y: 778 }, { x: 1990, y: 778 }, { x: 1990, y: 620 }, { x: 1905, y: 620 }, { x: 1905, y: 579 }], label: "stale read → read repair", color: palette.purple, strokeStyle: "dashed", startBinding: "quorum-result", endBinding: "replica-d" });
diagram.connector({ id: "anti-entropy-route", points: [{ x: 1280, y: 475 }, { x: 1280, y: 420 }, { x: 1940, y: 420 }, { x: 1940, y: 475 }], label: "background range compare · anti-entropy", color: palette.purple, strokeStyle: "dotted", startBinding: "replica-b", endBinding: "replica-d", startArrow: "arrow" });

diagram.system({ id: "writer-a", x: 85, y: 1110, width: 235, height: 100, iconId: "client", title: "Writer A", subtitle: "context {A:1}", accent: palette.purple });
diagram.system({ id: "writer-b", x: 85, y: 1300, width: 235, height: 100, iconId: "client", title: "Writer B", subtitle: "context {B:1}", accent: palette.purple });
diagram.system({ id: "version-compare", x: 425, y: 1205, width: 270, height: 104, iconId: "key-value-store", title: "Version compare", subtitle: "partial order", accent: palette.purple });
diagram.system({ id: "siblings", x: 795, y: 1205, width: 250, height: 104, iconId: "key-value-store", title: "Siblings", subtitle: "preserve vA + vB", accent: palette.purple });
diagram.system({ id: "application-merge", x: 1145, y: 1205, width: 245, height: 104, iconId: "application-server", title: "App reconcile", subtitle: "domain merge", accent: palette.purple });

diagram.connector({ id: "writer-a-route", points: [{ x: 320, y: 1160 }, { x: 375, y: 1160 }, { x: 375, y: 1240 }, { x: 425, y: 1240 }], label: "PUT vA", color: palette.purple, startBinding: "writer-a", endBinding: "version-compare" });
diagram.connector({ id: "writer-b-route", points: [{ x: 320, y: 1350 }, { x: 375, y: 1350 }, { x: 375, y: 1275 }, { x: 425, y: 1275 }], label: "PUT vB", color: palette.purple, startBinding: "writer-b", endBinding: "version-compare" });
diagram.connector({ id: "incomparable-route", points: [{ x: 695, y: 1257 }, { x: 795, y: 1257 }], label: "incomparable", color: palette.purple, startBinding: "version-compare", endBinding: "siblings" });
diagram.connector({ id: "siblings-to-app", points: [{ x: 1045, y: 1257 }, { x: 1145, y: 1257 }], label: "return both", color: palette.purple, startBinding: "siblings", endBinding: "application-merge" });
diagram.connector({ id: "reconciled-put-route", points: [{ x: 1268, y: 1205 }, { x: 1268, y: 1080 }, { x: 540, y: 1080 }, { x: 540, y: 676 }], label: "merged value → new PUT", color: palette.purple, strokeStyle: "dashed", startBinding: "application-merge", endBinding: "coordinator" });

diagram.system({ id: "strict-quorum", x: 1525, y: 1130, width: 270, height: 105, iconId: "replica-group", title: "Strict set", subtitle: "R+W>N · overlap", accent: palette.green, fill: palette.greenSoft });
diagram.system({ id: "sloppy-set", x: 1840, y: 1130, width: 260, height: 105, iconId: "replica-group", title: "Sloppy set", subtitle: "fallback may differ", accent: palette.amber });
diagram.system({ id: "ordering-protocol", x: 2145, y: 1275, width: 260, height: 105, iconId: "leader", title: "Ordering protocol", subtitle: "for linearizability", accent: palette.coral });
diagram.connector({ id: "strict-to-sloppy", points: [{ x: 1795, y: 1182 }, { x: 1840, y: 1182 }], color: palette.amber, startBinding: "strict-quorum", endBinding: "sloppy-set" });
diagram.connector({ id: "sloppy-to-ordering", points: [{ x: 2100, y: 1182 }, { x: 2275, y: 1182 }, { x: 2275, y: 1275 }], label: "overlap ≠ total order", color: palette.coral, strokeStyle: "dashed", startBinding: "sloppy-set", endBinding: "ordering-protocol" });

await writeTemplateArtifacts({
  diagram,
  templateId: "kv-store",
  templateName: "Key–Value Store · route map",
  templateDescription: "Trace routing ownership, preferred replicas, quorum responses, scoped failure recovery, and concurrent siblings.",
  boardId: "kv-store-learning-map",
  boardName: "KV Store · Routes and Recovery",
  exampleFilename: "kv-store.system-canvas.json",
  moduleFilename: "kv-store-template.ts",
  svgPath: resolve(repositoryDirectory, "kv-store", "architecture.svg"),
  pngPath: resolve(repositoryDirectory, "kv-store", "system-canvas.png"),
  camera: { x: 20, y: 20, zoom: 0.58 },
});
