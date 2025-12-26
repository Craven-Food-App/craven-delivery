
// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Textarea,
  Badge,
  Checkbox,
  Radio,
  Divider,
  Stack,
  Group,
  Text,
  Title,
  Box,
  ActionIcon,
  Image as MantineImage,
  Alert,
  Loader,
} from "@mantine/core";
import {
  IconMinus,
  IconPlus,
  IconAlertCircle,
  IconChefHat,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url?: string;
  category_id?: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  preparation_time: number;
}

interface Modifier {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  modifier_type: string;
  is_required: boolean;
  is_recommended?: boolean;
}

interface SelectedModifier extends Modifier {
  selected: boolean;
}

interface MenuItemModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, modifiers: SelectedModifier[], specialInstructions?: string) => void;
}

export const MenuItemModal = ({ item, onClose, onAddToCart }: MenuItemModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [modifiers, setModifiers] = useState<SelectedModifier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModifiers = async () => {
      const { data, error } = await supabase
        .from('menu_item_modifiers')
        .select('*')
        .eq('menu_item_id', item.id)
        .eq('is_available', true)
        .order('display_order', { ascending: true });

      if (!error && data) {
        // For size modifiers, only pre-select the first recommended one
        // For other modifiers, pre-select all recommended ones
        let hasSelectedRecommendedSize = false;
        setModifiers(data.map(mod => {
          if (mod.modifier_type === 'size') {
            if (mod.is_recommended && !hasSelectedRecommendedSize) {
              hasSelectedRecommendedSize = true;
              return { ...mod, selected: true };
            }
            return { ...mod, selected: false };
          }
          return { ...mod, selected: mod.is_recommended === true };
        }));
      }
      setLoading(false);
    };

    fetchModifiers();
  }, [item.id]);

  const handleModifierToggle = (modifierId: string, modifierType: string) => {
    setModifiers(prev => {
      if (modifierType === 'size') {
        // For size modifiers, only one can be selected at a time
        return prev.map(mod => 
          mod.modifier_type === 'size'
            ? { ...mod, selected: mod.id === modifierId }
            : mod
        );
      } else {
        // For other modifiers, toggle normally
        return prev.map(mod => 
          mod.id === modifierId 
            ? { ...mod, selected: !mod.selected }
            : mod
        );
      }
    });
  };

  const handleAddToCart = () => {
    // Check if required modifiers are selected
    const requiredModifiers = modifiers.filter(m => m.is_required);
    const selectedRequiredModifiers = requiredModifiers.filter(m => m.selected);
    
    if (requiredModifiers.length > 0 && selectedRequiredModifiers.length === 0) {
      return; // Don't add to cart if required modifiers aren't selected
    }
    
    onAddToCart(item, quantity, modifiers.filter(m => m.selected), specialInstructions);
    onClose();
  };

  // Group modifiers by type
  const modifiersByType = modifiers.reduce((acc, modifier) => {
    if (!acc[modifier.modifier_type]) {
      acc[modifier.modifier_type] = [];
    }
    acc[modifier.modifier_type].push(modifier);
    return acc;
  }, {} as Record<string, SelectedModifier[]>);

  const getModifierTypeIcon = (type: string) => {
    switch (type) {
      case 'size': return '📏';
      case 'addon': return '➕';
      case 'removal': return '➖';
      case 'substitution': return '🔄';
      case 'preparation': return '👨‍🍳';
      default: return '⚙️';
    }
  };

  const getModifierTypeLabel = (type: string) => {
    switch (type) {
      case 'size': return 'Size Options';
      case 'addon': return 'Add-Ons';
      case 'removal': return 'Remove Items';
      case 'substitution': return 'Substitutions';
      case 'preparation': return 'Preparation Style';
      default: return 'Options';
    }
  };

  const selectedModifiers = modifiers.filter(m => m.selected);
  const modifiersPrice = selectedModifiers.reduce((sum, mod) => sum + mod.price_cents, 0);
  const totalPrice = ((item.price_cents + modifiersPrice) * quantity) / 100;

  return (
    <Modal
      opened={true}
      onClose={onClose}
      title={item.name}
      size="md"
      scrollAreaComponent={Stack}
    >
      <Stack gap="md">
        {item.image_url && (
          <MantineImage
            src={item.image_url}
            alt={item.name}
            style={{ width: '100%', height: '192px', objectFit: 'cover', borderRadius: '8px' }}
            fit="cover"
          />
        )}

        <Stack gap="xs">
          <Group gap="xs">
            {item.is_vegetarian && <Badge variant="light" size="sm">Vegetarian</Badge>}
            {item.is_vegan && <Badge variant="light" size="sm">Vegan</Badge>}
            {item.is_gluten_free && <Badge variant="light" size="sm">Gluten Free</Badge>}
          </Group>
          <Text size="sm" c="dimmed">
            {item.description}
          </Text>
          <Text size="sm" c="dimmed">
            Prep time: ~{item.preparation_time} minutes
          </Text>
        </Stack>

        {/* Modifiers Section */}
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Loader size="md" />
          </Box>
        ) : Object.keys(modifiersByType).length > 0 && (
          <Stack gap="lg">
            <Group gap="xs">
              <IconChefHat size={16} style={{ color: 'var(--mantine-color-orange-6)' }} />
              <Title order={5}>Customize Your Order</Title>
            </Group>
            
            {Object.entries(modifiersByType)
              .sort(([a], [b]) => {
                // Sort by importance: size first, then others
                const order = ['size', 'addon', 'removal', 'substitution', 'preparation'];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([type, typeModifiers], index, array) => (
                <Box key={type}>
                  <Stack gap="sm">
                    <Group gap="xs">
                      <Text size="sm">{getModifierTypeIcon(type)}</Text>
                      <Text size="sm" fw={500}>
                        {getModifierTypeLabel(type)}
                        {typeModifiers.some(m => m.is_required) && (
                          <Text component="span" c="red" ml="xs">*</Text>
                        )}
                      </Text>
                    </Group>
                    
                    {type === 'size' ? (
                      // Radio group for size selection
                      <Radio.Group
                        value={typeModifiers.find(m => m.selected)?.id || ''}
                        onChange={(value) => handleModifierToggle(value, 'size')}
                      >
                        <Stack gap="xs">
                          {typeModifiers.map((modifier) => (
                            <Radio
                              key={modifier.id}
                              value={modifier.id}
                              label={
                                <Group justify="space-between" style={{ flex: 1 }}>
                                  <Group gap="xs">
                                    <Text size="sm" fw={500}>{modifier.name}</Text>
                                    {modifier.is_recommended && (
                                      <Badge size="xs" color="orange" variant="light">Recommended</Badge>
                                    )}
                                  </Group>
                                  {modifier.price_cents > 0 && (
                                    <Text size="sm" c="dimmed">
                                      +${(modifier.price_cents / 100).toFixed(2)}
                                    </Text>
                                  )}
                                </Group>
                              }
                              description={modifier.description}
                            />
                          ))}
                        </Stack>
                      </Radio.Group>
                    ) : (
                      // Checkboxes for other modifier types
                      <Stack gap="xs">
                        {typeModifiers.map((modifier) => (
                          <Group key={modifier.id} align="flex-start" gap="sm">
                            <Checkbox
                              checked={modifier.selected}
                              onChange={() => handleModifierToggle(modifier.id, type)}
                              mt={2}
                            />
                            <Stack gap={0} style={{ flex: 1 }}>
                              <Group justify="space-between">
                                <Group gap="xs">
                                  {type === 'removal' && <IconX size={14} style={{ color: 'var(--mantine-color-red-6)' }} />}
                                  <Text size="sm" fw={500}>{modifier.name}</Text>
                                  {modifier.is_recommended && (
                                    <Badge size="xs" color="orange" variant="light">Recommended</Badge>
                                  )}
                                </Group>
                                {modifier.price_cents > 0 && (
                                  <Text size="sm" c="dimmed">
                                    +${(modifier.price_cents / 100).toFixed(2)}
                                  </Text>
                                )}
                                {modifier.price_cents < 0 && (
                                  <Text size="sm" c="green.6">
                                    -${Math.abs(modifier.price_cents / 100).toFixed(2)}
                                  </Text>
                                )}
                              </Group>
                              {modifier.description && (
                                <Text size="xs" c="dimmed" mt={4}>
                                  {modifier.description}
                                </Text>
                              )}
                            </Stack>
                          </Group>
                        ))}
                      </Stack>
                    )}
                    
                    {index < array.length - 1 && <Divider mt="md" />}
                  </Stack>
                </Box>
              ))}
            
            {/* Required modifier warning */}
            {modifiers.some(m => m.is_required && !m.selected) && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                <Text size="xs">
                  Please select required options before adding to cart.
                </Text>
              </Alert>
            )}
          </Stack>
        )}

        <Textarea
          label="Special Instructions (optional)"
          placeholder="Add any special requests..."
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={3}
        />

        <Group justify="space-between" align="center">
          <Group gap="md">
            <ActionIcon
              variant="outline"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <IconMinus size={16} />
            </ActionIcon>
            <Text fw={600} size="lg" style={{ minWidth: '32px', textAlign: 'center' }}>{quantity}</Text>
            <ActionIcon
              variant="outline"
              onClick={() => setQuantity(quantity + 1)}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Group>

          <Button onClick={handleAddToCart} size="lg">
            Add to Cart • ${totalPrice.toFixed(2)}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
