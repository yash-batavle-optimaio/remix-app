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

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // 1. Get shopId
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // 2. Get existing campaigns
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

  // 3. Get new campaign from frontend
  const newCampaign = await request.json();

  // 4. If campaign with same id exists → replace it, else add new
  const idx = campaigns.findIndex((c) => c.id === newCampaign.id);
  if (idx > -1) {
    campaigns[idx] = newCampaign;
  } else {
    campaigns.push(newCampaign);
  }

  // 5. Save back to metafields
  await setMetafield(admin, shopId, "campaigns", { campaigns });

  return json({ ok: true, campaign: newCampaign, campaigns });
};
