import {
  Modal,
  TextContainer,
  IndexTable,
  Text,
  Thumbnail,
  Box,
  Spinner,
} from "@shopify/polaris";
import { useState, useEffect } from "react";

export default function ProductPickerModal({
  open,
  onClose,
  onSelect,
  initialSelected = [],
}) {
  const [products, setProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSelectedIds(initialSelected.map((p) => p.id));
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Failed to load products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, initialSelected]);

  const allVariants = products.flatMap((p) =>
    p.variants.map((v) => ({ ...v, productTitle: p.title }))
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select product variants"
      primaryAction={{
        content: "Select",
        onAction: () => {
          const selectedVariants = allVariants.filter((v) =>
            selectedIds.includes(v.id)
          );
          onSelect(selectedVariants);
          onClose();
        },
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <TextContainer>
          {/* Global selection bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <Text>
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : "No variants selected"}
            </Text>
            {selectedIds.length > 0 && (
              <button
                style={{
                  border: "none",
                  background: "transparent",
                  color: "red",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedIds([])}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <Spinner accessibilityLabel="Loading products" size="large" />
            </div>
          )}

          {/* Products + variants */}
          {!loading &&
            products.map((p) => (
              <Box
                key={p.id}
                paddingBlockEnd="400"
                borderBlockEndWidth="1"
                borderColor="border-subdued"
              >
                {/* 🔹 Product title as section header */}
                <Text variant="headingMd" as="h2" fontWeight="bold">
                  {p.title}
                </Text>

                <IndexTable
                  resourceName={{ singular: "variant", plural: "variants" }}
                  itemCount={p.variants.length}
                  selectedItemsCount={
                    p.variants.filter((v) => selectedIds.includes(v.id)).length
                  }
                  headings={[
                    { title: "Image" },
                    { title: "Variant" },
                    { title: "Product" }, // ✅ New column
                    { title: "Price" },
                  ]}
                >
                  {p.variants.map((variant, index) => {
                    const isDisabled = !variant.availableForSale;

                    return (
                      <IndexTable.Row
                        id={variant.id}
                        key={variant.id}
                        position={index}
                        selected={selectedIds.includes(variant.id)}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          setSelectedIds((prev) =>
                            prev.includes(variant.id)
                              ? prev.filter((id) => id !== variant.id)
                              : [...prev, variant.id]
                          );
                        }}
                      >
                        <IndexTable.Cell>
                          <Thumbnail
                            source={
                              variant.image?.url ||
                              p.featuredImage?.url ||
                              ""
                            }
                            alt={
                              variant.image?.altText ||
                              variant.title ||
                              p.title
                            }
                            size="small"
                          />
                        </IndexTable.Cell>

                        {/* ✅ Variant title */}
                        <IndexTable.Cell>
                          <Text>{variant.title}</Text>
                        </IndexTable.Cell>

                        {/* ✅ Product name column */}
                        <IndexTable.Cell>
                          <Text tone="subdued">{p.title}</Text>
                        </IndexTable.Cell>

                        <IndexTable.Cell>
                          <Text tone={isDisabled ? "subdued" : "default"}>
                            ₹{variant.price}{" "}
                            {isDisabled ? "❌ Unavailable" : ""}
                          </Text>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    );
                  })}
                </IndexTable>
              </Box>
            ))}

          {!loading && products.length === 0 && (
            <Text tone="subdued">No products found.</Text>
          )}
        </TextContainer>
      </Modal.Section>
    </Modal>
  );
}
