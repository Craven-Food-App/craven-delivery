/**
 * Tap-only "Request this business" — no typing. Two taps + Send.
 */
import React, { useState, useEffect } from "react";
import { Modal, Stack, Text, Box, Group } from "@mantine/core";
import { supabase } from "@/integrations/supabase/client";
import { notifications } from "@mantine/notifications";

const choiceBtn =
  "py-1 px-2 text-xs font-medium rounded border shrink-0 transition-colors ";

function ChoiceButton({
  label,
  selected,
  onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        choiceBtn +
        (selected
          ? " bg-orange-500 border-orange-500 text-white"
          : " bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100")
      }
    >
      {label}
    </button>
  );
}

export interface RequestBusinessModalProps {
  open: boolean;
  onClose: () => void;
  business: { id: string; name: string; image?: string; cuisine?: string };
  onSuccess?: () => void;
}

const ORDER_OPTIONS = [
  { value: "frequently", label: "Frequently" },
  { value: "weekly", label: "Weekly" },
  { value: "2_3_per_month", label: "2–3×/mo" },
  { value: "rarely", label: "I'd try" },
];

const REFER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "probably", label: "Probably" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

export function RequestBusinessModal({ open, onClose, business, onSuccess }: RequestBusinessModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderFrequency, setOrderFrequency] = useState<string | null>(null);
  const [wouldRefer, setWouldRefer] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setOrderFrequency(null);
    setWouldRefer(null);
  }, [open]);

  const send = async () => {
    if (!business?.id || !orderFrequency || !wouldRefer) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        p_restaurant_master_id: business.id,
        p_order_frequency: orderFrequency,
        p_would_refer: wouldRefer,
      };
      const { data, error } = await (supabase as any).rpc("submit_partnership_request", params);
      if (error) throw error;
      if (data?.ok) {
        setSubmitted(true);
        onSuccess?.();
        notifications.show({ title: "Done", message: "We'll show them the demand.", color: "green" });
      } else throw new Error((data as any)?.error ?? "Request failed");
    } catch (err: any) {
      notifications.show({ title: "Error", message: err?.message ?? "Try again.", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  if (!business) return null;

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={null}
      size="xs"
      centered
      classNames={{
        content: "rounded-xl max-w-[min(100vw-24px,20rem)]",
        body: "px-3 pt-2 pb-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
      }}
      styles={{ close: { marginTop: 50 } }}
    >
      {submitted ? (
        <Stack gap="xs">
          <Group gap="sm" align="center" wrap="nowrap">
            {business.image ? (
              <img src={business.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center text-gray-600 font-semibold" aria-hidden>
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
            <Text fw={600} size="sm">Thanks. We'll show {business.name} the demand.</Text>
          </Group>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 px-3 text-xs font-medium rounded bg-orange-500 text-white hover:bg-orange-600"
          >
            Done
          </button>
        </Stack>
      ) : (
        <Stack gap="xs">
          <Group gap="sm" align="center" wrap="nowrap">
            {business.image ? (
              <img
                src={business.image}
                alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-100"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center text-gray-600 font-semibold text-lg"
                aria-hidden
              >
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
            <Text fw={600} size="sm" lineClamp={2}>Request {business.name} on Crave'n</Text>
          </Group>

          <Box>
            <Text size="xs" c="dimmed" mb={2}>How often would you order?</Text>
            <div className="flex flex-wrap gap-1.5">
              {ORDER_OPTIONS.map((opt) => (
                <ChoiceButton
                  key={opt.value}
                  label={opt.label}
                  selected={orderFrequency === opt.value}
                  onClick={() => setOrderFrequency(opt.value)}
                />
              ))}
            </div>
          </Box>

          <Box>
            <Text size="xs" c="dimmed" mb={2}>Would you refer others?</Text>
            <div className="flex flex-wrap gap-1.5">
              {REFER_OPTIONS.map((opt) => (
                <ChoiceButton
                  key={opt.value}
                  label={opt.label}
                  selected={wouldRefer === opt.value}
                  onClick={() => setWouldRefer(opt.value)}
                />
              ))}
            </div>
          </Box>

          <button
            type="button"
            onClick={send}
            disabled={!orderFrequency || !wouldRefer || loading}
            className="w-full py-1.5 px-3 text-xs font-medium rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "…" : "Send"}
          </button>
        </Stack>
      )}
    </Modal>
  );
}

export default RequestBusinessModal;
