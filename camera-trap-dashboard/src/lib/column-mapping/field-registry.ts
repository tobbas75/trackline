export interface SystemField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "date" | "datetime" | "coordinate";
  required: boolean;
  aliases: string[]; // common CSV column names that auto-match
}

export const DEPLOYMENT_FIELDS: SystemField[] = [
  {
    key: "site_name",
    label: "Site Name",
    type: "text",
    required: true,
    aliases: [
      "site", "station", "camera", "Site", "Station", "Camera",
      "SiteName", "site_id", "CameraStation", "camera_station",
    ],
  },
  {
    key: "latitude",
    label: "Latitude",
    type: "coordinate",
    required: true,
    aliases: ["lat", "Latitude", "Lat", "y", "Y", "latitude_dd"],
  },
  {
    key: "longitude",
    label: "Longitude",
    type: "coordinate",
    required: true,
    aliases: [
      "lon", "lng", "long", "Longitude", "Long", "Lng", "x", "X", "longitude_dd",
    ],
  },
  {
    key: "date_deployed",
    label: "Date Deployed",
    type: "date",
    required: false,
    aliases: [
      "start", "Start", "DateDeployed", "deploy_date", "setup_date",
      "StartDate", "date_start",
    ],
  },
  {
    key: "date_end",
    label: "Date End",
    type: "date",
    required: false,
    aliases: [
      "end", "End", "DateEnd", "pickup_date", "EndDate", "date_end",
      "retrieval_date",
    ],
  },
  {
    key: "comments",
    label: "Comments",
    type: "text",
    required: false,
    aliases: ["notes", "Notes", "Comments", "comment", "description"],
  },
];

export const OBSERVATION_FIELDS: SystemField[] = [
  {
    key: "site_name",
    label: "Site Name",
    type: "text",
    required: true,
    aliases: [
      "site", "station", "Site", "Station", "Camera", "SiteName", "RelativePath",
    ],
  },
  {
    key: "species_name",
    label: "Species",
    type: "text",
    required: false,
    aliases: [
      "species", "Species", "common_name", "CommonName", "animal", "Animal",
      "classification", "local_name", "LocalName", "vernacular",
      "VernacularName", "indigenous_name",
    ],
  },
  {
    key: "observed_at",
    label: "Date/Time",
    type: "datetime",
    required: true,
    aliases: [
      "datetime", "DateTime", "Date", "date", "timestamp", "Timestamp",
      "Photo.Date",
    ],
  },
  {
    key: "count",
    label: "Count",
    type: "number",
    required: false,
    aliases: [
      "Count", "count", "number", "Number", "NumberOfAnimals", "individuals",
    ],
  },
  {
    key: "is_animal",
    label: "Is Animal",
    type: "boolean",
    required: false,
    aliases: ["Animal", "is_animal", "IsAnimal"],
  },
  {
    key: "is_empty",
    label: "Empty Image",
    type: "boolean",
    required: false,
    aliases: ["Empty", "is_empty", "IsEmpty", "blank", "Blank", "nothing"],
  },
  {
    key: "individual_id",
    label: "Individual ID",
    type: "text",
    required: false,
    aliases: [
      "IndividualID", "individual", "Individual", "AnimalID", "animal_id",
    ],
  },
  {
    key: "temperature",
    label: "Temperature",
    type: "number",
    required: false,
    aliases: ["temp", "Temp", "Temperature", "temperature"],
  },
  {
    key: "file_path",
    label: "File Path",
    type: "text",
    required: false,
    aliases: [
      "RelativePath", "FilePath", "file_path", "ImagePath", "path",
    ],
  },
  {
    key: "file_name",
    label: "File Name",
    type: "text",
    required: false,
    aliases: [
      "File", "FileName", "file_name", "ImageName", "image",
    ],
  },
  {
    key: "detection_confidence",
    label: "Detection Confidence",
    type: "number",
    required: false,
    aliases: [
      "conf", "confidence", "Confidence", "detection_conf", "DetectionConfidence",
    ],
  },
  {
    key: "classification_confidence",
    label: "Classification Confidence",
    type: "number",
    required: false,
    aliases: [
      "classification_conf", "ClassificationConfidence", "species_conf",
    ],
  },
];

export function getFieldsForType(uploadType: string): SystemField[] {
  switch (uploadType) {
    case "deployments":
      return DEPLOYMENT_FIELDS;
    case "observations":
      return OBSERVATION_FIELDS;
    default:
      return [];
  }
}
