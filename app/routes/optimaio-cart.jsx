// app/routes/optimaio-cart.jsx
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  const response = await admin.graphql(`
    query {
      shop {
        metafield(namespace: "optimaio_cart", key: "campaigns") {
          value
        }
      }
    }
  `);

  const data = await response.json();
  const raw = data?.data?.shop?.metafield?.value || "{}";
  const parsed = JSON.parse(raw);

  return new Response(JSON.stringify(parsed), {
    headers: { "Content-Type": "application/json" },
  });
};
