const nunjucks = require('nunjucks');
const mjml2html = require('mjml');
const { ROOT } = require('./paths');

// [[ ]] and [% %] are ours. {{ }} and {% %} belong to Klaviyo and pass through untouched.
const NUNJUCKS_TAGS = {
  blockStart: '[%',
  blockEnd: '%]',
  variableStart: '[[',
  variableEnd: ']]',
  commentStart: '[#',
  commentEnd: '#]',
};

function createEnv(tokens) {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(ROOT, { noCache: true }), {
    autoescape: false,
    throwOnUndefined: true, // a typo'd token should fail the build, not render as empty
    tags: NUNJUCKS_TAGS,
  });
  env.addGlobal('t', tokens);
  return env;
}

function renderMjml(templatePath, tokens) {
  return createEnv(tokens).render(templatePath, {});
}

// templatePath is relative to the repo root, e.g. "flows/welcome.mjml".
async function renderEmail(templatePath, tokens) {
  const mjml = renderMjml(templatePath, tokens);
  const { html, errors } = await mjml2html(mjml, { validationLevel: 'strict', minify: false });
  return { html, mjml, mjmlErrors: errors || [] };
}

module.exports = { renderEmail, renderMjml, createEnv };
