/**
 * FICHIER : form.js
 * RÔLE    : Validation temps réel du formulaire de contact.
 *           À la soumission, construit un lien mailto: avec tous les champs
 *           et ouvre le client mail du visiteur (Gmail, Outlook, etc.).
 *           Zéro dépendance externe — fonctionne entièrement côté navigateur.
 */

/* ══════════════════════════════════════════════════════════════════
   ADRESSE DE RÉCEPTION
   ← Mettez ici votre adresse email
══════════════════════════════════════════════════════════════════ */
const RECIPIENT_EMAIL = 'jraharijesy@gmail.com';

/* ══════════════════════════════════════════════════════════════════
   SÉLECTEURS
══════════════════════════════════════════════════════════════════ */
const form         = document.getElementById('contact-form');
const nameInput    = document.getElementById('contact-name');
const emailInput   = document.getElementById('contact-email');
const typeSelect   = document.getElementById('contact-type');
const budgetInput  = document.getElementById('contact-budget');
const messageInput = document.getElementById('contact-message');
const submitButton = form?.querySelector('.form__submit');
const statusEl     = document.getElementById('form-status');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ══════════════════════════════════════════════════════════════════
   VALIDATEURS
══════════════════════════════════════════════════════════════════ */
function validateName()    { return nameInput.value.trim()   ? '' : "Merci d'indiquer votre nom."; }
function validateEmail() {
  const v = emailInput.value.trim();
  if (!v) return "Merci d'indiquer votre email.";
  if (!EMAIL_PATTERN.test(v)) return "Format d'email invalide (ex. : nom@domaine.com).";
  return '';
}
function validateType()    { return typeSelect.value         ? '' : 'Merci de sélectionner un type de projet.'; }
function validateMessage() { return messageInput.value.trim() ? '' : 'Merci de décrire votre projet en quelques mots.'; }

const fieldValidators = new Map([
  [nameInput,    validateName],
  [emailInput,   validateEmail],
  [typeSelect,   validateType],
  [messageInput, validateMessage],
]);

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */
function validateSingle(input) {
  const validate = fieldValidators.get(input);
  if (!validate) return true;
  const field   = input.closest('.form__field');
  const hint    = field?.querySelector('.form__hint');
  const message = validate();
  const isValid = !message;
  field?.classList.toggle('form__field--error', !isValid);
  input.setAttribute('aria-invalid', String(!isValid));
  if (hint) hint.textContent = message;
  return isValid;
}

function setStatus(message, tone) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('form__status--success', tone === 'success');
  statusEl.classList.toggle('form__status--error',   tone === 'error');
}

/* ══════════════════════════════════════════════════════════════════
   ENVOI VIA MAILTO
══════════════════════════════════════════════════════════════════ */
function handleSubmit(event) {
  event.preventDefault();

  // Validation côté client
  const inputs           = [...fieldValidators.keys()];
  const results          = inputs.map((input) => validateSingle(input));
  const firstInvalidIdx  = results.indexOf(false);

  if (firstInvalidIdx !== -1) {
    inputs[firstInvalidIdx].focus();
    setStatus("Merci de corriger les champs indiqués avant d'envoyer le message.", 'error');
    return;
  }

  // Récupération des valeurs
  const name    = nameInput.value.trim();
  const email   = emailInput.value.trim();
  const type    = typeSelect.value;
  const budget  = budgetInput?.value.trim() || 'Non précisé';
  const message = messageInput.value.trim();

  // Construction du sujet et du corps de l'email
  const subject = `Demande de devis — ${type} — ${name}`;
  const body = [
    `Nom : ${name}`,
    `Email : ${email}`,
    `Type de projet : ${type}`,
    `Budget indicatif : ${budget}`,
    ``,
    `Message :`,
    message,
  ].join('\n');

  // Construction du lien mailto et ouverture du client mail
  const mailtoLink = `mailto:${RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;

  // Confirmation visuelle
  setStatus('✅ Votre client mail va s\'ouvrir pour envoyer le message.', 'success');
}

/* ══════════════════════════════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════════════════════════════ */
export function init() {
  if (!form) return;

  form.noValidate = true;

  form.addEventListener('focusout', (event) => {
    if (fieldValidators.has(event.target)) validateSingle(event.target);
  });

  form.addEventListener('input', (event) => {
    const field = event.target.closest('.form__field');
    if (fieldValidators.has(event.target) && field?.classList.contains('form__field--error')) {
      validateSingle(event.target);
    }
  });

  form.addEventListener('submit', handleSubmit);
}
