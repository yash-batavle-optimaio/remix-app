import { Page, Layout, Card, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Loader: makes sure the request is authenticated
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Default page component
export default function AppIndexPage() {
  return (
    <Page title="Test Page">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Text variant="bodyMd">✅ If you see this, routing works!</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

// Error boundary to show errors instead of blank page
export function ErrorBoundary({ error }) {
  return (
    <div style={{ padding: 20, background: "white", color: "red" }}>
      <h2>🚨 Error in app._index.jsx</h2>
      <pre>{error.message}</pre>
    </div>
  );
}
