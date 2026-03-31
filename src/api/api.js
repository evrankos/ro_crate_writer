import axios from "axios";

export async function fetchExistingConcepts(type) {
  const res = await axios.get("/api/concepts", { params: { type } });
  return res.data; // [{ id, type, label, latestVersionId }, ...]
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post("/api/files", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // expected response: { id, url }
  return res.data;
}

export async function saveRoCrate(crate) {
  const res = await axios.post("/api/ro-crates", crate);
  return res.data; // e.g. { id }
}
