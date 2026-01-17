/**
 * Restaurant Menu Management Dashboard
 * Comprehensive menu editor with photo uploads, item availability, prep times
 * Competes with DoorDash's merchant menu management tools
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Button,
  Card,
  TextInput,
  Textarea,
  Switch,
  Badge,
  Tabs,
  Modal,
  Select,
  Stack,
  Group,
  Text,
  Title,
  Box,
  Loader,
  ActionIcon,
  FileButton,
  Image as MantineImage,
  Grid,
  Divider,
  MultiSelect,
  NumberInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUpload,
  IconClock,
  IconCurrencyDollar,
  IconEye,
  IconEyeOff,
  IconDeviceFloppy,
  IconX,
  IconPhoto,
  IconChefHat,
  IconTag,
} from '@tabler/icons-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category: string;
  is_available: boolean;
  prep_time_minutes?: number;
  dietary_tags?: string[];
  spice_level?: number;
  created_at: string;
  updated_at: string;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
  items: MenuItem[];
}

export function MenuManagement({ restaurantId }: { restaurantId: string }) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<MenuItem> | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Dietary tags
  const DIETARY_TAGS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Spicy', 'Halal', 'Kosher'];
  const CATEGORIES = ['Appetizers', 'Mains', 'Desserts', 'Drinks', 'Sides', 'Specials'];

  useEffect(() => {
    fetchMenuItems();
  }, [restaurantId]);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('category, name');

      if (error) throw error;

      // Group by category
      const grouped = (data as any).reduce((acc: Record<string, any[]>, item: any) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {});

      const categoriesData: MenuCategory[] = Object.keys(grouped).map((categoryName, index) => ({
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        display_order: index,
        items: grouped[categoryName]
      }));

      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load menu items',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setCurrentItem({
      name: '',
      description: '',
      price: 0,
      category: 'Mains',
      is_available: true,
      prep_time_minutes: 15,
      dietary_tags: [],
      spice_level: 0
    });
    setImagePreview(null);
    setEditDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setCurrentItem(item);
    setImagePreview(item.image_url || null);
    setEditDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!currentItem) return;

    try {
      const itemData = {
        ...currentItem,
        restaurant_id: restaurantId,
        updated_at: new Date().toISOString()
      };

      if (currentItem.id) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(itemData as any)
          .eq('id', currentItem.id);

        if (error) throw error;

        notifications.show({
          title: 'Success',
          message: 'Menu item updated successfully',
          color: 'green',
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData as any);

        if (error) throw error;

        notifications.show({
          title: 'Success',
          message: 'Menu item created successfully',
          color: 'green',
        });
      }

      setEditDialogOpen(false);
      fetchMenuItems();
    } catch (error) {
      console.error('Error saving item:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save menu item',
        color: 'red',
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Menu item deleted successfully',
        color: 'green',
      });

      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete menu item',
        color: 'red',
      });
    }
  };

  const handleToggleAvailability = async (itemId: string, currentAvailability: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentAvailability })
        .eq('id', itemId);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: `Item ${!currentAvailability ? 'enabled' : 'disabled'} successfully`,
        color: 'green',
      });

      fetchMenuItems();
    } catch (error) {
      console.error('Error toggling availability:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update item availability',
        color: 'red',
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notifications.show({
        title: 'Invalid File',
        message: 'Please upload an image file',
        color: 'red',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notifications.show({
        title: 'File Too Large',
        message: 'Please upload an image smaller than 5MB',
        color: 'red',
      });
      return;
    }

    setUploadingImage(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurantId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('menu-items')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('menu-items')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      setImagePreview(publicUrl);
      setCurrentItem(prev => prev ? { ...prev, image_url: publicUrl } : null);

      notifications.show({
        title: 'Success',
        message: 'Image uploaded successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to upload image',
        color: 'red',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setCurrentItem(prev => prev ? { ...prev, image_url: undefined } : null);
  };

  const toggleDietaryTag = (tag: string) => {
    setCurrentItem(prev => {
      if (!prev) return null;
      const tags = prev.dietary_tags || [];
      const newTags = tags.includes(tag)
        ? tags.filter(t => t !== tag)
        : [...tags, tag];
      return { ...prev, dietary_tags: newTags };
    });
  };

  if (loading) {
    return (
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <Loader size="lg" color="orange" />
      </Box>
    );
  }

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Title order={2}>Menu Management</Title>
          <Text c="dimmed">Manage your menu items, prices, and availability</Text>
        </Stack>
        <Button onClick={handleAddItem} leftSection={<IconPlus size={16} />} color="orange">
          Add Item
        </Button>
      </Group>

      {/* Menu Items by Category */}
      <Tabs defaultValue={categories[0]?.id || 'all'}>
        <Tabs.List>
          {categories.map(category => (
            <Tabs.Tab key={category.id} value={category.id}>
              {category.name} ({category.items.length})
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {categories.map(category => (
          <Tabs.Panel key={category.id} value={category.id} pt="md">
            <Grid gutter="md">
              {category.items.map(item => (
                <Grid.Col key={item.id} span={{ base: 12, md: 6, lg: 4 }}>
                  <Card p={0} withBorder style={{ overflow: 'hidden' }}>
                    {/* Item Image */}
                    {item.image_url ? (
                      <Box style={{ position: 'relative', height: '192px', backgroundColor: 'var(--mantine-color-gray-1)' }}>
                        <MantineImage
                          src={item.image_url}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          fit="cover"
                        />
                        {!item.is_available && (
                          <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Badge color="red" size="lg" leftSection={<IconEyeOff size={16} />}>
                              Unavailable
                            </Badge>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Box style={{ height: '192px', background: 'linear-gradient(to bottom right, var(--mantine-color-orange-1), var(--mantine-color-red-1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconPhoto size={64} style={{ color: 'var(--mantine-color-orange-3)' }} />
                      </Box>
                    )}

                    {/* Item Details */}
                    <Stack gap="md" p="md">
                      <Group justify="space-between" align="flex-start">
                        <Title order={4}>{item.name}</Title>
                        <Text size="lg" fw={700} c="orange.6">
                          ${(item.price / 100).toFixed(2)}
                        </Text>
                      </Group>

                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {item.description}
                      </Text>

                      {/* Prep Time & Tags */}
                      <Group gap="xs" wrap="wrap">
                        {item.prep_time_minutes && (
                          <Badge variant="outline" size="sm" leftSection={<IconClock size={12} />}>
                            {item.prep_time_minutes} min
                          </Badge>
                        )}
                        {item.dietary_tags?.map(tag => (
                          <Badge key={tag} variant="light" size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </Group>

                      {/* Actions */}
                      <Group gap="xs">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAvailability(item.id, item.is_available)}
                          style={{ flex: 1 }}
                          leftSection={item.is_available ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                        >
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </Button>
                        <ActionIcon
                          variant="outline"
                          size="lg"
                          onClick={() => handleEditItem(item)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="outline"
                          size="lg"
                          color="red"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>

            {category.items.length === 0 && (
              <Box p="xl" style={{ textAlign: 'center' }}>
                <Stack gap="md" align="center">
                  <IconChefHat size={64} style={{ color: 'var(--mantine-color-gray-3)' }} />
                  <Text c="dimmed">No items in this category yet</Text>
                  <Button variant="outline" onClick={handleAddItem}>
                    Add First Item
                  </Button>
                </Stack>
              </Box>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Edit/Add Item Modal */}
      <Modal
        opened={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title={currentItem?.id ? 'Edit Menu Item' : 'Add Menu Item'}
        size="xl"
        scrollAreaComponent={Stack}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {currentItem?.id ? 'Update' : 'Create'} your menu item with photos and details
          </Text>
          {/* Image Upload */}
          <Stack gap="xs">
            <Text fw={500}>Item Photo</Text>
            {imagePreview ? (
              <Box style={{ position: 'relative' }}>
                <MantineImage
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '100%', height: '256px', objectFit: 'cover', borderRadius: '8px' }}
                  fit="cover"
                />
                <ActionIcon
                  color="red"
                  size="sm"
                  style={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={handleRemoveImage}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Box>
            ) : (
              <FileButton
                onChange={(file) => file && handleImageUpload({ target: { files: [file] } } as any)}
                accept="image/*"
                disabled={uploadingImage}
              >
                {(props) => (
                  <Box
                    p="xl"
                    style={{ border: '2px dashed var(--mantine-color-gray-3)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
                    {...props}
                  >
                    <Stack gap="xs" align="center">
                      <IconUpload size={48} style={{ color: 'var(--mantine-color-gray-4)' }} />
                      <Text size="sm" c="dimmed">Click to upload or drag and drop</Text>
                      <Text size="xs" c="dimmed">PNG, JPG up to 5MB</Text>
                      <Button variant="outline" disabled={uploadingImage} leftSection={uploadingImage ? <Loader size="xs" /> : <IconUpload size={16} />}>
                        {uploadingImage ? 'Uploading...' : 'Choose File'}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </FileButton>
            )}
          </Stack>

          {/* Item Name */}
          <TextInput
            label="Item Name *"
            value={currentItem?.name || ''}
            onChange={(e) => setCurrentItem(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="e.g., Margherita Pizza"
          />

          {/* Description */}
          <Textarea
            label="Description *"
            value={currentItem?.description || ''}
            onChange={(e) => setCurrentItem(prev => prev ? { ...prev, description: e.target.value } : null)}
            placeholder="Describe your delicious dish..."
            rows={3}
          />

          {/* Price & Category */}
          <Grid gutter="md">
            <Grid.Col span={6}>
              <NumberInput
                label="Price *"
                value={(currentItem?.price || 0) / 100}
                onChange={(value) => setCurrentItem(prev => prev ? { ...prev, price: Math.round(Number(value || 0) * 100) } : null)}
                placeholder="0.00"
                min={0}
                step={0.01}
                decimalScale={2}
                leftSection={<IconCurrencyDollar size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Category *"
                value={currentItem?.category}
                onChange={(value) => setCurrentItem(prev => prev ? { ...prev, category: value || '' } : null)}
                data={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                placeholder="Select category"
              />
            </Grid.Col>
          </Grid>

          {/* Prep Time */}
          <NumberInput
            label="Prep Time (minutes)"
            value={currentItem?.prep_time_minutes || undefined}
            onChange={(value) => setCurrentItem(prev => prev ? { ...prev, prep_time_minutes: Number(value || 0) } : null)}
            placeholder="15"
            min={0}
            leftSection={<IconClock size={16} />}
          />

          {/* Dietary Tags */}
          <Stack gap="xs">
            <Text fw={500}>Dietary Tags</Text>
            <Group gap="xs" wrap="wrap">
              {DIETARY_TAGS.map(tag => (
                <Badge
                  key={tag}
                  variant={currentItem?.dietary_tags?.includes(tag) ? 'filled' : 'outline'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleDietaryTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </Group>
          </Stack>

          {/* Available Toggle */}
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
              <Text fw={500}>Item Availability</Text>
              <Text size="sm" c="dimmed">Make this item available for ordering</Text>
            </Stack>
            <Switch
              checked={currentItem?.is_available || false}
              onChange={(e) => setCurrentItem(prev => prev ? { ...prev, is_available: e.currentTarget.checked } : null)}
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem} disabled={!currentItem?.name || !currentItem?.description} leftSection={<IconDeviceFloppy size={16} />}>
              {currentItem?.id ? 'Update' : 'Create'} Item
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
