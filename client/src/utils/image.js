// Cloudinary delivery-time image optimization — resizes and re-encodes (WebP/AVIF)
// on the fly via URL transform params, so we don't ship a 600x600 master image
// for a 150px grid thumbnail. Falls back to the original URL for non-Cloudinary sources.

export const optimizeImage = (url, width) => {
  if (!url) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const insertAt = idx + marker.length;
  return `${url.slice(0, insertAt)}f_auto,q_auto,w_${width}/${url.slice(insertAt)}`;
};
