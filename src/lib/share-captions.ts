export type ShareCaption = { label: string; text: string };

/** Seller-facing captions for promoting a drop before it opens. */
export function buildSellerShareCaptions(
  shopName: string,
  sellerHandle: string,
  startAt: string,
): ShareCaption[] {
  const when = new Date(startAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return [
    {
      label: "Text / post",
      text: `My pop-up shop opens ${when}. Grab the link before it sells out →`,
    },
    {
      label: "Live shopping",
      text: `Going live for ${shopName} on PopUp! Join @${sellerHandle} for flash drops and limited items.`,
    },
    {
      label: "Countdown",
      text: `⏰ ${when} — ${shopName} opens on PopUp. Open the link and join the waitlist.`,
    },
  ];
}

/** Buyer-facing caption for sharing a shop after purchase. */
export function buildBuyerShareCaption(shopName: string, sellerHandle: string): string {
  return `Just copped from ${shopName} on PopUp 🔥 Follow @${sellerHandle} for the next drop →`;
}
