/**
 * FICHIER : form.js
 * RÔLE    : Validation temps réel du formulaire de contact et soumission
 *           asynchrone vers Netlify Forms (avec data-netlify="true").
 *           Sans JS, le formulaire fonctionne nativement via HTML/Netlify POST.
 */

/* ══════════════════════════════════════════════════════════════════
   SÉLECTEURS
══════════════════════════════════════════════════════════════════ */
const form         = document.getElementById('contact-form');
const nameInput    = document.getElementById('contact-name');
const emailInput   = document.getElementById('contact-email');
const typeSelect   = document.getElementById('contact-type');
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
   SOUMISSION NETLIFY FORMS (AJAX)
══════════════════════════════════════════════════════════════════ */
function handleSubmit(event) {
  event.preventDefault();

  // Validation côté client
  const inputs          = [...fieldValidators.keys()];
  const results         = inputs.map((input) => validateSingle(input));
  const firstInvalidIdx = results.indexOf(false);

  if (firstInvalidIdx !== -1) {
    inputs[firstInvalidIdx].focus();
    setStatus("Merci de corriger les champs indiqués avant d'envoyer le message.", 'error');
    return;
  }

  // Bouton en état "Chargement"
  submitButton.disabled = true;
  submitButton.textContent = 'Envoi en cours…';
  setStatus('', null);

  // Envoi asynchrone vers Netlify Forms (aucun rechargement de page)
  const formData = new FormData(form);

  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(formData).toString(),
  })
    .then((response) => {
      if (response.ok) {
        form.reset();
        inputs.forEach((input) => {
          input.closest('.form__field')?.classList.remove('form__field--error');
          input.removeAttribute('aria-invalid');
        });
        submitButton.disabled = false;
        submitButton.textContent = 'Envoyer le message';
        setStatus('✅ Message envoyé avec succès ! Je vous réponds sous 24 h.', 'success');
      } else {
        throw new Error('Erreur réseau Netlify');
      }
    })
    .catch((error) => {
      console.error('Netlify Form Submit Error:', error);
      submitButton.disabled = false;
      submitButton.textContent = 'Envoyer le message';
      setStatus('❌ Une erreur est survenue lors de l\'envoi. Veuillez réessayer.', 'error');
    });
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
