# OBJECTION! — Front End (V1)

Persian-first, RTL-locked habit tracker with an AI courtroom.
Expo + React Native + TypeScript (strict). Built against the FastAPI backend
**as-is** (`app/main.py` + `app/schemas.py` are the API source of truth).

## Run

```bash
npm install
npm run web        # Expo web — design target is 390px width
npm run android    # Android (Myket / Cafe Bazaar target)
npm run typecheck  # tsc --noEmit (strict)
```

First boot uses **mock data** (Settings → «دادهٔ آزمایشی» is ON) so the app
works with no server. To use the real backend: run FastAPI, turn the mock
toggle OFF. The server URL is a **dev-only** setting — it is NOT user-facing;
configure it in `app.json → expo.extra.defaultServerUrl`
(default `http://127.0.0.1:8000`).

> Android note: the first `I18nManager.forceRTL(true)` takes effect after one
> app restart — standard React Native behavior.

## Architecture rules (V1 hard rules)

1. **RTL-first, always.** Locked in `index.ts` (native `I18nManager` + web
   `dir="rtl"`). No LTR layouts exist; URLs/mono records are explicit LTR data islands.
2. **Tokens only.** `src/theme/palette.ts` is the ONLY file with hex codes
   (Layer 1). Components consume semantic roles/spacing/type from
   `src/theme/tokens.ts` (Layer 2). Zero literal colors/spacing/fonts in components.
3. **All strings via `t()`** from `src/i18n/fa.json` (source of truth;
   `en.json` mirrors keys). The only exceptions: English brand shouts in
   `src/i18n/brand.ts` (OBJECTION!, GUILTY, DISMISSED) — never translate them.
4. **One component per file**; screens in `src/screens/`, components in `src/components/`.
5. **Backend untouched.** The typed client (`src/api/`) mirrors the v2
   contract exactly, including the multi-round rebuttal loop.
6. **Tone split:** judge = formal Persian, prosecutor = sharp colloquial
   Persian — both in `fa.json` copy.

## Fonts (temporary placeholder — swap plan)

Final Persian fonts are still being tested (Peyda body; Kalameh / Rokh /
Doran / Morabba / Quarantine display candidates). **Estedad** (OFL) is the
placeholder for both `font.body` and `font.display`.

To swap: drop the TTFs into `assets/fonts/`, then edit **one file** —
`src/theme/fonts.ts` (family strings + `FONT_ASSETS` entries). Nothing else
in the codebase names a font family. Space Grotesk (shouts) and Space Mono
(ledger record line) are locked. Licenses: `assets/fonts/licenses/`.

## Courtroom media (V1 placeholders — swap plan)

No video/animation assets are bundled. The courtroom consumes **slots** from
`src/media/courtMedia.ts` (scene states: idle / objection / rebuttal /
deliberating / verdict + character emotions). V1 renders token-styled
placeholders via `src/media/MediaSlotView.tsx`. When final media arrives,
extend the slot content union + renderer **inside `src/media/` only** —
screens and components don't change.

## Money & cadence (V1 conventions)

- **Money display**: backend `*_cents` values render at **1¢ = 10 Toman**
  (`TOMAN_PER_CENT` in `src/utils/format.ts` — the single place to retune).
  Daily fine defaults ≈ ۸۰٬۰۰۰ تومان; weekly targets ۲۰۰٬۰۰۰ تومان.
- **Fine cadence**: daily / weekly / monthly — **no yearly cadence exists
  anywhere** (owner decision). The backend has no cadence field, so cadence is
  a client-side category (`src/state/cadenceStore.ts`, AsyncStorage) driving
  Today's sections and default penalties. It migrates to the backend later.
- **Judged habits are sealed**: once a habit's court case resolves (guilty or
  dismissed) it is permanently locked for the day in the UI (`JudgedSeal`),
  even though the API would technically allow completing it.

## Known V1 limitation

`GET /history` buckets are **UTC days** (backend aggregates by UTC timestamp
prefix), not Tehran midnight: activity between 00:00–03:30 Tehran local time
lands on the previous day. Documented in `src/utils/jalali.ts`; accepted for V1.
