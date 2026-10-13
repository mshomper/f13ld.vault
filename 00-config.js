/* ============================================================
   F13LD.vault · 00-config.js
   Version, endpoints, tuning constants.

   Classic scripts share one global scope and load in numeric order
   (see index.html). Top-level code may only use names defined in the
   same or a lower-numbered file.
   ============================================================ */

var VAULT_VERSION = '0.10.0';

var SUPABASE_URL = 'https://axinljpecycnvfncyhfs.supabase.co';
var SUPABASE_KEY = 'sb_publishable_DAlrNLqbUZiwkaA6wPSMIw_YUNY85LX';
var VAULT_TABLE  = 'f13ld_designs';

var MESH_URL  = 'https://mshomper.github.io/f13ld.mesh/';
var LAB_URL   = 'https://mshomper.github.io/f13ld.lab/';
var SWEEP_URL = 'https://mshomper.github.io/f13ld.sweep/';
/* v0.7.0 — testing a Sweep branch: ?sweep=<url> (raw.githack.com, GitHub Pages or a local server only) */
try {
  var _sweepQ = new URLSearchParams(location.search).get('sweep');
  if (_sweepQ && /^(https:\/\/(raw\.githack\.com|mshomper\.github\.io)\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/)/.test(_sweepQ)) SWEEP_URL = _sweepQ;
} catch (e) { /* no URLSearchParams: keep the default */ }
var QUEUE_JS  = 'https://mshomper.github.io/f13ld.queue/f13ld-queue.js';
var HANDOFF_URL_MAX = 2000000;            /* past this a recipe is copied instead of linked */

/* Columns read from the table. contributor_contact is deliberately left out:
   it is a private field and the page never shows it. If the table lacks a
   listed column the load falls back to select=* (11-data.js). */
var VAULT_COLUMNS = [
  'id', 'created_at', 'content_hash', 'schema_version', 'family', 'source_tool', 'source_version', 'exported_at', 'preset', 'solver',
  'contributor_name', 'contributor_notes', 'domain', 'material', 'e_solid_gpa', 'sigma_ref_gpa', 'cell_size_mm',
  'volume_fraction', 'connect_idx', 'perc_idx', 'stiff_axis', 'anisotropy', 'directionality', 'ortho_contrast', 'aniso_efficiency', 'surface_complexity',
  'ex_norm', 'ey_norm', 'ez_norm', 'stiffness_density_norm',
  'keff_x_norm', 'keff_y_norm', 'keff_z_norm', 'keff_max_norm', 'keff_avg_norm', 'thermal_anisotropy',
  'microstrain_x_per_gpa', 'microstrain_y_per_gpa', 'microstrain_z_per_gpa', 'microstrain_avg_per_gpa', 'u_compliance',
  'pore_size_norm', 'pore_size_p10_norm', 'pore_size_p50_norm', 'pore_size_p90_norm', 'pore_size_cv', 'throat_size_norm', 'throat_ratio',
  'h_mean', 'h_mean_abs', 'h_std', 'k_gauss_mean', 'curvature_uniformity', 'mih', 'genus_per_cell',
  'tortuosity_min', 'tortuosity_avg', 'd_eff_max_norm', 'd_eff_avg_norm',
  'linear_cap_active', 'linear_cap_kind', 'degenerate', 'solver_validity', 'cg_iters', 'cg_converged',
  'metrics_extended', 'recipe'
];

/* Geometry previews */
var THUMB_N       = 32;     /* field resolution baked for a card thumbnail */
var INSPECT_N     = 56;     /* … for the live inspector */
var THUMB_W       = 240, THUMB_H = 180;
var THUMB_LRU     = 320;    /* thumbnails held in memory */
var THUMB_IDB     = 'f13ld.vault.thumbs';
var THUMB_IDB_VER = 'v1';   /* bump when the preview shading changes, to retire cached images */

/* Results */
var PAGE_SIZE   = 60;
var MOBILE_PAGE = 40;

/* Storage keys (all wrapped in try/catch — the page works without storage) */
var LS_PREFS  = 'f13ld.vault.prefs.v2';
var LS_SPLITS = 'f13ld.vault.splits.v2';
var LS_BIO_SKIP = 'f13ld.vault.bioSkip.v1';      /* v0.6: "Not now" on the Biomedical card */
var LS_BUILD  = 'f13ld.vault.globalInputs.v1';   /* same key as v0.4 so build targets carry over */
