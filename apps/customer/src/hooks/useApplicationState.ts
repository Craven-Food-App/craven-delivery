import { useState, useEffect } from 'react';
import { ApplicationData, ApplicationFiles, INITIAL_APPLICATION_DATA } from '@/types/application';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'craver_application_draft';

export const useApplicationState = () => {
  const [data, setData] = useState<ApplicationData>(INITIAL_APPLICATION_DATA);
  const [files, setFiles] = useState<ApplicationFiles>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [existingUser, setExistingUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing session and draft on mount
  useEffect(() => {
    const initializeState = async () => {
      console.log('🚀 Initializing application state...');
      try {
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('📱 Session check:', session ? 'User logged in' : 'No session', sessionError ? `Error: ${sessionError.message}` : '');
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          // Continue with empty state rather than failing
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ User found, loading profile data...');
          setExistingUser(session.user);
          
          // Try to prefill from user profile - don't fail if these queries error
          try {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            console.log('👤 Profile data:', profile ? 'Loaded' : 'Not found', profileError ? `Error: ${profileError.message}` : '');
            
            const { data: address, error: addressError } = await supabase
              .from('delivery_addresses')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('is_default', true)
              .maybeSingle();
            
            console.log('📍 Address data:', address ? 'Loaded' : 'Not found', addressError ? `Error: ${addressError.message}` : '');
            
            if (profile || address) {
              setData(prev => ({
                ...prev,
                firstName: profile?.full_name?.split(' ')[0] || prev.firstName,
                lastName: profile?.full_name?.split(' ').slice(1).join(' ') || prev.lastName,
                email: session.user.email || prev.email,
                phone: profile?.phone || prev.phone,
                streetAddress: address?.street_address || prev.streetAddress,
                city: address?.city || prev.city,
                state: address?.state || prev.state,
                zipCode: address?.zip_code || prev.zipCode,
              }));
              console.log('✅ Pre-filled form with existing data');
            }
          } catch (profileError) {
            console.error('Failed to load profile data:', profileError);
            // Continue anyway - user can fill in the form manually
          }
        } else {
          console.log('📝 New user - loading draft from localStorage...');
          // Load draft from localStorage for new users
          try {
            const draft = localStorage.getItem(STORAGE_KEY);
            if (draft) {
              const parsed = JSON.parse(draft);
              setData(parsed.data || INITIAL_APPLICATION_DATA);
              setCurrentStep(parsed.step || 1);
              console.log('✅ Loaded draft from localStorage');
            } else {
              console.log('ℹ️ No draft found, starting fresh');
            }
          } catch (e) {
            console.error('Failed to parse draft:', e);
            // Continue with initial state
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize application state:', error);
        // Don't let errors prevent the form from loading
      } finally {
        console.log('✅ Application state initialized, loading = false');
        setIsLoading(false);
      }
    };

    initializeState();
  }, []);

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    if (!existingUser && !isLoading) {
      const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step: currentStep }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [data, currentStep, existingUser, isLoading]);

  const updateData = (field: keyof ApplicationData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateFile = (field: keyof ApplicationFiles, file: File) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, 6)));
  };

  return {
    data,
    files,
    currentStep,
    existingUser,
    isLoading,
    updateData,
    updateFile,
    nextStep,
    prevStep,
    goToStep,
    clearDraft,
  };
};
