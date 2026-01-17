import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  TextInput,
  Textarea,
  Switch,
  Select,
  Tabs,
  Text,
  Title,
  Stack,
  Group,
  Box,
  Loader,
  ActionIcon,
  Divider,
  FileButton,
  Image as MantineImage,
  Grid,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDeviceFloppy,
  IconClock,
  IconCurrencyDollar,
  IconMapPin,
  IconUpload,
  IconX,
  IconPhoto,
  IconCrop,
  IconScissors,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import ImageCropper from "@/components/common/ImageCropper";
import { removeBackground, loadImage } from "@/utils/BackgroundRemovalService";
import { AddressAutocomplete } from "@/components/common/AddressAutocomplete";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  delivery_fee_cents: number;
  min_delivery_time: number;
  max_delivery_time: number;
  is_active: boolean;
  image_url?: string;
  logo_url?: string;
}

interface RestaurantSettingsProps {
  restaurant: Restaurant;
  onUpdate: () => void;
}

const cuisineTypes = [
  "American", "Italian", "Chinese", "Mexican", "Japanese", "Indian", 
  "Thai", "Mediterranean", "French", "Greek", "Korean", "Vietnamese",
  "Middle Eastern", "Seafood", "Steakhouse", "Pizza", "Burgers", 
  "BBQ", "Vegetarian", "Vegan", "Fast Food", "Other"
];

export const RestaurantSettings = ({ restaurant, onUpdate }: RestaurantSettingsProps) => {
  const [formData, setFormData] = useState(restaurant);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');
  const [cropperImageType, setCropperImageType] = useState<'image' | 'logo'>('logo');
  const [removingBackground, setRemovingBackground] = useState(false);

  useEffect(() => {
    setFormData(restaurant);
  }, [restaurant]);

  const handleInputChange = (field: keyof Restaurant, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadImage = async (file: File | Blob, type: 'image' | 'logo'): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file instanceof File ? file.name.split('.').pop() : 'png';
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      notifications.show({
        title: "Error",
        message: "Failed to upload image",
        color: 'red',
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'logo') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifications.show({
        title: "Error",
        message: "Please select an image file",
        color: 'red',
      });
      return;
    }

    // Create URL for the cropper
    const imageUrl = URL.createObjectURL(file);
    setCropperImageSrc(imageUrl);
    setCropperImageType(type);
    setCropperOpen(true);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setCropperOpen(false);
    
    const imageUrl = await uploadImage(croppedImageBlob, cropperImageType);
    if (imageUrl) {
      const field = cropperImageType === 'logo' ? 'logo_url' : 'image_url';
      handleInputChange(field, imageUrl);
    }
    
    // Clean up the URL
    URL.revokeObjectURL(cropperImageSrc);
  };

  const handleRemoveBackground = async (type: 'image' | 'logo') => {
    const currentImageUrl = type === 'logo' ? formData.logo_url : formData.image_url;
    if (!currentImageUrl) {
      notifications.show({
        title: "Error",
        message: "No image to process",
        color: 'red',
      });
      return;
    }

    setRemovingBackground(true);
    try {
      // Load the current image
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const imageElement = await loadImage(blob);
      
      // Remove background
      const processedBlob = await removeBackground(imageElement);
      
      // Upload the processed image
      const imageUrl = await uploadImage(processedBlob, type);
      if (imageUrl) {
        const field = type === 'logo' ? 'logo_url' : 'image_url';
        handleInputChange(field, imageUrl);
        notifications.show({
          title: "Success",
          message: "Background removed successfully",
          color: 'green',
        });
      }
    } catch (error) {
      console.error('Error removing background:', error);
      notifications.show({
        title: "Error",
        message: "Failed to remove background. Make sure your browser supports WebGPU.",
        color: 'red',
      });
    } finally {
      setRemovingBackground(false);
    }
  };


  const saveBasicInfo = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: formData.name,
          description: formData.description,
          cuisine_type: formData.cuisine_type,
          phone: formData.phone,
          email: formData.email,
          image_url: formData.image_url,
          logo_url: formData.logo_url,
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      notifications.show({
        title: "Success",
        message: "Basic information updated successfully",
        color: 'green',
      });

      onUpdate();
    } catch (error) {
      console.error("Error updating basic info:", error);
      notifications.show({
        title: "Error",
        message: "Failed to update basic information",
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      notifications.show({
        title: "Success",
        message: "Address updated successfully",
        color: 'green',
      });

      onUpdate();
    } catch (error) {
      console.error("Error updating address:", error);
      notifications.show({
        title: "Error",
        message: "Failed to update address",
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveDeliverySettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          delivery_fee_cents: formData.delivery_fee_cents,
          min_delivery_time: formData.min_delivery_time,
          max_delivery_time: formData.max_delivery_time,
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      notifications.show({
        title: "Success",
        message: "Delivery settings updated successfully",
        color: 'green',
      });

      onUpdate();
    } catch (error) {
      console.error("Error updating delivery settings:", error);
      notifications.show({
        title: "Error",
        message: "Failed to update delivery settings",
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActiveStatus = async () => {
    setSaving(true);
    try {
      const newStatus = !formData.is_active;
      const { error } = await supabase
        .from("restaurants")
        .update({ is_active: newStatus })
        .eq("id", restaurant.id);

      if (error) throw error;

      setFormData(prev => ({ ...prev, is_active: newStatus }));
      
      notifications.show({
        title: "Success", 
        message: `Restaurant ${newStatus ? 'activated' : 'deactivated'} successfully`,
        color: 'green',
      });

      onUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      notifications.show({
        title: "Error",
        message: "Failed to update restaurant status",
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="xl">
      <Tabs defaultValue="basic">
        <Tabs.List>
          <Tabs.Tab value="basic">Basic Info</Tabs.Tab>
          <Tabs.Tab value="images">Images</Tabs.Tab>
          <Tabs.Tab value="address">Address</Tabs.Tab>
          <Tabs.Tab value="delivery">Delivery</Tabs.Tab>
          <Tabs.Tab value="status">Status</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="basic" pt="md">
          <Stack gap="md">
            <Card p="md" withBorder>
              <Stack gap="md">
                <Stack gap="xs">
                  <Title order={4}>Basic Information</Title>
                  <Text size="sm" c="dimmed">
                    Update your restaurant's basic information
                  </Text>
                </Stack>
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Restaurant Name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select 
                      label="Cuisine Type"
                      value={formData.cuisine_type} 
                      onChange={(value) => handleInputChange('cuisine_type', value)}
                      data={cuisineTypes.map(cuisine => ({ value: cuisine, label: cuisine }))}
                    />
                  </Grid.Col>
                </Grid>
                
                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />

                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Phone"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </Grid.Col>
                </Grid>

                <Button onClick={saveBasicInfo} disabled={saving} leftSection={saving ? <Loader size="sm" /> : <IconDeviceFloppy size={16} />}>
                  {saving ? "Saving..." : "Save Basic Info"}
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="images" pt="md">
          <Stack gap="md">
            <Card p="md" withBorder>
              <Stack gap="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconPhoto size={20} />
                    <Title order={4}>Restaurant Images</Title>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Upload your restaurant logo and photos
                  </Text>
                </Stack>
                <Stack gap="lg">
                  <Stack gap="xs">
                    <Text fw={500}>Restaurant Logo</Text>
                    <FileButton
                      onChange={(file) => file && handleImageSelect({ target: { files: [file] } } as any, 'logo')}
                      accept="image/*"
                      disabled={uploadingImage || removingBackground}
                    >
                      {(props) => (
                        <Button {...props} variant="outline" leftSection={<IconUpload size={16} />}>
                          Upload Logo
                        </Button>
                      )}
                    </FileButton>
                    {formData.logo_url && (
                      <Group gap="xs">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveBackground('logo')}
                          disabled={uploadingImage || removingBackground}
                          leftSection={removingBackground ? <Loader size="xs" /> : <IconScissors size={16} />}
                        >
                          {removingBackground ? 'Removing...' : 'Remove Background'}
                        </Button>
                      </Group>
                    )}
                    {(uploadingImage || removingBackground) && (
                      <Group gap="xs">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed">
                          {uploadingImage ? 'Uploading logo...' : 'Processing image...'}
                        </Text>
                      </Group>
                    )}
                    {formData.logo_url && (
                      <Box style={{ position: 'relative', width: '128px', height: '128px' }}>
                        <MantineImage
                          src={formData.logo_url}
                          alt="Restaurant logo"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                          fit="cover"
                        />
                        <ActionIcon
                          color="red"
                          size="sm"
                          style={{ position: 'absolute', top: -8, right: -8 }}
                          onClick={() => handleInputChange('logo_url', '')}
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      </Box>
                    )}
                  </Stack>

                  <Stack gap="xs">
                    <Text fw={500}>Restaurant Photo</Text>
                    <FileButton
                      onChange={(file) => file && handleImageSelect({ target: { files: [file] } } as any, 'image')}
                      accept="image/*"
                      disabled={uploadingImage || removingBackground}
                    >
                      {(props) => (
                        <Button {...props} variant="outline" leftSection={<IconUpload size={16} />}>
                          Upload Photo
                        </Button>
                      )}
                    </FileButton>
                    {(uploadingImage || removingBackground) && (
                      <Group gap="xs">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed">
                          {uploadingImage ? 'Uploading image...' : 'Processing image...'}
                        </Text>
                      </Group>
                    )}
                    {formData.image_url && (
                      <Box style={{ position: 'relative', width: '192px', height: '128px' }}>
                        <MantineImage
                          src={formData.image_url}
                          alt="Restaurant photo"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                          fit="cover"
                        />
                        <ActionIcon
                          color="red"
                          size="sm"
                          style={{ position: 'absolute', top: -8, right: -8 }}
                          onClick={() => handleInputChange('image_url', '')}
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      </Box>
                    )}
                  </Stack>
                </Stack>

                <Button onClick={saveBasicInfo} disabled={saving || uploadingImage || removingBackground} leftSection={saving ? <Loader size="sm" /> : <IconDeviceFloppy size={16} />}>
                  {saving ? "Saving..." : "Save Images"}
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="address" pt="md">
          <Stack gap="md">
            <Card p="md" withBorder>
              <Stack gap="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconMapPin size={20} />
                    <Title order={4}>Address Information</Title>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Update your restaurant's address
                  </Text>
                </Stack>
                <Stack gap="md">
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(value) => handleInputChange('address', value)}
                    onAddressParsed={(parsed) => {
                      setFormData(prev => ({
                        ...prev,
                        address: parsed.street,
                        city: parsed.city,
                        state: parsed.state,
                        zip_code: parsed.zipCode
                      }));
                    }}
                    placeholder="123 Main St, City, State 12345"
                    required
                  />

                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="City"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="State"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="ZIP Code"
                        value={formData.zip_code}
                        onChange={(e) => handleInputChange('zip_code', e.target.value)}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>

                <Button onClick={saveAddress} disabled={saving} leftSection={saving ? <Loader size="sm" /> : <IconDeviceFloppy size={16} />}>
                  {saving ? "Saving..." : "Save Address"}
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="delivery" pt="md">
          <Stack gap="md">
            <Card p="md" withBorder>
              <Stack gap="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconClock size={20} />
                    <Title order={4}>Delivery Settings</Title>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Configure your delivery options and timing
                  </Text>
                </Stack>
                <Stack gap="md">
                  <TextInput
                    label="Delivery Fee ($)"
                    type="number"
                    step="0.01"
                    value={formData.delivery_fee_cents / 100}
                    onChange={(e) => handleInputChange('delivery_fee_cents', Math.round(parseFloat(e.target.value) * 100))}
                    leftSection={<IconCurrencyDollar size={16} />}
                  />

                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Minimum Delivery Time (minutes)"
                        type="number"
                        value={formData.min_delivery_time}
                        onChange={(e) => handleInputChange('min_delivery_time', parseInt(e.target.value))}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Maximum Delivery Time (minutes)"
                        type="number"
                        value={formData.max_delivery_time}
                        onChange={(e) => handleInputChange('max_delivery_time', parseInt(e.target.value))}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>

                <Button onClick={saveDeliverySettings} disabled={saving} leftSection={saving ? <Loader size="sm" /> : <IconDeviceFloppy size={16} />}>
                  {saving ? "Saving..." : "Save Delivery Settings"}
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="status" pt="md">
          <Stack gap="md">
            <Card p="md" withBorder>
              <Stack gap="md">
                <Stack gap="xs">
                  <Title order={4}>Restaurant Status</Title>
                  <Text size="sm" c="dimmed">
                    Control whether your restaurant is accepting orders
                  </Text>
                </Stack>
                <Group justify="space-between" align="flex-start">
                  <Stack gap="xs">
                    <Text fw={500}>Restaurant Active</Text>
                    <Text size="sm" c="dimmed">
                      When active, customers can view and order from your restaurant
                    </Text>
                  </Stack>
                  <Switch
                    checked={formData.is_active}
                    onChange={() => toggleActiveStatus()}
                    disabled={saving}
                  />
                </Group>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <ImageCropper
        isOpen={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          URL.revokeObjectURL(cropperImageSrc);
        }}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={cropperImageType === 'logo' ? 1 : undefined}
        cropShape={cropperImageType === 'logo' ? 'round' : 'rect'}
      />
    </Stack>
  );
};