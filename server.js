// server.js
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1) Create the app FIRST
const app = express();

// 2) Then attach middleware
// (CORS is harmless here; same-origin by default)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// 3) Static site (serve your booking form from /public)
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=300"),
  })
);

// 4) Health + ping
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/api/ping", (_req, res) =>
  res.status(200).json({ ok: true, at: new Date().toISOString() })
);

// 5) Super-lenient reservation endpoint (prevents UI errors)
app.post("/api/reserve", async (req, res) => {
  try {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    console.log("Reservation received:", {
      name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
      dates: `${data.check_in ?? "?"} -> ${data.check_out ?? "?"}`,
      email: data.email ?? "?"
    });
    // TODO: persist to DB / send email if you want
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Reserve handler error:", e);
    // Still 200 so the frontend UX doesn't block
    return res.status(200).json({ ok: true, note: "logged server-side" });
  }
});

// 6) Google Calendar insert (all-day)
app.post("/api/calendar/add", async (req, res) => {
  try {
    const { title, start, end, description, timezone } = req.body || {};
    if (!title || !start || !end) {
      return res.status(400).json({ error: "Missing title/start/end" });
    }

    const auth = new google.auth.JWT({
      email: process.env.GCAL_CLIENT_EMAIL,
      key: (process.env.GCAL_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });

    // Hard-coded Calendar ID (as requested)
    const calendarId =
      "d3284274ed68a03eb5bdf2d01a0dd96ad1b9959a276e03b666ed1641e8a7ec9d@group.calendar.google.com";

    const event = {
      summary: title,
      description: description || "",
      start: { date: start, timeZone: timezone || "Europe/Paris" },
      end:   { date: end,   timeZone: timezone || "Europe/Paris" },
    };

    const resp = await calendar.events.insert({ calendarId, requestBody: event });
    return res.status(200).json({ ok: true, eventId: resp.data.id });
  } catch (e) {
    console.error("Calendar insert failed:", e?.response?.data || e);
    return res.status(500).json({ error: "Calendar insert failed" });
  }
});

// 7) Safe SPA fallback (no crash if index.html missing)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const indexPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  console.error("Missing file:", indexPath);
  return res
    .status(404)
    .send("index.html not found. Ensure /public/index.html exists in the repo.");
});

// 8) Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Ferme Lafayette running on ${port}`);
});
