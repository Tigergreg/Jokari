// api/firestore.js — Firestore client + seed event data
const { Firestore } = require("@google-cloud/firestore");

const projectId = process.env.GCP_PROJECT_ID || "jokari";

const db = new Firestore({
  projectId,
  // On Cloud Run, default credentials are picked up from the service account
  // attached to the service. Locally, use GOOGLE_APPLICATION_CREDENTIALS.
});

// Fallback events used when Firestore is unreachable (e.g. local dev w/o creds).
const FALLBACK_EVENTS = [
  { id: "open-zh", title: "Open de Zürich", titleDe: "Open Zürich",
    date: "2026-06-06", dateFr: "06 juin 2026", dateDe: "06. Juni 2026",
    time: "10h — 18h", timeDe: "10–18 Uhr",
    location: "Seeplatz, Horgen", price: 45, spotsTotal: 32, spotsLeft: 11,
    descFr: "Le tournoi de printemps. Format double, finale au crépuscule, apéro qui finit tard.",
    descDe: "Das Frühlingsturnier. Doppelmodus, Finale in der Dämmerung, Apéro bis spät.",
    type: "tournoi", typeDe: "Turnier" },
  { id: "biarritz-cup", title: "Coupe Biarritz", titleDe: "Biarritz-Cup",
    date: "2026-07-12", dateFr: "12 juillet 2026", dateDe: "12. Juli 2026",
    time: "14h — 22h", timeDe: "14–22 Uhr",
    location: "Strandbad Käpfnach", price: 60, spotsTotal: 48, spotsLeft: 23,
    descFr: "Notre tournoi-phare, en hommage à la patrie du jeu. Tenue blanche conseillée.",
    descDe: "Unser Hauptturnier zu Ehren der Heimat des Spiels. Weisse Kleidung empfohlen.",
    type: "tournoi", typeDe: "Turnier" },
  { id: "lac-classique", title: "Lac Classique", titleDe: "See-Klassiker",
    date: "2026-09-19", dateFr: "19 sept. 2026", dateDe: "19. Sept. 2026",
    time: "11h — 19h", timeDe: "11–19 Uhr",
    location: "Hafen Horgen", price: 35, spotsTotal: 24, spotsLeft: 18,
    descFr: "Tournoi automnal en simple. Couleurs d'octobre, balles bien froides.",
    descDe: "Herbstliches Einzelturnier. Oktoberfarben, schön kühle Bälle.",
    type: "tournoi", typeDe: "Turnier" },
  { id: "demo-day", title: "Journée découverte", titleDe: "Schnuppertag",
    date: "2026-05-23", dateFr: "23 mai 2026", dateDe: "23. Mai 2026",
    time: "13h — 17h", timeDe: "13–17 Uhr",
    location: "Pelouse de Horgen", price: 0, spotsTotal: 50, spotsLeft: 32,
    descFr: "Initiation gratuite, raquettes prêtées. Pour curieux et débutants.",
    descDe: "Gratis-Einführung, Schläger gestellt. Für Neugierige und Anfänger.",
    type: "initiation", typeDe: "Einführung" },
];

async function listEvents() {
  try {
    const snap = await db.collection("events").orderBy("date", "asc").get();
    if (snap.empty) return FALLBACK_EVENTS;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[firestore] listEvents failed, using fallback:", err.message);
    return FALLBACK_EVENTS;
  }
}

async function getEvent(id) {
  try {
    const doc = await db.collection("events").doc(id).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };
  } catch (err) { console.warn("[firestore] getEvent failed:", err.message); }
  return FALLBACK_EVENTS.find(e => e.id === id) || null;
}

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

async function saveDocument(collection, data) {
  const ref = await db.collection(collection).add({
    ...data,
    createdAt: Firestore.Timestamp.now(),
  });
  return { id: ref.id };
}

module.exports = { db, listEvents, getEvent, listNews, getNewsItem, listArticles, getArticle, saveDocument };
