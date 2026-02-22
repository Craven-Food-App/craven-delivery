import { useState } from "react";
import {
  Modal,
  Button,
  Stack,
  Group,
  Text,
  TextInput,
  Stepper,
  Box,
  Divider,
  Select,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/integrations/supabase/client";

const RESTAURANT_TYPE_OPTIONS = [
  { value: "full_service", label: "Full Service Restaurant" },
  { value: "fast_casual", label: "Fast Casual" },
  { value: "quick_service", label: "Quick Service (Fast Food)" },
  { value: "cafe", label: "Café or Coffee Shop" },
  { value: "bakery", label: "Bakery" },
  { value: "ghost_kitchen", label: "Ghost Kitchen/Virtual Brand" },
  { value: "catering", label: "Catering Only" },
  { value: "food_truck", label: "Food Truck" },
  { value: "retail_store", label: "Retail Store" },
  { value: "grocery", label: "Grocery" },
  { value: "supermarket", label: "Supermarket" },
  { value: "convenience", label: "Convenience Store" },
  { value: "deli", label: "Deli" },
  { value: "market", label: "Market" },
];

export interface AddLocationFormData {
  name: string;
  restaurant_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
}

const initialData: AddLocationFormData = {
  name: "",
  restaurant_type: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  email: "",
};

interface AddLocationWizardProps {
  opened: boolean;
  onClose: () => void;
  parentRestaurantId: string;
  parentRestaurantName: string;
  onSuccess: (newRestaurantId: string) => void;
}

export function AddLocationWizard({
  opened,
  onClose,
  parentRestaurantId,
  parentRestaurantName,
  onSuccess,
}: AddLocationWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<AddLocationFormData>(initialData);
  const [submitting, setSubmitting] = useState(false);

  const update = (updates: Partial<AddLocationFormData>) =>
    setData((prev) => ({ ...prev, ...updates }));

  const reset = () => {
    setStep(0);
    setData(initialData);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canProceedStep0 = data.name.trim().length > 0;
  const canProceedStep1 = data.restaurant_type.length > 0;
  const canProceedStep2 =
    data.address.trim().length > 0 &&
    data.city.trim().length > 0 &&
    data.state.trim().length > 0 &&
    data.zip_code.trim().length > 0;

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        notifications.show({
          title: "Error",
          message: "You must be signed in to add a store.",
          color: "red",
        });
        setSubmitting(false);
        return;
      }

      const { data: res, error } = await supabase.functions.invoke(
        "create-additional-location",
        {
          body: {
            parent_restaurant_id: parentRestaurantId,
            location_data: {
              name: data.name.trim(),
              restaurant_type: data.restaurant_type || undefined,
              address: data.address.trim(),
              city: data.city.trim(),
              state: data.state.trim(),
              zip_code: data.zip_code.trim(),
              phone: data.phone.trim() || undefined,
              email: data.email.trim() || undefined,
            },
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (error) throw error;
      const errMsg =
        res && typeof res === "object" && "error" in res
          ? (res as { error: string }).error
          : null;
      if (errMsg) throw new Error(errMsg);

      const newId = (res as { restaurant?: { id: string } })?.restaurant?.id;
      if (newId) {
        notifications.show({
          title: "Success",
          message: "New location created. You can now complete setup.",
          color: "green",
        });
        handleClose();
        onSuccess(newId);
      } else {
        throw new Error("No restaurant id returned");
      }
    } catch (err: unknown) {
      console.error("Error creating location:", err);
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to create location",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { label: "Store name" },
    { label: "Business type" },
    { label: "Address" },
    { label: "Contact" },
    { label: "Review" },
  ];

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Add a new store or business"
      size="md"
    >
      <Stepper active={step} onStepClick={setStep}>
        <Stepper.Step label={steps[0].label}>
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              Give this location a name (e.g. &quot;Downtown&quot; or &quot;Second
              location&quot;).
            </Text>
            <TextInput
              label="Store / business name"
              placeholder={`e.g. ${parentRestaurantName} - Downtown`}
              value={data.name}
              onChange={(e) => update({ name: e.target.value })}
              required
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={steps[1].label}>
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              Choose the type of business for this location. This determines the portal (e.g. Grocery vs Restaurant).
            </Text>
            <Select
              label="Business type"
              placeholder="Select type"
              value={data.restaurant_type}
              onChange={(v) => update({ restaurant_type: v || "" })}
              data={RESTAURANT_TYPE_OPTIONS}
              required
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={steps[2].label}>
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              Enter the address for this location.
            </Text>
            <TextInput
              label="Street address"
              placeholder="123 Main St"
              value={data.address}
              onChange={(e) => update({ address: e.target.value })}
              required
            />
            <Group grow>
              <TextInput
                label="City"
                placeholder="City"
                value={data.city}
                onChange={(e) => update({ city: e.target.value })}
                required
              />
              <TextInput
                label="State"
                placeholder="State"
                value={data.state}
                onChange={(e) => update({ state: e.target.value })}
                required
              />
              <TextInput
                label="ZIP code"
                placeholder="ZIP"
                value={data.zip_code}
                onChange={(e) => update({ zip_code: e.target.value })}
                required
              />
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={steps[3].label}>
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              Phone and email for this location (optional).
            </Text>
            <TextInput
              label="Phone"
              placeholder="(555) 123-4567"
              value={data.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
            <TextInput
              label="Email"
              placeholder="location@example.com"
              type="email"
              value={data.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={steps[4].label}>
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              Review and create this location.
            </Text>
            <Box p="sm" style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: 8 }}>
              <Text fw={600}>{data.name || "—"}</Text>
              <Text size="sm" c="dimmed">
                {(RESTAURANT_TYPE_OPTIONS.find((o) => o.value === data.restaurant_type)?.label ?? data.restaurant_type) || "—"}
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                {[data.address, data.city, data.state, data.zip_code]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </Text>
              {(data.phone || data.email) && (
                <Text size="sm" c="dimmed" mt="xs">
                  {[data.phone, data.email].filter(Boolean).join(" · ")}
                </Text>
              )}
            </Box>
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Divider my="md" />

      <Group justify="space-between">
        <Button variant="subtle" color="gray" onClick={handleClose}>
          Cancel
        </Button>
        <Group>
          {step > 0 && (
            <Button variant="default" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              color="orange"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && !canProceedStep0) ||
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
            >
              Next
            </Button>
          ) : (
            <Button
              color="orange"
              loading={submitting}
              onClick={handleCreate}
            >
              Create location
            </Button>
          )}
        </Group>
      </Group>
    </Modal>
  );
}
