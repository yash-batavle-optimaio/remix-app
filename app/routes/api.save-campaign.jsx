import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/* Helper: Save metafield */
async function setMetafield(admin, shopId, key, valueObj, ownerId = shopId) {
  console.log("🧠 setMetafield called:", { key, ownerId, valueObj });
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key type value }
        userErrors { field message }
      }
    }
  `;
  const variables = {
    metafields: [
      {
        namespace: "optimaio_cart",
        key,
        type: "json",
        ownerId,
        value: JSON.stringify(valueObj),
      },
    ],
  };
  const res = await admin.graphql(mutation, { variables });
  const data = await res.json();
  if (data?.data?.metafieldsSet?.userErrors?.length) {
    console.error("❌ Metafield save error:", data.data.metafieldsSet.userErrors);
  } else {
    console.log("✅ Metafield saved successfully:", data.data.metafieldsSet.metafields);
  }
  return data;
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // 1️⃣ Get shopId
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // 2️⃣ Fetch existing campaigns metafield
  const query = `
    query {
      shop {
        metafield(namespace: "optimaio_cart", key: "campaigns") {
          id
          value
        }
      }
    }
  `;
  const existingRes = await admin.graphql(query);
  const existingData = await existingRes.json();
  const existingMetafield = existingData.data.shop.metafield;

  let campaigns = [];
  if (existingMetafield?.value) {
    try {
      campaigns = JSON.parse(existingMetafield.value).campaigns || [];
    } catch (err) {
      console.error("⚠️ Parse error:", err);
      campaigns = [];
    }
  }

  // 3️⃣ Get the new campaign from frontend
  const newCampaign = await request.json();
  console.log("🆕 Incoming campaign:", newCampaign);

  // 4️⃣ Update or add campaign
  // 4️⃣ Update or add campaign (preserve or auto-assign priority)
const idx = campaigns.findIndex((c) => c.id === newCampaign.id);
if (idx > -1) {
  campaigns[idx] = newCampaign;
} else {
  newCampaign.priority = newCampaign.priority ?? campaigns.length + 1;
  campaigns.push(newCampaign);
}

// 5️⃣ Normalize priorities before saving
const normalizedCampaigns = campaigns.map((c, i) => ({
  ...c,
  priority: typeof c.priority === "number" ? c.priority : i + 1,
}));

await setMetafield(admin, shopId, "campaigns", { campaigns: normalizedCampaigns });


  // 6️⃣ 🧠 Gather all active BXGY campaigns
  const activeBxgys = campaigns.filter(
    (c) => c.campaignType === "bxgy" && c.status === "active"
  );

  // 7️⃣ If active BXGYs exist → gather all collection IDs
  if (activeBxgys.length > 0) {
    const allCollections = [];
    const activeCampaignsInfo = [];

 for (const campaign of activeBxgys) {
  const goal = campaign.goals?.[0];

  // ✅ Include both "collection" and "spend_any_collection" modes
  if (
    (goal?.bxgyMode === "collection" || goal?.bxgyMode === "spend_any_collection") &&
    goal.buyCollections?.length > 0
  ) {
    for (const col of goal.buyCollections) {
      if (!allCollections.includes(col.id)) {
        allCollections.push(col.id);
      }
    }
  }


      activeCampaignsInfo.push({
        id: campaign.id,
        name: campaign.campaignName,
        priority: campaign.priority,
      });
    }

    // Find the highest priority active BXGY
    const topCampaign = activeBxgys.sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    )[0];

    const valueObj = {
      collectionIds: allCollections,
      activeCampaigns: activeCampaignsInfo,
      topCampaign: {
        id: topCampaign.id,
        name: topCampaign.campaignName,
        priority: topCampaign.priority,
      },
    };

    console.log("📦 Updating metafield with all active BXGY collections:", valueObj);

    await setMetafield(
      admin,
      shopId,
      "bxgy_top_collection",
      valueObj,
      "gid://shopify/DiscountAutomaticNode/"
    );
  } else {
    console.log("🕸 No active BXGY campaigns found — clearing metafield.");
    await setMetafield(
      admin,
      shopId,
      "bxgy_top_collection",
      { collectionIds: [], activeCampaigns: [], topCampaign: null },
      "gid://shopify/DiscountAutomaticNode/1167145599131"
    );
  }

  return json({ ok: true, campaign: newCampaign, campaigns });
};
