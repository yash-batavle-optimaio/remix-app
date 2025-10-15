import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(`
      query {
        products(first: 20) {
          edges {
            node {
              id
              title
              featuredImage { url altText }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    price
                    availableForSale
                    image {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    const data = await response.json();

    if (!data.data) {
      console.error("GraphQL error:", data.errors);
      return Response.json(
        { error: "GraphQL error", details: data.errors },
        { status: 500 }
      );
    }

 const products = data.data.products.edges.map(({ node }) => {
  const fallbackImage =
    node.featuredImage ?? node.images?.edges?.[0]?.node ?? null;

  return {
    id: node.id,
    title: node.title,
    featuredImage: fallbackImage, // product-level fallback
    variants: node.variants.edges.map(({ node: v }) => ({
      id: v.id,
      title: v.title,
      price: v.price,
      availableForSale: v.availableForSale,
      // ✅ Use variant image, or fallback to product image
      image: v.image || fallbackImage,
    })),
  };
});


    return Response.json(products);
  } catch (err) {
    console.error("❌ Loader failed:", err);
    return Response.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
};
