import {
  STENCIL_CATEGORIES,
  type StencilCategory,
  type StencilDefinition,
} from "./types";

const ROUTING = "#7048e8";
const SERVICES = "#1971c2";
const DISTRIBUTED_DATA = "#0b7285";
const SYSTEMS = "#e67700";
const HARDWARE = "#c92a2a";

/**
 * The phase-one shelf deliberately uses generic mechanisms instead of vendor
 * logos. Its routing entries follow a request from the Internet down to the
 * partition that owns a key.
 */
export const STENCIL_CATALOG = [
  {
    id: "global-routing",
    category: "Routing",
    name: "Global Routing",
    role: "Directs users to regions",
    accent: ROUTING,
    glyph: "DNS",
    keywords: ["dns", "geo", "region", "internet", "traffic"],
  },
  {
    id: "edge-routing",
    category: "Routing",
    name: "Edge / CDN",
    role: "Serves from nearby edges",
    accent: ROUTING,
    glyph: "E",
    keywords: ["cdn", "edge", "pop", "cache", "geographic"],
  },
  {
    id: "load-balancer",
    category: "Routing",
    name: "Load Balancer",
    role: "Spreads traffic in a cluster",
    accent: ROUTING,
    glyph: "LB",
    keywords: ["cluster", "proxy", "traffic", "routing", "balancer"],
  },
  {
    id: "api-gateway",
    category: "Routing",
    name: "API Gateway",
    role: "Routes and governs service calls",
    accent: ROUTING,
    glyph: "GW",
    keywords: ["service", "route", "ingress", "auth", "rate limit"],
  },
  {
    id: "application-router",
    category: "Routing",
    name: "Application Router",
    role: "Maps paths to handlers",
    accent: ROUTING,
    glyph: "APP",
    keywords: ["framework", "endpoint", "handler", "express", "fastify"],
  },
  {
    id: "data-router",
    category: "Routing",
    name: "Data Router",
    role: "Maps keys to partitions",
    accent: ROUTING,
    glyph: "#",
    keywords: ["shard", "partition", "consistent hash", "key", "placement"],
  },

  {
    id: "client",
    category: "Services",
    name: "Client",
    role: "Starts a request",
    accent: SERVICES,
    glyph: "C",
    keywords: ["browser", "mobile", "consumer", "caller", "user"],
  },
  {
    id: "api-service",
    category: "Services",
    name: "API Service",
    role: "Handles synchronous requests",
    accent: SERVICES,
    glyph: "API",
    keywords: ["backend", "server", "http", "rpc", "microservice"],
  },
  {
    id: "worker",
    category: "Services",
    name: "Worker",
    role: "Runs background work",
    accent: SERVICES,
    glyph: "W",
    keywords: ["consumer", "job", "task", "async", "background"],
  },
  {
    id: "scheduler",
    category: "Services",
    name: "Scheduler",
    role: "Triggers work over time",
    accent: SERVICES,
    glyph: "T",
    keywords: ["cron", "timer", "job", "periodic", "trigger"],
  },
  {
    id: "service-registry",
    category: "Services",
    name: "Service Registry",
    role: "Finds available instances",
    accent: SERVICES,
    glyph: "R",
    keywords: ["discovery", "catalog", "health", "instance", "endpoint"],
  },

  {
    id: "key-value-store",
    category: "Distributed Data",
    name: "Key-Value Store",
    role: "Reads and writes by key",
    accent: DISTRIBUTED_DATA,
    glyph: "KV",
    keywords: ["database", "get", "put", "storage", "distributed"],
  },
  {
    id: "cache",
    category: "Distributed Data",
    name: "Cache",
    role: "Keeps hot data close",
    accent: DISTRIBUTED_DATA,
    glyph: "C",
    keywords: ["memory", "ttl", "eviction", "hot", "redis"],
  },
  {
    id: "message-queue",
    category: "Distributed Data",
    name: "Message Queue",
    role: "Buffers asynchronous work",
    accent: DISTRIBUTED_DATA,
    glyph: "Q",
    keywords: ["broker", "stream", "event", "async", "log"],
  },
  {
    id: "partition",
    category: "Distributed Data",
    name: "Partition / Shard",
    role: "Owns a slice of data",
    accent: DISTRIBUTED_DATA,
    glyph: "P",
    keywords: ["shard", "range", "hash", "split", "tablet"],
  },
  {
    id: "replica-group",
    category: "Distributed Data",
    name: "Replica Group",
    role: "Copies data for availability",
    accent: DISTRIBUTED_DATA,
    glyph: "R",
    keywords: ["replication", "quorum", "consensus", "follower", "copy"],
  },
  {
    id: "leader-replica",
    category: "Distributed Data",
    name: "Leader Replica",
    role: "Orders writes for a group",
    accent: DISTRIBUTED_DATA,
    glyph: "L",
    keywords: ["primary", "leader", "write", "consensus", "raft"],
  },

  {
    id: "process",
    category: "Systems",
    name: "Process",
    role: "Runs an isolated program",
    accent: SYSTEMS,
    glyph: "P",
    keywords: ["pid", "program", "address space", "isolation", "execution"],
  },
  {
    id: "thread",
    category: "Systems",
    name: "Thread",
    role: "Executes inside a process",
    accent: SYSTEMS,
    glyph: "T",
    keywords: ["concurrency", "stack", "scheduler", "execution", "task"],
  },
  {
    id: "operating-system",
    category: "Systems",
    name: "Operating System",
    role: "Manages machine resources",
    accent: SYSTEMS,
    glyph: "OS",
    keywords: ["kernel", "linux", "resource", "driver", "syscall"],
  },
  {
    id: "runtime",
    category: "Systems",
    name: "Runtime",
    role: "Executes application code",
    accent: SYSTEMS,
    glyph: "RT",
    keywords: ["vm", "language", "garbage collection", "interpreter", "compiler"],
  },
  {
    id: "network-socket",
    category: "Systems",
    name: "Network Socket",
    role: "Connects communicating processes",
    accent: SYSTEMS,
    glyph: "S",
    keywords: ["tcp", "udp", "port", "connection", "network"],
  },
  {
    id: "file-system",
    category: "Systems",
    name: "File System",
    role: "Organizes persistent files",
    accent: SYSTEMS,
    glyph: "FS",
    keywords: ["inode", "file", "directory", "mount", "storage"],
  },

  {
    id: "server",
    category: "Hardware",
    name: "Server",
    role: "Machine running workloads",
    accent: HARDWARE,
    glyph: "S",
    keywords: ["host", "machine", "node", "compute", "bare metal"],
  },
  {
    id: "cpu",
    category: "Hardware",
    name: "CPU",
    role: "Executes instructions",
    accent: HARDWARE,
    glyph: "CPU",
    keywords: ["processor", "core", "instruction", "compute", "clock"],
  },
  {
    id: "memory",
    category: "Hardware",
    name: "Memory",
    role: "Holds active data",
    accent: HARDWARE,
    glyph: "RAM",
    keywords: ["ram", "dimm", "volatile", "heap", "page"],
  },
  {
    id: "disk",
    category: "Hardware",
    name: "Disk",
    role: "Persists local data",
    accent: HARDWARE,
    glyph: "D",
    keywords: ["ssd", "hdd", "nvme", "storage", "block"],
  },
  {
    id: "network-interface",
    category: "Hardware",
    name: "Network Interface",
    role: "Moves packets on a link",
    accent: HARDWARE,
    glyph: "NIC",
    keywords: ["nic", "ethernet", "packet", "link", "adapter"],
  },
  {
    id: "rack",
    category: "Hardware",
    name: "Rack",
    role: "Groups physical machines",
    accent: HARDWARE,
    glyph: "R",
    keywords: ["cabinet", "data center", "server", "switch", "physical"],
  },
] as const satisfies readonly StencilDefinition[];

const catalogById = new Map<string, StencilDefinition>(
  STENCIL_CATALOG.map((stencil) => [stencil.id, stencil]),
);

const normalizeSearch = (value: string): string =>
  value.trim().toLocaleLowerCase().replaceAll(/\s+/g, " ");

export const getStencilById = (id: string): StencilDefinition | undefined =>
  catalogById.get(id);

/**
 * Matches every word in the query against stable educational metadata. An
 * empty query intentionally restores the full catalog.
 */
export const searchStencils = (query: string): readonly StencilDefinition[] => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) {
    return STENCIL_CATALOG;
  }

  const terms = normalizedQuery.split(" ");
  return STENCIL_CATALOG.filter((stencil) => {
    const searchable = normalizeSearch(
      [
        stencil.name,
        stencil.role,
        stencil.category,
        stencil.id,
        ...stencil.keywords,
      ].join(" "),
    );
    return terms.every((term) => searchable.includes(term));
  });
};

export const getStencilsByCategory = (
  category: StencilCategory,
): readonly StencilDefinition[] =>
  STENCIL_CATALOG.filter((stencil) => stencil.category === category);

/** Keeps consumers from accidentally inventing a category ordering. */
export const STENCIL_CATALOG_BY_CATEGORY = Object.fromEntries(
  STENCIL_CATEGORIES.map((category) => [
    category,
    getStencilsByCategory(category),
  ]),
) as Readonly<Record<StencilCategory, readonly StencilDefinition[]>>;
