import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Box,
  Stack,
  Group,
  Text,
  Title,
  Button,
  ActionIcon,
  Image as MantineImage,
  Badge,
  Select,
  NumberInput,
  Divider,
  ScrollArea,
  Card,
  Tooltip,
  Skeleton,
} from '@mantine/core';
import {
  IconX,
  IconShoppingCart,
  IconPlus,
  IconMinus,
  IconTruck,
  IconPackage,
  IconTag,
  IconChevronLeft,
  IconChevronRight,
  IconHeart,
  IconShare,
  IconCheck,
  IconAlertTriangle,
  IconStar,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

// ---- Types ----
interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
}

interface ProductOption {
  id: string;
  name: string; // e.g. "Size", "Color"
  values: string[]; // e.g. ["S","M","L"]
  position: number;
}

interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  barcode?: string;
  price_cents: number;
  cost_price_cents?: number;
  compare_at_price_cents?: number;
  quantity_on_hand: number;
  reorder_point: number;
  is_available: boolean;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  display_order: number;
}

interface RetailMenuItem {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  is_available: boolean;
  category_id: string;
  restaurant_id: string;
  brand?: string;
  tags?: string[];
  has_variants?: boolean;
  compare_at_price_cents?: number;
  product_type?: string;
  requires_shipping?: boolean;
  weight_value?: number;
  weight_unit?: string;
}

interface RetailItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RetailMenuItem | null;
  restaurantName: string;
  onAddToCart: (item: RetailMenuItem, quantity: number, selectedVariant?: ProductVariant | null) => void;
}

// ---- Component ----
const RetailItemDetailModal: React.FC<RetailItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  restaurantName,
  onAddToCart,
}) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen && item) {
      setQuantity(1);
      setActiveImageIndex(0);
      setSelectedOptions({});
      setSelectedVariant(null);
      fetchProductDetails(item.id);
    }
  }, [isOpen, item?.id]);

  const fetchProductDetails = async (menuItemId: string) => {
    setLoading(true);
    try {
      // Fetch images, options, variants in parallel
      const [imgRes, optRes, varRes] = await Promise.all([
        supabase
          .from('product_images')
          .select('*')
          .eq('menu_item_id', menuItemId)
          .order('display_order'),
        supabase
          .from('product_options')
          .select('*')
          .eq('menu_item_id', menuItemId)
          .order('position'),
        supabase
          .from('product_variants')
          .select('*')
          .eq('menu_item_id', menuItemId)
          .order('display_order'),
      ]);

      const productImages: ProductImage[] = (imgRes.data || []).map((img: any) => ({
        id: img.id,
        image_url: img.image_url,
        alt_text: img.alt_text,
        display_order: img.display_order,
        is_primary: img.is_primary,
      }));

      // If no product_images but item has image_url, use that
      if (productImages.length === 0 && item?.image_url) {
        productImages.push({
          id: 'fallback',
          image_url: item.image_url,
          display_order: 0,
          is_primary: true,
        });
      }

      const productOptions: ProductOption[] = (optRes.data || []).map((opt: any) => ({
        id: opt.id,
        name: opt.name,
        values: opt.values || [],
        position: opt.position,
      }));

      const productVariants: ProductVariant[] = (varRes.data || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        barcode: v.barcode,
        price_cents: v.price_cents,
        cost_price_cents: v.cost_price_cents,
        compare_at_price_cents: v.compare_at_price_cents,
        quantity_on_hand: v.quantity_on_hand,
        reorder_point: v.reorder_point,
        is_available: v.is_available,
        option1_name: v.option1_name,
        option1_value: v.option1_value,
        option2_name: v.option2_name,
        option2_value: v.option2_value,
        option3_name: v.option3_name,
        option3_value: v.option3_value,
        display_order: v.display_order,
      }));

      setImages(productImages);
      setOptions(productOptions);
      setVariants(productVariants);

      // Pre-select first option values
      if (productOptions.length > 0) {
        const initial: Record<string, string> = {};
        productOptions.forEach((opt) => {
          if (opt.values.length > 0) initial[opt.name] = opt.values[0];
        });
        setSelectedOptions(initial);
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find matching variant when options change
  useEffect(() => {
    if (variants.length === 0) {
      setSelectedVariant(null);
      return;
    }

    const match = variants.find((v) => {
      const checks: boolean[] = [];
      if (v.option1_name && selectedOptions[v.option1_name]) {
        checks.push(v.option1_value === selectedOptions[v.option1_name]);
      }
      if (v.option2_name && selectedOptions[v.option2_name]) {
        checks.push(v.option2_value === selectedOptions[v.option2_name]);
      }
      if (v.option3_name && selectedOptions[v.option3_name]) {
        checks.push(v.option3_value === selectedOptions[v.option3_name]);
      }
      return checks.length > 0 && checks.every(Boolean);
    });

    setSelectedVariant(match || null);
  }, [selectedOptions, variants]);

  if (!item) return null;

  const displayPrice = selectedVariant?.price_cents ?? item.price_cents;
  const compareAtPrice =
    selectedVariant?.compare_at_price_cents ?? item.compare_at_price_cents ?? null;
  const inStock =
    variants.length === 0
      ? item.is_available
      : selectedVariant
      ? selectedVariant.quantity_on_hand > 0 && selectedVariant.is_available
      : false;
  const stockQty = selectedVariant?.quantity_on_hand ?? null;
  const lowStock = stockQty !== null && stockQty > 0 && stockQty <= 5;
  const needsVariantSelection = variants.length > 0 && !selectedVariant;

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleAddToCart = () => {
    if (needsVariantSelection) return;
    onAddToCart(item, quantity, selectedVariant);
    onClose();
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Check which option values are available (have in-stock variants)
  const getAvailableValuesForOption = (optionName: string): Set<string> => {
    const available = new Set<string>();
    variants.forEach((v) => {
      if (!v.is_available || v.quantity_on_hand <= 0) return;
      if (v.option1_name === optionName) available.add(v.option1_value || '');
      if (v.option2_name === optionName) available.add(v.option2_value || '');
      if (v.option3_name === optionName) available.add(v.option3_value || '');
    });
    return available;
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      styles={{
        content: { backgroundColor: 'white' },
        body: { padding: 0 },
      }}
      transitionProps={{ transition: 'slide-up', duration: 300 }}
    >
      <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Top bar */}
        <Group
          justify="space-between"
          p="md"
          style={{
            borderBottom: '1px solid var(--mantine-color-gray-2)',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 10,
          }}
        >
          <ActionIcon variant="subtle" onClick={onClose} size="lg" radius="xl">
            <IconX size={22} />
          </ActionIcon>
          <Text size="sm" fw={600} c="dimmed" lineClamp={1}>
            {restaurantName}
          </Text>
          <Group gap="xs">
            <ActionIcon variant="subtle" size="lg" radius="xl">
              <IconHeart size={20} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="lg"
              radius="xl"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: item.name, text: item.description || '' });
                }
              }}
            >
              <IconShare size={20} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Scrollable content */}
        <ScrollArea style={{ flex: 1 }} ref={scrollRef}>
          {loading ? (
            <Box p="lg">
              <Skeleton height={350} mb="md" />
              <Skeleton height={24} width="60%" mb="sm" />
              <Skeleton height={16} width="40%" mb="lg" />
              <Skeleton height={40} mb="sm" />
              <Skeleton height={40} mb="sm" />
            </Box>
          ) : (
            <Box pb="140px">
              {/* Image Gallery */}
              <Box style={{ position: 'relative', backgroundColor: '#f8f8f8' }}>
                <Box style={{ width: '100%', height: '380px', overflow: 'hidden' }}>
                  <MantineImage
                    src={
                      images[activeImageIndex]?.image_url ||
                      'https://placehold.co/600x400/f5f5f5/999?text=No+Image'
                    }
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </Box>

                {images.length > 1 && (
                  <>
                    <ActionIcon
                      variant="filled"
                      color="dark"
                      size="md"
                      radius="xl"
                      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}
                      onClick={prevImage}
                    >
                      <IconChevronLeft size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="filled"
                      color="dark"
                      size="md"
                      radius="xl"
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}
                      onClick={nextImage}
                    >
                      <IconChevronRight size={18} />
                    </ActionIcon>

                    {/* Dots */}
                    <Group gap={6} justify="center" py="sm">
                      {images.map((_, idx) => (
                        <Box
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          style={{
                            width: idx === activeImageIndex ? 20 : 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: idx === activeImageIndex ? '#ff5f1f' : '#ccc',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </Group>

                    {/* Thumbnail strip */}
                    <ScrollArea scrollbars="x" type="never">
                      <Group gap="xs" px="md" pb="sm" style={{ flexWrap: 'nowrap' }}>
                        {images.map((img, idx) => (
                          <Box
                            key={img.id}
                            onClick={() => setActiveImageIndex(idx)}
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: idx === activeImageIndex ? '2px solid #ff5f1f' : '2px solid transparent',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            <MantineImage
                              src={img.image_url}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                        ))}
                      </Group>
                    </ScrollArea>
                  </>
                )}
              </Box>

              {/* Product Info */}
              <Box p="md">
                {/* Brand */}
                {item.brand && (
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>
                    {item.brand}
                  </Text>
                )}

                {/* Title */}
                <Title order={2} fw={700} style={{ fontSize: '22px', lineHeight: 1.3 }} mb="xs">
                  {item.name}
                </Title>

                {/* Price */}
                <Group gap="sm" mb="sm">
                  <Text size="xl" fw={700} c={compareAtPrice ? 'red.7' : 'dark'}>
                    {formatPrice(displayPrice)}
                  </Text>
                  {compareAtPrice && compareAtPrice > displayPrice && (
                    <Text size="md" c="dimmed" td="line-through">
                      {formatPrice(compareAtPrice)}
                    </Text>
                  )}
                  {compareAtPrice && compareAtPrice > displayPrice && (
                    <Badge color="red" variant="light" size="sm">
                      {Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100)}% OFF
                    </Badge>
                  )}
                </Group>

                {/* Star rating placeholder */}
                <Group gap={4} mb="sm">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <IconStar
                      key={s}
                      size={16}
                      style={{
                        color: s <= 4 ? '#f59e0b' : '#d1d5db',
                        fill: s <= 4 ? '#f59e0b' : 'none',
                      }}
                    />
                  ))}
                  <Text size="xs" c="dimmed">
                    (New)
                  </Text>
                </Group>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <Group gap={6} mb="md">
                    {item.tags.slice(0, 6).map((tag) => (
                      <Badge key={tag} variant="outline" color="gray" size="sm" radius="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                )}

                {/* Stock Status */}
                <Box mb="md">
                  {!inStock && variants.length > 0 && selectedVariant && (
                    <Group gap={6}>
                      <IconAlertTriangle size={16} style={{ color: 'var(--mantine-color-red-6)' }} />
                      <Text size="sm" fw={600} c="red.6">
                        Out of Stock
                      </Text>
                    </Group>
                  )}
                  {lowStock && (
                    <Group gap={6}>
                      <IconAlertTriangle size={16} style={{ color: 'var(--mantine-color-orange-6)' }} />
                      <Text size="sm" fw={600} c="orange.6">
                        Only {stockQty} left!
                      </Text>
                    </Group>
                  )}
                  {inStock && !lowStock && (
                    <Group gap={6}>
                      <IconCheck size={16} style={{ color: 'var(--mantine-color-green-6)' }} />
                      <Text size="sm" fw={600} c="green.6">
                        In Stock
                      </Text>
                    </Group>
                  )}
                  {needsVariantSelection && (
                    <Text size="sm" c="dimmed" fs="italic">
                      Select options to see availability
                    </Text>
                  )}
                </Box>

                <Divider mb="md" />

                {/* Variant Selectors */}
                {options.length > 0 && (
                  <Box mb="md">
                    <Text size="sm" fw={700} mb="sm">
                      Select Options
                    </Text>
                    <Stack gap="md">
                      {options.map((opt) => {
                        const availableValues = getAvailableValuesForOption(opt.name);
                        return (
                          <Box key={opt.id}>
                            <Text size="sm" fw={600} mb={6}>
                              {opt.name}:{' '}
                              <Text span fw={400} c="dimmed">
                                {selectedOptions[opt.name] || 'Select'}
                              </Text>
                            </Text>
                            <Group gap={8}>
                              {opt.values.map((val) => {
                                const isSelected = selectedOptions[opt.name] === val;
                                const isAvailable = availableValues.size === 0 || availableValues.has(val);
                                return (
                                  <Button
                                    key={val}
                                    size="sm"
                                    radius="md"
                                    variant={isSelected ? 'filled' : 'outline'}
                                    color={isSelected ? 'dark' : 'gray'}
                                    disabled={!isAvailable}
                                    onClick={() => {
                                      setSelectedOptions((prev) => ({
                                        ...prev,
                                        [opt.name]: val,
                                      }));
                                    }}
                                    style={{
                                      opacity: isAvailable ? 1 : 0.4,
                                      textDecoration: isAvailable ? 'none' : 'line-through',
                                      minWidth: 48,
                                    }}
                                  >
                                    {val}
                                  </Button>
                                );
                              })}
                            </Group>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}

                {/* Selected variant SKU */}
                {selectedVariant && (
                  <Text size="xs" c="dimmed" mb="sm">
                    SKU: {selectedVariant.sku}
                  </Text>
                )}

                <Divider mb="md" />

                {/* Description */}
                {item.description && (
                  <Box mb="md">
                    <Text size="sm" fw={700} mb="xs">
                      Description
                    </Text>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      {item.description}
                    </Text>
                  </Box>
                )}

                {/* Shipping Info */}
                {item.requires_shipping && (
                  <Card withBorder p="sm" radius="md" mb="md">
                    <Group gap="sm">
                      <IconTruck size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
                      <Box>
                        <Text size="sm" fw={600}>
                          Shipping
                        </Text>
                        <Text size="xs" c="dimmed">
                          {item.weight_value && item.weight_unit
                            ? `Weight: ${item.weight_value} ${item.weight_unit}`
                            : 'Standard shipping available'}
                        </Text>
                      </Box>
                    </Group>
                  </Card>
                )}

                {/* Product type badge */}
                {item.product_type && (
                  <Group gap="sm" mb="md">
                    <IconPackage size={16} style={{ color: 'var(--mantine-color-gray-6)' }} />
                    <Text size="xs" c="dimmed" tt="capitalize">
                      {item.product_type} product
                    </Text>
                  </Group>
                )}
              </Box>
            </Box>
          )}
        </ScrollArea>

        {/* Bottom bar: quantity + add to cart */}
        <Box
          p="md"
          style={{
            borderTop: '1px solid var(--mantine-color-gray-2)',
            backgroundColor: 'white',
            position: 'sticky',
            bottom: 0,
          }}
        >
          <Group gap="md">
            {/* Quantity */}
            <Group
              gap={0}
              style={{
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <IconMinus size={16} />
              </ActionIcon>
              <Box px="md" py="xs" style={{ minWidth: 36, textAlign: 'center' }}>
                <Text fw={700}>{quantity}</Text>
              </Box>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={stockQty !== null && quantity >= stockQty}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Group>

            {/* Add to Cart */}
            <Button
              color="orange"
              radius="md"
              style={{ flex: 1, height: 48, fontWeight: 700 }}
              onClick={handleAddToCart}
              disabled={!inStock || needsVariantSelection}
              leftSection={<IconShoppingCart size={20} />}
            >
              <Group justify="space-between" style={{ width: '100%' }}>
                <Text fw={600}>
                  {needsVariantSelection
                    ? 'Select Options'
                    : !inStock
                    ? 'Out of Stock'
                    : 'Add to Cart'}
                </Text>
                {!needsVariantSelection && inStock && (
                  <Text fw={700}>{formatPrice(displayPrice * quantity)}</Text>
                )}
              </Group>
            </Button>
          </Group>
        </Box>
      </Box>
    </Modal>
  );
};

export default RetailItemDetailModal;

