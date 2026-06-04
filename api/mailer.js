// api/mailer.js — SendGrid notifications for jokari.ch
// Envoie des emails transactionnels (confirmations utilisateur + notifications bureau + magic links)

const sgMail = require("@sendgrid/mail");

const API_KEY    = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.JOKARI_FROM_EMAIL || "contact@jokari.ch";
const FROM_NAME  = process.env.JOKARI_FROM_NAME  || "Jokari Club Zurich";

// JOKARI_ADMIN_EMAILS = "a@b.com;c@d.com" (séparateur ; car la virgule est utilisée par Cloud Run)
const ADMIN_EMAILS = (process.env.JOKARI_ADMIN_EMAILS || "")
  .split(/[;,]/)
  .map(e => e.trim())
  .filter(Boolean);

const ENABLED = !!API_KEY;
if (ENABLED) {
  sgMail.setApiKey(API_KEY);
  console.log(`[mailer] enabled — from=${FROM_EMAIL}, admins=${ADMIN_EMAILS.join(", ")}`);
} else {
  console.warn("[mailer] disabled — SENDGRID_API_KEY missing");
}

// ---- Helper bas-niveau ----
// Si disableTracking=true, désactive le click tracking SendGrid (utile pour les magic links
// qui doivent pointer directement sur jokari.ch sans passer par url7025.jokari.ch).
async function send({ to, subject, text, html, replyTo, disableTracking }) {
  if (!ENABLED) {
    console.warn(`[mailer] skipped (disabled): to=${to}, subject="${subject}"`);
    return { skipped: true };
  }
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn(`[mailer] skipped (no recipient): subject="${subject}"`);
    return { skipped: true };
  }
  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    replyTo: replyTo || FROM_EMAIL,
    subject,
    text,
    html: html || `<p>${(text || "").replace(/\n/g, "<br>")}</p>`,
  };
  if (disableTracking) {
    msg.trackingSettings = {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false },
    };
  }
  try {
    const [response] = await sgMail.send(msg);
    console.log(`[mailer] sent OK — to=${Array.isArray(to) ? to.join(",") : to}, status=${response.statusCode}`);
    return { ok: true, status: response.statusCode };
  } catch (err) {
    console.error(`[mailer] FAILED — to=${to}, subject="${subject}"`, err.response?.body || err.message);
    return { ok: false, error: err.message };
  }
}

// ====================================================================
// Templates métier
// ====================================================================

// ---- Magic link (connexion espace membre) ----
// disableTracking: true pour que le bouton pointe directement sur jokari.ch
async function sendMagicLink(email, link, firstName) {
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const subject = "Votre lien de connexion au Jokari Club Zürich";
  const text =
`${greeting}

Voici votre lien de connexion à votre espace Jokari Club Zürich :

${link}

Ce lien est valable 15 minutes et ne fonctionne qu'une fois.

Si vous n'avez pas demandé cette connexion, vous pouvez ignorer ce message en toute sécurité.

À très bientôt sur les courts !

Le bureau du Jokari Club Zürich
contact@jokari.ch | www.jokari.ch`;

  const html =
`<div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #222;">
  <p>${greeting}</p>
  <p>Voici votre lien de connexion à votre espace <strong>Jokari Club Zürich</strong> :</p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; background: #c8312a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Se connecter</a>
  </p>
  <p style="font-size: 13px; color: #666;">
    Ou copiez-collez ce lien dans votre navigateur :<br>
    <a href="${link}" style="color: #c8312a; word-break: break-all;">${link}</a>
  </p>
  <p style="font-size: 13px; color: #666;">
    Ce lien est valable <strong>15 minutes</strong> et ne fonctionne qu'une fois.<br>
    Si vous n'avez pas demandé cette connexion, vous pouvez ignorer ce message.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 13px; color: #888;">
    Le bureau du Jokari Club Zürich<br>
    <a href="mailto:contact@jokari.ch" style="color: #c8312a;">contact@jokari.ch</a> | <a href="https://jokari.ch" style="color: #c8312a;">www.jokari.ch</a>
  </p>
</div>`;

  return send({ to: email, subject, text, html, disableTracking: true });
}

// ---- Adhésion ----
async function sendMemberConfirmation(member) {
  const subject = "Votre demande d'adhésion au Jokari Club Zürich";
  const text =
`Bonjour ${member.firstName},

Nous avons bien reçu votre demande d'adhésion au Jokari Club Zürich.

Récapitulatif de votre demande :
- Nom : ${member.firstName} ${member.lastName}
- Email : ${member.email}
- Type de membre : ${member.memberType}
${member.acceptNewsletter ? "- Inscription newsletter : oui" : ""}

Le bureau de l'association étudie votre dossier et reviendra vers vous sous 7 jours pour la suite (cotisation, validation, prochain rendez-vous club).

Bienvenue dans la grande famille Jokari, et à très bientôt sur les courts !

Cordialement,
Le bureau du Jokari Club Zürich
contact@jokari.ch | www.jokari.ch`;
  return send({ to: member.email, subject, text });
}

async function sendMemberAdminNotification(member) {
  if (ADMIN_EMAILS.length === 0) return { skipped: true };
  const subject = `Nouvelle adhésion : ${member.firstName} ${member.lastName}`;
  const text =
`Nouvelle demande d'adhésion reçue sur jokari.ch :

- Nom : ${member.firstName} ${member.lastName}
- Email : ${member.email}
- Téléphone : ${member.phone || "-"}
- Adresse : ${member.address || "-"}, ${member.zip || ""} ${member.city || ""}
- Date de naissance : ${member.birthDate || "-"}
- Type de membre : ${member.memberType}
- Newsletter : ${member.acceptNewsletter ? "oui" : "non"}
- Statuts acceptés : ${member.acceptStatuts ? "oui" : "non"}

Statut actuel : pending (à valider dans Firestore > members)
ID Firestore : ${member.id || "-"}

— Jokari API`;
  return send({ to: ADMIN_EMAILS, subject, text, replyTo: member.email });
}

// ---- Inscription événement ----
async function sendRegistrationConfirmation(reg, eventTitle) {
  const subject = `Inscription confirmée : ${eventTitle || "événement Jokari"}`;
  const text =
`Bonjour ${reg.fullName},

Votre inscription pour "${eventTitle || reg.eventId}" est bien enregistrée.

Récapitulatif :
- Événement : ${eventTitle || reg.eventId}
- Participants : ${reg.participants || 1}
- Email : ${reg.email}

Statut : en attente de paiement.

Vous recevrez prochainement les informations pratiques (lieu exact, horaires, paiement).

À très bientôt !

Le bureau du Jokari Club Zürich
contact@jokari.ch | www.jokari.ch`;
  return send({ to: reg.email, subject, text });
}

async function sendRegistrationAdminNotification(reg, eventTitle) {
  if (ADMIN_EMAILS.length === 0) return { skipped: true };
  const subject = `Nouvelle inscription : ${eventTitle || reg.eventId} (${reg.fullName})`;
  const text =
`Nouvelle inscription événement sur jokari.ch :

- Nom : ${reg.fullName}
- Email : ${reg.email}
- Téléphone : ${reg.phone || "-"}
- Événement : ${eventTitle || reg.eventId}
- Participants : ${reg.participants || 1}

Statut : pending-payment
ID Firestore : ${reg.id || "-"}

— Jokari API`;
  return send({ to: ADMIN_EMAILS, subject, text, replyTo: reg.email });
}

// ---- Newsletter ----
async function sendNewsletterConfirmation(email) {
  const subject = "Bienvenue dans la newsletter du Jokari Club Zürich";
  const text =
`Bonjour,

Votre inscription à la newsletter saisonnière du Jokari Club Zürich est bien enregistrée.

Vous recevrez nos actualités : événements, articles lifestyle, prochaines rencontres au bord du lac et nouveautés du club.

À bientôt !

Le bureau du Jokari Club Zürich
contact@jokari.ch | www.jokari.ch`;
  return send({ to: email, subject, text });
}

// ---- Contact ----
async function sendContactAcknowledgement(msg) {
  const subject = "Nous avons bien reçu votre message";
  const text =
`Bonjour ${msg.name},

Merci d'avoir contacté le Jokari Club Zürich.

Voici un récapitulatif de votre message :
Sujet : ${msg.subject}

"${msg.message}"

Le bureau revient vers vous dans les meilleurs délais.

Cordialement,
Le bureau du Jokari Club Zürich
contact@jokari.ch | www.jokari.ch`;
  return send({ to: msg.email, subject, text });
}

async function sendContactAdminNotification(msg) {
  if (ADMIN_EMAILS.length === 0) return { skipped: true };
  const subject = `Contact jokari.ch — ${msg.subject}`;
  const text =
`Nouveau message via le formulaire de contact :

- Nom : ${msg.name}
- Email : ${msg.email}
- Sujet : ${msg.subject}

Message :
${msg.message}

— Jokari API`;
  return send({ to: ADMIN_EMAILS, subject, text, replyTo: msg.email });
}

module.exports = {
  // auth
  sendMagicLink,
  // adhésion
  sendMemberConfirmation,
  sendMemberAdminNotification,
  // événements
  sendRegistrationConfirmation,
  sendRegistrationAdminNotification,
  // newsletter
  sendNewsletterConfirmation,
  // contact
  sendContactAcknowledgement,
  sendContactAdminNotification,
  // helpers
  isEnabled: () => ENABLED,
};
