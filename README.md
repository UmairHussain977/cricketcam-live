# CricketCam Live

A separate companion app to the Cricket Scoring App. Runs on a second phone: shows a live camera
preview with the match scoreboard burned into the recorded video, synced in real time from the
scoring app over Supabase.

## How it fits together

```
SCORING PHONE                          CAMERA PHONE
Cricket Scoring App                    CricketCam Live
  writes a ball  ─────────────►  Supabase (live_matches table, Realtime)
                                          │
                                          ▼
                                 subscribes to match code
                                          │
                                          ▼
                          camera preview + score overlay (canvas)
                                          │
                                    tap Record
                                          │
                       canvas.captureStream() + mic audio ──► MediaRecorder
                                          │
                                    tap Stop
                                          │
                              saveVideoToGallery() (native / share / download)
```

The scoring app only sends a small JSON snapshot (score, batters, bowler, result) — never the
full ball-by-ball history — to a `live_matches` row keyed by a 6-character match code it
generates itself.

## One-time setup

1. **Database schema.** In your Supabase project dashboard → SQL Editor → New query, paste and
   run [`supabase/schema.sql`](supabase/schema.sql). It creates the `live_matches` table, RLS
   policies, and adds the table to the realtime publication. Safe to re-run.
2. **Environment variables.** Both this app and the Scoring App need a `.env` with:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
   Use the **publishable/anon** key only — never the service role key (this is a public,
   browser-embedded key by design; it works because of the RLS policies in the schema, not
   secrecy).
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   Open the printed URL on the camera phone (same Wi-Fi network for local dev, or deploy it
   somewhere reachable over the internet for real matches — camera access requires HTTPS or
   localhost).

## Using it

1. Start a match in the Scoring App and open its live scoring screen. A gold **📡 CODE** pill
   appears in the header — that's the match code, generated the first time the screen loads.
2. On the camera phone, open CricketCam Live, type that code, tap **Connect**.
3. Once connected, tap through to the camera screen, frame your shot, tap the red button to
   record. Tap again to stop — it saves automatically (see below).

## Why this isn't a "pure PWA can do everything" build

Camera preview, front/back switching, flash, and **burning the scoreboard into the recording**
are all done with standard browser APIs (`getUserMedia`, `canvas`, `MediaRecorder`) and work
today in any modern mobile browser — no native wrapper required for any of that.

**Saving straight into the Android Gallery/Photos with zero taps is different** — there is no
web API that writes into Android's MediaStore from a browser tab. `saveToGallery.js` handles
this in three tiers, trying each in order:

1. **Native** (`@capacitor-community/media`) — only active if this app is compiled and running
   inside a real Capacitor-wrapped Android app. Writes directly into the gallery, no user action.
2. **Web Share** — works right now in any Chrome/Android browser. One tap on the share sheet to
   "Save to Photos".
3. **Download** — universal fallback, saves into the Downloads folder.

This sandbox has no Java/Android SDK installed, so I could not compile or test tier 1's APK
myself. Tiers 2 and 3 are fully working today via `npm run dev` on a real phone.

### Building the native Android wrapper (tier 1), later, on a machine with Android Studio

```bash
npm run build
npx cap add android      # first time only
npx cap sync android
npx cap open android     # opens Android Studio; Run ▶ onto a device, or Build ▶ APK
```

## Known limitations (MVP)

- Recorded format is WebM (VP9/VP8 + Opus) — Android Chrome's `MediaRecorder` cannot produce MP4.
  Plays fine in Google Photos/most players; if you need MP4 for sharing to something that
  insists on it, transcode afterward.
- Switching camera or toggling flash is disabled while actively recording, to avoid interrupting
  the capture stream mid-take.
- No auth/access control beyond knowing the match code — acceptable for two trusted phones on
  the same match, not meant for anything more sensitive.
