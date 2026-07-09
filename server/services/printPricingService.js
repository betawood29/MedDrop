// Print pricing — shared page/price computation for print orders.
// Mirrors the pricing math in models/PrintOrder.js's pre-save hook, but works from just
// page/copies/colorMode/sides metadata — no uploaded file needed — so the price (and
// therefore the combined Razorpay charge) can be computed at payment-initiation time,
// before any file has been uploaded.

const computePrintSubtotal = (fileConfigs) => {
  let subtotal = 0;
  let totalPages = 0;

  for (const cfg of fileConfigs || []) {
    const pages = Math.max(1, parseInt(cfg.pages) || 1);
    const copies = Math.min(50, Math.max(1, parseInt(cfg.copies) || 1));
    const colorMode = ['bw', 'color'].includes(cfg.colorMode) ? cfg.colorMode : 'bw';
    const sides = ['single', 'double'].includes(cfg.sides) ? cfg.sides : 'single';
    const basePrice = colorMode === 'color' ? 5 : 2;
    const sideMultiplier = sides === 'double' ? 0.75 : 1;
    const ppp = basePrice * sideMultiplier;
    subtotal += Math.round(pages * copies * ppp);
    totalPages += pages * copies;
  }

  return { subtotal, totalPages };
};

module.exports = { computePrintSubtotal };
