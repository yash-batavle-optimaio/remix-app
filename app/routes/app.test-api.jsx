import { authenticate } from "../shopify.server";

// GET endpoint → returns HTML page (only if authenticated)
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page (Authenticated)</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #fafafa;
          }
          h1 {
            color: green;
          }
          form {
            margin-top: 20px;
          }
          label {
            display: block;
            margin-bottom: 8px;
          }
          input[type="text"] {
            padding: 6px;
            border: 1px solid #ccc;
            border-radius: 4px;
            width: 250px;
          }
          button {
            margin-top: 10px;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            background: #008060;
            color: white;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <h1>✅ Authenticated Test Page</h1>
        <p>This confirms <strong>Shopify Admin authentication</strong> is working.</p>

        <p><strong>Shop:</strong> ${session.shop}</p>
        <p><strong>Access Token (first 10 chars):</strong> ${
          session.accessToken?.substring(0, 10) || "N/A"
        }...</p>

        <form method="post">
          <label>
            Enter something:
            <input type="text" name="message" />
          </label>
          <button type="submit">Send</button>
        </form>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
};

// POST endpoint → echoes submitted data in HTML (with auth)
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const body = await request.formData();
  const message = body.get("message") || "(empty)";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Form Submitted</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h1 {
            color: blue;
          }
          a {
            display: inline-block;
            margin-top: 20px;
            color: #008060;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <h1>📩 Form Submitted (Authenticated)</h1>
        <p>You entered: <strong>${message}</strong></p>
        <p><strong>Shop:</strong> ${session.shop}</p>
        <a href="/app/test-api">⬅ Back to Test Page</a>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
};
