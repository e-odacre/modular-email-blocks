# Progress

_Last updated: 2026-09-20_

## Status

**Steps 3 and 4 of 5 done. Steps 3 and 4 are built and tested but not yet committed.**

Kickoff order:
1. ~~Ask questions~~ done
2. ~~Propose folder structure and build approach~~ done, approved by Evan
3. ~~Set up project and the first token file~~ done
4. ~~Build header, hero, button, text-block, footer, then one sample layout end to end~~ done (`flows/welcome.mjml`)
5. Add other brands and more components (next)

## What exists

- `package.json` with `mjml` 5.4.1 and `nunjucks` 3.2.4 (MJML 5 is async, the build awaits it)
- `tokens/placeholder.json`: neutral palette, web-safe fonts, placehold.co images, dark-mode values
- `layouts/base.mjml`: head, `color-scheme` meta, dark-mode CSS (only when a brand has `dark` tokens)
- `components/`: header, hero, button, text-block, footer, each with a compatibility comment
- `flows/welcome.mjml`: reference email using all five components
- `scripts/`: `build.js`, `preview.js`, `lib/` (tokens, render, checks, paths)
- `tests/`: 17 tests, all passing. Includes the Klaviyo-syntax fixture.
- `README.md` (usage, compatibility table) and `CLAUDE.md` (conventions)

## Decisions made while building

- **Output path is `dist/<brand>/<flows|campaigns>/<name>.html`**, one level deeper than proposed, so a flow and a campaign can share a name.
- **MJML drops bare Klaviyo tags with no error, even at `strict`.** Confirmed by experiment. So the wrap-in-`<mj-raw>` rule alone is not enough, since nobody sees the failure. The build now compares Klaviyo tags before and after MJML and fails on any missing one (`findDroppedTags` in `scripts/lib/checks.js`).
- **Klaviyo footer tags verified against Klaviyo's help center:** `{% unsubscribe_link %}` in an `href` (bare `{% unsubscribe %}` breaks in link fields), `{% manage_preferences_link %}`, `{{ organization.full_address }}`. Build checks enforce the unsubscribe tag, the address, and no bare `{% unsubscribe %}` in an `href`.
- **`dark` tokens are optional as a group**, complete if present.
- **Preview** treats placeholder-token problems as a warning banner, so an unfinished brand can still be previewed. Build treats them as errors.
- Output checks also warn on size over 102 KB (Gmail clipping) and images with no alt.

## Verified

- `npm test`: 17 of 17 pass
- `npm run build`: placeholder builds, all Klaviyo tags present in output, VML hero fallback present, dark-mode meta and CSS present
- Unfinished brand (copy of placeholder) fails the build with exit 1 and a clear list
- Bare `{% if %}` in a flow fails the build with exit 1
- Preview server serves the index, an email with the reload script, and a 404

## Not verified

- **No real email client testing.** Nothing has been opened in Outlook, Gmail or Apple Mail, and the dark-mode CSS has not been seen in a client. The `dm-*` selectors were written against MJML's output structure but only checked by reading the HTML.
- **Never pasted into Klaviyo.** The delivery flow (manual paste of custom HTML) is still an assumption.
- The Klaviyo docs check used search and page summaries, not a Klaviyo account.

## Open items for Evan

- Commit this work? Nothing from steps 3 and 4 is committed yet.
- Per-brand flow content (copy and images) needs a home, probably `content/<brand>/<email>.json`. Not needed until there is a second brand.

## Next session

1. Real brand token files (`mc.json`, `sanecotec.json`, `agency.json`) once Evan has assets. Until then they don't exist, on purpose.
2. Test `dist/placeholder/flows/welcome.html` in a real Klaviyo custom HTML template and in Outlook, Gmail and Apple Mail, light and dark. Fix any `dm-*` selector that doesn't hit.
3. More components: product grid, two-column, divider, social row, and a campaign layout.
4. Decide on the content home once a second brand exists.

## Environment

- Node v23.11.0, npm 11.12.1
- Windows 11, PowerShell primary
