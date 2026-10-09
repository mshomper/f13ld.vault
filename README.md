# F13LD.vault

The community metamaterial library of the [F13LD](https://f13ld.app) suite.
Every record is a design from [F13LD.sweep](https://mshomper.github.io/f13ld.sweep):
its full recipe plus homogenised mechanical, thermal and transport results.
Vault lets you see the whole population at once, narrow it to what your part
needs, compare candidates, and send the winner on to Mesh, Lab or Sweep.

**[Open F13LD.vault](https://mshomper.github.io/f13ld.vault)** ·
[sample data, no network](https://mshomper.github.io/f13ld.vault/?mock)

---

## What you can do

**See the design space**
- **3D design space**: every design is a point, with axes ranked within the population.
  Drag to orbit; Ctrl-, right- or middle-drag to pan; scroll to zoom; Shift-drag to brush a region.
- **2D plot**: real values with log axes where a metric spans decades, and pickable axes.
  Drag a box to set two range filters. You can also drop a **target** so results rank by closeness.
  The plot can show the **Pareto front** and a **gap map** of where the library has holes.
- **Split view**: the 3D design space and the 2D plot side by side. Every panel boundary is resizable.

**Narrow it down**
- **Application domains** (biomedical, aerospace, automotive, oil & gas, thermal) re-rank everything by that domain's score.
- **Filters**: family, connectivity, solver grid, stiffness flag, percolation per axis, contributor, and range sliders.
  Each slider has a histogram of what is still in play. Chips show what-if counts before you click.
- **"Why not"**: when nothing matches, Vault says which filter is excluding the most designs and offers to lift it.
- **Undo / redo** for every filter change (Ctrl Z · Ctrl Shift Z), and a **share link** that restores the whole view.

**Look closely**
- **Geometry previews** on every card, raymarched on the GPU from the recipe itself.
  Thumbnails bake only for cards on screen, in background workers, and are cached in the browser.
- **Inspector**: an orbitable 1–3 cell preview, percentile tiles, a radar signature, the domain score broken into its factors, the recipe and its provenance.
- **Compare**: pin up to four designs. Bars and the best value follow the current domain.
- **Build target**: enter your material and cell size, and every value reads in absolute units.
- **Metric key**: a plain-language definition of every metric.

**Hand off**
- **Open in Mesh** or **Open in Lab** (link handoff). **Explore in Sweep** (recipe download plus open). **Send to Queue**. Download the recipe JSON.

**Keyboard**: Ctrl K command palette · F filters · P pin · arrow keys step through results · G / T gallery or table · R reset views · ? all shortcuts.

**Phone**: a full layout with a bottom sheet, swipeable results and an inspector view.

---

## Running locally

It's a static site with no build step. Serve the folder and open `index.html`:

```
python -m http.server 8765      # http://localhost:8765/?mock for sample data
```

Previews need http (not `file://`) for the bake workers, and a browser with WebGL2.

### Checks

```
npm install       # once
npm test          # headless smoke test of the whole page + geometry bake check
npm run audit     # real Chrome at 3 desktop sizes + 1 phone size:
                  # text under 12 px, text overlap, page errors, screenshots
```

## Privacy

Vault reads only the named columns it displays. Contributor contact details are
never requested.

## License

MIT. The `geom/` geometry files are copied from F13LD.sweep, which is MIT.
