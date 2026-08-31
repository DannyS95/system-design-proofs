# Tasks

Each task implements one mechanism.

## Phase 1 — local-first document persistence

- [x] Define the versioned board contract and validation.
- [x] Implement atomic board snapshots with optimistic revisions.
- [x] Implement local recovery and a serialized autosave queue.
- [x] Connect the Excalidraw scene to persistence state.
- [x] Add board lifecycle actions and visible UI states.
- [x] Add import/export and the generic IT stencil catalog.
- [x] Test the contract, store, queue, and stencil conversion.
- [x] Update CHANGELOG, CONTEXT, and measured BENCHMARKS.

## Phase 2 — KV-store teaching artifact

- [ ] Express the 60-second KV architecture as an editable board template.
- [ ] Export a deterministic repository image.
- [ ] Replace the KV README with the matching short explanation.
- [ ] Correct quorum, replication, versioning, and repair terminology.
- [ ] Test the template's educational content.

## Later mechanisms

- [ ] Asset upload to object storage.
- [ ] PostgreSQL board adapter.
- [ ] Authentication and board ownership.
- [ ] CRDT collaboration and presence.
- [ ] Logseq page/block linking.
