/** Stat card help text, keyed by the card's key in stats-cards.tsx */
export const statCardHelp: Record<string, string> = {
  totalSites:
    "The number of camera trap deployment locations in this project.",
  totalSpecies:
    "The number of distinct species recorded across all sites.",
  totalObservations:
    "The total number of individual animal detection events recorded.",
  trapNights:
    "The cumulative number of nights each camera was active. Calculated as the sum of (end date − deploy date) across all sites. A key measure of survey effort.",
};

/** Chart help text, keyed by chart component name */
export const chartHelp: Record<string, string> = {
  detectionRate:
    "Shows how many times each species (or site) was detected. Taller bars indicate more frequently observed species. Limited to the top entries.",
  speciesRichness:
    "The number of unique species detected at each site. Higher bars indicate greater species diversity at that location.",
  temporal:
    "Monthly observation counts across all sites over time. Useful for spotting seasonal patterns in animal activity.",
  activityPattern:
    "A 24-hour chart showing when animals are most active. Peaks indicate hours with the most detections — useful for identifying nocturnal, diurnal, or crepuscular species.",
  speciesAccumulation:
    "Shows the cumulative number of new species discovered over time. A flattening curve suggests the survey is approaching a complete inventory of local species.",
  naiveOccupancy:
    "The proportion of sites where each species was detected. Naive occupancy does not account for imperfect detection — a species may be present but undetected.",
  diversity:
    "Shannon-Wiener diversity index (H') per site. Higher values indicate greater diversity. Accounts for both species richness and evenness of observations.",
};

/** Page-level help text */
export const pageHelp: Record<string, string> = {
  sites:
    "Camera stations are the physical locations where traps are deployed. Each site has coordinates and deployment dates that determine trap-nights.",
  species:
    "The species registry for this project. Each species can have a common name, scientific (Latin) name, and a local or Indigenous vernacular name. Species can be looked up from the Atlas of Living Australia (ALA) for automatic conservation status and images. During CSV import, observations are matched against all three name types.",
  observations:
    "Individual detection records from camera traps. Each observation links a species detection to a site and timestamp. Use filters to narrow results.",
  detectionHistories:
    "Detection histories are binary matrices (sites × occasions) used for occupancy modelling. Generate them by selecting a species and time window, then export as CSV for analysis in R or PRESENCE.",
  upload:
    "Import CSV data exported from camera trap management tools like TimeLapse or AddaxAI. The wizard auto-detects column mappings and validates data before import.",
  siteLocations:
    "An interactive map showing where each camera trap is deployed. Sites without coordinates will not appear on the map.",
};

/** Glossary of ecology and camera-trap terminology */
export const glossary: Array<{ term: string; definition: string }> = [
  {
    term: "Trap-Night",
    definition:
      "One camera operating for one night. If 10 cameras run for 30 nights, that is 300 trap-nights. This is the standard measure of survey effort.",
  },
  {
    term: "Naive Occupancy",
    definition:
      "The simple proportion of sites where a species was detected, without correcting for imperfect detection. Calculated as (sites with detections) ÷ (total sites).",
  },
  {
    term: "Detection History",
    definition:
      "A binary matrix where rows are sites and columns are survey occasions. A '1' means the species was detected during that occasion, '0' means it was not. Used as input for occupancy models.",
  },
  {
    term: "Occasion",
    definition:
      "A time period (e.g. 7 days) used to bin continuous camera data into discrete survey periods for detection histories.",
  },
  {
    term: "Species Richness",
    definition:
      "The count of distinct species found at a site or across the project. Does not account for abundance — a site with 1 observation of 10 species has the same richness as one with 1000 observations of 10 species.",
  },
  {
    term: "Shannon-Wiener Index (H')",
    definition:
      "A diversity measure that accounts for both species richness and evenness of observations. Higher values indicate more diverse communities. Ranges from 0 (one species) upward.",
  },
  {
    term: "Simpson's Diversity (1-D)",
    definition:
      "The probability that two randomly selected observations belong to different species. Values range from 0 to 1, with higher values indicating greater diversity.",
  },
  {
    term: "Species Accumulation Curve",
    definition:
      "A plot of cumulative species discovered over survey time. A steep curve means new species are still being found; a plateau suggests the survey has captured most local species.",
  },
  {
    term: "Detection Rate",
    definition:
      "The number of independent detections of a species, often expressed per unit of survey effort (e.g. detections per 100 trap-nights).",
  },
  {
    term: "Occupancy Modelling",
    definition:
      "A statistical framework that estimates the probability a species truly occupies a site while accounting for the fact that cameras don't detect everything. Requires detection history matrices.",
  },
  {
    term: "Conservation Status",
    definition:
      "A species' risk of extinction as assessed by IUCN or national bodies (e.g. EPBC Act in Australia). Categories: Least Concern (LC), Near Threatened (NT), Vulnerable (VU), Endangered (EN), Critically Endangered (CR).",
  },
  {
    term: "Crepuscular",
    definition:
      "Active primarily during twilight hours (dawn and dusk). Many Australian marsupials exhibit crepuscular activity patterns.",
  },
];

/** Overview content for the Help dialog */
export const appOverview = {
  title: "Welcome to WildTrack",
  description:
    "WildTrack is a camera trap data management and analytics platform designed for ranger teams, national parks, researchers, Indigenous land managers, and conservation groups. It helps you organise camera trap deployments, manage species registries, import observation data, and generate the analytical outputs needed for conservation research.",
  features: [
    "Organise projects within team workspaces with role-based access (Admin, Member, Viewer)",
    "Manage camera trap deployment sites with coordinates, dates, and an interactive map",
    "Maintain a species registry with Atlas of Living Australia (ALA) integration for taxonomy and conservation status",
    "Import CSV data from TimeLapse, AddaxAI, or any generic format with smart column auto-detection",
    "View analytics: detection rates, activity patterns, species accumulation, diversity indices, and more",
    "Generate detection history matrices for occupancy modelling and export as CSV",
    "Publish projects for public access or keep them private to your team",
    "Export data as CSV or GeoJSON for use in external tools",
  ],
};

/** Getting started steps for the Help dialog */
export const gettingStarted: Array<{
  step: number;
  title: string;
  description: string;
}> = [
  {
    step: 1,
    title: "Create an Organisation",
    description:
      "From the dashboard, create an organisation to group your projects. Choose a type (National Park, Research Group, etc.) and invite team members as Admins, Members, or Viewers.",
  },
  {
    step: 2,
    title: "Create a Project",
    description:
      "Within your organisation, create a project for each study area or monitoring program. Give it a name, location, and description.",
  },
  {
    step: 3,
    title: "Add Sites",
    description:
      "Add your camera trap deployment locations. Include GPS coordinates (so they appear on the map) and deployment dates (for trap-night calculations).",
  },
  {
    step: 4,
    title: "Upload Observation Data",
    description:
      "Use the Upload page to import CSV files. The wizard auto-detects columns from TimeLapse and AddaxAI formats. Map columns, preview the data, then import.",
  },
  {
    step: 5,
    title: "Explore Analytics",
    description:
      "Once data is imported, the project dashboard shows summary stats and charts — detection rates, activity patterns, species accumulation, diversity indices, and more.",
  },
  {
    step: 6,
    title: "Generate Detection Histories",
    description:
      "On the Detection Histories page, generate occupancy-format matrices for any species and time window. Export as CSV for analysis in R, PRESENCE, or similar tools.",
  },
];

/** Help text for upload-related concepts */
export const uploadHelp: Record<string, string> = {
  confidenceIndicator:
    "The coloured dot shows how confident the auto-mapping is. Green = high confidence (exact column name match), yellow = partial match, red = low confidence or unmapped. You can always override the mapping manually.",
};

/** Help text for detection history concepts */
export const detectionHistoryHelp: Record<string, string> = {
  occasionLength:
    "The number of days that make up one survey occasion. Common values are 1 (daily), 7 (weekly), or 14 (fortnightly). Shorter occasions give more columns but may have more zeros.",
  naiveOccupancy:
    "Calculated as the number of sites where the species was detected divided by the total number of sites. Does not account for imperfect detection.",
};
