import { authenticate } from "../shopify.server";

export const loader = () =>
  Response.json({ message: "👋 Webhook endpoint: POST only." });

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`🧭 ${topic} webhook received for ${shop}`);
  console.log("📦 Payload:", JSON.stringify(payload, null, 2));

  return Response.json({ ok: true });
};
