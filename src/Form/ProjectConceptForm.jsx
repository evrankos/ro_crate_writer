import React, { useState } from "react";

// ---- Helpers to build names ----

// function makeSchemaEntityName(schemaName, versionLabel) {
//   return `${schemaName}-${versionLabel}`;
// }

// function makeSchemaCatalogueName(schemaName, versionLabel) {
//   return `catalogue-${schemaName}-${versionLabel}`;
// }

// function makeSampleEntityName(sampleName, versionLabel) {
//   return `${sampleName}-${versionLabel}`;
// }

// function makeSampleCatalogueName(sampleName, versionLabel) {
//   return `catalogue-${sampleName}-${versionLabel}`;
// }

// function makeDatasetCatalogueName(datasetName, versionLabel) {
//   return `catalogue-${datasetName}-${versionLabel}`;
// }

// ---- RO-Crate generator ----

function getMetadataId(crateType) {
  if (crateType === "Schema") return "ro-crate-metadata-schema.json";
  if (crateType === "Sample") return "ro-crate-metadata-sample.json";
  if (crateType === "Dataset") return "ro-crate-metadata-dataset.json";
  if (crateType === "Project") return "ro-crate-metadata-project.json";
  return "ro-crate-metadata.json";
}

function generateRoCrate(state) {
  const { projectName, crateType, schemas, samples, datasets } = state;

  const graph = [];

  const metadataId = getMetadataId(crateType);

  // Metadata entity
  graph.push({
    "@id": metadataId,
    "@type": "CreativeWork",
    conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" },
    about: { "@id": "./" },
  });

  // Collect file IDs depending on crateType
  const includeSchema = crateType === "Schema" || crateType === "Project";
  const includeSample = crateType === "Sample" || crateType === "Project";
  const includeDataset = crateType === "Dataset" || crateType === "Project";

  // Root dataset
  const rootHasPart = [];

  graph.push({
    "@id": "./",
    "@type": "Dataset",
    name: projectName || "project",
    hasPart: rootHasPart,
  });

  // ---- Schema entities ----
  if (includeSchema) {
    schemas.forEach((schema) => {
      schema.versions.forEach((sv, idx) => {
        if (!sv.schemaFile) return;
        const schemaEntity = {
          "@id": sv.schemaFile.id,
          "@type": ["File", "CreativeWork"],
          name: `${schema.name}-${sv.versionLabel}`,
          encodingFormat: "application/json",
          version: sv.versionLabel,
        };
        if (idx > 0) {
          const prev = schema.versions[idx - 1];
          if (prev.schemaFile) {
            schemaEntity.isVersionOf = { "@id": prev.schemaFile.id };
          }
        }
        graph.push(schemaEntity);

        if (sv.catalogueFile) {
          graph.push({
            "@id": sv.catalogueFile.id,
            "@type": ["File", "CreativeWork"],
            name: `catalogue-${schema.name}-${sv.versionLabel}`,
            encodingFormat: "application/json",
            about: { "@id": sv.schemaFile.id },
          });
        }
        rootHasPart.push({ "@id": sv.schemaFile.id });
        if (sv.catalogueFile) rootHasPart.push({ "@id": sv.catalogueFile.id });
      });
    });
  }

  // ---- Sample entities ----
  if (includeSample) {
    samples.forEach((sample) => {
      sample.versions.forEach((sv, idx) => {
        if (!sv.sampleFile) return;

        const sampleEntity = {
          "@id": sv.sampleFile.id,
          "@type": ["File", "Dataset"],
          name: `${sample.name}-${sv.versionLabel}`,
          encodingFormat: "text/csv",
          version: sv.versionLabel,
        };

        if (sv.relatedSchemaIds && sv.relatedSchemaIds.length > 0) {
          sampleEntity["dct:conformsTo"] = sv.relatedSchemaIds.map((id) => ({
            "@id": id,
          }));
        }

        if (idx > 0) {
          const prev = sample.versions[idx - 1];
          if (prev.sampleFile) {
            sampleEntity.isVersionOf = { "@id": prev.sampleFile.id };
          }
        }

        graph.push(sampleEntity);

        if (sv.catalogueFile) {
          graph.push({
            "@id": sv.catalogueFile.id,
            "@type": ["File", "CreativeWork"],
            name: `catalogue-${sample.name}-${sv.versionLabel}`,
            encodingFormat: "application/json",
            about: { "@id": sv.sampleFile.id }, // catalogue describes the sample table
          });
        }

        rootHasPart.push({ "@id": sv.sampleFile.id });
        if (sv.catalogueFile) rootHasPart.push({ "@id": sv.catalogueFile.id });
      });
    });
  }
  // if (includeSample && sampleEnabled) {
  //   sampleVersions.forEach((sv, idx) => {
  //     if (!sv.sampleFile) return;
  //     const sampleEntity = {
  //       "@id": sv.sampleFile.id,
  //       "@type": ["File", "Dataset"],
  //       name: makeSampleEntityName(sampleName, sv.versionLabel),
  //       encodingFormat: "text/csv",
  //       version: sv.versionLabel,
  //     };

  //     // dct:conformsTo all selected schema JSON ids
  //     if (sv.relatedSchemaIds && sv.relatedSchemaIds.length > 0) {
  //       sampleEntity["dct:conformsTo"] = sv.relatedSchemaIds.map((id) => ({
  //         "@id": id,
  //       }));
  //     }

  //     // isVersionOf previous sample file
  //     if (idx > 0) {
  //       const prev = sampleVersions[idx - 1];
  //       if (prev.sampleFile) {
  //         sampleEntity.isVersionOf = { "@id": prev.sampleFile.id };
  //       }
  //     }

  //     graph.push(sampleEntity);

  //     if (sv.catalogueFile) {
  //       graph.push({
  //         "@id": sv.catalogueFile.id,
  //         "@type": ["File", "CreativeWork"],
  //         name: makeSampleCatalogueName(sampleName, sv.versionLabel),
  //         encodingFormat: "application/json",
  //         // This is the catalogue of the sample table, so we link to the sample CSV
  //         about: { "@id": sv.sampleFile.id },
  //       });
  //     }
  //   });
  // }

  // ---- Dataset entities ----
  if (includeDataset) {
    datasets.forEach((dataset) => {
      dataset.versions.forEach((dv, idx) => {
        if (!dv.catalogueFile) return;

        const datasetCatEntity = {
          "@id": dv.catalogueFile.id,
          "@type": ["File", "CreativeWork"],
          name: `catalogue-${dataset.name}-${dv.versionLabel}`,
          encodingFormat: "application/json",
          version: dv.versionLabel,
        };

        if (dv.relatedSchemaIds && dv.relatedSchemaIds.length > 0) {
          datasetCatEntity["dct:conformsTo"] = dv.relatedSchemaIds.map(
            (id) => ({ "@id": id }),
          );
        }

        if (idx > 0) {
          const prev = dataset.versions[idx - 1];
          if (prev.catalogueFile) {
            datasetCatEntity.isVersionOf = { "@id": prev.catalogueFile.id };
          }
        }

        graph.push(datasetCatEntity);
        rootHasPart.push({ "@id": dv.catalogueFile.id });
      });
    });
  }
  // if (includeDataset && datasetEnabled) {
  //   datasetVersions.forEach((dv, idx) => {
  //     if (!dv.catalogueFile) return;

  //     const datasetCatEntity = {
  //       "@id": dv.catalogueFile.id,
  //       "@type": ["File", "CreativeWork"],
  //       name: makeDatasetCatalogueName(datasetName, dv.versionLabel),
  //       encodingFormat: "application/json",
  //       version: dv.versionLabel,
  //     };

  //     // add dct:conformsTo for related schema JSONs
  //     if (dv.relatedSchemaIds && dv.relatedSchemaIds.length > 0) {
  //       datasetCatEntity["dct:conformsTo"] = dv.relatedSchemaIds.map((id) => ({
  //         "@id": id,
  //       }));
  //     }

  //     if (idx > 0) {
  //       const prev = datasetVersions[idx - 1];
  //       if (prev.catalogueFile) {
  //         datasetCatEntity.isVersionOf = { "@id": prev.catalogueFile.id };
  //       }
  //     }

  //     graph.push(datasetCatEntity);
  //   });
  // }

  return {
    "@context": "https://w3id.org/ro/crate/1.2/context",
    "@graph": graph,
  };
}

function downloadJsonFile(filename, data) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Main React component ----

const ProjectConceptForm = () => {
  const [projectName, setProjectName] = useState("");

  // Schema state
  const [schemas, setSchemas] = useState([]); // For multiple schemas

  // Sample state
  const [samples, setSamples] = useState([]); // For multiple samples

  // Dataset state
  const [datasets, setDatasets] = useState([]); // For multiple datasets

  // Crate type
  const [crateType, setCrateType] = useState("Schema"); // Schema, Sample, Dataset, Project

  // Preview
  const [cratePreview, setCratePreview] = useState(null);

  // Helper to store files (no backend; use file.name as @id)
  const makeFileObj = (file) => ({
    id: file.name,
    name: file.name,
  });

  // ---- Handlers for Schema ----

  const addSchema = () => {
    setSchemas((prev) => [
      ...prev,
      {
        name: "",
        versions: [
          { versionLabel: "v1", schemaFile: null, catalogueFile: null },
        ],
      },
    ]);
  };

  // ---- Handlers for Sample ----

  const addSample = () => {
    setSamples((prev) => [
      ...prev,
      {
        name: "",
        versions: [
          {
            versionLabel: "v1",
            sampleFile: null,
            catalogueFile: null,
            relatedSchemaIds: [],
          },
        ],
      },
    ]);
  };

  const updateSampleName = (sIdx, value) => {
    const next = [...samples];
    next[sIdx].name = value;
    setSamples(next);
  };

  const addSampleVersion = (sIdx) => {
    const next = [...samples];
    next[sIdx].versions.push({
      versionLabel: "v" + (next[sIdx].versions.length + 1),
      sampleFile: null,
      catalogueFile: null,
      relatedSchemaIds: [],
    });
    setSamples(next);
  };

  const updateSampleVersionField = (sIdx, vIdx, field, value) => {
    const next = [...samples];
    next[sIdx].versions[vIdx][field] = value;
    setSamples(next);
  };

  const handleSampleFileChange = (sIdx, vIdx, field, file) => {
    if (!file) return;
    const next = [...samples];
    next[sIdx].versions[vIdx][field] = makeFileObj(file);
    setSamples(next);
  };

  const handleSampleSchemaSelect = (sIdx, vIdx, options) => {
    const values = Array.from(options)
      .filter((o) => o.selected)
      .map((o) => o.value);
    const next = [...samples];
    next[sIdx].versions[vIdx].relatedSchemaIds = values;
    setSamples(next);
  };

  // ---- Handlers for Dataset ----

  const addDataset = () => {
    setDatasets((prev) => [
      ...prev,
      {
        name: "",
        versions: [
          {
            versionLabel: "v1",
            catalogueFile: null,
            relatedSchemaIds: [],
          },
        ],
      },
    ]);
  };

  const updateDatasetName = (dIdx, value) => {
    const next = [...datasets];
    next[dIdx].name = value;
    setDatasets(next);
  };

  const addDatasetVersion = (dIdx) => {
    const next = [...datasets];
    next[dIdx].versions.push({
      versionLabel: "v" + (next[dIdx].versions.length + 1),
      catalogueFile: null,
      relatedSchemaIds: [],
    });
    setDatasets(next);
  };

  const updateDatasetVersionField = (dIdx, vIdx, field, value) => {
    const next = [...datasets];
    next[dIdx].versions[vIdx][field] = value;
    setDatasets(next);
  };

  const handleDatasetFileChange = (dIdx, vIdx, file) => {
    if (!file) return;
    const next = [...datasets];
    next[dIdx].versions[vIdx].catalogueFile = makeFileObj(file);
    setDatasets(next);
  };

  const handleDatasetSchemaSelect = (dIdx, vIdx, options) => {
    const values = Array.from(options)
      .filter((o) => o.selected)
      .map((o) => o.value);
    const next = [...datasets];
    next[dIdx].versions[vIdx].relatedSchemaIds = values;
    setDatasets(next);
  };

  // ---- Generate RO-Crate ----

  const onGenerateCrate = () => {
    const crate = generateRoCrate({
      projectName,
      crateType,
      schemas,
      samples,
      datasets,
    });
    setCratePreview(crate);
  };

  const onDownloadAllCrates = () => {
    const baseState = {
      projectName,
      schemas,
      samples,
      datasets,
    };

    const types = ["Schema", "Sample", "Dataset", "Project"];

    types.forEach((type) => {
      // skip empty types
      if (type === "Schema" && schemas.length === 0) return;
      if (type === "Sample" && samples.length === 0) return;
      if (type === "Dataset" && datasets.length === 0) return;
      if (
        type === "Project" &&
        !schemas.length &&
        !samples.length &&
        !datasets.length
      )
        return;

      const crate = generateRoCrate({ ...baseState, crateType: type });

      const metadataId = getMetadataId(type);
      // Use metadataId as filename, or prefix with project name if you like
      const filename = metadataId;

      downloadJsonFile(filename, crate);
    });
  };

  // ---- Derived: schema IDs for sample schema selection ----

  const availableSchemaIds = schemas
    .flatMap((schema) => schema.versions)
    .filter((v) => v.schemaFile)
    .map((v) => v.schemaFile.id);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>ContextVault RO-Crate Builder</h1>

      {/* 1) Project name */}
      <section>
        <h2>1. Project name</h2>
        <label>
          Name of the project
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={{ marginLeft: 16 }}
          />
        </label>
      </section>

      {/* 2) Schema section */}
      <section>
        <h2>2. Schemas</h2>
        <button onClick={addSchema}>Add Schema</button>
        {schemas.map((schema, sIdx) => (
          <div
            key={sIdx}
            style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}
          >
            <div>
              <label>
                Schema name
                <input
                  type="text"
                  value={schema.name}
                  onChange={(e) => {
                    const next = [...schemas];
                    next[sIdx].name = e.target.value;
                    setSchemas(next);
                    // setSchemaName(e.target.value)
                  }}
                  style={{ marginLeft: 16 }}
                />
              </label>
            </div>

            {schema.versions.map((sv, vIdx) => (
              <div
                key={vIdx}
                style={{
                  border: "1px solid #eee",
                  padding: 10,
                  marginTop: 8,
                }}
              >
                <h3>
                  Schema {sIdx + 1} - version {vIdx + 1}
                </h3>
                <div>
                  <label>
                    Version label
                    <input
                      type="text"
                      value={sv.versionLabel}
                      onChange={(e) => {
                        const next = [...schemas];
                        next[sIdx].versions[vIdx].versionLabel = e.target.value;
                        setSchemas(next);
                      }}
                      style={{ marginLeft: 192 }}
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Upload schema JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const next = [...schemas];
                        next[sIdx].versions[vIdx].schemaFile = {
                          id: file.name,
                          name: file.name,
                        };
                        setSchemas(next);
                      }}
                      style={{ marginTop: 8, marginLeft: 131 }}
                    />
                  </label>
                  {sv.schemaFile && (
                    <span style={{ marginLeft: 8 }}>
                      ✔ {sv.schemaFile.name}
                    </span>
                  )}
                </div>
                <div>
                  <label>
                    Upload catalogue description JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const next = [...schemas];
                        next[sIdx].versions[vIdx].catalogueFile = {
                          id: file.name,
                          name: file.name,
                        };
                        setSchemas(next);
                      }}
                      style={{ marginTop: 8, marginLeft: 32 }}
                    />
                  </label>
                  {sv.catalogueFile && (
                    <span style={{ marginLeft: 8 }}>
                      ✔ {sv.catalogueFile.name}
                    </span>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={() => {
                const next = [...schemas];
                next[sIdx].versions.push({
                  versionLabel: "v" + (schema.versions.length + 1),
                  schemaFile: null,
                  catalogueFile: null,
                });
                setSchemas(next);
              }}
              style={{ marginTop: 8 }}
            >
              Add New Version
            </button>
          </div>
        ))}
      </section>

      {/* 3) Sample section */}
      <section>
        <h2>3. Samples</h2>

        <button onClick={addSample}>Add Sample</button>

        {samples.map((sample, sIdx) => (
          <div
            key={sIdx}
            style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}
          >
            <div>
              <label>
                Sample name
                <input
                  type="text"
                  value={sample.name}
                  onChange={(e) => updateSampleName(sIdx, e.target.value)}
                  style={{ marginLeft: 16 }}
                />
              </label>
            </div>

            {sample.versions.map((sv, vIdx) => (
              <div
                key={vIdx}
                style={{
                  border: "1px solid #eee",
                  padding: 10,
                  marginTop: 8,
                }}
              >
                <h3>
                  Sample {sIdx + 1} - version {vIdx + 1}
                </h3>
                <div>
                  <label>
                    Version label
                    <input
                      type="text"
                      value={sv.versionLabel}
                      onChange={(e) =>
                        updateSampleVersionField(
                          sIdx,
                          vIdx,
                          "versionLabel",
                          e.target.value,
                        )
                      }
                      style={{ marginLeft: 192 }}
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Upload sample CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) =>
                        handleSampleFileChange(
                          sIdx,
                          vIdx,
                          "sampleFile",
                          e.target.files?.[0] || null,
                        )
                      }
                      style={{ marginTop: 8, marginLeft: 144 }}
                    />
                  </label>
                  {sv.sampleFile && (
                    <span style={{ marginLeft: 8 }}>
                      ✔ {sv.sampleFile.name}
                    </span>
                  )}
                </div>
                <div>
                  <label>
                    Upload catalogue description JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) =>
                        handleSampleFileChange(
                          sIdx,
                          vIdx,
                          "catalogueFile",
                          e.target.files?.[0] || null,
                        )
                      }
                      style={{ marginTop: 8, marginLeft: 32 }}
                    />
                  </label>
                  {sv.catalogueFile && (
                    <span style={{ marginLeft: 8 }}>
                      ✔ {sv.catalogueFile.name}
                    </span>
                  )}
                </div>
                <div>
                  <label>
                    Select related schema JSONs (multiple)
                    <select
                      multiple
                      value={sv.relatedSchemaIds}
                      onChange={(e) =>
                        handleSampleSchemaSelect(sIdx, vIdx, e.target.options)
                      }
                      style={{
                        marginTop: 8,
                        marginLeft: 8,
                        minWidth: 200,
                        height: 80,
                      }}
                    >
                      {availableSchemaIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}

            <button
              onClick={() => addSampleVersion(sIdx)}
              style={{ marginTop: 8 }}
            >
              Add New Version
            </button>
          </div>
        ))}
      </section>

      {/* 4) Dataset section */}
      <section>
        <h2>4. Datasets</h2>
        <button onClick={addDataset}>Add Dataset</button>
        {datasets.map((dataset, dIdx) => (
          <div
            key={dIdx}
            style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}
          >
            <div>
              <label>
                Dataset name
                <input
                  type="text"
                  value={dataset.name}
                  onChange={(e) => updateDatasetName(dIdx, e.target.value)}
                  style={{ marginLeft: 16 }}
                />
              </label>
            </div>

            {dataset.versions.map((dv, vIdx) => (
              <div
                key={vIdx}
                style={{
                  border: "1px solid #eee",
                  padding: 10,
                  marginTop: 8,
                }}
              >
                <h3>
                  Dataset {dIdx + 1} – version {vIdx + 1}
                </h3>
                <div>
                  <label>
                    Version label
                    <input
                      type="text"
                      value={dv.versionLabel}
                      onChange={(e) =>
                        updateDatasetVersionField(
                          dIdx,
                          vIdx,
                          "versionLabel",
                          e.target.value,
                        )
                      }
                      style={{ marginLeft: 248 }}
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Upload dataset catalogue description JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) =>
                        handleDatasetFileChange(
                          dIdx,
                          vIdx,
                          e.target.files?.[0] || null,
                        )
                      }
                      style={{ marginTop: 8, marginLeft: 32 }}
                    />
                  </label>
                  {dv.catalogueFile && (
                    <span style={{ marginLeft: 8 }}>
                      ✔ {dv.catalogueFile.name}
                    </span>
                  )}
                </div>
                <div>
                  <label>
                    Select related schema JSONs (multiple)
                    <select
                      multiple
                      value={dv.relatedSchemaIds || []}
                      onChange={(e) =>
                        handleDatasetSchemaSelect(dIdx, vIdx, e.target.options)
                      }
                      style={{
                        marginTop: 8,
                        marginLeft: 64,
                        minWidth: 200,
                        height: 80,
                      }}
                    >
                      {availableSchemaIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}

            <button
              onClick={() => addDatasetVersion(dIdx)}
              style={{ marginTop: 8 }}
            >
              Add New Version
            </button>
          </div>
        ))}
      </section>

      {/* 5) Preview */}
      <section>
        <h2>5. Preview RO-Crates</h2>
        <label>
          Preview crate for:
          <select
            value={crateType}
            onChange={(e) => setCrateType(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value="Schema">Schema</option>
            <option value="Sample">Sample</option>
            <option value="Dataset">Dataset</option>
            <option value="Project">Project</option>
          </select>
        </label>
        <button style={{ marginLeft: 16 }} onClick={onGenerateCrate}>
          Preview RO-Crate
        </button>
        {cratePreview && (
          <pre
            style={{
              marginTop: 16,
              background: "#f5f5f5",
              padding: 12,
              maxHeight: 500,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {JSON.stringify(cratePreview, null, 2)}
          </pre>
        )}
      </section>

      {/* 6) Download crates */}
      <section>
        <h2>6. Download RO-Crates</h2>
        <button style={{ marginLeft: 8 }} onClick={onDownloadAllCrates}>
          Download All RO-Crates
        </button>
      </section>
    </div>
  );
};

export default ProjectConceptForm;
