import { json } from "@remix-run/node";
import {
  useLoaderData,
  useFetcher,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  TextField,
  Link,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState } from "react";

// ✅ Loader ensures authentication
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session?.shop) {
    throw new Response("Unauthorized: No valid shop session", { status: 401 });
  }

  return json({
    shop: session.shop,
    accessToken: session.accessToken,
  });
};

export default function AdditionalPage() {
  const { shop, accessToken } = useLoaderData();
  const fetcher = useFetcher();

  const [code, setCode] = useState("FREESHIP");
  const [title, setTitle] = useState("Free Shipping on All Products");

  const extractAdminId = (gid) => gid?.split("/").pop();

  return (
    <Page title="Create Free Shipping Discount">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Text variant="headingMd">✅ Polaris UI Works!</Text>
            <Text variant="bodyMd">Shop: {shop}</Text>
            <Text variant="bodyMd">
              Access Token: {accessToken?.substring(0, 8)}...
            </Text>

            <br />
            <TextField label="Discount Title" value={title} onChange={setTitle} />
            <TextField label="Discount Code" value={code} onChange={setCode} />
            <br />

            {/* Form */}
            <fetcher.Form method="post" action="/api/create-discount">
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="code" value={code} />
              <Button submit primary>
                Create Free Shipping Discount
              </Button>
            </fetcher.Form>

            {/* ✅ Feedback */}
            {fetcher.data?.success && (
              <div style={{ marginTop: "1rem" }}>
                <Text tone="success">✅ Discount created!</Text>
                {fetcher.data.id && (
                  <>
                    <br />
                    <Text>ID: {fetcher.data.id}</Text>
                    <br />
                    <Text>Title: {fetcher.data.title}</Text>
                    <br />
                    <Text>Code: {fetcher.data.code}</Text>
                    <br />
                    <Link
                      url={`https://${shop}/admin/discounts/${extractAdminId(
                        fetcher.data.id
                      )}`}
                      external
                    >
                      View in Shopify Admin
                    </Link>
                  </>
                )}
              </div>
            )}

            {fetcher.data?.errors && (
              <Text tone="critical">
                ❌ Error: {fetcher.data.errors.map((e) => e.message).join(", ")}
              </Text>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

// ✅ ErrorBoundary
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: 20, background: "white", color: "orange" }}>
        <h2>⚠️ App Error (CatchBoundary)</h2>
        <p>Status: {error.status}</p>
        <pre>{error.data}</pre>
      </div>
    );
  }

  const message =
    typeof error === "string"
      ? error
      : error?.message || JSON.stringify(error, null, 2);

  const stack = error?.stack || "";

  return (
    <div style={{ padding: 20, background: "white", color: "red" }}>
      <h2>🚨 Error in app.additional.jsx</h2>
      <pre>{message}</pre>
      {stack && (
        <>
          <h4>Stack trace:</h4>
          <pre style={{ whiteSpace: "pre-wrap" }}>{stack}</pre>
        </>
      )}
    </div>
  );
}
