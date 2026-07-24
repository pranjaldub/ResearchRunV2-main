import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL.replace(/\/+$/, "")}/api`;

const api = axios.create({ baseURL: API_BASE });

export const uploadPaper = async (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
  return data;
};

export const listPapers = async () => (await api.get("/papers")).data;
export const getPaper = async (id) => (await api.get(`/paper/${id}`)).data;
export const deletePaper = async (id) => (await api.delete(`/paper/${id}`)).data;
export const pinPaper = async (id, pinned) => (await api.post(`/paper/${id}/pin`, { pinned })).data;
export const getStats = async () => (await api.get("/stats")).data;
export const getHistory = async () => (await api.get("/history")).data;
export const listAgents = async () => (await api.get("/agents")).data;
export const searchPapers = async (q) => (await api.get(`/search`, { params: { q } })).data;
export const semanticSearch = async (q) => (await api.get(`/semantic-search`, { params: { q } })).data;

/**
 * Subscribe to the SSE analysis stream using fetch + ReadableStream so we
 * can read incremental server-sent events even though our backend uses SSE.
 */
export const streamAnalysis = (paperId, { onEvent, onDone, onError }) => {
  const url = `${API_BASE}/analyze/${paperId}/stream`;
  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/event-stream" } });
      if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const chunk of parts) {
          const line = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "__end__") { onDone && onDone(); return; }
            onEvent && onEvent(evt);
          } catch (e) { /* ignore malformed */ }
        }
      }
      onDone && onDone();
    } catch (e) {
      if (e.name !== "AbortError") onError && onError(e);
    }
  })();
  return () => controller.abort();
};

export default api;
