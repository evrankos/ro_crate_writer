import React, { useEffect, useState } from "react";
import { CONCEPT_CONFIG, COMBINATION_RULES } from "../config/concepts";
import { uploadFile, fetchExistingConcepts, saveRoCrate } from "../api/api";
import { generateRoCrate } from "../utils/roCrate";

const ConceptForm = ({ defaultProjectName = "my-project" }) => {
  const [conceptType, setConceptType] = useState("schema");
  const [name, setName] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [relations, setRelations] = useState({});
  const [availableSchemas, setAvailableSchemas] = useState([]);
  const [cratePreview, setCratePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const conceptConfig = CONCEPT_CONFIG.find((c) => c.type === conceptType);

  useEffect(() => {
    if (conceptType === "dataset") {
      fetchExistingConcepts("schema")
        .then(setAvailableSchemas)
        .catch(console.error);
    }
  }, [conceptType]);

  const handleFileChange = async (fieldName, file) => {
    if (!file) return;
    try {
      const res = await uploadFile(file);
      setUploadedFiles((prev) => ({
        ...prev,
        [fieldName]: { id: res.id, url: res.url, filename: file.name },
      }));
    } catch (e) {
      console.error("Upload failed", e);
    }
  };

  const handleGenerate = () => {
    const formState = {
      type: conceptType,
      name,
      versionLabel,
      uploadedFiles,
      relations,
    };
    const crate = generateRoCrate(formState, defaultProjectName);
    setCratePreview(crate);
  };

  const handleSubmit = async () => {
    if (!cratePreview) return;
    setIsSubmitting(true);
    try {
      await saveRoCrate(cratePreview);
      alert("RO-Crate saved");
    } catch (e) {
      console.error(e);
      alert("Error saving RO-Crate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const schemaRelationRule = COMBINATION_RULES.find(
    (r) => r.from === conceptType && r.to === "schema",
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1>ContextVault Concept Builder</h1>

      <section>
        <h2>1. Choose concept type</h2>
        <select
          value={conceptType}
          onChange={(e) => {
            setConceptType(e.target.value);
            setUploadedFiles({});
            setRelations({});
          }}
        >
          {CONCEPT_CONFIG.map((c) => (
            <option key={c.type} value={c.type}>
              {c.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2>2. Basic metadata</h2>
        <div>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Version label
            <input
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section>
        <h2>3. Attach files</h2>
        {conceptConfig.fields
          .filter((f) => f.type === "file")
          .map((field) => (
            <div key={field.name}>
              <label>
                {field.label}
                <input
                  type="file"
                  onChange={(e) =>
                    handleFileChange(field.name, e.target.files?.[0] || null)
                  }
                />
              </label>
              {uploadedFiles[field.name] && (
                <span style={{ marginLeft: 8 }}>
                  ✔ {uploadedFiles[field.name].filename}
                </span>
              )}
            </div>
          ))}
      </section>

      {schemaRelationRule && conceptType === "dataset" && (
        <section>
          <h2>4. Relations</h2>
          <label>
            Schema version this dataset conforms to
            <select
              value={relations.conformsToSchemaVersionId || ""}
              onChange={(e) =>
                setRelations((prev) => ({
                  ...prev,
                  conformsToSchemaVersionId: e.target.value || undefined,
                }))
              }
            >
              <option value="">-- none --</option>
              {availableSchemas.map((schema) => (
                <option
                  key={schema.latestVersionId}
                  value={schema.latestVersionId}
                >
                  {schema.label} (latest)
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      <section>
        <h2>5. Generate RO-Crate</h2>
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
            <button disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? "Saving…" : "Save to backend"}
            </button>
          </>
        )}
      </section>
    </div>
  );
};

export default ConceptForm;
