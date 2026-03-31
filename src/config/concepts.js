// Concept types your UI supports
export const CONCEPT_TYPES = ["schema", "dataset", "sampleCollection", "code"];

export const CONCEPT_CONFIG = [
  {
    type: "schema",
    label: "Schema",
    fields: [
      { name: "name", label: "Schema Name", type: "text", required: true },
      {
        name: "versionLabel",
        label: "Version Label",
        type: "text",
        required: true,
      },
      {
        name: "schemaFile",
        label: "Schema JSON File",
        type: "file",
        required: true,
      },
      {
        name: "catalogueFile",
        label: "Catalogue JSON File",
        type: "file",
        required: true,
      },
    ],
  },
  {
    type: "dataset",
    label: "Dataset",
    fields: [
      { name: "name", label: "Dataset Name", type: "text", required: true },
      {
        name: "versionLabel",
        label: "Version Label",
        type: "text",
        required: true,
      },
      {
        name: "dataFile",
        label: "Data File (CSV)",
        type: "file",
        required: true,
      },
      {
        name: "catalogueFile",
        label: "Catalogue JSON File",
        type: "file",
        required: true,
      },
    ],
  },
  // add sampleCollection, code...
];

// Which concept types can relate to which others, and how
export const COMBINATION_RULES = [
  {
    from: "dataset",
    to: "schema",
    relation: "conformsTo",
    label: "Dataset conforms to Schema",
  },
  // add dataset→code, schema→sampleCollection, etc.
];
