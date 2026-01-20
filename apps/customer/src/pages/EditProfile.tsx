import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const EditProfile: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    countryCode: '+1',
    email: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view your profile",
          variant: "destructive"
        });
        navigate('/account');
        return;
      }

      // Get user email from auth
      const email = user.email || '';

      // Get profile from user_profiles table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const fullName = profile?.full_name || '';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const rawPhone = profile?.phone || '';
      let countryCode = '+1';
      let localPhone = '';
      if (rawPhone.startsWith('+')) {
        const match = rawPhone.match(/^(\+\d{1,4})\s?(.*)$/);
        if (match) {
          countryCode = match[1];
          localPhone = match[2] || '';
        } else {
          localPhone = rawPhone;
        }
      } else if (rawPhone) {
        localPhone = rawPhone;
      }

      setEditingProfile({
        first_name: firstName,
        last_name: lastName,
        phone: localPhone,
        countryCode,
        email: email
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();

      // On mobile, send back to restaurants landing; otherwise auth
      const isMobileDevice =
        window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      if (isMobileDevice) {
        window.location.href = '/restaurants';
      } else {
        window.location.href = '/auth';
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const saveProfileEdit = async () => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to update your profile",
          variant: "destructive"
        });
        return;
      }

      // Check if profile exists first
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id, user_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile:', checkError);
        throw checkError;
      }

      const fullNameValue =
        `${editingProfile.first_name || ''} ${editingProfile.last_name || ''}`.trim() || null;
      const phoneCombined = editingProfile.phone
        ? `${editingProfile.countryCode || '+1'} ${editingProfile.phone}`
        : null;

      const updateData: any = {
        full_name: fullNameValue,
        phone: phoneCombined,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Create new profile with required role field
        result = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: fullNameValue,
            phone: phoneCombined,
            role: 'customer', // Required field
            preferences: {},
            settings: {}
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Profile operation error:', result.error);
        throw result.error;
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
        variant: "default"
      });

      // Navigate back to account page
      navigate('/account');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please enter and confirm your new password",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Password updated successfully"
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))' }}>
      {/* Header - Fixed at Top matching Chat Header Structure */}
      <div className="flex items-center gap-3 px-4 py-3 bg-background border-b border-border" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1000,
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        flexShrink: 0
      }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/account')}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Name
              </Label>
              <div className="mt-1 grid grid-cols-2 gap-3">
                <Input
                  id="first_name"
                  value={editingProfile.first_name}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev, first_name: e.target.value }))}
                  className="h-12 text-base"
                  placeholder="First name"
                />
                <Input
                  id="last_name"
                  value={editingProfile.last_name}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev, last_name: e.target.value }))}
                  className="h-12 text-base"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number
              </Label>
              <div className="mt-1 flex gap-2">
                <select
                  value={editingProfile.countryCode}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="h-12 rounded-md border border-input bg-background px-3 text-base text-gray-900"
                >
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+61">+61 (AU)</option>
                  <option value="+91">+91 (IN)</option>
                </select>
                <Input
                  id="phone"
                  value={editingProfile.phone}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-12 text-base flex-1"
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                value={editingProfile.email}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 h-12 text-base"
                placeholder="Enter your email address"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="text-sm font-medium text-red-600 hover:text-red-700 underline"
              >
                {changingPassword ? 'Updating password...' : 'Change Password'}
              </button>
              <div className="mt-2 space-y-2">
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 text-base"
                />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons - Fixed */}
      <div 
        className="fixed left-0 right-0 bg-background border-t border-border p-4"
        style={{ bottom: '53px', paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))` }}
      >
        <div className="max-w-md mx-auto space-y-3">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full h-11 text-base border-red-500 text-red-600 hover:bg-red-50"
          >
            Sign Out
          </Button>
          <div className="flex space-x-3">
            <Button
              onClick={() => navigate('/account')}
              variant="outline"
              className="flex-1 h-12 text-base"
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={saveProfileEdit}
              className="flex-1 h-12 text-base bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              disabled={updating}
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;

