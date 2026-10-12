# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: WMSU school_user (student/staff, e.g. Vaughn Evangelista). Situation: browsing found-item posts on campus lost-and-found. Job for this work: claimant tracking — "I submitted a claim on a found post, I need to see my request and whether it is Pending / Approved / Rejected."

Secondary (out of scope for this page): lost-item owner reviewing finder responses (already covered in ItemDetailPage Responses section).

## Product Purpose

FoundIt reunites lost campus items with owners. Users post lost/found reports, submit ownership claims with evidence, and admins approve returns. Success for this slice: a claimant can find every request they filed, see which post it belongs to, and understand its current status without asking an admin.

## Positioning

Campus-scoped verification: claims carry lost date/time/location + photo evidence tied to a specific post, with admin-mediated return — not a generic marketplace listing.

## Operating Context

Web dashboard at /dashboard. Flows: Dashboard feed → ItemDetail (/dashboard/items/:id) → Claim form (/dashboard/items/:id/claim) → success notice. State lives in App.tsx (items, submittedClaims, returnRequests). ClaimRequest has id, itemId, item title, claimant, dates, location, details, evidence, status, submitted.

## Capabilities and Constraints

Confirmed:
- Claim lifecycle in data is Pending | Under review | Approved | Claimed | Returned | Rejected.
- Student-facing display for this work is simplified to Pending / Approved / Rejected (user decision 2026-10-12). Mapping is display-only, underlying values preserved.
- New surface must include: global My Claims list grouped/linked by post + per-post "your requests" section inside ItemDetailPage with status badges.
- Must reuse incumbent layout (Sidebar + Header, white ground, #E5192D accent, rounded-2xl borders, ItemCard patterns) and existing routes/props. No new backend.
- New route: /dashboard/claims.

Undecided: whether demoClaims from adminData should appear in student view (currently owner-only). Default: show only submittedClaims for claimant view.

## Brand Commitments

Name FoundIt. Incumbent voice: plain, instructional ("Share details that can help verify..."). Visual commitments preserved from code: white background, neutral-900 text, #E5192D primary, rounded-xl/2xl controls, lucide icons, Plus Jakarta Sans / Open Sans. No new identity.

## Evidence on Hand

- client/src/types/claim.ts — ClaimRequest model + 6 statuses
- client/src/App.tsx — submittedClaims state, handleSubmitClaim (sets Pending)
- client/src/pages/school_user/ItemDetailPage.tsx — finderReports + Responses section (owner view)
- client/src/pages/school_user/ProfilePage.tsx, DashboardPage.tsx, ClaimPage.tsx — incumbent school_user layout
- client/src/components/school_user/Sidebar.tsx, Header.tsx — navigation
- client/src/components/admin/StatusBadge.tsx, ClaimsView.tsx — admin status language

Absences future work must not fabricate: real backend, real claimant identity resolution beyond AuthContext name match, real admin notes.

## Product Principles

1. One claim always points to one post — show the post, not just the request.
2. Status is a promise — simplified student badges must never contradict admin truth.
3. Claimant sees own requests only — no cross-user leakage.
4. Reuse before invent — extend ItemDetail + Profile patterns, don't redesign.
5. Evidence stays visible — details, dates, and photos travel with the status.

## Accessibility & Inclusion

Standard web Operate surface: keyboard-focusable cards/links, visible focus rings, aria-pressed tabs, semantic headings, color + text for status (never color alone).
