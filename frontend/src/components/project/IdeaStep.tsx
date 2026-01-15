import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Check, X, Trash2, ChevronRight } from 'lucide-react';
import type { VideoProject, LanguageConfig, ApprovedIdea } from 'shared';

interface IdeaStepProps {
  project: VideoProject;
  langConfig: LanguageConfig;
  onUpdate: (updates: Partial<VideoProject>) => void;
  onRefresh: () => void;
}

export function IdeaStep({ project, langConfig, onRefresh }: IdeaStepProps) {
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([]);
  const [approvedIdeas, setApprovedIdeas] = useState<ApprovedIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(5);
  const [manualIdea, setManualIdea] = useState('');
  const [selectedIdea, setSelectedIdea] = useState(project.idea_text || '');
  const { toast } = useToast();

  useEffect(() => {
    loadApprovedIdeas();
  }, []);

  const loadApprovedIdeas = async () => {
    try {
      const response = await api.get('/ideas', {
        params: { languageCode: project.language_code },
      });
      setApprovedIdeas(response.data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load approved ideas',
      });
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/ideas/generate', {
        languageCode: project.language_code,
        count,
        systemPrompt: langConfig.idea_system_prompt,
        model: langConfig.idea_model,
      });
      setGeneratedIdeas(response.data.ideas);
      toast({
        title: 'Success',
        description: `Generated ${response.data.ideas.length} ideas`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate ideas',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (idea: string) => {
    try {
      await api.post('/ideas/approve', {
        languageCode: project.language_code,
        ideaText: idea,
      });
      setGeneratedIdeas(generatedIdeas.filter((i) => i !== idea));
      loadApprovedIdeas();
      toast({
        title: 'Success',
        description: 'Idea approved',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve idea',
      });
    }
  };

  const handleDeny = (idea: string) => {
    setGeneratedIdeas(generatedIdeas.filter((i) => i !== idea));
  };

  const handleAddManual = async () => {
    if (!manualIdea.trim()) return;

    try {
      await api.post('/ideas/approve', {
        languageCode: project.language_code,
        ideaText: manualIdea,
      });
      setManualIdea('');
      loadApprovedIdeas();
      toast({
        title: 'Success',
        description: 'Idea added',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add idea',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/ideas/${id}`);
      loadApprovedIdeas();
      if (selectedIdea === approvedIdeas.find((i) => i.id === id)?.idea_text) {
        setSelectedIdea('');
      }
      toast({
        title: 'Success',
        description: 'Idea deleted',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete idea',
      });
    }
  };

  const handleNext = async () => {
    if (!selectedIdea) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select an idea',
      });
      return;
    }

    try {
      await api.put(`/projects/${project.id}`, {
        idea_text: selectedIdea,
        current_step: 2,
      });
      onRefresh();
      toast({
        title: 'Success',
        description: 'Moving to script generation',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save idea',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Ideas</CardTitle>
          <CardDescription>Generate video ideas using AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="count">Number of Ideas</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Ideas'}
            </Button>
          </div>

          {generatedIdeas.length > 0 && (
            <div className="space-y-2">
              <Label>Generated Ideas</Label>
              {generatedIdeas.map((idea, index) => (
                <div key={index} className="flex items-start gap-2 rounded-md border p-3">
                  <p className="flex-1 text-sm">{idea}</p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleApprove(idea)}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeny(idea)}>
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Manual Idea</CardTitle>
          <CardDescription>Manually add your own idea</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={manualIdea}
              onChange={(e) => setManualIdea(e.target.value)}
              placeholder="Enter your idea..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
            />
            <Button onClick={handleAddManual}>Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved Ideas</CardTitle>
          <CardDescription>Select an idea to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {approvedIdeas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved ideas yet</p>
          ) : (
            approvedIdeas.map((idea) => (
              <div
                key={idea.id}
                className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                  selectedIdea === idea.idea_text ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedIdea(idea.idea_text)}
              >
                <div className="flex h-5 w-5 items-center justify-center">
                  {selectedIdea === idea.idea_text && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="flex-1 text-sm">{idea.idea_text}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idea.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} size="lg" disabled={!selectedIdea}>
          Next: Generate Script
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
