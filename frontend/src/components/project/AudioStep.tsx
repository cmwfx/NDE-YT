import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { ChevronRight, ChevronLeft, Upload, File, CheckCircle } from 'lucide-react';
import type { VideoProject } from 'shared';

interface AudioStepProps {
  project: VideoProject;
  onUpdate: (updates: Partial<VideoProject>) => void;
  onRefresh: () => void;
}

export function AudioStep({ project, onUpdate, onRefresh }: AudioStepProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const { toast } = useToast();

  const hasAudio = project.audio_file_path || audioFile;

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setAudioFile(file);

    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await api.post(`/audio/upload/${project.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      onUpdate({ audio_file_path: response.data.filePath });
      onRefresh();
      toast({
        title: 'Success',
        description: 'Audio file uploaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload audio',
      });
      setAudioFile(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/mp4': ['.m4a'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handlePrevious = async () => {
    await api.put(`/projects/${project.id}`, { current_step: 2 });
    onRefresh();
  };

  const handleNext = async () => {
    if (!hasAudio) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload an audio file',
      });
      return;
    }

    try {
      await api.put(`/projects/${project.id}`, {
        current_step: 4,
      });
      onRefresh();
      toast({
        title: 'Success',
        description: 'Moving to caption generation',
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
          <CardTitle>Upload Audio</CardTitle>
          <CardDescription>
            Upload the audio narration for your video (MP3, WAV, or M4A)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            {uploading ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            ) : isDragActive ? (
              <p className="mt-4 text-sm">Drop the audio file here</p>
            ) : (
              <div className="mt-4">
                <p className="text-sm">Drag and drop an audio file here, or click to browse</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Supported formats: MP3, WAV, M4A
                </p>
              </div>
            )}
          </div>

          {project.audio_file_path && !uploading && (
            <div className="flex items-center gap-2 rounded-md border border-green-500 bg-green-50 dark:bg-green-950 p-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Audio file uploaded successfully
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {audioFile?.name || 'Ready for caption generation'}
                </p>
              </div>
            </div>
          )}

          {audioFile && !project.audio_file_path && !uploading && (
            <div className="flex items-center gap-2 rounded-md border p-4">
              <File className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {audioFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline" disabled={uploading}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={handleNext} size="lg" disabled={!project.audio_file_path || uploading}>
          Next: Generate Captions
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
