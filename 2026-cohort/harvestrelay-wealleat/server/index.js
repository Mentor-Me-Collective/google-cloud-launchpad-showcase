// WeAllEat server: runs on Google Cloud Run.
//
// It does three things:
//   1. Serves the web app in src/web.
//   2. /api/state  saves and loads the shared app data in Firestore, so every
//                  device sees the same donations, pickups and reservations.
//   3. /api/help   answers help questions with an NVIDIA model, using only
//                  WeAllEat's own help articles (see help-articles.js).
//
// Matching, PINs and food-safety decisions are never made by AI.

const path = require("path");
const express = require("express");
const { HELP_ARTICLES } = require("./help-articles");

const PORT = process.env.PORT || 8080;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";          // set from Secret Manager, never committed
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";
const NVIDIA_URL = process.env.NVIDIA_URL || "https://integrate.api.nvidia.com/v1/chat/completions";
const USE_MEMORY = process.env.USE_MEMORY === "1";                 // local testing without Google Cloud

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "900kb" }));

/* ---------- Storage: Firestore on Google Cloud, or memory for local tests ---------- */
let store;
if (USE_MEMORY) {
  let rec = null;
  store = {
    get: async () => rec,
    save: async (data, baseVersion) => {
      const current = rec ? rec.version : 0;
      if (baseVersion !== current) return { ok: false, current: rec };
      rec = { data, version: current + 1, savedAt: Date.now() };
      return { ok: true, version: rec.version };
    },
  };
} else {
  const { Firestore } = require("@google-cloud/firestore");
  const db = new Firestore();
  const ref = db.collection("wealleat").doc("state");
  store = {
    get: async () => { const snap = await ref.get(); return snap.exists ? snap.data() : null; },
    // A transaction makes sure two devices saving at once can't overwrite each other.
    save: (data, baseVersion) => db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const current = snap.exists ? snap.data().version : 0;
      if (baseVersion !== current) return { ok: false, current: snap.exists ? snap.data() : null };
      const version = current + 1;
      tx.set(ref, { data, version, savedAt: Date.now() });
      return { ok: true, version };
    }),
  };
}

/* ---------- Simple per-visitor rate limit ---------- */
function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip;
    const now = Date.now();
    const list = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (list.length >= max) return res.status(429).json({ error: "Too many requests. Try again in a minute." });
    list.push(now); hits.set(key, list); next();
  };
}

/* ---------- API ---------- */
app.get("/api/health", (req, res) => res.json({ ok: true, storage: USE_MEMORY ? "memory" : "firestore", assistant: Boolean(NVIDIA_API_KEY) }));

app.get("/api/state", async (req, res) => {
  try {
    const rec = await store.get();
    res.json(rec || { data: null, version: 0 });
  } catch (err) {
    console.error("load failed", err);
    res.status(500).json({ error: "Could not load data." });
  }
});

app.put("/api/state", rateLimit(120, 60_000), async (req, res) => {
  const { data, baseVersion } = req.body || {};
  if (typeof data !== "string" || data.length > 850_000 || !Number.isInteger(baseVersion)) {
    return res.status(400).json({ error: "Bad save request." });
  }
  try {
    JSON.parse(data); // only accept valid JSON
    const result = await store.save(data, baseVersion);
    if (!result.ok) return res.status(409).json({ error: "Someone else saved first.", current: result.current });
    res.json({ version: result.version });
  } catch (err) {
    console.error("save failed", err);
    res.status(500).json({ error: "Could not save data." });
  }
});

app.post("/api/help", rateLimit(10, 60_000), async (req, res) => {
  const question = String(req.body?.question || "").trim().slice(0, 500);
  const role = ["donor", "kitchen", "community", "staff", "guest"].includes(req.body?.role) ? req.body.role : "guest";
  if (!question) return res.status(400).json({ error: "Please type a question." });
  if (!NVIDIA_API_KEY) return res.status(503).json({ error: "The help assistant isn't set up yet." });

  const articles = HELP_ARTICLES
    .filter(a => a.roles.includes(role) || a.roles.includes("all"))
    .map(a => `Q: ${a.q}\nA: ${a.a}`).join("\n\n");

  const system = [
    "You are the WeAllEat help assistant. WeAllEat connects donors with surplus food to nearby kitchens and neighbors.",
    `The person asking is a ${role}.`,
    "Answer ONLY using the help articles below. Keep answers to 2-4 short sentences in plain language.",
    "If the articles don't cover the question, say you're not sure and suggest using the 'Message support' form below.",
    "Never judge whether food is safe to eat, never guess about allergens, and never change pickups, PINs or matches.",
    "If someone may be sick or in danger, tell them to call 911, or Poison Control at 1-800-222-1222 for food poisoning.",
    "", "HELP ARTICLES:", articles,
  ].join("\n");

  try {
    const r = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: question }],
        temperature: 0.2, max_tokens: 400,
        // Nemotron models can "think out loud" first; turn that off so answers are quick and short.
        ...(/nemotron/i.test(NVIDIA_MODEL) ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) { console.error("NVIDIA error", r.status, await r.text()); return res.status(502).json({ error: "The assistant is busy. Try again, or use the common issues below." }); }
    const out = await r.json();
    const answer = out.choices?.[0]?.message?.content?.trim();
    res.json({ answer: answer || "Sorry, I couldn't find an answer. Try the common issues below or message support.", model: NVIDIA_MODEL });
  } catch (err) {
    console.error("help failed", err);
    res.status(502).json({ error: "The assistant didn't respond. Try again, or use the common issues below." });
  }
});

/* ---------- Web app ---------- */
app.use(express.static(path.join(__dirname, "..", "src", "web"), { extensions: ["html"] }));

app.listen(PORT, () => console.log(`WeAllEat running on port ${PORT} (${USE_MEMORY ? "memory" : "Firestore"} storage)`));
