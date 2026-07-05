/** Local marketing demo images (served from /public/marketing/demo). */

const base = (file) => `/marketing/demo/${file}`;

export const AVATAR = base("avatar.jpg");

/** Live shop stream placeholder — pottery wheel, no YouTube embed */
export const COVER_LIVE = base("stream.jpg");

export const COVER_STUDIO = base("cover-studio.jpg");
export const COVER_SUMMER = base("cover-summer.jpg");
export const COVER_WINTER = base("cover-winter.jpg");
export const COVER_HOLIDAY = base("cover-holiday.jpg");

export const PRODUCTS = {
  mug: base("mug.jpg"),
  bowl: base("bowl.jpg"),
  vaseSet: base("vase.jpg"),
  candle: base("candle.jpg"),
  plate: base("plate.jpg"),
  ringDish: base("ring-dish.jpg"),
  planter: base("planter.jpg"),
  limitedVase: base("limited-vase.jpg"),
  ornament: base("ornaments.jpg"),
  glazeSample: base("mug.jpg"),
};
