import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from '../config.js';
import type { CaptionData } from 'shared';

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com';

interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface AssemblyAITranscript {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  words: AssemblyAIWord[];
  text: string;
  error?: string;
}

export class AssemblyAIService {
  private headers = {
    authorization: config.assemblyai.apiKey,
  };

  async uploadAudio(audioPath: string): Promise<string> {
    const audioData = fs.readFileSync(audioPath);
    
    const response = await axios.post(
      `${ASSEMBLYAI_API_URL}/v2/upload`,
      audioData,
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/octet-stream',
        },
      }
    );

    return response.data.upload_url;
  }

  async createTranscript(audioUrl: string): Promise<string> {
    const response = await axios.post(
      `${ASSEMBLYAI_API_URL}/v2/transcript`,
      {
        audio_url: audioUrl,
        language_detection: true,
      },
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.id;
  }

  async getTranscript(transcriptId: string): Promise<AssemblyAITranscript> {
    const response = await axios.get(
      `${ASSEMBLYAI_API_URL}/v2/transcript/${transcriptId}`,
      { headers: this.headers }
    );

    return response.data;
  }

  async pollTranscript(transcriptId: string): Promise<AssemblyAITranscript> {
    while (true) {
      const transcript = await this.getTranscript(transcriptId);

      if (transcript.status === 'completed') {
        return transcript;
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      // Wait 3 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  async generateCaptions(audioPath: string): Promise<CaptionData[]> {
    try {
      // Upload audio file
      const audioUrl = await this.uploadAudio(audioPath);

      // Create transcript
      const transcriptId = await this.createTranscript(audioUrl);

      // Poll for completion
      const transcript = await this.pollTranscript(transcriptId);

      // Convert to our caption format
      const captions: CaptionData[] = transcript.words.map((word) => ({
        word: word.text,
        start: word.start / 1000, // Convert from ms to seconds
        end: word.end / 1000,
        confidence: word.confidence,
      }));

      return captions;
    } catch (error) {
      console.error('AssemblyAI error:', error);
      throw new Error('Failed to generate captions');
    }
  }
}
