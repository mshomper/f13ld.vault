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
- **Bundle** previews and Aim Sweep once Sweep v0.30.0 adds the family (copy `geom/bundle.js` the same way).
- Later: density exponent and bound efficiency as Sweep target metrics (`SWEEP_TARGET_KEYS` here and Sweep's `13-target.js`).
