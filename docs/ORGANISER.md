# MOSAIC 26 organiser guide

## Two builds
| Build | Command | Contains | Where it goes |
|---|---|---|---|
| Kiosk | `npm run build:kiosk` | launcher, all four games, the kiosk secret | the 12 lab PCs only (folder `dist-kiosk`) |
| Board | `npm run build:board` | public leaderboard only (no game code, no secret) | any static host; the QR code points here |

Create the env files first (both are git-ignored, see `.env.example`): `.env.kiosk` has the Supabase URL, anon key and `VITE_KIOSK_SECRET`; `.env.board` has the URL and anon key only.

## Setting up a PC
1. Copy a folder to the PC containing `dist-kiosk` (the build output) plus `serve.ps1` and `start-station.bat` from `kiosk/`.
2. Double-click `start-station.bat`. It serves the build on `localhost:8080` and opens Chrome full screen. Exit with Alt+F4.
3. Every PC runs the same build, so any PC can be used for any station. Just pick the slice.
4. Before the event, open `https://<project>.supabase.co` from one lab PC in Chrome to confirm the network allows it.

Scores are saved locally first and retried every 15 s, so a short network drop does not lose a run.

## Players
IDs must exist in `public.players` and have `paid = true` or the launcher refuses them. Import a CSV in the Supabase dashboard (Table Editor, `players`, Import) with columns `id,name,college,year,paid`.

## What is protected
- Nobody can read or write `players` or `app_secrets` from the browser.
- Scores are accepted only through `submit_run`, which needs the kiosk secret, both IDs registered and paid, a score of 0-120 and time left of 0-720.
- The public board only receives masked IDs.
