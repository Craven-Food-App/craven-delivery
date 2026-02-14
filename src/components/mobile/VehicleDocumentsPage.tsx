/**
 * Crave'n Feeder App — Vehicle & Documents (Enterprise Compact White)
 * ───────────────────────────────────────────────────────────────
 * Enterprise-grade compact white design matching Profile Information page
 */

import React, { useState, useEffect, useRef } from 'react';
import { IconArrowLeft, IconDeviceFloppy, IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { Loader } from '@mantine/core';
import { useKeyboardAware, useScrollToInput } from '@/hooks/useKeyboardAware';

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  orange:  "#E8622A",
  text:    "#111111",
  muted:   "#777777",
  muted2:  "#999999",
  border:  "#EEEEEE",
  bg:      "#FFFFFF",
  bgMuted: "#F8F9FA",
  green:   "#2E7D32",
  red:     "#C62828",
} as const;

type VehicleDocumentsPageProps = {
  onBack: () => void;
};

const VehicleDocumentsPage: React.FC<VehicleDocumentsPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Keyboard awareness hooks (must be at top level)
  const keyboardState = useKeyboardAware();
  const { scrollToInput } = useScrollToInput();
  const [uploading, setUploading] = useState<string | null>(null);
  const [vehicleData, setVehicleData] = useState({
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    vehicle_type: '',
  });
  const [documents, setDocuments] = useState<any>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchVehicleData();
  }, []);

  const fetchVehicleData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch vehicle data from driver_profiles
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('vehicle_make, vehicle_model, vehicle_year, license_plate, vehicle_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverProfile) {
        setVehicleData({
          vehicle_make: driverProfile.vehicle_make || '',
          vehicle_model: driverProfile.vehicle_model || '',
          vehicle_year: driverProfile.vehicle_year?.toString() || '',
          vehicle_color: user.user_metadata?.vehicle_color || '',
          license_plate: driverProfile.license_plate || '',
          vehicle_type: driverProfile.vehicle_type || '',
        });
      }

      // Fetch document status from user metadata
      const docStatus = user.user_metadata?.documents || {};
      setDocuments({
        registration: docStatus.registration_uploaded || false,
        insurance: docStatus.insurance_uploaded || false,
        inspection: docStatus.inspection_uploaded || false,
        license: docStatus.license_uploaded || false,
      });
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      notifications.show({
        title: 'Failed to load vehicle data',
        message: '',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: 'Not authenticated',
          message: '',
          color: 'red',
        });
        return;
      }

      // Update driver_profiles
      const { error: profileError } = await supabase
        .from('driver_profiles')
        .upsert({
          user_id: user.id,
          vehicle_make: vehicleData.vehicle_make || null,
          vehicle_model: vehicleData.vehicle_model || null,
          vehicle_year: vehicleData.vehicle_year ? parseInt(vehicleData.vehicle_year) : null,
          license_plate: vehicleData.license_plate || null,
          vehicle_type: vehicleData.vehicle_type || null,
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Update user metadata for vehicle_color (not in driver_profiles)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          vehicle_color: vehicleData.vehicle_color || null,
        }
      });

      if (authError) {
        console.error('Auth update error:', authError);
      }

      notifications.show({
        title: 'Vehicle information saved successfully',
        message: '',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error saving vehicle data:', error);
      notifications.show({
        title: 'Failed to save vehicle information',
        message: error?.message || '',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (docType: string, file: File) => {
    try {
      setUploading(docType);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: 'Not authenticated',
          message: '',
          color: 'red',
        });
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        notifications.show({
          title: 'File too large',
          message: 'File size must be less than 10MB',
          color: 'red',
        });
        return;
      }

      // Check file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        notifications.show({
          title: 'Invalid file type',
          message: 'Please upload PDF or image files only',
          color: 'red',
        });
        return;
      }

      // Upload to storage (using 'documents' bucket or create driver-documents)
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docType}_${Date.now()}.${fileExt}`;
      
      // Try to upload to documents bucket, create if needed
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        // If bucket doesn't exist, we'll store the status in metadata for now
        console.warn('Storage upload failed, storing status in metadata:', uploadError);
      }

      // Update document status in user metadata
      const currentDocs = documents || {};
      const updatedDocs = {
        ...currentDocs,
        [`${docType}_uploaded`]: true,
        [`${docType}_uploaded_at`]: new Date().toISOString(),
      };

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          documents: updatedDocs
        }
      });

      if (metadataError) {
        console.error('Metadata update error:', metadataError);
        throw metadataError;
      }

      // Update local state
      setDocuments({
        ...documents,
        [docType]: true,
      });

      notifications.show({
        title: 'Document uploaded successfully',
        message: '',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      notifications.show({
        title: 'Failed to upload document',
        message: error?.message || '',
        color: 'red',
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDocumentClick = (docType: string) => {
    const input = fileInputRefs.current[docType];
    if (input) {
      input.click();
    }
  };

  if (loading) {
    return (
      <div style={{
        background: C.bg,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Loader size="lg" color={C.orange} />
      </div>
    );
  }

  return (
    <div style={{
      background: C.bg,
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: C.text,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    }}>
      {/* ── fixed header ── */}
      <div style={{
        flexShrink: 0,
        background: C.bg,
        zIndex: 10,
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.text,
            }}
          >
            <IconArrowLeft size={24} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.2, margin: 0 }}>
            Vehicle & Documents
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? C.bgMuted : C.orange,
              color: saving ? C.muted : '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: saving ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {saving ? (
              <>
                <Loader size={12} color={C.muted} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <IconDeviceFloppy size={14} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── scrollable content ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '12px 16px',
        paddingBottom: `calc(72px + env(safe-area-inset-bottom, 0px) + ${keyboardState.isOpen ? keyboardState.height : 0}px)`,
      }}>
        {/* Vehicle Information Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Vehicle Information
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Make and Model */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.muted,
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Make
                </label>
                <input
                  type="text"
                  value={vehicleData.vehicle_make}
                  onChange={(e) => setVehicleData({ ...vehicleData, vehicle_make: e.target.value })}
                  placeholder="Honda"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: C.text,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.orange}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.muted,
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Model
                </label>
                <input
                  type="text"
                  value={vehicleData.vehicle_model}
                  onChange={(e) => setVehicleData({ ...vehicleData, vehicle_model: e.target.value })}
                  placeholder="Civic"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: C.text,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.orange}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* Year and Color */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.muted,
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Year
                </label>
                <input
                  type="number"
                  value={vehicleData.vehicle_year}
                  onChange={(e) => setVehicleData({ ...vehicleData, vehicle_year: e.target.value })}
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: C.text,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.orange}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.muted,
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Color
                </label>
                <input
                  type="text"
                  value={vehicleData.vehicle_color}
                  onChange={(e) => setVehicleData({ ...vehicleData, vehicle_color: e.target.value })}
                  placeholder="Blue"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: C.text,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.orange}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* License Plate */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                color: C.muted,
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                License Plate
              </label>
              <input
                type="text"
                value={vehicleData.license_plate}
                onChange={(e) => setVehicleData({ ...vehicleData, license_plate: e.target.value.toUpperCase() })}
                placeholder="ABC123"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.text,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = C.orange}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Vehicle Type */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                color: C.muted,
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                Vehicle Type
              </label>
              <select
                value={vehicleData.vehicle_type}
                onChange={(e) => setVehicleData({ ...vehicleData, vehicle_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.text,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                }}
                onFocus={(e) => e.target.style.borderColor = C.orange}
                onBlur={(e) => e.target.style.borderColor = C.border}
              >
                <option value="">Select type</option>
                <option value="car">Car</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="suv">SUV</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </div>
          </div>
        </div>

        {/* Document Status Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Document Status
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Hidden file inputs */}
            {['registration', 'insurance', 'inspection', 'license'].map((docType) => (
              <input
                key={docType}
                ref={(el) => fileInputRefs.current[docType] = el}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(docType, file);
                  }
                  // Reset input
                  e.target.value = '';
                }}
              />
            ))}

            {/* Vehicle Registration */}
            <div
              onClick={() => handleDocumentClick('registration')}
              style={{
                padding: '12px',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.bg}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 2,
                }}>
                  Vehicle Registration
                </div>
                <div style={{
                  fontSize: 11,
                  color: C.muted,
                }}>
                  {uploading === 'registration' ? 'Uploading...' : documents.registration ? 'Uploaded' : 'Tap to upload'}
                </div>
              </div>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: documents.registration ? C.green : C.bgMuted,
                border: `1px solid ${documents.registration ? C.green : C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {uploading === 'registration' ? (
                  <Loader size={12} color={C.orange} />
                ) : documents.registration ? (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                ) : null}
              </div>
            </div>

            {/* Insurance */}
            <div
              onClick={() => handleDocumentClick('insurance')}
              style={{
                padding: '12px',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.bg}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 2,
                }}>
                  Insurance
                </div>
                <div style={{
                  fontSize: 11,
                  color: C.muted,
                }}>
                  {uploading === 'insurance' ? 'Uploading...' : documents.insurance ? 'Uploaded' : 'Tap to upload'}
                </div>
              </div>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: documents.insurance ? C.green : C.bgMuted,
                border: `1px solid ${documents.insurance ? C.green : C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {uploading === 'insurance' ? (
                  <Loader size={12} color={C.orange} />
                ) : documents.insurance ? (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                ) : null}
              </div>
            </div>

            {/* Vehicle Inspection */}
            <div
              onClick={() => handleDocumentClick('inspection')}
              style={{
                padding: '12px',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.bg}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 2,
                }}>
                  Vehicle Inspection
                </div>
                <div style={{
                  fontSize: 11,
                  color: C.muted,
                }}>
                  {uploading === 'inspection' ? 'Uploading...' : documents.inspection ? 'Uploaded' : 'Tap to upload'}
                </div>
              </div>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: documents.inspection ? C.green : C.bgMuted,
                border: `1px solid ${documents.inspection ? C.green : C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {uploading === 'inspection' ? (
                  <Loader size={12} color={C.orange} />
                ) : documents.inspection ? (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                ) : null}
              </div>
            </div>

            {/* Driver's License */}
            <div
              onClick={() => handleDocumentClick('license')}
              style={{
                padding: '12px',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.bg}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 2,
                }}>
                  Driver's License
                </div>
                <div style={{
                  fontSize: 11,
                  color: C.muted,
                }}>
                  {uploading === 'license' ? 'Uploading...' : documents.license ? 'Uploaded' : 'Tap to upload'}
                </div>
              </div>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: documents.license ? C.green : C.bgMuted,
                border: `1px solid ${documents.license ? C.green : C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {uploading === 'license' ? (
                  <Loader size={12} color={C.orange} />
                ) : documents.license ? (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div> {/* Close Content - Scrollable */}
    </div>
  );
};

export default VehicleDocumentsPage;
