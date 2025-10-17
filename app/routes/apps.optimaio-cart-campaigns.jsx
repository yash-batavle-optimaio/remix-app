import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Loader to fetch campaign metafield
 */
export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  try {
    // Perform GraphQL query to fetch metafield for the 'optimaio_cart' namespace and 'campaigns' key
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

    // Ensure the metafield exists and has a value; default to '{}' if not found
    const metafieldValue = jsonBody?.data?.shop?.metafield?.value || "{}";

    // Safely parse the value and return it
    return json(JSON.parse(metafieldValue));
  } catch (error) {
    // Log the error and return a safe response
    console.error("❌ Error fetching campaigns metafield", error);
    return json({ campaigns: [] }, { status: 500 });
  }
}
