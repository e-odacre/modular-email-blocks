const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOKENS_DIR = path.join(ROOT, 'tokens');
const DIST_DIR = path.join(ROOT, 'dist');
const EMAIL_DIRS = ['flows', 'campaigns'];

function listBrands() {
  return fs
    .readdirSync(TOKENS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.basename(f, '.json'))
    .sort();
}

// Returns ids like "flows/welcome" for every .mjml file in flows/ and campaigns/.
function listEmails() {
  const emails = [];
  for (const dir of EMAIL_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full).sort()) {
      if (f.endsWith('.mjml')) emails.push(`${dir}/${path.basename(f, '.mjml')}`);
    }
  }
  return emails;
}

module.exports = { ROOT, TOKENS_DIR, DIST_DIR, EMAIL_DIRS, listBrands, listEmails };
