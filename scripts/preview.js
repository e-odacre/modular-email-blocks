// Usage: node scripts/preview.js [brand] [email]   e.g. npm run preview -- placeholder flows/welcome
// Serves emails, campaign recipes and the component gallery rendered live from source, and reloads the browser when a
// source file changes. Nothing is written to dist/. Placeholder-token problems are warnings here, hard errors in the build.
//
//   /                              emails, recipes and the gallery
//   /<flows|campaigns>/<email>     one email (add ?theme=luxury)
//   /recipes, /recipes/<name>      campaign recipes with their preview data
//   /brands/<brand>/              generated brand collection (npm run gallery:brand -- <brand>)
//   /components, /components/<category>/<name>   every component, every variant, with a theme switcher
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROOT, DIST_DIR, EMAIL_DIRS, EXAMPLE_DIRS, listBrands, listEmails } = require('./lib/paths');
const { loadBrand } = require('./lib/tokens');
const { renderEmail, renderComponent, renderRecipe } = require('./lib/render');
const { runChecks } = require('./lib/checks');
const { loadRegistry } = require('./lib/registry');
const { loadRecipes } = require('./lib/recipes');
const { listThemes, DEFAULT_THEME } = require('./lib/themes');

const PORT = Number(process.env.PORT) || 3000;
const brand = process.argv[2] || 'placeholder';
const firstEmail = process.argv[3];

if (!listBrands().includes(brand)) {
  console.error(`Unknown brand "${brand}". Available: ${listBrands().join(', ')}`);
  process.exit(1);
}

const RELOAD_SCRIPT = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;
const clients = new Set();

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const STYLE = `<style>
  body{font:14px/1.5 system-ui,sans-serif;margin:0;color:#111827;background:#f3f4f6}
  main{max-width:960px;margin:0 auto;padding:24px}
  a{color:#2563eb} h1,h2,h3{margin:.6em 0 .3em} code{background:#e5e7eb;padding:1px 5px;border-radius:3px}
  .bar{position:sticky;top:0;background:#111827;color:#fff;padding:10px 24px;z-index:5;display:flex;gap:16px;flex-wrap:wrap;align-items:center}
  .bar a{color:#93c5fd;text-decoration:none} .bar .on{color:#fff;font-weight:700}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:6px;margin:16px 0;padding:16px}
  .meta{color:#6b7280;font-size:12px} .grid{columns:3 220px} .grid a{display:block}
  iframe{width:100%;border:1px solid #d1d5db;background:#fff;border-radius:4px;min-height:80px}
  .warn{font:12px monospace;background:#fff3cd;padding:8px;white-space:pre-wrap}
</style>`;

function page(body, { theme, path: here } = {}) {
  const themes = listThemes()
    .map((t) => `<a class="${t === (theme || DEFAULT_THEME) ? 'on' : ''}" href="${here || '/'}?theme=${t}">${t}</a>`)
    .join(' ');
  const bar = here ? `<div class="bar"><a href="/">Home</a><a href="/recipes">Recipes</a><a href="/components">Components</a><span>theme:</span>${themes}</div>` : '';
  return `<!doctype html><meta charset="utf-8"><title>Preview</title>${STYLE}${bar}<main>${body}</main>${RELOAD_SCRIPT}`;
}

// Iframes size themselves to their content once loaded.
const FIT = `<script>document.querySelectorAll('iframe').forEach(f=>f.addEventListener('load',()=>{try{f.style.height=(f.contentDocument.documentElement.scrollHeight+4)+'px'}catch(e){}}))</script>`;

function loadTokens() {
  return loadBrand(brand); // re-read each time so token edits show up
}

async function renderEmailPage(email, theme) {
  const { tokens, errors, placeholderIssues } = loadTokens();
  if (errors.length) return page(`<h2>tokens/${brand}.json is invalid</h2><pre>${escapeHtml(errors.join('\n'))}</pre>`);
  const { html, mjml, mjmlErrors } = await renderEmail(`${email}.mjml`, tokens, { theme, fresh: true });
  const { errors: checkErrors, warnings } = runChecks(html, brand, mjml);
  return withBanner(html, email, [
    ...placeholderIssues.map((m) => `placeholder: ${m}`),
    ...mjmlErrors.map((e) => `mjml: ${e.formattedMessage || e.message}`),
    ...checkErrors.map((m) => `check: ${m}`),
    ...warnings.map((m) => `warning: ${m}`),
  ]);
}

function withBanner(html, label, notes) {
  if (notes.length) console.warn(`\n${label}\n  ${notes.join('\n  ')}`);
  const banner = notes.length ? `<div class="warn">${escapeHtml(notes.join('\n'))}</div>` : '';
  return html.replace(/<body[^>]*>/i, (m) => `${m}${banner}`).replace('</body>', `${RELOAD_SCRIPT}</body>`);
}

function homePage() {
  const emails = listEmails({ examples: true }).map((e) => `<li><a href="/${e}">${e}</a></li>`).join('');
  const collectionsDir = path.join(ROOT, 'brands');
  const collections = fs.existsSync(collectionsDir) ? fs.readdirSync(collectionsDir)
    .filter((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && fs.existsSync(path.join(collectionsDir, id, 'catalog.js')))
    .map((id) => `<li><a href="/brands/${id}/">${escapeHtml(id)} design collection</a></li>`).join('') : '';
  return page(`<h1>${escapeHtml(brand)}</h1>
    ${collections ? `<div class="card"><h3>Brand collections</h3><ul>${collections}</ul></div>` : ''}
    <div class="card"><h3>Emails</h3><ul>${emails || '<li>No emails yet. Add a .mjml file to flows/ or campaigns/.</li>'}</ul></div>
    <div class="card"><h3>Design system</h3><ul><li><a href="/recipes">Campaign recipes</a></li><li><a href="/components">Component gallery</a></li></ul></div>`);
}

function recipesIndex() {
  const rows = [...loadRecipes({ fresh: true })]
    .map(([id, r]) => `<div class="card"><h3><a href="/recipes/${id}">${escapeHtml(r.name)}</a></h3><div class="meta">${escapeHtml(r.description)}${r.suggestedTheme ? ` Suggested theme: <code>${r.suggestedTheme}</code>.` : ''}</div></div>`)
    .join('');
  return page(`<h1>Campaign recipes</h1>${rows}`, { path: '/recipes' });
}

function recipePage(id, theme) {
  const recipe = loadRecipes({ fresh: true }).get(id);
  if (!recipe) return null;
  const chosen = theme || recipe.suggestedTheme || DEFAULT_THEME;
  return page(
    `<h1>${escapeHtml(recipe.name)}</h1><p class="meta">${escapeHtml(recipe.description)}</p>
     <iframe src="/frame/recipe/${id}?theme=${chosen}" style="min-height:600px"></iframe>${FIT}`,
    { theme: chosen, path: `/recipes/${id}` },
  );
}

function componentsIndex(registry) {
  const cats = registry.categories().map((cat) => {
    const items = registry.all().filter((e) => e.category === cat).map((e) => `<a href="/components/${e.id}">${escapeHtml(e.meta.name)}</a>`).join('');
    return `<div class="card"><h3>${cat}</h3><div class="grid">${items}</div></div>`;
  });
  return page(`<h1>Components</h1><p class="meta">${registry.all().length} components. Use the theme bar to see every one in another theme.</p>${cats.join('')}`, { path: '/components' });
}

function componentPage(registry, id, theme) {
  if (!registry.has(id)) return null;
  const e = registry.get(id);
  const chosen = theme || DEFAULT_THEME;
  const required = Object.entries(e.meta.fields).filter(([, v]) => typeof v === 'object' && v.required).map(([k]) => k);
  const variants = Object.entries(e.meta.variants)
    .map(([v, def]) => `<div class="card"><h3>${escapeHtml(v)}</h3><div class="meta">${escapeHtml(def.description)}</div>
      <iframe src="/frame/component/${e.id}?variant=${v}&theme=${chosen}"></iframe></div>`)
    .join('');
  return page(
    `<h1>${escapeHtml(e.meta.name)} <span class="meta">${e.id} (${e.meta.level}-level)</span></h1>
     <p>${escapeHtml(e.meta.description)}</p>
     <p class="meta">Required: ${required.map((r) => `<code>${r}</code>`).join(' ') || 'nothing'} &middot; Settings: ${Object.keys(e.meta.settings).map((k) => `<code>${k}</code>`).join(' ')}</p>
     ${variants}${FIT}`,
    { theme: chosen, path: `/components/${e.id}` },
  );
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  const url = decodeURIComponent(parsed.pathname);
  const theme = parsed.searchParams.get('theme') || undefined;
  const variant = parsed.searchParams.get('variant') || undefined;

  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 500\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
  };

  try {
    if (url.startsWith('/brands/')) {
      const match = /^\/brands\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(.*))?$/.exec(url);
      if (!match) return send(404, page('<p>No such collection.</p>'));
      const [, collectionId, requested] = match;
      if (requested === undefined) {
        res.writeHead(302, { Location: `/brands/${collectionId}/` });
        return res.end();
      }
      const artifact = requested || 'index.html';
      // Only generated gallery artifacts are public, never source files or arbitrary paths.
      if (!/^(?:index\.html|gallery\.(?:css|js)|manifest\.json|[a-z0-9-]+\/(?:blocks|emails)\/[a-z0-9-]+\.html)$/.test(artifact)) {
        return send(404, page('<p>No such gallery file.</p>'));
      }
      const file = path.join(DIST_DIR, collectionId, 'gallery', artifact);
      if (!fs.existsSync(file)) return send(404, page(`<h2>Gallery not built</h2><p>Run <code>npm run gallery:brand -- ${escapeHtml(collectionId)}</code>, then refresh this page.</p>`));
      const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' }[path.extname(file)];
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(fs.readFileSync(file));
    }
    if (url === '/') return send(200, homePage());
    if (url === '/recipes') return send(200, recipesIndex());
    if (url === '/components') return send(200, componentsIndex(loadRegistry({ fresh: true })));

    if (url.startsWith('/recipes/')) {
      const html = recipePage(url.slice('/recipes/'.length), theme);
      return html ? send(200, html) : send(404, page(`<p>No such recipe.</p>`));
    }
    if (url.startsWith('/components/')) {
      const html = componentPage(loadRegistry({ fresh: true }), url.slice('/components/'.length), theme);
      return html ? send(200, html) : send(404, page(`<p>No such component.</p>`));
    }

    if (url.startsWith('/frame/')) {
      const { tokens, errors } = loadTokens();
      if (errors.length) return send(200, page(`<pre>${escapeHtml(errors.join('\n'))}</pre>`));
      const [, , kind, ...rest] = url.split('/');
      const id = rest.join('/');
      if (kind === 'recipe') {
        const { html, mjml, mjmlErrors } = await renderRecipe(id, undefined, tokens, { theme, fresh: true });
        const { errors: checkErrors, warnings } = runChecks(html, brand, mjml);
        return send(200, withBanner(html, id, [...mjmlErrors.map((e) => `mjml: ${e.formattedMessage || e.message}`), ...checkErrors.map((m) => `check: ${m}`), ...warnings.map((m) => `warning: ${m}`)]));
      }
      if (kind === 'component') {
        const { html, mjmlErrors } = await renderComponent(id, tokens, { theme, variant, fresh: true });
        return send(200, mjmlErrors.length ? withBanner(html, id, mjmlErrors.map((e) => `mjml: ${e.formattedMessage || e.message}`)) : html);
      }
      return send(404, page('<p>Unknown frame.</p>'));
    }

    const email = url.slice(1);
    if (!listEmails({ examples: true }).includes(email)) return send(404, page(`<p>No such email: ${escapeHtml(email)}</p>`));
    return send(200, await renderEmailPage(email, theme));
  } catch (err) {
    send(200, page(`<h2>Render failed</h2><pre>${escapeHtml(err.message)}</pre>`));
  }
});

let timer;
function scheduleReload() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const res of clients) res.write('data: reload\n\n');
  }, 100);
}
for (const dir of ['components', 'layouts', 'tokens', 'themes', 'sections', 'recipes', 'variables', ...EMAIL_DIRS, ...EXAMPLE_DIRS]) {
  const full = path.join(ROOT, dir);
  if (fs.existsSync(full)) fs.watch(full, { recursive: true }, scheduleReload);
}

server.listen(PORT, () => {
  const target = firstEmail ? `/${firstEmail}` : '/';
  console.log(`Previewing "${brand}" at http://localhost:${PORT}${target}  (Ctrl+C to stop)`);
});
