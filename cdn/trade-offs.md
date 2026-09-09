# CDN Trade-offs

## Content placement

The **control and placement system** chooses between these policies:

- **Push:** the origin sends selected objects to edges before a request. The
  first request is fast, but unused copies waste storage and bandwidth.
- **Pull:** an edge fetches an object after its first miss. Storage follows real
  demand, but the first request pays the longer origin path.

Real CDNs can combine both: push predictable popular content and pull the long
tail.

## Storage tiers

Frequently requested objects stay in memory, less active objects may stay on
SSD, and rare objects remain at a parent proxy or origin. The tier executes a
placement decision; it does not decide popularity by itself.

## Routing

The geographically nearest point of presence (PoP) is not always the best. A
useful route balances:

- actual network-path latency and congestion
- available bandwidth
- load: growing queues, memory pressure, or a link nearing its limit
- PoP health
- whether the requested object is already cached

## Freshness and capacity

Longer residence improves hit rate and origin protection but can return older
content. Shorter residence improves freshness but increases miss traffic.
Eviction is also a load signal: falling residency causes more upstream work,
larger queues, and higher latency.

## Failure

- An edge-proxy failure moves work to another proxy in the same PoP.
- A PoP failure routes new requests to another facility.
- A parent or origin failure makes misses fail even while existing edge hits can
  continue.
- A control-system outage should not stop already cached objects from being
  served with the last usable policy.

Failures redistribute traffic; they do not remove it. Alternate capacity is what
keeps a local failure from becoming global overload.

## Observation

- **Edge hit rate:** falling hits mean more requests escape toward the origin.
- **Path latency and growing queues:** show which route or proxy is nearing its
  limit.
- **Origin request rate:** rising traffic means the edge is no longer protecting
  the source.
- **Unavailable PoPs or proxies:** explain when routing must move traffic.
- **Failed upstream fetches:** distinguish an edge miss from a parent or origin
  failure.
