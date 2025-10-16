import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader() {
  return new Response(JSON.stringify({ ok: true, route: "apps.optimaio-cart-campaigns" }), {
    headers: { "Content-Type": "application/json" },
  });
}

