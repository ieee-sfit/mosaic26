import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_FILE = path.resolve(__dirname, "../results.json");

function ensureResultsFile() {
  if (!fs.existsSync(RESULTS_FILE)) {
    fs.writeFileSync(RESULTS_FILE, "[]", "utf-8");
  }
}

function handleResultsApi(req, res, next) {
  const url = req.url ? req.url.split("?")[0] : "";

  if (url === "/api/workstation4/save-result" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        ensureResultsFile();
        const newRecord = JSON.parse(body);
        let list = [];
        try {
          const raw = fs.readFileSync(RESULTS_FILE, "utf-8");
          list = JSON.parse(raw);
          if (!Array.isArray(list)) list = [];
        } catch {
          list = [];
        }

        // Avoid exact duplicate session IDs
        const existingIdx = list.findIndex((r) => r.id === newRecord.id);
        if (existingIdx >= 0) {
          list[existingIdx] = newRecord;
        } else {
          list.push(newRecord);
        }

        fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2), "utf-8");

        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, count: list.length, record: newRecord }));
      } catch (err) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url === "/api/workstation4/results" && req.method === "GET") {
    try {
      ensureResultsFile();
      const raw = fs.readFileSync(RESULTS_FILE, "utf-8");
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(raw);
    } catch (err) {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === "/api/workstation4/clear-results" && req.method === "POST") {
    try {
      fs.writeFileSync(RESULTS_FILE, "[]", "utf-8");
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, count: 0 }));
    } catch (err) {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  next();
}

export function workstation4ResultsPlugin() {
  return {
    name: "workstation4-results-api",
    configureServer(server) {
      server.middlewares.use(handleResultsApi);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleResultsApi);
    },
  };
}
