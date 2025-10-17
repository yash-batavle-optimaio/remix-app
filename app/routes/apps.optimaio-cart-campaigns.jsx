import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Loader to fetch campaign metafield
 */
export async function loader({ request }) {
  try {
    // Log the incoming request to track what is being sent
    console.log("Incoming Request:", request);

    const { admin } = await authenticate.admin(request);

    if (!admin) {
      console.error("❌ Failed to authenticate admin");
      return json({ error: "Authentication failed" }, { status: 401 });
    }

    console.log("Authenticated Admin:", admin);

    // Perform GraphQL query to fetch metafield
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

    // Log the response body to check the result
    console.log("GraphQL Response Body:", jsonBody);

    // Ensure the metafield exists and has a value; default to '{}' if not found
    const metafieldValue = jsonBody?.data?.shop?.metafield?.value || "{}";

    // Log the metafield value
    console.log("Metafield Value:", metafieldValue);

    // Safely parse the value and return it
    return json(JSON.parse(metafieldValue));

  } catch (error) {
    // Log the error and return a safe response
    console.error("❌ Error fetching campaigns metafield:", error);
    return json({ campaigns: [] }, { status: 500 });
  }
}

