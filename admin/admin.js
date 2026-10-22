/**
 * FICHIER : admin.js
 * RÔLE    : Backoffice du portfolio — connexion Supabase, gestion des
 *           projets et des articles (CRUD, images, ordre, publication) et
 *           déclenchement d'un nouveau build Netlify (Edge Function
 *           publish-site).
 * DÉPEND  : admin/config.js, supabase-js (CDN), Quill (global, CDN)
 *
 * TABLE DES MATIÈRES
 *   1. Initialisation et utilitaires
 *   2. Images (conversion WebP, upload, suppression)
 *   3. Authentification
 *   4. Projets
 *   5. Articles
 *   6. Publication sur le site
 *   7. Démarrage
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, MEDIA_BUCKET, CATEGORIES, TAG_COLORS } from './config.js';

/* 1. Initialisation et utilitaires */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (selector) => document.querySelector(selector);

const state = { projects: [], posts: [] };
const PENDING_KEY = 'admin.pendingChanges';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slugify = (text) => text
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

// Les images existantes du site sont des chemins relatifs (assets/...)
const previewUrl = (url) => (url ? encodeURI(decodeURI(url)) : '');

function setMessage(element, text, type = '') {
  element.textContent = text;
  element.className = `admin-msg${type ? ` admin-msg--${type}` : ''}${element.id === 'app-msg' ? ' admin-msg--banner' : ''}`;
  if (element.id === 'app-msg') element.hidden = !text;
}

const appMessage = (text, type) => setMessage($('#app-msg'), text, type);

function storageGet(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* stockage indisponible */ }
}

function markPending() {
  storageSet(PENDING_KEY, String(Number(storageGet(PENDING_KEY, '0')) + 1));
  renderPending();
}

function renderPending() {
  const count = Number(storageGet(PENDING_KEY, '0'));
  const badge = $('#pending-count');
  badge.hidden = count === 0;
  badge.textContent = count;
  badge.title = `${count} modification(s) pas encore en ligne`;
}

// Ferme proprement un <dialog> via ses boutons [data-close]
document.querySelectorAll('.admin-dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) dialog.close();
  });
});

/* 2. Images */
const PASSTHROUGH_TYPES = ['image/gif', 'image/svg+xml'];

async function toWebp(file, maxSize = 1600, quality = 0.82) {
  if (PASSTHROUGH_TYPES.includes(file.type)) return { blob: file, ext: file.type === 'image/gif' ? 'gif' : 'svg' };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) throw new Error('Conversion WebP impossible dans ce navigateur');
  return { blob, ext: 'webp' };
}

async function uploadImage(file, folder, baseName) {
  const { blob, ext } = await toWebp(file);
  const path = `${folder}/${Date.now()}-${slugify(baseName || file.name) || 'image'}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: blob.type || `image/${ext}`, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Supprime un fichier du bucket s'il en provient (les assets du dépôt sont ignorés)
async function removeImage(url) {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  if (!url || !url.includes(marker)) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([decodeURIComponent(url.split(marker)[1])]);
}

// Zone de dépôt : clic ou glisser-déposer, aperçu immédiat
function setupDropZone(input, preview, hint) {
  const zone = document.querySelector(`label[for="${input.id}"]`);
  const show = (file) => {
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    hint.hidden = true;
  };
  input.addEventListener('change', () => input.files[0] && show(input.files[0]));
  zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('admin-drop--over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('admin-drop--over'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('admin-drop--over');
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    show(file);
  });
}

function resetDropZone(input, preview, hint, currentUrl) {
  input.value = '';
  preview.hidden = !currentUrl;
  hint.hidden = Boolean(currentUrl);
  if (currentUrl) preview.src = previewUrl(currentUrl);
  else preview.removeAttribute('src');
}

/* 3. Authentification */
async function showApp(session) {
  if (!session) {
    $('#view-app').hidden = true;
    $('#view-login').hidden = false;
    return;
  }
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error || !isAdmin) {
    await supabase.auth.signOut();
    setMessage($('#login-msg'), "Ce compte n'est pas autorisé à gérer le portfolio.", 'error');
    return;
  }
  $('#view-login').hidden = true;
  $('#view-app').hidden = false;
  renderPending();
  await Promise.all([loadProjects(), loadPosts()]);
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage($('#login-msg'), 'Connexion…');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $('#login-email').value.trim(),
    password: $('#login-password').value,
  });
  if (error) {
    setMessage($('#login-msg'), 'Email ou mot de passe incorrect.', 'error');
    return;
  }
  setMessage($('#login-msg'), '');
  showApp(data.session);
});

$('#logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  showApp(null);
});

// Onglets Projets / Blog
document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((b) => {
      const active = b === button;
      b.classList.toggle('filter-pill--active', active);
      b.setAttribute('aria-pressed', String(active));
      $(`#tab-${b.dataset.tab}`).hidden = !active;
    });
  });
});

/* 4. Projets */
const projectForm = {
  dialog: $('#project-dialog'),
  title: $('#project-title'),
  category: $('#project-category'),
  description: $('#project-description'),
  alt: $('#project-alt'),
  published: $('#project-published'),
  image: $('#project-image'),
  preview: $('#project-image-preview'),
  hint: $('#project-image-hint'),
  tags: $('#project-tags'),
  msg: $('#project-msg'),
  current: null,
};

const categoryOptions = Object.entries(CATEGORIES)
  .map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('');
projectForm.category.innerHTML = categoryOptions;
$('#projects-filter').innerHTML = `<option value="">Toutes les catégories</option>${categoryOptions}`;
setupDropZone(projectForm.image, projectForm.preview, projectForm.hint);

async function loadProjects() {
  const { data, error } = await supabase.from('projects').select('*')
    .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  if (error) return appMessage(`Chargement des projets impossible : ${error.message}`, 'error');
  state.projects = data;
  renderProjects();
}

function renderProjects() {
  const query = $('#projects-search').value.trim().toLowerCase();
  const category = $('#projects-filter').value;
  const filtering = Boolean(query || category);
  const visible = state.projects.filter((p) =>
    (!category || p.category === category)
    && (!query || `${p.title} ${p.description}`.toLowerCase().includes(query)));

  $('#projects-count').textContent = `(${visible.length}${filtering ? ` / ${state.projects.length}` : ''})`;
  $('#projects-list').innerHTML = visible.length ? visible.map((p) => {
    const index = state.projects.indexOf(p);
    return `<li class="admin-row${p.published ? '' : ' admin-row--draft'}" data-id="${p.id}">
      <img class="admin-row__thumb" src="${escapeHtml(previewUrl(p.image_url))}" alt="" loading="lazy">
      <div>
        <p class="admin-row__title">${escapeHtml(p.title)}</p>
        <p class="admin-row__meta">
          <span>${escapeHtml(CATEGORIES[p.category] || p.category)}</span>
          <button class="admin-status${p.published ? '' : ' admin-status--draft'}" type="button" data-action="toggle"
            title="Cliquer pour ${p.published ? 'masquer' : 'publier'}">${p.published ? 'Publié' : 'Brouillon'}</button>
        </p>
      </div>
      <div class="admin-row__actions">
        <button class="admin-icon-btn" type="button" data-action="up" aria-label="Monter" ${filtering || index === 0 ? 'disabled' : ''}>↑</button>
        <button class="admin-icon-btn" type="button" data-action="down" aria-label="Descendre" ${filtering || index === state.projects.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="admin-icon-btn" type="button" data-action="edit">Modifier</button>
      </div>
    </li>`;
  }).join('') : '<li class="admin-empty">Aucun projet trouvé.</li>';
}

$('#projects-search').addEventListener('input', renderProjects);
$('#projects-filter').addEventListener('change', renderProjects);

$('#projects-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const project = state.projects.find((p) => p.id === button.closest('[data-id]').dataset.id);
  const action = button.dataset.action;

  if (action === 'edit') return openProject(project);

  if (action === 'toggle') {
    const { error } = await supabase.from('projects').update({ published: !project.published }).eq('id', project.id);
    if (error) return appMessage(error.message, 'error');
    project.published = !project.published;
    markPending();
    return renderProjects();
  }

  // Échange de position avec le voisin
  const index = state.projects.indexOf(project);
  const neighbour = state.projects[action === 'up' ? index - 1 : index + 1];
  if (!neighbour) return;
  let [a, b] = [project.sort_order, neighbour.sort_order];
  if (a === b) b = a + (action === 'up' ? -1 : 1);
  const results = await Promise.all([
    supabase.from('projects').update({ sort_order: b }).eq('id', project.id),
    supabase.from('projects').update({ sort_order: a }).eq('id', neighbour.id),
  ]);
  const failed = results.find((r) => r.error);
  if (failed) return appMessage(failed.error.message, 'error');
  project.sort_order = b;
  neighbour.sort_order = a;
  state.projects.sort((x, y) => x.sort_order - y.sort_order);
  markPending();
  renderProjects();
});

function addTagRow(tag = { label: '', color: 'purple' }) {
  const li = document.createElement('li');
  li.className = 'admin-tag-row';
  li.innerHTML = `
    <input class="form__input" type="text" value="${escapeHtml(tag.label)}" placeholder="ex. Branding / Logo" aria-label="Libellé du tag" maxlength="60">
    <select class="form__select" aria-label="Couleur du tag">
      ${Object.entries(TAG_COLORS).map(([v, l]) => `<option value="${v}" ${v === tag.color ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
    <button class="admin-icon-btn" type="button" aria-label="Retirer ce tag">×</button>`;
  li.querySelector('button').addEventListener('click', () => li.remove());
  projectForm.tags.append(li);
}

$('#project-tag-add').addEventListener('click', () => addTagRow());

function openProject(project = null) {
  projectForm.current = project;
  $('#project-dialog-title').textContent = project ? 'Modifier le projet' : 'Nouveau projet';
  projectForm.title.value = project?.title ?? '';
  projectForm.category.value = project?.category ?? 'branding';
  projectForm.description.value = project?.description ?? '';
  projectForm.alt.value = project?.image_alt ?? '';
  projectForm.published.checked = project?.published ?? true;
  projectForm.tags.innerHTML = '';
  (project?.tags?.length ? project.tags : [{ label: '', color: 'purple' }]).forEach(addTagRow);
  resetDropZone(projectForm.image, projectForm.preview, projectForm.hint, project?.image_url);
  $('#project-delete').hidden = !project;
  setMessage(projectForm.msg, '');
  projectForm.dialog.showModal();
}

$('#project-new').addEventListener('click', () => openProject());

$('#project-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const current = projectForm.current;
  const file = projectForm.image.files[0];
  if (!file && !current?.image_url) return setMessage(projectForm.msg, 'Ajoutez une image.', 'error');

  setMessage(projectForm.msg, file ? 'Envoi de l\'image…' : 'Enregistrement…');
  try {
    const record = {
      title: projectForm.title.value.trim(),
      category: projectForm.category.value,
      description: projectForm.description.value.trim(),
      image_alt: projectForm.alt.value.trim() || projectForm.title.value.trim(),
      published: projectForm.published.checked,
      tags: [...projectForm.tags.querySelectorAll('.admin-tag-row')]
        .map((row) => ({ label: row.querySelector('input').value.trim(), color: row.querySelector('select').value }))
        .filter((tag) => tag.label),
    };
    if (file) record.image_url = await uploadImage(file, 'projects', record.title);

    if (current) {
      const { error } = await supabase.from('projects').update(record).eq('id', current.id);
      if (error) throw error;
      if (file) await removeImage(current.image_url);
    } else {
      // Les nouveaux projets s'affichent en tête de la galerie
      const minOrder = Math.min(0, ...state.projects.map((p) => p.sort_order));
      const { error } = await supabase.from('projects').insert({ ...record, sort_order: minOrder - 10 });
      if (error) throw error;
    }
    projectForm.dialog.close();
    markPending();
    appMessage(`Projet « ${record.title} » enregistré. Pensez à publier sur le site.`, 'success');
    await loadProjects();
  } catch (error) {
    setMessage(projectForm.msg, `Erreur : ${error.message}`, 'error');
  }
});

$('#project-delete').addEventListener('click', async () => {
  const project = projectForm.current;
  if (!project || !confirm(`Supprimer définitivement « ${project.title} » ?`)) return;
  const { error } = await supabase.from('projects').delete().eq('id', project.id);
  if (error) return setMessage(projectForm.msg, error.message, 'error');
  await removeImage(project.image_url);
  projectForm.dialog.close();
  markPending();
  appMessage(`Projet « ${project.title} » supprimé.`, 'success');
  await loadProjects();
});

/* 5. Articles */
const postForm = {
  dialog: $('#post-dialog'),
  title: $('#post-title'),
  slug: $('#post-slug'),
  excerpt: $('#post-excerpt'),
  date: $('#post-date'),
  published: $('#post-published'),
  tags: $('#post-tags'),
  cover: $('#post-cover'),
  coverPreview: $('#post-cover-preview'),
  coverHint: $('#post-cover-hint'),
  coverAlt: $('#post-cover-alt'),
  msg: $('#post-msg'),
  current: null,
  slugTouched: false,
};

setupDropZone(postForm.cover, postForm.coverPreview, postForm.coverHint);

const quill = new window.Quill('#post-editor', {
  theme: 'snow',
  placeholder: 'Rédigez votre article…',
  modules: {
    toolbar: {
      container: [
        [{ header: [2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        ['blockquote', 'code-block', 'link', 'image', 'video'],
        [{ align: [] }],
        ['clean'],
      ],
      handlers: { image: insertEditorImage },
    },
  },
});

// Les images insérées dans l'article sont envoyées dans le bucket (pas en base64)
function insertEditorImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const range = quill.getSelection(true);
    setMessage(postForm.msg, 'Envoi de l\'image…');
    try {
      const url = await uploadImage(file, 'posts', postForm.slug.value || 'article');
      quill.insertEmbed(range.index, 'image', url, 'user');
      quill.setSelection(range.index + 1);
      setMessage(postForm.msg, '');
    } catch (error) {
      setMessage(postForm.msg, `Image non envoyée : ${error.message}`, 'error');
    }
  });
  input.click();
}

// Évite qu'une image collée en base64 n'alourdisse l'article
quill.clipboard.addMatcher('IMG', (node, delta) => {
  const src = node.getAttribute('src') || '';
  if (!src.startsWith('data:')) return delta;
  setMessage(postForm.msg, 'Image collée ignorée : utilisez le bouton image de la barre d\'outils.', 'error');
  return new delta.constructor();
});

const toLocalInput = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const formatDate = (iso) => (iso
  ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(iso))
  : 'non publié');

function updatePostHints() {
  $('#post-slug-hint').textContent = `/blog/${postForm.slug.value || '…'}.html`;
  $('#post-excerpt-hint').textContent = `${postForm.excerpt.value.length} / 160 caractères conseillés`;
}

postForm.title.addEventListener('input', () => {
  if (!postForm.slugTouched) postForm.slug.value = slugify(postForm.title.value);
  updatePostHints();
});
postForm.slug.addEventListener('input', () => {
  postForm.slugTouched = true;
  postForm.slug.value = slugify(postForm.slug.value.replace(/\s/g, '-')) + (postForm.slug.value.endsWith('-') ? '-' : '');
  updatePostHints();
});
postForm.excerpt.addEventListener('input', updatePostHints);

async function loadPosts() {
  const { data, error } = await supabase.from('posts').select('*')
    .order('published_at', { ascending: false, nullsFirst: true }).order('created_at', { ascending: false });
  if (error) return appMessage(`Chargement des articles impossible : ${error.message}`, 'error');
  state.posts = data;
  renderPosts();
}

function renderPosts() {
  $('#posts-count').textContent = `(${state.posts.length})`;
  $('#posts-list').innerHTML = state.posts.length ? state.posts.map((p) => `
    <li class="admin-row${p.published ? '' : ' admin-row--draft'}" data-id="${p.id}">
      ${p.cover_url ? `<img class="admin-row__thumb" src="${escapeHtml(previewUrl(p.cover_url))}" alt="" loading="lazy">` : '<span class="admin-row__thumb"></span>'}
      <div>
        <p class="admin-row__title">${escapeHtml(p.title)}</p>
        <p class="admin-row__meta">
          <span>${formatDate(p.published_at)}</span>
          <span class="admin-status${p.published ? '' : ' admin-status--draft'}">${p.published ? 'Publié' : 'Brouillon'}</span>
          <span>/blog/${escapeHtml(p.slug)}.html</span>
        </p>
      </div>
      <div class="admin-row__actions">
        <button class="admin-icon-btn" type="button" data-action="edit">Modifier</button>
      </div>
    </li>`).join('') : '<li class="admin-empty">Aucun article pour l\'instant. Lancez-vous avec « Nouvel article » !</li>';
}

$('#posts-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="edit"]');
  if (!button) return;
  openPost(state.posts.find((p) => p.id === button.closest('[data-id]').dataset.id));
});

function openPost(post = null) {
  postForm.current = post;
  postForm.slugTouched = Boolean(post);
  $('#post-dialog-title').textContent = post ? 'Modifier l\'article' : 'Nouvel article';
  postForm.title.value = post?.title ?? '';
  postForm.slug.value = post?.slug ?? '';
  postForm.excerpt.value = post?.excerpt ?? '';
  postForm.date.value = toLocalInput(post?.published_at);
  postForm.published.checked = post?.published ?? false;
  postForm.tags.value = (post?.tags ?? []).join(', ');
  postForm.coverAlt.value = post?.cover_alt ?? '';
  resetDropZone(postForm.cover, postForm.coverPreview, postForm.coverHint, post?.cover_url);
  quill.setContents(quill.clipboard.convert({ html: post?.content_html ?? '' }), 'silent');
  quill.history.clear();
  $('#post-delete').hidden = !post;
  setMessage(postForm.msg, '');
  updatePostHints();
  postForm.dialog.showModal();
  if (!post) postForm.title.focus();
}

$('#post-new').addEventListener('click', () => openPost());

// HTML sémantique (vraies listes <ul>/<ol>), sans espaces insécables parasites
const editorHtml = () => (quill.getLength() <= 1 ? '' : quill.getSemanticHTML()
  .replace(/&nbsp;/g, ' ').replace(/ /g, ' '));

$('#post-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const current = postForm.current;
  const file = postForm.cover.files[0];
  const published = postForm.published.checked;
  if (published && !postForm.excerpt.value.trim()) {
    return setMessage(postForm.msg, 'Ajoutez un résumé avant de publier (il sert au référencement).', 'error');
  }

  setMessage(postForm.msg, file ? 'Envoi de la couverture…' : 'Enregistrement…');
  try {
    const record = {
      title: postForm.title.value.trim(),
      slug: postForm.slug.value.replace(/-+$/, ''),
      excerpt: postForm.excerpt.value.trim(),
      content_html: editorHtml(),
      cover_alt: postForm.coverAlt.value.trim() || postForm.title.value.trim(),
      tags: postForm.tags.value.split(',').map((t) => t.trim()).filter(Boolean),
      published,
      published_at: postForm.date.value
        ? new Date(postForm.date.value).toISOString()
        : published ? new Date().toISOString() : null,
    };
    if (file) record.cover_url = await uploadImage(file, 'posts', record.slug);

    const query = current
      ? supabase.from('posts').update(record).eq('id', current.id)
      : supabase.from('posts').insert(record);
    const { error } = await query;
    if (error) {
      if (error.code === '23505') throw new Error('Cette adresse (slug) est déjà utilisée par un autre article.');
      throw error;
    }
    if (file && current) await removeImage(current.cover_url);

    postForm.dialog.close();
    markPending();
    appMessage(`Article « ${record.title} » enregistré${published ? '' : ' en brouillon'}. Pensez à publier sur le site.`, 'success');
    await loadPosts();
  } catch (error) {
    setMessage(postForm.msg, `Erreur : ${error.message}`, 'error');
  }
});

$('#post-delete').addEventListener('click', async () => {
  const post = postForm.current;
  if (!post || !confirm(`Supprimer définitivement l'article « ${post.title} » ?`)) return;
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) return setMessage(postForm.msg, error.message, 'error');
  await removeImage(post.cover_url);
  postForm.dialog.close();
  markPending();
  appMessage(`Article « ${post.title} » supprimé.`, 'success');
  await loadPosts();
});

/* 6. Publication sur le site */
$('#publish-btn').addEventListener('click', async () => {
  const button = $('#publish-btn');
  button.disabled = true;
  appMessage('Lancement de la publication…');
  const { error } = await supabase.functions.invoke('publish-site', { method: 'POST' });
  button.disabled = false;
  if (error) {
    let detail = error.message;
    try { detail = (await error.context.json()).error || detail; } catch { /* réponse non JSON */ }
    return appMessage(`Publication impossible : ${detail}`, 'error');
  }
  storageSet(PENDING_KEY, '0');
  renderPending();
  appMessage('Publication lancée ! Le site sera à jour dans 1 à 2 minutes.', 'success');
});

/* 7. Démarrage */
const { data: { session } } = await supabase.auth.getSession();
showApp(session);
