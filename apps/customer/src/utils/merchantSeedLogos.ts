/**
 * Seeded / Brandfetch logo URLs keyed by exact restaurant name — shared by RestaurantGrid
 * and CustomerMerchantMap so list cards and map pins show the same imagery.
 */
const SEEDED_LOGO_BASE =
  'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos';
const BRANDFETCH = 'https://cdn.brandfetch.io';

const SEEDED_LOGO_URLS: Record<string, string> = {
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
  "McDonalds": `${SEEDED_LOGO_BASE}/FB_IMG_1773014131269.jpg`,
  "Olive Garden": `${SEEDED_LOGO_BASE}/FB_IMG_1773014153763.jpg`,
  "Outback Steakhouse": `${SEEDED_LOGO_BASE}/FB_IMG_1773014170637.jpg`,
  "Panda Express": `${SEEDED_LOGO_BASE}/FB_IMG_1773014193727.jpg`,
  "Red Lobster": `${SEEDED_LOGO_BASE}/FB_IMG_1773014220077.jpg`,
  "Red Robin": `${SEEDED_LOGO_BASE}/FB_IMG_1773014242955.jpg`,
  "Red Robbin": `${SEEDED_LOGO_BASE}/FB_IMG_1773014242955.jpg`,
  "Rosiies": `${SEEDED_LOGO_BASE}/FB_IMG_1773014271528.jpg`,
  "Rosie's": `${SEEDED_LOGO_BASE}/FB_IMG_1773014271528.jpg`,
  "Rudy's Hot Dog": `${SEEDED_LOGO_BASE}/FB_IMG_1773014327092.jpg`,
  "Schmucker's Restaurant": `${SEEDED_LOGO_BASE}/FB_IMG_1773014432347.jpg`,
  "Sonic": `${SEEDED_LOGO_BASE}/FB_IMG_1773014452021.jpg`,
  "Star Diner": `${SEEDED_LOGO_BASE}/FB_IMG_1773014472754.jpg`,
  "Starbucks": `${SEEDED_LOGO_BASE}/FB_IMG_1773014488001.jpg`,
  "Taco Bell": `${SEEDED_LOGO_BASE}/FB_IMG_1773014506899.jpg`,
  "Texas Roadhouse": `${SEEDED_LOGO_BASE}/FB_IMG_1773014555948.jpg`,
  "The Attic on Adams": `${SEEDED_LOGO_BASE}/FB_IMG_1773014580737.jpg`,
  "Ye Olde Dirty Bird": `${SEEDED_LOGO_BASE}/Picsart_26-03-08_20-07-48-171.jpg`,
  "Ye Olde Durty Bird": `${SEEDED_LOGO_BASE}/Picsart_26-03-08_20-07-48-171.jpg`,
  // Brandfetch CDN logos for major chains not in seed storage
  "Burger King": `${BRANDFETCH}/burgerking.com/logo`,
  "Chick-fil-A": `${BRANDFETCH}/chick-fil-a.com/logo`,
  "Chipotle": `${BRANDFETCH}/chipotle.com/logo`,
  "Five Guys": `${BRANDFETCH}/fiveguys.com/logo`,
  "Popeyes": `${BRANDFETCH}/popeyes.com/logo`,
  "Panera Bread": `${BRANDFETCH}/panerabread.com/logo`,
  "Jimmy John's": `${BRANDFETCH}/jimmyjohns.com/logo`,
  "Little Caesars": `${BRANDFETCH}/littlecaesars.com/logo`,
  "Pizza Hut": `${BRANDFETCH}/pizzahut.com/logo`,
  "Domino's": `${BRANDFETCH}/dominos.com/logo`,
  "Dairy Queen": `${BRANDFETCH}/dairyqueen.com/logo`,
  "Wingstop": `${BRANDFETCH}/wingstop.com/logo`,
  "Raising Cane's": `${BRANDFETCH}/raisingcanes.com/logo`,
  "Qdoba": `${BRANDFETCH}/qdoba.com/logo`,
  "Firehouse Subs": `${BRANDFETCH}/firehousesubs.com/logo`,
  "Jersey Mike's": `${BRANDFETCH}/jerseymikes.com/logo`,
  "Culver's": `${BRANDFETCH}/culvers.com/logo`,
  "Buffalo Wild Wings": `${BRANDFETCH}/buffalowildwings.com/logo`,
  "White Castle": `${BRANDFETCH}/whitecastle.com/logo`,
  "Steak 'n Shake": `${BRANDFETCH}/steaknshake.com/logo`,
  "Marco's Pizza": `${BRANDFETCH}/marcos.com/logo`,
  "Papa Johns": `${BRANDFETCH}/papajohns.com/logo`,
  "Papa John's": `${BRANDFETCH}/papajohns.com/logo`,
  "Wendy's": `${BRANDFETCH}/wendys.com/logo`,
  "KFC": `${BRANDFETCH}/kfc.com/logo`,
  "Subway": `${BRANDFETCH}/subway.com/logo`,
  "Waffle House": `${BRANDFETCH}/wafflehouse.com/logo`,
  "Jack in the Box": `${BRANDFETCH}/jackinthebox.com/logo`,
  "Whataburger": `${BRANDFETCH}/whataburger.com/logo`,
  "Zaxby's": `${BRANDFETCH}/zaxbys.com/logo`,
  "Hardee's": `${BRANDFETCH}/hardees.com/logo`,
  "Carl's Jr.": `${BRANDFETCH}/carlsjr.com/logo`,
  "Long John Silver's": `${BRANDFETCH}/ljsilvers.com/logo`,
  "Noodles & Company": `${BRANDFETCH}/noodles.com/logo`,
  "Moe's Southwest Grill": `${BRANDFETCH}/moes.com/logo`,
  "Shake Shack": `${BRANDFETCH}/shakeshack.com/logo`,
  "Portillo's": `${BRANDFETCH}/portillos.com/logo`,
  "Tropical Smoothie Cafe": `${BRANDFETCH}/tropicalsmoothiecafe.com/logo`,
  "Checkers": `${BRANDFETCH}/checkers.com/logo`,
  "Rally's": `${BRANDFETCH}/checkers.com/logo`,
  "Del Taco": `${BRANDFETCH}/deltaco.com/logo`,
  "Church's Chicken": `${BRANDFETCH}/churchs.com/logo`,
  "Bojangles": `${BRANDFETCH}/bojangles.com/logo`,
  "Fazoli's": `${BRANDFETCH}/fazolis.com/logo`,
  "Golden Corral": `${BRANDFETCH}/goldencorral.com/logo`,
  "Krispy Kreme": `${BRANDFETCH}/krispykreme.com/logo`,
  "Tim Hortons": `${BRANDFETCH}/timhortons.com/logo`,
  "Benchmark Restaurant": `${BRANDFETCH}/benchmarkrestaurant.com/logo`,
};

/** Check if a URL is a generic unsplash stock photo (not a real logo) */
export function isGenericStockPhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('images.unsplash.com');
}

export function getSeededLogoUrl(name: string | null | undefined): string | undefined {
  return name ? SEEDED_LOGO_URLS[name] : undefined;
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
