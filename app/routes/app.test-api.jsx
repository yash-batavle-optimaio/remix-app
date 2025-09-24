import { json } from "@remix-run/node";

// loader = GET endpoint
export const loader = async () => {
  return json({
    message: "✅ Public Test API is working!",
    time: new Date().toISOString(),
  });
};

// action = POST endpoint
export const action = async ({ request }) => {
  const body = await request.formData();
  return json({
    message: "✅ Received POST data (no auth)",
    data: Object.fromEntries(body),
  });
};
