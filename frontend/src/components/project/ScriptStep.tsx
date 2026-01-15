import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { countWords } from '@/lib/utils';
import type { VideoProject, LanguageConfig } from 'shared';

interface ScriptStepProps {
  project: VideoProject;
  langConfig: LanguageConfig;
  onUpdate: (updates: Partial<VideoProject>) => void;
  onRefresh: () => void;
}

export function ScriptStep({ project, langConfig, onUpdate, onRefresh }: ScriptStepProps) {
  const [script, setScript] = useState(project.script_text || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const wordCount = countWords(script);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/scripts/generate/${project.id}`, {
        idea: project.idea_text,
        systemPrompt: langConfig.script_system_prompt,
        model: langConfig.script_model,
      });
      setScript(response.data.script);
      onUpdate({ script_text: response.data.script });
      toast({
        title: 'Success',
        description: 'Script generated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate script',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/projects/${project.id}`, {
        script_text: script,
      });
      onUpdate({ script_text: script });
      toast({
        title: 'Success',
        description: 'Script saved',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save script',
      });
    }
  };

  const handlePrevious = async () => {
    await api.put(`/projects/${project.id}`, { current_step: 1 });
    onRefresh();
  };

  const handleNext = async () => {
    if (!script.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please generate or write a script',
      });
      return;
    }

    try {
      await api.put(`/projects/${project.id}`, {
        script_text: script,
        current_step: 3,
      });
      onRefresh();
      toast({
        title: 'Success',
        description: 'Moving to audio upload',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save script',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selected Idea</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{project.idea_text}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Script</CardTitle>
              <CardDescription>Generate or write a ~3000 word script</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Word count: <span className="font-semibold">{wordCount}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Script with AI'}
          </Button>

          <div className="space-y-2">
            <Label htmlFor="script">Script</Label>
            <Textarea
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Your script will appear here..."
              rows={20}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={handleSave} variant="outline">
            Save Script
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={handleNext} size="lg" disabled={!script.trim()}>
          Next: Upload Audio
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
