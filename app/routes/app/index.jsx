import { Page, Layout, Card, Text } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function IndexPage() {
  return (
    <Page title="Corner Cart Dashboard">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Text as="p" variant="bodyMd">
              🎉 This is your main app page!
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
