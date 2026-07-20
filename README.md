# Objection!

`Objection!` is a local-first Expo + FastAPI hackathon prototype. A player can
complete a habit or ask a fictional court to hear a reason for skipping it; a
mock accountability ledger records the result. It is not a payment, banking,
legal, medical, or evidence-verification product.

The demo is intentionally one replayable vertical slice:

- Today: `30 minutes of exercise`, with `$2.00 mock` at stake.
- Courtroom: plea -> Prosecutor objection -> rebuttal -> Judge verdict.
- Ledger: the verdict's fictional fine appears immediately, alongside a
  presentational completion calendar.

## Architecture and boundaries

- `mobile/` is an Expo + React Native + TypeScript app. It uses React Native
  primitives, `StyleSheet`, and responsive design tokens so the same source
  runs in Expo Web and Android.
- `backend/` is a FastAPI + SQLite API. It owns habit, court-session,
  excuse-memory, and fine records.
- Money is integer cents and is always fictional. The app does not accept a
  payment, connect a wallet, or store financial-account data.
- Player plea and rebuttal text are untrusted evidence. The backend delimits
  it before any model call and keeps all verdict-critical policy server-side.
- The app works without a configured model endpoint: deterministic courtroom
  fallbacks keep the demo moving on missing credentials, bad JSON, timeouts,
  or rate limits.

## Windows 11 quick start (PowerShell)

Prerequisites: Node.js LTS, Python 3.12+ (available as `py -3.12`), Android
Platform Tools only when testing a device, and the Expo Go app only when using
Expo Go. Run these in two PowerShell terminals from the repository root.

### Terminal 1 - FastAPI

```powershell
Set-Location backend
py -3.12 -m venv .venv
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

If PowerShell blocks the activation script, use a process-only setting and run
the activation line again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

The API is available at [http://localhost:8000](http://localhost:8000) and its
interactive endpoint reference is at [http://localhost:8000/docs](http://localhost:8000/docs).

### Terminal 2 - Expo Web

```powershell
Set-Location mobile
npm ci
$env:EXPO_PUBLIC_API_URL = 'http://localhost:8000'
npx expo start --web
```

`EXPO_PUBLIC_API_URL` is the only mobile API base-URL setting. Restart Expo
after changing it. Never put an LLM key in a `EXPO_PUBLIC_*` variable.

## Android device verification

LAN development is the default for Expo Go. Keep FastAPI running, put the
phone and development computer on the same trusted Wi-Fi network, then start
Expo with the computer's LAN address:

```powershell
Set-Location mobile
$env:EXPO_PUBLIC_API_URL = 'http://192.168.1.42:8000'
npx expo start
```

Replace the example address with the computer's actual IPv4 address and do
not commit a machine-specific LAN URL. This is a local development server, not
a public deployment.

`adb reverse` is an optional USB alternative when Android debugging is
available:

```powershell
adb devices
adb reverse tcp:8000 tcp:8000
$env:EXPO_PUBLIC_API_URL = 'http://localhost:8000'
npx expo start --android
```

## Model configuration

Copy `backend/.env.example` to `backend/.env`; it is ignored by Git. The
provider-neutral adapter reads exactly these non-public settings:

```text
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL_PROSECUTOR=
LLM_MODEL_JUDGE=
```

Set all four to use a compatible chat-completions endpoint. Leave them blank
to exercise the deterministic fallback. The UI never needs to know which
provider or model is configured; describe the actual configuration truthfully
in a submission, and never commit or narrate a secret key.

## Replay/reset controls

The backend omits the reset route unless it is explicitly enabled for local
development. Set these ignored `backend/.env` values, then restart FastAPI:

```text
APP_ENV=development
DEMO_RESET_ENABLED=true
```

During an Expo development build, long-press the `OBJECTION!` app title to
call the enabled `POST /demo/reset`, clear the ledger, and restore the seeded
pending habit. This control is omitted outside `__DEV__`.

For a terminal fallback while recording, use:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/demo/reset
```

## API surface

- `GET /today` - seeded habit and any open court session.
- `POST /habits/{id}/complete` - complete the habit idempotently.
- `POST /habits/{id}/skip` - create or return the one session for the habit.
- `POST /court/{session_id}/plea` - hear untrusted plea text and return the
  Prosecutor response.
- `POST /court/{session_id}/rebuttal` - issue a Judge verdict and atomically
  write exactly one fictional fine.
- `GET /ledger` - integer-cent mock balance and fine entries.
- `POST /demo/reset` - restore the replayable seed when explicitly enabled in
  development.

Court state is `awaiting_plea -> awaiting_rebuttal -> resolved`. A resolved
session always has exactly one fine row, including a zero-cent accepted case.

## Day 4 validation

### Automated checks

Run these after installing the two dependency sets. They are the repeatable
code/build checks; they do not prove real-device timing.

**Recorded backend result:** `37 passed` with one `TestClient` deprecation
warning. Android playback and `adb reverse` remain manual verification items.

```powershell
Set-Location backend
& .\.venv\Scripts\python.exe -m pytest -q

Set-Location ..\mobile
npm run typecheck
npx expo export --platform web
```

### Manual checks before recording

The following checks require a running app and, where noted, a physical Android
device. Mark each one off during the final recording pass rather than treating
an automated build as proof.

- Expo Web completes the seeded habit and smoothly updates its progress gauge.
- A repeated headache-style plea reaches the Prosecutor, then the Judge, and
  adds exactly one `$3.00 mock` fine to Ledger.
- A new credible sensitive excuse is accepted; a repeated vague or
  contradictory sensitive excuse asks for more-specific future evidence.
- The objection splash, voice, flash, shake, and point landing are synchronized
  on-device; clip switches have no black frame; videos are muted and all audio
  is played separately.
- The Judge appears only for the verdict, not during the Prosecutor sequence.
- Local audio still plays with the device offline.
- Long-press reset restores the seeded case without a terminal.
- Expo Go reaches the FastAPI server over the trusted same-Wi-Fi LAN address.
  Verify `adb reverse` only when using the optional USB workflow.
- The bottom bar contains exactly Today, Ledger, and Settings; there is no
  drawer, hamburger, floating action button, or hidden navigation menu.
- Every screen shows at most one filled-purple action. Habit completion is the
  card tap target, while skip, reset, and other supporting actions stay quiet.

## Asset regeneration

Bundled visual and audio assets are local and are never fetched at runtime.
The app's two preloaded video players expect the following drop-in paths:

```text
mobile/assets/video/talk-loop.mp4
mobile/assets/video/bench-slam.mp4
mobile/assets/video/objection-point.mp4
mobile/assets/images/objection-splash.webp
mobile/assets/audio/objection-voice.mp3
```

The canonical, exact PowerShell commands (including crop, frame ranges,
codec, chroma key, despill, voice trim, procedural SFX, and validation) live
in [mobile/ASSETS.md](mobile/ASSETS.md). Run that block from `mobile/`, as its
paths are intentionally relative to that directory. It preserves the shared
`480x636` / 30fps video geometry and removes all clip audio so `expo-av` owns
audio timing.

`mobile/ASSETS.md` records the generated paths, source notes, and license/use
basis.
The two supplied videos are source-derived placeholder material, not an
automatic license grant. Before submission, replace them with original or
properly licensed assets, or obtain and record explicit permission for the
intended hackathon/public use. Do not submit borrowed game audio, characters,
or trade dress merely because it is technically bundled.

## 90-second demo script

1. **0:00-0:08 - premise.** Open Today. State: "Objection! turns a skipped
   habit into a fictional, replayable courtroom decision." Point out the
   `30 minutes of exercise` card, raw deadline rendered locally, and mock
   stakes.
2. **0:08-0:18 - accountability interaction.** Tap Done once to show the
   tactile completion response and smooth gauge. Long-press the title to reset
   immediately, explaining that this dev-only control makes the demo
   replayable.
3. **0:18-0:32 - plea.** Choose "I can't today," enter "I have a headache
   again," and present it. Explain that this matches the seeded court memory,
   rather than trusting the text as an instruction.
4. **0:32-0:49 - Prosecutor.** Let the talking clip transition into the point.
   Call out the synchronized objection art, voice, flash, shake, and
   typewriter/blip treatment. The Prosecutor requests a materially different
   explanation.
5. **0:49-1:03 - Judge.** Submit a short rebuttal. Show the Judge's stamped
   rejected ruling and the `$3.00 mock` result. Mention that the server writes
   the fine atomically and will fall back deterministically if a model is
   unavailable.
6. **1:03-1:18 - Ledger.** Let the app advance to Ledger. Show the balance,
   new single fine entry, and completion heatmap. Reiterate that no money is
   collected.
7. **1:18-1:30 - close.** Mention Expo Web plus Android support, local bundled
   media, and the safe/resettable nature of the vertical slice. Reset once if
   the recording needs another take.

## Submission checklist

- [ ] Repository contains source, setup instructions, and no `.env`, database,
  build output, or credentials.
- [ ] `mobile/ASSETS.md` identifies every bundled media source and its license/use
  basis; no existing game's sound, characters, or trade dress is presented as
  project work.
- [ ] Expo Web export, TypeScript check, backend tests, and an Android replay
  were run on the intended recording setup.
- [ ] Demo video follows the script, shows the real end-to-end flow, and shows
  the immediate ledger update.
- [ ] Project description accurately states the configured model/provider, or
  states that the deterministic fallback was used.
- [ ] Submission title, repository link, demo link, and required Build Week
  form fields have been checked against the current submission page.
- [ ] Navigation audit confirms the fixed three-item bottom bar is the only
  global navigation surface and no edge-to-edge action slabs remain outside
  the courtroom input row.
