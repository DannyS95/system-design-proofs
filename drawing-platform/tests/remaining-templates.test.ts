import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildApp } from "../server/app.js";
import { FileBoardStore } from "../server/board-store.js";
import { DEFAULT_TEMPLATES } from "../server/templates.js";
import { LAYOUT_STANDARD } from "../shared/layout-standard.js";
import { isSystemIconId } from "../src/editor/SystemIcon.js";
import {
  minimumTextHeight,
  minimumTextWidth,
} from "../src/editor/text-layout.js";
import type {
  BoardDocument,
  CanvasConnectorElement,
  CanvasElement,
  CanvasShapeElement,
  CanvasSystemElement,
  CanvasTextElement,
  TemplateDefinition,
} from "../shared/contracts.js";
import {
  parseBoardDocument,
  parseTemplateDefinition,
} from "../shared/validation.js";

function templateById(id: string): TemplateDefinition {
  const template = DEFAULT_TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error(`The default ${id} template is missing`);
  return template;
}

function elementById(template: TemplateDefinition, id: string): CanvasElement {
  const element = template.scene.elements.find((candidate) => candidate.id === id);
  if (!element) throw new Error(`Missing ${template.id} element ${id}`);
  return element;
}

function connectorById(template: TemplateDefinition, id: string): CanvasConnectorElement {
  const element = elementById(template, id);
  if (element.type !== "connector") throw new Error(`${id} is not a connector`);
  return element;
}

/** A local visual reference preserves the canonical service relationship. */
function canonicalBinding(template: TemplateDefinition, binding?: string): string | undefined {
  if (!binding) return undefined;
  return elementById(template, binding).referenceId ?? binding;
}

function systemById(template: TemplateDefinition, id: string): CanvasSystemElement {
  const element = elementById(template, id);
  if (element.type !== "system") throw new Error(`${id} is not a system node`);
  return element;
}

function shapeById(template: TemplateDefinition, id: string): CanvasShapeElement {
  const element = elementById(template, id);
  if (element.type !== "shape") throw new Error(`${id} is not a shape`);
  return element;
}

function textById(template: TemplateDefinition, id: string): CanvasTextElement {
  const element = elementById(template, id);
  if (element.type !== "text") throw new Error(`${id} is not text`);
  return element;
}

function expectNativeScene(
  template: TemplateDefinition,
  expectedLocked = true,
): void {
  const parsed = parseTemplateDefinition(template);
  const ids = parsed.scene.elements.map(({ id }) => id);
  const systems = parsed.scene.elements.filter(
    (element): element is CanvasSystemElement => element.type === "system",
  );
  const connectors = parsed.scene.elements.filter(
    (element): element is CanvasConnectorElement => element.type === "connector",
  );
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => id.length > 0)).toBe(true);
  expect(systems.length).toBeGreaterThanOrEqual(3);
  expect(connectors.length).toBeGreaterThanOrEqual(5);
  expect(parsed.scene.elements.length).toBeLessThanOrEqual(100);
  expect(systems.every(({ iconId }) => isSystemIconId(iconId))).toBe(true);
  expect(
    parsed.scene.elements
      .filter(
        (element): element is CanvasShapeElement =>
          element.type === "shape" && element.iconId !== undefined,
      )
      .every(({ iconId }) => isSystemIconId(iconId)),
  ).toBe(true);
  expect(
    parsed.scene.elements.every(({ locked }) => locked === expectedLocked),
  ).toBe(true);
  expect(parsed.scene.appState.background).toMatchObject({ pattern: "dots", spacing: 24 });
  expect(
    parsed.scene.elements
      .filter((element) => element.type !== "connector" && element.type !== "image")
      .filter((element) => element.height < minimumTextHeight(element))
      .map((element) => element.id),
  ).toEqual([]);
  expect(
    parsed.scene.elements
      .filter((element) => element.type !== "connector" && element.type !== "image")
      .filter((element) => element.width < minimumTextWidth(element))
      .map((element) => element.id),
  ).toEqual([]);
}

function expectNoDatabaseToClientConnector(template: TemplateDefinition): void {
  const databaseIds = new Set(
    template.scene.elements
      .filter(
        (element): element is CanvasSystemElement =>
          element.type === "system" && element.variant === "database",
      )
      .map(({ id }) => id),
  );
  const clientIds = new Set(
    template.scene.elements
      .filter(
        (element): element is CanvasSystemElement =>
          element.type === "system" && element.iconId === "client",
      )
      .map(({ id }) => id),
  );
  const invalid = template.scene.elements.filter(
    (element): element is CanvasConnectorElement =>
      element.type === "connector" &&
      databaseIds.has(element.startBinding ?? "") &&
      clientIds.has(element.endBinding ?? ""),
  );
  expect(invalid).toEqual([]);
}

/** Visible choices and inspectable background are intentionally separate. */
function systemDetails(template: TemplateDefinition, id: string): string {
  const element = systemById(template, id);
  return [element.title, element.subtitle, element.body, element.metadata?.explanation].filter(Boolean).join("\n");
}

function canvasText(template: TemplateDefinition): string {
  return template.scene.elements.map((element) => {
    if (element.type === "system") return systemDetails(template, element.id);
    if (element.type === "text") return element.text;
    if (element.type === "shape" || element.type === "connector") return element.label ?? "";
    return element.alt ?? "";
  }).join("\n");
}

const semanticColors = {
  request: "#496b8a",
  placement: "#775d83",
  cache: "#527760",
  database: "#a15f4b",
  observability: "#477d80",
};

describe("architecture choices in built-in templates", () => {
  it("keeps the social-feed mechanisms distinct with compact text headings", () => {
    const template = templateById("social-feed-distributed-cache");
    expectNativeScene(template, false);
    expect(["level-1", "level-2", "level-3"].map((id) => textById(template, id).text)).toEqual([
      expect.stringMatching(/FEED READ.*HIT.*RAM.*MISS.*FEED API/i),
      expect.stringMatching(/KEY PLACEMENT.*REPLICATION.*HASH.*SHARD.*REPLICA/i),
      expect.stringMatching(/WRITE POLICY.*DATABASE FIRST.*INVALIDATE.*REFILLS/i),
    ]);
    expect([
      "mechanism-sharding", "mechanism-replication", "mechanism-memory-policy", "mechanism-db-fallback",
    ].map((id) => textById(template, id).text)).toEqual([
      expect.stringMatching(/SHARDING.*SHARDS.*CACHE RAM/i),
      expect.stringMatching(/REPLICATION.*COPIES.*AVAILABLE/i),
      expect.stringMatching(/MEMORY.*FAILURE.*TTL.*HOT KEYS.*METRICS/i),
      expect.stringMatching(/MISS PATH.*DATABASE FALLBACK.*REFILL/i),
    ]);
    expect(["replica-b-primary", "replica-b-peer-1", "replica-b-peer-2"].map((id) => systemById(template, id).parentId))
      .toEqual(["replica-set-b", "replica-set-b", "replica-set-b"]);
    expect(shapeById(template, "replica-set-b").layoutRole).toBe("container");
  });

  it("preserves social-feed hit, miss, refill, invalidation and failure destinations", () => {
    const template = templateById("social-feed-distributed-cache");
    expect([
      "client-to-api", "api-to-cache-client", "cache-client-to-hash", "hash-to-shard", "shard-to-replica",
      "hit-to-api", "replica-miss-to-api", "api-reads-db", "db-result-to-api", "api-refills-cache", "miss-api-to-client",
    ].map((id) => {
      const { startBinding, endBinding } = connectorById(template, id);
      return [startBinding, endBinding];
    })).toEqual([
      ["user-client", "feed-api"], ["feed-api", "cache-client"], ["cache-client", "hash-key"],
      ["hash-key", "owning-shard"], ["owning-shard", "healthy-replica"], ["healthy-replica", "feed-api"],
      ["healthy-replica", "miss-api"], ["miss-api", "authoritative-db"], ["authoritative-db", "miss-api"],
      ["miss-api", "healthy-replica"], ["miss-api", "user-client"],
    ]);
    expect(connectorById(template, "hit-to-api").label).toMatch(/HIT.*RAM.*Feed API/i);
    expect(connectorById(template, "replica-miss-to-api").label).toMatch(/MISS.*Feed API/i);
    expect(connectorById(template, "api-refills-cache").label).toMatch(/refill.*TTL/i);
    expectNoDatabaseToClientConnector(template);

    expect(systemById(template, "cache-client")).toMatchObject({
      title: "Cache client + key routing", subtitle: expect.stringMatching(/inside the Feed API/i),
    });
    expect(systemById(template, "contract-workload").subtitle).toMatch(/500,000.*read-heavy/i);
    expect(systemDetails(template, "contract-target")).toMatch(/hit ratio.*91%.*fallback.*9%.*p99/is);
    expect(systemById(template, "contract-consistency").subtitle).toMatch(/brief staleness accepted/i);
    expect(systemById(template, "authoritative-db").body).toBe("Source of truth");
    expect(systemById(template, "database-first-write")).toMatchObject({
      subtitle: "cache-aside · database-first writes", body: "Update → invalidate · next read refills",
    });
    expect(systemById(template, "database-first-write").metadata?.explanation)
      .toMatch(/database is updated first.*old cache entry is invalidated.*next read fetches fresh data/is);
    expect([
      "write-request-to-database", "database-to-invalidation", "invalidation-to-next-miss", "next-miss-to-database-refill",
    ].map((id) => {
      const { startBinding, endBinding } = connectorById(template, id);
      return [startBinding, endBinding];
    })).toEqual([
      ["write-request-step", "write-database-step"], ["write-database-step", "invalidate-key-step"],
      ["invalidate-key-step", "next-read-miss-step"], ["next-read-miss-step", "database-refill-step"],
    ]);
    expect(systemById(template, "memory-policy")).toMatchObject({
      subtitle: "LFU eviction · TTL expiry", body: "MISS → database → refill",
    });
    expect(systemById(template, "node-failure")).toMatchObject({
      subtitle: "retry a healthy replica", body: "None healthy → database → refill",
    });
    expect(systemById(template, "cache-stampede")).toMatchObject({
      subtitle: "one database read per missing key", body: "Duplicate reads wait and share result",
    });
    expect(systemById(template, "hot-key").subtitle).toMatch(/extra replicas or application cache/i);
    expect(systemById(template, "observability").subtitle).toMatch(/hit ratio.*shard QPS.*p99/i);
    expect(["replica-b-primary", "replica-b-peer-1", "replica-b-peer-2"].map((id) => systemById(template, id).title))
      .toEqual(["Shard B · replica 1", "Shard B · replica 2", "Shard B · replica 3"]);
    expect(systemById(template, "replica-b-primary").subtitle).toBe("healthy · selected");
    expect(canvasText(template)).not.toMatch(/Feed client|Cache router|B copy|write-through|write-back/i);
  });

  it("keeps the financial-cache workload, invariant, request ownership and return path", () => {
    const template = templateById("distributed-cache");
    expectNativeScene(template, false);
    expect(template.name).toBe("Distributed Cache · financial quorum path");
    expect(template.scene.appState.camera.zoom).toBeGreaterThanOrEqual(LAYOUT_STANDARD.minInitialZoom);
    expect(template.scene.appState.camera.zoom).toBeLessThanOrEqual(LAYOUT_STANDARD.maxInitialZoom);
    expect(textById(template, "goal").text).toMatch(/500,000 users.*Balanced reads \/ writes.*strong consistency for financial keys/is);
    expect(textById(template, "invariant").text).toMatch(/No client sees a value older than the last acknowledged write/i);
    expect(["request-layer", "placement-layer", "cache-layer", "database-layer"].map((id) => textById(template, id).text)).toEqual([
      expect.stringMatching(/REQUEST ROUTING.*LOAD BALANCER.*APPLICATION/i),
      expect.stringMatching(/KEY PLACEMENT.*HASH.*CLOCKWISE SUCCESSOR.*SHARD/i),
      expect.stringMatching(/CACHE SERVERS.*THREE REPLICAS.*OVERLAPPING QUORUMS/i),
      expect.stringMatching(/PERSISTENCE.*AUTHORITATIVE CASSANDRA/i),
    ]);
    expect(textById(template, "observability-layer").text).toBe("OBSERVABILITY");
    expect(systemById(template, "clients")).toMatchObject({ title: "Clients", subtitle: "Read and write requests" });
    expect(systemById(template, "load-balancer")).toMatchObject({
      subtitle: "Application request routing", body: expect.stringContaining("Spread reads and writes across app instances"),
    });
    expect(systemById(template, "cache-client-coordinator")).toMatchObject({
      subtitle: "Library inside the application / API service",
      metadata: expect.objectContaining({ layer: "Application/API and cache coordination" }),
    });
    expect([
      "client-request", "load-balancer-route", "coordinator-to-ring", "key-position-to-vnode", "selected-vnode-to-shard-b",
      "hit-return", "coordinator-response", "client-response",
    ].map((id) => {
      const { startBinding, endBinding } = connectorById(template, id);
      return [startBinding, endBinding];
    })).toEqual([
      ["clients", "load-balancer"], ["load-balancer", "cache-client-coordinator"],
      ["cache-client-coordinator", "key-position-marker"], ["key-position-marker", "vnode-b-selected"],
      ["vnode-b-selected", "cache-shard-b-logical"], ["cache-shard-b-group", "cache-client-coordinator"],
      ["cache-client-coordinator", "load-balancer"], ["load-balancer", "clients"],
    ]);
    expect(canvasText(template)).not.toMatch(/Feed API|feed:user|cache-aside|read repair/i);
    expect(template.scene).not.toEqual(templateById("social-feed-distributed-cache").scene);
  });

  it("preserves ring geometry and explains the clockwise successor in a compact section", () => {
    const template = templateById("distributed-cache");
    const ring = shapeById(template, "hash-ring-visual");
    expect(ring).toMatchObject({ shape: "ellipse", width: 400, height: 400, layoutGroup: "hash-ring", layoutRole: "mechanism" });
    const tokenIds = ["vnode-a-1", "vnode-b-1", "vnode-b-selected", "vnode-c-1", "vnode-a-2", "vnode-c-2", "vnode-a-3", "vnode-b-2"];
    const tokens = tokenIds.map((id) => shapeById(template, id));
    expect(tokens.map(({ label }) => label)).toEqual(["vA1", "vB1", "vB2", "vC1", "vA2", "vC2", "vA3", "vB3"]);
    // A common translation is allowed; ring/token topology is the preserved artifact.
    expect(tokens.map(({ x, y }) => [x - ring.x, y - ring.y])).toEqual([
      [168, -32], [309, 27], [368, 168], [309, 309], [168, 368], [27, 309], [-32, 168], [27, 27],
    ]);
    expect(tokens.every(({ iconId, layoutGroup }) => iconId === "virtual-node" && layoutGroup === "hash-ring")).toBe(true);
    const marker = shapeById(template, "key-position-marker");
    expect(marker).toMatchObject({ shape: "diamond", layoutGroup: "hash-ring" });
    expect(marker.y).toBeGreaterThan(shapeById(template, "vnode-b-1").y);
    expect(marker.y).toBeLessThan(shapeById(template, "vnode-b-selected").y);
    expect(connectorById(template, "coordinator-to-ring").label).toBe("HASH(KEY)");
    expect(connectorById(template, "key-position-to-vnode").label).toBeUndefined();
    expect(textById(template, "hash-key-label").text).toBe("HASH(KEY)\nPOSITION");
    expect(textById(template, "selected-token-note").text).toBe("vB2 · VIRTUAL TOKEN");
    const rule = systemById(template, "logic-placement");
    expect([rule.title, rule.subtitle, rule.body]).toEqual([
      "hash(key) → ring position", "Consistent-hash placement", expect.stringMatching(/move clockwise.*First token: vB2 → Cache Shard B/s),
    ]);
    expect([rule.title, rule.subtitle, rule.body].join("\n")).not.toMatch(/(?:^|\n)\d+[.)]/);
    expect(rule.metadata).toMatchObject({
      layer: "Key placement", outputs: "logical Cache Shard B",
      explanation: expect.stringMatching(/interval after its predecessor and up to vB2/i),
    });
  });

  it("shows physical replicas, selected quorums, write acknowledgement and failure policy", () => {
    const template = templateById("distributed-cache");
    expect(systemById(template, "cache-shard-b-logical")).toMatchObject({
      title: "Cache Shard B", iconId: "partition", subtitle: "Logical key range · selected",
      body: expect.stringContaining("vB2 interval → B1 / B2 / B3"), parentId: "cache-shard-b-group",
    });
    expect(textById(template, "shard-b-replication").text).toMatch(/REPLICA SELECTION.*THREE PHYSICAL SERVERS/is);
    expect(["cache-server-b1", "cache-server-b2", "cache-server-b3"].map((id) => systemById(template, id))).toEqual([
      expect.objectContaining({ title: "B1", subtitle: "Physical cache server", iconId: "server", parentId: "cache-shard-b-group" }),
      expect.objectContaining({ title: "B2", subtitle: "Physical cache server", iconId: "server", parentId: "cache-shard-b-group" }),
      expect.objectContaining({ title: "B3", subtitle: "Physical cache server", iconId: "server", parentId: "cache-shard-b-group" }),
    ]);
    expect(["cache-shard-a", "cache-shard-c"].map((id) => shapeById(template, id).iconId)).toEqual(["partition", "partition"]);
    expect(["shard-b-to-server-b1", "shard-b-to-server-b2", "shard-b-to-server-b3"].map((id) => connectorById(template, id).endBinding))
      .toEqual(["cache-server-b1", "cache-server-b2", "cache-server-b3"]);
    expect(systemById(template, "logic-cache")).toMatchObject({
      title: "Cache quorum", subtitle: "N=3 · R=2 · W=2", body: expect.stringContaining("R + W > N · tolerates one failed server"),
    });
    expect(systemById(template, "logic-cache").metadata?.explanation)
      .toMatch(/R=2.*read two versioned values.*newest.*W=2.*two cache write acknowledgements.*FEWER THAN TWO.*do not serve/is);
    expect(systemById(template, "write-commit-rule")).toMatchObject({
      title: "Acknowledged write", subtitle: "Synchronous write-through", body: expect.stringMatching(/Cache W=2 \+ Cassandra CL=QUORUM.*Acknowledge only after both quorums/s),
    });
    expect(systemById(template, "write-commit-rule").metadata?.explanation)
      .toMatch(/both required quorums succeed.*same version.*do not acknowledge.*invalidate or bypass/is);
    expect(systemById(template, "memory-policy")).toMatchObject({ subtitle: "LFU eviction · TTL expiry", body: expect.stringContaining("Miss → Cassandra → refill") });
    expect(systemById(template, "database-shards")).toMatchObject({
      title: "Cassandra", subtitle: "Authoritative source of truth", body: expect.stringMatching(/RF=3: three durable copies.*CL=QUORUM: two of three.*user_id/s),
    });
    expect(systemById(template, "database-shards").metadata?.explanation)
      .toMatch(/RF=3.*3 durable copies.*CL=QUORUM.*2 of 3 database replicas.*PARTITION KEY.*user_id.*database partition/is);
    expect(systemById(template, "financial-hot-key")).toMatchObject({
      title: "Hot-key options", subtitle: "Application load protection",
      body: expect.stringMatching(/Coalesce.*healthy replicas.*R=2.*W=2.*no stale single-copy fallback/is),
    });
    expect(systemById(template, "financial-hot-key").metadata?.explanation)
      .toMatch(/not a change to the selected topology.*reevaluating N, R and W/is);

    expect(connectorById(template, "hit-return").label).toBe("HIT · NEWEST VERSION");
    expect(connectorById(template, "cache-miss-to-database")).toMatchObject({
      startBinding: "cache-shard-b-group", endBinding: "database-shards", label: "MISS / QUORUM FAILURE · READ CASSANDRA",
    });
    expect(connectorById(template, "database-fill-to-cache")).toMatchObject({
      startBinding: "database-shards", endBinding: "cache-shard-b-group", label: "FILL CACHE · SAME VERSION",
    });
    expect(connectorById(template, "write-through-to-database")).toMatchObject({
      startBinding: "cache-client-coordinator", endBinding: "database-shards", label: "WRITE-THROUGH · CL=QUORUM", locked: false,
    });
    expect(connectorById(template, "cache-write-quorum")).toMatchObject({
      startBinding: "cache-client-coordinator", endBinding: "cache-shard-b-group", label: "WRITE CACHE · WAIT FOR W=2",
    });
    expectNoDatabaseToClientConnector(template);
    expect(systemDetails(template, "monitoring-service")).toMatch(/hit ratio.*shard QPS.*p50\/p99.*quorum failures.*replica lag/is);
    expect(["cache-signals", "database-signals"].map((id) => connectorById(template, id).style.strokeStyle)).toEqual(["dotted", "dotted"]);
    expect(["client-request", "coordinator-to-ring", "hit-return", "write-through-to-database", "cache-signals"]
      .map((id) => connectorById(template, id).style.stroke)).toEqual(Object.values(semanticColors));
    expect(shapeById(template, "vnode-b-selected").style.stroke).toBe(semanticColors.cache);
  });

  it("keeps the coordinator write route clear of the database area before entry", () => {
    const template = templateById("distributed-cache");
    const area = shapeById(template, "database-workload-area");
    const route = connectorById(template, "write-through-to-database");
    const points = route.points.map(([x, y]) => [route.x + x, route.y + y]);
    const clearance = LAYOUT_STANDARD.spacing.subsection;
    // Only the final segment enters the area to reach its database endpoint.
    for (let index = 1; index < points.length - 1; index += 1) {
      const [a, b] = [points[index - 1], points[index]];
      if (a[0] === b[0] && Math.max(a[1], b[1]) >= area.y && Math.min(a[1], b[1]) <= area.y + area.height) {
        expect(Math.min(Math.abs(a[0] - area.x), Math.abs(a[0] - area.x - area.width)))
          .toBeGreaterThanOrEqual(clearance - 0.001);
      }
      if (a[1] === b[1] && Math.max(a[0], b[0]) >= area.x && Math.min(a[0], b[0]) <= area.x + area.width) {
        expect(Math.min(Math.abs(a[1] - area.y), Math.abs(a[1] - area.y - area.height)))
          .toBeGreaterThanOrEqual(clearance - 0.001);
      }
    }
    expect(route.endBinding).toBe("database-shards");
  });

  it("keeps configuration cards concise while retaining readable typography and role details", () => {
    for (const id of ["distributed-cache", "social-feed-distributed-cache", "cdn", "system-canvas-app"]) {
      for (const element of templateById(id).scene.elements) {
        if (element.type === "system") {
          if (element.metadata?.objectType === "workload estimate") {
            expect(element.parentId).toBeDefined();
            expect(shapeById(templateById(id), element.parentId!).layoutRole).toBe("container");
            expect(element.referenceId).toBeDefined();
            expect(systemById(templateById(id), element.referenceId!).parentId).toBe(element.parentId);
          } else if (id === "distributed-cache") {
            for (const block of (element.body ?? "").split("\n\n")) {
              const [heading, ...details] = block.split("\n");
              expect(heading).toBeTruthy();
              expect(details.length).toBeGreaterThan(0);
              expect(details.every(line => line.startsWith("  "))).toBe(true);
            }
            expect(element.align).toBe("left");
          } else {
            expect((element.body ?? "").split("\n"), `${id}:${element.id} consequence lines`).toHaveLength(1);
          }
          expect(element.body ?? "").not.toMatch(/(?:^|\n)\d+[.)]/);
          expect(element.titleFontSize ?? LAYOUT_STANDARD.titleFontSize).toBeGreaterThanOrEqual(LAYOUT_STANDARD.titleFontSize);
          expect(element.bodyFontSize ?? LAYOUT_STANDARD.bodyFontSize).toBeGreaterThanOrEqual(LAYOUT_STANDARD.bodyFontSize);
        }
        if (element.type === "connector" && element.label) {
          expect(element.fontSize ?? LAYOUT_STANDARD.labelFontSize).toBeGreaterThanOrEqual(LAYOUT_STANDARD.labelFontSize);
        }
      }
    }
  });

  it("preserves CDN PoP ownership, hit, upstream miss, fill, placement and failover", () => {
    const template = templateById("cdn");
    expectNativeScene(template);
    for (const pop of ["lisbon", "frankfurt", "virginia"]) {
      expect(shapeById(template, `pop-${pop}-hull`)).toMatchObject({ layoutRole: "container", parentId: "cdn-data-plane" });
      expect(systemById(template, `pop-${pop}-edge`).parentId).toBe(`pop-${pop}-hull`);
      expect(systemById(template, `pop-${pop}-cache`).parentId).toBe(`pop-${pop}-hull`);
    }
    expect(textById(template, "pop-lisbon-hull-label").text).toMatch(/SELECTED/);
    expect(["pop-frankfurt-hull-label", "pop-virginia-hull-label"].every((id) => textById(template, id).text.includes("ALTERNATE"))).toBe(true);
    expect(systemById(template, "viewer").subtitle).toMatch(/requests one object/i);
    expect(textById(template, "pop-definition").text).toMatch(/PoP.*location group.*edge machines/i);
    expect(connectorById(template, "routing-to-selected-pop")).toMatchObject({ startBinding: "global-routing", endBinding: "pop-lisbon-edge", label: expect.stringMatching(/choose PoP/i) });
    expect(connectorById(template, "routing-to-frankfurt")).toMatchObject({ endBinding: "pop-frankfurt-edge", label: expect.stringMatching(/unhealthy.*reroute/i) });
    expect(connectorById(template, "routing-to-virginia")).toMatchObject({ endBinding: "pop-virginia-edge", label: expect.stringMatching(/region unavailable.*another PoP/i) });
    expect(connectorById(template, "edge-response").label).toMatch(/HIT.*return from edge now/i);
    expect(connectorById(template, "filled-response")).toMatchObject({ endBinding: "viewer", label: expect.stringMatching(/after MISS.*filled edge.*return/i) });
    expect(connectorById(template, "miss-to-parent")).toMatchObject({ startBinding: "pop-lisbon-cache", endBinding: "parent-proxy" });
    expect(textById(template, "miss-parent-note").text).toMatch(/MISS.*parent cache/i);
    expect(connectorById(template, "parent-to-origin")).toMatchObject({ startBinding: "parent-proxy", endBinding: "origin", label: expect.stringMatching(/parent MISS.*source/i) });
    expect(connectorById(template, "origin-to-parent").label).toMatch(/return object/i);
    expect(connectorById(template, "parent-to-edge-fill")).toMatchObject({ endBinding: "pop-lisbon-cache", label: expect.stringMatching(/store copy at edge/i) });
    expect(systemById(template, "parent-proxy").subtitle).toMatch(/optional intermediate copy/i);
    expect(connectorById(template, "direct-miss-to-origin")).toMatchObject({ startBinding: "pop-lisbon-cache", endBinding: "origin", label: expect.stringMatching(/no parent.*origin/i) });
    expect(connectorById(template, "direct-origin-fill")).toMatchObject({ startBinding: "origin", endBinding: "pop-lisbon-cache", label: expect.stringMatching(/direct return.*fill edge/i) });
    expect(systemById(template, "origin").subtitle).toMatch(/authoritative content/i);
    expect(systemById(template, "routing-inputs").subtitle).toMatch(/delay.*queue.*memory.*link.*cached/i);
    expect(systemById(template, "content-placement")).toMatchObject({ title: "Control + placement system", subtitle: expect.stringMatching(/PULL.*miss.*PUSH.*demand/i) });
    expect(systemById(template, "cdn-telemetry").subtitle).toMatch(/hit ratio.*queues.*origin traffic.*fetch failures/i);
    expect(textById(template, "cdn-control-plane-label").text).toMatch(/CONTROL.*PLACEMENT.*OBSERVATION/i);
    for (const pop of ["lisbon", "frankfurt", "virginia"]) {
      const placement = connectorById(template, `placement-${pop}`);
      const telemetry = connectorById(template, `telemetry-${pop}`);
      expect(canonicalBinding(template, placement.startBinding)).toBe("content-placement");
      expect(placement.endBinding).toBe(`pop-${pop}-cache`);
      expect(telemetry.startBinding).toBe(`pop-${pop}-cache`);
      expect(canonicalBinding(template, telemetry.endBinding)).toBe("cdn-telemetry");
      expect(telemetry.style.strokeStyle).toBe("dotted");
      expect(shapeById(template, placement.startBinding!)).toMatchObject({
        label: "↗ Placement", parentId: `pop-${pop}-hull`, referenceId: "content-placement",
        metadata: expect.objectContaining({ objectType: "reference" }),
      });
      expect(shapeById(template, telemetry.endBinding!)).toMatchObject({
        label: "↗ Monitoring", parentId: `pop-${pop}-hull`, referenceId: "cdn-telemetry",
        metadata: expect.objectContaining({ objectType: "reference" }),
      });
    }
    expect(canvasText(template)).not.toMatch(/coalesc|If-None-Match|stale-if-error|304/i);
  });

  it("identifies the app technologies and how saved properties become editable graphics", () => {
    const template = templateById("system-canvas-app");
    expectNativeScene(template);
    const visibleDetails = (id: string): string => {
      const element = systemById(template, id);
      return [element.title, element.subtitle, element.body].filter(Boolean).join("\n");
    };
    expect(textById(template, "title").text).toBe("System Canvas · website architecture");
    expect(textById(template, "legend").text).toMatch(/This website.*Saved properties.*React.*SVG elements.*browser graphics/is);
    expect(visibleDetails("browser")).toMatch(/browser.*website.*JavaScript.*HTML.*CSS.*built.*Vite/is);
    expect(visibleDetails("react-workspace")).toMatch(/React.*interface.*editor.*saved designs/is);
    expect(visibleDetails("custom-editor")).toMatch(/React.*creates and updates SVG elements.*Object properties.*position.*size.*color.*text/is);
    expect(visibleDetails("board-scene")).toMatch(/Design data.*JavaScript object properties.*browser memory.*drawing and edits.*discarded.*tab closes/is);
    expect(visibleDetails("native-svg")).toMatch(/Browser SVG renderer.*draws SVG.*editable canvas/is);
    expect(visibleDetails("local-storage")).toMatch(/localStorage.*properties.*JSON.*device.*Survives tab closure.*board deletion.*clearing site data.*removes/is);
    expect(visibleDetails("fastify-api")).toMatch(/Web server.*Fastify.*Node\.js.*website.*board data/is);
    expect(visibleDetails("board-store")).toMatch(/File storage.*node:fs.*reads.*writes.*JSON files.*object properties.*server/is);
    expect(visibleDetails("file-snapshots")).toMatch(/JSON files.*server disk.*file per board.*same objects.*editable properties/is);
    expect(visibleDetails("browser-files")).toMatch(/JSON designs.*SVG.*PNG pictures.*editable design/is);
    expect(visibleDetails("placed-canvas-object")).toMatch(/editable object.*properties.*icon.*saved properties.*appearance/is);
    expect(systemById(template, "lucide-ui-icons")).toMatchObject({
      title: "Lucide · UI icon library", subtitle: "Ready-made SVG icons",
      body: "Button and toolbar icons: delete, undo, zoom",
    });

    const visibleText = template.scene.elements.map(element => {
      if (element.type === "system") return visibleDetails(element.id);
      if (element.type === "text") return element.text;
      if (element.type === "shape" || element.type === "connector") return element.label ?? "";
      return element.alt ?? "";
    }).join("\n");
    expect(visibleText).not.toMatch(/expectedRevision|\b409\b|screenToWorld|XMLSerializer|card-7|\b(?:GET|POST|PUT|DELETE|PATCH)\b/);
    expect(template.scene.elements.filter(element => element.id.startsWith("example-"))).toEqual([]);
    for (const technology of [/\bVite\b/g, /\bFastify\b/g, /\bNode\.js\b/g]) {
      expect(visibleText.match(technology)).toHaveLength(1);
    }
    for (const id of ["vite-note", "editor-definition", "local-storage-note", "save-request-note", "save-response-note", "server-definition", "tooling-zone", "tooling-zone-label", "server-zone", "server-zone-label"]) {
      expect(template.scene.elements.some(element => element.id === id)).toBe(false);
    }
  });

  it("keeps application source provenance inspectable behind concise technology cards", () => {
    const template = templateById("system-canvas-app");
    expect(systemById(template, "browser").metadata).toMatchObject({
      packageName: expect.stringMatching(/vite/i), sourcePath: expect.stringMatching(/vite\.config/i),
      explanation: expect.stringMatching(/source files.*Vite build.*Vite development server.*static build/is),
    });
    expect(systemById(template, "custom-editor")).toMatchObject({
      iconId: "whiteboard",
      metadata: expect.objectContaining({ sourcePath: expect.stringMatching(/EditorCanvas\.tsx.*CanvasElementView\.tsx/i), objectType: expect.stringMatching(/React component.*TypeScript model/i) }),
    });
    expect(systemById(template, "native-svg")).toMatchObject({
      iconId: "canvas", metadata: expect.objectContaining({ packageName: expect.stringMatching(/browser-native SVG/i) }),
    });
    expect(systemById(template, "browser").metadata?.runtimeLocation).toMatch(/browser/i);
    expect(systemById(template, "canvas-controls").metadata).toMatchObject({ sourcePath: expect.stringMatching(/EditorCanvas\.tsx/i), outputs: expect.stringMatching(/BoardScene.*appState/i) });
    expect(systemById(template, "browser-files").metadata).toMatchObject({
      sourcePath: expect.stringMatching(/EditorCanvas\.tsx.*downloads\.ts.*validation\.ts/i), objectType: expect.stringMatching(/browser file operations/i),
    });
    expect(systemById(template, "component-palette").metadata?.sourcePath).toMatch(/StencilShelf\.tsx.*App\.tsx/i);
    expect(systemById(template, "placed-browser-element").metadata).toMatchObject({
      sourcePath: expect.stringMatching(/createStencilElements\.ts.*App\.tsx/i), objectType: "CanvasSystemElement",
    });
    expect(systemById(template, "local-storage").metadata).toMatchObject({ packageName: "browser Web Storage API", runtimeLocation: "User's browser profile" });
    expect(systemById(template, "file-snapshots").metadata?.explanation).toMatch(/not a database/i);
    expect(systemById(template, "system-icon-registry").metadata).toMatchObject({
      sourcePath: expect.stringMatching(/SystemIcon\.tsx.*CanvasElementView\.tsx.*render-scene\.tsx/i), packageName: expect.stringMatching(/project-owned SVG/i),
    });
    expect(systemById(template, "lucide-ui-icons").metadata?.explanation).toMatch(/interface controls.*does not define the system stencil artwork/i);
  });

  it("preserves rendering, persistence and visual vocabulary connections in the app architecture", () => {
    const template = templateById("system-canvas-app");
    expect([
      "workspace-to-editor", "editor-scene-loop", "editor-svg-loop", "catalog-to-palette",
      "palette-to-placed-element", "placed-element-to-scene", "files-to-scene", "scene-to-files", "local-storage-to-my-library",
      "scene-to-local-storage", "scene-to-save-queue", "queue-to-api", "fastify-to-browser-app",
      "templates-to-store", "store-to-files", "concept-to-icon", "icon-to-stencil", "stencil-to-element",
    ].map((id) => {
      const { startBinding, endBinding } = connectorById(template, id);
      return [canonicalBinding(template, startBinding), canonicalBinding(template, endBinding)];
    })).toEqual([
      ["react-workspace", "custom-editor"], ["board-scene", "custom-editor"],
      ["custom-editor", "native-svg"], ["stencil-catalog", "component-palette"], ["component-palette", "placed-browser-element"],
      ["placed-browser-element", "board-scene"], ["browser-files", "board-scene"], ["board-scene", "browser-files"],
      ["local-storage", "my-library"], ["board-scene", "local-storage"], ["board-scene", "save-queue"], ["save-queue", "fastify-api"],
      ["fastify-api", "react-workspace"], ["template-modules", "board-store"],
      ["board-store", "file-snapshots"], ["visual-concept", "system-icon-registry"],
      ["system-icon-registry", "stencil-definition"], ["stencil-definition", "placed-canvas-object"],
    ]);
    expect(["api-to-store"].map(id => {
      const { startBinding, endBinding } = connectorById(template, id);
      return [canonicalBinding(template, startBinding), canonicalBinding(template, endBinding)];
    })).toEqual([["fastify-api", "board-store"]]);
    expect(connectorById(template, "scene-to-local-storage").label).toMatch(/Edit: save.*Open: read/i);
    expect(connectorById(template, "scene-to-local-storage").startArrow).toBe("arrow");
    expect(connectorById(template, "store-to-files")).toMatchObject({ label: "save and reopen JSON", startArrow: "arrow" });
    expect(connectorById(template, "queue-to-api").startArrow).toBe("arrow");
    expect(["editor-scene-loop", "editor-svg-loop", "local-storage-to-my-library"].map((id) => connectorById(template, id).startArrow)).toEqual(["arrow", "arrow", "arrow"]);
  });

  it.each([
    ["cdn", "cdn-learning-map", "cdn.system-canvas.json"],
    ["social-feed-distributed-cache", "social-feed-distributed-cache", "social-feed-distributed-cache.system-canvas.json"],
    ["distributed-cache", "distributed-cache-learning-map", "distributed-cache.system-canvas.json"],
    ["system-canvas-app", "system-canvas-app-architecture", "system-canvas-app.system-canvas.json"],
  ])("keeps the checked-in %s v2 board aligned with its API template", async (templateId, boardId, filename) => {
    const contents = await readFile(new URL(`../examples/${filename}`, import.meta.url), "utf8");
    const document = parseBoardDocument(JSON.parse(contents) as unknown);
    expect(document).toMatchObject({ schemaVersion: 2, id: boardId, revision: 0, scene: templateById(templateId).scene });
  });

  it("lists all five teaching templates and creates independent revision-zero boards", async () => {
    const directory = await mkdtemp(join(tmpdir(), "system-canvas-templates-"));
    let sequence = 0;
    const store = new FileBoardStore({ dataDirectory: directory, idFactory: () => `design-copy-${++sequence}` });
    const app = await buildApp({ store });

    try {
      const listResponse = await app.inject({ method: "GET", url: "/api/templates" });
      expect(listResponse.statusCode).toBe(200);
      const ids = listResponse.json<{ templates: Array<{ id: string }> }>().templates.map(({ id }) => id);
      expect(ids).toEqual(expect.arrayContaining(["kv-store", "cdn", "social-feed-distributed-cache", "distributed-cache", "system-canvas-app"]));

      for (const templateId of ["cdn", "social-feed-distributed-cache", "distributed-cache", "system-canvas-app"]) {
        const response = await app.inject({ method: "POST", url: "/api/boards", payload: { name: `${templateId} copy`, templateId } });
        expect(response.statusCode).toBe(201);
        expect(response.json<BoardDocument>()).toMatchObject({ revision: 0, scene: templateById(templateId).scene });
      }
    } finally {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
