# F13LD.vault — session recap, 2026-10-09

**Branch:** `ui-v0.5` (from `main` bf12666). Not merged; waiting for your click-test.
**Version:** 0.5.0

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
