# Social-feed cache trade-offs

## Why this policy

Cache-aside reads keep the common path fast without making RAM authoritative.
Database-first writes prevent a cache-only write from becoming the durable
answer. Invalidation allows brief staleness while avoiding two active writes on
the request path.

## Failure decisions

- **TTL or eviction:** next read misses → Feed API reads DB → response returns
  through Feed API → cache refills.
- **Node down:** another healthy replica answers. With none available, follow
  the normal miss path.
- **Popular key expires:** permit one database read; duplicate requests wait and
  share its result.
- **Hot key:** add extra replicas for that feed item or cache it inside the
  application service.

## Signals

`cache hit ratio`, `shard requests/sec`, `p99`, `database fallback rate`,
`evictions`, `healthy replicas`, and `replication delay` each correspond to a
specific claim on the board.
