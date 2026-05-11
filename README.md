# Jokari Club Zürich — jokari.ch

Site web complet et production-ready de l'association **Jokari Club Zürich** (Horgen, ZH).
Stack : HTML/CSS/JS vanilla · Node.js Express · Firestore · Cloud Run · GitHub Actions.

## Structure

```
/
├── src/                    Frontend statique servi par nginx
│   ├── index.html          Accueil
│   ├── jokari.html         Histoire + règles + galerie
│   ├── evenements.html     Calendrier + inscription
│   ├── lifestyle.html      Magazine / forum
│   ├── boutique.html       Partenaire Jokari Originals
│   ├── rejoindre.html      Adhésion (actif / bienfaiteur / honoraire)
│   ├── contact.html        Formulaire de contact
│   ├── css/style.css       Tout le design
│   ├── js/main.js          Nav, i18n FR/DE, formulaires
│   ├── js/api.js           Client API (avec fallback mock)
│   └── images/             Photos (placeholders pour l'instant)
├── api/                    Backend Node Express
│   ├── server.js           Routes /api/*
│   ├── firestore.js        Client Firestore + données fallback
│   └── package.json
├── .github/workflows/
│   └── deploy.yml          CI/CD vers Cloud Run
├── Dockerfile              Multi-stage : nginx + node
├── nginx.conf              Reverse proxy + cache + gzip
└── .gitignore
```

## Développement local

### Frontend seul
Servir le dossier `src/` avec n'importe quel serveur statique :
```sh
cd src && python3 -m http.server 5173
# open http://localhost:5173
```
L'API tombera automatiquement en mode **mock** (voir `src/js/api.js`) : formulaires simulés, événements en dur.

### API seule
```sh
cd api && npm install && npm run dev
# écoute sur :3000
```
Sans credentials Firestore, les écritures échoueront ; les lectures (`/api/events`) renvoient les données *fallback* déclarées dans `firestore.js`.

### Stack complète via Docker
```sh
docker build -t jokari .
docker run -p 8080:8080 -e GCP_PROJECT_ID=jokari jokari
# open http://localhost:8080
```

## Déploiement

### Secrets GitHub à configurer
- `GCP_PROJECT_ID` = `jokari`
- `GCP_REGION` = `europe-west6`
- `GCP_SA_KEY` = JSON d'un Service Account avec rôles :
  - `roles/artifactregistry.writer`
  - `roles/run.admin`
  - `roles/iam.serviceAccountUser`
  - `roles/datastore.user` (pour Firestore)

### Setup une fois côté GCP
```sh
# Artifact Registry
gcloud artifacts repositories create jokari-repo \
  --repository-format=docker --location=europe-west6

# Firestore (mode Native)
gcloud firestore databases create --location=europe-west6
```

### Domaine jokari.ch
1. Cloud Run → onglet **Custom Domains** → mapper `jokari.ch` + `www.jokari.ch` sur `jokari-website`.
2. Sur GoDaddy : créer les enregistrements DNS fournis par GCP (CNAME / A / AAAA).
3. Le certificat SSL est provisionné automatiquement.

## Données Firestore

| Collection | Écrit par | Champs principaux |
|---|---|---|
| `members` | `POST /api/members` | firstName, lastName, email, phone, address, zip, city, birthDate, memberType, acceptStatuts, acceptNewsletter, createdAt |
| `registrations` | `POST /api/registrations` | fullName, email, phone, eventId, participants, createdAt |
| `newsletter` | `POST /api/newsletter` | email, source, createdAt |
| `contact_messages` | `POST /api/contact` | name, email, subject, message, createdAt |
| `events` | (saisi à la main) | title, titleDe, date, dateFr, dateDe, time, timeDe, location, price, spotsTotal, spotsLeft, descFr, descDe, type, typeDe |

## Contenu

- Président : **Grégoire Mouly-Aigrot**
- Email : **contact@jokari.ch**
- Adresse : Seestrasse 142, 8810 Horgen, ZH
- Toggle de langue **FR/DE** (préférence persistée dans `localStorage`)
- Photos à déposer dans `src/images/` — voir `src/images/README.md` pour les noms attendus.

## Tweaks de design

- Bleu marine `#1A3A5C`, blanc, sable `#F5F0E8`, rouge `#C0392B`
- Playfair Display (titres) + Lato (corps) + JetBrains Mono (eyebrows)
- Placeholders rayés style légende de magazine en attendant les vraies photos.
