/* extensions/corner-cart/assets/free-gift.js */
(() => {
  if (window.__freeGiftInit) return;
  window.__freeGiftInit = true;

  // concurrency locks
  window.__isEnsuringGift = false;
  window.__isGiftUpdateInProgress = false;

  console.log("🎁 Dynamic Free Gift script initializing…");

  async function getCart() {
    const res = await fetch("/cart.js", { cache: "no-store" });
    return res.json();
  }

  async function addToCart(id) {
    window.__isGiftUpdateInProgress = true;
    await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        quantity: 1,
        properties: { isFreeGift: "true" },
      }),
    });
    await new Promise(r => setTimeout(r, 600));
    window.__isGiftUpdateInProgress = false;
  }

  async function updateQuantityToOne(key) {
    window.__isGiftUpdateInProgress = true;
    await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: key, quantity: 1 }),
    });
    await new Promise(r => setTimeout(r, 600));
    window.__isGiftUpdateInProgress = false;
  }

  async function removeByKey(key) {
    window.__isGiftUpdateInProgress = true;
    await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: key, quantity: 0 }),
    });
    await new Promise(r => setTimeout(r, 600));
    window.__isGiftUpdateInProgress = false;
  }

async function parseCampaignData(forceRefresh = false) {
  if (!forceRefresh) {
    // Use global variable if available
    const raw = window.__OPTIMAIO_CAMPAIGNS__;
    if (raw) {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        const active = (parsed.campaigns || []).filter(c => c.status === "active");
        if (active.length) {
          active.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
          return active[0];
        }
      } catch {}
    }
  }

  // 🔄 Fetch fresh metafield JSON dynamically
  try {
    console.log("🔄 Fetching latest campaign data...");
    const res = await fetch("/apps/optimaio-cart/campaigns.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch campaigns");
    const fresh = await res.json();
    window.__OPTIMAIO_CAMPAIGNS__ = fresh; // update global cache
    const active = (fresh.campaigns || []).filter(c => c.status === "active");
    if (active.length) {
      active.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
      return active[0];
    }
  } catch (err) {
    console.warn("⚠️ Could not refresh campaigns:", err);
  }

  return null;
}



  // 🎨 Inject popup only once
  if (!document.getElementById("optimaio-gift-popup")) {
    const popupHTML = `
      <div id="optimaio-gift-popup" class="optimaio-gift-popup" style="display:none;">
        <div class="optimaio-gift-popup__inner">
          <h3>🎁 Choose Your Free Gifts</h3>
          <p>Select up to <span id="optimaio-max-gifts">1</span> gifts:</p>
          <div id="optimaio-gift-options"></div>
          <div class="optimaio-gift-popup__actions">
            <button id="optimaio-cancel-gifts" class="optimaio-btn optimaio-btn--light">Cancel</button>
            <button id="optimaio-confirm-gifts" class="optimaio-btn">Confirm</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", popupHTML);

    const style = document.createElement("style");
    style.textContent = `
      .optimaio-gift-popup{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:11000;font-family:Inter,sans-serif;}
      .optimaio-gift-popup__inner{background:#fff;padding:20px;border-radius:16px;width:90%;max-width:420px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.25);}
      .optimaio-gift-option{display:inline-block;margin:10px;cursor:pointer;border:2px solid transparent;border-radius:10px;padding:6px;background:#fff7f8;width:120px;transition:all .2s;}
      .optimaio-gift-option img{width:80px;height:80px;border-radius:8px;object-fit:cover;}
      .optimaio-gift-option p{font-size:13px;font-weight:500;color:#222;margin:6px 0 0;}
      .optimaio-gift-option:hover{border-color:#f1b0b0;transform:translateY(-2px);}
      .optimaio-gift-option.selected{border-color:#d48b8b;background:#fdeaea;}
      .optimaio-btn{background:#000;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;margin:8px;}
      .optimaio-btn--light{background:#eee;color:#333;}
      .optimaio-gift-popup__actions{display:flex;justify-content:center;gap:10px;margin-top:12px;}
    `;
    document.head.appendChild(style);
  }

  function showGiftSelectionPopup(products, maxQty) {
    const popup = document.getElementById("optimaio-gift-popup");
    const container = document.getElementById("optimaio-gift-options");
    const maxEl = document.getElementById("optimaio-max-gifts");
    maxEl.textContent = maxQty;

    container.innerHTML = products.map(
      (p) => `
        <div class="optimaio-gift-option" data-id="${Number(p.id.split("/").pop())}">
          <img src="${p.image?.url || p.featured_image || p.images?.[0] || ''}" alt="${p.title}">
          <p>${p.productTitle || p.title}</p>
        </div>`
    ).join("");

    popup.style.display = "flex";
    let selected = new Set();

    container.querySelectorAll(".optimaio-gift-option").forEach(opt => {
      opt.addEventListener("click", () => {
        const id = Number(opt.dataset.id);
        if (selected.has(id)) {
          selected.delete(id);
          opt.classList.remove("selected");
        } else if (selected.size < maxQty) {
          selected.add(id);
          opt.classList.add("selected");
        } else {
          alert(`You can only select ${maxQty} gifts`);
        }
      });
    });

    document.getElementById("optimaio-cancel-gifts").onclick = () => {
      popup.style.display = "none";
    };

    document.getElementById("optimaio-confirm-gifts").onclick = async () => {
      popup.style.display = "none";
      for (const vid of selected) {
        await addToCart(vid);
      }
      ensureFreeGift();
    };
  }

  async function ensureFreeGift(existingCart = null) {
    if (window.__isEnsuringGift || window.__isGiftUpdateInProgress) return;
    window.__isEnsuringGift = true;

    try {
     const campaign = await parseCampaignData(true);
      if (!campaign) return;

      const { trackType, goals } = campaign;
      const giftGoal = goals?.find(g => g.type === "free_product");
      if (!giftGoal || !giftGoal.products?.length) return;

      const giftVariantIds = giftGoal.products.map(p =>
        Number(p.id.split("/").pop())
      );

      const cart = existingCart || (await getCart());
      const giftLines = cart.items.filter(i => i.properties?.isFreeGift === "true");
      const hasNonGiftProducts = cart.items.some(i => !giftVariantIds.includes(i.variant_id));

      const subtotal =
        cart.items
          .filter(i => !giftVariantIds.includes(i.variant_id))
          .reduce((a, i) => a + i.final_line_price, 0) / 100;

      const totalQty = cart.items
        .filter(i => !giftVariantIds.includes(i.variant_id))
        .reduce((a, i) => a + i.quantity, 0);

      const targetAmount = parseFloat(giftGoal.target || giftGoal.thresholdAmount || 0);
      const targetQty = parseInt(giftGoal.target || giftGoal.minQty || 0, 10);

      let conditionMet = false;
      if (trackType === "quantity") conditionMet = totalQty >= targetQty;
      else conditionMet = subtotal >= targetAmount;

      console.log(`[🎯 Gift Check] Met=${conditionMet}`);

      // Always enforce quantity = 1
      for (const g of giftLines) {
        if (g.quantity !== 1) await updateQuantityToOne(g.key);
      }

      if (conditionMet && hasNonGiftProducts) {
        // Show popup if multiple gift choices are allowed
        if ((giftGoal.giftQty || 1) > 1 && !giftLines.length) {
          showGiftSelectionPopup(giftGoal.products, giftGoal.giftQty);
          return;
        }

        // Verify-before-add logic
        for (const vid of giftVariantIds) {
          const refreshed = await getCart();
          const exists = refreshed.items.some(
            i => i.variant_id === vid && i.properties?.isFreeGift === "true"
          );
          if (!exists) await addToCart(vid);
        }
      } else {
        for (const g of giftLines) await removeByKey(g.key);
      }

      document.dispatchEvent(new CustomEvent("optimaio:cart:refresh"));
    } finally {
      window.__isEnsuringGift = false;
    }
  }

  // Hook into cart changes
  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await _fetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    if (/\/cart\/(add|change|update|clear)\.js/.test(url)) {
      setTimeout(() => ensureFreeGift(), 900);
    }
    return res;
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => {
      if (typeof url === "string" && /\/cart\/(add|change|update|clear)\.js/.test(url)) {
        setTimeout(() => ensureFreeGift(), 900);
      }
    });
    return _open.call(this, method, url, ...rest);
  };

  // 🧩 First run
  setTimeout(async () => {
    const cart = await getCart();
    for (const i of cart.items) {
      if (i.properties?.isFreeGift === "true" && i.quantity !== 1) {
        await updateQuantityToOne(i.key);
      }
    }
    setTimeout(() => ensureFreeGift(), 1500);
  }, 800);
})();
