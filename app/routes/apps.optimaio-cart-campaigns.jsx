import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(`
      query {
        shop {
          metafield(namespace: "optimaio_cart", key: "campaigns") {
            value
          }
        }
      }
    `);

    const jsonBody = await response.json();
    const metafieldValue = jsonBody?.data?.shop?.metafield?.value || "{}";

    return json(JSON.parse(metafieldValue));
  } catch (error) {
    console.error("❌ Error fetching campaigns metafield", error);
    return json({ campaigns: [] }, { status: 500 });
  }
}
