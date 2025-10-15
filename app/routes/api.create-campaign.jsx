import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/* Helper: Save metafield */
async function setMetafield(admin, shopId, key, valueObj) {
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
        ownerId: shopId,
        value: JSON.stringify(valueObj),
      },
    ],
  };

  return await admin.graphql(mutation, { variables });
}

// Helper to generate unique id
function generateId() {
  return `cmp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

// Helper: next campaign number based on max
function getNextCampaignNumber(campaigns) {
  let max = 0;
  campaigns.forEach((c) => {
    const match = c.campaignName.match(/Cart goals (\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  });
  return max + 1;
}

/* Route Action */
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // 1. Get shopId
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // 2. Read existing campaigns
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
    } catch {
      campaigns = [];
    }
  }

  // 3. Compute next number
  const nextNumber = getNextCampaignNumber(campaigns);

  // 4. Add new campaign
  const newCampaign = {
    id: generateId(),
    campaignName: `Cart goals ${nextNumber}`,
    status: "draft",
  };
  campaigns.push(newCampaign);

  // 5. Save back
  await setMetafield(admin, shopId, "campaigns", { campaigns });

  return json({ ok: true, campaign: newCampaign });
};
