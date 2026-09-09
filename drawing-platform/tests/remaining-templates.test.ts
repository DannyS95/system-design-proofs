import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildApp } from "../server/app.js";
import { FileBoardStore } from "../server/board-store.js";
import { DEFAULT_TEMPLATES } from "../server/templates.js";
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

function expectOrthogonalConnectorsAvoidUnrelatedCards(
  template: TemplateDefinition,
): void {
  const cards = template.scene.elements.filter(
    (element): element is CanvasSystemElement | CanvasShapeElement =>
      element.type === "system" ||
      (element.type === "shape" && Boolean(element.label)),
  );
  const diagonalSegments: string[] = [];
  const cardCrossings: string[] = [];

  for (const connector of template.scene.elements.filter(
    (element): element is CanvasConnectorElement => element.type === "connector",
  )) {
    const points = connector.points.map(([x, y]) => ({
      x: connector.x + x,
      y: connector.y + y,
    }));

    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      if (
        start.x !== end.x &&
        start.y !== end.y &&
        connector.id !== "key-position-to-vnode"
      ) {
        diagonalSegments.push(`${connector.id}:${index - 1}-${index}`);
        continue;
      }

      for (const card of cards) {
        if (
          card.id === connector.startBinding ||
          card.id === connector.endBinding
        ) {
          continue;
        }
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        const crossesInterior =
          start.x === end.x
            ? start.x > card.x &&
              start.x < card.x + card.width &&
              maxY > card.y &&
              minY < card.y + card.height
            : start.y > card.y &&
              start.y < card.y + card.height &&
              maxX > card.x &&
              minX < card.x + card.width;
        if (crossesInterior) {
          cardCrossings.push(`${connector.id}->${card.id}`);
        }
      }
    }
  }

  expect(diagonalSegments).toEqual([]);
  expect(cardCrossings).toEqual([]);
}

describe("topology teaching templates", () => {
  it("keeps the social-feed cache distinct and stacks each mechanism with breathing room", () => {
    const template = templateById("social-feed-distributed-cache");
    expectNativeScene(template, false);
    expectOrthogonalConnectorsAvoidUnrelatedCards(template);

    const levels = ["level-1", "level-2", "level-3"].map((id) => shapeById(template, id));
    expect(levels.map(({ label }) => label)).toEqual([
      expect.stringMatching(/FEED READ.*HIT.*RAM.*MISS.*FEED API/i),
      expect.stringMatching(/KEY PLACEMENT.*REPLICATION.*HASH.*SHARD.*REPLICA/i),
      expect.stringMatching(/WRITE POLICY.*DATABASE FIRST.*INVALIDATE.*REFILLS/i),
    ]);

    const mechanisms = [
      "mechanism-sharding",
      "mechanism-replication",
      "mechanism-memory-policy",
      "mechanism-db-fallback",
    ].map((id) => shapeById(template, id));
    expect(mechanisms.map(({ label }) => label)).toEqual([
      expect.stringMatching(/SHARDING.*SHARDS.*CACHE RAM/i),
      expect.stringMatching(/REPLICATION.*COPIES.*AVAILABLE/i),
      expect.stringMatching(/MEMORY.*FAILURE.*PROOF.*TTL.*HOT KEYS.*METRICS/i),
      expect.stringMatching(/MISS PATH.*DATABASE FALLBACK.*REFILL/i),
    ]);
    expect(shapeById(template, "level-1").y + shapeById(template, "level-1").height + 100)
      .toBeLessThanOrEqual(systemById(template, "user-client").y);
    expect(shapeById(template, "level-2").y + shapeById(template, "level-2").height + 80)
      .toBeLessThanOrEqual(shapeById(template, "mechanism-sharding").y);
    expect(shapeById(template, "level-3").y + shapeById(template, "level-3").height + 150)
      .toBeLessThanOrEqual(shapeById(template, "write-request-step").y);
    const requestLane = [
      "user-client",
      "feed-api",
      "cache-client",
      "hash-key",
      "owning-shard",
      "healthy-replica",
    ].map((id) => systemById(template, id));
    expect(requestLane.slice(1).every(
      (element, index) => element.x - (requestLane[index].x + requestLane[index].width) >= 240,
    )).toBe(true);
  });

  it("makes social-feed hit, miss, refill, write, placement, and failure paths explicit", () => {
    const template = templateById("social-feed-distributed-cache");
    expect(connectorById(template, "client-to-api")).toMatchObject({ startBinding: "user-client", endBinding: "feed-api" });
    expect(connectorById(template, "api-to-cache-client")).toMatchObject({ startBinding: "feed-api", endBinding: "cache-client" });
    expect(connectorById(template, "cache-client-to-hash")).toMatchObject({ startBinding: "cache-client", endBinding: "hash-key" });
    expect(connectorById(template, "hash-to-shard")).toMatchObject({ startBinding: "hash-key", endBinding: "owning-shard" });
    expect(connectorById(template, "shard-to-replica")).toMatchObject({ startBinding: "owning-shard", endBinding: "healthy-replica" });
    expect(connectorById(template, "hit-to-api")).toMatchObject({ startBinding: "healthy-replica", endBinding: "feed-api", label: expect.stringMatching(/HIT.*RAM.*Feed API/i) });
    expect(connectorById(template, "replica-miss-to-api")).toMatchObject({ startBinding: "healthy-replica", endBinding: "miss-api", label: expect.stringMatching(/MISS.*Feed API/i) });
    expect(connectorById(template, "api-reads-db")).toMatchObject({ startBinding: "miss-api", endBinding: "authoritative-db" });
    expect(connectorById(template, "db-result-to-api")).toMatchObject({ startBinding: "authoritative-db", endBinding: "miss-api" });
    expect(connectorById(template, "api-refills-cache")).toMatchObject({ startBinding: "miss-api", endBinding: "healthy-replica", label: expect.stringMatching(/refill.*TTL/i) });
    expect(connectorById(template, "miss-api-to-client")).toMatchObject({ startBinding: "miss-api", endBinding: "user-client" });
    expectNoDatabaseToClientConnector(template);

    expect(systemById(template, "cache-client")).toMatchObject({ title: "Cache client + key routing", subtitle: expect.stringMatching(/inside the Feed API/i) });
    expect(systemById(template, "contract-workload").subtitle).toMatch(/500,000.*reads greatly outnumber writes/i);
    expect(systemById(template, "contract-target").subtitle).toMatch(/hit ratio.*91%.*fallback.*9%.*p99/i);
    expect(systemById(template, "contract-target").body).toBe("Most feed requests should terminate in RAM rather than reaching the database.");
    expect(systemById(template, "database-first-write")).toMatchObject({
      subtitle: "cache-aside reads + database-first writes",
      body: "The database is updated first. The old cache entry is invalidated. The next read fetches fresh data and repopulates the cache.",
    });
    expect([
      connectorById(template, "write-request-to-database"),
      connectorById(template, "database-to-invalidation"),
      connectorById(template, "invalidation-to-next-miss"),
      connectorById(template, "next-miss-to-database-refill"),
    ].map(({ startBinding, endBinding }) => [startBinding, endBinding])).toEqual([
      ["write-request-step", "write-database-step"],
      ["write-database-step", "invalidate-key-step"],
      ["invalidate-key-step", "next-read-miss-step"],
      ["next-read-miss-step", "database-refill-step"],
    ]);
    expect([
      shapeById(template, "write-request-step").label,
      shapeById(template, "write-database-step").label,
      shapeById(template, "invalidate-key-step").label,
      shapeById(template, "next-read-miss-step").label,
      shapeById(template, "database-refill-step").label,
    ].join(" ")).toMatch(/WRITE REQUEST.*UPDATE DATABASE.*INVALIDATE.*NEXT READ MISSES.*DATABASE.*REFILL/i);
    expect(systemById(template, "memory-policy")).toMatchObject({
      subtitle: expect.stringMatching(/entry absent.*next read misses/i),
      body: expect.stringMatching(/MISS.*database fallback.*cache refill/i),
    });
    expect(systemById(template, "node-failure").body).toMatch(/No healthy replica.*MISS.*database.*refill/i);
    expect(systemById(template, "cache-stampede").body).toMatch(/one database read.*duplicate requests wait/i);
    expect(systemById(template, "observability").subtitle).toMatch(/hit ratio.*shard QPS.*p99/i);
    expect(["replica-b-primary", "replica-b-peer-1", "replica-b-peer-2"].map((id) => systemById(template, id).title)).toEqual(["Shard B", "Shard B", "Shard B"]);
    expect(["replica-b-primary", "replica-b-peer-1", "replica-b-peer-2"].map((id) => systemById(template, id).subtitle)).toEqual([
      expect.stringMatching(/replica 1.*healthy.*selected/i),
      expect.stringMatching(/replica 2.*healthy/i),
      expect.stringMatching(/replica 3.*healthy/i),
    ]);
    const allText = JSON.stringify(template.scene);
    expect(allText).not.toMatch(/Feed client|Cache router|B copy|write-through|write-back/i);
  });

  it("keeps the financial cache separate and traces only its distributed-cache request journey", () => {
    const template = templateById("distributed-cache");
    expectNativeScene(template, false);
    expectOrthogonalConnectorsAvoidUnrelatedCards(template);
    expect(template.name).toBe("Distributed Cache · financial quorum path");
    expect(template.scene.appState.camera.zoom).toBeGreaterThanOrEqual(0.45);
    expect(template.scene.appState.camera.zoom).toBeLessThanOrEqual(0.65);

    expect(textById(template, "goal").text).toBe(
      "GOAL · 500K USERS · BALANCED R/W · FINANCIAL KEYS REQUIRE STRONG CONSISTENCY",
    );
    expect(textById(template, "invariant").text).toBe(
      "INVARIANT · NO CLIENT OBSERVES A VALUE OLDER THAN THE LAST ACKNOWLEDGED WRITE",
    );
    expect([
      shapeById(template, "request-layer").label,
      shapeById(template, "placement-layer").label,
      shapeById(template, "cache-layer").label,
      shapeById(template, "database-layer").label,
    ]).toEqual([
      expect.stringMatching(/REQUEST ROUTING.*LOAD BALANCER.*CACHE CLIENT/i),
      expect.stringMatching(/KEY PLACEMENT.*HASH.*VIRTUAL NODE.*SHARD/i),
      expect.stringMatching(/CACHE SERVERS.*THREE PHYSICAL SERVERS.*QUORUMS OVERLAP/i),
      expect.stringMatching(/DATABASE.*AUTHORITATIVE CASSANDRA.*QUORUM WRITES/is),
    ]);
    expect(template.scene.elements.some(({ id }) => id === "layer-map" || id === "logic-rail")).toBe(false);
    expect(shapeById(template, "request-layer").y + shapeById(template, "request-layer").height + 120)
      .toBeLessThanOrEqual(systemById(template, "clients").y);
    expect(shapeById(template, "placement-layer").y + shapeById(template, "placement-layer").height + 170)
      .toBeLessThanOrEqual(shapeById(template, "key-position-marker").y);
    expect(shapeById(template, "cache-layer").y + shapeById(template, "cache-layer").height + 150)
      .toBeLessThanOrEqual(shapeById(template, "cache-shard-b-group").y);
    expect(systemById(template, "load-balancer").x - (
      systemById(template, "clients").x + systemById(template, "clients").width
    )).toBeGreaterThanOrEqual(300);
    expect(systemById(template, "cache-client-coordinator").x - (
      systemById(template, "load-balancer").x + systemById(template, "load-balancer").width
    )).toBeGreaterThanOrEqual(350);

    const systems = template.scene.elements.filter(
      (element): element is CanvasSystemElement => element.type === "system",
    );
    expect(systems.map(({ id }) => id)).toEqual([
      "clients",
      "load-balancer",
      "cache-client-coordinator",
      "logic-placement",
      "cache-shard-b-logical",
      "cache-server-b1",
      "cache-server-b2",
      "cache-server-b3",
      "logic-cache",
      "write-commit-rule",
      "memory-policy",
      "database-shards",
      "monitoring-service",
    ]);
    expect(systemById(template, "clients")).toMatchObject({
      title: "Clients",
      subtitle: "read or write request",
    });
    expect(systemById(template, "load-balancer").subtitle).toBe(
      "spreads requests across application instances",
    );
    expect(systemById(template, "cache-client-coordinator")).toMatchObject({
      subtitle: "library inside the application/API service",
      metadata: expect.objectContaining({
        layer: "Application/API and cache coordination",
      }),
    });

    expect([
      connectorById(template, "client-request"),
      connectorById(template, "load-balancer-route"),
      connectorById(template, "coordinator-to-ring"),
      connectorById(template, "key-position-to-vnode"),
      connectorById(template, "selected-vnode-to-shard-b"),
      connectorById(template, "hit-return"),
      connectorById(template, "coordinator-response"),
      connectorById(template, "client-response"),
    ].map(({ startBinding, endBinding }) => [startBinding, endBinding])).toEqual([
      ["clients", "load-balancer"],
      ["load-balancer", "cache-client-coordinator"],
      ["cache-client-coordinator", "key-position-marker"],
      ["key-position-marker", "vnode-b-selected"],
      ["vnode-b-selected", "cache-shard-b-logical"],
      ["cache-shard-b-group", "cache-client-coordinator"],
      ["cache-client-coordinator", "load-balancer"],
      ["load-balancer", "clients"],
    ]);

    const allText = JSON.stringify(template.scene);
    expect(allText).not.toMatch(
      /Feed API|feed:user|cache-aside|why a distributed cache|routing layers|data destinations|user changes data|read repair/i,
    );
    expect(template.scene).not.toEqual(
      templateById("social-feed-distributed-cache").scene,
    );
  });

  it("makes placement, physical replicas, policies, persistence, and monitoring explicit", () => {
    const template = templateById("distributed-cache");

    expect(shapeById(template, "hash-ring-visual").shape).toBe("ellipse");
    expect(shapeById(template, "key-position-marker").shape).toBe("diamond");
    expect(connectorById(template, "coordinator-to-ring").label).toMatch(/MARK ONE RING POSITION/i);
    expect(connectorById(template, "key-position-to-vnode").label).toMatch(/CLOCKWISE.*STOP AT vB2/i);
    expect(textById(template, "hash-key-label").text).toBe("HASH(KEY)\nPOSITION");
    const virtualNodes = [
      "vnode-a-1",
      "vnode-b-1",
      "vnode-b-selected",
      "vnode-c-1",
      "vnode-a-2",
      "vnode-c-2",
      "vnode-a-3",
      "vnode-b-2",
    ].map((id) => shapeById(template, id));
    expect(virtualNodes.map(({ label }) => label)).toEqual([
      "vA1", "vB1", "vB2", "vC1", "vA2", "vC2", "vA3", "vB3",
    ]);
    expect(virtualNodes.every(({ fontSize }) => fontSize === 20)).toBe(true);
    expect(virtualNodes.every(({ iconId }) => iconId === "virtual-node")).toBe(true);
    expect(shapeById(template, "vnode-b-selected").style.stroke).toBe("#15803d");
    const marker = shapeById(template, "key-position-marker");
    expect(marker.y).toBeGreaterThan(shapeById(template, "vnode-b-1").y);
    expect(marker.y).toBeLessThan(shapeById(template, "vnode-b-selected").y);
    expect(textById(template, "selected-token-note").text).toMatch(
      /vB2.*VIRTUAL TOKEN.*NOT PHYSICAL SERVER B2/is,
    );
    expect(systemById(template, "logic-placement").body).toMatch(
      /1\. hash\(key\) produces one position on the ring\..*2\. Starting at that position, move clockwise\..*3\. Stop at the first virtual-node token encountered\..*4\. In this example, that token is vB2\..*5\. The key range ending at vB2 maps to logical Cache Shard B\..*6\. Shard B’s replica-selection rule then chooses physical server B1, B2, or B3\..*vB2 owns the ring interval after its predecessor and up to vB2\./is,
    );

    expect(systemById(template, "cache-shard-b-logical")).toMatchObject({
      title: "Cache Shard B",
      iconId: "partition",
      subtitle: expect.stringMatching(/logical partition.*key range/i),
      body: "vB2 maps its owned key range to Cache Shard B.",
      parentId: "cache-shard-b-group",
    });
    expect(textById(template, "shard-b-replication").text).toMatch(
      /REPLICA SELECTION.*THREE PHYSICAL SERVERS HOLD THIS SHARD/is,
    );
    expect(["cache-server-b1", "cache-server-b2", "cache-server-b3"].map(
      (id) => systemById(template, id),
    )).toEqual([
      expect.objectContaining({ title: "B1", subtitle: "physical cache server", iconId: "server", parentId: "cache-shard-b-group" }),
      expect.objectContaining({ title: "B2", subtitle: "physical cache server", iconId: "server", parentId: "cache-shard-b-group" }),
      expect.objectContaining({ title: "B3", subtitle: "physical cache server", iconId: "server", parentId: "cache-shard-b-group" }),
    ]);
    expect(["cache-shard-a", "cache-shard-c"].map((id) =>
      shapeById(template, id).iconId
    )).toEqual(["partition", "partition"]);
    expect([
      "shard-b-to-server-b1",
      "shard-b-to-server-b2",
      "shard-b-to-server-b3",
    ].map((id) => connectorById(template, id).endBinding)).toEqual([
      "cache-server-b1",
      "cache-server-b2",
      "cache-server-b3",
    ]);

    expect(systemById(template, "logic-cache")).toMatchObject({
      subtitle: "N=3 · R=2 · W=2",
      body: expect.stringMatching(
        /N=3.*three physical servers per shard.*R=2.*read two versioned values.*newest.*W=2.*two cache write acknowledgements.*R\+W>N.*quorums intersect.*ONE SERVER DOWN.*two healthy replicas.*FEWER THAN TWO.*do not serve/is,
      ),
    });
    expect(systemById(template, "write-commit-rule")).toMatchObject({
      subtitle: "cache W=2 + Cassandra CL=QUORUM",
      body: expect.stringMatching(
        /acknowledged only after both required quorums succeed.*same version.*do not acknowledge.*invalidate or bypass the cache/is,
      ),
    });
    expect(systemById(template, "memory-policy")).toMatchObject({
      subtitle: "LFU eviction · TTL expiry",
      body: expect.stringMatching(/MISS path.*Cassandra.*refill/i),
    });
    expect(connectorById(template, "hit-return").label).toBe(
      "HIT · RETURN NEWEST CACHE VALUE",
    );

    expect(systemById(template, "database-shards")).toMatchObject({
      title: "Cassandra cluster",
      subtitle: "authoritative · RF=3 · CL=QUORUM · partition key=user_id",
      body: expect.stringMatching(
        /RF=3.*3 durable copies of each row.*CL=QUORUM.*2 of 3 database replicas must respond.*read or write.*PARTITION KEY.*user_id.*database partition/is,
      ),
    });
    expect(connectorById(template, "cache-miss-to-database")).toMatchObject({
      startBinding: "cache-shard-b-group",
      endBinding: "database-shards",
    });
    expect(connectorById(template, "database-fill-to-cache")).toMatchObject({
      startBinding: "database-shards",
      endBinding: "cache-shard-b-group",
    });
    expect(connectorById(template, "write-through-to-database")).toMatchObject({
      startBinding: "cache-client-coordinator",
      endBinding: "database-shards",
    });
    expect(connectorById(template, "cache-miss-to-database").label).toMatch(
      /MISS OR CACHE-QUORUM FAILURE.*APPLICATION READS CASSANDRA/i,
    );
    expect(connectorById(template, "database-fill-to-cache").label).toMatch(
      /DATABASE RESULT.*FILL CACHE WITH SAME VERSION/i,
    );
    expect(connectorById(template, "write-through-to-database")).toMatchObject({
      label: "SAME VERSION · WAIT FOR CASSANDRA CL=QUORUM",
      fontSize: 20,
      locked: false,
    });
    expect(connectorById(template, "cache-write-quorum")).toMatchObject({
      startBinding: "cache-client-coordinator",
      endBinding: "cache-shard-b-group",
      label: "WRITE CACHE · WAIT FOR W=2",
    });
    const writeRoute = connectorById(template, "write-through-to-database");
    expect(connectorById(template, "cache-miss-to-database").x).toBe(1000);
    expect(connectorById(template, "database-fill-to-cache").x).toBe(1950);
    expect(writeRoute.points.some(([x]) => writeRoute.x + x === 3200)).toBe(true);

    expect(systemById(template, "monitoring-service").body).toMatch(
      /hit ratio.*shard QPS.*p50\/p99.*quorum failures.*replica lag/is,
    );
    expect(["cache-signals", "database-signals"].map(
      (id) => connectorById(template, id).style.strokeStyle,
    )).toEqual(["dotted", "dotted"]);

    const systems = template.scene.elements.filter(
      (element): element is CanvasSystemElement => element.type === "system",
    );
    const labeledConnectors = template.scene.elements.filter(
      (element): element is CanvasConnectorElement =>
        element.type === "connector" && Boolean(element.label),
    );
    const labeledShapes = template.scene.elements.filter(
      (element): element is CanvasShapeElement =>
        element.type === "shape" && Boolean(element.label),
    );
    const textElements = template.scene.elements.filter(
      (element): element is CanvasTextElement => element.type === "text",
    );
    expect(systems.every(
      (element) =>
        (element.titleFontSize ?? 0) >= 22 &&
        (element.bodyFontSize ?? 0) >= 21,
    )).toBe(true);
    expect(labeledConnectors.every(
      (element) =>
        element.id === "key-position-to-vnode" || (element.fontSize ?? 0) >= 20,
    )).toBe(true);
    expect(labeledShapes.every(
      (element) => (element.fontSize ?? 0) >= 20,
    )).toBe(true);
    expect(textElements.every(({ id, fontSize }) =>
      id === "selected-token-note" || fontSize >= 20
    )).toBe(true);
  });
  it("makes CDN routing, PoP meaning, hit, miss, fill, placement, and failover explicit", () => {
    const template = templateById("cdn");
    expectNativeScene(template);
    expectOrthogonalConnectorsAvoidUnrelatedCards(template);

    const hulls = ["pop-lisbon-hull", "pop-frankfurt-hull", "pop-virginia-hull"].map((id) => shapeById(template, id));
    expect(hulls).toHaveLength(3);
    expect(textById(template, "pop-lisbon-hull-label").text).toMatch(/SELECTED/);
    expect(["pop-frankfurt-hull-label", "pop-virginia-hull-label"].every((id) => textById(template, id).text.includes("ALTERNATE"))).toBe(true);
    expect(systemById(template, "viewer").subtitle).toMatch(/requests one object/i);
    expect(textById(template, "pop-definition").text).toMatch(/PoP.*facility.*edge proxy.*machine/i);
    expect(connectorById(template, "routing-to-selected-pop")).toMatchObject({ startBinding: "global-routing", endBinding: "pop-lisbon-edge", label: expect.stringMatching(/choose PoP/i) });
    expect(connectorById(template, "routing-to-frankfurt")).toMatchObject({ endBinding: "pop-frankfurt-edge", label: expect.stringMatching(/unhealthy.*reroute/i) });
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
    const dataPlane = shapeById(template, "cdn-data-plane");
    const controlPlane = shapeById(template, "cdn-control-plane");
    const controlRouteXs = [1885, 1905, 1920];
    expect(controlRouteXs.every(
      (x) => x >= dataPlane.x + dataPlane.width + 24 && x < controlPlane.x,
    )).toBe(true);
    expect(["placement-lisbon", "placement-frankfurt", "placement-virginia"].every((id) => connectorById(template, id).startBinding === "content-placement")).toBe(true);
    expect(["telemetry-lisbon", "telemetry-frankfurt", "telemetry-virginia"].every((id) => connectorById(template, id).style.strokeStyle === "dotted")).toBe(true);
    const diagramTerms = JSON.stringify(template.scene);
    expect(diagramTerms).not.toMatch(/coalesc|If-None-Match|stale-if-error|304/i);
  });

  it("explains exactly what builds, runs in the browser, serves HTTP, and persists data", () => {
    const template = templateById("system-canvas-app");
    expectNativeScene(template);
    expectOrthogonalConnectorsAvoidUnrelatedCards(template);
    expect(systemById(template, "vite")).toMatchObject({ title: "Vite build / dev tool", subtitle: expect.stringMatching(/transforms TSX.*bundles browser files/i), metadata: expect.objectContaining({ packageName: expect.stringMatching(/vite 6\.4\.3/i), sourcePath: expect.stringMatching(/vite\.config/i) }) });
    expect(systemById(template, "vite-dev-server")).toMatchObject({ title: "Vite development server", subtitle: "development only" });
    expect(connectorById(template, "vite-to-browser-app")).toMatchObject({ startBinding: "vite-dev-server", endBinding: "react-workspace" });
    expect(textById(template, "vite-note").text).toMatch(/tooling.*not the SVG editor.*server.*database/is);
    expect(systemById(template, "react-workspace").subtitle).toMatch(/React.*TypeScript/i);
    expect(systemById(template, "browser")).toMatchObject({ title: "Browser tab / client", subtitle: expect.stringMatching(/runs the frontend/i), metadata: expect.objectContaining({ runtimeLocation: expect.stringMatching(/browser/i) }) });
    expect(systemById(template, "custom-editor")).toMatchObject({ iconId: "whiteboard", subtitle: expect.stringMatching(/repo-owned React.*TypeScript/i), body: expect.stringMatching(/not a separate library.*server.*database/i), metadata: expect.objectContaining({ sourcePath: expect.stringMatching(/EditorCanvas\.tsx.*CanvasElementView\.tsx/i), objectType: expect.stringMatching(/React component.*TypeScript model/i) }) });
    expect(textById(template, "editor-definition").text).toMatch(/browser code.*not.*server.*database/i);
    expect(systemById(template, "native-svg")).toMatchObject({ iconId: "canvas", subtitle: expect.stringMatching(/svg.*rect.*text.*polyline/i), body: expect.stringMatching(/pointer.*wheel.*keyboard.*resize.*return to editor/i), metadata: expect.objectContaining({ packageName: expect.stringMatching(/browser-native SVG/i) }) });
    expect(connectorById(template, "workspace-to-editor")).toMatchObject({ startBinding: "react-workspace", endBinding: "custom-editor" });
    expect(connectorById(template, "editor-scene-loop")).toMatchObject({ startBinding: "board-scene", endBinding: "custom-editor", startArrow: "arrow", label: expect.stringMatching(/scene in.*edited scene out/i) });
    expect(connectorById(template, "editor-svg-loop")).toMatchObject({ startBinding: "custom-editor", endBinding: "native-svg", startArrow: "arrow" });
    expect(systemById(template, "canvas-controls")).toMatchObject({ subtitle: expect.stringMatching(/labels.*tools.*lock.*background/i), body: expect.stringMatching(/resize handles.*inspector.*elements.*appState/i), metadata: expect.objectContaining({ sourcePath: expect.stringMatching(/EditorCanvas\.tsx/i), outputs: expect.stringMatching(/BoardScene.*appState/i) }) });
    expect(systemById(template, "browser-files")).toMatchObject({ body: expect.stringMatching(/image files.*imports board JSON.*exports JSON\/SVG\/PNG/i), metadata: expect.objectContaining({ sourcePath: expect.stringMatching(/EditorCanvas\.tsx.*downloads\.ts.*validation\.ts/i), objectType: expect.stringMatching(/browser file operations/i) }) });
    expect(systemById(template, "stencil-catalog").subtitle).toMatch(/bundled TypeScript definitions/i);
    expect(systemById(template, "component-palette")).toMatchObject({ title: expect.stringMatching(/Component palette.*StencilShelf/i), metadata: expect.objectContaining({ sourcePath: expect.stringMatching(/StencilShelf\.tsx.*App\.tsx/i), outputs: expect.stringMatching(/onInsertStencil/i) }) });
    expect(systemById(template, "placed-browser-element")).toMatchObject({ title: "Placed CanvasSystemElement", metadata: expect.objectContaining({ sourcePath: expect.stringMatching(/createStencilElements\.ts.*App\.tsx/i), objectType: "CanvasSystemElement" }) });
    expect(connectorById(template, "catalog-to-palette")).toMatchObject({ startBinding: "stencil-catalog", endBinding: "component-palette" });
    expect(connectorById(template, "palette-to-placed-element")).toMatchObject({ startBinding: "component-palette", endBinding: "placed-browser-element" });
    expect(connectorById(template, "placed-element-to-scene")).toMatchObject({ startBinding: "placed-browser-element", endBinding: "board-scene" });
    expect(connectorById(template, "files-to-scene")).toMatchObject({ startBinding: "browser-files", endBinding: "board-scene", label: expect.stringMatching(/import.*embed/i) });
    expect(connectorById(template, "scene-to-files")).toMatchObject({ startBinding: "board-scene", endBinding: "browser-files", label: expect.stringMatching(/export/i) });
    expect(systemById(template, "my-library").body).toMatch(/localStorage/i);
    expect(connectorById(template, "local-storage-to-my-library")).toMatchObject({ startBinding: "local-storage", endBinding: "my-library", startArrow: "arrow" });
    expect(systemById(template, "local-storage").subtitle).toMatch(/board.*My library JSON/i);
    expect(connectorById(template, "scene-to-local-storage")).toMatchObject({ endBinding: "local-storage", label: expect.stringMatching(/JSON\.stringify.*edit/i) });
    expect(connectorById(template, "scene-to-save-queue").endBinding).toBe("save-queue");
    expect(connectorById(template, "queue-to-api")).toMatchObject({ endBinding: "fastify-api" });
    expect(textById(template, "save-request-note").text).toMatch(/board JSON.*expected revision/i);
    expect(systemById(template, "fastify-api").subtitle).toMatch(/Node\.js.*Fastify.*TypeScript/i);
    expect(textById(template, "server-definition").text).toMatch(/application server.*serves Vite's dist/i);
    expect(connectorById(template, "static-build-to-server")).toMatchObject({ startBinding: "static-build", endBinding: "fastify-api", label: expect.stringMatching(/fastify.*serves dist/i) });
    expect(connectorById(template, "fastify-to-browser-app")).toMatchObject({ startBinding: "fastify-api", endBinding: "react-workspace", label: expect.stringMatching(/HTML.*JS.*CSS/i) });
    expect(connectorById(template, "templates-to-store")).toMatchObject({ startBinding: "template-modules", endBinding: "board-store" });
    expect(textById(template, "local-storage-note").text).toMatch(/belongs to the browser.*not server storage.*database server/i);
    expect(connectorById(template, "store-to-files")).toMatchObject({ endBinding: "file-snapshots", label: expect.stringMatching(/atomic rename/i) });
    expect(systemById(template, "file-snapshots")).toMatchObject({ subtitle: expect.stringMatching(/\.data/i), body: expect.stringMatching(/not a database/i) });
    expect(connectorById(template, "api-save-response")).toMatchObject({ endBinding: "save-queue" });
    expect(textById(template, "save-response-note").text).toMatch(/new revision.*conflict keeps local/i);
    expect(systemById(template, "system-icon-registry")).toMatchObject({ subtitle: expect.stringMatching(/hand-authored local SVG/i), metadata: expect.objectContaining({ sourcePath: expect.stringMatching(/SystemIcon\.tsx.*template-diagram-kit/i), packageName: expect.stringMatching(/project-owned SVG/i) }) });
    expect(systemById(template, "lucide-ui-icons")).toMatchObject({ subtitle: expect.stringMatching(/lucide-react 0\.468\.0.*third-party/i), body: expect.stringMatching(/interface controls.*does not define the system stencil artwork/i) });
    expect(connectorById(template, "concept-to-icon")).toMatchObject({ startBinding: "visual-concept", endBinding: "system-icon-registry" });
    expect(connectorById(template, "icon-to-stencil")).toMatchObject({ startBinding: "system-icon-registry", endBinding: "stencil-definition" });
    expect(connectorById(template, "stencil-to-element")).toMatchObject({ startBinding: "stencil-definition", endBinding: "placed-canvas-object" });
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
