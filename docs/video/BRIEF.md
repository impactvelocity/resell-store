---
workflow: product-launch-video
flow: companion
storyboard: yes
message: "Snap a photo, say yes, get paid — your agent does the selling in between."
destination: youtube
aspect: 1920x1080
language: en
audience: PayPal AI Hackathon judges on Devpost, and visitors to the resell.store landing page
length: 2m56s
angle: follow-one-item
---

## Intent

A sub-3-minute sales demo for resell.store, used both as the Devpost submission video for the PayPal AI Hackathon and in the landing page's demo slot (`apps/app/components/landing/video-demo.tsx`, `DEMO_VIDEO_URL`).

Arc: set the stage with real resale stats → the friction of selling → the agentic answer → follow **one item**, Maya's yellow Le Creuset dutch oven, from photo to payout → a buyer's agent shopping over MCP → the shopping sidekick for buyers → the close → one quick screen per sponsor showing how it's used (Render, Channel3, Kernel, PayPal) → open source, every step covered → the mission, "nothing good goes unused", into the end card.

Tone: warm, bright and a bit cheeky, like the app's own copy ("Sell your stuff without doing the selling"). Confident, never hype-y. The agent is the hero, and the human stays in charge: "Good offers wait for your yes."

## Assets

- `captures/desktop/*.png` — 1600×1000 @2x captures of every designed screen (mock data: Maya, the dutch oven, Jess's offer, Second Shutter's camera). Re-shoot with `node docs/video/capture.mjs`.
- `captures/phone/*.png` — 390×844 @3x phone captures of the key screens.
- `captures/desktop/l1-landing-full.png`, `b3-shop-settings.png`, `d2-connect-agent.png` — full-page captures for scroll moves.
- Brand: `packages/ui/src/styles.css` (tokens), `@repo/ui/logo` (wordmark), `@repo/ui/whimsy` (FlowerMark), `apps/app/components/landing/paypal-logo.tsx`.
- Item illustrations from the app (pot, camera, dress, sweater, record) for the opening.

## Customizations

- Voiceover is **script only**: `SCRIPT.md` holds the lines. Generate the AI voice outside this project. The cut is **music-led**, so it must work with music alone, with key lines as on-screen type.
- Count-up treatment on the stat numbers ($4,267, $15.9B, $306.5B).
- The negotiation timeline on the offer screen (C10) builds row by row, like a live chat.
- Every stat carries a small source line (see `RESEARCH.md`).

## Notes

- **Devpost rules:** under 3:00, public on YouTube, must show the project working, and no third-party trademarks or copyrighted music without permission. Use royalty-free music. Don't name or show third-party platforms in the VO or the new graphics: say "popular resale marketplaces" and "the AI assistant you already use". Some captures show platform or assistant names as text (c8-elsewhere, d1-connections, p7-buyer-agent's assistant row, p6's hand-off button), so crop or cover those.
- The captures are the designed prototype (mock mode). Judges score "working end-to-end", so cut in at least two **live** recordings: the real PayPal sandbox approval and capture (frame 11), and a real research run or agent chat (frame 6). See `STORYBOARD.md` → "Live footage to record".
- Sponsor screens (frames 15–18) only cover what the code actually uses: Render (web, Postgres, Workflows), Channel3, Kernel (frame 17 promises managed sign-in to sellers' own accounts, which isn't built yet; today it searches public marketplace listings only) and PayPal. Don't credit the AI model by name; "an agent" is enough. The landing page also lists AG Grid, Bryntum, Elastic, Zapier, APIMatic and Astropods. Add each one to the video only once it's built.
- Frame 19 says resell.store is open source. The repo has an MIT `LICENSE` (added 2026-10-03), and Devpost requires a public repo with a visible license, so make the repo public before the video goes out. Hackathon page: https://paypalaihackathon.devpost.com/
- The research and stats are in `RESEARCH.md`, with sources and a "don't use" list.
