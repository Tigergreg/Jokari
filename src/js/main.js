/* ============================================================
   main.js — Nav, langue, i18n, formulaires, composants partagés
   ============================================================ */

// -------- i18n --------
const I18N = {
  fr: {
    "nav.home": "Accueil", "nav.jokari": "Le Jokari", "nav.events": "Événements",
    "nav.news": "Actualités",
    "nav.lifestyle": "Lifestyle", "nav.shop": "Boutique", "nav.join": "Rejoindre", "nav.contact": "Contact",
    "nav.login": "Connexion", "nav.account": "Espace membre",
    "cta.join": "Rejoindre le club", "cta.discover": "Découvrir le jeu",
    "cta.calendar": "Voir le calendrier", "cta.register": "M'inscrire",
    "footer.tagline": "L'élégance du rebond, depuis Horgen.",
    "footer.explore": "Explorer", "footer.club": "Le Club", "footer.legal": "Légal",
    "footer.stayClose": "Restons proches", "footer.address": "Seestrasse, 8810 Horgen, ZH",
    "footer.newsletter": "Quatre lettres par an, écrites par le bureau. Pas de publicité.",
    "footer.statuts": "Statuts", "footer.privacy": "Confidentialité", "footer.mentions": "Mentions légales",
    "form.email": "Votre adresse e-mail", "form.subscribe": "S'abonner",
    "form.required": "Champ obligatoire", "form.sending": "Envoi…",
    "form.success.newsletter": "Merci ! À très bientôt dans votre boîte aux lettres.",
    "form.success.member": "Bienvenue ! Votre adhésion est enregistrée. Le bureau vous recontactera sous 7 jours.",
    "form.success.registration": "Inscription confirmée. Un courriel récapitulatif vous a été envoyé.",
    "form.success.contact": "Merci. Nous répondons en général sous 48 heures.",
    "form.error": "Une erreur est survenue. Merci de réessayer ou d'écrire à contact@jokari.ch.",
  },
  de: {
    "nav.home": "Start", "nav.jokari": "Das Spiel", "nav.events": "Termine",
    "nav.news": "Aktuelles",
    "nav.lifestyle": "Lifestyle", "nav.shop": "Shop", "nav.join": "Beitreten", "nav.contact": "Kontakt",
    "nav.login": "Login", "nav.account": "Mitgliederbereich",
    "cta.join": "Mitglied werden", "cta.discover": "Spiel entdecken",
    "cta.calendar": "Kalender ansehen", "cta.register": "Anmelden",
    "footer.tagline": "Die Eleganz des Rückpralls, aus Horgen.",
    "footer.explore": "Entdecken", "footer.club": "Der Club", "footer.legal": "Rechtliches",
    "footer.stayClose": "Bleiben Sie nah", "footer.address": "Seestrasse, 8810 Horgen, ZH",
    "footer.newsletter": "Vier Briefe pro Jahr, vom Büro geschrieben. Keine Werbung.",
    "footer.statuts": "Statuten", "footer.privacy": "Datenschutz", "footer.mentions": "Impressum",
    "form.email": "Ihre E-Mail-Adresse", "form.subscribe": "Abonnieren",
    "form.required": "Pflichtfeld", "form.sending": "Wird gesendet…",
    "form.success.newsletter": "Vielen Dank! Bis bald in Ihrem Briefkasten.",
    "form.success.member": "Willkommen! Ihre Mitgliedschaft ist registriert. Das Büro meldet sich binnen 7 Tagen.",
    "form.success.registration": "Anmeldung bestätigt. Eine Bestätigungs-E-Mail wurde versandt.",
    "form.success.contact": "Danke. Wir antworten in der Regel binnen 48 Stunden.",
    "form.error": "Ein Fehler ist aufgetreten. Bitte erneut versuchen oder an contact@jokari.ch schreiben.",
  },
};

function getLang() {
  return localStorage.getItem("jokari-lang") || "fr";
}
function setLang(lang) {
  localStorage.setItem("jokari-lang", lang);
  applyLang(lang);
  document.documentElement.lang = lang;
  if (typeof refreshAuthState === "function") refreshAuthState();
  // Refresh toggle ui
  document.querySelectorAll(".lang-toggle button").forEach(b => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
}
function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || (I18N.fr && I18N.fr[key]) || key;
}
function applyLang(lang) {
  // Elements with data-i18n use translation key from main dict
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (I18N[lang] && I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  // Elements with data-fr / data-de attributes — swap content
  document.querySelectorAll("[data-fr]").forEach(el => {
    const val = el.getAttribute("data-" + lang) || el.getAttribute("data-fr");
    if (val !== null) el.textContent = val;
  });
  // Placeholders
  document.querySelectorAll("[data-fr-placeholder]").forEach(el => {
    const val = el.getAttribute("data-" + lang + "-placeholder") || el.getAttribute("data-fr-placeholder");
    if (val !== null) el.placeholder = val;
  });
}

// -------- Nav: build, highlight, lang toggle, burger --------
function buildNav() {
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const navHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a class="nav-logo" href="index.html" aria-label="Jokari Club Zürich">
          <span class="nav-mark">J</span>
          <span class="nav-title">Jokari Club<small>Zürich · est. 2021</small></span>
        </a>
        <div class="nav-links" id="nav-links">
          <a class="nav-link" data-page="index.html" href="index.html" data-i18n="nav.home"></a>
          <a class="nav-link" data-page="jokari.html" href="jokari.html" data-i18n="nav.jokari"></a>
          <a class="nav-link" data-page="evenements.html" href="evenements.html" data-i18n="nav.events"></a>
          <a class="nav-link" data-page="actualites.html" href="actualites.html" data-i18n="nav.news"></a>
          <a class="nav-link" data-page="lifestyle.html" href="lifestyle.html" data-i18n="nav.lifestyle"></a>
          <a class="nav-link" data-page="boutique.html" href="boutique.html" data-i18n="nav.shop"></a>
          <a class="nav-link" data-page="rejoindre.html" href="rejoindre.html" data-i18n="nav.join"></a>
          <a class="nav-link" data-page="contact.html" href="contact.html" data-i18n="nav.contact"></a>
          <a class="nav-link nav-auth-link" data-page="connexion.html" href="connexion.html" id="nav-auth-link"></a>
        </div>
        <div class="nav-right">
          <div class="lang-toggle" role="group" aria-label="Langue">
            <button data-lang="fr">FR</button>
            <button data-lang="de">DE</button>
          </div>
          <a class="btn btn-navy" href="rejoindre.html" id="nav-cta" data-i18n="cta.join"></a>
          <button class="nav-burger" aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
      </div>
    </nav>`;
  document.body.insertAdjacentHTML("afterbegin", navHTML);

  // Highlight current
  document.querySelectorAll(".nav-link").forEach(a => {
    if (a.dataset.page === here) a.classList.add("active");
  });
  // Lang toggle
  document.querySelectorAll(".lang-toggle button").forEach(b => {
    b.addEventListener("click", () => setLang(b.dataset.lang));
  });
  // Burger
  const burger = document.querySelector(".nav-burger");
  const links = document.getElementById("nav-links");
  if (burger) burger.addEventListener("click", () => links.classList.toggle("open"));
}

// -------- Auth state: swap nav between logged-out / logged-in --------
function refreshAuthState() {
  const session = window.JokariAPI && window.JokariAPI.getSession();
  const lang = getLang();
  const authLink = document.getElementById("nav-auth-link");
  const cta = document.getElementById("nav-cta");
  if (!authLink || !cta) return;
  if (session) {
    const accountLabel = lang === "de" ? "Mitgliederbereich" : "Espace membre";
    const greeting = session.firstName || (session.email || "").split("@")[0];
    authLink.textContent = greeting;
    authLink.href = "espace-membre.html";
    authLink.setAttribute("data-page", "espace-membre.html");
    authLink.removeAttribute("data-i18n");
    cta.textContent = accountLabel;
    cta.href = "espace-membre.html";
    cta.removeAttribute("data-i18n");
  } else {
    authLink.textContent = lang === "de" ? "Login" : "Connexion";
    authLink.href = "connexion.html";
    authLink.setAttribute("data-page", "connexion.html");
    authLink.setAttribute("data-i18n", "nav.login");
    cta.textContent = lang === "de" ? "Mitglied werden" : "Rejoindre le club";
    cta.href = "rejoindre.html";
    cta.setAttribute("data-i18n", "cta.join");
  }
  // Re-highlight current page
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.page === here);
  });
}
window.refreshAuthState = refreshAuthState;

function buildFooter() {
  const footerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <div style="display:flex;gap:14px;align-items:center;margin-bottom:18px;">
              <span class="nav-mark" style="width:40px;height:40px;font-size:22px;">J</span>
              <div style="font-family:var(--serif);font-size:22px;line-height:1;">
                Jokari Club<br><em style="opacity:0.7;font-size:15px;">Zürich</em>
              </div>
            </div>
            <p style="font-size:14px;opacity:0.85;line-height:1.6;max-width:280px;margin:0;" data-i18n="footer.tagline"></p>
            <div style="margin-top:18px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;opacity:0.6;" data-i18n="footer.address"></div>
          </div>
          <div class="footer-col">
            <h4 data-i18n="footer.explore"></h4>
            <a href="index.html" data-i18n="nav.home"></a>
            <a href="jokari.html" data-i18n="nav.jokari"></a>
            <a href="evenements.html" data-i18n="nav.events"></a>
            <a href="actualites.html" data-i18n="nav.news"></a>
            <a href="lifestyle.html" data-i18n="nav.lifestyle"></a>
            <a href="boutique.html" data-i18n="nav.shop"></a>
          </div>
          <div class="footer-col">
            <h4 data-i18n="footer.club"></h4>
            <a href="rejoindre.html" data-i18n="nav.join"></a>
            <a href="contact.html" data-i18n="nav.contact"></a>
            <a href="#" data-i18n="footer.statuts"></a>
            <a href="#" data-i18n="footer.privacy"></a>
            <a href="#" data-i18n="footer.mentions"></a>
          </div>
          <div class="footer-col">
            <h4 data-i18n="footer.stayClose"></h4>
            <p style="font-size:14px;opacity:0.85;line-height:1.6;margin:0 0 14px;" data-i18n="footer.newsletter"></p>
            <form class="newsletter-inline" id="footer-newsletter">
              <input type="email" required name="email" data-fr-placeholder="vous@exemple.ch" data-de-placeholder="sie@beispiel.ch" placeholder="vous@exemple.ch" />
              <button type="submit">→</button>
            </form>
            <div class="form-status" id="footer-newsletter-status"></div>
            <div style="margin-top:18px;display:flex;gap:18px;font-size:13px;opacity:0.85;">
              <a href="#">Instagram</a><a href="#">Strava</a><a href="#">Spotify</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Jokari Club Zürich · Verein nach Art. 60 ZGB</span>
          <span>contact@jokari.ch · jokari.ch</span>
        </div>
      </div>
    </footer>`;
  document.body.insertAdjacentHTML("beforeend", footerHTML);

  // Footer newsletter
  const form = document.getElementById("footer-newsletter");
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const status = document.getElementById("footer-newsletter-status");
      const email = form.email.value;
      status.className = "form-status";
      status.textContent = t("form.sending");
      status.style.display = "block";
      try {
        await window.JokariAPI.subscribeNewsletter({ email });
        status.className = "form-status success";
        status.textContent = t("form.success.newsletter");
        form.reset();
      } catch (err) {
        status.className = "form-status error";
        status.textContent = t("form.error");
      }
    });
  }
}

// -------- Placeholder helper (creates striped placeholder div) --------
function ph({ variant, code, label, sun }) {
  return `<div class="ph ${variant ? "ph--" + variant : ""}" style="width:100%;height:100%;">
    ${sun ? '<div class="ph-sun"></div>' : ""}
    ${code ? `<span class="ph-corner">${code}</span>` : ""}
    ${label ? `<div class="ph-label"><span>${label}</span><span>JKR · ZRH</span></div>` : ""}
  </div>`;
}
window.ph = ph;

// -------- Form submit helper --------
async function submitForm(formEl, statusEl, sendFn, successKey) {
  statusEl.className = "form-status";
  statusEl.textContent = t("form.sending");
  statusEl.style.display = "block";
  try {
    const fd = new FormData(formEl);
    const data = Object.fromEntries(fd.entries());
    // Convert checkbox-row checkboxes (true/false)
    formEl.querySelectorAll("input[type=checkbox]").forEach(cb => {
      data[cb.name] = cb.checked;
    });
    await sendFn(data);
    statusEl.className = "form-status success";
    statusEl.textContent = t(successKey);
    formEl.reset();
    // Reset radio cards visual state
    formEl.querySelectorAll(".radio-card.selected").forEach(c => c.classList.remove("selected"));
    return true;
  } catch (err) {
    console.error(err);
    statusEl.className = "form-status error";
    statusEl.textContent = t("form.error");
    return false;
  }
}
window.submitForm = submitForm;

// -------- Radio cards (visual selection) --------
function wireRadioCards() {
  document.querySelectorAll(".radio-card").forEach(card => {
    const input = card.querySelector("input[type=radio]");
    if (!input) return;
    if (input.checked) card.classList.add("selected");
    input.addEventListener("change", () => {
      const name = input.name;
      document.querySelectorAll(`.radio-card input[name="${name}"]`).forEach(other => {
        other.closest(".radio-card").classList.toggle("selected", other.checked);
      });
    });
  });
}
window.wireRadioCards = wireRadioCards;

// -------- Boot --------
document.addEventListener("DOMContentLoaded", () => {
  buildNav();
  buildFooter();
  setLang(getLang());
  refreshAuthState();
  wireRadioCards();
});
