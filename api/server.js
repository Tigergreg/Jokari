// api/server.js — Express API for jokari.ch
const express = require("express");
const cors = require("cors");
const { listEvents, getEvent, listNews, getNewsItem, listArticles, getArticle, saveDocument } = require("./firestore");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// CORS — allow jokari.ch + dev origins
app.use(cors({
  origin: (origin, cb) => {
    const allow = [
      "https://jokari.ch",
      "https://www.jokari.ch",
    ];
    if (!origin || allow.includes(origin) || /localhost|127\.0\.0\.1/.test(origin)) {
      return cb(null, true);
    }
    return cb(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
}));

app.use(express.json({ limit: "100kb" }));

// ---- Validation helpers ----
function requireFields(body, fields) {
  const missing = fields.filter(f => !body[f]);
  if (missing.length) {
    const err = new Error("Missing fields: " + missing.join(", "));
    err.status = 400;
    throw err;
  }
}
function isEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// ---- Health ----
app.get("/api/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- GET /api/events ----
app.get("/api/events", async (req, res) => {
  try {
    const events = await listEvents();
    res.json({ ok: true, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- GET /api/events/:id ----
app.get("/api/events/:id", async (req, res) => {
  try { const event = await getEvent(req.params.id); res.json({ ok: true, event }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ---- GET /api/news ----
app.get("/api/news", async (req, res) => {
  try { const news = await listNews(); res.json({ ok: true, news }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ---- GET /api/news/:id ----
app.get("/api/news/:id", async (req, res) => {
  try { const item = await getNewsItem(req.params.id); res.json({ ok: true, item }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ---- GET /api/articles ----
app.get("/api/articles", async (req, res) => {
  try {
    const articles = await listArticles({
      category: req.query.category,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
    });
    res.json({ ok: true, articles });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ---- GET /api/article/:id ----
app.get("/api/article/:id", async (req, res) => {
  try { const article = await getArticle(req.params.id); res.json({ ok: true, article }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ---- POST /api/members ----
app.post("/api/members", async (req, res) => {
  try {
    const b = req.body || {};
    requireFields(b, ["firstName", "lastName", "email", "memberType"]);
    if (!isEmail(b.email)) throw Object.assign(new Error("Invalid email"), { status: 400 });
    if (!["actif", "bienfaiteur", "honoraire"].includes(b.memberType))
      throw Object.assign(new Error("Invalid memberType"), { status: 400 });
    if (!b.acceptStatuts) throw Object.assign(new Error("Statuts non acceptés"), { status: 400 });

    const out = await saveDocument("members", {
      firstName: b.firstName,
      lastName: b.lastName,
      email: b.email,
      phone: b.phone || null,
      address: b.address || null,
      zip: b.zip || null,
      city: b.city || null,
      birthDate: b.birthDate || null,
      memberType: b.memberType,
      acceptStatuts: !!b.acceptStatuts,
      acceptNewsletter: !!b.acceptNewsletter,
      status: "pending",
    });

    // Optional: enrol on newsletter too
    if (b.acceptNewsletter && isEmail(b.email)) {
      await saveDocument("newsletter", { email: b.email, source: "member-form" }).catch(() => {});
    }

    res.json({ ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

// ---- POST /api/registrations ----
app.post("/api/registrations", async (req, res) => {
  try {
    const b = req.body || {};
    requireFields(b, ["fullName", "email", "eventId"]);
    if (!isEmail(b.email)) throw Object.assign(new Error("Invalid email"), { status: 400 });

    const out = await saveDocument("registrations", {
      fullName: b.fullName,
      email: b.email,
      phone: b.phone || null,
      eventId: b.eventId,
      participants: parseInt(b.participants || "1", 10),
      status: "pending-payment",
    });
    res.json({ ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

// ---- POST /api/newsletter ----
app.post("/api/newsletter", async (req, res) => {
  try {
    const b = req.body || {};
    if (!isEmail(b.email)) throw Object.assign(new Error("Invalid email"), { status: 400 });
    const out = await saveDocument("newsletter", { email: b.email, source: b.source || "site" });
    res.json({ ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

// ---- POST /api/contact (bonus — used by contact form) ----
app.post("/api/contact", async (req, res) => {
  try {
    const b = req.body || {};
    requireFields(b, ["name", "email", "subject", "message"]);
    if (!isEmail(b.email)) throw Object.assign(new Error("Invalid email"), { status: 400 });
    const out = await saveDocument("contact_messages", {
      name: b.name, email: b.email, subject: b.subject, message: b.message,
    });
    res.json({ ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ ok: false, error: "Not found" }));

app.listen(PORT, () => {
  console.log(`[jokari-api] listening on :${PORT}`);
});
