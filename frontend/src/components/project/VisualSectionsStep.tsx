import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { ChevronRight, ChevronLeft, Edit2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { VideoProject, LanguageConfig, VisualSection } from 'shared';

interface VisualSectionsStepProps {
  project: VideoProject;
  langConfig: LanguageConfig;
  onUpdate: (updates: Partial<VideoProject>) => void;
  onRefresh: () => void;
}

export function VisualSectionsStep({ project, langConfig, onUpdate, onRefresh }: VisualSectionsStepProps) {
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQuery, setEditedQuery] = useState('');
  const { toast } = useToast();

  const sections = (project.visuals_data as VisualSection[]) || [];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/visuals/generate-sections/${project.id}`);
      onUpdate({ visuals_data: response.data.sections });
      toast({
        title: 'Success',
        description: `Generated ${response.data.sections.length} visual sections`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate visual sections',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuery = (index: number) => {
    setEditingIndex(index);
    setEditedQuery(sections[index].search_query);
  };

  const handleSaveQuery = () => {
    if (editingIndex !== null) {
      const newSections = [...sections];
      newSections[editingIndex].search_query = editedQuery;
      onUpdate({ visuals_data: newSections });
      setEditingIndex(null);
      toast({
        title: 'Success',
        description: 'Search query updated',
      });
    }
  };

  const handlePrevious = async () => {
    await api.put(`/projects/${project.id}`, { current_step: 4 });
    onRefresh();
  };

  const handleNext = async () => {
    if (sections.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please generate visual sections first',
      });
      return;
    }

    try {
      await api.put(`/projects/${project.id}`, {
        current_step: 6,
      });
      onRefresh();
      toast({
        title: 'Success',
        description: 'Moving to visual selection',
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
          <CardTitle>Generate Visual Sections</CardTitle>
          <CardDescription>
            Use AI to break down the script into scenes with Pexels search queries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating Sections...' : 'Generate Visual Sections with AI'}
          </Button>

          {loading && (
            <p className="text-sm text-muted-foreground">
              Analyzing script and generating scene breakdowns...
            </p>
          )}
        </CardContent>
      </Card>

      {sections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{sections.length} Sections Generated</h3>
            <Button onClick={handleGenerate} variant="outline" size="sm">
              Regenerate All
            </Button>
          </div>

          {sections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">Section {index + 1}</CardTitle>
                <CardDescription>
                  {formatDuration(section.start_time)} - {formatDuration(section.end_time)} (
                  {section.duration.toFixed(1)}s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Scene Description</Label>
                  <p className="text-sm">{section.section_text}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`query-${index}`}>Pexels Search Query</Label>
                  {editingIndex === index ? (
                    <div className="flex gap-2">
                      <Input
                        id={`query-${index}`}
                        value={editedQuery}
                        onChange={(e) => setEditedQuery(e.target.value)}
                        autoFocus
                      />
                      <Button onClick={handleSaveQuery} size="sm">
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingIndex(null)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        id={`query-${index}`}
                        value={section.search_query}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQuery(index)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={handleNext} size="lg" disabled={sections.length === 0}>
          Next: Select Visuals
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
