import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Returns the optimaio_cart campaigns metafield for storefront scripts.
 */
export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.public.appProxy(request);

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
    return json(JSON.parse(raw), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("❌ Error loading campaigns metafield:", err);
    return json({ campaigns: [] }, { status: 500 });
  }
};
