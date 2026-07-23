/**
 * Northwind catalog — server-only seed data.
 *
 * This is the single source of truth for products, categories, reviews, and the
 * demo user. It lives ONLY on the server: route handlers read it and return DTOs
 * built by the helpers below. The client bundle never imports this file, so the
 * frontend ships with zero hardcoded catalog or image data.
 *
 * Ported from the design prototype's `data.js`. Product image bytes are served
 * by `/api/images/[key]` (which proxies the upstream CDN), so `IMG` and the
 * upstream URL builder are an internal backend detail.
 */
import type { Category, Product, Review, SpecPair, ColorOption } from './types';

export const categories: Category[] = [
  { slug: 'electronics', name: 'Electronics', hue: 212, icon: 'headset',
    sub: ['Headphones & Audio', 'Laptops & Computers', 'Cameras', 'Wearables', 'Accessories'] },
  { slug: 'home', name: 'Home & Living', hue: 28, icon: 'store',
    sub: ['Kitchen & Dining', 'Bedding', 'Lighting', 'Home Fragrance', 'Decor'] },
  { slug: 'fashion', name: 'Fashion', hue: 340, icon: 'tag',
    sub: ["Men's Shoes", 'Bags & Backpacks', 'Outerwear', 'Watches', 'Sunglasses'] },
  { slug: 'beauty', name: 'Beauty & Health', hue: 300, icon: 'spark',
    sub: ['Skincare', 'Makeup', 'Fragrance', 'Hair Care', 'Wellness'] },
  { slug: 'sports', name: 'Sports & Outdoors', hue: 150, icon: 'leaf',
    sub: ['Water Bottles', 'Yoga & Fitness', 'Camping', 'Travel Gear', 'Activewear'] },
];

/** Upstream CDN photo ids, keyed by image slug. Internal — never sent to client. */
export const IMG: Record<string, string> = {
  headphones: '1505740420928-5e560c06d30e', earbuds: '1606220588913-b3aacb4d2f46',
  laptop: '1496181133206-80ce9b88a853', laptop2: '1517336714731-489689fd1ca8',
  smartwatch: '1546868871-7041f2a55e12', watch: '1524592094714-0f0654e20314',
  camera: '1502920917128-1aa500764cbd', camera2: '1516035069371-29a1b244cc32',
  speaker: '1608043152269-423dbba4e7e1', speaker2: '1589003077984-894e133dabab',
  mouse: '1527864550417-7fd91fc51a46', monitor: '1527443224154-c4a3942d3acf',
  mug: '1514228742587-6b1558fcca3d', kettle: '1517668808822-9ebb02f2a0e6',
  lamp: '1507473885765-e6ed057f782c', bedding: '1505693416388-ac5ce068fe85',
  duvet: '1522771739844-6a9f6d5f14af', skillet: '1585032226651-759b368d7246',
  diffuser: '1608571423902-eed4a5ad8108', sneakers: '1542291026-7eec264c27ff',
  sneakers2: '1525966222134-fcfa99b8ae77', backpack: '1553062407-98eeb64c6a62',
  leatherbag: '1548036328-c9fa89d128fa', runshoes: '1460353581641-37baddab0fa2',
  coat: '1591047139829-d91aecb6caea', overcoat: '1539533018447-63fcce2678e3',
  sunglasses: '1511499767150-a48a237f0083', serum: '1620916566398-39f1143ab7be',
  skincare: '1556228720-195a672e8a03', lipstick: '1586495777744-4413f21062fa',
  perfume: '1541643600914-78b084683601', hair: '1556228578-8c89e6adf883',
  bottle: '1602143407151-7111542de6e8', bottle2: '1523362628745-0c100150b504',
  yogamat: '1599447421416-3414500d18a5', tent: '1504280390367-361c6d9f38f4',
  camping: '1559521783-1d1599583485',
};

const CROPS = ['entropy', 'edges', 'faces', 'center'];

/** Build the upstream CDN URL for an image key. Backend-internal. */
export function upstreamImageUrl(key: string, w = 400, variant = 0): string {
  const id = IMG[key] || IMG.headphones;
  const c = CROPS[variant % CROPS.length];
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${w}&fit=crop&crop=${c}&q=74&auto=format`;
}

// [title, brand, category, price, compareAt, rating, reviews, badges, desc, specs, opts, imgKey, sold, mall]
type RawOpts = { colors?: ColorOption[]; sizes?: string[] };
type RawProduct = [
  string, string, string, number, number | null, number, number, string[],
  string, SpecPair[], RawOpts, string, number, boolean,
];

const RAW: RawProduct[] = [
  ['Aria Wireless ANC Headphones', 'Nuvio', 'electronics', 129.99, 189.99, 4.6, 2143, ['best'],
    'Studio-grade active-noise-cancelling over-ears with 40-hour battery and plush memory-foam cushions.',
    [['Driver', '40mm dynamic'], ['Battery', '40 hours (ANC on)'], ['Bluetooth', '5.3, multipoint'], ['Weight', '248 g'], ['Charging', 'USB-C quick charge']],
    { colors: [['Midnight', '#23252b'], ['Sand', '#d8cbb6'], ['Sage', '#9aa893']] }, 'headphones', 8421, true],
  ['Pulse Pro True-Wireless Earbuds', 'Nuvio', 'electronics', 89.00, 129.00, 4.4, 980, ['new'],
    'Featherweight true-wireless buds with adaptive transparency and a pocketable charging case.',
    [['Driver', '11mm'], ['Battery', '8h + 24h case'], ['Water rating', 'IPX5'], ['Bluetooth', '5.3']],
    { colors: [['White', '#ece9e2'], ['Graphite', '#34363a']] }, 'earbuds', 3120, true],
  ['Lumen 14" 2.8K OLED Ultrabook', 'Vanta', 'electronics', 899.00, 1099.00, 4.7, 412, [],
    'A 1.1 kg aluminium laptop with a stunning 2.8K OLED display and all-day battery life.',
    [['Display', '14" 2.8K OLED'], ['CPU', '8-core'], ['RAM', '16 GB'], ['Storage', '512 GB SSD'], ['Weight', '1.1 kg']],
    { colors: [['Silver', '#c9cbce'], ['Space', '#3a3d42']] }, 'laptop', 642, true],
  ['Orbit AMOLED Smartwatch', 'Cobalt', 'electronics', 149.99, 219.99, 4.3, 1567, ['best'],
    'AMOLED fitness watch with multi-band GPS, heart-rate tracking and a 7-day battery.',
    [['Display', '1.4" AMOLED'], ['Battery', '7 days'], ['Sensors', 'HR, SpO2, GPS'], ['Water rating', '5 ATM']],
    { colors: [['Black', '#26282c'], ['Rose', '#d6a9a0'], ['Steel', '#b9bcc0']], sizes: ['41mm', '45mm'] }, 'smartwatch', 5240, false],
  ['Vista 4K Action Camera', 'Cobalt', 'electronics', 199.99, 299.99, 4.5, 678, ['sale'],
    'Pocket 4K/120 action camera with 6-axis stabilization and a rugged waterproof housing.',
    [['Video', '4K / 120 fps'], ['Stabilization', '6-axis'], ['Water rating', '10 m'], ['Battery', '90 min 4K']],
    { colors: [['Black', '#222428']] }, 'camera', 1890, false],
  ['SoundDrop Portable Speaker', 'Nuvio', 'electronics', 44.99, 69.99, 4.2, 2310, ['best'],
    'A palm-sized speaker with surprising low end, 16 hours of play and IP67 waterproofing.',
    [['Output', '20 W'], ['Battery', '16 hours'], ['Water rating', 'IP67'], ['Pairing', 'Stereo TWS']],
    { colors: [['Coral', '#d97a5f'], ['Slate', '#5a5f66'], ['Forest', '#566b58']] }, 'speaker', 14200, true],
  ['Glide Silent Wireless Mouse', 'Vanta', 'electronics', 24.99, 39.99, 4.6, 845, ['sale'],
    'Silent-click ergonomic mouse with a 70-day charge and quiet glide feet.',
    [['DPI', '800–4000'], ['Battery', '70 days'], ['Connection', '2.4G + BT'], ['Buttons', '6 programmable']],
    { colors: [['White', '#e9e6df'], ['Black', '#2a2c30']] }, 'mouse', 6730, false],
  ['ClearView 27" 4K USB-C Monitor', 'Vanta', 'electronics', 329.00, 429.00, 4.5, 233, [],
    'A 27-inch 4K IPS monitor with 99% sRGB colour and a single-cable USB-C dock.',
    [['Size', '27" 4K IPS'], ['Refresh', '60 Hz'], ['Color', '99% sRGB'], ['Ports', 'USB-C 90W, HDMI']],
    { colors: [['Graphite', '#34363a']] }, 'monitor', 412, true],
  ['Edge Pro 16" Creator Laptop', 'Vanta', 'electronics', 1249.00, 1499.00, 4.8, 318, ['new'],
    'A 16-inch creator laptop with a colour-accurate mini-LED display and discrete graphics.',
    [['Display', '16" mini-LED'], ['GPU', 'Discrete'], ['RAM', '32 GB'], ['Storage', '1 TB SSD']],
    { colors: [['Space', '#3a3d42']] }, 'laptop2', 276, true],
  ['Zoom Mirrorless Camera Kit', 'Cobalt', 'electronics', 749.00, 949.00, 4.7, 524, ['sale'],
    'A 24MP mirrorless camera with a 16–50mm kit lens, ideal for creators and travel.',
    [['Sensor', '24 MP APS-C'], ['Video', '4K 30p'], ['Lens', '16–50mm kit'], ['Stabilization', 'In-body']],
    { colors: [['Black', '#26282c']] }, 'camera2', 903, false],
  ['Vortex Mini Bluetooth Speaker', 'Nuvio', 'electronics', 29.99, 49.99, 4.1, 1740, [],
    'A clip-on mini speaker with a punchy sound and 10 hours of wireless play.',
    [['Output', '8 W'], ['Battery', '10 hours'], ['Water rating', 'IPX6'], ['Clip', 'Carabiner']],
    { colors: [['Lime', '#bcd14a'], ['Black', '#2a2c30'], ['Coral', '#d97a5f']] }, 'speaker2', 4980, false],

  // ---------- home ----------
  ['Terra Hand-Glazed Stoneware Mug Set', 'Maison', 'home', 29.99, 44.99, 4.8, 512, ['best'],
    'A set of four hand-glazed stoneware mugs, each with a slightly different natural tone.',
    [['Set', '4 mugs'], ['Capacity', '350 ml'], ['Material', 'Stoneware'], ['Care', 'Dishwasher safe']],
    { colors: [['Oat', '#e2d8c4'], ['Clay', '#c98e6f'], ['Stone', '#b6b3a8']] }, 'mug', 7820, true],
  ['Brew Variable Gooseneck Kettle', 'Maison', 'home', 69.99, 95.00, 4.7, 689, ['sale'],
    'A precision pour-over kettle with variable temperature and a counterbalanced spout.',
    [['Capacity', '0.9 L'], ['Temp', '40–100°C'], ['Material', 'Stainless steel'], ['Hold', '60 min']],
    { colors: [['Matte Black', '#2c2d30'], ['Cream', '#e8e1d2']] }, 'kettle', 2410, true],
  ['Loft Ceramic Table Lamp', 'Hearth', 'home', 54.99, 79.99, 4.4, 198, ['new'],
    'A sculptural ceramic lamp with a warm linen shade and an inline dimmer.',
    [['Height', '42 cm'], ['Bulb', 'E27, dimmable'], ['Shade', 'Linen'], ['Cord', '2 m']],
    { colors: [['Chalk', '#e6e1d6'], ['Ochre', '#cb9a52']] }, 'lamp', 1340, false],
  ['Cloud Stonewashed Linen Duvet Set', 'Hearth', 'home', 129.00, 189.00, 4.6, 432, ['sale'],
    'Stonewashed French linen that gets softer with every wash. Includes two pillow shams.',
    [['Material', '100% linen'], ['Includes', 'Duvet + 2 shams'], ['Sizes', 'Queen / King'], ['Care', 'Machine wash']],
    { colors: [['Fog', '#cfcdc6'], ['Terracotta', '#c08566'], ['Olive', '#8b8d6b']], sizes: ['Queen', 'King'] }, 'duvet', 2890, true],
  ['Forge Pre-Seasoned Cast Iron Skillet', 'Maison', 'home', 34.99, 49.99, 4.9, 1820, ['best'],
    'A pre-seasoned 12-inch skillet poured from a single mold for even, lasting heat.',
    [['Size', '12 inch'], ['Material', 'Cast iron'], ['Seasoning', 'Pre-seasoned'], ['Oven', 'Up to 260°C']],
    { colors: [['Black', '#2a2a2c']] }, 'skillet', 11200, false],
  ['Nimbus Ultrasonic Aroma Diffuser', 'Hearth', 'home', 34.99, null, 4.3, 376, [],
    'An ultrasonic diffuser with a soft-glow nightlight and up to 8 hours of mist.',
    [['Capacity', '300 ml'], ['Runtime', '8 hours'], ['Light', 'Warm LED'], ['Auto-off', 'Yes']],
    { colors: [['Birch', '#dcd3c2'], ['Walnut', '#7a5a44']] }, 'diffuser', 3260, false],
  ['Serenity Bamboo Sheet Set', 'Hearth', 'home', 79.99, 119.00, 4.5, 654, ['sale'],
    'Silky, temperature-regulating bamboo-blend sheets with deep-pocket fitted corners.',
    [['Material', 'Bamboo blend'], ['Includes', 'Flat, fitted, 2 cases'], ['Thread', '400 TC'], ['Sizes', 'Queen / King']],
    { colors: [['Mist', '#cdd2cf'], ['Sand', '#ded3c0']], sizes: ['Queen', 'King'] }, 'bedding', 1980, false],

  // ---------- fashion ----------
  ['Drift Organic Canvas Sneakers', 'Wendell', 'fashion', 59.99, 84.99, 4.5, 1245, ['best'],
    'A clean low-top in heavyweight organic canvas on a natural gum sole.',
    [['Upper', 'Organic canvas'], ['Sole', 'Natural gum'], ['Fit', 'True to size'], ['Made in', 'Portugal']],
    { colors: [['Bone', '#e3ddd0'], ['Navy', '#2c3647'], ['Olive', '#6f7355']], sizes: ['6', '7', '8', '9', '10', '11', '12'] }, 'sneakers2', 9240, false],
  ['Heritage Full-Grain Leather Backpack', 'Wendell', 'fashion', 139.00, 179.00, 4.7, 534, ['sale'],
    'Full-grain leather daypack with a padded 15-inch laptop sleeve and solid brass hardware.',
    [['Material', 'Full-grain leather'], ['Laptop', 'Fits 15"'], ['Volume', '18 L'], ['Hardware', 'Solid brass']],
    { colors: [['Cognac', '#9b6438'], ['Black', '#2a2724']] }, 'leatherbag', 1670, true],
  ['Cloudstep Everyday Running Shoes', 'Stride', 'fashion', 89.99, 119.99, 4.6, 2098, ['best'],
    'Energy-return foam and a breathable knit upper built for everyday miles.',
    [['Drop', '8 mm'], ['Weight', '232 g'], ['Upper', 'Engineered knit'], ['Use', 'Road / daily']],
    { colors: [['Storm', '#5b6472'], ['Volt', '#c5d65a'], ['Black', '#2a2c30']], sizes: ['7', '8', '9', '10', '11', '12'] }, 'runshoes', 13400, false],
  ['Apex Court Retro Sneakers', 'Stride', 'fashion', 74.99, 99.99, 4.4, 876, ['new'],
    'A heritage court silhouette in soft leather with a cushioned, everyday-ready sole.',
    [['Upper', 'Leather'], ['Sole', 'Rubber cup'], ['Fit', 'True to size'], ['Style', 'Retro court']],
    { colors: [['Red', '#b23b32'], ['White', '#e9e6df']], sizes: ['7', '8', '9', '10', '11', '12'] }, 'sneakers', 2360, false],
  ['Atlas Italian Wool Overcoat', 'Norden', 'fashion', 199.00, 289.00, 4.4, 156, ['sale'],
    'A tailored topcoat in Italian wool-blend melton with a half-canvas front.',
    [['Material', '80% wool blend'], ['Lining', 'Cupro'], ['Fit', 'Tailored'], ['Care', 'Dry clean']],
    { colors: [['Camel', '#b18a5c'], ['Charcoal', '#3c3e42'], ['Navy', '#2b3344']], sizes: ['S', 'M', 'L', 'XL'] }, 'overcoat', 740, true],
  ['Wander Lightweight Down Jacket', 'Norden', 'fashion', 119.00, 169.00, 4.6, 1120, ['sale'],
    'A packable 700-fill down jacket that stuffs into its own pocket. Warm without the bulk.',
    [['Fill', '700-fill down'], ['Weight', '320 g'], ['Packs', 'Into pocket'], ['Water', 'DWR finish']],
    { colors: [['Rust', '#b15a37'], ['Black', '#2a2724'], ['Pine', '#3f5a4a']], sizes: ['S', 'M', 'L', 'XL'] }, 'coat', 3180, false],
  ['Solstice Polarized Sunglasses', 'Norden', 'fashion', 69.99, 99.00, 4.2, 421, ['new'],
    'Hand-polished acetate frames with polarized, UV400 mineral-glass lenses.',
    [['Lens', 'Polarized UV400'], ['Frame', 'Italian acetate'], ['Fit', 'Medium-wide'], ['Case', 'Included']],
    { colors: [['Tortoise', '#7a5331'], ['Black', '#26262a'], ['Honey', '#caa055']] }, 'sunglasses', 2050, false],
  ['Field Automatic Watch 38mm', 'Cobalt', 'fashion', 159.00, 229.00, 4.6, 612, ['best'],
    'A clean automatic field watch with a sapphire crystal and a quick-release sailcloth strap.',
    [['Movement', 'Automatic'], ['Crystal', 'Sapphire'], ['Case', '38 mm steel'], ['Water', '100 m']],
    { colors: [['Black', '#26282c'], ['Olive', '#6a6f4f'], ['Cream', '#e3ddcd']] }, 'watch', 1430, true],

  // ---------- beauty ----------
  ['Dewy 15% Vitamin C Serum', 'Lumière', 'beauty', 24.99, 38.00, 4.7, 3201, ['best'],
    'A 15% vitamin-C serum with hyaluronic acid for visible glow in as little as two weeks.',
    [['Size', '30 ml'], ['Key actives', '15% Vit C, HA'], ['Skin', 'All types'], ['Vegan', 'Yes']],
    { colors: [['30 ml', '#e9c9a6']] }, 'serum', 18600, true],
  ['Velvet Soft-Matte Lipstick', 'Lumière', 'beauty', 17.99, 24.00, 4.5, 1450, ['sale'],
    'A weightless soft-matte lipstick that stays put for eight hours without drying lips.',
    [['Finish', 'Soft matte'], ['Wear', '8 hours'], ['Cruelty-free', 'Yes'], ['Shades', '12']],
    { colors: [['Rosewood', '#a35c54'], ['Brick', '#9a4b39'], ['Mauve', '#9c6c79'], ['Nude', '#c08e74']] }, 'lipstick', 9400, true],
  ['Glow Daily Hydrating Moisturizer', 'Lumière', 'beauty', 21.99, 32.00, 4.6, 2240, ['sale'],
    'A lightweight gel-cream with ceramides and niacinamide for all-day hydration.',
    [['Size', '50 ml'], ['Actives', 'Ceramides, niacinamide'], ['Finish', 'Dewy'], ['Fragrance', 'Free']],
    { colors: [['50 ml', '#dfe6e2']] }, 'skincare', 6120, false],
  ['Cedar & Sage Eau de Parfum', 'Aurae', 'beauty', 79.00, 110.00, 4.6, 765, [],
    'A warm woody-aromatic scent with cedar, sage and a soft amber base. Long-lasting.',
    [['Size', '50 ml'], ['Family', 'Woody aromatic'], ['Longevity', '6–8 h'], ['Notes', 'Cedar, sage, amber']],
    { colors: [['50 ml', '#c7b48c']] }, 'perfume', 1280, true],
  ['Silk Bond-Repair Hair Mask', 'Aurae', 'beauty', 19.99, 29.00, 4.4, 540, ['new'],
    'A weekly bond-repair mask with silk proteins for visibly softer, stronger hair.',
    [['Size', '200 ml'], ['Use', 'Weekly'], ['For', 'Damaged hair'], ['Sulfate-free', 'Yes']],
    { colors: [['200 ml', '#dcc8b4']] }, 'hair', 2870, false],

  // ---------- sports ----------
  ['Summit 32oz Insulated Steel Bottle', 'Trailhead', 'sports', 26.99, 39.99, 4.8, 2890, ['best'],
    'Double-wall steel that keeps drinks cold for 24 hours and hot for 12. Leakproof lid.',
    [['Capacity', '32 oz'], ['Insulation', 'Double-wall'], ['Cold', '24 hours'], ['Lid', 'Leakproof']],
    { colors: [['Pine', '#3f5a4a'], ['Sandstone', '#c79a6e'], ['Slate', '#5a5f66'], ['Berry', '#8a3f56']] }, 'bottle2', 16800, true],
  ['Trail Daily 24oz Water Bottle', 'Trailhead', 'sports', 18.99, 27.99, 4.5, 1640, ['sale'],
    'A grab-and-go insulated bottle with a one-hand flip-top lid and a no-sweat finish.',
    [['Capacity', '24 oz'], ['Insulation', 'Double-wall'], ['Lid', 'Flip-top'], ['Fits', 'Cup holders']],
    { colors: [['White', '#e9e6df'], ['Sky', '#7fa8c9'], ['Clay', '#c98e6f']] }, 'bottle', 5210, false],
  ['Flow Natural Cork Yoga Mat', 'Trailhead', 'sports', 54.99, 79.99, 4.6, 712, ['sale'],
    'A natural cork-and-rubber mat that grips better the more you sweat. 4mm cushioning.',
    [['Thickness', '4 mm'], ['Surface', 'Cork'], ['Base', 'Natural rubber'], ['Length', '183 cm']],
    { colors: [['Cork', '#c79766']] }, 'yogamat', 3940, false],
  ['Voyager 40L Carry-On Travel Backpack', 'Trailhead', 'sports', 109.00, 149.00, 4.7, 389, ['best'],
    'A carry-on pack that opens flat like a suitcase, with a hideaway harness and 16" sleeve.',
    [['Volume', '40 L'], ['Carry-on', 'Yes'], ['Laptop', 'Fits 16"'], ['Material', 'Recycled 600D']],
    { colors: [['Black', '#2a2c30'], ['Moss', '#5f6a4d'], ['Clay', '#9c6a4f']] }, 'backpack', 2140, true],
  ['Ridgeline 2-Person 3-Season Tent', 'Basecamp', 'sports', 179.00, 249.00, 4.5, 245, ['sale'],
    'A freestanding three-season tent for two that packs under 2 kg. Two doors, two vestibules.',
    [['Capacity', '2 person'], ['Weight', '1.9 kg'], ['Season', '3-season'], ['Doors', '2 + 2 vestibules']],
    { colors: [['Sunset', '#cf7a4a'], ['Forest', '#4f6149']] }, 'tent', 680, false],
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function tint(hue: number, i: number): string {
  return `hsl(${hue} ${24 - (i % 3) * 5}% ${91 - (i % 4) * 3}%)`;
}

/** The image slug for a product, used to build `/api/images/<key>` URLs. */
const imageKeys = new Map<string, string>();

/**
 * Build the public image URLs for a product. They point at THIS backend's
 * image route so the client never sees the upstream CDN. Five "angles" reuse
 * the same photo with different crop variants, mirroring the prototype.
 */
function imageUrls(key: string): string[] {
  return [0, 1, 2, 3, 4].map((v) => `/api/images/${key}?w=800&v=${v}`);
}

export const products: Product[] = RAW.map((r, i) => {
  const [title, brand, category, price, compareAt, rating, reviews, badges, description, specs, opts, img, sold, mall] = r;
  const cat = categories.find((c) => c.slug === category)!;
  const id = 'p' + (1000 + i);
  imageKeys.set(id, img);
  return {
    id,
    slug: slugify(title),
    title, brand, category, price, compareAt, rating, reviews,
    badges: badges || [],
    description, specs,
    colors: opts.colors || null,
    sizes: opts.sizes || null,
    images: imageUrls(img),
    sold: sold || 0,
    mall: !!mall,
    freeShip: price >= 25,
    stock: 5 + ((i * 7) % 45),
    tint: tint(cat.hue, i),
    sku: 'NW-' + (4200 + i),
  };
});

const productsById = new Map(products.map((p) => [p.id, p]));

export function getProduct(id: string): Product | undefined {
  return productsById.get(id);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

/** The image key for a product id (for the image route's neighbour lookups). */
export function imageKeyForProduct(id: string): string | undefined {
  return imageKeys.get(id);
}

/** Shared review copy, reused per product with a fixed distribution. */
const reviewPool: Array<[string, number, string, string, boolean]> = [
  ['Maya R.', 5, 'Exactly as described', 'Genuinely impressed with the build quality — feels far above the price. Shipping was quick too.', true],
  ['Daniel K.', 5, 'Would buy again', "Second one I've ordered. Consistent quality and the packaging is lovely. Highly recommend.", true],
  ['Priya S.', 4, 'Great, with a small note', 'Love it overall. Took one star off only because the colour is a touch lighter than the photos.', true],
  ['Tom B.', 5, 'Better than expected', 'Was skeptical but this exceeded expectations. Using it daily and it has held up perfectly.', true],
  ['Lena M.', 4, 'Solid value', 'Does everything I needed. Setup was painless and support answered within the hour.', false],
  ['Arman F.', 3, 'Good but slow shipping', 'The product is fine and works as described — only gripe was delivery took longer than the estimate.', true],
];

const reviewDates = ['2 weeks ago', '1 month ago', '1 month ago', '2 months ago', '3 months ago', '3 months ago'];

export function getReviews(): Review[] {
  return reviewPool.map((rv, i) => ({
    name: rv[0], rating: rv[1], title: rv[2], body: rv[3], verified: rv[4], date: reviewDates[i],
  }));
}

export const ratingDistribution: [number, number, number, number, number] = [68, 21, 7, 3, 1];

/** Demo "returning user" history orders (visible once Alex signs in). */
export const demoHistoryOrders = [
  { id: 'NW-10510', date: 'Jun 6, 2026', status: 'processing' as const, statusLabel: 'To ship',
    total: 174.98, items: [{ productId: 'p1000', qty: 1, opt: 'Midnight' }, { productId: 'p1027', qty: 1, opt: 'Rosewood' }],
    eta: 'Arrives Jun 11 – Jun 13',
    track: [
      { t: 'Order placed', d: 'Jun 6, 9:24 AM', state: 'done' as const },
      { t: 'Payment confirmed', d: 'Jun 6, 9:25 AM', state: 'done' as const },
      { t: 'Seller is preparing your order', d: 'Estimated Jun 8', state: 'current' as const },
      { t: 'Handed to courier', d: 'Estimated Jun 9', state: 'pending' as const },
      { t: 'Out for delivery', d: 'Estimated Jun 12', state: 'pending' as const },
      { t: 'Delivered', d: 'Estimated Jun 12', state: 'pending' as const }] },
  { id: 'NW-10498', date: 'Jun 4, 2026', status: 'transit' as const, statusLabel: 'Out for delivery',
    total: 86.98, items: [{ productId: 'p1018', qty: 1, opt: 'Bone · 9' }, { productId: 'p1032', qty: 1, opt: 'Pine' }],
    eta: 'Arriving today by 9 PM',
    track: [
      { t: 'Order placed', d: 'Jun 4, 2:10 PM', state: 'done' as const },
      { t: 'Payment confirmed', d: 'Jun 4, 2:11 PM', state: 'done' as const },
      { t: 'Shipped from warehouse', d: 'Jun 5, 6:40 AM', state: 'done' as const },
      { t: 'Arrived at local facility', d: 'Jun 8, 5:15 AM', state: 'done' as const },
      { t: 'Out for delivery', d: 'Jun 8, 7:50 AM', state: 'current' as const },
      { t: 'Delivered', d: 'Today by 9 PM', state: 'pending' as const }] },
  { id: 'NW-10472', date: 'May 28, 2026', status: 'delivered' as const, statusLabel: 'Completed',
    total: 60.98, items: [{ productId: 'p1026', qty: 2, opt: 'Brick' }, { productId: 'p1006', qty: 1, opt: 'White' }],
    eta: 'Delivered May 31',
    track: [
      { t: 'Order placed', d: 'May 28, 11:02 AM', state: 'done' as const },
      { t: 'Shipped', d: 'May 29, 8:00 AM', state: 'done' as const },
      { t: 'Out for delivery', d: 'May 31, 8:20 AM', state: 'done' as const },
      { t: 'Delivered', d: 'May 31, 1:46 PM — Front desk', state: 'done' as const }] },
  { id: 'NW-10455', date: 'May 19, 2026', status: 'delivered' as const, statusLabel: 'Completed',
    total: 34.99, items: [{ productId: 'p1015', qty: 1, opt: 'Black' }],
    eta: 'Delivered May 22',
    track: [
      { t: 'Order placed', d: 'May 19, 4:30 PM', state: 'done' as const },
      { t: 'Shipped', d: 'May 20, 9:10 AM', state: 'done' as const },
      { t: 'Delivered', d: 'May 22, 12:05 PM', state: 'done' as const }] },
];

/** The demo "returning user" (Alex Morgan) — full history, saved addresses/cards. */
export const demoUser = {
  id: 'u_alex',
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  initials: 'AM',
  since: 'March 2024',
  orders: 14,
  addresses: [
    { id: 'a1', label: 'Home', name: 'Alex Morgan', line: '1820 Maple Court, Apt 4B', city: 'Portland, OR 97204', country: 'United States', phone: '+1 (503) 555-0142', default: true },
    { id: 'a2', label: 'Office', name: 'Alex Morgan', line: '55 Industrial Way, Suite 300', city: 'Portland, OR 97209', country: 'United States', phone: '+1 (503) 555-0188', default: false }],
  cards: [
    { id: 'c1', brand: 'VISA', last4: '4242', exp: '08 / 28', name: 'Alex Morgan', default: true },
    { id: 'c2', brand: 'MC', last4: '5588', exp: '11 / 27', name: 'Alex Morgan', default: false }],
  isNew: false,
};
