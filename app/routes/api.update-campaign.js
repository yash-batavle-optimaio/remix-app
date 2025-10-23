import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const body = await request.json();
  const campaigns = body.campaigns;

  if (!Array.isArray(campaigns)) {
    return json({ success: false, message: "Invalid campaigns array" }, { status: 400 });
  }

  // 1️⃣ Add a priority field based on array order
  const orderedCampaigns = campaigns.map((c, index) => ({
    ...c,
    priority: index + 1, // add priority number
  }));

  // 2️⃣ Get shop ID
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData?.data?.shop?.id;

  if (!shopId) {
    return json({ success: false, message: "Shop ID not found" }, { status: 500 });
  }

  // 3️⃣ Save clean, ordered campaigns
  const mutation = `
    mutation UpdateCampaignsMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          type
          value
          updatedAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        namespace: "optimaio_cart",
        key: "campaigns",
        ownerId: shopId,
        type: "json",
        value: JSON.stringify({ campaigns: orderedCampaigns }),
      },
    ],
  };

  const response = await admin.graphql(mutation, { variables });
  const result = await response.json();

  const userErrors = result?.data?.metafieldsSet?.userErrors || [];
  if (userErrors.length > 0) {
    return json({ success: false, errors: userErrors }, { status: 400 });
  }

  return json({
    success: true,
    message: "✅ Campaigns updated with priority",
    campaigns: orderedCampaigns,
  });
};
