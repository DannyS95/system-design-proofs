# 🗝️ Key-Value Store — Simplified Overview

## 🔄 Flow Overview

1. **Client → Coordinator:**  
   The client hashes the key and sends the request to the responsible node using **consistent hashing**.

2. **Replication:**  
   The coordinator writes data to itself and its **`n` clockwise neighbors** (replicas).

3. **Write Path:**  
   The coordinator waits for **`w` acknowledgements** from replicas before confirming success.

4. **Read Path:**  
   A client reads from **`r` replicas**, compares their versions via **vector clocks**, and returns the latest value.

5. **Failure Handling:**  
   If a node is unavailable, nearby replicas handle writes temporarily (**sloppy quorum**) and replay updates later (**hinted handoff**).

---

## ⚖️ Core Trade-Offs

| Lever | Low Setting | High Setting | Trade-Off |
|-------|--------------|--------------|-----------|
| **Read quorum (`r`)** | Faster reads, risk of stale data | Slower reads, fresher data | Latency ↔ Freshness |
| **Write quorum (`w`)** | Faster writes, possible divergence | Slower writes, stronger durability | Speed ↔ Safety |
| **Replication factor (`n`)** | Lower cost, less resilience | Higher cost, better fault tolerance | Cost ↔ Availability |
| **Consistency rule (`r + w > n`)** | Violated → stale reads possible | Respected → consistent reads | Performance ↔ Consistency |

---

## 🧠 Key Idea

Dynamo-style KV stores **tune consistency, availability, and latency** through `r`, `w`, and `n`.  
There’s no universal “best” configuration — only trade-offs that fit each workload.
