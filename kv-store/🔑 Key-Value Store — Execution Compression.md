## What problem this solves

Keep `put(key, value)` and `get(key)` working when data is spread across many nodes, nodes fail, and replicas cannot stay synchronized in real time. The system continues operating under failure and accepts temporary divergence.

---

## What this is

A distributed KV store is a routing and replication engine hidden behind a tiny API. A `get` or `put` triggers: compute placement → contact replicas → collect responses → interpret versions → optionally repair.

---

## Core invariant

The same key must always map to the same replica set, and every stored value must carry version metadata so the system can detect stale state versus true conflicts.

---

## Mechanism — placement and coordination

Placement is local: every node computes `hash(key)`, finds the first node clockwise on the ring as the primary, and selects the next `N−1` nodes as replicas. No lookup, no central service.

Coordination is per-request: the node handling the request computes the replica set, sends requests to those replicas, waits for replies, and returns once enough responses are received. “R” and “W” are just how many replies it waits for.

---

## Mechanism — reads, writes, versions

Writes are sent to replicas and succeed once enough acknowledgments arrive. Reads query one or more replicas and return once enough responses are collected.

Each value carries version metadata. When responses come back, the node compares versions: one may be newer (others are stale), or multiple may be concurrent (conflict). Only in the conflict case does the system return multiple values.

---

## Cost model

Cheap operations involve fewer replicas; safer operations involve more. Reading from one replica is fast but risks staleness. Reading from multiple replicas costs more but detects divergence. Writes cost replication plus waiting for acknowledgments. The system trades immediate coordination for later repair.

---

## Failure behavior

Failure appears as loss of agreement, not just downtime. If a node fails, remaining replicas handle requests and load shifts. If replicas accept different writes due to delay or partition, their states diverge.

The system detects this only when responses are compared: stale replicas can be repaired, but concurrent versions cannot be merged automatically. Failure therefore shows up as stale reads or multiple versions, not just errors.

---

## Repair and convergence

Repair happens after the fact. Read repair updates stale replicas during reads. Background anti-entropy continuously synchronizes replicas without client involvement. The system becomes consistent over time if failures stop.

---

## Placement hash

Hashing is used for deterministic placement, not security. The same key always maps to the same position on the ring, ensuring stable routing and uniform distribution without coordination.

---

## Lock

A distributed KV store routes each key to a replica set and keeps operating under failure by accepting temporary divergence, detecting it through version metadata, and repairing it over time.

## Connections

- **Broader context:** [[Systems Engineering — Map]]
