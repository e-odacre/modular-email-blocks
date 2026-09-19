# Progress

_Last updated: 2026-09-20_

## Status

**Step 2 of 5 done: proposal made, waiting for Evan's OK. No code has been written yet.**

Kickoff order:
1. ~~Ask questions~~ done
2. ~~Propose folder structure and build approach~~ done, **awaiting approval**
3. Set up project and the first token file (next)
4. Build header, hero, button, text-block, footer, then one sample layout end to end
5. Add other brands and more components

## Answers from Evan

- **First brand:** placeholder only (neutral brand, no real brand yet)
- **Brand assets:** none yet, so use marked placeholders (neutral palette, web-safe fonts, placeholder logo). Don't invent brand values.
- **Klaviyo usage:** both custom HTML templates and the hybrid editor
- **Existing `email-designs` repo:** plain `mjml` CLI, no custom build to mirror
- **Delivery to Klaviyo:** assumed manual paste from `dist/` (not explicitly confirmed). API upload is deferred.

## Proposed approach (pending approval)

**Two-stage build: Nunjucks, then MJML, then checks.**
- Nunjucks handles composition and token injection. Components are macros and layouts use `extends`/blocks.
- `mjml` compiles the result to HTML.
- Checks run on the output.

**Nunjucks uses custom delimiters** (`[[ ]]` for variables, `[% %]` for tags). Klaviyo uses `{{ }}` and `{% %}`, so any `{{ }}` or `{% %}` in a source file is a Klaviyo tag and must pass through untouched.

**MJML gotcha:** Klaviyo `{% if %}` blocks between `mj-*` elements get mangled by the MJML parser. Wrap them in `<mj-raw>`. Add a fixture test that compiles a file full of Klaviyo syntax and asserts the tags survive.

### Structure

```
tokens/
  placeholder.json         # neutral palette, web-safe fonts, placehold.co logo
  (mc.json, sanecotec.json, agency.json added later)
components/                # Nunjucks macros emitting MJML
layouts/                   # base.mjml (head, dark-mode CSS, body wrapper) + skeletons
flows/                     # welcome.mjml etc., extend a layout
campaigns/                 # separate from flows
scripts/                   # build.js, preview.js, checks
dist/<brand>/<email>.html  # gitignored
```

### Decisions

- **No token inheritance or merging.** Every brand must define every key, validated against `placeholder.json`. This stops defaults silently filling gaps.
- **Placeholder check:** each token file has `"_placeholders": ["colors.primary", "logo.url", ...]`. Building any brand other than `placeholder` fails while that list is non-empty. It also flags `placehold.co` and `example.com` URLs as a backstop against drift.
- **Dependencies:** `mjml` and `nunjucks` only. The preview server is a small built-in Node script (`http` + `fs.watch` + auto-reload).
- **Scripts:** `npm run build`, `npm run build:brand -- <brand>`, `npm run preview -- <brand> <email>`. Node scripts, not shell, because the machine is Windows.
- **Dark mode:** `color-scheme` meta plus `prefers-color-scheme` CSS, with optional dark tokens (colors and a dark logo). Outlook desktop ignores it and the Gmail apps only partially honor it. Document this per component.
- **Compatibility notes:** each component gets a header comment on its known Outlook, Gmail and dark-mode limits, plus a summary table in the README. Examples: rounded buttons render square in Outlook desktop, and the hero background needs a VML fallback.
- **Klaviyo footer and unsubscribe tags:** must be verified against Klaviyo's current docs before the footer is written. Don't rely on memory.
- **Hybrid editor:** full emails go in as custom HTML first. Exporting body-only component snippets can be added later without restructuring.
- **`dist/` is gitignored** because it's reproducible.

## Open items for Evan

- OK the structure and approach above, or request changes. Two things to confirm in particular:
  - `dist/` gitignored or committed
  - JSON token format (no comments allowed in token files)
- Later: per-brand flow content (copy and images) needs a home, probably `content/<brand>/<email>.json`. Not needed yet.

## Environment

- Node v23.11.0, npm 11.12.1
- Windows 11, PowerShell primary
- Repo had no commits before this file. Only `progress.md` exists.

## Next session

1. Get Evan's OK, or adjust the proposal.
2. Fetch Klaviyo's current docs for the required footer and unsubscribe tags.
3. Scaffold: `package.json`, `.gitignore`, `tokens/placeholder.json`, `scripts/build.js`, the placeholder check and the Klaviyo-syntax fixture test.
4. Build the components (header, hero, button, text-block, footer) and one sample layout.
5. Write the README and `CLAUDE.md`.
