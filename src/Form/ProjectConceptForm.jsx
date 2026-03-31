import React, { useState } from "react";

// ---- Helpers to build names ----

function makeSchemaEntityName(schemaName, versionLabel) {
  return `${schemaName}-${versionLabel}`;
}

function makeSchemaCatalogueName(schemaName, versionLabel) {
  return `catalogue-${schemaName}-${versionLabel}`;
}

function makeSampleEntityName(sampleName, versionLabel) {
  return `${sampleName}-${versionLabel}`;
}

function makeSampleCatalogueName(sampleName, versionLabel) {
  return `catalogue-${sampleName}-${versionLabel}`;
}

function makeDatasetCatalogueName(datasetName, versionLabel) {
  return `catalogue-${datasetName}-${versionLabel}`;
}

// ---- RO-Crate generator ----

function getMetadataId(crateType) {
  if (crateType === "Schema") return "ro-crate-metadata-schema.json";
  if (crateType === "Sample") return "ro-crate-metadata-sample.json";
  if (crateType === "Dataset") return "ro-crate-metadata-dataset.json";
  if (crateType === "Project") return "ro-crate-metadata-project.json";
  return "ro-crate-metadata.json";
}

function generateRoCrate(state) {
  const {
    projectName,
    schemaEnabled,
    schemaName,
    schemaVersions,
    sampleEnabled,
    sampleName,
    sampleVersions,
    datasetEnabled,
    datasetName,
    datasetVersions,
    crateType,
  } = state;

  const graph = [];

  const metadataId = getMetadataId(crateType);

  // Metadata entity
  graph.push({
    "@id": metadataId,
    "@type": "CreativeWork",
    conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" },
    about: { "@id": "./" },
  });

  // Root dataset
  const rootHasPart = [];

  // Collect file IDs depending on crateType
  const includeSchema = crateType === "Schema" || crateType === "Project";
  const includeSample = crateType === "Sample" || crateType === "Project";
  const includeDataset = crateType === "Dataset" || crateType === "Project";

  if (includeSchema && schemaEnabled) {
    schemaVersions.forEach((sv) => {
      if (sv.schemaFile) {
        rootHasPart.push({ "@id": sv.schemaFile.id });
      }
      if (sv.catalogueFile) {
        rootHasPart.push({ "@id": sv.catalogueFile.id });
      }
    });
  }

  if (includeSample && sampleEnabled) {
    sampleVersions.forEach((sv) => {
      if (sv.sampleFile) {
        rootHasPart.push({ "@id": sv.sampleFile.id });
      }
      if (sv.catalogueFile) {
        rootHasPart.push({ "@id": sv.catalogueFile.id });
      }
    });
  }

  if (includeDataset && datasetEnabled) {
    datasetVersions.forEach((dv) => {
      if (dv.catalogueFile) {
        rootHasPart.push({ "@id": dv.catalogueFile.id });
      }
    });
  }

  graph.push({
    "@id": "./",
    "@type": "Dataset",
    name: projectName || "project",
    hasPart: rootHasPart,
  });

  // ---- Schema entities ----
  if (includeSchema && schemaEnabled) {
    schemaVersions.forEach((sv, idx) => {
      if (!sv.schemaFile) return;
      const schemaEntity = {
        "@id": sv.schemaFile.id,
        "@type": ["File", "CreativeWork"],
        name: makeSchemaEntityName(schemaName, sv.versionLabel),
        encodingFormat: "application/json",
        version: sv.versionLabel,
      };
      if (idx > 0) {
        const prev = schemaVersions[idx - 1];
        if (prev.schemaFile) {
          schemaEntity.isVersionOf = { "@id": prev.schemaFile.id };
        }
      }
      graph.push(schemaEntity);

      if (sv.catalogueFile) {
        graph.push({
          "@id": sv.catalogueFile.id,
          "@type": ["File", "CreativeWork"],
          name: makeSchemaCatalogueName(schemaName, sv.versionLabel),
          encodingFormat: "application/json",
          about: { "@id": sv.schemaFile.id },
        });
      }
    });
  }

  // ---- Sample entities ----
  if (includeSample && sampleEnabled) {
    sampleVersions.forEach((sv, idx) => {
      if (!sv.sampleFile) return;
      const sampleEntity = {
        "@id": sv.sampleFile.id,
        "@type": ["File", "Dataset"],
        name: makeSampleEntityName(sampleName, sv.versionLabel),
        encodingFormat: "text/csv",
        version: sv.versionLabel,
      };

      // dct:conformsTo all selected schema JSON ids
      if (sv.relatedSchemaIds && sv.relatedSchemaIds.length > 0) {
        sampleEntity["dct:conformsTo"] = sv.relatedSchemaIds.map((id) => ({
          "@id": id,
        }));
      }

      // isVersionOf previous sample file
      if (idx > 0) {
        const prev = sampleVersions[idx - 1];
        if (prev.sampleFile) {
          sampleEntity.isVersionOf = { "@id": prev.sampleFile.id };
        }
      }

      graph.push(sampleEntity);

      if (sv.catalogueFile) {
        graph.push({
          "@id": sv.catalogueFile.id,
          "@type": ["File", "CreativeWork"],
          name: makeSampleCatalogueName(sampleName, sv.versionLabel),
          encodingFormat: "application/json",
          // This is the catalogue of the sample table, so we link to the sample CSV
          about: { "@id": sv.sampleFile.id },
        });
      }
    });
  }

  // ---- Dataset entities ----
  if (includeDataset && datasetEnabled) {
    datasetVersions.forEach((dv, idx) => {
      if (!dv.catalogueFile) return;

      const datasetCatEntity = {
        "@id": dv.catalogueFile.id,
        "@type": ["File", "CreativeWork"],
        name: makeDatasetCatalogueName(datasetName, dv.versionLabel),
        encodingFormat: "application/json",
        version: dv.versionLabel,
      };

      // add dct:conformsTo for related schema JSONs
      if (dv.relatedSchemaIds && dv.relatedSchemaIds.length > 0) {
        datasetCatEntity["dct:conformsTo"] = dv.relatedSchemaIds.map((id) => ({
          "@id": id,
        }));
      }

      if (idx > 0) {
        const prev = datasetVersions[idx - 1];
        if (prev.catalogueFile) {
          datasetCatEntity.isVersionOf = { "@id": prev.catalogueFile.id };
        }
      }

      graph.push(datasetCatEntity);
    });
  }

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
  const [schemaEnabled, setSchemaEnabled] = useState(false);
  const [schemaName, setSchemaName] = useState("");
  const [schemaVersions, setSchemaVersions] = useState([
    { versionLabel: "v1", schemaFile: null, catalogueFile: null },
  ]);

  // Sample state
  const [sampleEnabled, setSampleEnabled] = useState(false);
  const [sampleName, setSampleName] = useState("");
  const [sampleVersions, setSampleVersions] = useState([
    {
      versionLabel: "v1",
      sampleFile: null,
      catalogueFile: null,
      relatedSchemaIds: [],
    },
  ]);

  // Dataset state
  const [datasetEnabled, setDatasetEnabled] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [datasetVersions, setDatasetVersions] = useState([
    { versionLabel: "v1", catalogueFile: null, relatedSchemaIds: [] },
  ]);

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

  const addSchemaVersion = () => {
    setSchemaVersions((prev) => [
      ...prev,
      {
        versionLabel: `v${prev.length + 1}`,
        schemaFile: null,
        catalogueFile: null,
      },
    ]);
  };

  const handleSchemaVersionChange = (idx, field, value) => {
    const next = [...schemaVersions];
    next[idx][field] = value;
    setSchemaVersions(next);
  };

  const handleSchemaFileChange = (idx, type, file) => {
    if (!file) return;
    const next = [...schemaVersions];
    next[idx][type] = makeFileObj(file);
    setSchemaVersions(next);
  };

  // ---- Handlers for Sample ----

  const addSampleVersion = () => {
    setSampleVersions((prev) => [
      ...prev,
      {
        versionLabel: `v${prev.length + 1}`,
        sampleFile: null,
        catalogueFile: null,
        relatedSchemaIds: [],
      },
    ]);
  };

  const handleSampleVersionChange = (idx, field, value) => {
    const next = [...sampleVersions];
    next[idx][field] = value;
    setSampleVersions(next);
  };

  const handleSampleFileChange = (idx, type, file) => {
    if (!file) return;
    const next = [...sampleVersions];
    next[idx][type] = makeFileObj(file);
    setSampleVersions(next);
  };

  const handleSampleSchemaSelect = (idx, options) => {
    const values = Array.from(options)
      .filter((o) => o.selected)
      .map((o) => o.value);
    const next = [...sampleVersions];
    next[idx].relatedSchemaIds = values;
    setSampleVersions(next);
  };

  // ---- Handlers for Dataset ----

  const addDatasetVersion = () => {
    setDatasetVersions((prev) => [
      ...prev,
      {
        versionLabel: `v${prev.length + 1}`,
        catalogueFile: null,
        relatedSchemaIds: [],
      },
    ]);
  };

  const handleDatasetVersionChange = (idx, field, value) => {
    const next = [...datasetVersions];
    next[idx][field] = value;
    setDatasetVersions(next);
  };

  const handleDatasetFileChange = (idx, file) => {
    if (!file) return;
    const next = [...datasetVersions];
    next[idx].catalogueFile = makeFileObj(file);
    setDatasetVersions(next);
  };

  const handleDatasetSchemaSelect = (idx, options) => {
    const values = Array.from(options)
      .filter((o) => o.selected)
      .map((o) => o.value);
    const next = [...datasetVersions];
    next[idx].relatedSchemaIds = values;
    setDatasetVersions(next);
  };

  // ---- Generate RO-Crate ----

  const onGenerateCrate = () => {
    const crate = generateRoCrate({
      projectName,
      schemaEnabled,
      schemaName,
      schemaVersions,
      sampleEnabled,
      sampleName,
      sampleVersions,
      datasetEnabled,
      datasetName,
      datasetVersions,
      crateType,
    });
    setCratePreview(crate);
  };

  const onDownloadAllCrates = () => {
    const baseState = {
      projectName,
      schemaEnabled,
      schemaName,
      schemaVersions,
      sampleEnabled,
      sampleName,
      sampleVersions,
      datasetEnabled,
      datasetName,
      datasetVersions,
    };

    const types = ["Schema", "Sample", "Dataset", "Project"];

    types.forEach((type) => {
      // Skip types that have no content configured
      if (type === "Schema" && !schemaEnabled) return;
      if (type === "Sample" && !sampleEnabled) return;
      if (type === "Dataset" && !datasetEnabled) return;
      if (
        type === "Project" &&
        !schemaEnabled &&
        !sampleEnabled &&
        !datasetEnabled
      )
        return;

      const crate = generateRoCrate({ ...baseState, crateType: type });

      const metadataId = getMetadataId(type);
      // Use metadataId as filename, or prefix with project name if you like
      const filename = metadataId; // or `${projectName || 'project'}-${metadataId}`

      downloadJsonFile(filename, crate);
    });
  };

  // ---- Derived: schema IDs for sample schema selection ----

  const availableSchemaIds = schemaVersions
    .filter((sv) => sv.schemaFile)
    .map((sv) => sv.schemaFile.id);

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
            style={{ marginLeft: 8 }}
          />
        </label>
      </section>

      {/* 2) Schema section */}
      <section>
        <h2>2. Schemas</h2>
        {!schemaEnabled && (
          <button onClick={() => setSchemaEnabled(true)}>Add Schema</button>
        )}
        {schemaEnabled && (
          <div style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}>
            <div>
              <label>
                Schema name
                <input
                  type="text"
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              </label>
            </div>

            {schemaVersions.map((sv, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #eee",
                  padding: 10,
                  marginTop: 8,
                }}
              >
                <h3>Schema version {idx + 1}</h3>
                <div>
                  <label>
                    Version label
                    <input
                      type="text"
                      value={sv.versionLabel}
                      onChange={(e) =>
                        handleSchemaVersionChange(
                          idx,
                          "versionLabel",
                          e.target.value,
                        )
                      }
                      style={{ marginLeft: 8 }}
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Upload schema JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) =>
                        handleSchemaFileChange(
                          idx,
                          "schemaFile",
                          e.target.files?.[0] || null,
                        )
                      }
                      style={{ marginLeft: 8 }}
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
                      onChange={(e) =>
                        handleSchemaFileChange(
                          idx,
                          "catalogueFile",
                          e.target.files?.[0] || null,
                        )
                      }
                      style={{ marginLeft: 8 }}
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

            <button onClick={addSchemaVersion} style={{ marginTop: 8 }}>
              Add New Version
            </button>
          </div>
        )}
      </section>

      {/* 3) Sample section */}
      <section>
        <h2>3. Samples</h2>
        {!sampleEnabled && (
          <button onClick={() => setSampleEnabled(true)}>Add Sample</button>
        )}
        {sampleEnabled && (
          <div style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}>
            <div>
              <label>
                Sample name
                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              </label>
            </div>

            {sampleVersions.map((sv, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #eee",
                  padding: 10,
                  marginTop: 8,
                }}
              >
                <h3>Sample version {idx + 1}</h3>
                <div>
                  <label>
                    Version label
                    <input
                      type="text"
                      value={sv.versionLabel}
                      onChange={(e) =>
                        handleSampleVersionChange(
                          idx,
                          "versionLabel",
                          e.target.value,
                        )
                      }
                      style={{ marginLeft: 8 }}
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
                          idx,
                          "sampleFile",
                          e.target.files?.[0] || null,
                        )
                      }
                      style={{ marginLeft: 8 }}
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
                          idx,
                          "catalogueFile",
                          e.target.files?.[0] || null,
                        )
                      }
                      style={{ marginLeft: 8 }}
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
                        handleSampleSchemaSelect(idx, e.target.options)
                      }
                      style={{ marginLeft: 8, minWidth: 200, height: 80 }}
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

            <button onClick={addSampleVersion} style={{ marginTop: 8 }}>
              Add New Version
            </button>
          </div>
        )}
      </section>

      {/* 4) Dataset section */}
      <section>
        <h2>4. Datasets</h2>
        {!datasetEnabled && (
          <button onClick={() => setDatasetEnabled(true)}>Add Dataset</button>
        )}
        {datasetEnabled && (
          <div style={{ border: "1px solid #ddd", padding: 12, marginTop: 8 }}>
            <div>
              <label>
                Dataset name
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              </label>
            </div>

            {datasetVersions.map((dv, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #eee",
                  padding: 10,
                  marginTop: 8,
                }}
              >
                <h3>Dataset version {idx + 1}</h3>
                <div>
                  <label>
                    Version label
                    <input
                      type="text"
                      value={dv.versionLabel}
                      onChange={(e) =>
                        handleDatasetVersionChange(
                          idx,
                          "versionLabel",
                          e.target.value,
                        )
                      }
                      style={{ marginLeft: 8 }}
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
                          idx,
                          e.target.files?.[0] || null,
                        )
                      }
                      style={{ marginLeft: 8 }}
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
                        handleDatasetSchemaSelect(idx, e.target.options)
                      }
                      style={{ marginLeft: 8, minWidth: 200, height: 80 }}
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

            <button onClick={addDatasetVersion} style={{ marginTop: 8 }}>
              Add New Version
            </button>
          </div>
        )}
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
