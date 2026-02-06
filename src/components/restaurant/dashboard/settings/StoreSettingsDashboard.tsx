import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Instagram, Image, Plus, ExternalLink } from "lucide-react";
import { AddressAutocomplete } from "@/components/common/AddressAutocomplete";
import ImageCropper from "@/components/common/ImageCropper";
import RestaurantHours from "@/components/restaurant/RestaurantHours";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { isPngLogo } from "@/utils/logoUtils";
import { toast } from "sonner";

const StoreSettingsDashboard = () => {
  const { restaurant, loading } = useRestaurantData();
  const [headerPhoto, setHeaderPhoto] = useState<string | null>(null);
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState("");
  const [currentImageType, setCurrentImageType] = useState<"header" | "logo">("header");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [isEditingInstagram, setIsEditingInstagram] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeAddress2, setStoreAddress2] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storeState, setStoreState] = useState("");
  const [storeZip, setStoreZip] = useState("");
  const [storeWebsite, setStoreWebsite] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeType, setStoreType] = useState<string>("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Restaurant type options (matching QualificationStep)
  const restaurantTypeOptions = [
    { value: "full_service", label: "Full Service Restaurant" },
    { value: "fast_casual", label: "Fast Casual" },
    { value: "quick_service", label: "Quick Service (Fast Food)" },
    { value: "cafe", label: "Café or Coffee Shop" },
    { value: "bakery", label: "Bakery" },
    { value: "ghost_kitchen", label: "Ghost Kitchen/Virtual Brand" },
    { value: "catering", label: "Catering Only" },
    { value: "food_truck", label: "Food Truck" },
    { value: "retail_store", label: "Retail Store" },
  ];

  useEffect(() => {
    if (restaurant) {
      setStoreName(restaurant.name || "");
      setStorePhone(restaurant.phone || "");
      setStoreAddress(restaurant.address || "");
      setStoreCity(restaurant.city || "");
      setStoreState(restaurant.state || "");
      setStoreZip(restaurant.zip_code || "");
      setStoreDescription(restaurant.description || "");
      setHeaderPhoto(restaurant.header_image_url || null);
      setLogoPhoto(restaurant.logo_url || null);
      setInstagramHandle(restaurant.instagram_handle || "");
      setStoreType(restaurant.restaurant_type || "");
    }
  }, [restaurant]);

  const handleImageSelect = (type: "header" | "logo", file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCurrentImageSrc(e.target?.result as string);
      setCurrentImageType(type);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSaving(true);
    try {
      const fileExt = 'jpg';
      const fileName = `${restaurant?.id}/${currentImageType}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      const updateField = currentImageType === 'header' ? 'header_image_url' : 'logo_url';
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ [updateField]: publicUrl })
        .eq('id', restaurant?.id);

      if (updateError) throw updateError;

      if (currentImageType === 'header') {
        setHeaderPhoto(publicUrl);
      } else {
        setLogoPhoto(publicUrl);
      }

      toast.success(`${currentImageType === 'header' ? 'Header' : 'Logo'} updated successfully`);
      setCropperOpen(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveField = async (field: string, value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ [field]: value })
        .eq('id', restaurant?.id);

      if (error) throw error;
      toast.success('Updated successfully');
      setEditingField(null);
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInstagram = async () => {
    if (instagramHandle) {
      await handleSaveField('instagram_handle', instagramHandle);
      setIsEditingInstagram(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <Card>
          <CardContent className="p-20 text-center">
            <p>Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Details */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">Store details</h2>
              
              <div className="space-y-6">
                {/* Store Name */}
                {editingField === 'name' ? (
                  <Dialog open={editingField === 'name'} onOpenChange={(open) => !open && setEditingField(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Store Name</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Store Name</Label>
                          <Input
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={() => handleSaveField('name', storeName)}
                          disabled={saving}
                          className="w-full"
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold mb-1">Store name</h3>
                      <p>{storeName || 'Not set'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingField('name')}>Edit</Button>
                  </div>
                )}

                {/* Store Type */}
                {editingField === 'restaurant_type' ? (
                  <Dialog open={editingField === 'restaurant_type'} onOpenChange={(open) => !open && setEditingField(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Store Type</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Store Type</Label>
                          <Select
                            value={storeType}
                            onValueChange={(value) => setStoreType(value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select store type" />
                            </SelectTrigger>
                            <SelectContent>
                              {restaurantTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={() => handleSaveField('restaurant_type', storeType)}
                          disabled={saving}
                          className="w-full"
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold mb-1">Store type</h3>
                      <p>
                        {storeType 
                          ? restaurantTypeOptions.find(opt => opt.value === storeType)?.label || storeType
                          : 'Not set'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingField('restaurant_type')}>Edit</Button>
                  </div>
                )}

                {/* Address */}
                {editingField === 'address' ? (
                  <Dialog open={editingField === 'address'} onOpenChange={(open) => !open && setEditingField(null)}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Address</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Search Address</Label>
                          <AddressAutocomplete
                            value={storeAddress}
                            onChange={(value, coordinates) => {
                              setStoreAddress(value);
                              if (coordinates) {
                                (window as any).__tempAddressCoords = coordinates;
                              }
                            }}
                            onAddressParsed={(parsed) => {
                              console.log('Address parsed:', parsed);
                              
                              // Clear all fields first
                              setStoreAddress('');
                              setStoreAddress2('');
                              setStoreCity('');
                              setStoreState('');
                              setStoreZip('');
                              
                              // Then populate with parsed data
                              setTimeout(() => {
                                setStoreAddress(parsed.street || '');
                                setStoreAddress2(parsed.unitNumber || '');
                                setStoreCity(parsed.city || '');
                                setStoreState(parsed.state || '');
                                setStoreZip(parsed.zipCode || '');
                              }, 10);
                            }}
                            placeholder="Start typing to search address..."
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Search and select your address to auto-fill all fields
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Address Line 1 (Street)*</Label>
                            <Input
                              value={storeAddress}
                              onChange={(e) => setStoreAddress(e.target.value)}
                              placeholder="123 Main St"
                            />
                          </div>
                          <div>
                            <Label>Address Line 2 (Unit/Apt)</Label>
                            <Input
                              value={storeAddress2}
                              onChange={(e) => setStoreAddress2(e.target.value)}
                              placeholder="Unit 5, Apt 2B, etc."
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>City*</Label>
                            <Input
                              value={storeCity}
                              onChange={(e) => setStoreCity(e.target.value)}
                              placeholder="City"
                            />
                          </div>
                          <div>
                            <Label>State*</Label>
                            <Input
                              value={storeState}
                              onChange={(e) => setStoreState(e.target.value.toUpperCase())}
                              placeholder="CA"
                              maxLength={2}
                            />
                          </div>
                          <div>
                            <Label>ZIP Code*</Label>
                            <Input
                              value={storeZip}
                              onChange={(e) => setStoreZip(e.target.value)}
                              placeholder="90210"
                              maxLength={10}
                            />
                          </div>
                        </div>
                        
                        <Button 
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const coords = (window as any).__tempAddressCoords;
                              
                              // Build full address for display
                              const fullAddress = [
                                storeAddress,
                                storeAddress2,
                                storeCity,
                                storeState,
                                storeZip
                              ].filter(Boolean).join(', ');
                              
                              const updates: any = {
                                address: storeAddress,
                                city: storeCity,
                                state: storeState,
                                zip_code: storeZip
                              };
                              
                              if (coords) {
                                updates.latitude = coords.lat;
                                updates.longitude = coords.lng;
                              }
                              
                              const { error } = await supabase
                                .from('restaurants')
                                .update(updates)
                                .eq('id', restaurant?.id);
                              
                              if (error) throw error;
                              
                              toast.success('Address updated successfully');
                              setEditingField(null);
                              delete (window as any).__tempAddressCoords;
                            } catch (error) {
                              console.error('Error updating address:', error);
                              toast.error('Failed to update address');
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving || !storeAddress || !storeCity || !storeState || !storeZip}
                          className="w-full"
                        >
                          {saving ? "Saving..." : "Save Address"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="flex justify-between items-start pt-4 border-t">
                    <div>
                      <h3 className="font-semibold mb-1">Address</h3>
                      <p className="text-sm">
                        {[
                          storeAddress,
                          storeAddress2,
                          storeCity,
                          storeState,
                          storeZip
                        ].filter(Boolean).join(', ') || 'Not set'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingField('address')}>Edit</Button>
                  </div>
                )}

                {/* Phone */}
                {editingField === 'phone' ? (
                  <Dialog open={editingField === 'phone'} onOpenChange={(open) => !open && setEditingField(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Phone Number</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Phone Number</Label>
                          <Input
                            value={storePhone}
                            onChange={(e) => setStorePhone(e.target.value)}
                            type="tel"
                          />
                        </div>
                        <Button 
                          onClick={() => handleSaveField('phone', storePhone)}
                          disabled={saving}
                          className="w-full"
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="flex justify-between items-start pt-4 border-t">
                    <div>
                      <h3 className="font-semibold mb-1">Phone number</h3>
                      <p className="text-sm">{storePhone || 'Not set'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This phone number is used to send or confirm orders and verify your store is open
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingField('phone')}>Edit</Button>
                  </div>
                )}

                {/* Description */}
                {editingField === 'description' ? (
                  <Dialog open={editingField === 'description'} onOpenChange={(open) => !open && setEditingField(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Description</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={storeDescription}
                            onChange={(e) => setStoreDescription(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <Button 
                          onClick={() => handleSaveField('description', storeDescription)}
                          disabled={saving}
                          className="w-full"
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="flex justify-between items-start pt-4 border-t">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Description</h3>
                      {storeDescription ? (
                        <p className="text-sm">{storeDescription}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Write a short description of your store for customers to read on your Crave'N store page
                        </p>
                      )}
                    </div>
                    <Button 
                      variant={storeDescription ? "outline" : "destructive"} 
                      size="sm" 
                      onClick={() => setEditingField('description')}
                    >
                      {storeDescription ? "Edit" : "Add"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          {restaurant?.id && (
            <RestaurantHours restaurantId={restaurant.id} />
          )}

          {/* Brand Assets */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">Brand assets</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Showcase your brand on Crave'N by adding photos.
              </p>

              <div className="space-y-4">
                <input
                  ref={headerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    console.log('Header file input changed', e.target.files);
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('Selected header file:', file.name, file.type);
                      handleImageSelect("header", file);
                    }
                    e.target.value = ''; // Reset input to allow same file selection
                  }}
                />
                {headerPhoto ? (
                  <div className="border-2 rounded-lg overflow-hidden">
                    <div className="relative">
                      <img src={headerPhoto} alt="Header" className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Header button clicked, opening file dialog');
                            headerInputRef.current?.click();
                          }}
                          variant="secondary"
                          size="sm"
                        >
                          Change photo
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-1">Header photo</h3>
                      <p className="text-sm text-muted-foreground">
                        This photo appears at the top of your store page.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1">Header photo</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add a photo to make sure your store shows up in search and categories.
                    </p>
                    <Button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Add header photo button clicked, opening file dialog');
                        headerInputRef.current?.click();
                      }}
                    >
                      Add photo
                    </Button>
                  </div>
                )}

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect("logo", file);
                  }}
                />
                {logoPhoto ? (
                  <div className="border-2 rounded-lg overflow-hidden">
                    <div className="relative flex justify-center p-6 bg-muted">
                      <div className="relative">
                        <img src={logoPhoto} alt="Logo" className={`w-32 h-32 rounded-full object-cover ${isPngLogo(logoPhoto) ? 'bg-white' : ''}`} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                          <Button 
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            variant="secondary"
                            size="sm"
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-1">Logo</h3>
                      <p className="text-sm text-muted-foreground">
                        Your logo appears on your store page and in search results.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1">Logo</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add a logo to make sure your store shows up in search and categories.
                    </p>
                    <Button 
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Add logo
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instagram Account */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">Instagram account</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Connect your Instagram account to feature content directly on Crave'N.
              </p>

              {!instagramHandle || isEditingInstagram ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-medium">@</span>
                      <Input
                        placeholder="yourusername"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
                        className="flex-1"
                      />
                    </div>
                    <Button 
                      variant="destructive"
                      onClick={handleSaveInstagram}
                      disabled={!instagramHandle || saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your Instagram username to link your profile.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Instagram className="w-6 h-6 text-pink-600" />
                    <div>
                      <h3 className="font-semibold">@{instagramHandle}</h3>
                      <p className="text-sm text-muted-foreground">Connected Instagram account</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`https://instagram.com/${instagramHandle}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditingInstagram(true)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - 1/3 width */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Your store preview</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Preview how your store appears to customers
              </p>

              <div className="bg-muted rounded-lg overflow-hidden">
                <div className="relative h-32 bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center">
                  {headerPhoto ? (
                    <img src={headerPhoto} alt="Header" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-sm text-muted-foreground px-4 text-center">
                      Add a header photo
                    </p>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`relative w-16 h-16 rounded-full ${isPngLogo(logoPhoto) ? 'bg-white' : 'bg-gray-300'} flex items-center justify-center overflow-hidden`}>
                      {logoPhoto ? (
                        <img src={logoPhoto} alt="Logo" className={`w-full h-full object-cover ${isPngLogo(logoPhoto) ? 'bg-white' : ''}`} />
                      ) : (
                        <span className="text-xs">Logo</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold">{storeName || 'Your Store'}</h4>
                      <p className="text-xs text-muted-foreground">
                        {storeDescription ? storeDescription.substring(0, 50) + '...' : 'Add description'}
                      </p>
                    </div>
                  </div>
                  
                  {instagramHandle && (
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Instagram className="w-4 h-4 text-pink-600" />
                      <span className="text-sm">@{instagramHandle}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Cropper Dialog */}
      {cropperOpen && (
        <ImageCropper
          isOpen={cropperOpen}
          onClose={() => setCropperOpen(false)}
          imageSrc={currentImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={currentImageType === "header" ? 16 / 9 : 1}
          cropShape={currentImageType === "logo" ? "round" : "rect"}
        />
      )}
    </div>
  );
};

export default StoreSettingsDashboard;
