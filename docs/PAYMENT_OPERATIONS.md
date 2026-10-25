# Payment, reconciliation, and delivery

Public contact: **ayuan (individual)**, [834392934@qq.com](mailto:834392934@qq.com).

Public entry: [Inquiry website](https://modern-front-hd-ayuan.sunny-seal-5928.chatgpt.site/) and [payment instructions](https://modern-front-hd-ayuan.sunny-seal-5928.chatgpt.site/pay.html), hosted on Sites with public access.

ModernFrontHD commercial licensing is quoted at **USD 3,000–60,000 per project**. This repository includes the [inquiry page](payment/index.html), [Alipay instructions](payment/pay.html), and [agreement template](COMMERCIAL_AGREEMENT_TEMPLATE.md). These static pages do not provide a payment API, server-side orders, automatic reconciliation, or automatic delivery. No actual funds transaction has been tested. GitHub HTML file views display source; locally, use `npm start` and open `/docs/payment/index.html`.

## Order procedure

1. The buyer provides intended use, project name, and email, optionally a budget and notes. The page prepares an email draft for the buyer to send; it does not automatically send messages or store customer information.
2. The maintainer checks rights in the deliverables and confirms the parties, version, use, modification/distribution scope, duration, support, acceptance, refunds, and receipt arrangements. Historical MIT and third-party rights remain unchanged; unlicensed content must not be promised as cleared for commercial distribution.
3. Issue a unique order number and written agreement specifying the **exact USD quote, actual settlement currency and exact amount due, responsibility for taxes/fees, and expiry**. For cross-currency settlement, record the agreed conversion basis and determination time. Do not substitute a floating webpage rate for an agreed amount.
4. After confirmation, the buyer scans the code and checks the actual Alipay payee, currency, and amount. CNY settlement uses the agreed CNY amount, not the USD number. USD, international, and particular high-value payments are unverified. If unsupported, stop and agree on a suitable method; do not split payments to evade limits.
5. The maintainer checks actual collection records against the account, transaction number, amount, currency, and order. Screenshots, button clicks, and reconciliation emails are not proof of receipt. Resolve mismatched amounts before issuing a license; handle additional payment or refund under the agreement.
6. Count each transaction once and issue each order's agreed authorization once. Send the license, delivery schedule, version/file hashes, and receipt to the confirmed email and perform agreed acceptance. Re-delivery uses the existing order and must not trigger duplicate charges. Actual sending is performed by the maintainer or separately authorized.

## Collection image and capabilities

The supplied original Alipay image carries a business/merchant marker. Its display name is transcribed as **Chi hao he hao chang sheng bu lao** (literal meaning: "Eat well, drink well, live long"). These English words are only a reference translation/transcription; the original image and scanned account information remain authoritative for comparison. The image is shown after quote confirmation. It is not an order and does not encode this project's price or licensed scope. The display name is not a verified legal identity; compare the actual scanned result against the payee in the written agreement.

Before the first transaction, use the account's actual product information to confirm suitability for the parties, business category, remote transaction, and amount. A collection code and API integration are different capabilities; a QR code does not establish automatic query permissions. Consult [Alipay's official integration information](https://open.alipay.com/operatingGuide.htm) and [merchant center](https://ms.alipay.com/signing/home.htm); the account's enabled products determine actual availability.

The QR image is the original JPEG: 1200 × 1800 pixels, 218120 bytes. SHA-256: `56e07e92fc85161b74fa587afe50f3b14236af8f781e5b676a2065ab99646e53`. Browser loading and matching hashes establish file integrity, not a completed funds-flow test.

## Ledger and exceptions

Keep order numbers, parties, purpose/scope, version, USD quote, settlement currency/amount, conversion basis, expiry, transaction numbers, receipt time, license number, delivery hashes, acceptance, and refund status in **private business records**. Customer information, payment screenshots, signed agreements, and complete transaction records must not enter the public Git repository.

| Situation | Action |
| --- | --- |
| Debited but no response | Request reconciliation for the existing order; do not pay again |
| Unmatched order, underpayment, or overpayment | Keep pending verification and contact the parties; do not issue incorrectly |
| Repeated notification for one transaction | Check the unique transaction number; do not count or issue twice |
| Payment received but delivery failed | Preserve paid status and retry delivery; do not require another purchase |
| Refund requested | Follow the agreement and applicable requirements, preferably through the original channel; record actual results. A request is not a completed refund |
| Channel cannot support the order | Stop and agree on a supported method; do not claim unverified USD/international/high-value collection capabilities |

Actual funds testing requires the user's explicit confirmation of a transaction; do not transfer funds merely to test the page. If automation is later requested, use the officially enabled products to implement server-side orders, signature checks, active queries, and idempotent delivery. A client-side success redirect cannot replace reconciliation.
