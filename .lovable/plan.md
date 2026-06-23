## Deliverable

A polished **enterprise-grade executive brief** for Crave'N Express (CX) — designed to hand to the owner/CEO of a small-to-mid courier company. Produced as both **`.docx`** (editable) and **`.pdf`** (sendable), saved to `/mnt/documents/` with a `<presentation-artifact>` preview.

## Look & Feel

- Institutional Fortune-500 memo style: Georgia serif body, justified, generous margins, section dividers.
- Crave'N orange (`#FF6A00`) accents for section headers, rules, and the CX wordmark.
- CX logo on cover + footer; "Crave'N Express — Powered by Crave'N, Delivered by Our Drivers" tagline.
- Cover, table of contents, numbered sections, footer with page numbers and `support@cravenusa.com`.

## Document Outline (≈10-12 pages)

1. **Cover** — CX logo, title "Crave'N Express Courier Partnership Brief", "Prepared for: [Courier Company]", date.
2. **Executive Summary** — one page: what CX is, who it's for, the partnership offer in 3 bullets.
3. **What is Crave'N Express** — short positioning: a dispatch + driver-network layer that lets independent courier companies post jobs and have them fulfilled by CX-vetted drivers (the Feeder network) without building their own dispatch tech or driver pool.
4. **How It Works — End-to-End Operation**
   - Courier creates a job in the CX portal (on-demand / scheduled / bulk route).
   - Job is dispatched: CX-priority window first to top-tier Feeders, then opens to the full driver pool, first-accept wins.
   - Driver picks up → in-transit tracking → proof of delivery → automatic payout.
   - 15-mile dispatch radius; Elite + Ultimate tier priority on company shipments.
   - Simple diagram (ASCII flow): Courier → CX Dispatch → Driver Pool → Customer → Settlement.
5. **Roles & Responsibilities** — clean two-column table:
   - **Courier provides**: customer relationship, pricing to end-client, job details, driver payout offer.
   - **Crave'N Express provides**: dispatch tech, vetted driver network, tracking, POD, payouts, support.
6. **The Economics — How Money Flows** (the core ask)
   - Per-job waterfall (worked example, $10.99 job):
     - Courier charges client: **$10.99**
     - Driver payout (set by courier): **$8.00** (≈73%)
     - CX platform base fee: **$2.99** (≈27%)
     - Courier gross margin on the job = client price − $10.99 (everything above is upside).
   - Subscription tiers table:
     - **CX Starter** — $49/mo · 100 jobs included · $0.75 overage
     - **CX Growth** — $149/mo · 500 jobs included · $0.50 overage
     - **CX Fleet** — $399/mo · 2,000 jobs included · $0.35 overage
   - Per-job base fee table: On-demand $2.99 · Scheduled $3.99 · Bulk route $4.99.
   - Plain-English margin summary: "You keep 100% of what you charge your client above the CX platform fee + driver payout. CX never touches your customer relationship or invoicing."
7. **Sample Monthly Scenarios** — three small P&L blocks (50, 250, 1,000 jobs/mo) showing courier revenue, driver cost, CX cost, courier net.
8. **Service Levels & Trust** — vetted drivers, background checks, tier system (rolling 60-day), forensics/GPS tracking, support coverage.
9. **Onboarding** — 4-step path: sign agreement → connect Stripe payout → set service area → first job live (typical: <72 hours).
10. **Why This Works for a Small-to-Mid Courier** — three short paragraphs: no tech build, variable cost model, instant overflow capacity.
11. **Next Steps & Contact** — clear CTA, contact line, signature block.

## Technical Approach

- Use the **docx skill** (`docx-js` via Node) to author the file at US Letter, Georgia body, Arial Black headers, orange (`#FF6A00`) accents, with real tables (DXA widths), bullet lists via `LevelFormat.BULLET`, footer with page numbers.
- Embed `src/assets/cx-logo.png` on the cover and in the footer via `ImageRun` (base64).
- Validate the `.docx`, then convert to PDF with LibreOffice (`run_libreoffice.py --convert-to pdf`).
- Render every PDF page to JPG with `pdftoppm` and visually QA each page (no overflow, no clipped tables, orange accents render, logo intact). Fix and re-render until clean.
- Save final files as:
  - `/mnt/documents/CraveN-Express-Courier-Partnership-Brief.docx`
  - `/mnt/documents/CraveN-Express-Courier-Partnership-Brief.pdf`
- Emit `<presentation-artifact>` tags for both.

## Out of Scope

- No code changes to the app.
- No changes to subscription pricing or fee structure (uses the existing numbers already in `cx_subscription_plans`).
- No customization of the recipient courier's name — left as `[Courier Company]` placeholder for you to fill in (easy edit in the .docx).

Approve and I'll generate both files and post the previews.