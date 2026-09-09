# Distributed-cache trade-offs

## Selected consistency model

- Cache replica set: `N=3`, `R=2`, `W=2`.
- Quorum intersection: `R + W > N`.
- Database: Cassandra with `RF=3` and `CL=QUORUM`.
- Financial-key writes: synchronous write-through.
- A write is acknowledged only after cache `W=2` and Cassandra `CL=QUORUM`
  succeed for the same version; partial outcomes invalidate or bypass the cache.
- The cache client selects replicas, compares the versions returned by the read
  quorum, and returns the newest value.

This costs more network work per operation than an eventually consistent cache,
but preserves the board's invariant: no client observes a value older than the
last acknowledged write.

## Availability

- One unavailable replica still leaves a read or write quorum.
- Fewer than two available replicas prevents a cache quorum. Reads fall back to
  Cassandra at `CL=QUORUM`; writes fail closed unless both write-through quorums
  complete.
- Rejecting or bypassing protects consistency instead of returning a single
  potentially stale cache copy.

## Placement and memory

- Consistent hashing limits key movement during scale-out.
- Virtual nodes smooth uneven or hot shard placement.
- A virtual node is a ring position, not a server. Its owned interval maps to a
  logical shard, whose replica rule then chooses physical cache servers.
- TTL expiration converges old cache entries.
- LFU eviction retains frequently accessed keys under memory pressure.

## Monitoring

- cache hit ratio
- shard QPS
- latency p50 and p99
- quorum failures
- replica lag
