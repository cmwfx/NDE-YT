import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import type { VideoProject, LanguageConfig } from 'shared';
import { StepIndicator } from '@/components/project/StepIndicator';
import { IdeaStep } from '@/components/project/IdeaStep';
import { ScriptStep } from '@/components/project/ScriptStep';
import { AudioStep } from '@/components/project/AudioStep';
import { CaptionsStep } from '@/components/project/CaptionsStep';
import { VisualSectionsStep } from '@/components/project/VisualSectionsStep';
import { VisualSelectionStep } from '@/components/project/VisualSelectionStep';
import { EditingStep } from '@/components/project/EditingStep';

export function Project() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [langConfig, setLangConfig] = useState<LanguageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const [projectRes, configsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get('/settings'),
      ]);

      setProject(projectRes.data);

      const config = configsRes.data.find(
        (c: LanguageConfig) => c.language_code === projectRes.data.language_code
      );

      if (!config) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Language configuration not found',
        });
        return;
      }

      setLangConfig(config);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load project',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdate = (updates: Partial<VideoProject>) => {
    if (project) {
      setProject({ ...project, ...updates });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!project || !langConfig) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Project not found</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground">{langConfig.language_name}</p>
        </div>

        <StepIndicator currentStep={project.current_step} />

        <div className="mt-8">
          {project.current_step === 1 && (
            <IdeaStep
              project={project}
              langConfig={langConfig}
              onUpdate={handleProjectUpdate}
              onRefresh={loadProject}
            />
          )}
          {project.current_step === 2 && (
            <ScriptStep
              project={project}
              langConfig={langConfig}
              onUpdate={handleProjectUpdate}
              onRefresh={loadProject}
            />
          )}
          {project.current_step === 3 && (
            <AudioStep project={project} onUpdate={handleProjectUpdate} onRefresh={loadProject} />
          )}
          {project.current_step === 4 && (
            <CaptionsStep project={project} onUpdate={handleProjectUpdate} onRefresh={loadProject} />
          )}
          {project.current_step === 5 && (
            <VisualSectionsStep
              project={project}
              langConfig={langConfig}
              onUpdate={handleProjectUpdate}
              onRefresh={loadProject}
            />
          )}
          {project.current_step === 6 && (
            <VisualSelectionStep
              project={project}
              onUpdate={handleProjectUpdate}
              onRefresh={loadProject}
            />
          )}
          {project.current_step === 7 && (
            <EditingStep project={project} onUpdate={handleProjectUpdate} onRefresh={loadProject} />
          )}
        </div>
      </div>
    </Layout>
  );
}
