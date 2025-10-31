import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/* Helper: Save metafield */
async function setMetafield(admin, ownerId, key, valueObj, targetId = ownerId) {
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
        ownerId: targetId,
        value: JSON.stringify(valueObj),
      },
    ],
  };
  const res = await admin.graphql(mutation, { variables });
  const data = await res.json();
  if (data?.data?.metafieldsSet?.userErrors?.length) {
    console.error("❌ Metafield save error:", data.data.metafieldsSet.userErrors);
  } else {
    console.log("✅ Metafield saved:", key, data.data.metafieldsSet.metafields[0]);
  }
  return data;
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const { campaigns } = await request.json();

  if (!Array.isArray(campaigns)) {
    return json({ success: false, message: "Invalid campaigns array" }, { status: 400 });
  }

  // 1️⃣ Add explicit numeric priority
  const orderedCampaigns = campaigns.map((c, index) => ({
    ...c,
    priority: index + 1,
  }));

  // 2️⃣ Get shopId
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData?.data?.shop?.id;
  if (!shopId) {
    return json({ success: false, message: "Shop ID not found" }, { status: 500 });
  }

  // 3️⃣ Save updated campaign list to metafield
  await setMetafield(admin, shopId, "campaigns", { campaigns: orderedCampaigns });

  // 4️⃣ 🔁 Determine active BXGY campaigns
  const activeBxgys = orderedCampaigns.filter(
    (c) => c.campaignType === "bxgy" && c.status === "active"
  );

  const discountNodeId = "gid://shopify/DiscountAutomaticNode/1167145599131";

  if (activeBxgys.length > 0) {
    // Gather all unique collection IDs
    const allCollections = [];
    const activeCampaignsInfo = [];

    for (const campaign of activeBxgys) {
      const goal = campaign.goals?.[0];
      if (goal?.bxgyMode === "collection" && goal.buyCollections?.length > 0) {
        for (const col of goal.buyCollections) {
          if (!allCollections.includes(col.id)) allCollections.push(col.id);
        }
      }

      activeCampaignsInfo.push({
        id: campaign.id,
        name: campaign.campaignName,
        priority: campaign.priority,
      });
    }

    // Find top-priority active BXGY (lowest priority number = top)
    const topCampaign = activeBxgys.sort((a, b) => a.priority - b.priority)[0];

    const metafieldValue = {
      collectionIds: allCollections,
      activeCampaigns: activeCampaignsInfo,
      topCampaign: {
        id: topCampaign.id,
        name: topCampaign.campaignName,
        priority: topCampaign.priority,
      },
    };

    console.log("🏆 Updating bxgy_top_collection with:", metafieldValue);

    await setMetafield(
      admin,
      shopId,
      "bxgy_top_collection",
      metafieldValue,
      discountNodeId
    );
  } else {
    console.log("🕸 No active BXGY campaigns found — clearing metafield.");
    await setMetafield(
      admin,
      shopId,
      "bxgy_top_collection",
      { collectionIds: [], activeCampaigns: [], topCampaign: null },
      discountNodeId
    );
  }

  return json({
    success: true,
    message: "✅ Campaigns reordered and BXGY metafield synced",
    campaigns: orderedCampaigns,
  });
};
