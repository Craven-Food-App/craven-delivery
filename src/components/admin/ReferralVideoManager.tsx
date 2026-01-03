import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Video, Upload, Trash2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

export function ReferralVideoManager() {
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<'customer' | 'driver' | 'restaurant'>('driver');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, [selectedType]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_video_content')
        .select('*')
        .eq('referral_type', selectedType)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    try {
      // Upload video
      const videoExt = videoFile.name.split('.').pop();
      const videoFileName = `referral-videos/${selectedType}/${Date.now()}.${videoExt}`;
      
      const { error: videoError } = await supabase.storage
        .from('feeder-documents')
        .upload(videoFileName, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (videoError) throw videoError;

      const { data: videoUrlData } = supabase.storage
        .from('feeder-documents')
        .getPublicUrl(videoFileName);

      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split('.').pop();
        const thumbFileName = `referral-thumbnails/${selectedType}/${Date.now()}.${thumbExt}`;
        
        const { error: thumbError } = await supabase.storage
          .from('feeder-documents')
          .upload(thumbFileName, thumbnailFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from('feeder-documents')
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      // Save to database
      const { error } = await supabase
        .from('referral_video_content')
        .insert({
          referral_type: selectedType,
          video_url: videoUrlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          title: title || 'Refer & Earn',
          description: description,
          is_active: true
        });

      if (error) throw error;

      toast.success('Video uploaded successfully!');
      setVideoFile(null);
      setThumbnailFile(null);
      setTitle('');
      setDescription('');
      fetchVideos();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('referral_video_content')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Video ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchVideos();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update video');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const { error } = await supabase
        .from('referral_video_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Video deleted successfully');
      fetchVideos();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete video');
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base">Upload Referral Video</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div>
            <Label className="text-xs">Referral Type</Label>
            <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Video File *</Label>
            <Input 
              className="h-8 text-sm"
              type="file" 
              accept="video/*" 
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)} 
            />
            <p className="text-xs text-gray-500 mt-1">Supported formats: MP4, WebM, MOV</p>
          </div>

          <div>
            <Label className="text-xs">Thumbnail (Optional)</Label>
            <Input 
              className="h-8 text-sm"
              type="file" 
              accept="image/*" 
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} 
            />
            <p className="text-xs text-gray-500 mt-1">Recommended: 1280x720px</p>
          </div>

          <div>
            <Label className="text-xs">Title</Label>
            <Input 
              className="h-8 text-sm"
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Earn $400 Per Driver" 
            />
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea 
              className="text-sm min-h-[60px]"
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Video description..."
              rows={2}
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!videoFile || uploading}
            size="sm"
            className="w-full h-8 text-xs"
          >
            <Upload className="w-3 h-3 mr-1.5" />
            {uploading ? 'Uploading...' : 'Upload Video'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Videos */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="w-4 h-4" />
            Current Videos ({selectedType})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {loading ? (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-6">
              <Video className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-muted-foreground">No videos uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => (
                <div key={video.id} className="border rounded-lg p-3 space-y-2">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={video.video_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold mb-1">{video.title || 'Untitled'}</h4>
                      {video.description && (
                        <p className="text-xs text-muted-foreground mb-1.5">{video.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant={video.is_active ? 'default' : 'secondary'} className="text-xs">
                          {video.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(video.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 ml-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleToggleActive(video.id, video.is_active)}
                      >
                        {video.is_active ? (
                          <>
                            <Pause className="w-3 h-3 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(video.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

