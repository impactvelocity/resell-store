import type { ShopTone } from "@repo/db";

/*
 * The made-up marketplace that scripts/seed.ts writes: ten stores, their
 * owners, a few buyers, and what each store sells. Prices are in dollars.
 *
 * `image` on an item (and `picture` on a store) is the brief for its picture:
 * what to draw, in the palette's colour names. The drawings themselves are
 * SVGs in seed/art/{store}/{item}.svg (and _store.svg); `pnpm seed:art` turns
 * them into seed/images/*.png, which the seed uploads. seed/image-style.ts has
 * the style, also as a prompt for an image model.
 *
 * The cards and building sets are fictional brands (Beastlings, Brickwerk).
 */

export type SeedPerson = {
  /** Becomes the user id "seed_{handle}". */
  handle: string;
  name: string;
  email: string;
  location: string;
  about?: string;
};

export type SeedItem = {
  /** Path in the store, and the picture's file name. */
  slug: string;
  /** The short name used in lists. */
  name: string;
  title: string;
  oneLiner: string;
  description: string;
  category: string;
  fields: { label: string; value: string }[];
  price: number;
  /** Lowest the store's agent will go. Defaults to the store's lowestPercent off. */
  lowest?: number;
  shipping: number;
  takeOffers?: boolean;
  status?: "live" | "draft";
  /** Sold to a buyer, who left a review. */
  sold?: { buyer: string; daysAgo: number; rating: number; review: string; reply?: string };
  /** A buyer's question in messages, and the seller's answer if there is one. */
  question?: { buyer: string; ask: string; answer?: string };
  /** What the picture shows. */
  image: string;
};

export type SeedStore = {
  slug: string;
  name: string;
  owner: SeedPerson;
  about: string;
  category: string;
  tone: ShopTone;
  location: string;
  /** % off the price the agent may go down to. */
  lowestPercent?: number;
  /** Days ago the store opened. */
  openedDaysAgo: number;
  /** The store's round picture. */
  picture: string;
  items: SeedItem[];
};

export const buyers: SeedPerson[] = [
  { handle: "ava", name: "Ava Lindqvist", email: "ava.lindqvist@example.com", location: "Portland, OR" },
  { handle: "noah", name: "Noah Feld", email: "noah.feld@example.com", location: "Chicago, IL" },
  { handle: "rosa", name: "Rosa Martín", email: "rosa.martin@example.com", location: "Ottawa, ON" },
  { handle: "jamal", name: "Jamal Wright", email: "jamal.wright@example.com", location: "Atlanta, GA" },
];

export const stores: SeedStore[] = [
  /* Bags and purses ------------------------------------------------------- */
  {
    slug: "claspandcarry",
    name: "Clasp & Carry",
    owner: {
      handle: "priya",
      name: "Priya Nair",
      email: "priya.nair@example.com",
      location: "Toronto, ON",
      about: "Bag nerd. I clean and condition everything before it goes up.",
    },
    about:
      "Leather bags from the 70s to the 90s, cleaned, conditioned and carried around the house to check the straps. Plus the odd evening bag.",
    category: "A bit of everything",
    tone: "blush",
    location: "Toronto, ON",
    openedDaysAgo: 210,
    picture:
      "A small structured handbag with a round top handle, seen from the front, in blush pink and amber with an ink clasp",
    items: [
      {
        slug: "coach-willis-british-tan",
        name: "Coach Willis bag",
        title: "Coach Willis bag in British tan, 1990s",
        oneLiner: "The classic bucket bag with the brass turn-lock, soft from years of use",
        description:
          "Made in the USA in the 90s, style 9927. The leather has the warm patina these get, with no cracks or dry spots after a full clean and condition. The turn-lock closes firmly, the handle and strap are both original, and the lining is clean apart from one faint pen mark. Hang tag still attached.",
        category: "Bags and purses",
        fields: [
          { label: "Brand", value: "Coach" },
          { label: "Style", value: "Willis 9927" },
          { label: "Made", value: "USA, 1990s" },
          { label: "Colour", value: "British tan" },
          { label: "Size", value: "11 x 9 x 4 in" },
          { label: "Condition", value: "Very good, even patina" },
          { label: "Flaws", value: "Faint pen mark in lining" },
        ],
        price: 185,
        lowest: 160,
        shipping: 14,
        question: {
          buyer: "ava",
          ask: "Hi! How long is the shoulder strap at its longest?",
          answer: "Hi Ava, it's 46 inches at the longest hole, so it sits at the hip on me (5'6\").",
        },
        image:
          "A vintage leather bucket bag with a flap closure, a short rounded top handle and a long thin shoulder strap looping up behind it. Small round turn-lock on the flap. Leather in amber, stitching as thin ink lines along the edges, turn-lock in lemon. Straight-on front view.",
      },
      {
        slug: "dooney-bourke-satchel-navy",
        name: "Dooney & Bourke satchel",
        title: "Dooney & Bourke All-Weather Leather satchel in navy, 1980s",
        oneLiner: "Thick pebbled leather that shrugs off rain and still looks sharp",
        description:
          "The All-Weather Leather line they made in Connecticut, in a deep navy that reads almost black indoors. Two outside slip pockets, brass hardware with the duck fob, and an adjustable strap. Corners show light rubbing and the brass has toned down. Inside is clean and smells of nothing but leather.",
        category: "Bags and purses",
        fields: [
          { label: "Brand", value: "Dooney & Bourke" },
          { label: "Line", value: "All-Weather Leather" },
          { label: "Made", value: "USA, 1980s" },
          { label: "Colour", value: "Navy" },
          { label: "Size", value: "12 x 10 x 4 in" },
          { label: "Condition", value: "Good, light corner wear" },
        ],
        price: 120,
        shipping: 14,
        image:
          "A sturdy rectangular leather satchel with a flap, two slip pockets on the front, a buckled strap, and a small duck-shaped fob hanging from one side. Leather in ink, buckles and fob in lemon, a thin leaf-green trim along the flap edge. Straight-on front view.",
      },
      {
        slug: "longchamp-le-pliage-pink",
        name: "Longchamp Le Pliage",
        title: "Longchamp Le Pliage large tote, bright pink",
        oneLiner: "The fold-flat travel tote, in the pink that's hard to find now",
        description:
          "Large size with long handles, in a bright pink they stopped making a few seasons ago. The nylon is clean with no stains, the leather flap and handles have a little darkening from hands, and the zip runs smoothly. Folds down to the size of a paperback for travel.",
        category: "Bags and purses",
        fields: [
          { label: "Brand", value: "Longchamp" },
          { label: "Model", value: "Le Pliage, large, long handles" },
          { label: "Colour", value: "Bright pink" },
          { label: "Condition", value: "Very good" },
          { label: "Flaws", value: "Light darkening on the handles" },
        ],
        price: 95,
        shipping: 11,
        sold: {
          buyer: "rosa",
          daysAgo: 18,
          rating: 5,
          review: "Exactly as described and packed beautifully. The pink is even brighter in person.",
          reply: "So glad it found you, Rosa. Enjoy the travels!",
        },
        image:
          "A trapezoid nylon tote bag with two long handles and a small rounded flap with a snap at the top centre. Body in pink, handles and flap in amber, zip as a thin ink line along the top. Straight-on front view.",
      },
      {
        slug: "beaded-evening-clutch-1950s",
        name: "Beaded evening clutch",
        title: "White glass-bead evening clutch with gold frame, 1950s",
        oneLiner: "Hand-beaded and heavier than it looks, for weddings and nights out",
        description:
          "Made in Hong Kong in the 50s, covered in tiny white glass beads sewn in a swirl pattern. The gold-tone kiss-lock frame snaps shut with a good click and there's a short chain you can tuck inside. Every bead is there. The satin lining has one small spot near the hinge.",
        category: "Bags and purses",
        fields: [
          { label: "Made", value: "Hong Kong, 1950s" },
          { label: "Material", value: "Glass beads on satin" },
          { label: "Closure", value: "Kiss-lock frame" },
          { label: "Size", value: "8 x 5 in" },
          { label: "Condition", value: "Excellent, no missing beads" },
          { label: "Flaws", value: "Small spot in lining" },
        ],
        price: 58,
        shipping: 9,
        image:
          "A small rounded evening clutch with a kiss-lock frame on top and a short loop of chain beside it. Body in white covered in tiny dots arranged in swirls, frame and chain in lemon, the two kiss-lock beads in amber. Straight-on front view.",
      },
      {
        slug: "frye-melissa-crossbody",
        name: "Frye crossbody",
        title: "Frye Melissa crossbody in cognac leather",
        oneLiner: "Small enough for a phone and keys, built like a saddle",
        description:
          "Full-grain cognac leather with the antique brass hardware Frye is known for. One zip compartment inside, a slip pocket on the back, and an adjustable strap. Carried for one summer: a little softening at the corners and a crease where the strap folds. No marks on the front.",
        category: "Bags and purses",
        fields: [
          { label: "Brand", value: "Frye" },
          { label: "Model", value: "Melissa crossbody" },
          { label: "Colour", value: "Cognac" },
          { label: "Size", value: "9 x 7 x 2 in" },
          { label: "Condition", value: "Excellent" },
        ],
        price: 110,
        shipping: 11,
        image:
          "A small rectangular crossbody bag with a curved flap, a single brass stud closure and a long thin strap rising from both top corners. Leather in amber, stud and strap rings in lemon, stitching as thin ink lines. Straight-on front view.",
      },
      {
        slug: "kate-spade-sam-black",
        name: "Kate Spade Sam tote",
        title: "Kate Spade Sam nylon tote in black, late 1990s",
        oneLiner: "The original boxy nylon bag that started it all",
        description:
          "The Sam bag from the late 90s, in black nylon with the little stitched label on the front. It holds its square shape, the handles have no cracks, and the inside is clean. Some light fading on the bottom edge, which you can only see in daylight.",
        category: "Bags and purses",
        fields: [
          { label: "Brand", value: "Kate Spade New York" },
          { label: "Model", value: "Sam" },
          { label: "Made", value: "Late 1990s" },
          { label: "Colour", value: "Black" },
          { label: "Condition", value: "Good, light fading on base" },
        ],
        price: 75,
        shipping: 11,
        image:
          "A boxy square nylon tote with two short flat handles and a small plain white rectangle stitched to the front centre where a label would be. Body in ink, the label patch in white, a thin pink stitched border around the patch. Straight-on front view.",
      },
      {
        slug: "straw-market-basket",
        name: "Straw market basket",
        title: "Hand-woven straw market basket with leather handles",
        oneLiner: "For the farmers' market, the beach, or a plant",
        description:
          "Tightly woven straw with two long leather handles, made in Ghana. Big enough for a week of vegetables or a towel and a book. It has been used: a couple of loose strands near the base that don't affect anything, and the handles have darkened nicely.",
        category: "Bags and purses",
        fields: [
          { label: "Made", value: "Ghana" },
          { label: "Material", value: "Elephant grass, leather handles" },
          { label: "Size", value: "16 x 12 in, 9 in deep" },
          { label: "Condition", value: "Good, a few loose strands" },
        ],
        price: 42,
        shipping: 12,
        image:
          "A round-bottomed woven market basket with two long leather handles arching over the top. Basket in lemon with a woven pattern made of short amber dashes, one band of pink weave near the rim, handles in amber. Straight-on front view.",
      },
    ],
  },

  /* Clothing, men's and women's ------------------------------------------ */
  {
    slug: "tworail",
    name: "Two Rail Thrift",
    owner: {
      handle: "dana",
      name: "Dana Okafor",
      email: "dana.okafor@example.com",
      location: "Oakland, CA",
      about: "One rail for him, one rail for her. Everything washed and measured flat.",
    },
    about:
      "Two rails: men's on the left, women's on the right. Workwear, outdoor and good basics, washed and measured flat. Measurements in every listing.",
    category: "Clothes",
    tone: "mint",
    location: "Oakland, CA",
    openedDaysAgo: 340,
    picture:
      "A wooden clothes hanger with a folded mint shirt draped over it, in mint, leaf green and ink",
    items: [
      {
        slug: "levis-501-33x32",
        name: "Levi's 501 jeans",
        title: "Levi's 501 jeans, men's 33 x 32, made in USA 1990s",
        oneLiner: "Medium wash, button fly, broken in exactly right",
        description:
          "US-made 501s from the 90s with the red tab and paper-style patch. Tagged 33 x 32; they measure 32 at the waist laid flat and 31 in the inseam after washes. Even fading on the thighs, no holes, and the hems are original. A small repair on the back belt loop.",
        category: "Men's clothing",
        fields: [
          { label: "Brand", value: "Levi's" },
          { label: "Model", value: "501, button fly" },
          { label: "Size", value: "Tagged 33 x 32, measures 32 x 31" },
          { label: "Made", value: "USA, 1990s" },
          { label: "Condition", value: "Very good" },
          { label: "Flaws", value: "Repaired back belt loop" },
        ],
        price: 85,
        shipping: 10,
        image:
          "A pair of straight-leg jeans laid flat, front view, with five-pocket details, a button fly drawn as a row of small dots, and a tiny tab on the back pocket edge. Denim in mint, seams and pocket stitching as thin leaf-green lines, buttons in lemon, the tiny tab in berry red.",
      },
      {
        slug: "patagonia-synchilla-snap-t",
        name: "Patagonia Synchilla Snap-T",
        title: "Patagonia Synchilla Snap-T fleece, men's M, green with pink trim",
        oneLiner: "The 90s fleece everyone wants, in a colourway that pops",
        description:
          "A soft green Synchilla with pink trim on the placket and chest pocket. Men's medium, 22 inches pit to pit. Light pilling under the arms, as these always get, and the snaps all close firmly. No stains or holes. Warm enough for a fall hike on its own.",
        category: "Men's clothing",
        fields: [
          { label: "Brand", value: "Patagonia" },
          { label: "Model", value: "Synchilla Snap-T" },
          { label: "Size", value: "Men's M, 22 in pit to pit" },
          { label: "Colour", value: "Green with pink trim" },
          { label: "Condition", value: "Very good, light pilling" },
        ],
        price: 78,
        shipping: 10,
        question: {
          buyer: "noah",
          ask: "Would this fit someone who's usually a large in Patagonia? Shoulders are my problem.",
        },
        image:
          "A pullover fleece laid flat, front view, with a short snap placket at the neck, a small chest pocket on the left with a flap, and ribbed cuffs. Body in leaf green, placket, pocket flap and cuffs trimmed in pink, four snaps in lemon. Fleece suggested by a few soft rounded bumps along the outline.",
      },
      {
        slug: "barbour-bedale-olive-40",
        name: "Barbour Bedale",
        title: "Barbour Bedale waxed jacket, men's 40, olive",
        oneLiner: "Freshly re-waxed, ready for another twenty years of rain",
        description:
          "The short Bedale in olive with the corduroy collar and tartan lining. Size 40. I re-waxed it last month, so it's water-tight and has that slightly tacky feel for a few weeks. Zip and storm flap snaps all work. The cord collar has some wear at the fold, which is normal for these.",
        category: "Men's clothing",
        fields: [
          { label: "Brand", value: "Barbour" },
          { label: "Model", value: "Bedale" },
          { label: "Size", value: "Men's 40" },
          { label: "Colour", value: "Olive" },
          { label: "Condition", value: "Very good, re-waxed" },
          { label: "Flaws", value: "Wear on collar fold" },
        ],
        price: 165,
        lowest: 140,
        shipping: 14,
        image:
          "A short waxed jacket laid flat, front view, zipped closed with a storm flap, two large patch pockets with flaps, and a corduroy collar folded down. Jacket in leaf green, collar in ink with thin vertical lines for the cord, a peek of pink and lemon check lining at the open collar, snaps in lemon.",
      },
      {
        slug: "eileen-fisher-linen-wide-leg",
        name: "Eileen Fisher linen trousers",
        title: "Eileen Fisher wide-leg linen trousers, women's M, natural",
        oneLiner: "Breezy, easy and somehow always looks put together",
        description:
          "Organic linen in a natural oat colour with an elastic back waist and side pockets. Women's medium, 15 inches across the waist laid flat, 28 inch inseam. Washed and pressed. No marks, just the soft rumple linen is supposed to have.",
        category: "Women's clothing",
        fields: [
          { label: "Brand", value: "Eileen Fisher" },
          { label: "Material", value: "Organic linen" },
          { label: "Size", value: "Women's M, 28 in inseam" },
          { label: "Colour", value: "Natural" },
          { label: "Condition", value: "Excellent" },
        ],
        price: 64,
        shipping: 9,
        image:
          "A pair of wide-leg trousers laid flat, front view, with a smooth waistband, slanted side pockets and loose straight legs that flare slightly at the hem. Fabric in pale lemon, waistband and pocket edges as thin amber lines, three short soft creases on each leg in amber.",
      },
      {
        slug: "faithfull-floral-midi",
        name: "Faithfull floral midi dress",
        title: "Faithfull the Brand floral midi dress, women's S",
        oneLiner: "Tie straps and a flippy skirt, made for a summer wedding",
        description:
          "Rayon midi in a pink and white floral, with tie shoulder straps and a smocked back that gives a little. Women's small. Worn twice. There's one pulled thread near the hem that you'd need to look for. Hand washed and hung to dry.",
        category: "Women's clothing",
        fields: [
          { label: "Brand", value: "Faithfull the Brand" },
          { label: "Size", value: "Women's S" },
          { label: "Material", value: "Rayon" },
          { label: "Condition", value: "Excellent, worn twice" },
          { label: "Flaws", value: "One pulled thread near hem" },
        ],
        price: 72,
        shipping: 9,
        image:
          "A sleeveless midi dress on its own, front view, with thin tie straps knotted at the shoulders, a fitted bodice and a flowing skirt that flares to mid-calf. Dress in white covered with small simple five-petal flowers in pink and deep pink, tiny leaf-green leaves between them.",
      },
      {
        slug: "ll-bean-norwegian-sweater",
        name: "L.L.Bean Norwegian sweater",
        title: "L.L.Bean Norwegian wool sweater, unisex L, navy and white",
        oneLiner: "Thick wool with the classic snowflake yoke, made in Norway",
        description:
          "The real one, knitted in Norway, in navy with a white snowflake yoke and pewter clasps at the collar. Unisex large, 23 inches pit to pit. No moth holes; I checked it inch by inch against the light. Hand washed in wool wash and dried flat.",
        category: "Men's clothing",
        fields: [
          { label: "Brand", value: "L.L.Bean" },
          { label: "Made", value: "Norway" },
          { label: "Size", value: "Unisex L, 23 in pit to pit" },
          { label: "Material", value: "100% wool" },
          { label: "Condition", value: "Excellent, no holes" },
        ],
        price: 95,
        shipping: 12,
        image:
          "A crewneck sweater laid flat, front view, with a wide round yoke pattern of simple snowflake shapes and dots around the neck, and ribbed cuffs and hem. Sweater body in ink, yoke snowflakes and dots in white, two tiny clasps at the collar in mint.",
      },
      {
        slug: "carhartt-detroit-jacket-l",
        name: "Carhartt Detroit jacket",
        title: "Carhartt Detroit jacket, men's L, brown duck, blanket lined",
        oneLiner: "Faded just enough, with all the warmth still in it",
        description:
          "Brown duck canvas Detroit with the corduroy collar and blanket lining. Men's large. The canvas has faded to a soft tan at the shoulders and cuffs and the collar shows wear, but there are no rips. All snaps and the zip work. Washed once to soften it.",
        category: "Men's clothing",
        fields: [
          { label: "Brand", value: "Carhartt" },
          { label: "Model", value: "Detroit J97" },
          { label: "Size", value: "Men's L" },
          { label: "Colour", value: "Brown duck" },
          { label: "Condition", value: "Good, honest fading" },
        ],
        price: 140,
        shipping: 14,
        sold: {
          buyer: "noah",
          daysAgo: 26,
          rating: 5,
          review: "Fits like it was made for me. Fast shipping and Dana answered every question.",
        },
        image:
          "A short work jacket laid flat, front view, zipped, with a pointed corduroy collar, two chest pockets with flaps, and snap cuffs. Canvas in amber, collar in ink with thin vertical cord lines, a band of blanket lining at the neck in pink and white stripes, snaps in lemon.",
      },
      {
        slug: "aritzia-wilfred-camel-coat",
        name: "Aritzia Wilfred coat",
        title: "Aritzia Wilfred cocoon coat in camel, women's M",
        oneLiner: "Wool-blend cocoon shape that goes over everything",
        description:
          "The Wilfred cocoon coat in camel, women's medium. Worn one winter. Slight pilling at the cuffs that a fabric shaver will take off, and both buttons are original. Dry cleaned.",
        category: "Women's clothing",
        fields: [
          { label: "Brand", value: "Aritzia Wilfred" },
          { label: "Size", value: "Women's M" },
          { label: "Colour", value: "Camel" },
          { label: "Condition", value: "Very good" },
        ],
        price: 160,
        shipping: 14,
        status: "draft",
        image:
          "A long cocoon-shaped wool coat on its own, front view, with dropped shoulders, wide lapels and two large buttons. Coat in amber, buttons in ink, lapel edges as thin lemon lines.",
      },
    ],
  },

  /* Vintage lamps ---------------------------------------------------------- */
  {
    slug: "secondlight",
    name: "Second Light",
    owner: {
      handle: "ruth",
      name: "Ruth Albers",
      email: "ruth.albers@example.com",
      location: "Hamilton, ON",
      about: "Retired electrician. I rewire every lamp before it's listed.",
    },
    about:
      "Estate-sale and auction lamps from the 1920s to the 1970s. Every one is rewired with a new cord, plug and socket, and tested before it's listed.",
    category: "Home",
    tone: "lemon",
    location: "Hamilton, ON",
    openedDaysAgo: 420,
    picture: "A glowing table lamp with a cone shade, in lemon, amber and ink",
    items: [
      {
        slug: "orange-mushroom-lamp-1970s",
        name: "1970s mushroom lamp",
        title: "Orange acrylic mushroom table lamp, 1970s",
        oneLiner: "The space-age glow your living room has been missing",
        description:
          "Moulded orange acrylic with a domed mushroom shade, made in Italy in the 70s. Rewired with a new cord and inline switch. The acrylic has a few fine surface scratches you only see when it's off; lit, it glows evenly with no cracks or yellowing. Takes one standard bulb.",
        category: "Lamps and lighting",
        fields: [
          { label: "Made", value: "Italy, 1970s" },
          { label: "Material", value: "Acrylic" },
          { label: "Height", value: "15 in" },
          { label: "Wiring", value: "Rewired, new cord and switch" },
          { label: "Condition", value: "Very good, fine surface scratches" },
        ],
        price: 145,
        lowest: 125,
        shipping: 22,
        question: {
          buyer: "jamal",
          ask: "Does the switch dim, or is it just on and off?",
          answer: "Just on and off, Jamal. It works with a smart bulb if you want to dim it.",
        },
        image:
          "A table lamp shaped like a mushroom: a wide smooth domed cap sitting on a short thick cylindrical stem with a flat round base. All in amber, with the dome slightly lighter in lemon to suggest it's lit, and a thin ink cord curling away from the base.",
      },
      {
        slug: "brass-swing-arm-wall-lamp",
        name: "Brass swing-arm lamp",
        title: "Brass swing-arm wall lamp with cone shade",
        oneLiner: "A reading light that folds flat against the wall when you're done",
        description:
          "Solid brass wall lamp with a two-part swing arm and a cone shade that tilts. I polished it lightly so it still has some age, and rewired it with a cloth cord and plug-in switch. The arm reaches 24 inches and holds any position. Mounting screws included.",
        category: "Lamps and lighting",
        fields: [
          { label: "Material", value: "Solid brass" },
          { label: "Reach", value: "24 in" },
          { label: "Wiring", value: "Rewired, cloth cord, plug-in" },
          { label: "Condition", value: "Very good, light patina" },
        ],
        price: 120,
        shipping: 18,
        image:
          "A wall lamp seen from the side: a small round wall plate, a two-part jointed arm reaching out, and a cone shade at the end tilted downward. Plate, arm and shade in lemon, joints as small amber circles, the inside of the shade in white, a thin ink cord hanging from the wall plate.",
      },
      {
        slug: "art-deco-slag-glass-lamp",
        name: "Art Deco slag glass lamp",
        title: "Art Deco slag glass table lamp, 1920s",
        oneLiner: "Caramel glass panels that glow like stained glass in the evening",
        description:
          "A 1920s cast-metal lamp with six curved slag glass panels in caramel and cream. All six panels are original with no cracks; one has a tiny chip at a top corner hidden by the frame. Rewired with two new sockets and a pull chain. Heavy, about 9 pounds.",
        category: "Lamps and lighting",
        fields: [
          { label: "Made", value: "USA, 1920s" },
          { label: "Material", value: "Cast metal, slag glass" },
          { label: "Height", value: "21 in" },
          { label: "Wiring", value: "Rewired, two sockets, pull chain" },
          { label: "Flaws", value: "Tiny chip on one panel, hidden by frame" },
        ],
        price: 340,
        lowest: 295,
        shipping: 35,
        image:
          "A tall table lamp with a six-sided paneled shade like a lantern roof, the panels separated by thin metal frames, on a slender stepped base. Glass panels in amber with soft pale lemon swirls, frames and base in ink, a tiny pull chain in lemon.",
      },
      {
        slug: "green-drip-glaze-ceramic-lamp",
        name: "Drip glaze ceramic lamp",
        title: "Green drip-glaze ceramic table lamp, 1960s",
        oneLiner: "A chunky studio-pottery base with a fresh linen shade",
        description:
          "A heavy ceramic base in deep green with a lighter drip glaze running down from the shoulder. Made in California in the 60s. Rewired with a new socket and cord, and I paired it with a new off-white linen drum shade. No chips or cracks in the base.",
        category: "Lamps and lighting",
        fields: [
          { label: "Made", value: "California, 1960s" },
          { label: "Material", value: "Glazed ceramic" },
          { label: "Height", value: "26 in with shade" },
          { label: "Shade", value: "New linen drum" },
          { label: "Condition", value: "Excellent, no chips" },
        ],
        price: 175,
        shipping: 30,
        image:
          "A table lamp with a round bulbous ceramic base and a straight-sided drum shade. Base in leaf green with a wavy band of mint drips running down from the shoulder, shade in white, a small lemon finial on top and a thin ink cord.",
      },
      {
        slug: "green-glass-bankers-lamp",
        name: "Banker's lamp",
        title: "Green glass banker's desk lamp with brass base",
        oneLiner: "The library lamp, with the original cased glass shade",
        description:
          "Brass base with a green cased-glass shade that's white inside to throw light down onto the desk. The shade is original with no chips. Rewired with a new pull chain. The brass has an even aged tone that I left as it is.",
        category: "Lamps and lighting",
        fields: [
          { label: "Material", value: "Brass, cased glass" },
          { label: "Height", value: "15 in" },
          { label: "Wiring", value: "Rewired, pull chain" },
          { label: "Condition", value: "Very good" },
        ],
        price: 110,
        shipping: 22,
        sold: {
          buyer: "ava",
          daysAgo: 9,
          rating: 5,
          review: "Packed like a museum piece. Works perfectly and looks wonderful on my desk.",
        },
        image:
          "A desk lamp with a long horizontal half-cylinder glass shade on a curved upright arm and an oval base. Shade in leaf green on the outside with a white inner edge, arm and base in lemon, a short pull chain in lemon with a small bead.",
      },
      {
        slug: "teak-tripod-floor-lamp",
        name: "Teak tripod floor lamp",
        title: "Teak tripod floor lamp with linen drum shade, 1960s",
        oneLiner: "Three splayed teak legs and a warm, soft light",
        description:
          "Danish-style tripod floor lamp with solid teak legs and a brass collar. Oiled the wood, rewired it with a new foot switch, and fitted a new linen drum shade. Stands steady and reads well in a corner. It ships in two boxes, legs separate.",
        category: "Lamps and lighting",
        fields: [
          { label: "Style", value: "Danish modern, 1960s" },
          { label: "Material", value: "Teak, brass" },
          { label: "Height", value: "58 in" },
          { label: "Wiring", value: "Rewired, foot switch" },
          { label: "Condition", value: "Very good, freshly oiled" },
        ],
        price: 260,
        shipping: 45,
        image:
          "A tall floor lamp with three thin splayed wooden legs meeting at a small collar, a single slim pole rising up, and a wide drum shade at the top. Legs and pole in amber, collar in lemon, shade in white, a small ink foot switch on the cord.",
      },
      {
        slug: "pink-murano-glass-lamp",
        name: "Pink glass table lamp",
        title: "Italian pink glass table lamp, 1980s",
        oneLiner: "A soft pink glow, like a seashell you can switch on",
        description:
          "Hand-blown pink glass base with a ribbed swirl and a matching pleated shade, made in Italy in the 80s. Rewired with a new socket. The glass is perfect, no chips. The pleated shade has a small faded patch on the back that faces the wall.",
        category: "Lamps and lighting",
        fields: [
          { label: "Made", value: "Italy, 1980s" },
          { label: "Material", value: "Blown glass" },
          { label: "Height", value: "18 in" },
          { label: "Flaws", value: "Small faded patch on back of shade" },
        ],
        price: 150,
        shipping: 25,
        image:
          "A table lamp with a round ribbed glass base swirling upward like a shell, topped with a pleated empire-shaped shade. Base in pink with deep pink swirl ribs, shade in blush with thin pink vertical pleat lines, a small lemon finial.",
      },
    ],
  },

  /* Hats ------------------------------------------------------------------- */
  {
    slug: "brimandband",
    name: "Brim & Band",
    owner: {
      handle: "teddy",
      name: "Teddy Marsh",
      email: "teddy.marsh@example.com",
      location: "Austin, TX",
      about: "Hat collector. Sizes are measured inside the sweatband, not guessed from the tag.",
    },
    about:
      "Felt, straw and wool hats from good makers, steamed, brushed and measured inside the sweatband. Every hat ships in a box, never squashed in a bag.",
    category: "Clothes",
    tone: "leaf",
    location: "Austin, TX",
    openedDaysAgo: 150,
    picture: "A felt cowboy hat seen from the front, in leaf green with a lemon band",
    items: [
      {
        slug: "stetson-open-road-silverbelly",
        name: "Stetson Open Road",
        title: "Stetson Open Road 6X felt hat, silverbelly, 7 1/8",
        oneLiner: "The hat LBJ wore, in the colour that goes with everything",
        description:
          "6X beaver-blend felt in silverbelly with the classic cattleman crease and a thin ribbon band. Size 7 1/8, measured inside the sweatband. Steamed and brushed. The felt is clean, the sweatband has light wear, and the brim holds its shape.",
        category: "Hats and headwear",
        fields: [
          { label: "Brand", value: "Stetson" },
          { label: "Model", value: "Open Road 6X" },
          { label: "Size", value: "7 1/8" },
          { label: "Colour", value: "Silverbelly" },
          { label: "Condition", value: "Very good, light sweatband wear" },
        ],
        price: 195,
        lowest: 170,
        shipping: 18,
        image:
          "A felt cowboy hat seen from the front at eye level, with a pinched crown and short flat brim curving gently up at the sides, a thin ribbon band with a tiny bow on one side. Felt in pale lemon, band in ink, the inside of the brim edge in amber.",
      },
      {
        slug: "kangol-504-wool-green",
        name: "Kangol 504 cap",
        title: "Kangol 504 wool flat cap, green, size L",
        oneLiner: "The rounded flat cap with the little kangaroo, in a rich green",
        description:
          "Wool-blend 504 in a deep green, size large. Worn a few times; the shape is perfect and the inside band is clean. A real one, made in the UK, with the embroidered kangaroo on the back.",
        category: "Hats and headwear",
        fields: [
          { label: "Brand", value: "Kangol" },
          { label: "Model", value: "504" },
          { label: "Size", value: "L" },
          { label: "Condition", value: "Excellent" },
        ],
        price: 38,
        shipping: 8,
        image:
          "A rounded flat cap seen from a slight three-quarter front angle, with a short stiff peak and a soft domed top. Cap in leaf green, peak a shade darker in ink-green outline, a tiny lemon dot on the back to suggest an embroidered mark, no text.",
      },
      {
        slug: "panama-hat-montecristi",
        name: "Panama hat",
        title: "Montecristi Panama hat, fine weave, 7 1/4",
        oneLiner: "Hand-woven in Ecuador, light enough to forget you're wearing it",
        description:
          "A fino-grade Panama from Montecristi with a black grosgrain band. Size 7 1/4. The weave is tight and even with no breaks, and the brim snaps down at the front. Ships in a hat box.",
        category: "Hats and headwear",
        fields: [
          { label: "Made", value: "Montecristi, Ecuador" },
          { label: "Weave", value: "Fino" },
          { label: "Size", value: "7 1/4" },
          { label: "Condition", value: "Excellent, no breaks" },
        ],
        price: 240,
        lowest: 210,
        shipping: 18,
        sold: {
          buyer: "jamal",
          daysAgo: 33,
          rating: 4,
          review: "Beautiful hat. Took a few extra days to arrive, but it came in a proper box.",
          reply: "Sorry about the wait, Jamal. The carrier held it a few days. Enjoy the summer in it.",
        },
        image:
          "A fedora-style straw hat seen from the front, with a pinched teardrop crown, a wide brim and a black ribbon band. Straw in lemon with a fine cross-hatch of short amber lines for the weave, band in ink.",
      },
      {
        slug: "wool-six-panel-cap-pink",
        name: "Wool six-panel cap",
        title: "Wool six-panel baseball cap, 1980s, pink and white",
        oneLiner: "A fitted 80s ballcap with a strap back and a top button",
        description:
          "A wool six-panel cap from the 80s in pink with a white peak, made in the USA. Leather strap back with a brass buckle. Small fading on the top button, and the inside band is clean.",
        category: "Hats and headwear",
        fields: [
          { label: "Made", value: "USA, 1980s" },
          { label: "Material", value: "Wool, leather strap" },
          { label: "Size", value: "Adjustable" },
          { label: "Condition", value: "Very good" },
        ],
        price: 45,
        shipping: 8,
        image:
          "A baseball cap seen from a three-quarter front angle, with six panels meeting at a small top button and a curved peak. Crown in pink with deep pink seam lines, peak in white, top button in lemon. No logo or text on the front.",
      },
      {
        slug: "borsalino-alessandria-fedora",
        name: "Borsalino fedora",
        title: "Borsalino Alessandria fur felt fedora, forest green, 58",
        oneLiner: "Made in Alessandria, Italy, and as soft as it gets",
        description:
          "Fur felt fedora in a deep forest green with a matching grosgrain band and a pinched crown. Size 58 (about 7 1/4). The felt is clean with no moth damage. The leather sweatband has darkened slightly at the front.",
        category: "Hats and headwear",
        fields: [
          { label: "Brand", value: "Borsalino" },
          { label: "Made", value: "Alessandria, Italy" },
          { label: "Size", value: "58 (7 1/4)" },
          { label: "Colour", value: "Forest green" },
          { label: "Condition", value: "Very good" },
        ],
        price: 210,
        shipping: 18,
        image:
          "A fedora seen from the front, with a teardrop crown pinched at the front, a medium brim snapped down slightly at the front, and a band with a small bow. Felt in leaf green, band in ink, a thin mint highlight line along the top of the brim.",
      },
      {
        slug: "gingham-bucket-hat",
        name: "Gingham bucket hat",
        title: "Cotton bucket hat in mint gingham, one size",
        oneLiner: "Soft, packable and very summer",
        description:
          "Cotton bucket hat in mint and white gingham with a stitched brim. One size, fits most. Washed and pressed. Like new.",
        category: "Hats and headwear",
        fields: [
          { label: "Material", value: "Cotton" },
          { label: "Size", value: "One size" },
          { label: "Condition", value: "Like new" },
        ],
        price: 22,
        shipping: 6,
        image:
          "A bucket hat seen from the front, with a rounded crown and a short downward-sloping brim with rows of stitching. Fabric in a mint and white gingham check, the stitching rows as thin leaf-green lines.",
      },
    ],
  },

  /* Fountain pens ---------------------------------------------------------- */
  {
    slug: "nibdrawer",
    name: "The Nib Drawer",
    owner: {
      handle: "helen",
      name: "Helen Cho",
      email: "helen.cho@example.com",
      location: "Montréal, QC",
      about: "I restore vintage fountain pens: new sacs, cleaned feeds, nibs tuned and writing-tested.",
    },
    about:
      "Vintage fountain pens, restored and writing-tested. New ink sacs where needed, cleaned feeds, and nibs tuned to write smooth. Each listing has a writing sample.",
    category: "Collectibles",
    tone: "leaf",
    location: "Montréal, QC",
    openedDaysAgo: 520,
    lowestPercent: 10,
    picture: "A fountain pen nib seen up close, in lemon with a leaf green background ring",
    items: [
      {
        slug: "parker-51-aerometric-buckskin",
        name: "Parker 51 Aerometric",
        title: "Parker 51 Aerometric fountain pen in Buckskin, 1950",
        oneLiner: "The pen of the century, restored and writing a smooth fine line",
        description:
          "A 1950 Parker 51 Aerometric in Buckskin with a Lustraloy cap. The barrel colour is even, the clutch holds the cap firmly, and the filler pulls a full load of ink. The hooded nib writes a smooth, wet fine line. Light scratches on the cap, as all of them have.",
        category: "Vintage fountain pens",
        fields: [
          { label: "Brand", value: "Parker" },
          { label: "Model", value: "51 Aerometric" },
          { label: "Year", value: "1950" },
          { label: "Colour", value: "Buckskin, Lustraloy cap" },
          { label: "Nib", value: "Fine, hooded" },
          { label: "Condition", value: "Restored, writing-tested" },
        ],
        price: 165,
        shipping: 9,
        question: {
          buyer: "rosa",
          ask: "Could you swap the nib for a medium, or is it fine only?",
          answer: "It's a fine, Rosa. I have a medium 51 coming up next week if you can wait.",
        },
        image:
          "A fountain pen lying diagonally from lower left to upper right, capped, showing a smooth torpedo-shaped barrel and a brushed cap with a slim arrow-shaped clip. Barrel in amber, cap in white with fine pale lemon vertical lines, clip in lemon. A small separate swirl of ink in ink colour beside it.",
      },
      {
        slug: "sheaffer-snorkel-valiant-green",
        name: "Sheaffer Snorkel",
        title: "Sheaffer Snorkel Valiant in Pastel Green, 1950s",
        oneLiner: "The pen with the tube that pokes out to drink ink",
        description:
          "The clever 1950s filler: a tube slides out under the nib so you never dip the pen itself. New sac and seals, so the snorkel fills properly again. The two-tone gold nib writes a medium line. Barrel in Pastel Green with a few tiny marks.",
        category: "Vintage fountain pens",
        fields: [
          { label: "Brand", value: "Sheaffer" },
          { label: "Model", value: "Snorkel Valiant" },
          { label: "Year", value: "1950s" },
          { label: "Nib", value: "14k two-tone, medium" },
          { label: "Condition", value: "Restored, new sac and seals" },
        ],
        price: 130,
        shipping: 9,
        image:
          "An uncapped fountain pen lying horizontally with a small inlaid nib at the tip and a thin tube poking out beneath it, the cap posted on the back end. Barrel and cap in mint, cap band and clip in lemon, nib in lemon with a tiny ink slit.",
      },
      {
        slug: "esterbrook-j-green-marble",
        name: "Esterbrook J",
        title: "Esterbrook J fountain pen, green marble, 9668 nib",
        oneLiner: "An affordable American classic with a swappable nib",
        description:
          "A full-size Esterbrook J in green marble with the 9668 firm fine nib. New sac, and the lever fills well. The marble pattern is bright and the chrome trim has a little wear. A great first vintage pen.",
        category: "Vintage fountain pens",
        fields: [
          { label: "Brand", value: "Esterbrook" },
          { label: "Model", value: "J" },
          { label: "Nib", value: "9668 firm fine" },
          { label: "Colour", value: "Green marble" },
          { label: "Condition", value: "Restored, light trim wear" },
        ],
        price: 65,
        shipping: 7,
        image:
          "A capped fountain pen lying horizontally with rounded ends, a lever on the side of the barrel and a simple clip. Barrel and cap in leaf green with soft mint marble swirls, clip, lever and cap band in white.",
      },
      {
        slug: "pelikan-m400-green-striped",
        name: "Pelikan M400",
        title: "Pelikan M400 Souverän green striped, 14k medium nib",
        oneLiner: "The see-through green stripe and a buttery gold nib",
        description:
          "Pelikan M400 in green stripes with gold trim and a 14k medium nib. Piston filler, smooth and tight. The ink window is clear. It comes with its box and papers.",
        category: "Vintage fountain pens",
        fields: [
          { label: "Brand", value: "Pelikan" },
          { label: "Model", value: "M400 Souverän" },
          { label: "Nib", value: "14k medium" },
          { label: "Comes with", value: "Box and papers" },
          { label: "Condition", value: "Excellent" },
        ],
        price: 285,
        lowest: 260,
        shipping: 9,
        sold: {
          buyer: "noah",
          daysAgo: 41,
          rating: 5,
          review: "Writes like butter. Helen included a writing sample and a sample of ink. Lovely touch.",
        },
        image:
          "A capped fountain pen lying horizontally, with a barrel of vertical stripes, a small clear ink window band near the front, and a beak-shaped clip on the cap. Stripes alternating leaf green and mint, cap and ends in ink, clip and cap bands in lemon.",
      },
      {
        slug: "lamy-2000-makrolon",
        name: "Lamy 2000",
        title: "Lamy 2000 fountain pen, Makrolon, extra fine",
        oneLiner: "Bauhaus design from 1966 that still looks like the future",
        description:
          "Brushed Makrolon with the stainless steel clip and a hooded 14k extra-fine nib. Piston filler. Light use; the brushed finish has no shiny spots. Comes with the box.",
        category: "Vintage fountain pens",
        fields: [
          { label: "Brand", value: "Lamy" },
          { label: "Model", value: "2000" },
          { label: "Nib", value: "14k extra fine" },
          { label: "Condition", value: "Excellent" },
          { label: "Comes with", value: "Box" },
        ],
        price: 150,
        shipping: 9,
        image:
          "A sleek capped fountain pen lying horizontally, with a seamless cigar shape and a slim springy metal clip on the cap. Body in ink with very fine horizontal lines in a slightly lighter leaf green to suggest brushing, clip in white.",
      },
      {
        slug: "waterman-ideal-52-hard-rubber",
        name: "Waterman Ideal 52",
        title: "Waterman Ideal 52 black hard rubber, flexible nib, 1920s",
        oneLiner: "A flexible nib that turns everyday writing into calligraphy",
        description:
          "Black chased hard rubber from the 1920s with a gold-filled clip and a wonderfully flexible fine nib. New sac, and the lever fills fully. The rubber has kept its deep black with only a hint of brown at the clip. Flex tested to about three times the base line width.",
        category: "Vintage fountain pens",
        fields: [
          { label: "Brand", value: "Waterman" },
          { label: "Model", value: "Ideal 52" },
          { label: "Year", value: "1920s" },
          { label: "Nib", value: "Fine, full flex" },
          { label: "Condition", value: "Restored, new sac" },
        ],
        price: 220,
        lowest: 200,
        shipping: 9,
        image:
          "An old capped fountain pen lying horizontally, with flat ends, a side lever and a long simple clip. Barrel and cap in ink with a pattern of fine wavy leaf-green lines, clip, lever and a thin band near the cap lip in lemon.",
      },
      {
        slug: "pilot-custom-74-burgundy",
        name: "Pilot Custom 74",
        title: "Pilot Custom 74 in burgundy, soft fine nib",
        oneLiner: "Japanese gold nib with a little bounce, in a deep wine colour",
        description:
          "A Pilot Custom 74 in translucent burgundy with a 14k soft fine nib. Comes with the CON-70 converter. Lightly used, cleaned and flushed. No scratches on the barrel.",
        category: "Vintage fountain pens",
        fields: [
          { label: "Brand", value: "Pilot" },
          { label: "Model", value: "Custom 74" },
          { label: "Nib", value: "14k soft fine" },
          { label: "Comes with", value: "CON-70 converter" },
          { label: "Condition", value: "Excellent" },
        ],
        price: 125,
        shipping: 9,
        image:
          "A capped fountain pen lying horizontally with rounded ends and a ball-tipped clip. Body and cap in deep pink, cap ring and clip in lemon, a lighter pink band through the middle suggesting translucency.",
      },
    ],
  },

  /* Monster cards (fictional "Beastlings" card game) ---------------------- */
  {
    slug: "holohollow",
    name: "Holo Hollow",
    owner: {
      handle: "kenji",
      name: "Kenji Ito",
      email: "kenji.ito@example.com",
      location: "Vancouver, BC",
      about: "Been collecting Beastlings since the first set. Every card ships sleeved and in a top loader.",
    },
    about:
      "Beastlings cards: graded slabs, sealed product and raw singles. Every card ships sleeved, in a top loader, inside a box. Condition photos front and back.",
    category: "Collectibles",
    tone: "pink",
    location: "Vancouver, BC",
    openedDaysAgo: 280,
    picture: "A single trading card standing upright with a sparkle in the corner, in pink, lemon and ink",
    items: [
      {
        slug: "emberpup-1st-edition-holo-graded-9",
        name: "Emberpup 1st Edition holo",
        title: "Emberpup 1st Edition holo, Base Set, graded 9",
        oneLiner: "The fire puppy that started it all, in a clean 9 slab",
        description:
          "The 1st Edition holo Emberpup from Base Set, graded a 9 by a third-party grader. Centring is close to 55/45, corners are sharp, and the holo has no scratches I can see under a light. The slab has a few faint scuffs from storage, nothing on the card itself.",
        category: "Trading cards",
        fields: [
          { label: "Game", value: "Beastlings" },
          { label: "Set", value: "Base Set, 1st Edition" },
          { label: "Card", value: "Emberpup, holo rare" },
          { label: "Grade", value: "9" },
          { label: "Flaws", value: "Light scuffs on slab only" },
        ],
        price: 420,
        lowest: 380,
        shipping: 12,
        question: {
          buyer: "noah",
          ask: "Any chance you'd do 360 shipped?",
          answer: "I can do 380 plus shipping, Noah. That's as low as it goes on this one.",
        },
        image:
          "A trading card sealed inside a clear rectangular plastic grading case, standing upright and straight-on. The case is a white outline with a plain lemon label strip across the top showing only a few short ink bars, no readable text. The card has a pink border, a picture window showing a chubby cartoon puppy with a flame-shaped tail in amber and berry red on a lemon background with small white sparkle stars, and short ink bars below for text.",
      },
      {
        slug: "grovelord-shadowless-holo",
        name: "Grovelord shadowless holo",
        title: "Grovelord shadowless holo, Base Set, raw near mint",
        oneLiner: "The big tree beast from the early print run, ungraded and ready to grade",
        description:
          "A shadowless Grovelord holo from the early Base Set print. Raw, near mint: clean edges, sharp corners and a tiny bit of whitening on one back corner. The holo pattern is bright and the front is scratch free. Ships in a sleeve, top loader and a box.",
        category: "Trading cards",
        fields: [
          { label: "Game", value: "Beastlings" },
          { label: "Set", value: "Base Set, shadowless" },
          { label: "Card", value: "Grovelord, holo rare" },
          { label: "Condition", value: "Near mint, raw" },
          { label: "Flaws", value: "Slight whitening on one back corner" },
        ],
        price: 185,
        shipping: 6,
        image:
          "A single trading card standing upright, straight-on. Leaf green border, a picture window showing a large friendly tree creature with a bark body in amber, leafy mint crown and small lemon eyes on a pale lemon background with tiny white sparkle stars, and short ink bars below for text.",
      },
      {
        slug: "beastlings-base-set-booster-pack",
        name: "Base Set booster pack",
        title: "Beastlings Base Set booster pack, sealed",
        oneLiner: "Eleven cards and a chance at a holo, still crimped shut",
        description:
          "A sealed Base Set booster pack with the Emberpup artwork. Crimps are tight top and bottom, no tears or pinholes. Weighed and never searched. Ships in a rigid mailer.",
        category: "Trading cards",
        fields: [
          { label: "Game", value: "Beastlings" },
          { label: "Product", value: "Base Set booster pack" },
          { label: "Condition", value: "Sealed" },
        ],
        price: 145,
        shipping: 6,
        image:
          "A tall foil booster pack standing upright, straight-on, with crimped zig-zag edges at the top and bottom. Pack in pink with a large simple cartoon puppy face with flame ears in amber in the middle, a lemon star burst behind it, and a few short white bars where the logo would be. No readable text.",
      },
      {
        slug: "moonrise-booster-box-sealed",
        name: "Moonrise booster box",
        title: "Beastlings Moonrise booster box, 36 packs, factory sealed",
        oneLiner: "Sealed box from the Moonrise set, stored flat in a cool closet",
        description:
          "A factory-sealed Moonrise booster box with 36 packs inside. The shrink wrap is tight with the official seal on the end flaps. One small dent on a bottom corner of the box from a shelf. Stored away from sunlight since release.",
        category: "Trading cards",
        fields: [
          { label: "Game", value: "Beastlings" },
          { label: "Set", value: "Moonrise" },
          { label: "Product", value: "Booster box, 36 packs" },
          { label: "Condition", value: "Factory sealed" },
          { label: "Flaws", value: "Small dent on one bottom corner" },
        ],
        price: 295,
        lowest: 275,
        shipping: 18,
        image:
          "A rectangular display box seen at a slight three-quarter angle, its front showing a crescent moon and a small sleepy fox creature curled inside it. Box in ink, moon in lemon, fox in pink, small white stars scattered around, a few short white bars where the logo would be. A thin white shine line across the shrink wrap.",
      },
      {
        slug: "zappaw-black-star-promo",
        name: "Zappaw promo",
        title: "Zappaw Black Star promo #07, near mint",
        oneLiner: "The lightning kitten promo from the movie release",
        description:
          "Zappaw Black Star promo number 07, handed out at the first movie. Near mint with clean edges and only a faint print line on the back, which these often have. Sleeved since the day it was opened.",
        category: "Trading cards",
        fields: [
          { label: "Game", value: "Beastlings" },
          { label: "Card", value: "Zappaw, Black Star promo #07" },
          { label: "Condition", value: "Near mint" },
          { label: "Flaws", value: "Faint print line on back" },
        ],
        price: 34,
        shipping: 5,
        image:
          "A single trading card standing upright, straight-on. Lemon border, a picture window showing a small round cartoon kitten with zig-zag lightning-bolt ears and tail in lemon and amber on a pink background, a small black star badge in one corner of the window, short ink bars below for text.",
      },
      {
        slug: "fizzlefin-full-art",
        name: "Fizzlefin full art",
        title: "Fizzlefin full art, Tidal Rush, near mint",
        oneLiner: "The bubbly fish with art edge to edge",
        description:
          "Fizzlefin full art from the Tidal Rush set. Near mint, pulled and sleeved straight away. The textured surface is clean and the edges are sharp. A favourite for binders.",
        category: "Trading cards",
        fields: [
          { label: "Game", value: "Beastlings" },
          { label: "Set", value: "Tidal Rush" },
          { label: "Card", value: "Fizzlefin, full art" },
          { label: "Condition", value: "Near mint" },
        ],
        price: 48,
        shipping: 5,
        image:
          "A single trading card standing upright, straight-on, with artwork that fills the whole card edge to edge: a round cartoon fish with big fins blowing a stream of bubbles. Fish in mint and leaf green, bubbles in white, background in pale mint with wavy lighter lines, a thin white bar near the bottom where text would go.",
      },
      {
        slug: "shadefox-misprint",
        name: "Shadefox misprint",
        title: "Shadefox reverse holo, misprint with shifted colour",
        oneLiner: "A real factory error: the pink layer shifted right",
        description:
          "Reverse holo Shadefox from Moonrise with a clear colour-shift misprint: the pink layer sits about 2mm to the right. Pulled from a pack by me. Near mint otherwise. Error cards like this are one-offs.",
        category: "Trading cards",
        fields: [
          { label: "Game", value: "Beastlings" },
          { label: "Set", value: "Moonrise" },
          { label: "Card", value: "Shadefox, reverse holo" },
          { label: "Error", value: "Pink layer shifted 2mm" },
          { label: "Condition", value: "Near mint" },
        ],
        price: 90,
        shipping: 5,
        sold: {
          buyer: "jamal",
          daysAgo: 14,
          rating: 5,
          review: "Wild error card, exactly as pictured. Shipped in a top loader and a box. Thanks!",
        },
        image:
          "A single trading card standing upright, straight-on. Ink border, a picture window showing a sly cartoon fox with a big fluffy tail in deep pink on a dark leaf green background, with a pink outline copy of the fox printed slightly offset to the right to show a misprint, short white bars below for text.",
      },
      {
        slug: "beastlings-binder-lot-180",
        name: "Binder lot",
        title: "Beastlings binder lot, 180 commons and uncommons",
        oneLiner: "A starter collection from the first four sets, binder included",
        description:
          "180 commons and uncommons from Base Set through Moonrise, sorted by set in a 9-pocket binder. Mostly near mint, some lightly played. No duplicates beyond three of any card. A good way to start a collection or a deck.",
        category: "Trading cards",
        fields: [
          { label: "Game", value: "Beastlings" },
          { label: "Count", value: "180 cards" },
          { label: "Sets", value: "Base Set to Moonrise" },
          { label: "Comes with", value: "9-pocket binder" },
          { label: "Condition", value: "Mostly near mint" },
        ],
        price: 60,
        shipping: 12,
        image:
          "An open ring binder seen from the front, showing a page of nine card pockets in a three-by-three grid. Binder cover in pink, the page in white, each pocket holding a small card in a different solid colour from the palette (mint, lemon, leaf green, amber, pink), each card with a tiny round creature shape inside.",
      },
    ],
  },

  /* Building sets (fictional "Brickwerk") --------------------------------- */
  {
    slug: "studandstack",
    name: "Stud & Stack",
    owner: {
      handle: "owen",
      name: "Owen Park",
      email: "owen.park@example.com",
      location: "Minneapolis, MN",
      about: "I check every Brickwerk set piece by piece against the inventory before it's listed.",
    },
    about:
      "Vintage and retired Brickwerk sets, checked piece by piece against the inventory. Complete means complete. Washed bricks, no smoke, no pets.",
    category: "Kids' things",
    tone: "lemon",
    location: "Minneapolis, MN",
    openedDaysAgo: 190,
    picture: "A single toy building brick with four round studs on top, in lemon and amber",
    items: [
      {
        slug: "brickwerk-harbour-lighthouse-6412",
        name: "Harbour Lighthouse 6412",
        title: "Brickwerk 6412 Harbour Lighthouse, 1988, complete with box",
        oneLiner: "The lighthouse with the working light brick, every piece accounted for",
        description:
          "Set 6412 from 1988, checked against the inventory: 100% complete including the light brick (it works with a new battery) and all four mini-figures. The box has shelf wear and a crease on one side; the instructions are crisp. Bricks washed and dried.",
        category: "Building toys",
        fields: [
          { label: "Brand", value: "Brickwerk" },
          { label: "Set", value: "6412 Harbour Lighthouse" },
          { label: "Year", value: "1988" },
          { label: "Complete", value: "Yes, checked against inventory" },
          { label: "Comes with", value: "Box and instructions" },
          { label: "Flaws", value: "Box shelf wear, one crease" },
        ],
        price: 230,
        lowest: 205,
        shipping: 18,
        image:
          "A small built toy-brick lighthouse on a square base plate, made of stacked rectangular bricks with round studs visible on top surfaces. Tower in white with berry red stripes, a lemon lamp room at the top with tiny lines of light, the base plate in leaf green, a tiny mint dock with a small boat in pink.",
      },
      {
        slug: "brickwerk-moonbase-outpost-918",
        name: "Moonbase Outpost 918",
        title: "Brickwerk 918 Moonbase Outpost, 1980, complete, no box",
        oneLiner: "Classic grey-and-blue space, with the crater base plate",
        description:
          "Set 918 from 1980, complete including both astronauts and the crater base plate. No box, but a copy of the instructions is included. A few bricks have light play scratches and the canopy has some scuffing. The classic space logo stickers are all there.",
        category: "Building toys",
        fields: [
          { label: "Brand", value: "Brickwerk" },
          { label: "Set", value: "918 Moonbase Outpost" },
          { label: "Year", value: "1980" },
          { label: "Complete", value: "Yes" },
          { label: "Comes with", value: "Copy of instructions" },
          { label: "Flaws", value: "Light play wear, scuffed canopy" },
        ],
        price: 115,
        shipping: 15,
        image:
          "A small built toy-brick space station on a cratered base plate, with a little round antenna dish, a rocket-shaped vehicle with a clear dome canopy, and two tiny astronaut figures. Bricks in white and mint, canopy in pale mint, base plate in pale lemon with round amber craters, antenna in lemon.",
      },
      {
        slug: "brickwerk-castle-keep-6080",
        name: "Castle Keep 6080",
        title: "Brickwerk 6080 Castle Keep, 1984, complete with instructions",
        oneLiner: "The yellow castle everybody remembers, with every knight",
        description:
          "Set 6080 from 1984, complete with all knights, horses and the drawbridge chain. Instructions included, no box. The yellow bricks have a slight warmth to them from age but no deep yellowing. Some minor play wear on the flags.",
        category: "Building toys",
        fields: [
          { label: "Brand", value: "Brickwerk" },
          { label: "Set", value: "6080 Castle Keep" },
          { label: "Year", value: "1984" },
          { label: "Complete", value: "Yes" },
          { label: "Comes with", value: "Instructions" },
        ],
        price: 260,
        shipping: 20,
        sold: {
          buyer: "ava",
          daysAgo: 22,
          rating: 5,
          review: "Complete like Owen said, down to the last knight. My kids and I built it the same day.",
          reply: "That's the best thing to hear. Have fun with it!",
        },
        image:
          "A small built toy-brick castle front with two crenellated towers, an arched gate with a drawbridge and two little flags on top. Walls in lemon, gate and drawbridge in amber, flags in berry red and white, a strip of leaf green base plate along the bottom, tiny round studs visible on top surfaces.",
      },
      {
        slug: "brickwerk-corner-cafe-sealed",
        name: "Corner Café",
        title: "Brickwerk Corner Café modular building, sealed",
        oneLiner: "Retired modular, never opened, box in great shape",
        description:
          "The Corner Café modular, retired a few years ago. Factory sealed; the box has sharp corners and only light shelf wear on the back. Stored flat in a smoke-free home.",
        category: "Building toys",
        fields: [
          { label: "Brand", value: "Brickwerk" },
          { label: "Set", value: "Corner Café modular" },
          { label: "Condition", value: "Factory sealed" },
          { label: "Flaws", value: "Light shelf wear on back of box" },
        ],
        price: 340,
        lowest: 310,
        shipping: 25,
        image:
          "A large flat toy box seen straight-on, its front showing a three-storey corner café building made of bricks, with a striped awning, tables outside and big windows. Box in ink, building in pink and blush with a lemon and white striped awning, windows in mint, a few short white bars where the logo would be. No readable text.",
      },
      {
        slug: "brickwerk-loose-bricks-2kg",
        name: "Loose bricks, 2 kg",
        title: "Brickwerk loose bricks, 2 kg mixed, washed",
        oneLiner: "About 1,400 pieces for building whatever you like",
        description:
          "Two kilograms of mixed Brickwerk bricks, plates and slopes, roughly 1,400 pieces. All genuine, washed and dried. Mostly basic colours with some specialty pieces mixed in. No mini-figures in this lot.",
        category: "Building toys",
        fields: [
          { label: "Brand", value: "Brickwerk" },
          { label: "Weight", value: "2 kg, about 1,400 pieces" },
          { label: "Condition", value: "Used, washed" },
        ],
        price: 55,
        shipping: 16,
        image:
          "A loose heap of toy building bricks of different sizes, each with round studs on top, piled in a gentle mound. Bricks in lemon, pink, mint, leaf green, berry red, white and amber, evenly mixed.",
      },
      {
        slug: "brickwerk-minifigure-lot-40",
        name: "Mini-figure lot",
        title: "Brickwerk mini-figure lot, 40 figures with accessories",
        oneLiner: "Knights, astronauts, townspeople and a few rare hats",
        description:
          "Forty complete mini-figures from the 80s and 90s: knights, astronauts, a few pirates and townspeople, plus a bag of hats, helmets and tools. Some faces have light print wear. All figures are complete with legs, torso, head and headgear.",
        category: "Building toys",
        fields: [
          { label: "Brand", value: "Brickwerk" },
          { label: "Count", value: "40 figures plus accessories" },
          { label: "Era", value: "1980s and 1990s" },
          { label: "Condition", value: "Good, some print wear" },
        ],
        price: 85,
        shipping: 10,
        image:
          "A neat row of five small blocky toy figures standing side by side, each with a round head, simple dot eyes and smile, square torso and legs. One knight with a helmet in white, one astronaut in mint, one pirate with a hat in ink, one chef in white, one gardener in leaf green. Heads in lemon.",
      },
    ],
  },

  /* Rare books ------------------------------------------------------------- */
  {
    slug: "foxedandfound",
    name: "Foxed & Found",
    owner: {
      handle: "margaret",
      name: "Margaret Lowe",
      email: "margaret.lowe@example.com",
      location: "Boston, MA",
      about: "Thirty years in an antiquarian bookshop. Now I list from home.",
    },
    about:
      "First editions, finely illustrated books and signed copies. Points of issue checked, condition described plainly, and every book ships in a box with corner protectors.",
    category: "Books and records",
    tone: "blush",
    location: "Boston, MA",
    openedDaysAgo: 600,
    lowestPercent: 8,
    picture: "A stack of three old hardcover books with a bookmark ribbon, in blush, leaf green and amber",
    items: [
      {
        slug: "old-man-and-the-sea-1952-first",
        name: "The Old Man and the Sea",
        title: "The Old Man and the Sea, Scribner 1952 first edition in jacket",
        oneLiner: "Hemingway's Pulitzer winner, first edition with the first-state jacket",
        description:
          "First edition, first printing, with the Scribner 'A' on the copyright page and the first-state blue jacket. The book is near fine with a tight binding. The jacket has light chipping at the spine ends and a short closed tear at the back, now in a new archival cover.",
        category: "Books",
        fields: [
          { label: "Author", value: "Ernest Hemingway" },
          { label: "Publisher", value: "Scribner, 1952" },
          { label: "Edition", value: "First edition, first printing" },
          { label: "Jacket", value: "First state, light chipping" },
          { label: "Condition", value: "Book near fine, jacket very good" },
        ],
        price: 950,
        lowest: 880,
        shipping: 20,
        question: {
          buyer: "rosa",
          ask: "Is there any inscription or name on the endpapers?",
          answer: "None at all, Rosa. Clean endpapers, no names, stamps or bookplates.",
        },
        image:
          "A hardcover book in its dust jacket standing upright, seen straight-on from the front, with a simple wave pattern and a tiny sailboat on the jacket. Jacket in mint with wavy leaf-green lines for the sea, a small white sail, the spine edge visible in ink, a few short ink bars at the top where the title would be. No readable text.",
      },
      {
        slug: "silent-spring-1962-first",
        name: "Silent Spring",
        title: "Silent Spring, Houghton Mifflin 1962 first edition",
        oneLiner: "The book that started the environmental movement",
        description:
          "Rachel Carson's Silent Spring, first edition, first printing, in the price-clipped dust jacket. The binding is tight and the pages are clean with light toning at the edges. Jacket has some fading on the spine.",
        category: "Books",
        fields: [
          { label: "Author", value: "Rachel Carson" },
          { label: "Publisher", value: "Houghton Mifflin, 1962" },
          { label: "Edition", value: "First edition, first printing" },
          { label: "Jacket", value: "Price-clipped, spine faded" },
          { label: "Condition", value: "Very good" },
        ],
        price: 380,
        shipping: 18,
        image:
          "A hardcover book in its dust jacket standing upright, straight-on, the jacket showing a simple branch with a few leaves and a small bird silhouette. Jacket in pale lemon, branch and leaves in leaf green, the bird in ink, the spine edge in amber, short ink bars where the title would be. No readable text.",
      },
      {
        slug: "mastering-art-french-cooking-1961",
        name: "Mastering the Art of French Cooking",
        title: "Mastering the Art of French Cooking, Knopf 1961, first printing",
        oneLiner: "Julia Child's first, the one that changed American kitchens",
        description:
          "Volume one, first edition, first printing, in the jacket. A kitchen copy, honestly: a couple of small food spots on the page edges and one on the beef bourguignon page, which some collectors love. The binding is solid and the jacket has edge wear.",
        category: "Books",
        fields: [
          { label: "Author", value: "Julia Child, Louisette Bertholle, Simone Beck" },
          { label: "Publisher", value: "Knopf, 1961" },
          { label: "Edition", value: "First edition, first printing" },
          { label: "Condition", value: "Good, kitchen use" },
          { label: "Flaws", value: "Food spots on a few pages" },
        ],
        price: 620,
        shipping: 20,
        image:
          "A thick hardcover cookbook in its dust jacket standing upright, straight-on, the jacket covered with a simple repeating pattern of small fleur-de-lis-like shapes. Jacket in white with the small pattern in berry red, a white panel near the top with a few short ink bars where the title would be, spine edge in ink. No readable text.",
      },
      {
        slug: "the-hobbit-1966-allen-unwin",
        name: "The Hobbit",
        title: "The Hobbit, Allen & Unwin 1966, third edition, in jacket",
        oneLiner: "The revised text, with Tolkien's own jacket art",
        description:
          "Third edition, first impression, from 1966, with Tolkien's own mountain-and-dragon design on the jacket. The book is very good with a slight lean and a bookseller's sticker on the rear pastedown. The jacket is bright, with some rubbing at the folds.",
        category: "Books",
        fields: [
          { label: "Author", value: "J.R.R. Tolkien" },
          { label: "Publisher", value: "George Allen & Unwin, 1966" },
          { label: "Edition", value: "Third edition, first impression" },
          { label: "Condition", value: "Very good" },
          { label: "Flaws", value: "Slight lean, bookseller sticker" },
        ],
        price: 450,
        shipping: 18,
        image:
          "A hardcover book in its dust jacket standing upright, straight-on, the jacket showing simple layered triangular mountains under a small round sun. Jacket in pale mint, mountains in leaf green and ink, sun in lemon, spine edge in ink, short ink bars at the top where the title would be. No readable text.",
      },
      {
        slug: "mary-oliver-dream-work-signed",
        name: "Dream Work, signed",
        title: "Dream Work by Mary Oliver, 1986 first edition, signed",
        oneLiner: "Signed on the title page, with 'Wild Geese' inside",
        description:
          "Atlantic Monthly Press first edition from 1986, signed by Mary Oliver on the title page. This is the book with 'Wild Geese'. Fine in a near-fine jacket with a little rubbing at the corners.",
        category: "Books",
        fields: [
          { label: "Author", value: "Mary Oliver" },
          { label: "Publisher", value: "Atlantic Monthly Press, 1986" },
          { label: "Edition", value: "First edition" },
          { label: "Signed", value: "Yes, on the title page" },
          { label: "Condition", value: "Fine, jacket near fine" },
        ],
        price: 340,
        shipping: 12,
        image:
          "A slim hardcover book standing upright, straight-on, the jacket showing two simple flying geese silhouettes above a soft horizon line. Jacket in blush, geese in ink, horizon line in leaf green, spine edge in deep pink, short ink bars where the title would be. No readable text.",
      },
      {
        slug: "early-penguins-lot-12",
        name: "Early Penguin lot",
        title: "Lot of 12 early Penguin paperbacks, 1930s and 1940s",
        oneLiner: "The orange-and-white classics, for a shelf that makes people stop",
        description:
          "Twelve early Penguin paperbacks from 1936 to 1948, mostly the orange fiction line with two green crime titles. Spines are sound with some sunning, and the pages have the toning you'd expect. A list of every title is in the photos.",
        category: "Books",
        fields: [
          { label: "Publisher", value: "Penguin" },
          { label: "Years", value: "1936 to 1948" },
          { label: "Count", value: "12 paperbacks" },
          { label: "Condition", value: "Good, sunned spines, toned pages" },
        ],
        price: 140,
        shipping: 14,
        image:
          "A neat row of eight paperback books standing upright side by side, seen from the spine side. Each spine in three horizontal bands: top and bottom bands in amber, a white middle band with a tiny ink bar. Two of the books use leaf green bands instead of amber. No readable text.",
      },
      {
        slug: "alice-wonderland-rackham-1907",
        name: "Alice, Rackham edition",
        title: "Alice's Adventures in Wonderland, Heinemann 1907, Rackham plates",
        oneLiner: "Thirteen tipped-in colour plates by Arthur Rackham",
        description:
          "The first Rackham-illustrated trade edition, published by Heinemann in 1907, with all thirteen tipped-in colour plates and their tissue guards. Green cloth with gilt decoration. Light rubbing to the spine ends, some foxing to the prelims, and the plates are bright.",
        category: "Books",
        fields: [
          { label: "Author", value: "Lewis Carroll" },
          { label: "Illustrator", value: "Arthur Rackham" },
          { label: "Publisher", value: "Heinemann, 1907" },
          { label: "Plates", value: "All 13, with tissue guards" },
          { label: "Condition", value: "Very good, some foxing" },
        ],
        price: 780,
        shipping: 20,
        sold: {
          buyer: "rosa",
          daysAgo: 52,
          rating: 5,
          review: "A beautiful copy, better than I hoped. Margaret's description was exact.",
        },
        image:
          "An old cloth hardcover book standing upright, straight-on, with an ornate decorative frame stamped on the cover and a small rabbit silhouette in the centre. Cloth in leaf green, frame and rabbit in lemon to suggest gilt, spine edge in ink.",
      },
    ],
  },

  /* Board games ------------------------------------------------------------ */
  {
    slug: "meeplemarket",
    name: "Meeple Market",
    owner: {
      handle: "sofia",
      name: "Sofia Reyes",
      email: "sofia.reyes@example.com",
      location: "Denver, CO",
      about: "Game night host. I count every card and token before a game goes up.",
    },
    about:
      "Board games from our game nights and estate sales. Every one is counted against the rulebook before it's listed, and missing bits are always written up.",
    category: "A bit of everything",
    tone: "pink",
    location: "Denver, CO",
    openedDaysAgo: 120,
    picture: "A single wooden board game pawn shaped like a little person, in pink with a lemon outline ring",
    items: [
      {
        slug: "settlers-of-catan-1995-mayfair",
        name: "Settlers of Catan, 1995",
        title: "The Settlers of Catan, Mayfair 1995 first English edition",
        oneLiner: "The wooden-piece original that started modern board gaming",
        description:
          "The first English edition from Mayfair, with the wooden roads, settlements and cities. Counted: every piece and card is here. The box has worn corners and the frame pieces have play wear. The hex tiles are flat with no peeling.",
        category: "Collectible board games",
        fields: [
          { label: "Publisher", value: "Mayfair Games, 1995" },
          { label: "Edition", value: "First English edition" },
          { label: "Complete", value: "Yes, counted" },
          { label: "Condition", value: "Good, box corner wear" },
        ],
        price: 85,
        shipping: 16,
        image:
          "A board game box lid seen from a slight three-quarter angle, its art showing a few hexagon tiles in leaf green, lemon and amber with tiny wooden houses on them. Box sides in berry red, a few short white bars where the title would be. In front of the box, three small wooden house tokens in pink, mint and white. No readable text.",
      },
      {
        slug: "gloomhaven-first-edition-unpunched",
        name: "Gloomhaven",
        title: "Gloomhaven first edition, unpunched, complete",
        oneLiner: "Twenty-two pounds of dungeon crawling, never played",
        description:
          "First edition Gloomhaven with every sheet still unpunched and the sealed envelopes and character boxes unopened. I opened the shrink to check it was complete, then didn't find the time. Box is in great shape with a small dent in one corner from moving.",
        category: "Collectible board games",
        fields: [
          { label: "Publisher", value: "Cephalofair Games" },
          { label: "Edition", value: "First edition" },
          { label: "Condition", value: "Unpunched, unplayed" },
          { label: "Flaws", value: "Small dent on one box corner" },
        ],
        price: 145,
        lowest: 125,
        shipping: 35,
        question: {
          buyer: "jamal",
          ask: "Any chance of local pickup? I'm in Denver for a week next month.",
        },
        image:
          "A huge, deep board game box seen at a slight three-quarter angle, its lid art showing a simple shadowy castle doorway with a glowing lemon light inside. Box in ink, doorway in deep pink and leaf green stone shapes, a few short white bars where the title would be. No readable text.",
      },
      {
        slug: "heroquest-1989-complete",
        name: "HeroQuest 1989",
        title: "HeroQuest, Milton Bradley 1989, complete with furniture",
        oneLiner: "The original dungeon in a box, every monster and chest included",
        description:
          "1989 Milton Bradley HeroQuest, counted against the inventory: all 31 monsters, furniture, doors and cards are here, plus the quest book. The cardboard furniture is in good shape and the board has a crease at the fold. Box has a split corner taped from the inside.",
        category: "Collectible board games",
        fields: [
          { label: "Publisher", value: "Milton Bradley, 1989" },
          { label: "Complete", value: "Yes, counted" },
          { label: "Condition", value: "Good" },
          { label: "Flaws", value: "Box corner split, taped inside" },
        ],
        price: 175,
        shipping: 20,
        image:
          "A board game box lid seen straight-on, its art showing a small hero figure with a sword and shield facing a big friendly ogre shape in front of stone walls. Box border in ink, hero in lemon, ogre in leaf green, stone walls in pale lemon with amber lines, a few short white bars where the title would be. No readable text.",
      },
      {
        slug: "wingspan-with-expansions",
        name: "Wingspan with expansions",
        title: "Wingspan with European and Oceania expansions, sleeved",
        oneLiner: "Everything you need for many evenings of birds",
        description:
          "Wingspan plus the European and Oceania expansions, all cards sleeved, with the Oceania nectar and updated player mats. Played maybe a dozen times. The bird feeder dice tower and eggs are all here. The sleeves are a bonus.",
        category: "Collectible board games",
        fields: [
          { label: "Publisher", value: "Stonemaier Games" },
          { label: "Includes", value: "European and Oceania expansions" },
          { label: "Condition", value: "Excellent, sleeved" },
        ],
        price: 75,
        shipping: 16,
        image:
          "A board game box lid seen straight-on with a large simple bird with spread wings in the centre. Box in pale mint, bird in pink and deep pink, a lemon sun behind it, small eggs in pastel mint, blush and lemon scattered at the bottom. A few short ink bars where the title would be. No readable text.",
      },
      {
        slug: "scrabble-deluxe-turntable",
        name: "Scrabble Deluxe",
        title: "Scrabble Deluxe turntable edition, 1980s, burgundy",
        oneLiner: "The spinning board with raised grid so tiles don't slide",
        description:
          "The 1980s Deluxe edition in burgundy, with a turntable base and raised grid. All 100 tiles, four racks and the tile bag are here. The board spins smoothly. Some wear on the burgundy edges.",
        category: "Collectible board games",
        fields: [
          { label: "Edition", value: "Deluxe turntable, 1980s" },
          { label: "Complete", value: "Yes, 100 tiles" },
          { label: "Condition", value: "Very good" },
        ],
        price: 65,
        shipping: 22,
        image:
          "A square game board on a low round turntable base, seen from a slight high angle, with a raised grid of small squares and a few blank square tiles placed in a line. Board in deep pink with white grid lines, some squares in pink and mint, tiles in pale lemon with no letters, base in ink.",
      },
      {
        slug: "ticket-to-ride-1910",
        name: "Ticket to Ride with 1910",
        title: "Ticket to Ride with the USA 1910 expansion",
        oneLiner: "The train game everyone can learn in ten minutes",
        description:
          "Ticket to Ride with the USA 1910 expansion and its full-size cards. All 225 train cars are here. Box is in good shape; the board has light wear on the fold.",
        category: "Collectible board games",
        fields: [
          { label: "Publisher", value: "Days of Wonder" },
          { label: "Includes", value: "USA 1910 expansion" },
          { label: "Condition", value: "Very good" },
        ],
        price: 45,
        shipping: 16,
        sold: {
          buyer: "noah",
          daysAgo: 7,
          rating: 4,
          review: "Complete and clean. Box had a small crush from shipping, but the game is perfect.",
        },
        image:
          "A board game box lid seen straight-on, showing a small old steam train crossing a simple map with wavy roads. Box in pale lemon, train in berry red and ink, routes in leaf green, a few short ink bars where the title would be. No readable text.",
      },
      {
        slug: "risk-1963-wooden-pieces",
        name: "Risk, 1963",
        title: "Risk, Parker Brothers 1963, with wooden pieces",
        oneLiner: "The original with little wooden cubes and a lovely old board",
        description:
          "The early edition of Risk with wooden cubes and Roman numeral pieces in six colours. The board is bright with one small tape repair on the back. A few pieces are missing from the black set; I've included replacements from a later edition.",
        category: "Collectible board games",
        fields: [
          { label: "Publisher", value: "Parker Brothers, 1963" },
          { label: "Pieces", value: "Wooden cubes" },
          { label: "Condition", value: "Good" },
          { label: "Flaws", value: "A few black pieces replaced" },
        ],
        price: 70,
        shipping: 18,
        image:
          "A long flat board game box seen straight-on, with an old-style world map of simplified continents. Box border in ink, sea in pale mint, continents in leaf green, lemon, pink and amber, a few small wooden cubes in front of the box in pink, mint, lemon and white. A few short white bars where the title would be. No readable text.",
      },
    ],
  },

  /* Classic video games ---------------------------------------------------- */
  {
    slug: "cartridgeclub",
    name: "Cartridge Club",
    owner: {
      handle: "leo",
      name: "Leo Brandt",
      email: "leo.brandt@example.com",
      location: "Seattle, WA",
      about: "Retro game fixer. Contacts cleaned, batteries replaced, every game played before it ships.",
    },
    about:
      "Classic consoles and games. Every cartridge is opened, the contacts cleaned, the save battery replaced if it has one, and played before it ships.",
    category: "Collectibles",
    tone: "mint",
    location: "Seattle, WA",
    openedDaysAgo: 250,
    picture: "A retro game controller with a round button pad, in mint, ink and pink",
    items: [
      {
        slug: "super-mario-bros-3-nes",
        name: "Super Mario Bros. 3",
        title: "Super Mario Bros. 3 for NES, cartridge only, cleaned and tested",
        oneLiner: "The best Mario on the NES, ready to play",
        description:
          "Authentic NES cartridge, opened and cleaned with the pins polished. Tested start to finish on an original console. The label is bright with a small scuff in the bottom corner. Cartridge only, no box or manual.",
        category: "Video games and consoles",
        fields: [
          { label: "Platform", value: "NES" },
          { label: "Region", value: "NTSC (North America)" },
          { label: "Includes", value: "Cartridge only" },
          { label: "Condition", value: "Very good, small label scuff" },
          { label: "Tested", value: "Yes, cleaned and played" },
        ],
        price: 42,
        shipping: 6,
        image:
          "A grey rectangular game cartridge standing upright, straight-on, with ridged grips on the top half and a large label area. Cartridge body in pale lemon with amber ridge lines, the label showing a simple raccoon tail and a small round leaf on a pink background, a few short white bars where text would be. No readable text.",
      },
      {
        slug: "zelda-ocarina-gold-n64",
        name: "Zelda Ocarina gold cartridge",
        title: "The Legend of Zelda: Ocarina of Time, gold N64 cartridge",
        oneLiner: "The collector's gold cartridge, with the save battery replaced",
        description:
          "The gold collector's edition cartridge. Opened, contacts cleaned and save battery replaced, so your saves will stick. The label is clean and the gold plastic has a few light scratches on the back.",
        category: "Video games and consoles",
        fields: [
          { label: "Platform", value: "Nintendo 64" },
          { label: "Edition", value: "Gold collector's cartridge" },
          { label: "Includes", value: "Cartridge only" },
          { label: "Condition", value: "Very good" },
          { label: "Tested", value: "Yes, new save battery" },
        ],
        price: 95,
        shipping: 7,
        image:
          "A wide game cartridge standing upright, straight-on, with a rounded top edge and a label. Cartridge body in lemon with amber shading lines to read as gold, the label showing a simple ocarina shape in mint on a leaf green background with a few short white bars where text would be. No readable text.",
      },
      {
        slug: "game-boy-dmg-01-tetris",
        name: "Game Boy with Tetris",
        title: "Original Game Boy DMG-01 with Tetris, new screen lens",
        oneLiner: "The brick that went everywhere, with a fresh lens and clean sound",
        description:
          "Original Game Boy, opened and cleaned, with a new screen lens, a new power switch and no dead lines on the screen. The speaker is clear and all buttons respond. Comes with Tetris. The shell has light yellowing on the back.",
        category: "Video games and consoles",
        fields: [
          { label: "Model", value: "Game Boy DMG-01" },
          { label: "Includes", value: "Tetris cartridge" },
          { label: "Repairs", value: "New lens, new power switch" },
          { label: "Condition", value: "Very good, light yellowing on back" },
          { label: "Tested", value: "Yes, no dead lines" },
        ],
        price: 115,
        lowest: 100,
        shipping: 9,
        question: {
          buyer: "ava",
          ask: "Does it come with batteries?",
          answer: "Yes! Four fresh AAs go in the box with it.",
        },
        image:
          "A handheld game console standing upright, straight-on, with a small screen near the top, a cross-shaped direction pad on the lower left, two round buttons on the lower right angled diagonally, and two small pill-shaped buttons in the middle. Body in pale lemon, screen frame in ink, the screen in mint showing a few stacked block shapes in leaf green, round buttons in deep pink, pad in ink.",
      },
      {
        slug: "earthbound-snes-cib",
        name: "EarthBound complete",
        title: "EarthBound for SNES, complete in box with player's guide",
        oneLiner: "The big box with the scratch-and-sniff guide, all original",
        description:
          "Complete in the big box: cartridge, tray, player's guide with the scratch-and-sniff cards, and the poster. The box has some shelf wear and a crease at the top flap. The guide is complete with all pages. The cartridge is cleaned and tested, and the save works.",
        category: "Video games and consoles",
        fields: [
          { label: "Platform", value: "Super Nintendo" },
          { label: "Includes", value: "Box, tray, player's guide, poster" },
          { label: "Condition", value: "Good box, excellent cartridge" },
          { label: "Tested", value: "Yes, save works" },
        ],
        price: 650,
        lowest: 600,
        shipping: 15,
        image:
          "A big upright cardboard game box, straight-on, with art showing a simple round cartoon boy with a baseball cap and a backpack under a starry night sky. Box in ink, boy in berry red cap and lemon backpack, stars in white, a small green-pink planet in the corner, a few short white bars where the title would be. A slim guide book leaning against the box in pink. No readable text.",
      },
      {
        slug: "sega-genesis-model-1-bundle",
        name: "Sega Genesis bundle",
        title: "Sega Genesis Model 1 with two controllers and Sonic",
        oneLiner: "The high-definition graphics model, ready to plug in",
        description:
          "Model 1 Genesis, the one with the headphone jack, with two original three-button controllers, the power supply, AV cable and Sonic the Hedgehog. Cleaned inside and out, and the cartridge slot is tight. A few light scratches on the top.",
        category: "Video games and consoles",
        fields: [
          { label: "Model", value: "Genesis Model 1" },
          { label: "Includes", value: "2 controllers, power, AV, Sonic" },
          { label: "Condition", value: "Very good" },
          { label: "Tested", value: "Yes" },
        ],
        price: 135,
        shipping: 22,
        image:
          "A low black game console seen from a slight high front angle, with a round recessed circle in the top surface, a cartridge slot, and a three-button controller lying in front of it. Console and controller in ink, the circle and slot details in leaf green lines, the controller buttons in pink and a small lemon start button.",
      },
      {
        slug: "chrono-trigger-snes",
        name: "Chrono Trigger",
        title: "Chrono Trigger for SNES, cartridge, new save battery",
        oneLiner: "One of the greatest RPGs ever made, saves guaranteed",
        description:
          "Authentic cartridge with a new save battery soldered in. Cleaned and tested through the first boss. Label is near perfect.",
        category: "Video games and consoles",
        fields: [
          { label: "Platform", value: "Super Nintendo" },
          { label: "Includes", value: "Cartridge only" },
          { label: "Condition", value: "Excellent" },
          { label: "Tested", value: "Yes, new save battery" },
        ],
        price: 210,
        shipping: 7,
        sold: {
          buyer: "jamal",
          daysAgo: 4,
          rating: 5,
          review: "Saves work great. Leo even included a note with the battery date. Top seller.",
        },
        image:
          "A grey game cartridge standing upright, straight-on, with a rounded top and a label. Cartridge body in pale lemon, the label showing a simple pocket watch shape in lemon and amber on a deep pink background with a few short white bars where text would be. No readable text.",
      },
      {
        slug: "gamecube-indigo-bundle",
        name: "GameCube Indigo",
        title: "Nintendo GameCube in Indigo with controller and memory card",
        oneLiner: "The lunchbox console, cleaned with a new disc drive lens",
        description:
          "Indigo GameCube with an original controller, a 59-block memory card, power supply and AV cable. Disc drive lens replaced, reads every disc I tried. The handle has a few scuffs. Controller sticks are tight with no drift.",
        category: "Video games and consoles",
        fields: [
          { label: "Model", value: "GameCube DOL-001" },
          { label: "Colour", value: "Indigo" },
          { label: "Includes", value: "Controller, memory card, power, AV" },
          { label: "Repairs", value: "New disc drive lens" },
          { label: "Condition", value: "Very good" },
        ],
        price: 120,
        shipping: 18,
        image:
          "A small cube-shaped game console seen from a slight high three-quarter angle, with a carrying handle on the back and a round disc lid on top, and a controller with two handles sitting in front of it. Console and controller in deep pink, handle in ink, the round lid outlined in pink, controller buttons in lemon, mint and berry red.",
      },
    ],
  },
];
