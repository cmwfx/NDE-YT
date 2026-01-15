import axios from 'axios';
import { config } from '../config.js';
import type { OpenRouterRequest, OpenRouterResponse } from 'shared';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterService {
  async generateCompletion(request: OpenRouterRequest): Promise<string> {
    try {
      const response = await axios.post<OpenRouterResponse>(
        OPENROUTER_API_URL,
        request,
        {
          headers: {
            'Authorization': `Bearer ${config.openrouter.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'NDE Video Generator',
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error('Failed to generate completion from OpenRouter');
    }
  }

  async generateIdeas(
    systemPrompt: string,
    model: string,
    count: number,
    previousIdeas: string[]
  ): Promise<string[]> {
    const userPrompt = `Generate exactly ${count} unique and compelling ideas for Near Death Experience (NDE) YouTube videos. Each idea should be a single sentence that describes what the video will be about.

${previousIdeas.length > 0 ? `IMPORTANT: Do NOT generate any ideas similar to these previously approved ideas:\n${previousIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}\n` : ''}

Return the ideas as a JSON array of strings, nothing else. Format: ["idea 1", "idea 2", ...]`;

    const content = await this.generateCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
    });

    try {
      // Strip markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const ideas = JSON.parse(cleanContent);
      if (!Array.isArray(ideas)) {
        throw new Error('Response is not an array');
      }
      return ideas;
    } catch (error) {
      console.error('Failed to parse ideas JSON:', content);
      throw new Error('Failed to parse ideas from AI response');
    }
  }

  async generateScript(
    systemPrompt: string,
    model: string,
    idea: string
  ): Promise<string> {
    const userPrompt = `Write a compelling 3000-word script for a YouTube video about: "${idea}"

The script should:
- Be approximately 3000 words long
- Be engaging and emotional
- Include a strong hook at the beginning
- Have a clear narrative structure
- Be suitable for narration
- Include vivid descriptions and storytelling elements

Write ONLY the script text, nothing else.`;

    const content = await this.generateCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    return content;
  }

  async generateVisualSections(
    systemPrompt: string,
    model: string,
    script: string,
    captions: Array<{ word: string; start: number; end: number }>
  ): Promise<Array<{
    section_text: string;
    search_query: string;
    start_time: number;
    end_time: number;
  }>> {
    const totalDuration = captions[captions.length - 1]?.end || 0;

    // Format word timings - this contains the full transcript with exact timings
    const wordTimings = captions
      .map(c => `${c.word}[${c.start.toFixed(1)}s-${c.end.toFixed(1)}s]`)
      .join(' ');

    const userPrompt = `Below is a transcript with word-level timestamps. Break it into visual sections for video editing. Each section needs a different background video from Pexels.

TRANSCRIPT WITH TIMINGS:
${wordTimings}

TOTAL DURATION: ${totalDuration.toFixed(2)} seconds

Return ONLY a JSON array with this exact format (no markdown, no explanation):
[
  {
    "section_text": "brief description of what this section covers",
    "search_query": "pexels search term",
    "start_time": 0.0,
    "end_time": 15.5
  }
]`;

    const content = await this.generateCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    });

    try {
      // Strip markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const sections = JSON.parse(cleanContent);
      if (!Array.isArray(sections)) {
        throw new Error('Response is not an array');
      }
      return sections;
    } catch (error) {
      console.error('Failed to parse visual sections JSON:', content);
      throw new Error('Failed to parse visual sections from AI response');
    }
  }
}
