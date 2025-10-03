// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Middleware ---
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static site (your booking form lives in /public)
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=300"),
  })
);

// Health check for Render
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// --- API: /api/reserve ---
// Accepts the JSON payload from the booking form. Return 200 so the UI never sees a 404.
app.post("/api/reserve", async (req, res) => {
  try {
    const data = req.body || {};
    // TODO (optional): persist to DB or send email confirmation here.
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Reserve handler error:", e);
    return res.status(500).json({ error: "Reserve failed" });
  }
});

// --- API: /api/calendar/add ---
// Inserts an all-day event into Google Calendar.
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

    // 🔒 Hard-coded Calendar ID
    const calendarId =
      "d3284274ed68a03eb5bdf2d01a0dd96ad1b9959a276e03b666ed1641e8a7ec9d@group.calendar.google.com";

    const event = {
      summary: title,
      description: description || "",
      start: { date: start, timeZone: timezone || "Europe/Paris" }, // all-day
      end: { date: end, timeZone: timezone || "Europe/Paris" },     // all-day
    };

    const resp = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return res.status(200).json({ ok: true, eventId: resp.data.id });
  } catch (e) {
    console.error("Calendar insert failed:", e?.response?.data || e);
    return res.status(500).json({ error: "Calendar insert failed" });
  }
});

// Fallback to index.html for non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next(); // leave API 404s as-is
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Ferme Lafayette running on ${port}`);
});
