# F13LD.vault — UI/UX modernization proposal

**2026-10-09 · audit of `main` (v0.4.0, `index.html`, 7,124 lines) · nothing in the tool has been changed yet**

Open `vault-ui-mockup.html` next to this document (PC browser or the Claude mobile app). It runs on 612 synthetic designs, so every interaction below can be tried. The bar at the top switches between **A · Observatory**, **B · Gallery** and **Mobile**, and **Callouts** numbers the features referred to in section 5. On a phone it opens straight into the mobile layout.

---

## 1. Where Vault stands today

### Out of step with Lab and Sweep
| Finding | Detail |
|---|---|
| Own fonts and palette | Uses Syne, Outfit and DM Mono and a blue-grey token set (`--surface #0b0f16`, `--border #172030`). Lab and Sweep share Exo 2 + JetBrains Mono and the `--s1…--s3 / --hair / --t1…--t3` tokens. |
| Tool name nearly invisible | `VAULT` is drawn in the brand stroke `#0C447C` on `#06080f` — about **2 : 1** contrast. Lab fixed the same problem with an on-dark accent (`#E06A6F`); Sweep with `#E39B4A`. The version label `#2a3a2a` is lower still. |
| Glyph icons | ⬡ (9), ▾ (5), ◆ (4), ↓ (3), ⚠ (3), ✕, ⇧ in the markup and templates — all should be drawn icons. |
| Older status pill, no splash | Wave-glyph pill from the Ingest era; no Resolve wordmark or Field-mark status like Lab v0.24. |
| No shared header actions | The 2026-10-06 suite header (Queue · Mesh · Lab pills) isn't here; Open in Mesh sits inside the right rail. |
| No dock + drawer | Settings live in a 300 px left sidebar instead of the Lab/Sweep dock + drawer. |

### Too many places for controls
- **Five control zones** compete: left sidebar (8 sections), hero overlays, right rail (2D scatter, histogram, radar), card grid, 270 px detail panel.
- The hero carries **six overlay groups** at once: title + **percolation filter** + shortcuts block (top-left), Pin button (top-centre), connectivity legend (top-right), Alive (bottom-left), colour legend (bottom-right).
- **Filters are split**: percolation lives in the hero, everything else in the sidebar.
- **The selection is shown twice**: radar in the rail, recipe + metrics in the detail panel, two screen-widths apart.

### You can't see the structures
- **No geometry preview exists anywhere** — the README promises one, the code has none. Users choose a lattice from numbers and glyph shapes. This is the single biggest gap, and Sweep already solved it (worker-baked margin field + raymarch with the shared F13LD shading, family-agnostic, MIT side of the repo).

### Mobile is a filter list
- At ≤ 768 px the **design space is `display:none`** and WebGL never starts; the sidebar becomes an off-canvas panel; cards drop to two columns; the inspector stacks **below the entire card list**.

### Code shape
- One 306 KB file (≈ 1,750 lines CSS, 5,000 lines JS, 34 inline `style=` in the markup).
- Per-family detail text is an `if / else if` chain. Foam, Wave and Bundle are coming in the Ingest/Vault families pass, so a family registry is worth doing first.

---

## 2. Direction

1. **Same shell as Lab and Sweep** — header, panels, dock + drawer, tokens, drawn icons, Resolve splash, Field status.
2. **The design space stays the hero and becomes the main control** — pick a region, pick axes, fly to a design.
3. **Every design is seen, not just read** — real geometry in the inspector, on every card, and in hover tooltips.
4. **One home for filters** — the drawer; whatever is active shows as removable tags in the dock.
5. **One primary action, one place** — *Open in Mesh*, far right of the dock (where Run sits in Lab and Sweep).
6. **Mobile is designed, not degraded.**

**Accent:** `--vault #5BA4EE` for text and active marks on dark (≈ 7.6 : 1), with the brand navy `#0C447C` and tile `#E6F1FB` kept for filled buttons and the header icon — the same split Lab and Sweep use. Active controls are neon, per the Sweep decision.

---

## 3. Desktop layouts — pick one

### A · Observatory (recommended)
Same arrangement as Sweep layout A, so the two tools feel like one product.
```
┌ header: F13LD | VAULT | search (Ctrl K) ········ status | Queue Mesh Lab | v ┐
├──────────────────────────────────────────────┬───────────────────────────────┤
│  DESIGN SPACE (3D, hero)                     │  INSPECTOR                    │
│  orbit / brush · colour · reset · alive      │  live geometry (drag, zoom)   │
│                                              │  1 · 2 · 3 cells, prev / next │
│  X  Y  Z axis chips        legend + counts   │  6 metric tiles  |  radar     │
├──────────────────────────────────────────────┴───────────────────────────────┤
│  RESULTS   148 of 612 · sort · Gallery | Table                               │
│  [geom][geom][geom][geom][geom][geom][geom][geom]   cards with match ring    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Filters(3) | Domain Bio × | TPMS × | VF 15–35 × …  | 148 match | ▢▢▢▢ Compare | Open in Mesh │
└──────────────────────────────────────────────────────────────────────────────┘
```
Best when the question is *"where does this sit in the space?"* — which is what Vault is for.

### B · Gallery
Results take the left two-thirds as large geometry tiles; the design space and inspector stack on the right. Best for browsing by eye; the design space becomes a navigator rather than the hero.

---

## 4. Mobile
- **Design space full-screen** behind everything — one finger orbits, two fingers zoom, tap picks (larger hit radius).
- **Bottom sheet** with three stops (peek → half → full). The design space re-centres above the sheet so points are never hidden.
- **Tap a design** → the sheet opens on its geometry, match ring, six metric tiles, flag banner, actions, and *nearest in the design space*. Arrows step through results.
- **Filters full-screen** with the same sections stacked, larger slider handles, and a live **Show N designs** button.
- Domain and colour pills over the design space; Open in Mesh is the one primary button, thumb-reachable.

---

## 5. Features (numbers match the mockup's Callouts)

| # | Feature | Why | Wow | Effort |
|---|---|---|---|---|
| 6, 7 | **Geometry everywhere** — inspector raymarch (orbit, zoom, 1–3 cells), card thumbnails that "develop" in, hover tooltip previews | Lets people choose by what they see | High | M — reuse Sweep's `geom/` + preview (MIT), one shared GL context, thumbnail cache |
| — | **Resolve splash + Field status** | Suite consistency | Med | S — port from Lab `52-status.js` |
| — | **Fly-to selection** with sonar ring and lines to the 6 nearest designs | Shows neighbours, invites exploration | High | S |
| 3 | **Dim, don't hide** — filtered-out points fade to dust with an animated dissolve; live count ticker | Context of what you're excluding | High | S |
| 4 | **Brush a region** of the design space → becomes a removable *Region* filter | Turns the hero into a control | High | S |
| 5 | **Pickable axes** with points morphing to new positions; domain change re-ranks and morphs Z | Replaces the separate 2D scatter | High | S |
| 8 | **Dock tags + Filters drawer** — removable tags, "+n more" instead of overflow, chip counts show what each choice would leave | One home for filters | Med | M |
| — | **Range sliders over histograms** — bars light up for what still matches | Replaces the performance histogram | Med | S |
| 9 | **Compare tray** (4 slots) → Compare pane: side-by-side geometry, best-of highlighted, overlaid radar | Today's compare is text-only | High | M |
| 1 | **Command palette** (Ctrl K) — jump to designs, domains, metric filters, colour modes, actions | Speed for repeat users | Med | S |
| — | **Keyboard** — F filters, P pin, B brush, arrows step, G / T gallery or table, R reset, Esc | Seamless use | Low | S |
| — | **Shareable view links** — domain, filters, selection and camera in the URL | Papers, collaborators, Field Notes | Med | S |
| — | **Gallery / Table** — table drops optional columns when narrow (no horizontal scroll) | Sorting dense data | Low | S |
| — | **Flags visible, never hidden** — card flag, inspector banner, *Any / Unflagged / Flagged only* | Matches the 2026-10-08 decision | Low | S |
| — | **Build target** in the drawer — cell size and material turn every readout into µm, GPa, W/m·K | Keeps today's feature, one place | Low | S |
| 2 | **Shared header** — Queue · Mesh · Lab pills for the selected design | Suite consistency | Low | S |

**Retired:** left sidebar, hero shortcuts block (→ palette + tooltips), top-centre Pin button (→ inspector + P), right-rail 2D scatter and performance histogram (→ pickable axes and slider histograms), duplicate selection display.

**Mockup simplifications:** synthetic data; the geometry shader is a stand-in (TPMS exact, beams as periodic strut lines, grain as 8-wave spinodoid, foam as Voronoi walls). The real build would render each design from its stored recipe through Sweep's shared geometry code, so Vault shows exactly what Mesh will export.

---

## 6. Proposed build order

| Phase | Version | Scope |
|---|---|---|
| 0 | v0.5.0 | **Module split**, no visual change (numbered files like Lab / Sweep / Mesh), family registry for detail and recipe lines |
| 1 | v0.6.0 | **Shell + layout** for desktop and mobile — tokens, fonts, drawn icons, header pills, dock + drawer, chosen layout, bottom sheet, Resolve / Field |
| 2 | v0.7.0 | **Geometry** — Sweep's `geom/` + preview, worker baking, thumbnail cache, tooltip previews |
| 3 | v0.8.0 | **Interaction** — fly-to, brush, axis morph, compare pane, palette, shareable links |

Phase 0 before the Ingest/Vault families pass means Foam, Wave and Bundle land straight into the registry. The UI phases don't depend on the reseed; the synthetic-data mode used here can stay in the repo as a test harness, so you can click-test each phase without touching Supabase.

---

## 7. Questions for you

- Which desktop layout: A (Observatory, design space as hero) or B (Gallery, geometry tiles as hero)?
- Is it all right to drop the side 2D scatter and the performance histogram, now that the main design space has pickable axes and the range sliders carry histograms?
- Is the lighter blue in the mockup right for Vault's on-dark accent, with your navy kept for filled buttons — the same split as Lab's red and Sweep's amber?
- Should every card show its real geometry (best look, more rendering), or only the inspector and the hover preview?
- Do you want the module split as its own step first, as with Lab, Sweep and Mesh?
- Should brushing a region and shareable links be in the first build, or wait for a later pass?
- Should this UI work go before or after the Ingest / Vault families pass and the reseed?

---

## 8. Round 2 — changes from your review (2026-10-09)

| You said | What changed in the mockup |
|---|---|
| Need to pan the hero | **Ctrl-drag, right-drag or middle-drag pans** in the 3D view (two fingers on a phone). Drag still orbits, scroll zooms, Shift-drag brushes, double-click resets. A hint line under the title says so. |
| Lots of empty space in the hero | The hero is now **3D \| 2D side by side** (toolbar switch: 3D · Split · 2D). Split is the default on wide panes; panes under about 900 px start in 3D only. |
| Keep the 2D plot with selectable axes | The 2D plot is back and bigger: click either axis label to pick a metric; **real values with tick labels**; peak stiffness, shear and permeability on a **log scale**; histograms of what still matches along the top and right edges; the selected design gets crosshairs with its values on both axes. **Box-drag in 2D sets two range filters at once** (they appear as dock tags and in the drawer). Ctrl or right-drag pans, scroll zooms around the cursor. Hovering in either view highlights the same design in the other. The phone gets a 3D / 2D switch. |
| Compare text too small | Compare rebuilt: names 17 px, metric names 13 px, values 15 px with units, a bar per row scaled to the best of the set, a colour stripe per pinned design that matches its line on a larger radar, and a legend. Every other small label in the tool moved up one size too (smallest is now 10 px, most mono labels 11–12 px). |
| — | Fixed a mockup bug your screenshot showed: under *All applications* the Z axis was the same metric as X, so the cloud lay on a plane. It now uses an overall score. |

### Keeping thumbnails fast

Rendering a lattice is costly. The plan has three parts, and the first two are already working in the mockup.

1. **Each card is a picture, drawn once.** Only the inspector is live. Cards, compare columns and hover previews are rendered once into a small image (200 × 150) and then just shown. Nothing on the cards redraws every frame.
2. **Only what is on screen, a little per frame.**
   - Only cards in view (plus a small margin) are queued; scrolling away drops them from the queue.
   - The queue gets a few milliseconds per frame (9 on desktop, 6 on phones), so scrolling, filtering and orbiting never wait on it.
   - All renders share one graphics context. Browsers allow only about 16 at once, so one per card would fail.
3. **For the real build, keep the heavy work off the page.**
   - Turning a recipe into a field (the slow step) runs in background workers, at 32³ for thumbnails and 64³ for the inspector.
   - Images are cached in the browser, keyed by design id and recipe, so a second visit is instant.
   - **Best option:** F13LD.ingest renders each design's thumbnail once, when the design is uploaded (about 5–8 KB each, roughly 4 MB for 612 designs). Vault then just loads pictures, and rendering on your machine becomes the fallback. Since Vault is being wiped and reseeded anyway, this can land with the reseed.

**Measure it on your machine:** the mockup bar shows `thumbnails N drawn · avg ms · max ms · queued` live. Scroll the gallery, switch to table, change filters, and watch the numbers. The mockup's shader is a stand-in, so treat the numbers as the floor for the GPU part. Field baking in the real build is extra cost, and it runs off the page.

---

## 9. Critical review before building (2026-10-09)

An independent code read of the mockup plus my own pass. Nothing below is changed yet. Severity: **H** high, **M** medium.

### Must fix — would hurt real use

| # | Problem | Proposed fix |
|---|---|---|
| H1 | **No undo.** A stray 8 px drag in the 2D plot sets two filters; brushing, Clear all and changing domain can't be taken back. | Every filter change goes into a history. The toast gets an **Undo** button; Ctrl Z and Ctrl Shift Z step back and forward. |
| H2 | **The recipe is missing from the inspector.** Today's Vault shows mode, cell scale, pipe radius, seed and so on; the mockup shows only metrics. | Add a **Recipe** section: the key parameters per family, from a family registry, with copy. |
| H3 | **Cost grows with the database.** Both canvases and the inspector redraw every frame even when nothing moves. A slider drag re-counts every chip about 16 times per move, twice. At 10,000 designs this stutters. | Redraw only when something changes, so idle costs nothing. Production draws the points with WebGL; Vault already uses three.js. Count filters in one pass, once per frame, and update only the visible copy. The inspector renders only while it moves. The thumbnail cache is capped (about 300 images, oldest dropped first). |
| H4 | **Saved panel sizes can collapse a pane** after reloading in a smaller window. The 3D / 2D split is shared between layouts A and B. | Save sizes as fractions per layout, re-limited on load and on window resize. |
| H5 | **Mobile sheet:** at the half and peek stops the bottom of the list (and Open in Mesh) can't be scrolled into view. The top bar overflows 364 px. The inspector has no pinch zoom. Results stop at 40. | Pad the sheet body by its hidden height. Collapse the top bar into one pill plus a menu. Add pinch zoom. Load more results as you scroll. |
| H6 | **Single-key shortcuts fire with Ctrl / Cmd held.** Ctrl F, P, R and T both open the drawer, pin or reset *and* trigger the browser's find, print, reload or new tab. | Shortcuts ignore modified keys. |
| H7 | **Text still under your comfort level** in places: radar labels 8.5 px, pin numbers 9 px, several 10–10.5 px labels. | **12 px minimum** everywhere, including canvas text. |

### Should fix — consistency and clarity

- **3D and 2D look alike but measure differently.** 3D uses percentile ranks with no ticks; 2D uses real values. Label the 3D axes as *rank* with low / median / high ticks. Work out "nearest designs" in a fixed multi-metric space so it doesn't change when you swap axes.
- **Region filter is opaque.** It freezes a list of IDs and isn't in the drawer. Store it as a box in axis values, show and edit it in the drawer, and ask whether a second brush replaces or adds.
- **Dimmed points can't be hovered.** Let them be. The tooltip then says which filter excludes the design.
- **Sliders are linear for stiffness, shear and permeability.** Use log scale like the 2D plot, and follow Build target units (GPa, µm).
- **Compare "best" ignores the domain.** Under Biomedical the stiffest design isn't the best. Mark best by the domain's direction, and make bars read "longer is better".
- **Lime does too many jobs.** It currently marks pins, neighbours, hover, axes, brush, the Beam family and the top of the colour ramp. Keep lime for *active state* only, colour pins by their compare colour, and darken dimmed points so they don't read as Grain grey. Add a "shape by family" option so family isn't colour-only.
- **The drawer covers the hero while promising live updates.** Cap it near 45% height, with its own drag handle.
- **Table headers:** every column sortable with a direction toggle, plus hover definitions as in Sweep.
- **Keyboard and accessibility:**
  - cards and rows can be focused (Enter selects, P pins)
  - sliders respond to the arrow keys
  - visible focus rings
  - the palette keeps keyboard focus
- **Small bugs:**
  - double-click reset also selects a point
  - Reset spins the cloud several turns
  - Clear all leaves the 2D score axis stale
  - the inspector image stretches when the row height changes
  - 2D hover picks points hidden in the margins
  - the toolbar sits on the 2D histogram in narrow heroes
  - the copy link doesn't restore the view yet
  - the README still describes weighted targets that no longer exist

### New ideas — novelty that serves the work

| Idea | What it does | Effort |
|---|---|---|
| **Target pin** | Drop a target on the 2D plot (for example VF 30 %, E\* 0.05). Designs rank by distance to it and the match ring shows closeness. If nothing is near, Vault says so and offers **Explore around the nearest design in Sweep**, handing off its recipe. Vault becomes the front door to inverse design. | M |
| **Pareto front** | One click lights the Pareto-optimal designs on the current 2D axes and joins them with a glowing front line (Ashby-style selection). | S |
| **Gap map** | Density shading behind the 2D plot shows where the Vault is thin. Click a gap to seed a Sweep run there. Shows contributors where data is needed. | M |
| **Score breakdown** | A stacked bar in the inspector shows which metrics made up the domain score. | S |
| **"Why not?"** | With few or no matches, list which single filter brings back the most designs ("Removing VF 15–35 brings back 212"). | S |
| **Provenance strip** | Contributor, Sweep version, solver grid, Fast or Full, date and flags in the inspector — trust signals for a community database. | S |
| **Legend as a control** | Click a family in the legend to isolate it; hover lights that family in both views. | S |
| **Axis presets** | One-click 2D pairs per domain: stiffness vs density, permeability vs pore size, conductivity vs surface area. | S |
| **Shortlist to Queue** | Send the pinned set to F13LD.queue as a word-pair code, to pick up on another device or in Mesh. | S |
