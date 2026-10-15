# MOSAIC 26 organiser guide

## Model in one paragraph
One player, one **4-digit ID** (system-generated at registration, never typed by a volunteer). Rs 70 = 1 credit = 1 run (one 12-minute station play); the price lives in `app_config.price_inr`. A credit is spent when a run **starts**. Max 10 runs per player per station (refunded or voided runs do not count). Score per run is 0..140; **consolidated score = sum over the four stations of the player's best run** (max 560), no multiplier. Ties: fewer hints, fewer wrong attempts, more time left, fewer attempts used; if still level the rank is SHARED and the desk flips a coin.

## Three things to deploy
| Piece | Command | Contains | Where it goes |
|---|---|---|---|
| Board + desk | `npm run build:board` | public leaderboard and the committee desk (`#/desk`); no game code, no kiosk secret | Vercel (`vercel.json` is set up). Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BOARD_URL` (the public URL, used in slips and end-screen QR codes) |
| Kiosk | `npm run build:kiosk` | launcher, all four games, the kiosk secret | the lab PCs only (folder `dist-kiosk`). **Never host this build publicly**: the kiosk secret is inside it |
| Database | `supabase/migrations/20261016_*` to `20261021_*` | tables, RPCs, RLS | Supabase, applied by hand after review |

Env files (git-ignored, see `.env.example`): `.env.kiosk` has URL, anon key, `VITE_KIOSK_SECRET`, `VITE_BOARD_URL`; `.env.board` has URL, anon key, `VITE_BOARD_URL`.

## Setting up a PC
1. Copy a folder to the PC containing `dist-kiosk` plus `serve.ps1` and `start-station.bat` from `kiosk/`.
2. Double-click `start-station.bat`. It serves the build on `localhost:8080` and opens Chrome full screen. Exit with Alt+F4.
3. Every PC runs the same build, so any PC can be used for any station.
4. Before the event, open the Supabase URL from one lab PC in Chrome to confirm the network allows it.

A run needs the server to **start** (it spends a credit). Finished scores are saved locally first and retried every 15 s, so a short drop after the game does not lose a run.

## The desk (committee)
Open the public site, press **COMMITTEE** at the bottom of the leaderboard, log in with `deskNN` + password. Tabs:
- **REGISTER**: name, college (autosuggest), our college yes/no, optional PID, year, department, phone (unique), first top-up (credits stepper), payment mode, reference, received-by. A duplicate phone/PID shows the existing record. After saving, a printable slip (name, ID, credits, leaderboard QR).
- **TOP-UP**: a replay needs only a top-up on the existing ID.
- **FIND**: by ID, phone, name or PID. Shows balance, rank, run history; **Refund** (credit back, run excluded from cap and boards) or **Void** (excluded, no credit back), both need a reason and are audited.
- **LOBBIES**: active versus lobbies; cancel an unstarted one.
- **MEDALS**: unclaimed window and match medals with *Mark claimed*; coin-toss resolution; medal windows (edit label/times/count, add, close) without a rebuild.
- **CASH REPORT**: per volunteer cash / UPI / online, credits issued, registrations; event-wide runs started, credits spent / refunded / outstanding.

Committee accounts are rows in `committee_members` (`display_name` is editable). Failed logins are throttled (5 wrong in 15 minutes locks that account for 15 minutes) through Supabase Auth's *Password verification attempt* hook: Dashboard > Authentication > Hooks, point it at `public.hook_password_verification_attempt`.

## Versus lobbies
At a station: ID, "Is this you?", **CREATE VERSUS LOBBY** (shows a number like 007) or **JOIN VERSUS LOBBY** (enter it). 2 to 5 players, one station. The host presses START; everyone gets the same questions/seed and a synchronised countdown, and each pays 1 credit then. Unstarted lobbies expire after 10 minutes. The winner gets a MATCH MEDAL if the score is at least 70 (one per person per station); collect at the desk.

## Window medals (gold rush)
Rows in `medal_windows`. In each window everyone who finished a run inside it is ranked by consolidated total at the window end; a person wins at most one window medal; results are persisted when the window closes and never change. Raise `medals_count` of an open window if more medals are bought.

## What is protected
- Browsers can read no table. Only listed RPCs run: public boards (masked codenames, never phone/PID/credits), kiosk RPCs (need the kiosk secret), desk RPCs (need a committee login).
- Runs are created by `start_run` (credit spent, idempotent) and completed by `submit_run` (score 0-140, time left 0-720, hints, wrong attempts; the claimed play time must fit the server-side elapsed time).
