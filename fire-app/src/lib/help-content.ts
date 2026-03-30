// Centralised help content — glossary terms, page descriptions, and metric explanations.
// Used by InfoTooltip and HelpDialog components.

export interface GlossaryEntry {
  term: string;
  short: string;
  long?: string;
  category: GlossaryCategory;
}

export type GlossaryCategory =
  | "fire"
  | "satellite"
  | "carbon"
  | "operations"
  | "analysis"
  | "units";

export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  fire: "Fire Management",
  satellite: "Satellite & Detection",
  carbon: "Carbon & Emissions",
  operations: "Operations",
  analysis: "Analysis & Data",
  units: "Units & Measures",
};

export const GLOSSARY: GlossaryEntry[] = [
  // --- Fire Management ---
  {
    term: "EDS",
    short: "Early Dry Season — typically April to July.",
    long: "The cooler burning period when fires are lower intensity, patchier, and less damaging to biodiversity. EDS burns are the primary tool for savanna fire management and carbon abatement.",
    category: "fire",
  },
  {
    term: "LDS",
    short: "Late Dry Season — typically August to November.",
    long: "The hotter, drier period when unmanaged fires burn larger, hotter, and more completely. LDS fires produce more emissions and are harder to control. Good fire management aims to minimise LDS burning through strategic EDS burns.",
    category: "fire",
  },
  {
    term: "Fire Scar",
    short: "Area of land visibly burnt, mapped from satellite imagery.",
    long: "Detected by comparing pre- and post-fire satellite images (usually MODIS 250m). Fire scars are classified by month of detection and season (EDS/LDS).",
    category: "fire",
  },
  {
    term: "Burn Plan",
    short: "A planned, approved burn for a specific area and time.",
    long: "Burn plans go through a workflow: draft → reviewed → approved → scheduled → active → completed. They specify area, vegetation, crew, method (aerial/ground), and cultural zone restrictions.",
    category: "fire",
  },
  {
    term: "Patch Age",
    short: "Years since an area was last burnt.",
    long: "Longer unburnt areas accumulate fuel load, increasing the risk of intense LDS wildfire. Fire managers aim for a mosaic of different patch ages across the landscape.",
    category: "fire",
  },
  {
    term: "Patchiness",
    short: "How unevenly a fire burns across its footprint.",
    long: "Patchy burns leave unburnt refuges for wildlife and create a mosaic of fuel ages. Higher patchiness is generally better for biodiversity. EDS fires are typically patchier than LDS fires.",
    category: "fire",
  },
  {
    term: "Fuel Load",
    short: "Amount of combustible vegetation in an area.",
    long: "Measured in tonnes per hectare. Fuel load increases with time since last burn and varies by vegetation type. Higher fuel loads produce hotter, more intense fires.",
    category: "fire",
  },
  {
    term: "Fire Danger Rating",
    short: "Daily rating from Low to Catastrophic based on weather.",
    long: "Calculated from temperature, humidity, wind speed, and drought factor. Ratings: Low, Moderate, High, Very High, Severe, Extreme, Catastrophic. Operations are restricted at higher ratings.",
    category: "fire",
  },
  {
    term: "Shape Index",
    short: "Measure of fire scar patch compactness.",
    long: "Ratio of patch perimeter to the perimeter of a circle with the same area. Higher values indicate more complex, irregular shapes — typically from patchier, lower-intensity burns.",
    category: "fire",
  },
  {
    term: "Heterogeneity Index",
    short: "Multi-scale measure of burn pattern diversity.",
    long: "Quantifies variation in burn history across different spatial scales. Higher heterogeneity is generally better for biodiversity, indicating a diverse mosaic of burn ages and patterns.",
    category: "fire",
  },
  {
    term: "Annual Burn %",
    short: "Percentage of the project area burnt in the current year.",
    long: "Split into EDS and LDS components. A well-managed savanna fire program typically aims for 30–50% annual burn, with most occurring in EDS.",
    category: "fire",
  },
  {
    term: "3-Year Rolling",
    short: "Cumulative burn coverage over a 3-year window.",
    long: "Tracks whether the full project area is being treated over a multi-year cycle. Aims to ensure all areas are burnt at least once every 3–5 years to prevent fuel build-up.",
    category: "fire",
  },
  {
    term: "Perimeter Impact",
    short: "Percentage of the project boundary affected by fire.",
    long: "Tracks fire encroachment along boundaries — important for managing fire risk to neighbouring properties, communities, and infrastructure.",
    category: "fire",
  },

  // --- Satellite & Detection ---
  {
    term: "VIIRS",
    short: "Visible Infrared Imaging Radiometer Suite.",
    long: "A sensor on the Suomi NPP and NOAA-20 satellites. Detects hotspots at 375m resolution with multiple daily passes. Higher spatial resolution than MODIS.",
    category: "satellite",
  },
  {
    term: "MODIS",
    short: "Moderate Resolution Imaging Spectroradiometer.",
    long: "A sensor on NASA's Terra and Aqua satellites. Detects hotspots at 1km resolution. Operational since 2000 — the longest continuous fire detection record.",
    category: "satellite",
  },
  {
    term: "DEA",
    short: "Digital Earth Australia — Geoscience Australia's satellite data platform.",
    long: "Provides near-real-time hotspot data from VIIRS, MODIS, and Himawari-8 satellites. Hotspot data is typically available within 1–3 hours of satellite overpass.",
    category: "satellite",
  },
  {
    term: "NAFI",
    short: "North Australia Fire Information — fire mapping service.",
    long: "Operated by Charles Darwin University. Provides MODIS 250m fire scar mapping across northern Australia since 2000. Updated approximately every 2 weeks during the fire season.",
    category: "satellite",
  },
  {
    term: "FRP",
    short: "Fire Radiative Power — intensity of a detected fire, in megawatts.",
    long: "Higher FRP indicates a more intense fire. FRP is used to estimate fire intensity, emissions, and distinguish active burning from smouldering.",
    category: "satellite",
  },
  {
    term: "Confidence",
    short: "Satellite detection certainty percentage.",
    long: "How certain the algorithm is that a hotspot is a real fire. ≥80% is high confidence, 50–80% is nominal, <50% is low. False positives can come from sun glint, hot bare soil, or industrial heat sources.",
    category: "satellite",
  },
  {
    term: "Himawari",
    short: "Japanese geostationary weather satellite covering Australia.",
    long: "Himawari-8/9 provides hotspot detections every 10 minutes at ~2km resolution. Lower spatial resolution than VIIRS/MODIS but much higher temporal resolution — good for tracking fire spread.",
    category: "satellite",
  },

  // --- Carbon & Emissions ---
  {
    term: "ACCU",
    short: "Australian Carbon Credit Unit — one tonne of CO₂-e abated.",
    long: "Issued by the Clean Energy Regulator for verified emissions reductions. Savanna burning projects earn ACCUs by shifting fire from LDS to EDS, reducing total emissions. ACCUs can be sold on the carbon market.",
    category: "carbon",
  },
  {
    term: "CER",
    short: "Clean Energy Regulator — Australian Government body.",
    long: "Administers the Emissions Reduction Fund (ERF) and issues ACCUs. Responsible for auditing and verifying carbon abatement claims.",
    category: "carbon",
  },
  {
    term: "SavBAT",
    short: "Savanna Burning Abatement Tool — official emissions calculator.",
    long: "Software tool used to calculate emissions from savanna fires and generate ACCU claims. Uses fire scar mapping, vegetation data, and the approved methodology to calculate net abatement.",
    category: "carbon",
  },
  {
    term: "CFI Table 3",
    short: "Area burnt by vegetation class and season.",
    long: "A required reporting table under the Carbon Farming Initiative methodology. Shows hectares burnt in EDS vs LDS for each vegetation fuel type.",
    category: "carbon",
  },
  {
    term: "CFI Table 9",
    short: "Fuel age distribution by vegetation class.",
    long: "Shows the percentage of each vegetation class in different fuel age categories (0–5+ years). Used to calculate fuel loads for emissions estimates.",
    category: "carbon",
  },
  {
    term: "Net Abatement",
    short: "Baseline emissions minus project emissions minus uncertainty.",
    long: "The number of ACCUs earned. Calculated as: Net Abatement = Baseline Emissions − Project Emissions − Uncertainty Buffer. Baseline is the average emissions from the pre-project fire history.",
    category: "carbon",
  },
  {
    term: "Baseline Emissions",
    short: "Average annual emissions from the pre-project fire history.",
    long: "Calculated from 10 years (high rainfall) or 15 years (low rainfall) of historical fire data before the project started. This is the reference point for measuring abatement.",
    category: "carbon",
  },
  {
    term: "Permanence Discount",
    short: "Reduction applied to ACCUs for risk of reversal.",
    long: "5% discount for 100-year permanence obligation, 25% for 25-year. Applies to sequestration projects. Avoidance-only projects typically use the 25-year / 25% discount.",
    category: "carbon",
  },
  {
    term: "Crediting Period",
    short: "How long the project can earn ACCUs.",
    long: "Either 7 years (fixed) or 25 years (standard). Longer crediting periods provide more ACCUs but come with longer permanence obligations.",
    category: "carbon",
  },
  {
    term: "tCO₂-e",
    short: "Tonnes of carbon dioxide equivalent.",
    long: "Standard unit for comparing greenhouse gas emissions. Methane (CH₄) has a GWP of 25 — one tonne of CH₄ equals 25 tCO₂-e. Nitrous oxide (N₂O) has a GWP of 298.",
    category: "carbon",
  },
  {
    term: "GWP",
    short: "Global Warming Potential — greenhouse gas multiplier.",
    long: "Converts different greenhouse gases to CO₂ equivalent. CH₄ GWP = 25, N₂O GWP = 298. Used in SavBAT emissions calculations.",
    category: "carbon",
  },

  // --- Operations ---
  {
    term: "DAI Spheres",
    short: "Delayed Action Incendiary — aerial fire-starting pellets.",
    long: "Small plastic spheres containing potassium permanganate, injected with glycol before dropping from a helicopter. They ignite 20–30 seconds after injection, allowing the aircraft to move on. Dispensed from a DAI machine mounted in the helicopter.",
    category: "operations",
  },
  {
    term: "DAI Machine",
    short: "Device that injects and drops DAI spheres from a helicopter.",
    long: "Mounted in the helicopter cabin, operated by the bombardier. Injects glycol into spheres at a set rate and spacing. Standard load is 500–1000 spheres per flight.",
    category: "operations",
  },
  {
    term: "Bombardier",
    short: "Crew member who operates the DAI machine in the helicopter.",
    long: "Responsible for sphere loading, injection rate, drop pattern, and ensuring cultural/no-go zones are avoided. Works closely with the pilot to achieve the planned burn pattern.",
    category: "operations",
  },
  {
    term: "Drip Torch",
    short: "Handheld ground burning tool that drips flaming fuel.",
    long: "Uses a 3:1 diesel-to-petrol mix. The operator walks along the planned burn line, dripping fuel to create a continuous fire line. Primary tool for ground-based burning operations.",
    category: "operations",
  },
  {
    term: "NOTAM",
    short: "Notice to Air Missions — airspace advisory.",
    long: "Filed before aerial burning operations to warn other aircraft. Specifies the area, altitude, and duration of operations. Required by CASA regulations.",
    category: "operations",
  },
  {
    term: "AGL",
    short: "Above Ground Level — altitude reference.",
    long: "Used in aviation and cultural zone restrictions. For example, 'no flyover below 1000ft AGL' means the aircraft must stay above 1000 feet measured from the terrain surface.",
    category: "operations",
  },
  {
    term: "CASA",
    short: "Civil Aviation Safety Authority — Australian aviation regulator.",
    long: "Regulates all aerial operations including helicopter fire management. Operations must comply with CASA requirements for crew qualifications, aircraft maintenance, and flight procedures.",
    category: "operations",
  },

  // --- Analysis ---
  {
    term: "Analysis Zone",
    short: "A sub-area of the project for targeted fire analysis.",
    long: "Projects are divided into analysis zones (e.g. individual islands, management blocks, or country groups) so metrics can be calculated and compared for each zone independently.",
    category: "analysis",
  },
  {
    term: "Rainfall Zone",
    short: "High (>1000mm/yr) or Low (600–1000mm/yr) annual rainfall.",
    long: "Determines baseline fire history period (10 vs 15 years), fuel accumulation rates, and vegetation types. High rainfall zones have faster fuel build-up and typically more intense LDS fires.",
    category: "analysis",
  },
  {
    term: "Cultural Zone",
    short: "Area with Traditional Owner restrictions on burning.",
    long: "Four types: No-Go (no access at all), Restricted (limited access with conditions), Sensitive (special care required), Heritage (heritage-listed sites). Reviewed annually with Traditional Owners.",
    category: "analysis",
  },
  {
    term: "Rolling Burn",
    short: "Cumulative burn coverage over a multi-year window (2 or 3 years).",
    long: "Smooths year-to-year variation to show whether the full landscape is being treated over time. Calculated as the proportion of the project area burnt at least once in the rolling window.",
    category: "analysis",
  },
  {
    term: "Unburnt Patches",
    short: "Contiguous areas of the project that were not burnt in a given year.",
    long: "Serve as critical wildlife refugia during and after fire. More and larger unburnt patches support better biodiversity outcomes. Target is ≥100 patches with mean area >1,000 ha.",
    category: "analysis",
  },
  {
    term: "Burn Count",
    short: "Number of times an area has been burnt over the analysis period.",
    long: "Also called fire frequency. A healthy distribution has most area burnt 2–5 times per decade. Areas never burnt accumulate fuel; areas burnt 8+ times may suffer degradation.",
    category: "analysis",
  },
  {
    term: "Distance to Unburnt",
    short: "Mean distance from burnt areas to the nearest unburnt refuge.",
    long: "A habitat connectivity metric. Shorter distances mean wildlife can more easily escape fire and reach shelter. Measured for annual, 3-year composite, and 3-year LDS-only burn extents.",
    category: "analysis",
  },
  {
    term: "Fuel Age",
    short: "Years since an area was last burnt — determines fuel load.",
    long: "Fuel load increases with time since last burn. Longer unburnt areas have more accumulated biomass and produce more emissions when they eventually burn. Used in CFI Table 9 for CER reporting.",
    category: "analysis",
  },
  {
    term: "Vegetation Classification",
    short: "Map of vegetation fuel types across the project area.",
    long: "Polygon layer classifying land into fuel type codes (e.g. Open Forest, Woodland, Grassland). Required for CFI Table 3 and Table 9. Typically sourced from state/territory vegetation mapping.",
    category: "analysis",
  },
  {
    term: "Project Boundary",
    short: "The geographic extent of the fire management project area.",
    long: "Defines the area over which all metrics are calculated. All fire scar data is clipped to this boundary before analysis. For carbon projects, must match the registered CER project boundary.",
    category: "analysis",
  },

  // --- Units ---
  {
    term: "ha",
    short: "Hectare — 10,000 square metres (about 2.47 acres).",
    category: "units",
  },
  {
    term: "MW",
    short: "Megawatt — unit of Fire Radiative Power.",
    category: "units",
  },
  {
    term: "AUD",
    short: "Australian Dollar.",
    category: "units",
  },
];

/** Look up a glossary entry by term (case-insensitive). */
export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  return GLOSSARY.find(
    (e) => e.term.toLowerCase() === term.toLowerCase()
  );
}

/** Get all entries for a category. */
export function getGlossaryByCategory(
  category: GlossaryCategory
): GlossaryEntry[] {
  return GLOSSARY.filter((e) => e.category === category);
}

// --- Page-level help descriptions ---

export interface PageHelp {
  title: string;
  description: string;
  tips?: string[];
}

export const PAGE_HELP: Record<string, PageHelp> = {
  "/dashboard": {
    title: "Dashboard",
    description:
      "15 core fire activity metrics calculated from satellite-detected fire scars. Use the zone selector in the header to filter by analysis zone.",
    tips: [
      "EDS burns are shown in blue, LDS in red throughout the app.",
      "Metrics update when new NAFI fire scar data is imported.",
      "Use the chart tabs to switch between different visualisations.",
    ],
  },
  "/map": {
    title: "Live Map",
    description:
      "Interactive map showing project boundaries, fire scars, satellite hotspots, burn plans, and cultural zones. Toggle layers using the panel on the right.",
    tips: [
      "Hotspot colours indicate age: red is recent (<6h), fading to grey (>48h).",
      "Click any feature for details — hotspots, zones, and burn plans all have popups.",
      "Use the buffer toggle to show data beyond the project boundary.",
    ],
  },
  "/hotspots": {
    title: "Live Hotspots",
    description:
      "Near-real-time satellite fire detections from DEA (Digital Earth Australia). Shows VIIRS, MODIS, and Himawari detections from the last 72 hours.",
    tips: [
      "High confidence (≥80%) detections are the most reliable.",
      "FRP (Fire Radiative Power) indicates fire intensity in megawatts.",
      "Data refreshes every 10 minutes from the DEA WFS service.",
    ],
  },
  "/fire-history": {
    title: "Fire Scar History",
    description:
      "Historical fire scar data from NAFI (North Australia Fire Information). Browse yearly and monthly burn records mapped from MODIS 250m satellite imagery.",
    tips: [
      "Switch between Annual and Monthly views for different granularity.",
      "EDS months are typically Jan–Jul, LDS is Aug–Dec.",
      "Use the Export button to download data for reporting.",
    ],
  },
  "/seasons": {
    title: "Fire Seasons",
    description:
      "Manage fire season definitions — set the EDS and LDS date windows for each year. Seasons drive burn plan scheduling and metric calculations.",
    tips: [
      "EDS and LDS windows can be adjusted per year to match local conditions.",
      "Season status tracks the planning lifecycle: planning → active → completed.",
    ],
  },
  "/burn-plans": {
    title: "Burn Plans",
    description:
      "Create, review, and approve planned burns. Each plan specifies area, vegetation, crew, method, and must pass through an approval workflow before execution.",
    tips: [
      "Plans follow a workflow: draft → reviewed → approved → scheduled → active → completed.",
      "Priority levels (high/medium/low) help with scheduling and resource allocation.",
      "Draw burn areas on the map when creating a new plan.",
    ],
  },
  "/cultural-zones": {
    title: "Cultural Zones",
    description:
      "Manage culturally sensitive areas defined with Traditional Owners. Zones restrict burning activities and are shown on the map to prevent accidental incursion.",
    tips: [
      "No-Go zones prohibit all access — these are shown prominently on the map.",
      "Restricted zones allow limited access with conditions (e.g. ground crew only).",
      "All zones should be reviewed annually with Traditional Owners.",
    ],
  },
  "/daily-plans": {
    title: "Daily Plans",
    description:
      "Day-of-operations planning — assign crews, aircraft, and burn targets based on current weather conditions and fire danger ratings.",
    tips: [
      "Check weather conditions before approving any daily plan.",
      "Fire danger ratings above 'Very High' typically restrict aerial operations.",
      "DAI sphere counts should match flight plan allocations.",
    ],
  },
  "/flights": {
    title: "Flight Plans",
    description:
      "Track aerial operations — aircraft, pilots, bombardiers, DAI sphere usage, and flight hours. Links flights to burn plans for accountability.",
    tips: [
      "Each flight should reconcile actual DAI spheres dropped vs planned.",
      "Download GPS tracks after each flight for burn verification.",
      "Fuel usage is estimated — update with actuals after each flight.",
    ],
  },
  "/checklists": {
    title: "Checklists",
    description:
      "Operational safety checklists for bombardier instructions, ground crew, pre-flight, post-flight, and daily safety briefings.",
    tips: [
      "Required items are marked — all must be completed before sign-off.",
      "Checklists must be signed off by the responsible crew leader.",
      "Post-flight checklists capture incident reports and GPS data.",
    ],
  },
  "/zones": {
    title: "Analysis Zones",
    description:
      "Define sub-areas of the project for targeted analysis. Import zones from shapefiles or GeoJSON, or draw them on the map.",
    tips: [
      "Zones let you compare fire metrics across different parts of the project.",
      "Common zone divisions: individual islands, management blocks, clan groups.",
      "Zone colours appear on the map and in metric charts.",
    ],
  },
  "/carbon": {
    title: "Carbon & ACCU Tracking",
    description:
      "Savanna burning carbon project management — track emissions abatement, ACCU generation, and CER reporting requirements.",
    tips: [
      "ACCUs are earned by reducing emissions below the baseline (shifting fire from LDS to EDS).",
      "CFI Table 3 and Table 9 are required for CER reporting.",
      "Use the SavBAT Prep button to export data for the official calculator.",
    ],
  },
  "/settings": {
    title: "Settings",
    description:
      "Project configuration — manage team members, data source connections, fire season defaults, and carbon project settings.",
    tips: [
      "Team roles control access: Admin > Manager > Ranger > Viewer.",
      "Data sources show connection status — check if any show errors.",
      "Carbon config must match your CER project registration exactly.",
    ],
  },
  "/methodology": {
    title: "Fire Metrics Methodology",
    description:
      "Comprehensive reference for how all 15 fire metrics are calculated, data sources used, the analysis pipeline, and assumptions. Suitable for CER auditors and new staff onboarding.",
    tips: [
      "Use Print / PDF to generate a standalone methodology document.",
      "Click any metric card to expand its full formula and interpretation.",
      "The glossary at the bottom defines all technical terms used in the app.",
    ],
  },
};
