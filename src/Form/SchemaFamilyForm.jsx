import React, { useState } from "react";
import { uploadFile } from "../api/api";
import { generateRoCrateSchemaFamily } from "../utils/roCrate";

const SchemaFamilyForm = () => {
  const [projectName, setProjectName] = useState("cow");
  const [schemaVersions, setSchemaVersions] = useState([]);
  const [cratePreview, setCratePreview] = useState(null);

  // Add a new version
  const addVersion = () => {
    setSchemaVersions((prev) => [
      ...prev,
      {
        versionLabel: "version" + (prev.length + 1),
        file: null,
        catalogueFile: null,
      },
    ]);
  };

  const handleFileChange = async (versionIdx, fileType, file) => {
    if (!file) return;

    try {
      const res = await uploadFile(file);
      const updated = [...schemaVersions];
      updated[versionIdx][fileType] = {
        ...res,
        id: res.id,
        name: file.name,
      };
      setSchemaVersions(updated);
    } catch (e) {
      console.error("Upload failed", e);
    }
  };

  const handleVersionLabelChange = (idx, value) => {
    const updated = [...schemaVersions];
    updated[idx].versionLabel = value;
    setSchemaVersions(updated);
  };

  const handleGenerate = () => {
    const validVersions = schemaVersions.filter(
      (v) => v.file && v.catalogueFile,
    );
    if (validVersions.length === 0) {
      alert("Please add at least one version with schema and catalogue file.");
      return;
    }

    const crate = generateRoCrateSchemaFamily({
      projectName,
      schemaVersions: validVersions,
    });
    setCratePreview(crate);
  };

  const handleSubmit = async () => {
    if (!cratePreview) return;

    try {
      await fetch("/api/ro-crates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cratePreview),
      });
      alert("Schema family RO-Crate saved");
    } catch (e) {
      console.error(e);
      alert("Error saving RO-Crate");
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1>Schema Family Editor (e.g., milkAggregation)</h1>

      <section>
        <h2>1. Project name</h2>
        <label>
          Name
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </label>
      </section>

      <section>
        <h2>2. Add schema versions</h2>
        <button onClick={addVersion}>Add version</button>

        {schemaVersions.map((version, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid #ddd",
              borderRadius: 4,
              padding: 12,
              marginTop: 8,
            }}
          >
            <h3>Version {idx + 1}</h3>

            <label>
              Version label
              <input
                type="text"
                value={version.versionLabel}
                onChange={(e) => handleVersionLabelChange(idx, e.target.value)}
              />
            </label>

            <div>
              <label>
                Schema JSON file
                <input
                  type="file"
                  onChange={(e) =>
                    handleFileChange(idx, "file", e.target.files?.[0] || null)
                  }
                />
              </label>
              {version.file && (
                <span style={{ marginLeft: 8 }}>✔ {version.file.name}</span>
              )}
            </div>

            <div>
              <label>
                Catalogue JSON file
                <input
                  type="file"
                  onChange={(e) =>
                    handleFileChange(
                      idx,
                      "catalogueFile",
                      e.target.files?.[0] || null,
                    )
                  }
                />
              </label>
              {version.catalogueFile && (
                <span style={{ marginLeft: 8 }}>
                  ✔ {version.catalogueFile.name}
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>3. Generate RO-Crate</h2>
        <button onClick={handleGenerate}>Preview RO-Crate JSON</button>

        {cratePreview && (
          <>
            <pre
              style={{
                marginTop: 16,
                background: "#f5f5f5",
                padding: 12,
                maxHeight: 400,
                overflow: "auto",
                fontSize: 12,
              }}
            >
              {JSON.stringify(cratePreview, null, 2)}
            </pre>
            <button onClick={handleSubmit}>Save to backend</button>
          </>
        )}
      </section>
    </div>
  );
};

export default SchemaFamilyForm;
