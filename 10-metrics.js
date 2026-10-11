/* ============================================================
   F13LD.vault · 10-metrics.js
   What every column means, how it resolves to absolute units, the
   application domains and their compound scores. The blocks marked
   "from v0.4" are carried over unchanged from the single-file Vault so
   the science does not move with the UI rewrite; the additions below
   them (derived metrics, log scales, score breakdown, axis presets,
   per-family recipe lines) are new in v0.5.
   ============================================================ */

/* ── from v0.4: metric list ────────────────────────────────────────────── */
const ALL_METRICS = [
  // Geometry & connectivity (rollups; per-axis booleans live in metrics_extended)
  // v4: load_path_eff dropped (sweep v0.13 — redundant with stiffness_density_norm).
  // surface_complexity is now uncapped raw — vault percentile-ranks at display time.
  { group:'Geometry',   key:'volume_fraction',         label:'Volume fraction',           unit:'%'  },
  { group:'Geometry',   key:'connect_idx',             label:'Solid connectivity κ',      unit:''   },
  { group:'Geometry',   key:'perc_idx',                label:'Void percolation',          unit:''   },
  { group:'Geometry',   key:'anisotropy',              label:'Axial anisotropy',          unit:'×'  },
  { group:'Geometry',   key:'directionality',          label:'Directionality Ψ',          unit:''   },
  { group:'Geometry',   key:'ortho_contrast',          label:'Ortho contrast Ω',          unit:'',  retired:true },   /* v0.9.0: same three numbers as anisotropy; A^U replaces it */
  { group:'Geometry',   key:'aniso_efficiency',        label:'Aniso efficiency α/ρ',      unit:'',  retired:true },   /* v0.9.0: a ratio over density has no physical meaning */
  { group:'Geometry',   key:'surface_complexity',      label:'Surface complexity (voxel faces)', unit:'',  displayMode:'rank' },

  // Stiffness — Es-decoupled (norm = fraction of solid Young's modulus)
  { group:'Stiffness',  key:'ex_norm',                 label:'Stiffness Ex / Es',         labelAbs:'Stiffness Ex',     unit:'',  norm_kind:'modulus_es'        },
  { group:'Stiffness',  key:'ey_norm',                 label:'Stiffness Ey / Es',         labelAbs:'Stiffness Ey',     unit:'',  norm_kind:'modulus_es'        },
  { group:'Stiffness',  key:'ez_norm',                 label:'Stiffness Ez / Es',         labelAbs:'Stiffness Ez',     unit:'',  norm_kind:'modulus_es'        },
  { group:'Stiffness',  key:'stiffness_density_norm',  label:'Voigt efficiency (mean axis)',     labelAbs:'Specific stiffness',unit:'', norm_kind:'stiffness_density'},

  // v0.4.0 — shear moduli (Sweep v0.24+ GPU solver). Stored in metrics_extended
  // (Gyz_norm / Gxz_norm / Gxy_norm) and lifted onto each design in loadDatabase.
  // Empty for CPU-solved or older designs.
  { group:'Shear',      key:'gyz_norm',                label:'Shear Gyz / Es',            labelAbs:'Shear Gyz',        unit:'',  norm_kind:'modulus_es'        },
  { group:'Shear',      key:'gxz_norm',                label:'Shear Gxz / Es',            labelAbs:'Shear Gxz',        unit:'',  norm_kind:'modulus_es'        },
  { group:'Shear',      key:'gxy_norm',                label:'Shear Gxy / Es',            labelAbs:'Shear Gxy',        unit:'',  norm_kind:'modulus_es'        },

  // Thermal — ks-decoupled. v4 adds keff_max/avg_norm rollups.
  { group:'Thermal',    key:'keff_x_norm',             label:'Thermal cond. kx / ks',     labelAbs:'Thermal kx',       unit:'',  norm_kind:'thermal_ks'        },
  { group:'Thermal',    key:'keff_y_norm',             label:'Thermal cond. ky / ks',     labelAbs:'Thermal ky',       unit:'',  norm_kind:'thermal_ks'        },
  { group:'Thermal',    key:'keff_z_norm',             label:'Thermal cond. kz / ks',     labelAbs:'Thermal kz',       unit:'',  norm_kind:'thermal_ks'        },
  { group:'Thermal',    key:'keff_max_norm',           label:'Thermal cond. (best axis)', labelAbs:'Thermal (best)',   unit:'',  norm_kind:'thermal_ks'        },
  { group:'Thermal',    key:'keff_avg_norm',           label:'Thermal cond. (avg) / ks',  labelAbs:'Thermal (avg)',    unit:'',  norm_kind:'thermal_ks'        },
  { group:'Thermal',    key:'thermal_anisotropy',      label:'Thermal anisotropy kα',     unit:'×'  },

  // Compliance — load-decoupled (NULL when linear_cap_active=true; treated as 0 in radar)
  /* v0.6: these hold real values under the Build target load (11-data applyLoad);
     with no load they are empty, so strain is hidden everywhere. */
  { group:'Compliance', key:'microstrain_x_per_gpa',   label:'μstrain X',                 labelAbs:'μstrain X',        unit:'με',     norm_kind:'compliance_per_stress' },
  { group:'Compliance', key:'microstrain_y_per_gpa',   label:'μstrain Y',                 labelAbs:'μstrain Y',        unit:'με',     norm_kind:'compliance_per_stress' },
  { group:'Compliance', key:'microstrain_z_per_gpa',   label:'μstrain Z',                 labelAbs:'μstrain Z',        unit:'με',     norm_kind:'compliance_per_stress' },
  { group:'Compliance', key:'microstrain_avg_per_gpa', label:'μstrain (avg)',             labelAbs:'μstrain (avg)',    unit:'με',     norm_kind:'compliance_per_stress' },
  { group:'Compliance', key:'u_compliance',            label:'Strain energy U',           labelAbs:'Strain energy U',  unit:'kJ/m³',  norm_kind:'compliance_per_stress2', retired:true },   /* v0.9.0: σε/2 — strain in other units */

  // Pore structure — cell-decoupled. v4: throat_efficiency dropped, throat_ratio added.
  { group:'Pore',       key:'pore_size_norm',          label:'Mean pore φ / cell',        labelAbs:'Mean pore φ',      unit:'',  norm_kind:'cell_length' },
  { group:'Pore',       key:'pore_size_p10_norm',      label:'Pore P10 / cell',           labelAbs:'Pore P10',         unit:'',  norm_kind:'cell_length' },
  { group:'Pore',       key:'pore_size_p50_norm',      label:'Pore P50 / cell',           labelAbs:'Pore P50',         unit:'',  norm_kind:'cell_length' },
  { group:'Pore',       key:'pore_size_p90_norm',      label:'Pore P90 / cell',           labelAbs:'Pore P90',         unit:'',  norm_kind:'cell_length' },
  { group:'Pore',       key:'pore_size_cv',            label:'Pore size CV',              unit:''   },
  { group:'Pore',       key:'throat_size_norm',        label:'Throat / cell',             labelAbs:'Throat size',      unit:'',  norm_kind:'cell_length' },
  { group:'Pore',       key:'throat_ratio',            label:'Throat ratio (stored)',     unit:'',  retired:true },   /* v0.9.0: Sweep ≤ 0.29 stores throat ÷ cell here; _tp is throat ÷ pore */

  // Curvature. v4: h_mean is now SIGNED (>0 convex-outward); h_mean_abs / h_std are new raw fields.
  // curvature_uniformity is smooth (1/(1+σ/⟨|H|⟩)), never floors.
  { group:'Curvature',  key:'h_mean',                  label:'Mean curvature H̄ (signed)', unit:'mm⁻¹'  , retired:true },
  { group:'Curvature',  key:'h_mean_abs',              label:'Mean curvature |H̄|',        unit:'mm⁻¹'  , retired:true },
  { group:'Curvature',  key:'h_std',                   label:'Curvature std σ(H)',        unit:'mm⁻¹'  , retired:true },
  { group:'Curvature',  key:'k_gauss_mean',            label:'Gaussian curvature K',      unit:'mm⁻²'  , retired:true },
  { group:'Curvature',  key:'curvature_uniformity',    label:'Curvature uniformity',      unit:''      },
  { group:'Curvature',  key:'mih',                     label:'Mean integrated curvature', unit:'mm', retired:true },

  // Topology
  { group:'Topology',   key:'genus_per_cell',          label:'Genus per cell',            unit:''  },

  // Transport — rollups; per-axis values live in metrics_extended
  { group:'Transport',  key:'tortuosity_min',          label:'Tortuosity (min axis)',     unit:''   },
  { group:'Transport',  key:'tortuosity_avg',          label:'Tortuosity (avg)',          unit:''   },
  { group:'Transport',  key:'d_eff_max_norm',          label:'D_eff (max axis) / D₀',     unit:''   },
  { group:'Transport',  key:'d_eff_avg_norm',          label:'D_eff (avg) / D₀',          unit:''   },
];

const METRIC_MAP = {};
ALL_METRICS.forEach(m => METRIC_MAP[m.key] = m);

/* ── from v0.4: build target (material card, cell size, reference stress) ─ */
const MATERIAL_PRESETS = {
  ti6al4v:   { label:'Ti-6Al-4V',     group:'Titanium',    E:110, rho:4.43, k:7.0 },
  ss316l:    { label:'316L SS',       group:'Stainless',   E:195, rho:8.00, k:14  },
  ss174ph:   { label:'17-4PH SS',     group:'Stainless',   E:197, rho:7.80, k:18  },
  h13:       { label:'H13 Tool Steel',group:'Tool steel',  E:210, rho:7.80, k:28.6},
  al6061:    { label:'Al 6061',       group:'Aluminum',    E:69,  rho:2.70, k:167 },
  alsi10mg:  { label:'AlSi10Mg',      group:'Aluminum',    E:70,  rho:2.67, k:130 },
  in718:     { label:'Inconel 718',   group:'Nickel',      E:200, rho:8.19, k:11.4},
  peek:      { label:'PEEK',          group:'Polymer',     E:3.6, rho:1.32, k:0.25},
  pekk:      { label:'PEKK',          group:'Polymer',     E:4.5, rho:1.30, k:0.22},
};

// Mutable user inputs. null = empty = "use normalized display for that family".
var GLOBAL_INPUTS_STORAGE_KEY = LS_BUILD;
var globalInputs = {
  cell_size_mm:   null,   // unlocks cell_length metrics → μm
  material_id:    'custom', // dropdown selection; 'custom' = manual E/rho/k below
  modulus_gpa:    null,   // unlocks modulus_es, stiffness_density (with rho)
  density_gcc:    null,   // unlocks stiffness_density (with E)
  thermal_k_wmk:  null,   // unlocks thermal_ks metrics
  ref_stress_mpa: null,   // unlocks compliance_per_stress metrics
  strain_lo:      1000,   // v0.6: bone-forming window (Frost-style), με
  strain_hi:      3500,
  pore_lo:        300,    // v0.9.0: bone-ingrowth pore window on the mean pore diameter, µm
  pore_hi:        600,
};
// Restore from localStorage on load (tolerant to schema drift).
try {
  const saved = JSON.parse(localStorage.getItem(GLOBAL_INPUTS_STORAGE_KEY) || 'null');
  if(saved && typeof saved === 'object'){
    Object.keys(globalInputs).forEach(k => {
      if(k in saved) globalInputs[k] = saved[k];
    });
  }
} catch(_e){ /* corrupt localStorage — ignore */ }

function persistGlobalInputs(){
  try { localStorage.setItem(GLOBAL_INPUTS_STORAGE_KEY, JSON.stringify(globalInputs)); }
  catch(_e){ /* quota / privacy mode — non-fatal */ }
}

// ─── Resolution ──────────────────────────────────────────────────────────
// Returns {value, unit, isResolved, rawValue} for a normalized metric value.
// `value` is a formatted string ready for display. `isResolved` is true when
// the global inputs filled in are sufficient to convert this metric.
function resolveValue(rawNorm, key){
  const meta = METRIC_MAP[key];
  const fallback = {
    value: rawNorm == null ? '—' : fmtV(rawNorm, key),
    unit: meta?.unit || '',
    isResolved: false,
    rawValue: rawNorm,
  };
  if(rawNorm == null || !isFinite(rawNorm) || !meta) return fallback;
  const nk = meta.norm_kind;
  if(!nk || nk === 'none') return fallback;

  switch(nk){
    case 'cell_length': {
      const cs = globalInputs.cell_size_mm;
      if(cs == null || !isFinite(cs) || cs <= 0) return fallback;
      const um = rawNorm * cs * 1000;
      return { value: um.toFixed(0), unit: 'μm', isResolved: true, rawValue: rawNorm };
    }
    case 'modulus_es': {
      const Es = globalInputs.modulus_gpa;
      if(Es == null || !isFinite(Es) || Es <= 0) return fallback;
      const E = rawNorm * Es;
      return { value: E < 1 ? E.toFixed(3) : E.toFixed(2), unit: 'GPa', isResolved: true, rawValue: rawNorm };
    }
    case 'stiffness_density': {
      const Es = globalInputs.modulus_gpa, rs = globalInputs.density_gcc;
      if(Es == null || rs == null || !isFinite(Es) || !isFinite(rs) || rs <= 0) return fallback;
      const sd = rawNorm * Es / rs;
      return { value: sd.toFixed(2), unit: 'GPa·cm³/g', isResolved: true, rawValue: rawNorm };
    }
    case 'thermal_ks': {
      const ks = globalInputs.thermal_k_wmk;
      if(ks == null || !isFinite(ks) || ks <= 0) return fallback;
      const k = rawNorm * ks;
      return { value: k < 1 ? k.toFixed(3) : k.toFixed(2), unit: 'W/m·K', isResolved: true, rawValue: rawNorm };
    }
    case 'compliance_per_stress': {
      // v0.6: the value is already real microstrain under the Build target
      // load (11-data applyLoad). Empty when no load is entered.
      if(rawNorm == null || !isFinite(rawNorm)) return fallback;
      return { value: Math.round(rawNorm).toLocaleString('en-US'), unit: 'με', isResolved: true, rawValue: rawNorm };
    }
    case 'compliance_per_stress2': {
      // v0.6: already real strain energy density, kJ/m³ (11-data applyLoad).
      if(rawNorm == null || !isFinite(rawNorm)) return fallback;
      return { value: rawNorm < 1 ? rawNorm.toFixed(3) : rawNorm.toFixed(1), unit: 'kJ/m³', isResolved: true, rawValue: rawNorm };
    }
    default:
      return fallback;
  }
}

// Display label for a metric — uses `labelAbs` override when the metric is resolved
// to an absolute quantity (drops the "/ cell", "/ Es" suffixes that are misleading
// once the value is no longer a ratio). Falls back to the original `label`.
function resolveLabel(key, isResolved){
  const meta = METRIC_MAP[key];
  if(!meta) return key;
  if(isResolved && meta.labelAbs) return meta.labelAbs;
  return meta.label;
}

// True when ANY input is set. Used to disable the global "reset" affordance
// when nothing is to reset, and to gate the active-count badge.
/* v0.6: strain needs both a load and a solid modulus */
function hasLoad(){
  var g = globalInputs; return isFinite(g.ref_stress_mpa) && g.ref_stress_mpa > 0 && isFinite(g.modulus_gpa) && g.modulus_gpa > 0;
}
/* The bone-forming window, in με (Build target; defaults 1,000–3,500). */
function bioWindow(){
  var lo = isFinite(globalInputs.strain_lo) && globalInputs.strain_lo > 0 ? globalInputs.strain_lo : 1000;
  var hi = isFinite(globalInputs.strain_hi) && globalInputs.strain_hi > lo ? globalInputs.strain_hi : Math.max(3500, lo * 1.5);
  return [lo, hi];
}
/* Plateau window: full marks inside [lo, hi], a soft log-space fall-off
   outside (half marks at about 1.6× beyond either edge). hi = Infinity
   makes it a one-sided gate. */
function plateauWindow(v, lo, hi){
  if(!isFinite(v) || v <= 0) return 0;
  var x = v < lo ? Math.log(lo / v) : v > hi ? Math.log(v / hi) : 0;
  return Math.exp(-Math.pow(x / 0.55, 2));
}
/* Frost-style strain window */
function frostWindow(ue){ var w = bioWindow(); return plateauWindow(ue, w[0], w[1]); }
/* v0.9.0 — bone-ingrowth pore window on the mean pore diameter (Build target; defaults 300–600 µm) */
function poreWindow(){
  var lo = isFinite(globalInputs.pore_lo) && globalInputs.pore_lo > 0 ? globalInputs.pore_lo : 300;
  var hi = isFinite(globalInputs.pore_hi) && globalInputs.pore_hi > lo ? globalInputs.pore_hi : Math.max(600, lo * 1.5);
  return [lo, hi];
}
var BIO_THROAT_MIN_UM = 100;   /* interconnections cells and vessels can pass through */
/* Mean pore and throat in µm at the cell size you print at (Build target wins over the design's own). */
function bioSizesUm(d){
  var cell = globalInputs.cell_size_mm || d.cell_size_mm;
  if(!(cell > 0)) return null;
  return { pore: isNum(d.pore_size_norm) ? d.pore_size_norm * cell * 1000 : null, throat: isNum(d.throat_size_norm) ? d.throat_size_norm * cell * 1000 : null };
}
/* Biomedical scoring wants a load (for strain) and the cell size you print at (for pore µm). */
function needsBioInputs(){ return !hasLoad() || !(globalInputs.cell_size_mm > 0); }
function hasAnyGlobalInput(){
  return globalInputs.cell_size_mm   != null
      || globalInputs.modulus_gpa    != null
      || globalInputs.density_gcc    != null
      || globalInputs.thermal_k_wmk  != null
      || globalInputs.ref_stress_mpa != null;
}

/* ── from v0.4: value formatting ───────────────────────────────────────── */
function fmtV(v, key){
  if(v==null || v===undefined) return '—';
  // Volume fraction is the only percentage column
  if(key === 'volume_fraction') return v.toFixed(0);
  // Microstrain-per-GPa values can range up to 1e6; show with k/M suffix
  if(typeof key === 'string' && key.startsWith('microstrain_')){
    if(Math.abs(v) >= 1e6) return (v/1e6).toFixed(2)+'M';
    if(Math.abs(v) >= 1000) return (v/1000).toFixed(1)+'k';
    return Math.round(v).toString();
  }
  // Genus per cell can be integers or large numbers
  if(key === 'genus_per_cell'){
    if(Math.abs(v) >= 100) return Math.round(v).toString();
    return v.toFixed(1);
  }
  const a = Math.abs(v);
  if(a >= 1000) return v.toLocaleString();
  if(a >= 100) return v.toFixed(0);
  if(a >= 10) return v.toFixed(1);
  if(a >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

/* ── from v0.4: domains, their default axes and compound scores ───────── */
const DOMAIN_DEFAULTS = {   /* v0.9.0 — first two = the domain's 3D X / Y (21-actions.js domainAxisPairs) */
  all:        ['_beff','anisotropy','volume_fraction','pore_size_p50_norm','curvature_uniformity'],
  biomedical: ['pore_size_norm','throat_size_norm','connect_idx','_tp','curvature_uniformity'],
  aerospace:  ['_beff','directionality','anisotropy','curvature_uniformity','volume_fraction'],
  automotive: ['stiffness_density_norm','_au','volume_fraction','anisotropy','directionality'],
  oilgas:     ['perc_idx','d_eff_max_norm','tortuosity_min','volume_fraction','_tp'],
  thermal:    ['thermal_anisotropy','keff_max_norm','d_eff_max_norm','volume_fraction','connect_idx'],
  spread:     ['_keff','thermal_anisotropy','keff_avg_norm','volume_fraction','connect_idx'],
};

// Default radar axis set — driven by the active domain. When the user picks a
// domain via the sidebar selector, this swaps to that domain's axis set, which
// in turn re-presets the radar, the card metric rows, and the scatter axes.
// Order matters in pickRadarAxes: rightmost is bumped first by active filters.
//
// 'all' (default) priority (first-bumped → last-bumped):
//   curvature_uniformity → pore_size_p50_norm → volume_fraction → anisotropy → stiffness_density_norm


/* v0.9.0: the v0.4 DOMAIN_LABELS blurbs are gone — they had drifted from the
   scores. Every description now comes from Z_COMPOUND_GLOSSARY below. */
const DOMAIN_Z_COMPOUND = {
  all: {
    label: 'SURFACE EFFICIENCY',
    formula: 'S_v / VF',
    needs: ['surface_complexity'],
    compute(d, popStats){
      // v0.9.0: true specific surface (Sweep ≥ 0.30) where the row has it,
      // else the voxel-face count — both as ranks, until the reseed fills _sv.
      const sc = popStats._sv?.get(d) ?? popStats.surface_complexity?.get(d);
      const vf = d.volume_fraction;
      if(sc == null || vf == null || vf <= 0) return null;
      // Surface area per cell volume (percentile-ranked) divided by volume
      // fraction (as fraction). High score = lots of interior surface per
      // unit material spent — good proxy for cell-attachment density, heat-
      // exchange capacity, catalytic surface yield. The Z-axis percentile-
      // ranks compound output downstream so the unbounded result is fine.
      // Structurally orthogonal to PERFORMANCE: stiffness rewards thick
      // struts, surface efficiency rewards thin convoluted shells. Keeps
      // the cube three-dimensional for stiffness-heavy populations.
      return sc / (vf / 100);
    },
    vector(d, popStats){
      const sc = popStats._sv?.get(d) ?? popStats.surface_complexity?.get(d);
      const vf = d.volume_fraction;
      if(sc == null || vf == null || vf <= 0) return null;
      // Both inputs to the k-NN distance metric in [0, 1] range
      return [sc, vf / 100];
    }
  },
  biomedical: {
    label: 'BONE-INGROWTH VIABILITY',
    formula: 'pore window × strain window × throat gate',
    needs: ['pore_size_norm', 'throat_size_norm', 'microstrain_avg_per_gpa'],   // strain only counts once a load is entered
    compute(d, popStats){
      // v0.9.0 (Matt, 2026-10-11): the pore window is a plateau on the MEAN
      // pore diameter (inscribed sphere — like-for-like with micro-CT pore
      // sizes), full marks 300–600 µm by default; it used P50 (the distance
      // field's median, ~½ the pore) with a Gaussian at 350 ± 150 µm. The
      // third factor is a soft gate on throat size: full marks at ≥ 100 µm.
      const um = bioSizesUm(d);
      if(!um || um.pore == null || um.throat == null) return null;
      const pw = poreWindow();
      const pWindow = plateauWindow(um.pore, pw[0], pw[1]);
      const tGate = plateauWindow(um.throat, BIO_THROAT_MIN_UM, Infinity);
      // Frost-style bone-forming strain window on REAL microstrain under the
      // user's load and material. With no load the factor is left out (not
      // guessed); a design that can't carry load gets no score once a load is set.
      let sWindow = 1;
      if(hasLoad()){
        const ue = d.microstrain_avg_per_gpa;
        if(ue == null) return null;
        sWindow = frostWindow(ue);
      }
      return pWindow * sWindow * tGate;
    },
    vector(d, popStats){
      const p = popStats.pore_size_norm?.get(d), t = popStats.throat_size_norm?.get(d);
      if(p == null || t == null) return null;
      if(!hasLoad()) return [p, t];
      const mu = popStats.microstrain_avg_per_gpa?.get(d);
      if(mu == null) return null;
      return [p, mu, t];
    }
  },
  aerospace: {
    label: 'DIRECTIONAL STIFFNESS',
    formula: '√(Voigt efficiency (stiffest axis) × directionality)',
    needs: ['directionality'],
    compute(d, popStats){
      // v0.9.0: the stiffest-axis share of the Voigt bound — a spar cares
      // about its load axis, not the mean of three. × directionality rank.
      const be = d._beff;
      const di = popStats.directionality?.get(d);
      if(be == null || di == null) return null;
      return Math.sqrt(Math.max(be, 0) * di);
    },
    vector(d, popStats){
      const be = d._beff, di = popStats.directionality?.get(d);
      if(be == null || di == null) return null;
      return [be, di];
    }
  },
  automotive: {
    label: 'OMNIDIRECTIONAL STIFFNESS',
    formula: '√(Voigt efficiency (mean axis) × (1 − A^U rank))',
    needs: ['_au', 'ortho_contrast'],
    compute(d, popStats){
      // v0.9.0: balance from the universal anisotropy index (shear included);
      // designs without a stiffness matrix (CPU solves) fall back to the
      // axial ortho contrast. Linear-elastic stand-in until Lab's yield and
      // buckling reach Vault.
      const sd = d.stiffness_density_norm;
      const au = popStats._au?.get(d);
      const oc = au == null ? popStats.ortho_contrast?.get(d) : null;
      const bal = au != null ? 1 - au : oc != null ? 1 - oc : null;
      if(sd == null || bal == null) return null;
      return Math.sqrt(sd * bal);
    },
    vector(d, popStats){
      const sd = d.stiffness_density_norm, au = popStats._au?.get(d) ?? popStats.ortho_contrast?.get(d);
      if(sd == null || au == null) return null;
      return [sd, au];
    }
  },
  oilgas: {
    label: 'FLOW THROUGHPUT',
    formula: '∛(void percolation × D_eff max × throat ÷ pore)',
    needs: ['_tp'],
    compute(d, popStats){
      // v0.9.0: D_eff (Bruggeman ε/τ²) already carries tortuosity, so the
      // separate (1 − τ rank) term counted it twice. The third factor is now
      // the constriction ratio, scaled across the Vault.
      const pi = d.perc_idx, de = d.d_eff_max_norm, tp = popStats._tp?.get(d);
      if(pi == null || de == null || tp == null) return null;
      return Math.cbrt(pi * de * tp);
    },
    vector(d, popStats){
      const pi = d.perc_idx, de = d.d_eff_max_norm, tp = popStats._tp?.get(d);
      if(pi == null || de == null || tp == null) return null;
      return [pi, de, tp];
    }
  },
  thermal: {
    label: 'DIRECTIONAL HEAT TRANSPORT',
    formula: '√(k_max × (1 − 1/k_anisotropy))',
    needs: ['thermal_anisotropy'],
    compute(d){
      const km = d.keff_max_norm;
      const ka = d.thermal_anisotropy;
      if(km == null || ka == null || ka < 1) return null;
      // keff_max_norm is best-axis conductivity (v4 first-class column —
      // replaces hardcoded keff_z_norm; honest about what "best axis" means
      // when stiff_axis isn't always Z).
      // (1 − 1/aniso) maps anisotropy [1, ∞) → [0, 1) — rewards directional
      // bias (heat sinks, heat pipes).
      const dirBias = 1 - 1/Math.max(ka, 1);
      return Math.sqrt(km * dirBias);
    },
    vector(d, popStats){
      const km = d.keff_max_norm;
      const ka = popStats.thermal_anisotropy?.get(d);
      if(km == null || ka == null) return null;
      return [km, ka];
    }
  },
  spread: {
    label: 'HEAT SPREADING',
    formula: '√(conductivity efficiency × 1/kα)',
    needs: ['_keff'],
    compute(d){
      // v0.9.0: the isotropic counterpart of directional heat transport —
      // conduction per unit material, equally in every direction.
      const ke = d._keff, ka = d.thermal_anisotropy;
      if(ke == null || ka == null || ka < 1) return null;
      return Math.sqrt(Math.max(ke, 0) / Math.max(ka, 1));
    },
    vector(d, popStats){
      const ke = popStats._keff?.get(d), ka = popStats.thermal_anisotropy?.get(d);
      if(ke == null || ka == null) return null;
      return [ke, ka];
    }
  }
};

/* ── from v0.4: plain-language glossary ────────────────────────────────── */
const METRIC_GLOSSARY = {
  // ─── Geometry & connectivity ───
  volume_fraction:        { def: 'Fraction of the unit cell occupied by solid material.',
                            interp: 'Higher = denser/heavier. Lower = lighter and more porous.' },
  connect_idx:            { def: 'Whether the solid phase forms a continuous load path through the cell. Mean of three boolean axis-percolation tests.',
                            interp: 'κ=1.0 means load can transmit through every axis. κ=0 means the solid is isolated islands.' },
  perc_idx:               { def: 'Whether the void (pore) phase forms a continuous channel through the cell. Mean of three axis-percolation tests.',
                            interp: 'κ=1.0 means fluid/gas can flow through every axis. κ=0 means the pores are dead-end pockets.' },
  anisotropy:             { def: 'Stiffest over softest Young’s modulus among X, Y and Z (axes that carry load).',
                            interp: '1.0× = equal along the axes. Ignores shear and the diagonals: a gyroid reads 1.0× yet is not isotropic. For full anisotropy use A^U.' },
  directionality:         { def: 'Fraction of total stiffness carried on the strongest axis (max/sum across X, Y, Z).',
                            interp: '0.333 = perfectly isotropic. 1.0 = all stiffness on one axis (1D fiber). Always defined, even when one or two axes have zero stiffness — replaces v0.13 axial_dominance which went NaN for 1D designs.' },
  ortho_contrast:         { def: 'Coefficient of variation of stiffness across X/Y/Z axes. Retired from the pickers in v0.9.0 (built from the same three numbers as anisotropy and directionality); A^U replaces it.',
                            interp: 'Low = balanced response in all directions. High = strongly asymmetric.' },
  aniso_efficiency:       { def: 'Anisotropy ratio divided by solid fraction. Retired from the pickers in v0.9.0: a ratio over density mostly rewards low density.',
                            interp: 'Catches designs that achieve high anisotropy without using excess material.' },
  surface_complexity:     { def: 'Surface area per cell volume, raw (uncapped). Vault percentile-ranks for display.',
                            interp: 'High = topologically intricate (TPMS sheets, fine grains). Low = simple smooth boundary.' },

  // ─── Stiffness (normalized to solid Young\'s modulus) ───
  ex_norm:                { def: 'Effective stiffness along X as a fraction of solid material stiffness.',
                            interp: 'Recover dimensional GPa by multiplying by E_solid (e.g., 110 GPa for Ti-6Al-4V).' },
  ey_norm:                { def: 'Effective stiffness along Y as a fraction of solid material stiffness.',
                            interp: 'Recover dimensional GPa by multiplying by E_solid.' },
  ez_norm:                { def: 'Effective stiffness along Z as a fraction of solid material stiffness.',
                            interp: 'Recover dimensional GPa by multiplying by E_solid.' },
  stiffness_density_norm: { def: 'Mean of Ex, Ey, Ez over Es, divided by the solid fraction — the mean-axis share of the Voigt upper bound.',
                            interp: '1 = the bound. The stiffest-axis version is Voigt efficiency (stiffest axis); for isotropic designs the Hashin–Shtrikman efficiency is the sharper measure.' },

  // ─── Thermal (normalized to solid thermal conductivity) ───
  keff_x_norm:            { def: 'Effective thermal conductivity along X as a fraction of solid material conductivity.',
                            interp: 'Recover dimensional W/m·K by multiplying by k_solid.' },
  keff_y_norm:            { def: 'Effective thermal conductivity along Y as a fraction of solid material conductivity.',
                            interp: 'Recover dimensional W/m·K by multiplying by k_solid.' },
  keff_z_norm:            { def: 'Effective thermal conductivity along Z as a fraction of solid material conductivity.',
                            interp: 'Recover dimensional W/m·K by multiplying by k_solid.' },
  keff_max_norm:          { def: 'Best-axis thermal conductivity, regardless of which physical axis is best.',
                            interp: 'Heat-sink designs care about this — the "primary heat-transport direction" performance.' },
  keff_avg_norm:          { def: 'Mean thermal conductivity averaged across X/Y/Z.',
                            interp: 'Useful when heat must transport in unknown directions (e.g., omnidirectional cooling).' },
  thermal_anisotropy:     { def: 'Ratio of best-axis to worst-axis thermal conductivity.',
                            interp: '1.0× = isotropic conduction. Higher = directionally biased conduction (heat pipes, fins).' },

  // ─── Compliance (per-stress strain response) ───
  microstrain_x_per_gpa:  { def: 'Microstrain along X under your applied stress and material (Build target).',
                            interp: 'Hidden until you enter a load. Bone forms best at roughly 1,000–3,500 με (Frost); set the window in Build target.' },
  microstrain_y_per_gpa:  { def: 'Microstrain along Y under your applied stress and material.', interp: 'Hidden until you enter a load.' },
  microstrain_z_per_gpa:  { def: 'Microstrain along Z under your applied stress and material.', interp: 'Hidden until you enter a load.' },
  microstrain_avg_per_gpa:{ def: 'Average microstrain over the axes that carry load, under your applied stress and material.',
                            interp: 'The Biomedical score checks this against the bone-forming window. Empty for a design with no load path.' },
  u_compliance:           { def: 'Strain energy stored per unit volume under your applied stress, in kJ/m³ (σε/2). Inspector only since v0.9.0.',
                            interp: 'Lower = stiffer overall. Hidden until you enter a load.' },

  // ─── Pore structure (cell-decoupled) ───
  pore_size_norm:         { def: 'Mean inscribed pore diameter as a fraction of cell size.',
                            interp: 'Like-for-like with micro-CT pore sizes. The Biomedical pore window (default 300–600 µm) scores this at your cell size.' },
  pore_size_p10_norm:     { def: '10th percentile of the void’s distance-to-wall field (×2), as a fraction of cell size.',
                            interp: 'Mostly the thin gaps next to walls and corners, not a pore diameter. For interconnection size use Throat / cell.' },
  pore_size_p50_norm:     { def: 'Median of the void’s distance-to-wall field (×2) over every void voxel, as a fraction of cell size.',
                            interp: 'Not a pore diameter: most void voxels sit near a wall, so it reads about half the mean pore. Use Mean pore for pore-size targets.' },
  pore_size_p90_norm:     { def: '90th percentile of the void’s distance-to-wall field (×2), as a fraction of cell size.',
                            interp: 'Close to the pore centres, so it sits near the mean pore. The spread from P10 to P90 shows how much of the void is near a wall.' },
  pore_size_cv:           { def: 'Coefficient of variation of pore sizes across the unit cell.',
                            interp: 'Low = uniform pore size (TPMS-like). High = mixed-scale pores (random foams, grain structures).' },
  throat_size_norm:       { def: 'Throat (narrowest channel) diameter as a fraction of cell size.',
                            interp: 'The rate-limiting bottleneck for fluid/cell transport between pores.' },
  throat_ratio:           { def: 'As stored: throat ÷ cell up to Sweep v0.29 (the same number as Throat / cell), throat ÷ pore from v0.30. Inspector only since v0.9.0 — Vault computes Throat ÷ pore for every row.',
                            interp: 'Use Throat ÷ pore, the constriction ratio this column was named for.' },

  // ─── Curvature ───
  h_mean:                 { def: 'Signed mean curvature of the solid surface. In mm units at the run’s cell size; inspector only since v0.9.0 (the ×L versions compare across runs). Positive = convex outward, negative = concave inward.',
                            interp: 'Near zero = minimal-surface-like (TPMS gyroid). Strongly positive = sphere-like cellular foam.' },
  h_mean_abs:             { def: 'Magnitude of mean curvature, ignoring sign. In mm units at the run’s cell size; inspector only since v0.9.0 (the ×L versions compare across runs).',
                            interp: 'How "curved" the surface is overall, without caring about which way it bows.' },
  h_std:                  { def: 'Standard deviation of mean curvature across the surface. In mm units at the run’s cell size; inspector only since v0.9.0 (the ×L versions compare across runs).',
                            interp: 'Pairs with h_mean_abs to compute custom uniformity formulas.' },
  k_gauss_mean:           { def: 'Mean Gaussian curvature of the solid surface. In mm units at the run’s cell size; inspector only since v0.9.0 (the ×L versions compare across runs).',
                            interp: 'Negative = saddle-dominant (TPMS). Zero = developable. Positive = sphere-like.' },
  curvature_uniformity:   { def: 'How consistently curved the surface is. Smooth formula 1/(1+σ/⟨|H|⟩), bounded (0,1].',
                            interp: 'Near 1.0 = ideal minimal surfaces (gyroid, Schwarz P). Lower = curvature varies across the surface.' },
  mih:                    { def: 'Integrated mean curvature ∫H dA over the cell, in mm at the run’s cell size. Inspector only since v0.9.0 — use ∫H dA ÷ L.',
                            interp: 'Useful for identifying highly-folded structures vs simple flat-ish boundaries.' },

  // ─── Topology ───
  genus_per_cell:         { def: 'Number of independent loops (handles) of the interface in one periodic cell.',
                            interp: 'Higher = more interconnected (lots of channels and crossings). Zero = simply-connected (solid blob with no holes).' },

  // ─── Transport ───
  tortuosity_min:         { def: 'Tortuosity along the most-permeable axis. Ratio of actual path length to straight-line distance.',
                            interp: '1.0 = perfectly straight channels. Higher = more winding paths, slower transport.' },
  tortuosity_avg:         { def: 'Tortuosity averaged across X/Y/Z.',
                            interp: 'Overall transport difficulty regardless of direction.' },
  d_eff_max_norm:         { def: 'Effective diffusivity along the best axis over free diffusion — a Bruggeman estimate, porosity ÷ tortuosity².',
                            interp: 'Set entirely by volume fraction and tortuosity, so it adds no information of its own; a solved void-phase value will replace it.' },
  d_eff_avg_norm:         { def: 'Effective diffusivity averaged across X/Y/Z, normalized to free-space diffusion.',
                            interp: 'Overall transport quality regardless of direction.' },
};

// Z compounds — each is a domain-specific composite. Listed separately so the
// glossary drawer can feature them at the top.
const Z_COMPOUND_GLOSSARY = {   /* v0.9.0 — rewritten from DOMAIN_Z_COMPOUND; keep the two together */
  all: {
    label: 'SURFACE EFFICIENCY',
    formula: 'specific surface (rank) ÷ volume fraction',
    def: 'Interior surface per unit of solid spent. Orthogonal to stiffness, which rewards thick struts, so the 3D space keeps three independent axes.',
    interp: 'High = lots of surface per unit material — cell attachment, heat exchange, catalytic area. Uses the true specific surface (Sweep v0.30+); rows without it fall back to the voxel-face surface complexity.'
  },
  biomedical: {
    label: 'BONE-INGROWTH VIABILITY',
    formula: 'pore window × strain window × throat gate',
    def: 'Pore window: full marks when the mean pore diameter at your cell size is inside your window (default 300–600 µm), soft fall-off outside. Strain window: the same shape on real strain under your load and material (default 1,000–3,500 με, Frost). Throat gate: full marks when the necks between pores are at least 100 µm, so cells and vessels can pass.',
    interp: 'High = right-sized pores, mechanostat-aligned strain, open ingrowth paths. Without a load the strain factor is left out, not guessed.'
  },
  aerospace: {
    label: 'DIRECTIONAL STIFFNESS',
    formula: '√(Voigt efficiency (stiffest axis) × directionality rank)',
    def: 'Stiff for its weight along the load axis, with most of the stiffness on that axis. Spars, ribs, struts.',
    interp: 'High = a strong principal load path with little stiffness wasted off-axis.'
  },
  automotive: {
    label: 'OMNIDIRECTIONAL STIFFNESS',
    formula: '√(Voigt efficiency (mean axis) × (1 − A^U rank))',
    def: 'Stiff for its weight and balanced in every direction, shear included (universal anisotropy). Designs without a stiffness matrix use the axial ortho contrast instead.',
    interp: 'A linear-elastic stand-in for crash response; real crashworthiness needs the yield and buckling results F13LD.lab will bring to Vault.'
  },
  oilgas: {
    label: 'FLOW THROUGHPUT',
    formula: '∛(void percolation × D_eff max × throat ÷ pore (scaled))',
    def: 'Connected void, best-axis diffusivity and open necks between pores. Filtration, separation, catalyst supports.',
    interp: 'D_eff is still a Bruggeman estimate (porosity ÷ tortuosity²), which is why tortuosity no longer appears separately.'
  },
  thermal: {
    label: 'DIRECTIONAL HEAT TRANSPORT',
    formula: '√(k max × (1 − 1/kα))',
    def: 'Best-axis conductivity with a directional bias. Heat pipes, fins, heat sinks with a known flow direction.',
    interp: 'An isotropic conductor scores zero here by design — see Heat spreading.'
  },
  spread: {
    label: 'HEAT SPREADING',
    formula: '√(conductivity efficiency × 1/kα)',
    def: 'Conduction per unit of material, equal in every direction. Heat spreaders, cold plates, omnidirectional cooling.',
    interp: 'High = conducts well for its density with no preferred direction.'
  },
};

// What to display as the "preset / type" label per family. Grain doesn't carry
// a preset name; its field.type ('hyperuniform' / 'spinodoid') is the closest.
function displayPreset(d){
  const r = d.recipe || {};
  const fam = d.family || r.family;
  if (fam === 'foam')   return [r.seeds?.mode, r.geometry?.mode].filter(Boolean).join(' · ') || 'foam';
  if (fam === 'wave')   return r.field?.symmetry || 'wave';
  if (fam === 'bundle') return r.surface?.structure || 'bundle';
  if (r.field?.type)         return r.field.type;          // grain
  if (r.surface?.noise_type) return r.surface.noise_type;  // noise
  if (r.topology?.name)      return r.topology.name;       // beam
  if (d.preset || (r.meta && r.meta.preset)) return d.preset || r.meta.preset;          // tpms
  if (fam === 'beam' && Array.isArray(r.beams)) return r.beams.length + '-strut lattice'; // beam without a topology name
  return FAMILY_NAME[fam] || fam || '—';
}

/* ── from v0.4: categorical palettes ────────────────────────────────────── */
const CAT_PALETTES = {
  family: {
    tpms:   '#5DCAA5',
    noise:  '#EB7050',
    grain:  '#a8a59a',
    beam:   '#B8D050',
    foam:   '#E8D4A2',
    wave:   '#D97706',
    bundle: '#7B4F9E'
  },
  topology: {
    'pi-tpms': '#A974FF',
    'shell':   '#5DCAA5',
    'solid':   '#EF9F27',
    'sheet':   '#85B7EB',
    'network': '#EB6F85',
    'half':    '#F0D944'    // grain default in current data
  },
  stiff_axis: {
    X: '#EB6B6B',
    Y: '#7AD18C',
    Z: '#7AA8EB',
    none: '#666666'
  },
  kappa: {
    sphere:  '#a0c0d8',
    disc:    '#85B7EB',
    rod:     '#EF9F27',
    diamond: '#EB6F85'
  }
};

/* ═══════════════════════ v0.5 additions ═══════════════════════════════ */

/* Derived metrics — computed per design on load (11-data.js). They behave
   like any column: filter, plot, colour, sort. */
var DERIVED_METRICS = [
  { group:'Derived', key:'_emax',  label:'Peak stiffness E* / Es', labelAbs:'Peak stiffness E*', unit:'', norm_kind:'modulus_es', short:'E*' },
  { group:'Derived', key:'_gmean', label:'Mean shear G / Es',      labelAbs:'Mean shear G',      unit:'', norm_kind:'modulus_es', short:'G*' },
  { group:'Derived', key:'_perf',  label:'Stiffness efficiency |E|/VF', unit:'', short:'|E|/VF', retired:true },   /* v0.9.0 → Voigt efficiency */
  { group:'Derived', key:'_score', label:'Domain score',          unit:'', short:'Score' },
  { group:'Derived', key:'_scar',  label:'Domain scarcity',       unit:'', short:'Rare' },
  /* v0.8.0 — the v0.7.1 colour modes, now axes and range filters too (computed at load) */
  { group:'Derived', key:'_nexp',  label:'Density exponent n',    unit:'', short:'n' },
  { group:'Derived', key:'_beff',  label:'Voigt efficiency (stiffest axis)', unit:'', short:'Voigt max' },
  /* v0.9.0 — 2026-10-11 metrics audit (14-elastic.js) */
  { group:'Derived', key:'_ga',    label:'Gibson–Ashby prefactor C', unit:'', short:'C' },
  { group:'Elastic tensor', key:'_numin',  label:'Poisson’s ratio (min)',  unit:'', short:'ν min' },
  { group:'Elastic tensor', key:'_nu_xy',  label:'Poisson’s ratio ν xy',  unit:'', short:'ν xy' },
  { group:'Elastic tensor', key:'_nu_xz',  label:'Poisson’s ratio ν xz',  unit:'', short:'ν xz' },
  { group:'Elastic tensor', key:'_nu_yz',  label:'Poisson’s ratio ν yz',  unit:'', short:'ν yz' },
  { group:'Elastic tensor', key:'_edmax',  label:'Stiffest direction E / Es', labelAbs:'Stiffest direction E', unit:'', norm_kind:'modulus_es', short:'E dir max' },
  { group:'Elastic tensor', key:'_edmin',  label:'Softest direction E / Es',  labelAbs:'Softest direction E',  unit:'', norm_kind:'modulus_es', short:'E dir min' },
  { group:'Elastic tensor', key:'_au',     label:'Universal anisotropy A^U', unit:'', short:'A^U', displayMode:'rank' },
  { group:'Elastic tensor', key:'_zener',  label:'Zener ratio',            unit:'', short:'Zener' },
  { group:'Elastic tensor', key:'_kb',     label:'Bulk modulus K / Es',    labelAbs:'Bulk modulus K', unit:'', norm_kind:'modulus_es', short:'K' },
  { group:'Elastic tensor', key:'_hs',     label:'Hashin–Shtrikman efficiency', unit:'', short:'HS eff' },
  { group:'Elastic tensor', key:'_ge',     label:'Shear ÷ Young’s G/E',    unit:'', short:'G/E' },
  { group:'Geometry',  key:'_sv',   label:'Specific surface S/V²ᐟ³',   unit:'', short:'S/V', displayMode:'rank' },
  { group:'Pore',      key:'_tp',   label:'Throat ÷ pore',              unit:'', short:'Throat/pore' },
  { group:'Thermal',   key:'_keff', label:'Conductivity efficiency',    unit:'', short:'k eff' },
  { group:'Curvature', key:'_hL',   label:'Mean curvature H̄·L (signed)', unit:'', short:'H̄L' },
  { group:'Curvature', key:'_hLa',  label:'Mean curvature |H̄|·L',       unit:'', short:'|H̄|L' },
  { group:'Curvature', key:'_hsL',  label:'Curvature spread σ(H)·L',    unit:'', short:'σH·L' },
  { group:'Curvature', key:'_kL2',  label:'Gaussian curvature K·L²',    unit:'', short:'KL²' },
  { group:'Curvature', key:'_mihL', label:'Integrated curvature ∫H dA ÷ L', unit:'', short:'MIH/L' }
];
DERIVED_METRICS.forEach(function (m) { METRIC_MAP[m.key] = m; });
var DERIVED_GLOSSARY = {
  _emax:  { def:'Largest of Ex, Ey, Ez — the stiffness along the stiffest axis, as a fraction of the solid.', interp:'The Ashby-style stiffness to plot against volume fraction.' },
  _gmean: { def:'Mean of the three shear moduli Gyz, Gxz, Gxy, as a fraction of the solid modulus.', interp:'Empty for designs solved before Sweep v0.24 (no shear moduli recorded).' },
  _perf:  { def:'Length of the stiffness vector (Ex, Ey, Ez) divided by volume fraction.', interp:'Stiffness bought per unit of material; the default X axis of the design space.' },
  _score: { def:'The active domain\'s compound score (see Domain compounds below).', interp:'Drives the Z axis and the score ring on every card.' },
  _scar:  { def:'Mean distance to the 5 nearest designs in the active domain\'s compound inputs.', interp:'High = few designs like this one in the Vault for that domain.' },
  _nexp:  { def:'n in E ∝ ρⁿ: how stiffness grows with density, fitted across designs of the same family, topology and preset (the geometric mean of Ex, Ey, Ez; peak stiffness where an axis carries no load).', interp:'About 1 = stretch-dominated, about 2 = bending-dominated, above 2 = worse. Designs whose type is too small or too narrow in density borrow the trend of their family and are drawn faded.' },
  _beff:  { def:'Peak stiffness E* / Es divided by the solid fraction — the share of the Voigt upper bound the design reaches along its stiffest axis.', interp:'1 = the bound (straight struts along the load). Past 1 means the solve needs checking. The default 3D X axis.' },
  _ga:    { def:'C in E/Es = C·ρⁿ, using the design’s own density exponent n and the same stiffness measure n was fitted on.', interp:'n says how stiffness scales with density; C says how much you start with. Two designs with the same n can differ several-fold in C.' },
  _numin: { def:'The smallest of the six Poisson’s ratios νij, from the full stiffness matrix (GPU solves).', interp:'Below 0 = auxetic: the cell widens when stretched. Filter with the Poisson chips.' },
  _nu_xy: { def:'Lateral contraction along Y under a load along X.', interp:'About 0.3 for most solids; lattices range widely, negative = auxetic.' },
  _nu_xz: { def:'Lateral contraction along Z under a load along X.', interp:'Negative = auxetic in that plane.' },
  _nu_yz: { def:'Lateral contraction along Z under a load along Y.', interp:'Negative = auxetic in that plane.' },
  _edmax: { def:'The largest Young’s modulus over every direction, from the full stiffness matrix — not only X, Y and Z.', interp:'For cubic cells the stiffest direction is often a diagonal, so this can beat peak stiffness E*.' },
  _edmin: { def:'The smallest Young’s modulus over every direction.', interp:'The honest weak direction of the cell. Max ÷ min is the true stiffness anisotropy.' },
  _au:    { def:'Universal anisotropy index A^U = 5 G_V/G_R + K_V/K_R − 6 (Ranganathan & Ostoja-Starzewski), shear included.', interp:'0 = isotropic. Works for any symmetry, unlike the axial anisotropy ratio, which a gyroid passes at 1.0× while its shear differs.' },
  _zener: { def:'2C44 / (C11 − C12), averaged over the three axes.', interp:'1 = isotropic for a cubic cell. Above 1: stiffer along the diagonals; below 1: stiffer along the axes.' },
  _kb:    { def:'Bulk modulus (Hill average of Voigt and Reuss) as a fraction of the solid’s Young’s modulus.', interp:'Resistance to uniform compression. Pairs with shear for the Hashin–Shtrikman check.' },
  _hs:    { def:'Mean of K / K_HS and G / G_HS: bulk and shear moduli as shares of the Hashin–Shtrikman upper bounds for solid and void at the design’s solid fraction (solid ν 0.3).', interp:'1 = as stiff as any isotropic structure can be at that density. Sharper than Voigt efficiency, which flatters isotropic designs.' },
  _ge:    { def:'Shear modulus over Young’s modulus, both Hill averages.', interp:'0.385 for an isotropic solid at ν 0.3. Alongside n, it separates stretch-dominated from bending-dominated behaviour.' },
  _sv:    { def:'Interface area divided by the cell volume to the ⅔ — S·L/V for a cube — from the same area integral as the curvature (Sweep v0.30+).', interp:'The true specific surface: a single gyroid surface is about 3.1, a gyroid sheet about 6. The surface-efficiency score uses it where present.' },
  _tp:    { def:'Throat size divided by the mean pore size (both inscribed diameters).', interp:'The constriction ratio: about 1 = uniform channels (a gyroid sits near 1); low = pores joined by narrow necks. Cell-size free. The biomedical and oil & gas scores use it.' },
  _keff:  { def:'Mean thermal conductivity over k_solid, divided by the solid fraction.', interp:'Conduction bought per unit of material (1 = straight solid paths). The heat-spreading score uses it.' },
  _hL:    { def:'Signed mean curvature times the cell size it was measured at.', interp:'Dimensionless, so designs from runs at different cell sizes compare. Near 0 = minimal-surface-like.' },
  _hLa:   { def:'Mean curvature magnitude times the cell size.', interp:'How curved the surface is overall, independent of cell size.' },
  _hsL:   { def:'Standard deviation of mean curvature times the cell size.', interp:'How much the curvature varies across the surface.' },
  _kL2:   { def:'Mean Gaussian curvature times the cell size squared.', interp:'Negative = saddle-dominant (TPMS). Tied to genus by Gauss–Bonnet.' },
  _mihL:  { def:'∫H dA over the cell divided by the cell size.', interp:'Total bending of the surface, scale-free.' }
};

/* Short names for tight places (tiles, table headers, tags). */
var METRIC_SHORT = {
  volume_fraction:'VF', connect_idx:'κ solid', perc_idx:'κ void', anisotropy:'Axial aniso', directionality:'Dir Ψ', ortho_contrast:'Ortho Ω',
  aniso_efficiency:'α/ρ', surface_complexity:'Surface', ex_norm:'Ex', ey_norm:'Ey', ez_norm:'Ez', stiffness_density_norm:'Voigt avg',
  gyz_norm:'Gyz', gxz_norm:'Gxz', gxy_norm:'Gxy', keff_x_norm:'kx', keff_y_norm:'ky', keff_z_norm:'kz', keff_max_norm:'k max',
  keff_avg_norm:'k avg', thermal_anisotropy:'k aniso', microstrain_x_per_gpa:'με x', microstrain_y_per_gpa:'με y',
  microstrain_z_per_gpa:'με z', microstrain_avg_per_gpa:'με avg', u_compliance:'U/σ²', pore_size_norm:'Pore', pore_size_p10_norm:'P10',
  pore_size_p50_norm:'P50', pore_size_p90_norm:'P90', pore_size_cv:'Pore CV', throat_size_norm:'Throat', throat_ratio:'Throat r',
  h_mean:'H̄', h_mean_abs:'|H̄|', h_std:'σH', k_gauss_mean:'K', curvature_uniformity:'Curv unif', mih:'MIH', genus_per_cell:'Genus',
  tortuosity_min:'τ min', tortuosity_avg:'τ avg', d_eff_max_norm:'D max', d_eff_avg_norm:'D avg'
};
function mShort(k) { var m = METRIC_MAP[k]; return (m && m.short) || METRIC_SHORT[k] || (m ? m.label : k); }
function mLabel(k) { if (k === '_score') return domainZLabel(); var m = METRIC_MAP[k]; return m ? m.label : k; }
function mGloss(k) { return METRIC_GLOSSARY[k] || DERIVED_GLOSSARY[k] || null; }

/* Every metric the UI can pick, grouped for menus. */
function pickableMetrics() {
  return metricsAll().filter(function (m) { return !m.retired; });   /* v0.9.0 — retired metrics stay in the inspector and the key */
}
function metricsAll() { return DERIVED_METRICS.concat(ALL_METRICS); }
function isRetired(k) { var m = METRIC_MAP[k]; return !!(m && m.retired); }

/* Domains: v0.4 ids, with an icon each. */
var DOMAIN_IDS = ['all', 'biomedical', 'aerospace', 'automotive', 'oilgas', 'thermal', 'spread'];   /* v0.9.0: thermal split in two */
var DOMAIN_SHORT = { all:'All applications', biomedical:'Biomedical', aerospace:'Aerospace', automotive:'Automotive', oilgas:'Oil & gas', thermal:'Directional heat', spread:'Heat spreading' };
function domainZLabel(dom) { var z = DOMAIN_Z_COMPOUND[dom || (typeof F !== 'undefined' ? F.domain : 'all')]; return z ? z.label.charAt(0) + z.label.slice(1).toLowerCase() : 'Domain score'; }

/* Score breakdown — the same factors each compound multiplies, shown as
   bars in the inspector so a rank can be read, not just trusted. Each
   returns [{label, v (0..1 for the bar), txt}] plus how they combine. */
function scoreFactors(d, dom, pop) {
  var g = function (k) { var p = pop[k]; return p ? p.get(d) : null; };
  var out = [], how = '';
  function f(label, v, txt) { out.push({ label: label, v: v == null ? null : clamp(v, 0, 1), txt: txt != null ? txt : (v == null ? '—' : v.toFixed(2)) }); }
  switch (dom) {
    case 'biomedical': {
      var um = bioSizesUm(d), pw = poreWindow(), mu = d.microstrain_avg_per_gpa, bw = bioWindow();
      f('Pore window (mean ' + pw[0] + '–' + pw[1] + ' µm)', um && um.pore != null ? plateauWindow(um.pore, pw[0], pw[1]) : null, um && um.pore != null ? um.pore.toFixed(0) + ' µm' : 'add cell size');
      if (!hasLoad()) { f('Strain window · needs load', null, 'Add load'); out[out.length - 1].act = 'bio-prompt'; }
      else f('Strain window (' + bw[0].toLocaleString('en-US') + '–' + bw[1].toLocaleString('en-US') + ' με)', mu == null ? null : frostWindow(mu), mu == null ? 'no load path' : Math.round(mu).toLocaleString('en-US') + ' με');
      f('Throat gate (≥ ' + BIO_THROAT_MIN_UM + ' µm)', um && um.throat != null ? plateauWindow(um.throat, BIO_THROAT_MIN_UM, Infinity) : null, um && um.throat != null ? um.throat.toFixed(0) + ' µm' : '—');
      how = 'multiplied'; break;
    }
    case 'aerospace':  f('Voigt efficiency (stiffest axis)', d._beff); f('Directionality (scaled)', g('directionality')); how = 'geometric mean'; break;
    case 'automotive': f('Voigt efficiency (mean axis)', d.stiffness_density_norm); var au = g('_au'), oc = au == null ? g('ortho_contrast') : null; f(au != null ? 'Balance (1 − A^U rank)' : 'Balance (1 − ortho contrast) · no stiffness matrix', au != null ? 1 - au : oc == null ? null : 1 - oc); how = 'geometric mean'; break;
    case 'oilgas':     f('Void percolation κ', d.perc_idx); f('Diffusivity D max', d.d_eff_max_norm); f('Throat ÷ pore (scaled)', g('_tp'), d._tp == null ? '—' : d._tp.toFixed(2)); how = 'cube root of the product'; break;
    case 'thermal':    f('Best-axis conductivity', d.keff_max_norm); var ka = d.thermal_anisotropy; f('Directional bias (1 − 1/kα)', ka == null ? null : 1 - 1 / Math.max(ka, 1)); how = 'geometric mean'; break;
    case 'spread':     f('Conductivity efficiency', d._keff); var kb = d.thermal_anisotropy; f('Evenness (1/kα)', kb == null ? null : 1 / Math.max(kb, 1)); how = 'geometric mean'; break;
    default:           f(d._sv != null ? 'Specific surface (rank)' : 'Surface complexity (rank)', d._sv != null ? g('_sv') : g('surface_complexity')); f('Material spent (VF)', d.volume_fraction == null ? null : d.volume_fraction / 100, d.volume_fraction == null ? '—' : d.volume_fraction.toFixed(0) + '%'); how = 'surface ÷ volume fraction';
  }
  return { factors: out, how: how };
}

/* Which way is better, per domain — used by Compare to mark the best of a set.
   +1 higher is better, −1 lower is better. Metrics not listed get no mark. */
var DOMAIN_GOALS = {
  all:        { _score:1, _beff:1, stiffness_density_norm:1, _hs:1, _emax:1, volume_fraction:-1, anisotropy:-1, _au:-1, curvature_uniformity:1, surface_complexity:1 },
  biomedical: { _score:1, throat_size_norm:1, _tp:1, connect_idx:1, curvature_uniformity:1, pore_size_p10_norm:1, _emax:-1, volume_fraction:-1 },
  aerospace:  { _score:1, _beff:1, stiffness_density_norm:1, _emax:1, _edmax:1, directionality:1, volume_fraction:-1 },
  automotive: { _score:1, stiffness_density_norm:1, _hs:1, _gmean:1, _au:-1, volume_fraction:-1 },
  oilgas:     { _score:1, perc_idx:1, d_eff_max_norm:1, tortuosity_min:-1, _tp:1 },
  thermal:    { _score:1, keff_max_norm:1, thermal_anisotropy:1, d_eff_max_norm:1, surface_complexity:1 },
  spread:     { _score:1, _keff:1, keff_avg_norm:1, thermal_anisotropy:-1, volume_fraction:-1 }
};
function compareKeys(dom) {
  var ks = ['_score'].concat(DOMAIN_DEFAULTS[dom] || DOMAIN_DEFAULTS.all);
  ['volume_fraction', '_emax', '_gmean', 'stiffness_density_norm'].forEach(function (k) { if (ks.indexOf(k) < 0) ks.push(k); });
  return ks.slice(0, 9);
}

/* One-click 2D axis pairs per domain (X, Y). */
var AXIS_PRESETS = {
  all:        [['volume_fraction', '_emax', 'Stiffness vs density'], ['volume_fraction', 'stiffness_density_norm', 'Stiffness density vs density'], ['pore_size_p50_norm', 'throat_ratio', 'Pore vs throat'], ['anisotropy', '_beff', 'Efficiency vs anisotropy'], ['_numin', '_edmax', 'Poisson vs stiffest direction']],
  biomedical: [['pore_size_norm', 'microstrain_avg_per_gpa', 'Pore vs strain'], ['volume_fraction', 'pore_size_norm', 'Pore vs density'], ['pore_size_norm', 'throat_size_norm', 'Pore vs throat'], ['pore_size_p10_norm', 'pore_size_p90_norm', 'Pore spread P10 vs P90'], ['volume_fraction', '_emax', 'Stiffness vs density']],
  aerospace:  [['volume_fraction', '_beff', 'Voigt efficiency vs density'], ['directionality', '_beff', 'Voigt efficiency vs directionality'], ['volume_fraction', '_emax', 'Stiffness vs density']],
  automotive: [['volume_fraction', '_gmean', 'Shear vs density'], ['_au', 'stiffness_density_norm', 'Specific stiffness vs anisotropy'], ['volume_fraction', '_emax', 'Stiffness vs density']],
  oilgas:     [['tortuosity_min', 'd_eff_max_norm', 'Diffusivity vs tortuosity'], ['pore_size_p50_norm', 'd_eff_max_norm', 'Diffusivity vs pore'], ['volume_fraction', 'perc_idx', 'Void percolation vs density']],
  thermal:    [['volume_fraction', 'keff_max_norm', 'Conductivity vs density'], ['thermal_anisotropy', 'keff_max_norm', 'Conductivity vs directional bias'], ['surface_complexity', 'keff_avg_norm', 'Conductivity vs surface']],
  spread:     [['volume_fraction', 'keff_avg_norm', 'Conductivity vs density'], ['thermal_anisotropy', '_keff', 'Efficiency vs directional bias'], ['volume_fraction', '_keff', 'Efficiency vs density']]
};

/* Recipe summary per family — the parameters behind the geometry. */
function recipeLines(d) {
  var r = d.recipe || {}, g = r.geometry || {}, fam = d.family || r.family, L = [];
  function add(k, v) { if (v != null && v !== '') L.push([k, v]); }
  function n3(v) { return isNum(+v) ? (+v).toFixed(3) : String(v); }
  function vec(a) { return Array.isArray(a) ? '(' + a.map(function (x) { return (+x).toFixed(2); }).join(', ') + ')' : null; }
  if (fam === 'tpms') {
    var sf = r.surface || {};
    add('surface', sf.preset || sf.type);
    add('mode', g.mode);
    if (g.offset != null) add('offset', n3(g.offset));
    if (g.wallThickness != null) add('wall', n3(g.wallThickness));
    var pr = g.pipeR != null ? g.pipeR : g.pipe_radius; if (pr != null && g.mode === 'pi-tpms') add('pipe r', n3(pr));
    if (g.field_b_freq) add('field B ×', g.field_b_freq);
    var ps = g.phaseShift || g.phase_shift; if (ps && (ps.x || ps.y || ps.z)) add('shift', '(' + [ps.x, ps.y, ps.z].map(function (v) { return (+v || 0).toFixed(2); }).join(', ') + ')');
    var cs = [g.cell_scale_x, g.cell_scale_y, g.cell_scale_z];
    add('cell scale', cs.some(function (v) { return v != null; }) ? vec(cs.map(function (v) { return v != null ? v : (g.cell_scale || 1); })) : (g.cell_scale != null ? g.cell_scale : null));
  } else if (fam === 'noise') {
    var su = r.surface || {};
    add('noise', su.noise_type); add('mode', g.mode);
    if (su.frequency != null) add('frequency', n3(su.frequency));
    if (su.octaves != null) add('octaves', su.octaves);
    if (su.seed != null) add('seed', su.seed);
    if (su.center != null) add('centre', n3(su.center));
    if (su.half_width != null) add('half width', n3(su.half_width));
  } else if (fam === 'grain') {
    var fl = r.field || {};
    add('field', fl.type); add('topology', g.topology || g.mode);
    if (fl.kappa != null) add('κ', (+fl.kappa).toFixed(2));
    if (fl.frequency != null) add('frequency', n3(fl.frequency));
    if (fl.n_waves != null) add('waves', fl.n_waves);
    if (fl.rng_seed != null) add('seed', fl.rng_seed);
    if (g.center != null) add('centre', n3(g.center));
    if (g.half_width) add('half width', n3(g.half_width));
  } else if (fam === 'beam') {
    var tp = r.topology || {};
    add('topology', tp.name || 'custom');
    if (tp.beam_count != null) add('beams', tp.beam_count); else if (Array.isArray(r.beams)) add('beams', r.beams.length);
    if (g.radius != null) add('radius', n3(g.radius));
    add('cell', vec(g.scale_xyz) || (g.cell_scale != null ? (+g.cell_scale).toFixed(2) : null));
    if (g.node_smoothing_k) add('node smooth k', n3(g.node_smoothing_k) + ' mm');
    if (g.node_ball_radius) add('node ball r', n3(g.node_ball_radius) + ' mm');
  } else if (fam === 'foam') {
    var sd = r.seeds || {}, an = r.anisotropy || {};
    var nC = sd.count_actual || sd.count || (Array.isArray(sd.positions) ? sd.positions.length / 3 : null);
    add('seeds', (sd.mode || '—') + (nC != null ? ' · ' + nC + ' cells' : ''));
    add('topology', g.mode);
    if (g.mode === 'wet') { if (g.border != null) add('border', n3(g.border)); } else if (g.thickness != null) add('thickness', n3(g.thickness));
    if (g.fillet) add('fillet', n3(g.fillet));
    if (an.enabled && Array.isArray(an.stretch)) add('stretch', vec(an.stretch));
    if (g.tile_mm != null) add('tile', (+g.tile_mm).toFixed(2) + ' mm');
  } else if (fam === 'wave') {
    var fw = r.field || {}, wm = Array.isArray(fw.modes) ? fw.modes : [];
    add('symmetry', fw.symmetry || 'pure'); add('topology', fw.mode === 'sheet' ? 'sheet' : 'solid');
    add('phase', fw.signFlip ? 'B' : 'A');
    /* v0.8.0 — each mode's indices and amplitude, e.g. (1,1,0) ×1.00 */
    if (wm.length) add(wm.length === 1 ? 'mode' : wm.length + ' modes', wm.map(function (mm) {
      return '(' + mm.n + ',' + mm.m + ',' + mm.p + ')' + (mm.A != null && mm.A !== 1 ? ' ×' + (+mm.A).toFixed(2) : '');
    }).join('  '));
    if (fw.iso != null) add('iso', n3(fw.iso));
    if (fw.mode === 'sheet' && fw.thickness != null) add('thickness', n3(fw.thickness));
    if (fw.phaseTime) add('phase time', (+fw.phaseTime).toFixed(2));
    if (Array.isArray(fw.stretch) && fw.stretch.some(function (v) { return Math.abs(v - 1) > 1e-4; })) add('stretch', vec(fw.stretch));
  } else if (fam === 'bundle') {
    var sb = r.surface || {};
    add('structure', sb.structure); add('topology', sb.topology);
    if (sb.iso_offset != null) add('iso offset', n3(sb.iso_offset));
  }
  if (d._reference) add('reference', 'the swept recipe itself');
  return L;
}

/* Families with preview geometry in this build (F13LD.sweep geom/). */
var PREVIEW_FAMILIES = { tpms:1, noise:1, grain:1, beam:1, foam:1, wave:1 };
var FAMILY_ORDER = ['tpms', 'noise', 'grain', 'beam', 'foam', 'wave', 'bundle'];
var FAMILY_NAME = { tpms:'TPMS', noise:'Noise', grain:'Grain', beam:'Beam', foam:'Foam', wave:'Wave', bundle:'Bundle' };
var KAPPA_CLASSES = [
  { key:'sphere',  v:1.0,  label:'Fully connected', desc:'κ = 1 · load path on all three axes' },
  { key:'disc',    v:0.67, label:'Planar',          desc:'κ = 2/3 · two axes' },
  { key:'rod',     v:0.33, label:'Single-axis',     desc:'κ = 1/3 · one axis' },
  { key:'diamond', v:0,    label:'Isolated',        desc:'κ = 0 · no load path' }
];
var FLAG_VALUES = [['clean', 'Clean'], ['flagged', 'May read high'], ['not recorded', 'Not recorded']];
var POIS_VALUES = [['auxetic', 'Auxetic (ν < 0)'], ['conventional', 'Conventional'], ['not recorded', 'No stiffness matrix']];   /* v0.9.0 */
