# Objection! mobile client

The Expo app is web-first but uses React Native primitives and `StyleSheet`
only, so the same source runs in Expo Web and Android.

## Run locally

1. Start FastAPI on port `8000` from `backend/`.
2. In this directory, copy `.env.example` to `.env` and run:

   ```powershell
   npm install
   npx expo start --web
   ```

   `EXPO_PUBLIC_API_URL` is the only client API setting. The supplied example
   targets `http://localhost:8000`. Do not put model credentials in Expo's
   public environment variables.

3. On a physical Android device:

   ```powershell
   adb reverse tcp:8000 tcp:8000
   npx expo start --android
   ```

   If port reversal is unavailable, use the computer's same-Wi-Fi LAN URL in
   `EXPO_PUBLIC_API_URL` instead.

## Courtroom flow

- Today reads raw `deadline_at` and `penalty_cents`, then formats them locally.
- Courtroom handles plea → Prosecutor objection → rebuttal → Judge verdict.
- Ledger updates after the verdict and displays only fictional cent balances.
- Long-pressing the app title in development calls `POST /demo/reset`.

## Design system and local media

All visual tokens live in `src/theme/tokens.ts`. It contains the Courtroom
Noir raw palette, semantic roles, responsive unit calculation, type scale,
spacing, radii, and motion constants. Screen code consumes those tokens using
React Native primitives and `StyleSheet`; it does not use DOM APIs, CSS files,
or hardcoded palette values.

Navigation is one safe-area-aware bottom bar with exactly Today, Ledger, and
Settings. Supporting actions use quiet text or outline treatment; each screen
has at most one filled-primary action, and the habit card itself is the
completion target.

The court scene uses two stacked, muted `expo-av` Video players and bundled
Audio effects. The generated placeholder clips, chroma-keyed objection art,
and exact regeneration commands are documented in [ASSETS.md](ASSETS.md).
The source-derived video and voice placeholders need rights clearance or
replacement before public distribution.
