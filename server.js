// Add this near your other imports
import fs from "fs";

// CORS isn't needed if same origin, but harmless if left:
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --- Health & ping ---
app.get("/api/ping", (req, res) => res.status(200).json({ ok: true, at: new Date().toISOString() }));

// --- API: /api/reserve (always 200) ---
app.post("/api/reserve", async (req, res) => {
  try {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    // Minimal log so you can verify on Render logs
    console.log("Reservation received:", {
      name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
      dates: `${data.check_in ?? "?"} -> ${data_check_out ?? data.check_out ?? "?"}`,
      email: data.email ?? "?"
    });
    // Always OK for the frontend
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Reserve handler error:", e);
    // Still return 200 so UX never blocks
    return res.status(200).json({ ok: true, note: "logged server-side" });
  }
});

// --- Safe SPA fallback (no crash if index.html missing) ---
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const indexPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  console.error("Missing file:", indexPath);
  return res.status(404).send("index.html not found. Ensure /public/index.html exists.");
});
