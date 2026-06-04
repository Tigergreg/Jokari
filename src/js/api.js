/* ============================================================
   api.js — Wrapper for the Express backend (api/server.js)
   Mock layer kicks in only when USE_MOCK = true (dev local).
   Production mode: cookies httpOnly (geres par le backend).
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
    credentials: "include", // envoie le cookie session sur toutes les requêtes
  });
  if (!res.ok) {
    // On ne lève pas d'exception sur les 4xx d'auth — on renvoie le body
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

// ---- Invalide le cache (à appeler après login/logout) ----
function invalidateSession() {
  _sessionCache = undefined;
  _sessionPromise = null;
}

async function mockCall(path, options = {}) {
  await new Promise(r => setTimeout(r, 350 + Math.random() * 350));
  const body = options.body || {};

  // ---- AUTH (mock) — handled BEFORE the generic POST catch-all ----
  if (path === "/auth/request" && options.method === "POST") {
    const email = (body.email || "").trim().toLowerCase();
    if (!email || !/.+@.+\..+/.test(email)) {
      return { ok: false, error: "invalid-email" };
    }
    const token = "mock-" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    const expiresAt = Date.now() + 30 * 60 * 1000;
    const member = MOCK_MEMBERS.find(m => m.email.toLowerCase() === email)
      || { email, firstName: email.split("@")[0], lastName: "", id: "mock-member-" + email };
    localStorage.setItem("jokari-pending-magic", JSON.stringify({ token, email, expiresAt, memberId: member.id }));
    return { ok: true, sent: true, devToken: token, devUrl: `connexion.html?token=${token}` };
  }
  if (path.startsWith("/auth/verify")) {
    const url = new URL("http://x" + path);
    const token = url.searchParams.get("token");
    const raw = localStorage.getItem("jokari-pending-magic");
    if (!raw) return { ok: false, error: "no-pending" };
    const pending = JSON.parse(raw);
    if (pending.token !== token) return { ok: false, error: "invalid-token" };
    if (Date.now() > pending.expiresAt) return { ok: false, error: "expired" };
    const member = MOCK_MEMBERS.find(m => m.id === pending.memberId)
      || { id: pending.memberId, email: pending.email, firstName: pending.email.split("@")[0], lastName: "" };
    localStorage.setItem("jokari-session", JSON.stringify({
      memberId: member.id, email: member.email,
      firstName: member.firstName, lastName: member.lastName,
      role: member.role || "member",
      since: Date.now(),
    }));
    localStorage.removeItem("jokari-pending-magic");
    return { ok: true, member };
  }
  if (path === "/auth/me") {
    const raw = localStorage.getItem("jokari-session");
    return { ok: true, member: raw ? JSON.parse(raw) : null };
  }
  if (path === "/auth/logout" && options.method === "POST") {
    localStorage.removeItem("jokari-session");
    return { ok: true };
  }

  if (options.method === "POST") {
    return { ok: true, id: "mock-" + Math.random().toString(36).slice(2, 10), data: body };
  }

  if (path === "/events") return { ok: true, events: MOCK_EVENTS };
  if (path.startsWith("/events/")) {
    const id = path.split("/")[2];
    return { ok: true, event: MOCK_EVENTS.find(e => e.id === id) || null };
  }
  if (path === "/news") return { ok: true, news: MOCK_NEWS };
  if (path.startsWith("/news/")) {
    const id = path.split("/")[2];
    return { ok: true, item: MOCK_NEWS.find(n => n.id === id) || null };
  }
  function mergedPublishedArticles() {
    const overrides = readExtra("jokari-admin-overrides");
    const extras = [];
    for (const m of MOCK_MEMBERS) {
      const list = readExtra("jokari-extra-articles-" + m.id);
      for (const a of list) {
        const ov = overrides.find(o => o.id === a.id);
        if (ov && ov.status === "published") {
          extras.push({
            ...a, ...ov,
            authorName: a.authorName || (m.firstName + " " + m.lastName).trim(),
            authorId: m.id,
            titleDe: a.titleDe || a.title,
            excerptFr: a.excerptFr || a.excerpt,
            excerptDe: a.excerptDe || a.excerpt,
            bodyFr: a.bodyFr || a.body,
            bodyDe: a.bodyDe || a.body,
            dateFr: a.dateFr || (ov.publishedAt || a.submittedAt || ""),
            dateDe: a.dateDe || (ov.publishedAt || a.submittedAt || ""),
            cover: a.cover || "navy",
          });
        }
      }
      const seed = MOCK_MY_ARTICLES[m.id] || [];
      for (const a of seed) {
        if (a.status === "published" && !MOCK_ARTICLES.some(x => x.id === a.id)) {
          extras.push({
            ...a,
            authorName: a.authorName || (m.firstName + " " + m.lastName).trim(),
            authorId: m.id,
            titleDe: a.titleDe || a.title,
            excerptFr: a.excerptFr || a.excerpt,
            excerptDe: a.excerptDe || a.excerpt,
            bodyFr: a.bodyFr || a.body || a.excerpt,
            bodyDe: a.bodyDe || a.body || a.excerpt,
            dateFr: a.dateFr || a.publishedAt || a.submittedAt || "",
            dateDe: a.dateDe || a.publishedAt || a.submittedAt || "",
            cover: a.cover || "navy",
          });
        }
      }
    }
    return [...MOCK_ARTICLES.filter(a => a.status === "published"), ...extras];
  }

  if (path.startsWith("/articles") && options.method !== "POST") {
    const url = new URL("http://x" + path);
    const cat = url.searchParams.get("category");
    const limit = parseInt(url.searchParams.get("limit") || "1000", 10);
    let list = [...mergedPublishedArticles()];
    if (cat && cat !== "all") list = list.filter(a => a.category === cat);
    list.sort((a, b) => (b.date || b.publishedAt || "").localeCompare(a.date || a.publishedAt || ""));
    return { ok: true, articles: list.slice(0, limit) };
  }
  if (path.startsWith("/article/")) {
    const id = decodeURIComponent(path.split("/")[2]);
    const merged = mergedPublishedArticles();
    return { ok: true, article: merged.find(a => a.id === id) || null };
  }

  function getSessionMemberId() {
    try { return JSON.parse(localStorage.getItem("jokari-session") || "null")?.memberId; }
    catch { return null; }
  }
  function readExtra(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  }
  function writeExtra(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  if (path === "/my-registrations") {
    const mid = getSessionMemberId();
    if (!mid) return { ok: false, error: "unauthenticated" };
    const seed = MOCK_MY_REGISTRATIONS[mid] || [];
    const extra = readExtra("jokari-extra-regs-" + mid);
    return { ok: true, registrations: [...extra, ...seed] };
  }
  if (path === "/my-articles") {
    const mid = getSessionMemberId();
    if (!mid) return { ok: false, error: "unauthenticated" };
    const seed = MOCK_MY_ARTICLES[mid] || [];
    const extra = readExtra("jokari-extra-articles-" + mid);
    return { ok: true, articles: [...extra, ...seed] };
  }
  if (path === "/articles" && options.method === "POST") {
    const mid = getSessionMemberId();
    if (!mid) return { ok: false, error: "unauthenticated" };
    const newArticle = {
      id: "draft-" + Date.now().toString(36),
      title: body.title || "(sans titre)",
      category: body.category || "forum",
      excerpt: body.excerpt || (body.body || "").slice(0, 140) + "…",
      body: body.body || "",
      authorId: mid,
      authorName: body.authorName || "",
      coverImage: body.coverImage || null,
      status: "pending-review",
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    const key = "jokari-extra-articles-" + mid;
    const list = readExtra(key);
    list.unshift(newArticle);
    writeExtra(key, list);
    return { ok: true, article: newArticle };
  }
  if (path === "/registrations" && options.method === "POST") {
    const mid = getSessionMemberId();
    if (mid) {
      const reg = {
        id: "reg-" + Date.now().toString(36),
        memberId: mid,
        eventId: body.eventId,
        eventTitle: body.eventTitle || "—",
        eventDate: body.eventDate || "",
        participants: body.participants || 1,
        amount: body.amount || 0,
        status: "pending-payment",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const key = "jokari-extra-regs-" + mid;
      const list = readExtra(key);
      list.unshift(reg);
      writeExtra(key, list);
      return { ok: true, registration: reg };
    }
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem("jokari-session") || "null"); }
    catch { return null; }
  }
  function requireBureau() {
    const s = getSession();
    return s && s.role === "bureau" ? s : null;
  }

  function getAllArticles() {
    const all = [];
    for (const m of MOCK_MEMBERS) {
      const seed = MOCK_MY_ARTICLES[m.id] || [];
      const extra = readExtra("jokari-extra-articles-" + m.id);
      [...extra, ...seed].forEach(a => all.push({
        ...a,
        authorId: m.id,
        authorName: a.authorName || (m.firstName + " " + m.lastName).trim(),
      }));
    }
    const overrides = readExtra("jokari-admin-overrides");
    return all.map(a => {
      const ov = overrides.find(o => o.id === a.id);
      return ov ? { ...a, ...ov } : a;
    });
  }

  if (path === "/admin/pending") {
    if (!requireBureau()) return { ok: false, error: "forbidden" };
    const all = getAllArticles().filter(a => a.status === "pending-review");
    return { ok: true, articles: all };
  }
  if (path === "/admin/articles") {
    if (!requireBureau()) return { ok: false, error: "forbidden" };
    return { ok: true, articles: getAllArticles() };
  }
  if (path.startsWith("/admin/decision") && options.method === "POST") {
    if (!requireBureau()) return { ok: false, error: "forbidden" };
    const overrides = readExtra("jokari-admin-overrides");
    const idx = overrides.findIndex(o => o.id === body.id);
    const decision = body.decision === "approve"
      ? { id: body.id, status: "published", publishedAt: new Date().toISOString().slice(0, 10), views: 0 }
      : { id: body.id, status: "rejected", rejectedAt: new Date().toISOString().slice(0, 10), rejectReason: body.note || "" };
    if (idx >= 0) overrides[idx] = decision; else overrides.push(decision);
    writeExtra("jokari-admin-overrides", overrides);
    return { ok: true };
  }
  if (path === "/admin/members") {
    if (!requireBureau()) return { ok: false, error: "forbidden" };
    return { ok: true, members: MOCK_MEMBERS };
  }
  if (path === "/admin/registrations") {
    if (!requireBureau()) return { ok: false, error: "forbidden" };
    const all = [];
    for (const m of MOCK_MEMBERS) {
      const seed = MOCK_MY_REGISTRATIONS[m.id] || [];
      const extra = readExtra("jokari-extra-regs-" + m.id);
      [...extra, ...seed].forEach(r => all.push({
        ...r,
        memberId: m.id,
        memberName: (m.firstName + " " + m.lastName).trim(),
        memberEmail: m.email,
      }));
    }
    return { ok: true, registrations: all };
  }
  if (path === "/news" && options.method === "POST") {
    if (!requireBureau()) return { ok: false, error: "forbidden" };
    const item = {
      id: "news-" + Date.now().toString(36),
      title: body.title || "(sans titre)",
      excerpt: body.excerpt || (body.body || "").slice(0, 160) + "…",
      body: body.body || "",
      date: body.date || new Date().toISOString().slice(0, 10),
      coverImage: body.coverImage || null,
      author: body.author || "Le bureau",
      status: "published",
    };
    const list = readExtra("jokari-admin-news");
    list.unshift(item);
    writeExtra("jokari-admin-news", list);
    return { ok: true, item };
  }

  return { ok: true };
}

// =================== MOCK DATA ===================

const MOCK_EVENTS = [
  { id: "open-zh", title: "Open de Zürich", titleDe: "Open Zürich",
    date: "2026-06-06", dateFr: "06 juin 2026", dateDe: "06. Juni 2026",
    time: "10h — 18h", timeDe: "10–18 Uhr",
    location: "Seeplatz, Horgen", price: 45, spotsTotal: 32, spotsLeft: 11,
    descFr: "Le tournoi de printemps. Format double, finale au crépuscule, apéro qui finit tard.",
    descDe: "Das Frühlingsturnier. Doppelmodus, Finale in der Dämmerung, Apéro bis spät.",
    type: "tournoi", typeDe: "Turnier",
    bodyFr: "Le tournoi-phare du printemps zurichois. Format double élimination sur la pelouse du Seeplatz, avec une finale prévue au coucher du soleil sur le lac. Inscription ouverte aux membres comme aux invités — partenaire attribué par tirage si vous venez seul. Le t-shirt brodé et le dîner sur place sont compris. Tenue claire conseillée. Repli prévu au club-house de Käpfnach en cas de pluie.",
    bodyDe: "Das Hauptturnier des Zürcher Frühlings." },
];

const MOCK_NEWS = [];
const MOCK_ARTICLES = [];
const MOCK_MEMBERS = [];
const MOCK_MY_REGISTRATIONS = {};
const MOCK_MY_ARTICLES = {};

const CATEGORIES = [
  { id: "all",     fr: "Tout",            de: "Alle" },
  { id: "livres",  fr: "Livres",          de: "Bücher" },
  { id: "films",   fr: "Films & Séries",  de: "Filme & Serien" },
  { id: "musique", fr: "Musique",         de: "Musik" },
  { id: "voyages", fr: "Voyages",         de: "Reisen" },
  { id: "cuisine", fr: "Cuisine & Vin",   de: "Küche & Wein" },
  { id: "forum",   fr: "Forum",           de: "Forum" },
];

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
      _sessionCache = res.member; // refresh cache immédiat
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
  // Synchrone : retourne ce qu'on a en cache (null si pas chargé encore)
  // Pour un accès garanti, utiliser getSessionAsync()
  getSession: () => {
    if (_sessionCache === undefined) {
      // Pas encore chargé : on lance le chargement en arrière-plan, mais on retourne null pour l'instant
      loadSession().then(() => {
        if (typeof window.refreshAuthState === "function") window.refreshAuthState();
      });
      return null;
    }
    return _sessionCache;
  },
  // Async : attend le chargement de la session
  getSessionAsync: () => loadSession(),
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
  _mockEvents: MOCK_EVENTS,
  _mockNews: MOCK_NEWS,
  _mockArticles: MOCK_ARTICLES,
};

// ---- Auto-load session au démarrage (non bloquant) ----
loadSession().then(() => {
  if (typeof window.refreshAuthState === "function") window.refreshAuthState();
});
