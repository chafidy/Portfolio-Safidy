/**
 * FICHIER : form.js
 * RÔLE    : Validation temps réel du formulaire de contact et simulation
 *           d'envoi (aucune requête réseau réelle). Sans JavaScript, le
 *           formulaire s'appuie sur la validation HTML native (attributs
 *           required / type="email" déjà présents dans le HTML) : c'est
 *           pourquoi init() active novalidate uniquement lorsque ce
 *           module prend le relais.
 */

const form = document.getElementById('contact-form');
const nameInput = document.getElementById('contact-name');
const emailInput = document.getElementById('contact-email');
const typeSelect = document.getElementById('contact-type');
const messageInput = document.getElementById('contact-message');
const submitButton = form?.querySelector('.form__submit');
const statusEl = document.getElementById('form-status');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBMIT_DELAY_MS = 900;

/** @returns {string} Message d'erreur, ou chaîne vide si valide. */
function validateName() {
  return nameInput.value.trim() ? '' : "Merci d'indiquer votre nom.";
}

/** @returns {string} Message d'erreur, ou chaîne vide si valide. */
function validateEmail() {
  const value = emailInput.value.trim();
  if (!value) return "Merci d'indiquer votre email.";
  if (!EMAIL_PATTERN.test(value)) return 'Format d\'email invalide (ex. : nom@domaine.com).';
  return '';
}

/** @returns {string} Message d'erreur, ou chaîne vide si valide. */
function validateType() {
  return typeSelect.value ? '' : 'Merci de sélectionner un type de projet.';
}

/** @returns {string} Message d'erreur, ou chaîne vide si valide. */
function validateMessage() {
  return messageInput.value.trim() ? '' : 'Merci de décrire votre projet en quelques mots.';
}

const fieldValidators = new Map([
  [nameInput, validateName],
  [emailInput, validateEmail],
  [typeSelect, validateType],
  [messageInput, validateMessage],
]);

/**
 * Valide un champ et met à jour son état visuel (.form__field--error),
 * son message d'aide et son attribut aria-invalid.
 * @param {HTMLElement} input - Champ à valider.
 * @returns {boolean} Vrai si le champ est valide.
 */
function validateSingle(input) {
  const validate = fieldValidators.get(input);
  if (!validate) return true;

  const field = input.closest('.form__field');
  const hint = field?.querySelector('.form__hint');
  const message = validate();
  const isValid = !message;

  field?.classList.toggle('form__field--error', !isValid);
  input.setAttribute('aria-invalid', String(!isValid));
  if (hint) hint.textContent = message;

  return isValid;
}

/**
 * Affiche un message dans la zone de statut (aria-live).
 * @param {string} message - Texte à annoncer.
 * @param {'success' | 'error'} tone - Style à appliquer.
 */
function setStatus(message, tone) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('form__status--success', tone === 'success');
  statusEl.classList.toggle('form__status--error', tone === 'error');
}

/**
 * Valide l'ensemble du formulaire, puis simule l'envoi (aucun réseau).
 * @param {SubmitEvent} event
 */
function handleSubmit(event) {
  event.preventDefault();

  const inputs = [...fieldValidators.keys()];
  const results = inputs.map((input) => validateSingle(input));
  const firstInvalidIndex = results.indexOf(false);

  if (firstInvalidIndex !== -1) {
    inputs[firstInvalidIndex].focus();
    setStatus('Merci de corriger les champs indiqués avant d\'envoyer le message.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Envoi en cours…';
  setStatus('Envoi en cours…', null);

  window.setTimeout(() => {
    form.reset();
    inputs.forEach((input) => {
      input.closest('.form__field')?.classList.remove('form__field--error');
      input.removeAttribute('aria-invalid');
    });
    submitButton.disabled = false;
    submitButton.textContent = 'Envoyer le message';
    setStatus('Message envoyé ! Je vous réponds sous 24 h.', 'success');
  }, SUBMIT_DELAY_MS);
}

/**
 * Initialise la validation temps réel et la simulation d'envoi du
 * formulaire de contact. Ne fait rien si le formulaire est absent du DOM.
 */
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
