# F13LD.vault — session recap, 2026-10-11 · v0.8.2 and v0.9.0

`main` = **v0.9.0** (includes v0.8.2), merged 2026-10-11 after Matt's click-test, together with F13LD.sweep v0.30.0 — both before the wipe and reseed. F13LD.ingest unchanged; no database change.

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

## Biomedical pore window (Matt, 2026-10-11)
- P50 is the median of the distance field over every void voxel (×2) — about half the inscribed pore (gyroid sheet: P50 293 µm vs pore 611 µm) — so the old 350 ± 150 µm Gaussian on P50 favoured ~700 µm pores.
- Now: pore window = plateau on the **mean pore diameter** at your cell size, full marks 300–600 µm (Build target "Pore window from / to"), the strain window's soft log fall-off outside; third factor = soft **throat gate**, full marks at ≥ 100 µm (`BIO_THROAT_MIN_UM`), replacing throat ÷ pore (which stays a metric and in the oil & gas score). `plateauWindow()` is shared with the strain window.
- P10 / P50 / P90 key text now says what they are (distance-field percentiles, not pore diameters).
- Later: local thickness (BoneJ's micro-CT pore size) in Sweep's pores pass — noted in f13ld.sweep `docs/NEXT_STEPS.md`.

## Until the reseed
- Specific surface is blank on every current row (Sweep v0.30 only); surface efficiency falls back to the voxel-face count.
- Stiffness-matrix metrics (ν, auxetic chips, directional E, A^U, Zener, K, HS, G/E) only on GPU-solved rows (Sweep v0.24+); automotive falls back to ortho contrast elsewhere; rows before Sweep v0.27.2 use Vault's solid-modulus estimate.
- Old rows read 0 for curvature / topology on TPMS solid and shell, beam and foam, so the cell-scaled curvature and genus read 0 there. No noise rows since the wipe.
- Coverage check, in the browser console on the live Vault: `pickableMetrics().map(m => [m.label, DB.all.filter(d => isNum(d[m.key]) && d[m.key] !== 0).length]).filter(r => r[1] < DB.N).sort((a, b) => a[1] - b[1]).forEach(r => console.log(r[1] + ' / ' + DB.N + '   ' + r[0]))`

## Next
1. **Wipe and reseed** from F13LD.sweep v0.30.0 Push to Vault (noise from F13LD.noise v0.12.0+; wipe with `delete from public.f13ld_designs;`). Then re-run the coverage check above, and re-check the density-exponent borrowing split (`_nexpLvl` / `_nexpSrc`) on the new data (carried from 2026-10-10).
2. After the reseed: retire the voxel-face **surface complexity** from the pickers once every row has specific surface; drop the automotive ortho-contrast fallback if every row has a stiffness matrix.
3. **Phase 5 — Lab results in Vault** (scoped 2026-10-10, still open): Lab's Push to Vault, yield / buckling / failure-mode columns, Lab-verified chip and colour mode, Sweep-vs-Lab gap metric.
4. Later: **local thickness** pore size from Sweep (its `docs/NEXT_STEPS.md` §4) — then point the biomedical pore window at it; a **custom metric** builder (A ÷ B, A × B, log A) next to the correlation map; the **solved void-phase D_eff** to replace Bruggeman.

## Checks
`npm test` (smoke + bake-check) 0 errors; `npm run audit` with `CHROME=/opt/google/chrome/chrome` (serve on :8765 first).
