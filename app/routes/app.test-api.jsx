import { Page, Layout, Card, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request); // ensures Shopify session
  return null;
};

export default function TestPage() {
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Text as="h2" variant="headingMd">
              ✅ Public Test Page is working inside Shopify!
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export function ErrorBoundary({ error }) {
  return (
    <div style={{ padding: 20, background: "white", color: "red" }}>
      <h2>🚨 Error in test-api route</h2>
      <pre>{error.message}</pre>
    </div>
  );
}
