/** Local marketing demo images (served from /public/marketing/demo). */

const base = (file: string) => `/marketing/demo/${file}`;

export const AVATAR = base("avatar.webp");

export const COVER_STUDIO = base("cover-studio.webp");
export const COVER_SUMMER = base("cover-summer.webp");
export const COVER_WINTER = base("cover-winter.webp");
export const COVER_HOLIDAY = base("cover-holiday.webp");

export const PRODUCTS = {
  mug: base("mug.webp"),
  bowl: base("bowl.webp"),
  vaseSet: base("vase.webp"),
  candle: base("candle.webp"),
  plate: base("plate.webp"),
  ringDish: base("ring-dish.webp"),
  planter: base("planter.webp"),
  limitedVase: base("limited-vase.webp"),
  ornament: base("ornaments.webp"),
  glazeSample: base("mug.webp"),
};
