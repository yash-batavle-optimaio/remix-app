(() => {
  const METAFIELD_ENDPOINT = "/apps/optimaio/cart-campaigns"; // Your proxy or custom endpoint

  if (window.__freeGiftInit) return;
  window.__freeGiftInit = true;

  let giftAddedOnce = false;

  async function getCart() {
    const r = await fetch("/cart.js");
    return r.json();
  }

  async function getCampaigns() {
    try {
      const res = await fetch(METAFIELD_ENDPOINT);
      const data = await res.json();
      return (data.campaigns || []).filter((c) => c.status === "active");
    } catch (e) {
      console.warn("⚠️ Could not fetch campaigns metafield", e);
      return [];
    }
  }

  async function addToCart(id, quantity = 1) {
    await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        quantity,
        properties: { isFreeGift: "true" },
      }),
    });
  }

  async function removeByKey(key) {
    await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: key, quantity: 0 }),
    });
  }

  async function ensureFreeGift(existingCart = null) {
    const [cart, campaigns] = await Promise.all([getCart(), getCampaigns()]);
    if (!campaigns.length) return;

    // collect all free_product goals
    const freeGoals = campaigns
      .flatMap((c) => c.goals || [])
      .filter((g) => g.type === "free_product");

    if (!freeGoals.length) return;

    // --- Compute cart totals (excluding existing gifts)
    const subtotal =
      cart.items
        .filter((i) => !i.properties?.isFreeGift)
        .reduce((acc, i) => acc + i.final_line_price, 0) / 100;
    const totalQty = cart.items
      .filter((i) => !i.properties?.isFreeGift)
      .reduce((sum, i) => sum + i.quantity, 0);

    for (const goal of freeGoals) {
      const meetsTarget =
        (goal.trackType === "quantity" && totalQty >= goal.target) ||
        (goal.trackType === "subtotal" && subtotal >= goal.target);

      const productIds =
        (goal.products || []).map((p) =>
          parseInt(p.id.split("/").pop(), 10)
        );

      const giftLines = cart.items.filter(
        (i) =>
          productIds.includes(i.variant_id) &&
          i.properties?.isFreeGift === "true"
      );

      const hasGift = giftLines.length > 0;

      // ✅ Add if meets target but not yet in cart
      if (meetsTarget && !hasGift && !giftAddedOnce) {
        console.log("🎁 Adding free gift dynamically…");
        await addToCart(productIds[0], 1);
        giftAddedOnce = true;
        document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
      }

      // 🧹 Remove if below target
      if (!meetsTarget && hasGift) {
        console.log("🧹 Removing free gift (target not met)…");
        for (const g of giftLines) await removeByKey(g.key);
        giftAddedOnce = false;
        document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
      }
    }
  }

  // Patch fetch
  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await _fetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    if (/\/cart\/(add|change|update|clear)\.js/.test(url)) {
      setTimeout(() => ensureFreeGift(), 600);
    }
    return res;
  };

  // Patch XHR
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => {
      if (typeof url === "string" && /\/cart\/(add|change|update|clear)\.js/.test(url)) {
        setTimeout(() => ensureFreeGift(), 600);
      }
    });
    return _open.call(this, method, url, ...rest);
  };

  // Patch form submits
  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (form && form.action && form.action.includes("/cart/add")) {
        setTimeout(() => ensureFreeGift(), 1200);
      }
    },
    true
  );

  // Initial run
  ensureFreeGift();
  console.log("🎁 Dynamic Free Gift script loaded");
})();
