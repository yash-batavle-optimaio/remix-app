import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// loader = GET endpoint
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ message: "✅ Test API is working!", time: new Date().toISOString() });
};

// action = POST endpoint
export const action = async ({ request }) => {
  await authenticate.admin(request);
  const body = await request.formData();
  return json({ message: "✅ Received POST data", data: Object.fromEntries(body) });
};
