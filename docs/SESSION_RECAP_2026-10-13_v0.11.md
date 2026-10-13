# F13LD.vault — session recap, 2026-10-13 · v0.11.0

Branch **`v0.11.0-curvature`** (not merged). Goes with F13LD.sweep v0.33.0
(`v0.33.0-curvature`, the curvature profile) and F13LD.ingest v0.11.1
(`v0.11.1-aniso-check`). No database change: the new Sweep fields land in
`metrics_extended`. Made for the wipe and reseed.

## Surface area (Matt: a true measure for comparison)
- Sweep's area integral checked against the textbook minimal-surface areas:
  within 0.3 % at 32³ (gyroid 3.09, Schwarz P 2.35, diamond 3.84 per cell
  face area). The voxel-face `surface_complexity` read 55–62 % high.
- `_sv` is now **Surface area per cell A/L²**; with a cell size in Build it
  shows as **Specific surface S_V (BS/TV)** in mm⁻¹ (new norm kind
  `per_cell_length` in `resolveValue`).
- New `_bsbv` **Surface per solid A/(L²·φ)** → BS/BV in mm⁻¹ — the ratio the
  All applications score ranks.
- `surface_complexity` replaced everywhere: All and Directional heat goals,
  the conductivity-vs-surface preset, the score breakdown, the My variables
  fallback. The "Per material" template is now shear per material (surface
  per material is BS/BV).

## Curvature profile (Matt's 2026-10-13 notes, after Callens et al. 2023)
From `metrics_extended.curv_*` (Sweep ≥ 0.33, fixed curvature grid), in
`14-elastic.js` `derivedColumns`:
- `_cfneg` concave area fraction (κ₂ < 0) · `_cfsad` saddle area fraction ·
  `_ck2med` median concave κ₂·L · `_crad` median concave radius (cell ÷ |κ₂·L|,
  µm with a cell size) · `_ck2m` / `_ck2sd` κ₂·L mean and SD · `_ckneg`
  ∫K⁻ dA ÷ A ·L². All are axes, range filters, sort keys and variable inputs.
- Colour modes: **Concave area** (absolute 0–100 %) and **Curvature check**.
- Filter chips **Curvature check** (`F.cflag`: Resolved / Grid can’t hold it /
  Not recorded) — Sweep's Gauss–Bonnet flag, never hidden unless chosen.
  Inspector notice when flagged; the residual and grid in Provenance.
- Biomedical: concave area replaces curvature uniformity in the domain's
  default metrics (radar, cards, compare); presets Concave area vs density
  (the density-confound check from the notes) and Concave radius vs pore.
  **Not in the Biomedical score** (Matt) until the reseeded data shows it
  moves within families and isn't just restating volume fraction.

## Trimmed (Matt: legacy, gone at the reseed)
Ortho contrast, aniso efficiency, surface complexity, strain energy U,
stored throat ratio (= Throat ÷ pore after Sweep v0.30), the mm-unit
curvature (H̄, |H̄|, σ(H), K, MIH — the ×L versions stay), |E|/VF and
**K·L²** (the signed mean of K, fixed by topology). Gone from every list,
the key and the inspector; `ortho_contrast`, `aniso_efficiency`,
`surface_complexity`, `u_compliance`, `throat_ratio`, `k_gauss_mean` are no
longer fetched (`h_*` and `mih` still are — they feed the ×L curvature).
The Automotive score lost its ortho-contrast fallback (a row without a
stiffness matrix gets no score). Aim Sweep no longer offers the trimmed
ones; Sweep's own target menu still has them. Saved or linked views that
point at a trimmed metric fall back (`99-init.js`).

Kept on Matt's call: Pore P10 / P50 / P90 and Pore CV (until local
thickness), and their Aim targets.

## Fixed
- **Tortuosity (avg / min)** rebuilt over the open axes from the per-axis
  values: Sweep stores 10 on a blocked axis (bit in `tortuosity_nonperc`) and
  the stored average counted it — two open axes at ~1.3 read ~4.2. All
  blocked → empty.

## Checks
- `node tests/smoke.js`: 0 errors, new steps for the trims, tortuosity,
  S_V / BS/BV / concave radius units, the curvature filter and colour modes.
- `tests/bake-check.js`: only `grain-reactiondiff`, as on `main`.
- Real Chrome at 1280 × 760 and 390 × 844 @3× on the filter row and the
  inspector notice: no text under 12 px, no overlaps, no sideways scroll,
  no page errors. Full `npm run audit` on Matt's machine.

## Next
- Merge with Sweep v0.33.0 and Ingest v0.11.1 after Matt's click-test, then
  wipe and reseed.
- After the reseed: correlation map on concave area vs volume fraction and
  within each family; decide on a curvature factor for the Biomedical
  score (window on the median concave radius, ~90–500 µm, editable in Build).
