import { json } from "@remix-run/node";
import { authenticate, unauthenticated } from "../shopify.server";

/**
 * Loader to fetch campaign metafield
 */
export async function loader({ request }) {
	try {
		// Basic request context for debugging
		const url = new URL(request.url);
		const queryParams = Object.fromEntries(url.searchParams.entries());
		console.debug("[proxy] Incoming", {
			method: request.method,
			url: url.toString(),
			shop: queryParams.shop,
			hasHmac: typeof queryParams.hmac === "string",
		});

		// Verify App Proxy signature (no admin session required)
		await authenticate.public.appProxy(request);
		console.debug("[proxy] Signature verified");

		// Create an unauthenticated Admin client using the shop from the proxy request
		const { admin } = await unauthenticated.admin(request);
		console.debug("[proxy] Unauthenticated admin client created", {
			shop: queryParams.shop,
		});

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
		console.debug("[proxy] GraphQL response", {
			status: response.status,
			ok: response.ok,
		});

		const jsonBody = await response.json();
		console.debug("[proxy] GraphQL body keys", {
			hasData: Boolean(jsonBody && jsonBody.data),
			hasMetafield:
				Boolean(jsonBody?.data?.shop?.metafield) || false,
		});

		// Ensure the metafield exists and has a value; default to '{}' if not found
		const metafieldValue = jsonBody?.data?.shop?.metafield?.value || "{}";

		// Safely parse the value and return it
		return json(JSON.parse(metafieldValue));
	} catch (error) {
		console.error("[proxy] Error", {
			message: error?.message,
			stack: error?.stack,
			url: request?.url,
		});
		// Return an empty response on failure but do not expose internals to the storefront
		return json({ campaigns: [] }, { status: 200 });
	}
}

