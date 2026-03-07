# Trade-offs

This architecture prioritizes **correctness and durability** for financial data while supporting **horizontal scaling**.

**Quorum reads and writes (R + W > N)** guarantee that clients never observe stale committed values.

The trade-off is **reduced availability** when quorum cannot be reached and **higher write latency** due to write-through persistence.

**TTL and LFU** control cache memory usage, but when keys leave the cache the system must **fall back to the database**, increasing load.

**LFU relies on past access patterns**, so it cannot predict when a key will suddenly become hot, which can cause **temporary cache misses and database spikes**.

**Consistent hashing** enables horizontal scaling but adds **replica coordination overhead**, while **Cassandra anchors durability**, making database performance critical for writes and cache misses.