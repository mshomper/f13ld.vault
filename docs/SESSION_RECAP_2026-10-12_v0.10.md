# F13LD.vault — session recap, 2026-10-12 · v0.10.0

`main` = **v0.10.0**, merged 2026-10-12 with Matt's go-ahead once the guide had
the gap map and aiming stops (he reviewed the mockups and said everything else
looked right). No database change; F13LD.sweep, ingest and mesh unchanged.

Design docs from this session: `docs/VARIABLE_CONSTRUCTOR_PROPOSAL.md`,
`docs/variable-constructor-mockup.html`, `docs/VAULT_TOUR_PROPOSAL.md`,
`docs/vault-tour-mockup.html`.

## My variables (`25-variables.js`, `67-variables-ui.js`)
- A variable = a formula over metric keys, computed for every design at load
  and whenever the Build load changes, registered as a metric in the group
  "My variables": axes (2D and 3D), colour, sort, range filters, correlation
  map, Compare (rows for variables with a "better" direction), metric key,
  inspector "All metrics", palette.
- Builder: drawer tab **Variables** (desktop; "Build target" tab renamed
  **Build**) or a full-height sheet (phone, from the view menu or any metric
  menu). Templates (Ratio, Per material, Density-scaled, Weakest axis, Rank
  blend, Distance to target); formula chips — tap to swap a metric or change a
  number; operators, Function, Number; commas fill themselves in inside
  min / max / mean; plain-language errors that outline the chips involved.
- Metric picker: search, group filters, count; retired metrics are inputs
  (still in the data); **domain score and scarcity are not** (Matt).
- Shape preview, small and stylized: range + median, 64 px spread ridge,
  168 px dot cloud against any metric with a median trend, top three.
- Duplicate check: rank correlation ≥ 0.995 with any metric in the menu →
  "Moves in lockstep with … — Use it instead".
- **New variable…** is the first item in every metric menu (3D / 2D axes,
  colour, sort); saving puts the variable straight onto that axis or setting.
- Saved per browser (`f13ld.vault.variables.v1`, cap 24). Export / import
  `f13ld-vault-variables.json`. Share links carry the definitions the view
  uses (`#v=` field `u`); opening one adds them for that view with a Keep
  toast. Community sharing later, with review before publishing (Matt — free
  names need moderation).
- Delete is blocked while another variable uses it; deleting resets any axis,
  colour, sort or filter on it, and undo can't bring a deleted range back.
- Not targetable by Aim Sweep (Sweep can't compute the formula).

## The tour (`68-tour.js`)
- Stops: read a design · pin · compare · filters · build · variables · axes
  (try: New variable…) · **gap map** (try: turn it on) · **aim Sweep at a gap**
  (try: drop a target) · take it further (Mesh, Lab, Sweep, Queue, Download) ·
  done. Phone: 9 stops (no Compare or Build pane there), its own targets and
  wording.
- Ring + card; desktop card beside the control, phone card as a bottom sheet
  with the control scrolled into the results sheet above it (scrolling only
  `#mBody` — `scrollIntoView` scrolled the fixed app frame).
- Offered from the welcome guide's last step ("Show me around · 3 min"), once
  to returning users who finished the old guide (Matt), and from the header
  guide button (now a menu: Tour / Welcome guide again), the palette and the
  phone view menu. Escape ends it. State in `f13ld.vault.tour.v1`.

## Checks
- `node tests/smoke.js`: 0 errors, with new steps for variables (template →
  axis, values, duplicate, commas, errors, colour / sort / range, share link
  round trip, delete, undo, edit, dependency block, self-reference) and the
  tour (all stops and try-its, offer, guide button, phone).
- `tests/bake-check.js`: `grain-reactiondiff` fails as it does on `main`
  (deferred in geom) — pre-existing.
- Real Chrome (VM, swiftshader) on the new pieces at 1280 × 760 and
  390 × 844 @3×: builder, picker and every tour stop — no text under 12 px,
  no overlaps, no sideways scroll, ring and card never overlap, no page
  errors. The full four-size `npm run audit` is too slow on the VM — run it on
  Matt's machine.

## Next
- Run `npm run audit` locally.
- Phase 2 ideas: send a variable's formula to Sweep so it can be aimed at;
  community variables with a review queue.
