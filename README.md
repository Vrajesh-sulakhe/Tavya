# Tavya — Elderly Care & Medication Management Platform

**Tavya** is an accessible, passcode-secured elderly healthcare and medication management platform built for the **Hack2Skill PromptWars x Catalyst** challenge. It keeps older adults at the center of their own healthcare decisions while coordinating medication schedules, doctor appointments, vitals check-ins, and proactive email reminders across their trusted Care Circle.

---

## Key Capabilities

### 1. Passcode-Based Care Circle & Senior Consent (`/api/auth/*`, `/api/circle/members`, `/api/consent`)
- **Role-Scoped Passcode Access:** Members sign in with 4–8 digit numeric passcodes (`senior`, `caretaker`, `family`) hashed per-user with Node `scryptSync` + 16-byte random salt and verified with `timingSafeEqual`.
- **Signed Stateless Sessions:** `HttpOnly`, `SameSite=Lax` HMAC-SHA256 cookies (`tavya_session`, 12-hour TTL) enforce least-privilege RBAC across every API route and prevent unauthenticated SSR data exposure.
- **First-Run Setup & 1-Click Sample Circle:** Start from a blank custom Care Circle setup or load the sample circle (`1111` Senior, `2222` Caretaker, `3333` Family) to explore every role cleanly.
- **Senior Sovereignty & Privacy Switches:** Seniors directly control two real privacy toggles:
  - *Share daily mood & vitals check-ins with family members* (server-redacts `vitalsLogs` from `family` views when disabled).
  - *Email family members if a medication window is missed* (gates `missed_dose` recipients on proactive reminders).

### 2. Senior Day Mode (Calm, Zero-Clutter Companion)
- **Next-Up Hero Card:** Highlights the single next due dose with plain-English instructions, meal timing (*After food / Before food / With water*), visual pill cues, and the next structured doctor visit pinned above.
- **One-Tap Confirmation, Snooze & Undo:** `>= 52px` touch targets for **Taken**, **15m Snooze** (with live timer & browser notification), and **Undo**, plus missed-window safety guidance against doubling doses.
- **Multilingual Voice Read-Aloud & XL Text:** English / हिन्दी / मराठी UI switching with Web Speech API schedule read-aloud and global extra-large font scaling (`data-text-scale="xl"`).
- **Quick Vitals & Instant SOS:** One-tap mood and optional BP/blood-sugar check-in (flagging `Dizzy` or elevated readings immediately) plus an SOS modal with Call, WhatsApp, SMS, and medical allergy card.

### 3. Caregiver & Family Hub (`CaregiverView` + `CareCirclePanels`)
- **7-Day Adherence Matrix & Safety Feed:** Visualizes daily M/A/E/N completion, missed-dose alerts, refill countdowns, drug/food interaction warnings, and allergy conflicts.
- **Structured Medical Appointments (`/api/appointments`, `/api/appointments/[id]`):** Dedicated scheduling for doctor consultations (title, doctor, clinic location, date/time, preparation notes), synchronized to Senior Day and printable Doctor Summaries.
- **Proactive Email Reminders & Outbox (`/api/reminders/run` + `vercel.json`):** Evaluates due **upcoming doses**, **missed dose windows**, and **medical appointments within 24 hours** with per-event deduplication (`emailLog[]`). Delivers live via **Resend REST API** when `RESEND_API_KEY` is configured or records inspectable outbox previews offline.
- **AI Prescription Simplifier (`/api/ai/analyze-prescription`):** Converts prescription text or photos into plain-English daily schedules with **Google Gemini (`gemini-2.5-flash`)** and deterministic clinical-shorthand rules fallback.

---

## Judging Parameter Alignment

| Parameter | How Tavya Addresses It |
| :--- | :--- |
| **Code Quality** | Strict TypeScript (`strict: true`), pure modular domain layer (`src/domain/`), Zod input validation schemas, `useMemo` view derivations, and zero duplicated auth/crypto helpers. |
| **Security** | Salted `scryptSync` passcode hashing, HMAC-SHA256 `HttpOnly` session cookies, IP rate limiting on login & AI routes, server-side RBAC (`401`/`403`) + consent redaction, CSP/HSTS/nosniff/DENY headers, and non-root Docker user. |
| **Efficiency** | Memoized schedule & share derivations, concurrent Resend email dispatch, single-pass reminder deduplication, and lightweight native `fetch` integrations for Resend & Upstash REST (no heavy SDK bloat). |
| **Testing** | 30 automated Vitest specs spanning domain unit logic (crypto, tokens, reminder deduplication, consent redaction), authenticated API RBAC/CRUD integration routes, and `axe-core` accessibility audits. |
| **Accessibility** | WCAG AA contrast (`#141D19` / `#0F6B54` on `#FDFBF7`), `44px+` touch targets, `XL Text` mode from login onward, `role="switch"` privacy controls, `aria-live="polite"` announcements, and multilingual Web Speech read-aloud. |
| **Problem Alignment** | Covers shared Care Circle passcodes, structured medication + appointment coordination, proactive email reminders (upcoming, missed, appointments), and senior-led privacy consent. |

---

## Architecture

- `src/domain/`: Pure, framework-free domain modules (`auth.ts`, `reminders.ts`, `schedule.ts`, `interactions.ts`, `prescription-parser.ts`, `senior-i18n.ts`, `schemas.ts`, `types.ts`).
- `src/lib/`: Async persistence adapter (`store.ts` with Upstash Redis REST + atomic disk fallback), email transport (`email.ts`), reminder sweep runner (`reminders-runner.ts`), seed builder (`seed.ts`), rate limiter (`rate-limit.ts`), and request/session helpers (`api-utils.ts`).
- `src/app/api/`: Authenticated REST endpoints (`/api/health`, `/api/auth/*`, `/api/circle/members`, `/api/consent`, `/api/dashboard`, `/api/medications`, `/api/medications/[id]`, `/api/doses`, `/api/vitals`, `/api/appointments`, `/api/appointments/[id]`, `/api/notes`, `/api/sos`, `/api/reminders/run`, `/api/ai/analyze-prescription`).
- `src/components/`: `AuthGate`, `Navbar`, `TavyaApp`, `SeniorView`, `CaregiverView`, `CareCirclePanels`, `PrescriptionAnalyzer`, `AddMedicationModal`, `EditProfileModal`, and `SosModal`.

---

## Local Development & Verification

```bash
npm install
npm run dev
```

Run the full verification suite:

```bash
npm test          # Domain unit tests, API auth/RBAC/integration tests, axe-core accessibility audits
npm run typecheck
npm run lint
npm run build
```

---

## Environment Variables & Deployment

Tavya runs cleanly out-of-the-box for local evaluation (using local disk storage and Email Outbox Preview) and upgrades seamlessly in production when configured on Vercel or Cloud Run:

| Variable | Required in Prod? | Purpose |
| :--- | :--- | :--- |
| `TAVYA_SESSION_SECRET` | Recommended | 32+ char secret for HMAC-SHA256 session cookies (`tavya_session`). Falls back to a persisted per-circle random secret if unset. |
| `UPSTASH_REDIS_REST_URL` | Recommended | Durable Redis REST endpoint (also supports Vercel `KV_REST_API_URL`) so state persists across serverless cold starts. |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Matching Upstash/Vercel KV REST token (`KV_REST_API_TOKEN`). |
| `RESEND_API_KEY` | Recommended | Enables live outbound reminder emails via Resend (`https://api.resend.com/emails`). |
| `REMINDER_FROM_EMAIL` | Optional | Verified sender address (defaults to `Tavya Care Circle <onboarding@resend.dev>`). |
| `CRON_SECRET` | Recommended | Secures automated daily scheduled triggers from `vercel.json` (`/api/reminders/run`). |
| `GEMINI_API_KEY` | Optional | Enables multimodal prescription photo & note parsing via Gemini `gemini-2.5-flash`. |

### Option A: Vercel
1. Push repository to GitHub (`Vrajesh-sulakhe/Tavya`).
2. Add the environment variables above in Vercel Project Settings (`Upstash Redis`, `Resend`, `TAVYA_SESSION_SECRET`, `CRON_SECRET`, `GEMINI_API_KEY`).
3. Deploy; `vercel.json` registers the daily `/api/reminders/run` cron trigger automatically.

### Option B: Google Cloud Run
A multi-stage `Dockerfile` (non-root user, port `8080`, `/api/health` readiness probe) is included:

```bash
gcloud run deploy tavya \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```
