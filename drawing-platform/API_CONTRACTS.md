# API contracts

All responses use JSON except the production SPA assets.

## `GET /api/health`

Output: `{ "status": "ok" }`.

## `GET /api/boards`

Output: `{ "boards": BoardSummary[] }`, newest update first.

## `POST /api/boards`

Input: `{ "name": string, "templateId"?: string }`.

Output: `201` with the created `BoardDocument`.

Errors: `400` invalid name, `404` unknown template.

## `GET /api/boards/:boardId`

Output: `200` with `BoardDocument`.

Errors: `400` invalid identifier, `404` unknown board.

## `PUT /api/boards/:boardId`

Input: `{ "name": string, "expectedRevision": number, "scene": BoardScene }`.

Output: `200` with the saved `BoardDocument` and incremented revision.

Errors: `400` invalid document, `404` unknown board, `409` revision mismatch,
`413` body too large.

## `DELETE /api/boards/:boardId`

Output: `204`.

Errors: `400` invalid identifier, `404` unknown board, `409` final board.

## `GET /api/templates`

Output: `{ "templates": TemplateSummary[] }`.

## Validation

- Names are trimmed, 1–80 characters.
- Board identifiers match `^[a-z0-9][a-z0-9-]{0,63}$`.
- `expectedRevision` is a non-negative integer.
- A scene contains arrays/maps only and is bounded by the server body limit.
