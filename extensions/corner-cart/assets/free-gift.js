/* extensions/corner-cart/assets/free-gift.js */
(() => {
  const GIFT_VARIANT_ID = 47197887299739; // 🎁 replace with your actual gift variant ID
  const MIN_SUBTOTAL_FOR_GIFT = 0; // 💰 set threshold in ₹ if needed (e.g., 1250)

  // Prevent double initialization
  if (window.__freeGiftInit) return;
  window.__freeGiftInit = true;

  let giftAddedOnce = false;

  async function getCart() {
    const r = await fetch("/cart.js");
    return r.json();
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
    const cart = existingCart || (await getCart());
    const giftLines = cart.items.filter(
      (i) => i.variant_id === GIFT_VARIANT_ID && i.properties?.isFreeGift === "true"
    );
    const hasGift = giftLines.length > 0;

    const hasProducts = cart.items.some((i) => i.variant_id !== GIFT_VARIANT_ID);
    const subtotal =
      cart.items
        .filter((i) => i.variant_id !== GIFT_VARIANT_ID)
        .reduce((acc, i) => acc + i.final_line_price, 0) / 100;

    const shouldHaveGift = hasProducts && subtotal >= MIN_SUBTOTAL_FOR_GIFT;

    // ✅ Add only if needed and not yet added
    if (shouldHaveGift && !hasGift && !giftAddedOnce) {
      console.log("🎁 Adding free gift…");
      await addToCart(GIFT_VARIANT_ID, 1);
      giftAddedOnce = true;
      document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
      return;
    }

    // ✅ Remove if not needed
    if ((!shouldHaveGift && hasGift) || (!hasProducts && hasGift)) {
      console.log("🧹 Removing free gift…");
      for (const g of giftLines) {
        await removeByKey(g.key);
      }
      giftAddedOnce = false;
      document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
    }
  }

  window.ensureFreeGift = ensureFreeGift;

  // Hook fetch
  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await _fetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    if (/\/cart\/(add|change|update|clear)\.js/.test(url)) {
      setTimeout(() => ensureFreeGift(), 600);
    }
    return res;
  };

  // Hook XHR
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => {
      if (typeof url === "string" && /\/cart\/(add|change|update|clear)\.js/.test(url)) {
        setTimeout(() => ensureFreeGift(), 600);
      }
    });
    return _open.call(this, method, url, ...rest);
  };

  // Hook form submits
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

  // Initial sync
  ensureFreeGift();
  console.log("🎁 Free gift script loaded — single-run safe mode");
})();
