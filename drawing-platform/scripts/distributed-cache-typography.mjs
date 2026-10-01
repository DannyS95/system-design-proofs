/** Monitoring's text hierarchy, applied before measuring and routing this board. */
const sections = (...groups) => groups.map(([heading, ...lines]) =>
  [heading, ...lines.map(line => `  ${line}`)].join("\n")).join("\n\n");

const cards = {
  clients: {
    subtitle: "Read and write requests",
    body: sections(
      ["CLIENT TRAFFIC", "Average: 1,000 requests/s", "Peak: 4,000 · surge: 8,000 requests/s"],
      ["REQUEST MIX", "50% reads · 50% writes", "10% of reads miss the cache"]),
    capacity: "",
  },
  "load-balancer": {
    subtitle: "Application request routing",
    body: sections(
      ["ROUTE REQUESTS", "Spread reads and writes across app instances"],
      ["CPU + NETWORK · 1 host", "Chosen budget: 50,000 requests/s"]),
    capacity: "Peak: 4,000 / 50,000 = 8% used · 92% free",
  },
  "cache-client-coordinator": {
    subtitle: "Library inside the application / API service",
    body: sections(
      ["COORDINATE", "Place key · select replicas · await quorums"],
      ["CPU + QUORUM WORK · 1 app host", "Chosen budget: 10,000 requests/s"]),
    capacity: "Peak: 4,000 / 10,000 = 40% used · 60% free",
  },
  "logic-placement": {
    subtitle: "Consistent-hash placement",
    body: sections(
      ["FIND THE OWNER", "Start at hash(key) · move clockwise", "First token: vB2 → Cache Shard B"]),
  },
  "cache-shard-b-logical": {
    subtitle: "Logical key range · selected",
    body: sections(["REPLICA CANDIDATES", "vB2 interval → B1 / B2 / B3"]),
  },
  "logic-cache": {
    subtitle: "N=3 · R=2 · W=2",
    body: sections(
      ["OVERLAPPING QUORUMS", "3 copies · read 2 · await 2 write replies", "R + W > N · tolerates one failed server"],
      ["WORK PER REQUEST", "Read: 2 operations · write / refill: 3"],
      ["COMBINED CHOSEN BUDGET", "3 × 50,000 = 150,000 node operations/s", "Read-only limit: 75,000 client requests/s"]),
    capacity: "Peak: 10,600 / 150,000 ≈ 7% used · 93% free",
  },
  "write-commit-rule": {
    subtitle: "Synchronous write-through",
    body: sections(
      ["BOTH MUST SUCCEED", "Cache W=2 + Cassandra CL=QUORUM"],
      ["CLIENT SUCCESS", "Acknowledge only after both quorums"]),
  },
  "memory-policy": {
    subtitle: "LFU eviction · TTL expiry",
    body: sections(
      ["REMOVE ENTRIES", "LFU: least frequently used", "TTL: expired entries"],
      ["NEXT READ", "Miss → Cassandra → refill"]),
  },
  "financial-hot-key": {
    subtitle: "Application load protection",
    body: sections(
      ["REDUCE REPEATED WORK", "Coalesce misses for the same key", "Spread reads across healthy replicas"],
      ["KEEP CONSISTENCY", "R=2 / W=2 · no stale single-copy fallback"]),
  },
  "database-shards": {
    subtitle: "Authoritative source of truth",
    body: sections(
      ["REPLICATION + QUORUM", "RF=3: three durable copies", "CL=QUORUM: two of three must respond"],
      ["PARTITION KEY", "user_id chooses the database partition"]),
  },
  "monitoring-service": {
    subtitle: "Cache and database signals",
    body: sections(
      ["TRAFFIC + LATENCY", "Hit ratio · requests/s per shard", "p50 / p99: median / 99th-percentile latency"],
      ["HEALTH", "Quorum failures · replica lag"]),
  },
  "database-workload": {
    body: "3 hosts × 5,000 = 15,000 operations/s\nPeak work: 6,000 + 400 = 6,400 operations/s",
    capacity: "Peak: 6,400 / 15,000 ops/s ≈ 43% used · 57% free\n2× traffic: ≈ 85% used · below spare-capacity target",
  },
  "monitoring-workload": {
    body: "2 messages per request → 8,000 messages/s\n1 collector · chosen budget: 50,000 messages/s",
    capacity: "Peak: 8,000 / 50,000 = 16% used · 84% free",
  },
};
for (const id of ["cache-server-b1", "cache-server-b2", "cache-server-b3"]) {
  cards[id] = {
    subtitle: "Physical cache server",
    body: sections(
      ["STORED DATA", "Shard B · temporary RAM copy"],
      ["RAM + NETWORK", "Chosen budget: 50,000 operations/s"]),
    capacity: "Peak: ≈3,500 / 50,000 operations/s\n≈7% used · 93% free",
  };
}

/** Content and type scale only; the shared layout owns bounds and positioning. */
export function styleDistributedCacheText(elements) {
  for (const element of elements) {
    if (element.type === "system") {
      Object.assign(element, cards[element.id], { titleFontSize: 18, bodyFontSize: 14, align: "left" });
    } else if (element.type === "connector") {
      element.fontSize = 14;
      element.align = "center";
    } else if (element.type === "shape" && element.label) {
      element.fontSize = 14;
      element.align = "center";
      if (element.id === "cache-shard-a" || element.id === "cache-shard-c") {
        element.label = `Cache Shard ${element.id.endsWith("a") ? "A" : "C"}\nLogical key range`;
      }
    } else if (element.type === "text") {
      element.fontSize = element.id === "title" ? 34 : element.id.endsWith("-layer") ? 18 : 14;
      element.align = element.layoutGroup === "hash-ring" ? element.align : "left";
      if (element.id === "goal") {
        element.text = sections(
          ["WORKLOAD · 500,000 users", "Balanced reads / writes · strong consistency for financial keys"],
          ["CHOSEN BUDGETS · unmeasured", "Target: keep ≥50% free · surge (flash) = 2× peak"]);
        element.fontWeight = 400;
      } else if (element.id === "invariant") {
        element.text = sections(["CONSISTENCY RULE", "No client sees a value older than the last acknowledged write"]);
        element.fontWeight = 400;
      } else if (element.id === "shard-b-replication") {
        element.text = "REPLICA SELECTION\n  Three physical servers";
      }
    }
  }
}
