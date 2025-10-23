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
  InlineGrid,
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
  DeleteIcon, PlusCircleIcon,  PlusIcon,  GiftCardIcon,   CaretDownIcon, CaretUpIcon
} from '@shopify/polaris-icons';
import { Icon } from "@shopify/polaris";
import ProductPickerModal from "./components/ProductPickerModal";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function CampaignIndexTable() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selected, setSelected] = useState("cart");
  const [goals, setGoals] = useState([]); // 🔹 store multiple goals
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(50); // slider control (0–100)
   const [pickerOpen, setPickerOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(null);
  const toggleActive = useCallback(() => setActive((active) => !active), []);
    const [status, setStatus] = useState("draft");
  const [name, setName] = useState("Cart Goal 6");
// Example values (replace with real cart data later)
const [currentCartValue, setCurrentCartValue] = useState(300); // INR
const [currentCartQty, setCurrentCartQty] = useState(2); // items


  // Add this after state declarations
useEffect(() => {
  if (editingCampaign) {
    setName(editingCampaign.campaignName || "");
    setStatus(editingCampaign.status || "draft");
    setGoals(editingCampaign.goals || []);
    setSelected(editingCampaign.trackType || "cart");
  }
}, [editingCampaign]);

  const statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Active", value: "active" },
  ];
  // Handle reward selection
  const handleSelect = (type) => {
  // Pick prefix based on type
  let prefix = "";
  if (type === "free_product") prefix = "GIFT";
  if (type === "order_discount") prefix = "OFF";
  if (type === "free_shipping") prefix = "SHIP";

  // Generate random numeric part (2–3 digits)
  const num = Math.floor(10 + Math.random() * 990); // between 10–999
  const numStr = num.toString();

  // Generate random letters
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randLetters = (len) =>
    Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join("");

  // Choose how many letters to add
  const letterCount = numStr.length === 2 ? 4 : 3;

  // Build final ID
  const goalId = `${prefix}${numStr}${randLetters(letterCount)}`;

   // Base goal
  let newGoal = { id: goalId, type };

  // Only add giftQty if it's a free product
  if (type === "free_product") {
    newGoal.giftQty = 1;
    newGoal.products = []; // start with empty list
  }
  // Defaults for order_discount
  if (type === "order_discount") {
    newGoal.discountType = "percentage";
    newGoal.discountValue = 10;
  }

  setGoals((prev) => [...prev, newGoal]);
  setActive(false);
};


  const activator = (
    <Button     plain
    icon={<Icon source={PlusIcon} tone="base" />}
 onClick={toggleActive}>
 Add a new goal
    </Button>
  );

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const response = await fetch(
          "/api/my-campaign?namespace=optimaio_cart&key=campaigns"
        );
        const data = await response.json();
        if (data.success && data.value && Array.isArray(data.value.campaigns)) {
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

  const resourceName = { singular: "campaign", plural: "campaigns" };

  // 🔹 If editingCampaign is set → show edit view
  if (editingCampaign) {
    return (

      
      <Page
        title="Edit Campaign"
        backAction={{ content: "Back", onAction: () => setEditingCampaign(null) }}
      >
          <Layout>
         <Layout.Section >
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
            <Box padding="100" borderRadius="200" background="bg-subdued">
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
              <Popover active={active} activator={activator} onClose={toggleActive}>
                <ActionList
                  items={[
                    { content: "Free product", onAction: () => handleSelect("free_product") },
                    { content: "Order discount", onAction: () => handleSelect("order_discount") },
                    { content: "Free shipping", onAction: () => handleSelect("free_shipping") },
                  ]}
                />
              </Popover>
            </div>

            {/* Render all goals */}
          {goals.map((goal, index) => (
  <div key={goal.id} style={{ marginTop: "1rem" }}>
    
    <Layout>
  {/* 🔹 Left Side: Goal Input */}
  <Layout.Section>
    <InlineStack>
<Layout.Section secondary>
  <div style={{ width: "120px" }}>
  <Text variant="bodyMd" tone="subdued">
    {index + 1}st goal
  </Text>
  <TextField
    label=""
    type="number"
    value={goal.target || ""}
    prefix={selected === "cart" ? "INR" : "Qty"}
    onChange={(val) =>
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id ? { ...g, target: Number(val) } : g
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
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          padding: "0.75rem 1rem",
        }}
      >
        <BlockStack gap="100">
          <Text variant="headingSm" as="h3" fontWeight="bold">
            {goal.type === "free_product" && "Free product"}
            {goal.type === "order_discount" && "Order discount"}
            {goal.type === "free_shipping" && "Free shipping"}
          </Text>
          <Text tone="subdued">ID: {goal.id}</Text>
        </BlockStack>
        <ButtonGroup>
          <Button plain>Done</Button>
          <Tooltip content="Delete">
            <Button
              tone="critical"
              onClick={() =>
                setGoals((prev) => prev.filter((g) => g.id !== goal.id))
              }
              icon={<Icon source={DeleteIcon} tone="base" />}
            />
          </Tooltip>
        </ButtonGroup>
      </div>

      {/* Content Section */}
      <div style={{ padding: "1rem" }}>
        {goal.type === "free_product" && (
          <>
            <Text fontWeight="bold">Select products to give as free gifts</Text>
            <div style={{ marginTop: "0.5rem" }}>
             <Button
          primary
          onClick={() => {
            setCurrentGoal(goal.id);
            setPickerOpen(true);
          }}
        >
          Add a product
        </Button>
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <InlineStack gap="200" align="center">
                <Text>How many gifts can they choose?</Text>
                <Tooltip content="Number of gifts a customer can pick">
                  <Text tone="subdued">?</Text>
                </Tooltip>
              </InlineStack>
              <div style={{ marginTop: "0.75rem" }}>
                <ButtonGroup>
                  <Button
                    onClick={() =>
                      setGoals((prev) =>
                        prev.map((g) =>
                          g.id === goal.id
                            ? { ...g, giftQty: Math.max(1, g.giftQty - 1) }
                            : g
                        )
                      )
                    }
                  >
                    −
                  </Button>
                  <Button disabled>{goal.giftQty}</Button>
                  <Button
                    onClick={() =>
                      setGoals((prev) =>
                        prev.map((g) =>
                          g.id === goal.id
                            ? { ...g, giftQty: g.giftQty + 1 }
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
{/* Render variant rows */}
{goal.products && goal.products.length > 0 && (
  <div style={{ marginTop: "1rem" }}>
    {goal.products.map((v) => (
      <div
        key={v.id}
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
        {/* Thumbnail + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={v.image?.url || v.productImage?.url || ""}
            alt={v.image?.altText || v.productImage?.altText || v.title}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "4px",
              objectFit: "cover",
            }}
          />
          <Text>
            {v.productTitle ? `${v.productTitle} — ${v.title}` : v.title}
          </Text>
        </div>

        {/* Delete button */}
        <Button
          plain
          destructive
          icon={<Icon source={DeleteIcon} />}
          onClick={() =>
            setGoals((prev) =>
              prev.map((g) =>
                g.id === goal.id
                  ? {
                      ...g,
                      products: g.products.filter((prod) => prod.id !== v.id),
                    }
                  : g
              )
            )
          }
        />
      </div>
    ))}

    {/* Add more button */}
    <Button
      plain
      icon={<Icon source={PlusIcon} />}
      onClick={() => {
        setCurrentGoal(goal.id);
        setPickerOpen(true);
      }}
    >
      Add more to the list
    </Button>
  </div>
)}


    {goal.type === "order_discount" && (
  <div>
    <Text fontWeight="bold">Type of order discount</Text>
    <div style={{ marginTop: "0.5rem" }}>
      <ButtonGroup segmented>
        <Button
          pressed={goal.discountType === "percentage"}
          onClick={() =>
            setGoals((prev) =>
              prev.map((g) =>
                g.id === goal.id ? { ...g, discountType: "percentage" } : g
              )
            )
          }
        >
          Percentage off
        </Button>
        <Button
          pressed={goal.discountType === "amount"}
          onClick={() =>
            setGoals((prev) =>
              prev.map((g) =>
                g.id === goal.id ? { ...g, discountType: "amount" } : g
              )
            )
          }
        >
          Amount off
        </Button>
      </ButtonGroup>
    </div>

    <div style={{ marginTop: "1rem" }}>
      <Text fontWeight="bold">Enter the value</Text>
      <TextField
        prefix={goal.discountType === "amount" ? "INR" : "%"}
        type="number"
        value={goal.discountValue || ""}
        onChange={(val) =>
          setGoals((prev) =>
            prev.map((g) =>
              g.id === goal.id ? { ...g, discountValue: val } : g
            )
          )
        }
      />
    </div>
  </div>
)}


        {goal.type === "free_shipping" && (
          <Text>🚚 Free shipping will be applied automatically.</Text>
        )}
      </div>
    </Card>
  </Layout.Section>
  </InlineStack>
  </Layout.Section>
</Layout>

  </div>
))}

{/* ⬇️ Put ProductPickerModal here, outside the map */}
<ProductPickerModal
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  initialSelected={goals.find((g) => g.id === currentGoal)?.products || []}
  onSelect={(selectedVariants) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === currentGoal ? { ...g, products: selectedVariants } : g
      )
    );
  }}
/>




          </div>
        </Card>
        </Layout.Section>
         <Layout.Section variant="oneThird">
           <BlockStack gap="400">
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


{/* 🔹 Preview Card */}
<Card>
  <Box padding="400" borderBottomWidth="1" borderColor="border-subdued">
    <Text variant="headingSm" as="h3" fontWeight="bold">
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
          Add <strong>₹{goals[0].target - currentCartValue}</strong> more to unlock a reward
        </>
      )}
    </Text>
  ) : selected === "quantity" && goals[0]?.target ? (
    <Text>
      {currentCartQty >= goals[0].target ? (
        <>🎉 Goal reached!</>
      ) : (
        <>
          Add <strong>{goals[0].target - currentCartQty} more items</strong> to unlock a reward
        </>
      )}
    </Text>
  ) : (
    <Text>Select a goal to start tracking</Text>
  )}

  {/* Progress Bar */}
  <div style={{ margin: "1rem 0" }}>
    <ProgressBar progress={progress} size="medium" />
  </div>

  {/* 🔹 Render milestones from goals */}
  <InlineStack
    gap="loose"
    align="center"
    blockAlign="center"
    justify="space-between"
  >
    {goals.map((goal) => {
      let label = "";

      if (goal.type === "free_product") {
        label = "Free Gift!";
      } else if (goal.type === "free_shipping") {
        label = "Free Shipping";
      } else if (goal.type === "order_discount") {
        if (goal.discountType === "percentage") {
          label = `${goal.discountValue || 0}% Off`;
        } else if (goal.discountType === "amount") {
          label = `INR ${goal.discountValue || 0} Off`;
        }
      }

      return (
        <div key={goal.id} style={{ textAlign: "center", flex: 1 }}>
          <Icon source={GiftCardIcon} tone="base" />
          <Text variant="bodySm">{label}</Text>
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
    <Text>Use this to adjust the progress bar</Text>
    <RangeSlider
      min={0}
      max={100}
      value={progress}
      onChange={setProgress}
      output
    />
  </Box>
</Card>



      </BlockStack>
      </Layout.Section>

   
  </Layout>
  <Button
  primary
  onClick={async () => {
    const campaignData = {
      id: editingCampaign?.id || `cmp_${Date.now()}`, // use existing or generate
      campaignName: name,
      status,
      trackType: selected, // "cart" or "quantity"
      goals,
    };

    const res = await fetch("/api/save-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campaignData),
    });

    const data = await res.json();
    if (data.ok) {
      alert("✅ Campaign saved to metafields!");
      setEditingCampaign(null);
      setCampaigns(data.campaigns);
    } else {
      alert("❌ Failed to save campaign");
    }
  }}
>
  Save Campaign
</Button>


      </Page>
    );
  }

  // 🧠 Helper to save new campaign order to metafield
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
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    saveCampaignOrder(newOrder); // save JSON immediately
    console.log("handlePriorityUp :",index);
    return newOrder;
  });
};

const handlePriorityDown = (index) => {
   setCampaigns((prev) => {
    if (index === prev.length - 1) return prev; // already bottom
    const newOrder = [...prev];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    saveCampaignOrder(newOrder); // save JSON immediately
     console.log("handlePriorityUp :",index);
    return newOrder;
  });
};

  // Default: List view
  const rowMarkup = campaigns.map((c, index) => (
    <IndexTable.Row id={`row-${index}`} key={index} position={index}>
      <IndexTable.Cell>
        <Text fontWeight="bold">{c.campaignName}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
       {c.status === "active" ? (
    <Badge tone="success">Active</Badge>   // 🟢 Green for Active
  ) : (
    <Badge tone="info">Draft</Badge>       // 🔵 Blue for Draft
  )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button onClick={() => setEditingCampaign(c)}>Edit</Button>
          <Button
            tone="critical"
            onClick={async () => {
              const res = await fetch("/api/delete-campaign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  namespace: "optimaio_cart",
                  key: "campaigns",
                  id: c.id,
                }),
              });
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
           {/* 👇 Add Priority arrows here */}
          <InlineStack gap="0" align="center">
            <Button
              icon={CaretUpIcon}
              variant="tertiary"
              onClick={() => handlePriorityUp(index)}
              accessibilityLabel="Move up"
               disabled={index === 0}
            />
              <Text variant="bodySm" tone="subdued">
    {index + 1}
  </Text>
            <Button
              icon={CaretDownIcon}
              variant="tertiary"
              onClick={() => handlePriorityDown(index)}
              accessibilityLabel="Move down"
              disabled={index === campaigns.length - 1} 
            />
          </InlineStack>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
    
  ));

  return (
    <Page title="Campaigns">
      {loading ? (
        <Spinner accessibilityLabel="Loading campaigns" size="large" />
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
