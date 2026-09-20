// Usage: node scripts/build.js [brand]
// With no brand, builds every brand in tokens/. Output goes to dist/<brand>/<flows|campaigns>/<name>.html.
const fs = require('fs');
const path = require('path');
const { DIST_DIR, listBrands, listEmails } = require('./lib/paths');
const { loadBrand } = require('./lib/tokens');
const { renderEmail } = require('./lib/render');
const { runChecks } = require('./lib/checks');

async function buildBrand(brand) {
  let failed = false;
  const { tokens, errors, placeholderIssues } = loadBrand(brand);
  const tokenProblems = [...errors, ...placeholderIssues];

  if (tokenProblems.length) {
    console.error(`\n${brand}: tokens/${brand}.json failed validation`);
    for (const p of tokenProblems) console.error(`  x ${p}`);
    return true;
  }

  console.log(`\n${brand}`);
  for (const email of listEmails()) {
    try {
      const { html, mjml, mjmlErrors } = await renderEmail(`${email}.mjml`, tokens);
      const { errors: checkErrors, warnings } = runChecks(html, brand, mjml);
      const problems = [...mjmlErrors.map((e) => e.formattedMessage || e.message), ...checkErrors];

      if (problems.length) {
        failed = true;
        console.error(`  x ${email}`);
        for (const p of problems) console.error(`      ${p}`);
        continue;
      }

      const out = path.join(DIST_DIR, brand, `${email}.html`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, html);
      console.log(`  ok ${email} -> ${path.relative(process.cwd(), out)}`);
      for (const w of warnings) console.warn(`      warning: ${w}`);
    } catch (err) {
      failed = true;
      console.error(`  x ${email}\n      ${err.message}`);
    }
  }
  return failed;
}

async function main() {
  const brands = listBrands();
  const requested = process.argv[2];
  if (requested && !brands.includes(requested)) {
    console.error(`Unknown brand "${requested}". Available: ${brands.join(', ')}`);
    process.exit(1);
  }

  let failed = false;
  for (const brand of requested ? [requested] : brands) {
    if (await buildBrand(brand)) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

main();
