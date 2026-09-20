// Usage: node scripts/preview.js [brand] [email]   e.g. npm run preview -- placeholder flows/welcome
// Serves emails rendered live from source and reloads the browser when a source file changes.
// Nothing is written to dist/. Placeholder-token problems are warnings here, hard errors in the build.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROOT, EMAIL_DIRS, listBrands, listEmails } = require('./lib/paths');
const { loadBrand } = require('./lib/tokens');
const { renderEmail } = require('./lib/render');
const { runChecks } = require('./lib/checks');

const PORT = Number(process.env.PORT) || 3000;
const brand = process.argv[2] || 'placeholder';
const firstEmail = process.argv[3];

if (!listBrands().includes(brand)) {
  console.error(`Unknown brand "${brand}". Available: ${listBrands().join(', ')}`);
  process.exit(1);
}

const RELOAD_SCRIPT = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;
const clients = new Set();

function page(body) {
  return `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;margin:2rem">${body}${RELOAD_SCRIPT}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

async function renderPage(email) {
  const { tokens, errors, placeholderIssues } = loadBrand(brand); // re-read each time so token edits show up
  if (errors.length) {
    return page(`<h2>tokens/${brand}.json is invalid</h2><pre>${escapeHtml(errors.join('\n'))}</pre>`);
  }
  const { html, mjml, mjmlErrors } = await renderEmail(`${email}.mjml`, tokens);
  const { errors: checkErrors, warnings } = runChecks(html, brand, mjml);

  const notes = [
    ...placeholderIssues.map((m) => `placeholder: ${m}`),
    ...mjmlErrors.map((e) => `mjml: ${e.formattedMessage || e.message}`),
    ...checkErrors.map((m) => `check: ${m}`),
    ...warnings.map((m) => `warning: ${m}`),
  ];
  if (notes.length) console.warn(`\n${email}\n  ${notes.join('\n  ')}`);
  const banner = notes.length
    ? `<div style="font:12px monospace;background:#fff3cd;padding:8px;white-space:pre-wrap">${escapeHtml(notes.join('\n'))}</div>`
    : '';
  return html.replace(/<body[^>]*>/i, (m) => `${m}${banner}`).replace('</body>', `${RELOAD_SCRIPT}</body>`);
}

function indexPage() {
  const links = listEmails().map((e) => `<li><a href="/${e}">${e}</a></li>`).join('');
  return page(`<h2>${brand}</h2><ul>${links || '<li>No emails yet. Add a .mjml file to flows/ or campaigns/.</li>'}</ul>`);
}

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

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

  if (url === '/') return send(200, indexPage());

  const email = url.slice(1);
  if (!listEmails().includes(email)) return send(404, page(`<p>No such email: ${escapeHtml(email)}</p>`));
  try {
    send(200, await renderPage(email));
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
for (const dir of ['components', 'layouts', 'tokens', ...EMAIL_DIRS]) {
  const full = path.join(ROOT, dir);
  if (fs.existsSync(full)) fs.watch(full, { recursive: true }, scheduleReload);
}

server.listen(PORT, () => {
  const target = firstEmail ? `/${firstEmail}` : '/';
  console.log(`Previewing "${brand}" at http://localhost:${PORT}${target}  (Ctrl+C to stop)`);
});
