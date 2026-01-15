import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';
import type { LanguageConfig } from 'shared';

const AI_MODELS = [
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'anthropic/claude-3-sonnet',
  'openai/gpt-4-turbo',
  'openai/gpt-4',
  'openai/gpt-3.5-turbo',
];

export function Settings() {
  const [configs, setConfigs] = useState<LanguageConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<LanguageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await api.get('/settings');
      setConfigs(response.data);
      if (response.data.length > 0 && !activeTab) {
        setActiveTab(response.data[0].id);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load language configurations',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLanguage = async () => {
    try {
      const response = await api.post('/settings', {
        language_code: 'new',
        language_name: 'New Language',
        idea_model: 'anthropic/claude-sonnet-4.5',
        idea_system_prompt: 'You are a creative assistant helping to generate compelling NDE video ideas.',
        script_model: 'anthropic/claude-sonnet-4.5',
        script_system_prompt: 'You are a skilled writer creating engaging NDE video scripts.',
        visual_model: 'anthropic/claude-sonnet-4.5',
        visual_system_prompt: 'You are an expert at breaking down scripts into visual scenes.',
      });
      setConfigs([...configs, response.data]);
      setActiveTab(response.data.id);
      setEditingConfig(response.data);
      toast({
        title: 'Success',
        description: 'Language configuration added',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add language configuration',
      });
    }
  };

  const handleLocalUpdate = (updates: Partial<LanguageConfig>) => {
    if (editingConfig) {
      setEditingConfig({ ...editingConfig, ...updates });
    }
  };

  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    
    setSaving(true);
    try {
      const response = await api.put(`/settings/${editingConfig.id}`, editingConfig);

      setConfigs(configs.map((c) => (c.id === editingConfig.id ? response.data : c)));
      setEditingConfig(response.data);
      toast({
        title: 'Success',
        description: 'Configuration saved',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this language configuration?')) return;

    try {
      await api.delete(`/settings/${id}`);
      setConfigs(configs.filter((c) => c.id !== id));
      if (activeTab === id && configs.length > 1) {
        setActiveTab(configs[0].id);
      }
      if (editingConfig?.id === id) {
        setEditingConfig(null);
      }
      toast({
        title: 'Success',
        description: 'Configuration deleted',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete configuration',
      });
    }
  };

  const loadConfigForEditing = (config: LanguageConfig) => {
    setEditingConfig({ ...config });
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Language Settings</h1>
          <Button onClick={handleAddLanguage}>
            <Plus className="mr-2 h-4 w-4" />
            Add Language
          </Button>
        </div>

        {configs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No language configurations yet. Click "Add Language" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            const config = configs.find(c => c.id === value);
            if (config) loadConfigForEditing(config);
          }}>
            <TabsList>
              {configs.map((config) => (
                <TabsTrigger key={config.id} value={config.id}>
                  {config.language_name}
                </TabsTrigger>
              ))}
            </TabsList>

            {configs.map((config) => (
              <TabsContent key={config.id} value={config.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Language Configuration</CardTitle>
                        <CardDescription>Configure AI models and prompts for this language</CardDescription>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteConfig(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="language_name">Language Name</Label>
                        <Input
                          id="language_name"
                          value={editingConfig?.id === config.id ? editingConfig.language_name : config.language_name}
                          onChange={(e) =>
                            handleLocalUpdate({ language_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language_code">Language Code</Label>
                        <Input
                          id="language_code"
                          value={editingConfig?.id === config.id ? editingConfig.language_code : config.language_code}
                          onChange={(e) =>
                            handleLocalUpdate({ language_code: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Idea Generation</h3>
                      <div className="space-y-2">
                        <Label>AI Model</Label>
                        <Select
                          value={editingConfig?.id === config.id ? editingConfig.idea_model : config.idea_model}
                          onValueChange={(value) => handleLocalUpdate({ idea_model: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>System Prompt</Label>
                        <Textarea
                          value={editingConfig?.id === config.id ? editingConfig.idea_system_prompt : config.idea_system_prompt}
                          onChange={(e) =>
                            handleLocalUpdate({ idea_system_prompt: e.target.value })
                          }
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Script Generation</h3>
                      <div className="space-y-2">
                        <Label>AI Model</Label>
                        <Select
                          value={editingConfig?.id === config.id ? editingConfig.script_model : config.script_model}
                          onValueChange={(value) => handleLocalUpdate({ script_model: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>System Prompt</Label>
                        <Textarea
                          value={editingConfig?.id === config.id ? editingConfig.script_system_prompt : config.script_system_prompt}
                          onChange={(e) =>
                            handleLocalUpdate({ script_system_prompt: e.target.value })
                          }
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Visual Scene Generation</h3>
                      <div className="space-y-2">
                        <Label>AI Model</Label>
                        <Select
                          value={editingConfig?.id === config.id ? editingConfig.visual_model : config.visual_model}
                          onValueChange={(value) => handleLocalUpdate({ visual_model: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>System Prompt</Label>
                        <Textarea
                          value={editingConfig?.id === config.id ? editingConfig.visual_system_prompt : config.visual_system_prompt}
                          onChange={(e) =>
                            handleLocalUpdate({ visual_system_prompt: e.target.value })
                          }
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveConfig} disabled={saving || !editingConfig || editingConfig.id !== config.id}>
                        {saving ? 'Saving...' : 'Save Configuration'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
