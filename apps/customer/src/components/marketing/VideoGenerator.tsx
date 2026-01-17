import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Video, Play, Download, Loader2, Sparkles, CheckCircle2, XCircle, Clock, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoGeneration {
  id: string;
  task_id: string;
  prompt: string;
  status: 'processing' | 'completed' | 'failed';
  video_url: string | null;
  created_at: string;
  duration?: number;
  aspect_ratio?: string;
}

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [style, setStyle] = useState('cinematic');
  const [generating, setGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    fetchVideoHistory();
  }, []);

  useEffect(() => {
    if (currentTaskId && !checkingStatus) {
      const interval = setInterval(() => {
        checkVideoStatus(currentTaskId);
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [currentTaskId, checkingStatus]);

  const fetchVideoHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_videos' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Table might not exist yet - that's okay
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('marketing_videos table not found - will be created by migration');
          return;
        }
        throw error;
      }
      if (data) {
        setVideos(data.map((v: any) => ({
          id: v.id,
          task_id: v.task_id,
          prompt: v.prompt,
          status: v.status,
          video_url: v.video_url,
          created_at: v.created_at,
          duration: v.duration,
          aspect_ratio: v.aspect_ratio,
        })));
      }
    } catch (error) {
      console.error('Error fetching video history:', error);
    }
  };

  const saveVideoToDatabase = async (videoData: Partial<VideoGeneration>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('marketing_videos' as any)
        .upsert({
          task_id: videoData.task_id,
          prompt: videoData.prompt,
          status: videoData.status || 'processing',
          video_url: videoData.video_url || null,
          duration: videoData.duration || duration,
          aspect_ratio: videoData.aspect_ratio || aspectRatio,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'task_id'
        });

      if (error) {
        // Table might not exist yet - that's okay, we'll just log it
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('marketing_videos table not found - will be created by migration');
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error saving video to database:', error);
      // Don't block video generation if database save fails
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a video prompt');
      return;
    }

    setGenerating(true);
    setProgress(0);
    setCurrentTaskId(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video-runway', {
        body: {
          prompt: prompt.trim(),
          duration: duration,
          aspect_ratio: aspectRatio,
          style: style,
        },
      });

      // Log everything for debugging
      console.log('Function response - data:', data);
      console.log('Function response - error:', error);

      // Check if there's an error OR if data contains an error
      if (error) {
        console.error('Edge function error object:', JSON.stringify(error, null, 2));
        
        // Try to extract error from data (sometimes error response is in data)
        if (data && typeof data === 'object') {
          const errorFromData = (data as any).error || (data as any).message;
          if (errorFromData) {
            throw new Error(typeof errorFromData === 'string' ? errorFromData : JSON.stringify(errorFromData));
          }
        }
        
        // Extract error message from error object
        let errorMsg = error.message || 'Failed to generate video';
        if (error.message === 'Edge Function returned a non-2xx status code' && data) {
          // The actual error is likely in the data
          errorMsg = (data as any).error || (data as any).message || errorMsg;
        }
        throw new Error(errorMsg);
      }

      // Check if data indicates an error
      if (data && (data as any).success === false) {
        const errorMsg = (data as any).error || 'Failed to generate video';
        const errorDetails = (data as any).details ? `\n\nDetails: ${JSON.stringify((data as any).details, null, 2)}` : '';
        throw new Error(errorMsg + errorDetails);
      }

      // Check if data indicates success
      if (data && (data as any).success && (data as any).task_id) {
        setCurrentTaskId((data as any).task_id);
        toast.success('Video generation started! This may take a few minutes.');
        
        // Save to database
        await saveVideoToDatabase({
          task_id: (data as any).task_id,
          prompt: prompt.trim(),
          status: 'processing',
          duration: duration,
          aspect_ratio: aspectRatio,
        });

        // Start progress simulation
        let progressValue = 0;
        const progressInterval = setInterval(() => {
          progressValue += Math.random() * 10;
          if (progressValue < 90) {
            setProgress(Math.min(progressValue, 90));
          } else {
            clearInterval(progressInterval);
          }
        }, 1000);
      } else if (data && (data as any).error) {
        // Data contains an error message
        const errorMsg = (data as any).error;
        const errorDetails = (data as any).details ? `\n\nDetails: ${JSON.stringify((data as any).details, null, 2)}` : '';
        throw new Error(errorMsg + errorDetails);
      } else {
        // Unexpected response structure
        console.warn('Unexpected response structure:', data);
        throw new Error(data?.error || data?.message || 'Failed to start video generation. Unexpected response.');
      }
    } catch (error: any) {
      console.error('Error generating video:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to generate video';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      } else if (error?.response?.error) {
        errorMessage = error.response.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Show error with details
      toast.error(errorMessage, {
        duration: 10000, // Show for 10 seconds
      });
      
      setGenerating(false);
    }
  };

  const checkVideoStatus = async (taskId: string) => {
    if (checkingStatus) return;
    
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-video-status-runway', {
        body: { task_id: taskId },
      });

      if (error) throw error;

      if (data.success) {
        const status = data.status;
        const videoUrl = data.video_url;

        // Update progress
        if (status === 'processing') {
          setProgress(data.progress || 90);
        } else if (status === 'completed' && videoUrl) {
          setProgress(100);
          setGenerating(false);
          setCurrentTaskId(null);
          toast.success('Video generated successfully!');

          // Update database
          await saveVideoToDatabase({
            task_id: taskId,
            status: 'completed',
            video_url: videoUrl,
          });

          // Refresh history
          await fetchVideoHistory();
        } else if (status === 'failed') {
          setGenerating(false);
          setCurrentTaskId(null);
          toast.error('Video generation failed');
          
          await saveVideoToDatabase({
            task_id: taskId,
            status: 'failed',
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking video status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const downloadVideo = async (videoUrl: string, prompt: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '-')}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Video downloaded!');
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Failed to download video');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Film className="h-6 w-6 text-orange-600" />
          AI Video Generator
        </h2>
        <p className="text-gray-600 mt-1">
          Create high-quality social media ads and commercials using Runway AI
        </p>
      </div>

      {/* Generation Form */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="prompt" className="text-base font-semibold">
              Video Prompt <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A cinematic shot of a delicious burger being prepared in a modern kitchen, slow motion, professional lighting, appetizing close-ups..."
              className="mt-2 min-h-[120px]"
              rows={5}
            />
            <p className="text-sm text-gray-500 mt-1">
              Be descriptive! Include details about style, mood, camera angles, and key elements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger id="duration" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 seconds</SelectItem>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="15">15 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger id="aspect-ratio" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait/Stories)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="4:5">4:5 (Instagram Post)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="style">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger id="style" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="vibrant">Vibrant</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Generating video...</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500">
                This may take 2-5 minutes. You can continue working while it processes.
              </p>
            </div>
          )}

          <Button
            onClick={generateVideo}
            disabled={!prompt.trim() || generating}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-base font-semibold"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Video History */}
      {videos.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Video className="h-5 w-5" />
            Generated Videos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {video.video_url ? (
                  <div className="relative aspect-video bg-black">
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-green-500 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                  </div>
                ) : video.status === 'processing' ? (
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-600 mb-2" />
                      <p className="text-sm text-gray-600">Processing...</p>
                      <Badge variant="secondary" className="mt-2">
                        <Clock className="h-3 w-3 mr-1" />
                        In Progress
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                      <p className="text-sm text-gray-600">Failed</p>
                      <Badge variant="destructive" className="mt-2">Error</Badge>
                    </div>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-2">{video.prompt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(video.created_at).toLocaleDateString()}
                    </span>
                    {video.video_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadVideo(video.video_url!, video.prompt)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tips Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-900">
          <Sparkles className="h-5 w-5" />
          Tips for Best Results
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>Be specific about camera movements (e.g., "slow zoom in", "panning shot")</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>Include lighting details (e.g., "warm lighting", "natural daylight")</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>Specify the mood or atmosphere (e.g., "energetic", "calm", "professional")</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>Mention key visual elements (e.g., "steam rising", "close-up of ingredients")</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span>Use 9:16 aspect ratio for Instagram Stories and TikTok</span>
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default VideoGenerator;

