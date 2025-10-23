# CDN Trade-Offs

- **Request Routing System**: Anycast offers fast failover but provides limited per-user control; DNS-based routing allows finer granularity yet suffers from caching delays and inconsistent resolver behavior.
- **Edge Proxies**: Larger caches improve hit ratios but increase hardware cost and warm-up time; aggressive eviction keeps storage lean but risks more origin fetches.
- **Origin Servers**: Serving misses directly simplifies consistency but can overload origins during spikes; offloading via distribution adds complexity yet protects origin capacity.
- **Distribution System**: Push replication keeps content fresh but may waste bandwidth on cold assets; pull-only saves bandwidth but delays propagation for new releases.
- **Management System**: Centralized control eases analytics and routing updates yet introduces a dependency that must be highly available; decentralization avoids single points but complicates global visibility.
- **Peer Sync**: Peer-to-peer lookups raise cache hit rates but add east-west traffic and coordination; skipping peer sync simplifies operations at the cost of more origin requests.
