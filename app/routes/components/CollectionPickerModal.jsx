// app/routes/components/CollectionPickerModal.jsx
import { useState, useEffect } from "react";
import {
  Modal,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  Spinner,
  Button,
} from "@shopify/polaris";

export default function CollectionPickerModal({
  open,
  onClose,
  initialSelected = [],
  onSelect,
}) {
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(initialSelected);

  useEffect(() => {
    if (!open) return;

    async function fetchCollections() {
      setLoading(true);
      try {
        const res = await fetch("/api/shopify-collections");
        const data = await res.json();

        // Expect data.collections = [{ id, title, image: { src or url } }]
        if (data.success && Array.isArray(data.collections)) {
          setCollections(data.collections);
        } else {
          setCollections([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch collections:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, [open]);

  const toggleSelection = (collection) => {
    setSelected((prev) => {
      const exists = prev.find((c) => c.id === collection.id);
      if (exists) {
        return prev.filter((c) => c.id !== collection.id);
      } else {
        return [...prev, collection];
      }
    });
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Collections"
      primaryAction={{
        content: "Add",
        onAction: handleConfirm,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <Spinner accessibilityLabel="Loading collections" />
        </div>
      ) : (
        <ResourceList
          resourceName={{ singular: "collection", plural: "collections" }}
          items={collections}
          renderItem={(item) => {
            const { id, title, image } = item;
            const selectedNow = selected.find((c) => c.id === id);
            const media = (
              <Thumbnail
                source={image?.url || image?.src || ""}
                alt={title}
                size="small"
              />
            );

            return (
              <ResourceItem
                id={id}
                media={media}
                accessibilityLabel={`Select ${title}`}
                onClick={() => toggleSelection(item)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text>{title}</Text>
                  {selectedNow && <Text tone="success">✓ Selected</Text>}
                </div>
              </ResourceItem>
            );
          }}
        />
      )}
    </Modal>
  );
}
