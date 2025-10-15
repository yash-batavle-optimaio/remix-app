import {
  Modal,
  TextContainer,
  IndexTable,
  Text,
  Thumbnail,
  Box,
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

  useEffect(() => {
    if (open) {
      setSelectedIds(initialSelected.map((p) => p.id));
      (async () => {
        try {
          const res = await fetch("/api/products");
          const data = await res.json();
          if (Array.isArray(data)) setProducts(data);
          else setProducts([]);
        } catch (err) {
          console.error("❌ Failed to load products:", err);
          setProducts([]);
        }
      })();
    }
  }, [open, initialSelected]);

  // Build nested rows
  const nestedMarkup = products.map((p) => (
    <Box key={p.id} padding="200" borderBlockEndWidth="1" borderColor="border-subdued">
      {/* Product Heading */}
      <Text variant="headingSm" fontWeight="bold" as="h3" tone="subdued">
        {p.title}
      </Text>

      {/* Variants Table */}
      <IndexTable
        resourceName={{ singular: "variant", plural: "variants" }}
        itemCount={p.variants.length}
        selectedItemsCount={selectedIds.length}
        headings={[
          { title: "Image" },
          { title: "Variant" },
          { title: "Price" },
        ]}
      >
        {p.variants.map((variant, index) => (
          <IndexTable.Row
            id={variant.id}
            key={variant.id}
            position={index}
            selected={selectedIds.includes(variant.id)}
            onClick={() =>
              setSelectedIds((prev) =>
                prev.includes(variant.id)
                  ? prev.filter((id) => id !== variant.id)
                  : [...prev, variant.id]
              )
            }
          >
            <IndexTable.Cell>
              <Thumbnail
                source={variant.image?.url || p.featuredImage?.url || ""}
                alt={
                  variant.image?.altText ||
                  p.featuredImage?.altText ||
                  variant.title
                }
                size="small"
              />
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text>{variant.title}</Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text>
                ₹{variant.price} {variant.availableForSale ? "✔️" : "❌"}
              </Text>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
    </Box>
  ));

  // Collect all selected variants for "Select" action
  const allVariants = products.flatMap((p) => p.variants);

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
      {/* 🔹 Global Selection Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
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
            onClick={() => setSelectedIds([])} // ✅ clear all
          >
            Clear all
          </button>
        )}
      </div>

      {/* 🔹 Nested Tables */}
      {products.map((p) => (
        <div key={p.id} style={{ marginBottom: "2rem" }}>
          <Text variant="headingMd">{p.title}</Text>

          <IndexTable
            resourceName={{ singular: "variant", plural: "variants" }}
            itemCount={p.variants.length}
            selectedItemsCount={
              p.variants.filter((v) => selectedIds.includes(v.id)).length
            }
            headings={[
              { title: "Image" },
              { title: "Variant" },
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
      disabled={isDisabled} // ✅ disables row + checkbox
      onClick={() => {
        if (isDisabled) return; // block selection logic
        setSelectedIds((prev) =>
          prev.includes(variant.id)
            ? prev.filter((id) => id !== variant.id)
            : [...prev, variant.id]
        );
      }}
    >
      <IndexTable.Cell>
        <Thumbnail
          source={variant.image?.url || p.featuredImage?.url || ""}
          alt={variant.image?.altText || variant.title}
          size="small"
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text>{variant.title}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text tone={isDisabled ? "subdued" : "default"}>
          ₹{variant.price}{" "}
          {isDisabled ? "❌ Unavailable" : ""} 
          {/* ✔️ Available */}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
})}


          </IndexTable>
        </div>
      ))}
    </TextContainer>
  </Modal.Section>
</Modal>

  );
}
