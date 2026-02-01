/**
 * Crave'n Feeder App — Profile Information (Enterprise Compact White)
 * ───────────────────────────────────────────────────────────────
 * Enterprise-grade compact white design matching Account/Ratings/Schedule pages
 */

import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
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
} as const;

type ProfileDetailsPageProps = {
  onBack: () => void;
};

const ProfileDetailsPage: React.FC<ProfileDetailsPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Keyboard awareness hooks (must be at top level)
  const keyboardState = useKeyboardAware();
  const { scrollToInput } = useScrollToInput();
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      setUser(authUser);

      // Fetch driver profile
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      // Fetch user profile from drivers table if exists
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, full_name, email, phone, city, zip')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (driverData) {
        setProfile(driverData);
        const nameParts = (driverData.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setFormData({
          firstName,
          lastName,
          email: authUser.email || driverData.email || '',
          phone: driverData.phone || '',
          dateOfBirth: authUser.user_metadata?.date_of_birth || '',
          streetAddress: authUser.user_metadata?.street_address || '',
          city: driverData.city || '',
          state: authUser.user_metadata?.state || '',
          zipCode: driverData.zip || '',
        });
      } else if (driverProfile) {
        setProfile(driverProfile);
        setFormData({
          firstName: authUser.user_metadata?.first_name || authUser.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: authUser.user_metadata?.last_name || authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          email: authUser.email || '',
          phone: authUser.user_metadata?.phone || '',
          dateOfBirth: authUser.user_metadata?.date_of_birth || '',
          streetAddress: authUser.user_metadata?.street_address || '',
          city: '',
          state: authUser.user_metadata?.state || '',
          zipCode: '',
        });
      } else {
        const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '';
        const nameParts = fullName.split(' ');
        setFormData({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: authUser.email || '',
          phone: authUser.user_metadata?.phone || '',
          dateOfBirth: authUser.user_metadata?.date_of_birth || '',
          streetAddress: authUser.user_metadata?.street_address || '',
          city: '',
          state: authUser.user_metadata?.state || '',
          zipCode: '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      notifications.show({
        title: 'Failed to load profile data',
        message: "",
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        notifications.show({
          title: 'Not authenticated',
          message: '',
          color: 'red',
        });
        return;
      }

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      if (!fullName) {
        notifications.show({
          title: 'Name is required',
          message: '',
          color: 'red',
        });
        return;
      }

      const { data: existingDriver, error: checkError } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking driver:', checkError);
        throw checkError;
      }

      if (!formData.city || !formData.zipCode || !formData.phone) {
        notifications.show({
          title: 'Name, Phone, City, and Zip Code are required',
          message: '',
          color: 'red',
        });
        return;
      }

      const updateData: any = {
        full_name: fullName,
        phone: formData.phone,
        city: formData.city,
        zip: formData.zipCode,
      };

      if (existingDriver) {
        const { data, error } = await supabase
          .from('drivers')
          .update(updateData)
          .eq('auth_user_id', authUser.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        if (!formData.city || !formData.zipCode || !formData.phone) {
          notifications.show({
            title: 'Name, Phone, City, and Zip Code are required',
            message: '',
            color: 'red',
          });
          return;
        }

        const insertData: any = {
          auth_user_id: authUser.id,
          full_name: fullName,
          email: formData.email || authUser.email || '',
          phone: formData.phone,
          city: formData.city,
          zip: formData.zipCode,
          status: 'started',
        };

        const { data, error } = await supabase
          .from('drivers')
          .insert(insertData)
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth || null,
          street_address: formData.streetAddress || null,
          state: formData.state || null,
        }
      });

      if (authError) {
        console.error('Auth update error:', authError);
      }

      notifications.show({
        title: 'Profile updated successfully',
        message: "",
        color: 'green',
      });
      await fetchProfileData();
      setTimeout(() => onBack(), 500);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const errorMessage = error?.message || error?.details || 'Failed to save profile';
      notifications.show({
        title: `Error: ${errorMessage}`,
        message: '',
        color: 'red',
      });
    } finally {
      setSaving(false);
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
      minHeight: '100vh',
      paddingBottom: 72,
      color: C.text,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    }}>
      {/* ── sticky header ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: C.bg,
        zIndex: 10,
        borderBottom: `1px solid ${C.border}`,
        padding: '12px 16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
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
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: C.text,
          }}>
            Profile Information
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
        padding: '12px 16px',
        paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px) + ${keyboardState.isOpen ? keyboardState.height : 0}px)`,
      }}>
        {/* Feeder ID Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 12,
          background: C.bgMuted,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.muted,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            Feeder ID
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.text,
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}>
            {user?.id ? user.id.substring(0, 8) : 'Loading...'}
          </div>
        </div>

        {/* Personal Information Section */}
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
            Personal Information
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Name Fields */}
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
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
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
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name"
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

            {/* Email */}
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
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.muted2,
                  background: C.bgMuted,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  outline: 'none',
                  cursor: 'not-allowed',
                }}
              />
              <div style={{
                fontSize: 10,
                color: C.muted,
                marginTop: 4,
              }}>
                Email cannot be changed
              </div>
            </div>

            {/* Phone */}
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
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
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

            {/* Date of Birth */}
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
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
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
        </div>

        {/* Address Section */}
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
            Address
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Street Address */}
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
                Street Address
              </label>
              <input
                type="text"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                placeholder="123 Main St"
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

            {/* City and State */}
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
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
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
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
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

            {/* Zip Code */}
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
                Zip Code
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="12345"
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
        </div>
        </div> {/* Close Content - Scrollable */}
      </div>
    </div>
  );
};

export default ProfileDetailsPage;
