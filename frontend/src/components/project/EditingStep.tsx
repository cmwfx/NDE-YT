import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { ChevronLeft, Download } from 'lucide-react';
import type { VideoProject } from 'shared';

interface EditingStepProps {
  project: VideoProject;
  onUpdate: (updates: Partial<VideoProject>) => void;
  onRefresh: () => void;
}

export function EditingStep({ project, onUpdate, onRefresh }: EditingStepProps) {
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const hasVideo = project.final_video_path;

  const handleRender = async () => {
    setRendering(true);
    setProgress(0);

    // Simulate progress (in real app, use WebSocket or SSE for real-time progress)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 2000);

    try {
      const response = await api.post(`/videos/render/${project.id}`);
      clearInterval(progressInterval);
      setProgress(100);
      onUpdate({
        final_video_path: response.data.videoPath,
        status: 'completed',
      });
      toast({
        title: 'Success',
        description: 'Video rendered successfully!',
      });
    } catch (error) {
      clearInterval(progressInterval);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to render video',
      });
    } finally {
      setRendering(false);
    }
  };

  const handleDownload = () => {
    window.open(`/api/videos/download/${project.id}`, '_blank');
  };

  const handlePrevious = async () => {
    await api.put(`/projects/${project.id}`, { current_step: 5 });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Render Final Video</CardTitle>
          <CardDescription>
            Generate the final video with MrBeast-style captions and selected visuals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasVideo && !rendering && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will compile all your selected visuals, add the audio, and overlay word-by-word
                captions with a semi-transparent black backdrop for readability.
              </p>
              <Button onClick={handleRender} size="lg">
                Render Video
              </Button>
            </div>
          )}

          {rendering && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Rendering video...</p>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {progress < 30
                  ? 'Processing visual clips...'
                  : progress < 60
                  ? 'Generating captions...'
                  : progress < 90
                  ? 'Merging video and audio...'
                  : 'Finalizing...'}
              </p>
            </div>
          )}

          {hasVideo && !rendering && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-500 bg-green-500/10 p-4">
                <p className="font-medium text-green-700 dark:text-green-400">
                  Video rendered successfully!
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleDownload} size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Download Video
                </Button>
                <Button onClick={handleRender} variant="outline">
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!rendering && (
        <div className="flex justify-between">
          <Button onClick={handlePrevious} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
        </div>
      )}
    </div>
  );
}
