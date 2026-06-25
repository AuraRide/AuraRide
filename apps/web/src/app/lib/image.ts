// image.ts — shrink captured photos before they go into localStorage.
//
// Phones produce multi-MB JPEGs; stored raw as data-URLs they blow the ~5MB
// localStorage budget fast (and then publishing — which copies photos into the
// posts store — silently fails on quota). Downscaling to a sane size keeps the
// journal + 广场 well within budget while still looking good on a phone.

export function downscaleDataUrl(dataUrl: string, maxPx = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const big = Math.max(img.width, img.height) || 1;
      const scale = Math.min(1, maxPx / big);
      // Already small enough — keep as-is.
      if (scale >= 1 && dataUrl.length < 300_000) {
        resolve(dataUrl);
        return;
      }
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(cv.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
