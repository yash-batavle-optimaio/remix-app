import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);

    return json({
      authenticated: true,
      shop: session.shop,
      accessToken: session.accessToken?.substring(0, 12) + "...",
      scope: session.scope,
    });
  } catch (error) {
    if (error instanceof Response) {
      // Shopify redirect case → session missing
      return json({
        authenticated: false,
        reason: "No valid session. Try opening via Shopify Admin > Apps.",
      });
    }

    // Any other error
    return json({
      authenticated: false,
      reason: error.message || "Unknown error",
    });
  }
};
