*FENITECH LLC — PRODUCT REQUIREMENTS DOCUMENT*

# Ledgerly

### A unified rent collection, leasing, and maintenance platform for independent landlords and small property management companies

Ledgerly consolidates rent collection, leasing, tenant screening, maintenance, and owner accounting into one platform aimed at the underserved 1–150 unit segment — independent landlords and small property management companies currently stitched together with spreadsheets, Venmo, and free-tier tools. This PRD scopes a four-phase build, from MVP rent collection through AI-assisted operations, for handoff to Antigravity.

|  |  |
| --- | --- |
| Document Version | 1.0 (Draft — pending scope sign-off) |
| Owner | Ash — Fenitech LLC |
| Engineering Team | Antigravity |
| Target Platform | Responsive web (Phase 1–2); native iOS/Android (Phase 3) |
| Primary Market | Independent landlords and small PM companies, 1–150 units |
| Related Products | None — standalone Fenitech commercial SaaS product |
| Status | Draft for review |


---


## 1. Executive Summary

Ledgerly is a cloud property management platform built for the independent landlord and small property management company — the segment sitting between free, feature-limited tools (TurboTenant, Avail) and expensive enterprise platforms (AppFolio, Yardi, RealPage) built for portfolios in the thousands of units. The wedge is a single platform covering rent collection, leasing, screening, maintenance, and owner accounting at flat, predictable per-unit pricing with no ACH fees passed to the landlord as a surprise.

The build is phased so a working, revenue-capable product exists as early as possible: Phase 1 ships core rent collection, tenant/owner portals, maintenance tracking, and e-signed leases. Phase 2 adds leasing and tenant screening. Phase 3 adds accounting depth, compliance-grade trust accounting, and native mobile apps. Phase 4 adds AI-assisted operations and scale features. Each phase is independently sellable, which lets Fenitech get a paying pilot customer as early as the end of Phase 1.

This is a commercial SaaS build (not a fine-tuned model product): React/Next.js frontend, FastAPI backend, PostgreSQL, Clerk auth, Stripe Connect + Plaid for payments, and a third-party tenant screening API. Any AI features in Phase 4 call a hosted LLM API rather than requiring local fine-tuning or GPU infrastructure.

## 2. Problem Statement & Business Case

### 2.1 The problem

There are roughly 14 million individual landlords in the United States, and the large majority still run their operations on spreadsheets, paper leases, Venmo/Zelle for rent, and text messages for maintenance requests. This is slow, error-prone, and creates real legal exposure around security deposit handling, screening compliance (FCRA), and lease documentation.

The software that does exist splits into two poorly-fitting tiers. Free or near-free tools (TurboTenant, Avail) shift costs onto tenants via per-transaction fees and cap features. Enterprise platforms (AppFolio, Yardi Breeze, RealPage, Buildium at scale) are priced and built for portfolios far larger than a landlord managing 5–50 units, or a small PM company running 50–150 units for a handful of owner-clients — the operational and pricing complexity outpaces what that segment needs.

### 2.2 Market context

The global property management software market was estimated at roughly $3.6–$26.5 billion in 2025 depending on scope of the estimate (residential SaaS vs. broader PMS categories), with multiple independent forecasts projecting continued high-single-digit to double-digit CAGR growth through 2033–2034, driven by cloud adoption and continued digitization of a historically manual industry.

Competitively, the market is bifurcating exactly along the line described above: entry-level/free tools with fee-shifting economics on one side (TurboTenant, Avail, Innago), and platforms explicitly positioning around predictable flat per-unit pricing with no ACH fees as the differentiator for the small-portfolio segment on the other (e.g. Shuk Rentals at a flat $5/unit/month with no ACH fees). That flat-pricing-with-full-features positioning is validated market signal for the wedge Ledgerly should occupy.

### 2.3 Why now

- **Payments infrastructure is commodity — **Stripe + Plaid make ACH collection, bank verification, and Connect-based owner payouts a solved integration problem rather than a build-from-scratch banking relationship.
- **Screening is API-accessible — **TransUnion SmartMove and Checkr both expose tenant screening (credit, criminal, eviction, identity) via API, removing what used to require a direct bureau relationship.
- **Tenant/owner expectations have shifted — **mobile-first rent payment, maintenance requests, and real-time communication are now baseline expectations, not differentiators, which raises the floor for any new entrant but also means a clean modern app has an immediate UX edge over aging incumbent UIs (Propertyware, Rent Manager).

## 3. Goals & Non-Goals

### 3.1 Goals

- **G1 — **Ship a working Phase 1 (rent collection, portals, maintenance, e-signed leases) that a real landlord or small PM company can run their operations on, not a demo.
- **G2 — **Keep pricing and integration choices aligned with the 1–150 unit segment — flat, predictable, no fee-shifting tricks — as the core competitive positioning.
- **G3 — **Build compliance in as a first-class concern, not an afterthought: FCRA-compliant screening flows, NACHA-compliant ACH authorization, and state-aware trust accounting for security deposits.
- **G4 — **Design the data model and payments architecture (Stripe Connect) to support the property-manager-on-behalf-of-multiple-owners case from day one, even though Phase 1 ships the simpler owner-operator case first.

### 3.2 Non-goals (v1–v3)

- Commercial/office/industrial property management — residential (single-family and small multifamily) only through Phase 3.
- HOA-specific workflows (violation tracking, board voting, assessments) — out of scope; that is a materially different product.
- Enterprise-scale multifamily features (unit-level revenue management, call center integrations, institutional investor reporting) — explicitly the incumbents' territory, not the wedge.
- In-house tenant screening bureau relationship — always via a third-party API (TransUnion SmartMove or Checkr), never building direct credit bureau integration.
- Local/fine-tuned LLM infrastructure — any AI feature (Phase 4) calls a hosted API; this is a commercial SaaS build, not a model-training project.

## 4. Users & Use Cases

### 4.1 Personas

| Persona | Description | Primary needs |
| --- | --- | --- |
| Independent Landlord | Owns and self-manages 1–25 units, often alongside a full-time job | Fast rent collection, simple maintenance tracking, don't want to think about accounting |
| Small PM Company Staff | Manages 25–150 units across several owner-clients, 1–5 staff | Multi-owner trust accounting, owner statements, vendor coordination, applicant screening |
| Tenant | Rents a unit managed on the platform | Easy rent payment, maintenance requests, lease/document access, minimal friction |
| Property Owner / Investor | Owns units managed by a PM company customer, not a direct platform buyer | Transparent statements, on-time distributions, visibility without needing to log in constantly |
| Vendor / Contractor | Performs maintenance work assigned through the platform | Clear work orders, photos, ability to quote and invoice |

### 4.2 Core use cases (by phase)

- **Phase 1 — **“As a landlord, I want tenants to pay rent online via ACH or card, get automatic late fee application, and see all my properties' income/expenses in one dashboard.”
- **Phase 2 — **“As a landlord, I want to list a vacancy, collect applications, screen an applicant's credit/criminal/eviction history, and generate a lease for e-signature — without leaving the platform.”
- **Phase 3 — **“As a small PM company, I want security deposits held in a compliant trust ledger per owner, automatic monthly owner statements and distributions, and a mobile app so my one maintenance coordinator can manage work orders from the field.”
- **Phase 4 — **“As a landlord, I want a maintenance request auto-triaged and routed to the right vendor, and I want to ask a plain-English question about my portfolio's cash flow and get an answer.”

## 5. Product Behavior & Interface Spec

### 5.1 Core surfaces

- **Owner/PM Dashboard — **portfolio-level view: occupancy, rent collected vs. outstanding, open maintenance requests, upcoming lease renewals/expirations.
- **Property/Unit Manager — **CRUD for properties, units, and leases; document storage per property/unit.
- **Tenant Portal — **pay rent (one-time or autopay), view payment history, submit/track maintenance requests, view lease and shared documents, messaging with landlord/PM.
- **Owner Portal (Phase 3) — **read-only statements, distribution history, document access — for the property owner who is a client of a PM company, not the platform's direct buyer.
- **Vendor Portal (Phase 3) — **assigned work orders, photo upload, quote submission, invoice submission.
- **Admin/Ops Console — **internal Fenitech tooling for support, plan management, and compliance auditing (not customer-facing).

### 5.2 Core data entities

| Entity | Key fields | Notes |
| --- | --- | --- |
| Organization | id, name, plan_tier, owner_user_id | Top-level tenant boundary; a landlord or a PM company |
| Property | id, org_id, address, type, unit_count | Single-family = 1 property/1 unit; multifamily = 1 property/N units |
| Unit | id, property_id, bed/bath, market_rent | Belongs to exactly one property |
| Lease | id, unit_id, tenant_ids[], start/end, rent_amount, deposit_amount, status | Drives rent schedule and renewal reminders |
| TenantProfile | id, user_id, contact_info, screening_report_id (nullable) | A person can be tenant on multiple leases over time |
| Application | id, unit_id, applicant_id, status, screening_result | Feeds the screening/decision workflow (Phase 2) |
| Payment | id, lease_id, amount, method, stripe_payment_intent_id, status | One row per charge attempt, including failures/retries |
| MaintenanceRequest | id, unit_id, tenant_id, category, status, vendor_id (nullable) | Status machine: submitted → triaged → assigned → in_progress → resolved |
| TrustLedgerEntry | id, org_id, owner_id, property_id, type, amount | Phase 3 — append-only ledger, never a mutable balance field |

### 5.3 Example object shape — Payment

```json
{
  "id": "pay_8f2c1a",
  "lease_id": "lease_44f0",
  "amount_cents": 185000,
  "currency": "usd",
  "method": "ach",
  "stripe_payment_intent_id": "pi_3P...",
  "status": "succeeded",
  "late_fee_applied_cents": 0,
  "due_date": "2026-08-01",
  "paid_at": "2026-07-30T14:02:11Z"
}
```

### 5.4 Example object shape — Maintenance Request

```json
{
  "id": "mr_11a0",
  "unit_id": "unit_5c",
  "tenant_id": "user_991",
  "category": "plumbing",
  "description": "Kitchen faucet leaking under sink.",
  "photos": ["https://.../photo1.jpg"],
  "status": "assigned",
  "priority": "normal",
  "vendor_id": "vendor_02",
  "created_at": "2026-07-04T09:15:00Z"
}
```

## 6. Third-Party Integrations

All integrations below were verified as currently offering API-based access as of this PRD's research (July 2026); confirm current terms and pricing with each vendor before contracting, as fee structures and partner-approval requirements shift.

| Function | Vendor | Notes |
| --- | --- | --- |
| Rent payments (ACH + card) | Stripe (Payment Intents API, Connect) | Connect is required, not optional, once a PM company collects on behalf of multiple owners — routes tenant payment through platform to owner payout while keeping funds separable |
| Bank account verification | Plaid (Auth + Link) | Instant verification for most major banks; falls back to micro-deposits for unsupported institutions |
| Income verification (optional, Phase 2+) | Plaid Income | Cash-flow-based income signal as a supplement to, not replacement for, credit/screening data |
| Tenant screening | TransUnion SmartMove (TenantScreening API) or Checkr | Credit, criminal, eviction, identity; must run FCRA-compliant consent and adverse-action flows regardless of vendor |
| E-signature | DocuSign or Dropbox Sign (HelloSign) API | Lease execution; store signed envelope ID and completion certificate with the Lease record |
| Email / SMS notifications | SendGrid / Twilio | Rent reminders, late notices, maintenance updates |
| Accounting export | QuickBooks Online API | Phase 3 — sync chart of accounts and transactions, do not attempt to replace QBO for customers who already use it |
| Listing syndication | Apartments.com, Zillow Rental Manager | Zillow's syndication access for third-party platforms is partner-gated and not a self-serve public API — scope a manual/CSV export path as the reliable fallback and pursue partner approval in parallel |

## 7. Technical Approach & Stack

- **Frontend — **React (Next.js), Tailwind, deployed as a single responsive web app covering landlord/PM, tenant, and owner surfaces via role-based routing.
- **Backend — **FastAPI (Python), consistent with Fenitech's existing stack conventions; REST + webhooks for Stripe/Plaid/screening/e-sign callbacks.
- **Database — **PostgreSQL with row-level security scoped by org_id for multi-tenant isolation; append-only ledger tables for anything touching money (Payment, TrustLedgerEntry) — never update-in-place a balance.
- **Auth — **Clerk, with organization/role model mapped to Organization + role (owner, staff, tenant, vendor).
- **File storage — **S3-compatible object storage for leases, photos, signed documents; Supabase Storage is an acceptable managed option if already in use elsewhere in the stack.
- **Background jobs — **Celery + Redis (or equivalent) for rent reminders, late fee application, recurring charge scheduling, and screening/e-sign webhook processing.
- **AI features (Phase 4 only) — **hosted LLM API calls (e.g. Anthropic API) for maintenance-request triage summarization and the natural-language reporting assistant — no local fine-tuning, no GPU infrastructure required for this product.

## 8. Build Pipeline / Phases

### Phase 1 — Core Operations (MVP)

Goal: a landlord can run real rent collection and maintenance tracking on the platform. This is the first sellable, revenue-capable version.

- Org/property/unit/lease CRUD; single-owner model only (Stripe Connect deferred to the extent Phase 1 supports one operating account per org)
- Tenant invite flow, tenant portal, rent payment via ACH and card (Stripe + Plaid)
- Autopay, automated rent reminders, automated late fee application per lease terms
- Maintenance request submission (tenant), tracking and status updates (landlord)
- Document storage per unit/lease; e-signature for lease execution
- Basic income/expense dashboard and CSV export

### Phase 2 — Leasing & Screening

- Vacancy listing creation; CSV/manual export path for syndication, partner-API syndication where approved
- Online rental application flow with applicant-paid or landlord-paid screening
- Tenant screening integration (TransUnion SmartMove or Checkr) — credit, criminal, eviction, identity
- FCRA-compliant consent capture and automated adverse-action notice generation on denial
- Applicant scoring/decision workflow (approve / conditional / deny) against configurable screening criteria
- Lease template library with e-signature generation from approved application
- **Lease Renewals & Updates**: Landlord capability to review active leases, edit existing lease terms, and renew expiring leases. Updating terms (like end dates) automatically triggers a re-dispatch of the document to the tenant for digital re-execution.
- **Tenant Onboarding & Selection**: A formal onboarding flow allowing landlords to create tenant profiles directly, and select from these onboarded tenants when drafting or editing leases.
- **Dynamic Unit Status & Occupancy**: Interactive controls allowing landlords to manually override unit statuses ('vacant', 'occupied', 'maintenance'). Manually marking a unit as 'occupied' requires linking an onboarded tenant via a lease agreement.

### Phase 3 — Accounting Depth, Compliance & Mobile

- Stripe Connect rollout for multi-owner PM company support — tenant payment → PM operating/trust account → owner payout
- State-aware trust/escrow ledger for security deposits (append-only, per-owner, per-property segregation — never commingled)
- Automated monthly owner statements and distribution scheduling
- 1099 generation for owners at year-end
- QuickBooks Online sync (chart of accounts + transaction export)
- Vendor/work-order management: assignment, quoting, invoice submission, vendor portal
- Move-in/move-out inspection checklists with timestamped photos, tied to security deposit disposition
- Native iOS and Android apps (tenant + landlord/PM roles at minimum)

### Phase 4 — Intelligence & Scale

- AI-assisted maintenance triage: categorize, prioritize, and suggest vendor routing from the tenant's free-text description and photos, via hosted LLM API
- Natural-language reporting assistant for owners/landlords (“what was my net income last quarter on the Elm St property?”)
- Rent pricing / comp suggestions using portfolio and market data
- Multi-portfolio / franchise support for larger PM company customers approaching the top of the target segment
- Webhooks and a public API for third-party integrations
- SOC 2 Type II audit preparation and completion

## 9. Evaluation Plan & Ship Gate

Each phase has a concrete pass/fail gate before moving to the next — not a vibes-based “feels done” call.

| Phase | Ship gate |
| --- | --- |
| Phase 1 | A real landlord (pilot customer) successfully collects at least one full rent cycle via ACH or card, with zero manual intervention required for a standard on-time payment, and can submit/resolve at least one maintenance request end-to-end |
| Phase 2 | A full application-to-signed-lease flow completes for a real applicant, including a screening report returned via API and, if applicable, a correctly generated adverse-action notice |
| Phase 3 | A simulated multi-owner PM scenario produces a correct, auditable owner statement and a Stripe Connect payout that matches the trust ledger to the cent; mobile apps pass store review |
| Phase 4 | AI triage suggestions are reviewed against a held-out set of at least 50 real maintenance requests with acceptable category/priority accuracy before being shown to customers without a human review step |

## 10. Non-Functional Requirements

- **FCRA compliance — **screening consent capture, permissible-purpose certification with the screening vendor, and automated adverse-action notices are mandatory, not optional, wherever a screening report factors into a leasing decision.
- **NACHA / ACH compliance — **proper WEB debit authorization language and record-keeping for every ACH-based rent payment; Stripe's ACH stack handles much of this but the authorization UX and record retention are the product's responsibility.
- **Trust accounting compliance — **security deposit and owner-fund handling rules vary by state (segregation requirements, interest-bearing account rules in some states, timelines for deposit return); the Phase 3 trust ledger must be state-aware and should be reviewed by counsel before general availability in a new state.
- **Data security — **encryption at rest and in transit, role-based access control enforced at the API layer (not just the UI), audit logging on all financial and screening-related actions.
- **Accessibility — **WCAG 2.1 AA target for tenant-facing and owner-facing portals given the broad demographic range of tenants.
- **Availability — **rent collection and payment status must be available 24/7 with clear incident communication; a rent-payment outage on the 1st of the month is a business-critical incident, not a normal bug.

## 11. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| ACH fraud / NSF returns | Use Plaid instant verification to reduce reliance on micro-deposits; apply Stripe's ACH risk tooling; hold new-tenant first payments for the full ACH return window before treating funds as cleared |
| FCRA/screening legal exposure | Route all screening through a vendor's compliant API (never build custom bureau access); hard-require adverse-action notice generation before allowing a denial to be recorded |
| State trust accounting variance | Ship Phase 3 trust accounting state-by-state with counsel review, rather than declaring nationwide compliance on day one |
| Payment processor account risk (reserve holds, chargebacks) | Structure Stripe Connect accounts correctly from the start (Phase 1 decision affects Phase 3 migration cost); monitor dispute rates closely given rent amounts are large relative to typical SaaS transactions |
| Listing syndication access is partner-gated | Ship a manual/CSV export path as the reliable Phase 2 baseline; treat partner API approval (Zillow, Apartments.com) as a parallel track, not a blocking dependency |
| Competing against entrenched incumbents with free tiers | Compete on flat, predictable, no-fee-shifting pricing and a materially better UX rather than trying to out-feature AppFolio/Yardi on day one |

## 12. Timeline & Phasing

Given Antigravity's typical development velocity, the phases above are designed to be handed off sequentially, with Phase 1 scoped tightly enough to reach a real pilot customer before Phase 2 begins. Exact calendar timelines should be set by Antigravity's own estimation process once the Phase 1 spec above is reviewed — this PRD intentionally does not prescribe sprint counts, since that estimate belongs to the team doing the build.

- Recommended sequencing: Phase 1 complete and validated with one real pilot user before Phase 2 kicks off, since Phase 2 (screening, FCRA) introduces materially higher compliance stakes than Phase 1.
- Phase 3's Stripe Connect migration is easier if the Payment/Lease data model anticipates multi-owner routing from Phase 1, even though Phase 1 only ships the single-owner case — flag this to Antigravity as a schema decision worth getting right early.
- Phase 4 should not start until at least one paying multi-owner PM company customer exists on Phase 3, so AI features are tuned against real usage patterns rather than assumptions.

## 13. Success Metrics

- **Activation — **% of new landlord signups who collect at least one online rent payment within 14 days
- **Collection rate — **% of total rent volume collected on-platform vs. off-platform workarounds
- **Maintenance responsiveness — **median time from request submission to first status update
- **Screening turnaround — **median time from application submission to decision
- **Retention — **logo and unit-count retention month-over-month, given landlord churn is often tied to selling/losing a property rather than dissatisfaction
- **Owner trust (Phase 3+) — **% of owner statements generated with zero manual correction needed

## 14. Open Questions

- Go-to-market: launch self-serve for independent landlords first, or find a small PM company design partner and build Phase 3's multi-owner needs earlier? This affects phase sequencing.
- Should Phase 1 support Stripe Connect from day one (higher upfront complexity, avoids a payments migration later) or defer it as scoped above (faster Phase 1 ship, real migration cost in Phase 3)? Recommend a decision before Antigravity starts on the Payment/Organization schema.
- Which screening vendor — TransUnion SmartMove or Checkr — based on final pricing and integration effort once contract terms are in hand?
- Pricing model: flat per-unit (matching the Shuk Rentals positioning referenced in §2.2) vs. tiered by feature access — needs a decision before Phase 1 billing integration is built.
- Which states to launch trust accounting compliance in first for Phase 3, given state-by-state legal variance?

## 15. Appendix — Sources

- Property management software market sizing and CAGR: Grand View Research (grandviewresearch.com), Fortune Business Insights (fortunebusinessinsights.com), Coherent Market Insights (coherentmarketinsights.com) — accessed July 2026
- Competitive landscape and pricing (TurboTenant, Buildium, AppFolio, Shuk Rentals, TenantCloud, Rentec Direct): research.com, rentpost.com, shukrentals.com, rentfinder.ai — accessed July 2026
- Tenant screening API access: TransUnion SmartMove (mysmartmove.com, transunion.com), Checkr (checkr.com), RentPrep screening API (rentprep.com) — accessed July 2026
- Payments infrastructure: Stripe ACH documentation (docs.stripe.com, stripe.com), Plaid property management and Auth-Stripe integration docs (plaid.com) — accessed July 2026
- US individual landlord population figure (~14 million): U.S. Census Bureau, as cited via research.com/rentpost.com — accessed July 2026
