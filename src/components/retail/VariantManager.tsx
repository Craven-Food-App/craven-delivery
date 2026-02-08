import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  X,
  Trash2,
  Package,
  GripVertical,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

export interface OptionDef {
  name: string; // "Color", "Size", "Material"
  values: string[]; // ["Red", "Blue", "Green"]
}

export interface VariantRow {
  id?: string;
  title: string;
  option1_name: string | null;
  option1_value: string | null;
  option2_name: string | null;
  option2_value: string | null;
  option3_name: string | null;
  option3_value: string | null;
  sku: string;
  barcode: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  cost_price_cents: number | null;
  quantity_on_hand: number;
  is_available: boolean;
}

interface VariantManagerProps {
  options: OptionDef[];
  variants: VariantRow[];
  basePrice: number; // in cents
  onOptionsChange: (options: OptionDef[]) => void;
  onVariantsChange: (variants: VariantRow[]) => void;
}

// ── Helpers ────────────────────────────────────────────

/** Generate all combinations from option value arrays */
function cartesian(...arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((v) => [...a, v])),
    [[]]
  );
}

function buildTitle(values: (string | null)[]): string {
  return values.filter(Boolean).join(" / ");
}

// ── Component ──────────────────────────────────────────

const VariantManager = ({
  options,
  variants,
  basePrice,
  onOptionsChange,
  onVariantsChange,
}: VariantManagerProps) => {
  const [newOptionName, setNewOptionName] = useState("");
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});

  // When options change, regenerate variants (preserving existing data)
  const regenerateVariants = useCallback(
    (opts: OptionDef[]) => {
      if (opts.length === 0) {
        onVariantsChange([]);
        return;
      }

      const valueArrays = opts.map((o) => o.values).filter((v) => v.length > 0);
      if (valueArrays.length === 0) {
        onVariantsChange([]);
        return;
      }

      const combos = cartesian(...valueArrays);

      const newVariants: VariantRow[] = combos.map((combo) => {
        const opt1 = opts[0] ? { name: opts[0].name, value: combo[0] || null } : { name: null, value: null };
        const opt2 = opts[1] ? { name: opts[1].name, value: combo[1] || null } : { name: null, value: null };
        const opt3 = opts[2] ? { name: opts[2].name, value: combo[2] || null } : { name: null, value: null };
        const title = buildTitle([opt1.value, opt2.value, opt3.value]);

        // Try to find existing variant with same title
        const existing = variants.find((v) => v.title === title);
        if (existing) return existing;

        return {
          title,
          option1_name: opt1.name,
          option1_value: opt1.value,
          option2_name: opt2.name,
          option2_value: opt2.value,
          option3_name: opt3.name,
          option3_value: opt3.value,
          sku: "",
          barcode: "",
          price_cents: basePrice,
          compare_at_price_cents: null,
          cost_price_cents: null,
          quantity_on_hand: 0,
          is_available: true,
        };
      });

      onVariantsChange(newVariants);
    },
    [variants, basePrice, onVariantsChange]
  );

  // ── Option management ────────────────────────────────

  const addOption = () => {
    if (!newOptionName.trim()) return;
    if (options.length >= 3) return; // max 3 options
    if (options.some((o) => o.name.toLowerCase() === newOptionName.trim().toLowerCase())) return;

    const updated = [...options, { name: newOptionName.trim(), values: [] }];
    onOptionsChange(updated);
    setNewOptionName("");
  };

  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    onOptionsChange(updated);
    regenerateVariants(updated);
  };

  const addValueToOption = (optionIndex: number) => {
    const val = newValueInputs[optionIndex]?.trim();
    if (!val) return;
    if (options[optionIndex].values.includes(val)) return;

    const updated = [...options];
    updated[optionIndex] = {
      ...updated[optionIndex],
      values: [...updated[optionIndex].values, val],
    };
    onOptionsChange(updated);
    setNewValueInputs({ ...newValueInputs, [optionIndex]: "" });
    regenerateVariants(updated);
  };

  const removeValueFromOption = (optionIndex: number, valueIndex: number) => {
    const updated = [...options];
    updated[optionIndex] = {
      ...updated[optionIndex],
      values: updated[optionIndex].values.filter((_, i) => i !== valueIndex),
    };
    onOptionsChange(updated);
    regenerateVariants(updated);
  };

  // ── Variant field update ─────────────────────────────

  const updateVariant = (variantIndex: number, field: keyof VariantRow, value: any) => {
    const updated = [...variants];
    updated[variantIndex] = { ...updated[variantIndex], [field]: value };
    onVariantsChange(updated);
  };

  // ── Suggested option presets ─────────────────────────

  const PRESETS = [
    { name: "Size", values: ["XS", "S", "M", "L", "XL", "XXL"] },
    { name: "Color", values: [] },
    { name: "Material", values: [] },
    { name: "Style", values: [] },
  ];

  const availablePresets = PRESETS.filter(
    (p) => !options.some((o) => o.name.toLowerCase() === p.name.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Option definitions ──────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Product Options</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add options like Size, Color, or Material (max 3)
            </p>
          </div>
        </div>

        {/* Existing options */}
        {options.map((option, oi) => (
          <div key={oi} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{option.name}</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => removeOption(oi)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Values */}
            <div className="flex flex-wrap gap-2">
              {option.values.map((val, vi) => (
                <Badge key={vi} variant="secondary" className="gap-1 pr-1">
                  {val}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => removeValueFromOption(oi, vi)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Add value input */}
            <div className="flex gap-2">
              <Input
                placeholder={`Add ${option.name.toLowerCase()} value...`}
                value={newValueInputs[oi] || ""}
                onChange={(e) =>
                  setNewValueInputs({ ...newValueInputs, [oi]: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addValueToOption(oi);
                  }
                }}
                className="h-8"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addValueToOption(oi)}
                className="h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>
        ))}

        {/* Add new option */}
        {options.length < 3 && (
          <div className="border border-dashed rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Option name (e.g. Size, Color...)"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOption();
                  }
                }}
                className="h-8"
              />
              <Button variant="outline" size="sm" onClick={addOption} className="h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
              </Button>
            </div>

            {/* Preset buttons */}
            {availablePresets.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Quick add:</span>
                {availablePresets.map((preset) => (
                  <button
                    key={preset.name}
                    className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted transition-colors"
                    onClick={() => {
                      const updated = [...options, { name: preset.name, values: preset.values }];
                      onOptionsChange(updated);
                      if (preset.values.length > 0) {
                        regenerateVariants(updated);
                      }
                    }}
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Variant grid ────────────────────────────── */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              Variants ({variants.length})
            </Label>
            <p className="text-xs text-muted-foreground">
              Set price, SKU, and stock for each combination
            </p>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Variant</TableHead>
                  <TableHead className="w-[100px]">Price ($)</TableHead>
                  <TableHead className="w-[110px]">Compare At ($)</TableHead>
                  <TableHead className="w-[100px]">Cost ($)</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[120px]">Barcode</TableHead>
                  <TableHead className="w-[80px]">Stock</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant, vi) => (
                  <TableRow key={vi}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm">{variant.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(variant.price_cents / 100).toFixed(2)}
                        onChange={(e) =>
                          updateVariant(
                            vi,
                            "price_cents",
                            Math.round(parseFloat(e.target.value || "0") * 100)
                          )
                        }
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          variant.compare_at_price_cents
                            ? (variant.compare_at_price_cents / 100).toFixed(2)
                            : ""
                        }
                        onChange={(e) =>
                          updateVariant(
                            vi,
                            "compare_at_price_cents",
                            e.target.value
                              ? Math.round(parseFloat(e.target.value) * 100)
                              : null
                          )
                        }
                        placeholder="—"
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          variant.cost_price_cents
                            ? (variant.cost_price_cents / 100).toFixed(2)
                            : ""
                        }
                        onChange={(e) =>
                          updateVariant(
                            vi,
                            "cost_price_cents",
                            e.target.value
                              ? Math.round(parseFloat(e.target.value) * 100)
                              : null
                          )
                        }
                        placeholder="—"
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariant(vi, "sku", e.target.value)}
                        placeholder="SKU"
                        className="h-8 w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={variant.barcode}
                        onChange={(e) => updateVariant(vi, "barcode", e.target.value)}
                        placeholder="Barcode"
                        className="h-8 w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={variant.quantity_on_hand}
                        onChange={(e) =>
                          updateVariant(
                            vi,
                            "quantity_on_hand",
                            parseInt(e.target.value || "0", 10)
                          )
                        }
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        className={`w-8 h-5 rounded-full transition-colors ${
                          variant.is_available ? "bg-green-500" : "bg-gray-300"
                        }`}
                        onClick={() =>
                          updateVariant(vi, "is_available", !variant.is_available)
                        }
                        title={variant.is_available ? "Available" : "Unavailable"}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            variant.is_available ? "translate-x-3.5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantManager;

