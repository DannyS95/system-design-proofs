# Distributed-cache trade-offs

## Selected consistency model

- Cache replica set: `N=3`, `R=2`, `W=2`.
- Quorum intersection: `R + W > N`.
- Database: Cassandra with `RF=3` and `CL=QUORUM`.
- Financial-key writes: synchronous write-through.
- The cache client selects replicas, compares the versions returned by the read
  quorum, and returns the newest value.

This costs more network work per operation than an eventually consistent cache,
but preserves the board's invariant: no client observes a value older than the
last committed write.

## Availability

- One unavailable replica still leaves a read or write quorum.
- Fewer than two available replicas makes that shard's operation unavailable.
- Rejecting the operation protects consistency instead of returning a stale
  financial value.

## Placement and memory

- Consistent hashing limits key movement during scale-out.
- Virtual nodes smooth uneven or hot shard placement.
- TTL expiration converges old cache entries.
- LFU eviction retains frequently accessed keys under memory pressure.

## Monitoring

- cache hit ratio
- shard QPS
- latency p50 and p99
- quorum failures
- replica lag
