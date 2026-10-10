# F13LD.vault — session recap, 2026-10-09

**Branch:** `ui-v0.5`, merged to `main` on 2026-10-09 (941a3a8) after your click-test.
**Version:** 0.5.1 — live at https://mshomper.github.io/f13ld.vault

## What happened

1. **Analysis and proposal.** I reviewed the v0.4 Vault UI and wrote a full desktop and phone proposal with an interactive mockup (`docs/VAULT_UI_PROPOSAL.md`, `docs/vault-ui-mockup.html`; also on branch `ui-proposal`).
2. **Two rounds of your feedback.** Added panning in the 3D view, a 2D plot with selectable axes in the hero, larger compare text, a plan for thumbnail cost, and resizable panel boundaries. Fixed the 2D text overlaps.
3. **Critical review** (section 9 of the proposal): 7 must-fix items, a should-fix list, and 9 new ideas.
4. **The real build.** v0.4's single file was rebuilt as numbered modules in the Lab / Sweep pattern. Every must-fix and should-fix item from section 9 is in. All 9 new ideas are in. The minimum text size is 12 px.

## What's in v0.5

**Hero**
- **3D design space**: ranked axes with low / median / high ticks and a "ranked" tag. Orbit; pan with Ctrl, right or middle drag; zoom; Shift-drag brush (Alt adds). Points are drawn with WebGL.
- **2D plot**: real values with log axes. Box-drag sets two ranges. Also target pin, Pareto front, gap map (clicking a hole drops a target there), axis presets and edge histograms.
- Split, 3D-only or 2D-only views. Every boundary is resizable. Sizes are saved per layout, as fractions.

**Results**
- Gallery with GPU-raymarched geometry thumbnails, and a table with sortable columns and header definitions.
- Thumbnails are baked only for cards on screen, top-left first, in a worker pool. They are cached in memory (LRU) and in IndexedDB.
- Wave, bundle and reaction-diffusion grain show a drawn placeholder for now.

**Inspector**
- Live orbitable preview with 1–3 cells and pinch zoom.
- Percentile tiles, radar, score breakdown, notices (outside filters, flag, partial validity), recipe and provenance.

**Filters**
- Domain tiles and chips with what-if counts.
- Range sliders: log-aware, histogram of designs still in play, keyboard arrows.
- "Why not" when nothing matches.
- Undo / redo, and a share link that restores the whole view.

**Other panes and tools**
- **Compare**: best value and bar direction follow the domain. Send all pinned designs to Queue.
- **Build target**: material presets and absolute units. Also shows a readout of the preview engine.
- **Metric key**, command palette (Ctrl K) and shortcuts sheet (?).

**Phone**
- Bottom sheet with three snap points.
- Gallery that loads more as you scroll, an inspector view, a full-screen filter sheet, and a one-pill top bar.

**Handoffs**
- Mesh and Lab via a link. Sweep via recipe download plus opening Sweep. Queue. Recipe JSON.

## Found and fixed in the final pass

**Real-browser render audit** (Chromium at 1600, 1280, 1024 and phone 390):
- **Points did not draw in Chrome.** The point shader failed to link because one uniform had different precision in its two stages. jsdom could never catch this.
- **Black halo around the point cloud.** The glow wrote full alpha into a canvas that was not using premultiplied alpha. It now uses premultiplied blending. Glow strength also scales with point density, so a crowded cloud keeps its family colours.
- **3D labels piled up in the cloud.** They now go through a collision-aware placer with dark halos. The long axis titles are gone (the chips name the axes), and the cube fits between the tool row and the chip row.
- **Gesture hints:** they now fade after your first drag in that view and stay hidden from then on. They also hide when the view is small.
- **2D tick labels** now give way to the selection's value chips.
- **Inspector:** the geometry sits beside the title on wide panels. Square phone viewports get a fitted framing. The 4:3 thumbnail is no longer cropped.
- **Legend** fits itself, and its "+n" opens the full list.
- **Target banner** moved into the results header, so it no longer covers the plot.
- **Thumbnails** were baking bottom-up; now top-left first. In compare they are capped in height so the metric rows stay visible.
- **Beam designs without a topology name** now read "7-strut lattice" instead of "—".

**Independent code review** (a separate agent, read-only):
- **Privacy:** if Supabase rejected the column list, the loader fell back to `select=*`, which would download `contributor_contact`. It now drops only the missing column it is told about and retries. It never asks for every column.
- **Thumbnails** could stay blank after any re-render while bakes were queued (an old observer cancelled new requests).
- **A share link with a target** opened with no target ranking.
- **Typing in Build target** could wipe the field.
- **The inspector** collapsed its open sections on every filter change.
- **Leaks and stuck states:**
  - a mobile observer leaked on each render
  - points did not come back after the GPU context was restored
  - a worker that failed to load froze previews
  - slider and sheet drags could stick after a cancelled touch
  - phone submenus opened in the corner
- **Smaller items:**
  - the second click of a double-click was still picking a point
  - the microstrain "M" suffix was missing
  - the address bar was stale after undo
  - the page never went idle while a design was selected (pulses now stop after 7 s)
  - the dock count could trail the real count on slow frames

## How to check it on your machine

```
git fetch && git checkout ui-v0.5
npm install
npm test                       # smoke test + bake check
python -m http.server 8765     # leave running
npm run audit                  # real Chrome, 4 sizes; screenshots in tests/shots/
```

Then open http://localhost:8765/ (live Vault) or http://localhost:8765/?mock (sample data).

## Open items and notes

- **Supabase:** also revoke `SELECT` on `contributor_contact` for the anon role. The client no longer asks for it, but the database should refuse it too.
- **Sweep import:** "Explore in Sweep" downloads the recipe and opens Sweep, because Sweep has no link import yet. A `#r=` import in Sweep would make it one click.
- **Ingest:** could pre-render thumbnails at upload, so first visits don't bake in the browser.
- **`geom/`** is a copy of Sweep's MIT geometry. Refresh it by copying from Sweep and running `npm test` (see CLAUDE.md).
- **Not built:** wave, bundle and reaction-diffusion previews (placeholders for now), and a "shape by family" point option. Points are shaped by connectivity.
- **Region brush** still stores the list of designs inside the box. It is shown and removable as a chip, but you can't edit its bounds in the drawer.

## After your click-test (v0.5.1)

- **Hero toolbar buttons ignored clicks.** The hero panel stored its view (3D / split / 2D) in the same attribute the 3D / Split / 2D buttons use. The click handler matched the panel first, so every button inside the hero did nothing: Orbit, Brush, Alive, the resets, Box, Target, Pareto, Gap, Presets and Colour. The panel attribute is now `data-heroview`, and the view switch matches buttons only. My earlier tests called the functions directly, which is why they missed it.
- **3D rank ticks now carry their axis letter** ("X high", "Y median"), because ticks from different axes can sit close together.
- **The render audit now clicks every visible button with a real mouse** and lists any that change nothing. Run against the broken build, it caught Colour, Target, Pareto, Gap and Presets. It did not flag Orbit, Brush, Alive or the 3D reset, and I didn't find out why, so treat it as a strong check rather than a complete one.

## Next steps

1. **Strain values look far too high: start here next session.** Vault does not compute strain; it shows the `microstrain_*_per_gpa` values that Sweep writes and Ingest uploads. Three things point at a units problem:
   - **The units are uncertain.** v0.4's note in `10-metrics.js` (around line 163) says the stored value is really microstrain per **MPa** at a baseline solid modulus of 1 GPa, and that the "per GPa" name is a misnomer. Vault still labels the normalised value **"με/GPa"**, so whatever the true unit is, the label may be wrong.
   - **The scoring assumes those units.** The biomedical strain window is centred at 100,000 in the same units, so it may be scoring against the wrong scale.
   - **Real units need two inputs.** Strain only shows in real microstrain when Build target has both a solid modulus *and* a reference stress. With just a material picked, you see the raw stored number.
   - **A 10-second check in the live Vault**, using the browser console:
     ```
     DB.all.slice(0, 8).map(d => [d.ex_norm, d.microstrain_x_per_gpa, Math.round(d.microstrain_x_per_gpa * d.ex_norm)])
     ```
     The last column is the stored strain × E*. If it is about **1,000** for every row, the stored value is per MPa at Es = 1 GPa (the v0.4 note is right; only the label is wrong). If it is about **1,000,000**, it is per GPa. If it varies from row to row, the strain isn't simply 1/E* and the Sweep pipeline needs a look.
   - **Then:** fix the unit label and the strain window in Vault. If Sweep's export is off, fix it there instead, so Ingest and every consumer agree.
2. **Supabase:** revoke `SELECT` on `contributor_contact` for the anon role.
3. **Sweep link import (`#r=`),** so "Explore in Sweep" is one click.
4. **Ingest pre-renders thumbnails** at upload.
5. **Previews for wave, bundle and reaction-diffusion grain**, which show placeholders today.
6. **Wipe and reseed Vault** with the new Sweep results once the families pass is done. Re-check strain against the fresh data.

## Strain fix (v0.6.0) and Sweep v0.27.2, merged 2026-10-09

- **Cause:** Sweep stores strain per GPa of stress for its own 100 GPa solid (1e6 ÷ (E* × 100)). v0.4 converted it as if it were per MPa at a 1 GPa solid, so absolute strain read 10× high, and the raw number was labelled "με/GPa". Your console check confirmed it: strain × E* = 10,000 on every design.
- **Vault v0.6.0:**
  - Strain is rebuilt from stiffness: με = 1000 ÷ E* × stress ÷ solid modulus.
  - Strain stays hidden until a load is entered.
  - Biomedical uses a Frost-style window, 1,000–3,500 με by default and editable.
  - Switching to Biomedical without a load or cell size opens a loading-case card. "Not now" is remembered.
  - Numbers of 10,000 and over read like "12.5k".
- **Sweep v0.27.2:**
  - Stiffness, shear and conductivity are saved to 4 significant figures. Soft PI-TPMS used to round to 0.
  - The export records the solid modulus and stress Sweep used, in `Es_ref_GPa` and `sigma_ref_GPa`.
  - Very soft designs may now get the "stiffness may be inflated" flag.
- **Next:** reseed the 500 from Sweep v0.27.2, then check that soft PI-TPMS stiffness and strain look sane in Vault.

## Evening — Aim Sweep (v0.7.0, branch `v0.7.0-target`, not merged)
Goes with F13LD.sweep v0.28.0 (branch `v0.28.0-target`).
- **Aim Sweep** on the target banner (and the inspector's Sweep button while a target is set) opens F13LD.sweep with `#r=<recipe>&t=<target and ranges>`; without a target the Sweep button now opens Sweep with the recipe loaded (no more download-and-drop). Past the link limit it falls back to the download.
- **Seed by reachability** (`23-reach.js`): for the 80 designs nearest the target, fit the density trend on each one's 30 nearest same-family designs (unflagged when there are ≥ 12), slide along it to the density with the smallest worst-metric error (a small charge per step of density), pick the best — or the nearest unflagged design when that's no better. Families Sweep sweeps only.
- **Physics warnings** (Voigt's bound, rising or falling with density) in the toast.
- **Solver line fixed** ("FFT-CG · GPU · v0.24.0", details on hover) and an "aimed at" row for runs that came from a target.
- Checks: `npm test` (smoke gains reach / payload / link / physics / solver-text steps), `npm run audit` at 1600 / 1280 / 1024 / 390 — no overlaps, no small text, no sideways scroll.
- **Testing both branches together:** Vault reads `?sweep=<url>` (raw.githack.com, GitHub Pages or localhost only) so its Sweep links can open the Sweep branch build, e.g. `https://raw.githack.com/mshomper/f13ld.vault/v0.7.0-target/index.html?mock&sweep=https://raw.githack.com/mshomper/f13ld.sweep/v0.28.0-target/index.html`. Merge Sweep first, then Vault: the live Vault's links need the live Sweep to read them.
- **Merged to `main` 2026-10-10** after Matt's click-test (Sweep v0.28.0 first, then Vault v0.7.0).
