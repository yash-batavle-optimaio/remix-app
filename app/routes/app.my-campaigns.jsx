import {
  IndexTable,
  Text,
  Badge,
  Page,
  Spinner,
  Button,
  ButtonGroup,
  Card,
  Box,
  Popover,
  ActionList,
  InlineStack,
  Tooltip,
  Select,
  TextField,
  RangeSlider,
  ProgressBar,
  BlockStack,
  Layout,
} from "@shopify/polaris";
import { useEffect, useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import {
  DeleteIcon,
  PlusIcon,
  GiftCardIcon,
  CaretDownIcon,
  CaretUpIcon,
} from "@shopify/polaris-icons";
import { Icon } from "@shopify/polaris";
import ProductPickerModal from "./components/ProductPickerModal";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";
import CollectionPickerModal from "./components/CollectionPickerModal";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function CampaignIndexTable() {
  // ------------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------------
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingCampaign, setEditingCampaign] = useState(null);

  // "cart" | "quantity"
  const [selected, setSelected] = useState("cart");

  // goals array for tiered milestones
  const [goals, setGoals] = useState([]);

  // popover for "Add a new goal"
  const [active, setActive] = useState(false);

  // progress bar preview %
  const [progress, setProgress] = useState(50);

  // Gift product picker modal
  const [pickerOpen, setPickerOpen] = useState(false);

  // which goal is currently picking products
  const [currentGoal, setCurrentGoal] = useState(null);

  // BXGY picker mode: "buy" or "get"
  const [pickerType, setPickerType] = useState("get");

  const toggleActive = useCallback(() => setActive((prev) => !prev), []);

  const [status, setStatus] = useState("draft");
  const [name, setName] = useState("Cart Goal 6");

  // preview mock data
  const [currentCartValue, setCurrentCartValue] = useState(300); // INR
  const [currentCartQty, setCurrentCartQty] = useState(2); // items

  // SaveBar state
  const [saveBarOpen, setSaveBarOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const shopify = useAppBridge();

  // ------------------------------------------------------------------
  // LOAD CAMPAIGNS FROM METAFIELD
  // ------------------------------------------------------------------
  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const response = await fetch(
          "/api/my-campaign?namespace=optimaio_cart&key=campaigns"
        );
        const data = await response.json();
        if (
          data.success &&
          data.value &&
          Array.isArray(data.value.campaigns)
        ) {
          setCampaigns(data.value.campaigns);
        } else {
          setCampaigns([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch campaigns:", err);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, []);

  // ------------------------------------------------------------------
  // WHEN USER CLICKS "EDIT" ON A CAMPAIGN
  // load its fields into state for editing
  // ------------------------------------------------------------------
  useEffect(() => {
    if (editingCampaign) {
      const snap = {
        campaignName: editingCampaign.campaignName || "",
        status: editingCampaign.status || "draft",
        trackType: editingCampaign.trackType || "cart",
        goals: editingCampaign.goals || [],
        campaignType: editingCampaign.campaignType || "tiered", // <-- important for BXGY mode
      };

      setName(snap.campaignName);
      setStatus(snap.status);
      setGoals(snap.goals);
      setSelected(snap.trackType);
      setInitialSnapshot({
  campaignName: snap.campaignName,
  status: snap.status,
  trackType: snap.trackType,
  goals: snap.goals,
  campaignType: snap.campaignType,
});

      setSaveBarOpen(false);
    }
  }, [editingCampaign]);

  // ------------------------------------------------------------------
  // DETECT UNSAVED CHANGES
  // ------------------------------------------------------------------
// ------------------------------------------------------------------
// DETECT UNSAVED CHANGES (Only show when user actually edits something)
// ------------------------------------------------------------------
useEffect(() => {
  // Wait until the initial snapshot is fully set
  if (!initialSnapshot) return;

  const currentSnapshot = {
    campaignName: name,
    status,
    trackType: selected,
    goals,
    campaignType: editingCampaign?.campaignType || "tiered",
  };

  const changed =
    JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshot);

  // Only show SaveBar if there are *real* changes
  setSaveBarOpen(changed);
}, [name, status, selected, goals, initialSnapshot, editingCampaign]);


  // ------------------------------------------------------------------
  // SAVE CAMPAIGN
  // ------------------------------------------------------------------
  const handleSaveCampaign = async () => {
    const campaignData = {
      id: editingCampaign?.id || `cmp_${Date.now()}`,
      campaignName: name,
      status,
      trackType: selected,
      goals,
      campaignType: editingCampaign?.campaignType || "tiered",
    };

    const res = await fetch("/api/save-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campaignData),
    });

    const data = await res.json();
    if (data.ok) {
      setEditingCampaign(null);
      setCampaigns(data.campaigns);
      setInitialSnapshot(null);
      setSaveBarOpen(false);
      if (shopify?.saveBar) shopify.saveBar.hide("campaign-save-bar");
    } else {
      alert("❌ Failed to save campaign");
    }
  };

  // ------------------------------------------------------------------
  // DISCARD CAMPAIGN
  // ------------------------------------------------------------------
  const handleDiscardCampaign = () => {
    const confirmDiscard = window.confirm("Discard changes?");
    if (!confirmDiscard) return;
    setEditingCampaign(null);
    setInitialSnapshot(null);
    setSaveBarOpen(false);
    if (shopify?.saveBar) shopify.saveBar.hide("campaign-save-bar");
  };

  // ------------------------------------------------------------------
  // STATUS DROPDOWN OPTIONS
  // ------------------------------------------------------------------
  const statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Active", value: "active" },
  ];

  // ------------------------------------------------------------------
  // ADD NEW GOAL (tiered milestones mode)
  // ------------------------------------------------------------------
  const handleSelect = (type) => {
    // Build ID
    let prefix = "";
    if (type === "free_product") prefix = "GIFT";
    if (type === "order_discount") prefix = "OFF";
    if (type === "free_shipping") prefix = "SHIP";

    const num = Math.floor(10 + Math.random() * 990); // 10–999
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randLetters = (len) =>
      Array.from({ length: len }, () =>
        letters[Math.floor(Math.random() * letters.length)]
      ).join("");

    const letterCount = num.toString().length === 2 ? 4 : 3;
    const goalId = `${prefix}${num}${randLetters(letterCount)}`;

    // Base object
    let newGoal = { id: goalId, type };

    if (type === "free_product") {
      newGoal.giftQty = 1;
      newGoal.products = [];
    }

    if (type === "order_discount") {
      newGoal.discountType = "percentage";
      newGoal.discountValue = 10;
    }

    // free_shipping has no extra config initially

    setGoals((prev) => [...prev, newGoal]);
    setActive(false);
  };

  // popover activator button
  const activator = (
    <Button
      plain
      icon={<Icon source={PlusIcon} tone="base" />}
      onClick={toggleActive}
    >
      Add a new goal
    </Button>
  );

 
// BXGY EDITOR (Buy X Get Y) — Enhanced with Product / Collection / All Modes
// BXGY EDITOR (Buy X Get Y) — Clean, Logical Structure
const renderBxgyEditor = () => {
  const bxgyGoal =
    goals[0] || {
      id: `BXGY_${Date.now()}`,
      bxgyMode: "product", // "product" | "collection" | "all"
      buyQty: 1,
      buyProducts: [],
      buyCollections: [],
      getQty: 1,
      getProducts: [],
      discountType: "free_product",
      discountValue: 10,
    };

  if (!goals[0]) setGoals([bxgyGoal]);

  return (
    <Card sectioned>
      <Text variant="headingSm" fontWeight="bold">
        Buy X Get Y Type 
      </Text>

      {/* ---------------- Offer Type Selector ---------------- */}
      <div style={{ marginTop: "1rem" }}>
        {/* <Text fontWeight="bold">Buy X Get Y Type</Text> */}
        <ButtonGroup segmented>
  <Button
    pressed={bxgyGoal.bxgyMode === "product"}
    onClick={() =>
      setGoals((prev) => [
        {
          ...prev[0],
          bxgyMode: "product",
          // Keep collections, just clear if switching intentionally
          buyCollections:
            prev[0].bxgyMode === "collection" ? prev[0].buyCollections : prev[0].buyCollections,
        },
      ])
    }
  >
    Product-based
  </Button>

  <Button
  pressed={bxgyGoal.bxgyMode === "spend_any_collection"}
  onClick={() =>
    setGoals((prev) => [
      {
        ...prev[0],
        bxgyMode: "spend_any_collection",
        spendAmount: prev[0].spendAmount || 0,
        minQty: prev[0].minQty || 1,
        buyCollections: prev[0].buyCollections || [],
      },
    ])
  }
>
  Spend X on Any Collection
</Button>


  <Button
    pressed={bxgyGoal.bxgyMode === "collection"}
    onClick={() =>
      setGoals((prev) => [
        {
          ...prev[0],
          bxgyMode: "collection",
          // Keep products unless switching from product mode
          buyProducts:
            prev[0].bxgyMode === "product" ? prev[0].buyProducts : prev[0].buyProducts,
        },
      ])
    }
  >
    Collection-based
  </Button>

  <Button
    pressed={bxgyGoal.bxgyMode === "all"}
    onClick={() =>
      setGoals((prev) => [
        {
          ...prev[0],
          bxgyMode: "all",
          // Keep data but clarify no manual selection needed
          buyProducts: prev[0].buyProducts || [],
          buyCollections: prev[0].buyCollections || [],
        },
      ])
    }
  >
    Storewide (All Products)
  </Button>
</ButtonGroup>

      </div>

      {/* ---------------- BUY SECTION ---------------- */}
      <div style={{ marginTop: "1.5rem" }}>

        {bxgyGoal.bxgyMode !== "spend_any_collection" && (
        <Text variant="headingSm" fontWeight="bold">
          Buy Requirements (X)
        </Text>
        )}

{bxgyGoal.bxgyMode !== "spend_any_collection" && (
<div style={{ marginBottom: "1rem" }}>
        <TextField
          label="Buy Quantity (X)"
          type="number"
          value={bxgyGoal.buyQty}
          onChange={(val) => setGoals([{ ...bxgyGoal, buyQty: Number(val) }])}
        />
</div>
)}
        {bxgyGoal.bxgyMode === "product" && (
          <>
            <Button
              primary
              onClick={() => {
                setPickerType("buy");
                setPickerOpen(true);
                setCurrentGoal(bxgyGoal.id);
              }}
              style={{ marginTop: "0.75rem" }}
            >
              Select Buy Products
            </Button>

            {(bxgyGoal.buyProducts || []).length > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                {(bxgyGoal.buyProducts || []).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid #eee",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      marginBottom: "0.5rem",
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <img
                        src={p.image?.url || p.productImage?.url || ""}
                        alt={p.title}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "4px",
                          objectFit: "cover",
                        }}
                      />
                      <Text>{p.title}</Text>
                    </div>
                    <Button
                      plain
                      destructive
                      icon={<Icon source={DeleteIcon} />}
                      onClick={() =>
                        setGoals([
                          {
                            ...bxgyGoal,
                            buyProducts: (bxgyGoal.buyProducts || []).filter(
                              (bp) => bp.id !== p.id
                            ),
                          },
                        ])
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {bxgyGoal.bxgyMode === "spend_any_collection" && (
  <div style={{ marginTop: "1.5rem" }}>
    <Text variant="headingSm" fontWeight="bold">
      Spend X on Any Collection
    </Text>

    {/* Spend threshold */}
    <TextField
      label="Minimum Spend (₹)"
      type="number"
      value={bxgyGoal.spendAmount || 0}
      onChange={(val) =>
        setGoals([{ ...bxgyGoal, spendAmount: Number(val) }])
      }
      helpText="Customer must spend at least this amount in selected collections."
    />

    {/* Select collections */}
    <Button
      primary
      onClick={() => {
        setPickerType("collection");
        setPickerOpen(true);
        setCurrentGoal(bxgyGoal.id);
      }}
      style={{ marginTop: "0.75rem" }}
    >
      Select Eligible Collections
    </Button>

    {(bxgyGoal.buyCollections || []).length > 0 && (
      <div style={{ marginTop: "0.75rem" }}>
        {(bxgyGoal.buyCollections || []).map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #eee",
              borderRadius: "6px",
              padding: "8px 12px",
              marginBottom: "0.5rem",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img
                src={c.image?.url || c.image?.src || ""}
                alt={c.title}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "4px",
                  objectFit: "cover",
                }}
              />
              <Text>{c.title}</Text>
            </div>
            <Button
              plain
              destructive
              icon={<Icon source={DeleteIcon} />}
              onClick={() =>
                setGoals([
                  {
                    ...bxgyGoal,
                    buyCollections: bxgyGoal.buyCollections.filter(
                      (col) => col.id !== c.id
                    ),
                  },
                ])
              }
            />
          </div>
        ))}
      </div>
    )}
  </div>
)}


        {bxgyGoal.bxgyMode === "collection" && (
          <>
            <Button
              primary
              onClick={() => {
                setPickerType("collection");
                setPickerOpen(true);
                setCurrentGoal(bxgyGoal.id);
              }}
              style={{ marginTop: "0.75rem" }}
            >
              Select Buy Collections
            </Button>

            {(bxgyGoal.buyCollections || []).length > 0 && (
  <div style={{ marginTop: "0.75rem" }}>
    {(bxgyGoal.buyCollections || []).map((c) => (
      <div
        key={c.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid #eee",
          borderRadius: "6px",
          padding: "8px 12px",
          marginBottom: "0.5rem",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={c.image?.url || c.image?.src || ""}
            alt={c.title}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "4px",
              objectFit: "cover",
            }}
          />
          <Text>{c.title}</Text>
        </div>

        <Button
          plain
          destructive
          icon={<Icon source={DeleteIcon} />}
          onClick={() =>
            setGoals([
              {
                ...bxgyGoal,
                buyCollections: (bxgyGoal.buyCollections || []).filter(
                  (col) => col.id !== c.id
                ),
              },
            ])
          }
        />
      </div>
    ))}
  </div>
)}

          </>
        )}

        {bxgyGoal.bxgyMode === "all" && (
          <Box padding="200" tone="subdued">
            <Text>Applies to all store products — no selection needed.</Text>
          </Box>
        )}
      </div>

      {/* ---------------- GET SECTION (Always visible) ---------------- */}
      {/* ---------------- GET SECTION (Always visible) ---------------- */}
<div style={{ marginTop: "1.5rem" }}>
  <Text variant="headingSm" fontWeight="bold">
    Get Reward (Y)
  </Text>

<div style={{ marginBottom: "1rem" }}>
  <TextField
    label="Get Quantity (Y)"
    type="number"
    value={bxgyGoal.getQty}
    onChange={(val) => setGoals([{ ...bxgyGoal, getQty: Number(val) }])}
  />
</div>
  <Button
    primary
    onClick={() => {
      setPickerType("get");
      setPickerOpen(true);
      setCurrentGoal(bxgyGoal.id);
    }}
    style={{ marginTop: "0.75rem" }}
  >
    Select Reward Products
  </Button>

  {(bxgyGoal.getProducts || []).length > 0 && (
    <div style={{ marginTop: "0.75rem" }}>
      {(bxgyGoal.getProducts || []).map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: "1px solid #eee",
            borderRadius: "6px",
            padding: "8px 12px",
            marginBottom: "0.5rem",
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img
              src={p.image?.url || p.productImage?.url || ""}
              alt={p.title}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "4px",
                objectFit: "cover",
              }}
            />
            <Text>{p.title}</Text>
          </div>

          <Button
            plain
            destructive
            icon={<Icon source={DeleteIcon} />}
            onClick={() =>
              setGoals([
                {
                  ...bxgyGoal,
                  getProducts: (bxgyGoal.getProducts || []).filter(
                    (gp) => gp.id !== p.id
                  ),
                },
              ])
            }
          />
        </div>
      ))}
    </div>
  )}
</div>


      {/* ---------------- DISCOUNT SECTION ---------------- */}
      {/* ---------------- DISCOUNT SECTION ---------------- */}
<div style={{ marginTop: "1.5rem" }}>
  <Text fontWeight="bold">Discount Type</Text>

  <ButtonGroup segmented>
    {/* 🥇 Free Product First */}
    <Button
      pressed={bxgyGoal.discountType === "free_product"}
      onClick={() =>
        setGoals([{ ...bxgyGoal, discountType: "free_product", discountValue: 100 }])
      }
    >
      Free Product (100% Off)
    </Button>

    <Button
      pressed={bxgyGoal.discountType === "percentage"}
      onClick={() =>
        setGoals([{ ...bxgyGoal, discountType: "percentage", discountValue: 10 }])
      }
    >
      Percentage
    </Button>

    <Button
      pressed={bxgyGoal.discountType === "fixed"}
      onClick={() =>
        setGoals([{ ...bxgyGoal, discountType: "fixed", discountValue: 100 }])
      }
    >
      Fixed Amount
    </Button>
  </ButtonGroup>

  {/* Hide field if "Free Product" is selected */}
  {bxgyGoal.discountType !== "free_product" && (
    <Box paddingBlockStart="400">
      <TextField
        label="Discount Value"
        prefix={bxgyGoal.discountType === "fixed" ? "INR" : "%"}
        type="number"
        value={bxgyGoal.discountValue || ""}
        onChange={(val) =>
          setGoals([{ ...bxgyGoal, discountValue: Number(val) }])
        }
      />
    </Box>
  )}

  {/* Friendly note when Free Product is active */}
  {bxgyGoal.discountType === "free_product" && (
    <Box
      padding="400"
      background="bg-subdued"
      borderRadius="200"
      marginTop="400"
    >
      <Text tone="subdued">
        🎁 All selected reward products will be completely free for the customer.
      </Text>
    </Box>
  )}
</div>


      {/* ---------------- MODALS ---------------- */}
      {pickerType === "collection" ? (
        <CollectionPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          initialSelected={bxgyGoal.buyCollections || []}
          onSelect={(selectedCollections) =>
            setGoals([{ ...bxgyGoal, buyCollections: selectedCollections }])
          }
        />
      ) : (
        <ProductPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          initialSelected={
            bxgyGoal[
              pickerType === "buy" ? "buyProducts" : "getProducts"
            ] || []
          }
          onSelect={(selectedVariants) => {
            setGoals([
              {
                ...bxgyGoal,
                [pickerType === "buy" ? "buyProducts" : "getProducts"]:
                  selectedVariants,
              },
            ]);
          }}
        />
      )}
    </Card>
  );
};




  // ------------------------------------------------------------------
  // EDIT VIEW
  // ------------------------------------------------------------------
  if (editingCampaign) {
    const isBxgy = editingCampaign?.campaignType === "bxgy";

    return (
      <Page
        title="Edit Campaign"
        backAction={{
          content: "Back",
          onAction: () => setEditingCampaign(null),
        }}
      >
        <Layout>
          {/* -------------------------------------------------
             LEFT SECTION
          ------------------------------------------------- */}
          <Layout.Section>
            {!isBxgy && (
              <Card sectioned>
                <Text variant="bodyLg" fontWeight="bold">
                  Campaign ID:
                </Text>
                <Text>{editingCampaign.id}</Text>

                {/* Tracking Section */}
                <div style={{ marginTop: "1rem" }}>
                  <Text variant="headingMd" as="h6" tone="subdued">
                    Choose what to track
                  </Text>
                  <Box
                    padding="100"
                    borderRadius="200"
                    background="bg-subdued"
                  >
                    <ButtonGroup segmented>
                      <Button
                        pressed={selected === "cart"}
                        onClick={() => setSelected("cart")}
                      >
                        Total cart value
                      </Button>
                      <Button
                        pressed={selected === "quantity"}
                        onClick={() => setSelected("quantity")}
                      >
                        Product quantity
                      </Button>
                    </ButtonGroup>
                  </Box>
                </div>

                {/* Milestones Section */}
                <div style={{ marginTop: "1.5rem" }}>
                  <Text variant="headingMd" as="h3" fontWeight="bold">
                    Milestones
                  </Text>
                  <Text tone="subdued">
                    Setup the target value and reward for each milestone
                  </Text>

                  {/* Add goal button */}
                  <div style={{ marginTop: "1rem" }}>
                    <Popover
                      active={active}
                      activator={activator}
                      onClose={toggleActive}
                    >
                      <ActionList
                        items={[
                          {
                            content: "Free product",
                            onAction: () => handleSelect("free_product"),
                          },
                          {
                            content: "Order discount",
                            onAction: () => handleSelect("order_discount"),
                          },
                          {
                            content: "Free shipping",
                            onAction: () => handleSelect("free_shipping"),
                          },
                        ]}
                      />
                    </Popover>
                  </div>

                  {/* Render all goals (full original milestone editor UI) */}
                  {goals.map((goal, index) => (
                    <div key={goal.id} style={{ marginTop: "1rem" }}>
                      <Layout>
                        {/* 🔹 Left Side: Goal Input */}
                        <Layout.Section>
                          <InlineStack>
                            <Layout.Section secondary>
                              <div style={{ width: "120px" }}>
                                <Text
                                  variant="bodyMd"
                                  tone="subdued"
                                >
                                  {index + 1}st goal
                                </Text>

                                <TextField
                                  label=""
                                  type="number"
                                  value={goal.target || ""}
                                  prefix={
                                    selected === "cart" ? "INR" : "Qty"
                                  }
                                  onChange={(val) =>
                                    setGoals((prev) =>
                                      prev.map((g) =>
                                        g.id === goal.id
                                          ? {
                                            ...g,
                                            target: Number(val),
                                          }
                                          : g
                                      )
                                    )
                                  }
                                />
                              </div>
                            </Layout.Section>

                            {/* 🔹 Right Side: Goal Card */}
                            <Layout.Section>
                              <Card sectioned>
                                {/* Header Row */}
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent:
                                      "space-between",
                                    alignItems: "center",
                                    borderBottom:
                                      "1px solid #eee",
                                    padding:
                                      "0.75rem 1rem",
                                  }}
                                >
                                  <BlockStack gap="100">
                                    <Text
                                      variant="headingSm"
                                      as="h3"
                                      fontWeight="bold"
                                    >
                                      {goal.type ===
                                        "free_product" &&
                                        "Free product"}
                                      {goal.type ===
                                        "order_discount" &&
                                        "Order discount"}
                                      {goal.type ===
                                        "free_shipping" &&
                                        "Free shipping"}
                                    </Text>

                                    <Text
                                      tone="subdued"
                                    >
                                      ID: {goal.id}
                                    </Text>
                                  </BlockStack>

                                  <ButtonGroup>
                                    <Button plain>
                                      Done
                                    </Button>
                                    <Tooltip content="Delete">
                                      <Button
                                        tone="critical"
                                        onClick={() =>
                                          setGoals(
                                            (prev) =>
                                              prev.filter(
                                                (g) =>
                                                  g.id !==
                                                  goal.id
                                              )
                                          )
                                        }
                                        icon={
                                          <Icon
                                            source={
                                              DeleteIcon
                                            }
                                            tone="base"
                                          />
                                        }
                                      />
                                    </Tooltip>
                                  </ButtonGroup>
                                </div>

                                {/* Content Section */}
                                <div
                                  style={{
                                    padding: "1rem",
                                  }}
                                >
                                  {/* FREE PRODUCT */}
                                  {goal.type ===
                                    "free_product" && (
                                      <>
                                        <Text fontWeight="bold">
                                          Select
                                          products to
                                          give as free
                                          gifts
                                        </Text>

                                        <div
                                          style={{
                                            marginTop:
                                              "0.5rem",
                                          }}
                                        >
                                          <Button
                                            primary
                                            onClick={() => {
                                              setCurrentGoal(
                                                goal.id
                                              );
                                              setPickerType(
                                                "get"
                                              ); // free gift selection is "get"
                                              setPickerOpen(
                                                true
                                              );
                                            }}
                                          >
                                            Add a product
                                          </Button>
                                        </div>

                                        <div
                                          style={{
                                            marginTop:
                                              "1.5rem",
                                          }}
                                        >
                                          <InlineStack
                                            gap="200"
                                            align="center"
                                          >
                                            <Text>
                                              How many
                                              gifts can
                                              they choose?
                                            </Text>
                                            <Tooltip content="Number of gifts a customer can pick">
                                              <Text tone="subdued">
                                                ?
                                              </Text>
                                            </Tooltip>
                                          </InlineStack>

                                          <div
                                            style={{
                                              marginTop:
                                                "0.75rem",
                                            }}
                                          >
                                            <ButtonGroup>
                                              <Button
                                                onClick={() =>
                                                  setGoals(
                                                    (
                                                      prev
                                                    ) =>
                                                      prev.map(
                                                        (
                                                          g
                                                        ) =>
                                                          g.id ===
                                                            goal.id
                                                            ? {
                                                              ...g,
                                                              giftQty:
                                                                Math.max(
                                                                  1,
                                                                  g.giftQty -
                                                                  1
                                                                ),
                                                            }
                                                            : g
                                                      )
                                                  )
                                                }
                                              >
                                                −
                                              </Button>

                                              <Button disabled>
                                                {goal.giftQty}
                                              </Button>

                                              <Button
                                                onClick={() =>
                                                  setGoals(
                                                    (
                                                      prev
                                                    ) =>
                                                      prev.map(
                                                        (
                                                          g
                                                        ) =>
                                                          g.id ===
                                                            goal.id
                                                            ? {
                                                              ...g,
                                                              giftQty:
                                                                g.giftQty +
                                                                1,
                                                            }
                                                            : g
                                                      )
                                                  )
                                                }
                                              >
                                                +
                                              </Button>
                                            </ButtonGroup>
                                          </div>
                                        </div>
                                      </>
                                    )}

                                  {/* Render product rows */}
                                  {goal.products &&
                                    goal.products
                                      .length >
                                    0 && (
                                      <div
                                        style={{
                                          marginTop:
                                            "1rem",
                                        }}
                                      >
                                        {goal.products.map(
                                          (v) => (
                                            <div
                                              key={
                                                v.id
                                              }
                                              style={{
                                                display:
                                                  "flex",
                                                alignItems:
                                                  "center",
                                                justifyContent:
                                                  "space-between",
                                                border:
                                                  "1px solid #eee",
                                                borderRadius:
                                                  "6px",
                                                padding:
                                                  "8px 12px",
                                                marginBottom:
                                                  "0.5rem",
                                                background:
                                                  "#fff",
                                              }}
                                            >
                                              {/* Thumbnail + Title */}
                                              <div
                                                style={{
                                                  display:
                                                    "flex",
                                                  alignItems:
                                                    "center",
                                                  gap: "8px",
                                                }}
                                              >
                                                <img
                                                  src={
                                                    v
                                                      .image
                                                      ?.url ||
                                                    v
                                                      .productImage
                                                      ?.url ||
                                                    ""
                                                  }
                                                  alt={
                                                    v
                                                      .image
                                                      ?.altText ||
                                                    v
                                                      .productImage
                                                      ?.altText ||
                                                    v.title
                                                  }
                                                  style={{
                                                    width:
                                                      "32px",
                                                    height:
                                                      "32px",
                                                    borderRadius:
                                                      "4px",
                                                    objectFit:
                                                      "cover",
                                                  }}
                                                />
                                                <Text>
                                                  {v.productTitle
                                                    ? `${v.productTitle} — ${v.title}`
                                                    : v.title}
                                                </Text>
                                              </div>

                                              {/* Delete button */}
                                              <Button
                                                plain
                                                destructive
                                                icon={
                                                  <Icon
                                                    source={
                                                      DeleteIcon
                                                    }
                                                  />
                                                }
                                                onClick={() =>
                                                  setGoals(
                                                    (
                                                      prev
                                                    ) =>
                                                      prev.map(
                                                        (
                                                          g
                                                        ) =>
                                                          g.id ===
                                                            goal.id
                                                            ? {
                                                              ...g,
                                                              products:
                                                                g.products.filter(
                                                                  (
                                                                    prod
                                                                  ) =>
                                                                    prod.id !==
                                                                    v.id
                                                                ),
                                                            }
                                                            : g
                                                      )
                                                  )
                                                }
                                              />
                                            </div>
                                          )
                                        )}

                                        {/* Add more button */}
                                        <Button
                                          plain
                                          icon={
                                            <Icon
                                              source={
                                                PlusIcon
                                              }
                                            />
                                          }
                                          onClick={() => {
                                            setCurrentGoal(
                                              goal.id
                                            );
                                            setPickerType(
                                              "get"
                                            );
                                            setPickerOpen(
                                              true
                                            );
                                          }}
                                        >
                                          Add more to
                                          the list
                                        </Button>
                                      </div>
                                    )}

                                  {/* ORDER DISCOUNT */}
                                  {goal.type ===
                                    "order_discount" && (
                                      <div>
                                        <Text fontWeight="bold">
                                          Type of order
                                          discount
                                        </Text>

                                        <div
                                          style={{
                                            marginTop:
                                              "0.5rem",
                                          }}
                                        >
                                          <ButtonGroup segmented>
                                            <Button
                                              pressed={
                                                goal.discountType ===
                                                "percentage"
                                              }
                                              onClick={() =>
                                                setGoals(
                                                  (
                                                    prev
                                                  ) =>
                                                    prev.map(
                                                      (
                                                        g
                                                      ) =>
                                                        g.id ===
                                                          goal.id
                                                          ? {
                                                            ...g,
                                                            discountType:
                                                              "percentage",
                                                          }
                                                          : g
                                                    )
                                                )
                                              }
                                            >
                                              Percentage
                                              off
                                            </Button>

                                            <Button
                                              pressed={
                                                goal.discountType ===
                                                "amount"
                                              }
                                              onClick={() =>
                                                setGoals(
                                                  (
                                                    prev
                                                  ) =>
                                                    prev.map(
                                                      (
                                                        g
                                                      ) =>
                                                        g.id ===
                                                          goal.id
                                                          ? {
                                                            ...g,
                                                            discountType:
                                                              "amount",
                                                          }
                                                          : g
                                                    )
                                                )
                                              }
                                            >
                                              Amount off
                                            </Button>
                                          </ButtonGroup>
                                        </div>

                                        <div
                                          style={{
                                            marginTop:
                                              "1rem",
                                          }}
                                        >
                                          <Text fontWeight="bold">
                                            Enter the
                                            value
                                          </Text>

                                          <TextField
                                            prefix={
                                              goal.discountType ===
                                                "amount"
                                                ? "INR"
                                                : "%"
                                            }
                                            type="number"
                                            value={
                                              goal.discountValue ||
                                              ""
                                            }
                                            onChange={(val) =>
                                              setGoals(
                                                (
                                                  prev
                                                ) =>
                                                  prev.map(
                                                    (
                                                      g
                                                    ) =>
                                                      g.id ===
                                                        goal.id
                                                        ? {
                                                          ...g,
                                                          discountValue:
                                                            val,
                                                        }
                                                        : g
                                                  )
                                              )
                                            }
                                          />
                                        </div>
                                      </div>
                                    )}

                                  {/* FREE SHIPPING */}
                                  {goal.type ===
                                    "free_shipping" && (
                                      <Text>
                                        🚚 Free
                                        shipping will
                                        be applied
                                        automatically.
                                      </Text>
                                    )}
                                </div>
                              </Card>
                            </Layout.Section>
                          </InlineStack>
                        </Layout.Section>
                      </Layout>
                    </div>
                  ))}
                </div>

                {/* ⬇️ ProductPickerModal for tiered free gifts */}
                <ProductPickerModal
                  open={pickerOpen}
                  onClose={() => setPickerOpen(false)}
                  initialSelected={
                    goals.find((g) => g.id === currentGoal)?.products ||
                    []
                  }
                  onSelect={(selectedVariants) => {
                    setGoals((prev) =>
                      prev.map((g) =>
                        g.id === currentGoal
                          ? {
                            ...g,
                            products: selectedVariants,
                          }
                          : g
                      )
                    );
                  }}
                />
              </Card>
            )}

            {/* BXGY block (single rule). Shown only if campaignType is bxgy */}
            {isBxgy && (
              <>
                {renderBxgyEditor()}

                {/* Picker for BXGY: can assign buyProducts/getProducts */}
                
              </>
            )}
          </Layout.Section>

          {/* -------------------------------------------------
             RIGHT SIDE (Preview / Settings)
          ------------------------------------------------- */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Status + Name card (always) */}
              <Card>
                <div style={{ padding: "1rem" }}>
                  <Select
                    label="Status"
                    options={statusOptions}
                    onChange={setStatus}
                    value={status}
                  />

                  <div style={{ marginTop: "1rem" }}>
                    <TextField
                      label="Campaign name"
                      value={name}
                      onChange={setName}
                    />
                  </div>
                </div>
              </Card>

              {/* BXGY Summary card (only in bxgy mode) */}
              {isBxgy && (
                <Card>
                  <Box
                    padding="400"
                    borderBottomWidth="1"
                    borderColor="border-subdued"
                  >
                    <Text
                      variant="headingSm"
                      as="h3"
                      fontWeight="bold"
                    >
                      Buy X Get Y Summary
                    </Text>
                  </Box>

                  <Box padding="400">
                    {(() => {
                      const g = goals[0] || {};
                      return (
                        <Text>
                          Buy{" "}
                          <strong>{g.buyQty || 1}</strong>{" "}
                          item(s) → Get{" "}
                          <strong>{g.getQty || 1}</strong>{" "}
                          item(s)
                          <br />
                          Discount:{" "}
                          <strong>
                            {g.discountValue || 0}
                            {g.discountType === "fixed"
                              ? " INR off"
                              : "% off"}
                          </strong>
                        </Text>
                      );
                    })()}
                  </Box>
                </Card>
              )}

              {/* Original Preview card (only for non-bxgy) */}
              {!isBxgy && (
                <Card>
                  <Box
                    padding="400"
                    borderBottomWidth="1"
                    borderColor="border-subdued"
                  >
                    <Text
                      variant="headingSm"
                      as="h3"
                      fontWeight="bold"
                    >
                      Preview
                    </Text>
                  </Box>

                  <Box padding="400">
                    {/* Dynamic Remaining Text */}
                    {selected === "cart" && goals[0]?.target ? (
                      <Text>
                        {currentCartValue >= goals[0].target ? (
                          <>🎉 Goal reached!</>
                        ) : (
                          <>
                            Add{" "}
                            <strong>
                              ₹
                              {goals[0].target -
                                currentCartValue}
                            </strong>{" "}
                            more to unlock a reward
                          </>
                        )}
                      </Text>
                    ) : selected === "quantity" &&
                      goals[0]?.target ? (
                      <Text>
                        {currentCartQty >=
                          goals[0].target ? (
                          <>🎉 Goal reached!</>
                        ) : (
                          <>
                            Add{" "}
                            <strong>
                              {goals[0].target -
                                currentCartQty}{" "}
                              more items
                            </strong>{" "}
                            to unlock a reward
                          </>
                        )}
                      </Text>
                    ) : (
                      <Text>
                        Select a goal to start
                        tracking
                      </Text>
                    )}

                    {/* Progress Bar */}
                    <div
                      style={{
                        margin: "1rem 0",
                      }}
                    >
                      <ProgressBar
                        progress={progress}
                        size="medium"
                      />
                    </div>

                    {/* Render milestones from goals */}
                    <InlineStack
                      gap="loose"
                      align="center"
                      blockAlign="center"
                      justify="space-between"
                    >
                      {goals.map((goal) => {
                        let label = "";

                        if (
                          goal.type ===
                          "free_product"
                        ) {
                          label = "Free Gift!";
                        } else if (
                          goal.type ===
                          "free_shipping"
                        ) {
                          label = "Free Shipping";
                        } else if (
                          goal.type ===
                          "order_discount"
                        ) {
                          if (
                            goal.discountType ===
                            "percentage"
                          ) {
                            label = `${goal.discountValue ||
                              0
                              }% Off`;
                          } else if (
                            goal.discountType ===
                            "amount"
                          ) {
                            label = `INR ${goal.discountValue ||
                              0
                              } Off`;
                          }
                        }

                        return (
                          <div
                            key={goal.id}
                            style={{
                              textAlign:
                                "center",
                              flex: 1,
                            }}
                          >
                            <Icon
                              source={
                                GiftCardIcon
                              }
                              tone="base"
                            />
                            <Text variant="bodySm">
                              {label}
                            </Text>
                          </div>
                        );
                      })}
                    </InlineStack>
                  </Box>

                  <Box
                    padding="400"
                    borderTopWidth="1"
                    borderColor="border-subdued"
                    background="bg-surface"
                  >
                    <Text>
                      Use this to adjust the
                      progress bar
                    </Text>

                    <RangeSlider
                      min={0}
                      max={100}
                      value={progress}
                      onChange={setProgress}
                      output
                    />
                  </Box>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>
        </Layout>

        <Box paddingBlockEnd="600" />

        <SaveBar
          id="campaign-save-bar"
          open={saveBarOpen}
          discardConfirmation
        >
          <button
            variant="primary"
            onClick={handleSaveCampaign}
            disabled={!saveBarOpen}
          >
            Save
          </button>
          <button onClick={handleDiscardCampaign}>
            Discard
          </button>
        </SaveBar>
      </Page>
    );
  }

  // ------------------------------------------------------------------
  // REORDER PRIORITY HELPERS (list view)
  // ------------------------------------------------------------------
  async function saveCampaignOrder(updatedCampaigns) {
    try {
      const res = await fetch("/api/update-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: updatedCampaigns }),
      });

      const data = await res.json();
      if (data.ok || data.success) {
        console.log("✅ Campaign order saved");
      } else {
        console.error("❌ Failed to save campaign order");
      }
    } catch (error) {
      console.error("⚠️ Error saving order:", error);
    }
  }

  const handlePriorityUp = (index) => {
    if (index === 0) return; // already at top
    setCampaigns((prev) => {
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index - 1],
      ];
      saveCampaignOrder(newOrder);
      console.log("handlePriorityUp :", index);
      return newOrder;
    });
  };

  const handlePriorityDown = (index) => {
    setCampaigns((prev) => {
      if (index === prev.length - 1) return prev; // already bottom
      const newOrder = [...prev];
      [newOrder[index + 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index + 1],
      ];
      saveCampaignOrder(newOrder);
      console.log("handlePriorityDown :", index);
      return newOrder;
    });
  };

  // ------------------------------------------------------------------
  // LIST VIEW
  // ------------------------------------------------------------------
  const resourceName = { singular: "campaign", plural: "campaigns" };

  const rowMarkup = campaigns.map((c, index) => (
    <IndexTable.Row
      id={`row-${index}`}
      key={index}
      position={index}
    >
      <IndexTable.Cell>
        <Text fontWeight="bold">{c.campaignName}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        {c.status === "active" ? (
          <Badge tone="success">Active</Badge> // 🟢 Green for Active
        ) : (
          <Badge tone="info">Draft</Badge> // 🔵 Blue for Draft
        )}
      </IndexTable.Cell>

      <IndexTable.Cell>
        <ButtonGroup>
          <Button onClick={() => setEditingCampaign(c)}>
            Edit
          </Button>

          <Button
            tone="critical"
            onClick={async () => {
              const res = await fetch(
                "/api/delete-campaign",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    namespace:
                      "optimaio_cart",
                    key: "campaigns",
                    id: c.id,
                  }),
                }
              );
              const data = await res.json();
              if (data.success) {
                setCampaigns(data.campaigns);
              }
            }}
          >
            Delete
          </Button>
        </ButtonGroup>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <ButtonGroup>
          {/* Priority arrows */}
          <InlineStack
            gap="0"
            align="center"
          >
            <Button
              icon={CaretUpIcon}
              variant="tertiary"
              onClick={() =>
                handlePriorityUp(index)
              }
              accessibilityLabel="Move up"
              disabled={index === 0}
            />
            <Text
              variant="bodySm"
              tone="subdued"
            >
              {index + 1}
            </Text>
            <Button
              icon={CaretDownIcon}
              variant="tertiary"
              onClick={() =>
                handlePriorityDown(index)
              }
              accessibilityLabel="Move down"
              disabled={
                index === campaigns.length - 1
              }
            />
          </InlineStack>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page title="Campaigns">
      {loading ? (
        <Spinner
          accessibilityLabel="Loading campaigns"
          size="large"
        />
      ) : (
        <IndexTable
          resourceName={resourceName}
          itemCount={campaigns.length}
          selectable={false}
          headings={[
            { title: "Campaign Goal" },
            { title: "Status" },
            { title: "Action" },
            { title: "Priority" },
          ]}
        >
          {rowMarkup}
        </IndexTable>
      )}
    </Page>
  );
}
