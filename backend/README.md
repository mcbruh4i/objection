# Objection! API

This FastAPI service owns the local SQLite state and policy for the Expo
client. It stores only habits, court sessions, minimal excuse-memory records,
and fictional fines. All money is integer cents; it is never a real charge.

## Windows 11 start (PowerShell)

Run from the repository root:

```powershell
Set-Location backend
py -3.12 -m venv .venv
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

If script activation is blocked, apply the following process-only setting,
then repeat the activation command:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

The API listens on the development computer's LAN interfaces. Use its LAN IP
for Expo Web or a device on the same trusted development network, for example
`http://192.168.1.42:8000`. Add the exact Expo Web origin to `CORS_ORIGINS` in
`.env` when it is not localhost. Interactive docs remain available at the
computer's [http://localhost:8000/docs](http://localhost:8000/docs).

`adb reverse` is an optional alternative for a USB-connected Android device:

```powershell
adb reverse tcp:8000 tcp:8000
```

With the reverse active, configure that device with `http://localhost:8000`.
Use a LAN URL otherwise. This is development-only networking; do not expose
the unauthenticated demo API to an untrusted network.

## Environment

Copy `.env.example` to `.env` and leave it untracked. The adapter is
provider-neutral and reads only:

```text
APP_ENV=development
DEMO_RESET_ENABLED=false
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL_PROSECUTOR=
LLM_MODEL_JUDGE=
```

Leave all four LLM values blank for the intentional deterministic mode. With a
configured model, Prosecutor failures return safe fallback copy; a Judge
failure (timeout, bad status, invalid JSON/schema, or unsafe copy) resolves
atomically as a rejected 1x `absentia` ruling. Injection attempts always use
the server-controlled 2x rejection policy. Do not put any secret in the Expo
environment or documentation.

## API surface

- `GET /today`
- `POST /habits/{id}/complete`
- `POST /habits/{id}/skip`
- `POST /court/{session_id}/plea` with `{ "text": "..." }`
- `POST /court/{session_id}/rebuttal` with `{ "text": "..." }`
- `GET /ledger`
- `POST /demo/reset` (development opt-in only)

The state machine is `awaiting_plea -> awaiting_rebuttal -> resolved`. SQLite
enforces one open session per habit and one fine per resolved session. The
verdict write and fine insert happen in one immediate transaction, and each
local process single-flights the model work for a session stage. Excuse memory
is shared across every habit for this single local user. Accepted cases receive
a zero-cent fine row; repeated excuses receive the deterministic 1.5x policy;
configured Judge failures receive 1x absentia; prompt-injection attempts
receive the 2x policy.

## Local replay and test commands

The reset endpoint is omitted unless it is explicitly enabled for development.
Set the following before starting (or restart after changing it):

```powershell
$env:APP_ENV = 'development'
$env:DEMO_RESET_ENABLED = 'true'
```

It then returns the seed habit, seeded history, and an empty ledger:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/demo/reset
```

Run the automated backend suite after creating the virtual environment:

```powershell
& .\.venv\Scripts\python.exe -m pytest -q
```

The tests cover API state transitions, integer-cent storage, opt-in dev reset,
cross-habit history, single-flight model calls, deterministic/absentia
behavior, and Unicode injection fixtures. Android clip playback and audio
timing remain manual device checks; `adb reverse` is optional when LAN
development is used.
