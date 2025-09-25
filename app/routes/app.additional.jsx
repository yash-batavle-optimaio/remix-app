import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Loader ensures authentication and passes session info to the component
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return json({
    shop: session.shop,
    accessToken: session.accessToken,
  });
};

export default function AdditionalPage() {
  const { shop, accessToken } = useLoaderData();

  return (
    <Page title="Additional Test Page">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Text variant="headingMd">✅ Polaris UI Works!</Text>
            <Text variant="bodyMd" as="p">
              This is a test page inside your embedded Shopify app.
            </Text>
            <br />
            <Text variant="bodyMd">
              <strong>Shop:</strong> {shop}
            </Text>
            <Text variant="bodyMd">
              <strong>Access Token:</strong> {accessToken?.substring(0, 8)}...
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

// Error boundary for debugging
export function ErrorBoundary({ error }) {
  return (
    <div style={{ padding: 20, background: "white", color: "red" }}>
      <h2>🚨 Error in app.additional.jsx</h2>
      <pre>{error.message}</pre>
    </div>
  );
}
