# brag plan: resell.store demo, first draft

Built with the brag-slim method (real UI, music and SFX made on this machine, stills checked before rendering). It runs at the full storyboard length, not brag's 20-second default, because this is the Devpost demo and the landing page video. The scene-by-scene plan is `../STORYBOARD.md`; this file records what the draft actually does.

- **What it is:** an agent that sells your stuff for you. You snap a photo, it prices, lists, answers buyers and haggles, and PayPal holds the money until the item arrives. You just say yes.
- **Who it's for:** people with sellable things sitting at home, and buyers who want an agent to shop for them. Also hackathon judges, who need to see it working end to end.
- **What sets it apart:** the agent does the whole sale but never accepts on its own ("Good offers wait for your yes"), and buyers' agents can shop the same stores over MCP.
- **Hook:** "$4,267 of unused stuff in the average US home" counting up while the pile of things drops in.
- **Tone:** the app's own voice: warm, bright and a little cheeky. Cream, lemon and leaf colors, Bricolage Grotesque, springy pops.
- **Share caption:** see `share-copy.txt`.

## v3 (current `brag.mp4`, 2:25)

- **New voiceover take** with the revised ending: "open source, so you can easily deploy your own marketplace on Render dot com, everything is included" and "resell dot store to get started". The "half a trillion" line is gone.
- **New sync:** the VO starts 3.05s in, and the music bed is trimmed to start 5.17s into the track, on a bar. "This is resell dot store" stays on a downbeat, and the last line lands on the music's real final bar.
- **The open-source scene is now a deploy beat:** the cursor clicks "Deploy to Render", the bar fills to "Your marketplace is live", and the eight feature tiles burst in on "everything is included".
- **The mission scene drops the stat.** The pile flies off to new homes under "Our mission", and the end card CTA is "Get started at resell.store".
- **Fix:** the research clip now cuts past the blank page-change frames on the click.
- **Previous version:** v2's scenes are kept in `work/scenes-v2.js`.

## v2 (2:30)

- **Cut to the voiceover and music.** The voiceover is `work/audio/vo.mp3` (ElevenLabs v4) and starts 2.3s in. The music is `work/audio/music.mp3`, "Lemonade Skies" (151.5 BPM, E major).
  - `work/align.mjs` mapped each script line to the speech, and `work/beats.mjs` and `work/beats2.mjs` found the beat grid and the key.
  - Every scene cut sits on a beat. The 2.3s offset puts "This is resell dot store" on a phrase downbeat and the final "resell dot store." on the music's last bar.
- **Synced to the words.** Friction pills pop as each chore is said. The cursor clicks on "her agent goes to work", "one tap" and "Maya says yes". The price lands on "a fair price", and the open-source tiles pop with each item in the list.
- **Fun beats.** Items drop on the beat in the cold open. There's a SOLD stamp with a camera shake, confetti on "It's live", the wordmark and the end card, word-by-word kinetic type, and stickers.
- **Dropped to fit:** the landing-hero screenshot, the second half of "answers", the payout screen, the Channel3 research crop and "Every step, covered".
- **Audio:** `work/sfx.mjs` makes effects tuned to E major, and `work/mix.sh` ducks the music under the voice (voice about 12 dB over music) and lands at about -15 LUFS.
- **Rebuild:** `node render.mjs cues && node sfx.mjs && ./mix.sh && node render.mjs video 8 && ./finish.sh`
- **Earlier versions:** the first draft is `brag-v1.mp4`, with its scenes in `work/scenes-v1.js`.

## What's real in the draft

- **Five live recordings of the prototype in action, driven by script.** Typing the dutch oven and the agent's research running (`start-to-research`), answering the box question, publishing ("It's live. Nice one."), accepting Jess's offer through to "Sold to Jess", and a sidekick check (with the random price pinned to $70 so it matches the hero card).
- **Measured positions.** Every zoom, cursor click and highlight ring is placed using element positions measured on the real pages (`work/rects/`).
- **Rebuilt graphics only where there's no UI to show:** stats, the money path, the sponsor screens, the open-source grid and the mission ending.

## Timeline (183.6s)

| # | Scene | Start | Length |
|---|---|---|---|
| 1 | Hook: $4,267 of unused stuff | 0:00 | 7s |
| 2 | Why it stays there, plus $15.9B lost to fraud, into the cupboard | 0:07 | 10s |
| 3 | 1 in 3 / 6 in 10, then "So we built that." | 0:17 | 8s |
| 4 | Meet resell.store | 0:25 | 6.5s |
| 5–6 | Snap and type, then the agent researches (live) | 0:31 | 19s |
| 7 | It asks, then it writes | 0:50 | 8s |
| 8 | Publish (live), then her shop on desktop and phone | 0:58 | 9s |
| 9 | It answers buyers | 1:07 | 7s |
| 10 | Two agents haggle, then "Good offers wait for your yes." | 1:14 | 14s |
| 11 | Accept and sell (live), the PayPal money path, payout | 1:28 | 12.6s |
| 12 | Buyers send their own agent | 1:41 | 10s |
| 13 | Shopping sidekick (live) | 1:51 | 11s |
| 14 | $306.5B, then "as easy as saying yes" | 2:02 | 6.5s |
| 15–18 | Render · Channel3 · Kernel · PayPal | 2:08 | 32s |
| 19 | Open source, every step covered | 2:40 | 12s |
| 20 | The mission, into the end card | 2:52 | 11s |

## Sound

An original score synthesized in `work/music.mjs` (F major, 112 BPM), so there are no licensing issues for Devpost. Its sections follow the cuts:

- **Intro:** sparse plucks.
- **The cupboard:** a hush.
- **Into the title:** a build, with the groove dropping on the title.
- **The haggle:** a minimal tension loop.
- **"Good offers wait for your yes":** a break.
- **Accept:** a lift with a lead line.
- **The close:** it resolves.
- **The sponsors:** a lighter groove.
- **The end card:** a final chord.

The SFX (pops, clicks, typing, whooshes, chimes) are tuned to the same key and share one reverb. There's no voiceover; the key lines are on screen, and `../SCRIPT.md` is the VO to generate.

## Rebuild

```
cd docs/video/brag-output/work
node record.mjs <clip>      # re-record a live clip (dev server on :5689)
node render.mjs sheet       # stills for every scene
node render.mjs cues        # cues.json for the audio
node music.mjs              # soundtrack.wav
node render.mjs video 8     # video-silent.mp4
```

Then `finish.sh` muxes the audio, sets the poster frame and writes `brag.mp4` and `brag.jpg`.
