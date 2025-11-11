(() => {
  if (window.__bxgyInit) return;
  window.__bxgyInit = true;

  console.log("🧮 Optimaio BXGY script initializing (optimized + 1-min cache)…");

  // ----------------------------
  // 🔒 STATE & HELPERS
  // ----------------------------
  let cartCache = null;
  let cartCacheTime = 0;
  const CART_TTL = 500; // ms cache for cart
  window.__isBXGYInProgress = false;
  let debounceTimer = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const WAIT =
    navigator.connection?.effectiveType?.includes("2g") ||
    navigator.connection?.rtt > 600
      ? 200
      : 80;

  // ----------------------------
  // ⏱️ SIMPLE TIMING LOGGER
  // ----------------------------
  let timings = [];
  function logTiming(name, duration) {
    timings.push(duration);
    const avg = (
      timings.reduce((a, b) => a + b, 0) / timings.length
    ).toFixed(1);
    console.log(`⏱️ ${name} took ${duration.toFixed(1)} ms (avg ${avg} ms)`);
  }

  // ----------------------------
  // 🛒 CART HELPERS (timed)
  // ----------------------------
  async function getCart(force = false) {
    const now = Date.now();
    if (!force && cartCache && now - cartCacheTime < CART_TTL) return cartCache;

    const start = performance.now();
    const res = await fetch("/cart.js", { cache: "no-store" });
    const end = performance.now();
    logTiming("/cart.js", end - start);

    cartCache = await res.json();
    cartCacheTime = now;
    return cartCache;
  }

  async function cartChange(action, payload) {
    const start = performance.now();
    await fetch(`/cart/${action}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const end = performance.now();
    logTiming(`/cart/${action}.js`, end - start);
    await sleep(WAIT);
  }

  const addToCart = (id, qty = 1) =>
    cartChange("add", { id, quantity: qty, properties: { isBXGYGift: "true" } });

  const removeByKey = (key) => cartChange("change", { id: key, quantity: 0 });

  // ----------------------------
  // 🧠 FETCH CAMPAIGN DATA (timed + 1 min cache)
  // ----------------------------
  window.__bxgyCampaignCache = window.__bxgyCampaignCache || { data: null, time: 0 };

  async function parseCampaignData() {
    const now = Date.now();
    const cache = window.__bxgyCampaignCache;

    if (cache.data && now - cache.time < 60000) return cache.data;

    try {
      const start = performance.now();
      const res = await fetch("/apps/optimaio-cart", { cache: "no-store" });
      const data = await res.json();
      const end = performance.now();
      logTiming("/apps/optimaio-cart", end - start);

      console.log("🧠 BXGY campaigns (fetched fresh):", data);
      cache.data = data;
      cache.time = now;
      return data;
    } catch (err) {
      console.warn("⚠️ Failed to fetch BXGY campaign data", err);
      return cache.data || null;
    }
  }

  // ----------------------------
  // 🎯 BXGY MULTI-CAMPAIGN LOGIC
  // ----------------------------
  async function ensureBxgyGift() {
    if (window.__isBXGYInProgress) return;
    window.__isBXGYInProgress = true;

    try {
      const data = await parseCampaignData();
      if (!data?.campaigns?.length) return;

      const bxgyCampaigns = data.campaigns.filter(
        (c) => c.campaignType === "bxgy" && c.status === "active"
      );
      if (!bxgyCampaigns.length) return;

      const cart = await getCart(true);
      const giftLines = cart.items.filter((i) => i.properties?.isBXGYGift === "true");
      const usedGiftVariantIds = new Set();
      const ops = [];

      for (const bxgy of bxgyCampaigns) {
        const goal = bxgy.goals?.[0];
        if (!goal) continue;

        const buyQty = parseInt(goal.buyQty || 1, 10);
        const getQty = parseInt(goal.getQty || 1, 10);
        const bxgyMode = goal.bxgyMode || "cart";
        const getVariantIds = (goal.getProducts || []).map((p) =>
          Number(p.id.split("/").pop())
        );
        const buyVariantIds = (goal.buyProducts || []).map((p) =>
          Number(p.id.split("/").pop())
        );

        let conditionMet = false;

        if (bxgyMode === "product") {
          const buyProductQty = cart.items
            .filter(
              (i) =>
                !i.properties?.isBXGYGift && buyVariantIds.includes(i.variant_id)
            )
            .reduce((a, i) => a + i.quantity, 0);
          conditionMet = buyProductQty >= buyQty;
          console.log(`[🎯 Gift Check] ${bxgy.campaignName}: ${buyProductQty}/${buyQty}`);
        } else {
          const nonGiftQty = cart.items
            .filter((i) => !i.properties?.isBXGYGift)
            .reduce((a, i) => a + i.quantity, 0);
          conditionMet = nonGiftQty >= buyQty;
          console.log(`[🎯 Gift Check] ${bxgy.campaignName}: ${nonGiftQty}/${buyQty}`);
        }

        if (conditionMet) {
          for (const vid of getVariantIds) {
            usedGiftVariantIds.add(vid);
            const existingGift = giftLines.find((i) => i.variant_id === vid);
            if (existingGift) {
              if (existingGift.quantity !== getQty)
                ops.push(
                  cartChange("change", { id: existingGift.key, quantity: getQty })
                );
            } else {
              ops.push(addToCart(vid, getQty));
            }
          }
        }
      }

      for (const g of giftLines) {
        if (!usedGiftVariantIds.has(g.variant_id)) {
          ops.push(removeByKey(g.key));
        }
      }

      await Promise.allSettled(ops);
      document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
    } catch (err) {
      console.warn("BXGY check failed", err);
    } finally {
      window.__isBXGYInProgress = false;
    }
  }

  // ----------------------------
  // ⚡ CART EVENT HOOKS (timed)
  // ----------------------------
  const triggerBxgyCheck = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => ensureBxgyGift(), 200);
  };

  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const start = performance.now();
    const res = await _fetch(...args);
    const end = performance.now();
    const duration = end - start;

    if (/\/cart\//.test(url)) logTiming(url, duration);

    if (/\/cart\/(add|change|update|clear)(\.js)?/.test(url)) {
      if (/\/cart\/add/.test(url)) ensureBxgyGift();
      else triggerBxgyCheck();
    }
    return res;
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => {
      if (typeof url === "string" && /\/cart\/(add|change|update|clear)(\.js)?/.test(url)) {
        if (/\/cart\/add/.test(url)) ensureBxgyGift();
        else triggerBxgyCheck();
      }
    });
    return _open.call(this, method, url, ...rest);
  };

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (form.action && form.action.includes("/cart/add")) {
      setTimeout(() => ensureBxgyGift(), 400);
    }
  });

  // ----------------------------
  // 🧩 INITIAL LOAD
  // ----------------------------
  window.addEventListener("DOMContentLoaded", () => getCart(true));
  setTimeout(() => ensureBxgyGift(), 800);
})();
