import { json } from "@remix-run/node";
import { authenticate, unauthenticated } from "../shopify.server";

/**
 * Loader to fetch campaign metafield
 */
export async function loader({ request }) {
	try {
		// Verify App Proxy signature (no admin session required)
		await authenticate.public.appProxy(request);

		// Create an unauthenticated Admin client using the shop from the proxy request
		const { admin } = await unauthenticated.admin(request);

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

		// Ensure the metafield exists and has a value; default to '{}' if not found
		const metafieldValue = jsonBody?.data?.shop?.metafield?.value || "{}";

		// Safely parse the value and return it
		return json(JSON.parse(metafieldValue));
	} catch (error) {
		// Return an empty response on failure but do not expose internals to the storefront
		return json({ campaigns: [] }, { status: 200 });
	}
}

