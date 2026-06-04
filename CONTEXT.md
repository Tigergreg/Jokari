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
| URL www | `https://www.jokari.ch` ✅ (SSL ACTIVE) |

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

### Statut certificat SSL ✅
```
jokari.ch:     ACTIVE ✅
www.jokari.ch: ACTIVE ✅
```
→ Validé 3 juin 2026 — résolu spontanément après ~1 semaine de propagation

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

### Secrets GitHub (7) ✅
- `GCP_PROJECT_ID` = `jokari`
- `GCP_REGION` = `europe-west6`
- `GCP_SA_KEY` = contenu JSON clé service account
- `SENDGRID_API_KEY` = clé runtime SendGrid (synchronisée avec Cloud Run)
- `JOKARI_FROM_EMAIL` = `contact@jokari.ch`
- `JOKARI_FROM_NAME` = `Jokari Club Zurich`
- `JOKARI_ADMIN_EMAILS` = `gmoulyaigrot@gmail.com;christine.hue@gmail.com`

### Pipeline CI/CD ✅
- Trigger : push sur `main`
- Build Docker → Artifact Registry → Cloud Run
- Durée : ~2min 30s
- **Injection automatique des 6 env vars** via `--set-env-vars=^@^...` (séparateur custom `@` pour gérer `;` dans les valeurs)
- Cloud Run revisions étanches : chaque push redéploie sans casser SendGrid

---

## 📧 SendGrid — Domain Authentication ✅ VERIFIED & ACTIF

| Élément | Valeur |
|---|---|
| Compte | `gmoulyaigrot@gmail.com` |
| Domaine | `jokari.ch` |
| Sender | `Jokari Club Zürich <contact@jokari.ch>` |
| Domain Authentication | ✅ **Verified** |
| Link Branding | ✅ Actif (`url7025.jokari.ch`) |
| Single Sender Verification | ✅ Verified (`contact@jokari.ch`) |
| Test mail-tester | **8/10** (-1 IP partagée SpamCop, -1 SpamAssassin lié) |
| DKIM | ✅ Aligned & Valid |
| SPF | ✅ Pass |
| DMARC | ✅ Pass |
| **Mailer code intégré** | ✅ **Actif** (4 endpoints API envoient des emails) |

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
- `SENDGRID_API_KEY` (GitHub secret) — utilisée par CI/CD pour injection Cloud Run
- `Magic Link` — clé dédiée magic links (espace membres futur)
- `jokari-mailtest` — clé pour tests mail-tester
- `jokari-cloudrun` — clé runtime Cloud Run (créée 4 juin 2026)

### Endpoints API qui envoient des emails ✅
Tous via `api/mailer.js` (module SendGrid centralisé) :
| Endpoint | Email confirmation (utilisateur) | Email notif (bureau) |
|---|---|---|
| `POST /api/members` | "Votre demande d'adhésion au Jokari Club Zürich" | "Nouvelle adhésion : Prénom Nom" |
| `POST /api/registrations` | "Inscription confirmée : [titre event]" | "Nouvelle inscription : [event] ([nom])" |
| `POST /api/newsletter` | "Bienvenue dans la newsletter du Jokari Club Zürich" | — |
| `POST /api/contact` | "Nous avons bien reçu votre message" | "Contact jokari.ch — [sujet]" |

- Bureau = destinataires de `JOKARI_ADMIN_EMAILS` (Grégoire + Christine)
- Pattern fire-and-forget : si SendGrid plante, le formulaire répond quand même `ok: true`
- `reply_to` configuré : le bureau peut répondre directement au membre via Gmail

### Variables d'environnement Cloud Run (6) ✅
Injectées automatiquement par le workflow `.github/workflows/deploy.yml` :
| Variable | Valeur |
|---|---|
| `GCP_PROJECT_ID` | `jokari` |
| `NODE_ENV` | `production` |
| `SENDGRID_API_KEY` | (secret GitHub) |
| `JOKARI_FROM_EMAIL` | `contact@jokari.ch` |
| `JOKARI_FROM_NAME` | `Jokari Club Zurich` |
| `JOKARI_ADMIN_EMAILS` | `gmoulyaigrot@gmail.com;christine.hue@gmail.com` |

⚠️ Le séparateur dans `JOKARI_ADMIN_EMAILS` est `;` (pas `,`) car la virgule est réservée par Cloud Run.

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
| `contact@jokari.ch` | ✅ **Verified** (4 juin 2026) |

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
├── .github/workflows/deploy.yml  ← injection auto des 6 env vars
├── api/
│   ├── server.js                 ← 4 endpoints avec emails (fire-and-forget)
│   ├── firestore.js
│   ├── mailer.js                 ← module SendGrid centralisé (nouveau)
│   ├── package.json              ← + @sendgrid/mail
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

### ✅ Phase 0ter — Mailer & Single Sender (TERMINÉ 4 juin 2026)
- Single Sender Verification `contact@jokari.ch` ✅ Verified
- Module `api/mailer.js` créé (templates métier FR)
- 4 endpoints API envoient des emails (members, registrations, newsletter, contact)
- 6 variables Cloud Run injectées automatiquement via workflow GitHub Actions
- Pipeline CI/CD étanche : push = redéploiement sans casser SendGrid
- Test live : emails reçus en boîte de réception (pas spam)

### ⏳ Actions immédiates pour la prochaine session
1. **Images événements** : générer/uploader `open-zh.jpg`, `biarritz-cup.jpg`, `lac-classique.jpg` dans `gs://jokari-media/events/`
2. **Créer collections Firestore manquantes** : `registrations/`, `articles/`, `news/` (newsletter existe déjà)
3. **Tester formulaire d'inscription événement** end-to-end (Firestore + mail)
4. **Tester formulaire newsletter** standalone
5. **Tester formulaire contact** standalone

### 🔜 Phase A — Contenu (reste à faire)
- Ajouter images `src/images/events/` (open-zh.jpg, biarritz-cup.jpg, lac-classique.jpg)
- Créer collections Firestore manquantes (`registrations`, `articles`, `news`)
- Tester formulaires inscription event + newsletter + contact (bout en bout, déjà OK pour adhésion)
- Vérifier affichage événements Firestore

### 🔜 Phase B — Comptes membres
- Magic link email via SendGrid (clé `Magic Link` prête, mailer.js réutilisable)
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

### Test API & SendGrid
```powershell
# Health check (vérifie aussi que mailer est ON)
curl.exe https://jokari.ch/api/health
# Attendu: {"ok":true,"ts":...,"mailer":true}

# Variables d'env Cloud Run (doit montrer les 6)
gcloud.cmd run services describe jokari-website --region=europe-west6 --project=jokari --format="value(spec.template.spec.containers[0].env[].name)"

# Logs live (utile en cas de souci après push)
gcloud.cmd run services logs tail jokari-website --region=europe-west6 --project=jokari
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
- ⚠️ Si PowerShell bloque les `.ps1` (PSSecurityException), utiliser `gcloud.cmd`, `npm.cmd`, `curl.exe`, OU lancer `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` (en admin)
- ⚠️ Ne jamais committer `jokari-gcp-key.json` ni les clés SendGrid
- ⚠️ Mailer **fire-and-forget** : si SendGrid plante, le formulaire répond `ok: true` quand même (UX OK, mais à monitorer)
- ⚠️ `--set-env-vars` Cloud Run REMPLACE toute la liste : toujours utiliser le workflow GitHub Actions pour persister les variables
- ℹ️ Magic link email prêt (clé `Magic Link` dédiée, mailer.js réutilisable)
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

*Dernière mise à jour : 4 juin 2026 — Infrastructure + Email complets. 4 formulaires envoient des emails (membres, registrations, newsletter, contact). Pipeline CI/CD étanche. Prêt pour Phase A (contenu + tests des autres formulaires).*
