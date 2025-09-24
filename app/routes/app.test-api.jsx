import { Response } from "@remix-run/node";

// loader = GET endpoint → returns HTML
export const loader = async () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h1 {
            color: green;
          }
        </style>
      </head>
      <body>
        <h1>✅ Public Test Page is working in Shopify Admin!</h1>
        <p>Rendered with plain HTML instead of Polaris.</p>
      </body>
    </html>
  `;
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
};
