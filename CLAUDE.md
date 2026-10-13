# F13LD.vault — working notes for Claude

Browse, filter, compare and hand off the F13LD community metamaterial library
(Supabase table `f13ld_designs`). Static site on GitHub Pages:
https://mshomper.github.io/f13ld.vault

## Rules

- **Ask Matt before pushing or merging to `main`.** Work on a branch, push the
  branch, and wait for his click-test and explicit OK.
- **No claude.ai session links** in commit messages or PR descriptions.
  A `Co-Authored-By: Claude …` trailer is fine.
- **Bump the version** in `00-config.js` (`VAULT_VERSION`) and `package.json`
  with every change that ships.
- **Analyse and propose first**: when an issue is reported, explain the cause
  and the proposed change before editing code.
- **UI**: never horizontal scrolling (every scroller is `overflow-x:hidden`);
  no emoji or symbol-glyph icons — every icon is drawn (`02-icons.js`);
  **12 px minimum text**, and check for overlap whenever text grows
  (`node tests/render-audit.js`).
- **Privacy**: `contributor_contact` is never fetched. The loader asks for the
  named columns in `VAULT_COLUMNS` only — never `select=*`. If a column is
  missing, the loader drops that one column and retries.
  Since the 2026-10-10 migration the database enforces it too: the public key
  reads named columns only (`select=*` and contact fail), and a new column needs
  `grant select (column) … to anon, authenticated` before Vault can read it.
  Lab solves live in `f13ld_lab_results` (insert-only; newest per hash wins).
- **Words**: never use "genuine" or "genuinely" in UI text or docs.
- **Heavy checks run on Matt's machine**, not in the VM: hand him the command.
- **Strain (v0.6)**: Vault rebuilds strain from stiffness (`11-data.js`
  `strainCoefficients` / `applyLoadValues`). `microstrain_*_per_gpa` and
  `u_compliance` hold *real* με and kJ/m³ under the Build target load, and are
  empty without one, which hides strain everywhere. Sweep's stored values are
  per GPa of stress for its own solid modulus (100 GPa unless the export
  records `Es_ref_GPa`). The Biomedical score uses a Frost-style window
  (default 1,000–3,500 με) and asks for load and cell size when they are missing.

- **Sweep targets (v0.7)**: "Aim Sweep" (target banner, or the inspector's
  Sweep button while a target is set) opens F13LD.sweep with
  `#r=<recipe>&t=<target>`. The target's metric names are Vault's column
  names; Sweep's `13-target.js` reads the same names, so a new targetable
  metric needs both lists updated. Strain targets carry the Build target
  load as `scale` (σ MPa ÷ Es GPa). Seeds skip flagged designs.

## Layout

Numbered classic scripts, one global scope, loaded in order by `index.html`
(same pattern as F13LD.lab and F13LD.sweep). No build step.

| File | What it holds |
|---|---|
| `00-config.js` | version, Supabase URL/key, tool URLs, column list, sizes, storage keys |
| `01-f13-shade.js` | shared F13LD shading — **copied byte-identical from Sweep** |
| `02-icons.js` | drawn icons and glyphs |
| `05-util.js` | DOM helpers, formatting, `Store`, toast, clipboard, download |
| `10-metrics.js` | v0.4 science carried over verbatim (metrics, materials, domains, glossary) + derived metrics, labels, presets |
| `11-data.js` | Supabase paging, row shaping, stats, ranks, domain scores, scarcity, sample data |
| `12-mock.js` | the fixture recipes behind `?mock` |
| `13-state.js` | filters `F`, UI state `S`, prefs, undo/redo, share link `#v=` |
| `14-elastic.js` | v0.9.0 metrics derived at load: from the 6×6 stiffness matrix (ν, directional E, A^U, Zener, K, HS, G/E) and from stored columns (throat ÷ pore, cell-scaled curvature, k efficiency, Gibson–Ashby C, surface area per cell). v0.11.0: BS/BV, the curvature profile from `metrics_extended.curv_*`, tortuosity over open axes |
| `20-filter.js` | one-pass bitmask filter engine, what-if counts, histograms, "why not" |
| `21-actions.js` | views registry, point animation, select/step, setters, presets |
| `23-reach.js` | v0.7: aiming F13LD.sweep at a 2D target — seed by reachability (density trend per family), the `&t=` payload, Voigt-bound physics warnings; `SWEEP_TARGET_KEYS` mirrors Sweep's `13-target.js` |
| `24-aim.js` | v0.7.1: aimed runs (grouped from `solver.target` in Sweep v0.28+ exports) — Source filter, Aimed run colour, ghost targets / seed path in 2D (`aimOverlay2D` in `32-plot2d.js`); colour modes density exponent, bound efficiency, Pareto depth, similar to selected. v0.8.0: `_nexp` (computed at load in `11-data.js` `ingestRows`, before the stats) and `_beff` (`shapeDesign`) are also derived metrics — plot axes and range filters; a borrowed exponent is faded while `_nexp` is on any axis |
| `25-variables.js` | v0.10.0: My variables — formula tokenizer / parser / evaluator over metric keys (no eval), registry in `METRIC_MAP` (`USER_METRICS`, group "My variables"), `computeVars` at load and on load changes, per-browser storage (`LS_VARS`), share-link carry (`#v=` field `u`, remapped on import), delete / sanitize |
| `30-points-gl.js` | WebGL1 point renderer (dim / glow / core), premultiplied alpha |
| `31-hero3d.js` | 3D design space (ranked axes; orbit, pan, brush, label placer) |
| `32-plot2d.js` | 2D plot (real values, log axes, box ranges, target, Pareto, gap map) |
| `40-preview.js` | geometry previews: worker bakes → WebGL2 raymarch; thumbnail LRU + IndexedDB; live inspector |
| `50-results.js` | cards, rings, table, empty states |
| `51-inspector.js` | tiles, radar, score breakdown, notices, recipe, provenance |
| `52-compare.js` | pinned compare drawer |
| `60-dock.js` | dock, tags, tray, legend, menus, drawer, tooltip, target banner |
| `61-filters-ui.js` | filter drawer, range sliders with histograms |
| `62-panes.js` | Build target (absolute units) and the metric key |
| `63-palette.js` | command palette (Ctrl K) and shortcuts sheet (?) |
| `64-splits.js` | resizable splits, stored as fractions per layout |
| `65-welcome.js` | v0.9.0 first-visit guide (domain → build → top 24); stress presets shared with the Biomedical card |
| `66-trends.js` | v0.9.0 correlation map (rank ρ over the filtered set, click a pair → 2D) |
| `67-variables-ui.js` | v0.10.0: the variable builder — drawer tab Variables (desktop) / `#varDlg` sheet (phone); templates, formula chips, auto-commas in min / max / mean, shape preview, duplicate check (rank ρ ≥ 0.995), export / import; "New variable…" in every metric menu saves onto that axis / colour / sort / filter |
| `68-tour.js` | v0.10.0: the tour — 11 stops on desktop, 9 on the phone (no Compare / Build there); ring + card, try-its via `tourEvent()` hooks in `select`, `togglePin`, `setGap`, `setTarget`, `openVarBuilder`; offered from the guide's last step, once to returning users (`LS_TOUR`), and from the guide button menu |
| `70-handoff.js` | Mesh / Lab / Sweep (`#r=`; Sweep also `&t=` target + ranges), Queue |
| `80-mobile.js` | phone layout: bottom sheet, gallery, inspector, filters |
| `99-init.js` | boot, events, keyboard, loop |
| `geom/`, `worker/` | geometry for previews — `geom/*.js` **copied unchanged from f13ld.sweep** (MIT side); `geom/design.js` and `worker/bake-worker.js` are Vault's own |

### Refreshing `geom/` from Sweep

Copy `geom/*.js` (except `design.js`) and `01-f13-shade.js` from the Sweep
repo unchanged, then run `npm test` — `tests/bake-check.js` bakes every fixture
and fails on any family that no longer resolves.

## Checks

```
npm install                 # once: jsdom + playwright-core
npm test                    # tests/smoke.js (whole page on ?mock) + tests/bake-check.js
python -m http.server 8765  # then, in another terminal:
npm run audit               # tests/render-audit.js — real Chrome, 4 sizes, screenshots in tests/shots/
```

- `?mock` loads 640 synthetic designs built from the fixture recipes, for
  offline work or when Supabase is unreachable.
- jsdom has no WebGL or workers: points and previews are skipped there; the
  render audit covers them.
- Shaders must link on strict drivers (ANGLE/iOS): uniforms shared by both
  stages need the same precision.

## Notes

- Latest session recap: `docs/SESSION_RECAP_2026-10-13_v0.11.md` (v0.11.0, branch: curvature profile, true surface area S_V / BS/BV, legacy trims, tortuosity over open axes — for the reseed). Before it: `docs/SESSION_RECAP_2026-10-12_v0.10.md` (v0.10.0: My variables, the tour). Before it: `docs/SESSION_RECAP_2026-10-11_v0.9.md` (v0.8.2 axes + splash; v0.9.0 welcome guide, metrics audit, correlation map). Before it: `docs/SESSION_RECAP_2026-10-11.md` (v0.8.1: noise revision 2 — Vault holds fixed noise only; the gate is F13LD.ingest's push rule plus the `f13ld_designs_noise_rev2` database policy). Previous: `docs/SESSION_RECAP_2026-10-10.md` (v0.8.0: wave, axes / filters, Pareto curve; next: wipe and re-seed), `docs/SESSION_RECAP_2026-10-09.md`.
- **Noise revisions**: noise recipes carry `surface.noise_rev` (spec: F13LD.noise `docs/NOISE_REV2.md`). Vault noise is revision 2; keep mock and fixture noise recipes at revision 2.
- **Variables (v0.10)**: formulas store metric keys (`[_emax]`); chips show short names. Domain score and scarcity can't be inputs. A variable is a metric like any other once `computeVars` has run — but it is not targetable by Aim Sweep (`sweepCanAim` is false). The drawer tab is "Build" now (was "Build target").
- **Curvature (v0.11)**: Sweep ≥ 0.33 stores `curv_*` in `metrics_extended` (one fixed curvature grid, `curv_N`); Vault derives `_cfneg _cfsad _ck2m _ck2sd _ck2med _crad _ckneg` and `d._curv_flag` (filter `F.cflag`, colour `_curv_flag`). Curvature is not in any domain score yet (Matt). Never add a signed mean of K back — it is fixed by topology.
- **Trimmed (v0.11)**: ortho contrast, aniso efficiency, surface complexity, strain energy, stored throat ratio, mm-unit curvature, |E|/VF, K·L². Don't reintroduce them; `_sv` (A/L², S_V with a cell size) is the surface area.
- **Phone 2D (v0.10.1)**: `#mTools2` (Target, gap map) shows in 2D only; on the phone a plot drag always pans, so the Target tool works by tap (`32-plot2d.js` `up`). Template inputs fall back via `VAR_ALTS` in `25-variables.js` (v0.11.0: no fallback for surface area; a template without its inputs hides).
- **Bake check**: `grain-reactiondiff` fails `npm test`'s bake step on `main` too (the fixture is deferred in geom) — not a regression.
- `32-plot2d.js` `paretoCurve`: the 2D front is drawn as a monotone cubic through the front designs (screen space), extended to the plot edges.
