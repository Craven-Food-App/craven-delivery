import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Copy,
  MoreHorizontal,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DraftModifierItem {
  id?: string;
  tempId: string;
  name: string;
  description?: string;
  price_cents: number;
  is_available: boolean;
  display_order: number;
  _deleted?: boolean;
}

export interface DraftModifierGroup {
  id?: string;
  tempId: string;
  name: string;
  description?: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  display_order: number;
  is_active: boolean;
  items: DraftModifierItem[];
}

interface Template {
  label: string;
  description: string;
  build: () => Omit<DraftModifierGroup, "tempId" | "display_order">;
}

const makeId = () =>
  `tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const newItem = (
  name = "",
  price_cents = 0,
  order = 0,
): DraftModifierItem => ({
  tempId: makeId(),
  name,
  price_cents,
  is_available: true,
  display_order: order,
});

const TEMPLATES: Template[] = [
  {
    label: "Remove ingredients",
    description: "Let customers take items off (no charge)",
    build: () => ({
      name: "Remove ingredients",
      description: "Uncheck anything you don't want",
      is_required: false,
      min_selections: 0,
      max_selections: null,
      is_active: true,
      items: [
        newItem("No onions", 0, 0),
        newItem("No tomato", 0, 1),
        newItem("No lettuce", 0, 2),
        newItem("No pickles", 0, 3),
        newItem("No sauce", 0, 4),
      ],
    }),
  },
  {
    label: "Add extras",
    description: "Upsell add-ons with extra charges",
    build: () => ({
      name: "Add extras",
      description: "Make it your own",
      is_required: false,
      min_selections: 0,
      max_selections: null,
      is_active: true,
      items: [
        newItem("Extra cheese", 150, 0),
        newItem("Bacon", 250, 1),
        newItem("Avocado", 200, 2),
        newItem("Jalapeños", 75, 3),
      ],
    }),
  },
  {
    label: "Choose your meat",
    description: "Single-select protein option",
    build: () => ({
      name: "Choose your protein",
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      is_active: true,
      items: [
        newItem("Grilled chicken", 0, 0),
        newItem("Steak", 300, 1),
        newItem("Shrimp", 400, 2),
        newItem("Tofu", 0, 3),
      ],
    }),
  },
  {
    label: "Choose your side",
    description: "Single-select side dish",
    build: () => ({
      name: "Pick a side",
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      is_active: true,
      items: [
        newItem("French fries", 0, 0),
        newItem("Side salad", 0, 1),
        newItem("Coleslaw", 0, 2),
        newItem("Sweet potato fries", 150, 3),
      ],
    }),
  },
  {
    label: "Size",
    description: "Required size selection",
    build: () => ({
      name: "Size",
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      is_active: true,
      items: [
        newItem("Small", 0, 0),
        newItem("Medium", 200, 1),
        newItem("Large", 400, 2),
      ],
    }),
  },
  {
    label: "Cook temperature",
    description: "How would you like it cooked?",
    build: () => ({
      name: "Cook temperature",
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      is_active: true,
      items: [
        newItem("Rare", 0, 0),
        newItem("Medium rare", 0, 1),
        newItem("Medium", 0, 2),
        newItem("Medium well", 0, 3),
        newItem("Well done", 0, 4),
      ],
    }),
  },
  {
    label: "Spice level",
    description: "Let customers pick heat",
    build: () => ({
      name: "Spice level",
      is_required: false,
      min_selections: 0,
      max_selections: 1,
      is_active: true,
      items: [
        newItem("Mild", 0, 0),
        newItem("Medium", 0, 1),
        newItem("Hot", 0, 2),
        newItem("Extra hot", 0, 3),
      ],
    }),
  },
];

interface Props {
  groups: DraftModifierGroup[];
  onChange: (groups: DraftModifierGroup[]) => void;
  existingLibrary: DraftModifierGroup[];
}

export default function InlineModifierBuilder({
  groups,
  onChange,
  existingLibrary,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    const next = new Set(expanded);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpanded(next);
  };

  const updateGroup = (tempId: string, patch: Partial<DraftModifierGroup>) => {
    onChange(
      groups.map((g) => (g.tempId === tempId ? { ...g, ...patch } : g)),
    );
  };

  const addGroup = (g: Omit<DraftModifierGroup, "tempId" | "display_order">) => {
    const tempId = makeId();
    const next: DraftModifierGroup = {
      ...g,
      tempId,
      display_order: groups.length,
    };
    onChange([...groups, next]);
    setExpanded(new Set([...expanded, tempId]));
  };

  const removeGroup = (tempId: string) => {
    onChange(
      groups
        .filter((g) => g.tempId !== tempId)
        .map((g, i) => ({ ...g, display_order: i })),
    );
  };

  const duplicateGroup = (g: DraftModifierGroup) => {
    const tempId = makeId();
    const copy: DraftModifierGroup = {
      ...g,
      id: undefined,
      tempId,
      name: `${g.name} (copy)`,
      display_order: groups.length,
      items: g.items
        .filter((i) => !i._deleted)
        .map((i, idx) => ({
          ...i,
          id: undefined,
          tempId: makeId(),
          display_order: idx,
        })),
    };
    onChange([...groups, copy]);
    setExpanded(new Set([...expanded, tempId]));
  };

  const moveGroup = (tempId: string, dir: -1 | 1) => {
    const idx = groups.findIndex((g) => g.tempId === tempId);
    if (idx < 0) return;
    const next = [...groups];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next.map((g, i) => ({ ...g, display_order: i })));
  };

  const updateItem = (
    groupTempId: string,
    itemTempId: string,
    patch: Partial<DraftModifierItem>,
  ) => {
    onChange(
      groups.map((g) =>
        g.tempId === groupTempId
          ? {
              ...g,
              items: g.items.map((it) =>
                it.tempId === itemTempId ? { ...it, ...patch } : it,
              ),
            }
          : g,
      ),
    );
  };

  const addItem = (groupTempId: string) => {
    onChange(
      groups.map((g) =>
        g.tempId === groupTempId
          ? {
              ...g,
              items: [
                ...g.items,
                newItem("", 0, g.items.filter((i) => !i._deleted).length),
              ],
            }
          : g,
      ),
    );
  };

  const removeItem = (groupTempId: string, itemTempId: string) => {
    onChange(
      groups.map((g) =>
        g.tempId === groupTempId
          ? {
              ...g,
              items: g.items
                .map((it) =>
                  it.tempId === itemTempId
                    ? it.id
                      ? { ...it, _deleted: true }
                      : null
                    : it,
                )
                .filter(Boolean) as DraftModifierItem[],
            }
          : g,
      ),
    );
  };

  const moveItem = (
    groupTempId: string,
    itemTempId: string,
    dir: -1 | 1,
  ) => {
    const group = groups.find((g) => g.tempId === groupTempId);
    if (!group) return;
    const visible = group.items.filter((i) => !i._deleted);
    const idx = visible.findIndex((i) => i.tempId === itemTempId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= visible.length) return;
    [visible[idx], visible[swap]] = [visible[swap], visible[idx]];
    const reordered = visible.map((it, i) => ({ ...it, display_order: i }));
    const deleted = group.items.filter((i) => i._deleted);
    updateGroup(groupTempId, { items: [...reordered, ...deleted] });
  };

  const attachFromLibrary = (libGroup: DraftModifierGroup) => {
    if (groups.some((g) => g.id && g.id === libGroup.id)) return;
    onChange([
      ...groups,
      { ...libGroup, tempId: makeId(), display_order: groups.length },
    ]);
    setExpanded(new Set([...expanded, libGroup.id || ""]));
  };

  const libraryAvailable = existingLibrary.filter(
    (lib) => !groups.some((g) => g.id === lib.id),
  );

  const selectionTypeOf = (g: DraftModifierGroup) =>
    g.max_selections === 1 ? "single" : "multi";

  const setSelectionType = (g: DraftModifierGroup, type: string) => {
    if (type === "single") {
      updateGroup(g.tempId, {
        max_selections: 1,
        min_selections: g.is_required ? 1 : 0,
      });
    } else {
      updateGroup(g.tempId, { max_selections: null });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label className="text-base font-semibold">
            Customization options
          </Label>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add modifier groups so customers can remove ingredients, add
            extras, pick sides, sizes, and more.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Sparkles className="h-4 w-4 mr-2 text-orange-500" />
                Quick add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {TEMPLATES.map((t) => (
                <DropdownMenuItem
                  key={t.label}
                  onClick={() => addGroup(t.build())}
                  className="flex-col items-start gap-0.5 py-2"
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {libraryAvailable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" type="button">
                  Attach existing
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-72 overflow-y-auto">
                {libraryAvailable.map((lib) => (
                  <DropdownMenuItem
                    key={lib.id}
                    onClick={() => attachFromLibrary(lib)}
                    className="flex-col items-start gap-0.5 py-2"
                  >
                    <span className="font-medium">{lib.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {lib.items.length} option{lib.items.length === 1 ? "" : "s"}
                      {lib.is_required ? " · Required" : ""}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            type="button"
            size="sm"
            onClick={() =>
              addGroup({
                name: "",
                description: "",
                is_required: false,
                min_selections: 0,
                max_selections: null,
                is_active: true,
                items: [newItem("", 0, 0)],
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            New group
          </Button>
        </div>
      </div>

      {groups.length === 0 && (
        <Card className="border-dashed">
          <div className="p-8 text-center space-y-2">
            <Sparkles className="h-8 w-8 text-orange-500 mx-auto" />
            <p className="font-medium">No customization options yet</p>
            <p className="text-sm text-muted-foreground">
              Use a Quick add template or build your own group.
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {groups.map((g, gi) => {
          const visibleItems = g.items.filter((i) => !i._deleted);
          const isOpen = expanded.has(g.tempId);
          const selType = selectionTypeOf(g);

          const minErr =
            g.is_required && (g.min_selections ?? 0) < 1
              ? "Required groups need a minimum of at least 1"
              : null;
          const maxErr =
            g.max_selections != null &&
            g.max_selections < (g.min_selections || 0)
              ? "Max must be ≥ min"
              : null;

          return (
            <Card key={g.tempId} className="overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-muted/40 border-b">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveGroup(g.tempId, -1)}
                    disabled={gi === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGroup(g.tempId, 1)}
                    disabled={gi === groups.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground" />

                <button
                  type="button"
                  onClick={() => toggleExpanded(g.tempId)}
                  className="flex-1 text-left flex items-center gap-2 min-w-0"
                >
                  <span className="font-semibold truncate">
                    {g.name || (
                      <span className="text-muted-foreground italic">
                        Untitled group
                      </span>
                    )}
                  </span>
                  {g.is_required ? (
                    <Badge variant="destructive" className="text-[10px]">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Optional
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {selType === "single" ? "Pick 1" : `Pick ${g.min_selections || 0}${g.max_selections ? `–${g.max_selections}` : "+"}`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {visibleItems.length} option
                    {visibleItems.length === 1 ? "" : "s"}
                  </span>
                  {!g.is_active && (
                    <Badge variant="outline" className="text-[10px]">
                      Hidden
                    </Badge>
                  )}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" type="button" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        updateGroup(g.tempId, { is_active: !g.is_active })
                      }
                    >
                      {g.is_active ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide from customers
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show to customers
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateGroup(g)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate group
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => removeGroup(g.tempId)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove from item
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-7 w-7"
                  onClick={() => toggleExpanded(g.tempId)}
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {isOpen && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Group name</Label>
                      <Input
                        value={g.name}
                        onChange={(e) =>
                          updateGroup(g.tempId, { name: e.target.value })
                        }
                        placeholder="e.g. Add extras"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        Instructions (optional)
                      </Label>
                      <Input
                        value={g.description || ""}
                        onChange={(e) =>
                          updateGroup(g.tempId, { description: e.target.value })
                        }
                        placeholder="Shown under the group name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div>
                      <Label className="text-xs">Selection type</Label>
                      <Select
                        value={selType}
                        onValueChange={(v) => setSelectionType(g, v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">
                            Pick one (radio)
                          </SelectItem>
                          <SelectItem value="multi">
                            Pick multiple (checkbox)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-md border px-3 py-2 h-10">
                      <Label className="text-xs">Required</Label>
                      <Switch
                        checked={g.is_required}
                        onCheckedChange={(checked) =>
                          updateGroup(g.tempId, {
                            is_required: checked,
                            min_selections: checked
                              ? Math.max(1, g.min_selections || 1)
                              : 0,
                          })
                        }
                      />
                    </div>
                    {selType === "multi" && (
                      <>
                        <div>
                          <Label className="text-xs">Min selections</Label>
                          <Input
                            type="number"
                            min={0}
                            value={g.min_selections}
                            onChange={(e) =>
                              updateGroup(g.tempId, {
                                min_selections: Math.max(
                                  0,
                                  parseInt(e.target.value || "0", 10),
                                ),
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">
                            Max selections (blank = ∞)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={g.max_selections ?? ""}
                            onChange={(e) =>
                              updateGroup(g.tempId, {
                                max_selections:
                                  e.target.value === ""
                                    ? null
                                    : Math.max(
                                        0,
                                        parseInt(e.target.value, 10),
                                      ),
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {(minErr || maxErr) && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {minErr || maxErr}
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Options
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => addItem(g.tempId)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add option
                      </Button>
                    </div>

                    <div className="rounded-md border divide-y">
                      {visibleItems.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No options yet. Add one to get started.
                        </div>
                      )}
                      {visibleItems.map((it, ii) => (
                        <div
                          key={it.tempId}
                          className={cn(
                            "grid grid-cols-[auto_1fr_140px_auto_auto] items-center gap-2 px-2 py-1.5",
                            !it.is_available && "opacity-60",
                          )}
                        >
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => moveItem(g.tempId, it.tempId, -1)}
                              disabled={ii === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(g.tempId, it.tempId, 1)}
                              disabled={ii === visibleItems.length - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                          <Input
                            value={it.name}
                            onChange={(e) =>
                              updateItem(g.tempId, it.tempId, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Option name (e.g. Extra cheese)"
                            className="h-9"
                          />
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {it.price_cents < 0 ? "−$" : "+$"}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              value={(Math.abs(it.price_cents) / 100).toFixed(2)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value || "0");
                                const sign = it.price_cents < 0 ? -1 : 1;
                                updateItem(g.tempId, it.tempId, {
                                  price_cents: Math.round(val * 100) * sign,
                                });
                              }}
                              className="h-9 pl-9 pr-14"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(g.tempId, it.tempId, {
                                  price_cents: -it.price_cents,
                                })
                              }
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/10"
                              title="Toggle charge / discount"
                            >
                              {it.price_cents < 0 ? "−" : "+"}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(g.tempId, it.tempId, {
                                is_available: !it.is_available,
                              })
                            }
                            title={
                              it.is_available
                                ? "Mark sold out"
                                : "Mark available"
                            }
                            className="p-1.5 rounded hover:bg-muted"
                          >
                            {it.is_available ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(g.tempId, it.tempId)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}