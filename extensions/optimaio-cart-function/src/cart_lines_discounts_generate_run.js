import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

/**
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} Result
 */

export function cartLinesDiscountsGenerateRun(input) {
  // ✅ Defensive normalization
  input.cart.lines.forEach((line) => {
    if (!line.attributes && line.attribute) {
      line.attributes = [line.attribute];
    }
  });

  if (!input.cart.lines.length) return { operations: [] };

  const hasOrder = input.discount.discountClasses.includes(DiscountClass.Order);
  const hasProduct = input.discount.discountClasses.includes(DiscountClass.Product);

  const ops = [];

  /* =========================================================
     🟢 OLD FUNCTIONALITY — tier-based discounts
     ========================================================= */
  let tiers = [];
  try {
    const parsed = JSON.parse(input.shop?.metafield?.value || "{}");
    tiers = parsed.tiers || [];
  } catch {}

  if (tiers.length) {
    const totalQty = input.cart.lines.reduce((s, l) => s + (l.quantity ?? 1), 0);
    const applied = tiers.reduce((best, t) => (totalQty >= t.minQty ? t : best), null);

    if (applied) {
      // --- 1A. Percentage discount ---
      if (applied.reward === "percentage" && hasOrder) {
        const pct = parseFloat(applied.value);
        if (!isNaN(pct)) {
          ops.push({
            orderDiscountsAdd: {
              candidates: [
                {
                  message: `${pct}% OFF`,
                  targets: [{ orderSubtotal: { excludedCartLineIds: [] } }],
                  value: { percentage: { value: pct } },
                },
              ],
              selectionStrategy: OrderDiscountSelectionStrategy.First,
            },
          });
        }
      }

      // --- 1B. Free product variant ---
      if (applied.reward === "free_product" && hasProduct) {
        const variantId = applied.value;
        const giftLine = input.cart.lines.find(
          (line) =>
            line.merchandise.__typename === "ProductVariant" &&
            line.merchandise.id === variantId
        );
        if (giftLine) {
          ops.push({
            productDiscountsAdd: {
              candidates: [
                {
                  message: "Free Gift!",
                  targets: [{ cartLine: { id: giftLine.id } }],
                  value: { percentage: { value: 100 } },
                },
              ],
              selectionStrategy: ProductDiscountSelectionStrategy.First,
            },
          });
        }
      }
    }
  }

  /* =========================================================
     🟣 NEW FUNCTIONALITY — campaign-based discounts
     ========================================================= */
  const campaignData = JSON.parse(input.shop?.metafield?.value || "{}");
  const campaigns = (campaignData.campaigns || []).filter((c) => c.status === "active");
  if (campaigns.length) {
    const freeProductIds = campaigns
      .flatMap((c) => c.goals || [])
      .filter((g) => g.type === "free_product")
      .flatMap((g) => (g.products || []).map((p) => p.id));

    const totalQty = input.cart.lines.reduce((sum, line) => {
      const isGift = line.attributes?.some(
        (a) =>
          (a.key === "_isFreeGift" && a.value === "true") ||
          (a.key === "isFreeGift" && a.value === "true")
      );
      return isGift ? sum : sum + (line.quantity ?? 1);
    }, 0);

    // --- 2A. Order discounts ---
    campaigns.forEach((campaign) => {
      const { trackType, campaignName, goals } = campaign;
      if (!goals?.length || trackType !== "quantity") return;

      if (hasOrder) {
        const orderGoals = goals.filter((g) => g.type === "order_discount");
        const eligible = orderGoals.filter((g) => totalQty >= g.target);
        if (eligible.length) {
          const best = eligible.reduce((max, g) =>
            parseFloat(g.target) > parseFloat(max.target) ? g : max
          );
          const pct = parseFloat(best.discountValue);
          ops.push({
            orderDiscountsAdd: {
              candidates: [
                {
                  message: `${pct}% OFF – ${campaignName}`,
                  targets: [{ orderSubtotal: { excludedCartLineIds: [] } }],
                  value: { percentage: { value: pct } },
                },
              ],
              selectionStrategy: OrderDiscountSelectionStrategy.First,
            },
          });
        }
      }

      // --- 2B. Campaign free-product gifts ---
      if (hasProduct) {
        const giftGoals = goals.filter((g) => g.type === "free_product");
        const freeGiftCandidates = [];

        giftGoals.forEach((goal) => {
          if (totalQty < goal.target) return;

          (goal.products || []).forEach((product) => {
            const giftLine = input.cart.lines.find(
              (l) =>
                l.merchandise?.__typename === "ProductVariant" &&
                l.merchandise.id === product.id &&
                l.attributes?.some(
                  (a) =>
                    (a.key === "_isFreeGift" && a.value === "true") ||
                    (a.key === "isFreeGift" && a.value === "true")
                )
            );

            if (giftLine) {
              freeGiftCandidates.push({
                message: `Free Gift – ${
                  giftLine.merchandise.title ||
                  giftLine.merchandise.product?.title ||
                  "Product"
                }`,
                targets: [{ cartLine: { id: giftLine.id } }],
                value: { percentage: { value: 100 } },
              });
            }
          });
        });

        if (freeGiftCandidates.length) {
          ops.push({
            productDiscountsAdd: {
              candidates: freeGiftCandidates,
              selectionStrategy: ProductDiscountSelectionStrategy.All,
            },
          });
        }
      }
    });

    /* --- 2C. Fallback: apply 100% off only if goal target is met --- */
    const allFreeGiftLines = input.cart.lines.filter((line) =>
      line.attributes?.some(
        (a) =>
          (a.key === "_isFreeGift" && a.value === "true") ||
          (a.key === "isFreeGift" && a.value === "true")
      )
    );

    if (allFreeGiftLines.length) {
      // Find highest target among all active free_product goals
      const goalTargets = campaigns
        .flatMap((c) => c.goals || [])
        .filter((g) => g.type === "free_product")
        .map((g) => parseInt(g.target ?? 0, 10));

      const minGoalTarget = goalTargets.length
        ? Math.min(...goalTargets)
        : 0;

      // ✅ Apply only if quantity meets goal target
      if (totalQty >= minGoalTarget) {
        ops.push({
          productDiscountsAdd: {
            candidates: allFreeGiftLines.map((line) => ({
              message: `Free Gift – ${
                line.merchandise.title ||
                line.merchandise.product?.title ||
                "Product"
              }`,
              targets: [{ cartLine: { id: line.id } }],
              value: { percentage: { value: 100 } },
            })),
            selectionStrategy: ProductDiscountSelectionStrategy.All,
          },
        });
      }
    }
  }

  /* =========================================================
     ✅ Return combined operations
     ========================================================= */
  return { operations: ops };
}
