import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * Main BXGY handler supporting 4 types:
 * 1. Product-based
 * 2. Collection-based
 * 3. Spend-based (collection)
 * 4. Storewide
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) throw new Error("No cart lines found");

  const hasOrderDiscountClass = input.discount.discountClasses.includes(DiscountClass.Order);
  const hasProductDiscountClass = input.discount.discountClasses.includes(DiscountClass.Product);

  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return { operations: [] };
  }

  const operations = [];
  const productDiscountCandidates = [];
  const orderDiscountCandidates = [];

  /* =========================================================
     🟣 Parse metafield campaigns
     ========================================================= */
  let campaignData = {};
  try {
    campaignData = JSON.parse(input.shop?.metafield?.value || "{}");
  } catch (err) {
    console.error("❌ Error parsing campaign metafield JSON:", err);
  }

  // Filter only active BXGY campaigns
  let campaigns = (campaignData.campaigns || []).filter(
    (c) => c.status === "active" && c.campaignType === "bxgy"
  );

  // Sort by priority (lower number = higher priority)
  campaigns.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  /* =========================================================
     🧠 BXGY Logic Core
     ========================================================= */
  if (campaigns.length && hasProductDiscountClass) {
    const discountedLineIds = new Set();
    const lockedBuyProducts = new Set();
    const lockedCollections = new Set();
    const lockedGifts = new Set();

    // Helper to match cart lines by collection
   const isInCollection = (line, collectionIds = []) => {
  if (!collectionIds?.length) return false;
  const lineCollections = line.merchandise?.product?.inCollections || [];
  return lineCollections.some(
    (c) => c.isMember && collectionIds.includes(c.collectionId)
  );
};


    campaigns.forEach((campaign) => {
      const { campaignName, goals, priority, activeDates, tzOffsetMinutes } = campaign;
      if (!goals?.length) return;

      /* =========================================================
         🕒 DATE FILTER — Only run if campaign is active today
         ========================================================= */
      const shopDateStr = input.shop?.localTime?.date; // e.g. "2025-11-11"
      const shopNow = shopDateStr ? new Date(`${shopDateStr}T00:00:00Z`) : new Date();

      // Apply campaign's timezone offset (minutes)
      const offsetMs = (tzOffsetMinutes || 0) * 60 * 1000;
      const nowLocal = new Date(shopNow.getTime() + offsetMs);

      const startDate = activeDates?.start?.date
        ? new Date(`${activeDates.start.date}T00:00:00Z`)
        : null;
      const endDate = activeDates?.hasEndDate
        ? new Date(`${activeDates.end?.date}T23:59:59Z`)
        : null;

      const startLocal = startDate ? new Date(startDate.getTime() + offsetMs) : null;
      const endLocal = endDate ? new Date(endDate.getTime() + offsetMs) : null;

      // Skip if not within active window
      if (!startLocal) return;
      if (nowLocal < startLocal) return;     // Not started yet
      if (endLocal && nowLocal > endLocal) return; // Expired

      /* =========================================================
         🧠 Continue with BXGY evaluation as before
         ========================================================= */

      goals.forEach((goal) => {
        const bxgyMode = goal.bxgyMode || "product";
        const buyQty = parseFloat(goal.buyQty || 0);
        const buyProductIds = goal.buyProducts?.map((p) => p.id) || [];
        const buyCollectionIds = goal.buyCollections?.map((c) => c.id) || [];
        const getProductIds = goal.getProducts?.map((p) => p.id) || [];
        const discountType = goal.discountType || "free_product";
        const discountValue = parseFloat(goal.discountValue || 0);
        const getQtyLimit = parseInt(goal.getQty || 1, 10);
        const spendAmount = parseFloat(goal.spendAmount || 0);

        console.log(`⚙️ Evaluating campaign '${campaignName}' (active today)`);


        let conditionMet = false;

        /* =========================================================
           🟢 Evaluate Condition by BXGY Type
           ========================================================= */
        switch (bxgyMode) {
          case "product": {
            const productQtyMap = {};
            input.cart.lines.forEach((line) => {
              const pid = line.merchandise?.id;
              if (!pid) return;
              productQtyMap[pid] = (productQtyMap[pid] || 0) + (line.quantity ?? 1);
            });
            conditionMet = buyProductIds.every(
              (pid) => (productQtyMap[pid] || 0) >= buyQty
            );
            break;
          }

          case "collection": {
            let totalQtyInCollection = 0;
            input.cart.lines.forEach((line) => {
              if (isInCollection(line, buyCollectionIds)) {
                totalQtyInCollection += line.quantity ?? 1;
              }
            });
            conditionMet = totalQtyInCollection >= buyQty;
            break;
          }

         case "spend_any_collection": {
  let totalSpend = 0;
  input.cart.lines.forEach((line) => {
    // ✅ count spend only from products that belong to this campaign’s collections
    if (isInCollection(line, buyCollectionIds)) {
      totalSpend +=
        parseFloat(line.cost.amountPerQuantity.amount) * (line.quantity ?? 1);
    }
  });
  console.log(
    `💰 Spend check (${campaignName}): need ₹${spendAmount}, got ₹${totalSpend}`
  );
  conditionMet = totalSpend >= spendAmount;
  break;
}


    case "all":
case "storewide": {
  // Collect all potential Y gift IDs from active BXGY campaigns
  const allGiftIds = campaigns.flatMap((c) =>
    (c.goals || []).flatMap((g) => g.getProducts?.map((p) => p.id) || [])
  );

  // 🧮 Count only *real* purchased items (exclude gifts, zero cost, or invalid lines)
  const totalQty = input.cart.lines.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const pid = line.merchandise?.id || "";
    const price = parseFloat(line.cost?.amountPerQuantity?.amount || "0");

    // Skip invalid, zero-cost, or already gift items
    if (qty <= 0) return sum;
    if (price === 0) return sum;
    if (allGiftIds.includes(pid)) return sum;
    if (/gift|free/i.test(line.merchandise?.title || "")) return sum;

    return sum + qty;
  }, 0);

  conditionMet = totalQty >= buyQty;
  console.log(`🧮 Storewide check: need ${buyQty}, have ${totalQty} → ${conditionMet}`);
  
  break;
}



          default:
            conditionMet = false;
        }

        /* =========================================================
           ✅ If Condition Met — Apply Discount
           ========================================================= */
        if (conditionMet && getProductIds.length > 0) {
          console.log(`✅ Campaign Passed: ${campaignName} (Priority: ${priority})`);

          // 🔒 Lock buys/collections so lower-priority cannot reuse
          buyProductIds.forEach((pid) => lockedBuyProducts.add(pid));
          buyCollectionIds.forEach((cid) => lockedCollections.add(cid));

          let discountedCount = 0;

          for (const line of input.cart.lines) {
            const pid = line.merchandise?.id;

              const isGift =
    line.attribute?.key === "isBXGYGift" && line.attribute?.value === "true";

            if (
              getProductIds.includes(pid) &&
              isGift && 
              !lockedGifts.has(pid) &&
              discountedCount < getQtyLimit &&
              !discountedLineIds.has(line.id)
            ) {
              let discountValueObj = null;
              let message = "";

              switch (discountType) {
                case "free_product":
                  discountValueObj = { percentage: { value: 100 } };
                  message = `🎁 Free Gift – ${campaignName}`;
                  break;
                case "percentage":
                  discountValueObj = { percentage: { value: discountValue } };
                  message = `${discountValue}% off – ${campaignName}`;
                  break;
                case "fixed":
                  discountValueObj = { fixedAmount: { amount: discountValue } };
                  message = `₹${discountValue} off – ${campaignName}`;
                  break;
                default:
                  continue;
              }

              productDiscountCandidates.push({
                message,
                targets: [{ cartLine: { id: line.id } }],
                value: discountValueObj,
              });

              discountedLineIds.add(line.id);
              lockedGifts.add(pid);
              discountedCount++;
            }
          }
        } else {
          console.log(`❌ Campaign failed condition: ${campaignName}`);
        }
      });
    });
  }

  
  /* =========================================================
     🟢 Order discount (optional demo)
     ========================================================= */
  if (hasOrderDiscountClass) {
    orderDiscountCandidates.push({
      message: "10% OFF ORDER",
      targets: [{ orderSubtotal: { excludedCartLineIds: [] } }],
      value: { percentage: { value: 10 } },
    });
  }

  /* =========================================================
     ✅ Push final operations
     ========================================================= */
  if (orderDiscountCandidates.length) {
    operations.push({
      orderDiscountsAdd: {
        candidates: orderDiscountCandidates,
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  }

  if (productDiscountCandidates.length) {
    operations.push({
      productDiscountsAdd: {
        candidates: productDiscountCandidates,
        selectionStrategy: ProductDiscountSelectionStrategy.All,
      },
    });
  }

  return { operations };
}
