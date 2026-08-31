# Errors

| Category | Cause | Detection | Recovery |
| --- | --- | --- | --- |
| Validation | malformed name, identifier, import, or scene | client checks and API `400` | keep current scene; show the exact invalid field |
| Network | API unavailable or timeout | failed fetch | keep editing locally; retry the latest queued snapshot |
| Server | unexpected persistence failure | API `500` | preserve local copy; show retry and JSON export |
| Concurrency | expected revision differs | API `409` | preserve local copy; offer export or explicit remote reload |
| Storage | local quota exceeded | browser storage exception | show warning; keep in-memory scene and offer export |
| Import | JSON is not a supported board/Excalidraw scene | parser/validator failure | reject import without changing the current board |
| Export | browser cannot create/download output | export promise failure | leave scene unchanged and provide retry |

There is no authentication or authorization in phase one. The local server must
therefore bind to loopback by default; exposing it publicly is unsupported.
