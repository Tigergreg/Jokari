// api/auth.js — Magic link auth for jokari.ch
// Génère et vérifie des JWT pour magic links (15 min) et sessions (7 jours).
// Aligné sur le frontend existant : utilise role="bureau" pour les admins.

const jwt = require("jsonwebtoken");

const JWT_SECRET   = process.env.JWT_SECRET;
const PUBLIC_URL   = process.env.JOKARI_PUBLIC_URL || "https://jokari.ch";
const MAGIC_TTL    = "15m";
const SESSION_TTL  = "7d";
const COOKIE_NAME  = "jokari_session";
const COOKIE_OPTS  = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7j en ms
  path: "/",
};

if (!JWT_SECRET) {
  console.warn("[auth] disabled — JWT_SECRET missing");
} else {
  console.log("[auth] enabled — publicUrl=" + PUBLIC_URL);
}

// ---- Mapping accesslevel Firestore → role frontend ----
// Le frontend attend role "bureau" pour les admins (page admin) et "member" pour les autres.
function deriveFrontendRole(member) {
  if (!member) return "member";
  const al = (member.accesslevel || "").toLowerCase();
  if (al === "admin" || al === "bureau") return "bureau";
  return "member";
}

// ---- Génération de tokens ----

function signMagicToken(email) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.sign(
    { email: email.toLowerCase(), purpose: "magic" },
    JWT_SECRET,
    { expiresIn: MAGIC_TTL }
  );
}

function signSessionToken(member) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing");
  const role = deriveFrontendRole(member);
  return jwt.sign(
    {
      memberId: member.id,
      id: member.id,
      email: (member.email || "").toLowerCase(),
      firstName: member.firstName || member.prenom || null,
      lastName: member.lastName || member.nom || null,
      role: role,                                    // "bureau" | "member"
      jobTitle: member.role || null,                  // titre métier (président, vice-présidente)
      accesslevel: member.accesslevel || "member",    // raw Firestore field
      purpose: "session",
    },
    JWT_SECRET,
    { expiresIn: SESSION_TTL }
  );
}

// ---- Vérification de tokens ----

function verifyToken(token, expectedPurpose) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing");
  const payload = jwt.verify(token, JWT_SECRET);
  if (expectedPurpose && payload.purpose !== expectedPurpose) {
    throw new Error(`Wrong token purpose: expected ${expectedPurpose}, got ${payload.purpose}`);
  }
  return payload;
}

// Le magic link pointe sur connexion.html (le frontend gère déjà le ?token=)
function buildMagicLink(token) {
  return `${PUBLIC_URL}/connexion.html?token=${encodeURIComponent(token)}`;
}

// ---- Lecture de la session depuis cookie ----

function readSession(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return verifyToken(token, "session");
  } catch (err) {
    return null;
  }
}

// ---- Middlewares Express ----

function requireAuth(req, res, next) {
  const user = readSession(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: "unauthenticated" });
  }
  req.user = user;
  next();
}

function requireBureau(req, res, next) {
  const user = readSession(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: "unauthenticated" });
  }
  if (user.role !== "bureau") {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
  req.user = user;
  next();
}

// ---- Cookies helpers ----

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: 0 });
}

// Formate l'objet "member" envoyé au frontend (champs cohérents avec ce que la session attend)
function publicSession(payload) {
  if (!payload) return null;
  return {
    memberId: payload.memberId || payload.id,
    id: payload.memberId || payload.id,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: payload.role,           // "bureau" | "member"
    jobTitle: payload.jobTitle,   // titre métier optionnel
  };
}

module.exports = {
  isEnabled: () => !!JWT_SECRET,
  signMagicToken,
  signSessionToken,
  verifyToken,
  buildMagicLink,
  readSession,
  requireAuth,
  requireBureau,
  setSessionCookie,
  clearSessionCookie,
  publicSession,
  deriveFrontendRole,
  COOKIE_NAME,
};
