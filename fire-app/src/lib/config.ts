/**
 * Centralized Configuration Constants
 *
 * All tunable values in one place — avoids magic numbers scattered across
 * the codebase and makes system-wide adjustments straightforward.
 */

export const CONFIG = {

  // ─── Sentinel Image Processing ─────────────────────────────────────────

  CONTRAST: {
    /**
     * Low percentile for histogram clipping (brightens dark areas).
     * Range: 0.001–0.01 (0.1%–1%)
     */
    PERCENTILE_LOW: 0.005,

    /**
     * High percentile for histogram clipping (darkens bright areas).
     * Range: 0.99–0.999 (99%–99.9%)
     */
    PERCENTILE_HIGH: 0.995,

    /**
     * Sigmoid S-curve steepness for contrast enhancement.
     * Formula: s(x) = 1 / (1 + e^(-K*(x-0.5)))
     *
     * K=4:  Gentle (subtle contrast)
     * K=8:  Moderate (balanced) — CHOSEN
     * K=12: Aggressive (risk of clipping)
     *
     * K=8 chosen after testing with Tiwi Islands imagery.
     * Preserves detail in both burnt and unburnt areas.
     */
    SIGMOID_K: 8,
  },

  // ─── API Cache TTL (seconds) ────────────────────────────────────────────

  CACHE_TTL: {
    /** DEA Hotspots — updates frequently */
    HOTSPOTS: 600,        // 10 minutes
    /** Weather — relatively stable */
    WEATHER: 3600,        // 1 hour
    /** Landgate imagery — moderate update frequency */
    LANDGATE: 1800,       // 30 minutes
    /** Sentinel-2 scene catalog — daily updates */
    SENTINEL_SCENES: 3600, // 1 hour
  },

  // ─── CDSE Processing API ────────────────────────────────────────────────

  CDSE: {
    /** Maximum retry attempts for failed requests */
    MAX_RETRIES: 3,
    /** Retry delays in milliseconds (exponential backoff) */
    RETRY_DELAYS_MS: [3000, 6000, 12000] as const,
    /** Request timeout */
    TIMEOUT_MS: 30_000,
    /** Default maximum cloud coverage percentage */
    DEFAULT_MAX_CLOUD_COVERAGE: 30,
  },

  // ─── Analysis Engine ────────────────────────────────────────────────────

  ANALYSIS: {
    /**
     * EDS end month (default: July = 7).
     * Months 1–7 = EDS, 8–12 = LDS.
     * Can be overridden per-project.
     */
    DEFAULT_EDS_END_MONTH: 7,
    /** Sample grid resolution for patch analysis */
    SAMPLE_GRID_KM: 0.5,
    /** Minimum fire scar area included in analysis */
    MIN_FIRE_SCAR_AREA_HA: 1.0,
    /** Maximum fire scar age for rolling coverage analysis */
    MAX_FIRE_SCAR_AGE_YEARS: 10,
  },

  // ─── Compliance Targets ─────────────────────────────────────────────────

  COMPLIANCE: {
    EDS_BURN_MIN: 35,
    EDS_BURN_AT_RISK: 30,

    LDS_BURN_MAX: 10,
    LDS_BURN_AT_RISK: 15,

    THREE_YEAR_MIN: 65,
    THREE_YEAR_MAX: 85,
    THREE_YEAR_AT_RISK_MIN: 55,
    THREE_YEAR_AT_RISK_MAX: 90,

    TWO_YEAR_MIN: 50,
    TWO_YEAR_MAX: 70,
    TWO_YEAR_AT_RISK_MIN: 40,
    TWO_YEAR_AT_RISK_MAX: 80,

    PATCHES_MIN: 100,
    PATCHES_AT_RISK: 80,

    MEAN_PATCH_AGE_MAX: 3,
    MEAN_PATCH_AGE_AT_RISK: 4,

    DISTANCE_TO_UNBURNT_MAX_M: 1000,
    DISTANCE_TO_UNBURNT_AT_RISK_M: 1200,

    SHAPE_INDEX_EDS_MIN: 2.5,
    SHAPE_INDEX_EDS_AT_RISK: 2.0,

    PERIMETER_IMPACT_MAX: 25,
    PERIMETER_IMPACT_AT_RISK: 30,
  },

  // ─── Carbon Methodology ─────────────────────────────────────────────────

  CARBON: {
    /** Default permanence discount applied to gross abatement */
    PERMANENCE_DISCOUNT: 0.25,

    /** Emission factors (tCO₂-e per hectare) by fuel type and season */
    EMISSION_FACTORS: {
      EOF: { eds: 2.5, lds: 5.8 }, // Eucalyptus Open Forest
      EW:  { eds: 1.8, lds: 4.2 }, // Eucalyptus Woodland
      SW:  { eds: 1.2, lds: 3.1 }, // Shrubby Woodland
      SH:  { eds: 0.9, lds: 2.3 }, // Shrubland
    },
  },

  // ─── Tiwi Islands Bounding Box ──────────────────────────────────────────

  TIWI: {
    /** Tiwi Islands bbox [west, south, east, north] */
    BBOX: [130.02, -11.94, 131.54, -11.16] as const,
    /** Extended bbox with buffer for data queries */
    BBOX_BUFFERED: [129.5, -12.5, 132.0, -10.5] as const,
  },

} as const;
