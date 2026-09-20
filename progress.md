# Progress

_Last updated: 2026-09-20_

## Status

The component library from the brief is built and tested, but **uncommitted** (working tree on `main`, last commit `965b79f`). Only the placeholder brand exists, on purpose.

- `npm test`: 279 tests, all passing
- `npm run build`: builds `flows/welcome.mjml` (recipe-driven) and `examples/summer-collection.mjml` for the placeholder brand
- `npm run build:themes`: every email in all 13 themes, all pass
- `npm run docs:check`: generated docs and the README compatibility table are current
- Dependencies are still only `mjml` and `nunjucks`

See `README.md` for usage, `docs/` for the guides (start at `docs/README.md`), `docs/coverage.md` for where each item of the original brief lives, and `CLAUDE.md` for the rules that are easy to get wrong.

## What exists

- **116 components, 369 variants** in 16 categories: layout 12, content 14, hero 5, commerce 6, promotional 13, social-proof 4, features 6, editorial 8, saas 10, events 3, faq 1, comparison 6, stats 3, logos 1, decorative 11, email 13. Each is a `.njk` template plus a `.meta.js` (fields, settings, variants, responsive, preview data, compat).
- **13 themes** (style-only, complete, no inheritance): minimal, luxury, editorial, bold, playful, ecommerce, saas, wellness, fashion, christmas, black-friday, valentines, summer.
- **11 sections and 12 recipes**: welcome, abandoned-cart, product-launch, sale, black-friday, newsletter, event, saas-feature-launch, post-purchase, review-request, win-back, back-in-stock.
- **Design tokens** expanded: 15 colors, 13 typography levels, spacing, radius, shadow scales.
- **Remix**: `npm run remix` (theme, variant and setting overrides), `remixNodes()` in `scripts/lib/remix.js`.
- **Variables registry** `variables/klaviyo.json`, each tag marked verified (with source) or not.
- **Tooling**: preview gallery with theme switcher (`/components`, `/recipes`), `new:component`, `new:theme`, docs generator.

## Decisions made while building

- **Themes are style-only.** Chosen with Evan: they override type/spacing/radius/shadow scales and pick brand color roles, but never carry colors or fonts. Seasonal themes therefore differ by decoration and emphasis, not palette.
- **Variants are setting overrides**, so switching variant never changes data or structure. Items the brief lists separately but that share a structure are variants (reverse-split hero, 2/3/4-feature, trusted-by/press logos, pill/tag badges), see `docs/coverage.md`.
- **Recipes and sections produce nodes, not markup**, which is what makes remix possible.
- **`examples/`** is built for the placeholder brand only, because it uses placeholder images and example.com links that the build gate rejects for real brands.
- **Klaviyo cart variables are platform dependent.** Klaviyo's own pages show two shapes (`item.product.title` and `item.title`). The registry uses the Shopify ones and says to copy exact names from the event preview. `cart.checkout_url` is unconfirmed and marked unverified.
- Verified against Klaviyo's docs this session: `{% web_view_link %}`, `{% render_variable preview_text %}`, `{% coupon_code 'Name' %}`, `{% current_year %}`, `{% today %}` with `days_later`, `event.extra.line_items` for the cart loop.

## Not verified yet

- **No real email client testing.** Nothing has been opened in Outlook, Gmail or Apple Mail. Every dark-mode `dm-*` selector, every mobile media-query behavior (`mobileColumns`, `mobileAlignment`, `hideOnMobile`, reversed columns) and the VML button and backgrounds were checked by reading generated HTML and MJML strict validation only. Layouts have not been looked at in a browser or client either.
- **Never pasted into Klaviyo.** Delivery by manual paste of custom HTML from `dist/` is still an assumption.
- Klaviyo tags were checked against help center pages, not a Klaviyo account.
- Countdown and product carousel are static approximations, see `docs/limitations.md`.
- `welcome` (85 KB) and `black-friday` (81 KB) recipes are near Gmail's ~102 KB clip with only preview content.

## Open items

- Commit this work. Nothing from this session is committed.
- Per-brand flow content (copy and images) needs a home, probably `content/<brand>/<email>.json`. Recipes take data, so a JSON file per email fits. Not needed until there is a second brand.

## Next

1. Paste `dist/placeholder/examples/summer-collection.html` and `dist/placeholder/flows/welcome.html` into a Klaviyo custom HTML template and send tests to Gmail, Outlook and Apple Mail, light and dark. Fix any `dm-*` selector or mobile behavior that doesn't take, and correct the `compat` notes.
2. Look at the gallery (`npm run preview`, `/components`) and the themes in a browser: spacing and proportions were never reviewed by eye.
3. Real brand token files (`mc.json`, `sanecotec.json`, `agency.json`) once Evan has assets. Empty `_placeholders` only when every value is real.
4. Confirm the Klaviyo event variables against a real Started Checkout and Placed Order event, and mark them verified.
5. Trim output size if real content pushes emails toward the Gmail clip (typography attributes are the main cost).

## Environment

- Node v23.11.0, npm 11.12.1, `mjml` 5.4.1 (async), `nunjucks` 3.2.4
- Windows 11, PowerShell primary
