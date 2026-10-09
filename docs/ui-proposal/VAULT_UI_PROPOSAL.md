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
