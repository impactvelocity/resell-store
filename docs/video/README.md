# Demo video

Pre-production for the sub-3-minute resell.store demo, used for the PayPal AI Hackathon Devpost submission and in the landing page's demo slot (`apps/app/components/landing/video-demo.tsx`).

| File | What it is |
| --- | --- |
| `BRIEF.md` | The confirmed brief, in HyperFrames format: message, audience, length, angle, rules and notes |
| `STORYBOARD.md` | 20 frames, about 2:56, with on-screen type, VO guide, assets and motion direction. Ends with the live footage to record |
| `SCRIPT.md` | The voiceover lines with timing and delivery, ready for your AI voice |
| `RESEARCH.md` | Every stat with its source, spares, a "don't use" list, and the Devpost video rules and judging criteria |
| `storyboard.html` | A visual contact sheet of the storyboard. Rebuild it with `node docs/video/build-sheet.mjs` after editing `STORYBOARD.md` |
| `captures/` | Screens from the app: `desktop/` at 1600×1000 @2x, `phone/` at 390×844 @3x |
| `capture.mjs` | Re-shoots the captures. Needs the dev server on :5689 and Chrome: `node docs/video/capture.mjs` (or `… c10 p4` for some shots) |

## Building it in HyperFrames

1. `npx hyperframes init` in a new, empty folder (init refuses a non-empty one).
2. Copy in `BRIEF.md`, `STORYBOARD.md`, `SCRIPT.md` and `captures/`. HyperFrames reads `BRIEF.md` and skips the interview.
3. Drop in the generated voiceover and a royalty-free music track. Devpost bans copyrighted music without permission.
4. Record the live footage listed at the end of `STORYBOARD.md`, then cut it in.
5. Render, upload to YouTube (public), and paste the link into `DEMO_VIDEO_URL` in `video-demo.tsx`.
