import {
  STENCIL_CATEGORIES,
  type StencilCategory,
  type StencilDefinition,
} from "./types";
import { CANVAS_PALETTE } from "../../shared/layout-standard";

const ROUTING = CANVAS_PALETTE.blue;
const SERVICES = CANVAS_PALETTE.blue;
const DISTRIBUTED_DATA = CANVAS_PALETTE.green;
const SYSTEMS = CANVAS_PALETTE.amber;
const HARDWARE = CANVAS_PALETTE.coral;

/**
 * The phase-one shelf deliberately uses generic mechanisms instead of vendor
 * logos. Its routing entries follow a request from the Internet down to the
 * partition that owns a key.
 */
export const STENCIL_CATALOG = [
  {
    id: "internet",
    category: "Routing",
    name: "Internet",
    role: "Carries requests from users",
    accent: ROUTING,
    iconId: "internet",
    keywords: ["public", "network", "wan", "entry", "traffic"],
  },
  {
    id: "global-routing",
    category: "Routing",
    name: "Global Routing",
    role: "Directs users to regions",
    accent: ROUTING,
    iconId: "global-routing",
    keywords: ["dns", "geo", "region", "internet", "traffic"],
  },
  {
    id: "edge-routing",
    category: "Routing",
    name: "Edge / CDN",
    role: "Serves from nearby edges",
    accent: ROUTING,
    iconId: "edge-pop",
    keywords: ["cdn", "edge", "pop", "cache", "geographic"],
  },
  {
    id: "load-balancer",
    category: "Routing",
    name: "Load Balancer",
    role: "Spreads traffic in a cluster",
    accent: ROUTING,
    iconId: "load-balancer",
    keywords: ["cluster", "proxy", "traffic", "routing", "balancer"],
  },
  {
    id: "api-gateway",
    category: "Routing",
    name: "API Gateway",
    role: "Routes and governs service calls",
    accent: ROUTING,
    iconId: "service-routing",
    keywords: ["service", "route", "ingress", "auth", "rate limit"],
  },
  {
    id: "application-router",
    category: "Routing",
    name: "Application Router",
    role: "Maps paths to handlers",
    accent: ROUTING,
    iconId: "application-router",
    keywords: ["framework", "endpoint", "handler", "express", "fastify"],
  },
  {
    id: "data-router",
    category: "Routing",
    name: "Data Router",
    role: "Maps keys to partitions",
    accent: CANVAS_PALETTE.purple,
    iconId: "data-router",
    keywords: ["shard", "partition", "consistent hash", "key", "placement"],
  },

  {
    id: "client",
    category: "Services",
    name: "Client",
    role: "Starts a request",
    accent: SERVICES,
    iconId: "client",
    keywords: ["browser", "mobile", "consumer", "caller", "user"],
  },
  {
    id: "workspace",
    category: "Services",
    name: "Application Workspace",
    role: "Frames tools around a canvas",
    accent: SERVICES,
    iconId: "workspace",
    keywords: ["react", "shell", "sidebar", "canvas", "interface", "ui"],
  },
  {
    id: "api-service",
    category: "Services",
    name: "API Service",
    role: "Handles synchronous requests",
    accent: SERVICES,
    iconId: "application-server",
    keywords: ["backend", "server", "http", "rpc", "microservice"],
  },
  {
    id: "worker",
    category: "Services",
    name: "Worker",
    role: "Runs background work",
    accent: SERVICES,
    iconId: "worker",
    keywords: ["consumer", "job", "task", "async", "background"],
  },
  {
    id: "scheduler",
    category: "Services",
    name: "Scheduler",
    role: "Triggers work over time",
    accent: SERVICES,
    iconId: "scheduler",
    keywords: ["cron", "timer", "job", "periodic", "trigger"],
  },
  {
    id: "service-registry",
    category: "Services",
    name: "Service Registry",
    role: "Finds available instances",
    accent: SERVICES,
    iconId: "service-registry",
    keywords: ["discovery", "catalog", "health", "instance", "endpoint"],
  },
  {
    id: "request-coalescer",
    category: "Services",
    name: "Request Coalescer",
    role: "Merges duplicate work",
    accent: SERVICES,
    iconId: "request-coalescer",
    keywords: ["singleflight", "collapse", "deduplicate", "stampede", "merge"],
  },
  {
    id: "policy-gate",
    category: "Services",
    name: "Policy Gate",
    role: "Allows or rejects a path",
    accent: SERVICES,
    iconId: "policy-gate",
    keywords: ["admission", "quota", "rate limit", "authorization", "guard"],
  },
  {
    id: "telemetry",
    category: "Services",
    name: "Observability",
    role: "Measures every request path",
    accent: CANVAS_PALETTE.cyan,
    iconId: "telemetry",
    keywords: ["telemetry", "observation", "metrics", "logs", "traces", "monitoring"],
  },

  {
    id: "key-value-store",
    category: "Distributed Data",
    name: "Key-Value Store",
    role: "Reads and writes by key",
    accent: DISTRIBUTED_DATA,
    iconId: "key-value-store",
    keywords: ["database", "get", "put", "storage", "distributed"],
  },
  {
    id: "cache",
    category: "Distributed Data",
    name: "Cache",
    role: "Keeps hot data close",
    accent: DISTRIBUTED_DATA,
    iconId: "cache",
    keywords: ["memory", "ttl", "eviction", "hot", "redis"],
  },
  {
    id: "database",
    category: "Distributed Data",
    name: "Database",
    role: "Stores authoritative records",
    accent: DISTRIBUTED_DATA,
    iconId: "database",
    keywords: ["sql", "durable", "authority", "records", "storage"],
  },
  {
    id: "distributed-database",
    category: "Distributed Data",
    name: "Distributed Database",
    role: "Stores data across nodes",
    accent: DISTRIBUTED_DATA,
    iconId: "distributed-database",
    keywords: ["cluster", "sql", "replicated", "durable", "spanner"],
  },
  {
    id: "message-queue",
    category: "Distributed Data",
    name: "Message Queue",
    role: "Buffers asynchronous work",
    accent: DISTRIBUTED_DATA,
    iconId: "message-queue",
    keywords: ["broker", "stream", "event", "async", "log"],
  },
  {
    id: "partition",
    category: "Distributed Data",
    name: "Partition / Shard",
    role: "Owns a slice of data",
    accent: CANVAS_PALETTE.purple,
    iconId: "partition",
    keywords: ["shard", "range", "hash", "split", "tablet"],
  },
  {
    id: "replica-group",
    category: "Distributed Data",
    name: "Replica Group",
    role: "Copies data for availability",
    accent: DISTRIBUTED_DATA,
    iconId: "replica-group",
    keywords: ["replication", "quorum", "consensus", "follower", "copy"],
  },
  {
    id: "leader-replica",
    category: "Distributed Data",
    name: "Leader Replica",
    role: "Orders writes for a group",
    accent: DISTRIBUTED_DATA,
    iconId: "leader",
    keywords: ["primary", "leader", "write", "consensus", "raft"],
  },

  {
    id: "process",
    category: "Systems",
    name: "Process",
    role: "Runs an isolated program",
    accent: SYSTEMS,
    iconId: "process",
    keywords: ["pid", "program", "address space", "isolation", "execution"],
  },
  {
    id: "thread",
    category: "Systems",
    name: "Thread",
    role: "Executes inside a process",
    accent: SYSTEMS,
    iconId: "thread",
    keywords: ["concurrency", "stack", "scheduler", "execution", "task"],
  },
  {
    id: "operating-system",
    category: "Systems",
    name: "Operating System",
    role: "Manages machine resources",
    accent: SYSTEMS,
    iconId: "operating-system",
    keywords: ["kernel", "linux", "resource", "driver", "syscall"],
  },
  {
    id: "runtime",
    category: "Systems",
    name: "Runtime",
    role: "Executes application code",
    accent: SYSTEMS,
    iconId: "runtime",
    keywords: ["vm", "language", "garbage collection", "interpreter", "compiler"],
  },
  {
    id: "network-socket",
    category: "Systems",
    name: "Network Socket",
    role: "Connects communicating processes",
    accent: SYSTEMS,
    iconId: "network-socket",
    keywords: ["tcp", "udp", "port", "connection", "network"],
  },
  {
    id: "file-system",
    category: "Systems",
    name: "File System",
    role: "Organizes persistent files",
    accent: SYSTEMS,
    iconId: "file-system",
    keywords: ["inode", "file", "directory", "mount", "storage"],
  },

  {
    id: "server",
    category: "Hardware",
    name: "Server",
    role: "Machine running workloads",
    accent: HARDWARE,
    iconId: "server",
    keywords: ["host", "machine", "node", "compute", "bare metal"],
  },
  {
    id: "cpu",
    category: "Hardware",
    name: "CPU",
    role: "Executes instructions",
    accent: HARDWARE,
    iconId: "cpu",
    keywords: ["processor", "core", "instruction", "compute", "clock"],
  },
  {
    id: "memory",
    category: "Hardware",
    name: "Memory",
    role: "Holds active data",
    accent: HARDWARE,
    iconId: "memory",
    keywords: ["ram", "dimm", "volatile", "heap", "page"],
  },
  {
    id: "disk",
    category: "Hardware",
    name: "Disk",
    role: "Persists local data",
    accent: HARDWARE,
    iconId: "disk",
    keywords: ["ssd", "hdd", "nvme", "storage", "block"],
  },
  {
    id: "network-interface",
    category: "Hardware",
    name: "Network Interface",
    role: "Moves packets on a link",
    accent: HARDWARE,
    iconId: "network-interface",
    keywords: ["nic", "ethernet", "packet", "link", "adapter"],
  },
  {
    id: "rack",
    category: "Hardware",
    name: "Rack",
    role: "Groups physical machines",
    accent: HARDWARE,
    iconId: "rack",
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
