# KV-Store Trade-offs

This is a Dynamo-style, eventually convergent design: it favors serving requests during partial failure and represents disagreement explicitly instead of silently overwriting it.

## Placement and coordination

Any request-handling node can act as coordinator. It computes `hash(key)`, finds the first clockwise token owner, and chooses that node plus the next `N−1` distinct nodes as the preferred replica set. Virtual nodes improve distribution and make rebalancing incremental, at the cost of more placement metadata and range movement to manage.

For the teaching example:

| Setting | Meaning | Consequence |
| --- | --- | --- |
| `N=3` | Three preferred replicas per key | Uses 3× storage; `R=2` and `W=2` can complete with one preferred replica unavailable |
| `W=2` | Two write acknowledgements required | One slow preferred replica need not block a write; fewer acknowledgements reduce latency but increase uncertainty |
| `R=2` | Two read responses compared | More likely to detect a stale copy than `R=1`, with extra latency and load |

Larger `N` raises replica fault tolerance and availability potential but costs storage, network traffic, and repair work. Larger `R` or `W` waits for more replicas, usually trading latency/availability for stronger evidence about replicated state.

## Versions are a partial order

Each stored object carries version metadata such as a vector clock. If one version dominates another, the dominated copy is stale. If neither dominates, the writes are concurrent and both values are preserved as **siblings**. Merging vector-clock counters with a component-wise maximum merges metadata; it does not define a safe merge for arbitrary application values. The application must reconcile siblings (or knowingly choose a lossy policy such as last-write-wins).

## Failure and convergence mechanisms

- **Sloppy quorum:** when a preferred replica is unavailable, the coordinator may use a healthy fallback outside the preferred set. This improves write availability but weakens the overlap assumed by strict quorum reasoning.
- **Hinted handoff:** a fallback records which preferred replica owns the write and forwards it when that replica recovers. Hints are best-effort temporary recovery aids, not the sole repair mechanism.
- **Read repair:** after comparing read responses, the coordinator sends causally newer versions to stale responders while preserving concurrent siblings. It helps hot keys, but cannot cover data that is never read.
- **Anti-entropy:** background range comparison, commonly using Merkle trees, finds long-lived divergence and streams missing or stale versions. It costs bandwidth and converges asynchronously.
- **Gossip membership:** nodes exchange liveness and ring information without a central membership server. Detection is scalable but not instantaneous or perfectly authoritative; gossip does not repair stored values.

## Quorum caveat

With strict quorums over the same `N` replicas, `R + W > N` guarantees a read set and write set intersect. That overlap is useful, but it is **not sufficient for linearizability**. Sloppy sets can be disjoint; concurrent writes can create siblings; and intersection alone does not impose a single real-time order. Linearizable per-key behavior requires an ordering protocol—typically a leader with consensus, quorum registers with the necessary read/write phases, or an equivalent design.
