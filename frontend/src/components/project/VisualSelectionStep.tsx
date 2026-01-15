import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { ChevronRight, ChevronLeft, Search, Check, AlertCircle, Loader2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { VideoProject, VisualSection } from 'shared';

interface VisualSelectionStepProps {
  project: VideoProject;
  onUpdate: (updates: Partial<VideoProject>) => void;
  onRefresh: () => void;
}

export function VisualSelectionStep({ project, onUpdate, onRefresh }: VisualSelectionStepProps) {
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [autoSearching, setAutoSearching] = useState(false);
  const [failedSections, setFailedSections] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const sections = (project.visuals_data as VisualSection[]) || [];

  // Auto-search and select videos on mount
  useEffect(() => {
    autoSearchAndSelect();
  }, []);

  const autoSearchAndSelect = async () => {
    setAutoSearching(true);
    const failed = new Set<number>();

    for (let index = 0; index < sections.length; index++) {
      const section = sections[index];
      
      // Skip if already selected
      if (section.selected_pexels_video) continue;

      try {
        // Search for videos
        const searchResponse = await api.post(`/visuals/re-search/${project.id}`, {
          sectionIndex: index,
          newQuery: section.search_query,
        });

        const updatedSection = searchResponse.data.project.visuals_data[index];
        
        // If we have results, automatically select the first one
        if (updatedSection.pexels_results && updatedSection.pexels_results.length > 0) {
          const firstVideo = updatedSection.pexels_results[0];
          
          await api.put(`/visuals/select-video/${project.id}`, {
            sectionIndex: index,
            videoId: firstVideo.id,
          });
        } else {
          // No results found - mark as failed
          failed.add(index);
        }
      } catch (error) {
        console.error(`Failed to auto-select video for section ${index}:`, error);
        failed.add(index);
      }
    }

    setFailedSections(failed);
    setAutoSearching(false);

    // Refresh project data
    await onRefresh();

    if (failed.size > 0) {
      toast({
        variant: 'destructive',
        title: 'Some searches failed',
        description: `${failed.size} section(s) need manual video selection`,
      });
    } else {
      toast({
        title: 'Success',
        description: 'All videos downloaded automatically',
      });
    }
  };

  const handleSelectVideo = async (sectionIndex: number, videoId: number) => {
    try {
      const response = await api.put(`/visuals/select-video/${project.id}`, {
        sectionIndex,
        videoId,
      });
      onUpdate({ visuals_data: response.data.project.visuals_data });
      toast({
        title: 'Success',
        description: 'Video selected and downloaded',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to select video',
      });
    }
  };

  const handleReSearch = async (sectionIndex: number, newQuery: string) => {
    setSearchingIndex(sectionIndex);
    try {
      const response = await api.post(`/visuals/re-search/${project.id}`, {
        sectionIndex,
        newQuery,
      });
      onUpdate({ visuals_data: response.data.project.visuals_data });
      toast({
        title: 'Success',
        description: 'Search updated',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to search',
      });
    } finally {
      setSearchingIndex(null);
    }
  };

  const handlePrevious = async () => {
    await api.put(`/projects/${project.id}`, { current_step: 5 });
    onRefresh();
  };

  const handleNext = async () => {
    const allSelected = sections.every((s) => s.selected_pexels_video !== null);

    if (!allSelected) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a video for all sections',
      });
      return;
    }

    try {
      await api.put(`/projects/${project.id}`, {
        current_step: 7,
      });
      onRefresh();
      toast({
        title: 'Success',
        description: 'Moving to video editing',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to proceed',
      });
    }
  };

  const selectedCount = sections.filter(s => s.selected_pexels_video !== null).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Downloading Visuals from Pexels</CardTitle>
          <CardDescription>
            {autoSearching ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Automatically searching and downloading videos... ({selectedCount}/{sections.length} completed)
              </span>
            ) : (
              <>
                {selectedCount === sections.length ? (
                  'All videos downloaded successfully'
                ) : (
                  `${selectedCount}/${sections.length} videos downloaded - ${failedSections.size} need manual selection`
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {!autoSearching && sections.length > 0 && (
        <div className="space-y-4">
          {sections.map((section, index) => {
            const isFailed = failedSections.has(index);
            const isSelected = section.selected_pexels_video !== null;
            
            // Only show failed sections or selected sections
            if (!isFailed && !isSelected) return null;

            return (
              <Card key={index} className={isFailed ? 'border-destructive' : 'border-green-500'}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        Section {index + 1}
                        {isSelected && <Check className="ml-2 inline h-5 w-5 text-green-500" />}
                        {isFailed && <AlertCircle className="ml-2 inline h-5 w-5 text-destructive" />}
                      </CardTitle>
                      <CardDescription>
                        {formatDuration(section.start_time)} - {formatDuration(section.end_time)} (
                        {section.duration.toFixed(1)}s)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Scene Description</Label>
                    <p className="text-sm">{section.section_text}</p>
                  </div>

                  {isFailed && (
                    <>
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        No videos found for this search query. Please try a different search term.
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`query-${index}`}>Search Query</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`query-${index}`}
                            value={section.search_query}
                            onChange={(e) => {
                              const newSections = [...sections];
                              newSections[index].search_query = e.target.value;
                              onUpdate({ visuals_data: newSections });
                            }}
                          />
                          <Button
                            variant="outline"
                            onClick={() => handleReSearch(index, section.search_query)}
                            disabled={searchingIndex === index}
                          >
                            {searchingIndex === index ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {section.pexels_results && section.pexels_results.length > 0 && (
                        <div className="space-y-2">
                          <Label>Select Video</Label>
                          <div className="grid gap-2 md:grid-cols-3">
                            {section.pexels_results.map((video) => (
                              <div
                                key={video.id}
                                className={`group relative cursor-pointer overflow-hidden rounded-md border-2 transition-all ${
                                  section.selected_pexels_video?.id === video.id
                                    ? 'border-primary'
                                    : 'border-transparent hover:border-primary/50'
                                }`}
                                onClick={() => {
                                  handleSelectVideo(index, video.id);
                                  setFailedSections(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(index);
                                    return newSet;
                                  });
                                }}
                              >
                                <img
                                  src={video.image}
                                  alt="Video preview"
                                  className="aspect-video w-full object-cover"
                                />
                                {section.selected_pexels_video?.id === video.id && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                                    <Check className="h-8 w-8 text-primary" />
                                  </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-xs text-white">
                                  {video.duration}s - {video.width}x{video.height}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {isSelected && !isFailed && (
                    <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                      ✓ Video downloaded successfully
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {selectedCount === sections.length && (
            <Card className="border-green-500 bg-green-500/10">
              <CardContent className="py-6 text-center">
                <Check className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-2 font-semibold text-green-700 dark:text-green-400">
                  All videos downloaded successfully!
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ready to proceed to video editing
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button
          onClick={handleNext}
          size="lg"
          disabled={!sections.every((s) => s.selected_pexels_video !== null)}
        >
          Next: Render Video
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
