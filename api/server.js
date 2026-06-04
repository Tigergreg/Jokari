// api/server.js — Express API for jokari.ch
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const {
  db, listEvents, getEvent, listNews, getNewsItem,
  listArticles, getArticle, saveDocument, getMemberByEmail,
} = require("./firestore");
const mailer = require("./mailer");
const auth = require("./auth");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// CORS — allow jokari.ch + dev origins (credentials true pour cookies)
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
  credentials: true,
}));

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

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

function fireAndForget(promise, label) {
  Promise.resolve(promise).catch(err => console.error(`[fire-and-forget] ${label}:`, err.message));
}

// ---- Health ----
app.get("/api/health", (req, res) => res.json({
  ok: true,
  ts: Date.now(),
  mailer: mailer.isEnabled(),
  auth: auth.isEnabled(),
}));

// ============================================================
// AUTH — Magic link login
// ============================================================

// POST /api/auth/request — Demande un magic link
// Réponse identique qu'on trouve ou non l'email (anti-énumération)
app.post("/api/auth/request", async (req, res) => {
  try {
    const b = req.body || {};
    if (!isEmail(b.email)) {
      return res.status(400).json({ ok: false, error: "invalid-email" });
    }
    if (!auth.isEnabled()) {
      return res.status(503).json({ ok: false, error: "auth-disabled" });
    }

    const member = await getMemberByEmail(b.email);
    const isActive = member && (member.status === "actif");

    if (isActive) {
      const token = auth.signMagicToken(member.email);
      const link = auth.buildMagicLink(token);
      fireAndForget(
        mailer.sendMagicLink(member.email, link, member.firstName),
        "magic-link"
      );
      console.log(`[auth] magic link sent to ${member.email} (role=${auth.deriveFrontendRole(member)})`);
    } else if (member) {
      console.log(`[auth] requested for ${member.email} but status=${member.status} (not active)`);
    } else {
      console.log(`[auth] requested for unknown email ${b.email}`);
    }

    // Réponse identique dans tous les cas
    res.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[auth/request]", err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

// GET /api/auth/verify?token=xxx — Vérifie le magic link et crée la session
// (Le frontend appelle cet endpoint en GET avec query param.)
app.get("/api/auth/verify", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ ok: false, error: "invalid-token" });
    }
    if (!auth.isEnabled()) {
      return res.status(503).json({ ok: false, error: "auth-disabled" });
    }

    let payload;
    try {
      payload = auth.verifyToken(token, "magic");
    } catch (err) {
      // Distinguer expired vs invalid
      if (err.name === "TokenExpiredError" || /expired/i.test(err.message)) {
        return res.status(401).json({ ok: false, error: "expired" });
      }
      return res.status(401).json({ ok: false, error: "invalid-token" });
    }

    const member = await getMemberByEmail(payload.email);
    if (!member) {
      return res.status(404).json({ ok: false, error: "invalid-token" });
    }
    if (member.status !== "actif") {
      return res.status(403).json({ ok: false, error: "not-active" });
    }

    const sessionToken = auth.signSessionToken(member);
    auth.setSessionCookie(res, sessionToken);

    // Frontend attend { ok, member }
    res.json({
      ok: true,
      member: {
        id: member.id,
        memberId: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        role: auth.deriveFrontendRole(member),
        jobTitle: member.role || null,
      },
    });
  } catch (err) {
    console.error("[auth/verify]", err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

// GET /api/auth/me — Retourne le membre courant (ou null si pas connecté)
app.get("/api/auth/me", (req, res) => {
  const payload = auth.readSession(req);
  if (!payload) {
    return res.json({ ok: true, member: null });
  }
  res.json({ ok: true, member: auth.publicSession(payload) });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

// ============================================================
// PUBLIC GET endpoints
// ============================================================

app.get("/api/events", async (req, res) => {
  try {
    const events = await listEvents();
    res.json({ ok: true, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/events/:id", async (req, res) => {
  try { const event = await getEvent(req.params.id); res.json({ ok: true, event }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/api/news", async (req, res) => {
  try { const news = await listNews(); res.json({ ok: true, news }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/api/news/:id", async (req, res) => {
  try { const item = await getNewsItem(req.params.id); res.json({ ok: true, item }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/api/articles", async (req, res) => {
  try {
    const articles = await listArticles({
      category: req.query.category,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
    });
    res.json({ ok: true, articles });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get("/api/article/:id", async (req, res) => {
  try { const article = await getArticle(req.params.id); res.json({ ok: true, article }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ============================================================
// PUBLIC POST endpoints
// ============================================================

app.post("/api/members", async (req, res) => {
  try {
    const b = req.body || {};
    requireFields(b, ["firstName", "lastName", "email", "memberType"]);
    if (!isEmail(b.email)) throw Object.assign(new Error("Invalid email"), { status: 400 });
    if (!["actif", "bienfaiteur", "honoraire"].includes(b.memberType))
      throw Object.assign(new Error("Invalid memberType"), { status: 400 });
    if (!b.acceptStatuts) throw Object.assign(new Error("Statuts non acceptés"), { status: 400 });

    const memberData = {
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
      accesslevel: "member",
    };

    const out = await saveDocument("members", memberData);
    const memberWithId = { ...memberData, id: out.id };

    if (b.acceptNewsletter && isEmail(b.email)) {
      await saveDocument("newsletter", { email: b.email, source: "member-form" }).catch(() => {});
    }

    fireAndForget(mailer.sendMemberConfirmation(memberWithId), "member-confirmation");
    fireAndForget(mailer.sendMemberAdminNotification(memberWithId), "member-admin-notification");

    res.json({ ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.post("/api/registrations", async (req, res) => {
  try {
    const b = req.body || {};
    requireFields(b, ["fullName", "email", "eventId"]);
    if (!isEmail(b.email)) throw Object.assign(new Error("Invalid email"), { status: 400 });

    const regData = {
      fullName: b.fullName,
      email: b.email,
      phone: b.phone || null,
      eventId: b.eventId,
      participants: parseInt(b.participants || "1", 10),
      status: "pending-payment",
    };

    const out = await saveDocument("registrations", regData);
    const regWithId = { ...regData, id: out.id };

    let eventTitle = b.eventId;
    try {
      const ev = await getEvent(b.eventId);
      if (ev && ev.title) eventTitle = ev.title;
    } catch (_) { /* ignore */ }

    fireAndForget(mailer.sendRegistrationConfirmation(regWithId, eventTitle), "registration-confirmation");
    fireAndForget(mailer.sendRegistrationAdminNotification(regWithId, eventTitle), "registration-admin-notification");

    res.json({ ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.post("/api/newsletter", async (req, res) => {
  try {
    const b = req.body || {};
    if (!isEmail(b.email)) throw Object.assign(new Error("Invalid email"), { status: 400 });
    const out = await saveDocument("newsletter", { email: b.email, source: b.source || "site" });
    fireAndForget(mailer.sendNewsletterConfirmation(b.email), "newsletter-confirmation");
    res.json({ ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const b = req.body || {};
    requireFields(b, ["name", "email", "subject", "message"]);
    if (!isEmail(b.email)) throw Object.assign(new Error("Invalid email"), { status: 400 });
    const msgData = {
      name: b.name, email: b.email, subject: b.subject, message: b.message,
    };
    const out = await saveDocument("contact_messages", msgData);
    fireAndForget(mailer.sendContactAcknowledgement(msgData), "contact-acknowledgement");
    fireAndForget(mailer.sendContactAdminNotification(msgData), "contact-admin-notification");
    res.json({ ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// PROTECTED endpoints — Espace membre
// ============================================================

// Inscriptions de l'utilisateur connecté
app.get("/api/my-registrations", auth.requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const snap = await db.collection("registrations")
      .where("email", "==", email)
      .get();
    const registrations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, registrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Articles de l'utilisateur connecté (placeholder pour l'instant)
app.get("/api/my-articles", auth.requireAuth, async (req, res) => {
  try {
    // Pour l'instant : pas de table articles côté Firestore avec authorId.
    // À implémenter plus tard quand la collection articles sera structurée.
    res.json({ ok: true, articles: [] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// ADMIN endpoints — Bureau only
// ============================================================

// Tous les membres (bureau only)
app.get("/api/admin/members", auth.requireBureau, async (req, res) => {
  try {
    const snap = await db.collection("members").get();
    const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Toutes les inscriptions (bureau only)
app.get("/api/admin/registrations", auth.requireBureau, async (req, res) => {
  try {
    const snap = await db.collection("registrations").get();
    const registrations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, registrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Tous les articles en attente (bureau only) — placeholder
app.get("/api/admin/pending", auth.requireBureau, async (req, res) => {
  res.json({ ok: true, articles: [] });
});

// Tous les articles (bureau only) — placeholder
app.get("/api/admin/articles", auth.requireBureau, async (req, res) => {
  res.json({ ok: true, articles: [] });
});

// ============================================================
// 404 + start
// ============================================================

app.use((req, res) => res.status(404).json({ ok: false, error: "Not found" }));

app.listen(PORT, () => {
  console.log(`[jokari-api] listening on :${PORT} — mailer ${mailer.isEnabled() ? "ON" : "OFF"} — auth ${auth.isEnabled() ? "ON" : "OFF"}`);
});
