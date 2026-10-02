/*
 * Prototype data for the listing flow, C1 to C4: what the research "finds"
 * for the yellow Le Creuset dutch oven, the questions the agent asks, and the
 * canned things it says back. Nothing here is real.
 */

import type { Field } from "../components/workspace/listing-panel";

export const LISTING_ID = "dutch-oven";

export const listingHref = (step: string) => `/list/${LISTING_ID}/${step}`;

/** What the person typed on C1, and what the first message says. */
export const firstMessage = "Le Creuset dutch oven, the yellow one. It was a wedding gift.";
export const startSuggestion = "Le Creuset dutch oven, the yellow one";
export const startTryChips = ["A dress I wore once", "My old camera", "A box of records"];

/* Findings --------------------------------------------------------------- */

export type PriceRange = {
  /** Lowest and highest sale found: the ends of the track. */
  min: number;
  max: number;
  /** Where most of them sold, the middle half: the band. */
  bandLow: number;
  bandHigh: number;
  suggested: number;
};

export const priceRange: PriceRange = {
  min: 120,
  max: 240,
  bandLow: 160,
  bandHigh: 210,
  suggested: 185,
};

export const findingFacts = [
  { label: "Still sold new", value: "Yes, for $420" },
  { label: "Sells in", value: "About 6 days" },
  { label: "Demand", value: "High, 42 sold in 90 days" },
  { label: "Buyers say", value: "4.8 of 5, “lasts forever”" },
];

export type Source = {
  key: string;
  label: string;
  title: string;
  description: string;
  items: { title: string; detail: string; value?: string }[];
};

export const findingSources: Source[] = [
  {
    key: "sales",
    label: "42 recent sales",
    title: "42 recent sales",
    description: "Used round dutch ovens like yours, sold in the last 90 days.",
    items: [
      { title: "Le Creuset 5.5 qt, Soleil yellow", detail: "Sold 3 days ago, light wear", value: "$190" },
      { title: "Le Creuset round 5.5 qt, yellow", detail: "Sold 8 days ago, no box", value: "$175" },
      { title: "Le Creuset 5.5 qt dutch oven", detail: "Sold 12 days ago, like new", value: "$210" },
      { title: "Le Creuset round, Dijon", detail: "Sold 19 days ago, chip on rim", value: "$140" },
      { title: "Le Creuset 5.5 qt, yellow, boxed", detail: "Sold 26 days ago", value: "$205" },
    ],
  },
  {
    key: "maker",
    label: "The maker's site",
    title: "The maker's site",
    description: "Still sold new, so buyers can compare.",
    items: [
      { title: "Signature round dutch oven, 5.5 qt", detail: "In stock, several colours", value: "$420" },
    ],
  },
  {
    key: "reviews",
    label: "318 buyer reviews",
    title: "318 buyer reviews",
    description: "What owners say about this pot.",
    items: [
      { title: "“Lasts forever”", detail: "Said in 64 reviews" },
      { title: "“Heavy, but worth it”", detail: "Said in 41 reviews" },
      { title: "“The enamel can chip if you drop it”", detail: "Said in 12 reviews" },
    ],
  },
];

/* Research tool rows ----------------------------------------------------- */

export type ResearchRow = {
  tag: string;
  running: { title: string; detail: string };
  done: { title: string; detail: string };
  queued: { title: string };
};

/** One row for each thing the agent looks at in C2. */
export const researchRows: ResearchRow[] = [
  {
    tag: "Photo",
    queued: { title: "Looking at your photo" },
    running: { title: "Looking at your photo", detail: "Working out the shape and size" },
    done: { title: "Looked at your photo", detail: "Round, about 5.5 qt, yellow enamel" },
  },
  {
    tag: "Sales",
    queued: { title: "Checking recent sales" },
    running: { title: "Checking recent sales", detail: "Finding ones like yours" },
    done: { title: "Checked 42 recent sales", detail: "Most went for $160 to $210" },
  },
  {
    tag: "Browser",
    queued: { title: "Visiting the maker's site" },
    running: { title: "Visiting the maker's site", detail: "Seeing if it's still sold new" },
    done: { title: "Visited the maker's site", detail: "Still sold new, for $420" },
  },
  {
    tag: "Browser",
    queued: { title: "Reading what buyers say" },
    running: { title: "Reading what buyers say", detail: "Going through 318 reviews" },
    done: { title: "Read what buyers say", detail: "4.8 of 5, most say it lasts forever" },
  },
];

export const researchSummary = "Looked in 4 places, took 38 seconds";

/* Item fields ------------------------------------------------------------ */

/** What the photo told the agent. Filled once the first tool row is done. */
export const foundFields: Field[] = [
  { key: "item", label: "Item", value: "Round dutch oven", state: "filled" },
  { key: "brand", label: "Brand", value: "Le Creuset", state: "filled" },
  { key: "colour", label: "Colour", value: "Yellow", state: "filled" },
  { key: "size", label: "Size", value: "About 5.5 qt", state: "filled" },
];

/** The agent's questions in C3, in order. Each one writes a field. */
export type Question = {
  field: "condition" | "box" | "bought" | "size";
  /** The agent's message. The first one is part of the findings message. */
  ask: string;
  options: { label: string; value: string }[];
};

export const questions: Question[] = [
  {
    field: "condition",
    ask: "Now a few quick questions so the listing is honest. Any chips or cracks in the enamel?",
    options: [
      { label: "None", value: "No chips or cracks" },
      { label: "A small one", value: "One small chip" },
      { label: "A few", value: "A few chips" },
    ],
  },
  {
    field: "box",
    ask: "Good, that helps the price. Do you still have the box?",
    options: [
      { label: "Yes, the original box", value: "Original box" },
      { label: "No box", value: "No box" },
      { label: "Not sure", value: "Not sure" },
    ],
  },
  {
    field: "bought",
    ask: "Thanks. You said it was a wedding gift. Roughly when was that?",
    options: [
      { label: "2021", value: "2021, a gift" },
      { label: "2018", value: "2018, a gift" },
      { label: "Before that", value: "Before 2018, a gift" },
    ],
  },
  {
    field: "size",
    ask: "Last one. I guessed the size from your photo. Is it the 5.5 qt?",
    options: [
      { label: "Yes, 5.5 qt", value: "5.5 qt" },
      { label: "It's smaller", value: "4.5 qt" },
      { label: "Not sure", value: "About 5.5 qt" },
    ],
  },
];

export const questionLabels: Record<Question["field"], string> = {
  condition: "Condition",
  bought: "Bought",
  box: "Box",
  size: "Size",
};

/* C4 details ------------------------------------------------------------- */

export const detailFields: Field[] = [
  { key: "item", label: "Item", value: "Round dutch oven", state: "editable" },
  { key: "brand", label: "Brand", value: "Le Creuset", state: "editable" },
  { key: "colour", label: "Colour", value: "Yellow", state: "editable" },
  { key: "size", label: "Size", value: "5.5 qt", state: "editable" },
  {
    key: "condition",
    label: "Condition",
    value: "Barely used, light marks on the base",
    state: "editable",
    justChanged: true,
  },
  { key: "bought", label: "Bought", value: "2021, a gift", state: "editable" },
  { key: "box", label: "Box", value: "No box", state: "editable" },
];

/* Canned replies ---------------------------------------------------------- */

export const cannedReplies = {
  researching: "Got it, I'll keep that in mind while I look.",
  findings: "Noted. You can change anything in the listing before we move on.",
  done: "Noted. When you're happy, we'll check the details next.",
  details:
    "Got it. Tap any line to change it, or tell me. When it reads right, we'll do photos.",
};
