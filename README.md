# Tavya — Elderly Care & Medication Management Platform

**Tavya** is an accessible, light-themed web platform built for the **Hack2Skill PromptWars x Catalyst** challenge. It solves two intertwined problems in elderly care: helping aging adults take the right medication safely without visual or cognitive clutter, and giving family caregivers calm, real-time oversight over adherence, refills, wellness check-ins, and drug interactions.

---

## Key Capabilities

### 1. Senior Day Mode (Zero-Clutter Accessible Companion)
- **Next-Up Hero Card:** Highlights the single next due medication with plain-language dosage & meal timing (*After food / Before food / With water*) and a visual pill shape/color cue.
- **One-Tap Confirmation & Undo:** Large `>= 56px` touch targets for **Taken**, **Snooze 15m**, and **Undo**, with `aria-live="polite"` screen-reader feedback.
- **Web Speech Read-Aloud:** One-click spoken summary of today's medication progress and next scheduled dose.
- **XL Text Toggle & Light High-Contrast Palette:** Warm ivory canvas (`#FDFBF7`) and deep charcoal ink (`#141D19`) for high legibility without harsh glare.
- **Quick Wellness & Vitals Check-In:** One-tap mood selector (*Feeling Good / Tired / Dizzy / Upset Stomach*) plus optional Blood Pressure and Blood Sugar logging; `Dizzy` or elevated readings trigger an immediate caregiver alert.
- **Emergency SOS Card:** One tap opens caregiver and attending physician `tel:` links alongside allergies, conditions, and active medications for first responders.

### 2. Caregiver Hub (Oversight & AI Safety Assistant)
- **7-Day Adherence Ring & Alert Feed:** Live completion metrics, missed/wellness alerts, and automated **Refill Countdowns** based on daily slot consumption.
- **AI Prescription Simplifier & Drug Interaction Checker (`/api/ai/analyze-prescription`):** Converts clinical shorthand (`OD`, `BD`, `TID`, `HS`, `AC`, `PC`) into plain-English daily schedules and screens for high-risk drug/food interactions (e.g., *Aspirin + NSAIDs*, *Anticoagulants + NSAIDs*, *Statins/Amlodipine + Grapefruit*). Uses **Google Gemini (`gemini-2.5-flash`)** when `GEMINI_API_KEY` is configured and falls back cleanly to a deterministic clinical-rules engine when no external key is set.
- **Medication Regimen Manager & Printable Doctor Summary:** Full Zod-validated CRUD (add, pause/resume, delete, log dose) and print-optimized Doctor Visit Summary (`@media print`).

---

## Architecture & Engineering Quality

- **Stack:** Next.js 16 (App Router, TypeScript `strict: true`), Tailwind CSS v4, Zod validation, `@phosphor-icons/react` (light icons), Vitest + Testing Library + `axe-core`.
- **Modular Layers:**
  - `src/domain/`: Pure, framework-free domain logic (`schedule.ts`, `interactions.ts`, `prescription-parser.ts`, `schemas.ts`, `types.ts`).
  - `src/lib/`: Seeded atomic store (`store.ts`, `seed.ts`), rate limiter (`rate-limit.ts`), API validation helper (`api-utils.ts`).
  - `src/app/api/`: Validated REST handlers (`/api/health`, `/api/dashboard`, `/api/medications`, `/api/doses`, `/api/vitals`, `/api/ai/analyze-prescription`).
  - `src/components/`: Accessible UI components (`SeniorView`, `CaregiverView`, `PrescriptionAnalyzer`, `SosModal`, `AddMedicationModal`, `Navbar`).
- **Security Controls:** HTTP security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`), strict Zod payload validation & size caps (`2,000` chars max on AI input), per-IP rate limiting on `/api/ai/analyze-prescription`, server-only `GEMINI_API_KEY`, and non-root container user in `Dockerfile`.

---

## Local Development & Verification

```bash
npm install
npm run dev
```

Run the full automated verification suite:

```bash
npm test        # Domain unit tests, API security/integration tests, and axe-core accessibility audits
npm run typecheck
npm run lint
npm run build
```

---

## Deployment

### Option A: Vercel (Zero-Config)
1. Push this repository to GitHub (`Vrajesh-sulakhe/Tavya`).
2. Import the repository in Vercel and deploy (no required environment variables; optionally set `GEMINI_API_KEY` for live Gemini prescription parsing).

### Option B: Google Cloud Run
A multi-stage `Dockerfile` (non-root user, port `8080`, `/api/health` readiness probe) is included for Cloud Run:

```bash
gcloud run deploy tavya \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```
