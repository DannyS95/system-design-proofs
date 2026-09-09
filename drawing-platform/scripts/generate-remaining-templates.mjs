import { resolve } from "node:path";

import {
  Diagram,
  palette,
  projectDirectory,
  repositoryDirectory,
  writeTemplateArtifacts,
} from "./template-diagram-kit.mjs";

function buildSocialFeedCache() {
  const diagram = new Diagram({
    title: "Social Feed — Distributed Cache",
    description: "A read-heavy social feed uses cache-aside reads and database-first invalidation. Hits return from a healthy RAM replica; misses return through the Feed API and refill the cache.",
    width: 3600,
    height: 5050,
  });
  const readable = { titleFontSize: 24, bodyFontSize: 21, align: "left" };
  const route = { labelFontSize: 20, strokeWidth: 3.5 };

  diagram.text({ id: "title", x: 70, y: 38, width: 1350, text: "Social Feed — Distributed Cache", fontSize: 36 });
  diagram.text({ id: "legend", x: 2100, y: 48, width: 1400, text: "BLUE request · GREEN cache answer · AMBER database fallback · CORAL failure", fontSize: 20, align: "right", color: palette.muted });

  diagram.shape({ id: "design-contract", x: 80, y: 150, width: 1900, height: 92, label: "WORKLOAD + GUARANTEE · READ-HEAVY FEED · BRIEF STALENESS IS ACCEPTABLE", fontSize: 22, fill: "#fbfaf6", stroke: palette.cyan, textColor: palette.blue });
  diagram.system({ id: "contract-workload", x: 100, y: 330, width: 700, height: 200, iconId: "client", title: "Workload", subtitle: "about 500,000 active users · reads greatly outnumber writes", body: "Repeated feed reads create locality; trending posts create hot keys.", ...readable, variant: "client" });
  diagram.system({ id: "contract-target", x: 950, y: 330, width: 700, height: 200, iconId: "telemetry", title: "Success", subtitle: "cache hit ratio ≥ 91% · database fallback ≤ 9% · low p99", body: "Most feed requests should terminate in RAM rather than reaching the database.", ...readable, accent: palette.cyan, fill: palette.cyanSoft, variant: "observability" });
  diagram.system({ id: "contract-consistency", x: 1800, y: 330, width: 700, height: 200, iconId: "policy-gate", title: "Consistency choice", subtitle: "brief staleness is acceptable", body: "Speed is prioritized; the database remains authoritative.", ...readable, accent: palette.green, fill: palette.greenSoft, variant: "service" });
  diagram.system({ id: "contract-failure", x: 2650, y: 330, width: 700, height: 200, iconId: "fallback", title: "Failure rule", subtitle: "cache loss hurts speed, not correctness", body: "A failed lookup becomes a database fallback and later refill.", ...readable, accent: palette.coral, fill: palette.coralSoft, variant: "warning" });

  diagram.shape({ id: "level-1", x: 80, y: 690, width: 2100, height: 100, label: "FEED READ · HIT RETURNS FROM RAM · MISS RESUMES IN THE FEED API", fontSize: 22, fill: palette.blueSoft, stroke: palette.blue, textColor: palette.blue });
  diagram.system({ id: "user-client", x: 100, y: 900, width: 300, height: 180, iconId: "client", title: "User / client", subtitle: "asks for a feed", ...readable, variant: "client" });
  diagram.system({ id: "feed-api", x: 650, y: 900, width: 340, height: 180, iconId: "application-server", title: "Feed API", subtitle: "application service", ...readable, variant: "service" });
  diagram.system({ id: "cache-client", x: 1250, y: 890, width: 450, height: 200, iconId: "data-router", title: "Cache client + key routing", subtitle: "code inside the Feed API", body: "Builds the feed key and chooses its cache shard.", ...readable, accent: palette.purple, fill: palette.white, variant: "routing" });
  diagram.system({ id: "hash-key", x: 1950, y: 900, width: 300, height: 180, iconId: "hash-ring", title: "hash(key)", subtitle: "stable placement", ...readable, accent: palette.purple, fill: palette.purpleSoft, variant: "routing" });
  diagram.system({ id: "owning-shard", x: 2500, y: 900, width: 320, height: 180, iconId: "partition", title: "Owning shard B", subtitle: "owns this key range", ...readable, accent: palette.green, variant: "cache" });
  diagram.system({ id: "healthy-replica", x: 3070, y: 890, width: 380, height: 200, iconId: "cache", title: "Selected healthy replica", subtitle: "temporary feed value in RAM", body: "A HIT ends the cache lookup here.", ...readable, accent: palette.green, fill: palette.greenSoft, variant: "cache" });

  diagram.connector({ id: "client-to-api", points: [{ x: 400, y: 990 }, { x: 650, y: 990 }], label: "feed request", ...route, startBinding: "user-client", endBinding: "feed-api" });
  diagram.connector({ id: "api-to-cache-client", points: [{ x: 990, y: 990 }, { x: 1250, y: 990 }], label: "lookup feed key", ...route, startBinding: "feed-api", endBinding: "cache-client" });
  diagram.connector({ id: "cache-client-to-hash", points: [{ x: 1700, y: 990 }, { x: 1950, y: 990 }], label: "place key", ...route, color: palette.purple, startBinding: "cache-client", endBinding: "hash-key" });
  diagram.connector({ id: "hash-to-shard", points: [{ x: 2250, y: 990 }, { x: 2500, y: 990 }], label: "owning range", ...route, color: palette.purple, startBinding: "hash-key", endBinding: "owning-shard" });
  diagram.connector({ id: "shard-to-replica", points: [{ x: 2820, y: 990 }, { x: 3070, y: 990 }], label: "healthy replica", ...route, color: palette.green, startBinding: "owning-shard", endBinding: "healthy-replica" });

  diagram.connector({ id: "hit-to-api", points: [{ x: 3260, y: 890 }, { x: 3260, y: 830 }, { x: 820, y: 830 }, { x: 820, y: 900 }], label: "HIT · FEED FROM RAM → FEED API", ...route, color: palette.green, startBinding: "healthy-replica", endBinding: "feed-api" });
  diagram.connector({ id: "hit-api-to-client", points: [{ x: 820, y: 1080 }, { x: 820, y: 1160 }, { x: 250, y: 1160 }, { x: 250, y: 1080 }], label: "RETURN FEED", ...route, color: palette.green, startBinding: "feed-api", endBinding: "user-client" });

  diagram.shape({ id: "mechanism-db-fallback", x: 80, y: 1230, width: 930, height: 86, label: "MISS PATH · DATABASE FALLBACK, THEN CACHE REFILL", fontSize: 22, fill: palette.amberSoft, stroke: palette.amber, textColor: palette.amber });
  diagram.system({ id: "authoritative-db", x: 1500, y: 1400, width: 520, height: 230, iconId: "database", title: "Authoritative database", subtitle: "durable original data", body: "Correctness stays here; cached values are disposable copies.", ...readable, accent: palette.coral, fill: palette.white, variant: "database" });
  diagram.system({ id: "miss-api", x: 2700, y: 1400, width: 600, height: 230, iconId: "application-server", title: "Same Feed API request", subtitle: "cache returned MISS", body: "MISS means absent, expired, evicted, or no replica available.", ...readable, accent: palette.amber, fill: palette.amberSoft, variant: "service" });
  diagram.connector({ id: "replica-miss-to-api", points: [{ x: 3370, y: 1090 }, { x: 3370, y: 1290 }, { x: 3000, y: 1290 }, { x: 3000, y: 1400 }], label: "MISS · RESUME IN FEED API", ...route, color: palette.amber, startBinding: "healthy-replica", endBinding: "miss-api" });
  diagram.connector({ id: "api-reads-db", points: [{ x: 2700, y: 1470 }, { x: 2020, y: 1470 }], label: "MISS · READ DATABASE", ...route, color: palette.amber, startBinding: "miss-api", endBinding: "authoritative-db" });
  diagram.connector({ id: "db-result-to-api", points: [{ x: 2020, y: 1570 }, { x: 2700, y: 1570 }], label: "DATABASE RESULT → FEED API", ...route, color: palette.amber, startBinding: "authoritative-db", endBinding: "miss-api" });
  diagram.connector({ id: "api-refills-cache", points: [{ x: 3200, y: 1400 }, { x: 3200, y: 1210 }, { x: 3310, y: 1210 }, { x: 3310, y: 1090 }], label: "REFILL VALUE + TTL", ...route, color: palette.green, strokeStyle: "dashed", startBinding: "miss-api", endBinding: "healthy-replica" });
  diagram.connector({ id: "miss-api-to-client", points: [{ x: 3000, y: 1630 }, { x: 3000, y: 1740 }, { x: 40, y: 1740 }, { x: 40, y: 990 }, { x: 100, y: 990 }], label: "FEED API RETURNS DATABASE RESULT", ...route, color: palette.amber, startBinding: "miss-api", endBinding: "user-client" });

  diagram.shape({ id: "level-2", x: 80, y: 1890, width: 2100, height: 100, label: "KEY PLACEMENT + REPLICATION · HASH CHOOSES SHARD · HEALTHY REPLICA SERVES IT", fontSize: 22, fill: palette.greenSoft, stroke: palette.green, textColor: palette.green });
  diagram.shape({ id: "mechanism-sharding", x: 80, y: 2080, width: 700, height: 86, label: "SHARDING · MORE SHARDS ADD CACHE RAM", fontSize: 22, fill: palette.purpleSoft, stroke: palette.purple, textColor: palette.purple });
  diagram.shape({ id: "mechanism-replication", x: 1650, y: 2080, width: 1350, height: 86, label: "REPLICATION · COPIES KEEP ONE SHARD AVAILABLE", fontSize: 22, fill: palette.greenSoft, stroke: palette.green, textColor: palette.green });

  diagram.system({ id: "hash-ring", x: 120, y: 2290, width: 430, height: 240, iconId: "hash-ring", title: "Consistent hash", subtitle: "hash(key) → one shard", body: "Adding or losing a node moves only nearby key ranges.", ...readable, accent: palette.purple, fill: palette.white, variant: "routing" });
  diagram.system({ id: "shard-a", x: 850, y: 2190, width: 360, height: 190, iconId: "partition", title: "Shard A", subtitle: "different key range", ...readable, accent: palette.muted, variant: "cache" });
  diagram.system({ id: "shard-b", x: 850, y: 2480, width: 360, height: 190, iconId: "partition", title: "Shard B", subtitle: "selected key range", ...readable, accent: palette.green, fill: palette.greenSoft, variant: "cache" });
  diagram.system({ id: "shard-c", x: 850, y: 2770, width: 360, height: 190, iconId: "partition", title: "Shard C", subtitle: "different key range", ...readable, accent: palette.muted, variant: "cache" });

  diagram.connector({ id: "ring-to-a", points: [{ x: 550, y: 2350 }, { x: 650, y: 2350 }, { x: 650, y: 2285 }, { x: 850, y: 2285 }], label: "RANGE A", ...route, color: palette.muted, startBinding: "hash-ring", endBinding: "shard-a" });
  diagram.connector({ id: "ring-to-b", points: [{ x: 550, y: 2410 }, { x: 690, y: 2410 }, { x: 690, y: 2575 }, { x: 850, y: 2575 }], label: "RANGE B · SELECTED", ...route, color: palette.green, startBinding: "hash-ring", endBinding: "shard-b" });
  diagram.connector({ id: "ring-to-c", points: [{ x: 550, y: 2470 }, { x: 630, y: 2470 }, { x: 630, y: 2865 }, { x: 850, y: 2865 }], label: "RANGE C", ...route, color: palette.muted, startBinding: "hash-ring", endBinding: "shard-c" });

  diagram.shape({ id: "replica-set-b", x: 1550, y: 2240, width: 1900, height: 650, label: "SHARD B · THREE RAM REPLICAS", fontSize: 22, fill: "#f7fcf8", stroke: palette.green, textColor: palette.green });
  diagram.system({ id: "replica-b-primary", x: 1700, y: 2440, width: 400, height: 240, iconId: "cache", title: "Shard B", subtitle: "replica 1 · healthy · selected", body: "Serves this read from RAM.", ...readable, accent: palette.green, fill: palette.greenSoft, variant: "cache" });
  diagram.system({ id: "replica-b-peer-1", x: 2300, y: 2440, width: 400, height: 240, iconId: "cache", title: "Shard B", subtitle: "replica 2 · healthy", body: "Stores the same shard data.", ...readable, accent: palette.green, variant: "cache" });
  diagram.system({ id: "replica-b-peer-2", x: 2900, y: 2440, width: 400, height: 240, iconId: "cache", title: "Shard B", subtitle: "replica 3 · healthy", body: "Stores the same shard data.", ...readable, accent: palette.green, variant: "cache" });
  diagram.connector({ id: "shard-b-to-selected-replica", points: [{ x: 1210, y: 2575 }, { x: 1700, y: 2575 }], label: "SELECT HEALTHY REPLICA", ...route, color: palette.green, startBinding: "shard-b", endBinding: "replica-b-primary" });
  diagram.connector({ id: "replicate-to-peer-1", points: [{ x: 2100, y: 2560 }, { x: 2300, y: 2560 }], label: "SAME SHARD DATA", ...route, color: palette.green, startBinding: "replica-b-primary", endBinding: "replica-b-peer-1" });
  diagram.connector({ id: "replicate-to-peer-2", points: [{ x: 2700, y: 2560 }, { x: 2900, y: 2560 }], label: "SAME SHARD DATA", ...route, color: palette.green, startBinding: "replica-b-peer-1", endBinding: "replica-b-peer-2" });

  diagram.shape({ id: "level-3", x: 80, y: 3150, width: 2100, height: 100, label: "WRITE POLICY · DATABASE FIRST → INVALIDATE CACHE → NEXT READ REFILLS", fontSize: 22, fill: palette.coralSoft, stroke: palette.coral, textColor: palette.coral });
  diagram.shape({ id: "write-request-step", x: 100, y: 3430, width: 400, height: 100, label: "1 · WRITE REQUEST", fontSize: 20, fill: palette.white, stroke: palette.green, textColor: palette.green });
  diagram.shape({ id: "write-database-step", x: 800, y: 3430, width: 400, height: 100, label: "2 · UPDATE DATABASE", fontSize: 20, fill: palette.white, stroke: palette.green, textColor: palette.green });
  diagram.shape({ id: "invalidate-key-step", x: 1500, y: 3430, width: 400, height: 100, label: "3 · INVALIDATE CACHE KEY", fontSize: 20, fill: palette.white, stroke: palette.green, textColor: palette.green });
  diagram.shape({ id: "next-read-miss-step", x: 2200, y: 3430, width: 400, height: 100, label: "4 · NEXT READ MISSES", fontSize: 20, fill: palette.amberSoft, stroke: palette.amber, textColor: palette.amber });
  diagram.shape({ id: "database-refill-step", x: 2900, y: 3430, width: 400, height: 100, label: "5 · DATABASE → REFILL", fontSize: 20, fill: palette.greenSoft, stroke: palette.green, textColor: palette.green });
  diagram.connector({ id: "write-request-to-database", points: [{ x: 500, y: 3480 }, { x: 800, y: 3480 }], ...route, color: palette.green, startBinding: "write-request-step", endBinding: "write-database-step" });
  diagram.connector({ id: "database-to-invalidation", points: [{ x: 1200, y: 3480 }, { x: 1500, y: 3480 }], ...route, color: palette.green, startBinding: "write-database-step", endBinding: "invalidate-key-step" });
  diagram.connector({ id: "invalidation-to-next-miss", points: [{ x: 1900, y: 3480 }, { x: 2200, y: 3480 }], ...route, color: palette.amber, startBinding: "invalidate-key-step", endBinding: "next-read-miss-step" });
  diagram.connector({ id: "next-miss-to-database-refill", points: [{ x: 2600, y: 3480 }, { x: 2900, y: 3480 }], ...route, color: palette.green, startBinding: "next-read-miss-step", endBinding: "database-refill-step" });
  diagram.system({ id: "database-first-write", x: 600, y: 3690, width: 2400, height: 180, iconId: "writer", title: "Selected write policy", subtitle: "cache-aside reads + database-first writes", body: "The database is updated first. The old cache entry is invalidated. The next read fetches fresh data and repopulates the cache.", ...readable, accent: palette.green, fill: palette.greenSoft, variant: "service" });

  diagram.shape({ id: "mechanism-memory-policy", x: 80, y: 4070, width: 2100, height: 100, label: "MEMORY + FAILURE + PROOF · TTL/LFU · REPLICA FALLBACK · HOT KEYS · METRICS", fontSize: 22, fill: palette.amberSoft, stroke: palette.amber, textColor: palette.amber });
  diagram.system({ id: "memory-policy", x: 100, y: 4310, width: 550, height: 250, iconId: "policy-gate", title: "TTL or eviction", subtitle: "entry absent → next read misses", body: "MISS → database fallback → cache refill.", ...readable, accent: palette.amber, fill: palette.white, variant: "service" });
  diagram.system({ id: "node-failure", x: 850, y: 4310, width: 600, height: 270, iconId: "fallback", title: "Cache node down", subtitle: "another healthy replica → read succeeds", body: "No healthy replica → MISS → database → refill.", ...readable, accent: palette.coral, fill: palette.white, variant: "warning" });
  diagram.system({ id: "cache-stampede", x: 1650, y: 4310, width: 650, height: 290, iconId: "request-coalescer", title: "Popular key expires", subtitle: "many reads miss together", body: "Allow one database read; make duplicate requests wait, then share the result.", ...readable, accent: palette.coral, fill: palette.white, variant: "warning" });
  diagram.system({ id: "hot-key", x: 2500, y: 4310, width: 600, height: 250, iconId: "cache", title: "Hot key", subtitle: "one shard gets too many requests", body: "Add extra replicas for that item or cache it in the application.", ...readable, accent: palette.coral, fill: palette.white, variant: "warning" });
  diagram.system({ id: "observability", x: 1200, y: 4750, width: 1200, height: 220, iconId: "telemetry", title: "What to measure", subtitle: "hit ratio · shard QPS · p99", body: "Database fallback rate · healthy replicas · evictions · replication delay.", ...readable, accent: palette.cyan, fill: palette.cyanSoft, variant: "observability" });
  return diagram;
}

function buildDistributedCache() {
  const diagram = new Diagram({
    title: "Distributed Cache · financial quorum path",
    description: "A 500k-user distributed cache for balanced financial reads and writes, with explicit request routing, virtual-node placement, physical cache-server replicas, read/write quorums, HIT/MISS paths, write-through, Cassandra consistency, eviction, and monitoring.",
    width: 3400,
    height: 4700,
  });
  const readable = { titleFontSize: 24, bodyFontSize: 21, align: "left" };
  const route = { labelFontSize: 20, strokeWidth: 3.5 };

  diagram.text({ id: "title", x: 70, y: 38, width: 1100, text: "Distributed Cache · financial quorum path", fontSize: 36 });
  diagram.text({ id: "goal", x: 1380, y: 48, width: 1520, text: "GOAL · 500K USERS · BALANCED R/W · FINANCIAL KEYS REQUIRE STRONG CONSISTENCY", fontSize: 20, align: "right", color: palette.muted, weight: 700 });
  diagram.text({ id: "invariant", x: 70, y: 120, width: 2830, text: "INVARIANT · NO CLIENT OBSERVES A VALUE OLDER THAN THE LAST ACKNOWLEDGED WRITE", fontSize: 24, align: "center", color: palette.coral, weight: 700 });

  diagram.shape({ id: "request-layer", x: 80, y: 260, width: 2050, height: 100, label: "REQUEST ROUTING · LOAD BALANCER SPREADS TRAFFIC · CACHE CLIENT COORDINATES REPLICAS", fontSize: 22, fill: palette.blueSoft, stroke: palette.blue, textColor: palette.blue });
  diagram.system({ id: "clients", x: 150, y: 500, width: 350, height: 190, iconId: "client", title: "Clients", subtitle: "read or write request", ...readable, accent: palette.blue, fill: palette.white, variant: "client" });
  diagram.system({ id: "load-balancer", x: 800, y: 500, width: 400, height: 190, iconId: "load-balancer", title: "Load balancer", subtitle: "spreads requests across application instances", ...readable, accent: palette.blue, fill: palette.white, variant: "routing" });
  diagram.system({ id: "cache-client-coordinator", x: 1550, y: 485, width: 550, height: 220, iconId: "data-router", title: "Cache client / coordinator", subtitle: "library inside the application/API service", body: "Hashes each key, selects replicas, and waits for the required cache and database responses.", ...readable, metadata: { layer: "Application/API and cache coordination", objectType: "client library inside an application service", inputs: "read or write plus key and value", outputs: "consistent-hash position, replica requests, quorum result", ownership: "application service" }, accent: palette.blue, fill: palette.white, variant: "service" });
  diagram.connector({ id: "client-request", points: [{ x: 500, y: 595 }, { x: 800, y: 595 }], label: "READ OR WRITE", ...route, startBinding: "clients", endBinding: "load-balancer" });
  diagram.connector({ id: "load-balancer-route", points: [{ x: 1200, y: 595 }, { x: 1550, y: 595 }], label: "FORWARD TO APPLICATION", ...route, startBinding: "load-balancer", endBinding: "cache-client-coordinator" });
  diagram.connector({ id: "coordinator-response", points: [{ x: 1550, y: 680 }, { x: 1350, y: 680 }, { x: 1350, y: 780 }, { x: 1000, y: 780 }, { x: 1000, y: 690 }], label: "RESULT AFTER REQUIRED RESPONSES", ...route, color: palette.green, startBinding: "cache-client-coordinator", endBinding: "load-balancer" });
  diagram.connector({ id: "client-response", points: [{ x: 800, y: 650 }, { x: 650, y: 650 }, { x: 650, y: 780 }, { x: 325, y: 780 }, { x: 325, y: 690 }], label: "RETURN RESPONSE", ...route, color: palette.green, startBinding: "load-balancer", endBinding: "clients" });

  diagram.shape({ id: "placement-layer", x: 80, y: 930, width: 1900, height: 100, label: "KEY PLACEMENT · HASH THE KEY · SELECT THE NEXT VIRTUAL NODE CLOCKWISE · FIND ITS SHARD", fontSize: 22, fill: palette.purpleSoft, stroke: palette.purple, textColor: palette.purple });
  diagram.shape({ id: "hash-ring-visual", x: 750, y: 1250, width: 400, height: 400, shape: "ellipse", fill: palette.white, stroke: palette.purple, strokeWidth: 3 });
  const virtualNodes = [
    { id: "vnode-a-1", x: 918, y: 1218, label: "vA1" },
    { id: "vnode-b-1", x: 1059, y: 1277, label: "vB1" },
    { id: "vnode-b-selected", x: 1118, y: 1418, label: "vB2", selected: true },
    { id: "vnode-c-1", x: 1059, y: 1559, label: "vC1" },
    { id: "vnode-a-2", x: 918, y: 1618, label: "vA2" },
    { id: "vnode-c-2", x: 777, y: 1559, label: "vC2" },
    { id: "vnode-a-3", x: 718, y: 1418, label: "vA3" },
    { id: "vnode-b-2", x: 777, y: 1277, label: "vB3" },
  ];
  for (const node of virtualNodes) {
    diagram.shape({
      id: node.id,
      x: node.x,
      y: node.y,
      width: 64,
      height: 64,
      shape: "ellipse",
      label: node.label,
      iconId: "virtual-node",
      metadata: { layer: "Key placement", objectType: "consistent-hash virtual-node token / ring position", inputs: "clockwise predecessor interval", outputs: node.selected ? "owned key range maps to logical Cache Shard B" : "owned key range maps to one logical shard", ownership: "consistent-hash ring" },
      fontSize: 20,
      fill: node.selected ? palette.greenSoft : palette.white,
      stroke: node.selected ? palette.green : palette.purple,
      strokeWidth: node.selected ? 3 : 2,
      textColor: node.selected ? palette.green : palette.purple,
    });
  }
  diagram.shape({ id: "key-position-marker", x: 1118, y: 1336, width: 38, height: 38, shape: "diamond", fill: palette.amberSoft, stroke: palette.amber, strokeWidth: 3 });
  diagram.text({ id: "hash-key-label", x: 950, y: 1330, width: 150, text: "HASH(KEY)\nPOSITION", fontSize: 20, align: "center", color: palette.amber, weight: 700 });
  diagram.system({ id: "logic-placement", x: 1550, y: 1160, width: 980, height: 500, iconId: "hash-ring", title: "Clockwise-successor stopping rule", subtitle: "hash(key) → first virtual-node token clockwise", body: "1. hash(key) produces one position on the ring.\n2. Starting at that position, move clockwise.\n3. Stop at the first virtual-node token encountered.\n4. In this example, that token is vB2.\n5. The key range ending at vB2 maps to logical Cache Shard B.\n6. Shard B’s replica-selection rule then chooses physical server B1, B2, or B3.\n\nvB2 owns the ring interval after its predecessor and up to vB2.", ...readable, metadata: { layer: "Key placement", objectType: "consistent-hash virtual-node successor rule", inputs: "hash(key) ring position", outputs: "logical Cache Shard B", ownership: "cache client / coordinator" }, accent: palette.purple, fill: palette.white, variant: "routing" });
  diagram.connector({ id: "coordinator-to-ring", points: [{ x: 2100, y: 595 }, { x: 2720, y: 595 }, { x: 2720, y: 1080 }, { x: 1137, y: 1080 }, { x: 1137, y: 1336 }], label: "HASH(KEY) · MARK ONE RING POSITION", ...route, color: palette.purple, startBinding: "cache-client-coordinator", endBinding: "key-position-marker" });
  diagram.connector({ id: "key-position-to-vnode", points: [{ x: 1137, y: 1374 }, { x: 1153, y: 1392 }, { x: 1162, y: 1416 }, { x: 1150, y: 1450 }], label: "CLOCKWISE → STOP AT vB2", labelFontSize: 16, strokeWidth: 3.5, color: palette.purple, startBinding: "key-position-marker", endBinding: "vnode-b-selected" });
  diagram.text({ id: "selected-token-note", x: 1200, y: 1490, width: 250, text: "vB2 · VIRTUAL TOKEN\nNOT PHYSICAL SERVER B2", fontSize: 16, color: palette.green, weight: 700 });

  diagram.shape({ id: "cache-layer", x: 80, y: 1850, width: 2050, height: 100, label: "CACHE SERVERS · ONE SHARD HAS THREE PHYSICAL SERVERS · READ AND WRITE QUORUMS OVERLAP", fontSize: 22, fill: palette.greenSoft, stroke: palette.green, textColor: palette.green });
  diagram.shape({ id: "cache-shard-a", x: 100, y: 2275, width: 350, height: 120, shape: "rectangle", label: "CACHE SHARD A\nLOGICAL KEY RANGE", iconId: "partition", fontSize: 22, metadata: { layer: "Logical key placement", objectType: "logical partition / key range" }, fill: palette.white, stroke: palette.muted, strokeWidth: 2, textColor: palette.muted });
  diagram.shape({ id: "cache-shard-b-group", x: 650, y: 2110, width: 1500, height: 600, fill: "#f7fcf8", stroke: palette.green, strokeWidth: 2.5, textColor: palette.green });
  diagram.system({ id: "cache-shard-b-logical", x: 700, y: 2160, width: 520, height: 145, iconId: "partition", title: "Cache Shard B", subtitle: "logical partition / key range · selected", body: "vB2 maps its owned key range to Cache Shard B.", ...readable, parentId: "cache-shard-b-group", metadata: { layer: "Logical key placement", objectType: "logical partition / key range", inputs: "owned interval ending at vB2", outputs: "replica candidates B1, B2, B3", ownership: "consistent-hash shard map" }, accent: palette.green, fill: palette.greenSoft, variant: "cache" });
  diagram.text({ id: "shard-b-replication", x: 1280, y: 2175, width: 800, text: "REPLICA SELECTION\nTHREE PHYSICAL SERVERS HOLD THIS SHARD", fontSize: 20, align: "center", color: palette.green, weight: 700, parentId: "cache-shard-b-group" });
  diagram.system({ id: "cache-server-b1", x: 780, y: 2390, width: 330, height: 250, iconId: "server", title: "B1", subtitle: "physical cache server", body: "Replica 1 stores a temporary RAM copy of Cache Shard B.", ...readable, parentId: "cache-shard-b-group", metadata: { layer: "Physical cache-server layer", objectType: "physical cache server / replica", inputs: "Shard B read or write", outputs: "versioned value or acknowledgement", ownership: "cache replica set" }, accent: palette.green, fill: palette.white, variant: "cache" });
  diagram.system({ id: "cache-server-b2", x: 1260, y: 2390, width: 330, height: 250, iconId: "server", title: "B2", subtitle: "physical cache server", body: "Replica 2 stores a temporary RAM copy of Cache Shard B.", ...readable, parentId: "cache-shard-b-group", metadata: { layer: "Physical cache-server layer", objectType: "physical cache server / replica", inputs: "Shard B read or write", outputs: "versioned value or acknowledgement", ownership: "cache replica set" }, accent: palette.green, fill: palette.white, variant: "cache" });
  diagram.system({ id: "cache-server-b3", x: 1740, y: 2390, width: 330, height: 250, iconId: "server", title: "B3", subtitle: "physical cache server", body: "Replica 3 stores a temporary RAM copy of Cache Shard B.", ...readable, parentId: "cache-shard-b-group", metadata: { layer: "Physical cache-server layer", objectType: "physical cache server / replica", inputs: "Shard B read or write", outputs: "versioned value or acknowledgement", ownership: "cache replica set" }, accent: palette.green, fill: palette.white, variant: "cache" });
  diagram.shape({ id: "cache-shard-c", x: 2350, y: 2275, width: 350, height: 120, shape: "rectangle", label: "CACHE SHARD C\nLOGICAL KEY RANGE", iconId: "partition", fontSize: 22, metadata: { layer: "Logical key placement", objectType: "logical partition / key range" }, fill: palette.white, stroke: palette.muted, strokeWidth: 2, textColor: palette.muted });
  diagram.connector({ id: "selected-vnode-to-shard-b", points: [{ x: 1182, y: 1450 }, { x: 1450, y: 1450 }, { x: 1450, y: 1740 }, { x: 2820, y: 1740 }, { x: 2820, y: 2040 }, { x: 960, y: 2040 }, { x: 960, y: 2160 }], label: "vB2 MAPS ITS OWNED KEY RANGE TO CACHE SHARD B", ...route, color: palette.purple, startBinding: "vnode-b-selected", endBinding: "cache-shard-b-logical" });
  diagram.connector({ id: "shard-b-to-server-b1", points: [{ x: 820, y: 2305 }, { x: 820, y: 2350 }, { x: 945, y: 2350 }, { x: 945, y: 2390 }], color: palette.green, startBinding: "cache-shard-b-logical", endBinding: "cache-server-b1", parentId: "cache-shard-b-group" });
  diagram.connector({ id: "shard-b-to-server-b2", points: [{ x: 960, y: 2305 }, { x: 960, y: 2330 }, { x: 1425, y: 2330 }, { x: 1425, y: 2390 }], color: palette.green, startBinding: "cache-shard-b-logical", endBinding: "cache-server-b2", parentId: "cache-shard-b-group" });
  diagram.connector({ id: "shard-b-to-server-b3", points: [{ x: 1100, y: 2305 }, { x: 1100, y: 2310 }, { x: 1905, y: 2310 }, { x: 1905, y: 2390 }], color: palette.green, startBinding: "cache-shard-b-logical", endBinding: "cache-server-b3", parentId: "cache-shard-b-group" });
  diagram.connector({ id: "hit-return", points: [{ x: 2150, y: 2630 }, { x: 3000, y: 2630 }, { x: 3000, y: 595 }, { x: 2100, y: 595 }], label: "HIT · RETURN NEWEST CACHE VALUE", ...route, color: palette.green, startBinding: "cache-shard-b-group", endBinding: "cache-client-coordinator" });

  diagram.system({ id: "logic-cache", x: 100, y: 2880, width: 850, height: 330, iconId: "replica-group", title: "Cache quorum + availability", subtitle: "N=3 · R=2 · W=2", body: "N=3: three physical servers per shard.\nR=2: read two versioned values; return the newest.\nW=2: require two cache write acknowledgements.\nR+W>N: the read and write quorums intersect.\nONE SERVER DOWN: two healthy replicas still form a quorum.\nFEWER THAN TWO: do not serve a single potentially stale copy.", ...readable, metadata: { layer: "Replica selection and cache consistency", objectType: "cache quorum policy", inputs: "responses from B1, B2, B3", outputs: "newest version or quorum failure", ownership: "cache client / coordinator" }, accent: palette.green, fill: palette.white, variant: "cache" });
  diagram.system({ id: "write-commit-rule", x: 1050, y: 2880, width: 800, height: 330, iconId: "policy-gate", title: "Acknowledged-write rule", subtitle: "cache W=2 + Cassandra CL=QUORUM", body: "A financial write is acknowledged only after both required quorums succeed for the same version. If either side fails, do not acknowledge; invalidate or bypass the cache until Cassandra refreshes it.", ...readable, metadata: { layer: "Application/API write coordination", objectType: "synchronous write-through commit rule", inputs: "cache W=2 acknowledgements and Cassandra CL=QUORUM acknowledgement", outputs: "client success or explicit failure plus cache invalidation", ownership: "cache client / coordinator" }, accent: palette.coral, fill: palette.coralSoft, variant: "service" });
  diagram.system({ id: "memory-policy", x: 2050, y: 2880, width: 700, height: 230, iconId: "policy-gate", title: "Memory policy", subtitle: "LFU eviction · TTL expiry", body: "Evicted or expired keys follow the MISS path to Cassandra and then refill the cache.", ...readable, accent: palette.amber, fill: palette.white, variant: "service" });

  diagram.shape({ id: "database-layer", x: 80, y: 3370, width: 900, height: 120, label: "DATABASE · AUTHORITATIVE CASSANDRA · QUORUM WRITES", fontSize: 22, fill: palette.coralSoft, stroke: palette.coral, textColor: palette.coral });
  diagram.system({ id: "database-shards", x: 750, y: 3650, width: 1600, height: 240, iconId: "distributed-database", title: "Cassandra cluster", subtitle: "authoritative · RF=3 · CL=QUORUM · partition key=user_id", body: "RF=3: Cassandra stores 3 durable copies of each row.\nCL=QUORUM: 2 of 3 database replicas must respond to the read or write.\nPARTITION KEY: user_id chooses the database partition.", ...readable, metadata: { layer: "Persistence", objectType: "authoritative distributed database", inputs: "miss reads and synchronous financial writes", outputs: "quorum result and durable versioned rows", ownership: "source of truth" }, accent: palette.coral, fill: palette.white, variant: "database" });
  diagram.connector({ id: "cache-miss-to-database", points: [{ x: 1000, y: 2710 }, { x: 1000, y: 3650 }], label: "MISS OR CACHE-QUORUM FAILURE · APPLICATION READS CASSANDRA", ...route, color: palette.amber, startBinding: "cache-shard-b-group", endBinding: "database-shards" });
  diagram.connector({ id: "database-fill-to-cache", points: [{ x: 1950, y: 3650 }, { x: 1950, y: 2710 }], label: "DATABASE RESULT · FILL CACHE WITH SAME VERSION", ...route, color: palette.green, startBinding: "database-shards", endBinding: "cache-shard-b-group" });
  diagram.connector({ id: "cache-write-quorum", points: [{ x: 2100, y: 620 }, { x: 3100, y: 620 }, { x: 3100, y: 2500 }, { x: 2150, y: 2500 }], label: "WRITE CACHE · WAIT FOR W=2", ...route, color: palette.green, startBinding: "cache-client-coordinator", endBinding: "cache-shard-b-group" });
  diagram.connector({ id: "write-through-to-database", points: [{ x: 2100, y: 650 }, { x: 3200, y: 650 }, { x: 3200, y: 3770 }, { x: 2350, y: 3770 }], label: "SAME VERSION · WAIT FOR CASSANDRA CL=QUORUM", ...route, color: palette.coral, startBinding: "cache-client-coordinator", endBinding: "database-shards" });

  diagram.shape({ id: "observability-layer", x: 80, y: 4130, width: 950, height: 100, label: "OBSERVABILITY · PROVE CACHE SPEED AND CONSISTENCY", fontSize: 22, fill: palette.cyanSoft, stroke: palette.cyan, textColor: palette.blue });
  diagram.system({ id: "monitoring-service", x: 1100, y: 4380, width: 1000, height: 210, iconId: "telemetry", title: "Monitoring service", subtitle: "observe cache servers and Cassandra", body: "hit ratio · shard QPS · p50/p99\nquorum failures · replica lag", ...readable, accent: palette.cyan, fill: palette.cyanSoft, variant: "observability" });
  diagram.connector({ id: "cache-signals", points: [{ x: 2150, y: 2550 }, { x: 2800, y: 2550 }, { x: 2800, y: 4460 }, { x: 2100, y: 4460 }], label: "CACHE SIGNALS", ...route, color: palette.cyan, strokeStyle: "dotted", startBinding: "cache-shard-b-group", endBinding: "monitoring-service" });
  diagram.connector({ id: "database-signals", points: [{ x: 2350, y: 3760 }, { x: 2880, y: 3760 }, { x: 2880, y: 4530 }, { x: 2100, y: 4530 }], label: "DATABASE SIGNALS", ...route, color: palette.cyan, strokeStyle: "dotted", startBinding: "database-shards", endBinding: "monitoring-service" });
  return diagram;
}
function buildCdn() {
  const diagram = new Diagram({
    title: "Content delivery network · first-principles request map",
    description:
      "Global routing chooses a healthy point of presence; an edge hit returns immediately, while a miss climbs through an optional parent cache to the authoritative origin and fills the edge for the next request.",
    width: 2500,
    height: 1550,
  });

  diagram.text({ id: "title", x: 52, y: 36, width: 1450, text: "CDN · move content toward demand", fontSize: 34 });
  diagram.text({ id: "legend", x: 1600, y: 49, width: 790, text: "GREEN edge answer · AMBER upstream miss · CORAL failover · PURPLE placement", fontSize: 14, align: "right", color: palette.muted });
  diagram.shape({ id: "cdn-data-plane", x: 40, y: 120, width: 1810, height: 1380, label: "DATA PLANE", fill: palette.blueSoft, stroke: "#b8c9f7" });
  diagram.shape({ id: "cdn-control-plane", x: 1930, y: 120, width: 530, height: 1380, label: "CONTROL / PLACEMENT + OBSERVATION", fill: palette.purpleSoft, stroke: "#c7b5f7" });

  diagram.system({ id: "viewer", x: 80, y: 310, width: 230, height: 104, iconId: "client", title: "Client", subtitle: "requests one object", variant: "client" });
  diagram.system({ id: "global-routing", x: 410, y: 310, width: 260, height: 104, iconId: "global-routing", title: "Global routing", subtitle: "chooses a healthy PoP", variant: "routing" });
  diagram.text({ id: "routing-rule", x: 390, y: 450, width: 300, text: "Close = a good network path,\nnot only geographic distance.", fontSize: 15, align: "center", color: palette.blue, weight: 700 });

  const pops = [
    { id: "lisbon", y: 175, label: "PoP LISBON · SELECTED", selected: true },
    { id: "frankfurt", y: 610, label: "PoP FRANKFURT · ALTERNATE", selected: false },
    { id: "virginia", y: 1045, label: "PoP VIRGINIA · ALTERNATE", selected: false },
  ];
  for (const pop of pops) {
    diagram.shape({ id: `pop-${pop.id}-hull`, x: 760, y: pop.y, width: 730, height: 365, label: pop.label, fill: pop.selected ? "#f3fbf5" : "#fcfcfa", stroke: pop.selected ? palette.green : palette.line, strokeWidth: pop.selected ? 2.5 : 1.5 });
    diagram.system({ id: `pop-${pop.id}-edge`, x: 815, y: pop.y + 120, width: 260, height: 104, iconId: "edge-pop", title: "Edge proxy", subtitle: pop.selected ? "machine serving this request" : "alternate machine", accent: pop.selected ? palette.green : palette.muted, variant: "routing" });
    diagram.system({ id: `pop-${pop.id}-cache`, x: 1160, y: pop.y + 120, width: 270, height: 104, iconId: "cache", title: "Cached objects", subtitle: "RAM hot · SSD colder", accent: pop.selected ? palette.green : palette.muted, variant: "cache" });
    diagram.connector({ id: `pop-${pop.id}-lookup`, points: [{ x: 1075, y: pop.y + 172 }, { x: 1160, y: pop.y + 172 }], label: "lookup", color: pop.selected ? palette.green : palette.muted, startBinding: `pop-${pop.id}-edge`, endBinding: `pop-${pop.id}-cache` });
  }
  diagram.text({ id: "pop-definition", x: 790, y: 470, width: 650, text: "PoP = facility at one location · edge proxy = machine inside it", fontSize: 14, align: "center", color: palette.green, weight: 700 });

  diagram.connector({ id: "viewer-to-routing", points: [{ x: 310, y: 362 }, { x: 410, y: 362 }], label: "request", startBinding: "viewer", endBinding: "global-routing" });
  diagram.connector({ id: "routing-to-selected-pop", points: [{ x: 670, y: 362 }, { x: 815, y: 362 }], label: "choose PoP", startBinding: "global-routing", endBinding: "pop-lisbon-edge" });
  diagram.connector({ id: "routing-to-frankfurt", points: [{ x: 530, y: 414 }, { x: 530, y: 782 }, { x: 815, y: 782 }], label: "Lisbon unhealthy → reroute", color: palette.coral, strokeStyle: "dashed", startBinding: "global-routing", endBinding: "pop-frankfurt-edge" });
  diagram.connector({ id: "routing-to-virginia", points: [{ x: 500, y: 414 }, { x: 500, y: 1217 }, { x: 815, y: 1217 }], label: "region unavailable → another PoP", color: palette.coral, strokeStyle: "dashed", startBinding: "global-routing", endBinding: "pop-virginia-edge" });
  diagram.connector({ id: "edge-response", points: [{ x: 1295, y: 295 }, { x: 1295, y: 255 }, { x: 195, y: 255 }, { x: 195, y: 310 }], label: "HIT → return from edge now", color: palette.green, startBinding: "pop-lisbon-cache", endBinding: "viewer" });
  diagram.connector({ id: "filled-response", points: [{ x: 1160, y: 399 }, { x: 1100, y: 399 }, { x: 1100, y: 520 }, { x: 195, y: 520 }, { x: 195, y: 414 }], label: "after MISS: filled edge → return", color: palette.green, strokeStyle: "dashed", startBinding: "pop-lisbon-cache", endBinding: "viewer" });

  diagram.system({ id: "parent-proxy", x: 1560, y: 500, width: 270, height: 108, iconId: "origin-shield", title: "Parent cache", subtitle: "optional intermediate copy", accent: palette.amber, fill: palette.amberSoft, variant: "cache" });
  diagram.system({ id: "origin", x: 1560, y: 815, width: 270, height: 108, iconId: "server", title: "Origin server", subtitle: "authoritative content", accent: palette.coral, fill: palette.white, variant: "storage" });
  diagram.text({ id: "miss-parent-note", x: 1435, y: 300, width: 250, text: "MISS → ask parent cache", fontSize: 14, color: palette.amber, weight: 700 });
  diagram.connector({ id: "miss-to-parent", points: [{ x: 1430, y: 380 }, { x: 1520, y: 380 }, { x: 1520, y: 554 }, { x: 1560, y: 554 }], color: palette.amber, startBinding: "pop-lisbon-cache", endBinding: "parent-proxy" });
  diagram.connector({ id: "parent-to-origin", points: [{ x: 1695, y: 608 }, { x: 1695, y: 815 }], label: "parent MISS → fetch source", color: palette.amber, startBinding: "parent-proxy", endBinding: "origin" });
  diagram.connector({ id: "origin-to-parent", points: [{ x: 1830, y: 869 }, { x: 1860, y: 869 }, { x: 1860, y: 690 }, { x: 1745, y: 690 }, { x: 1745, y: 608 }], label: "return object", color: palette.green, startBinding: "origin", endBinding: "parent-proxy" });
  diagram.connector({ id: "parent-to-edge-fill", points: [{ x: 1560, y: 575 }, { x: 1490, y: 575 }, { x: 1490, y: 435 }, { x: 1295, y: 435 }, { x: 1295, y: 399 }], label: "return + store copy at edge", color: palette.green, startBinding: "parent-proxy", endBinding: "pop-lisbon-cache" });
  diagram.connector({ id: "direct-miss-to-origin", points: [{ x: 1430, y: 365 }, { x: 1470, y: 365 }, { x: 1470, y: 900 }, { x: 1560, y: 900 }], label: "no parent → fetch origin", color: palette.amber, strokeStyle: "dashed", startBinding: "pop-lisbon-cache", endBinding: "origin" });
  diagram.connector({ id: "direct-origin-fill", points: [{ x: 1560, y: 845 }, { x: 1450, y: 845 }, { x: 1450, y: 455 }, { x: 1295, y: 455 }, { x: 1295, y: 399 }], label: "direct return → fill edge", color: palette.green, strokeStyle: "dashed", startBinding: "origin", endBinding: "pop-lisbon-cache" });
  diagram.text({ id: "best-path-note", x: 1515, y: 1020, width: 350, text: "Best case stops at the edge.\nEach upstream hop adds latency and cost.", fontSize: 17, align: "center", color: palette.amber, weight: 700 });

  diagram.system({ id: "routing-inputs", x: 1980, y: 250, width: 410, height: 120, iconId: "global-routing", title: "Routing inputs", subtitle: "delay · queue · memory · link · cached?", accent: palette.purple, fill: palette.white, variant: "routing" });
  diagram.system({ id: "content-placement", x: 1980, y: 610, width: 410, height: 120, iconId: "control-plane", title: "Control + placement system", subtitle: "PULL after miss · PUSH before demand", accent: palette.purple, fill: palette.white, variant: "service" });
  diagram.system({ id: "cdn-telemetry", x: 1980, y: 970, width: 410, height: 120, iconId: "telemetry", title: "Observation · what signals prove", subtitle: "hit ratio · queues · origin traffic · fetch failures", accent: palette.cyan, fill: palette.cyanSoft, variant: "observability" });
  diagram.connector({ id: "routing-signals", points: [{ x: 1980, y: 310 }, { x: 1905, y: 310 }, { x: 1905, y: 215 }, { x: 530, y: 215 }, { x: 530, y: 310 }], label: "choose and reroute", color: palette.purple, strokeStyle: "dashed", startBinding: "routing-inputs", endBinding: "global-routing" });
  for (const [popId, cacheY] of [["lisbon", 347], ["frankfurt", 782], ["virginia", 1217]]) {
    diagram.connector({ id: `placement-${popId}`, points: [{ x: 1980, y: 670 }, { x: 1920, y: 670 }, { x: 1920, y: cacheY }, { x: 1430, y: cacheY }], label: popId === "lisbon" ? "push selected content / expiry rules" : undefined, color: palette.purple, strokeStyle: "dashed", startBinding: "content-placement", endBinding: `pop-${popId}-cache` });
    diagram.connector({ id: `telemetry-${popId}`, points: [{ x: 1430, y: cacheY + 28 }, { x: 1885, y: cacheY + 28 }, { x: 1885, y: 1030 }, { x: 1980, y: 1030 }], color: palette.cyan, strokeStyle: "dotted", startBinding: `pop-${popId}-cache`, endBinding: "cdn-telemetry" });
  }
  diagram.connector({ id: "telemetry-to-routing", points: [{ x: 2390, y: 1030 }, { x: 2420, y: 1030 }, { x: 2420, y: 310 }, { x: 2390, y: 310 }], color: palette.cyan, strokeStyle: "dotted", startBinding: "cdn-telemetry", endBinding: "routing-inputs" });
  diagram.connector({ id: "origin-to-placement", points: [{ x: 1830, y: 895 }, { x: 1950, y: 895 }, { x: 1950, y: 700 }, { x: 1980, y: 700 }], color: palette.purple, strokeStyle: "dashed", startBinding: "origin", endBinding: "content-placement" });

  return diagram;
}

function buildSystemCanvasApp() {
  const diagram = new Diagram({
    title: "System Canvas application architecture",
    description:
      "Vite builds the TypeScript and React frontend; the browser runs a repository-owned SVG editor module, keeps a JSON copy in localStorage, and synchronizes board documents through a Node.js and Fastify application server to filesystem snapshots.",
    width: 2700,
    height: 1780,
    background: "#f8fafc",
  });

  diagram.text({ id: "title", x: 52, y: 36, width: 1600, text: "System Canvas · what runs where", fontSize: 34 });
  diagram.text({ id: "legend", x: 1540, y: 42, width: 1030, text: "BLUE browser · GREEN browser storage · PURPLE server · AMBER build · TEAL visual assets", fontSize: 14, align: "right", color: palette.muted });

  diagram.shape({ id: "tooling-zone", x: 40, y: 90, width: 410, height: 1350, label: "BUILD / DEVELOPMENT · NOT APP DATA RUNTIME", fill: palette.amberSoft, stroke: "#e7bf80" });
  diagram.shape({ id: "browser-zone", x: 490, y: 90, width: 1230, height: 1350, label: "FRONTEND RUNTIME · THE USER'S WEB BROWSER", fill: palette.blueSoft, stroke: "#b8c9f7" });
  diagram.shape({ id: "browser-persistence-zone", x: 535, y: 1030, width: 1140, height: 355, label: "BROWSER-OWNED PERSISTENCE + SYNC", fill: palette.greenSoft, stroke: "#b4ddbe" });
  diagram.shape({ id: "server-zone", x: 1760, y: 90, width: 900, height: 1350, label: "APPLICATION SERVER RUNTIME · NODE.JS PROCESS", fill: palette.purpleSoft, stroke: "#c7b5f7" });
  diagram.shape({ id: "server-persistence-zone", x: 2115, y: 1000, width: 500, height: 385, label: "SERVER PERSISTENCE", fill: "#fbfaf6", stroke: palette.purple, strokeStyle: "dashed" });

  diagram.system({ id: "frontend-source", x: 75, y: 235, width: 340, height: 125, iconId: "file-snapshot", title: "Frontend source files", subtitle: ".tsx + .ts + CSS in this repo", body: "Input code; it does not run until Vite transforms it.", metadata: { runtimeLocation: "Repository / build input", layer: "Build input", sourcePath: "src/, shared/, index.html, src/styles.css", packageName: "project source", objectType: "TypeScript, TSX, CSS, HTML files", outputs: "modules consumed by Vite", ownership: "project-owned" }, accent: palette.amber, fill: palette.white, variant: "storage" });
  diagram.system({ id: "vite", x: 75, y: 445, width: 340, height: 130, iconId: "worker", title: "Vite build / dev tool", subtitle: "transforms TSX · bundles browser files", body: "Tooling package, not the editor or an application server.", metadata: { runtimeLocation: "Developer machine / build process", layer: "Build tooling", sourcePath: "vite.config.ts; package.json", packageName: "vite 6.4.3 + @vitejs/plugin-react", objectType: "build tool and development server", inputs: "frontend source modules", outputs: "dev module responses or dist/ assets", ownership: "third-party package configured by this project" }, accent: palette.amber, fill: palette.white, variant: "service" });
  diagram.system({ id: "vite-dev-server", x: 75, y: 650, width: 340, height: 125, iconId: "application-server", title: "Vite development server", subtitle: "development only", body: "Serves transformed modules to the browser during npm run dev.", metadata: { runtimeLocation: "Developer machine, separate dev process", layer: "Development serving", sourcePath: "package.json scripts.dev:web", packageName: "vite", objectType: "development HTTP server", inputs: "source modules", outputs: "transformed JS and CSS to browser" }, accent: palette.amber, fill: palette.white, variant: "service" });
  diagram.system({ id: "static-build", x: 75, y: 875, width: 340, height: 125, iconId: "file-snapshot", title: "dist/ static build", subtitle: "HTML + browser JavaScript + CSS", body: "Production files; Node/Fastify serves them but they execute in the browser.", metadata: { runtimeLocation: "dist/ on the server filesystem", layer: "Production artifact", sourcePath: "dist/ (generated)", packageName: "Vite output", objectType: "static files", inputs: "compiled frontend source", outputs: "HTML, JavaScript, CSS" }, accent: palette.amber, fill: palette.white, variant: "storage" });
  diagram.text({ id: "vite-note", x: 72, y: 1060, width: 350, text: "Vite is tooling.\nIt is not the SVG editor,\napplication server, or database.", fontSize: 19, color: palette.amber, weight: 700 });
  diagram.connector({ id: "source-to-vite", points: [{ x: 245, y: 360 }, { x: 245, y: 445 }], label: "source input", color: palette.amber, startBinding: "frontend-source", endBinding: "vite" });
  diagram.connector({ id: "vite-to-dev-server", points: [{ x: 165, y: 575 }, { x: 165, y: 650 }], label: "npm run dev", color: palette.amber, startBinding: "vite", endBinding: "vite-dev-server" });
  diagram.connector({ id: "vite-to-build", points: [{ x: 415, y: 510 }, { x: 475, y: 510 }, { x: 475, y: 937 }, { x: 415, y: 937 }], label: "npm run build", color: palette.amber, strokeStyle: "dashed", startBinding: "vite", endBinding: "static-build" });

  diagram.system({ id: "browser", x: 530, y: 250, width: 250, height: 130, iconId: "browser", title: "Browser tab / client", subtitle: "runs the frontend", body: "Owns DOM, pointer/keyboard/wheel events, memory, and localStorage.", metadata: { runtimeLocation: "User's web browser", layer: "Client runtime", objectType: "browser tab", inputs: "HTML, JavaScript, CSS and user events", outputs: "DOM/SVG pixels and HTTP requests", ownership: "browser environment" }, variant: "client" });
  diagram.system({ id: "react-workspace", x: 820, y: 250, width: 340, height: 130, iconId: "workspace", title: "Browser application UI", subtitle: "React 18 + TypeScript components", body: "App owns board state and renders the workspace around the canvas.", metadata: { runtimeLocation: "Browser JavaScript runtime", layer: "Frontend UI", sourcePath: "src/App.tsx; src/components/WorkspaceLayout.tsx", packageName: "react 18.3.1 + react-dom 18.3.1", objectType: "React component tree", inputs: "API data, local board data, user actions", outputs: "props and BoardScene updates", ownership: "project-owned components using React" }, variant: "service" });
  diagram.system({ id: "custom-editor", x: 1210, y: 240, width: 470, height: 150, iconId: "whiteboard", title: "Custom SVG editor module", subtitle: "repo-owned React + TypeScript code", body: "A set of project modules—not a separate library, server, or database. It turns BoardScene data and user events into edited scene data and SVG.", metadata: { runtimeLocation: "Browser JavaScript runtime", layer: "Frontend editor", sourcePath: "src/editor/EditorCanvas.tsx; src/editor/CanvasElementView.tsx; src/editor/camera.ts; src/editor/canvas-model.ts", packageName: "project-owned modules; React is the rendering dependency", objectType: "React component plus pure TypeScript model functions", inputs: "BoardScene, pointer/keyboard/wheel/resize events, image files", outputs: "updated BoardScene and native SVG DOM", ownership: "project-owned" }, accent: palette.blue, fill: palette.white, variant: "service" });
  diagram.text({ id: "editor-definition", x: 530, y: 420, width: 600, text: "Editor definition · browser code in this repository—not a separate library, server, database, browser, or runtime.", fontSize: 15, color: palette.blue, weight: 700 });

  diagram.system({ id: "stencil-catalog", x: 530, y: 510, width: 240, height: 160, iconId: "template-grid", title: "Built-in stencil catalog", subtitle: "bundled TypeScript definitions", body: "Defines each concept's name, role, color, iconId, category, and search terms.", metadata: { runtimeLocation: "Browser bundle", layer: "Visual vocabulary", sourcePath: "src/stencils/catalog.ts; src/stencils/types.ts", packageName: "project-owned", objectType: "readonly StencilDefinition[]", inputs: "compiled catalog data", outputs: "StencilShelfItem choices shown by StencilShelf", ownership: "project-owned" }, accent: palette.cyan, fill: palette.white, variant: "service" });
  diagram.system({ id: "component-palette", x: 795, y: 510, width: 260, height: 160, iconId: "template-grid", title: "Component palette / StencilShelf", subtitle: "searchable React UI", body: "Shows built-in and My library choices. Clicking one calls insertStencil in App.tsx with its ID.", metadata: { runtimeLocation: "Browser React UI", layer: "Component palette", sourcePath: "src/components/StencilShelf.tsx; src/App.tsx", packageName: "project-owned React component", objectType: "React component receiving StencilShelfItem[]", inputs: "built-in and custom choices, search text, selected stencil ID", outputs: "onInsertStencil(stencilId)", ownership: "WorkspaceLayout / App" }, accent: palette.cyan, fill: palette.white, variant: "service" });
  diagram.system({ id: "placed-browser-element", x: 1080, y: 510, width: 260, height: 160, iconId: "file-snapshot", title: "Placed CanvasSystemElement", subtitle: "one editable object", body: "createStencilElements turns the selected definition and viewport point into scene data.", metadata: { runtimeLocation: "Browser memory", layer: "Canvas object creation", sourcePath: "src/stencils/createStencilElements.ts; src/App.tsx", packageName: "project-owned", objectType: "CanvasSystemElement", inputs: "StencilDefinition plus viewport center", outputs: "element inserted through EditorCanvas API", ownership: "App / board scene" }, accent: palette.cyan, fill: palette.white, variant: "storage" });
  diagram.system({ id: "board-scene", x: 1365, y: 510, width: 315, height: 160, iconId: "file-snapshot", title: "BoardScene in memory", subtitle: "typed JSON-shaped application state", body: "Elements + camera/background + embedded image files; this is data, not the SVG DOM.", metadata: { runtimeLocation: "Browser memory", layer: "Editor state", sourcePath: "shared/contracts.ts", packageName: "project-owned TypeScript contract", objectType: "BoardScene object", inputs: "loaded board, inserted objects, or editor mutations", outputs: "render input, local JSON, server save payload", ownership: "React App / EditorCanvas" }, accent: palette.blue, fill: palette.white, variant: "storage" });

  diagram.system({ id: "my-library", x: 530, y: 750, width: 260, height: 135, iconId: "template-grid", title: "My library", subtitle: "custom reusable elements", body: "Saved as JSON in browser localStorage and shown in the same component palette.", metadata: { runtimeLocation: "Browser memory and localStorage", layer: "User component library", sourcePath: "src/data/custom-stencil-store.ts", packageName: "project-owned", objectType: "CustomStencilDefinition[]", inputs: "a selected customized element", outputs: "reusable StencilShelfItem choice", ownership: "user/browser" }, accent: palette.green, fill: palette.greenSoft, variant: "storage" });
  diagram.system({ id: "browser-files", x: 815, y: 750, width: 260, height: 145, iconId: "import-export", title: "Browser file features", subtitle: "images · JSON · SVG · PNG", body: "Reads image files into board data, imports board JSON, and exports JSON/SVG/PNG downloads.", metadata: { runtimeLocation: "Browser JavaScript runtime", layer: "File input and export", sourcePath: "src/editor/EditorCanvas.tsx; src/editor/downloads.ts; shared/validation.ts", packageName: "browser File, Blob, URL, and FileReader APIs", objectType: "browser file operations", inputs: "image or board JSON files; current BoardScene", outputs: "embedded CanvasFile data or downloaded JSON/SVG/PNG", ownership: "EditorCanvas" }, accent: palette.cyan, fill: palette.white, variant: "storage" });
  diagram.system({ id: "canvas-controls", x: 1100, y: 750, width: 260, height: 145, iconId: "control-plane", title: "Editor controls", subtitle: "labels · tools · lock · background", body: "Toolbar, resize handles, and inspector controls change elements or appState.", metadata: { runtimeLocation: "Browser React UI", layer: "Editor interaction controls", sourcePath: "src/editor/EditorCanvas.tsx", packageName: "project-owned React code with lucide-react UI glyphs", objectType: "toolbar, inspector, and resize interactions", inputs: "pointer, keyboard, wheel, form, and resize actions", outputs: "BoardScene element or appState updates", ownership: "EditorCanvas" }, accent: palette.cyan, fill: palette.white, variant: "service" });
  diagram.system({ id: "native-svg", x: 1385, y: 750, width: 295, height: 145, iconId: "canvas", title: "Native browser SVG + DOM", subtitle: "<svg>, <g>, <rect>, <text>, <polyline>", body: "Editor renders native SVG; pointer, wheel, keyboard, and resize events return to editor code.", metadata: { runtimeLocation: "Browser DOM", layer: "Rendering and input surface", sourcePath: "src/editor/CanvasElementView.tsx; src/editor/EditorCanvas.tsx", packageName: "browser-native SVG; React creates DOM nodes", objectType: "SVG DOM tree", inputs: "BoardScene and React props", outputs: "pixels and pointer/wheel/keyboard/resize events", ownership: "browser DOM rendered by project code" }, accent: palette.blue, fill: palette.white, variant: "service" });

  diagram.connector({ id: "vite-to-browser-app", points: [{ x: 415, y: 712 }, { x: 480, y: 712 }, { x: 480, y: 190 }, { x: 990, y: 190 }, { x: 990, y: 250 }], label: "development: transformed JS + CSS", color: palette.amber, startBinding: "vite-dev-server", endBinding: "react-workspace" });
  diagram.connector({ id: "browser-to-workspace", points: [{ x: 780, y: 315 }, { x: 820, y: 315 }], startBinding: "browser", endBinding: "react-workspace" });
  diagram.connector({ id: "workspace-to-editor", points: [{ x: 1160, y: 315 }, { x: 1210, y: 315 }], startBinding: "react-workspace", endBinding: "custom-editor" });
  diagram.connector({ id: "workspace-to-scene", points: [{ x: 1160, y: 330 }, { x: 1180, y: 330 }, { x: 1180, y: 480 }, { x: 1400, y: 480 }, { x: 1400, y: 510 }], label: "React owns BoardScene state", startBinding: "react-workspace", endBinding: "board-scene" });
  diagram.connector({ id: "editor-scene-loop", points: [{ x: 1580, y: 510 }, { x: 1580, y: 390 }], label: "scene in ↕ edited scene out", color: palette.green, startBinding: "board-scene", endBinding: "custom-editor", startArrow: "arrow" });
  diagram.connector({ id: "editor-svg-loop", points: [{ x: 1680, y: 330 }, { x: 1705, y: 330 }, { x: 1705, y: 822 }, { x: 1680, y: 822 }], color: palette.cyan, startBinding: "custom-editor", endBinding: "native-svg", startArrow: "arrow" });
  diagram.connector({ id: "catalog-to-palette", points: [{ x: 770, y: 590 }, { x: 795, y: 590 }], color: palette.cyan, startBinding: "stencil-catalog", endBinding: "component-palette" });
  diagram.connector({ id: "palette-to-placed-element", points: [{ x: 1055, y: 590 }, { x: 1080, y: 590 }], color: palette.cyan, startBinding: "component-palette", endBinding: "placed-browser-element" });
  diagram.connector({ id: "placed-element-to-scene", points: [{ x: 1340, y: 590 }, { x: 1365, y: 590 }], color: palette.cyan, startBinding: "placed-browser-element", endBinding: "board-scene" });
  diagram.connector({ id: "my-library-to-palette", points: [{ x: 660, y: 750 }, { x: 660, y: 710 }, { x: 925, y: 710 }, { x: 925, y: 670 }], label: "custom choices", color: palette.green, startBinding: "my-library", endBinding: "component-palette" });
  diagram.connector({ id: "files-to-scene", points: [{ x: 945, y: 750 }, { x: 945, y: 690 }, { x: 1450, y: 690 }, { x: 1450, y: 670 }], label: "import + embed", color: palette.cyan, startBinding: "browser-files", endBinding: "board-scene" });
  diagram.connector({ id: "scene-to-files", points: [{ x: 1500, y: 670 }, { x: 1500, y: 730 }, { x: 990, y: 730 }, { x: 990, y: 750 }], label: "export files", color: palette.cyan, strokeStyle: "dashed", startBinding: "board-scene", endBinding: "browser-files" });
  diagram.connector({ id: "controls-to-scene", points: [{ x: 1230, y: 750 }, { x: 1230, y: 700 }, { x: 1345, y: 700 }, { x: 1345, y: 620 }, { x: 1365, y: 620 }], color: palette.cyan, startBinding: "canvas-controls", endBinding: "board-scene" });

  diagram.system({ id: "local-storage", x: 590, y: 1140, width: 390, height: 125, iconId: "local-storage", title: "Browser localStorage", subtitle: "local board + My library JSON", body: "Synchronous browser key/value storage; it survives reload and is not server storage.", metadata: { runtimeLocation: "User's browser profile", layer: "Local persistence", sourcePath: "src/data/local-board-store.ts; src/data/custom-stencil-store.ts", packageName: "browser Web Storage API", objectType: "string key/value storage", inputs: "JSON.stringify board or custom stencil", outputs: "locally restored JSON", ownership: "browser/user" }, accent: palette.green, fill: palette.white, variant: "storage" });
  diagram.system({ id: "save-queue", x: 1130, y: 1140, width: 390, height: 125, iconId: "message-queue", title: "RevisionSaveQueue", subtitle: "debounce · one HTTP save in flight", body: "Browser code serializes remote saves and keeps the latest pending scene.", metadata: { runtimeLocation: "Browser JavaScript memory", layer: "Remote synchronization", sourcePath: "src/data/revision-save-queue.ts", packageName: "project-owned", objectType: "TypeScript class", inputs: "BoardScene plus expected revision", outputs: "save API requests and revision acknowledgements", ownership: "App.tsx" }, accent: palette.green, fill: palette.white, variant: "service" });
  diagram.text({ id: "local-storage-note", x: 620, y: 1300, width: 840, text: "Every edit writes locally first. localStorage belongs to the browser; it is not server storage or a database server.", fontSize: 16, align: "center", color: palette.green, weight: 700 });
  diagram.connector({ id: "scene-to-local-storage", points: [{ x: 1680, y: 560 }, { x: 1695, y: 560 }, { x: 1695, y: 960 }, { x: 525, y: 960 }, { x: 525, y: 1170 }, { x: 590, y: 1170 }], label: "JSON.stringify after edit", color: palette.green, startBinding: "board-scene", endBinding: "local-storage" });
  diagram.connector({ id: "local-storage-to-scene", points: [{ x: 590, y: 1200 }, { x: 510, y: 1200 }, { x: 510, y: 920 }, { x: 1370, y: 920 }, { x: 1370, y: 620 }, { x: 1365, y: 620 }], label: "reload: read local copy", color: palette.green, strokeStyle: "dashed", startBinding: "local-storage", endBinding: "board-scene" });
  diagram.connector({ id: "local-storage-to-my-library", points: [{ x: 590, y: 1180 }, { x: 500, y: 1180 }, { x: 500, y: 815 }, { x: 530, y: 815 }], color: palette.green, strokeStyle: "dashed", startBinding: "local-storage", endBinding: "my-library", startArrow: "arrow" });
  diagram.connector({ id: "scene-to-save-queue", points: [{ x: 1680, y: 620 }, { x: 1710, y: 620 }, { x: 1710, y: 1120 }, { x: 1325, y: 1120 }, { x: 1325, y: 1140 }], label: "enqueue board JSON", color: palette.green, startBinding: "board-scene", endBinding: "save-queue" });

  diagram.system({ id: "fastify-api", x: 1820, y: 275, width: 420, height: 145, iconId: "application-server", title: "Application / API server", subtitle: "Node.js runtime · Fastify 5 · TypeScript", body: "Handles board/template HTTP routes. In production @fastify/static also serves dist/.", metadata: { runtimeLocation: "Node.js server process", layer: "Backend HTTP application", sourcePath: "server/index.ts; server/app.ts", packageName: "fastify 5.12.1; @fastify/static 10.1.3", objectType: "Fastify application server", inputs: "HTTP requests and JSON bodies", outputs: "HTML/static files or JSON responses", ownership: "project-owned server using third-party packages" }, accent: palette.purple, fill: palette.white, variant: "service" });
  diagram.system({ id: "board-store", x: 2180, y: 540, width: 420, height: 145, iconId: "application-server", title: "FileBoardStore server module", subtitle: "validates schema + expected revision", body: "A project class that reads and atomically replaces JSON files; not a database server.", metadata: { runtimeLocation: "Node.js server process", layer: "Persistence adapter", sourcePath: "server/board-store.ts; shared/validation.ts", packageName: "project-owned; node:fs/promises", objectType: "TypeScript FileBoardStore class", inputs: "validated board ID, name, scene, expected revision", outputs: "BoardDocument or revision conflict", ownership: "server application" }, accent: palette.purple, fill: palette.white, variant: "service" });
  diagram.system({ id: "template-modules", x: 1820, y: 760, width: 420, height: 135, iconId: "template-grid", title: "Template modules", subtitle: "typed scene constants imported by the server", body: "Generated from repo-native diagram code, then cloned for new boards.", metadata: { runtimeLocation: "Node.js server bundle", layer: "Default content", sourcePath: "server/templates.ts; server/generated/*-template.ts", packageName: "project-owned generated TypeScript", objectType: "TemplateDefinition constants", inputs: "template ID", outputs: "fresh BoardScene clone", ownership: "project-owned" }, accent: palette.purple, fill: palette.white, variant: "storage" });
  diagram.system({ id: "file-snapshots", x: 2165, y: 1115, width: 400, height: 140, iconId: "file-snapshot", title: "Filesystem JSON snapshots", subtitle: ".data/{boardId}.json", body: "One portable BoardDocument per file. This is server persistence, not a database service.", metadata: { runtimeLocation: "Server filesystem", layer: "Durable persistence", sourcePath: ".data/{boardId}.json (runtime data)", packageName: "Node.js filesystem", objectType: "JSON file", inputs: "temporary serialized BoardDocument", outputs: "parsed BoardDocument", ownership: "FileBoardStore" }, accent: palette.purple, fill: palette.white, variant: "storage" });
  diagram.text({ id: "server-definition", x: 1820, y: 445, width: 280, text: "This Node.js process is the application server. In production it also serves Vite's dist/ files.", fontSize: 15, color: palette.purple, weight: 700 });

  diagram.connector({ id: "static-build-to-server", points: [{ x: 415, y: 937 }, { x: 460, y: 937 }, { x: 460, y: 1415 }, { x: 1790, y: 1415 }, { x: 1790, y: 350 }, { x: 1820, y: 350 }], label: "production: @fastify/static serves dist/", color: palette.amber, strokeStyle: "dashed", startBinding: "static-build", endBinding: "fastify-api" });
  diagram.connector({ id: "workspace-to-api", points: [{ x: 1100, y: 250 }, { x: 1100, y: 205 }, { x: 1740, y: 205 }, { x: 1740, y: 325 }, { x: 1820, y: 325 }], label: "API request", color: palette.purple, strokeStyle: "dashed", startBinding: "react-workspace", endBinding: "fastify-api" });
  diagram.connector({ id: "fastify-to-browser-app", points: [{ x: 1820, y: 300 }, { x: 1750, y: 300 }, { x: 1750, y: 160 }, { x: 1050, y: 160 }, { x: 1050, y: 250 }], label: "HTML + JS + CSS", color: palette.amber, strokeStyle: "dashed", startBinding: "fastify-api", endBinding: "react-workspace" });
  diagram.text({ id: "save-request-note", x: 1010, y: 1070, width: 300, text: "SAVE REQUEST →\nboard JSON + expected revision", fontSize: 14, align: "center", color: palette.purple, weight: 700 });
  diagram.text({ id: "save-response-note", x: 1350, y: 1070, width: 300, text: "SAVE RESPONSE ←\nnew revision, or conflict keeps local", fontSize: 14, align: "center", color: palette.coral, weight: 700 });
  diagram.connector({ id: "queue-to-api", points: [{ x: 1520, y: 1200 }, { x: 1740, y: 1200 }, { x: 1740, y: 375 }, { x: 1820, y: 375 }], color: palette.purple, startBinding: "save-queue", endBinding: "fastify-api" });
  diagram.connector({ id: "api-to-store", points: [{ x: 2200, y: 420 }, { x: 2200, y: 540 }], label: "call TypeScript module", color: palette.purple, startBinding: "fastify-api", endBinding: "board-store" });
  diagram.connector({ id: "templates-to-store", points: [{ x: 2200, y: 760 }, { x: 2200, y: 685 }], label: "import constants · clone scene", color: palette.purple, startBinding: "template-modules", endBinding: "board-store" });
  diagram.connector({ id: "store-to-files", points: [{ x: 2390, y: 660 }, { x: 2390, y: 1115 }], label: "temp file → atomic rename", color: palette.purple, startBinding: "board-store", endBinding: "file-snapshots" });
  diagram.connector({ id: "files-to-store", points: [{ x: 2565, y: 1185 }, { x: 2590, y: 1185 }, { x: 2590, y: 720 }, { x: 2580, y: 720 }, { x: 2580, y: 685 }], label: "read + parse board JSON", color: palette.purple, strokeStyle: "dashed", startBinding: "file-snapshots", endBinding: "board-store" });
  diagram.connector({ id: "api-save-response", points: [{ x: 1820, y: 395 }, { x: 1685, y: 395 }, { x: 1685, y: 1250 }, { x: 1520, y: 1250 }], color: palette.coral, strokeStyle: "dashed", startBinding: "fastify-api", endBinding: "save-queue" });

  diagram.shape({ id: "visual-vocabulary-zone", x: 40, y: 1470, width: 2620, height: 270, label: "VISUAL VOCABULARY · WHAT AN ICON ACTUALLY IS", fill: palette.cyanSoft, stroke: palette.cyan });
  diagram.system({ id: "visual-concept", x: 80, y: 1545, width: 300, height: 130, iconId: "server", title: "1 · System concept", subtitle: "server · cache · database · router", body: "The idea we want a learner to recognize.", metadata: { runtimeLocation: "Design vocabulary", layer: "Semantics", sourcePath: "src/stencils/types.ts", objectType: "concept represented by data", outputs: "an iconId and stencil definition", ownership: "project design language" }, accent: palette.cyan, fill: palette.white, variant: "service" });
  diagram.system({ id: "system-icon-registry", x: 430, y: 1535, width: 430, height: 150, iconId: "canvas", title: "2 · SystemIcon registry", subtitle: "hand-authored local SVG paths", body: "src/editor/SystemIcon.tsx draws interactive canvas icons. No icon package supplies this system artwork; the static template script emits corresponding project-owned generated SVG geometry.", metadata: { runtimeLocation: "Browser bundle; generator at build/design time", layer: "Visual asset registry", sourcePath: "src/editor/SystemIcon.tsx; scripts/template-diagram-kit.mjs", packageName: "project-owned SVG geometry", objectType: "React SVG component plus generator function", inputs: "iconId", outputs: "SVG paths, circles, rectangles", ownership: "project-owned" }, accent: palette.cyan, fill: palette.white, variant: "service" });
  diagram.system({ id: "stencil-definition", x: 910, y: 1545, width: 400, height: 130, iconId: "template-grid", title: "3 · Stencil definition", subtitle: "name + role + color + iconId", body: "The catalog turns visual vocabulary into searchable insertable choices.", metadata: { runtimeLocation: "Browser bundle", layer: "Stencil catalog", sourcePath: "src/stencils/catalog.ts", packageName: "project-owned", objectType: "StencilDefinition", inputs: "concept and SystemIcon iconId", outputs: "searchable shelf item", ownership: "project-owned" }, accent: palette.cyan, fill: palette.white, variant: "service" });
  diagram.system({ id: "placed-canvas-object", x: 1360, y: 1545, width: 410, height: 130, iconId: "file-snapshot", title: "4 · Placed canvas object", subtitle: "CanvasSystemElement saved in BoardScene JSON", body: "The element stores iconId plus editable title, subtitle, body, size, style, lock, and metadata.", metadata: { runtimeLocation: "Browser memory, localStorage, server JSON", layer: "Canvas data", sourcePath: "shared/contracts.ts; src/stencils/createStencilElements.ts", packageName: "project-owned", objectType: "CanvasSystemElement", inputs: "StencilDefinition and placement point", outputs: "editable rendered SVG card", ownership: "board document" }, accent: palette.cyan, fill: palette.white, variant: "storage" });
  diagram.system({ id: "lucide-ui-icons", x: 1830, y: 1535, width: 780, height: 150, iconId: "control-plane", title: "Toolbar icons are a separate source", subtitle: "lucide-react 0.468.0 · third-party React icon package", body: "EditorCanvas.tsx imports MousePointer2, Hand, Square, Circle, Diamond, ArrowUpRight, Type, ImagePlus, Lock, Undo2, and other interface controls. Lucide decorates the app UI; it does not define the system stencil artwork.", metadata: { runtimeLocation: "Browser UI bundle", layer: "Interface controls", sourcePath: "src/editor/EditorCanvas.tsx and src/components/*.tsx", packageName: "lucide-react 0.468.0", objectType: "third-party React SVG icon components", inputs: "React render", outputs: "toolbar/control glyphs", ownership: "third-party package" }, accent: palette.cyan, fill: palette.white, variant: "service" });
  diagram.connector({ id: "concept-to-icon", points: [{ x: 380, y: 1610 }, { x: 430, y: 1610 }], color: palette.cyan, startBinding: "visual-concept", endBinding: "system-icon-registry" });
  diagram.connector({ id: "icon-to-stencil", points: [{ x: 860, y: 1610 }, { x: 910, y: 1610 }], color: palette.cyan, startBinding: "system-icon-registry", endBinding: "stencil-definition" });
  diagram.connector({ id: "stencil-to-element", points: [{ x: 1310, y: 1610 }, { x: 1360, y: 1610 }], color: palette.cyan, startBinding: "stencil-definition", endBinding: "placed-canvas-object" });

  return diagram;
}

const socialFeedCache = buildSocialFeedCache();
const distributedCache = buildDistributedCache();
const cdn = buildCdn();
const systemCanvas = buildSystemCanvasApp();

await Promise.all([
  writeTemplateArtifacts({
    diagram: socialFeedCache,
    templateId: "social-feed-distributed-cache",
    templateName: "Social Feed — Distributed Cache",
    templateDescription: "Design a read-heavy 500k-user feed cache with integrated key routing, explicit RAM hit and database miss paths, database-first invalidation, sharding, replication, and measurable failure behavior.",
    boardId: "social-feed-distributed-cache",
    boardName: "Social Feed — Distributed Cache",
    exampleFilename: "social-feed-distributed-cache.system-canvas.json",
    moduleFilename: "social-feed-distributed-cache-template.ts",
    svgPath: resolve(repositoryDirectory, "social-feed-distributed-cache", "architecture.svg"),
    pngPath: resolve(repositoryDirectory, "social-feed-distributed-cache", "system-canvas.png"),
    camera: { x: 18, y: 18, zoom: 0.48 },
    lockElements: false,
  }),
  writeTemplateArtifacts({
    diagram: distributedCache,
    templateId: "distributed-cache",
    templateName: "Distributed Cache · financial quorum path",
    templateDescription: "Trace a 500k-user balanced read/write workload through load balancing, cache coordination, consistent-hash placement, cache quorums, synchronous financial-key write-through, Cassandra quorums, and monitoring.",
    boardId: "distributed-cache-learning-map",
    boardName: "Distributed Cache · Balanced R/W Quorum Path",
    exampleFilename: "distributed-cache.system-canvas.json",
    moduleFilename: "distributed-cache-template.ts",
    svgPath: resolve(repositoryDirectory, "distributed-cache", "architecture.svg"),
    pngPath: resolve(repositoryDirectory, "distributed-cache", "system-canvas.png"),
    camera: { x: 18, y: 18, zoom: 0.52 },
    lockElements: false,
  }),
  writeTemplateArtifacts({
    diagram: cdn,
    templateId: "cdn",
    templateName: "CDN · edge hit and miss paths",
    templateDescription: "Trace global routing to one of three PoPs, then compare an edge hit with the parent/origin miss path, fill, placement, observation, and failover.",
    boardId: "cdn-learning-map",
    boardName: "CDN · First Principles",
    exampleFilename: "cdn.system-canvas.json",
    moduleFilename: "cdn-template.ts",
    svgPath: resolve(repositoryDirectory, "cdn", "architecture.svg"),
    pngPath: resolve(repositoryDirectory, "cdn", "system-canvas.png"),
    camera: { x: 18, y: 18, zoom: 0.58 },
  }),
  writeTemplateArtifacts({
    diagram: systemCanvas,
    templateId: "system-canvas-app",
    templateName: "System Canvas · app architecture",
    templateDescription: "See exactly what Vite builds, what React and the repo-owned SVG editor run in the browser, what Node/Fastify serves, and where browser and filesystem JSON persist.",
    boardId: "system-canvas-app-architecture",
    boardName: "System Canvas · App Architecture",
    exampleFilename: "system-canvas-app.system-canvas.json",
    moduleFilename: "system-canvas-app-template.ts",
    svgPath: resolve(projectDirectory, "architecture.svg"),
    pngPath: resolve(projectDirectory, "system-canvas.png"),
    camera: { x: 18, y: 18, zoom: 0.62 },
  }),
]);
