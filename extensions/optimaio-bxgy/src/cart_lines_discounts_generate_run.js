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
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
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
    console.error("Error parsing campaign metafield JSON:", err);
  }

  const campaigns = (campaignData.campaigns || []).filter(
    (c) => c.status === "active" && c.campaignType === "bxgy"
  );

  /* =========================================================
     🟢 BXGY LOGIC
     ========================================================= */
 /* =========================================================
   🟢 BXGY LOGIC — Support free_product, percentage, fixed, and storewide
   ========================================================= */
if (campaigns.length && hasProductDiscountClass) {
  campaigns.forEach((campaign) => {
    const { campaignName, goals } = campaign;
    if (!goals?.length) return;

    goals.forEach((goal) => {
      const bxgyMode = goal.bxgyMode || "product";
      const buyQty = parseFloat(goal.buyQty || 0);
      const buyProductIds = goal.buyProducts?.map((p) => p.id) || [];
      const getProductIds = goal.getProducts?.map((p) => p.id) || [];
      const discountType = goal.discountType || "free_product";
      const discountValue = parseFloat(goal.discountValue || 0);

      let totalBuyQtyInCart = 0;

      // 🟣 Storewide (all) → count all cart items
      if (bxgyMode === "all") {
        totalBuyQtyInCart = input.cart.lines.reduce(
          (sum, line) => sum + (line.quantity ?? 1),
          0
        );
      }
      // 🟣 Product mode → count specific buy products
      else if (bxgyMode === "product") {
        totalBuyQtyInCart = input.cart.lines.reduce((sum, line) => {
          return buyProductIds.includes(line.merchandise?.id)
            ? sum + (line.quantity ?? 1)
            : sum;
        }, 0);
      }
      // 🟣 Collection mode → TODO (if collections are supported)
      else if (bxgyMode === "collection") {
        // If you map collection IDs to product IDs elsewhere, handle it here.
        totalBuyQtyInCart = 0; // placeholder
      }

      // ✅ If condition met → apply discount based on type
      if (totalBuyQtyInCart >= buyQty && getProductIds.length) {
        input.cart.lines.forEach((line) => {
          if (getProductIds.includes(line.merchandise?.id)) {
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
                return; // unknown type, skip
            }

            productDiscountCandidates.push({
              message,
              targets: [{ cartLine: { id: line.id } }],
              value: discountValueObj,
            });
          }
        });
      }
    });
  });
}



  /* =========================================================
     🟢 Example product discount (only for fallback / demo)
     ========================================================= */
  if (hasProductDiscountClass && input.cart.lines.length > 0) {
    const maxCartLine = input.cart.lines.reduce((maxLine, line) =>
      line.cost.amountPerQuantity.amount > maxLine.cost.amountPerQuantity.amount
        ? line
        : maxLine
    , input.cart.lines[0]);

    // Example: fallback discount — remove if not needed
    // productDiscountCandidates.push({
    //   message: "20% OFF PRODUCT",
    //   targets: [{ cartLine: { id: maxCartLine.id } }],
    //   value: { percentage: { value: 20 } },
    // });
  }

  /* =========================================================
     🟢 Example order discount (optional)
     ========================================================= */
  if (hasOrderDiscountClass) {
    orderDiscountCandidates.push({
      message: "10% OFF ORDER",
      targets: [{ orderSubtotal: { excludedCartLineIds: [] } }],
      value: { percentage: { value: 10 } },
    });
  }

  /* =========================================================
     ✅ Push only ONE operation per type
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
