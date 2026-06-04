# Jokari Club Zürich — CONTEXT.md

> **Dernière mise à jour** : 4 juin 2026
> **Statut global** : Phase B (authentification) terminée. Phase A (contenu/images) partiellement faite.
> **Site en production** : https://jokari.ch

---

## 📋 Vue d'ensemble du projet

**Le Jokari Club Zürich** est une association sportive suisse (basée à Horgen, ZH) qui promeut le Jokari (jeu de raquette basque). Le projet a deux dimensions :

1. **Légal/Administratif** : Association constituée le 29 avril 2026, statuts bilingues FR/DE conformes au droit suisse (art. 60 ss CC).
2. **Digital** : Site web https://jokari.ch hébergé sur Google Cloud Platform, avec authentification, espace membre/bureau, gestion d'événements, etc.

**Acteurs** :
- **Grégoire Mouly-Aigrot** : Président. Email : `gmoulyaigrot@gmail.com`. Rôle Firestore : `accesslevel: admin`, `role: président`.
- **Christine Mouly-Aigrot** : Vice-présidente, Trésorière. Email : `christine.hue@gmail.com`. Rôle Firestore : `accesslevel: admin`, `role: vice-présidente`.

---

## 🏗️ Architecture technique

### Stack
- **Backend** : Node.js + Express, déployé sur **Google Cloud Run** (`europe-west6`, service `jokari-website`)
- **DB** : **Google Firestore** (mode native, `europe-west1`)
- **Storage** : Google Cloud Storage (`gs://jokari-media`)
- **CI/CD** : GitHub Actions → Artifact Registry → Cloud Run
- **Domain** : `jokari.ch` (GoDaddy), SSL actif sur `jokari.ch` ET `www.jokari.ch`
- **Email** : SendGrid (domain authentication verified, Single Sender `contact@jokari.ch`)
- **Forwarding mail** : ImprovMX (4 alias → Gmail)

### GCP
- Project ID : `jokari` (number `446977560181`)
- Account : `gmoulyaigrot@gmail.com`
- Cloud Run : `jokari-website` (region `europe-west6`)
- Static IP du Load Balancer : `34.110.211.61`
- Artifact Registry : `jokari-repo`

### GitHub
- Repo : `Tigergreg/Jokari`
- Branche : `main`
- CI/CD : `.github/workflows/deploy.yml`
- 8 secrets configurés : `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_SA_KEY`, `SENDGRID_API_KEY`, `JOKARI_FROM_EMAIL`, `JOKARI_FROM_NAME`, `JOKARI_ADMIN_EMAILS`, `JWT_SECRET`

### Environment variables (Cloud Run)
Injectées via `env-vars.yaml` au déploiement (méthode robuste pour caractères spéciaux) :
- `GCP_PROJECT_ID=jokari`
- `NODE_ENV=production`
- `SENDGRID_API_KEY` (à régénérer — exposée temporairement)
- `JOKARI_FROM_EMAIL=contact@jokari.ch`
- `JOKARI_FROM_NAME=Jokari Club Zurich`
- `JOKARI_ADMIN_EMAILS=gmoulyaigrot@gmail.com;christine.hue@gmail.com` (séparateur `;` car `,` réservé par Cloud Run)
- `JOKARI_PUBLIC_URL=https://jokari.ch`
- `JWT_SECRET` (clé hex 64 octets, stockée dans GitHub Secrets)

---

## 🗂️ Structure du repo

```
jokari-site/
├── api/                                # Backend Express
│   ├── server.js                       # Routes + middlewares
│   ├── auth.js                         # JWT magic links + cookies httpOnly
│   ├── firestore.js                    # Client Firestore + normalisation
│   ├── mailer.js                       # SendGrid (7 templates)
│   ├── package.json
│   └── ...
├── src/                                # Frontend statique
│   ├── index.html                      # Accueil
│   ├── jokari.html                     # Page "Le Jokari"
│   ├── evenements.html                 # Calendrier + formulaire inscription
│   ├── evenement.html                  # Détail d'un événement
│   ├── actualites.html, actualite.html # Liste + détail news
│   ├── lifestyle.html, article.html    # Magazine + détail article
│   ├── boutique.html                   # T-shirt + tote bag
│   ├── rejoindre.html                  # Formulaire d'adhésion
│   ├── contact.html                    # Formulaire contact + adresse
│   ├── connexion.html                  # Magic link login + état "déjà connecté"
│   ├── espace-membre.html              # Espace membre privé
│   ├── espace-bureau.html              # Dashboard admin (bureau only)
│   ├── 404.html
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js                      # Module JokariAPI (24+ endpoints)
│   │   └── main.js                     # Nav, footer, i18n, helpers (ph, img)
│   └── images/
│       ├── hero/                       # Jokari Zurich.png, Captureeiffel.PNG
│       ├── jokari/                     # 7 photos (histoire, plage, etc.)
│       ├── boutique/                   # Jokari.PNG
│       ├── members/                    # christine.PNG
│       ├── events/                     # (vide — à compléter)
│       ├── articles/                   # (vide)
│       └── news/                       # (vide)
├── .github/workflows/deploy.yml        # CI/CD
├── Dockerfile
└── CONTEXT.md                          # Ce fichier
```

---

## 🔐 Phase B — Authentification (COMPLÈTEMENT TERMINÉE ✅)

### Système d'auth par magic link

**Flow** :
1. User saisit son email sur `/connexion.html`
2. Backend (`POST /api/auth/request`) cherche dans Firestore `members` par email
3. Si `status: actif` → magic link JWT (15 min) envoyé par SendGrid (avec `disableTracking: true` pour pointer direct sur `jokari.ch`, pas `url7025.jokari.ch`)
4. User clique le bouton dans l'email → `https://jokari.ch/connexion.html?token=...`
5. Frontend détecte le `?token=` → appelle `GET /api/auth/verify?token=...`
6. Backend valide le JWT → crée **cookie httpOnly secure SameSite=lax** de 7 jours
7. Frontend redirige vers `/espace-membre.html` (ou `/espace-bureau.html` si admin)

**Réponse identique** que l'email soit dans la base ou non (anti-énumération).

### Mapping de rôles

| Firestore | Frontend (JWT/session) |
|---|---|
| `accesslevel: admin` | `role: bureau` |
| `accesslevel: member` ou absent | `role: member` |
| `role: président` ou `vice-présidente` (Firestore) | `jobTitle: ...` (info métier, séparée de l'accès) |

### Endpoints d'auth (tous live)

- `POST /api/auth/request` — Demande un magic link
- `GET /api/auth/verify?token=xxx` — Vérifie le token et crée la session
- `GET /api/auth/me` — Retourne `{ ok, member: ... | null }`
- `POST /api/auth/logout` — Efface le cookie

### Middlewares

- `auth.requireAuth` — Route protégée, doit être connecté
- `auth.requireBureau` — Route admin only

### Endpoints membres/admin

- `GET /api/my-registrations` — Mes inscriptions (enrichies avec infos event)
- `GET /api/my-articles` — Mes articles (placeholder, collection à créer)
- `GET /api/admin/members` — Tous les membres (bureau only, normalisé pour FR/EN schémas)
- `GET /api/admin/registrations` — Toutes les inscriptions (bureau only, jointes avec events)
- `GET /api/admin/pending` — Articles en attente (placeholder)
- `GET /api/admin/articles` — Tous les articles (placeholder)

### Bug de timing résolu

**Problème initial** : Les pages `connexion.html`, `espace-membre.html`, `espace-bureau.html` appelaient `JokariAPI.getSession()` au parsing du script, mais `/auth/me` n'avait pas encore répondu → `null` → redirection vers `/connexion.html` même si l'utilisateur était connecté.

**Solution** : `api.js` expose `JokariAPI.sessionReady` (promesse du chargement initial). Toutes les pages d'auth font `await sessionReady` dans `DOMContentLoaded` avant de prendre une décision d'affichage.

---

## 📨 Phase 0bis — SendGrid email (TERMINÉ ✅)

### Configuration
- Domain Authentication : ✅ Verified (`em8175`, `url7025`, User ID `107218164`)
- Single Sender `contact@jokari.ch` : ✅ Verified
- SPF combiné dans TXT @ : `v=spf1 include:spf.improvmx.com include:sendgrid.net ~all`
- DKIM : ✅ aligné
- DMARC : `v=DMARC1; p=none;`
- Score mail-tester : 8/10 (perte uniquement à cause de l'IP partagée trial SendGrid)

### Mailer (7 templates)

Tous dans `api/mailer.js`, tous bilingues FR :

1. `sendMagicLink(email, link, firstName)` — **AVEC `disableTracking: true`** pour bypass le Link Branding
2. `sendMemberConfirmation(member)` — Adhésion confirmée
3. `sendMemberAdminNotification(member)` — Notif bureau d'une nouvelle adhésion
4. `sendRegistrationConfirmation(reg, eventTitle)` — Inscription tournoi confirmée
5. `sendRegistrationAdminNotification(reg, eventTitle)` — Notif bureau d'une inscription
6. `sendNewsletterConfirmation(email)` — Bienvenue newsletter
7. `sendContactAcknowledgement(msg)` + `sendContactAdminNotification(msg)` — Formulaire contact

### ImprovMX forwarding

4 alias actifs (tous → `gmoulyaigrot@gmail.com`) :
- `gregoire@jokari.ch`
- `christine@jokari.ch`
- `admin@jokari.ch`
- `contact@jokari.ch`

MX records GoDaddy : `mx1.improvmx.com` (10), `mx2.improvmx.com` (20).

---

## 🗄️ Firestore — État actuel

### Collection `members/` (2 docs)

**Schéma actuel mixte** (ancien FR + nouveau EN) :
- Grégoire : `prenom`, `nom`, `email`, `telephone`, `adresse`, `npa`, `ville`, `date_de_naissance`, `date_adhesion`, `type_membre: honoraire`, `statut: actif`, `role: président`, `accesslevel: admin`, `cotisation_payee: true`
- Christine : pareil avec `role: vice-présidente`

**Le backend `normalizeMember()` gère les 2 schémas** (`prenom`/`firstName`, etc.).

### Collection `events/` (3 docs)

**Schéma FR actuel** (titres en français) :
- "Essai - Open-Jura" → "Essai - Open de Chapois" (date `2026-06-06`)
- "Essai - Open-ZH" → "Essai - Open de La Baule" (date `2026-08-01`)
- "A venir - Open Zurich" (date `"A determiner"` — non parseable)

**Champs Firestore** : `titre`, `titreDe`, `date`, `dateFr`, `dateDe`, `heure`, `prix`, `lieu`, `placestotal`, `placesrestantes`, `statut`, `descFr`, `descDe`, `image`, `type`.

**Le backend `normalizeEventOutput()` mappe FR→EN automatiquement** vers : `title`, `titleDe`, `price`, `time`, `location`, `spotsTotal`, `spotsLeft`, `status`, etc.

### Collection `registrations/`

Créée automatiquement par les tests. Schéma stocké depuis la dernière mise à jour de `server.js` :
- `memberName`, `memberEmail`, `phone`
- `eventId`, `eventTitle`, `eventDate`
- `participants`, `amount`, `status`
- `friendName`, `friendEmail` (optionnel)
- `createdAt`

**Endpoint admin** enrichit les anciennes inscriptions via jointure avec `events`.

### Collections à créer

- `articles/` (lifestyle — livres, films, musique, voyages, cuisine, forum)
- `news/` (actualités du club)
- `newsletter/` (créée auto par tests)
- `contact_messages/` (créée auto par tests)

---

## 🎨 Phase A — Contenu et images (PARTIELLEMENT FAITE)

### ✅ Fait dans cette session

**Modifications textuelles** :
- `index.html` : manifeste "trois balles" → "1 balle" (FR+DE)
- `index.html` : paragraphe Horgen → "(ou pas) sur les pelouses de Horgen ou la plage de la Baule, ... rigoureusement physique"
- `jokari.html` : sous-titre "1 balle, 1 élastique, un socle, 2 joueurs élégants et soixante-quinze ans d'histoire"
- `contact.html` : adresse postale sans "Seestrasse 142"
- `main.js` : footer adresse sans "Seestrasse"

**Système d'images** :
- Helper `window.img({src, alt, fallback})` ajouté dans `main.js` — affiche image OU fallback automatique sur `ph()` rayé si 404
- `index.html` : hero + 3 about utilisent vraies images de `images/hero/` et `images/jokari/`
- `jokari.html` : hero archive + 6/8 cases de galerie utilisent vraies images
- `boutique.html` : t-shirt utilise `images/boutique/Jokari.PNG`
- `evenements.html` + `index.html` : events utilisent `ev.image` si présent dans Firestore (fallback sinon)

### Inventaire des images disponibles

```
src/images/hero/        Jokari Zurich.png, Captureeiffel.PNG
src/images/jokari/      Jokari History.PNG, Jokari.PNG, Captureaaaa.PNG, Captureffff.PNG,
                        e783d11e810aecb89f140ce5270236b3.jpg,
                        int-hulot-plage-ok-.jpg,
                        man-taking-basque-paddle-ball-game-jokari-21372762.jpg.webp
src/images/boutique/    Jokari.PNG
src/images/members/     christine.PNG (pas encore utilisée)
src/images/events/      VIDE
src/images/articles/    VIDE
src/images/news/        VIDE
```

**Convention recommandée** : noms lowercase, sans espace (sensitive à la casse sur Linux/Cloud Run).

### Comment ajouter/modifier une image

**Page statique (accueil, jokari, boutique)** :
1. Dépose l'image dans le bon sous-dossier de `src/images/`
2. Ouvre le HTML correspondant, trouve la ligne avec `img({src: "..."})` et modifie le chemin
3. Push

**Image d'événement** :
1. Dépose dans `src/images/events/`
2. Va dans [Firestore Console](https://console.cloud.google.com/firestore?project=jokari) → `events` → doc → ajoute/modifie champ `image: "images/events/mon-image.jpg"`
3. Recharger la page

**Le fallback `ph()` rayé apparaît automatiquement** si l'image n'existe pas.

---

## 📦 Action items prioritaires (TODO)

### Sécurité 🔴 URGENT
- [ ] **Régénérer la clé SendGrid** qui a été visible dans une capture PowerShell. Procédure :
  1. SendGrid → Settings → API Keys → Create `jokari-cloudrun-v2`
  2. GitHub → Settings → Secrets → mettre à jour `SENDGRID_API_KEY`
  3. Push n'importe quoi sur main pour déclencher un redéploiement

### Espace bureau (admin)
- [ ] Bouton "Valider l'adhésion" dans `espace-bureau.html` pour faire passer un membre `pending` → `actif` en 1 clic (avec endpoint backend `POST /api/admin/members/:id/activate`)
- [ ] Pouvoir éditer un événement depuis l'admin (titre, date, prix, places, image)
- [ ] Pouvoir créer un nouvel événement

### Contenu
- [ ] Ajouter de vraies images d'événements dans `src/images/events/` + mettre à jour le champ `image` dans Firestore
- [ ] Créer les collections Firestore vides : `articles/`, `news/`
- [ ] Petite incohérence : `connexion.html` dit "valide trente minutes" mais `MAGIC_TTL = "15m"` dans `auth.js`. Aligner (soit passer à 30m, soit corriger le texte).
- [ ] Image du tote bag (`prod-tote` dans boutique.html)
- [ ] Compléter la galerie du jokari (cases 7 et 8 sont des placeholders)

### Améliorations possibles
- [ ] SendGrid Pro ($90/mois) pour IP dédiée et meilleur score mail-tester
- [ ] Renommer les images en kebab-case lowercase (`jokari-zurich.png`)
- [ ] Phase C : éditeur d'articles côté membre

---

## 🐛 Connaissances acquises (pièges à éviter)

### PowerShell sur Windows
- `PSSecurityException` sur `gcloud`/`npm`/`curl` → utiliser `gcloud.cmd`, `npm.cmd`, `curl.exe`
- OU : `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` en admin

### Cloud Run
- `--set-env-vars` **REMPLACE toute la liste** d'env vars (piège). Utiliser `--env-vars-file` + YAML (méthode actuelle dans `deploy.yml`).
- `min-instances=0` → cold start de 5-10s sur première requête après période d'inactivité (502 Bad Gateway temporaire, normal).
- Variables avec virgules : utiliser séparateur `;` (réservé Cloud Run).

### SendGrid
- **Click tracking** ajoute par défaut une redirection via `url7025.jokari.ch` (Link Branding) qui n'a pas de cert SSL → erreur "Connexion non privée" sur Chrome.
- Solution : `disableTracking: true` dans `trackingSettings` pour les emails type magic links où il faut un lien direct.

### Cookies HttpOnly secure
- Frontend : `credentials: "include"` dans tous les `fetch()`
- Backend CORS : `credentials: true` + `origin` whitelist (pas wildcard `*`)
- SameSite : `lax` pour permettre les redirections cross-tab depuis Gmail

### Sensitivité à la casse
- Windows : `Jokari Zurich.png` = `jokari zurich.png`
- Linux/Cloud Run : `Jokari Zurich.png` ≠ `jokari zurich.png`
- → Toujours respecter la casse exacte dans le code

### Frontend timing
- `JokariAPI.getSession()` est **synchrone** (cache mémoire) → peut retourner `null` si appelé trop tôt
- Pour les pages dépendant de la session : **toujours** `await window.JokariAPI.sessionReady` avant de décider

---

## 🚀 Comment reprendre une session

Lorsque tu (ou une nouvelle session Claude) reprend le projet :

1. **Lire ce `CONTEXT.md`** intégralement
2. **Cloner le repo** : `git clone https://github.com/Tigergreg/Jokari.git`
3. **Vérifier l'état** :
   ```powershell
   curl.exe https://jokari.ch/api/health
   ```
   → Attendu : `{"ok":true,...,"mailer":true,"auth":true}`
4. **Vérifier qu'on peut se connecter** :
   - `https://jokari.ch/connexion.html`
   - Magic link à `gmoulyaigrot@gmail.com`
   - Atterrir sur `/espace-membre.html` puis cliquer "Espace bureau"
5. **Continuer depuis les Action Items** ci-dessus

### Commandes utiles

```powershell
# Logs Cloud Run récents
gcloud.cmd run services logs read jokari-website --region=europe-west6 --project=jokari --limit=30

# Vérifier déploiement après push
curl.exe https://jokari.ch/api/health

# Voir les events servis par l'API
curl.exe -s https://jokari.ch/api/events | ConvertFrom-Json | ConvertTo-Json -Depth 5

# Lister les images locales
Get-ChildItem -Recurse C:\Users\gmoul\jokari-site\src\images | Select-Object FullName, Length

# Force un redéploiement (commit vide)
git commit --allow-empty -m "redeploy" ; git push origin main
```

---

## 📅 Historique des sessions

### Session 1 (avril/mai 2026)
- Statuts bilingues FR/DE, procès-verbal de constitution
- Setup GCP, Firestore, Cloud Run, GitHub
- Premier déploiement Cloud Run
- Configuration domaine GoDaddy + SSL

### Session 2 (4 juin 2026 — celle-ci)
- SendGrid Domain Authentication (refait depuis zéro)
- ImprovMX forwarding (4 alias)
- SSL `www.jokari.ch` résolu
- Phase 0ter : mailer code + 7 templates
- **Phase B complète** : magic link auth + cookies httpOnly + endpoints + middlewares
- Adaptation au frontend existant (avancé : 24 endpoints, 4 pages auth)
- Fix bug de timing (`sessionReady` promise)
- Normalisation members (ancien FR + nouveau EN)
- Normalisation events (FR→EN + dates auto)
- Enrichissement registrations (jointure events)
- Phase A partielle : contenu textuel + système d'images avec `img()`

---

## 🔗 Liens utiles

- **Site** : https://jokari.ch
- **Espace bureau** : https://jokari.ch/espace-bureau.html
- **Repo GitHub** : https://github.com/Tigergreg/Jokari
- **CI/CD Actions** : https://github.com/Tigergreg/Jokari/actions
- **Firestore Console** : https://console.cloud.google.com/firestore?project=jokari
- **Cloud Run** : https://console.cloud.google.com/run/detail/europe-west6/jokari-website?project=jokari
- **SendGrid** : https://app.sendgrid.com
- **ImprovMX** : https://improvmx.com
- **GoDaddy DNS** : https://dcc.godaddy.com/manage/jokari.ch/dns

---

*Document maintenu manuellement à chaque fin de session importante. Si tu modifies l'archi ou résous un bug important, mets à jour ce fichier avant de pousser.*
