// form: shape collected from the React form
export function generateRoCrateSchemaFamily(projectName, schemaVersions) {
  const graph = [];

  // 1. Metadata file entity
  graph.push({
    "@id": "ro-crate-metadata-schema.json",
    "@type": "CreativeWork",
    conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" },
    about: { "@id": "./" },
  });

  // 2. Root dataset (project)
  const hasPart = [];
  schemaVersions.forEach((sv) => {
    hasPart.push({ "@id": sv.file.id });
    if (sv.catalogueFile) {
      hasPart.push({ "@id": sv.catalogueFile.id });
    }
  });

  // Project catalogue
  const projectCatalogueId = "catalogue-cow-project.json";
  hasPart.push({ "@id": projectCatalogueId });

  graph.push({
    "@id": "./",
    "@type": "Dataset",
    name: projectName,
    hasPart,
  });

  // 3. Schema files and their catalogues
  schemaVersions.forEach((sv, idx) => {
    const file = sv.file;

    // Schema file entity
    const schemaEntity = {
      "@id": file.id,
      "@type": ["File", "CreativeWork"],
      name: file.name,
      encodingFormat: "application/json",
      version: sv.versionLabel,
    };

    // Link version chain
    if (idx > 0) {
      const prev = schemaVersions[idx - 1].file;
      schemaEntity.isBasedOn = { "@id": prev.id };
      schemaEntity.isVersionOf = { "@id": prev.id };
    }

    graph.push(schemaEntity);

    // Catalogue file for this version
    if (sv.catalogueFile) {
      graph.push({
        "@id": sv.catalogueFile.id,
        "@type": ["File", "CreativeWork"],
        name: sv.catalogueFile.name,
        encodingFormat: "application/json",
        about: { "@id": file.id },
      });
    }
  });

  // 4. Project catalogue
  graph.push({
    "@id": projectCatalogueId,
    "@type": ["File", "CreativeWork"],
    name: "catalogue-cow-project.json",
    encodingFormat: "application/json",
    about: { "@id": "./" },
  });

  // if (form.type === "schema") {
  //   const schemaFile = form.uploadedFiles["schemaFile"];
  //   const catFile = form.uploadedFiles["catalogueFile"];

  //   if (schemaFile) {
  //     graph.push({
  //       "@id": schemaFile.filename,
  //       "@type": ["File", "CreativeWork"],
  //       name: schemaFile.filename,
  //       encodingFormat: "application/json",
  //       version: form.versionLabel,
  //     });
  //   }
  //   if (catFile && schemaFile) {
  //     graph.push({
  //       "@id": catFile.filename,
  //       "@type": ["File", "CreativeWork"],
  //       name: catFile.filename,
  //       encodingFormat: "application/json",
  //       about: { "@id": schemaFile.filename },
  //     });
  //   }
  // }

  // if (form.type === "dataset") {
  //   const dataFile = form.uploadedFiles["dataFile"];
  //   const catFile = form.uploadedFiles["catalogueFile"];

  //   if (dataFile) {
  //     const datasetEntity = {
  //       "@id": dataFile.filename,
  //       "@type": ["File", "Dataset"],
  //       name: dataFile.filename,
  //       encodingFormat: "text/csv",
  //       version: form.versionLabel,
  //     };
  //     if (form.relations && form.relations.conformsToSchemaVersionId) {
  //       datasetEntity["dct:conformsTo"] = {
  //         "@id": form.relations.conformsToSchemaVersionId,
  //       };
  //     }
  //     graph.push(datasetEntity);
  //   }
  //   if (catFile && dataFile) {
  //     graph.push({
  //       "@id": catFile.filename,
  //       "@type": ["File", "CreativeWork"],
  //       name: catFile.filename,
  //       encodingFormat: "application/json",
  //       about: { "@id": dataFile.filename },
  //     });
  //   }
  // }

  return {
    "@context": "https://w3id.org/ro/crate/1.2/context",
    "@graph": graph,
  };
}

// form: shape collected from the React form
export function generateRoCrate(form, projectName) {
  const graph = [];

  // Metadata file entity
  graph.push({
    "@id": "ro-crate-metadata.json",
    "@type": "CreativeWork",
    conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" },
    about: { "@id": "./" },
  });

  // Root dataset / project
  graph.push({
    "@id": "./",
    "@type": "Dataset",
    name: projectName,
    hasPart: Object.values(form.uploadedFiles)
      .filter(Boolean)
      .map((f) => ({ "@id": f.filename })),
  });

  if (form.type === "schema") {
    const schemaFile = form.uploadedFiles["schemaFile"];
    const catFile = form.uploadedFiles["catalogueFile"];

    if (schemaFile) {
      graph.push({
        "@id": schemaFile.filename,
        "@type": ["File", "CreativeWork"],
        name: schemaFile.filename,
        encodingFormat: "application/json",
        version: form.versionLabel,
      });
    }
    if (catFile && schemaFile) {
      graph.push({
        "@id": catFile.filename,
        "@type": ["File", "CreativeWork"],
        name: catFile.filename,
        encodingFormat: "application/json",
        about: { "@id": schemaFile.filename },
      });
    }
  }

  if (form.type === "dataset") {
    const dataFile = form.uploadedFiles["dataFile"];
    const catFile = form.uploadedFiles["catalogueFile"];

    if (dataFile) {
      const datasetEntity = {
        "@id": dataFile.filename,
        "@type": ["File", "Dataset"],
        name: dataFile.filename,
        encodingFormat: "text/csv",
        version: form.versionLabel,
      };
      if (form.relations && form.relations.conformsToSchemaVersionId) {
        datasetEntity["dct:conformsTo"] = {
          "@id": form.relations.conformsToSchemaVersionId,
        };
      }
      graph.push(datasetEntity);
    }
    if (catFile && dataFile) {
      graph.push({
        "@id": catFile.filename,
        "@type": ["File", "CreativeWork"],
        name: catFile.filename,
        encodingFormat: "application/json",
        about: { "@id": dataFile.filename },
      });
    }
  }

  return {
    "@context": "https://w3id.org/ro/crate/1.2/context",
    "@graph": graph,
  };
}
