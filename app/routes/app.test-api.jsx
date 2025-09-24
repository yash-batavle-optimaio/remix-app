import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page (Authenticated)</title>
        </head>
        <body>
          <h1>✅ Authenticated Test Page</h1>
          <p>Shop: ${session.shop}</p>
          <p>Access Token: ${session.accessToken?.substring(0, 10)}...</p>
          <form method="post">
            <input type="text" name="message" />
            <button type="submit">Send</button>
          </form>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    // If authentication fails, redirect to /auth
    if (error instanceof Response) {
      throw error; // this lets Remix handle the redirect properly
    }
    throw error; // any other error
  }
};
