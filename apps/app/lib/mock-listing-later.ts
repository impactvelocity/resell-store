/*
 * Prototype data for the later listing steps (C5 Photos, C6 Words,
 * C7 Publish and share, C8 List elsewhere). Same yellow dutch oven as
 * `draftListing` in ./mock. Nothing here is real.
 */

import { draftListing, getShop, me } from "./mock";

export const listingShop = getShop(draftListing.shopSlug);

/** maya-home.resell.store/dutch-oven */
export const listingLink = `${listingShop.domain}/${draftListing.id}`;

/** What the person settled on in Details (C4), shown again on later steps. */
export const earlierFields = [
  { key: "item", label: "Item", value: "Round dutch oven" },
  { key: "brand", label: "Brand", value: "Le Creuset" },
  { key: "colour", label: "Colour", value: "Yellow" },
  { key: "size", label: "Size", value: "5.5 qt" },
  { key: "condition", label: "Condition", value: "Barely used, light marks on the base" },
  { key: "bought", label: "Bought", value: "2021, a gift" },
  { key: "box", label: "Box", value: "No box" },
];

export const earlierPrice = {
  price: draftListing.price,
  lowest: draftListing.lowest,
  takeOffers: true,
};

/* Photos ----------------------------------------------------------------- */

export type PhotoArt =
  | "pot"
  | "pot-top"
  | "inside"
  | "base"
  | "handles"
  | "video";

export type ShotKey = "whole" | "inside" | "base" | "video";

export type Photo = {
  id: string;
  art: PhotoArt;
  /** Pictures the agent found carry the site they came from. */
  source?: string;
  /** The shot this photo covers, so the shot list can tick itself. */
  shot?: ShotKey;
  video?: boolean;
  /** Still coming in: dimmed with a progress ring. */
  uploading?: boolean;
};

export const initialPhotos: Photo[] = [
  { id: "p1", art: "pot", shot: "whole" },
  { id: "w1", art: "pot", source: "lecreuset.com" },
  { id: "w2", art: "pot-top", source: "lecreuset.com" },
];

export const shots: { key: ShotKey; label: string }[] = [
  { key: "whole", label: "The whole thing" },
  { key: "inside", label: "Inside the pot" },
  { key: "base", label: "The base, with the marks" },
  { key: "video", label: "A short video, if you like" },
];

/** What a fake "Add photos" brings in, in order. */
export const fakeUploads: { art: PhotoArt; shot?: ShotKey; note: string }[] = [
  { art: "inside", shot: "inside", note: "Added a photo of the inside" },
  { art: "base", shot: "base", note: "Added a photo of the base" },
  { art: "handles", note: "Added a close-up of the handles" },
];

export const maxPhotos = 12;

/* Words ------------------------------------------------------------------ */

export type Tone = "Friendly" | "Playful" | "Straight to the point" | "A bit luxe";

export const tones: Tone[] = [
  "Friendly",
  "Playful",
  "Straight to the point",
  "A bit luxe",
];

export type Draft = {
  title: string;
  oneLiner: string;
  description: string;
  /** The short line under the title on the buyer's card. */
  teaser: string;
};

export const titleMax = 80;
export const oneLinerMax = 120;

type ToneWriting = {
  takes: Draft[];
  shorter: string;
  longer: string;
};

export const writing: Record<Tone, ToneWriting> = {
  Friendly: {
    takes: [
      {
        title: "Sunny yellow Le Creuset dutch oven, 5.5 qt",
        oneLiner: "Barely used, cooks like a dream, ready for its next kitchen.",
        description:
          "A wedding gift that deserved more Sunday stews than I gave it. The enamel inside is perfect, with a few light marks on the base from the stove. It's the 5.5 quart, which feeds four to six. No box, so I'll wrap it well.",
        teaser: "Barely used, cooks like a dream",
      },
      {
        title: "Le Creuset round dutch oven in sunny yellow, 5.5 qt",
        oneLiner: "A happy yellow pot that's ready for a lot more soup.",
        description:
          "This was a wedding gift and it's been used a handful of times. Inside, the enamel is spotless. The base has a few light stove marks, nothing you'll notice on the table. Holds 5.5 quarts, so a big batch of chilli for six. I'll wrap it carefully since there's no box.",
        teaser: "A happy yellow pot, ready for soup",
      },
    ],
    shorter:
      "A barely used wedding gift. Perfect enamel inside, light marks on the base. 5.5 quart, feeds four to six. No box.",
    longer:
      "A wedding gift that deserved more Sunday stews than I gave it. The enamel inside is perfect: no chips, no cracks, no stains. There are a few light marks on the base from the stove, and I've added a photo so you can see them. It's the 5.5 quart round, which feeds four to six, and it works on gas, electric, induction and in the oven. No box, so I'll wrap it well and ship it in a double box.",
  },
  Playful: {
    takes: [
      {
        title: "Big yellow sunshine pot (Le Creuset, 5.5 qt)",
        oneLiner: "Looking for a kitchen that will actually make stew in it.",
        description:
          "This cheerful pot came to me as a wedding gift and has been waiting for its big moment ever since. The inside is spotless, the base has a couple of stove kisses, and it holds enough stew for four to six hungry people. No box, but it will travel in bubble wrap like royalty.",
        teaser: "Wants a kitchen that makes stew",
      },
      {
        title: "Le Creuset dutch oven, sunshine edition, 5.5 qt",
        oneLiner: "Barely used and very ready to braise something.",
        description:
          "A wedding gift with almost no miles on it. Spotless enamel, a few faint stove marks underneath, and room for dinner for six. Comes wrapped like a present, minus the box.",
        teaser: "Barely used, ready to braise",
      },
    ],
    shorter:
      "Wedding gift, barely used. Spotless inside, faint marks underneath, dinner for six. Wrapped like royalty.",
    longer:
      "This cheerful pot came to me as a wedding gift and has been waiting for its big moment ever since. The inside is spotless, with no chips or stains. The base has a couple of stove kisses, which you can see in the photos. It holds 5.5 quarts, enough stew for four to six hungry people, and it's happy on any hob or in the oven. No box, but it will travel in bubble wrap like royalty.",
  },
  "Straight to the point": {
    takes: [
      {
        title: "Le Creuset round dutch oven, yellow, 5.5 qt",
        oneLiner: "Barely used. Enamel perfect. Light marks on the base.",
        description:
          "Le Creuset round dutch oven, 5.5 qt, yellow. Received as a gift in 2021, used a few times. Interior enamel in perfect condition. Light stove marks on the base. No box. Shipped well wrapped.",
        teaser: "Barely used, enamel perfect",
      },
      {
        title: "Le Creuset 5.5 qt dutch oven, yellow, barely used",
        oneLiner: "2021 gift. Used a few times. No box.",
        description:
          "5.5 qt round dutch oven by Le Creuset in yellow. Bought 2021 as a gift. Interior enamel perfect, light marks on the base. Feeds four to six. No original box.",
        teaser: "2021 gift, used a few times",
      },
    ],
    shorter:
      "Le Creuset 5.5 qt, yellow. Barely used. Perfect enamel, light base marks. No box.",
    longer:
      "Le Creuset round dutch oven, 5.5 qt, yellow. Received as a gift in 2021 and used a few times. Interior enamel in perfect condition with no chips or stains. Light stove marks on the base, shown in the photos. Suitable for gas, electric, induction and oven. Feeds four to six. No box. Shipped double boxed and well wrapped.",
  },
  "A bit luxe": {
    takes: [
      {
        title: "Le Creuset signature dutch oven in soleil yellow, 5.5 qt",
        oneLiner: "A French classic, barely used, ready for slow Sunday cooking.",
        description:
          "A wedding gift kept for special occasions. The enamel interior is flawless, with only the faintest marks on the base from the stove. The 5.5 quart size serves four to six beautifully. Without its box, it will be wrapped with care.",
        teaser: "A French classic, barely used",
      },
      {
        title: "Soleil yellow Le Creuset round dutch oven, 5.5 qt",
        oneLiner: "Cast iron, glossy enamel, and almost never used.",
        description:
          "Cast iron with a glossy soleil enamel, kept mostly for display since it arrived as a wedding gift. Flawless interior, faint marks on the base. Serves four to six. Wrapped with care, no box.",
        teaser: "Glossy enamel, almost never used",
      },
    ],
    shorter:
      "A barely used wedding gift. Flawless enamel, faint base marks. Serves four to six. Wrapped with care.",
    longer:
      "A wedding gift kept for special occasions. The enamel interior is flawless, with only the faintest marks on the base from the stove. Enamelled cast iron holds heat evenly, so it's as good for a slow braise as for fresh bread. The 5.5 quart size serves four to six beautifully, and it goes from hob to oven to table. Without its box, it will be wrapped with care and double boxed.",
  },
};

/** Version 1 is the friendly draft before the person asked for the gift. */
export const firstDraft: Draft = {
  title: "Sunny yellow Le Creuset dutch oven, 5.5 qt",
  oneLiner: "Barely used, cooks like a dream, ready for its next kitchen.",
  description:
    "Barely used and looking for more Sunday stews. The enamel inside is perfect, with a few light marks on the base from the stove. It's the 5.5 quart, which feeds four to six. No box, so I'll wrap it well.",
  teaser: "Barely used, cooks like a dream",
};

/* Publish ---------------------------------------------------------------- */

export type ListingVisibility = "everyone" | "link";

export const visibilityOptions: {
  key: ListingVisibility;
  label: string;
  detail: string;
}[] = [
  {
    key: "everyone",
    label: "Everyone",
    detail: "In your shop and on the resell.store marketplace",
  },
  {
    key: "link",
    label: "Only people with the link",
    detail: "Hidden from your shop page and the marketplace",
  },
];

export const agentPromises = [
  "Answer buyers' questions from these details",
  `Haggle on offers, never under $${draftListing.lowest}`,
  "Ask you before I accept anything",
];

export type ShareTileKey = "square" | "story" | "qr";

export const shareTiles: {
  key: ShareTileKey;
  label: string;
  detail: string;
  size: string;
}[] = [
  { key: "square", label: "Square post", detail: "Instagram", size: "1080 by 1080" },
  { key: "story", label: "Tall story", detail: "Stories, TikTok", size: "1080 by 1920" },
  { key: "qr", label: "QR code", detail: "For yard sales", size: "Prints at any size" },
];

/* List elsewhere --------------------------------------------------------- */

export type Platform = {
  key: string;
  letter: string;
  name: string;
  /** Before it's connected. */
  pitch: string;
  connected: boolean;
  /** Will post this listing there. */
  on: boolean;
  goodFit?: boolean;
};

export const initialPlatforms: Platform[] = [
  {
    key: "facebook",
    letter: "F",
    name: "Facebook Marketplace",
    pitch: "Lots of local buyers.",
    connected: true,
    on: true,
  },
  {
    key: "ebay",
    letter: "e",
    name: "eBay",
    pitch: "Biggest reach for kitchen things.",
    connected: false,
    on: false,
    goodFit: true,
  },
  {
    key: "poshmark",
    letter: "P",
    name: "Poshmark",
    pitch: "Best for clothes, shoes and bags.",
    connected: false,
    on: false,
  },
  {
    key: "depop",
    letter: "D",
    name: "Depop",
    pitch: "Younger buyers, mostly clothing.",
    connected: false,
    on: false,
  },
];

export const connectedAs = `Connected as ${me.name}. Goes up in about a minute.`;

/* Canned agent replies ---------------------------------------------------- */

export const replies = {
  photos: [
    {
      thinking: "Looking at your photos",
      text: "Got it. A shot of the base with the marks will save you questions later, so I'd add that one next.",
    },
    {
      thinking: "Checking the shot list",
      text: "Good thinking. Four or more photos is the sweet spot, and the cover is already a strong one.",
    },
  ],
  words: [
    {
      thinking: "Rewriting the description",
      text: "Done. I worked that in and kept the rest. Have a look on the right.",
    },
    {
      thinking: "Trying another way to say it",
      text: "Here's a version with that in. If it's too much, tap Shorter.",
    },
  ],
  publish: [
    {
      thinking: "Checking the listing",
      text: "Noted. You can change any of this after it's live, and I'll keep buyers' answers in line with it.",
    },
  ],
  elsewhere: [
    {
      thinking: "Checking where it fits",
      text: "Sure. Whatever you switch on gets the same price and photos, and I'll take it down everywhere once it sells.",
    },
  ],
} as const;
