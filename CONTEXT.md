# 🎾 JOKARI CLUB ZÜRICH — Fichier de contexte projet

> Collez ce fichier en début de nouvelle conversation avec Claude pour reprendre exactement où on en était.

---

## 👥 Membres fondateurs

| Nom | Rôle | Email |
|---|---|---|
| Grégoire Mouly-Aigrot | Président | gmoulyaigrot@gmail.com |
| Christine Mouly-Aigrot | Vice-Présidente & Trésorière | contact@jokari.ch |

---

## 🌐 Domaine & Hébergement

| Élément | Valeur |
|---|---|
| Domaine | `jokari.ch` |
| Registrar | GoDaddy |
| Hébergement | Google Cloud Platform |
| URL temporaire | `https://jokari-website-edt44ot4za-oa.a.run.app` |
| IP statique | `34.110.211.61` |
| URL finale | `https://jokari.ch` (SSL en cours) |

---

## ☁️ Google Cloud Platform (GCP)

| Élément | Valeur |
|---|---|
| Project Name | `Jokari` |
| Project ID | `jokari` |
| Project Number | `446977560181` |
| Compte | `gmoulyaigrot@gmail.com` |
| Région | `europe-west6` (Zurich) |

### Services activés
- ✅ Cloud Run (`jokari-website`)
- ✅ Artifact Registry (`jokari-repo`, `europe-west6`)
- ✅ Firestore (`europe-west1`, mode natif)
- ✅ Cloud Storage (`gs://jokari-media`)
- ✅ Cloud Build
- ✅ Compute Engine

### Load Balancer
- ✅ IP statique : `jokari-ip` → `34.110.211.61`
- ✅ NEG : `jokari-neg`
- ✅ Backend : `jokari-backend`
- ✅ URL Map : `jokari-urlmap`
- ✅ HTTP Proxy : `jokari-http-proxy`
- ✅ HTTPS Proxy : `jokari-https-proxy`
- ✅ HTTP Rule : `jokari-http-rule` (port 80)
- ✅ HTTPS Rule : `jokari-https-rule` (port 443)
- ⏳ Certificat SSL : `jokari-ssl` — `jokari.ch=ACTIVE`, `www.jokari.ch=FAILED_NOT_VISIBLE`

### Service Account
- Nom : `github-deployer@jokari.iam.gserviceaccount.com`
- Clé JSON : `C:\Users\gmoul\jokari-gcp-key.json` ⚠️ NE PAS COMMITTER
- Rôles : `run.admin`, `artifactregistry.admin`, `iam.serviceAccountUser`, `datastore.user`, `storage.admin`

---

## 🐙 GitHub

| Élément | Valeur |
|---|---|
| Username | `Tigergreg` |
| Repository | `https://github.com/Tigergreg/Jokari` |
| Branche principale | `main` |
| Dossier local | `C:\Users\gmoul\jokari-site` |

### Secrets GitHub (4)
- ✅ `GCP_PROJECT_ID` = `jokari`
- ✅ `GCP_REGION` = `europe-west6`
- ✅ `GCP_SA_KEY` = contenu du fichier `jokari-gcp-key.json`
- ✅ `SENDGRID_API_KEY` = `SG.xxxxxxxxx`

### Pipeline CI/CD
- Trigger : push sur `main`
- Build Docker → push Artifact Registry → deploy Cloud Run
- Durée : ~2-3 minutes
- Status : ✅ fonctionnel

---

## 📧 SendGrid

| Élément | Valeur |
|---|---|
| Compte | `gmoulyaigrot@gmail.com` |
| Domaine | `jokari.ch` |
| Sender | `Jokari Club Zürich <contact@jokari.ch>` |
| Status domaine | ⏳ Non vérifié (DNS pas encore propagé) |

### Enregistrements DNS SendGrid (à garder dans GoDaddy)
| Type | Nom | Valeur |
|---|---|---|
| CNAME | `url8383` | `sendgrid.net` |
| CNAME | `107218164` | `sendgrid.net` |
| CNAME | `em7300` | `u107218164.wl165.sendgrid.net` |
| CNAME | `s1._domainkey` | `s1.domainkey.u107218164.wl165.sendgrid.net` |
| CNAME | `s2._domainkey` | `s2.domainkey.u107218164.wl165.sendgrid.net` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

---

## 🗄️ Firestore

### Collections créées

**`members/`**
- Grégoire Mouly-Aigrot (président, honoraire, actif)
- Christine Mouly-Aigrot (vice-présidente, honoraire, actif)

**`events/`**
- `open-zh` — Open de Zürich (06 juin 2026, 45 CHF, 32 places)
- `biarritz-cup` — Coupe Biarritz (12 juillet 2026, 60 CHF, 48 places)
- `lac-classique` — Lac Classique (19 sept. 2026, 35 CHF, 24 places)

### Collections à créer
- `registrations/` — inscriptions aux événements
- `newsletter/` — abonnés newsletter
- `articles/` — articles Lifestyle + Actualités (Phase B)

### Schéma members
```
prenom, nom, email, telephone, adresse, npa, ville,
date_naissance, type_membre, role, cotisation_payee,
statut, date_adhesion, magic_link_token, magic_link_expiry
```

### Schéma events
```
id, titre, titreDe, date, dateFr, dateDe, heure,
lieu, prix (int64), placesTotal (int64), placesRestantes (int64),
type, statut, descFr, descDe, image
```

---

## 📁 Structure du projet

```
C:\Users\gmoul\jokari-site\
├── .github/workflows/deploy.yml    ← Pipeline CI/CD
├── api/
│   ├── server.js                   ← API Node.js Express
│   ├── firestore.js                ← Connexion Firestore
│   └── package.json
├── src/
│   ├── index.html                  ← Accueil
│   ├── jokari.html                 ← Le Jokari
│   ├── evenements.html             ← Événements
│   ├── lifestyle.html              ← Lifestyle
│   ├── boutique.html               ← Boutique
│   ├── rejoindre.html              ← Adhésion
│   ├── contact.html                ← Contact
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js                  ← USE_MOCK = false (modifié)
│   │   └── main.js
│   └── images/
│       ├── hero/                   ← Captureeiffel.PNG, Jokari Zurich.png
│       ├── events/                 ← À compléter
│       ├── jokari/                 ← Photos historiques
│       ├── boutique/               ← Produits
│       ├── members/                ← christine.PNG
│       ├── articles/
│       └── news/
├── Dockerfile
├── nginx.conf
└── .gitignore
```

---

## 🌐 DNS GoDaddy (état actuel)

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| A | `@` | `34.110.211.61` | 600s |
| A | `www` | `34.110.211.61` | 1h |
| CNAME | `107218164` | `sendgrid.net` | 1h |
| CNAME | `em7300` | `u107218164.wl165.sendgrid.net` | 1h |
| CNAME | `s1._domainkey` | `s1.domainkey.u107218164.wl165.sendgrid.net` | 1h |
| CNAME | `s2._domainkey` | `s2.domainkey.u107218164.wl165.sendgrid.net` | 1h |
| CNAME | `url8383` | `sendgrid.net` | 1h |
| TXT | `@` | `google-site-verification=jScrZBUNeNDG8reFGupuoQ8hxyLdNAhhLz3NcBkFNVM` | 1h |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | 1h |

---

## 🚀 Roadmap

### ✅ Phase 0 — Infrastructure (FAIT)
- GCP configuré, APIs activées
- GitHub repo + CI/CD pipeline
- Firestore + Cloud Storage
- SendGrid configuré
- DNS GoDaddy configuré
- Site déployé sur Cloud Run
- Load Balancer + IP statique
- Mode MOCK désactivé (`USE_MOCK = false`)

### ⏳ En cours
- Certificat SSL (`www.jokari.ch` en FAILED_NOT_VISIBLE)
- Vérification SendGrid domaine

### 🔜 Phase A — Contenu (prochaine session)
- Ajouter images réelles dans `src/images/events/`
- Mettre à jour `api.js` MOCK_EVENTS avec champ `image`
- Vérifier que les événements Firestore s'affichent correctement
- Tester formulaire d'adhésion → Firestore

### 🔜 Phase B — Comptes membres
- Magic link par email (SendGrid)
- Espace membre (`/espace-membre.html`)
- Articles Lifestyle dans Firestore
- Upload photos (Cloud Storage)

### 🔜 Phase C — Admin bureau
- Dashboard admin (`/admin.html`)
- Modération articles
- Gestion événements
- Stats membres

---

## 💰 Coûts estimés

| Service | Coût/mois |
|---|---|
| Cloud Run | ~0 CHF (free tier) |
| Firestore | ~0 CHF (free tier) |
| Cloud Storage | ~0.02 CHF |
| Load Balancer | ~18 CHF ⚠️ |
| Artifact Registry | ~0.10 CHF |
| **TOTAL** | **~18 CHF/mois** |

---

## 🔧 Commandes utiles

```bash
# Vérifier le SSL
gcloud compute ssl-certificates describe jokari-ssl --global --project=jokari --format="value(managed.status,managed.domainStatus)"

# Voir les logs Cloud Run
gcloud run services logs read jokari-website --region=europe-west6 --project=jokari

# Deployer manuellement
cd C:\Users\gmoul\jokari-site
git add .
git commit -m "votre message"
git push origin main

# URL du service Cloud Run
gcloud run services describe jokari-website --region=europe-west6 --project=jokari --format="value(status.url)"
```

---

## 📝 Notes importantes

- ⚠️ Ne jamais committer `jokari-gcp-key.json` sur GitHub
- ⚠️ Le Load Balancer coûte ~18 CHF/mois — à surveiller
- ℹ️ `USE_MOCK = false` → le site utilise maintenant Firestore et l'API réelle
- ℹ️ Magic link email ne fonctionnera qu'après vérification SendGrid
- ℹ️ Google Search Console vérifié pour `jokari.ch`

---

*Dernière mise à jour : 12 mai 2026*
*Session de travail : ~3h — infrastructure complète mise en place*
