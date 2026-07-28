/**
 * Seeded / Brandfetch logo URLs keyed by exact restaurant name — shared by RestaurantGrid
 * and CustomerMerchantMap so list cards and map pins show the same imagery.
 *
 * Resolution order (see resolveMerchantLogoUrl):
 * 1. Hand-uploaded Supabase Storage seed logos (preferred for locals)
 * 2. Curated Brandfetch CDN via MERCHANT_BRAND_DOMAINS
 * 3. DB image_url / logo_url (skip generic Unsplash placeholders)
 */

const SEEDED_LOGO_BASE =
  'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos';
export const BRANDFETCH_CDN = 'https://cdn.brandfetch.io';

/** Hand-uploaded logos in Supabase Storage (batch migrations). */
const SEEDED_STORAGE_LOGOS: Record<string, string> = {
  "Tony Packo's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013555938.jpg`,
  "Applebee's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013585044.jpg`,
  "Arby's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013601605.jpg`,
  "Balance Grille": `${SEEDED_LOGO_BASE}/FB_IMG_1773013654751.jpg`,
  "Bangkok Kitchen": `${SEEDED_LOGO_BASE}/FB_IMG_1773013751104.jpg`,
  "Bar Louie": `${SEEDED_LOGO_BASE}/FB_IMG_1773013775224.jpg`,
  "Bob Evans": `${SEEDED_LOGO_BASE}/FB_IMG_1773013792415.jpg`,
  "Chili's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013841352.jpg`,
  "Cracker Barrel": `${SEEDED_LOGO_BASE}/FB_IMG_1773013861105.jpg`,
  "Denny's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013878790.jpg`,
  "Dunkin'": `${SEEDED_LOGO_BASE}/FB_IMG_1773013952977.jpg`,
  "Holland House": `${SEEDED_LOGO_BASE}/FB_IMG_1773014023637.jpg`,
  "Home Slice Pizza": `${SEEDED_LOGO_BASE}/FB_IMG_1773014076682.jpg`,
  "IHOP": `${SEEDED_LOGO_BASE}/FB_IMG_1773014105739.jpg`,
  "McDonald's": `${SEEDED_LOGO_BASE}/FB_IMG_1773014131269.jpg`,
  McDonalds: `${SEEDED_LOGO_BASE}/FB_IMG_1773014131269.jpg`,
  "Olive Garden": `${SEEDED_LOGO_BASE}/FB_IMG_1773014153763.jpg`,
  "Outback Steakhouse": `${SEEDED_LOGO_BASE}/FB_IMG_1773014170637.jpg`,
  "Panda Express": `${SEEDED_LOGO_BASE}/FB_IMG_1773014193727.jpg`,
  "Red Lobster": `${SEEDED_LOGO_BASE}/FB_IMG_1773014220077.jpg`,
  "Red Robin": `${SEEDED_LOGO_BASE}/FB_IMG_1773014242955.jpg`,
  "Red Robbin": `${SEEDED_LOGO_BASE}/FB_IMG_1773014242955.jpg`,
  Rosiies: `${SEEDED_LOGO_BASE}/FB_IMG_1773014271528.jpg`,
  "Rosie's": `${SEEDED_LOGO_BASE}/FB_IMG_1773014271528.jpg`,
  "Rudy's Hot Dog": `${SEEDED_LOGO_BASE}/FB_IMG_1773014327092.jpg`,
  "Schmucker's Restaurant": `${SEEDED_LOGO_BASE}/FB_IMG_1773014432347.jpg`,
  Sonic: `${SEEDED_LOGO_BASE}/FB_IMG_1773014452021.jpg`,
  "Star Diner": `${SEEDED_LOGO_BASE}/FB_IMG_1773014472754.jpg`,
  Starbucks: `${SEEDED_LOGO_BASE}/FB_IMG_1773014488001.jpg`,
  "Taco Bell": `${SEEDED_LOGO_BASE}/FB_IMG_1773014506899.jpg`,
  "Texas Roadhouse": `${SEEDED_LOGO_BASE}/FB_IMG_1773014555948.jpg`,
  "The Attic on Adams": `${SEEDED_LOGO_BASE}/FB_IMG_1773014580737.jpg`,
  "Ye Olde Dirty Bird": `${SEEDED_LOGO_BASE}/Picsart_26-03-08_20-07-48-171.jpg`,
  "Ye Olde Durty Bird": `${SEEDED_LOGO_BASE}/Picsart_26-03-08_20-07-48-171.jpg`,
};

/**
 * Curated brand domain map for Brandfetch CDN.
 * Prefer real domains over naive name→slug guesses from seed SQL.
 */
export const MERCHANT_BRAND_DOMAINS: Record<string, string> = {
  // Fast food / QSR
  "McDonald's": 'mcdonalds.com',
  McDonalds: 'mcdonalds.com',
  "Wendy's": 'wendys.com',
  "Burger King": 'burgerking.com',
  "Taco Bell": 'tacobell.com',
  KFC: 'kfc.com',
  Subway: 'subway.com',
  Chipotle: 'chipotle.com',
  "Five Guys": 'fiveguys.com',
  Popeyes: 'popeyes.com',
  "Chick-fil-A": 'chick-fil-a.com',
  "Panera Bread": 'panerabread.com',
  "Jimmy John's": 'jimmyjohns.com',
  "Little Caesars": 'littlecaesars.com',
  "Pizza Hut": 'pizzahut.com',
  "Domino's": 'dominos.com',
  Wingstop: 'wingstop.com',
  "Raising Cane's": 'raisingcanes.com',
  Qdoba: 'qdoba.com',
  "Firehouse Subs": 'firehousesubs.com',
  "Jersey Mike's": 'jerseymikes.com',
  "Culver's": 'culvers.com',
  "Buffalo Wild Wings": 'buffalowildwings.com',
  "White Castle": 'whitecastle.com',
  "Steak 'n Shake": 'steaknshake.com',
  "Marco's Pizza": 'marcos.com',
  "Papa John's": 'papajohns.com',
  "Papa Johns": 'papajohns.com',
  "Dairy Queen": 'dairyqueen.com',
  "Waffle House": 'wafflehouse.com',
  "Jack in the Box": 'jackinthebox.com',
  Whataburger: 'whataburger.com',
  "Zaxby's": 'zaxbys.com',
  "Hardee's": 'hardees.com',
  "Carl's Jr.": 'carlsjr.com',
  "Long John Silver's": 'ljsilvers.com',
  "Noodles & Company": 'noodles.com',
  "Moe's Southwest Grill": 'moes.com',
  "Shake Shack": 'shakeshack.com',
  "Portillo's": 'portillos.com',
  "Tropical Smoothie Cafe": 'tropicalsmoothiecafe.com',
  Checkers: 'checkers.com',
  "Rally's": 'checkers.com',
  "Del Taco": 'deltaco.com',
  "Church's Chicken": 'churchs.com',
  Bojangles: 'bojangles.com',
  "Fazoli's": 'fazolis.com',
  "Golden Corral": 'goldencorral.com',
  "Krispy Kreme": 'krispykreme.com',
  "Tim Hortons": 'timhortons.com',
  Sonic: 'sonicdrivein.com',
  "Arby's": 'arbys.com',
  Starbucks: 'starbucks.com',
  "Dunkin'": 'dunkindonuts.com',
  "Panda Express": 'pandaexpress.com',

  // Casual dining
  "Applebee's": 'applebees.com',
  "Chili's": 'chilis.com',
  "Olive Garden": 'olivegarden.com',
  "Outback Steakhouse": 'outback.com',
  "Red Lobster": 'redlobster.com',
  "Red Robin": 'redrobin.com',
  "Red Robbin": 'redrobin.com',
  "Cracker Barrel": 'crackerbarrel.com',
  "Denny's": 'dennys.com',
  IHOP: 'ihop.com',
  "Bob Evans": 'bobevans.com',
  "Texas Roadhouse": 'texasroadhouse.com',
  "Bar Louie": 'barlouie.com',
  "Benchmark Restaurant": 'benchmarkrestaurant.com',

  // Convenience / pharmacy
  '7-Eleven': '7-eleven.com',
  'Circle K': 'circlek.com',
  Speedway: 'speedway.com',
  Sheetz: 'sheetz.com',
  Wawa: 'wawa.com',
  GetGo: 'getgo.com',
  'Rite Aid': 'riteaid.com',
  CVS: 'cvs.com',
  "Walgreen's": 'walgreens.com',
  Walgreens: 'walgreens.com',

  // Cosmetics / beauty
  Sephora: 'sephora.com',
  'Ulta Beauty': 'ulta.com',
  Ulta: 'ulta.com',
  'MAC Cosmetics': 'maccosmetics.com',
  Lush: 'lush.com',
  'Bath & Body Works': 'bathandbodyworks.com',
  'The Body Shop': 'thebodyshop.com',
  "Kiehl's": 'kiehls.com',
  "L'Occitane": 'loccitane.com',
  Origins: 'origins.com',
  BareMinerals: 'bareminerals.com',

  // Pet
  PetSmart: 'petsmart.com',
  Petco: 'petco.com',
  'Pet Supplies Plus': 'petsuppliesplus.com',
  "Chuck & Don's": 'chuckanddons.com',
  'Hollywood Feed': 'hollywoodfeed.com',
  'Mud Bay': 'mudbay.com',
  'Unleashed by Petco': 'petco.com',
  'Pet Valu': 'petvalu.com',
  'Pet Supermarket': 'petsupermarket.com',
  'Pet Food Express': 'petfoodexpress.com',

  // Retail
  'Foot Locker': 'footlocker.com',
  'Finish Line': 'finishline.com',
  Zumiez: 'zumiez.com',
  'H&M': 'hm.com',
  'American Eagle': 'ae.com',
  'Hot Topic': 'hottopic.com',
  PacSun: 'pacsun.com',
  'Old Navy': 'oldnavy.com',
  Ross: 'rossstores.com',
  'TJ Maxx': 'tjmaxx.com',
  Marshalls: 'marshalls.com',
  "Kohl's": 'kohls.com',
  Target: 'target.com',
  Walmart: 'walmart.com',
  DSW: 'dsw.com',
  'Shoe Carnival': 'shoecarnival.com',
  'Rack Room Shoes': 'rackroomshoes.com',

  // Malls / centers
  'Franklin Park Mall': 'simon.com',
  'Westfield Franklin Park': 'westfield.com',
  'Levis Commons': 'shoplevisscommons.com',
  'The Shops at Fallen Timbers': 'shopfallentimbers.com',

  // Toledo locals with known sites (Brandfetch when storage missing)
  "Balance Grille": 'balancegrille.com',
  "Home Slice Pizza": 'homeslicepizza.com',
  "Tony Packo's": 'tonypackos.com',
  "Mancy's Steakhouse": 'mancys.com',
  "Doc Watson's": 'docwatsons.com',
  "Ye Olde Durty Bird": 'yeoldedurtybird.com',
  "Ye Olde Dirty Bird": 'yeoldedurtybird.com',
  "Fowl & Fodder": 'fowlandfodder.com',
  "Flap Flap's": 'flapflaps.com',
};

export function brandfetchLogoUrl(domain: string): string {
  const clean = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `${BRANDFETCH_CDN}/${clean}/logo`;
}

/** Check if a URL is a generic unsplash stock photo (not a real logo) */
export function isGenericStockPhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('images.unsplash.com');
}

export function isSeedStorageLogo(url: string | null | undefined): boolean {
  if (!url) return false;
  return /seed(%20|\s)?logos/i.test(url);
}

/** Prefer storage upload, else Brandfetch from curated domain map. */
export function getSeededLogoUrl(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  if (SEEDED_STORAGE_LOGOS[name]) return SEEDED_STORAGE_LOGOS[name];
  const domain = MERCHANT_BRAND_DOMAINS[name];
  if (domain) return brandfetchLogoUrl(domain);
  return undefined;
}

/**
 * Same resolution order as RestaurantGrid cards: seeded name map, then DB image/logo
 * if not a generic stock placeholder.
 */
export function resolveMerchantLogoUrl(
  name: string | null | undefined,
  imageUrl?: string | null,
  logoUrl?: string | null
): string | null {
  const seeded = getSeededLogoUrl(name);
  if (seeded) return seeded;
  const fromDb = imageUrl || logoUrl;
  if (fromDb && !isGenericStockPhoto(fromDb)) return fromDb;
  return null;
}

/** Flat list for admin / edge backfill payloads. */
export function getMerchantBrandDomainEntries(): { name: string; domain: string; logoUrl: string }[] {
  return Object.entries(MERCHANT_BRAND_DOMAINS).map(([name, domain]) => ({
    name,
    domain,
    logoUrl: brandfetchLogoUrl(domain),
  }));
}
