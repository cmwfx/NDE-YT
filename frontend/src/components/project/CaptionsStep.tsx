import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { VideoProject, CaptionData } from 'shared';

interface CaptionsStepProps {
  project: VideoProject;
  onUpdate: (updates: Partial<VideoProject>) => void;
  onRefresh: () => void;
}

export function CaptionsStep({ project, onUpdate, onRefresh }: CaptionsStepProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const captions = project.captions_data || [];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/captions/generate/${project.id}`);
      onUpdate({ captions_data: response.data.captions });
      toast({
        title: 'Success',
        description: `Generated ${response.data.captions.length} word-level captions`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate captions',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = async () => {
    await api.put(`/projects/${project.id}`, { current_step: 3 });
    onRefresh();
  };

  const handleNext = async () => {
    if (captions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please generate captions first',
      });
      return;
    }

    try {
      await api.put(`/projects/${project.id}`, {
        current_step: 5,
      });
      onRefresh();
      toast({
        title: 'Success',
        description: 'Moving to visual generation',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to proceed',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Captions</CardTitle>
          <CardDescription>
            Generate word-level captions with timestamps using AssemblyAI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating Captions...' : 'Generate Captions'}
          </Button>

          {loading && (
            <p className="text-sm text-muted-foreground">
              This may take a few minutes depending on audio length...
            </p>
          )}

          {captions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {captions.length} words transcribed
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {formatDuration(captions[captions.length - 1].end)}
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left">Word</th>
                      <th className="p-2 text-left">Start</th>
                      <th className="p-2 text-left">End</th>
                      <th className="p-2 text-left">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {captions.map((caption, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{caption.word}</td>
                        <td className="p-2">{formatDuration(caption.start)}</td>
                        <td className="p-2">{formatDuration(caption.end)}</td>
                        <td className="p-2">{(caption.confidence * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={handleNext} size="lg" disabled={captions.length === 0}>
          Next: Generate Visuals
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
