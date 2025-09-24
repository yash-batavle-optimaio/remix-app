// app/routes/app.test-api.jsx

// GET endpoint → returns HTML page
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
        <h1>✅ Public Test Page is working in Shopify Admin!</h1>
        <p>This page uses plain HTML (no Polaris) so you can debug rendering inside the Shopify iFrame.</p>

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

// POST endpoint → echoes submitted data in HTML
export const action = async ({ request }) => {
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
        <h1>📩 Form Submitted!</h1>
        <p>You entered: <strong>${message}</strong></p>
        <a href="/app/test-api">⬅ Back to Test Page</a>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
};
