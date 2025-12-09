import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus, Play, Pause, Volume2, Bell, Clock, Settings, Trash2, CheckCircle, Upload, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationSound {
  id: string;
  name: string;
  file: string;
  is_default: boolean;
}

export const NotificationSettingsManager: React.FC = () => {
  const [sounds, setSounds] = useState<NotificationSound[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSoundFile, setNewSoundFile] = useState<File | null>(null);
  const [newSoundName, setNewSoundName] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Load sounds from database
  const loadSounds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedSounds = data?.map(setting => ({
        id: setting.id,
        name: setting.name,
        file: setting.sound_file,
        is_default: setting.is_default
      })) || [];

      setSounds(formattedSounds);
    } catch (error) {
      console.error('Error loading sounds:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSounds();
  }, [loadSounds]);

  // Add new sound
  const addSound = useCallback(async () => {
    if (!newSoundName || !newSoundFile) {
      toast({
        title: 'Missing information',
        description: 'Please provide both a name and audio file',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExtension = newSoundFile.name.split('.').pop() || 'mp3';
      const fileName = `notification-sounds/${Date.now()}-${newSoundName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExtension}`;

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('feeder-documents')
        .upload(fileName, newSoundFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('feeder-documents')
        .getPublicUrl(fileName);

      // Save to database with permanent URL
      const { data, error } = await supabase
        .from('notification_settings')
        .insert({
          name: newSoundName,
          sound_file: urlData.publicUrl,
          is_default: sounds.length === 0, // First sound becomes default
          description: `Custom sound: ${newSoundName}`,
          duration_ms: 3000,
          repeat_count: 1,
          repeat_interval_ms: 1000,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newSound = {
        id: data.id,
        name: data.name,
        file: data.sound_file,
        is_default: data.is_default
      };

      setSounds(prev => [...prev, newSound]);
      setNewSoundName('');
      setNewSoundFile(null);
      setIsDialogOpen(false);
      
      toast({
        title: 'Sound added successfully',
        description: `${newSoundName} has been uploaded and added`
      });
    } catch (error) {
      console.error('Error adding sound:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload sound file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  }, [newSoundName, newSoundFile, sounds.length, toast]);

  // Set default sound
  const setDefault = async (id: string) => {
    try {
      // Update database - unset all defaults first
      await supabase
        .from('notification_settings')
        .update({ is_default: false })
        .neq('id', id);

      // Set new default
      await supabase
        .from('notification_settings')
        .update({ is_default: true })
        .eq('id', id);

      // Update local state
      setSounds(prev =>
        prev.map(s => ({ ...s, is_default: s.id === id }))
      );

      toast({
        title: 'Default sound updated',
        description: 'The default notification sound has been changed'
      });
    } catch (error) {
      console.error('Error setting default sound:', error);
      toast({
        title: 'Error',
        description: 'Failed to set default sound',
        variant: 'destructive'
      });
    }
  };

  // Delete sound
  const deleteSound = async (id: string) => {
    if (sounds.find(s => s.id === id)?.is_default) {
      toast({
        title: 'Cannot delete',
        description: 'Cannot delete the default sound',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('notification_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSounds(prev => prev.filter(s => s.id !== id));
      
      toast({
        title: 'Sound deleted',
        description: 'The notification sound has been removed'
      });
    } catch (error) {
      console.error('Error deleting sound:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete sound',
        variant: 'destructive'
      });
    }
  };

  // Play preview
  const playPreview = async (sound: NotificationSound) => {
    if (playingId === sound.id) {
      setPlayingId(null);
      return;
    }
    setPlayingId(sound.id);
    const audio = new Audio(sound.file);
    await audio.play().catch(console.warn);
    setTimeout(() => setPlayingId(null), 2000); // simple duration
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Bell className="h-8 w-8 animate-pulse text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Notification Settings</h2>
          <p className="text-muted-foreground">Manage driver notification sounds and preferences</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Upload Sound
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Notification Sound</DialogTitle>
              <DialogDescription>
                Add a new audio file for driver notifications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="sound-name">Sound Name</Label>
                <Input 
                  id="sound-name"
                  placeholder="e.g., Alert Tone 1"
                  value={newSoundName} 
                  onChange={e => setNewSoundName(e.target.value)} 
                />
              </div>

              <div>
                <Label htmlFor="sound-file">Audio File</Label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1">
                    <Input 
                      id="sound-file"
                      type="file" 
                      accept="audio/*" 
                      onChange={e => setNewSoundFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  {newSoundFile && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Music className="h-3 w-3" />
                      {newSoundFile.name.substring(0, 20)}...
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: MP3, WAV, M4A, OGG
                </p>
              </div>

              <Button 
                onClick={addSound} 
                className="bg-orange-500 hover:bg-orange-600 w-full"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-pulse" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Sound
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-orange-500" />
              Total Sounds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sounds.length}</div>
            <p className="text-xs text-muted-foreground">Available notification sounds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Default Sound
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {sounds.find(s => s.is_default)?.name || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-500" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">Notifications enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Notification Sounds List */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Sounds</CardTitle>
          <CardDescription>
            Manage audio files used for driver order notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sounds.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No notification sounds uploaded yet</p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Your First Sound
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sounds.map(sound => (
                <div
                  key={sound.id}
                  className="border rounded-lg p-4 hover:border-orange-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                        <Volume2 className="h-6 w-6 text-orange-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{sound.name}</h4>
                          {sound.is_default && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {sound.file.split('/').pop()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => playPreview(sound)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-orange-50"
                      >
                        {playingId === sound.id ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Preview
                          </>
                        )}
                      </Button>
                      
                      {!sound.is_default && (
                        <>
                          <Button
                            onClick={() => setDefault(sound.id)}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            Set as Default
                          </Button>
                          <Button
                            onClick={() => deleteSound(sound.id)}
                            variant="outline"
                            size="sm"
                            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Configure how notifications are delivered to drivers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Sound Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Play sound when new orders are available
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send push notifications to driver mobile apps
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email alerts for important updates
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send text messages for critical alerts
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Sound Guidelines */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Keep notification sounds between 2-5 seconds for optimal user experience</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Use clear, distinct sounds that are easy to hear in noisy environments</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Test sounds on actual devices before setting as default</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>File size should be under 500KB for fast loading</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
