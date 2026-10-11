# F13LD.vault — session recap, 2026-10-11 · v0.8.2 and v0.9.0

Branches: `v0.8.2-axes` (fixes) and `v0.9.0` (built on it). Ships with F13LD.sweep v0.30.0 (`v0.30.0-metrics`), both before the wipe and reseed.

## v0.8.2 — fixes
- Picking a domain sets its axes again (as v0.4 did): 3D X / Y = the domain's first two `DOMAIN_DEFAULTS`, Z = domain score, 2D = its first `AXIS_PRESETS` pair. Biomedical: pore × strain with a load, pore × density without, upgraded automatically when a load arrives. A hand-picked axis ends the automatic switching until the next domain change; the toast offers Keep my axes. (`21-actions.js` `applyDomainAxes`.)
- Splash: the first page asks for the table count (`Prefer: count=exact`) and reads "loading N of T designs" with a real progress bar; the final count holds ~1 s before the fade.

## v0.9.0 — welcome guide (`65-welcome.js`)
- First visit: domain (8 tiles) → your build (material, modulus, cell size; Biomedical adds reference stress with presets Trabecular 1.0 MPa (0.5–2), Subchondral 3.5 (2–5), Load-bearing 10 — Matt's ranges) → top 24 ringed in lime in both views and the list, docked bottom-right; Filter to these / Keep all.
- Finishing or "Don't show this again" retires it (`f13ld.vault.welcome.v1`); skipping part-way brings it back next visit. While open it stands in for the Biomedical card; afterwards the card works as before. Never shown on deep links (`#v=`, `#r=`, `#aim=`). Header Guide button, palette, phone menu.
- The stress presets are in the Biomedical card too.

## v0.9.0 — metrics audit (Matt's decisions, 2026-10-11)
Full audit: the `F13LD.vault-metrics-audit.md` file from this session.
- `14-elastic.js` derives at load: from `metrics_extended.C_GPa` (GPU solves) — ν xy / xz / yz, ν min + auxetic chips and colour mode, stiffest / softest direction over every direction, A^U, Zener, bulk K, Hashin–Shtrikman efficiency, G/E; from stored columns — throat ÷ mean pore (`_tp`), cell-scaled curvature (H·L, |H|·L, σH·L, K·L², MIH/L), conductivity efficiency, Gibson–Ashby C; specific surface `_sv` from Sweep v0.30's `specific_surface`. Isotropic check in the smoke test: A^U 0, Zener 1, G/E 0.385, ν 0.3, HS 1, K 0.833.
- Retired from pickers (`retired: true`; inspector and key keep them, saved axes / colour / sort migrate): ortho contrast, aniso efficiency, strain energy, |E|/VF, stored throat ratio, mm curvature.
- Default 3D X = Voigt efficiency (stiffest axis) `_beff`. Relabels: Axial anisotropy, Voigt efficiency (mean axis); units: genus per cell, MIH mm.
- Scores: biomedical and oil & gas use throat ÷ pore (oil & gas drops the double-counted tortuosity); aerospace = √(`_beff` × directionality); automotive = √(Voigt mean × (1 − A^U rank)), ortho contrast fallback without a matrix; thermal split into Directional heat (`thermal`) and Heat spreading (`spread`, √(k eff × 1/kα)); surface efficiency uses `_sv` where present. Key text rewritten from the code; `DOMAIN_LABELS` removed.
- Aim Sweep can target `_beff`, `_tp`, `_keff` (Sweep v0.30.0).

## v0.9.0 — correlation map (`66-trends.js`)
Rank correlation of every pickable metric over the filtered set; Similar (average-linkage) or Group order; hover for ρ and n, click to plot the pair in 2D; side list of what moves with a metric and near-duplicates (|ρ| ≥ 0.95). Narrow screens stack the list under the grid; phones get the list only — no sideways scroll anywhere. 2D toolbar button, palette, phone menu.

## Found, not changed
- Biomedical's pore window uses P50, which Sweep computes as the median of the distance field over every void voxel — about half the inscribed pore size (gyroid sheet: P50 293 µm vs pore 611 µm). The 350 ± 150 µm window was written for pore diameter. Decision for Matt.

## Checks
`npm test` (smoke + bake-check) 0 errors; `npm run audit` with `CHROME=/opt/google/chrome/chrome` (serve on :8765 first).
