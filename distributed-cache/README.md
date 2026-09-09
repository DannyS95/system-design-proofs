# Distributed Cache

This is the balanced read/write cache design for financial keys. It is separate
from the read-heavy social-feed cache.

![Distributed cache quorum architecture](./system-canvas.png)

[Open the editable board](../drawing-platform/examples/distributed-cache.system-canvas.json).

## Design contract

- Goal: support 500,000 users with balanced reads and writes.
- Consistency: financial keys require strong consistency.
- Invariant: no client observes a value older than the last committed write.

## Distributed-cache request path

```text
clients
→ load balancer
→ cache client / coordinator
→ consistent hash ring
→ cache shard
→ replica quorum
→ response
```

The cache uses three replicas per shard with `R=2`, `W=2`, and `R + W > N`.
Reads return the newest version observed by the quorum. Financial-key writes use
synchronous write-through to Cassandra.

A cache miss reads Cassandra at `CL=QUORUM`, fills the selected cache shard, and
returns through the same cache client and load balancer. The selected Cassandra
configuration is `RF=3`, `CL=QUORUM`, partitioned by `user_id`.

The checked-in [`architecture.png`](./architecture.png) remains the original
source design. The generated PNG above, SVG, and editable JSON are its corrected
native versions.

See [trade-offs](./trade-offs.md) for quorum availability, memory policy, and
the monitoring signals retained from the source design.
