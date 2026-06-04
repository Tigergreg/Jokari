/* ============================================================
   api.js — Wrapper for the Express backend (api/server.js)
   Mock layer kicks in only when USE_MOCK = true (dev local).
   Production mode: cookies httpOnly (gérés par le backend).
   ============================================================ */

const API_BASE = (window.JOKARI_API_BASE || "/api");
const USE_MOCK = false;

// ---- Cache mémoire de la session (côté prod, cookie httpOnly) ----
let _sessionCache = undefined; // undefined = pas chargée ; null = pas connecté ; objet = connecté
let _sessionPromise = null;

async function call(path, options = {}) {
  if (USE_MOCK) return mockCall(path, options);
  const res = await fetch(API_BASE + path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.status === 400) {
      try { return await res.json(); } catch { return { ok: false, error: "http-" + res.status }; }
    }
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt}`);
  }
  return res.json();
}

// ---- Charge (et met en cache) la session courante depuis /auth/me ----
async function loadSession() {
  if (_sessionPromise) return _sessionPromise;
  _sessionPromise = (async () => {
    try {
      const res = await call("/auth/me");
      _sessionCache = (res && res.ok && res.member) ? res.member : null;
    } catch (e) {
      _sessionCache = null;
    } finally {
      _sessionPromise = null;
    }
    return _sessionCache;
  })();
  return _sessionPromise;
}

function invalidateSession() {
  _sessionCache = undefined;
  _sessionPromise = null;
}

// ---- Mock minimal (gardé pour compatibilité dev local) ----
async function mockCall(path, options = {}) {
  await new Promise(r => setTimeout(r, 350));
  if (path === "/auth/me") {
    const raw = localStorage.getItem("jokari-session");
    return { ok: true, member: raw ? JSON.parse(raw) : null };
  }
  return { ok: true };
}

const CATEGORIES = [
  { id: "all",     fr: "Tout",            de: "Alle" },
  { id: "livres",  fr: "Livres",          de: "Bücher" },
  { id: "films",   fr: "Films & Séries",  de: "Filme & Serien" },
  { id: "musique", fr: "Musique",         de: "Musik" },
  { id: "voyages", fr: "Voyages",         de: "Reisen" },
  { id: "cuisine", fr: "Cuisine & Vin",   de: "Küche & Wein" },
  { id: "forum",   fr: "Forum",           de: "Forum" },
];

// ---- PRÉCHARGEMENT IMMÉDIAT de la session ----
// On lance le fetch dès le parsing de api.js, AVANT que les pages s'exécutent.
const _initialSessionLoad = loadSession();

window.JokariAPI = {
  fetchEvents: () => call("/events"),
  fetchEvent: id => call("/events/" + encodeURIComponent(id)),
  fetchNews: () => call("/news"),
  fetchNewsItem: id => call("/news/" + encodeURIComponent(id)),
  fetchArticles: ({ category, limit } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (limit) params.set("limit", String(limit));
    return call("/articles" + (params.toString() ? "?" + params : ""));
  },
  fetchArticle: id => call("/article/" + encodeURIComponent(id)),
  submitMember: data => call("/members", { method: "POST", body: data }),
  submitRegistration: data => call("/registrations", { method: "POST", body: data }),
  subscribeNewsletter: data => call("/newsletter", { method: "POST", body: data }),
  submitContact: data => call("/contact", { method: "POST", body: data }),

  // ---- Auth ----
  requestMagicLink: email => call("/auth/request", { method: "POST", body: { email } }),
  verifyMagicLink: async (token) => {
    const res = await call("/auth/verify?token=" + encodeURIComponent(token));
    if (res && res.ok && res.member) {
      _sessionCache = res.member;
    }
    return res;
  },
  fetchMe: () => call("/auth/me"),
  logout: async () => {
    const res = await call("/auth/logout", { method: "POST" });
    _sessionCache = null;
    return res;
  },

  // ---- Session ----
  // SYNCHRONE : retourne le cache (peut être undefined si pas encore chargé)
  getSession: () => {
    return (_sessionCache === undefined) ? null : _sessionCache;
  },
  // ASYNC : promise résolue avec la session
  getSessionAsync: () => loadSession(),
  // À ATTENDRE dans les pages qui dépendent de la session au démarrage
  sessionReady: _initialSessionLoad,

  invalidateSession,
  fetchMyRegistrations: () => call("/my-registrations"),
  fetchMyArticles: () => call("/my-articles"),
  submitArticle: data => call("/articles", { method: "POST", body: data }),

  // ---- Admin (bureau) ----
  fetchPendingArticles: () => call("/admin/pending"),
  fetchAllArticles: () => call("/admin/articles"),
  fetchAllMembers: () => call("/admin/members"),
  fetchAllRegistrations: () => call("/admin/registrations"),
  decideArticle: (id, decision, note) => call("/admin/decision", { method: "POST", body: { id, decision, note } }),
  createNews: data => call("/news", { method: "POST", body: data }),

  CATEGORIES,
};

// ---- Notifier les pages quand la session initiale est chargée ----
_initialSessionLoad.then(() => {
  if (typeof window.refreshAuthState === "function") window.refreshAuthState();
  window.dispatchEvent(new CustomEvent("jokari-session-ready", { detail: _sessionCache }));
});
