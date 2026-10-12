# F13LD.vault — Variable constructor (proposal, v0.10.0)

Let users build their own metrics from the ones Vault already has, then use
them anywhere a built-in metric works: 2D and 3D axes, colour, sort, range
filters, the correlation map, inspector tiles and Compare.

Companion mockup: `docs/variable-constructor-mockup.html` (works offline, synthetic data).

## Why it fits the current code

Every metric in Vault — stored columns and derived ones like `_beff`, `_nexp`,
`_hs` — is a value on each design object plus one entry in `METRIC_MAP`
(`10-metrics.js`). `computeStat` gives it a range, log-axis choice and
histogram, and every picker reads `pickableMetrics()`. A user variable is
registered the same way, so it reaches every picker without touching each one.

## What the user sees

**Constructor panel** (desktop: drawer tab or modal; phone: full-height sheet)

1. **Starting recipes** in one row of small pills — Ratio, Per material
   (÷ VF), Density-scaled (÷ ρⁿ), Axis balance, Rank blend, Distance to target.
2. **Formula bar** (rev 2, Matt 2026-10-12: more succinct). One line of
   chips — metrics in blue (short name, full name on hover), numbers in amber;
   tap a chip to swap or change it. One toolbar under it: Metric (searchable
   popover), the operators, Function (popover with a one-line meaning each),
   Number, remove-last, clear. No keypad, no always-open metric list.
3. **Shape preview** (rev 2: small and stylized — an impression of the trend,
   not a full plot): range and median in one line, a 64 px density ridge with
   the median marked, a 168 px dot cloud against any metric with a median
   trend line, and the top three designs. Plain-language error under the
   formula ("A bracket is not closed", "“Pore” is not a metric").
4. **Name, short label, axis scale** (Auto / Linear / Log), **which way is
   better** (Higher / Lower / Neither — drives Compare's "best" marks).
5. **Save**, or **Save and plot on 2D Y**.

**My recipes** list: edit, duplicate, delete (blocked if another recipe
uses it), export to / import from a `.json` file. **Saved per browser**
(Matt 2026-10-12).

**Every metric menu** gains a "New variable…" entry at the top and a
"My variables" group above Derived. Command palette: "New variable",
"Edit <name>".

## Formula language

- Operators `+ − × ÷ ^`, brackets, numbers.
- Functions: `abs`, `sqrt`, `log10`, `ln`, `min`, `max`, `mean`,
  `rank` (0–1 percentile over the loaded designs), `scale` (0–1 min–max).
- Inputs: any metric, including retired ones (still in the data) and other
  saved variables (no loops).
- A design whose inputs are missing, or that hits ÷ 0 or log of ≤ 0, is left
  empty — the same treatment missing metrics get today.
- Values are the ones Vault stores: stiffness as a fraction of the solid,
  pore and throat as a fraction of the cell, VF in %, strain in real με
  under the Build target load. The chip tooltip shows the unit basis.

## How it is built

| Piece | Where |
|---|---|
| Parser + evaluator: tokenize → tree → evaluated for all designs in one pass (`rank` / `scale` need the whole set). **No `eval`** — formulas from share links and files are only ever data | new `25-variables.js` |
| Registry: each variable gets key `~u<id>`, group "My variables", label, short, `better`, scale override; `computeStat` runs on it | `25-variables.js`, `10-metrics.js` hook |
| Recompute triggers: on load; Build target change if it uses strain; domain change if it uses score or scarcity; when an input variable changes | `11-data.js` `loadChanged`, `21-actions.js` `domainChanged` |
| Storage: `f13ld.vault.variables.v1` in this browser (the mockup already saves and reloads there) | `00-config.js`, `13-state.js` |
| Share link: `#v=` gains `u: [{name, short, formula, scale, better}]` for variables the view uses. Opening a link offers **Add to my variables** or **Just for this view** | `13-state.js` |
| Constructor UI (desktop + phone sheet). Charts size from a fixed display height, never from the canvas attribute (rev 1 bug: the chart grew 3× per redraw on phone screens) | new `67-constructor.js`, `vault.css`, `80-mobile.js` |
| Menu entries, palette, inspector tiles, Compare goals | `60-dock.js`, `63-palette.js`, `51-inspector.js`, `52-compare.js` |
| Tests: parser cases (precedence, errors, empties), smoke test builds and plots a variable, render audit on the new sheet | `tests/` |

## Limits for this pass

- **Aim Sweep cannot target a user variable** — Sweep can't compute the
  formula. Shown greyed with that reason. Phase 2 could send the formula with
  the `&t=` payload so Sweep evaluates it too.
- Recipes are personal: this browser, share links and files.
- **Community recipes — later, with review** (Matt 2026-10-12). Free-text
  names can be inappropriate, so a shared recipe would be submitted to a
  pending queue and appear for everyone only after approval. Needs a new
  Supabase table (pending / approved) and a review step; the mockup shows it
  as a "later, reviewed" note only.
- Cap of 24 saved variables.

## Effort

About one session: parser and registry first (testable on `?mock`), then the
constructor UI, then share links and phone layout, then click-test.
