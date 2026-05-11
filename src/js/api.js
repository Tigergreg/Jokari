/* ============================================================
   api.js — Wrapper for the Express backend (api/server.js)
   Mock layer kicks in everywhere except *.jokari.ch.
   ============================================================ */

const API_BASE = (window.JOKARI_API_BASE || "/api");
const USE_MOCK = false;

async function call(path, options = {}) {
  if (USE_MOCK) return mockCall(path, options);
  const res = await fetch(API_BASE + path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt}`);
  }
  return res.json();
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
      // Seeded articles flagged as published also count
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

  // ---- Member-scoped data (requires session in mock) ----
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
  // Tag /registrations POSTs with member id when session present (so they show up in /my-registrations)
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

  // ---- Admin (bureau) endpoints ----
  function getSession() {
    try { return JSON.parse(localStorage.getItem("jokari-session") || "null"); }
    catch { return null; }
  }
  function requireBureau() {
    const s = getSession();
    return s && s.role === "bureau" ? s : null;
  }

  // Collect ALL articles across members (seed + extras), used for moderation
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
    // Apply admin overrides (decisions made in this session)
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
    bodyDe: "Das Hauptturnier des Zürcher Frühlings. Doppel-K.O.-Modus auf der Wiese des Seeplatz, Finale bei Sonnenuntergang am See. Anmeldung für Mitglieder und Gäste — Partner werden ausgelost. T-Shirt und Abendessen inklusive. Helle Kleidung empfohlen." },
  { id: "biarritz-cup", title: "Coupe Biarritz", titleDe: "Biarritz-Cup",
    date: "2026-07-12", dateFr: "12 juillet 2026", dateDe: "12. Juli 2026",
    time: "14h — 22h", timeDe: "14–22 Uhr",
    location: "Strandbad Käpfnach", price: 60, spotsTotal: 48, spotsLeft: 23,
    descFr: "Notre tournoi-phare, en hommage à la patrie du jeu. Tenue blanche conseillée.",
    descDe: "Unser Hauptturnier zu Ehren der Heimat des Spiels. Weisse Kleidung empfohlen.",
    type: "tournoi", typeDe: "Turnier",
    bodyFr: "L'événement de l'été. Tableaux en simple et en double, paëlla servie sur la plage, fanfare basque en clôture. Inscription par paires recommandée mais non obligatoire.",
    bodyDe: "Das Sommerereignis. Einzel- und Doppeltableaus, Paella am Strand, baskische Blaskapelle zum Abschluss." },
  { id: "lac-classique", title: "Lac Classique", titleDe: "See-Klassiker",
    date: "2026-09-19", dateFr: "19 sept. 2026", dateDe: "19. Sept. 2026",
    time: "11h — 19h", timeDe: "11–19 Uhr",
    location: "Hafen Horgen", price: 35, spotsTotal: 24, spotsLeft: 18,
    descFr: "Tournoi automnal en simple. Couleurs d'octobre, balles bien froides.",
    descDe: "Herbstliches Einzelturnier. Oktoberfarben, schön kühle Bälle.",
    type: "tournoi", typeDe: "Turnier",
    bodyFr: "Le tournoi de clôture. Simple uniquement, format poules + élimination directe. Vin chaud à mi-journée, raclette en finale.",
    bodyDe: "Das Saisonabschlussturnier. Nur Einzel, Gruppenphase und K.O. Glühwein zur Mittagszeit, Raclette zum Finale." },
  { id: "demo-day", title: "Journée découverte", titleDe: "Schnuppertag",
    date: "2026-05-23", dateFr: "23 mai 2026", dateDe: "23. Mai 2026",
    time: "13h — 17h", timeDe: "13–17 Uhr",
    location: "Pelouse de Horgen", price: 0, spotsTotal: 50, spotsLeft: 32,
    descFr: "Initiation gratuite, raquettes prêtées. Pour curieux et débutants.",
    descDe: "Gratis-Einführung, Schläger gestellt. Für Neugierige und Anfänger.",
    type: "initiation", typeDe: "Einführung",
    bodyFr: "Trois heures pour découvrir le Jokari. Raquettes et balles prêtées par le club, membres formateurs disponibles toute l'après-midi. Inscription bienvenue mais non obligatoire — venez comme vous êtes.",
    bodyDe: "Drei Stunden, um Jokari zu entdecken. Schläger und Bälle vom Club, Mitglieder-Coaches den ganzen Nachmittag verfügbar. Anmeldung willkommen, aber nicht zwingend." },
];

const MOCK_NEWS = [
  { id: "open-2025-results", category: "results",
    title: "Marc-Antoine R. remporte l'Open de Zürich 2025",
    titleDe: "Marc-Antoine R. gewinnt Open Zürich 2025",
    date: "2025-09-21", dateFr: "21 septembre 2025", dateDe: "21. September 2025",
    excerptFr: "Finale au coucher du soleil contre Hélène B. : trois sets, vent du sud, et un trophée gravé qui change enfin de mains.",
    excerptDe: "Finale bei Sonnenuntergang gegen Hélène B.: drei Sätze, Südwind, und ein gravierter Pokal, der endlich den Besitzer wechselt.",
    bodyFr: "Soixante-douze inscrits, dix-huit tableaux, et une finale qui n'a presque pas eu lieu — coupure d'électricité au club-house, balles perdues dans le lac, et une averse qui a obligé tout le monde à se serrer sous l'auvent. Marc-Antoine R., joueur du jeudi soir, s'impose en trois sets serrés (11-9, 7-11, 11-8) contre Hélène B., tenante du titre. Le bureau le félicite et lui rappelle qu'il doit désormais offrir l'apéro pendant un an. Photos ci-dessous, signées Pierre-Yves.",
    bodyDe: "Zweiundsiebzig Anmeldungen, achtzehn Tableaus, und ein Finale, das fast nicht stattgefunden hätte — Stromausfall im Clubhaus, im See verlorene Bälle, und ein Regenguss, der alle unter das Vordach drängte. Marc-Antoine R., Spieler des Donnerstagabends, gewinnt in drei umkämpften Sätzen (11-9, 7-11, 11-8) gegen Titelverteidigerin Hélène B.",
    cover: "navy", coverLabel: "Trophée Open Zürich" },
  { id: "new-bureau", category: "announcement",
    title: "Le nouveau bureau prend ses fonctions",
    titleDe: "Der neue Vorstand tritt sein Amt an",
    date: "2025-11-04", dateFr: "04 novembre 2025", dateDe: "04. November 2025",
    excerptFr: "Grégoire Mouly-Aigrot est reconduit à la présidence ; Hélène B. rejoint le bureau comme vice-présidente.",
    excerptDe: "Grégoire Mouly-Aigrot wird als Präsident bestätigt; Hélène B. übernimmt das Amt der Vizepräsidentin.",
    bodyFr: "L'assemblée générale du 28 octobre a renouvelé le bureau pour deux ans. Grégoire reste à la présidence, Hélène B. — championne de l'Open 2024 — prend la vice-présidence, Marc-Antoine R. reste trésorier, et Sophie K. rejoint l'équipe comme responsable communication. Le bureau remercie Pierre-Yves L. pour ses quatre années de bons services au secrétariat.",
    bodyDe: "Die Generalversammlung vom 28. Oktober hat den Vorstand für zwei Jahre erneuert. Grégoire bleibt Präsident, Hélène B. — Open-Siegerin 2024 — wird Vizepräsidentin.",
    cover: "sand", coverLabel: "AG · 28 octobre" },
  { id: "saison-2026", category: "announcement",
    title: "Saison 2026 : trois tournois et un voyage à Biarritz",
    titleDe: "Saison 2026: drei Turniere und eine Reise nach Biarritz",
    date: "2026-01-12", dateFr: "12 janvier 2026", dateDe: "12. Januar 2026",
    excerptFr: "La saison qui s'ouvre comptera trois tournois officiels, six sessions découverte et un week-end à Biarritz au mois d'août.",
    excerptDe: "Die kommende Saison umfasst drei offizielle Turniere, sechs Schnuppersessions und ein Wochenende in Biarritz im August.",
    bodyFr: "Le calendrier 2026 est désormais en ligne. Trois tournois officiels — Open de Zürich (juin), Coupe Biarritz (juillet), Lac Classique (septembre) — et un week-end de pèlerinage à Biarritz, sur la plage où tout a commencé. Inscriptions ouvertes aux membres dès le 1er février, aux invités dès le 1er mars.",
    bodyDe: "Der Kalender 2026 ist online. Drei offizielle Turniere und eine Pilgerreise nach Biarritz, an den Strand, wo alles begann.",
    cover: "red", coverLabel: "Programme 2026" },
];

const MOCK_ARTICLES = [
  // ===== Livres =====
  { id: "ete-on-na-rien-fait", category: "livres", status: "published",
    title: "L'été où l'on n'a rien fait", titleDe: "Der Sommer, in dem wir nichts taten",
    authorName: "Marie Lavoisier", authorId: "u-marie",
    date: "2026-04-12", dateFr: "12 avril 2026", dateDe: "12. April 2026",
    excerptFr: "Pourquoi le farniente est, peut-être, le plus haut accomplissement sportif. Notes sur Pavese, Calvino et les après-midi de juillet.",
    excerptDe: "Weshalb das Nichtstun vielleicht die höchste sportliche Leistung ist.",
    bodyFr: "Il y a une saison, en Italie, où plus rien ne bouge — celle des après-midi de juillet, quand le sol brûle, que les chiens dorment dans l'ombre des cyprès et que la radio diffuse, pour personne, un vieux concerto. Cesare Pavese décrit cela dans Le bel été : la lenteur n'est pas l'absence d'action, c'est sa forme la plus haute. Pour qui joue au Jokari, l'idée a quelque chose d'évident. Ce sport-là refuse l'épuisement, le score frénétique, le dépassement de soi. On y joue pour le plaisir du rebond, c'est tout — et c'est immense.\n\nIl faudrait écrire un éloge sérieux du farniente sportif. Du tennis joué en pull, du Jokari en espadrilles, du ping-pong sur les terrasses italiennes. Une littérature de la lenteur. En attendant, je vous recommande chaudement la relecture estivale de Pavese, Calvino, Natalia Ginzburg.",
    bodyDe: "Es gibt in Italien eine Jahreszeit, in der sich nichts mehr bewegt — die Juli-Nachmittage, wenn der Boden brennt, die Hunde im Schatten der Zypressen schlafen und das Radio für niemanden ein altes Konzert spielt.",
    cover: "navy", coverLabel: "L'été romain" },
  { id: "elegance-herrison", category: "livres", status: "published",
    title: "Relire L'élégance du hérisson", titleDe: "Die Eleganz des Igels — wiedergelesen",
    authorName: "Antoine Klein", authorId: "u-antoine",
    date: "2026-03-22", dateFr: "22 mars 2026", dateDe: "22. März 2026",
    excerptFr: "Vingt ans plus tard, le roman de Muriel Barbery tient-il encore ? Réflexion sur la concierge, le sport et la discrétion.",
    excerptDe: "Zwanzig Jahre später — hält Muriel Barberys Roman noch?",
    bodyFr: "On l'avait beaucoup lu, beaucoup aimé, peut-être un peu trop. Et puis on l'a oublié, comme tout ce que la mode a porté trop fort. Vingt ans après, je l'ai repris dans le train Zürich-Milan, et j'ai retrouvé une chose simple : c'est un roman sur la discrétion. Renée la concierge, comme un joueur de Jokari, refuse de paraître. Elle joue son jeu pour elle-même.\n\nUn joli rappel pour le club.",
    bodyDe: "Wir hatten ihn viel gelesen, viel gemocht, vielleicht etwas zu sehr.",
    cover: "sand", coverLabel: "Lecture en train" },
  { id: "wallace-tennis", category: "livres", status: "published",
    title: "David Foster Wallace et le tennis",
    titleDe: "David Foster Wallace und Tennis",
    authorName: "Pierre-Yves L.", authorId: "u-pyl",
    date: "2026-02-15", dateFr: "15 février 2026", dateDe: "15. Februar 2026",
    excerptFr: "Le grand essayiste américain a écrit sur Federer, sur Tracy Austin, sur lui-même. Ce qu'il dit du sport vaut pour notre petit jeu.",
    excerptDe: "Was DFW über Federer und Tracy Austin schreibt, gilt auch für unser kleines Spiel.",
    bodyFr: "Il y a deux essais de Wallace que tout joueur du club devrait connaître : Federer comme expérience religieuse, et son texte sur Tracy Austin. Le premier célèbre la grâce ; le second démonte la pauvreté du discours sportif officiel. Entre les deux, une théorie : le sport vu de l'intérieur est inarticulable, et c'est pour cela qu'il fascine.",
    bodyDe: "Es gibt zwei Essays von Wallace, die jeder Clubspieler kennen sollte.",
    cover: "red", coverLabel: "Roger Federer · 2006" },

  // ===== Films & Séries =====
  { id: "rohmer-jokari", category: "films", status: "published",
    title: "Rohmer joue au Jokari", titleDe: "Rohmer spielt Jokari",
    authorName: "Antoine Klein", authorId: "u-antoine",
    date: "2026-03-28", dateFr: "28 mars 2026", dateDe: "28. März 2026",
    excerptFr: "Une enquête : pourquoi les personnages d'Éric Rohmer sont-ils, secrètement, des Jokarophiles ?",
    excerptDe: "Eine Untersuchung: Warum sind Rohmers Figuren heimliche Jokari-Liebhaber?",
    bodyFr: "Personne n'a jamais vu un personnage d'Éric Rohmer tenir une raquette de Jokari. Et pourtant. Pauline à la plage, Le rayon vert, Conte d'été — toute l'œuvre du maître respire l'esprit de ce jeu : la conversation oisive sur une plage, la précision du geste, la longueur des après-midi, la mélancolie du retour. Rohmer aurait dû filmer un tournoi de Jokari à Saint-Jean-de-Luz. Il ne l'a pas fait, c'est dommage, mais on peut continuer le travail à sa place.",
    bodyDe: "Niemand hat je eine Rohmer-Figur einen Jokari-Schläger halten sehen. Und doch.",
    cover: "navy", coverLabel: "Conte d'été · 1996" },
  { id: "plein-soleil", category: "films", status: "published",
    title: "Plein soleil, soixante ans après",
    titleDe: "Nur die Sonne war Zeuge — sechzig Jahre später",
    authorName: "Sophie K.", authorId: "u-sophie",
    date: "2026-02-08", dateFr: "08 février 2026", dateDe: "08. Februar 2026",
    excerptFr: "Delon en bateau, Maurice Ronet en colère, et la mer comme troisième personnage. Notes sur un thriller méditerranéen.",
    excerptDe: "Delon auf dem Boot, Maurice Ronet wütend, und das Meer als dritte Figur.",
    bodyFr: "Vu pour la énième fois, et toujours la même stupeur. Plein soleil de René Clément est un film sur la jalousie, sur le mimétisme, sur l'imposture — mais c'est surtout un film sur le bleu. Le bleu de la mer Tyrrhénienne, le bleu des yeux de Delon, le bleu pâle des chemises Lacoste de Ronet.",
    bodyDe: "Plein soleil ist ein Film über Eifersucht, Mimikry, Hochstapelei — aber vor allem ein Film über das Blau.",
    cover: "red", coverLabel: "Tyrrhénienne · 1960" },
  { id: "white-lotus", category: "films", status: "published",
    title: "The White Lotus, vu depuis Horgen",
    titleDe: "The White Lotus, aus Horgen betrachtet",
    authorName: "Hélène B.", authorId: "u-helene",
    date: "2026-01-30", dateFr: "30 janvier 2026", dateDe: "30. Januar 2026",
    excerptFr: "La série de Mike White nous regarde, nous, vacanciers européens. Faut-il en rire ou rougir ?",
    excerptDe: "Mike Whites Serie sieht uns an — die europäischen Urlauber.",
    bodyFr: "On a regardé les trois saisons en famille pendant l'hiver. C'est cruel, c'est juste, c'est parfois insupportable. La série dit quelque chose de l'Europe touristique que nous fréquentons l'été — Sicile, Thaïlande, et peut-être bientôt Biarritz.",
    bodyDe: "Wir haben alle drei Staffeln im Winter mit der Familie gesehen.",
    cover: "sand", coverLabel: "Saison 3" },

  // ===== Musique =====
  { id: "bossa-dimanche", category: "musique", status: "published",
    title: "Bande-son d'un dimanche", titleDe: "Soundtrack eines Sonntags",
    authorName: "DJ Marin", authorId: "u-marin",
    date: "2026-04-02", dateFr: "02 avril 2026", dateDe: "02. April 2026",
    excerptFr: "Notre playlist de printemps : bossa, jazz manouche, une tasse de Stan Getz pour accompagner les premiers matchs.",
    excerptDe: "Frühlingsplaylist: Bossa, Manouche-Jazz, eine Tasse Stan Getz.",
    bodyFr: "Voici la playlist officielle du club pour la saison de printemps. À jouer doucement, derrière les conversations, pendant les sessions du jeudi soir. Vingt morceaux, deux heures et demie, zéro tube. Le tout est sur Spotify, lien dans le mail de la lettre saisonnière.",
    bodyDe: "Hier ist die offizielle Club-Playlist für den Frühling.",
    cover: "red", coverLabel: "Vinyles · sélection" },
  { id: "gainsbourg-melody", category: "musique", status: "published",
    title: "Melody Nelson, manuel de discrétion",
    titleDe: "Melody Nelson, Handbuch der Diskretion",
    authorName: "Marie Lavoisier", authorId: "u-marie",
    date: "2026-03-05", dateFr: "05 mars 2026", dateDe: "05. März 2026",
    excerptFr: "Quarante minutes, sept morceaux, un album presque parfait. Pourquoi on l'écoute encore en boucle.",
    excerptDe: "Vierzig Minuten, sieben Stücke, ein fast perfektes Album.",
    bodyFr: "Quarante minutes, sept morceaux, un disque qui n'a pas vieilli d'un jour. Histoire de Melody Nelson est la seule œuvre où Gainsbourg, pour une fois, est totalement sérieux. Pas une provocation, pas un gros mot — juste un Rolls Corniche, une rousse de quatorze ans dont il ne faut pas tirer de conclusions, et un orchestre de Londres qui fait tout le travail.",
    bodyDe: "Vierzig Minuten, sieben Stücke, eine Platte, die keinen Tag gealtert ist.",
    cover: "navy", coverLabel: "1971" },

  // ===== Voyages =====
  { id: "biarritz-pelerinage", category: "voyages", status: "published",
    title: "Pèlerinage à Biarritz, mode d'emploi",
    titleDe: "Pilgerreise nach Biarritz",
    authorName: "Grégoire M.-A.", authorId: "u-greg",
    date: "2026-03-18", dateFr: "18 mars 2026", dateDe: "18. März 2026",
    excerptFr: "Quatre jours sur la côte basque, du Phare au Café Miremont, en passant par la plage de la Côte des Basques. Conseils pratiques.",
    excerptDe: "Vier Tage an der baskischen Küste — praktische Tipps.",
    bodyFr: "Le voyage du club aura lieu du 21 au 24 août 2026. Vol Zürich-Biarritz, hôtel à Saint-Jean-de-Luz, raquettes prêtées sur place par Jokari Originals. Au programme : un tournoi amical sur la Grande Plage, une visite de l'atelier à Bayonne, un dîner dans la cidrerie d'Ascain, et bien sûr les longues heures sur la Côte des Basques. Inscriptions auprès du bureau, places limitées à seize.",
    bodyDe: "Die Clubreise findet vom 21. bis 24. August 2026 statt.",
    cover: "red", coverLabel: "Côte des Basques" },
  { id: "tessin-weekend", category: "voyages", status: "published",
    title: "Un week-end de Jokari au Tessin",
    titleDe: "Ein Jokari-Wochenende im Tessin",
    authorName: "Sophie K.", authorId: "u-sophie",
    date: "2026-02-25", dateFr: "25 février 2026", dateDe: "25. Februar 2026",
    excerptFr: "Locarno, Ascona, le lac Majeur. Trois jours en mode lent, à jouer sur les plages de galets.",
    excerptDe: "Locarno, Ascona, der Lago Maggiore. Drei langsame Tage.",
    bodyFr: "Profitez d'un week-end de mai pour descendre en train au Tessin. Les plages de galets d'Ascona se prêtent étonnamment bien au Jokari. Étape gastronomique à la Grotto Pozzasc à Peccia, baignade à Brissago, retour en bateau de Locarno.",
    bodyDe: "Nutzen Sie ein Mai-Wochenende, um mit dem Zug ins Tessin zu fahren.",
    cover: "sand", coverLabel: "Ascona" },

  // ===== Cuisine =====
  { id: "rose-saumur", category: "cuisine", status: "published",
    title: "Trois rosés pour l'apéro de mai",
    titleDe: "Drei Rosés für den Mai-Apéro",
    authorName: "Marc-Antoine R.", authorId: "u-marc",
    date: "2026-04-08", dateFr: "08 avril 2026", dateDe: "08. April 2026",
    excerptFr: "Tavel, Bandol, et une surprise valaisanne. Notre trésorier passe en revue les bouteilles de la saison.",
    excerptDe: "Tavel, Bandol und eine Walliser Überraschung.",
    bodyFr: "Avec la saison qui s'ouvre, le bureau a sélectionné trois rosés pour les apéros de mai. Tavel du Château d'Aquéria pour la structure, Bandol du Domaine Tempier pour le prestige, et un Œil-de-perdrix de Provins pour le côté local. Tous trois disponibles à la Cave de Horgen.",
    bodyDe: "Mit der neuen Saison hat der Vorstand drei Rosés für die Mai-Apéros ausgewählt.",
    cover: "red", coverLabel: "Trois rosés" },
  { id: "txuleta", category: "cuisine", status: "published",
    title: "La txuleta, pièce maîtresse basque",
    titleDe: "Die Txuleta, baskisches Hauptstück",
    authorName: "Antoine Klein", authorId: "u-antoine",
    date: "2026-01-18", dateFr: "18 janvier 2026", dateDe: "18. Januar 2026",
    excerptFr: "Comment cuire une côte de bœuf basque comme à Getaria. Un guide en trois étapes et une seule grille.",
    excerptDe: "Wie man ein baskisches Rinderkotelett wie in Getaria zubereitet.",
    bodyFr: "Trois étapes, c'est tout. Premièrement, sortir la viande deux heures avant. Deuxièmement, la saler abondamment au gros sel. Troisièmement, la passer sur des braises de chêne très chaudes, deux minutes par face, pas plus. Servir avec des piquillos rôtis et un verre de Txakoli.",
    bodyDe: "Drei Schritte, das ist alles.",
    cover: "navy", coverLabel: "Getaria" },

  // ===== Forum =====
  { id: "where-balls", category: "forum", status: "published",
    title: "Où trouver des balles de rechange à Zürich ?",
    titleDe: "Wo Ersatzbälle in Zürich finden?",
    authorName: "Hélène B.", authorId: "u-helene",
    date: "2026-04-15", dateFr: "15 avril 2026", dateDe: "15. April 2026",
    excerptFr: "J'ai perdu mes trois dernières dans le lac. Quelqu'un connaît un revendeur en Suisse ou faut-il commander chez Jokari Originals ?",
    excerptDe: "Ich habe meine letzten drei Bälle im See verloren. Hat jemand einen Tipp?",
    bodyFr: "Comme dit. J'ai perdu mes trois dernières balles dans le lac le week-end dernier (vent du nord, c'est de ma faute). Quelqu'un sait où en commander en Suisse, ou faut-il systématiquement passer par Bayonne ? Le délai me semble long. Merci d'avance — je veux jouer ce jeudi !",
    bodyDe: "Wie gesagt. Ich habe meine letzten drei Bälle letztes Wochenende im See verloren.",
    cover: "sand", coverLabel: "Forum · 15 avril" },
  { id: "partenaire-biarritz", category: "forum", status: "published",
    title: "Recherche partenaire pour la Coupe Biarritz",
    titleDe: "Suche Partner für Biarritz-Cup",
    authorName: "Sophie K.", authorId: "u-sophie",
    date: "2026-04-09", dateFr: "09 avril 2026", dateDe: "09. April 2026",
    excerptFr: "Mon partenaire habituel se marie ce week-end-là. Niveau intermédiaire, jeu plutôt défensif, dispo pour entraînements en mai.",
    excerptDe: "Mein üblicher Partner heiratet an diesem Wochenende.",
    bodyFr: "Voilà, mon partenaire habituel a la mauvaise idée de se marier le 12 juillet. Je cherche quelqu'un de niveau intermédiaire-confirmé pour la Coupe. Je joue plutôt défensif, je suis à l'aise sur les longs échanges. Dispo pour deux ou trois sessions d'entraînement en mai et juin. Écrivez-moi en message privé.",
    bodyDe: "Mein üblicher Partner heiratet leider am 12. Juli.",
    cover: "navy", coverLabel: "Forum · 09 avril" },
];

const MOCK_MEMBERS = [
  { id: "m-aurelie", email: "aurelie.fontaine@example.ch", firstName: "Aurélie", lastName: "Fontaine", role: "member", joinedAt: "2023-04-12" },
  { id: "m-thomas",  email: "thomas.berger@example.ch",   firstName: "Thomas",   lastName: "Berger",  role: "bureau",  joinedAt: "2021-09-01" },
  { id: "m-demo",    email: "demo@jokari.ch",              firstName: "Membre",   lastName: "Démo",    role: "member", joinedAt: "2024-06-20" },
];

// Inscriptions tournois passées/en cours — par memberId
const MOCK_MY_REGISTRATIONS = {
  "m-demo": [
    { id: "reg-001", eventId: "open-zh", eventTitle: "Open de Zürich", eventDate: "06 juin 2026",
      participants: 2, amount: 90, status: "paid", createdAt: "2026-04-12" },
    { id: "reg-002", eventId: "nuit-blanche", eventTitle: "Nuit Blanche du Jokari", eventDate: "21 août 2026",
      participants: 1, amount: 35, status: "pending-payment", createdAt: "2026-05-03" },
  ],
  "m-aurelie": [
    { id: "reg-101", eventId: "biarritz-cup", eventTitle: "Coupe Biarritz", eventDate: "12 juillet 2026",
      participants: 2, amount: 120, status: "paid", createdAt: "2026-04-28" },
    { id: "reg-102", eventId: "open-zh", eventTitle: "Open de Zürich", eventDate: "06 juin 2026",
      participants: 1, amount: 45, status: "paid", createdAt: "2026-04-08" },
    { id: "reg-103", eventId: "vieux-loups", eventTitle: "Coupe des Vieux Loups", eventDate: "14 septembre 2025",
      participants: 2, amount: 80, status: "completed", createdAt: "2025-08-15", result: "Demi-finale" },
  ],
  "m-thomas": [
    { id: "reg-201", eventId: "open-zh", eventTitle: "Open de Zürich", eventDate: "06 juin 2026",
      participants: 1, amount: 45, status: "paid", createdAt: "2026-03-30" },
  ],
};

// Articles écrits par chaque membre, mélange de statuts
const MOCK_MY_ARTICLES = {
  "m-demo": [
    { id: "draft-demo-001", title: "Premier brouillon : la prise de raquette au Strandbad",
      category: "forum", excerpt: "Quelques notes après trois sessions d'observation…",
      status: "draft", submittedAt: "2026-05-08", views: 0 },
    { id: "art-demo-002", title: "Une éphéméride du jeu : 1981-2024",
      category: "forum", excerpt: "Quarante ans de Jokari en quinze dates marquantes — du club de Biarritz au revival zurichois.",
      body: "Quarante ans de Jokari…", status: "pending-review", submittedAt: "2026-05-10" },
  ],
  "m-aurelie": [
    { id: "art-aurelie-001", title: "Trois cafés où relire Patrick Modiano",
      category: "livres", excerpt: "Trois adresses zurichoises où le silence se prête à la phrase longue.",
      status: "published", submittedAt: "2026-03-14", publishedAt: "2026-03-18", views: 412 },
    { id: "art-aurelie-002", title: "La playlist d'avant-tournoi",
      category: "musique", excerpt: "Vingt minutes pour entrer dans le rythme du jeu.",
      status: "published", submittedAt: "2026-02-02", publishedAt: "2026-02-05", views: 287 },
    { id: "art-aurelie-003", title: "Notes sur le rebond — relectures de Helvetia",
      category: "forum", excerpt: "Pourquoi la pelouse de Käpfnach rend le ballon plus lent…",
      status: "pending-review", submittedAt: "2026-05-04" },
  ],
  "m-thomas": [
    { id: "art-thomas-001", title: "Bilan de saison 2025 — le bureau s'explique",
      category: "forum", excerpt: "Trois décisions, deux regrets, une promesse.",
      status: "published", submittedAt: "2025-12-15", publishedAt: "2025-12-20", views: 1024 },
  ],
};

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
  verifyMagicLink: token => call("/auth/verify?token=" + encodeURIComponent(token)),
  fetchMe: () => call("/auth/me"),
  logout: () => call("/auth/logout", { method: "POST" }),
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
  getSession: () => {
    try { return JSON.parse(localStorage.getItem("jokari-session") || "null"); }
    catch { return null; }
  },
  CATEGORIES,
  _mockEvents: MOCK_EVENTS,
  _mockNews: MOCK_NEWS,
  _mockArticles: MOCK_ARTICLES,
};
