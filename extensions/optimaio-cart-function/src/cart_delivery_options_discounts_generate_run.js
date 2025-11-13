/**
 * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} Result
 */
export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  if (!input.cart?.lines?.length) return { operations: [] };

  // 🧩 Parse campaigns metafield
  const campaignsData = JSON.parse(input.shop?.metafield?.value || "{}");
  const campaigns = campaignsData.campaigns || [];

  // ✅ Filter only active campaigns
let activeCampaigns = campaigns.filter((c) => c.status === "active");

  // ✅ Priority logic: sort by priority (lowest = highest priority) and take top one
  if (activeCampaigns.length > 1) {
    activeCampaigns = activeCampaigns
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
      .slice(0, 1);
  }

  if (!activeCampaigns.length) return { operations: [] };

  // 🧮 Calculate total quantity in cart
  const totalQty =
    input.cart.lines?.reduce((sum, l) => sum + (l.quantity ?? 1), 0) ?? 0;

  const ops = [];

  // Loop through active campaigns
  activeCampaigns.forEach((campaign) => {
  const { trackType, goals, activeDates, tzOffsetMinutes } = campaign;
    if (!goals?.length) return;

    /* =========================================================
       🕒 DATE FILTER (Same as product/order discount logic)
       ========================================================= */
    const now = new Date(input.shop?.localTime?.date || new Date());

    // Adjust for store timezone (in minutes)
    const offsetMs = (tzOffsetMinutes || 0) * 60 * 1000;
    const nowLocal = new Date(now.getTime() + offsetMs);

    const startDate = activeDates?.start?.date
      ? new Date(activeDates.start.date)
      : null;
    const endDate = activeDates?.hasEndDate
      ? new Date(activeDates.end?.date)
      : null;

    if (!startDate) return; // no start date defined
    if (nowLocal < startDate) return; // not started yet
    if (endDate && nowLocal > endDate) return; // expired


    // ✅ For now only trackType = "quantity"
    if (trackType !== "quantity") return;

    // Find all free shipping goals whose target is met
    const eligibleShippingGoals = goals.filter(
      (g) => g.type === "free_shipping" && totalQty >= (g.target ?? 0)
    );

    // 🟢 Pick the highest target (most advanced tier)
    const bestGoal = eligibleShippingGoals.sort(
      (a, b) => b.target - a.target
    )[0];

    if (bestGoal) {
      ops.push({
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: "Free Shipping",
              targets: input.cart.deliveryGroups.map((g) => ({
                deliveryGroup: { id: g.id },
              })),
              value: { percentage: { value: 100 } },
            },
          ],
          selectionStrategy: "ALL",
        },
      });
    }
  });

  // 🏁 Return operations
  return { operations: ops };
}
