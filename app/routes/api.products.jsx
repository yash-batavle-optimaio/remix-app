// app/routes/api.products.jsx
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    // Authenticate the admin session
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;

    console.log(`🛍️ Fetching products for shop: ${shop}`);

    // Run GraphQL query
    const response = await admin.graphql(`
      query {
        products(first: 20) {
          edges {
            node {
              id
              title
              featuredImage { url altText }
              images(first: 1) {
                edges { node { url altText } }
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    price
                    availableForSale
                    image { url altText }
                  }
                }
              }
            }
          }
        }
      }
    `);

    const data = await response.json();

    if (!data?.data?.products?.edges) {
      console.error("❌ GraphQL error:", data.errors);
      return {
        error: "GraphQL error",
        details: data.errors,
        status: 500,
      };
    }

    const products = data.data.products.edges.map(({ node }) => {
      const fallbackImage = node.featuredImage ?? node.images?.edges?.[0]?.node ?? null;

      return {
        id: node.id,
        title: node.title,
        featuredImage: fallbackImage,
        variants: node.variants.edges.map(({ node: v }) => ({
          id: v.id,
          title: v.title,
          price: v.price,
          availableForSale: v.availableForSale,
          image: v.image || fallbackImage,
        })),
      };
    });

    // ✅ Returning plain object (auto-serialized to JSON)
    return products;
  } catch (err) {
    console.error("❌ Loader failed:", err);

    // Manual response for better status code
    return new Response(
      JSON.stringify({ error: "Server error", details: String(err) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
