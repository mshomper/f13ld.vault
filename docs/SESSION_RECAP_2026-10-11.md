# F13LD.vault — session recap, 2026-10-11 · v0.8.1 noise revision 2

**Main:** v0.8.1. One release across F13LD.noise v0.12.0, F13LD.mesh v0.9.9, F13LD.lab v0.26.2, F13LD.sweep v0.29.4 and F13LD.ingest v0.11.0. The spec and the checks: `f13ld.noise/docs/NOISE_REV2.md`.

## Why
F13LD.noise ≤ v0.11.0 exported noise whose CPU simplex had a lattice error, so the parts and the solves differed from what the tool showed. Matt wiped noise from Vault; from now on only fixed noise (revision 2) goes in.

## What shipped (v0.8.1)
- `geom/noise.js` copied from F13LD.sweep: `surface.noise_rev` 2 builds the fixed field, and revision 1 (absent) still builds as before.
- Mock and test noise recipes (`12-mock.js`, `tests/fixtures/recipes.json`) carry `noise_rev: 2`, as all Vault noise will.
- The gate itself lives in F13LD.ingest: `f13ld-vault-push.js` 1.1.0 refuses noise without revision 2, and the database has a restrictive insert policy, `f13ld_designs_noise_rev2` (`f13ld.ingest/docs/sql/2026-10-11_noise_rev2.sql`, run by Matt).

## Checks
`npm test`: smoke (640 mock designs) and bake-check pass. Noise bakes now read about 28 % (simplex sheet) and 37 % (ridged half) on the revision-2 field, against 81 % and 86 % before.

## Next
- Reseed noise from F13LD.noise v0.12.0+ exports through Sweep's Push to Vault.
- The 2026-10-10 list still holds.
