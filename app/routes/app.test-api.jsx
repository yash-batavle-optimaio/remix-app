import { Page, Layout, Card, Text } from "@shopify/polaris";

export default function TestPage() {
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Text as="h2" variant="headingMd">
              ✅ Public Test Page is working!
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
