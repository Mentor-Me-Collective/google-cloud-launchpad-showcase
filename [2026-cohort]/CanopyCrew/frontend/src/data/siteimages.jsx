const siteImages = [
  // Index 0: Sidewalk
  "https://images.unsplash.com/photo-1780311933665-8d3e4e6a31e4?auto=format&fit=crop&w=1500&q=85",

  // Index 1: Sunny lot
  "https://images.unsplash.com/photo-1756192727102-91cc51abd12c?auto=format&fit=crop&w=1500&q=85",

  // Index 2: Shaded courtyard
  "https://images.unsplash.com/photo-1524608167924-8305dd66256b?auto=format&fit=crop&w=1500&q=85",
];

export const siteImagesById = {
  "site-a-sidewalk-strip": siteImages[0],
  "site-b-sunny-lot": siteImages[1],
  "site-c-shaded-courtyard": siteImages[2],
};

export function getSiteImage(site, index = 0) {
  const siteId = site?.site_id || "";
  if (siteImagesById[siteId]) {
    return siteImagesById[siteId];
  }
  if (siteId.includes("sidewalk")) return siteImages[0];
  if (siteId.includes("sunny")) return siteImages[1];
  if (siteId.includes("shaded") || siteId.includes("courtyard")) {
    return siteImages[2];
  }
  return siteImages[index % siteImages.length];
}

export default siteImages;
