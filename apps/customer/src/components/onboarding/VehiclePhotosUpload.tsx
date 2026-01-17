import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, FileButton, Stack, Grid, Text, Group, Box, Image } from '@mantine/core';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Camera, Upload, CheckCircle } from 'lucide-react';

export const VehiclePhotosUpload: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState({
    front: null as string | null,
    back: null as string | null,
    left: null as string | null,
    right: null as string | null
  });
  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    left: useRef<HTMLInputElement>(null),
    right: useRef<HTMLInputElement>(null)
  };

  const handlePhotoCapture = async (side: 'front' | 'back' | 'left' | 'right', file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!application) return;

      // Upload photo
      const fileExt = file.name.split('.').pop();
      const fileName = `${application.id}_vehicle_${side}_${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('driver-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(fileName);

      setPhotos(prev => ({ ...prev, [side]: publicUrl }));

      toast({
        title: "Photo Uploaded! ✅",
        description: `${side.charAt(0).toUpperCase() + side.slice(1)} view captured successfully.`,
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    const allPhotosUploaded = Object.values(photos).every(photo => photo !== null);
    
    if (!allPhotosUploaded) {
      toast({
        title: "Missing Photos",
        description: "Please upload all 4 vehicle photos (front, back, left, right).",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!application) return;

      // Save photo URLs to application
      const { error: updateError } = await supabase
        .from('craver_applications')
        .update({
          vehicle_photo_front: photos.front,
          vehicle_photo_back: photos.back,
          vehicle_photo_left: photos.left,
          vehicle_photo_right: photos.right
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Complete the task
      const { data: task, error: taskError } = await supabase
        .from('onboarding_tasks')
        .select('id')
        .eq('driver_id', application.id)
        .eq('task_key', 'upload_vehicle_photos')
        .single();

      if (taskError) {
        console.error('Error finding task:', taskError);
      }

      if (task) {
        const { data: completeData, error: completeError } = await supabase.functions.invoke('complete-onboarding-task', {
          body: {
            task_id: task.id,
            driver_id: application.id,
          },
        });

        if (completeError) {
          console.error('Error completing task:', completeError);
          throw completeError;
        }

        console.log('Task completed successfully:', completeData);
      }

      toast({
        title: "Vehicle Photos Saved! 🚗",
        description: "All vehicle photos have been uploaded successfully.",
      });

      navigate('/enhanced-onboarding');
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to save vehicle photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const PhotoCard = ({ side, label }: { side: 'front' | 'back' | 'left' | 'right', label: string }) => (
    <Card>
      <Stack gap="md" p="md" align="center">
        <Text fw={500}>{label}</Text>
        {photos[side] ? (
          <Box style={{ position: 'relative', width: '100%' }}>
            <Image src={photos[side]!} alt={`${label} view`} style={{ width: '100%', height: 160, objectFit: 'cover' }} radius="md" />
            <Box
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: '#22c55e',
                borderRadius: '50%',
                padding: 4,
              }}
            >
              <CheckCircle size={16} style={{ color: 'white' }} />
            </Box>
          </Box>
        ) : (
          <Box
            style={{
              height: 160,
              backgroundColor: 'var(--mantine-color-gray-1)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <Camera size={48} style={{ color: 'var(--mantine-color-gray-6)' }} />
          </Box>
        )}
        <FileButton
          onChange={(file) => file && handlePhotoCapture(side, file)}
          accept="image/*"
          capture="environment"
        >
          {(props) => (
            <Button
              {...props}
              variant="outline"
              size="sm"
              fullWidth
              leftSection={<Upload size={16} />}
            >
              {photos[side] ? 'Retake Photo' : 'Take Photo'}
            </Button>
          )}
        </FileButton>
      </Stack>
    </Card>
  );

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', padding: 24 }}>
      <Box style={{ maxWidth: 896, margin: '0 auto' }}>
        <Button
          variant="subtle"
          onClick={() => navigate('/enhanced-onboarding')}
          mb="md"
          leftSection={<ArrowLeft size={16} />}
        >
          Back to Onboarding
        </Button>

        <Card mb="lg">
          <Stack gap="xs" p="lg">
            <Text fw={600} size="lg">Upload Vehicle Photos</Text>
            <Text size="sm" c="dimmed">
              Take clear photos of your vehicle from all 4 angles
            </Text>
          </Stack>
        </Card>

        <Grid gutter="md" mb="lg">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PhotoCard side="front" label="Front View" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PhotoCard side="back" label="Back View" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PhotoCard side="left" label="Left Side" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PhotoCard side="right" label="Right Side" />
          </Grid.Col>
        </Grid>

        <Button
          onClick={handleComplete}
          disabled={loading || !Object.values(photos).every(p => p)}
          fullWidth
          color="#ff7a00"
        >
          {loading ? 'Saving...' : 'Complete Task'}
        </Button>
      </Box>
    </Box>
  );
};
