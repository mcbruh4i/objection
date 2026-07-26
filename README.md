# Objection! (قاضی بهانه)

> **Status: Archived — July 2026.** Built solo in ~2 weeks. Not shipped. Archived after concluding the market configuration didn't support a business. See [Why this is archived](#why-this-is-archived).

A habit tracker where breaking a commitment puts you on trial.

Miss a habit, and the app doesn't show you a broken streak — it opens a courtroom. An AI prosecutor cross-examines your excuse, remembers every excuse you've used before, and a judge hands down a verdict that decides your penalty.

---

## The idea

Most habit trackers are passive. They record that you failed and leave you alone with it.

Objection! makes failure *interactive*. The core loop:

1. **Commit** — set a habit and a deadline.
2. **Miss it** — the case opens automatically.
3. **Plead** — type your excuse.
4. **Get cross-examined** — the prosecutor challenges it, in character, and pulls up your past excuses as evidence.
5. **Verdict** — the judge rules. Penalty multiplier applies.

The mechanic that makes it work is **excuse memory**: the app normalizes and stores every excuse, and matches new ones against your history. Reusing "I was tired" for the third time isn't just noticed — it's entered into evidence.

---

## Architecture notes

A few decisions worth reading the code for:

**Verdicts are server-authoritative.** The LLM writes the prosecutor's dialogue and the judge's reasoning, but it does **not** decide the outcome. Verdict and penalty multiplier are computed by deterministic policy code on the server. No amount of clever prompting from the user can talk the app into an acquittal.

**Layered input defense.** Before any user text reaches the model, it passes through Unicode confusable normalization (Cyrillic/Greek lookalikes), invisible-character stripping, and prompt-injection marker detection. User text is wrapped in explicit untrusted-content tags in the prompt.

**Three degradation paths.** Live (model responds), fallback (model unavailable → scripted courtroom continues), and in absentia (user never responds → trial concludes without them). The trial never deadlocks.

**Nothing hardcoded — everything in its own layer.** Colors live in `palette.ts` → `tokens.ts`. Fonts in `fonts.ts`. All user-facing strings in `i18n/`. Courtroom media reads from slots in `courtMedia.ts`, so swapping in final art touches one file. This was a deliberate constraint from day one.

**Bilingual from the start.** `fa.json` and `en.json` are kept at parity. No Persian strings anywhere outside the i18n pipeline.

---

## Stack

**Backend** — Python, FastAPI, SQLite. LLM via an OpenAI-compatible endpoint (Gemini).
**Mobile** — React Native (Expo), TypeScript. Jalali calendar support.

---

## What's built

- Full trial flow: plea → cross-examination → rebuttal → verdict
- Excuse normalization, storage, and matching against history
- Penalty multipliers (0x / 1x / 1.5x / 2x) driven by policy code
- Fine ledger with running balance
- Four screens (Today, Courtroom, Ledger, Settings) plus a login screen
- Theme token system with swappable presets
- Full fa/en i18n coverage

## What isn't

- Final courtroom art and animation (media slots exist; assets don't)
- Payment gateway
- Multi-user support — the schema is single-user
- Notifications, streaks, jury mechanic, journaling

## Known limitations

Documented honestly rather than quietly fixed, since the project is frozen:

- **Single-user schema.** No `user_id` column on any table. Multi-user requires a real migration, not an added endpoint.
- **`MAX_HABITS_PER_DAY` is misnamed.** The query counts all habits ever, not habits today — so it's a lifetime cap.
- **Prompts and safety vocabularies are English-only and hardcoded** in the court module. Consequence: excuse categorization doesn't fire correctly on Persian input, and switching model output to Persian would bypass the output safety filter until those lists are externalized.

---

## Why this is archived

The build wasn't the problem. The market configuration was.

The product targeted Iranian students aged 17–22. That segment has the pain, but it has no budget and no established culture of paying for apps. Worse, the original monetization tied payment to *failure* — you paid a fine when you broke a habit. Feedback from real users in the target group was direct: money that buys you a bad feeling is money you stop spending.

Reworking the economics was possible, and several versions were designed (virtual currency, a paid AI defense lawyer, appeals, a study tutor). But each of those was reverse-engineering a payer onto an artifact that already existed, rather than starting from a pain someone was already paying to solve. Iran-only distribution capped the ceiling regardless of which variant won. The global English market has real potential, but is gated behind payment infrastructure that wasn't solvable on this timeline.

The honest summary: **months of building, zero weeks of demand testing.** The lesson wasn't that the idea was bad — the hook tested well with real people. The lesson was the order of operations. Ask first, then build.

Archived cleanly rather than abandoned quietly, with the full project document preserved in `OBJECTION-CLAUDE.md` in case any of it is worth resurrecting.

---

## Running it

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env        # add your LLM API key
uvicorn app.main:app --reload

# Mobile
cd mobile
npm install
npx expo start
```

---

*Built solo, July 2026.*
