import { authenticate } from "../shopify.server";

export const loader = () =>
  Response.json({ message: "👋 Webhook endpoint: POST only." });

export const action = async ({ request }) => {
  // 🧠 authenticate.webhook now gives you everything you need:
  const { topic, admin, payload, session, shop } = await authenticate.webhook(request);

  console.log(`🧭 ${topic} webhook received for ${shop}`);
  console.log("📦 Payload:", JSON.stringify(payload, null, 2));

  // Webhooks can fire even after uninstall — so check for session
  if (!session) {
    console.warn("⚠️ No active session found. Shop may have uninstalled.");
    throw new Response();
  }

  if (topic === "METAFIELD_DEFINITIONS_UPDATE") {
    try {
      // Example: query metafields for your shop
      const response = await admin.graphql(
        `#graphql
        query GetShopMetafields {
          shop {
            metafields(first: 10, namespace: "optimaio_cart") {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                }
              }
            }
          }
        }`
      );

      const data = await response.json();
      console.log("🎯 Shop metafields:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("🚨 Error querying metafields:", err);
    }
  }

  return new Response();
};
