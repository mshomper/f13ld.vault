# F13LD.vault — where the variable constructor lives, and the extended tour

**Built in v0.10.0** — see `docs/SESSION_RECAP_2026-10-12_v0.10.md`. The tour offers itself once to returning users who finished the old guide (Matt).

Companion mockup: `docs/vault-tour-mockup.html` (offline, stand-in layout and data).
Constructor detail: `docs/VARIABLE_CONSTRUCTOR_PROPOSAL.md`, `docs/variable-constructor-mockup.html`.

## 1. Where the constructor lives

**Home: a fifth drawer tab, Variables**, between Compare and Metric key:
Filters · Build target · Compare · **Variables** · Metric key.
The drawer is where every "set it up once, use it everywhere" tool already
sits, and it's one tap from the dock's Filters button.

**Ways in** (no hunting required):

| Where | What the user does |
|---|---|
| Every metric menu — 3D axes, 2D axes, Colour, Sort, Add a range filter | **New variable…** is the first item; saved variables are a "My variables" group above the built-in groups |
| Drawer | Variables tab |
| Command palette (Ctrl K) | "New variable", "Edit ‹name›" |
| Metric key | My variables listed at the top with their formulas |
| Phone | The same "New variable…" in every metric menu, and "My variables…" in the view menu; the builder opens as a full-height sheet |

Picking **New variable…** from an axis menu opens the builder with that axis
remembered, so Save puts the new variable straight onto that axis.

**Drawer width:** five tabs wrap to two rows at the current 400 px drawer
(see the mockup). Options: shorten "Build target" to "Build", or icons with
labels only on the active tab. Recommend the shorter label.

## 2. The extended tour

Today the guide stops after step 3 (top 24 for your domain). The new tour
continues from that card with **"Show me around · 2 min"** (or "Not now").
It highlights the real control, explains it in two sentences, and on three
stops asks the user to **try it** (with a "Do it" shortcut).

| # | Stop | Highlights | Try it |
|---|---|---|---|
| 1 | Read a design | Inspector — geometry, numbers, score breakdown | Tap another card |
| 2 | Pin the ones you like | Pin button | Pin this design |
| 3 | Compare side by side | Drawer · Compare (opens it) | — |
| 4 | Narrow it down | Drawer · Filters — domain, families, ranges, "why not" | — |
| 5 | Your build, any time | Drawer · Build target | — |
| 6 | Make your own metric | Drawer · Variables | — |
| 7 | Plot anything against anything | Axis chips | Tap the Y axis → New variable… |
| 8 | Find the holes | Gap map button | Turn on the gap map |
| 9 | Aim Sweep at a gap | 2D Target tool → Aim Sweep banner | Drop a target |
| 10 | Take a design further | Mesh · Lab · Queue pills (+ inspector Sweep / Download) | — |
| 11 | That's the tour | Guide button; Ctrl K on desktop | — |

Stops 8 and 9 were added at Matt's request (2026-10-12) — the gap map and aiming go hand in hand. Stop 10 lists what each hand-off does: **Mesh** — a watertight, print-ready
3MF at your cell size; **Lab** — a full solve to verify stiffness, yield and
buckling; **Sweep** — explore around it, or aim at a target; **Queue** —
collect designs across devices with a word-pair code; **Download** — the
recipe file for any F13LD tool.

**Behaviour**
- End tour any time; Back and Next; progress dots.
- Desktop: the card sits beside the highlighted control. Phone: the card is a
  sheet above the dock and the page scrolls the control to the top, so the
  two never overlap; tall panels highlight their top part only.
- Each stop has its own desktop and phone target (the real phone layout puts
  the inspector, filters and drawer in different places from desktop).
- Stored separately from the welcome guide: finishing or ending the tour
  doesn't bring back the welcome; the **guide button** offers "Start over"
  and "Tour only".
- Not shown on deep links (shared views, hand-offs), same as the guide.

## 3. A naming clash to settle

In F13LD a **recipe** is a design's file (what Mesh, Lab and Sweep open). The
constructor mockup used "recipes" for saved formulas too — "My recipes",
"Start from a recipe". With the tour now teaching design recipes, that will
confuse. Proposed: **variables** for saved formulas ("My variables",
"Save variable") and **templates** for the starting pills.

## Build order

1. Variables tab + metric-menu entries + palette (constructor work, v0.10.0).
2. Tour engine (ring, card, per-layout targets, try-it hooks) in
   `65-welcome.js`, steps 1–9, desktop and phone.
3. Render audit at four sizes including phone density, every tour stop.
