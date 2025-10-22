# Key-Value Store Trade-Offs

Quick reference for the main levers in this Dynamo-style design.

## Core Traits

| Aspect | Notes |
| --- | --- |
| Topology | Consistent-hash ring with virtual nodes spreads keys evenly so operators don’t juggle hotspots |
| Coordination | First healthy replica in the preference list (replicas ordered by ring position so clients know which one to try next) takes each request |
| Replication | Clockwise neighbors hold `n = 3` copies by default so the service rides out single-node failures |
| Versioning | Vector clocks record who wrote what so conflict resolution tools surface diverging versions |
| Consistency | Tunable quorums with `r + w > n` keep reads and writes meeting so teams can dial latency vs durability per workload |

## Tuning Trade-Offs

| Knob | Lower Setting | Higher Setting | Use It When… |
| --- | --- | --- | --- |
| Read quorum `r` | Clients get answers faster but risk stale data | Clients wait a bit longer but see fresher data | Readers demand fresher data |
| Write quorum `w` | Coordinator returns quickly because fewer replicas ack, but replicas diverge more often | Coordinator waits on more replicas so writes stick through failures | You cannot afford to lose writes |
| Replication factor `n` | Fewer machines to run, yet a single failure hurts availability | Extra machines, but the service survives multiple failures | You need extra copies for fault domains or regions |
| Vector clock entries | Less metadata in flight, yet conflict debugging gets harder | More metadata, giving operators clearer conflict history | Conflicts pile up and you need more context to resolve them |
| Checksums enabled | Saves replica CPU at the risk of silent corruption | Burns extra CPU so storage nodes catch bad bits early | You cannot risk silent data corruption |

## Failure Playbook

| Scenario | Response |
| --- | --- |
| Node failure | Neighbor replicas keep answering requests until ops restores the node and it pulls its range back |
| Transient outage | Sloppy quorum (next healthy replicas in the preference list) absorbs the write so clients succeed; hinted handoff replays it when the target recovers |
| Network split | Vector clocks surface sibling versions so application owners can merge them |
| Membership churn | Gossip spreads liveness so the ring rebalances automatically without a central controller |
| Data-center loss | Cross-region replicas keep quorum alive so global traffic keeps moving |

## Integrity Toolbox

| Mechanism | Why It Exists |
| --- | --- |
| Merkle trees | Background walks compare hashes and heal replicas that drift so operators skip manual resyncs |
| Hint expiration | Drops old hints so replicas don’t stockpile updates for nodes that never come back |
| Quorum reads/writes | Overlapping read/write sets ensure each quorum hits a replica that acked the latest write so readers see committed data |
| Context objects | Carry vector clocks with values so clients never overwrite unseen updates |
| Checksums | Replicas hash data as they write or forward it so corruption is caught before users read it |

## Handy Equations

```
r + w > n                 // ensure overlap
Availability ≈ 1 - (P_failure)^(n - w + 1)
Consistency lag ≈ replication_latency / r
```

## References

- Amazon Dynamo: Highly Available Key-Value Store (2007)
- Riak Core design documentation
- Cassandra architecture whitepaper
