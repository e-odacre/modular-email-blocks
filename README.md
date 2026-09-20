# modular-email-blocks

Reusable email components, built with Nunjucks and MJML, for Klaviyo. One set of components, many brands: a brand is a token file.

```
Nunjucks (compose + inject tokens)  ->  MJML (compile to HTML)  ->  checks  ->  dist/<brand>/<flows|campaigns>/<email>.html
```

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install `mjml` and `nunjucks` (the only dependencies) |
| `npm run build` | Build every email for every brand in `tokens/` |
| `npm run build:brand -- <brand>` | Build one brand |
| `npm run preview -- <brand> <email>` | Live preview with auto-reload, e.g. `npm run preview -- placeholder flows/welcome` (port 3000, or set `PORT`) |
| `npm test` | Run the tests |

The build exits non-zero if any brand or email fails, so it can gate CI.

## Layout

```
tokens/<brand>.json      brand values: colors, fonts, logo, images, optional dark-mode values
components/*.njk         Nunjucks macros that emit MJML (header, hero, button, text-block, footer)
layouts/base.mjml        head, dark-mode CSS, body wrapper. Emails extend it.
flows/*.mjml             flow emails (welcome, ...)
campaigns/*.mjml         one-off campaigns
scripts/                 build, preview, token validation, output checks
dist/                    build output, gitignored
tests/                   node:test suites, including the Klaviyo-syntax fixture
```

Emails are `.mjml` files that go through Nunjucks first. `flows/welcome.mjml` is the reference example.

## Two template languages, two sets of delimiters

Klaviyo uses `{{ }}` and `{% %}`. So this repo's Nunjucks uses `[[ ]]` and `[% %]` (and `[# #]` for comments).

- `[[ t.colors.primary ]]` is a build-time token. It is replaced when you build.
- `{{ first_name|default:'there' }}` is a Klaviyo tag. It passes through to the output untouched.

Tokens are available in every template as `t`.

### Wrap Klaviyo conditionals in `<mj-raw>`

MJML **silently drops** Klaviyo tags it finds between `mj-*` elements, with no error even in strict mode. Do this:

```xml
<mj-raw>{% if person.first_name %}</mj-raw>
<mj-section>...</mj-section>
<mj-raw>{% endif %}</mj-raw>
```

Tags inside `mj-text`, in attributes like `href`, and inside `mj-button` are fine. The build compares Klaviyo tags before and after MJML and fails if any went missing, and `tests/klaviyo-syntax.test.js` pins the behavior.

## Brands and tokens

`tokens/placeholder.json` is the reference. Every other brand must define **every** key. There is no inheritance, so a default can never quietly fill a gap. Unknown keys are errors too, which catches typos.

To add a brand: copy `placeholder.json` to `tokens/<brand>.json`, replace every value, and empty the `_placeholders` list. Until then, building that brand fails, and it also fails while any value still points at `placehold.co` or `example.com`.

- `dark` is optional. Omit it and no dark-mode CSS is emitted. If present it must be complete.
- Values go into MJML attributes, so use single quotes inside font stacks, never double quotes.
- Tokens are JSON, so no comments.

## Klaviyo notes

Tags here were checked against Klaviyo's help center (message personalization reference, unsubscribe article).

- `{% unsubscribe_link %}` and `{% manage_preferences_link %}` give only a URL, use them inside `href`. The bare `{% unsubscribe %}` outputs a full link and breaks inside an `href`. The build fails on that.
- `{{ organization.full_address }}` comes from Klaviyo's organization settings. The build fails if it is missing.
- If Klaviyo finds no unsubscribe tag, it appends its own footer. The build fails first so you never rely on that.
- Delivery today is manual: build, then paste `dist/<brand>/.../<email>.html` into a Klaviyo custom HTML template. Full emails only. Body-only snippets for the hybrid editor can be added later without restructuring.

## Compatibility

Each component file starts with a comment on its known limits. Summary:

| Component | Outlook desktop | Gmail apps | Dark mode |
| --- | --- | --- | --- |
| header | Always shows the light logo | May auto-invert colors, use a logo that reads on both | Swaps to `dark.logoUrl` where honored |
| hero | Background image via VML fallback | Background images are cropped or blocked in places, keep the message in text | Keeps its own colors on purpose |
| button | Rounded corners render square | Fine | Swaps via `dm-button` where honored |
| text-block | Paragraph margins can differ slightly | Fine | Swaps via `dm-*` classes where honored |
| footer | Fine | Fine | Swaps via `dm-*` classes where honored |

Dark mode overall: `color-scheme` meta plus `prefers-color-scheme` CSS. Apple Mail and iOS Mail honor it. Gmail apps only partly (they may recolor on their own). Outlook desktop ignores it. Test light and dark in real clients before a brand goes live, the preview server shows the light version only.

## Adding a component

1. Create `components/<name>.njk` with a macro that emits MJML, and a header comment on its Outlook, Gmail and dark-mode limits.
2. Read colors, fonts and sizes from `t`. Never hard-code brand values.
3. Give surfaces and text `dm-*` css-classes (see `layouts/base.mjml`) if they should follow dark mode.
4. Import it in an email with `[% from "components/<name>.njk" import <macro> %]`.
5. Add a row to the table above.
