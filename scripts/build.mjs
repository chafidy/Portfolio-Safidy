/**
 * FICHIER : build.mjs
 * RÔLE    : Génère le site statique dans dist/ à partir des contenus Supabase
 *           (exécuté par Netlify à chaque déploiement, cf. netlify.toml).
 *             - projets.html : grille des projets publiés
 *             - blog.html    : liste des articles publiés
 *             - blog/<slug>.html : une page par article (SEO complet)
 *             - sitemap.xml  : URLs du blog ajoutées
 * USAGE   : node scripts/build.mjs   (Node 18+, aucune dépendance)
 * NOTE    : Si Supabase ne répond pas, le build échoue volontairement :
 *           Netlify garde alors la version précédente en ligne.
 */

import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL } from '../admin/config.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

// Fichiers et dossiers du dépôt qui ne doivent pas être publiés
const EXCLUDED = new Set([
  '.git', '.github', '.claude', '.gitignore', 'dist', 'node_modules', 'scripts', 'netlify',
  'supabase', 'netlify.toml', 'README.md', 'contenu-portfolio-safidy.md', 'remove_bg_and_update.py',
]);
const EXCLUDED_EXT = ['.gif', '.md', '.py'];

/* ---------- Utilitaires ---------- */

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const isAbsolute = (url) => /^(https?:|data:|\/)/.test(url);

// Chemin relatif d'un média depuis une page située à `root` ('' ou '../')
const assetPath = (url, root) => (!url || isAbsolute(url) ? url : root + url);

// URL absolue (Open Graph, JSON-LD, sitemap)
const absoluteUrl = (url) => (!url ? '' : /^https?:/.test(url) ? url : `${SITE_URL}/${encodeURI(url)}`);

const formatDate = (iso) => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long', timeZone: 'Indian/Antananarivo',
}).format(new Date(iso));

const readingTime = (html) => {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

// Le contenu vient du backoffice (écriture admin uniquement), on retire
// malgré tout tout ce qui pourrait exécuter du script.
const sanitize = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');

function replaceBlock(html, name, content, file) {
  const pattern = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!pattern.test(html)) throw new Error(`Marqueur build:${name} introuvable dans ${file}`);
  return html.replace(pattern, `$1\n${content}\n$2`);
}

async function api(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status} sur ${path} : ${await response.text()}`);
  return response.json();
}

/* ---------- Rendus ---------- */

const renderTags = (tags) => `<ul class="tag-list">
${tags.map((t) => `  <li class="tag tag--${escapeHtml(t.color || 'purple')}">${escapeHtml(t.label)}</li>`).join('\n')}
</ul>`;

const renderProject = (p) => `          <li class="project-card" data-category="${escapeHtml(p.category)}">
            <article>
              <a class="project-card__thumb-trigger" href="${escapeHtml(p.image_url)}" target="_blank" rel="noopener">
                <span class="sr-only">Agrandir —</span>
                <img class="project-card__thumb" src="${escapeHtml(p.image_url)}"
                  alt="${escapeHtml(p.image_alt)}" width="370" height="325" loading="lazy">
              </a>
              <div class="project-card__body">
                <h3 class="project-card__title">${escapeHtml(p.title)}</h3>
                <p class="project-card__text">${escapeHtml(p.description)}</p>
                ${renderTags(p.tags || [])}
              </div>
            </article>
          </li>`;

const renderPostCard = (post) => `          <li class="post-card">
            <article>
              <a class="post-card__link" href="blog/${escapeHtml(post.slug)}.html">
                ${post.cover_url ? `<img class="post-card__cover" src="${escapeHtml(post.cover_url)}" alt="${escapeHtml(post.cover_alt)}"
                  width="800" height="450" loading="lazy">` : '<span class="post-card__cover post-card__cover--empty" aria-hidden="true"></span>'}
                <div class="post-card__body">
                  <p class="post-card__meta"><time datetime="${post.published_at}">${formatDate(post.published_at)}</time>
                    · ${readingTime(post.content_html)} min de lecture</p>
                  <h2 class="post-card__title">${escapeHtml(post.title)}</h2>
                  <p class="post-card__excerpt">${escapeHtml(post.excerpt)}</p>
                  ${post.tags.length ? renderTags(post.tags.map((label) => ({ label, color: 'purple' }))) : ''}
                </div>
              </a>
            </article>
          </li>`;

function articleHead(post) {
  const url = `${SITE_URL}/blog/${post.slug}.html`;
  const title = `${post.title} — Blog de Safidy Raharijesy`;
  const image = absoluteUrl(post.cover_url) || `${SITE_URL}/assets/img/avatar%20assis.png`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    inLanguage: 'fr-FR',
    keywords: post.tags.join(', '),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', '@id': `${SITE_URL}/#safidy`, name: 'Safidy Raharijesy', url: `${SITE_URL}/` },
    publisher: { '@type': 'Person', '@id': `${SITE_URL}/#safidy`, name: 'Safidy Raharijesy' },
    isPartOf: { '@type': 'Blog', '@id': `${SITE_URL}/blog.html#blog`, name: 'Blog de Safidy Raharijesy' },
  };
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(post.excerpt)}">
  <meta name="author" content="Safidy Raharijesy">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="theme-color" content="#121824">
  <link rel="canonical" href="${url}">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Safidy Raharijesy Portfolio">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(post.excerpt)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:locale" content="fr_FR">
  <meta property="article:published_time" content="${post.published_at}">
  <meta property="article:modified_time" content="${post.updated_at}">
  <meta property="article:author" content="Safidy Raharijesy">
${post.tags.map((t) => `  <meta property="article:tag" content="${escapeHtml(t)}">`).join('\n')}

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(post.excerpt)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <link rel="icon" type="image/png" href="../assets/icons/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&amp;family=Nunito+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&amp;family=JetBrains+Mono:wght@400;600&amp;display=swap"
    rel="stylesheet">
  <link rel="stylesheet" href="../css/main.css">

  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2).replace(/<\//g, '<\\/')}
  </script>
</head>`;
}

function articleMain(post) {
  return `<main id="main-content">
    <article class="article">
      <div class="container article__inner">
        <nav class="article__breadcrumb text-small" aria-label="Fil d'Ariane">
          <a href="../index.html">Accueil</a> <span aria-hidden="true">/</span>
          <a href="../blog.html">Blog</a>
        </nav>

        <header class="article__header">
          <p class="article__meta"><time datetime="${post.published_at}">${formatDate(post.published_at)}</time>
            · ${readingTime(post.content_html)} min de lecture</p>
          <h1 class="article__title">${escapeHtml(post.title)}</h1>
          ${post.excerpt ? `<p class="lead article__lead">${escapeHtml(post.excerpt)}</p>` : ''}
          ${post.tags.length ? renderTags(post.tags.map((label) => ({ label, color: 'purple' }))) : ''}
        </header>

        ${post.cover_url ? `<img class="article__cover" src="${escapeHtml(assetPath(post.cover_url, '../'))}"
          alt="${escapeHtml(post.cover_alt)}" width="1200" height="675">` : ''}

        <div class="article__content prose">
${sanitize(post.content_html)}
        </div>

        <footer class="article__footer">
          <a class="btn btn--secondary" href="../blog.html">← Tous les articles</a>
          <a class="btn btn--primary" href="../index.html#contact">Discutons de votre projet →</a>
        </footer>
      </div>
    </article>
  </main>`;
}

// Préfixe les liens relatifs d'un fragment HTML (pages situées dans blog/)
const prefixRelativeUrls = (html, root) =>
  html.replace(/\b(href|src)="(?!https?:|mailto:|tel:|#|\/|data:)([^"]*)"/g, `$1="${root}$2"`);

function renderArticlePage(shell, post) {
  const mainStart = shell.indexOf('<main id="main-content">');
  const mainEnd = shell.indexOf('</main>') + '</main>'.length;
  const bodyStart = shell.indexOf('<body');
  const before = prefixRelativeUrls(shell.slice(bodyStart, mainStart), '../');
  const after = prefixRelativeUrls(shell.slice(mainEnd), '../');
  return `<!DOCTYPE html>
<html lang="fr">

${articleHead(post)}

${before}${articleMain(post)}${after}`;
}

const sitemapUrl = (loc, lastmod, changefreq, priority) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod.slice(0, 10)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

/* ---------- Build ---------- */

async function main() {
  const [projects, posts] = await Promise.all([
    api('projects?select=*&published=eq.true&order=sort_order.asc,created_at.asc'),
    api('posts?select=*&published=eq.true&published_at=not.is.null&order=published_at.desc'),
  ]);
  console.log(`Supabase : ${projects.length} projets, ${posts.length} articles publiés`);

  // Copie du site (élément par élément : dist/ est lui-même dans ROOT)
  const isPublished = (name) =>
    !EXCLUDED.has(name) && !EXCLUDED_EXT.some((ext) => name.toLowerCase().endsWith(ext));
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST);
  for (const name of (await readdir(ROOT)).filter(isPublished)) {
    await cp(join(ROOT, name), join(DIST, name), {
      recursive: true,
      filter: (src) => isPublished(basename(src)),
    });
  }

  // projets.html
  const projetsFile = join(DIST, 'projets.html');
  let projetsHtml = await readFile(projetsFile, 'utf8');
  projetsHtml = replaceBlock(projetsHtml, 'projects', projects.map(renderProject).join('\n'), 'projets.html');
  await writeFile(projetsFile, projetsHtml);

  // blog.html
  const blogFile = join(DIST, 'blog.html');
  let blogHtml = await readFile(blogFile, 'utf8');
  if (posts.length) {
    blogHtml = replaceBlock(blogHtml, 'posts', `        <ul class="post-grid">
${posts.map(renderPostCard).join('\n')}
        </ul>`, 'blog.html');
  }
  await writeFile(blogFile, blogHtml);

  // blog/<slug>.html
  await mkdir(join(DIST, 'blog'), { recursive: true });
  for (const post of posts) {
    await writeFile(join(DIST, 'blog', `${post.slug}.html`), renderArticlePage(blogHtml, post));
  }

  // sitemap.xml
  const sitemapFile = join(DIST, 'sitemap.xml');
  const today = new Date().toISOString();
  const blogUrls = [
    sitemapUrl(`${SITE_URL}/blog.html`, posts[0]?.updated_at || today, 'weekly', '0.7'),
    ...posts.map((p) => sitemapUrl(`${SITE_URL}/blog/${p.slug}.html`, p.updated_at, 'monthly', '0.6')),
  ];
  let sitemap = await readFile(sitemapFile, 'utf8');
  sitemap = replaceBlock(sitemap, 'blog', blogUrls.join('\n'), 'sitemap.xml');
  await writeFile(sitemapFile, sitemap);

  console.log(`dist/ généré : projets.html, blog.html, ${posts.length} article(s), sitemap.xml`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
