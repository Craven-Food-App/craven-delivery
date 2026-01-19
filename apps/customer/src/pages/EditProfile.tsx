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
    full_name: '',
    phone: '',
    email: ''
  });

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

      setEditingProfile({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
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

      const updateData: any = {
        full_name: editingProfile.full_name || null,
        phone: editingProfile.phone || null,
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
            full_name: editingProfile.full_name || null,
            phone: editingProfile.phone || null,
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
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
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                Full Name
              </Label>
              <Input
                id="full_name"
                value={editingProfile.full_name}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, full_name: e.target.value }))}
                className="mt-1 h-12 text-base"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={editingProfile.phone}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 h-12 text-base"
                placeholder="Enter your phone number"
              />
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
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons - Fixed */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4"
        style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))` }}
      >
        <div className="max-w-md mx-auto flex space-x-3">
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
  );
};

export default EditProfile;

