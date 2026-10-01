import { styleDistributedCacheText } from "./distributed-cache-typography.mjs";
import { minimumTextHeight, preferredTextWidth } from "../src/editor/text-layout.ts";
import { SPACING } from "../shared/layout-standard.ts";

/** Chosen design budgets, not benchmarks. Details stay outside the architecture. */
import { CAPACITY_SOURCE, splitCapacityExplanation } from "../shared/capacity-reference.ts";
export { CAPACITY_SOURCE };
const annotations = {
  "distributed-cache": {
    "clients": "QPS avg 1k · peak 4k · flash 8k\n50% reads · 10% read misses",
    "load-balancer": "1 host · routing CPU/network\nPeak 4k / safe 50k QPS · 8%",
    "cache-client-coordinator": "1 app host · CPU + quorum work\nPeak 4k / safe 10k QPS · 40%",
    "cache-server-b1": "RAM/network · peak 3.5k / safe 50k ops/s · 7%",
    "cache-server-b2": "RAM/network · peak 3.5k / safe 50k ops/s · 7%",
    "cache-server-b3": "RAM/network · peak 3.5k / safe 50k ops/s · 7%",
    "logic-cache": "3 × 50k = 150k node ops/s; peak 10.6k\n2 reads · 3 writes/refills; read-only ≤75k QPS",
    "database-shards": "Workload and chosen budget below",
    "monitoring-service": "Workload and chosen budget below",
  },
  "social-feed-distributed-cache": {
    "user-client": "QPS avg 2k · peak 10k · flash 20k\n99% reads · 9% read misses",
    "feed-api": "2 hosts × safe 10k QPS · CPU\nPeak 10k / 20k · 50%; flash 100% LIMIT",
    "healthy-replica": "Same physical replica below · RAM/network\nPeak ~4.3k / safe 50k ops/s · 9%",
    "miss-api": "Same 2 API hosts · rebuild CPU included\n891 misses/s; flash API SATURATES",
    "replica-b-primary": "RAM/network · peak ~4.3k / safe 50k ops/s · 9%",
    "replica-b-peer-1": "RAM/network · peak ~4.3k / safe 50k ops/s · 9%",
    "replica-b-peer-2": "RAM/network · peak ~4.3k / safe 50k ops/s · 9%",
    "authoritative-db": "3 DB hosts × safe 1k ops/s · I/O/CPU\nPeak ~1.2k / 3k · 40%; flash 80%\nCold cache 10.2k / 3k: OVERLOAD",
    "observability": "1 collector · CPU/ingest · 2 events/request\nPeak 20k / safe 50k events/s · 40%",
  },
  "kv-store": {
    "client": "QPS avg 1k · peak 4k · flash 8k\n50% GET · 50% PUT",
    "route-cluster": "1 LB · routing CPU/network\nPeak 4k / safe 50k QPS · 8%",
    "route-service": "1 gateway · auth CPU/network\nPeak 4k / safe 20k QPS · 20%",
    "coordinator": "1 host · fan-out CPU/network\nPeak 4k / safe 10k QPS · 40%; flash 80%",
    "hash-placement": "Logical decision · same coordinator CPU",
    "replica-b": "I/O + CPU · peak 3.3k / safe 10k ops/s · 33%",
    "replica-c": "I/O + CPU · peak 3.3k / safe 10k ops/s · 33%",
    "replica-d": "I/O + CPU · safe 10k ops/s when up\nDOWN: 0 available; E replaces D",
    "fallback-e": "I/O + CPU · peak 4.3k / safe 10k ops/s\n43% HOTTEST · includes 1k handoff/s",
    "quorum-result": "B+C+E: 3 × 10k = 30k ops/s; peak 11k\n2 reads · 3 writes; flash misses headroom",
  },
  "cdn": {
    "viewer": "QPS avg 3k · peak 15k · flash 30k\n20 KB objects · 300 MB/s peak",
    "global-routing": "1 routing host · CPU/network\n10% lookups: 1.5k / safe 50k QPS · 3%",
    "pop-lisbon-edge": "1 host · safe 10k QPS / 200 MB/s\nPeak 5k / 10k · 50%; flash 100% LIMIT",
    "pop-frankfurt-edge": "1 host · safe 10k QPS / 200 MB/s\nPeak 5k / 10k · 50%; failover 75%",
    "pop-virginia-edge": "1 host · safe 10k QPS / 200 MB/s\nPeak 5k / 10k · 50%; failover 75%",
    "pop-lisbon-cache": "Same edge RAM/SSD budget\n20 / 64 GB resident · 90% hits",
    "pop-frankfurt-cache": "Same edge RAM/SSD budget\n20 / 64 GB resident · 90% hits",
    "pop-virginia-cache": "Same edge RAM/SSD budget\n20 / 64 GB resident · 90% hits",
    "parent-proxy": "1 host · RAM/network · 80% hits\nPeak 1.5k / safe 10k QPS · 15%",
    "origin": "1 host · I/O/egress · safe 1k QPS\nPeak 300 / 1k · 30%; flash 60%\nNo parent: 1.5k / 1k OVERLOAD",
    "routing-inputs": "1 control host · CPU\n100 / safe 1k updates/s · 10%",
    "content-placement": "1 placement host · CPU/network\n300 / safe 1k object copies/s · 30%",
    "cdn-telemetry": "1 collector · 2 events/request\nPeak 30k / safe 100k events/s · 30%",
  },
};
const roles = {
  "pop-lisbon-cache": "Keeps hot objects in RAM and colder objects on SSD, sharing the edge host's storage budget.",
  "pop-frankfurt-cache": "Keeps hot objects in RAM and colder objects on SSD, sharing the edge host's storage budget.",
  "pop-virginia-cache": "Keeps hot objects in RAM and colder objects on SSD, sharing the edge host's storage budget.",
  "pop-lisbon-edge": "Serves nearby viewers from cache. A miss goes to the parent proxy, then fills this edge cache.",
  "pop-frankfurt-edge": "Serves nearby viewers and takes redirected traffic when another edge fails.",
  "pop-virginia-edge": "Serves nearby viewers and takes redirected traffic when another edge fails.",
  "origin": "Owns the authoritative content. Handles requests that miss both edge and parent caches.",
  "parent-proxy": "Shares cached objects across edges and shields the origin from repeated misses.",
  "global-routing": "Directs a viewer to a nearby healthy edge using location, health and available capacity.",
  "routing-inputs": "Publishes edge health and capacity so routing can avoid unavailable hosts.",
  "content-placement": "Copies objects to edges in the background, ahead of viewer requests.",
  "cdn-telemetry": "Collects request events to reveal hit rates, latency and overloaded hosts.",
  "viewer": "Requests an object. Routing chooses an edge; cache hits keep the request close to the viewer.",
};

/** Update only generated capacity metadata; never touch authored geometry or captions. */
export function compactCapacityMetadata(node) {
  const old = node.metadata ?? {};
  const explanation = splitCapacityExplanation(old.explanation).explanation || roles[node.id];
  const sourcePath = old.sourcePath?.includes(CAPACITY_SOURCE) ? old.sourcePath
    : [old.sourcePath, CAPACITY_SOURCE].filter(Boolean).join("; ");
  node.metadata = { ...old, ...(explanation ? { explanation } : {}), sourcePath };
  if (!explanation) delete node.metadata.explanation;
}

export function applyCapacityAnnotations(diagram, templateId) {
  const notes = annotations[templateId];
  if (!notes) return;
  for (const [id, capacity] of Object.entries(notes)) {
    const node = diagram.nodeElements.find(element => element.id === id);
    if (!node) throw new Error(`Missing capacity owner ${templateId}/${id}`);
    node.capacity = capacity;
    compactCapacityMetadata(node);
  }
  const legend = diagram.labelElements.find(element => ["legend", "goal", "title-kicker"].includes(element.id));
  if (legend) legend.text += "\nBOTEC ASSUMPTIONS · peak / safe capacity\nTarget ≥50% spare · flash = 2× peak";
  if (templateId === "social-feed-distributed-cache") {
    const group = diagram.labelElements.find(element => element.id === "replica-set-b-label");
    if (group) group.text += "\n3 × safe 50k = 150k ops/s · peak 12.9k (9%)";
  }
  if (templateId === "cdn") {
    const group = diagram.labelElements.find(element => element.id === "pop-definition");
    if (group) group.text += "\nAll 3 PoPs: 3 × safe 10k = 30k QPS · peak 15k (50%)";
  }
}

/** Keep workload summaries beside their owners; full derivations stay in the linked Markdown reference. */
export function appendCapacityWorkloads(scene, templateId) {
  if (templateId !== "distributed-cache") return;
  const columns = [
    {
      id: "database", owner: "database-shards", title: "Database workload", heading: "database-layer", fill: "#fbf5f2",
      cardTitle: "Cassandra workload",
      subtitle: "Chosen budget · 3 machines · unmeasured",
      body: "3 hosts × 5,000 = 15,000 operations/s\nPeak work: 6,000 + 400 = 6,400 operations/s",
      capacity: "Peak: 6,400 / 15,000 ops/s ≈ 43% used · 57% free\n2× traffic: ≈ 85% used · below spare-capacity target",
      steps: [
        ["Budget", "3 hosts × 5,000 operations/s = 15,000 total (assumed)."],
        ["Peak work", "Writes: 2,000 × 3 copies = 6,000 ops/s.\nReads: 200 cache misses × 2 copies = 400 ops/s.\nTotal: 6,400 ops/s · 43% used."],
        ["Consequence", "2× traffic uses 85%: below the 50% spare-capacity target.\nCassandra reaches its budget first at ≈9,400 client requests/s."],
      ],
    },
    {
      id: "monitoring", owner: "monitoring-service", title: "Monitoring workload", heading: "observability-layer", fill: "#f1f8f7",
      cardTitle: "Monitoring workload",
      subtitle: "Chosen budget · 1 collector · unmeasured",
      body: "PER CLIENT REQUEST · 2 messages (assumed)\n  “Started” + “Finished: OK”\n\nPEAK TRAFFIC\n  4,000 requests/s → 8,000 messages/s\n\nCPU · receive + process\n  Budget: 50,000 messages/s",
      capacity: "Peak: 8,000 / 50,000 = 16% used · 84% free\nGoal: keep ≥50% free · met",
      steps: [
        ["Work per request", "Two messages: request started and request finished."],
        ["Peak work", "4,000 requests/s × 2 = 8,000 messages/s."],
        ["Budget", "1 collector × 50,000 messages/s (assumed). 16% used; 84% free."],
      ],
    },
  ];
  for (const column of columns) {
    const owner = scene.elements.find(element => element.id === column.owner);
    const heading = scene.elements.find(element => element.id === column.heading);
    const groupId = `${column.id}-workload-area`;
    const explanation = column.steps.map(([title, body]) => `${title}\n${body}`).join("\n\n");
    const workload = {
      id: `${column.id}-workload`, type: "system", x: owner.x,
      y: owner.y + owner.height + SPACING.sibling,
      width: 640, height: 24, rotation: 0,
      parentId: groupId, layoutGroup: owner.layoutGroup, referenceId: owner.id,
      style: { ...owner.style, fill: "#ffffff" },
      iconId: "file-snapshot", title: column.cardTitle, subtitle: column.subtitle,
      body: column.body, capacity: column.capacity, titleFontSize: 18, bodyFontSize: 14,
      align: "left", variant: "neutral", locked: false,
      metadata: {
        objectType: "workload estimate", layer: owner.metadata?.layer ?? "Observability",
        ownership: owner.title, sourcePath: CAPACITY_SOURCE,
        inputs: "Request rate × work per request",
        outputs: "Load, spare capacity and first limit",
        explanation,
      },
    };
    styleDistributedCacheText([workload]);
    workload.width = preferredTextWidth(workload);
    workload.height = minimumTextHeight(workload);
    owner.parentId = groupId;
    heading.parentId = groupId;
    const children = [heading, owner, workload];
    const left = Math.min(...children.map(element => element.x));
    const top = Math.min(...children.map(element => element.y));
    const right = Math.max(...children.map(element => element.x + element.width));
    const bottom = Math.max(...children.map(element => element.y + element.height));
    const area = {
      id: groupId, type: "shape", shape: "rectangle", layoutRole: "container",
      containerPadding: SPACING.sibling, layoutGroup: owner.layoutGroup,
      x: left - SPACING.sibling, y: top - SPACING.sibling,
      width: right - left + SPACING.sibling * 2,
      height: bottom - top + SPACING.sibling * 2, rotation: 0,
      style: { ...owner.style, fill: column.fill, strokeWidth: 1.5 },
      locked: false,
    };
    scene.elements.push(area, workload);
  }
  spaceDatabaseWriteRoute(scene);
}

/** Keep the external write route clear of the grouped persistence area. */
export function spaceDatabaseWriteRoute(scene) {
  const route = scene.elements.find(element => element.id === "write-through-to-database");
  const area = scene.elements.find(element => element.id === "database-workload-area");
  const before = route.points.map(([x, y]) => [route.x + x, route.y + y]);
  const clearance = SPACING.subsection;
  const left = area.x - clearance;
  const right = area.x + area.width + clearance;
  const top = area.y - clearance;
  const tip = before.at(-1);
  const points = [before[0], before[1], [left, before[1][1]],
    [left, top], [right, top], [right, tip[1]], tip];
  const label = route.labelPosition ? [
    route.x + route.labelPosition[0] + left - before[2][0],
    route.y + route.labelPosition[1],
  ] : undefined;
  route.x = Math.min(...points.map(([x]) => x));
  route.y = Math.min(...points.map(([, y]) => y));
  route.width = Math.max(...points.map(([x]) => x)) - route.x;
  route.height = Math.max(...points.map(([, y]) => y)) - route.y;
  route.points = points.map(([x, y]) => [x - route.x, y - route.y]);
  if (label) route.labelPosition = [label[0] - route.x, label[1] - route.y];
}
