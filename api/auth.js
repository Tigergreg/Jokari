// api/auth.js — Magic link auth for jokari.ch
// Génère et vérifie des JWT pour magic links (15 min) et sessions (7 jours)

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
  return jwt.sign(
    {
      id: member.id,
      email: (member.email || "").toLowerCase(),
      accesslevel: member.accesslevel || "member",
      role: member.role || null,
      firstName: member.firstName || member.prenom || null,
      lastName: member.lastName || member.nom || null,
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

function buildMagicLink(token) {
  return `${PUBLIC_URL}/auth.html?token=${encodeURIComponent(token)}`;
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
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = readSession(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }
  if (user.accesslevel !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin only" });
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

module.exports = {
  isEnabled: () => !!JWT_SECRET,
  signMagicToken,
  signSessionToken,
  verifyToken,
  buildMagicLink,
  readSession,
  requireAuth,
  requireAdmin,
  setSessionCookie,
  clearSessionCookie,
  COOKIE_NAME,
};
