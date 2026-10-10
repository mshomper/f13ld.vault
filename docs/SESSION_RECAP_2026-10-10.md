# F13LD.vault — session recap, 2026-10-10

**Branch:** `v0.8.0-wave`, merged to `main` on 2026-10-10 after Matt's click-test, alongside F13LD.sweep v0.29.1, F13LD.mesh v0.9.8, F13LD.wave v0.6, F13LD.lab v0.26.1 and F13LD.ingest v0.9.1.
**Version:** 0.8.0

## What's in v0.8.0
- **Wave previews.** `geom/wave.js` copied from F13LD.sweep (the shared `WaveKernel`); wave cards and the inspector bake real geometry and tile periodically. The preview box follows a stretched wave cell (`field.stretch`).
- **Aim Sweep** accepts wave designs (`SWEEP_FAMILIES_OK`, matching Sweep v0.29's `SWEEP_FAMILY_LIST`).
- **Inspector** wave summary: symmetry, topology, phase A / B, each mode's indices and amplitude, iso, thickness, phase time, stretch.
- **Density exponent and bound efficiency** are derived metrics now — 2D / 3D axes and range filters, not only colour modes. `_nexp` is computed at load (`ingestRows`, before the stats); `_beff` per design (`shapeDesign`). A borrowed exponent stays faded while it is on any axis.
- **Pareto front as a smooth curve** (`paretoCurve`, 32-plot2d.js): a monotone cubic through every front design (never swings inside the cloud between two of them), with dashed extensions to the plot edges along its end slopes; the rings stay on the front designs. Matt: the curve's shape (tight knee or open sweep) is what engineers read for what to explore next.
- Sample data (`?mock`) uses real F13LD.wave recipes; fixtures refreshed from Sweep (Wave tool v0.6 exports, a stretched wave).

## Checks
`node tests/smoke.js` (with new steps for the axes, filters, wave rows and the curve) — 0 errors; `node tests/render-audit.js` at 1600 / 1280 / 1024 / 390 px — no small text, overlap or sideways scroll; `node tests/bake-check.js` bakes every wave fixture.

## Next session
- **Wipe and re-seed** the Vault from fresh Sweep v0.29.1 exports (every family, Wave included). Old rows read 0 for curvature / topology on TPMS solid / shell, beam and foam — the re-seed replaces them. After it, re-check the density-exponent borrowing split (`_nexpLvl` / `_nexpSrc`) on the new data.
- **Lab → Vault round trip** (scoped, its own session): Vault's *Open in Lab* will carry the row's content hash, and Lab-verified results come back through Ingest — a filter, inspector values beside Sweep's, a Sweep-vs-Lab gap metric. Scope: `f13ld.lab/docs/VAULT_ROUNDTRIP_SCOPE.md`.
- **Bundle** previews and Aim Sweep once Sweep v0.30.0 adds the family (copy `geom/bundle.js` the same way).
- Later: density exponent and bound efficiency as Sweep target metrics (`SWEEP_TARGET_KEYS` here and Sweep's `13-target.js`).

## Late evening — database migration and direct push (no Vault code changed)

From the direct-push session (F13LD.ingest `docs/SESSION_RECAP_2026-10-10.md`, plan `docs/F13LD_VAULT_PUSH_PLAN.md`, SQL `docs/sql/` there):

- **Database:** the public key now reads **named columns only** on `f13ld_designs` (contact is not readable at all — `select=*` fails with a permission error), inserts, and cannot update, delete or truncate. Vault's loader already asks for named columns, so it loads as before. A new column needs `grant select (column) on public.f13ld_designs to anon, authenticated` before Vault can read it.
- New column **`provenance_kind`** (`sweep` · `lab` · `file`) — not yet in `VAULT_COLUMNS`.
- New table **`f13ld_lab_results`** (one row per Lab solve, tied by `content_hash`, newest by `created_at` wins; contact not readable).
- `f13ld_designs_dimensional` rebuilt without contact. Backup `f13ld_designs_backup_20261010` (1,042 rows); the old backup and the v5 archive are gone.
- **Push to Vault** shipped in F13LD.sweep v0.29.2 (rows `provenance_kind = 'sweep'`), through F13LD.ingest's shared `f13ld-vault-push.js` (v1.0.1). Wipe with `delete from public.f13ld_designs;` (it clears Lab results too; truncate fails).

## Next session (updated)

- Matt **wipes and re-seeds** through Sweep's Push to Vault (instead of Ingest drops).
- **Phase 5 — Lab results in Vault** (after F13LD.lab's Phase 4 push): add `provenance_kind` to `VAULT_COLUMNS`; read `f13ld_lab_results` by named columns (never `contributor_contact`), newest solve per `content_hash`; show Lab values in place of Sweep's estimates with Sweep's beside them; Lab-verified filter chip and colour mode; filterable yield per axis, buckling strain, failure mode, thermal `k_rel_water`, shear moduli; the Sweep vs Lab gap metric by family and grid; Compare shows both. *Open in Lab* adds the row hash (`#r=…&v=<hash>`, `70-handoff.js`) — that piece belongs to Phase 4.

