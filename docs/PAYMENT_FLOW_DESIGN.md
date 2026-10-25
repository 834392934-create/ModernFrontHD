# Commercial licensing payment flow and verification

Date: 2026-10-26. Maintainer: ayuan (individual), 834392934@qq.com.

## Implementation

**USD 3,000–60,000 per project** is the quotation range. This version uses registration-free static pages, email-confirmed quotes, an Alipay collection code, and manual reconciliation. Simulated quotations, payment-success screens, and mock license issuance have been removed so a demonstration cannot be confused with an actual order state.

| Stage | Buyer action | Actual behavior |
| --- | --- | --- |
| Inquiry | Select a purpose and enter project name/email; budget and notes are optional | Prepare, copy, or download an email draft. The buyer sends it; no server stores it |
| Quote | Confirm the parties, scope, version, fees, and agreement | Privately establish a real order number, exact USD quote, settlement currency/amount, conversion basis, expiry, and delivery arrangements |
| Payment | Confirm a valid quote, reveal the original image, and scan | No automatic conversion, ordering, account lookup, or payment-success claim; contact the maintainer if currency/amount is unsupported |
| Delivery | Request reconciliation using the existing order | The maintainer checks actual receipt and delivers the agreed authorization/materials; count each transaction once |

[Inquiry source](payment/index.html) · [Payment instructions source](payment/pay.html) · [Commercial scope](COMMERCIAL_LICENSE.md) · [Reconciliation operations](PAYMENT_OPERATIONS.md)

For local preview, open the HTML directly, or run `npm start` in the repository root and visit `http://127.0.0.1:8765/docs/payment/index.html`. A GitHub HTML file view shows source and is not itself a hosted payment page. Public hosting status is recorded separately after deployment verification.

## Public hosting

On 2026-10-26, Sites reported a successful public deployment at [the inquiry website](https://modern-front-hd-ayuan.sunny-seal-5928.chatgpt.site/); payment instructions are at [/pay.html](https://modern-front-hd-ayuan.sunny-seal-5928.chatgpt.site/pay.html). This is static hosting, with no payment backend. GitHub Pages remains disabled because its [usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits#usage-limits) exclude sites primarily facilitating commercial transactions.

Sites project: `appgprj_6ade3912623c819193ef405f28b414a1`. Published source commit: `ad427b318df8cd6af3c0e3afab8eb3fc46d5f6e1`; version: `1`; deployment: `appgdep_6ade3a545d948191a9f65561e46e0e09`. The site source is maintained in a separate Sites checkout; it packages only the reviewed pages, original collection image, sitemap, and robots file. Links to licensing documents point to this GitHub repository. Reuse the existing Sites identity for updates; do not create another site.

The Windows packaging helper failed under local Node.js 24.14.0 during static-directory copying; the same helper completed under bundled Node.js 24.19.0. No plugin code or game files were changed to work around that failure.

Anonymous Microsoft Edge checks passed against the public URL: inquiry/payment interactions, four viewport widths, draft encoding, copying/downloading, and QR reset. Both pages and the original JPEG returned HTTP 200 without signing in. The public JPEG matched all 218120 source bytes and the recorded SHA-256. HTML retained the source markup with a Cloudflare hosting-layer script appended. A raw non-browser HTTP client received 403 from the hosting layer; normal anonymous browser access passed. These checks do not establish availability on every network or verify a funds transaction.

## User experience and data boundaries

- Only three initial fields are required. Budget bands indicate intent; they do not select fixed license packages or create an amount due.
- Confirm the exact settlement currency and amount in writing. Do not enter the USD quote as a CNY amount; there is no built-in exchange rate or claim of USD/international acceptance.
- Withdrawing quote confirmation or revisiting the payment page hides the QR code. This is a mistaken-payment prompt, not access control: the image itself is not a protected secret.
- Inputs are treated as text and encoded `mailto` parameters, not executable HTML. No third-party tracking, external fonts, registration, or automatic email sending is used.
- A reconciliation draft contains an order number and fields for the actual currency/amount, time, and transaction reference. It is neither a payment receipt nor a license.
- Preserve the original image. Recovery, refunds, and repeated delivery use the existing order; already debited orders must not be paid twice.
- No payment gate is added to game execution or eligible free use. Historical MIT and third-party licenses continue to apply independently.

## Verification procedure

1. Run `node --test tests/payment-pages.test.cjs`: the actual HTTP server must return pages, the correct JPEG MIME type and bytes, working relative links, and an unchanged historical MIT file.
2. Check widths of 320, 390, 768, and 1366 pixels in a browser: no horizontal overflow; correct quote/budget display, special-character handling, email encoding, copying, and downloading.
3. Confirm that the image is not loaded before quote confirmation, cancellation/reload resets it, and its size is 1200 × 1800. Blank order references must be rejected and editing an order must invalidate its previous draft.
4. Do not launch Alipay, send email, create real orders, or execute transactions during automated page checks. Channel suitability, the scanned payee, receipt of funds, and refunds require separate verification using the actual account.

If automatic payments are requested later, verify official enabled products and account eligibility before implementing server-side orders, amount validation, signed callbacks, active queries, and idempotent authorization. No unconfigured payment API is included now.

## Recorded local verification

On 2026-10-26, using local Node.js 24.14.0 and Microsoft Edge:

- `npm test`: **1037 passed, 0 failed, 0 skipped**, including payment-page HTTP regression coverage.
- Both pages passed at widths of 320, 390, 768, and 1366 pixels without horizontal overflow. Image dimensions, confirmation reset, blank input, special characters, copying/downloading, and draft invalidation passed, with no script errors or external network requests in the local-page checks.
- The actual `release/ModernFrontHD-3.16.0/ModernFrontHD.exe` launched with an isolated test profile. Menu and skirmish worked; simulation time advanced from 0.55 to 3.10 seconds. Version, packaged game-source hashes, and T-90M/AH-64/Burke model provenance/material assertions passed without page-script errors. This was a startup check, not a general visual-quality or performance guarantee.
- Local evidence: `.tmp/payment-browser-report.json`, `.tmp/payment-game-launch-report.json`, `.tmp/payment-npm-tests.log`, and accompanying screenshots. Runtime evidence is not committed to the public repository.

These results do not include actual payment, receipt of funds, refunds, USD acceptance, or payment-platform approval. They record the previous source verification; subsequent documentation-only translation does not claim a new game-runtime test.
