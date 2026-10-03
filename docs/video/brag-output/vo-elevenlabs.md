# Voiceover: ElevenLabs Eleven v4

Timed to `brag.mp4` (3:03.6). Each line starts at the time shown, which is when its moment lands on screen, and should finish before the next one starts. About 400 words, around 2.4 words a second, with gaps for the music.

## Settings

- **Model:** Eleven v4. Turbo is for speed and is less expressive.
- **Voice:** warm, friendly, conversational, like a friend showing you a clever trick, not an ad announcer.
- **Stability:** about 45%. Go lower if it sounds flat, higher if the tags push it over the top.
- **Similarity:** about 75%.
- **Tags:** one per clause, placed before the words they shape. `[pause]` and `[long pause]` replace SSML breaks, which v4 ignores. CAPS add emphasis.
- **Spellings that help it say things right:** "resell dot store", "Channel Three". Le Creuset is said "luh kruh-ZAY".
- **How to generate:** generate line by line and drop each clip at its timestamp, or paste the whole block at the end in one go (about 2,400 characters, well under v4's 10,000 limit) for one consistent read, then cut it at the `[long pause]` marks.
- **Mixing:** the music sits at -15 LUFS, so pull it down about 8–10 dB under the voice.

## Lines

| # | Starts | Scene | Line |
|---|---|---|---|
| 1 | 0:00.4 | Hook | `[curious] The average American home has over four thousand dollars of stuff... [pause] it never uses.` |
| 2 | 0:07.3 | Friction | `[playful] Because selling it means pricing it... photographing it... writing it up... [rushed] answering "is this still available?" twenty times, haggling with lowballers, dodging scams. [sighs] So it stays in the cupboard.` |
| 3 | 0:17.5 | The turn | `[optimistic] But a third of people who never sell say they WOULD... if AI did the listing. [pause] [confident] So we built that.` |
| 4 | 0:25.3 | Meet | `[proud] This is resell dot store, built for the PayPal AI Hackathon. [pause] [warm] Sell your stuff... without doing the selling.` |
| 5 | 0:31.8 | Snap | `[warm] Maya snaps her old dutch oven, and adds one line.` |
| 6 | 0:36.0 | Research | `[curious] Her agent goes to work. Recent sales... the maker's own site... what buyers say.` |
| 7 | 0:41.8 | Price lands | `[amazed] Thirty-eight seconds later... a fair price. [pause] [content] And it shows where it came from.` |
| 8 | 0:50.8 | Asks, writes | `[thoughtful] It only asks what a photo can't show... [pause] then writes the listing, in her words.` |
| 9 | 0:58.9 | Publish | `[snappy] One tap... and it's live.` |
| 10 | 1:04.4 | Her shop | `[warm] In her own shop, with a link she can share anywhere.` |
| 11 | 1:07.8 | Answers | `[calm] Buyers ask questions. Her agent answers from the listing... and hands over to Maya when it can't.` |
| 12 | 1:15.0 | Haggle | `[playful] Then Jess's agent makes an offer. [pause] Maya's agent haggles back: a counter, a deposit to show she's serious...` |
| 13 | 1:22.3 | It waits | `[thoughtful] ten dollars over her lowest. [pause] But it never accepts on its own.` |
| 14 | 1:25.4 | The yes | `[slowly, warm] Good offers... wait for YOUR yes.` |
| 15 | 1:28.8 | Accept | `[confident] Maya says yes.` |
| 16 | 1:32.3 | Sold | `[pleased] Sold.` |
| 17 | 1:34.4 | PayPal holds | `[calm, reassuring] Jess pays through PayPal. PayPal holds it until it arrives...` |
| 18 | 1:38.6 | Payout | `[content] then Maya gets paid.` |
| 19 | 1:41.4 | Buyer's agent | `[excited] And buyers can send their own agent. [pause] Add resell dot store to the AI you already use, set a limit... and it shops, haggles, and asks before it pays.` |
| 20 | 1:51.4 | Sidekick | `[playful] Buyers get a shopping sidekick, too.` |
| 21 | 1:55.1 | Sidekick | `[curious] It checks what something will be worth later...` |
| 22 | 1:58.9 | Sidekick | `[softly, sincere] Not to flip it. [pause] Just to know.` |
| 23 | 2:02.3 | Close | `[thoughtful] US resale is heading for three hundred billion dollars.` |
| 24 | 2:05.4 | Close | `[warm, proud] We made selling as easy as saying yes.` |
| 25 | 2:08.9 | Render | `[confident, brisk] Render runs it all: the app, every shop, the database, and the workflows that release payouts on time.` |
| 26 | 2:16.4 | Channel3 | `[confident, brisk] Channel Three tells the agent what it really is: the price new, the price used, and the maker's own photos.` |
| 27 | 2:23.9 | Kernel | `[confident, brisk] Kernel gives the agent real browsers in the cloud... to search resale marketplaces and the web, even signed in to the seller's own accounts.` |
| 28 | 2:31.9 | PayPal | `[proud] And PayPal moves every dollar. Sellers connect in a tap, buyers can pay later, the money's held until it arrives... and refunds and disputes are handled.` |
| 29 | 2:40.8 | Open source | `[proud] And resell dot store is open source.` |
| 30 | 2:43.2 | Open source | `[snappy] Sales page. Sign-in. The marketplace. The agents. The API. Payments. Emails. Design system.` |
| 31 | 2:47.0 | Open source | `[warm, confident] Every step... covered.` |
| 32 | 2:52.9 | Mission | `[thoughtful] Over half a trillion dollars of it, sitting in American homes.` |
| 33 | 2:57.4 | Mission | `[slowly, warm] Our mission: nothing good goes unused.` |
| 34 | 3:01.1 | End card | `[warm, smiling] resell dot store.` |

Line 27 claims managed sign-in, which isn't built yet. If it doesn't ship, use: `[confident, brisk] Kernel gives the agent real browsers in the cloud, to search resale marketplaces and the web, and price from real listings.`

## One-take version

Paste this as one generation. The `[long pause]` marks are where to cut it into the timed lines above.

```
[curious] The average American home has over four thousand dollars of stuff... [pause] it never uses. [long pause]
[playful] Because selling it means pricing it... photographing it... writing it up... [rushed] answering "is this still available?" twenty times, haggling with lowballers, dodging scams. [sighs] So it stays in the cupboard. [long pause]
[optimistic] But a third of people who never sell say they WOULD... if AI did the listing. [pause] [confident] So we built that. [long pause]
[proud] This is resell dot store, built for the PayPal AI Hackathon. [pause] [warm] Sell your stuff... without doing the selling. [long pause]
[warm] Maya snaps her old dutch oven, and adds one line. [long pause]
[curious] Her agent goes to work. Recent sales... the maker's own site... what buyers say. [long pause]
[amazed] Thirty-eight seconds later... a fair price. [pause] [content] And it shows where it came from. [long pause]
[thoughtful] It only asks what a photo can't show... [pause] then writes the listing, in her words. [long pause]
[snappy] One tap... and it's live. [long pause]
[warm] In her own shop, with a link she can share anywhere. [long pause]
[calm] Buyers ask questions. Her agent answers from the listing... and hands over to Maya when it can't. [long pause]
[playful] Then Jess's agent makes an offer. [pause] Maya's agent haggles back: a counter, a deposit to show she's serious... [long pause]
[thoughtful] ten dollars over her lowest. [pause] But it never accepts on its own. [long pause]
[slowly, warm] Good offers... wait for YOUR yes. [long pause]
[confident] Maya says yes. [long pause]
[pleased] Sold. [long pause]
[calm, reassuring] Jess pays through PayPal. PayPal holds it until it arrives... [long pause]
[content] then Maya gets paid. [long pause]
[excited] And buyers can send their own agent. [pause] Add resell dot store to the AI you already use, set a limit... and it shops, haggles, and asks before it pays. [long pause]
[playful] Buyers get a shopping sidekick, too. [long pause]
[curious] It checks what something will be worth later... [long pause]
[softly, sincere] Not to flip it. [pause] Just to know. [long pause]
[thoughtful] US resale is heading for three hundred billion dollars. [long pause]
[warm, proud] We made selling as easy as saying yes. [long pause]
[confident, brisk] Render runs it all: the app, every shop, the database, and the workflows that release payouts on time. [long pause]
[confident, brisk] Channel Three tells the agent what it really is: the price new, the price used, and the maker's own photos. [long pause]
[confident, brisk] Kernel gives the agent real browsers in the cloud... to search resale marketplaces and the web, even signed in to the seller's own accounts. [long pause]
[proud] And PayPal moves every dollar. Sellers connect in a tap, buyers can pay later, the money's held until it arrives... and refunds and disputes are handled. [long pause]
[proud] And resell dot store is open source. [long pause]
[snappy] Sales page. Sign-in. The marketplace. The agents. The API. Payments. Emails. Design system. [long pause]
[warm, confident] Every step... covered. [long pause]
[thoughtful] Over half a trillion dollars of it, sitting in American homes. [long pause]
[slowly, warm] Our mission: nothing good goes unused. [long pause]
[warm, smiling] resell dot store.
```
