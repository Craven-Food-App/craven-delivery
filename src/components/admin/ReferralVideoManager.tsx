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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Referral Video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Referral Type</Label>
            <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
              <SelectTrigger>
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
            <Label>Video File *</Label>
            <Input 
              type="file" 
              accept="video/*" 
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)} 
            />
            <p className="text-xs text-gray-500 mt-1">Supported formats: MP4, WebM, MOV</p>
          </div>

          <div>
            <Label>Thumbnail (Optional)</Label>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} 
            />
            <p className="text-xs text-gray-500 mt-1">Recommended: 1280x720px</p>
          </div>

          <div>
            <Label>Title</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Earn $400 Per Driver" 
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Video description..."
              rows={3}
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!videoFile || uploading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Video'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Current Videos ({selectedType})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No videos uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.id} className="border rounded-lg p-4 space-y-3">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={video.video_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{video.title || 'Untitled'}</h4>
                      {video.description && (
                        <p className="text-sm text-gray-600 mb-2">{video.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant={video.is_active ? 'default' : 'secondary'}>
                          {video.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(video.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(video.id, video.is_active)}
                      >
                        {video.is_active ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(video.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
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

