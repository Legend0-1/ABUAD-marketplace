/**
 * Maps a marketplace category to a real photograph (Unsplash CDN, no API key
 * needed — plain hotlinked <img> URLs). Matching is deliberately fuzzy: it
 * looks at the slug, the stored icon name, and keywords in the display name,
 * so it keeps working even as admins add or rename categories in the DB.
 *
 * Every consumer should still wire an onError fallback (see ImageWithFallback
 * / the poster-fallback class) because we can't guarantee a remote photo loads.
 */

const UNSPLASH = (id: string, w = 600, h = 450) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`

// A mapped value is either an Unsplash photo id (built into a CDN URL) or, when
// it starts with "/", a local asset path (e.g. a bundled SVG) that is returned
// verbatim. Local assets are used where we want a guaranteed on-brand subject
// that can never hotlink-fail.
const resolveImage = (val: string, w = 600, h = 450) =>
  val.startsWith('/') ? val : UNSPLASH(val, w, h)

// NOTE: Delivery and Printing use locally-hosted photos in /public/img
// (delivery.jpg, print.jpg) so they show real, on-brand images that never
// hotlink-fail. Replace those files in public/img to change the pictures.
// Keyword -> photo. First match wins, so order from specific to generic.
const RULES: { test: RegExp; id: string }[] = [
  { test: /cloth|fashion|apparel|wear|thrift|outfit/i, id: '1445205170230-053b83016050' },
  { test: /cosmetic|beauty|makeup|skincare|hair|wig|braid/i, id: '1596462502278-27bfdc403348' },
  { test: /deliver|errand|dispatch|logistics|runner|pickup|package|truck/i, id: '/img/delivery.jpg' },
  { test: /laundry|wash|dry-?clean|ironing/i, id: '1545173168-9f1947eebb7f' },
  { test: /note|assign|project|writing|research|essay|document|file/i, id: '1517842645767-c639042777db' },
  { test: /print|photocopy|binding|stationery/i, id: '/img/print.jpg' },
  { test: /phone|gadget|smartphone|mobile|device/i, id: '1511707171634-5f897ff02aa9' },
  { test: /electronic|appliance|plug|charger|blender|extension|fan|bulb/i, id: '1498049794561-7780e7231661' },
  { test: /food|drink|snack|meal|pastry|restaurant|kitchen/i, id: '1504674900247-0877df9cc836' },
  { test: /hostel|room|bed|mattress|essential|decor|furniture/i, id: '1522708323590-d24dbb6b0267' },
  { test: /shoe|footwear|sneaker|slipper|sandal|foot/i, id: '1460353581641-37baddab0fa2' },
  { test: /book|textbook|library|study|education/i, id: '1481627834876-b7833e8f5570' },
  { test: /sport|gym|fitness|equipment/i, id: '1517649763962-0c623066013b' },
  { test: /game|gaming|console/i, id: '1550745165-9bc0b252726f' },
  { test: /ticket|event|show|concert/i, id: '1470229722913-7c0e2dbbafd3' },
  { test: /service|repair|fix|tech/i, id: '1581092160562-40aa08e78837' },
]

// Icon-name fallback (matches the stored `icon` string on a category).
const ICON_MAP: Record<string, string> = {
  Shirt: '1445205170230-053b83016050',
  Sparkles: '1596462502278-27bfdc403348',
  Truck: '/img/delivery.jpg',
  WashingMachine: '1545173168-9f1947eebb7f',
  FileText: '1517842645767-c639042777db',
  Printer: '/img/print.jpg',
  Smartphone: '1511707171634-5f897ff02aa9',
  Plug: '1498049794561-7780e7231661',
  BedDouble: '1522708323590-d24dbb6b0267',
  Footprints: '1460353581641-37baddab0fa2',
  BookOpen: '1481627834876-b7833e8f5570',
  Tag: '1441986300917-64674bd600d8',
}

const DEFAULT_ID = '1441986300917-64674bd600d8' // vibrant market stalls

type CategoryLike = { slug?: string; name?: string; icon?: string | null }

export function categoryImage(cat: CategoryLike, w = 600, h = 450): string {
  const haystack = `${cat.slug || ''} ${cat.name || ''}`
  for (const rule of RULES) {
    if (rule.test.test(haystack)) return resolveImage(rule.id, w, h)
  }
  if (cat.icon && ICON_MAP[cat.icon]) return resolveImage(ICON_MAP[cat.icon], w, h)
  return resolveImage(DEFAULT_ID, w, h)
}
