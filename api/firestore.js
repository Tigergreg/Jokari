// api/firestore.js — Firestore client + normalization helpers
const { Firestore } = require("@google-cloud/firestore");

const projectId = process.env.GCP_PROJECT_ID || "jokari";

const db = new Firestore({
  projectId,
});

// ====================================================================
// Helpers de normalisation
// ====================================================================

// Convertit toute date en format ISO YYYY-MM-DD (ou null si non parseable)
// Gère : "2026-04-29", "2026_04_29", "2026/04/29", "A determiner", Timestamp, Date
function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === "object" && typeof value.toDate === "function") {
    try { return value.toDate().toISOString().slice(0, 10); } catch (e) { return null; }
  }
  if (value instanceof Date) {
    return isNaN(value) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string") return null;
  const v = value.trim();
  const normalized = v.replace(/[_/.]/g, "-");
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(v);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return null;
}

// Convertit un nombre / string en nombre, ou 0 par défaut
function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

// Génère un libellé de date français lisible à partir d'un ISO (ex. "06 juin 2026")
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin",
                   "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni",
                   "Juli", "August", "September", "Oktober", "November", "Dezember"];
function formatDateFr(iso) {
  if (!iso) return "À déterminer";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]} ${MONTHS_FR[parseInt(m[2], 10) - 1]} ${m[1]}`;
}
function formatDateDe(iso) {
  if (!iso) return "Wird festgelegt";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}. ${MONTHS_DE[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

// ====================================================================
// EVENTS
// ====================================================================

// Fallback events used when Firestore is unreachable
const FALLBACK_EVENTS = [
  { id: "open-zh", title: "Open de Zürich", titleDe: "Open Zürich",
    date: "2026-06-06", dateFr: "06 juin 2026", dateDe: "06. Juni 2026",
    time: "10h — 18h", timeDe: "10–18 Uhr",
    location: "Seeplatz, Horgen", price: 45, spotsTotal: 32, spotsLeft: 11,
    descFr: "Le tournoi de printemps. Format double, finale au crépuscule, apéro qui finit tard.",
    descDe: "Das Frühlingsturnier. Doppelmodus, Finale in der Dämmerung, Apéro bis spät.",
    type: "tournoi", typeDe: "Turnier" },
];

// Mots-clés type → typeDe
const TYPE_DE_MAP = {
  tournoi: "Turnier",
  initiation: "Einführung",
  rencontre: "Treffen",
  formation: "Schulung",
  apero: "Apéro",
};

// Normalise un event Firestore — gère les schémas FR (titre/prix/lieu...) et EN (title/price/location...)
function normalizeEventOutput(id, data) {
  const date = normalizeDate(data.date) || data.date; // garde "A determiner" si non parseable, pour mémoire
  const isoDate = normalizeDate(data.date);
  const title    = data.title    || data.titre    || "";
  const titleDe  = data.titleDe  || data.titreDe  || title;
  const time     = data.time     || data.heure    || "";
  const timeDe   = data.timeDe   || data.heureDe  || time;
  const type     = data.type     || data.categorie || "tournoi";
  const typeDe   = data.typeDe   || TYPE_DE_MAP[type] || type;
  const location = data.location || data.lieu     || "";
  const price    = toNumber(data.price ?? data.prix, 0);
  const spotsTotal = toNumber(data.spotsTotal ?? data.placestotal ?? data.placesTotal, 0);
  const spotsLeft  = toNumber(data.spotsLeft  ?? data.placesrestantes ?? data.placesRestantes, spotsTotal);
  const dateFr   = data.dateFr   || formatDateFr(isoDate);
  const dateDe   = data.dateDe   || formatDateDe(isoDate);

  return {
    id,
    title,
    titleDe,
    date: isoDate || data.date || null,
    dateFr,
    dateDe,
    time,
    timeDe,
    type,
    typeDe,
    location,
    price,
    spotsTotal,
    spotsLeft,
    descFr: data.descFr || data.description || "",
    descDe: data.descDe || data.beschreibung || "",
    bodyFr: data.bodyFr || data.corps || null,
    bodyDe: data.bodyDe || null,
    image: data.image || null,
    cover: data.cover || "navy",
    status: data.status || data.statut || "open",
  };
}

async function listEvents() {
  try {
    const snap = await db.collection("events").get();
    if (snap.empty) return FALLBACK_EVENTS;
    const events = snap.docs.map(d => normalizeEventOutput(d.id, d.data()));
    // Tri par date ISO (les "non datés" à la fin)
    events.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
    return events;
  } catch (err) {
    console.warn("[firestore] listEvents failed, using fallback:", err.message);
    return FALLBACK_EVENTS;
  }
}

async function getEvent(id) {
  try {
    const doc = await db.collection("events").doc(id).get();
    if (doc.exists) return normalizeEventOutput(doc.id, doc.data());
  } catch (err) { console.warn("[firestore] getEvent failed:", err.message); }
  return FALLBACK_EVENTS.find(e => e.id === id) || null;
}

// ====================================================================
// NEWS
// ====================================================================

async function listNews() {
  try {
    const snap = await db.collection("news").where("status", "==", "published").orderBy("date", "desc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[firestore] listNews failed:", err.message);
    return [];
  }
}

async function getNewsItem(id) {
  try {
    const doc = await db.collection("news").doc(id).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };
  } catch (err) { console.warn("[firestore] getNewsItem failed:", err.message); }
  return null;
}

// ====================================================================
// ARTICLES
// ====================================================================

async function listArticles({ category, limit } = {}) {
  try {
    let q = db.collection("articles").where("status", "==", "published");
    if (category && category !== "all") q = q.where("category", "==", category);
    q = q.orderBy("date", "desc");
    if (limit) q = q.limit(limit);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[firestore] listArticles failed:", err.message);
    return [];
  }
}

async function getArticle(id) {
  try {
    const doc = await db.collection("articles").doc(id).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };
  } catch (err) { console.warn("[firestore] getArticle failed:", err.message); }
  return null;
}

// ====================================================================
// GENERIC
// ====================================================================

async function saveDocument(collection, data) {
  const ref = await db.collection(collection).add({
    ...data,
    createdAt: Firestore.Timestamp.now(),
  });
  return { id: ref.id };
}

// ====================================================================
// MEMBERS
// ====================================================================

async function getMemberByEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  try {
    const snap = await db.collection("members")
      .where("email", "==", normalized)
      .limit(1)
      .get();
    if (!snap.empty) {
      const d = snap.docs[0];
      return normalizeMember({ id: d.id, ...d.data() });
    }
    const all = await db.collection("members").get();
    for (const d of all.docs) {
      const data = d.data();
      if ((data.email || "").toLowerCase().trim() === normalized) {
        return normalizeMember({ id: d.id, ...data });
      }
    }
    return null;
  } catch (err) {
    console.warn("[firestore] getMemberByEmail failed:", err.message);
    return null;
  }
}

function normalizeMember(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName || raw.prenom || null,
    lastName: raw.lastName || raw.nom || null,
    status: raw.status || raw.statut || null,
    memberType: raw.memberType || raw.type_membre || null,
    role: raw.role || null,
    accesslevel: raw.accesslevel || raw.accessLevel || "member",
    raw,
  };
}

module.exports = {
  db,
  listEvents,
  getEvent,
  listNews,
  getNewsItem,
  listArticles,
  getArticle,
  saveDocument,
  getMemberByEmail,
  normalizeDate,
  formatDateFr,
  formatDateDe,
};
