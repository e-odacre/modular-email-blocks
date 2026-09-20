# CLAUDE.md

Modular MJML email blocks for Klaviyo. See `README.md` for usage and `progress.md` for current status.

## Commands

- `npm run build` / `npm run build:brand -- <brand>` / `npm run preview -- <brand> <email>` / `npm test`
- Node scripts, not shell, because development is on Windows.

## Rules that are easy to get wrong

- **Two delimiter sets.** Nunjucks is `[[ ]]` / `[% %]` / `[# #]`. Klaviyo's `{{ }}` and `{% %}` are output, never build-time. Do not change the Nunjucks delimiters.
- **MJML silently drops Klaviyo tags between `mj-*` elements.** Wrap those in `<mj-raw>`. The build fails if a tag goes missing.
- **No token inheritance.** Every brand defines every key, validated against `tokens/placeholder.json`. Adding a token means adding it to `placeholder.json` and to every brand file.
- **Never invent brand values.** Unknown brand values stay marked in `_placeholders`. Building a non-placeholder brand fails until the list is empty.
- **Components read from `t`, never hard-code brand values.** Token values go into MJML attributes, so no double quotes in them.
- **Klaviyo tags must be checked against Klaviyo's docs**, not memory. `{% unsubscribe_link %}` goes in `href`, the bare `{% unsubscribe %}` does not.
- **Every component gets a header comment** on Outlook, Gmail and dark-mode limits, plus a row in the README table.
- `dist/` is gitignored. `mjml` and `nunjucks` are the only dependencies, keep it that way unless there is a strong reason.
