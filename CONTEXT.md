# 🎾 JOKARI CLUB ZÜRICH — Fichier de contexte projet
> Collez ce fichier en début de nouvelle conversation avec Claude pour reprendre exactement où on en était.

---

## 👥 Membres fondateurs

| Nom | Rôle | Email |
|---|---|---|
| Grégoire Mouly-Aigrot | Président | gmoulyaigrot@gmail.com |
| Christine Mouly-Aigrot | Vice-Présidente & Trésorière | christine.hue@gmail.com |

---

## 🌐 Domaine & Hébergement

| Élément | Valeur |
|---|---|
| Domaine | `jokari.ch` |
| Registrar | GoDaddy |
| Hébergement | Google Cloud Platform |
| URL Cloud Run | `https://jokari-website-edt44ot4za-oa.a.run.app` |
| IP statique | `34.110.211.61` |
| URL finale | `https://jokari.ch` ✅ (SSL ACTIVE) |
| URL www | `https://www.jokari.ch` ⏳ (SSL FAILED_NOT_VISIBLE) |

---

## ☁️ Google Cloud Platform (GCP)

| Élément | Valeur |
|---|---|
| Project Name | `Jokari` |
| Project ID | `jokari` |
| Project Number | `446977560181` |
| Compte | `gmoulyaigrot@gmail.com` |
| Région principale | `europe-west6` (Zurich) |

### Services activés ✅
- Cloud Run → service `jokari-website`
- Artifact Registry → `jokari-repo` (europe-west6)
- Firestore → `(default)` (europe-west1, mode natif)
- Cloud Storage → `gs://jokari-media` (europe-west1)
- Cloud Build, Compute Engine, Storage

### Load Balancer (complet) ✅
| Composant | Nom |
|---|---|
| IP statique | `jokari-ip` → `34.110.211.61` |
| NEG | `jokari-neg` |
| Backend | `jokari-backend` |
| URL Map | `jokari-urlmap` |
| HTTP Proxy | `jokari-http-proxy` |
| HTTPS Proxy | `jokari-https-proxy` |
| HTTP Rule | `jokari-http-rule` (port 80) |
| HTTPS Rule | `jokari-https-rule` (port 443) |
| Certificat SSL | `jokari-ssl` |

### Statut certificat SSL
```
jokari.ch:     ACTIVE ✅
www.jokari.ch: FAILED_NOT_VISIBLE ⏳
```
→ DNS `www → 34.110.211.61` propagé mondialement
→ Option de débloquage : créer `jokari-ssl-v2` avec seulement `jokari.ch`

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
| Branche | `main` |
| Dossier local Windows | `C:\Users\gmoul\jokari-site` |

### Secrets GitHub (4) ✅
- `GCP_PROJECT_ID` = `jokari`
- `GCP_REGION` = `europe-west6`
- `GCP_SA_KEY` = contenu JSON clé service account
- `SENDGRID_API_KEY` = `SG.xxxxxxxxx`

### Pipeline CI/CD ✅
- Trigger : push sur `main`
- Build Docker → Artifact Registry → Cloud Run
- Durée : ~2min 33s

---

## 📧 SendGrid — Domain Authentication ✅ VERIFIED

| Élément | Valeur |
|---|---|
| Compte | `gmoulyaigrot@gmail.com` |
| Domaine | `jokari.ch` |
| Sender | `Jokari Club Zürich <contact@jokari.ch>` |
| Domain Authentication | ✅ **Verified** (3 juin 2026) |
| Link Branding | ✅ Actif (`url7025.jokari.ch`) |
| Test mail-tester | **8/10** (-1 IP partagée SpamCop, -1 SpamAssassin lié) |
| DKIM | ✅ Aligned & Valid |
| SPF | ✅ Pass |
| DMARC | ✅ Pass |

### Configuration SendGrid actuelle (User ID `107218164`)
| Type | Host | Value |
|---|---|---|
| CNAME | `url7025` | `sendgrid.net` |
| CNAME | `107218164` | `sendgrid.net` |
| CNAME | `em8175` | `u107218164.wl165.sendgrid.net` |
| CNAME | `s1._domainkey` | `s1.domainkey.u107218164.wl165.sendgrid.net` |
| CNAME | `s2._domainkey` | `s2.domainkey.u107218164.wl165.sendgrid.net` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

⚠️ Ancienne config supprimée le 3 juin 2026 (`em7300`, `url8383`) — User ID identique mais sélecteurs `em`/`url` régénérés. Plus de cache négatif côté SendGrid.

### Clés API SendGrid
- `SENDGRID_API_KEY` (GitHub secret) — utilisée par CI/CD
- `Magic Link` — usage prévu pour authentification site
- `jokari-mailtest` — créée pour tests (Full Access)

---

## 📨 ImprovMX — Email Forwarding ✅ ACTIF

| Élément | Valeur |
|---|---|
| Compte | `gmoulyaigrot@gmail.com` |
| Domaine | `jokari.ch` |
| Plan | Free |
| Statut DNS | ✅ Tous verts |

### Aliases configurés
| Alias | Redirige vers |
|---|---|
| `gregoire@jokari.ch` | `gmoulyaigrot@gmail.com` |
| `christine@jokari.ch` | `christine.hue@gmail.com` |
| `admin@jokari.ch` | `gmoulyaigrot@gmail.com` + `christine.hue@gmail.com` |
| `contact@jokari.ch` | `gmoulyaigrot@gmail.com` + `christine.hue@gmail.com` |

### Single Sender Verification
| Élément | Statut |
|---|---|
| `contact@jokari.ch` | ❌ Failed (à refaire — maintenant possible grâce à ImprovMX) |

---

## 🌐 DNS GoDaddy (état complet) ✅

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| A | `@` | `34.110.211.61` | 600s |
| A | `www` | `34.110.211.61` | 1h |
| NS | `@` | `ns59.domaincontrol.com` | 1h |
| NS | `@` | `ns60.domaincontrol.com` | 1h |
| **MX** | `@` | `mx1.improvmx.com` (priorité 10) | 1h |
| **MX** | `@` | `mx2.improvmx.com` (priorité 20) | 1h |
| CNAME | `107218164` | `sendgrid.net` | 1h |
| CNAME | `em8175` | `u107218164.wl165.sendgrid.net` | 600s |
| CNAME | `s1._domainkey` | `s1.domainkey.u107218164.wl165.sendgrid.net` | 1h |
| CNAME | `s2._domainkey` | `s2.domainkey.u107218164.wl165.sendgrid.net` | 1h |
| CNAME | `url7025` | `sendgrid.net` | 600s |
| TXT | `@` | `google-site-verification=jScrZBUNeNDG8reFGupuoQ8hxyLdNAhhLz3NcBkFNVM` | 1h |
| **TXT** | `@` | `v=spf1 include:spf.improvmx.com include:sendgrid.net ~all` | 1h |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | 1h |

**En gras** : ajouts/modifications du 3 juin 2026.

---

## 🗄️ Firestore

### `members/` ✅
- Grégoire Mouly-Aigrot (président, honoraire, actif, gmoulyaigrot@gmail.com)
- Christine Mouly-Aigrot (vice-présidente, honoraire, actif, christine.hue@gmail.com)

### `events/` ✅
| ID | Titre | Date | Prix |
|---|---|---|---|
| `open-zh` | Open de Zürich | 06 juin 2026 | 45 CHF |
| `biarritz-cup` | Coupe Biarritz | 12 juillet 2026 | 60 CHF |
| `lac-classique` | Lac Classique | 19 sept. 2026 | 35 CHF |

### À créer
- `registrations/`, `newsletter/`, `articles/`, `news/`

---

## 📁 Structure projet

```
C:\Users\gmoul\jokari-site\
├── .github/workflows/deploy.yml
├── api/
│   ├── server.js
│   ├── firestore.js
│   ├── package.json
│   └── package-lock.json
├── src/
│   ├── index.html, jokari.html, evenements.html
│   ├── lifestyle.html, boutique.html, rejoindre.html
│   ├── contact.html
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js        ← USE_MOCK = false ✅
│   │   └── main.js
│   └── images/
│       ├── hero/         ← Captureeiffel.PNG, Jokari Zurich.png ✅
│       ├── events/       ← ⚠️ VIDE - à ajouter
│       ├── jokari/       ✅
│       ├── boutique/     ✅
│       ├── members/      ← christine.PNG ✅
│       ├── articles/     ← ⚠️ VIDE
│       └── news/         ← ⚠️ VIDE
├── Dockerfile
├── nginx.conf
└── .gitignore
```

---

## 🚀 Roadmap

### ✅ Phase 0 — Infrastructure (TERMINÉ)
- GCP, GitHub, CI/CD, Firestore, Cloud Storage
- DNS GoDaddy, Load Balancer, IP statique
- Site live sur Cloud Run, mode MOCK désactivé
- Membres + événements dans Firestore

### ✅ Phase 0bis — Email (TERMINÉ 3 juin 2026)
- SendGrid Domain Authentication ✅ Verified
- SendGrid Link Branding ✅ Actif
- ImprovMX forwarding ✅ Actif (4 aliases)
- SPF combiné ImprovMX + SendGrid ✅
- DKIM aligné ✅
- DMARC ✅
- Test mail-tester : **8/10** (auth parfaite, -1 IP partagée trial)

### ⏳ Action immédiate
```bash
# Vérifier SSL www
gcloud compute ssl-certificates describe jokari-ssl --global --project=jokari --format="value(managed.status,managed.domainStatus)"

# Si www toujours FAILED → créer certificat sans www
gcloud compute ssl-certificates create jokari-ssl-v2 --domains=jokari.ch --global --project=jokari
gcloud compute target-https-proxies update jokari-https-proxy --ssl-certificates=jokari-ssl-v2 --global --project=jokari
```

### 🔜 Phase A — Contenu
- Ajouter images `src/images/events/` (open-zh.jpg, biarritz-cup.jpg, lac-classique.jpg)
- Tester formulaires adhésion + inscription → Firestore
- Vérifier affichage événements Firestore
- Refaire Single Sender Verification `contact@jokari.ch` (maintenant possible)

### 🔜 Phase B — Comptes membres
- Magic link email via SendGrid (clé `Magic Link` prête)
- Espace membre, articles Lifestyle, upload photos

### 🔜 Phase C — Admin bureau
- Dashboard admin, gestion événements, stats

### 🔜 Upgrade éventuel SendGrid
- Trial : 100 mails/jour, IP partagée (parfois SpamCop)
- Essentials (~20€/mois) : 50K mails/mois, meilleure IP partagée
- Pro (~90€/mois) : IP dédiée → score 10/10 garanti
- **Décision** : rester sur trial tant que < 100 membres / pas de newsletter régulière

---

## 🔧 Commandes utiles

```bash
# SSL status
gcloud compute ssl-certificates describe jokari-ssl --global --project=jokari --format="value(managed.status,managed.domainStatus)"

# Logs Cloud Run
gcloud run services logs read jokari-website --region=europe-west6 --project=jokari

# Déployer
cd C:\Users\gmoul\jokari-site
git add . && git commit -m "message" && git push origin main

# Forwarding rules
gcloud compute forwarding-rules list --global --project=jokari

# Vérifier DNS
nslookup -type=MX jokari.ch 8.8.8.8
nslookup -type=TXT jokari.ch 8.8.8.8
nslookup -type=CNAME em8175.jokari.ch 8.8.8.8
```

### Test envoi SendGrid (PowerShell)
```powershell
$apiKey = "SG.xxxxxxxxx"
$body = @{
  personalizations = @(@{ to = @(@{ email = "destinataire@example.com" }) })
  from = @{ email = "contact@jokari.ch"; name = "Jokari Club Zurich" }
  reply_to = @{ email = "contact@jokari.ch"; name = "Jokari Club Zurich" }
  subject = "Sujet du mail"
  content = @(@{ type = "text/plain"; value = "Corps du mail" })
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "https://api.sendgrid.com/v3/mail/send" `
  -Method Post `
  -Headers @{ "Authorization" = "Bearer $apiKey"; "Content-Type" = "application/json" } `
  -Body $body
```

---

## 📝 Notes importantes

- ⚠️ Terminal : utiliser **PowerShell** ou **Google Cloud SDK Shell**
- ⚠️ Ne jamais committer `jokari-gcp-key.json` ni les clés SendGrid
- ⚠️ Load Balancer coûte ~18 CHF/mois
- ℹ️ Magic link email fonctionne (Domain Auth verified)
- ℹ️ Google Search Console vérifié pour `jokari.ch`
- ℹ️ Forwarding ImprovMX = forwarding pur, pas de mailbox réelle
- ℹ️ Pour tester forwarding : utiliser une adresse externe (pas un destinataire du forward) — Gmail détecte les self-loops

---

## 📋 Documents légaux
- PV de constitution + Statuts bilingues FR/DE (29 avril 2026)
- Siège : Horgen – Plattenstrasse 8, 8810 Horgen (ZH)
- Art. 60 ss CC suisse

---

## 🔗 Liens utiles

| Service | URL |
|---|---|
| GCP Console | https://console.cloud.google.com/home/dashboard?project=jokari |
| SendGrid | https://app.sendgrid.com |
| ImprovMX | https://app.improvmx.com |
| GoDaddy DNS | https://dcc.godaddy.com/manage/jokari.ch/dns |
| GitHub Repo | https://github.com/Tigergreg/Jokari |
| Site live | https://jokari.ch |
| Mail tester | https://www.mail-tester.com |

---

*Dernière mise à jour : 3 juin 2026 — Email chain complete (SendGrid + ImprovMX), score mail-tester 8/10, prêt pour magic links*
