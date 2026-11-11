---
name: finn-contract-change
description: Procedure for changing FINN's backend↔frontend API contract (docs/CONTRACT.md) without breaking the other side — updating pydantic models, example JSON, snapshot files, frontend types and mocks. Use whenever an endpoint, response field, or snapshot JSON shape is added, renamed, or removed.
---

# Changing the API contract

`docs/CONTRACT.md` is the single source of truth between the backend (Claude Code) and the frontend (Antigravity).
A mismatch here is the most likely way to break the demo, so follow every step.

## Rules
- Claude Code is the only tool that edits `docs/CONTRACT.md`.
- Prefer **additive** changes: add new optional fields instead of renaming. Remove fields only when both sides are updated in the same change.
- The push-side snapshot files in `frontend/public/data/*.json` follow the same schemas as the API responses.

## Steps
1. **Edit `docs/CONTRACT.md`.** Update the endpoint and its schema table, update the example JSON, and add a line to the changelog at the bottom:
   `YYYY-MM-DD — <endpoint>: <change> (breaking? y/n)`.
2. **Backend models.** Update the pydantic models in `backend/app/models.py` to match.
3. **Example and test.** Regenerate `docs/examples/<endpoint>.json` from a real or fixture response, and add or adjust a test asserting that the response validates against the model.
4. **Snapshot.** If the shape is used by the snapshot export, re-run the export (see `finn-demo-check`) so `frontend/public/data/` matches.
5. **Frontend handoff.** Write a short note to paste into Antigravity, then log it with `finn-ai-history`:
   ```
   CONTRACT CHANGE <date>: <endpoint>
   - field X added (type, meaning, example)
   - update frontend/src/api/types.ts and mocks in frontend/src/mocks/
   - breaking: no
   ```
   If the frontend types are generated from the backend (`openapi-typescript` against `/openapi.json`), regenerate them instead of hand-editing.
6. **Verify.** Run `uv run pytest` in `backend/`. Load the affected screen in the frontend against both mocks and the live API.

## Never
- Change a field type in place (e.g. string → object). Add a new field and deprecate the old one.
- Ship a backend change while the frontend still expects the old shape on the demo path.
