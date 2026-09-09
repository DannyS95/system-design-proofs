# Errors

| Category | Cause | Detection | Recovery |
| --- | --- | --- | --- |
| Validation | malformed name, identifier, schema-v2 scene, geometry, binding, or file reference | client validation and API `400` | keep current scene; show the invalid field |
| Legacy import | unsupported v1/Excalidraw element type or non-raster asset | migration validator names the type and ID | reject the import without dropping or replacing elements |
| Image | unsupported MIME, file over 2 MB, read failure, or decode failure | shared image ingestion path | leave the scene unchanged; show an inline alert |
| Network | API unavailable or request failure | failed fetch | keep editing locally; retain the newest queued snapshot |
| Server | unexpected persistence failure | API `500` | preserve the browser copy; offer retry and JSON export |
| Concurrency | expected revision differs | API `409` | preserve the local copy; offer export or explicit remote reload |
| Storage | browser quota exceeded | storage exception | keep the in-memory scene and warn the user to export |
| Export | browser cannot serialize, rasterize, or download output | export failure | leave the scene unchanged and allow retry |
| Renderer | unexpected React/TypeScript SVG-editor render exception | React error boundary | keep the workspace alive; offer JSON recovery, another board, and canvas retry |

The maximum-update-depth crash was addressed by removing the previous editor
runtime and using a stable data flow through the repo-owned React/TypeScript SVG
editor module. The error boundary is only a last-resort recovery surface, not
the underlying fix.

There is no authentication or authorization in phase one. The local server must
therefore bind to loopback by default; exposing it publicly is unsupported.
