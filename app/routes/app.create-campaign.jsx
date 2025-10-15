import {
  BlockStack,
  Divider,
  Page,
  Tabs,
  Layout,
  Card,
  Button,
  InlineStack,
  Text,
  Box,
  Frame,
  Toast,
} from "@shopify/polaris";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { useState, useCallback } from "react";

// Loader: makes sure the request is authenticated
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Default page component
export default function AppIndexPage() {
  const [selected, setSelected] = useState(0);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const toggleToast = useCallback(() => setToastActive(false), []);
  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelected(selectedTabIndex),
    []
  );

  const tabs = [
    { id: "all", content: "All" },
    { id: "offers", content: "Offers" },
    { id: "messaging", content: "Messaging" },
    { id: "cart-rules", content: "Cart rules" },
  ];

  return (
    <Frame>
      <Page
        title={
          <InlineStack gap="500" blockAlign="center">
            <Button
              icon={ArrowLeftIcon}
              plain
              onClick={() => window.history.back()}
            />
            <Text variant="headingLg" as="h2">
              Select a campaign type
            </Text>
          </InlineStack>
        }
      >
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
          <div style={{ padding: "16px" }}>
            <Text variant="bodyMd" fontWeight="medium">
              Content for {tabs[selected].content}
            </Text>
          </div>
        </Tabs>

        <Layout>
          <Layout.Section variant="oneThird">
            <Card title="Order details" sectioned>
              <InlineStack gap="400" blockAlign="center">
                <img
                  src="/cart-goal.svg"
                  alt="Cart goal icon"
                  style={{ width: "40px", height: "40px" }}
                />
                <Box>
                  <Text variant="headingMd" as="h3">
                    Cart goals
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Give rewards based on cart value.
                  </Text>
                </Box>
              </InlineStack>
            </Card>
          </Layout.Section>

          {/* Right side section */}
          <Layout.Section>
            <Box paddingBlockEnd="600">
              <Card title="Tags" sectioned>
                <div style={{ textAlign: "center" }}>
                  <img
                    src="/campaign-banner-cart-goal.svg"
                    alt="Cart goal icon"
                    style={{ width: "400px", height: "200px" }}
                  />

                  <Box padding="400">
                    <BlockStack gap="400" align="center">
                      <Text variant="headingMd" as="h2">
                        Cart goals
                      </Text>
                      <Text variant="bodyMd" tone="subdued" alignment="center">
                        Offer free gifts, order discounts or free shipping when
                        cart value reaches one (or more) milestones shown on a
                        progress bar.
                      </Text>

                      {/* Button to create campaign */}
                      <Button
                        primary
                        onClick={async () => {
                          const res = await fetch("/api/create-campaign", {
                            method: "POST",
                          });
                          const data = await res.json();
                          if (data.ok) {
                            setToastMessage(
                              `✅ Created: ${data.campaign.campaignName} (status: draft)`
                            );
                          } else {
                            setToastMessage("❌ Error creating campaign");
                          }
                          setToastActive(true);
                        }}
                      >
                        Create this campaign
                      </Button>
                    </BlockStack>
                  </Box>
                </div>

                <Divider borderColor="border" />

                <Box paddingBlockStart="400">
                  <InlineStack gap="400" align="center">
                    {/* Card 1 */}
                    <Box
                      padding="400"
                      borderWidth="025"
                      borderRadius="300"
                      background="bg-surface"
                      minWidth="200px"
                    >
                      <BlockStack gap="100" align="center">
                        <Text variant="heading2xl" as="h3" alignment="center">
                          Upto 6%
                        </Text>
                        <Text
                          variant="bodySm"
                          tone="subdued"
                          alignment="center"
                        >
                          Potential AOV boost
                        </Text>
                      </BlockStack>
                    </Box>

                    {/* Card 2 */}
                    <Box
                      padding="400"
                      borderWidth="025"
                      borderRadius="300"
                      background="bg-surface"
                      minWidth="200px"
                    >
                      <BlockStack gap="100" align="center">
                        <Text variant="heading2xl" as="h3" alignment="center">
                          5-10 mins
                        </Text>
                        <Text
                          variant="bodySm"
                          tone="subdued"
                          alignment="center"
                        >
                          Time to set up
                        </Text>
                      </BlockStack>
                    </Box>
                  </InlineStack>
                </Box>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </Page>

      {toastActive && (
        <Toast content={toastMessage} onDismiss={toggleToast} />
      )}
    </Frame>
  );
}

// Error boundary
export function ErrorBoundary({ error }) {
  return (
    <div style={{ padding: 20, background: "white", color: "red" }}>
      <h2>🚨 Error in app._index.jsx</h2>
      <pre>{error.message}</pre>
    </div>
  );
}
