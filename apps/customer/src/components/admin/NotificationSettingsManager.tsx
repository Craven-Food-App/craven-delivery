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
      <div className="flex items-center justify-center py-8">
        <Bell className="h-6 w-6 animate-pulse text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage driver notification sounds</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
              <Plus className="h-3 w-3 mr-1.5" />
              Upload Sound
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Upload Notification Sound</DialogTitle>
              <DialogDescription className="text-xs">
                Add a new audio file for driver notifications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <div>
                <Label htmlFor="sound-name" className="text-xs">Sound Name</Label>
                <Input 
                  id="sound-name"
                  placeholder="e.g., Alert Tone 1"
                  value={newSoundName} 
                  onChange={e => setNewSoundName(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="sound-file" className="text-xs">Audio File</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input 
                    id="sound-file"
                    type="file" 
                    accept="audio/*" 
                    onChange={e => setNewSoundFile(e.target.files?.[0] || null)}
                    className="h-8 text-xs"
                  />
                  {newSoundFile && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      <Music className="h-2.5 w-2.5 mr-1" />
                      {newSoundFile.name.substring(0, 15)}...
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Supported: MP3, WAV, M4A, OGG
                </p>
              </div>

              <Button 
                onClick={addSound} 
                className="bg-orange-500 hover:bg-orange-600 w-full h-8 text-xs"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Upload className="h-3 w-3 mr-1.5 animate-pulse" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 mr-1.5" />
                    Upload Sound
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Total Sounds</p>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{sounds.length}</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Default Sound</p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {sounds.find(s => s.is_default)?.name || 'None'}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
            <Badge className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-1.5 py-0.5 mt-1">
              <CheckCircle className="h-2.5 w-2.5 mr-1" />
              Active
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Notification Sounds List - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">Notification Sounds</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {sounds.length === 0 ? (
            <div className="text-center py-8">
              <Music className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-3">No notification sounds uploaded yet</p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                size="sm"
                className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Upload First Sound
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sounds.map(sound => (
                <div
                  key={sound.id}
                  className="border border-gray-200 rounded-md p-2.5 hover:border-orange-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Volume2 className="h-4 w-4 text-orange-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-gray-900 truncate">{sound.name}</h4>
                          {sound.is_default && (
                            <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] px-1.5 py-0.5">
                              <CheckCircle className="h-2.5 w-2.5 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">
                          {sound.file.split('/').pop()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        onClick={() => playPreview(sound)}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs hover:bg-orange-50"
                      >
                        {playingId === sound.id ? (
                          <>
                            <Pause className="h-3 w-3 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Preview
                          </>
                        )}
                      </Button>
                      
                      {!sound.is_default && (
                        <>
                          <Button
                            onClick={() => setDefault(sound.id)}
                            size="sm"
                            className="h-7 px-2 text-xs bg-orange-500 hover:bg-orange-600"
                          >
                            Set Default
                          </Button>
                          <Button
                            onClick={() => deleteSound(sound.id)}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            <Trash2 className="h-3 w-3" />
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

      {/* Notification Preferences - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
          <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between py-1.5">
            <div>
              <Label className="text-xs font-medium">Enable Sound Notifications</Label>
              <p className="text-[10px] text-gray-500 mt-0.5">Play sound when new orders are available</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
            <div>
              <Label className="text-xs font-medium">Push Notifications</Label>
              <p className="text-[10px] text-gray-500 mt-0.5">Send push notifications to driver mobile apps</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
            <div>
              <Label className="text-xs font-medium">Email Notifications</Label>
              <p className="text-[10px] text-gray-500 mt-0.5">Send email alerts for important updates</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
            <div>
              <Label className="text-xs font-medium">SMS Notifications</Label>
              <p className="text-[10px] text-gray-500 mt-0.5">Send text messages for critical alerts</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Best Practices - Compact */}
      <Card className="border border-gray-200 shadow-sm bg-gray-50">
        <CardHeader className="px-3 py-2 border-b border-gray-200">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Settings className="h-3 w-3" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <ul className="space-y-1.5 text-[10px] text-gray-600">
            <li className="flex items-start gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Keep notification sounds between 2-5 seconds for optimal user experience</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Use clear, distinct sounds that are easy to hear in noisy environments</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Test sounds on actual devices before setting as default</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
              <span>File size should be under 500KB for fast loading</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
